import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { catalog, setCountryParam } from '../api/store';

/**
 * Which countries the visitor shops in. [] = Global (everything). Remembered per browser.
 * Products without countries are shown whatever is selected.
 */
const KEY = 'ggp-countries';
const CountryContext = createContext(null);

const readSaved = () => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v.filter((c) => /^[A-Z]{2}$/.test(c)) : [];
  } catch { return []; }
};

export function CountryProvider({ children }) {
  const [countries, setCountriesState] = useState([]);   // shown countries from the API
  const countriesLoaded = useRef(false);
  const setCountries = (list) => { countriesLoaded.current = true; setCountriesState(list); };
  const [selected, setSelected] = useState(readSaved);
  // Keep the request param in sync *during render* so the first fetches already use the saved selection.
  setCountryParam(selected.length ? selected.join(',') : null);

  // Load the shown countries, and re-check when the visitor comes back to the tab so a country the
  // admin just hid disappears without a manual reload.
  useEffect(() => {
    const load = () => catalog.countries().then((r) => setCountries(r.data)).catch(() => {});
    load();
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', load);
    return () => { document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('focus', load); };
  }, []);

  // Drop saved codes for countries the admin has since hidden.
  useEffect(() => {
    if (countriesLoaded.current === false) return;
    const valid = selected.filter((c) => countries.some((x) => x.code === c));
    if (valid.length !== selected.length) {
      setSelected(valid);
      try { localStorage.setItem(KEY, JSON.stringify(valid)); } catch { /* storage unavailable */ }
    }
  }, [countries, selected]);

  const choose = useCallback((codes) => {
    const next = [...new Set(codes)].sort();
    setSelected(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  }, []);

  const value = useMemo(() => ({
    countries,
    selected,
    isGlobal: selected.length === 0,
    choose,
    selectionKey: selected.join(',') || 'global',
  }), [countries, selected, choose]);

  return <CountryContext.Provider value={value}>{children}</CountryContext.Provider>;
}

export const useCountries = () => useContext(CountryContext);
