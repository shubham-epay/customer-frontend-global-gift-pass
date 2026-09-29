import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useShop } from '../auth/ShopContext';
import { catalog } from '../api/store';
import { SOCIAL_LINKS } from '../config/site';
import Logo from './Logo';
import { useToast } from './Toast';
import {
  BoltIcon, BriefcaseIcon, CartIcon, FacebookIcon, GiftIcon, GridIcon, HomeIcon,
  InstagramIcon, LinkedinIcon, LockIcon, SearchIcon, SunIcon, UserIcon, YoutubeIcon,
} from './Icons';

function SearchBox() {
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const navigate = useNavigate();
  const submit = (e) => {
    e.preventDefault();
    const term = q.trim();
    if (term) navigate(`/search?q=${encodeURIComponent(term)}`);
  };
  return (
    <form className="search" role="search" onSubmit={submit}>
      <SearchIcon width={18} height={18} className="search__icon" />
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search our Wonders — brands, experiences, occasions" aria-label="Search" maxLength={100} />
      <button type="submit" className="btn btn--dark btn--sm">Search</button>
    </form>
  );
}

/** Category bar item: a plain link to the category page. */
function NavItem({ category }) {
  return (
    <div className="catbar__item">
      <NavLink to={`/c/${category.slug}`} className="catbar__link">{category.name}</NavLink>
    </div>
  );
}

const Chips = () => (
  <div className="chips-row">
    <Link to="/deals?featured=true" className="chip chip--amber"><SunIcon width={16} height={16} />Summer Deals</Link>
    <Link to="/deals?flashSale=true" className="chip chip--red"><BoltIcon width={14} height={14} />Flash Sale</Link>
  </div>
);

function Header({ categories }) {
  const { isAuthed } = useAuth();
  const { cartCount } = useShop();

  return (
    <header className="header">
      <div className="container header__top">
        <Logo />
        <div className="header__search"><SearchBox /></div>
        <div className="header__right">
          <Link to="/page/corporate" className="header__cta">
            <BriefcaseIcon />
            <span><small>For business</small>Corporate Gifts</span>
          </Link>
          <Link to="/account/vouchers" className="header__cta">
            <GiftIcon className="red" />
            <span><small>Got a Gift?</small>Redeem Voucher</span>
          </Link>
          <span className="header__divider" />
          <Link to={isAuthed ? '/account' : '/login'} className="icon-btn" aria-label={isAuthed ? 'My account' : 'Sign in'}><UserIcon /></Link>
          <Link to="/cart" className="icon-btn" aria-label={`Cart, ${cartCount} items`}>
            <CartIcon /><span className="badge">{cartCount}</span>
          </Link>
        </div>
      </div>
      <div className="header__mobile-search container"><SearchBox /></div>
      <nav className="catbar" aria-label="Categories">
        <div className="container catbar__inner">
          <Chips />
          {categories.length > 0 && <span className="catbar__sep" />}
          <div className={`catbar__links${categories.length >= 7 ? ' catbar__links--spread' : ''}`}>{categories.map((c) => <NavItem key={c._id} category={c} />)}</div>
        </div>
      </nav>
    </header>
  );
}

function Newsletter() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const submit = (e) => {
    e.preventDefault();
    // No newsletter API exists yet - tell the visitor rather than pretend it worked.
    toast.error('Newsletter sign-up isn’t available yet.');
  };
  return (
    <div className="newsletter">
      <div>
        <h2>Never miss a <em>gifting moment.</em></h2>
        <p>Get the latest offers, new experiences and seasonal deals in your inbox.</p>
      </div>
      <form className="newsletter__form" onSubmit={submit}>
        <input type="email" required placeholder="Your email address" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email address" />
        <button type="submit" className="btn btn--primary">Subscribe</button>
      </form>
    </div>
  );
}

const SOCIAL = [
  ['instagram', 'Instagram', InstagramIcon], ['facebook', 'Facebook', FacebookIcon],
  ['linkedin', 'LinkedIn', LinkedinIcon], ['youtube', 'YouTube', YoutubeIcon],
];

