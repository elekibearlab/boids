import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LANG } from '@/shared/i18n';
import { App } from './App';
import '@/styles.css';

// Set the ?lang= language on the page too, so screen readers and translators use the right language
document.documentElement.lang = LANG;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
