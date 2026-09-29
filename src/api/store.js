import { api } from './client';

/** Thin wrappers over the customer storefront API (/api/*). Each resolves to the response envelope. */
const get = (url, params) => api.get(url, { params }).then((r) => r.data);
const post = (url, body) => api.post(url, body).then((r) => r.data);
const put = (url, body) => api.put(url, body).then((r) => r.data);
const patch = (url, body) => api.patch(url, body).then((r) => r.data);
const del = (url) => api.delete(url).then((r) => r.data);

export const catalog = {
  home: () => get('/home'),
  categories: () => get('/categories'),
  categoryProducts: (slug, params) => get(`/categories/${encodeURIComponent(slug)}/products`, params),
  products: (params) => get('/products', params),
  product: (slug) => get(`/products/${encodeURIComponent(slug)}`),
  search: (params) => get('/search', params),
};

export const auth = {
  login: (body) => post('/auth/login', body),
  register: (body) => post('/auth/register', body),
  logout: () => post('/auth/logout'),
  changePassword: (body) => post('/auth/change-password', body),
};

export const cart = {
  get: () => get('/cart'),
  add: (body) => post('/cart', body),
  update: (itemId, body) => patch(`/cart/${itemId}`, body),
  remove: (itemId) => del(`/cart/${itemId}`),
  clear: () => del('/cart'),
  applyCoupon: (code) => post('/checkout/apply-coupon', { code }),
  removeCoupon: () => del('/checkout/apply-coupon'),
  checkout: (body) => post('/checkout', body),
};

export const wishlist = {
  get: () => get('/wishlist'),
  add: (productId) => post('/wishlist', { productId }),
  remove: (productId) => del(`/wishlist/${productId}`),
};

export const account = {
  profile: () => get('/profile'),
  updateProfile: (body) => put('/profile', body),
  addresses: () => get('/addresses'),
  addAddress: (body) => post('/addresses', body),
  updateAddress: (id, body) => put(`/addresses/${id}`, body),
  removeAddress: (id) => del(`/addresses/${id}`),
  orders: (params) => get('/orders', params),
  order: (id) => get(`/orders/${id}`),
  vouchers: (params) => get('/my-vouchers', params),
};
