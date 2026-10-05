import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { EmptyState } from '../components/States';
import { imageOf, titleCase } from '../utils/format';

const METHOD_LABEL = { CARD: 'Card', HOSTED_SESSION: 'Card', DIRECT_CARD: 'Card', PAY_BY_LINK: 'Payment link' };
const amount = (v, currency) => `${currency} ${Number(v || 0).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Shown right after checkout (guest or signed in). The order comes from navigation state / this tab's session. */
export default function OrderConfirmedPage() {
  const { state } = useLocation();
  const { isAuthed } = useAuth();
  let order = state?.order;
  if (!order) { try { order = JSON.parse(sessionStorage.getItem('ggp-last-order') || 'null'); } catch { order = null; } }
  if (!order) return <div className="container section"><EmptyState title="No recent order" text="Your order confirmation was sent to your email." action="Continue shopping" /></div>;

  const first = order.customer?.name?.split(' ')[0];
  return (
    <div className="container page">
      <div className="confirm card">
        <span className="confirm__tick" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
        </span>
        <p className="confirm__num">Order {order.orderNumber}</p>
        <h1>Thank you{first ? `, ${first}` : ''}!</h1>
        <p className="muted">
          We’ve received your order. A confirmation is on its way to <b>{order.customer?.email}</b>, and your gift vouchers will be
          emailed as soon as payment is confirmed.
        </p>
        <ul className="confirm__items">
          {order.items?.map((i) => (
            <li key={i._id}>
              <img src={imageOf({ imageUrl: i.imageUrlSnapshot })} alt="" />
              <span><b>{i.titleSnapshot}</b><small>Qty {i.quantity}{i.recipient?.email ? ` · to ${i.recipient.email}` : ''}</small></span>
              <span>{amount(i.lineTotal, order.currency)}</span>
            </li>
          ))}
        </ul>
        <dl className="totals">
          <div><dt>Subtotal</dt><dd>{amount(order.subtotal, order.currency)}</dd></div>
          {order.discountTotal > 0 && <div className="discount"><dt>Discount</dt><dd>−{amount(order.discountTotal, order.currency)}</dd></div>}
          <div className="summary__total"><dt>Total</dt><dd>{amount(order.total, order.currency)}</dd></div>
        </dl>
        <p className="small muted">Payment: {METHOD_LABEL[order.paymentMethod] || titleCase(order.paymentMethod || 'CARD')} · Status: {titleCase(order.paymentStatus || 'PENDING')}</p>
        <div className="row-actions confirm__actions">
          <Link to="/" className="btn btn--primary">Continue shopping</Link>
          {isAuthed && order._id && <Link to={`/account/orders/${order._id}`} className="btn btn--outline">View order</Link>}
        </div>
      </div>
    </div>
  );
}
