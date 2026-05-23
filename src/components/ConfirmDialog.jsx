/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmContext = createContext(null);

export const useConfirm = () => useContext(ConfirmContext);

export const ConfirmProvider = ({ children }) => {
  const [state, setState] = useState({ open: false, message: '', onConfirm: null, title: '' });

  const confirm = useCallback((message, title = 'Konfirmasi') => {
    return new Promise((resolve) => {
      setState({ open: true, message, title, onConfirm: resolve });
    });
  }, []);

  const handleConfirm = () => {
    const cb = state.onConfirm;
    setState({ open: false, message: '', title: '', onConfirm: null });
    if (cb) cb(true);
  };

  const handleCancel = () => {
    const cb = state.onConfirm;
    setState({ open: false, message: '', title: '', onConfirm: null });
    if (cb) cb(false);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {state.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
            onClick={handleCancel}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm glass-panel p-8 text-center border border-[var(--warning)]/30 shadow-[0_0_40px_rgba(255,215,0,0.1)]"
            >
              <button onClick={handleCancel} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
                <X size={20} />
              </button>

              <div className="w-16 h-16 rounded-2xl bg-[var(--warning)]/10 flex items-center justify-center mx-auto mb-6 border border-[var(--warning)]/20">
                <AlertTriangle size={32} className="text-[var(--warning)]" />
              </div>

              <h3 className="text-xl font-serif font-bold text-white mb-3">{state.title}</h3>
              <p className="text-sm text-gray-400 mb-8 leading-relaxed">{state.message}</p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleConfirm}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-[var(--warning)] to-amber-500 text-black font-bold uppercase tracking-widest text-xs shadow-[0_10px_30px_rgba(255,215,0,0.2)] hover:scale-[1.02] transition-all"
                >
                  Ya, Lanjutkan
                </button>
                <button
                  onClick={handleCancel}
                  className="w-full py-4 rounded-xl bg-white/5 text-gray-400 font-bold uppercase tracking-widest text-xs border border-white/5 hover:bg-white/10 transition-all"
                >
                  Batal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
};
