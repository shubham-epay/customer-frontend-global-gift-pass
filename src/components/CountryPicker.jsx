import { useEffect, useRef, useState } from 'react';
import { useCountries } from '../context/CountryContext';
import { CheckIcon, ChevronDown, GlobeIcon } from './Icons';

/** Country selector next to the search box: "Global" or one or more countries. */
export default function CountryPicker({ compact = false }) {
  const { countries, selected, isGlobal, choose } = useCountries();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(selected);
  const box = useRef(null);

  useEffect(() => { if (open) setDraft(selected); }, [open, selected]);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  if (!countries.length) return null; // nothing to choose from yet

  const byCode = Object.fromEntries(countries.map((c) => [c.code, c]));
  const chosen = selected.map((c) => byCode[c]).filter(Boolean);
  const names = isGlobal ? 'All countries (Global)' : chosen.map((c) => c.name).join(', ');
  const toggle = (code) => setDraft((d) => (d.includes(code) ? d.filter((c) => c !== code) : [...d, code]));
  const apply = (codes) => { choose(codes); setOpen(false); };

  return (
    <div className={`country-picker${compact ? ' country-picker--compact' : ''}`} ref={box}>
      <button type="button" className={`country-picker__btn${isGlobal ? '' : ' is-set'}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        title={`Shopping for: ${names}`} aria-label={`Country: ${names}. Change`}>
        {/* Flags only on the button; full names are in the menu. */}
        <span className="country-picker__flags" aria-hidden>
          {isGlobal
            ? <span className="country-picker__flag"><GlobeIcon width={20} height={20} /></span>
            : chosen.slice(0, 3).map((c) => <span key={c.code} className="country-picker__flag">{c.flag || c.code}</span>)}
          {chosen.length > 3 && <span className="country-picker__more">+{chosen.length - 3}</span>}
        </span>
        <ChevronDown width={16} height={16} className="country-picker__caret" />
      </button>
      {open && (
        <div className="country-picker__menu" role="dialog" aria-label="Choose countries">
          <p className="country-picker__title">Shop gifts for</p>
          <button type="button" className={`country-picker__option${draft.length === 0 ? ' is-on' : ''}`} onClick={() => apply([])}>
            <span className="country-picker__flag" aria-hidden><GlobeIcon width={18} height={18} /></span>
            <span className="grow"><strong>Global</strong><small>All countries</small></span>
            {draft.length === 0 && <CheckIcon width={18} height={18} className="country-picker__tick" />}
          </button>
          <div className="country-picker__sep" />
          <ul className="country-picker__list">
            {countries.map((c) => (
              <li key={c.code}>
                <label className={`country-picker__option${draft.includes(c.code) ? ' is-on' : ''}`}>
                  <input type="checkbox" checked={draft.includes(c.code)} onChange={() => toggle(c.code)} />
                  <span className="country-picker__flag" aria-hidden>{c.flag || '🏳️'}</span>
                  <span className="grow"><strong>{c.name}</strong>{c.currency && <small>{c.currency}</small>}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="country-picker__foot">
            <button type="button" className="link-btn" onClick={() => setDraft([])} disabled={!draft.length}>Clear</button>
            <button type="button" className="btn btn--primary btn--sm" onClick={() => apply(draft)}>
              {draft.length ? `Show ${draft.length} ${draft.length === 1 ? 'country' : 'countries'}` : 'Show all countries'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
