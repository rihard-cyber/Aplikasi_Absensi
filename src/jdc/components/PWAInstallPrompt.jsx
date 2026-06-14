import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, ArrowUpCircle } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // 1. Detect if already in standalone (installed) mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) {
      return;
    }

    // 2. Check if user dismissed the prompt recently (e.g. dismissed for 3 days)
    const dismissedUntil = localStorage.getItem('smpjdc_pwa_dismissed_until');
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
      return;
    }

    // 3. Detect iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDetected = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(iosDetected);

    // 4. Listen for beforeinstallprompt (Android / Chrome / Desktop)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 5. Fallback for iOS Safari: Show prompt after a short delay (e.g. 5 seconds)
    if (iosDetected) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    setShowPrompt(false);
    deferredPrompt.prompt();
    
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to PWA install: ${outcome}`);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Dismiss for 3 days
    const dismissedTime = Date.now() + 3 * 24 * 60 * 60 * 1000;
    localStorage.setItem('smpjdc_pwa_dismissed_until', dismissedTime.toString());
  };

  if (!showPrompt) return null;

  return (
    <>
      <div className="pwa-prompt-overlay">
        <div className="pwa-prompt-card">
          <div className="pwa-prompt-header">
            <div className="pwa-prompt-icon-container">
              <Smartphone className="pwa-icon-phone" />
              <Download className="pwa-icon-download" />
            </div>
            <button className="pwa-close-btn" onClick={handleDismiss} aria-label="Tutup">
              <X size={18} />
            </button>
          </div>
          
          <div className="pwa-prompt-body">
            <h3>Pasang Aplikasi SMPJDC</h3>
            <p>
              Dapatkan akses cepat, notifikasi patroli real-time, dan kestabilan sistem langsung dari beranda Anda.
            </p>
            
            {isIos && (
              <div className="ios-instructions">
                <p className="ios-step">
                  <span className="step-num">1</span>
                  Tap tombol share/bagikan <ArrowUpCircle size={15} style={{ display: 'inline', verticalAlign: 'middle', color: 'var(--color-primary, #3b82f6)' }} /> di bagian bawah Safari.
                </p>
                <p className="ios-step">
                  <span className="step-num">2</span>
                  Pilih menu <strong>"Tambahkan ke Layar Utama"</strong> (Add to Home Screen).
                </p>
              </div>
            )}
          </div>

          <div className="pwa-prompt-footer">
            <button className="pwa-btn-dismiss" onClick={handleDismiss}>
              Nanti Saja
            </button>
            {!isIos && (
              <button className="pwa-btn-install" onClick={handleInstallClick}>
                Pasang Sekarang
              </button>
            )}
            {isIos && (
              <button className="pwa-btn-install ios-understand" onClick={handleDismiss}>
                Saya Mengerti
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .pwa-prompt-overlay {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 999999;
          animation: pwaSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          width: 360px;
          max-width: calc(100vw - 48px);
        }

        .pwa-prompt-card {
          background: var(--bg-glass, rgba(15, 23, 42, 0.75));
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--border-glass, rgba(255, 255, 255, 0.08));
          border-radius: 20px;
          padding: 1.25rem;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), 
                      inset 0 1px 1px rgba(255, 255, 255, 0.1);
          color: var(--text-primary, #f8fafc);
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .pwa-prompt-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .pwa-prompt-icon-container {
          position: relative;
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.15));
          border: 1px solid var(--border-glass, rgba(255, 255, 255, 0.1));
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pwa-icon-phone {
          color: var(--color-primary, #3b82f6);
          width: 22px;
          height: 22px;
        }

        .pwa-icon-download {
          position: absolute;
          bottom: 5px;
          right: 5px;
          color: #10b981;
          width: 14px;
          height: 14px;
          background: #0f172a;
          border-radius: 50%;
          padding: 1px;
        }

        .pwa-close-btn {
          background: rgba(255, 255, 255, 0.05);
          border: none;
          color: var(--text-muted, #94a3b8);
          cursor: pointer;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .pwa-close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-primary, #f8fafc);
        }

        .pwa-prompt-body h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 1.1rem;
          font-weight: 700;
          margin: 0 0 0.5rem 0;
          letter-spacing: -0.01em;
          color: var(--text-primary, #f8fafc);
        }

        .pwa-prompt-body p {
          font-family: 'Inter', sans-serif;
          font-size: 0.825rem;
          line-height: 1.45;
          margin: 0;
          color: var(--text-secondary, #cbd5e1);
        }

        .ios-instructions {
          margin-top: 0.75rem;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px dashed var(--border-glass, rgba(255, 255, 255, 0.1));
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .ios-step {
          font-size: 0.75rem !important;
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          color: var(--text-secondary, #94a3b8) !important;
          margin: 0 !important;
        }

        .step-num {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          background: rgba(59, 130, 246, 0.2);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 50%;
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--color-primary, #3b82f6);
          flex-shrink: 0;
          margin-top: 1px;
        }

        .pwa-prompt-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 0.25rem;
        }

        .pwa-btn-dismiss {
          font-family: 'Inter', sans-serif;
          font-size: 0.8rem;
          font-weight: 600;
          background: transparent;
          border: 1px solid var(--border-glass, rgba(255, 255, 255, 0.15));
          color: var(--text-secondary, #cbd5e1);
          padding: 0.5rem 0.875rem;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pwa-btn-dismiss:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary, #f8fafc);
          border-color: rgba(255, 255, 255, 0.25);
        }

        .pwa-btn-install {
          font-family: 'Inter', sans-serif;
          font-size: 0.8rem;
          font-weight: 700;
          background: linear-gradient(135deg, var(--color-primary, #2563eb), #1d4ed8);
          border: none;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 10px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
          transition: all 0.2s;
        }

        .pwa-btn-install:hover {
          background: linear-gradient(135deg, #1d4ed8, #1e40af);
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
        }

        .pwa-btn-install:active {
          transform: translateY(0);
        }

        .ios-understand {
          background: linear-gradient(135deg, var(--color-success, #10b981), #059669);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .ios-understand:hover {
          background: linear-gradient(135deg, #059669, #047857);
          box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
        }

        @keyframes pwaSlideUp {
          from {
            transform: translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @media (max-width: 640px) {
          .pwa-prompt-overlay {
            bottom: 0;
            right: 0;
            left: 0;
            width: 100%;
            max-width: 100%;
          }
          
          .pwa-prompt-card {
            border-radius: 24px 24px 0 0;
            border-bottom: none;
            border-left: none;
            border-right: none;
            padding: 1.5rem 1.5rem 2rem 1.5rem;
          }
          
          .pwa-prompt-footer {
            flex-direction: column-reverse;
          }
          
          .pwa-btn-dismiss, .pwa-btn-install {
            width: 100%;
            padding: 0.75rem;
            font-size: 0.875rem;
            text-align: center;
          }
        }
      `}</style>
    </>
  );
}
