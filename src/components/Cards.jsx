import { Link } from 'react-router-dom';
import { useState } from 'react';
import { imageOf, PLACEHOLDER } from '../utils/format';
import { categoryArt } from '../config/homeContent';
import {
  ArrowRight, BoltIcon, CalendarIcon, CartIcon, GiftIcon, GridIcon, PenIcon, PinIcon, SendIcon, ShieldIcon, StarIcon, StarLine,
} from './Icons';

export const ICONS = {
  cart: CartIcon, pen: PenIcon, send: SendIcon, gift: GiftIcon, bolt: BoltIcon, grid: GridIcon,
  shield: ShieldIcon, calendar: CalendarIcon, pin: PinIcon, star: StarLine,
};

/**
 * Shop by Category tile. Uses the category's own image when it loads; otherwise (missing URL, or a URL that
 * is not an image, e.g. an ImgBB page link) falls back to the matching design artwork.
 */
export function CategoryCard({ category: c, index = 0 }) {
  const art = categoryArt(c, index);
  const own = c.bannerUrl || c.iconUrl;
  const [src, setSrc] = useState(own || art.image);
  return (
    <Link to={`/c/${c.slug}`} className="cat-card">
      <div className="cat-card__media">
        <img src={src} alt="" loading="lazy" onError={() => setSrc(art.image)} />
        <span className="cat-card__icon"><GiftIcon width={16} height={16} /></span>
      </div>
      <div className="cat-card__body">
        <h3>{c.name}</h3>
        {(c.description || art.text) && <p>{c.description || art.text}</p>}
        <span className="round-arrow"><ArrowRight width={14} height={14} /></span>
      </div>
    </Link>
  );
}

/** Static design card whose title and button are part of the artwork. */
export function ArtCard({ to, image, title, wide = false }) {
  return (
    <Link to={to} className={`collection-card collection-card--art${wide ? ' collection-card--wide' : ''}`} aria-label={`${title} - Shop now`}>
      <img src={image} alt={title} loading="lazy" />
    </Link>
  );
}

/** Static brand gift card (arrow is part of the artwork). */
export function GiftCardTile({ card }) {
  return (
    <Link to={`/search?q=${encodeURIComponent(card.query)}`} className="brand-card">
      <div className="brand-card__media"><img src={card.image} alt={card.title} loading="lazy" /></div>
      <h3>{card.title}</h3>
      <p>{card.text}</p>
    </Link>
  );
}

/** Photo card with "Collection" kicker, white title and a white "Shop now" pill (recipient + occasion rows). */
export function CollectionCard({ to, image, title, kicker = 'Collection', wide = false }) {
  return (
    <Link to={to} className={`collection-card${wide ? ' collection-card--wide' : ''}`}>
      <img src={image || PLACEHOLDER} alt="" loading="lazy" />
      <div className="collection-card__top">
        <span>{kicker}</span>
        <h3>{title}</h3>
      </div>
      <span className="pill-btn">Shop now</span>
    </Link>
  );
}

/** Brand gift card: artwork with a floating arrow, then title + one line. */
export function BrandCard({ product: p }) {
  return (
    <Link to={`/p/${p.slug}`} className="brand-card">
      <div className="brand-card__media">
        <img src={imageOf(p)} alt={p.title} loading="lazy" />
        <span className="float-arrow"><ArrowRight width={16} height={16} /></span>
      </div>
      <h3>{p.title}</h3>
      {p.shortDescription && <p>{p.shortDescription}</p>}
    </Link>
  );
}

export function StepCard({ step, index, highlight }) {
  const Icon = ICONS[step.icon];
  return (
    <div className={`step-card${highlight ? ' step-card--hl' : ''}`}>
      <div className="step-card__top">
        <span className="icon-tile"><Icon width={20} height={20} /></span>
        <span className="step-card__num">{String(index + 1).padStart(2, '0')}</span>
      </div>
      <h3>{step.title}</h3>
      <p>{step.text}</p>
    </div>
  );
}

export function FeatureCard({ feature }) {
  const Icon = ICONS[feature.icon];
  return (
    <div className="feature-card">
      <span className="icon-circle"><Icon width={20} height={20} /></span>
      <h3>{feature.title}</h3>
      <p>{feature.text}</p>
    </div>
  );
}

/** Static testimonial (copy lives in config/site.js). */
export function TestimonialCard({ testimonial: t }) {
  return (
    <figure className="testimonial">
      <blockquote>“{t.quote}”</blockquote>
      <figcaption>
        <span className="avatar" style={{ background: t.tone }}>{t.name[0]}</span>
        <span className="testimonial__who"><strong>{t.name}</strong><small>{t.location}</small></span>
        <span className="stars" aria-label="5 out of 5">
          {[1, 2, 3, 4, 5].map((n) => <StarIcon key={n} width={14} height={14} className="on" />)}
        </span>
      </figcaption>
    </figure>
  );
}
