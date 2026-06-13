import React, { useState, useRef } from 'react';
import { Download, Upload, AlertTriangle, CheckCircle, Database, RefreshCw } from 'lucide-react';

const ALL_KEYS = [
  'sapujagat_users', 'sapujagat_areas', 'sapujagat_reports', 'sapujagat_findings',
  'smpjdc_mutasi_logs', 'smpjdc_attendance_logs', 'smpjdc_complaints', 'smpjdc_theme',
  'smpjdc_db_version', 'smpjdc_session', 'smpjdc_login_attempts'
];

export default function BackupRestore({ addToast, onResetUsers, onClearAllData }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  const collectAllData = () => {
    const data = {};
    ALL_KEYS.forEach(key => {
      try {
        const val = localStorage.getItem(key);
        if (val) data[key] = JSON.parse(val);
      } catch {}
    });
    // Include PIN hashes
    const pinKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('smpjdc_pin_')) pinKeys.push(k);
    }
    pinKeys.forEach(k => {
      try { data[k] = localStorage.getItem(k); } catch {}
    });
    return data;
  };

  const handleExport = () => {
    setBusy(true);
    try {
      const data = collectAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smpjdc-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setResult({ type: 'success', message: `Backup berhasil! ${Object.keys(data).length} key tersimpan.` });
      if (addToast) addToast(`Backup berhasil — ${Object.keys(data).length} key`, 'success');
    } catch (e) {
      setResult({ type: 'error', message: `Gagal backup: ${e.message}` });
    }
    setBusy(false);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBusy(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        let count = 0;
        Object.entries(data).forEach(([key, value]) => {
          if (key.startsWith('smpjdc_pin_') || ALL_KEYS.includes(key)) {
            localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
            count++;
          }
        });
        setResult({ type: 'success', message: `Restore berhasil! ${count} key dipulihkan. Refresh halaman untuk melihat perubahan.` });
        if (addToast) addToast(`Restore berhasil! ${count} key dipulihkan.`, 'success');
      } catch (err) {
        setResult({ type: 'error', message: `File tidak valid: ${err.message}` });
      }
      setBusy(false);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', maxWidth: '500px' }}>
      <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Database size={18} className="text-primary" /> Backup & Restore Data
      </h3>

      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
        Ekspor seluruh data sistem ke file JSON, atau impor dari backup sebelumnya.
        Data backup mencakup users, area, laporan, temuan, dan semua pengaturan.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <button onClick={handleExport} disabled={busy} className="btn-primary" style={{ padding: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
          <Download size={16} /> {busy ? 'Memproses...' : 'Export Backup (.json)'}
        </button>

        <div style={{ position: 'relative' }}>
          <button onClick={() => fileRef.current?.click()} disabled={busy} className="btn-secondary" style={{ width: '100%', padding: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
            <Upload size={16} /> Import Backup (.json)
          </button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
        </div>

        {onResetUsers && (
          <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
            <button
              onClick={() => {
                if (window.confirm('PERINGATAN! Tindakan ini akan menghapus semua user saat ini di database Firestore dan menggantinya dengan 11 user default. Apakah Anda yakin?')) {
                  onResetUsers();
                }
              }}
              disabled={busy}
              className="btn-danger"
              style={{
                width: '100%',
                padding: '0.7rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                fontSize: '0.82rem',
                background: 'rgba(239,68,68,0.15)',
                color: 'var(--color-danger)',
                border: '1px solid rgba(239,68,68,0.3)'
              }}
            >
              <RefreshCw size={16} /> Reset User Database ke Default
            </button>
          </div>
        )}

        {onClearAllData && (
          <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
            <button
              onClick={() => {
                if (window.confirm('PERINGATAN KERAS! Tindakan ini akan menghapus SELURUH data laporan patroli, temuan, mutasi, absensi, dan komplain dari Firestore dan LocalStorage. Tindakan ini tidak dapat dibatalkan! Apakah Anda yakin?')) {
                  onClearAllData();
                }
              }}
              disabled={busy}
              className="btn-danger"
              style={{
                width: '100%',
                padding: '0.7rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                fontSize: '0.82rem',
                background: 'rgba(239,68,68,0.15)',
                color: 'var(--color-danger)',
                border: '1px solid rgba(239,68,68,0.3)'
              }}
            >
              <RefreshCw size={16} /> Hapus Semua Laporan & Temuan (Wipe Data)
            </button>
          </div>
        )}
      </div>

      {result && (
        <div style={{
          marginTop: '1rem', padding: '0.6rem 0.8rem', borderRadius: '8px', fontSize: '0.78rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: result.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          color: result.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'
        }}>
          {result.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          <span>{result.message}</span>
        </div>
      )}
    </div>
  );
}
