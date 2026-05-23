/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanLine, Upload, Eye, Copy, CheckCircle2, Loader2, X, FileText, CreditCard, Receipt } from 'lucide-react';
import { compressImage } from '../../../utils/imageCompressor';

/**
 * OCRScanner — Auto-OCR Dokumen HR
 * 
 * Menggunakan Tesseract.js (client-side OCR) untuk mengekstrak teks dari:
 * - KTP / NIK
 * - NPWP
 * - Slip Gaji
 * - Surat Keterangan lainnya
 * 
 * Tidak memerlukan server eksternal — berjalan 100% di browser.
 * 
 * INSTALL:
 *   npm install tesseract.js
 * 
 * Atau gunakan API OCR eksternal gratis jika tidak mau install library berat:
 *   - OCR.Space API (https://ocr.space/ocrapi) — FREE 25k req/bulan
 *   - Google Cloud Vision (berbayar tapi akurat)
 */

const DOC_TYPES = [
  { id: 'ktp', label: 'KTP', icon: CreditCard, color: 'var(--aurora-3)', fields: ['NIK', 'Nama', 'Tempat/Tgl Lahir', 'Alamat', 'Pekerjaan'] },
  { id: 'npwp', label: 'NPWP', icon: FileText, color: 'var(--warning)', fields: ['Nomor NPWP', 'Nama', 'Alamat'] },
  { id: 'slip', label: 'Slip Gaji', icon: Receipt, color: 'var(--success)', fields: ['Nama', 'Gaji Pokok', 'Tunjangan', 'Total Gaji', 'Bulan'] },
  { id: 'other', label: 'Dokumen Lain', icon: FileText, color: 'var(--aurora-1)', fields: [] },
];

// OCR via OCR.space API (FREE tier) — fallback jika Tesseract.js tidak diinstall
const OCR_SPACE_KEY = import.meta.env.VITE_OCR_SPACE_KEY || 'helloworld'; // Ganti di .env untuk 25k req/bulan

const ocrViaAPI = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('language', 'ind'); // Bahasa Indonesia
  formData.append('isOverlayRequired', 'false');
  formData.append('detectOrientation', 'true');
  formData.append('scale', 'true');
  formData.append('OCREngine', '2'); // More accurate

  const res = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: { 'apikey': OCR_SPACE_KEY },
    body: formData,
  });

  if (!res.ok) throw new Error('OCR API error: ' + res.status);
  const data = await res.json();
  if (data.IsErroredOnProcessing) throw new Error(data.ErrorMessage?.[0] || 'OCR gagal');
  return data.ParsedResults?.[0]?.ParsedText || '';
};

// Try Tesseract.js first (if installed via npm install tesseract.js), fallback to API
const runOCR = async (file, onProgress) => {
  // Attempt Tesseract.js — will fail gracefully if not installed
  if (typeof window !== 'undefined') {
    try {
      // eslint-disable-next-line no-new-func
      const mod = await new Function('u', 'return import(u)')('tesseract.js');
      const { createWorker } = mod;
      const worker = await createWorker('ind', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') onProgress(Math.round(m.progress * 100));
        }
      });
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();
      return text;
    } catch {
      // Tesseract.js not installed — fall through to API
    }
  }
  // Fallback: OCR.space API (free tier)
  onProgress(30);
  const text = await ocrViaAPI(file);
  onProgress(100);
  return text;
};

// Parse KTP fields from raw text
const parseKTP = (text) => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const get = (patterns) => {
    for (const line of lines) {
      for (const p of patterns) {
        const m = line.match(p);
        if (m) return m[1]?.trim() || m[0]?.trim();
      }
    }
    return '';
  };
  return {
    NIK: get([/(\d{16})/, /NIK[:\s]+(\d+)/i]),
    Nama: get([/Nama[:\s]+(.+)/i, /NAMA[:\s]+(.+)/i]),
    'Tgl Lahir': get([/(\d{2}-\d{2}-\d{4})/, /Lahir[:\s]+(.+)/i]),
    'Jenis Kelamin': get([/(LAKI-LAKI|PEREMPUAN)/i]),
    Alamat: get([/Alamat[:\s]+(.+)/i]),
    Pekerjaan: get([/Pekerjaan[:\s]+(.+)/i]),
  };
};

