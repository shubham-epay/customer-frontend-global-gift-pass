import { useCallback, useEffect, useRef, useState } from 'react';
import { payments } from '../../api/store';
import { errorMessage, fieldErrors } from '../../api/client';
import { Check, Field } from '../checkout/Fields';
import { Amex, CARD_BRAND_BADGES, GenericCard, Mastercard, Visa } from '../checkout/Badges';
import { LockIcon } from '../Icons';
import { envLabel } from './PaymentMethodPicker';
import {
  blockDrop, cardNumberMaxLength, detectCardBrand, digitKeysOnly, digitPasteOnly, formatCardNumber, formatCvv,
  formatExpiry, normalizeName, onlyDigits, validateCard,
} from '../../utils/cardValidation';

// Brands always shown in the header; the one matching the typed card stays bright, the others dim.
const HEADER_BRANDS = [['mastercard', Mastercard], ['visa', Visa], ['amex', Amex]];
// Shared by the number, expiry and security code fields: no letters by keyboard, paste or drag-and-drop.
const numericGuards = { onPaste: digitPasteOnly, onDrop: blockDrop };
const BLANK = { number: '', expiry: '', cvv: '', name: '' };
const NEW_CARD = 'new';
const cardLabel = (c) => `${c.brand || 'Card'} •••• ${c.last4}`;

/**
 * SynraPay Direct API: our own card form. The card is posted to our backend over the same origin,
 * which forwards it to SynraPay in a signed call; it is kept only in this component's state and
 * cleared as soon as it has been sent. If the bank asks for 3-D Secure, its challenge page is shown
 * in a frame and the payment is finished by a second signed call from our backend.
 * A signed-in shopper can also pay with a card saved earlier (no number or security code needed) and
 * choose to save the card they type; saved cards are held by SynraPay, we only see brand and last 4.
 */
