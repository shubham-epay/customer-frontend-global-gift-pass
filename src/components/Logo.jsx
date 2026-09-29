import { Link } from 'react-router-dom';

/** Gift-box mark with sparkle rays, as in the brand logo. */
export function LogoMark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <g stroke="#F5A623" strokeWidth="1.8" strokeLinecap="round">
        <path d="M16 1.5v3.2M9.2 3.6l1.6 2.6M22.8 3.6l-1.6 2.6M4.5 8.2l2.6 1.4M27.5 8.2l-2.6 1.4" />
      </g>
      <rect x="3.5" y="13" width="25" height="6" rx="1.4" fill="#D9283A" />
      <rect x="5.5" y="18.5" width="21" height="11.5" rx="1.4" fill="#D9283A" />
      <rect x="14.2" y="13" width="3.6" height="17" fill="#fff" />
      <path d="M16 13c-2.6-3.8-7.2-4.6-7.2-1.6 0 1.4 2.6 1.6 7.2 1.6Zm0 0c2.6-3.8 7.2-4.6 7.2-1.6 0 1.4-2.6 1.6-7.2 1.6Z" fill="#D9283A" stroke="#fff" strokeWidth=".9" />
    </svg>
  );
}

export default function Logo({ light = false, className = '' }) {
  return (
    <Link to="/" className={`logo${light ? ' logo--light' : ''} ${className}`} aria-label="Global Gift Pass home">
      <LogoMark />
      <span className="logo__text">Global<em>Gift</em>Pass</span>
    </Link>
  );
}
