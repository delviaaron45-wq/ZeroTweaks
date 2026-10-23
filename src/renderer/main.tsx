// Renderer entry point
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import App from './App';
import './styles/globals.css';

// Mount app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <I18nextProvider i18n={i18n}>
        <HashRouter>
          <App />
        </HashRouter>
      </I18nextProvider>
    </React.StrictMode>
  );
}

// Handle theme changes from main process
if (window.zerotweaks?.utils?.['on:themeChanged']) {
  window.zerotweaks.utils['on:themeChanged']((theme: string) => {
    document.documentElement.setAttribute('data-theme', theme);
  });
}