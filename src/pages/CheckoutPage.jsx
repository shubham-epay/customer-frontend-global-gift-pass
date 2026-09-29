import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { account, cart as cartApi } from '../api/store';
import { errorMessage, fieldErrors } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useShop } from '../auth/ShopContext';
import { useToast } from '../components/Toast';
import { EmptyState, PageLoader } from '../components/States';
import { OrderSummary } from './CartPage';
import { AddressForm } from './account/AddressesPage';

const METHODS = [
  ['EMAIL', 'Email', 'The e-voucher is emailed to each recipient.'],
  ['SMS', 'SMS', 'The voucher code is sent by text message.'],
  ['PHYSICAL', 'Printed gift card', 'We post a printed voucher to your shipping address.'],
];

const addressLine = (a) => [a.line1, a.line2, a.city, a.state, a.country, a.postalCode].filter(Boolean).join(', ');

export default function CheckoutPage() {
  const { user } = useAuth();
  const { cart, reloadCart, setCart } = useShop();
  const toast = useToast();
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ deliveryMethod: 'EMAIL', senderName: user?.name || '', billingAddressId: '', shippingAddressId: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { reloadCart(); }, [reloadCart]);
  useEffect(() => {
    account.addresses().then((r) => {
      setAddresses(r.data);
      const def = r.data.find((a) => a.isDefault);
      if (def) setForm((f) => ({ ...f, billingAddressId: def._id, shippingAddressId: def._id }));
    }).catch(() => setAddresses([]));
  }, []);

  if (!cart || !addresses) return <PageLoader />;
  if (!cart.items.length) return <div className="container section"><EmptyState title="Your cart is empty" action="Start exploring" /></div>;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const placeOrder = async () => {
    setBusy(true);
    setErrors({});
    try {
      const { data } = await cartApi.checkout({
        deliveryMethod: form.deliveryMethod,
        senderName: form.senderName || undefined,
        billingAddressId: form.billingAddressId || undefined,
        shippingAddressId: form.deliveryMethod === 'PHYSICAL' ? form.shippingAddressId || undefined : undefined,
      });
      setCart(null);
      reloadCart();
      toast.success('Order placed');
      navigate(`/account/orders/${data._id}`, { replace: true, state: { justPlaced: true } });
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally { setBusy(false); }
  };

  const addressPicker = (field) => (
    <div className="address-pick">
      {addresses.map((a) => (
        <label key={a._id} className={`radio-card${form[field] === a._id ? ' is-active' : ''}`}>
          <input type="radio" name={field} checked={form[field] === a._id} onChange={() => set(field, a._id)} />
          <div><strong>{a.label || a.fullName}</strong><div className="small muted">{a.fullName} · {addressLine(a)}</div></div>
        </label>
      ))}
      {errors[field] && <small className="error">{errors[field]}</small>}
    </div>
  );

  return (
    <div className="container page">
      <nav className="breadcrumb"><Link to="/cart">Cart</Link><span>/</span><span>Checkout</span></nav>
      <h1 className="page__title">Checkout</h1>
      <div className="two-col">
        <div className="stack">
          <section className="card panel">
            <h3>1. Delivery method</h3>
            <div className="radio-grid">
              {METHODS.map(([v, l, d]) => (
                <label key={v} className={`radio-card${form.deliveryMethod === v ? ' is-active' : ''}`}>
                  <input type="radio" name="deliveryMethod" checked={form.deliveryMethod === v} onChange={() => set('deliveryMethod', v)} />
                  <div><strong>{l}</strong><div className="small muted">{d}</div></div>
                </label>
              ))}
            </div>
          </section>

          <section className="card panel">
            <h3>2. From</h3>
            <label className="field">
              <span>Sender name shown on the voucher</span>
              <input value={form.senderName} maxLength={120} onChange={(e) => set('senderName', e.target.value)} />
            </label>
          </section>

          <section className="card panel">
            <div className="panel__head">
              <h3>3. {form.deliveryMethod === 'PHYSICAL' ? 'Billing & shipping address' : 'Billing address (optional)'}</h3>
              {!adding && <button type="button" className="link-btn" onClick={() => setAdding(true)}>+ Add address</button>}
            </div>
            {adding && (
              <AddressForm
                onCancel={() => setAdding(false)}
                onSaved={(list) => {
                  setAddresses(list);
                  const added = list[list.length - 1];
                  setForm((f) => ({ ...f, billingAddressId: added._id, shippingAddressId: added._id }));
                  setAdding(false);
                }}
              />
            )}
            {addresses.length === 0 && !adding && <p className="muted">No saved addresses.</p>}
            {addresses.length > 0 && (
              <>
                <h4 className="sub">Billing</h4>
                {addressPicker('billingAddressId')}
                {form.deliveryMethod === 'PHYSICAL' && (<><h4 className="sub">Shipping</h4>{addressPicker('shippingAddressId')}</>)}
              </>
            )}
            {errors.shippingAddressId && addresses.length === 0 && <small className="error">{errors.shippingAddressId}</small>}
          </section>

          <section className="card panel">
            <h3>4. Review items</h3>
            <ul className="mini-lines">
              {cart.items.map((l) => (
                <li key={l._id}>
                  <span>{l.item?.title} × {l.quantity}</span>
                  <span className="muted small">{l.recipient?.email ? `to ${l.recipient.email}` : 'to you'}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <OrderSummary cart={cart}>
          <button type="button" className="btn btn--primary btn--block" disabled={busy || cart.hasUnavailableItems} onClick={placeOrder}>
            {busy ? 'Placing order…' : `Place order · ${cart.total} AED`}
          </button>
          <small className="muted center">Your vouchers are issued as soon as payment is confirmed.</small>
        </OrderSummary>
      </div>
    </div>
  );
}
