import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';

const OfflineIndicator = () => {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOffline(false);
    const goOffline = () => setOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[99999] bg-[var(--danger)]/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 py-2 safe-top"
        >
          <WifiOff size={14} /> Tidak ada koneksi internet — data mungkin tidak tersinkronisasi
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineIndicator;
