import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { PageLoader } from '../components/States';

export default function RequireAuth({ children }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <PageLoader />;
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return children;
}
