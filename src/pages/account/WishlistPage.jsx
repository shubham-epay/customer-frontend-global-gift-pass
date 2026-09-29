import { wishlist } from '../../api/store';
import { useShop } from '../../auth/ShopContext';
import useAsync from '../../utils/useAsync';
import ProductCard from '../../components/ProductCard';
import { EmptyState, ErrorState, PageLoader } from '../../components/States';

export default function WishlistPage() {
  const { wishIds } = useShop();
  // Re-fetch when the saved set changes so un-hearting a card removes it from this page.
  const { data, loading, error, reload } = useAsync(() => wishlist.get(), [wishIds.size]);

  return (
    <div className="stack">
      <h1 className="page__title">Wishlist</h1>
      {loading && !data && <PageLoader />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && data.length === 0 && <EmptyState title="Nothing saved yet" text="Tap the heart on any experience to save it here." action="Browse experiences" />}
      {data?.length > 0 && (
        <div className="grid grid--products grid--3">
          {data.map((i) => (i.product
            ? <div key={i.productId} className={i.available ? '' : 'is-unavailable'}><ProductCard product={i.product} /></div>
            : null))}
        </div>
      )}
    </div>
  );
}
