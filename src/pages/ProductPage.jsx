import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { catalog } from '../api/store';
import { fieldErrors } from '../api/client';
import { useShop } from '../auth/ShopContext';
import useAsync from '../utils/useAsync';
import { discountPct, fmtDate, imageOf, money } from '../utils/format';
import Section from '../components/Section';
import ProductCard from '../components/ProductCard';
import { EmptyState, ErrorState, PageLoader } from '../components/States';
import { ClockIcon, HeartIcon, PinIcon, StarIcon } from '../components/Icons';

function Gallery({ images, title }) {
  const [active, setActive] = useState(0);
  return (
    <div className="gallery">
      <div className="gallery__main"><img src={images[active]} alt={title} /></div>
      {images.length > 1 && (
        <div className="gallery__thumbs">
          {images.map((src, i) => (
            <button key={src} type="button" className={i === active ? 'is-active' : ''} onClick={() => setActive(i)} aria-label={`Image ${i + 1}`}>
              <img src={src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Stars({ value }) {
  return (
    <span className="stars" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => <StarIcon key={n} width={14} height={14} className={n <= Math.round(value) ? 'on' : ''} />)}
    </span>
  );
}

function BuyBox({ product: p }) {
  const { addToCart, wishIds, toggleWishlist } = useShop();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [gift, setGift] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const off = discountPct(p.price, p.salePrice);
  const saved = wishIds.has(String(p._id));

  const submit = async (goToCart) => {
    setBusy(true);
    setErrors({});
    try {
      const body = { itemType: 'PRODUCT', productId: p._id, quantity: qty };
      if (gift) {
        body.recipient = { name: form.name || undefined, email: form.email || undefined };
        body.message = form.message || undefined;
      }
      const r = await addToCart(body);
      if (r && goToCart) navigate('/cart');
    } catch (err) {
      setErrors(fieldErrors(err));
    } finally { setBusy(false); }
  };

  return (
    <div className="buybox card">
      <div className="price price--lg">
        <strong>{money(p.salePrice ?? p.price, p.currency)}</strong>
        {off > 0 && <><s>{money(p.price, p.currency)}</s><span className="badge-tag badge-tag--red" style={{ position: 'static' }}>{off}% off</span></>}
      </div>
      <small className="muted">Price includes VAT · Valid for {p.validityDays} days from purchase</small>

      <div className="qty">
        <span>Quantity</span>
        <div className="stepper">
          <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease">−</button>
          <output>{qty}</output>
          <button type="button" onClick={() => setQty(Math.min(100, qty + 1))} aria-label="Increase">+</button>
        </div>
      </div>

      <label className="check">
        <input type="checkbox" checked={gift} onChange={(e) => setGift(e.target.checked)} />
        Send as a gift to someone else
      </label>
      {gift && (
        <div className="gift-form">
          <input placeholder="Recipient name" value={form.name} maxLength={120} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input type="email" placeholder="Recipient email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          {errors['recipient.email'] && <small className="error">{errors['recipient.email']}</small>}
          <textarea rows={3} placeholder="Personal message (optional)" value={form.message} maxLength={1000} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        </div>
      )}

      <div className="buybox__actions">
        <button type="button" className="btn btn--primary btn--block" disabled={busy} onClick={() => submit(true)}>Buy now</button>
        <button type="button" className="btn btn--outline btn--block" disabled={busy} onClick={() => submit(false)}>Add to cart</button>
        <button type="button" className={`icon-btn icon-btn--round${saved ? ' is-active' : ''}`} onClick={() => toggleWishlist(p._id)} aria-label="Wishlist" aria-pressed={saved}>
          <HeartIcon filled={saved} />
        </button>
      </div>
    </div>
  );
}

export default function ProductPage() {
  const { slug } = useParams();
  const { data: p, loading, error, status, reload } = useAsync(() => catalog.product(slug), [slug]);

  if (loading && !p) return <PageLoader />;
  if (status === 404) return <div className="container section"><EmptyState title="Experience not found" text="It may no longer be available." action="Browse experiences" /></div>;
  if (error) return <div className="container section"><ErrorState message={error} onRetry={reload} /></div>;

  const images = [...(p.imageUrls || []), ...(p.galleryUrls || [])];
  const partner = p.partnerId;

  return (
    <>
      <div className="container product">
        <nav className="breadcrumb">
          <Link to="/">Home</Link><span>/</span>
          {p.categoryId && <><Link to={`/c/${p.categoryId.slug}`}>{p.categoryId.name}</Link><span>/</span></>}
          <span>{p.title}</span>
        </nav>
        <div className="product__top">
          <Gallery images={images.length ? images : [imageOf(p)]} title={p.title} />
          <div className="product__info">
            <div className="product__badges">
              {p.flashSale && <span className="badge-tag badge-tag--red">Flash sale</span>}
              {p.bestSeller && <span className="badge-tag badge-tag--dark">Bestseller</span>}
              {p.featured && <span className="badge-tag badge-tag--light">Featured</span>}
            </div>
            <h1>{p.title}</h1>
            {p.ratingCount > 0 && <div className="rating-line"><Stars value={p.ratingAvg} /> {p.ratingAvg.toFixed(1)} <span className="muted">({p.ratingCount} reviews)</span></div>}
            <div className="meta-row meta-row--lg">
              <span><PinIcon width={16} height={16} />{[p.city, p.country].filter(Boolean).join(', ')}</span>
              {p.duration && <span><ClockIcon width={16} height={16} />{p.duration}</span>}
              {p.peopleCount && <span>For {p.peopleCount} {p.peopleCount === 1 ? 'person' : 'people'}</span>}
            </div>
            {p.shortDescription && <p className="lead">{p.shortDescription}</p>}
            <BuyBox product={p} />
          </div>
        </div>

        <div className="product__details">
          <div>
            {p.description && <section className="prose"><h2>About this experience</h2><p>{p.description}</p></section>}
            {p.termsConditions && <section className="prose"><h2>Terms &amp; conditions</h2><p>{p.termsConditions}</p></section>}
            <section className="prose">
              <h2>Reviews</h2>
              {p.reviews.length === 0 ? <p className="muted">No reviews yet.</p> : (
                <ul className="reviews">
                  {p.reviews.map((r) => (
                    <li key={r._id}>
                      <div className="reviews__head"><Stars value={r.rating} /><strong>{r.title}</strong></div>
                      {r.comment && <p>{r.comment}</p>}
                      <small className="muted">{r.author} · {fmtDate(r.createdAt)}</small>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
          {partner && (
            <aside className="partner card">
              {partner.coverImageUrl && <img className="partner__cover" src={partner.coverImageUrl} alt="" />}
              <div className="partner__body">
                <div className="partner__head">
                  {partner.logoUrl && <img src={partner.logoUrl} alt="" className="partner__logo" />}
                  <div><span className="eyebrow">Hosted by</span><h3>{partner.name}</h3></div>
                </div>
                {partner.description && <p className="muted">{partner.description}</p>}
                {partner.address && <p><PinIcon width={14} height={14} /> {partner.address}</p>}
                {partner.workingHours && <p><ClockIcon width={14} height={14} /> {partner.workingHours}</p>}
                {partner.website && <a href={partner.website} target="_blank" rel="noopener noreferrer" className="link-more">Visit website</a>}
              </div>
            </aside>
          )}
        </div>
      </div>

      {p.related.length > 0 && (
        <Section title="You may also" accent="like" carousel bleed cols={4}>
          {p.related.map((r) => <ProductCard key={r._id} product={r} />)}
        </Section>
      )}
    </>
  );
}
