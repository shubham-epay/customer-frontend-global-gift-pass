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
import {
  ArrowRight, CartIcon, CheckIcon, ChevronLeft, ChevronRight, ClockIcon, CloseIcon, HeartIcon, PinIcon, ShieldIcon, StarIcon, UserIcon,
} from '../components/Icons';
import '../styles/product.css';

/* ------------------------------------------------------------------ gallery */
function Gallery({ images, title, off }) {
  const [active, setActive] = useState(0);
  const n = images.length;
  const go = (d) => setActive((i) => (i + d + n) % n);
  return (
    <div className="pd-gallery">
      <div className="pd-gallery__main">
        <img src={images[active]} alt={title} />
        {off > 0 && <span className="pd-off">{off}% OFF</span>}
        {n > 1 && (
          <>
            <button type="button" className="pd-gallery__nav pd-gallery__nav--prev" onClick={() => go(-1)} aria-label="Previous image"><ChevronLeft width={20} height={20} /></button>
            <button type="button" className="pd-gallery__nav pd-gallery__nav--next" onClick={() => go(1)} aria-label="Next image"><ChevronRight width={20} height={20} /></button>
          </>
        )}
      </div>
      {n > 1 && (
        <div className="pd-gallery__thumbs">
          {images.map((src, i) => (
            <button key={src + i} type="button" className={i === active ? 'is-active' : ''} onClick={() => setActive(i)} aria-label={`Image ${i + 1}`}>
              <img src={src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Stars({ value, size = 16 }) {
  return (
    <span className="stars" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((k) => <StarIcon key={k} width={size} height={size} className={k <= Math.round(value) ? 'on' : ''} />)}
    </span>
  );
}

/* ------------------------------------------------------------------ amount / denomination pickers */
/** Suggested amounts inside an open range, e.g. 50–5,000 -> 50, 100, 250, 500, 1000. */
function presetsFor(min, max) {
  const steps = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
  const inRange = steps.filter((v) => v >= min && v <= max);
  const picks = inRange.length > 5 ? inRange.filter((_, i) => i % Math.ceil(inRange.length / 5) === 0).slice(0, 5) : inRange;
  return picks.length ? picks : [min];
}

function AmountPicker({ product: p, value, onChange, error }) {
  const presets = presetsFor(p.amountMin, p.amountMax);
  return (
    <div className="amount-picker">
      <span className="amount-picker__label">Choose an amount</span>
      <div className="amount-picker__presets">
        {presets.map((v) => (
          <button key={v} type="button" className={Number(value) === v ? 'is-on' : ''} onClick={() => onChange(String(v))}>{money(v, p.currency)}</button>
        ))}
      </div>
      <label className="amount-picker__input">
        <span>{p.currency || 'AED'}</span>
        <input type="number" inputMode="decimal" min={p.amountMin} max={p.amountMax} step="1" placeholder={`${p.amountMin} – ${p.amountMax}`}
          value={value} onChange={(e) => onChange(e.target.value)} aria-label={`Amount between ${p.amountMin} and ${p.amountMax}`} />
      </label>
      <small className={error ? 'error' : 'muted'}>{error || `Any amount from ${money(p.amountMin, p.currency)} to ${money(p.amountMax, p.currency)}`}</small>
    </div>
  );
}

function DenominationPicker({ product: p, denominations, value, onChange }) {
  return (
    <div className="denom-picker">
      <span className="denom-picker__label">Choose a denomination</span>
      <div className="denom-picker__list" role="radiogroup" aria-label="Denomination">
        {denominations.map((d) => (
          <button key={d.value} type="button" role="radio" aria-checked={value === d.value} className={value === d.value ? 'is-on' : ''} onClick={() => onChange(d.value)}>
            {d.label || money(d.value, p.currency)}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ buy box (right column) */
function BuyBox({ product: p, off: listOff }) {
  const { addToCart, wishIds, toggleWishlist } = useShop();
  const navigate = useNavigate();
  const denoms = [...(p.denominations || [])].sort((a, b) => a.value - b.value);
  const hasDenoms = denoms.length > 0;
  // The highest denomination is shown first (and is the product's listed price).
  const [denomValue, setDenomValue] = useState(hasDenoms ? denoms[denoms.length - 1].value : null);
  const denom = denoms.find((d) => d.value === denomValue);
  const openAmount = !hasDenoms && p.amountMin != null && p.amountMax != null;
  const [amount, setAmount] = useState(openAmount ? String(presetsFor(p.amountMin, p.amountMax)[0]) : '');
  const [qty, setQty] = useState(1);
  const [gift, setGift] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const off = hasDenoms ? discountPct(denom?.oldPrice, denom?.price) : listOff;
  const saved = wishIds.has(String(p._id));
  const amountNum = Number(amount);
  const amountError = openAmount && (!amount || Number.isNaN(amountNum) || amountNum < p.amountMin || amountNum > p.amountMax)
    ? `Enter an amount between ${p.amountMin} and ${p.amountMax}` : null;
  const price = hasDenoms ? denom?.price : openAmount ? (amountError ? p.amountMin : amountNum) : p.salePrice ?? p.price;
  const was = hasDenoms ? denom?.oldPrice : p.price;

  const submit = async (goToCheckout) => {
    if (amountError) { setErrors({ amount: amountError }); return; }
    setBusy(true);
    setErrors({});
    try {
      const body = { itemType: 'PRODUCT', productId: p._id, quantity: qty };
      if (openAmount) body.amount = amountNum;
      if (hasDenoms) body.amount = denomValue;
      if (gift) {
        body.recipient = { name: form.name || undefined, email: form.email || undefined };
        body.message = form.message || undefined;
      }
      const r = await addToCart(body);
      if (r && goToCheckout) navigate('/checkout');
    } catch (err) {
      setErrors(fieldErrors(err));
    } finally { setBusy(false); }
  };

  return (
    <div className="pd-buy">
      <div className="pd-buy__price">
        <strong>{money(price, p.currency)}</strong>
        {off > 0 && <s>{money(was, p.currency)}</s>}
        {off > 0 && <span className="pd-off pd-off--inline">{off}% OFF</span>}
      </div>
      <p className="pd-buy__note">Price includes VAT · Valid for {p.validityDays} days from purchase</p>

      {hasDenoms && <DenominationPicker product={p} denominations={denoms} value={denomValue} onChange={setDenomValue} />}
      {openAmount && <AmountPicker product={p} value={amount} onChange={(v) => { setAmount(v); setErrors({}); }} error={errors.amount} />}

      <div className="pd-buy__qty">
        <span>Quantity</span>
        <div className="pd-stepper">
          <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} disabled={qty <= 1} aria-label="Decrease quantity">−</button>
          <output aria-live="polite">{qty}</output>
          <button type="button" onClick={() => setQty(Math.min(100, qty + 1))} disabled={qty >= 100} aria-label="Increase quantity">+</button>
        </div>
      </div>

      <label className="pd-check">
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

      <button type="button" className="pd-btn pd-btn--buy" disabled={busy} onClick={() => submit(true)}>Buy Now <ArrowRight width={18} height={18} /></button>
      <div className="pd-buy__row">
        <button type="button" className="pd-btn pd-btn--cart" disabled={busy} onClick={() => submit(false)}><CartIcon width={20} height={20} />Add to cart</button>
        <button type="button" className={`pd-wish${saved ? ' is-active' : ''}`} onClick={() => toggleWishlist(p._id)} aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'} aria-pressed={saved}>
          <HeartIcon filled={saved} width={20} height={20} />
        </button>
      </div>
      <p className="pd-buy__secure"><ShieldIcon width={16} height={16} />Secure checkout · Codes delivered to your email</p>
    </div>
  );
}

/* ------------------------------------------------------------------ product information */
/** Renders admin text that uses **bold** markers (as product imports do) as real bold - no HTML is interpreted. */
function Rich({ text }) {
  const parts = String(text).split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part));
}

function InfoCard({ title, children, className = '' }) {
  return (
    <section className={`pd-card ${className}`}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

/** Long text (description, terms) is clamped with a Read more toggle. */
function LongText({ text, lines = 8 }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 600 || text.split('\n').length > lines;
  return (
    <>
      <p className={`pd-text${long && !open ? ' pd-text--clamp' : ''}`} style={{ '--lines': lines }}><Rich text={text} /></p>
      {long && <button type="button" className="pd-more" onClick={() => setOpen(!open)}>{open ? 'Show less' : 'Read more'}</button>}
    </>
  );
}

/** Everything else the product record holds: inclusions, how to use, instructions, terms, package facts, partner, reviews. */
function ProductInfo({ p }) {
  const partner = p.partnerId;
  const has = (a) => Array.isArray(a) && a.length > 0;
  // The product's own package details and public attributes win; standard facts fill in what they don't cover.
  const own = [
    ...(p.packageDetails || []).filter((d) => d.label && d.value).map((d) => [d.label, d.value]),
    ...(p.attributes || []).map((a) => [a.label, a.value]),
  ];
  const covered = new Set(own.map(([k]) => k.trim().toLowerCase()));
  const facts = [
    ...[
      p.duration && ['Duration', p.duration],
      p.peopleCount && ['Suitable for', `${p.peopleCount} ${p.peopleCount === 1 ? 'person' : 'people'}`],
      p.validityDays && ['Validity', `${p.validityDays} days from purchase`],
      (p.city || p.country) && ['Location', [p.city, p.country].filter(Boolean).join(', ')],
    ].filter((f) => f && !covered.has(f[0].toLowerCase())),
    ...own,
  ].filter((f, i, all) => all.findIndex((g) => g[0].toLowerCase() === f[0].toLowerCase()) === i);

  return (
    <div className="pd-info-grid">
      <div className="pd-info-main">
        {(has(p.whatsIncluded) || has(p.whatsNotIncluded)) && (
          <div className="pd-incl">
            {has(p.whatsIncluded) && (
              <InfoCard title="What’s included">
                <ul className="pd-list pd-list--yes">{p.whatsIncluded.map((t) => <li key={t}><CheckIcon width={16} height={16} /><span><Rich text={t} /></span></li>)}</ul>
              </InfoCard>
            )}
            {has(p.whatsNotIncluded) && (
              <InfoCard title="Not included">
                <ul className="pd-list pd-list--no">{p.whatsNotIncluded.map((t) => <li key={t}><CloseIcon width={16} height={16} /><span><Rich text={t} /></span></li>)}</ul>
              </InfoCard>
            )}
          </div>
        )}

        {has(p.howToUse) && (
          <InfoCard title="How to use your gift">
            <ol className="pd-steps">{p.howToUse.map((t, i) => <li key={t}><span>{i + 1}</span><p><Rich text={t} /></p></li>)}</ol>
          </InfoCard>
        )}

        {has(p.importantInstructions) && (
          <InfoCard title="Important instructions" className="pd-card--notice">
            <ul className="pd-list pd-list--dot">{p.importantInstructions.map((t) => <li key={t}><span><Rich text={t} /></span></li>)}</ul>
          </InfoCard>
        )}

        {p.termsConditions && <InfoCard title="Terms & conditions"><LongText text={p.termsConditions} /></InfoCard>}
        {p.legalNote && <p className="pd-legal"><Rich text={p.legalNote} /></p>}

        <InfoCard title="Reviews">
          {p.reviews.length === 0 ? <p className="muted">No reviews yet.</p> : (
            <ul className="reviews">
              {p.reviews.map((r) => (
                <li key={r._id}>
                  <div className="reviews__head"><Stars value={r.rating} size={14} /><strong>{r.title}</strong></div>
                  {r.comment && <p>{r.comment}</p>}
                  <small className="muted">{r.author} · {fmtDate(r.createdAt)}</small>
                </li>
              ))}
            </ul>
          )}
        </InfoCard>
      </div>

      <aside className="pd-info-side">
        {facts.length > 0 && (
          <InfoCard title="Package details">
            <dl className="pd-facts">{facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          </InfoCard>
        )}
        {partner && (
          <section className="pd-card pd-partner">
            {partner.coverImageUrl && <img className="pd-partner__cover" src={partner.coverImageUrl} alt="" />}
            <div className="pd-partner__head">
              {partner.logoUrl ? <img src={partner.logoUrl} alt="" className="pd-partner__logo" /> : <span className="pd-partner__logo pd-partner__logo--blank"><UserIcon width={18} height={18} /></span>}
              <div><span className="eyebrow">Hosted by</span><h3>{partner.name}</h3></div>
            </div>
            {partner.description && <p className="muted">{partner.description}</p>}
            {partner.address && <p className="pd-partner__row"><PinIcon width={16} height={16} />{partner.address}</p>}
            {partner.workingHours && <p className="pd-partner__row"><ClockIcon width={16} height={16} />{partner.workingHours}</p>}
            {partner.website && <a href={partner.website} target="_blank" rel="noopener noreferrer" className="link-arrow">Visit website <ArrowRight width={14} height={14} /></a>}
          </section>
        )}
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ page */
export default function ProductPage() {
  const { slug } = useParams();
  const { data: p, loading, error, status, reload } = useAsync(() => catalog.product(slug), [slug]);

  if (loading && !p) return <PageLoader />;
  if (status === 404) return <div className="container section"><EmptyState title="Experience not found" text="It may no longer be available." action="Browse experiences" /></div>;
  if (error) return <div className="container section"><ErrorState message={error} onRetry={reload} /></div>;

  const images = [...new Set([...(p.imageUrls || []), ...(p.galleryUrls || [])])];
  const hasDenoms = p.denominations?.length > 0;
  const openAmount = p.amountMin != null && p.amountMax != null;
  const off = hasDenoms || openAmount ? 0 : discountPct(p.price, p.salePrice);
  const description = p.description || p.shortDescription;

  return (
    <>
      <div className="container pd">
        <nav className="pd-crumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link><ChevronRight width={14} height={14} />
          {p.categoryId && <><Link to={`/c/${p.categoryId.slug}`}>{p.categoryId.name}</Link><ChevronRight width={14} height={14} /></>}
          <span aria-current="page">{p.title}</span>
        </nav>

        <div className="pd-top">
          <Gallery images={images.length ? images : [imageOf(p)]} title={p.title} off={off} />

          <div className="pd-main">
            <div className="pd-tags">
              {p.categoryId && <Link to={`/c/${p.categoryId.slug}`} className="pd-cat">{p.categoryId.name}</Link>}
              {p.bestSeller && <span className="pd-tag pd-tag--dark">Bestseller</span>}
              {p.flashSale && <span className="pd-tag">Flash sale</span>}
            </div>
            <h1>{p.title}</h1>
            {p.ratingCount > 0 && (
              <div className="pd-rating"><Stars value={p.ratingAvg} /><span>{p.ratingAvg.toFixed(1)}</span><span className="muted">({p.ratingCount})</span></div>
            )}
            <div className="pd-chips">
              {(p.city || p.country) && <span className="pd-chip"><PinIcon width={16} height={16} />{[p.city, p.country].filter(Boolean).join(', ')}</span>}
              {p.duration && <span className="pd-chip"><ClockIcon width={16} height={16} />{p.duration}</span>}
              {p.peopleCount && <span className="pd-chip"><UserIcon width={16} height={16} />For {p.peopleCount}</span>}
            </div>
            {p.countries?.length > 0 && (
              <div className="availability">
                <span>Available in</span>
                {p.countries.map((c) => <span key={c._id} className="availability__chip"><span aria-hidden>{c.flag}</span>{c.name}</span>)}
              </div>
            )}
            {description && (
              <div className="pd-desc">
                <h2>Product Description</h2>
                <LongText text={description} lines={9} />
              </div>
            )}
          </div>

          <BuyBox product={p} off={off} />
        </div>

        <ProductInfo p={p} />
      </div>

      {p.related.length > 0 && (
        <Section title="You may also like" subtitle={p.categoryId ? `More in ${p.categoryId.name}` : undefined} carousel bleed cols={4.13}>
          {p.related.map((r) => <ProductCard key={r._id} product={r} />)}
        </Section>
      )}
    </>
  );
}
