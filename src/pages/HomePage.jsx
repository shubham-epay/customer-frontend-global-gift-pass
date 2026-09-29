import { useEffect } from 'react';
import { Link, useLocation, useOutletContext } from 'react-router-dom';
import { catalog } from '../api/store';
import useAsync from '../utils/useAsync';
import { imageOf } from '../utils/format';
import {
  GIFT_CARDS_CATEGORY_SLUG, HERO, HOW_IT_WORKS, OCCASIONS_CATEGORY_SLUG, PROMO_BAND, TESTIMONIALS, WELCOME_POINTS, WHY_US,
} from '../config/site';
import Section, { Heading } from '../components/Section';
import ProductCard from '../components/ProductCard';
import {
  ArtCard, BrandCard, CategoryCard, CollectionCard, FeatureCard, GiftCardTile, ICONS, StepCard, TestimonialCard,
} from '../components/Cards';
import { GIFT_CARDS, OCCASIONS, RECIPIENTS, isGiftCard } from '../config/homeContent';
import { ArrowRight } from '../components/Icons';
import heroImage from '../assets/hero-dining.png';
import collageImage from '../assets/collage.png';
import welcomeImage from '../assets/welcome.png';

/*
 * Home page. Headings and marketing copy are static (design); every card list comes from the customer API:
 *   Shop by Category     GET /api/categories                (top-level categories, shared with the header)
 *   Popular Gift Passes  GET /api/products (newest first, brand gift cards excluded)
 *   Shop by Recipient    GET /api/home -> collections              (design cards while there are none)
 *   Popular Gift Cards   GET /api/categories/gift-cards/products   (design brand cards while there are none)
 *   Shop by Occasion     GET /api/categories -> children of "occasions" (design cards while there are none)
 * Category images fall back to the design artwork when the category has no usable image.
 */

function Hero({ categories }) {
  const dining = categories.find((c) => c.slug === HERO.categorySlug);
  const to = dining ? `/c/${dining.slug}` : `/search?q=${encodeURIComponent(HERO.categorySlug)}`;
  return (
    <section className="hero">
      <div className="container">
        <div className="hero__frame">
          <img src={heroImage} alt="" className="hero__img" />
          <div className="hero__content">
            <h1>{HERO.title}</h1>
            <p>{HERO.text}</p>
            <Link className="btn btn--primary btn--lg" to={to}>{HERO.cta}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function PromoBand() {
  return (
    <section className="section">
      <div className="container">
        <div className="promo-band">
          <img src={collageImage} alt="" className="promo-band__art" />
          <div className="promo-band__copy">
            <h2>{PROMO_BAND.title[0]}<br />{PROMO_BAND.title[1]} <em>{PROMO_BAND.accent}</em></h2>
            <p>{PROMO_BAND.text}</p>
            <Link to="/categories" className="btn btn--primary">{PROMO_BAND.cta}<ArrowRight width={16} height={16} /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Welcome() {
  return (
    <section className="section">
      <div className="container">
        <div className="welcome">
          <img src={welcomeImage} alt="" className="welcome__img" loading="lazy" />
          <div className="welcome__copy">
            <Heading title="Welcome to" accent="Global Gift Pass" />
            {WELCOME_POINTS.map((pt) => {
              const Icon = ICONS[pt.icon];
              return (
                <div key={pt.title} className="welcome__point">
                  <span className="icon-tile"><Icon width={20} height={20} /></span>
                  <div>
                    <h3>{pt.title}</h3>
                    {pt.text.map((t) => <p key={t}>{t}</p>)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const { categories = [] } = useOutletContext() || {};
  const { hash } = useLocation();
  const passes = useAsync(() => catalog.products({ sort: 'newest', limit: 40 }), []);
  const home = useAsync(() => catalog.home(), []);
  const giftCards = useAsync(() => catalog.categoryProducts(GIFT_CARDS_CATEGORY_SLUG, { sort: 'popular', limit: 4 }), []);

  // Anchor links such as /#how-it-works resolve after first paint.
  useEffect(() => { if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }); }, [hash]);

  const shopCategories = categories.filter((c) => c.slug !== OCCASIONS_CATEGORY_SLUG && c.slug !== GIFT_CARDS_CATEGORY_SLUG);
  const occasions = categories.find((c) => c.slug === OCCASIONS_CATEGORY_SLUG)?.children || [];
  const passItems = (passes.data?.items || []).filter((p) => !isGiftCard(p)).slice(0, 12);
  const collections = home.data?.collections || [];
  const cardItems = giftCards.data?.items || [];

  return (
    <div className="home">
      <Hero categories={categories} />

      {shopCategories.length > 0 && (
        <Section title="Shop by" accent="Category" subtitle="Explore gift cards and experiences for every moment." carousel cols={6}>
          {shopCategories.map((c, i) => <CategoryCard key={c._id} category={c} index={i} />)}
        </Section>
      )}

      {passItems.length > 0 && (
        <Section title="Popular Gift Passes" subtitle="Give them the freedom to choose what they love." carousel bleed cols={4.13}>
          {passItems.map((p) => <ProductCard key={p._id} product={p} />)}
        </Section>
      )}

      <Section title="Shop by Recipient" carousel bleed cols={4.13}>
        {collections.length > 0
          ? collections.map((c) => (
            <CollectionCard key={c._id} to={`/collections/${c.slug}`} image={c.imageUrl || (c.products[0] && imageOf(c.products[0]))} title={c.title} />
          ))
          : RECIPIENTS.map((r) => <ArtCard key={r.title} {...r} />)}
      </Section>

      <Section title="Popular Gift Cards" to={cardItems.length ? `/c/${GIFT_CARDS_CATEGORY_SLUG}` : '/search?q=gift%20card'} cols={4}>
        {cardItems.length > 0
          ? cardItems.map((p) => <BrandCard key={p._id} product={p} />)
          : GIFT_CARDS.map((g) => <GiftCardTile key={g.title} card={g} />)}
      </Section>

      <Section title="Shop by Occasion" carousel cols={3}>
        {occasions.length > 0
          ? occasions.map((c) => <CollectionCard key={c._id} wide to={`/c/${c.slug}`} image={c.bannerUrl || c.iconUrl} title={c.name} />)
          : OCCASIONS.map((o) => <ArtCard key={o.title} wide {...o} />)}
      </Section>

      <section id="how-it-works" className="section section--band">
        <div className="container">
          <div className="section__head section__head--center">
            <Heading title="How It Works" className="section__title section__title--xl" />
            <p className="section__subtitle">Gifting happiness is simple - four steps, a few minutes.</p>
          </div>
          <div className="grid-cols" style={{ '--cols': 4 }}>
            {HOW_IT_WORKS.map((s, i) => <StepCard key={s.title} step={s} index={i} highlight={i === HOW_IT_WORKS.length - 1} />)}
          </div>
        </div>
      </section>

      <PromoBand />

      <section className="section">
        <div className="container">
          <div className="section__head section__head--center">
            <Heading title="Why Choose" accent="Global Gift Pass?" />
            <p className="section__subtitle">Everything you need to give a gift they will actually love.</p>
          </div>
          <div className="grid-cols" style={{ '--cols': 4 }}>
            {WHY_US.map((f) => <FeatureCard key={f.title} feature={f} />)}
          </div>
        </div>
      </section>

      <Welcome />

      <Section title="What Our" accent="Customers Say" subtitle="Real stories from people across the UAE who make moments special." carousel cols={3}>
        {TESTIMONIALS.map((t) => <TestimonialCard key={t.name} testimonial={t} />)}
      </Section>
    </div>
  );
}
