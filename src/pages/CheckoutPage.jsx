import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AsYouType, getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js/max';
import { account, cart as cartApi, payments } from '../api/store';
import { cartTokenStore, errorMessage, fieldErrors } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useShop } from '../auth/ShopContext';
import { useCountries } from '../context/CountryContext';
import { useToast } from '../components/Toast';
import Logo from '../components/Logo';
import { BagIcon, ChevronDown } from '../components/Icons';
import { Check, Field, HelpTip, SelectField } from '../components/checkout/Fields';
import { SecureSeal } from '../components/checkout/Badges';
import PaymentMethodPicker from '../components/payment/PaymentMethodPicker';
import { payStore } from '../utils/payStore';
import { imageOf } from '../utils/format';
import '../styles/checkout.css';

/** Same pattern the API enforces (backend/src/utils/contact.js). No OTP: the address just has to be well-formed. */
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,24}$/;
const SAVED_KEY = 'ggp-checkout-info';
const FALLBACK = { countries: [{ code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', dialCode: '+971' }], emirates: ['Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah'] };

const amount = (v, currency) => `${currency} ${Number(v || 0).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Valid number on the selected country's dialling code (mirrors backend normalizePhone). */
const phoneOk = (value, code) => {
  const parsed = parsePhoneNumberFromString(value || '', code);
  try { return Boolean(parsed?.isValid() && parsed.countryCallingCode === getCountryCallingCode(code)); } catch { return false; }
};

const blankAddress = (country) => ({ country, firstName: '', lastName: '', address: '', city: '', state: '' });

const readSaved = () => { try { return JSON.parse(localStorage.getItem(SAVED_KEY) || 'null'); } catch { return null; } };

/* ---------------------------------------------------------------- address block */
function AddressFields({ value, set, errors, prefix = '', countries, emirates }) {
  const e = (k) => errors[prefix + k];
  return (
    <>
      <SelectField label="Country/Region" value={value.country} onChange={(v) => set({ country: v, state: '' })} error={e('country')}>
        {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
      </SelectField>
      <div className="cf-row">
        <Field label="First name" value={value.firstName} onChange={(v) => set({ firstName: v })} error={e('firstName')} autoComplete="given-name" maxLength={60} />
        <Field label="Last name" value={value.lastName} onChange={(v) => set({ lastName: v })} error={e('lastName')} autoComplete="family-name" maxLength={60} />
      </div>
      <Field label="Address" value={value.address} onChange={(v) => set({ address: v })} error={e('address')} autoComplete="street-address" maxLength={200} />
      <div className="cf-row">
        <Field label="City" value={value.city} onChange={(v) => set({ city: v })} error={e('city')} autoComplete="address-level2" maxLength={80} />
        {value.country === 'AE' ? (
          <SelectField label="Emirate" placeholder="Emirate" value={value.state} onChange={(v) => set({ state: v })} error={e('state')}>
            {emirates.map((em) => <option key={em} value={em}>{em}</option>)}
          </SelectField>
        ) : (
          <Field label="State / Province (optional)" value={value.state} onChange={(v) => set({ state: v })} error={e('state')} autoComplete="address-level1" maxLength={80} />
        )}
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- order summary (right column) */
function Summary({ cart, currency, addressReady, onApplyCoupon, onRemoveCoupon }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const apply = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true); setError('');
    try { await onApplyCoupon(code.trim()); setCode(''); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <div className="co-summary">
      <ul className="co-lines">
        {cart.items.map((l) => (
          <li key={l._id} className={l.available ? '' : 'is-unavailable'}>
            <span className="co-thumb">
              <img src={imageOf(l.item)} alt="" />
              <span className="co-thumb__qty">{l.quantity}</span>
            </span>
            <span className="co-lines__info">
              <span className="co-lines__title">{l.item?.title || 'Unavailable item'}</span>
              {l.amount != null && <span className="co-lines__sub">Value: {amount(l.amount, l.currency || currency).replace('.00', '')}</span>}
              {l.recipient?.email && <span className="co-lines__sub">For {l.recipient.name || l.recipient.email}</span>}
              {!l.available && <span className="co-lines__err">{l.unavailableReason || 'No longer available'}</span>}
            </span>
            <span className="co-lines__price">{amount(l.lineTotal, currency)}</span>
          </li>
        ))}
      </ul>

      {cart.couponCode ? (
        <div className="co-coupon-applied">
          <span><b>{cart.couponCode}</b>{cart.coupon ? ` · −${amount(cart.discountTotal, currency)}` : ''}</span>
          {cart.couponError && <small>{cart.couponError}</small>}
          <button type="button" onClick={onRemoveCoupon}>Remove</button>
        </div>
      ) : (
        <form className="co-discount" onSubmit={apply}>
          <div className="cf co-discount__field">
            <div className="cf__box"><div className="cf__control">
              <input id="co-discount" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder=" " maxLength={40} />
              <label htmlFor="co-discount">Discount Code</label>
            </div></div>
          </div>
          <button type="submit" className="co-apply" disabled={busy || !code.trim()}>Apply</button>
          {error && <p className="cf__error co-discount__err">{error}</p>}
        </form>
      )}

      <div className="co-trust">
        <ul>
          <li>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D9283A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9h13l-3-3M20 15H7l3 3" /></svg>
            Free Exchanges &amp; Returns
          </li>
          <li>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D9283A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 10v10H4V10h3Zm0 0 4-7a2 2 0 0 1 2 2v4h5a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 16.8 20H7" /></svg>
            Best Price Guaranteed
          </li>
        </ul>
        <SecureSeal />
      </div>

      <dl className="co-totals">
        <div><dt>Subtotal · {cart.itemCount} item{cart.itemCount === 1 ? '' : 's'}</dt><dd>{amount(cart.subtotal, currency)}</dd></div>
        {cart.discountTotal > 0 && <div className="co-totals__discount"><dt>Discount{cart.couponCode ? ` (${cart.couponCode})` : ''}</dt><dd>−{amount(cart.discountTotal, currency)}</dd></div>}
        <div>
          <dt>Shipping <HelpTip text="Gift vouchers are delivered by email, free of charge." /></dt>
          <dd className={addressReady ? '' : 'muted'}>{addressReady ? 'Free' : 'Enter shipping address'}</dd>
        </div>
        <div className="co-totals__grand"><dt>Total</dt><dd>{amount(cart.total, currency)}</dd></div>
        {cart.taxTotal > 0 && <div className="co-totals__tax"><dt>Including {amount(cart.taxTotal, currency)} in taxes</dt></div>}
      </dl>
    </div>
  );
}

/* ---------------------------------------------------------------- page */
export default function CheckoutPage() {
  const { user, isAuthed, status } = useAuth();
  const { cart, setCart, reloadCart, mutate } = useShop();
  const { selected } = useCountries() || { selected: [] };
  const toast = useToast();
  const navigate = useNavigate();
  const formRef = useRef(null);

  const [ref, setRef] = useState(FALLBACK);
  const defaultCountry = selected?.length === 1 ? selected[0] : 'AE';
  const saved = useMemo(readSaved, []);
  const [email, setEmail] = useState(saved?.email || '');
  const [ship, setShip] = useState(() => ({ ...blankAddress(defaultCountry), ...(saved?.address || {}) }));
  const [phone, setPhone] = useState(saved?.phone || '');
  const [saveInfo, setSaveInfo] = useState(Boolean(saved));
  // Online payment (SynraPay): method dropdown; Pay By Link has a Standard or Quick link.
  const [payConfig, setPayConfig] = useState(null);
  const [payment, setPayment] = useState({ method: 'CARD', linkType: 'STANDARD', expiresInHours: 24, captureMode: 'CAPTURE' });
  const [billingSame, setBillingSame] = useState(true);
  const [bill, setBill] = useState(() => blankAddress(defaultCountry));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  useEffect(() => { reloadCart().finally(() => setLoaded(true)); }, [reloadCart]);
  useEffect(() => { cartApi.countries().then((r) => setRef(r.data)).catch(() => {}); }, []);
  useEffect(() => {
    payments.config().then((r) => {
      setPayConfig(r.data);
      setPayment((p) => ({ ...p, expiresInHours: r.data.linkExpiry?.defaultHours || p.expiresInHours }));
    }).catch(() => setPayConfig({ enabled: false }));
  }, []);
  // The method dropdown is always shown. If the API reports online payment as off, the order is
  // still placed and the pay page explains it and offers a retry.
  const paymentsOff = payConfig?.enabled === false;

  // Signed-in customers: prefill from the account (email, name, default address, phone).
  useEffect(() => {
    if (!isAuthed || !user) return;
    setEmail((v) => v || user.email || '');
    const [first = '', ...rest] = (user.name || '').split(' ');
    setShip((s) => ({ ...s, firstName: s.firstName || first, lastName: s.lastName || rest.join(' ') }));
    account.addresses().then((r) => {
      const a = r.data.find((x) => x.isDefault) || r.data[0];
      if (!a) return;
      const code = ref.countries.find((c) => c.name === a.country)?.code;
      setShip((s) => (s.address ? s : { ...s, address: a.line1 || '', city: a.city || '', state: a.state || '', ...(code && { country: code }) }));
      if (a.phone) setPhone((p) => p || a.phone);
    }).catch(() => {});
    if (user.phone) setPhone((p) => p || user.phone);
  }, [isAuthed, user, ref.countries]);

  const country = ref.countries.find((c) => c.code === ship.country) || { code: ship.country, dialCode: '', flag: '' };
  const currency = cart?.currency && cart.currency !== 'MIXED' ? cart.currency : 'AED';
  const addressReady = Boolean(ship.address.trim() && ship.city.trim() && (ship.country !== 'AE' || ship.state));

  const setShipField = (patch) => {
    setShip((s) => ({ ...s, ...patch }));
    setErrors((e) => { const n = { ...e }; Object.keys(patch).forEach((k) => delete n[k]); if (patch.country) delete n.phone; return n; });
  };
  const setBillField = (patch) => setBill((s) => ({ ...s, ...patch }));

  // Phone: typed as a national number for the delivery country; "+…" pasted numbers are accepted too.
  const phoneFor = (value, code) => {
    const parsed = parsePhoneNumberFromString(value || '', code);
    return parsed?.number || '';
  };
  const onPhoneChange = (v) => {
    const digits = v.replace(/[^\d+ ()-]/g, '');
    setPhone(digits.startsWith('+') ? digits : new AsYouType(ship.country).input(digits));
    setErrors((e) => ({ ...e, phone: undefined }));
  };
  // Show numbers in the delivery country's national format (the +code is in the prefix box).
  // A "+.." number typed for another country is re-read as national digits when the country changes.
  const tidyPhone = (p, code) => {
    const parsed = parsePhoneNumberFromString(p || '', code);
    if (!parsed) return p;
    // "+971 50 123 4567" -> "50 123 4567": grouped like the international format, without a trunk "0".
    if (phoneOk(p, code)) return parsed.formatInternational().replace(`+${parsed.countryCallingCode}`, '').trim();
    return p.trim().startsWith('+') && parsed.isValid() ? parsed.nationalNumber : p;
  };
  useEffect(() => { setPhone((p) => tidyPhone(p, ship.country)); }, [ship.country]);

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = 'Enter an email';
    else if (!EMAIL_RE.test(email.trim())) e.email = 'Enter a valid email, like name@example.com';
    const need = (obj, pre) => {
      if (!obj.firstName.trim()) e[`${pre}firstName`] = 'Enter a first name';
      if (!obj.lastName.trim()) e[`${pre}lastName`] = 'Enter a last name';
      if (!obj.address.trim()) e[`${pre}address`] = 'Enter an address';
      if (!obj.city.trim()) e[`${pre}city`] = 'Enter a city';
      if (obj.country === 'AE' && !obj.state) e[`${pre}state`] = 'Select an emirate';
    };
    need(ship, '');
    if (!phone.trim()) e.phone = 'Enter a phone number';
    else if (!phoneOk(phone, ship.country)) {
      e.phone = `Enter a valid ${country.name || ''} phone number`.replace('  ', ' ');
    }
    if (!billingSame) need(bill, 'billing.');
    return e;
  };

  const focusFirstError = () => requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus());

  const pay = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) { focusFirstError(); return; }
    setBusy(true);
    try {
      const { data } = await cartApi.checkout({
        email: email.trim(),
        ...ship,
        phone: phoneFor(phone, ship.country),
        saveInfo,
        paymentMethod: payment.method,
        ...(payment.method === 'PAY_BY_LINK' && { paymentLinkType: payment.linkType, paymentLinkExpiresInHours: payment.expiresInHours }),
        ...(payment.method === 'DIRECT_CARD' && { directCaptureMode: payment.captureMode }),
        billingSameAsShipping: billingSame,
        ...(!billingSame && { billing: bill }),
      });
      try {
        if (saveInfo && !isAuthed) localStorage.setItem(SAVED_KEY, JSON.stringify({ email: email.trim(), address: ship, phone }));
        else if (!saveInfo) localStorage.removeItem(SAVED_KEY);
        sessionStorage.setItem('ggp-last-order', JSON.stringify(data));
      } catch { /* storage unavailable */ }
      if (!isAuthed) cartTokenStore.clear(); // the guest cart became this order
      setCart(null);
      reloadCart();
      // Online payment: keep the pay token so the pay page works after a reload or the return from SynraPay.
      const { payToken, payment: started, paymentError, ...order } = data;
      payStore.set(order.orderNumber, { token: payToken, order });
      if (started?.method === 'CARD' && started.checkoutUrl) { window.location.assign(started.checkoutUrl); return; }
      navigate(`/pay/${order.orderNumber}`, { replace: true, state: { order, payment: started, paymentError } });
    } catch (err) {
      const fe = fieldErrors(err);
      setErrors(fe);
      toast.error(errorMessage(err));
      if (Object.keys(fe).length) focusFirstError();
      if (err?.response?.status === 409) reloadCart();
    } finally { setBusy(false); }
  };

  const header = (
    <header className="co-header">
      <div className="co-header__inner">
        <span />
        <Logo className="co-logo" />
        <Link to="/cart" className="co-bag" aria-label="Back to cart"><BagIcon width={28} height={28} /></Link>
      </div>
    </header>
  );

  if (!loaded || status === 'loading') return <div className="co">{header}<div className="co-loading"><span className="spinner" /></div></div>;
  if (!cart || !cart.items.length) {
    return (
      <div className="co">{header}
        <div className="co-empty">
          <h1>Your cart is empty</h1>
          <p>Add a gift pass to check out.</p>
          <Link to="/" className="co-pay">Continue shopping</Link>
        </div>
      </div>
    );
  }

  const summaryProps = {
    cart,
    currency,
    addressReady,
    onApplyCoupon: (code) => cartApi.applyCoupon(code).then((r) => { setCart(r.data); toast.success('Discount applied'); }),
    onRemoveCoupon: () => mutate(() => cartApi.removeCoupon(), 'Discount removed').catch(() => {}),
  };

  return (
    <div className="co">
      {header}
      {/* Mobile: collapsible summary above the form */}
      <button type="button" className="co-toggle" onClick={() => setSummaryOpen(!summaryOpen)} aria-expanded={summaryOpen}>
        <span>{summaryOpen ? 'Hide' : 'Show'} order summary <ChevronDown width={14} height={14} className={summaryOpen ? 'up' : ''} /></span>
        <strong>{amount(cart.total, currency)}</strong>
      </button>
      {summaryOpen && <div className="co-summary-mobile"><Summary {...summaryProps} /></div>}

      <div className="co-body">
        <main className="co-main">
          <form ref={formRef} className="co-form" onSubmit={pay} noValidate>
            {cart.currency === 'MIXED' && <div className="co-alert">Your cart has items in different currencies. Check out one currency at a time.</div>}
            {cart.hasUnavailableItems && <div className="co-alert">Some items are no longer available. <Link to="/cart">Remove them from your cart</Link> to continue.</div>}

            <section>
              <h2>Contact</h2>
              <Field
                label="Email"
                type="email"
                value={email}
                onChange={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: undefined })); }}
                onBlur={() => email && !EMAIL_RE.test(email.trim()) && setErrors((e) => ({ ...e, email: 'Enter a valid email, like name@example.com' }))}
                error={errors.email}
                autoComplete="email"
                inputMode="email"
                maxLength={254}
                help="Your order confirmation and gift vouchers are sent to this email."
              />
            </section>

            <section>
              <h2>Delivery</h2>
              <div className="co-stack">
                <AddressFields value={ship} set={setShipField} errors={errors} countries={ref.countries} emirates={ref.emirates} />
                <Field
                  label="Phone"
                  type="tel"
                  value={phone}
                  onChange={onPhoneChange}
                  onBlur={() => {
                    if (!phone) return;
                    if (phoneOk(phone, ship.country)) setPhone(tidyPhone(phone, ship.country));
                    else setErrors((e) => ({ ...e, phone: `Enter a valid ${country.name || ''} phone number` }));
                  }}
                  error={errors.phone}
                  autoComplete="tel-national"
                  inputMode="tel"
                  maxLength={24}
                  help="In case we need to contact you about your order."
                  prefix={<span className="cf__prefix" title={country.name}>{country.flag} {country.dialCode}</span>}
                />
                <Check checked={saveInfo} onChange={setSaveInfo}>Save this information for next time</Check>
              </div>
            </section>

            <section>
              <h3>Shipping method</h3>
              {addressReady ? (
                <div className="co-ship">
                  <span><b>Email delivery</b><small>Your e-vouchers arrive by email as soon as payment is confirmed.</small></span>
                  <b>Free</b>
                </div>
              ) : (
                <div className="co-ship co-ship--empty">Enter your shipping address to view available shipping methods.</div>
              )}
            </section>

            <section>
              <h2>Payment</h2>
              <p className="co-sub">All transactions are secure and encrypted.</p>
              <PaymentMethodPicker value={payment} onChange={setPayment} disabled={busy}>
                <Check checked={billingSame} onChange={setBillingSame}>Use shipping address as billing address</Check>
                {!billingSame && (
                  <div className="co-stack co-billing">
                    <AddressFields value={bill} set={setBillField} errors={errors} prefix="billing." countries={ref.countries} emirates={ref.emirates} />
                  </div>
                )}
              </PaymentMethodPicker>
              {paymentsOff && <p className="co-sub co-pay-off">Online payment is temporarily unavailable. You can still place your order and pay from the next page once it’s back.</p>}
            </section>

            <p className="co-terms">By clicking on &apos;Pay now&apos;, you are agreeing to <Link to="/page/terms">terms of service</Link>.</p>
            <button type="submit" className="co-pay" disabled={busy || cart.hasUnavailableItems || cart.currency === 'MIXED'}>
              {busy ? 'Processing…' : payment.method === 'PAY_BY_LINK' ? 'Place order & create payment link' : ['HOSTED_SESSION', 'DIRECT_CARD'].includes(payment.method) ? 'Continue to payment' : 'Pay now'}
            </button>
          </form>
        </main>

        <aside className="co-aside"><Summary {...summaryProps} /></aside>
      </div>
    </div>
  );
}
