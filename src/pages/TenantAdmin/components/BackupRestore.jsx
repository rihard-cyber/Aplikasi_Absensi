import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Download, Upload, Database, Shield, AlertTriangle, CheckCircle2, Loader2, FileText, Clock, HardDrive, RefreshCcw } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { useConfirm } from '../../../components/ConfirmDialog';

const t = (s) => s;

const BACKUP_TABLES = [
  { key: 'profiles', label: 'Data Karyawan', icon: '👤' },
  { key: 'attendance_logs', label: 'Log Absensi', icon: '⏱️' },
  { key: 'patrol_checkpoints', label: 'Checkpoint Patroli', icon: '📍' },
  { key: 'patrol_logs', label: 'Log Patroli', icon: '🔄' },
  { key: 'patrol_incidents', label: 'Insiden Patroli', icon: '⚠️' },
  { key: 'mutasi_logs', label: 'Buku Mutasi', icon: '📝' },
  { key: 'patrol_shift_handovers', label: 'Handover Jaga', icon: '🤝' },
  { key: 'incident_reports', label: 'Laporan Insiden', icon: '🚨' },
  { key: 'helpdesk_tickets', label: 'Tiket Helpdesk', icon: '🎫' },
  { key: 'work_orders', label: 'Work Order', icon: '🔧' },
  { key: 'tenant_complaints', label: 'Komplain Tenant', icon: '🏢' },
  { key: 'company_policies', label: 'Kebijakan Perusahaan', icon: '📄' },
  { key: 'company_events', label: 'Acara Perusahaan', icon: '🎉' },
  { key: 'employee_salaries', label: 'Data Gaji', icon: '💰' },
  { key: 'payroll_results', label: 'Hasil Payroll', icon: '📊' },
  { key: 'loans', label: 'Pinjaman', icon: '💳' },
  { key: 'reimbursements', label: 'Reimbursemen', icon: '🧾' },
  { key: 'overtime_requests', label: 'Lembur', icon: '⚡' },
  { key: 'announcements', label: 'Pengumuman', icon: '📢' },
  { key: 'visitors', label: 'Pengunjung', icon: '🚪' },
];

