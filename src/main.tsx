import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/dm-serif-display/latin-400.css';
import '@fontsource-variable/figtree';
import { App } from './App.tsx';
import './index.css';

// Pause the scene's animations while the tab is hidden.
document.addEventListener('visibilitychange', () => {
  document.documentElement.toggleAttribute('data-hidden', document.hidden);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