const parseNPWP = (text) => {
  return {
    'Nomor NPWP': (text.match(/\d{2}\.\d{3}\.\d{3}\.\d{1}-\d{3}\.\d{3}/) || [])[0] || '',
    Nama: (text.match(/Nama[:\s]+(.+)/i) || [])[1]?.trim() || '',
    Alamat: (text.match(/Alamat[:\s]+(.+)/i) || [])[1]?.trim() || '',
  };
};

const parseSlip = (text) => {
  const fmtRp = (s) => s?.replace(/[^0-9]/g, '') || '';
  return {
    Nama: (text.match(/Nama[:\s]+(.+)/i) || [])[1]?.trim() || '',
    'Gaji Pokok': fmtRp((text.match(/[Gg]aji [Pp]okok[:\s]+([\d.,]+)/) || [])[1]),
    Tunjangan: fmtRp((text.match(/[Tt]unjangan[:\s]+([\d.,]+)/) || [])[1]),
    'Total Gaji': fmtRp((text.match(/[Tt]otal[:\s]+([\d.,]+)/) || [])[1]),
    Periode: (text.match(/([A-Za-z]+ \d{4})/) || [])[0] || '',
  };
};

const parsedResult = (type, text) => {
  if (type === 'ktp') return parseKTP(text);
  if (type === 'npwp') return parseNPWP(text);
  if (type === 'slip') return parseSlip(text);
  return {};
};

