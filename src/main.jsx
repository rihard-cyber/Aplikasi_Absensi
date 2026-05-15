import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
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
