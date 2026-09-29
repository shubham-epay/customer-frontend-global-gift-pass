import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useShop } from '../auth/ShopContext';
import { discountPct, imageOf, money } from '../utils/format';
import { BagIcon } from './Icons';

/** Newest-first listings mark items created in the last 30 days as NEW (when createdAt is present). */
const isNew = (p) => p.createdAt && Date.now() - new Date(p.createdAt).getTime() < 30 * 864e5;

function Badge({ product: p, off }) {
  if (p.bestSeller) return <span className="badge-tag badge-tag--dark">Bestseller</span>;
  if (off > 0) return <span className="badge-tag badge-tag--red">{off}% off</span>;
  if (p.flashSale) return <span className="badge-tag badge-tag--red">Flash sale</span>;
  if (isNew(p)) return <span className="badge-tag badge-tag--light">New</span>;
  return null;
}

/** "Gift pass card" from the design system: image + badge, title, one-line copy, price and a square add-to-cart button. */
export default function ProductCard({ product: p }) {
  const { addToCart } = useShop();
  const [busy, setBusy] = useState(false);
  const off = discountPct(p.price, p.salePrice);

  const add = async () => {
    setBusy(true);
    try { await addToCart({ itemType: 'PRODUCT', productId: p._id, quantity: 1 }); } catch { /* toast shown */ } finally { setBusy(false); }
  };

  return (
    <article className="pass-card">
      <Link to={`/p/${p.slug}`} className="pass-card__media">
        <img src={imageOf(p)} alt={p.title} loading="lazy" />
        <Badge product={p} off={off} />
      </Link>
      <div className="pass-card__body">
        <h3 className="pass-card__title"><Link to={`/p/${p.slug}`}>{p.title}</Link></h3>
        {p.shortDescription && <p className="pass-card__text">{p.shortDescription}</p>}
        <div className="pass-card__foot">
          <div className="price">
            <strong>{money(p.salePrice ?? p.price, p.currency)}</strong>
            {off > 0 && <s>{money(p.price, p.currency)}</s>}
          </div>
          <button type="button" className="add-btn" onClick={add} disabled={busy} aria-label={`Add ${p.title} to cart`}>
            <BagIcon width={18} height={18} />
          </button>
        </div>
      </div>
    </article>
  );
}
