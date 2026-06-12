import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://192.168.1.53:9444',
        changeOrigin: true,
        secure: false, // allows self-signed SSL cert on BAW
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            const cookies = proxyRes.headers['set-cookie'];
            if (cookies) {
              proxyRes.headers['set-cookie'] = cookies.map(c =>
                c.replace(/;\s*Secure/gi, '').replace(/;\s*SameSite=None/gi, '')
              );
            }
          });
          proxy.on('error', (err) => {
            console.error('[Vite Proxy Error]: Cannot reach BAW server.', err.message);
          });
        },
      },
    },
  },
})