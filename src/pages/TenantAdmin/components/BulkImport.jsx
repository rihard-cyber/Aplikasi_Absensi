import React, { useState, useEffect } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Download } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { autoMapEmployeeFeatures } from '../../../utils/featureAccess';

const BulkImport = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null); 
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0 });
  const toast = useToast();

  // Load SheetJS dynamically
  const [XLSX, setXLSX] = useState(null);
  useEffect(() => {
    if (window.XLSX) {
      setXLSX(window.XLSX);
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
      script.onload = () => setXLSX(window.XLSX);
      document.head.appendChild(script);
    }
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) setFile(selectedFile);
  };

  const downloadTemplate = () => {
    if (!XLSX) return;
    const template = [
      ['Nama Lengkap', 'NIP', 'Email', 'Nomor HP', 'Divisi', 'Jabatan', 'Kode Proyek', 'Hak Akses'],
      ['Ahmad Fauzi', '2024001', 'ahmad@company.com', '08123456789', 'Security', 'Danru', 'JDC', 'Karyawan'],
      ['Siti Aminah', '2024002', 'siti@company.com', '08133445566', 'HRD', 'Manager', 'JDC', 'Admin'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Import');
    XLSX.writeFile(wb, 'Template_Database_Karyawan.xlsx');
  };

  const processImport = async () => {
    if (!file || !XLSX) return;
    setUploading(true);
    setStatus(null);
    setStats({ total: 0, success: 0, failed: 0 });

    try {
      const reader = new FileReader();
      const data = await new Promise((resolve) => {
        reader.onload = (e) => resolve(new Uint8Array(e.target.result));
        reader.readAsArrayBuffer(file);
      });

      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

      if (rows.length === 0) throw new Error('File kosong');

      // 1. Get Tenant Context & Mappings
      const { data: { session } } = await supabase.auth.getSession();
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).single();
      const tenantId = profile.tenant_id;

      const { data: customMappings } = await supabase
        .from('tenant_role_permissions')
        .select('*')
        .eq('tenant_id', tenantId);

      // 2. Pre-fetch Projects for mapping
      const { data: projects } = await supabase.from('projects').select('id, code').eq('tenant_id', tenantId);
      const projectMap = projects.reduce((acc, p) => ({ ...acc, [p.code?.toUpperCase()]: p.id }), {});

      let successCount = 0;
      let failedCount = 0;

      for (const row of rows) {
        try {
          const nip = String(row['NIP'] || '').trim();
          if (!nip) continue;

          const nama = row['Nama Lengkap'];
          const email = row['Email'];
          const phone = row['Nomor HP'];
          const divisiName = row['Divisi'];
          const jabatan = row['Jabatan'];
          const projectCode = String(row['Kode Proyek'] || '').toUpperCase();
          const roleRaw = String(row['Hak Akses'] || '').toUpperCase();

          // A. Auto-create or get Division
          let divisionId = null;
          if (divisiName) {
            const { data: existingDiv } = await supabase.from('divisions')
              .select('id')
              .eq('tenant_id', tenantId)
              .ilike('name', divisiName.trim())
              .maybeSingle();

            if (existingDiv) {
              divisionId = existingDiv.id;
            } else {
              const { data: newDiv } = await supabase.from('divisions')
                .insert({ tenant_id: tenantId, name: divisiName.trim() })
                .select('id')
                .single();
              divisionId = newDiv.id;
            }
          }

          // B. Map Features & Modules Automatically using DB mappings
          const mapping = autoMapEmployeeFeatures(jabatan, divisiName, customMappings);
          
          let targetRole = 'EMPLOYEE';
          if (roleRaw.includes('ADMIN')) targetRole = 'SUB_ADMIN';

          // C. Upsert Profile (Link by NIP)
          const profilePayload = {
            tenant_id: tenantId,
            nip: nip,
            full_name: nama,
            email: email || null,
            phone: phone || null,
            position: jabatan,
            division_id: divisionId,
            project_id: projectMap[projectCode] || null,
            role: targetRole,
            operational_access: mapping.needsOperational,
            attendance_access: true
          };

          const { data: upsertedProfile, error: profileErr } = await supabase
            .from('profiles')
            .upsert(profilePayload, { onConflict: 'nip' })
            .select('id')
            .single();

          if (profileErr) throw profileErr;

          // D. HRIS Data
          await supabase.from('employee_hris_data').upsert({
            user_id: upsertedProfile.id,
            tenant_id: tenantId,
            mobile_phone: phone || null
          }, { onConflict: 'user_id' });

          successCount++;
        } catch (err) {
          console.error(`Gagal memproses baris NIP ${row['NIP']}:`, err);
          failedCount++;
        }
      }

      setStats({ total: rows.length, success: successCount, failed: failedCount });
      setStatus(failedCount === 0 ? 'success' : 'partial');
      toast(`Impor selesai: ${successCount} berhasil, ${failedCount} gagal.`, failedCount === 0 ? 'success' : 'warning');

    } catch (err) {
      console.error('Import error:', err);
      setStatus('error');
      toast('Gagal memproses file: ' + err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 border border-white/10 relative overflow-hidden flex justify-between items-center">
        <div className="relative z-10">
          <h2 className="text-xl font-serif font-bold text-white mb-1">Smart Bulk Import</h2>
          <p className="text-xs text-gray-400 max-w-md">Sistem akan otomatis mendeteksi Jabatan dan Divisi untuk mengaktifkan modul aplikasi yang sesuai.</p>
        </div>
        <button 
          onClick={downloadTemplate}
          className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2 transition-all"
        >
          <Download size={14} /> Unduh Template
        </button>
      </div>

      <div className="glass-panel p-8 border border-white/10 text-center flex flex-col items-center justify-center min-h-[300px]">
        <div 
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
                <p className="text-sm font-bold text-white mb-1">Pilih File Master Karyawan</p>
                <p className="text-xs text-gray-500">Format yang didukung: Excel (.xlsx) & CSV</p>
              </>
            )}
          </label>
        </div>

        {file && !uploading && (
          <button
            onClick={processImport}
            className="mt-6 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_20px_rgba(142,45,226,0.3)]"
          >
            Mulai Sinkronisasi Database
          </button>
        )}

        {uploading && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-[var(--aurora-3)]" size={24} />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Memproses & Memetakan Roles...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="mt-6 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--success)] bg-[var(--success)]/10 border border-[var(--success)]/30 px-6 py-3 rounded-2xl">
              <CheckCircle2 size={18} />
              Berhasil Mengimpor {stats.success} Karyawan!
            </div>
            <p className="text-[10px] text-gray-500">Semua jabatan dan hak akses telah terkonfigurasi otomatis.</p>
          </div>
        )}

        {status === 'partial' && (
          <div className="mt-6 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--warning)] bg-[var(--warning)]/10 border border-[var(--warning)]/30 px-6 py-3 rounded-2xl">
              <AlertCircle size={18} />
              Import Selesai dengan {stats.failed} Kesalahan
            </div>
            <p className="text-[10px] text-gray-500">{stats.success} berhasil disinkronkan.</p>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-6">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/30 px-6 py-3 rounded-2xl">
              <AlertCircle size={18} />
              File tidak valid atau terjadi gangguan sistem.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkImport;
