import { useCallback, useEffect, useRef, useState } from 'react';
import { payments } from '../../api/store';
import { errorMessage, fieldErrors } from '../../api/client';
import { Field } from '../checkout/Fields';
import { Amex, Mastercard, Visa } from '../checkout/Badges';
import { LockIcon } from '../Icons';

const digits = (v) => v.replace(/\D/g, '');
const luhnOk = (d) => {
  let sum = 0;
  for (let i = d.length - 1, alt = false; i >= 0; i -= 1, alt = !alt) {
    let n = Number(d[i]);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
  }
  return sum % 10 === 0;
};
const formatNumber = (v) => digits(v).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
const formatExpiry = (v) => {
  const d = digits(v).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};
const BLANK = { number: '', expiry: '', cvv: '', name: '' };

/**
 * SynraPay Direct API: our own card form. The card is posted to our backend over the same origin,
 * which forwards it to SynraPay in a signed call; it is kept only in this component's state and
 * cleared as soon as it has been sent. If the bank asks for 3-D Secure, its challenge page is shown
 * in a frame and the payment is finished by a second signed call from our backend.
 */
export default function DirectCardPanel({ orderNumber, token, amountLabel, defaultName = '', environment, onPaid, onCheck }) {
  const [card, setCard] = useState({ ...BLANK, name: defaultName });
  const [errors, setErrors] = useState({});
  const [phase, setPhase] = useState('form'); // form | paying | challenge | verifying | pending
  const [challenge, setChallenge] = useState(null); // issuer's 3-D Secure HTML
  const [message, setMessage] = useState(null); // { tone: 'error' | 'info', text }
  const finishing = useRef(false);

  const set = (patch) => { setCard((c) => ({ ...c, ...patch })); setErrors((e) => { const n = { ...e }; Object.keys(patch).forEach((k) => delete n[k]); return n; }); };

  const validate = () => {
    const e = {};
    const num = digits(card.number);
    if (num.length < 12 || num.length > 19 || !luhnOk(num)) e.number = 'Enter a valid card number';
    const [mm, yy] = card.expiry.split('/');
    const month = Number(mm);
    const now = new Date();
    if (!/^\d{2}$/.test(mm || '') || !/^\d{2}$/.test(yy || '') || month < 1 || month > 12) e.expiry = 'Enter the expiry date as MM/YY';
    else if (2000 + Number(yy) < now.getFullYear() || (2000 + Number(yy) === now.getFullYear() && month < now.getMonth() + 1)) e.expiry = 'This card has expired';
    if (!/^\d{3,4}$/.test(card.cvv)) e.cvv = 'Enter the 3 or 4 digit security code';
    if (!/^[\p{L} .'-]{2,100}$/u.test(card.name.trim())) e.name = 'Enter the name as shown on the card';
    return e;
  };

  /** One place that turns an API result into what the shopper sees. */
  const handle = useCallback((r) => {
    // AUTHORIZED: the amount is held on the card and captured when the order is confirmed.
    if (r.status === 'PAID' || r.status === 'AUTHORIZED') { onPaid(r.order); return; }
    if (r.status === 'REQUIRES_ACTION' && r.action?.html) {
      setChallenge(r.action.html);
      setPhase('challenge');
      setMessage(null);
      return;
    }
    if (r.status === 'REQUIRES_ACTION') { // verification not finished yet
      setPhase('challenge');
      setMessage({ tone: 'info', text: r.message || 'Finish the verification with your bank above.' });
      return;
    }
    if (r.status === 'PENDING') {
      setChallenge(null);
      setPhase('pending');
      setMessage({ tone: 'info', text: r.message || 'Your payment is being confirmed.' });
      return;
    }
    // DECLINED / CANCELLED: nothing was charged; a new attempt is created automatically on the next try.
    setChallenge(null);
    setPhase('form');
    setMessage({ tone: 'error', text: r.message || 'The payment was not completed. You have not been charged.' });
  }, [onPaid]);

  const pay = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setPhase('paying');
    setMessage(null);
    const [mm, yy] = card.expiry.split('/');
    try {
      const { data } = await payments.directPay(orderNumber, token, {
        number: digits(card.number), expiry_month: mm, expiry_year: yy, cvv: card.cvv, name: card.name.trim(),
      });
      // The card has been sent: don't keep the number or security code in the page any longer.
      setCard((c) => ({ ...BLANK, name: c.name }));
      handle(data);
    } catch (err) {
      const fe = fieldErrors(err);
      setErrors({
        ...(fe['card.number'] && { number: fe['card.number'] }),
        ...((fe['card.expiry_month'] || fe['card.expiry_year']) && { expiry: fe['card.expiry_month'] || fe['card.expiry_year'] }),
        ...(fe['card.cvv'] && { cvv: fe['card.cvv'] }),
        ...(fe['card.name'] && { name: fe['card.name'] }),
      });
      setPhase('form');
      setMessage({ tone: 'error', text: errorMessage(err) });
    }
  };

  /** The challenge frame says it is over: our backend makes the signed call that actually pays. */
  const finish = useCallback(async () => {
    if (finishing.current) return;
    finishing.current = true;
    setPhase('verifying');
    try {
      const { data } = await payments.directAuthenticate(orderNumber, token);
      handle(data);
    } catch (err) {
      setPhase('challenge');
      setMessage({ tone: 'error', text: errorMessage(err) });
    } finally { finishing.current = false; }
  }, [orderNumber, token, handle]);

  // SynraPay's return page posts this when the challenge step ends. It is only a signal to ask our
  // backend for the real outcome - never proof of payment - so the sender doesn't need to be trusted.
  useEffect(() => {
    if (phase !== 'challenge') return undefined;
    const onMessage = (e) => { if (e.data?.type === 'synrapay-3ds-return') finish(); };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [phase, finish]);

  const busy = phase === 'paying';

  if (phase === 'challenge' || phase === 'verifying') {
    return (
      <section className="pay-card">
        <div className="pay-card__head">
          <h2>Verify with your bank</h2>
          {environment === 'sandbox' && <span className="pay-tag">Test mode</span>}
        </div>
        <p className="pay-muted">Your bank needs to confirm this payment. Complete the step below; this page continues automatically.</p>
        {challenge && (
          <iframe
            className="dc-frame"
            title="Bank verification"
            srcDoc={challenge}
            sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
          />
        )}
        {message && <p className={message.tone === 'error' ? 'pay-error' : 'pay-muted'} role="status">{message.text}</p>}
        <button type="button" className="pay-btn" onClick={finish} disabled={phase === 'verifying'}>
          {phase === 'verifying' ? 'Confirming payment…' : 'I’ve completed the verification'}
        </button>
        <button type="button" className="pay-switch" onClick={() => { setChallenge(null); setPhase('form'); setMessage(null); }} disabled={phase === 'verifying'}>
          Use a different card
        </button>
      </section>
    );
  }

  if (phase === 'pending') {
    return (
      <section className="pay-card">
        <h2>Confirming your payment</h2>
        <div className="pay-notice" role="status"><b>We’re checking with the bank.</b><span>{message?.text} Please don’t pay again until this is confirmed.</span></div>
        <button type="button" className="co-pay" onClick={onCheck}>Check payment status</button>
      </section>
    );
  }

  return (
    <form className="pay-card" onSubmit={pay} noValidate autoComplete="on">
      <div className="pay-card__head">
        <h2>Card details</h2>
        <span className="co-pay-opt__badges">
          {environment === 'sandbox' && <span className="pay-tag">Test mode</span>}
          <Mastercard /><Visa /><Amex />
        </span>
      </div>
      {message && <p className={message.tone === 'error' ? 'pay-error' : 'pay-muted'} role="alert">{message.text}</p>}
      <div className="co-stack">
        <Field label="Card number" value={card.number} onChange={(v) => set({ number: formatNumber(v) })} error={errors.number} inputMode="numeric" autoComplete="cc-number" maxLength={23} name="cardnumber" disabled={busy} />
        <div className="cf-row">
          <Field label="Expiry (MM/YY)" value={card.expiry} onChange={(v) => set({ expiry: formatExpiry(v) })} error={errors.expiry} inputMode="numeric" autoComplete="cc-exp" maxLength={5} name="cc-exp" disabled={busy} />
          <Field label="Security code" type="password" value={card.cvv} onChange={(v) => set({ cvv: digits(v).slice(0, 4) })} error={errors.cvv} inputMode="numeric" autoComplete="cc-csc" maxLength={4} name="cvc" disabled={busy} help="The 3 digits on the back of your card (4 on the front for American Express)." />
        </div>
        <Field label="Name on card" value={card.name} onChange={(v) => set({ name: v })} error={errors.name} autoComplete="cc-name" maxLength={100} name="ccname" disabled={busy} />
      </div>
      <button type="submit" className="co-pay" disabled={busy}>{busy ? 'Processing…' : `Pay ${amountLabel}`}</button>
      <p className="pay-secure"><LockIcon width={14} height={14} /> Sent securely to SynraPay. We don’t store your card number or security code.</p>
    </form>
  );
}
