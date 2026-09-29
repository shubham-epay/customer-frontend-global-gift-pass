import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { account } from '../../api/store';
import useAsync from '../../utils/useAsync';
import { fmtDate, imageOf, money } from '../../utils/format';
import Pagination from '../../components/Pagination';
import { EmptyState, ErrorState, PageLoader } from '../../components/States';
import { StatusPill } from './OrdersPage';

export function VoucherCard({ voucher: v }) {
  const [copied, setCopied] = useState(false);
  const title = v.productId?.title || v.giftBoxId?.name || 'Gift voucher';
  const img = v.productId ? imageOf(v.productId) : imageOf({ coverImageUrl: v.giftBoxId?.coverImageUrl });
  const copy = () => navigator.clipboard?.writeText(v.code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });

  return (
    <article className="card voucher">
      <img src={img} alt="" className="voucher__img" />
      <div className="voucher__body">
        <div className="voucher__head">
          {v.productId?.slug ? <Link to={`/p/${v.productId.slug}`}><strong>{title}</strong></Link> : <strong>{title}</strong>}
          <StatusPill value={v.status} />
        </div>
        <button type="button" className="voucher__code" onClick={copy} title="Copy code">{v.code}<small>{copied ? 'Copied' : 'Copy'}</small></button>
        <div className="small muted">
          {money(v.value, v.currency)} · Expires {fmtDate(v.expiryDate)}
        </div>
        {v.received && v.senderName && <div className="small">From {v.senderName}</div>}
        {v.purchased && !v.received && v.recipientEmail && <div className="small">Sent to {v.recipientName || v.recipientEmail}</div>}
        {v.message && <p className="small muted clamp-2">“{v.message}”</p>}
      </div>
    </article>
  );
}

const TABS = [['all', 'All'], ['received', 'Received'], ['purchased', 'Purchased']];

export default function VouchersPage() {
  const [params, setParams] = useSearchParams();
  const type = params.get('type') || 'all';
  const page = Number(params.get('page')) || 1;
  const { data, meta, loading, error, reload } = useAsync(() => account.vouchers({ type, page }), [type, page]);

  return (
    <div className="stack">
      <h1 className="page__title">My vouchers</h1>
      <div className="tabs">
        {TABS.map(([v, l]) => <button key={v} type="button" className={type === v ? 'is-active' : ''} onClick={() => setParams({ type: v })}>{l}</button>)}
      </div>
      {loading && !data && <PageLoader />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && data.length === 0 && <EmptyState title="No vouchers here yet" text="Vouchers appear once an order is paid, or when someone sends you a gift." />}
      {data?.length > 0 && <div className="grid grid--vouchers">{data.map((v) => <VoucherCard key={v._id} voucher={v} />)}</div>}
      <Pagination meta={meta} onPage={(p) => setParams({ type, page: String(p) })} />
    </div>
  );
}
