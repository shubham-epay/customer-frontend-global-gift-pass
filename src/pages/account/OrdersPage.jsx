import { Link, useSearchParams } from 'react-router-dom';
import { account } from '../../api/store';
import useAsync from '../../utils/useAsync';
import { fmtDate, imageOf, money, titleCase } from '../../utils/format';
import Pagination from '../../components/Pagination';
import { EmptyState, ErrorState, PageLoader } from '../../components/States';

export const StatusPill = ({ value }) => <span className={`pill pill--${String(value).toLowerCase()}`}>{titleCase(value)}</span>;

export default function OrdersPage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page')) || 1;
  const { data, meta, loading, error, reload } = useAsync(() => account.orders({ page }), [page]);

  return (
    <div className="stack">
      <h1 className="page__title">My orders</h1>
      {loading && !data && <PageLoader />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && data.length === 0 && <EmptyState title="No orders yet" text="When you buy a gift it will show up here." action="Start exploring" />}
      {data?.map((o) => (
        <Link key={o._id} to={`/account/orders/${o._id}`} className="card order-row">
          <div className="order-row__head">
            <div><strong>{o.orderNumber}</strong><div className="small muted">Placed {fmtDate(o.placedAt || o.createdAt)}</div></div>
            <StatusPill value={o.orderStatus} />
          </div>
          <div className="order-row__items">
            {o.items.slice(0, 4).map((i) => <img key={i._id} src={imageOf({ imageUrl: i.imageUrlSnapshot })} alt={i.titleSnapshot} title={i.titleSnapshot} />)}
            {o.items.length > 4 && <span className="more">+{o.items.length - 4}</span>}
            <span className="order-row__total">{money(o.total, o.currency)}</span>
          </div>
        </Link>
      ))}
      <Pagination meta={meta} onPage={(p) => setParams({ page: String(p) })} />
    </div>
  );
}
