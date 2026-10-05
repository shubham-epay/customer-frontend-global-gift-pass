import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { ShopProvider } from './auth/ShopContext';
import { ToastProvider } from './components/Toast';
import { CountryProvider } from './context/CountryContext';
import './styles/tokens.css';
import './styles/global.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CountryProvider>
            <ShopProvider>
              <App />
            </ShopProvider>
          </CountryProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
