import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import './i18n';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Не найден элемент #root');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
