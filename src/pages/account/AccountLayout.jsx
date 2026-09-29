import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

const LINKS = [
  ['/account', 'Profile', true],
  ['/account/orders', 'Orders'],
  ['/account/vouchers', 'My vouchers'],
  ['/account/wishlist', 'Wishlist'],
  ['/account/addresses', 'Addresses'],
];

export default function AccountLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="container page account">
      <aside className="account__nav card">
        <div className="account__user">
          <span className="avatar">{user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : user?.name?.[0]?.toUpperCase()}</span>
          <div><strong>{user?.name}</strong><div className="small muted">{user?.email}</div></div>
        </div>
        <nav>
          {LINKS.map(([to, label, end]) => <NavLink key={to} to={to} end={end}>{label}</NavLink>)}
          <button type="button" className="link-btn" onClick={logout}>Sign out</button>
        </nav>
      </aside>
      <div className="account__content"><Outlet /></div>
    </div>
  );
}
