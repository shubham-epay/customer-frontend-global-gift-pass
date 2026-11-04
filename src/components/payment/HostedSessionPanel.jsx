import { useEffect, useRef, useState } from 'react';
import { LockIcon } from '../Icons';
import { envLabel } from './PaymentMethodPicker';

const scripts = new Map();
const SDK_TIMEOUT_MS = 15000;
/** Loads the SynraPay Hosted Session SDK once. A failed or stalled load can be retried. */
function loadSdk(src) {
  if (!scripts.has(src)) {
    scripts.set(src, new Promise((resolve, reject) => {
      const el = document.createElement('script');
      const fail = () => { clearTimeout(timer); scripts.delete(src); el.remove(); reject(new Error('SDK_LOAD_FAILED')); };
      const timer = setTimeout(fail, SDK_TIMEOUT_MS);
      el.src = src;
      el.async = true;
      el.onload = () => { clearTimeout(timer); resolve(); };
      el.onerror = fail;
      document.head.appendChild(el);
    }));
  }
  return scripts.get(src);
}

// The embedded form can't be used for this order, but SynraPay's own page can.
const FALLBACK = ['PROVIDER_UNAVAILABLE', 'PROVIDER_UNSUPPORTED', 'SDK_LOAD_FAILED'];
// The session is gone; a new attempt is needed.
const RESTART = ['SESSION_EXPIRED', 'INVALID_SESSION', 'INVALID_CLIENT_TOKEN', 'ENVIRONMENT_MISMATCH', 'ORDER_NOT_FOUND', 'TOKEN_EXPIRED'];

/**
 * SynraPay's card fields mounted in our page. The SDK talks to SynraPay directly; card data never
 * reaches our servers. onCompleted only decides what to show - the webhook decides if the order is paid.
 */
export default function HostedSessionPanel({ session, amountLabel, onCompleted, onRestart }) {
  const container = useRef(null);
  const handle = useRef(null);
  const done = useRef(false); // the SDK reported a successful payment
  const [phase, setPhase] = useState('loading'); // loading | ready | paying | error
  const [card, setCard] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0); // bump to reload the SDK
  // Latest callback without making it a reason to re-mount: the SDK is mounted once per client token.
  const completed = useRef(onCompleted);
  useEffect(() => { completed.current = onCompleted; }, [onCompleted]);

  useEffect(() => {
    let live = true;
    const box = container.current;
    done.current = false;
    setPhase('loading');
    setError(null);
    loadSdk(session.sdkUrl)
      .then(() => {
        if (!live) return;
        if (!window.SynraPayFields) throw new Error('The secure card form failed to start.');
        box.innerHTML = '';
        // The client token is a credential for the card form: only its start is logged.
        console.log('[hosted-session] SDK create payload:', { clientToken: `${String(session.clientToken).slice(0, 8)}...`, container: '#synra-card', sdkUrl: session.sdkUrl });
        const fields = window.SynraPayFields.create({
          clientToken: session.clientToken, // from Create Session, passed unchanged
          container: '#synra-card',
          redirect: false, // stay on our pay page: the webhook / Get Status decide if the order is paid
        });
        handle.current = fields;
        fields.on('ready', () => { console.log('[hosted-session] SDK ready'); if (live) setPhase('ready'); });
        fields.on('error', (e) => {
          console.log('[hosted-session] SDK error response:', e);
          if (!live) return;
          setError({ code: e.code, message: e.message });
          // The fields cannot be used after an 'error' event: show the notice instead of a dead Pay button.
          setPhase('error');
        });
      })
      .catch((e) => {
        if (!live) return;
        setPhase('error');
        // The SDK script itself didn't load (provider's script host unreachable or blocked): no message
        // here, the dedicated notice below explains it and offers the secure payment page.
        setError(e.message === 'SDK_LOAD_FAILED' ? { code: 'SDK_LOAD_FAILED', message: null } : { code: 'SDK_START_FAILED', message: e.message });
      });

    return () => {
      live = false;
      // destroy() closes the SDK's 3-D Secure window but leaves its fields behind: remove them too.
      try { handle.current?.destroy?.(); } catch { /* already gone */ }
      handle.current = null;
      if (box) box.innerHTML = '';
    };
  }, [session.sdkUrl, session.clientToken, attempt]);

  const pay = async () => {
    if (!handle.current) return;
    setError(null);
    setPhase('paying');
    console.log('[hosted-session] SDK submit() called');
    let r;
    try { r = await handle.current.submit(); } catch (e) { setError({ code: 'PAY_FAILED', message: e.message }); setPhase('ready'); return; }
    console.log('[hosted-session] SDK submit() response:', r);
    // 3-D Secure: the tab is leaving for the bank check and comes back to this page. Show nothing.
    if (r.navigating) return;
    if (r.card) setCard(r.card);
    // ok: paid. pending: the bank hasn't answered yet. Either way our API (webhook / Get Status)
    // has the real answer, so keep "Processing" and let the page wait for it.
    if (r.ok || String(r.status).toLowerCase() === 'pending') { done.current = true; completed.current(r); return; }
    if (r.status === 'DESTROYED') return;
    setPhase('ready');
    setError({ code: r.error_code || 'DECLINED', message: r.error_message || 'The payment was not completed. Check your card details or try another card.' });
  };

  const restart = RESTART.includes(error?.code);
  // The embedded form can't be used for this order: the provider said so, or it never finished loading.
  const unavailable = FALLBACK.includes(error?.code) || (phase === 'error' && !restart);
  const fallback = unavailable && session.fallbackCheckoutUrl;

  return (
    <section className="pay-card">
      <div className="pay-card__head">
        <h2>Card details</h2>
        {session.environment && <span className="pay-tag">{envLabel(session.environment)} · test mode</span>}
      </div>
      {unavailable && (
        <div className="pay-notice" role="alert">
          <b>The on-page card form isn’t available right now.</b>
          <span>
            {fallback
              ? 'You can pay for this same order on our payment provider’s secure page instead. You haven’t been charged.'
              : 'Please try again in a moment, or choose another way to pay below. You haven’t been charged.'}
          </span>
        </div>
      )}
      {/* Always in the page (hidden behind the notice) so "Try the card form again" has somewhere to mount. */}
      <div id="synra-card" ref={container} hidden={unavailable} className={`hs-fields${phase === 'loading' ? ' is-loading' : ''}`} aria-busy={phase === 'loading'} />
      {!unavailable && card?.last4 && <p className="pay-muted">Paying with {card.brand} •••• {card.last4}</p>}
      {error?.message && <p className="pay-error" role="alert">{error.message}</p>}

      {unavailable ? (
        <>
          {fallback && <a className="co-pay" href={session.fallbackCheckoutUrl}>Continue to secure payment page</a>}
          <button type="button" className="pay-btn" onClick={() => setAttempt((n) => n + 1)}>Try the card form again</button>
        </>
      ) : restart ? (
        <button type="button" className="co-pay" onClick={onRestart}>Start a new payment</button>
      ) : (
        <button type="button" id="pay-button" className="co-pay" onClick={pay} disabled={phase !== 'ready'}>
          {phase === 'paying' ? 'Processing…' : phase === 'loading' ? 'Loading secure form…' : `Pay ${amountLabel}`}
        </button>
      )}
      <p className="pay-secure"><LockIcon width={14} height={14} /> Secured by SynraPay. We never see your card number.</p>
    </section>
  );
}