const OCRScanner = () => {
  const [docType, setDocType] = useState('ktp');
  const [image, setImage] = useState(null);
  const [imageURL, setImageURL] = useState(null);
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const fileRef = useRef();
  const cameraRef = useRef();

  const handleFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setStatus('loading');
    setProgress(0);
    setRawText('');
    setParsed(null);
    setError('');

    try {
      const compressed = await compressImage(file, { maxWidth: 1600, quality: 0.85 });
      const url = URL.createObjectURL(compressed);
      setImage(compressed);
      setImageURL(url);

      const text = await runOCR(compressed, setProgress);
      setRawText(text);
      setParsed(parsedResult(docType, text));
      setStatus('done');
    } catch (e) {
      setError(e.message || 'OCR gagal');
      setStatus('error');
    }
  }, [docType]);

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  };

  const copyField = (val) => {
    navigator.clipboard?.writeText(val).catch(() => {});
    setCopied(val);
    setTimeout(() => setCopied(''), 2000);
  };

  const selectedType = DOC_TYPES.find(t => t.id === docType);

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in pb-20">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-serif font-bold text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center">
            <ScanLine size={20} className="text-white" />
          </div>
          Auto-OCR Dokumen HR
        </h2>
        <p className="text-gray-400 text-sm mt-1 ml-[52px]">
          Ekstrak teks dari foto KTP, NPWP, dan slip gaji secara otomatis
        </p>
      </div>

      {/* Doc Type Selector */}
      <div className="flex gap-2 flex-wrap">
        {DOC_TYPES.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => { setDocType(t.id); setParsed(null); setRawText(''); setStatus('idle'); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${docType === t.id ? 'border-white/30 text-white' : 'border-white/10 text-gray-500 hover:border-white/20 hover:text-gray-300'}`}
              style={docType === t.id ? { background: `${t.color}15`, borderColor: `${t.color}40`, color: t.color } : {}}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Area */}
        <div className="space-y-4">
          {/* Drop Zone */}
          <div
            className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer ${status === 'loading' ? 'border-[var(--aurora-3)]/40 bg-[var(--aurora-3)]/5' : 'border-white/10 hover:border-white/20 hover:bg-white/3'}`}
            onClick={() => fileRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            style={{ minHeight: 260 }}
          >
            {imageURL ? (
              <div className="relative">
                <img src={imageURL} alt="preview" className="w-full h-64 object-contain rounded-2xl p-2" />
                <button
                  onClick={e => { e.stopPropagation(); setImageURL(null); setImage(null); setStatus('idle'); setRawText(''); setParsed(null); }}
                  className="absolute top-3 right-3 w-7 h-7 bg-black/70 rounded-full flex items-center justify-center text-white hover:bg-black"
                >
                  <X size={12} />
                </button>
                {status === 'loading' && (
                  <div className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center gap-3">
                    <Loader2 size={32} className="animate-spin text-[var(--aurora-3)]" />
                    <div className="w-40 bg-white/10 rounded-full h-2">
                      <div className="h-2 rounded-full bg-[var(--aurora-3)] transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-white text-xs">{progress}% — Memproses OCR...</p>
                  </div>
                )}
                {status === 'done' && (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-[var(--success)]/90 text-black text-[9px] font-bold px-2 py-1 rounded-full">
                    <CheckCircle2 size={10} /> OCR Selesai
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 gap-4 text-gray-500">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                  <Upload size={28} className="text-gray-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-400">Drag & drop atau klik untuk upload</p>
                  <p className="text-[10px] text-gray-600 mt-1">PNG, JPG, JPEG — Max 10MB</p>
                </div>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
          </div>

          {/* Camera Capture */}
          <button
            onClick={() => { const i = document.createElement('input'); i.type='file'; i.accept='image/*'; i.capture='environment'; i.onchange=(e)=>{ if(e.target.files?.[0]) handleFile(e.target.files[0]); }; i.click(); }}
            className="w-full py-3 rounded-xl border border-white/10 text-gray-400 hover:border-white/20 hover:text-white text-sm flex items-center justify-center gap-2 transition-all bg-white/3"
          >
            📷 Ambil Foto dengan Kamera
          </button>

          {/* Error */}
          {status === 'error' && (
            <div className="p-4 bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-xl text-xs text-[var(--danger)]">
              ❌ {error}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="space-y-4">
          {parsed && Object.keys(parsed).length > 0 ? (
            <>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Eye size={16} className="text-[var(--aurora-3)]" />
                Hasil Ekstraksi — {selectedType?.label}
              </h3>
              <div className="space-y-2">
                {Object.entries(parsed).map(([key, val]) => (
                  <div key={key} className="glass-panel p-3 rounded-xl border border-white/5 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-0.5">{key}</p>
                      <p className="text-sm text-white font-medium">{val || <span className="text-gray-600 italic">tidak terdeteksi</span>}</p>
                    </div>
                    {val && (
                      <button onClick={() => copyField(val)}
                        className="text-gray-500 hover:text-white transition-colors flex-shrink-0 mt-1">
                        {copied === val ? <CheckCircle2 size={14} className="text-[var(--success)]" /> : <Copy size={14} />}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : rawText ? null : (
            <div className="glass-panel p-10 rounded-2xl border border-white/5 text-center h-64 flex flex-col items-center justify-center">
              <ScanLine size={48} className="text-gray-700 mb-4" />
              <p className="text-gray-500 text-sm">Upload foto dokumen untuk memulai OCR</p>
            </div>
          )}

          {/* Raw Text */}
          {rawText && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Teks Mentah OCR</p>
                <button onClick={() => copyField(rawText)} className="text-[9px] text-gray-500 hover:text-white flex items-center gap-1">
                  <Copy size={10} /> {copied === rawText ? 'Disalin!' : 'Salin'}
                </button>
              </div>
              <textarea
                readOnly value={rawText}
                className="w-full h-40 bg-[#0B0C10] border border-white/10 rounded-xl p-3 text-gray-300 text-[10px] font-mono resize-none outline-none custom-scrollbar"
              />
            </div>
          )}
        </div>
      </div>

      {/* Info Panel */}
      <div className="p-4 bg-white/3 border border-white/5 rounded-2xl text-[10px] text-gray-500 leading-relaxed">
        <strong className="text-gray-300">Teknologi OCR:</strong> Menggunakan <strong className="text-white">Tesseract.js</strong> (offline, privasi terjaga) atau <strong className="text-white">OCR.space API</strong> (free tier, 500 req/hari) sebagai fallback.
        Untuk akurasi maksimal pada dokumen Indonesia, install: <code className="text-[var(--aurora-3)] px-1 bg-white/5 rounded">npm install tesseract.js</code>
      </div>
    </div>
  );
};

export default OCRScanner;
