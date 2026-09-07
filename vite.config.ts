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
        manualChunks(id) {
          // Vite'ın dinamik import yardımcısı (__vitePreload) her chunk'ta kullanılır.
          // Sabitlenmezse Rollup onu ilk ihtiyaç duyan chunk'a (jsPDF!) koyuyor ve
          // her sayfa 390 KB'lık pdf chunk'ını indiriyordu (Lighthouse unused-javascript).
          if (id.includes('vite/preload-helper')) return 'react';
          if (id.includes('node_modules')) {
            if (id.includes('react-router') || id.includes('/react/') || id.includes('/react-dom/')) return 'react';
            if (id.includes('/three/') || id.includes('three-stdlib') || id.includes('@react-three')) return 'three';
            if (id.includes('framer-motion') || id.match(/node_modules\/motion\//)) return 'motion';
            if (id.includes('i18next')) return 'i18n';
            if (id.includes('@supabase')) return 'supabase';
            if (id.includes('@stripe')) return 'stripe';
            // jsPDF ve html2canvas AYRI chunk: biri statik import edilince diğeri de inmesin
            if (id.includes('jspdf')) return 'pdf';
            if (id.includes('html2canvas')) return 'html2canvas';
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('zustand')) return 'state';
          }
          // Heavy data file kept out of every JS chunk it might tag along with.
          if (id.includes('/src/data/products.json')) return 'data-products';
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
