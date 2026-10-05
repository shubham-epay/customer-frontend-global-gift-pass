import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { payments } from '../api/store';
import { errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import Logo from '../components/Logo';
import { BagIcon } from '../components/Icons';
import PaymentMethodPicker from '../components/payment/PaymentMethodPicker';
import HostedSessionPanel from '../components/payment/HostedSessionPanel';
import PaymentLinkPanel from '../components/payment/PaymentLinkPanel';
import DirectCardPanel from '../components/payment/DirectCardPanel';
import { payStore } from '../utils/payStore';
import '../styles/checkout.css';

const amount = (v, currency) => `${currency} ${Number(v || 0).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Pay for a placed order: the Hosted Session card form or a payment link, with a switch to
 * another method. Also the return page from SynraPay (?result=success|failure).
 * Whether the order is paid always comes from our API (webhook / Get Status), never from the URL.
 */
export default function PayPage() {
  const { orderNumber } = useParams();
  const [params] = useSearchParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { isAuthed } = useAuth();

  const saved = useMemo(() => payStore.get(orderNumber), [orderNumber]);
  const token = saved?.token;
  const snapshot = state?.order || saved?.order || null; // order from checkout (items, totals, customer)

  const [order, setOrder] = useState(snapshot && { total: snapshot.total, currency: snapshot.currency, paymentStatus: snapshot.paymentStatus });
  const [payment, setPayment] = useState(state?.payment || null);
  const [error, setError] = useState(state?.paymentError?.message || '');
  const [loading, setLoading] = useState(!state?.payment);
  const [checking, setChecking] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [choice, setChoice] = useState({ method: state?.payment?.method || 'HOSTED_SESSION', linkType: 'STANDARD', expiresInHours: 24 });
  const [busy, setBusy] = useState(false);
  const [methods, setMethods] = useState(null);
  const confirmed = useRef(false);

  const goConfirmed = useCallback((o) => {
    if (confirmed.current) return;
    confirmed.current = true;
    const full = { ...(snapshot || { orderNumber }), ...o, paymentStatus: 'PAID' };
    try { sessionStorage.setItem('ggp-last-order', JSON.stringify(full)); } catch { /* storage unavailable */ }
    payStore.clear(orderNumber);
    navigate('/order-confirmed', { replace: true, state: { order: full } });
  }, [navigate, orderNumber, snapshot]);

  /** Reads the order's payment state from the API (which reconciles with SynraPay). */
  const refresh = useCallback(async () => {
    const { data } = await payments.status(orderNumber, token);
    setOrder(data.order);
    if (data.order.paymentStatus === 'PAID') { goConfirmed(data.order); return data; }
    // Keep a hosted session that's mounted (its client token isn't returned by the status call).
    setPayment((p) => (p?.session?.clientToken && p._id === data.payment?._id ? { ...p, status: data.payment.status } : data.payment));
    return data;
  }, [orderNumber, token, goConfirmed]);

  // First load, and the return from SynraPay: poll briefly because the webhook may land a moment later.
  useEffect(() => {
    let live = true;
    payments.config().then((r) => live && setMethods(r.data.methods)).catch(() => {});
    (async () => {
      const tries = params.get('result') === 'success' ? 6 : 1;
      for (let i = 0; i < tries && live; i += 1) {
        try {
          const d = await refresh();
          if (d?.order.paymentStatus === 'PAID') return;
        } catch (err) {
          if (live) setError(err.response?.status === 404 ? 'not-found' : errorMessage(err));
          break;
        }
        if (i < tries - 1) await sleep(2500);
      }
      if (live) setLoading(false);
    })();
    return () => { live = false; };
  }, [refresh, params]);

  // While a payment link is open, check every few seconds whether it was paid (e.g. on another device).
  useEffect(() => {
    if (payment?.method !== 'PAY_BY_LINK') return undefined;
    const id = setInterval(() => { if (document.visibilityState === 'visible') refresh().catch(() => {}); }, 8000);
    return () => clearInterval(id);
  }, [payment?.method, refresh]);

  const check = async () => {
    setChecking(true);
    try {
      const d = await refresh();
      if (d.order.paymentStatus !== 'PAID') setError('We haven’t received the payment yet. If you just paid, give it a few seconds.');
    } catch (err) { setError(errorMessage(err)); } finally { setChecking(false); }
  };

  /** Hosted Session reported success: wait for our webhook / Get Status to confirm. */
  const onCardCompleted = useCallback(async () => {
    for (let i = 0; i < 8; i += 1) {
      try { const d = await refresh(); if (d.order.paymentStatus === 'PAID') return; } catch { /* keep trying */ }
      await sleep(2000);
    }
    setError('Your payment is being confirmed. You’ll get an email as soon as it’s done.');
  }, [refresh]);

  const start = async (e) => {
    e?.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await payments.start(orderNumber, token, {
        method: choice.method,
        ...(choice.method === 'PAY_BY_LINK' && { linkType: choice.linkType, expiresInHours: choice.expiresInHours }),
      });
      if (data.payment.method === 'CARD' && data.payment.checkoutUrl) { window.location.assign(data.payment.checkoutUrl); return; }
      setPayment(data.payment);
      setSwitching(false);
    } catch (err) {
      setError(errorMessage(err));
      if (err.response?.data?.error?.code === 'ORDER_NOT_PAYABLE') refresh().catch(() => {});
    } finally { setBusy(false); }
  };

  const header = (
    <header className="co-header">
      <div className="co-header__inner">
        <span />
        <Logo className="co-logo" />
        <Link to="/cart" className="co-bag" aria-label="Cart"><BagIcon width={28} height={28} /></Link>
      </div>
    </header>
  );

  if (error === 'not-found') {
    return (
      <div className="co">{header}
        <div className="co-empty">
          <h1>Payment for order {orderNumber}</h1>
          <p>{params.get('result') === 'success'
            ? 'Thank you! Your payment is being confirmed and you’ll receive an email shortly.'
            : 'This order can only be paid from the browser it was placed in. Check your email for the order details.'}</p>
          {isAuthed ? <Link to="/account/orders" className="co-pay">View my orders</Link> : <Link to="/" className="co-pay">Continue shopping</Link>}
        </div>
      </div>
    );
  }

  const currency = order?.currency || snapshot?.currency || 'AED';
  const total = amount(order?.total ?? snapshot?.total, currency);
  const failed = params.get('result') === 'failure' || payment?.status === 'FAILED';
  const closed = order && order.orderStatus && order.orderStatus !== 'PENDING' && order.paymentStatus !== 'PAID';
  const showSession = !switching && payment?.method === 'HOSTED_SESSION' && payment.session?.clientToken && payment.status === 'PENDING';
  const showLink = !switching && payment?.method === 'PAY_BY_LINK' && payment.link?.url && payment.link.status === 'ACTIVE';
  const showDirect = !switching && !closed && !loading && payment?.method === 'DIRECT_CARD';
  const showPicker = !closed && !loading && (switching || !(showSession || showLink || showDirect));

  return (
    <div className="co">
      {header}
      <div className="pay-page">
        <div className="pay-summary">
          <span>Order <b>{orderNumber}</b></span>
          <strong>{total}</strong>
        </div>

        {loading && <div className="co-loading"><span className="spinner" /></div>}
        {!loading && failed && !showLink && !showDirect && !closed && <div className="co-alert">The payment didn’t go through and you haven’t been charged. Try again or choose another way to pay.</div>}
        {closed && <div className="co-alert">This order is {order.orderStatus.toLowerCase()} and can no longer be paid.</div>}
        {error && error !== 'not-found' && <p className="pay-error" role="alert">{error}</p>}

        {showSession && (
          <HostedSessionPanel session={payment.session} amountLabel={total} onCompleted={onCardCompleted} onRestart={() => setSwitching(true)} />
        )}
        {showDirect && (
          <DirectCardPanel
            orderNumber={orderNumber}
            token={token}
            amountLabel={total}
            defaultName={snapshot?.customer?.name || ''}
            environment={payment.direct?.environment}
            onPaid={(o) => goConfirmed(o || {})}
            onCheck={check}
          />
        )}
        {showLink && (
          <PaymentLinkPanel
            link={payment.link}
            email={snapshot?.customer?.email}
            checking={checking}
            onCheck={check}
            onSendEmail={(to) => payments.sendLink(orderNumber, token, to).then((r) => r.data).catch((err) => { throw new Error(errorMessage(err)); })}
          />
        )}

        {showPicker && (
          <form className="pay-card" onSubmit={start}>
            <h2>{payment ? 'Choose how to pay' : 'Pay for your order'}</h2>
            <PaymentMethodPicker value={choice} onChange={setChoice} methods={methods} disabled={busy} />
            <button type="submit" className="co-pay" disabled={busy}>
              {busy ? 'Please wait…' : choice.method === 'PAY_BY_LINK' ? 'Create payment link' : choice.method === 'CARD' ? 'Continue to payment' : 'Continue to card details'}
            </button>
          </form>
        )}

        {!loading && !closed && (showSession || showLink || showDirect) && (
          <button type="button" className="pay-switch" onClick={() => setSwitching(true)}>Pay another way</button>
        )}
        {switching && payment && (
          <button type="button" className="pay-switch" onClick={() => setSwitching(false)}>Back</button>
        )}
      </div>
    </div>
  );
}
