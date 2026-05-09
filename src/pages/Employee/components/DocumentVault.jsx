import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, UploadCloud, FileCheck, Scan, AlertCircle, CheckCircle2 } from 'lucide-react';

const DocumentVault = () => {
  const [docState, setDocState] = useState('idle'); // idle, scanning, verified
  const [scannedData, setScannedData] = useState(null);

  const simulateOCR = () => {
    setDocState('scanning');

    // Simulate 3 seconds OCR processing
    setTimeout(() => {
      setScannedData({
        nik: '3201123456789000',
        name: 'ALEXANDER PUTRA',
        dob: '12-08-1995'
      });
      setDocState('verified');
    }, 3000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col gap-6 pb-20"
    >
      <div className="text-center mb-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--aurora-1)]/20 text-[var(--aurora-1)] mb-4 shadow-[0_0_20px_rgba(142,45,226,0.3)]">
          <Shield size={32} />
        </div>
        <h2 className="text-2xl font-serif font-bold text-white tracking-wide">Brankas Digital</h2>
        <p className="text-sm text-gray-400 mt-2 font-sans px-4">Unggah dan verifikasi dokumen resmi Anda secara aman.</p>
      </div>

      {/* Upload Zone */}
      <AnimatePresence mode="wait">
        {docState === 'idle' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }}
            className="glass-panel p-8 rounded-3xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[var(--aurora-3)] hover:bg-white/5 transition-all group"
            onClick={simulateOCR}
          >
            <UploadCloud size={48} className="text-gray-500 group-hover:text-[var(--aurora-3)] transition-colors mb-4" />
            <h3 className="text-white font-bold tracking-wide">Unggah KTP</h3>
            <p className="text-xs text-gray-500 mt-2">Ketuk untuk menelusuri atau mengambil foto. AI akan mengekstrak detail otomatis.</p>
          </motion.div>
        )}

        {/* Scanning Animation */}
        {docState === 'scanning' && (
          <motion.div
            key="scan"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="glass-panel p-8 rounded-3xl border border-[var(--aurora-3)] flex flex-col items-center justify-center text-center shadow-[0_0_30px_rgba(0,201,255,0.2)] overflow-hidden relative"
          >
            {/* Laser Line */}
            <motion.div
              animate={{ top: ['0%', '100%', '0%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute left-0 right-0 h-1 bg-[var(--aurora-3)] shadow-[0_0_15px_var(--aurora-3)] z-10"
            />

            <Scan size={48} className="text-[var(--aurora-3)] mb-4 animate-pulse" />
            <h3 className="text-white font-bold tracking-widest uppercase">Pemindaian AI OCR...</h3>
            <p className="text-xs text-[var(--aurora-3)] mt-2">Mengekstrak NIK dan Vektor Identitas</p>
          </motion.div>
        )}

        {/* Verified Result */}
        {docState === 'verified' && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-6 rounded-3xl border border-[var(--success)]/50 shadow-[0_0_20px_rgba(0,255,135,0.1)] relative"
          >
            <div className="absolute -top-4 -right-4 w-12 h-12 bg-[var(--bg-dark)] rounded-full flex items-center justify-center">
              <CheckCircle2 size={28} className="text-[var(--success)] drop-shadow-[0_0_10px_var(--success)]" />
            </div>

            <h3 className="text-[var(--success)] font-bold tracking-widest uppercase text-sm mb-6 flex items-center gap-2">
              <FileCheck size={18} /> Identitas Terverifikasi
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">NIK Terekstrak</p>
                <p className="text-white font-mono text-lg tracking-wider">{scannedData.nik}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Nama Lengkap</p>
                <p className="text-white font-bold">{scannedData.name}</p>
              </div>
            </div>

            <div className="mt-6 p-3 bg-white/5 border border-white/10 rounded-xl flex gap-3 items-start">
              <AlertCircle size={16} className="text-[var(--aurora-1)] shrink-0 mt-0.5" />
              <p className="text-xs text-gray-400">Data cocok dengan catatan HR. Perangkat Anda sekarang terikat secara aman pada identitas ini.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};

export default DocumentVault;
