import { useEffect, useRef, useState } from 'react';
import { LockIcon } from '../Icons';
import { envLabel, isLive } from './PaymentMethodPicker';
import { hostedSessionScript } from './synrapayScripts';

const SDK_TIMEOUT_MS = 15000;
const problem = (code) => Object.assign(new Error(code), { code });

// The script that is on the page (or loading), and for which URL. Each environment's script defines the
// same window.SynraHostedSession (and loads its own window.SynraPayFields), so only one can be active.
let loaded = { src: null, promise: null };
/**
 * Loads the Hosted Session script of one environment, straight from SynraPay's script host.
 * Switching environment swaps the script: a token only works with its own environment's script.
 * A failed or stalled load can be retried.
 */
function loadSdk(src) {
  if (loaded.src === src && loaded.promise) return loaded.promise;
  if (loaded.src && loaded.src !== src) {
    // The other environment's script: drop it and its card fields so the new one starts clean.
    document.querySelectorAll('script[data-synra-hs]').forEach((el) => el.remove());
    try { delete window.SynraHostedSession; delete window.SynraPayFields; } catch { window.SynraHostedSession = undefined; window.SynraPayFields = undefined; }
  }
  const promise = new Promise((resolve, reject) => {
    const el = document.createElement('script');
    const fail = () => { clearTimeout(timer); if (loaded.promise === promise) loaded = { src: null, promise: null }; el.remove(); reject(problem('SDK_LOAD_FAILED')); };
    const timer = setTimeout(fail, SDK_TIMEOUT_MS);
    el.dataset.synraHs = '1';
    el.src = src;
    el.async = true;
    el.onload = () => {
      clearTimeout(timer);
      if (window.SynraHostedSession?.mount) resolve(window.SynraHostedSession);
      else fail();
    };
    el.onerror = fail;
    document.head.appendChild(el);
  });
  loaded = { src, promise };
  return loaded.promise;
}

// The session is gone; a new attempt is needed.
const RESTART = ['SESSION_EXPIRED', 'INVALID_SESSION', 'INVALID_CLIENT_TOKEN', 'NO_CLIENT_TOKEN', 'ENVIRONMENT_MISMATCH', 'ORDER_NOT_FOUND', 'TOKEN_EXPIRED', 'SESSION_ERROR', 'HOSTED_FIELDS_ATTEMPTS_EXHAUSTED'];
// Passing problems the fields recover from by themselves (they already show what's wrong, or are busy).
const TRANSIENT = ['VALIDATION_FAILED', 'NOT_READY', 'BUSY'];

/**
 * SynraPay's card fields mounted in a div on our page. The script talks to SynraPay directly; card data
 * never reaches our servers. 3-D Secure opens as an overlay over this page, with no redirect.
 * onCompleted only decides what to show - the webhook decides if the order is paid.
 */
