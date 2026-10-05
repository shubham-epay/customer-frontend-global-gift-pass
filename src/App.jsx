import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import RequireAuth from './auth/RequireAuth';
import { EmptyState } from './components/States';
import HomePage from './pages/HomePage';
import ListingPage from './pages/ListingPage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import PayPage from './pages/PayPage';
import AuthPage from './pages/AuthPage';
import OrderConfirmedPage from './pages/OrderConfirmedPage';
import CollectionPage from './pages/CollectionPage';
import CategoriesPage from './pages/CategoriesPage';
import InfoPage from './pages/InfoPage';
import AccountLayout from './pages/account/AccountLayout';
import ProfilePage from './pages/account/ProfilePage';
import OrdersPage from './pages/account/OrdersPage';
import OrderDetailPage from './pages/account/OrderDetailPage';
import VouchersPage from './pages/account/VouchersPage';
import WishlistPage from './pages/account/WishlistPage';
import AddressesPage from './pages/account/AddressesPage';

export default function App() {
  return (
    <Routes>
      {/* Checkout has its own minimal header (logo + bag), like a hosted checkout. No sign-in required. */}
      <Route path="checkout" element={<CheckoutPage />} />
      <Route path="pay/:orderNumber" element={<PayPage />} />
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="c/:slug" element={<ListingPage mode="category" />} />
        <Route path="search" element={<ListingPage mode="search" />} />
        <Route path="deals" element={<ListingPage mode="deals" />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="collections/:slug" element={<CollectionPage />} />
        <Route path="page/:slug" element={<InfoPage />} />
        <Route path="p/:slug" element={<ProductPage />} />
        <Route path="login" element={<AuthPage mode="login" />} />
        <Route path="register" element={<AuthPage mode="register" />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="order-confirmed" element={<OrderConfirmedPage />} />
        <Route path="account" element={<RequireAuth><AccountLayout /></RequireAuth>}>
          <Route index element={<ProfilePage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="vouchers" element={<VouchersPage />} />
          <Route path="wishlist" element={<WishlistPage />} />
          <Route path="addresses" element={<AddressesPage />} />
        </Route>
        <Route path="*" element={<div className="container section"><EmptyState title="Page not found" action="Go home" /></div>} />
      </Route>
    </Routes>
  );
}
