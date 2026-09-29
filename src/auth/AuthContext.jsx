import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { refreshSession, setSessionExpiredHandler, tokenStore } from '../api/client';
import { auth } from '../api/store';

const AuthContext = createContext(null);
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ggp-customer-auth') : null;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | authenticated | anonymous
  const timer = useRef(null);

  const clearLocal = useCallback(() => {
    clearTimeout(timer.current);
    tokenStore.clear();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const applySession = useCallback((session) => {
    tokenStore.set(session.accessToken);
    setUser(session.user);
    setStatus('authenticated');
    // Refresh one minute before the access token expires.
    clearTimeout(timer.current);
    const ms = Math.max((session.expiresIn - 60) * 1000, 10_000);
    timer.current = setTimeout(() => { refreshSession().then(applySession).catch(clearLocal); }, ms);
  }, [clearLocal]);

  useEffect(() => {
    setSessionExpiredHandler(clearLocal);
    refreshSession().then(applySession).catch(() => setStatus('anonymous'));
    const onMessage = (e) => {
      if (e.data === 'logout') clearLocal();
      if (e.data === 'login') refreshSession().then(applySession).catch(clearLocal);
    };
    channel?.addEventListener('message', onMessage);
    return () => { channel?.removeEventListener('message', onMessage); clearTimeout(timer.current); };
  }, [applySession, clearLocal]);

  const login = useCallback(async (body) => {
    const { data } = await auth.login(body);
    applySession(data);
    channel?.postMessage('login');
    return data.user;
  }, [applySession]);

  const register = useCallback(async (body) => {
    const { data } = await auth.register(body);
    applySession(data);
    channel?.postMessage('login');
    return data.user;
  }, [applySession]);

  const logout = useCallback(async () => {
    try { await auth.logout(); } finally {
      channel?.postMessage('logout');
      clearLocal();
    }
  }, [clearLocal]);

  const value = useMemo(() => ({
    user, status, isAuthed: status === 'authenticated', login, register, logout, applySession, setUser,
  }), [user, status, login, register, logout, applySession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