export default function DirectCardPanel({ orderNumber, token, amountLabel, defaultName = '', environment, authorizeOnly = false, canSaveCards = false, onPaid, onCheck }) {
  const [card, setCard] = useState({ ...BLANK, name: defaultName });
  const [errors, setErrors] = useState({});
  const [phase, setPhase] = useState('form'); // form | paying | challenge | verifying | pending
  const [challenge, setChallenge] = useState(null); // issuer's 3-D Secure HTML
  const [message, setMessage] = useState(null); // { tone: 'error' | 'info', text }
  const [wallet, setWallet] = useState({ enabled: false, cards: [] });
  const [selected, setSelected] = useState(NEW_CARD); // a saved card's id, or NEW_CARD
  const [saveCard, setSaveCard] = useState(false);
  const finishing = useRef(false);

  const loadWallet = useCallback(async () => {
    if (!canSaveCards) return;
    try {
      const { data } = await payments.savedCards(orderNumber, token);
      setWallet(data);
      setSelected((cur) => (data.cards.some((c) => c.id === cur) ? cur : data.cards[0]?.id || NEW_CARD));
    } catch { /* saved cards are optional: the card form still works */ }
  }, [canSaveCards, orderNumber, token]);
  useEffect(() => { loadWallet(); }, [loadWallet]);

  const removeSaved = async (c) => {
    if (!window.confirm(`Remove ${cardLabel(c)} from your saved cards?`)) return;
    try {
      await payments.removeSavedCard(c.id, environment);
      setMessage(null);
    } catch (err) {
      setMessage({ tone: 'error', text: errorMessage(err) });
    }
    loadWallet();
  };

  const set = (patch) => { setCard((c) => ({ ...c, ...patch })); setErrors((e) => { const n = { ...e }; Object.keys(patch).forEach((k) => delete n[k]); return n; }); };

  // Brand from the card number's BIN (data/cardBins.json): picks the icon and the security code length.
  const brand = detectCardBrand(card.number);
  const BrandBadge = (brand && CARD_BRAND_BADGES[brand.brand]) || GenericCard;

  // Number, Luhn, brand length, expiry, security code and name (incl. injection checks): utils/cardValidation.js
  const validate = () => validateCard(card);

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
    const useSaved = selected !== NEW_CARD;
    const e = useSaved ? {} : validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setPhase('paying');
    setMessage(null);
    const [mm, yy] = card.expiry.split('/');
    const browserDetails = {
      acceptHeaders: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      colorDepth: window.screen.colorDepth,
      javaEnabled: false,
      language: (navigator.language || 'en').slice(0, 35),
      screenHeight: window.screen.height,
      screenWidth: window.screen.width,
      timeZone: new Date().getTimezoneOffset(),
    };
    try {
      const { data } = await payments.directPay(orderNumber, token, {
        browser_details: browserDetails,
        ...(useSaved
          ? { paymentMethodId: selected }
          : {
            card: { number: onlyDigits(card.number), expiry_month: mm, expiry_year: yy, cvv: card.cvv, name: normalizeName(card.name) },
            ...(wallet.enabled && { saveCard }),
          }),
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
      if (useSaved) loadWallet(); // the saved card may have been removed or expired
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
  const useSaved = selected !== NEW_CARD;

  if (phase === 'challenge' || phase === 'verifying') {
    return (
      <section className="pay-card">
        <div className="pay-card__head">
          <h2>Verify with your bank</h2>
          {environment && <span className="pay-tag">{envLabel(environment)} · test mode</span>}
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
          {environment && <span className="pay-tag">{envLabel(environment)} · test mode</span>}
          {HEADER_BRANDS.map(([key, Badge]) => (
            <span key={key} className={`pay-brand ${brand && brand.brand !== key ? 'is-dim' : ''}`}><Badge /></span>
          ))}
        </span>
      </div>
      {message && <p className={message.tone === 'error' ? 'pay-error' : 'pay-muted'} role="alert">{message.text}</p>}
      {wallet.cards.length > 0 && (
        <div className="co-pay-list" role="radiogroup" aria-label="Card to pay with">
          {wallet.cards.map((c) => (
            <div key={c.id} className={`co-pay-opt ${selected === c.id ? 'is-active' : ''}`}>
              <label className="co-pay-opt__head">
                <input type="radio" name="dc-card" checked={selected === c.id} onChange={() => setSelected(c.id)} disabled={busy} />
                <span className="co-radio" />
                <span className="co-pay-opt__label">{cardLabel(c)} <span className="pay-muted">expires {c.expiryMonth}/{c.expiryYear}</span></span>
                <button type="button" className="pay-switch" onClick={(e) => { e.preventDefault(); removeSaved(c); }} disabled={busy}>Remove</button>
              </label>
            </div>
          ))}
          <div className={`co-pay-opt ${useSaved ? '' : 'is-active'}`}>
            <label className="co-pay-opt__head">
              <input type="radio" name="dc-card" checked={!useSaved} onChange={() => setSelected(NEW_CARD)} disabled={busy} />
              <span className="co-radio" />
              <span className="co-pay-opt__label">Use a new card</span>
            </label>
          </div>
        </div>
      )}
      {!useSaved && (
      <div className="co-stack">
        {/* Every onChange below re-formats through cardValidation, which drops anything that isn't a digit
            (covers mobile keyboards and autofill that skip the key/paste guards). */}
        <Field
          label="Card number" value={card.number} error={errors.number} name="cardnumber" disabled={busy}
          onChange={(v) => {
            const number = formatCardNumber(v);
            // A shorter security code for the new brand (Amex 4 -> Visa 3) is trimmed right away.
            set({ number, ...(card.cvv && { cvv: formatCvv(card.cvv, detectCardBrand(number)) }) });
          }}
          prefix={<span className="cf__prefix" title={brand?.label || 'Card'} aria-live="polite"><BrandBadge /></span>}
          inputMode="numeric" pattern="[0-9 ]*" autoComplete="cc-number" maxLength={cardNumberMaxLength(card.number)}
          onKeyDown={digitKeysOnly(' ')} {...numericGuards}
        />
        <div className="cf-row">
          <Field
            label="Expiry (MM/YY)" value={card.expiry} onChange={(v) => set({ expiry: formatExpiry(v) })} error={errors.expiry} name="cc-exp" disabled={busy}
            inputMode="numeric" pattern="[0-9/]*" autoComplete="cc-exp" maxLength={5}
            onKeyDown={digitKeysOnly('/')} {...numericGuards}
          />
          <Field
            label="Security code" type="password" value={card.cvv} onChange={(v) => set({ cvv: formatCvv(v, brand) })} error={errors.cvv} name="cvc" disabled={busy}
            inputMode="numeric" pattern="[0-9]*" autoComplete="cc-csc" maxLength={brand?.cvvLength ?? 4}
            onKeyDown={digitKeysOnly()} {...numericGuards}
            help="The 3 digits on the back of your card (4 on the front for American Express)."
          />
        </div>
        <Field label="Name on card" value={card.name} onChange={(v) => set({ name: v })} error={errors.name} autoComplete="cc-name" maxLength={100} name="ccname" disabled={busy} />
        {wallet.enabled && <Check checked={saveCard} onChange={setSaveCard}>Save this card for next time</Check>}
      </div>
      )}
      {useSaved && <p className="pay-muted">No card number or security code needed. Your bank may still ask you to verify the payment.</p>}
      {authorizeOnly && <p className="pay-muted">Authorize only: {amountLabel} is held on your card now and charged once we confirm your order.</p>}
      <button type="submit" className="co-pay" disabled={busy}>{busy ? 'Processing…' : `${authorizeOnly ? 'Authorize' : 'Pay'} ${amountLabel}`}</button>
      <p className="pay-secure"><LockIcon width={14} height={14} /> Sent securely to SynraPay. We don’t store your card number or security code.</p>
    </form>
  );
}
