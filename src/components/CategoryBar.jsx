import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, GridIcon } from './Icons';

const GAP = 28;          // px between links (keep in sync with .catnav__links gap)
const MORE_WIDTH = 96;   // room reserved for the "More" button

/**
 * Category navigation that scales to any number of categories:
 * shows as many as fit on one line and moves the rest into a "More" menu (re-measured on resize).
 * On small screens it becomes a horizontally scrolling row instead.
 */
export default function CategoryBar({ categories }) {
  const wrap = useRef(null);
  const measure = useRef(null);
  const menuRef = useRef(null);
  const [visible, setVisible] = useState(categories.length);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el || !measure.current) return undefined;
    const fit = () => {
      const widths = [...measure.current.children].map((c) => c.getBoundingClientRect().width);
      const available = el.clientWidth;
      const total = widths.reduce((a, w) => a + w, 0) + GAP * Math.max(widths.length - 1, 0);
      if (total <= available) { setVisible(widths.length); return; }
      let used = 0; let n = 0;
      for (const w of widths) {
        const next = used + (n ? GAP : 0) + w;
        if (next + GAP + MORE_WIDTH > available) break;
        used = next; n += 1;
      }
      setVisible(Math.max(n, 1));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    document.fonts?.ready?.then(fit).catch(() => {});
    return () => ro.disconnect();
  }, [categories]);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  if (!categories.length) return null;
  const shown = categories.slice(0, visible);
  const hidden = categories.slice(visible);
  const hiddenActive = hidden.some((c) => pathname === `/c/${c.slug}` || c.children?.some((x) => pathname === `/c/${x.slug}`));

  return (
    <div className="catnav" ref={wrap}>
      {/* Invisible copy used only to measure each link's natural width. */}
      <div className="catnav__measure" ref={measure} aria-hidden="true">
        {categories.map((c) => <span key={c._id} className="catbar__link">{c.name}</span>)}
      </div>

      <div className="catnav__links">
        {shown.map((c) => (
          <NavLink key={c._id} to={`/c/${c.slug}`} className="catbar__link">{c.name}</NavLink>
        ))}
        {/* On phones every category scrolls horizontally, so the hidden ones are rendered too. */}
        {hidden.map((c) => (
          <NavLink key={c._id} to={`/c/${c.slug}`} className="catbar__link catnav__mobile-only">{c.name}</NavLink>
        ))}
      </div>

      {hidden.length > 0 && (
        <div className="catnav__more" ref={menuRef}>
          <button type="button" className={`catbar__link catnav__more-btn${hiddenActive ? ' active' : ''}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            More <ChevronDown width={16} height={16} />
          </button>
          {open && (
            <div className={`catnav__menu${hidden.length > 6 ? ' catnav__menu--wide' : ''}`} role="menu">
              <p className="catnav__menu-title">More categories</p>
              <div className="catnav__menu-grid">
                {hidden.map((c) => (
                  <div key={c._id} className="catnav__menu-item">
                    <NavLink to={`/c/${c.slug}`} role="menuitem" className="catnav__menu-link">
                      <span>{c.name}</span>
                      {c.productCount > 0 && <small>{c.productCount}</small>}
                    </NavLink>
                    {c.children?.length > 0 && (
                      <div className="catnav__sub">
                        {c.children.map((x) => <NavLink key={x._id} to={`/c/${x.slug}`} role="menuitem">{x.name}</NavLink>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <Link to="/categories" className="catnav__all" role="menuitem"><GridIcon width={16} height={16} />Browse all categories</Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