function Footer({ categories }) {
  const findCat = (re) => categories.find((c) => re.test(c.slug) || re.test(c.name));
  const catLink = (re, fallback) => { const c = findCat(re); return c ? `/c/${c.slug}` : fallback; };
  const occasions = findCat(/occasion/i)?.children || [];

  const cols = [
    ['Shop', [
      ['Gift Cards', catLink(/gift.?card/i, '/search?q=gift%20card')],
      ['Gift Passes', catLink(/gift.?pass/i, '/search?q=pass')],
      ['Experiences', catLink(/experience/i, '/search?q=experience')],
      ['Flash Sale', '/deals?flashSale=true'],
      ['Corporate Gifts', '/page/corporate'],
    ]],
    ['Occasions', occasions.length
      ? occasions.slice(0, 5).map((c) => [c.name, `/c/${c.slug}`])
      : [['Birthdays', catLink(/birthday/i, '/search?q=birthday')], ['Weddings', catLink(/wedding/i, '/search?q=wedding')],
        ['Anniversaries', catLink(/anniversar/i, '/search?q=anniversary')], ['Staycations', catLink(/staycation/i, '/search?q=staycation')],
        ['Days Out', catLink(/days?.?out/i, '/search?q=days%20out')]]],
    ['Help', [['Redeem a Voucher', '/account/vouchers'], ['How It Works', '/#how-it-works'], ['FAQs', '/page/faqs'], ['Contact Us', '/page/contact']]],
    ['Company', [['About Us', '/page/about'], ['Partner With Us', '/page/partner'], ['Terms & Conditions', '/page/terms'], ['Privacy Policy', '/page/privacy']]],
  ];

  return (
    <footer className="footer">
      <div className="container">
        <Newsletter />
        <div className="footer__grid">
          <div className="footer__brand">
            <Logo light />
            <p>A world of choices. A world of experiences.<br />Gift happiness with Global Gift Pass.</p>
            <div className="footer__social">
              {SOCIAL.map(([k, label, Icon]) => (SOCIAL_LINKS[k]
                ? <a key={k} href={SOCIAL_LINKS[k]} target="_blank" rel="noopener noreferrer" aria-label={label}><Icon width={18} height={18} /></a>
                : <span key={k} aria-hidden="true"><Icon width={18} height={18} /></span>))}
            </div>
          </div>
          {cols.map(([title, links]) => (
            <div key={title}>
              <h4>{title}</h4>
              <ul>{links.map(([label, to]) => <li key={label}><Link to={to}>{label}</Link></li>)}</ul>
            </div>
          ))}
        </div>
        <div className="footer__bottom">
          <span>© {new Date().getFullYear()} Global Gift Pass. All rights reserved.</span>
          <div className="footer__pay">
            <span className="footer__secure"><LockIcon width={15} height={15} />Secure payments</span>
            <span className="pay pay--visa">VISA</span>
            <span className="pay pay--mc" aria-label="Mastercard"><i /><i /></span>
            <span className="pay pay--apple">Apple Pay</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function TabBar() {
  const { isAuthed } = useAuth();
  const { cartCount } = useShop();
  return (
    <nav className="tabbar" aria-label="Primary">
      <NavLink to="/" end><HomeIcon /><span>Home</span></NavLink>
      <NavLink to="/categories"><GridIcon /><span>Categories</span></NavLink>
      <NavLink to="/account/vouchers"><GiftIcon /><span>Redeem</span></NavLink>
      <NavLink to="/cart"><span className="tabbar__icon"><CartIcon />{cartCount > 0 && <span className="badge">{cartCount}</span>}</span><span>Cart</span></NavLink>
      <NavLink to={isAuthed ? '/account' : '/login'}><UserIcon /><span>Account</span></NavLink>
    </nav>
  );
}

export default function Layout() {
  const [categories, setCategories] = useState([]);
  const { pathname, hash } = useLocation();
  useEffect(() => { catalog.categories().then((r) => setCategories(r.data)).catch(() => {}); }, []);
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <div className="app">
      <Header categories={categories} />
      <main className="main"><Outlet context={{ categories }} /></main>
      <Footer categories={categories} />
      <TabBar />
    </div>
  );
}
