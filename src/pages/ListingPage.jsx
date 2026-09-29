import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { catalog } from '../api/store';
import useAsync from '../utils/useAsync';
import ProductCard from '../components/ProductCard';
import Pagination from '../components/Pagination';
import { EmptyState, ErrorState, SkeletonGrid } from '../components/States';

const SORTS = [
  ['newest', 'Newest'], ['popular', 'Most popular'], ['rating', 'Top rated'],
  ['price_asc', 'Price: low to high'], ['price_desc', 'Price: high to low'], ['title', 'Name A–Z'],
];
const FILTER_KEYS = ['page', 'sort', 'city', 'minPrice', 'maxPrice', 'featured', 'bestSeller', 'flashSale'];

/** Shared by /c/:slug (category products) and /search?q= - both return { items, ... } + pagination meta. */
export default function ListingPage({ mode }) {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const query = Object.fromEntries(FILTER_KEYS.filter((k) => params.get(k)).map((k) => [k, params.get(k)]));
  const key = params.toString();

  const { data, meta, loading, error, reload } = useAsync(
    () => {
      if (mode === 'category') return catalog.categoryProducts(slug, query);
      if (mode === 'deals') return catalog.products(query);
      return catalog.search({ ...query, q });
    },
    [mode, slug, key],
  );

  const setParam = (k, v) => {
    const next = new URLSearchParams(params);
    if (v === '' || v == null) next.delete(k); else next.set(k, v);
    if (k !== 'page') next.delete('page');
    setParams(next);
  };

  const [price, setPrice] = useState({ minPrice: params.get('minPrice') || '', maxPrice: params.get('maxPrice') || '' });
  const applyPrice = (e) => {
    e.preventDefault();
    const next = new URLSearchParams(params);
    ['minPrice', 'maxPrice'].forEach((k) => (price[k] ? next.set(k, price[k]) : next.delete(k)));
    next.delete('page');
    setParams(next);
  };

  const category = data?.category;
  const dealsTitle = params.get('flashSale') === 'true' ? 'Flash Sale'
    : params.get('featured') === 'true' ? 'Summer Deals'
      : params.get('bestSeller') === 'true' ? 'Bestsellers' : 'All Gift Passes';
  const title = { category: category?.name, deals: dealsTitle, search: `Results for “${q}”` }[mode];
  const crumb = { category: category?.name || '…', deals: dealsTitle, search: 'Search' }[mode];

  return (
    <div className="container listing">
      <nav className="breadcrumb"><Link to="/">Home</Link><span>/</span><span>{crumb}</span></nav>

      {category?.bannerUrl && <div className="listing__banner"><img src={category.bannerUrl} alt="" /></div>}
      <div className="listing__head">
        <div>
          <h1>{title}</h1>
          {category?.description && <p className="muted">{category.description}</p>}
          {meta && <p className="muted">{meta.total} experience{meta.total === 1 ? '' : 's'}</p>}
        </div>
        <label className="select">
          <span>Sort by</span>
          <select value={params.get('sort') || 'newest'} onChange={(e) => setParam('sort', e.target.value)}>
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      </div>

      {(category?.children?.length > 0 || data?.categories?.length > 0) && (
        <div className="chips">
          {(category?.children || data.categories).map((c) => <Link key={c._id} className="chip" to={`/c/${c.slug}`}>{c.name}</Link>)}
        </div>
      )}

      <div className="listing__body">
        <aside className="filters">
          <h3>Filters</h3>
          <div className="filters__group">
            <h4>Offers</h4>
            {[['featured', 'Featured'], ['bestSeller', 'Best sellers'], ['flashSale', 'Flash sale']].map(([k, l]) => (
              <label key={k} className="check">
                <input type="checkbox" checked={params.get(k) === 'true'} onChange={(e) => setParam(k, e.target.checked ? 'true' : '')} />{l}
              </label>
            ))}
          </div>
          <form className="filters__group" onSubmit={applyPrice}>
            <h4>Price (AED)</h4>
            <div className="price-range">
              <input type="number" min="0" placeholder="Min" value={price.minPrice} onChange={(e) => setPrice({ ...price, minPrice: e.target.value })} />
              <input type="number" min="0" placeholder="Max" value={price.maxPrice} onChange={(e) => setPrice({ ...price, maxPrice: e.target.value })} />
            </div>
            <button type="submit" className="btn btn--outline btn--sm btn--block">Apply</button>
          </form>
          <div className="filters__group">
            <h4>City</h4>
            <input
              type="text"
              placeholder="e.g. Dubai"
              defaultValue={params.get('city') || ''}
              onKeyDown={(e) => { if (e.key === 'Enter') setParam('city', e.currentTarget.value.trim()); }}
              onBlur={(e) => { if (e.target.value.trim() !== (params.get('city') || '')) setParam('city', e.target.value.trim()); }}
            />
          </div>
          {FILTER_KEYS.some((k) => k !== 'page' && k !== 'sort' && params.get(k)) && (
            <button type="button" className="link-btn" onClick={() => setParams(q ? { q } : {})}>Clear all filters</button>
          )}
        </aside>

        <div className="listing__results">
          {loading && !data && <SkeletonGrid />}
          {error && <ErrorState message={error} onRetry={reload} />}
          {data && !error && (data.items.length === 0
            ? <EmptyState title="No experiences found" text="Try removing a filter or searching for something else." action="Back to home" />
            : (
              <div className={`grid grid--products${loading ? ' is-loading' : ''}`}>
                {data.items.map((p) => <ProductCard key={p._id} product={p} />)}
              </div>
            ))}
          <Pagination meta={meta} onPage={(p) => setParam('page', String(p))} />
        </div>
      </div>
    </div>
  );
}
