/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { initPushNotifications } from './utils/pushNotification.js'
import './index.css'

// Hilangkan loading splash screen saat React siap
const removeLoader = () => {
  const el = document.getElementById('appLoader');
  if (el) {
    el.classList.add('fade');
    setTimeout(() => el.remove(), 500);
  }
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

// Panggil segera setelah render pertama
requestAnimationFrame(removeLoader);

// Inisialisasi Push Notification Service Worker
initPushNotifications().catch(() => {/* silent fail if SW not supported */});
