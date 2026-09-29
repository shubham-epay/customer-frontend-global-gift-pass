export function money(value, currency = 'AED') {
  if (value == null || Number.isNaN(Number(value))) return '';
  const n = Number(value);
  return `${currency} ${n.toLocaleString('en-AE', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

export const discountPct = (price, salePrice) =>
  price && salePrice != null && salePrice < price ? Math.round(((price - salePrice) / price) * 100) : 0;

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

export const titleCase = (s = '') => s.toLowerCase().replace(/(^|_)\w/g, (m) => m.replace('_', ' ').toUpperCase());

/** First product image, falling back to a neutral placeholder. */
export const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3"><rect width="4" height="3" fill="#EFE9F7"/></svg>',
);
export const imageOf = (p) => p?.imageUrls?.[0] || p?.coverImageUrl || p?.imageUrl || PLACEHOLDER;
