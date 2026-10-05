import { useEffect, useRef, useState } from 'react';
import { LockIcon } from '../Icons';

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
const RESTART = ['SESSION_EXPIRED', 'INVALID_SESSION', 'INVALID_CLIENT_TOKEN', 'ORDER_NOT_FOUND'];

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
        if (!window.SynraHostedSession) throw new Error('The secure card form failed to start.');
        box.innerHTML = '';
        handle.current = window.SynraHostedSession.mount({
          clientToken: session.clientToken, // from Create Session, passed unchanged
          container: '#synra-card',
          onReady: () => live && setPhase('ready'),
          onCard: (c) => live && setCard(c),
          onCompleted: (r) => {
            if (!live) return;
            // ok: paid. pending: the bank hasn't answered yet. Either way our API (webhook / Get Status)
            // has the real answer, so keep "Processing" and let the page wait for it.
            if (r.ok || r.status === 'pending') { done.current = true; setPhase('paying'); completed.current(r); } else {
              setPhase('ready');
              setError({ code: 'DECLINED', message: r.message || 'The payment was not completed. Check your card details or try another card.' });
            }
          },
          onError: (e) => {
            if (!live) return;
            setError({ code: e.code, message: e.displayed ? null : e.message }); // displayed: the SDK already shows it
            const fatal = FALLBACK.includes(e.code) || RESTART.includes(e.code);
            // An error before the fields are ready (e.g. SynraPay could not be reached from this page)
            // means there is no form to pay with: 'error' shows the notice instead of a dead Pay button.
            setPhase((p) => (fatal || p === 'loading' ? 'error' : 'ready'));
          },
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
    try { await handle.current.pay(); } catch (e) { setError({ code: 'PAY_FAILED', message: e.message }); }
    // pay() also settles with no callback: the bank's 3-D Secure screen opened, or the SDK showed an
    // error inside the form. Only a successful payment keeps the button on "Processing".
    setPhase((p) => (p === 'paying' && !done.current ? 'ready' : p));
  };

  const restart = RESTART.includes(error?.code);
  // The embedded form can't be used for this order: the provider said so, or it never finished loading.
  const unavailable = FALLBACK.includes(error?.code) || (phase === 'error' && !restart);
  const fallback = unavailable && session.fallbackCheckoutUrl;

  return (
    <section className="pay-card">
      <div className="pay-card__head">
        <h2>Card details</h2>
        {session.environment === 'sandbox' && <span className="pay-tag">Test mode</span>}
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
