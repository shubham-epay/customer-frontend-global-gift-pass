import { Link } from 'react-router-dom';

export const Spinner = () => <span className="spinner" aria-label="Loading" />;

export const PageLoader = () => <div className="page-loader"><Spinner /></div>;

export function ErrorState({ message = 'Something went wrong', onRetry }) {
  return (
    <div className="state">
      <h3>We couldn’t load this</h3>
      <p>{message}</p>
      {onRetry && <button type="button" className="btn btn--outline" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function EmptyState({ title, text, action, to = '/' }) {
  return (
    <div className="state">
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action && <Link className="btn btn--primary" to={to}>{action}</Link>}
    </div>
  );
}

export function SkeletonGrid({ count = 8 }) {
  return (
    <div className="grid grid--products">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card skeleton-card"><div className="skeleton skeleton--img" /><div className="skeleton skeleton--line" /><div className="skeleton skeleton--line short" /></div>
      ))}
    </div>
  );
}
