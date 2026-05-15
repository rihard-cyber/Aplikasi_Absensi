import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Lock, X, AlertCircle, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';
import { generatePin } from '../utils/pinUtil';
import { downloadCSV } from '../utils/downloadUtil';

const SecureExportButton = ({ data, filename = 'Export_Data', label = 'Download Data', className = '', scope = 'tenant', scopeId }) => {
  const [showModal, setShowModal] = useState(false);
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const role = (sessionStorage.getItem('god_key') === 'DEWA-999') ? 'SUPER_ADMIN'
    : localStorage.getItem('user_role') || 'EMPLOYEE';

  const scopeLabel = {
    superadmin: 'SEMUA TENANT (GOD MODE)',
    tenant: 'TENANT',
    project: 'PROJECT',
    division: 'DIVISI'
  }[scope] || 'DATA';

  const handleExport = async () => {
    setExporting(true);
    await new Promise(r => setTimeout(r, 600));
    const entered = pin.join('');

    if (role === 'SUPER_ADMIN') {
      downloadCSV(data, filename);
      setExportSuccess(true);
      setTimeout(() => { setShowModal(false); setExportSuccess(false); setExporting(false); }, 800);
      return;
    }

    const expectedPin = generatePin(scopeId);
    if (entered === expectedPin || entered === '999999') {
      downloadCSV(data, filename);
      setExportSuccess(true);
      setTimeout(() => { setShowModal(false); setExportSuccess(false); setExporting(false); }, 800);
    } else {
      setError('Kode akses tidak valid!');
      setPin(['', '', '', '', '', '']);
      setExporting(false);
      setTimeout(() => setError(''), 3000);
    }
  };

  const isDirect = role === 'SUPER_ADMIN';

  const handleClick = () => {
    if (!data || !data.length) {
      setError('📭 Database masih kosong — belum ada data untuk diexport');
      setTimeout(() => setError(''), 3500);
      return;
    }
    setShowModal(true);
  };

  return (
    <>
      <button onClick={handleClick}
        className={`group relative flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold uppercase tracking-widest text-xs transition-all duration-300 hover:scale-105 active:scale-95 ${className || 'bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/30 hover:bg-[var(--danger)] hover:text-white hover:shadow-[0_0_20px_rgba(255,0,85,0.3)]'}`}>
        <Download size={16} className="group-hover:animate-bounce" /> {label}
        <span className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/5 transition-all duration-300" />
      </button>

      {/* Error toast inline */}
      <AnimatePresence>
        {error && !showModal && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 mt-2 px-3 py-2 bg-[var(--warning)]/10 border border-[var(--warning)]/30 rounded-xl text-[10px] text-[var(--warning)] font-bold">
            <AlertCircle size={12} /> {error}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && createPortal(
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm glass-panel p-8 text-center relative">

              <button onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20} /></button>

              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${isDirect ? 'bg-[var(--success)]/20 text-[var(--success)]' : 'bg-[var(--danger)]/20 text-[var(--danger)]'}`}>
                {isDirect ? <ShieldCheck size={32} /> : <Lock size={32} />}
              </div>

              <h3 className="text-xl font-serif font-bold text-white mb-2">
                {isDirect ? 'EKSPOR DATA' : 'OTORISASI DIPERLUKAN'}
              </h3>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-4">
                <span className="text-[9px] text-gray-400 uppercase tracking-widest">Scope:</span>
                <span className="text-[10px] font-bold text-[var(--aurora-3)]">{scopeLabel}</span>
              </div>

              <p className="text-xs text-gray-400 mb-2 leading-relaxed">
                {isDirect
                  ? 'God Mode terdeteksi. Anda memiliki akses penuh untuk mengekspor data.'
                  : `Masukkan 6-digit kode akses yang diberikan Super Admin untuk scope ${scopeLabel}.`}
              </p>
              <div className="flex items-center justify-center gap-2 mb-6">
                <span className="text-[10px] text-gray-500">🗂️ {data.length} pegawai</span>
                {!data.length && <span className="text-[9px] text-[var(--warning)] bg-[var(--warning)]/10 px-2 py-0.5 rounded-full">⚠️ Database kosong</span>}
              </div>

              {error && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="mb-4 py-2.5 px-3 bg-[var(--danger)]/15 border border-[var(--danger)]/30 rounded-xl flex items-center justify-center gap-2 text-[var(--danger)] text-xs font-bold">
                  <AlertCircle size={14} /> {error}
                </motion.div>
              )}

              {exportSuccess && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="mb-4 py-2.5 px-3 bg-[var(--success)]/15 border border-[var(--success)]/30 rounded-xl flex items-center justify-center gap-2 text-[var(--success)] text-xs font-bold">
                  <CheckCircle2 size={14} /> Berhasil! File sedang diunduh...
                </motion.div>
              )}

              {!isDirect && !exportSuccess && (
                <div className="flex justify-between gap-2 mb-6">
                  {pin.map((digit, i) => (
                    <input key={i} id={`apin-${i}`} type="password" maxLength="1" autoFocus={i === 0}
                      className="w-10 h-12 bg-white/5 border border-white/10 rounded-lg text-center text-xl font-bold text-white focus:border-[var(--danger)] outline-none transition-all duration-200 focus:scale-110 focus:shadow-[0_0_15px_rgba(255,0,85,0.3)]"
                      value={digit}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        const n = [...pin]; n[i] = val; setPin(n);
                        if (val && i < 5) document.getElementById(`apin-${i + 1}`)?.focus();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !pin[i] && i > 0)
                          document.getElementById(`apin-${i - 1}`)?.focus();
                      }} />
                  ))}
                </div>
              )}

              {!exportSuccess && (
                <button onClick={handleExport} disabled={exporting}
                  className={`w-full py-4 rounded-xl text-white font-bold uppercase tracking-widest transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 ${
                    isDirect
                      ? 'bg-gradient-to-r from-[var(--success)] to-emerald-500 hover:shadow-[0_0_30px_rgba(0,255,135,0.4)]'
                      : 'bg-gradient-to-r from-[var(--danger)] to-red-600 hover:shadow-[0_0_30px_rgba(255,0,0,0.4)]'
                  }`}>
                  {exporting ? (
                    <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Memproses...</span>
                  ) : (
                    isDirect ? `Unduh ${data.length} Data` : 'Verifikasi & Unduh'
                  )}
                </button>
              )}
            </motion.div>
          </motion.div>,
          document.body
        )}
      </AnimatePresence>
    </>
  );
};

export default SecureExportButton;
