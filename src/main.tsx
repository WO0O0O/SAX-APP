import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/dm-serif-display/latin-400.css';
import '@fontsource-variable/figtree';
import { App } from './App.tsx';
import './index.css';
import { HOSTED } from './mode.ts';

// Pause the scene's animations while the tab is hidden.
document.addEventListener('visibilitychange', () => {
  document.documentElement.toggleAttribute('data-hidden', document.hidden);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// The online copy installs a service worker so it works offline and can be added to a phone's home screen.
if (import.meta.env.PROD && HOSTED && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
