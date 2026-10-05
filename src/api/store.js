import { api } from './client';

/** Thin wrappers over the customer storefront API (/api/*). Each resolves to the response envelope. */
const get = (url, params) => api.get(url, { params }).then((r) => r.data);
const post = (url, body) => api.post(url, body).then((r) => r.data);
const put = (url, body) => api.put(url, body).then((r) => r.data);
const patch = (url, body) => api.patch(url, body).then((r) => r.data);
const del = (url) => api.delete(url).then((r) => r.data);

/**
 * The visitor's country selection ("AE,SA", or null for Global) is added to every catalogue request,
 * so pages don't need to pass it themselves. Set by CountryProvider.
 */
let countryParam = null;
export const setCountryParam = (value) => { countryParam = value || null; };
const scoped = (params = {}) => (countryParam ? { ...params, countries: countryParam } : params);

export const catalog = {
  home: () => get('/home', scoped()),
  categories: () => get('/categories', scoped()),
  categoryProducts: (slug, params) => get(`/categories/${encodeURIComponent(slug)}/products`, scoped(params)),
  products: (params) => get('/products', scoped(params)),
  product: (slug) => get(`/products/${encodeURIComponent(slug)}`, scoped()),
  search: (params) => get('/search', scoped(params)),
  countries: () => get('/countries'),
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
  countries: () => get('/checkout/countries'),
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

/**
 * Online payment (SynraPay). Guests prove access to an order with the pay token returned at checkout,
 * sent as X-Payment-Token; signed-in owners are recognised by their session.
 */
const payHeaders = (token) => (token ? { headers: { 'X-Payment-Token': token } } : undefined);
export const payments = {
  config: () => get('/payments/config'),
  status: (orderNumber, token) => api.get(`/payments/${encodeURIComponent(orderNumber)}`, payHeaders(token)).then((r) => r.data),
  start: (orderNumber, token, body) => api.post(`/payments/${encodeURIComponent(orderNumber)}/start`, body, payHeaders(token)).then((r) => r.data),
  // Direct API: card details from our own form go to our backend, which forwards them to SynraPay.
  directPay: (orderNumber, token, card) => api.post(`/payments/${encodeURIComponent(orderNumber)}/direct/pay`, { card }, payHeaders(token)).then((r) => r.data),
  directAuthenticate: (orderNumber, token) => api.post(`/payments/${encodeURIComponent(orderNumber)}/direct/authenticate`, {}, payHeaders(token)).then((r) => r.data),
  sendLink: (orderNumber, token, email) => api.post(`/payments/${encodeURIComponent(orderNumber)}/send-link`, email ? { email } : {}, payHeaders(token)).then((r) => r.data),
};
