export default function Pagination({ meta, onPage }) {
  if (!meta || meta.totalPages <= 1) return null;
  const { page, totalPages } = meta;
  const pages = [];
  for (let p = Math.max(1, page - 2); p <= Math.min(totalPages, page + 2); p += 1) pages.push(p);

  return (
    <nav className="pagination" aria-label="Pagination">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
      {pages.map((p) => (
        <button key={p} type="button" className={p === page ? 'is-active' : ''} aria-current={p === page ? 'page' : undefined} onClick={() => onPage(p)}>{p}</button>
      ))}
      <button type="button" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</button>
    </nav>
  );
}
