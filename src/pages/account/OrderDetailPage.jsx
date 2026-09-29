import { Link, useLocation, useParams } from 'react-router-dom';
import { account } from '../../api/store';
import useAsync from '../../utils/useAsync';
import { fmtDate, imageOf, money, titleCase } from '../../utils/format';
import { ErrorState, PageLoader } from '../../components/States';
import { StatusPill } from './OrdersPage';
import { VoucherCard } from './VouchersPage';

export default function OrderDetailPage() {
  const { id } = useParams();
  const { state } = useLocation();
  const { data: o, loading, error, reload } = useAsync(() => account.order(id), [id]);

  if (loading && !o) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="stack">
      <Link to="/account/orders" className="link-more">← All orders</Link>
      {state?.justPlaced && (
        <div className="alert alert--success">Thank you! Your order has been placed. Vouchers will appear here once payment is confirmed.</div>
      )}
      <div className="card panel">
        <div className="panel__head">
          <div><h1 className="page__title">Order {o.orderNumber}</h1><div className="small muted">Placed {fmtDate(o.placedAt || o.createdAt)} · Delivery by {titleCase(o.deliveryMethod)}</div></div>
          <div className="pills"><StatusPill value={o.orderStatus} /><span className="small muted">Payment: {titleCase(o.paymentStatus)}</span></div>
        </div>
        <ul className="cart-lines">
          {o.items.map((i) => (
            <li key={i._id} className="cart-line cart-line--static">
              <img src={imageOf({ imageUrl: i.imageUrlSnapshot })} alt="" />
              <div className="cart-line__info">
                <span className="cart-line__title">{i.titleSnapshot}</span>
                <div className="small muted">Qty {i.quantity} · {money(i.unitPrice, o.currency)} each</div>
                {i.recipient?.email && <div className="small">For: {[i.recipient.name, i.recipient.email].filter(Boolean).join(' · ')}</div>}
                {i.message && <div className="small muted clamp-2">“{i.message}”</div>}
              </div>
              <strong className="cart-line__total">{money(i.lineTotal, o.currency)}</strong>
            </li>
          ))}
        </ul>
        <dl className="totals">
          <div><dt>Subtotal</dt><dd>{money(o.subtotal, o.currency)}</dd></div>
          {o.discountTotal > 0 && <div className="discount"><dt>Discount{o.couponCode ? ` (${o.couponCode})` : ''}</dt><dd>−{money(o.discountTotal, o.currency)}</dd></div>}
          <div className="muted"><dt>Includes VAT</dt><dd>{money(o.taxTotal, o.currency)}</dd></div>
          <div className="summary__total"><dt>Total</dt><dd>{money(o.total, o.currency)}</dd></div>
        </dl>
      </div>

      {o.vouchers.length > 0 && (
        <>
          <h2 className="section__title">Vouchers</h2>
          <div className="grid grid--vouchers">{o.vouchers.map((v) => <VoucherCard key={v._id} voucher={v} />)}</div>
        </>
      )}
    </div>
  );
}
