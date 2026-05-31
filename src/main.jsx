import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { initPushNotifications } from './utils/pushNotification.js'
import './i18n.js'
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

// ── Android Keyboard Fix (via Capacitor Keyboard Plugin) ──────
// Scrolled active input into view when keyboard opens
(async () => {
  try {
    const { Keyboard } = await import('@capacitor/keyboard');
    await Keyboard.addListener('keyboardWillShow', () => {
      const active = document.activeElement;
      if (active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) {
        setTimeout(() => active.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      }
    });
  } catch {
    // Keyboard plugin tidak tersedia (web/browser)
  }
})();
