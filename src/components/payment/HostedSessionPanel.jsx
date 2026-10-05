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
  const [phase, setPhase] = useState('loading'); // loading | ready | paying | error
  const [card, setCard] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0); // bump to reload the SDK

  useEffect(() => {
    let live = true;
    setPhase('loading');
    setError(null);
    loadSdk(session.sdkUrl)
      .then(() => {
        if (!live) return;
        if (!window.SynraHostedSession) throw new Error('The secure card form failed to start.');
        container.current.innerHTML = '';
        handle.current = window.SynraHostedSession.mount({
          clientToken: session.clientToken,
          container: container.current,
          onReady: () => live && setPhase('ready'),
          onCard: (c) => live && setCard(c),
          onCompleted: (r) => {
            if (!live) return;
            if (r.ok) { setPhase('paying'); onCompleted(r); } else {
              setPhase('ready');
              setError({ code: 'DECLINED', message: r.message || 'The payment was not completed. Check your card details or try another card.' });
            }
          },
          onError: (e) => {
            if (!live) return;
            setError({ code: e.code, message: e.displayed ? null : e.message }); // displayed: the SDK already shows it
            const fatal = FALLBACK.includes(e.code) || RESTART.includes(e.code);
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
      try { handle.current?.destroy?.(); } catch { /* already gone */ }
      handle.current = null;
    };
  }, [session, onCompleted, attempt]);

  const pay = () => {
    if (!handle.current) return;
    setError(null);
    setPhase('paying');
    try { handle.current.pay(); } catch (e) { setPhase('ready'); setError({ code: 'PAY_FAILED', message: e.message }); }
  };

  const unavailable = FALLBACK.includes(error?.code); // the embedded form can't be used for this order
  const fallback = unavailable && session.fallbackCheckoutUrl;
  const restart = RESTART.includes(error?.code);

  return (
    <section className="pay-card">
      <div className="pay-card__head">
        <h2>Card details</h2>
        {session.environment === 'sandbox' && <span className="pay-tag">Test mode</span>}
      </div>

      {unavailable ? (
        <div className="pay-notice" role="alert">
          <b>The on-page card form isn’t available right now.</b>
          <span>
            {fallback
              ? 'You can pay for this same order on our payment provider’s secure page instead. You haven’t been charged.'
              : 'Please try again in a moment, or choose another way to pay below. You haven’t been charged.'}
          </span>
        </div>
      ) : (
        <div ref={container} className={`hs-fields${phase === 'loading' ? ' is-loading' : ''}`} aria-busy={phase === 'loading'} />
      )}
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
        <button type="button" className="co-pay" onClick={pay} disabled={phase !== 'ready'}>
          {phase === 'paying' ? 'Processing…' : phase === 'loading' ? 'Loading secure form…' : `Pay ${amountLabel}`}
        </button>
      )}
      <p className="pay-secure"><LockIcon width={14} height={14} /> Secured by SynraPay. We never see your card number.</p>
    </section>
  );
}
