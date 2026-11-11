import { useLocation } from 'react-router-dom';
import { EmptyState } from '../components/States';
import OrderConfirmation from '../components/OrderConfirmation';

/** Shown right after checkout (guest or signed in). The order comes from navigation state / this tab's session. */
export default function OrderConfirmedPage() {
  const { state } = useLocation();
  let order = state?.order;
  if (!order) { try { order = JSON.parse(sessionStorage.getItem('ggp-last-order') || 'null'); } catch { order = null; } }
  if (!order) return <div className="container section"><EmptyState title="No recent order" text="Your order confirmation was sent to your email." action="Continue shopping" /></div>;
  return <div className="container page"><OrderConfirmation order={order} /></div>;
}
