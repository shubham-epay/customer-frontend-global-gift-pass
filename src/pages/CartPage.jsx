import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cart as cartApi } from '../api/store';
import { useShop } from '../auth/ShopContext';
import { imageOf, money } from '../utils/format';
import { EmptyState, PageLoader } from '../components/States';
import { TrashIcon } from '../components/Icons';

export function OrderSummary({ cart, children }) {
  const cur = cart.currency && cart.currency !== 'MIXED' ? cart.currency : 'AED';
  return (
    <div className="summary card">
      <h3>Order summary</h3>
      <dl>
        <div><dt>Subtotal ({cart.itemCount} item{cart.itemCount === 1 ? '' : 's'})</dt><dd>{money(cart.subtotal, cur)}</dd></div>
        {cart.discountTotal > 0 && <div className="discount"><dt>Discount{cart.coupon ? ` (${cart.coupon.code})` : ''}</dt><dd>−{money(cart.discountTotal, cur)}</dd></div>}
        <div className="muted"><dt>Includes VAT ({Math.round((cart.vatRate || 0) * 100)}%)</dt><dd>{money(cart.taxTotal, cur)}</dd></div>
        <div className="summary__total"><dt>Total</dt><dd>{money(cart.total, cur)}</dd></div>
      </dl>
      {children}
    </div>
  );
}

function CouponBox({ cart }) {
  const { mutate } = useShop();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async (fn) => { setBusy(true); try { await fn(); setCode(''); } catch { /* toast shown */ } finally { setBusy(false); } };

  if (cart.couponCode) {
    return (
      <div className="coupon coupon--applied">
        <span>Coupon <b>{cart.couponCode}</b> {cart.coupon ? 'applied' : ''}</span>
        {cart.couponError && <small className="error">{cart.couponError}</small>}
        <button type="button" className="link-btn" disabled={busy} onClick={() => run(() => mutate(() => cartApi.removeCoupon(), 'Coupon removed'))}>Remove</button>
      </div>
    );
  }
  return (
    <form className="coupon" onSubmit={(e) => { e.preventDefault(); if (code.trim()) run(() => mutate(() => cartApi.applyCoupon(code.trim()), 'Coupon applied')); }}>
      <input placeholder="Coupon code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={40} />
      <button type="submit" className="btn btn--outline btn--sm" disabled={busy || !code.trim()}>Apply</button>
    </form>
  );
}

function CartLine({ line }) {
  const { mutate } = useShop();
  const it = line.item;
  const setQty = (quantity) => mutate(() => cartApi.update(line._id, { quantity })).catch(() => {});
  const remove = () => mutate(() => cartApi.remove(line._id), 'Removed from cart').catch(() => {});
  const title = it?.title || 'Unavailable item';

  return (
    <li className={`cart-line${line.available ? '' : ' is-unavailable'}`}>
      <img src={imageOf(it)} alt="" />
      <div className="cart-line__info">
        {it?.slug ? <Link to={`/p/${it.slug}`} className="cart-line__title">{title}</Link> : <span className="cart-line__title">{title}</span>}
        <div className="muted small">
          {line.itemType === 'GIFT_BOX' ? 'Gift box' : [it?.partner?.name, it?.city].filter(Boolean).join(' · ')}
        </div>
        {(line.recipient?.name || line.recipient?.email) && (
          <div className="small">For: {[line.recipient.name, line.recipient.email].filter(Boolean).join(' · ')}</div>
        )}
        {line.amount != null && <div className="small">Amount: <strong>{money(line.amount, line.currency || it?.currency)}</strong></div>}
        {line.message && <div className="small muted clamp-2">“{line.message}”</div>}
        {!line.available && <div className="error small">{line.unavailableReason || 'No longer available'} — please remove it to continue.</div>}
      </div>
      <div className="stepper stepper--sm">
        <button type="button" disabled={!line.available || line.quantity <= 1} onClick={() => setQty(line.quantity - 1)} aria-label="Decrease">−</button>
        <output>{line.quantity}</output>
        <button type="button" disabled={!line.available || line.quantity >= 100} onClick={() => setQty(line.quantity + 1)} aria-label="Increase">+</button>
      </div>
      <strong className="cart-line__total">{money(line.lineTotal, it?.currency)}</strong>
      <button type="button" className="icon-btn" onClick={remove} aria-label="Remove"><TrashIcon /></button>
    </li>
  );
}

export default function CartPage() {
  const { cart, reloadCart } = useShop();
  useEffect(() => { reloadCart(); }, [reloadCart]);

  if (!cart) return <PageLoader />;
  if (!cart.items.length) {
    return <div className="container section"><EmptyState title="Your cart is empty" text="Find an experience worth gifting." action="Start exploring" /></div>;
  }

  return (
    <div className="container page">
      <h1 className="page__title">Your cart</h1>
      <div className="two-col">
        <ul className="cart-lines card">{cart.items.map((l) => <CartLine key={l._id} line={l} />)}</ul>
        <OrderSummary cart={cart}>
          <CouponBox cart={cart} />
          {cart.hasUnavailableItems
            ? <button type="button" className="btn btn--primary btn--block" disabled>Remove unavailable items</button>
            : <Link to="/checkout" className="btn btn--primary btn--block">Proceed to checkout</Link>}
          <Link to="/" className="link-more center">Continue shopping</Link>
        </OrderSummary>
      </div>
    </div>
  );
}
