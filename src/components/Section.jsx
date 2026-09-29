import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from './Icons';

/** "Navy words Red accent" heading: the accent word(s) render in red. */
export function Heading({ title, accent, as: Tag = 'h2', className = 'section__title' }) {
  return <Tag className={className}>{title}{accent && <> <em>{accent}</em></>}</Tag>;
}

function useRailScroll() {
  const ref = useRef(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const start = el.scrollLeft <= 4;
    const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    setEdge((e) => (e.start === start && e.end === end ? e : { start, end }));
  }, []);
  useEffect(() => {
    update();
    const el = ref.current;
    el?.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { el?.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [update]);
  const scroll = (dir) => {
    const el = ref.current;
    const card = el?.firstElementChild;
    const step = card ? card.getBoundingClientRect().width + parseFloat(getComputedStyle(el).columnGap || 0) : el.clientWidth;
    el?.scrollBy({ left: dir * step * Math.max(1, Math.floor(el.clientWidth / step)), behavior: 'smooth' });
  };
  return { ref, edge, scroll, update };
}

/**
 * Home section: heading (+ optional accent/subtitle), then either a carousel with arrows
 * (`carousel`) or a static grid. `bleed` lets the carousel run off the right edge of the page.
 */
export default function Section({
  id, title, accent, subtitle, to, linkText = 'View All', carousel = false, bleed = false, cols, className = '', children,
}) {
  const { ref, edge, scroll, update } = useRailScroll();
  useEffect(() => { update(); });
  const arrows = carousel;

  return (
    <section id={id} className={`section ${className}`}>
      <div className="container">
        <div className="section__head">
          <div>
            <Heading title={title} accent={accent} />
            {subtitle && <p className="section__subtitle">{subtitle}</p>}
          </div>
          <div className="section__actions">
            {to && <Link to={to} className="link-arrow">{linkText}<ArrowRight width={16} height={16} /></Link>}
            {arrows && (
              <>
                <button type="button" className="arrow-btn" onClick={() => scroll(-1)} disabled={edge.start} aria-label="Previous"><ChevronLeft width={18} height={18} /></button>
                <button type="button" className="arrow-btn" onClick={() => scroll(1)} disabled={edge.end} aria-label="Next"><ChevronRight width={18} height={18} /></button>
              </>
            )}
          </div>
        </div>
        {carousel
          ? <div className={`rail${bleed ? ' rail--bleed' : ''}`} ref={ref} style={cols ? { '--cols': cols } : undefined}>{children}</div>
          : <div className="grid-cols" style={cols ? { '--cols': cols } : undefined}>{children}</div>}
      </div>
    </section>
  );
}
