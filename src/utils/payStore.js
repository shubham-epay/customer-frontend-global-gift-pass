/**
 * Remembers, per order, the pay token and the order snapshot from checkout so the pay page
 * survives reloads and the return from SynraPay. The token only lets this browser pay / check
 * that one order, so localStorage is fine; it is removed once the order is paid.
 */
const key = (orderNumber) => `ggp-pay:${orderNumber}`;

export const payStore = {
  get(orderNumber) {
    try { return JSON.parse(localStorage.getItem(key(orderNumber)) || 'null'); } catch { return null; }
  },
  set(orderNumber, value) {
    try { localStorage.setItem(key(orderNumber), JSON.stringify(value)); } catch { /* storage unavailable */ }
  },
  clear(orderNumber) {
    try { localStorage.removeItem(key(orderNumber)); } catch { /* storage unavailable */ }
  },
};