export default function HostedSessionPanel({ session, amountLabel, onCompleted, onRestart, title = 'Card details' }) {
  const container = useRef(null);
  const handle = useRef(null);
  const done = useRef(false); // a successful (or pending) payment was reported
  const [phase, setPhase] = useState('loading'); // loading | ready | paying | error
  const [card, setCard] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0); // bump to reload the form
  // Latest callback without making it a reason to re-mount: the form is mounted once per client token.
  const completed = useRef(onCompleted);
  useEffect(() => { completed.current = onCompleted; }, [onCompleted]);

  useEffect(() => {
    let live = true;
    const box = container.current;
    done.current = false;
    setPhase('loading');
    setError(null);

    // One place for every outcome: pay()'s answer and the onCompleted callback can both report it.
    const finish = (r) => {
      if (!live || !r || done.current) return;
      if (r.card) setCard(r.card);
      if (r.ok || r.status === 'success' || r.status === 'pending') {
        done.current = true;
        setPhase('paying'); // keep "Processing" while our API confirms
        completed.current(r);
        return;
      }
      setPhase('ready');
      setError({ code: r.code || (r.status === 'cancel' ? 'CANCELLED' : 'DECLINED'), message: r.message || 'The payment was not completed. Check your card details or try another card.' });
    };

    // The script of the environment that created this session, as given in SynraPay's docs.
    const script = hostedSessionScript(session.environment);
    (script ? loadSdk(script) : Promise.reject(problem('ENVIRONMENT_UNSUPPORTED')))
      .then((SDK) => {
        if (!live) return;
        box.innerHTML = '';
        // The client token is a credential for the card form: only its start is logged.
        console.log('[hosted-session] mount:', { clientToken: `${String(session.clientToken).slice(0, 8)}...`, container: '#synra-card', script, environment: SDK.environment, version: SDK.version });
        handle.current = SDK.mount({
          clientToken: session.clientToken, // from Create Session, passed unchanged
          container: box,
          onReady: () => { console.log('[hosted-session] ready'); if (live) setPhase('ready'); },
          onCard: (c) => { if (live) setCard(c); },
          onCompleted: (r) => { console.log('[hosted-session] completed:', r); finish(r); },
          onError: (e) => {
            console.log('[hosted-session] error:', e?.code, e?.message);
            if (!live) return;
            if (TRANSIENT.includes(e?.code) || e?.displayed) {
              // The fields show the problem themselves; let the shopper fix it and pay again.
              setPhase((p) => (p === 'loading' ? p : 'ready'));
              return;
            }
            setError({ code: e?.code || 'SESSION_ERROR', message: e?.message || null });
            setPhase('error');
          },
        });
      })
      .catch((e) => {
        if (!live) return;
        // The script itself didn't load (scripts host unreachable or blocked): the notice below explains it.
        setPhase('error');
        setError({ code: e.code || 'SDK_LOAD_FAILED', message: null });
      });

    return () => {
      live = false;
      try { handle.current?.destroy?.(); } catch { /* already gone */ }
      handle.current = null;
      if (box) box.innerHTML = '';
    };
  }, [session.clientToken, session.environment, attempt]);

  const pay = async () => {
    if (!handle.current || phase !== 'ready') return;
    setError(null);
    setPhase('paying');
    let r;
    try { r = await handle.current.pay(); } catch (e) { setError({ code: 'PAY_FAILED', message: e.message }); setPhase('ready'); return; }
    console.log('[hosted-session] pay() result:', r);
    if (!r || r.navigating || r.code === 'DESTROYED') return;
    // Validation / not-ready problems: the fields show them (onError also fired); just re-enable Pay.
    if (TRANSIENT.includes(r.code)) { setPhase('ready'); return; }
    if (done.current) return;
    if (r.ok || r.status === 'pending') { done.current = true; if (r.card) setCard(r.card); completed.current(r); return; }
    setPhase('ready');
    setError({ code: r.code || 'DECLINED', message: r.message || 'The payment was not completed. Check your card details or try another card.' });
  };

  const restart = RESTART.includes(error?.code) || /SESSION_(INVALID|EXPIRED)|TOKEN_(INVALID|EXPIRED)/.test(error?.code || '');
  // Any other error: the embedded form can't be used (provider unavailable, script didn't load, ...).
  const unavailable = phase === 'error' && !restart;
  const fallback = unavailable && session.fallbackCheckoutUrl;

  return (
    <section className="pay-card">
      <div className="pay-card__head">
        <h2>{title}</h2>
        {session.environment && <span className={`pay-tag${isLive(session.environment) ? ' is-live' : ''}`}>{envLabel(session.environment)} · {isLive(session.environment) ? 'live' : 'test mode'}</span>}
      </div>
      {unavailable && (
        <div className="pay-notice" role="alert">
          <b>The on-page card form isn’t available right now.</b>
          <span>
            {fallback
              ? 'You can pay for this same order on our payment provider’s secure page instead. You haven’t been charged.'
              : 'Please try again in a moment, or choose another way to pay. You haven’t been charged.'}
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
