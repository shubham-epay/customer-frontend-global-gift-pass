import { api } from '../client';

/**
 * SynraPay Production (live account, real cards are charged): every call goes to the backend's production API, /api/payments/production/...,
 * which is handled only by the production controller. The other environments have their own file in this folder,
 * so a change here never affects them.
 * Guests prove access to an order with the pay token from checkout (X-Payment-Token); owners by their session.
 */
const ID = 'production';
const BASE = `/payments/${ID}`;
const payHeaders = (token) => (token ? { headers: { 'X-Payment-Token': token } } : undefined);
const order = (orderNumber) => `${BASE}/${encodeURIComponent(orderNumber)}`;

export const productionPayments = {
  id: ID,
  // body: { method, linkType?, expiresInHours?, captureMode? } - the environment is the URL's.
  start: (orderNumber, token, body) => api.post(`${order(orderNumber)}/start`, body, payHeaders(token)).then((r) => r.data),
  sendLink: (orderNumber, token, email) => api.post(`${order(orderNumber)}/send-link`, email ? { email } : {}, payHeaders(token)).then((r) => r.data),
  // Direct API: card + browser_details for typed cards, or paymentMethodId + browser_details for saved cards.
  directPay: (orderNumber, token, body) => api.post(`${order(orderNumber)}/direct/pay`, body, payHeaders(token)).then((r) => r.data),
  directAuthenticate: (orderNumber, token) => api.post(`${order(orderNumber)}/direct/authenticate`, {}, payHeaders(token)).then((r) => r.data),
  // Saved cards in the production account (signed-in owner of the order only): brand, last 4 and expiry.
  savedCards: (orderNumber, token) => api.get(`${order(orderNumber)}/saved-cards`, payHeaders(token)).then((r) => r.data),
  removeSavedCard: (id) => api.delete(`${BASE}/payment-methods/${encodeURIComponent(id)}`).then((r) => r.data),
};