const BackupRestore = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const [tenantId, setTenantId] = useState(null);
  const [tenantName, setTenantName] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastBackup, setLastBackup] = useState(null);
  const [selectedTables, setSelectedTables] = useState(BACKUP_TABLES.map(t => t.key));
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
        const tid = profile?.tenant_id;
        if (tid) {
          setTenantId(tid);
          const { data: tData } = await supabase.from('tenants').select('name').eq('id', tid).maybeSingle();
          if (tData) setTenantName(tData.name);
          const { data: bk } = await supabase.from('audit_logs').select('created_at').eq('tenant_id', tid).eq('action', 'BACKUP_EXPORT').order('created_at', { ascending: false }).limit(1).maybeSingle();
          if (bk) setLastBackup(bk.created_at);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    init();
  }, []);

  const toggleTable = (key) => {
    setSelectedTables(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleExport = async () => {
    if (selectedTables.length === 0) { toast('Pilih minimal 1 tabel!', 'error'); return; }
    if (!await confirm(`Ekspor ${selectedTables.length} tabel? Data akan diunduh sebagai JSON.`, 'Ekspor Backup')) return;

    setExporting(true);
    const backupData = { exported_at: new Date().toISOString(), tenant: tenantName, tenant_id: tenantId, tables: {} };
    let successCount = 0;

    try {
      for (const key of selectedTables) {
        try {
          let q = supabase.from(key).select('*');
          if (key !== 'tenants' && key !== 'audit_logs') q = q.eq('tenant_id', tenantId);
          const { data, error } = await q;
          if (!error && data) {
            backupData.tables[key] = data;
            successCount++;
          }
        } catch (e) { console.warn(`Gagal ekspor ${key}:`, e); }
      }

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${tenantName?.replace(/\s+/g, '_')}-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      supabase.from('audit_logs').insert({
        tenant_id: tenantId, action: 'BACKUP_EXPORT',
        details: { tables: selectedTables, count: successCount }
      }).then().catch(() => {});

      setLastBackup(new Date().toISOString());
      toast(`Backup berhasil! ${successCount} tabel diekspor.`, 'success');
    } catch (e) { toast('Gagal ekspor: ' + e.message, 'error'); }
    setExporting(false);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.tables || typeof data.tables !== 'object') {
          toast('Format backup tidak valid', 'error');
          setImportPreview(null);
          return;
        }
        setImportPreview({
          tenant: data.tenant || 'Unknown',
          date: data.exported_at,
          tables: Object.keys(data.tables),
          counts: Object.fromEntries(Object.entries(data.tables).map(([k, v]) => [k, v.length])),
        });
      } catch {
        toast('File JSON tidak valid', 'error');
        setImportPreview(null);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importFile || !importPreview) { toast('Pilih file backup terlebih dahulu!', 'error'); return; }
    if (!await confirm(`Import ${importPreview.tables.length} tabel dari ${importPreview.tenant}? Data EXISTING AKAN DILEWATKAN (skip konflik).`, 'Import Data')) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        let imported = 0;
        for (const [table, rows] of Object.entries(data.tables)) {
          if (!rows.length) continue;
          const batchSize = 50;
          for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize).map(row => {
              const { id, created_at, updated_at, ...rest } = row;
              return { ...rest, tenant_id: tenantId };
            });
            const { error } = await supabase.from(table).upsert(batch, { onConflict: 'id', ignoreDuplicates: true });
            if (error) console.warn(`Gagal import ${table} batch ${i}:`, error);
          }
          imported += rows.length;
        }
        supabase.from('audit_logs').insert({
          tenant_id: tenantId, action: 'BACKUP_IMPORT',
          details: { tables: importPreview.tables, count: imported }
        }).then().catch(() => {});
        toast(`Import selesai! ${imported} record dimasukkan.`, 'success');
        setImportFile(null);
        setImportPreview(null);
      } catch (e) { toast('Gagal import: ' + e.message, 'error'); }
      setImporting(false);
    };
    reader.readAsText(importFile);
  };

  if (loading) return <div className="p-20 text-center"><div className="w-8 h-8 border-2 border-[var(--aurora-3)] border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-serif font-bold text-white">{t('Backup & Restore')}</h3>
          <p className="text-xs text-gray-500 mt-0.5">Ekspor/Import data {tenantName} — format JSON</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-500">
          <Clock size={12} />
          {lastBackup ? `Backup terakhir: ${new Date(lastBackup).toLocaleDateString('id-ID')}` : 'Belum ada backup'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* EXPORT */}
        <div className="glass-panel p-6 rounded-[24px] border border-white/10 space-y-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <Download size={18} />
            <h4 className="text-sm font-bold text-white">Ekspor Backup</h4>
          </div>
          <p className="text-[11px] text-gray-500">Pilih tabel yang akan diekspor ke file JSON.</p>

          <div className="grid grid-cols-2 gap-1.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
            {BACKUP_TABLES.map(t => (
              <label key={t.key} className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all ${selectedTables.includes(t.key) ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/5 border border-white/5 hover:bg-white/10'}`}>
                <input type="checkbox" checked={selectedTables.includes(t.key)} onChange={() => toggleTable(t.key)} className="hidden" />
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${selectedTables.includes(t.key) ? 'bg-emerald-500 border-emerald-500' : 'border-gray-500'}`}>
                  {selectedTables.includes(t.key) && <span className="text-white text-[8px]">✓</span>}
                </div>
                <span className="text-xs text-gray-300">{t.icon} {t.label}</span>
              </label>
            ))}
          </div>

          <button onClick={handleExport} disabled={exporting || selectedTables.length === 0} className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <HardDrive size={14} />} Ekspor {selectedTables.length} Tabel
          </button>
        </div>

        {/* IMPORT */}
        <div className="glass-panel p-6 rounded-[24px] border border-white/10 space-y-4">
          <div className="flex items-center gap-2 text-amber-400">
            <Upload size={18} />
            <h4 className="text-sm font-bold text-white">Import Backup</h4>
          </div>
          <p className="text-[11px] text-gray-500">Upload file JSON backup untuk mengembalikan data.</p>

          {!importPreview ? (
            <label className="flex flex-col items-center justify-center p-8 bg-white/5 border-2 border-dashed border-white/20 rounded-2xl cursor-pointer hover:bg-white/10 transition-colors">
              <Upload size={32} className="text-gray-500 mb-3" />
              <p className="text-xs text-gray-400 font-bold">Klik untuk upload file JSON</p>
              <p className="text-[10px] text-gray-600 mt-1">File backup .json</p>
              <input type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
            </label>
          ) : (
            <div className="space-y-3">
              <div className="bg-white/5 rounded-xl p-4 space-y-2 border border-white/10">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Tenant</span>
                  <span className="text-white font-bold">{importPreview.tenant}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Tanggal Backup</span>
                  <span className="text-white">{new Date(importPreview.date).toLocaleDateString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Total Tabel</span>
                  <span className="text-white font-bold">{importPreview.tables.length}</span>
                </div>
                <div className="border-t border-white/5 pt-2 mt-2 max-h-[150px] overflow-y-auto custom-scrollbar space-y-1">
                  {importPreview.tables.map(t => (
                    <div key={t} className="flex justify-between text-[10px]">
                      <span className="text-gray-400">{t}</span>
                      <span className="text-gray-500">{importPreview.counts[t]} record</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleImport} disabled={importing} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                  {importing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />} Import Data
                </button>
                <button onClick={() => { setImportFile(null); setImportPreview(null); }} className="px-6 py-3 rounded-xl bg-white/5 text-gray-400 border border-white/10 text-xs font-bold">Batal</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="glass-panel p-4 rounded-2xl border border-white/5 flex items-start gap-3">
        <Shield size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="text-[11px] text-gray-500 leading-relaxed">
          <strong className="text-gray-300">Catatan:</strong> Backup mencakup data tenant Anda. Data yang sudah ada akan dilewati saat import (skip konflik) untuk mencegah duplikasi. Selalu simpan backup di tempat aman.
        </div>
      </div>
    </div>
  );
};

export default BackupRestore;
