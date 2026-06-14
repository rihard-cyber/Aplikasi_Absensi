import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Download, X, ArrowUpCircle } from 'lucide-react';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) return;

    const dismissed = localStorage.getItem('pwa_dismissed_until');
    if (dismissed && Date.now() < parseInt(dismissed, 10)) return;

    const ua = navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    setIsIos(ios);

    const checkGlobalPrompt = () => {
      if (window.deferredPWAInstallPrompt) {
        setDeferredPrompt(window.deferredPWAInstallPrompt);
        setShowPrompt(true);
      }
    };

    // Initial check
    checkGlobalPrompt();

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    const globalHandler = () => {
      checkGlobalPrompt();
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('pwa-installable', globalHandler);

    if (ios) {
      const timer = setTimeout(() => setShowPrompt(true), 5000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handler);
        window.removeEventListener('pwa-installable', globalHandler);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('pwa-installable', globalHandler);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    setShowPrompt(false);
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_dismissed_until', (Date.now() + 259200000).toString());
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-6 right-6 left-6 sm:left-auto sm:w-[360px] z-[99999]"
        >
          <div className="bg-[#1A1C23]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
                <Smartphone size={22} className="text-blue-400" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Download size={10} className="text-white" />
                </div>
              </div>
              <button onClick={dismiss} className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-gray-500 hover:text-white">
                <X size={14} />
              </button>
            </div>

            <div>
              <h3 className="text-base font-bold text-white font-sans">Pasang Aplikasi SI PRESENSI</h3>
              <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                Dapatkan akses cepat, notifikasi real-time, dan kestabilan sistem langsung dari layar utama Anda.
              </p>
            </div>

            {isIos && (
              <div className="bg-white/[0.03] border border-dashed border-white/10 rounded-xl p-3 space-y-2">
                <p className="flex items-start gap-2 text-xs text-gray-400">
                  <span className="w-4 h-4 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">1</span>
                  Tap tombol <ArrowUpCircle size={13} className="inline text-blue-400" /> share di Safari.
                </p>
                <p className="flex items-start gap-2 text-xs text-gray-400">
                  <span className="w-4 h-4 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">2</span>
                  Pilih <strong className="text-white">"Tambahkan ke Layar Utama"</strong>.
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button onClick={dismiss} className="px-4 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                Nanti Saja
              </button>
              {!isIos && (
                <button onClick={install} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--aurora-3)] to-purple-600 text-white text-sm font-bold shadow-lg hover:shadow-xl hover:translate-y-[-1px] transition-all">
                  Pasang Sekarang
                </button>
              )}
              {isIos && (
                <button onClick={dismiss} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-bold shadow-lg">
                  Saya Mengerti
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;
