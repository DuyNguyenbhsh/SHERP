import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    // Proxy /api requests → NestJS backend
    // FE gọi /api/auth/login → Vite forward tới http://localhost:3000/api/auth/login
    // Tránh CORS issues + Windows Firewall blocking cross-origin
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // Không rewrite — backend đã có prefix /api
      },
    },
  },
})
