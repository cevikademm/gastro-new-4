import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    cssCodeSplit: true,
    sourcemap: false,
    target: 'es2020',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          three: ['three'],
          motion: ['motion', 'framer-motion'],
          i18n: ['i18next', 'react-i18next'],
          supabase: ['@supabase/supabase-js'],
          stripe: ['@stripe/stripe-js', '@stripe/react-stripe-js'],
          pdf: ['jspdf', 'html2canvas'],
          icons: ['lucide-react'],
        },
      },
    },
    assetsInlineLimit: 4096,
  },
  optimizeDeps: {
    entries: ['index.html', 'src/main.tsx'],
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
});
