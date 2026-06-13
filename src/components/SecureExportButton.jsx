import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, AlertCircle, ShieldCheck, CheckCircle2, Loader2, FileSpreadsheet, FileText } from 'lucide-react';
import { downloadCSV } from '../utils/downloadUtil';
import { exportTableToPdf } from '../utils/exportPdf';

const SecureExportButton = ({ data, filename = 'Export_Data', label = 'Download Data', className = '', scope = 'tenant', canExport = false, role = 'EMPLOYEE' }) => {
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [format, setFormat] = useState('pdf'); // 'csv' | 'pdf'

  const scopeMap = {
    superadmin: 'SEMUA TENANT (SUPER ADMIN PREVIEW)',
    tenant: 'TENANT',
    project: 'PROJECT',
    division: 'DIVISI'
  };
  const safeScope = typeof scope === 'string' && Object.prototype.hasOwnProperty.call(scopeMap, scope) ? scope : null;
  const scopeLabel = safeScope ? scopeMap[safeScope] : 'DATA';

  const handleExport = async () => {
    if (!canExport) {
      setError('Anda tidak memiliki akses untuk mengekspor data ini.');
      return;
    }

    setExporting(true);
    await new Promise(r => setTimeout(r, 600));

    if (format === 'pdf') {
      const columns = [
        { header: 'NO', width: '5%' },
        { header: 'NIP', width: '10%' },
        { header: 'NAMA LENGKAP', width: '22%' },
        { header: 'JABATAN', width: '15%' },
        { header: 'PERUSAHAAN', width: '16%' },
        { header: 'DIVISI', width: '14%' },
        { header: 'EMAIL', width: '18%' }
      ];
      const rows = data.map((item, idx) => [
        idx + 1,
        item.NIP || '-',
        item.Nama_Lengkap || '-',
        item.Jabatan || '-',
        item.Perusahaan || '-',
        item.Divisi || '-',
        item.Email || '-'
      ]);
      exportTableToPdf({
        title: 'Laporan Database Kepegawaian HRIS',
        subtitle: `Scope: ${scopeLabel}`,
        columns,
        rows,
        fileName: filename,
        meta: [
          { label: 'Total Pegawai', value: data.length },
          { label: 'Dibuat Oleh', value: role }
        ]
      });
    } else {
      downloadCSV(data, filename);
    }

    setExportSuccess(true);
    setTimeout(() => { setShowModal(false); setExportSuccess(false); setExporting(false); }, 800);
  };

  const isDirect = role === 'SUPER_ADMIN';

  const handleClick = () => {
    if (!data || !data.length) {
      setError('📭 Database masih kosong — belum ada data untuk diexport');
      setTimeout(() => setError(''), 3500);
      return;
    }
    if (!canExport) {
      setError('Anda tidak memiliki akses untuk mengekspor data ini.');
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

              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-[var(--success)]/20 text-[var(--success)]">
                <ShieldCheck size={32} />
              </div>

              <h3 className="text-xl font-serif font-bold text-white mb-2">
                KONFIRMASI EKSPOR
              </h3>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-4">
                <span className="text-[9px] text-gray-400 uppercase tracking-widest">Scope:</span>
                <span className="text-[10px] font-bold text-[var(--aurora-3)]">{scopeLabel}</span>
              </div>

              <p className="text-xs text-gray-400 mb-2 leading-relaxed">
                {isDirect
                  ? 'Akun SUPER_ADMIN terverifikasi dari profil Supabase.'
                  : `Akses export untuk scope ${scopeLabel} sudah diverifikasi dari profil Supabase.`}
              </p>
              
              {/* Format Selector */}
              <div className="flex justify-center gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => setFormat('pdf')}
                  className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs transition-all ${format === 'pdf' ? 'border-[var(--aurora-3)] bg-[var(--aurora-3)]/10 text-[var(--aurora-3)] shadow-[0_0_15px_rgba(0,201,255,0.2)]' : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'}`}
                >
                  <FileText size={20} />
                  <span className="font-bold">Laporan PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('csv')}
                  className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs transition-all ${format === 'csv' ? 'border-[var(--success)] bg-[var(--success)]/10 text-[var(--success)] shadow-[0_0_15px_rgba(0,255,135,0.2)]' : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'}`}
                >
                  <FileSpreadsheet size={20} />
                  <span className="font-bold">Database CSV</span>
                </button>
              </div>

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

              {!exportSuccess && (
                <button onClick={handleExport} disabled={exporting}
                  className="w-full py-4 rounded-xl text-white font-bold uppercase tracking-widest transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 bg-gradient-to-r from-[var(--success)] to-emerald-500 hover:shadow-[0_0_30px_rgba(0,255,135,0.4)]">
                  {exporting ? (
                    <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Memproses...</span>
                  ) : (
                    `Unduh ${data.length} Data (${format.toUpperCase()})`
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
