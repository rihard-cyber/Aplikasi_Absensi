import React, { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const BulkImport = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error' | null

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setFile(files[0]);
    }
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setFile(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setStatus(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setStatus('success');
    } catch (err) {
      setStatus('error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--aurora-3)]/5 rounded-full blur-[100px] pointer-events-none" />
        <h2 className="text-xl font-serif font-bold text-white mb-1">Bulk Import Database Pegawai</h2>
        <p className="text-xs text-gray-400">Unggah file Excel (XLSX) atau CSV untuk memasukkan data karyawan dalam jumlah besar secara instan.</p>
      </div>

      <div className="glass-panel p-8 border border-white/10 text-center flex flex-col items-center justify-center min-h-[300px]">
        <div 
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="w-full max-w-lg border-2 border-dashed border-white/20 hover:border-[var(--aurora-3)]/50 rounded-3xl p-8 transition-all flex flex-col items-center justify-center cursor-pointer bg-white/[0.02] hover:bg-white/[0.04]"
        >
          <input 
            type="file" 
            id="fileInput" 
            accept=".csv, .xlsx, .xls"
            onChange={handleFileChange}
            className="hidden" 
          />
          <label htmlFor="fileInput" className="cursor-pointer flex flex-col items-center justify-center w-full">
            <div className="w-16 h-16 rounded-2xl bg-[var(--aurora-3)]/10 text-[var(--aurora-3)] flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(0,201,255,0.1)]">
              <Upload size={28} />
            </div>
            {file ? (
              <div className="flex items-center gap-2 text-white">
                <FileSpreadsheet className="text-[var(--success)]" size={18} />
                <span className="text-sm font-bold">{file.name}</span>
                <span className="text-xs text-gray-500">({Math.round(file.size / 1024)} KB)</span>
              </div>
            ) : (
              <>
                <p className="text-sm font-bold text-white mb-1">Seret & taruh file Anda di sini</p>
                <p className="text-xs text-gray-500">atau klik untuk menelusuri folder (.xlsx, .csv)</p>
              </>
            )}
          </label>
        </div>

        {file && !uploading && status === null && (
          <button
            onClick={handleUpload}
            className="mt-6 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_20px_rgba(142,45,226,0.3)]"
          >
            Mulai Impor Karyawan
          </button>
        )}

        {uploading && (
          <div className="mt-6 flex items-center gap-2 text-xs font-bold text-gray-400">
            <Loader2 className="animate-spin text-[var(--aurora-3)]" size={16} />
            Memproses data & memvalidasi skema database...
          </div>
        )}

        {status === 'success' && (
          <div className="mt-6 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--success)] bg-[var(--success)]/10 border border-[var(--success)]/30 px-4 py-2.5 rounded-xl">
              <CheckCircle2 size={16} />
              Impor berhasil! Semua baris data telah dipetakan ke profil kepegawaian.
            </div>
            <button onClick={() => { setFile(null); setStatus(null); }} className="text-xs text-gray-500 hover:text-white mt-1 underline">
              Unggah file lain
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-6 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/30 px-4 py-2.5 rounded-xl">
              <AlertCircle size={16} />
              Gagal mengimpor data. Format kolom tidak sesuai atau duplikasi NIP terdeteksi.
            </div>
            <button onClick={() => { setFile(null); setStatus(null); }} className="text-xs text-gray-500 hover:text-white mt-1 underline">
              Coba lagi
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkImport;
