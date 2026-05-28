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

// ── Android Keyboard Fix ──────────────────────────────────────
// Prevent keyboard from closing when touching input fields
// by ensuring activeElement isn't lost on viewport resize
(function fixAndroidKeyboard() {
  let isKeyboardOpen = false;

  const handleFocusIn = (e) => {
    if (e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA' || e.target?.tagName === 'SELECT') {
      isKeyboardOpen = true;
      // Ensure the element is visible
      setTimeout(() => {
        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  };

  const handleFocusOut = (e) => {
    const related = e.relatedTarget;
    if (!related || (related.tagName !== 'INPUT' && related.tagName !== 'TEXTAREA' && related.tagName !== 'SELECT')) {
      isKeyboardOpen = false;
    }
  };

  document.addEventListener('focusin', handleFocusIn);
  document.addEventListener('focusout', handleFocusOut);

  // Prevent body scroll when keyboard is open
  let lastVisualHeight = window.innerHeight;
  window.addEventListener('resize', () => {
    const currentHeight = window.innerHeight;
    const keyboardOpened = lastVisualHeight - currentHeight > 100;
    if (keyboardOpened) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      // Scroll active element into view
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
        setTimeout(() => active.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      }
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    lastVisualHeight = currentHeight;
  });
})();
