import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { installErrorLogging } from './lib/errorLog';
import './i18n';
import './index.css';

// Yakalanmamış JS hataları + promise reddleri → Supabase error_logs.
// React kurulmadan önce takılıyor ki ilk paint hataları da yakalansın.
installErrorLogging();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Hide pre-bundled splash once React has mounted the first paint.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const splash = document.getElementById('app-splash');
    if (!splash) return;
    splash.classList.add('fade');
    setTimeout(() => splash.remove(), 600);
  });
});
