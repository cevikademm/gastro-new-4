import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './i18n';
import './index.css';

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
