import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cart as cartApi, wishlist as wishlistApi } from '../api/store';
import { errorMessage } from '../api/client';
import { useAuth } from './AuthContext';
import { useToast } from '../components/Toast';

/** Cart + wishlist state for the signed-in customer. Guests are sent to sign in when they try to use either. */
const ShopContext = createContext(null);

export function ShopProvider({ children }) {
  const { isAuthed } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [cart, setCart] = useState(null);
  const [wishIds, setWishIds] = useState(new Set());

  const reloadCart = useCallback(() => cartApi.get().then((r) => setCart(r.data)).catch(() => {}), []);

  useEffect(() => {
    if (!isAuthed) { setCart(null); setWishIds(new Set()); return; }
    reloadCart();
    wishlistApi.get().then((r) => setWishIds(new Set(r.data.map((i) => String(i.productId))))).catch(() => {});
  }, [isAuthed, reloadCart]);

  const requireAuth = useCallback(() => {
    if (isAuthed) return true;
    navigate('/login', { state: { from: location.pathname + location.search } });
    return false;
  }, [isAuthed, navigate, location]);

  /** Runs a cart mutation that returns the new cart view; surfaces API errors as toasts. */
  const mutate = useCallback(async (fn, successMsg) => {
    if (!requireAuth()) return null;
    try {
      const r = await fn();
      setCart(r.data);
      if (successMsg) toast.success(successMsg);
      return r.data;
    } catch (err) {
      toast.error(errorMessage(err));
      throw err;
    }
  }, [requireAuth, toast]);

  const addToCart = useCallback((body, msg = 'Added to cart') => mutate(() => cartApi.add(body), msg), [mutate]);

  const toggleWishlist = useCallback(async (productId) => {
    if (!requireAuth()) return;
    const id = String(productId);
    const saved = wishIds.has(id);
    try {
      const r = saved ? await wishlistApi.remove(id) : await wishlistApi.add(id);
      setWishIds(new Set(r.data.map((i) => String(i.productId))));
      toast.success(saved ? 'Removed from wishlist' : 'Saved to wishlist');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }, [requireAuth, wishIds, toast]);

  const value = useMemo(() => ({
    cart, setCart, reloadCart, mutate, addToCart, cartCount: cart?.itemCount || 0,
    wishIds, setWishIds, toggleWishlist, requireAuth,
  }), [cart, reloadCart, mutate, addToCart, wishIds, toggleWishlist, requireAuth]);

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export const useShop = () => useContext(ShopContext);
