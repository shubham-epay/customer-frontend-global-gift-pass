import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: 5174,
      strictPort: true,
      // Same-origin in development: the refresh cookie (SameSite=Strict, path=/api/auth) just works.
      proxy: { '/api': { target: env.VITE_API_PROXY_TARGET || 'http://localhost:5001', changeOrigin: false } },
    },
    build: { sourcemap: false, chunkSizeWarningLimit: 800 },
  };
});
