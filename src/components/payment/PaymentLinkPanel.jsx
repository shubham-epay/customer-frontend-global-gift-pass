import { useState } from 'react';
import { SendIcon } from '../Icons';

const when = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

/** The created payment link: pay now, copy, share or have SynraPay email it (with a QR code). */
export default function PaymentLinkPanel({ link, email, onSendEmail, checking, onCheck }) {
  const [copied, setCopied] = useState(false);
  const [to, setTo] = useState(email || '');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState(null);

  const copy = async () => {
    try { await navigator.clipboard.writeText(link.url); } catch { window.prompt('Copy the payment link:', link.url); }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const send = async (e) => {
    e.preventDefault();
    setSending(true);
    setNotice(null);
    try {
      const r = await onSendEmail(to.trim() || undefined);
      setNotice({ ok: true, text: `Payment link sent to ${r.to || to}.` });
    } catch (err) {
      setNotice({ ok: false, text: err.message });
    } finally { setSending(false); }
  };

  const share = navigator.share ? () => navigator.share({ title: 'Global Gift Pass payment', url: link.url }).catch(() => {}) : null;
  const active = link.status === 'ACTIVE';

  return (
    <section className="pay-card">
      <div className="pay-card__head">
        <h2>{link.kind === 'QUICK' ? 'Quick payment link' : 'Your payment link'}</h2>
        <span className={`pay-tag${active ? ' is-ok' : ''}`}>{active ? 'Active' : link.status}</span>
      </div>
      <p className="pay-muted">
        {active ? `Valid until ${when(link.expiresAt)}. ` : ''}
        {link.kind === 'QUICK'
          ? 'After paying, the result is shown on the payment page.'
          : 'After paying, you’ll be brought back here automatically.'}
      </p>

      <div className="pay-linkbox">
        <input readOnly value={link.url} aria-label="Payment link" onFocus={(e) => e.target.select()} />
        <button type="button" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
      </div>

      <div className="pay-actions">
        <a className="co-pay" href={link.url} target="_blank" rel="noopener noreferrer" aria-disabled={!active}>Pay now</a>
        {share && <button type="button" className="pay-btn" onClick={share}>Share</button>}
        <button type="button" className="pay-btn" onClick={onCheck} disabled={checking}>{checking ? 'Checking…' : 'I’ve paid – check status'}</button>
      </div>

      <form className="pay-email" onSubmit={send}>
        <label htmlFor="pay-link-email">Email the link (includes a scan-to-pay QR code)</label>
        <div className="pay-linkbox">
          <input id="pay-link-email" type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@example.com" maxLength={254} />
          <button type="submit" disabled={sending || !active}><SendIcon width={15} height={15} />{sending ? 'Sending…' : 'Send'}</button>
        </div>
      </form>
      {notice && <p className={notice.ok ? 'pay-ok' : 'pay-error'} role="status">{notice.text}</p>}
    </section>
  );
}
