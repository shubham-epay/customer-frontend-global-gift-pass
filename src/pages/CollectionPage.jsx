import { Link, useParams } from 'react-router-dom';
import { catalog } from '../api/store';
import useAsync from '../utils/useAsync';
import ProductCard from '../components/ProductCard';
import { EmptyState, ErrorState, PageLoader } from '../components/States';

/** Curated collection ("Gifts for Her" ...). The API only exposes home collections, via /api/home. */
export default function CollectionPage() {
  const { slug } = useParams();
  const { data, loading, error, reload } = useAsync(() => catalog.home(), []);

  if (loading && !data) return <PageLoader />;
  if (error) return <div className="container section"><ErrorState message={error} onRetry={reload} /></div>;
  const c = data.collections.find((x) => x.slug === slug);
  if (!c) return <div className="container section"><EmptyState title="Collection not found" action="Back to home" /></div>;

  return (
    <div className="container listing">
      <nav className="breadcrumb"><Link to="/">Home</Link><span>/</span><span>{c.title}</span></nav>
      {c.imageUrl && (
        <div className="collection-hero">
          <img src={c.imageUrl} alt="" />
          <div><span>Collection</span><h1>{c.title}</h1>{c.description && <p>{c.description}</p>}</div>
        </div>
      )}
      {!c.imageUrl && <div className="listing__head"><div><h1>{c.title}</h1>{c.description && <p className="muted">{c.description}</p>}</div></div>}
      {c.products.length === 0
        ? <EmptyState title="Nothing here yet" text="Check back soon." action="Back to home" />
        : <div className="grid grid--products">{c.products.map((p) => <ProductCard key={p._id} product={p} />)}</div>}
    </div>
  );
}
