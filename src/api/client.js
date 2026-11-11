import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Console log of every backend call: the full API route, what is sent and what comes back.
 *   [api] -> POST https://<api host>/api/checkout   + payload / query
 *   [api] <- 201 POST https://<api host>/api/checkout (850 ms)   + response (or the error body)
 * Card data, passwords and session tokens are never printed; client and pay tokens only by their start.
 */
const HIDDEN = new Set(['number', 'cvv', 'cvc', 'expiry', 'expiryMonth', 'expiryYear', 'exp_month', 'exp_year',
  'password', 'currentPassword', 'newPassword', 'confirmPassword', 'otp', 'accessToken', 'refreshToken']);
const SHORTENED = new Set(['clientToken', 'client_token', 'payToken', 'cartToken', 'token']);
const safe = (value) => {
  if (value == null || typeof value !== 'object') return value;
  try {
    return JSON.parse(JSON.stringify(value, (k, v) => {
      if (HIDDEN.has(k) && v != null && typeof v !== 'boolean') return '[not logged]';
      if (SHORTENED.has(k) && typeof v === 'string') return `${v.slice(0, 8)}... (${v.length} chars)`;
      return v;
    }));
  } catch { return value; }
};
const routeOf = (cfg) => {
  const u = new URL(api.getUri(cfg), window.location.origin);
  return `${(cfg.method || 'get').toUpperCase()} ${u.origin}${u.pathname}`;
};
const logRequest = (cfg) => {
  const route = routeOf(cfg);
  const body = typeof cfg.data === 'string' ? (() => { try { return JSON.parse(cfg.data); } catch { return cfg.data; } })() : cfg.data;
  const sent = { ...(cfg.params && Object.keys(cfg.params).length && { query: safe(cfg.params) }), ...(body !== undefined && body !== null && { payload: safe(body) }) };
  console.log(`[api] -> ${route}`, ...(Object.keys(sent).length ? [sent] : []));
};
const logResponse = (cfg, status, data, failed) => {
  if (!cfg) return;
  const ms = cfg.metadata?.startedAt ? ` (${Math.round(performance.now() - cfg.metadata.startedAt)} ms)` : '';
  console[failed ? 'warn' : 'log'](`[api] <- ${status ?? 'network error'} ${routeOf(cfg)}${ms}`, safe(data));
};

/**
 * Token storage strategy (mirrors the admin panel)
 *  - Access token: kept ONLY in memory (this module), never in web storage.
 *  - Refresh token: httpOnly cookie scoped to /api/auth, set by the API. A reload restores the
 *    session silently via /auth/refresh.
 */
let accessToken = null;
let onSessionExpired = () => {};

export const tokenStore = {
  get: () => accessToken,
  set: (t) => { accessToken = t; },
  clear: () => { accessToken = null; },
};
export const setSessionExpiredHandler = (fn) => { onSessionExpired = fn; };

export const api = axios.create({ baseURL, withCredentials: true, timeout: 20000 });

/**
 * Guest cart handle. The API issues it on a guest's first add-to-cart; it only addresses a cart
 * (no account access), so it lives in localStorage and survives reloads. After sign-in the API merges
 * the guest cart into the account and the handle is dropped.
 */
const CART_TOKEN_KEY = 'ggp-cart-token';
export const cartTokenStore = {
  get: () => { try { return localStorage.getItem(CART_TOKEN_KEY); } catch { return null; } },
  set: (t) => { try { localStorage.setItem(CART_TOKEN_KEY, t); } catch { /* storage unavailable */ } },
  clear: () => { try { localStorage.removeItem(CART_TOKEN_KEY); } catch { /* storage unavailable */ } },
};

api.interceptors.request.use((cfg) => {
  if (accessToken) cfg.headers.Authorization = `Bearer ${accessToken}`;
  const cartToken = cartTokenStore.get();
  if (cartToken && /^\/(cart|checkout)/.test(cfg.url || '')) cfg.headers['X-Cart-Token'] = cartToken;
  cfg.metadata = { startedAt: performance.now() };
  logRequest(cfg);
  return cfg;
});

// Log every answer (success or error) with the route it belongs to.
api.interceptors.response.use(
  (r) => { logResponse(r.config, r.status, r.data, false); return r; },
  (error) => { logResponse(error.config, error.response?.status, error.response?.data || error.message, true); return Promise.reject(error); },
);

// Keep the guest cart handle in sync with what the API says.
api.interceptors.response.use((r) => {
  const d = r.data?.data;
  if (d?.cartToken) cartTokenStore.set(d.cartToken);
  if (d?.guestCartMerged) cartTokenStore.clear();
  return r;
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let refreshPromise = null;

/** Single-flight refresh: concurrent 401s share one refresh call. */
export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const refreshUrl = `${baseURL}/auth/refresh`;
          const refreshCfg = { method: 'post', url: refreshUrl, metadata: { startedAt: performance.now() } };
          logRequest(refreshCfg);
          const { data } = await axios.post(refreshUrl, null, { withCredentials: true, timeout: 15000 })
            .catch((e) => { logResponse(refreshCfg, e.response?.status, e.response?.data || e.message, true); throw e; });
          logResponse(refreshCfg, 200, data, false);
          accessToken = data.data.accessToken;
          return data.data;
        } catch (err) {
          // Another tab rotated the cookie a moment ago - the browser now has the new one; retry once.
          if (err.response?.data?.error?.code === 'REFRESH_RACE' && attempt === 0) { await sleep(350); continue; }
          accessToken = null;
          throw err;
        }
      }
      throw new Error('Refresh failed');
    })().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

const isAuthCall = (url = '') => /\/auth\/(login|register|refresh|logout)/.test(url);

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config || {};
    const status = error.response?.status;
    const code = error.response?.data?.error?.code;

    if (status === 401 && !original._retry && !isAuthCall(original.url) && (code === 'TOKEN_EXPIRED' || code === 'TOKEN_MISSING')) {
      original._retry = true;
      try {
        await refreshSession();
        original.headers = { ...original.headers, Authorization: `Bearer ${accessToken}` };
        return api(original);
      } catch (e) {
        onSessionExpired();
        return Promise.reject(e);
      }
    }
    if (status === 401 && !isAuthCall(original.url)) onSessionExpired();
    return Promise.reject(error);
  },
);

export const errorMessage = (err) => err?.response?.data?.error?.message || err?.message || 'Request failed';
export const fieldErrors = (err) =>
  Object.fromEntries((err?.response?.data?.error?.details || []).map((d) => [d.path, d.message]));
