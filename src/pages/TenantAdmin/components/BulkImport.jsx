import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Download, CheckCircle2, XCircle, Loader2, AlertCircle, FileSpreadsheet, Users } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';

const TEMPLATE_HEADERS = ['NIP', 'Nama Lengkap', 'Email', 'Password', 'Posisi', 'Role', 'Project Code', 'Division Name'];

const BulkImport = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState([]);
  const [tenantId, setTenantId] = useState(null);
  const [adminId, setAdminId] = useState(null);
  const fileRef = useRef(null);
  const toast = useToast();

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setResults([]);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { toast('File kosong atau hanya header', 'error'); return; }
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"+|"+$/g, ''));
      const rows = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/^"+|"+$/g, ''));
        const row = {};
        headers.forEach((h, i) => row[h] = vals[i] || '');
        return row;
      });
      setPreview(rows.slice(0, 20));
    };
    reader.readAsText(f);
  };

  const startImport = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: p } = await supabase.from('profiles').select('id, tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!p?.tenant_id) return;
    setTenantId(p.tenant_id);
    setAdminId(p.id);
    setImporting(true);

    const results = [];
    for (const row of preview) {
      try {
        if (!row['NIP'] || !row['Nama Lengkap']) {
          results.push({ nip: row['NIP'] || '-', name: row['Nama Lengkap'] || '-', status: 'error', message: 'NIP & Nama wajib' });
          continue;
        }

        let projectId = null;
        if (row['Project Code']) {
          const { data: proj } = await supabase.from('projects').select('id').eq('code', row['Project Code']).eq('tenant_id', p.tenant_id).maybeSingle();
          if (proj) projectId = proj.id;
        }

        let divisionId = null;
        if (row['Division Name']) {
          const { data: div } = await supabase.from('divisions').select('id').eq('name', row['Division Name']).eq('tenant_id', p.tenant_id).maybeSingle();
          if (div) divisionId = div.id;
        }

        const { data: existing } = await supabase.from('profiles').select('id').eq('nip', row['NIP']).eq('tenant_id', p.tenant_id).maybeSingle();
        if (existing) {
          await supabase.from('profiles').update({
            full_name: row['Nama Lengkap'], position: row['Posisi'] || null,
            project_id: projectId, division_id: divisionId,
            email: row['Email'] || null
          }).eq('id', existing.id);
          results.push({ nip: row['NIP'], name: row['Nama Lengkap'], status: 'success', message: 'Diperbarui' });
        } else {
          await supabase.from('profiles').insert({
            tenant_id: p.tenant_id, nip: row['NIP'], full_name: row['Nama Lengkap'],
            position: row['Posisi'] || null, role: row['Role'] || 'EMPLOYEE',
            project_id: projectId, division_id: divisionId,
            email: row['Email'] || null, attendance_access: true
          });
          results.push({ nip: row['NIP'], name: row['Nama Lengkap'], status: 'success', message: 'Dibuat' });
        }
      } catch (e) {
        results.push({ nip: row['NIP'] || '-', name: row['Nama Lengkap'] || '-', status: 'error', message: e.message });
      }
    }
    setResults(results);
    setImporting(false);
    const success = results.filter(r => r.status === 'success').length;
    toast(`${success} dari ${results.length} karyawan berhasil diproses!`, success > 0 ? 'success' : 'error');
  };

  const downloadTemplate = () => {
    const csv = TEMPLATE_HEADERS.join(',') + '\n' + 'EMP001,John Doe,john@email.com,password123,Staff,EMPLOYEE,KMC,IT Division\nEMP002,Jane Smith,jane@email.com,password456,Supervisor,SUB_ADMIN,BKP,HRD';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'template_import_karyawan.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <div className="glass-panel p-8">
      <div className="border-b border-white/10 pb-6 mb-8">
        <h2 className="text-2xl font-serif font-bold text-white">Import Karyawan (CSV)</h2>
        <p className="text-sm text-gray-400 mt-1">Upload file CSV untuk membuat atau memperbarui data karyawan massal</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><FileSpreadsheet size={18} className="text-[var(--aurora-3)]" /> 1. Download Template</h3>
          <p className="text-xs text-gray-400 mb-4">Download file template CSV, isi data karyawan, lalu upload kembali.</p>
          <button onClick={downloadTemplate} className="px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-bold flex items-center gap-2">
            <Download size={14} /> Download Template CSV
          </button>
          <div className="mt-4 bg-black/30 rounded-xl p-4">
            <p className="text-[9px] text-gray-500 font-mono mb-2">Format kolom:</p>
            <code className="text-[9px] text-green-400 font-mono break-all">{TEMPLATE_HEADERS.join(', ')}</code>
          </div>
        </div>

        <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Upload size={18} className="text-[var(--aurora-3)]" /> 2. Upload File CSV</h3>
          <label className="flex flex-col items-center gap-3 p-8 bg-white/[0.02] border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-[var(--aurora-3)]/30 transition-all">
            <Upload size={32} className="text-gray-500" />
            <span className="text-sm text-gray-400">{file ? file.name : 'Klik untuk pilih file CSV'}</span>
            <span className="text-[10px] text-gray-600">Format: CSV dengan header</span>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
          </label>
        </div>
      </div>

      {preview.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-bold text-white mb-3">Preview ({preview.length} data pertama)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-gray-500 uppercase tracking-widest">
                <tr>{TEMPLATE_HEADERS.map(h => <th key={h} className="p-3 font-bold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {preview.map((row, i) => (
                  <tr key={i} className="hover:bg-white/[0.02]">
                    {TEMPLATE_HEADERS.map(h => <td key={h} className="p-3 text-gray-300">{row[h] || '-'}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={startImport} disabled={importing} className="px-8 py-3 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50">
              {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Import {preview.length} Karyawan
            </button>
            <button onClick={() => { setFile(null); setPreview([]); setResults([]); }} className="px-6 py-3 rounded-xl bg-white/5 text-gray-400 border border-white/10 text-xs font-bold">Batal</button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {results.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-white/5 rounded-2xl border border-white/10">
            <div className="flex items-center gap-6 mb-4">
              <h3 className="text-sm font-bold text-white">Hasil Import</h3>
              <span className="text-xs text-[var(--success)] font-bold">✓ {successCount} berhasil</span>
              {errorCount > 0 && <span className="text-xs text-[var(--danger)] font-bold">✗ {errorCount} gagal</span>}
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
              {results.map((r, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border text-xs ${r.status === 'success' ? 'bg-[var(--success)]/5 border-[var(--success)]/20' : 'bg-[var(--danger)]/5 border-[var(--danger)]/20'}`}>
                  {r.status === 'success' ? <CheckCircle2 size={14} className="text-[var(--success)]" /> : <XCircle size={14} className="text-[var(--danger)]" />}
                  <span className="font-bold text-white">{r.name}</span>
                  <span className="text-gray-500">({r.nip})</span>
                  <span className="text-gray-400">— {r.message}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BulkImport;
