import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle, AlertTriangle, Play, Database, Download, XCircle, Building2, Network } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';

const BulkScheduleUpload = ({ tenantId, projectId }) => {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [masterShifts, setMasterShifts] = useState([]);
  const [existingProfiles, setExistingProfiles] = useState([]);
  const [existingProjects, setExistingProjects] = useState([]);
  const [existingDivisions, setExistingDivisions] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [tenantInfo, setTenantInfo] = useState(null);
  const lastResult = useRef(null);

  useEffect(() => { fetchReferences(); }, [tenantId, projectId]);

  const fetchReferences = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: myProfile } = await supabase.from('profiles')
        .select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
      if (!myProfile?.tenant_id) return;
      const tid = tenantId || myProfile.tenant_id;
      setTenantInfo(tid);

      const [shiftData, empData, projData, divData] = await Promise.all([
        supabase.from('master_shifts').select('id, shift_code').eq('tenant_id', tid),
        supabase.from('profiles').select('id, nip, full_name').eq('tenant_id', tid),
        supabase.from('projects').select('id, name').eq('tenant_id', tid),
        supabase.from('divisions').select('id, name, project_id').eq('tenant_id', tid),
      ]);
      if (shiftData.data) setMasterShifts(shiftData.data);
      if (empData.data) setExistingProfiles(empData.data);
      if (projData.data) setExistingProjects(projData.data);
      if (divData.data) setExistingDivisions(divData.data);
    } catch (e) {
      console.error('Fetch refs error:', e);
    }
  };

  const addLog = (msg) => setLogs(prev => [...prev, msg]);

  const handleFileUpload = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => parseCSV(ev.target.result);
    reader.readAsText(f);
  };

  const parseCSV = (csvText) => {
    setLogs([]);
    const lines = csvText.split('\n').filter(l => l.trim());
    if (lines.length < 2) { addLog('❌ Butuh minimal 1 baris data.'); return; }

    const delimiter = lines[0].includes(';') ? ';' : ',';
    const hasTwoHeaders = lines[1]?.trim().startsWith(',');
    const dataStart = hasTwoHeaders ? 2 : 1;

    const firstRow = lines[dataStart].split(delimiter).map(c => c.trim());
    if (firstRow.length < 7) {
      addLog(`❌ ${firstRow.length} kolom. Format: No,Periode,KodeProject,NIK,Nama,Project,Divisi,1,2,3...`);
      return;
    }

    const periode = firstRow[1];
    if (!/^\d{4}-\d{2}$/.test(periode)) {
      addLog(`❌ Periode '${periode}' tidak valid. Gunakan YYYY-MM.`);
      return;
    }

    const rows = [];
    for (let i = dataStart; i < lines.length; i++) {
      const cols = lines[i].split(delimiter).map(c => c.trim());
      const nik = cols[3];
      if (!nik || nik === 'NIK') continue;
      const schedules = cols.slice(7).map((code, j) => ({
        date: `${periode}-${String(j + 1).padStart(2, '0')}`,
        code: code?.toUpperCase() || 'OFF'
      }));
      rows.push({
        nik, nama: cols[4] || '',
        projectName: cols[5] || '',
        divisionName: cols[6] || '',
        schedules
      });
    }

    setParsedData(rows);
    addLog(`✅ ${rows.length} karyawan untuk periode ${periode}. (${new Set(rows.map(r => r.projectName)).size} project, ${new Set(rows.map(r => r.divisionName)).size} divisi)`);
  };

  const ensureProject = async (name) => {
    if (!name || !tenantInfo) return null;
    const existing = existingProjects.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing.id;
    const { data } = await supabase.from('projects').insert({
      tenant_id: tenantInfo, name, latitude: 0, longitude: 0, radius: 50
    }).select('id').single();
    if (data) {
      existingProjects.push(data);
      addLog(`🏢 Auto-create project: ${name}`);
      return data.id;
    }
    return null;
  };

  const ensureDivision = async (name, projId) => {
    if (!name || !projId) return null;
    const existing = existingDivisions.find(d => d.name.toLowerCase() === name.toLowerCase() && d.project_id === projId);
    if (existing) return existing.id;
    const { data } = await supabase.from('divisions').insert({
      tenant_id: tenantInfo, project_id: projId, name
    }).select('id').single();
    if (data) {
      existingDivisions.push(data);
      addLog(`📂 Auto-create divisi: ${name}`);
      return data.id;
    }
    return null;
  };

  const executeInject = async () => {
    if (parsedData.length === 0 || !tenantInfo) return;
    setIsProcessing(true);
    setUploadStatus(null);
    setLogs([]);
    addLog('🚀 Memulai injeksi...');

    const shiftMap = {};
    masterShifts.forEach(s => { shiftMap[s.shift_code] = s.id; });
    const existingMap = {};
    existingProfiles.forEach(p => { if (p.nip) existingMap[p.nip] = p; });

    let stats = { created: 0, assigned: 0, inserted: 0, errors: [] };
    lastResult.current = stats;
    const toUpsert = [];

    for (const row of parsedData) {
      let emp = existingMap[row.nik];

      if (!emp) {
        try {
          const { data: newEmp } = await supabase.from('profiles').insert({
            tenant_id: tenantInfo, nip: row.nik,
            full_name: row.nama || `Karyawan ${row.nik}`,
            role: 'EMPLOYEE', attendance_access: true
          }).select('id, nip').single();
          if (newEmp) { emp = newEmp; existingMap[row.nik] = newEmp; stats.created++; }
          else continue;
        } catch (e) {
          stats.errors.push(`${row.nik}: gagal buat profile - ${e.message}`);
          continue;
        }
      }

      // Assign project & division
      let projId = null;
      let divId = null;
      if (row.projectName) {
        projId = await ensureProject(row.projectName);
        if (row.divisionName) {
          divId = await ensureDivision(row.divisionName, projId);
        }
        if (projId || divId) {
          const updates = {};
          if (projId) updates.project_id = projId;
          if (divId) updates.division_id = divId;
          const { error } = await supabase.from('profiles').update(updates).eq('id', emp.id);
          if (!error) stats.assigned++;
        }
      }

      // Insert schedules
      for (const s of row.schedules) {
        if (s.code === 'OFF' || !s.code) continue;
        const shiftId = shiftMap[s.code];
        if (!shiftId) { stats.errors.push(`${row.nik} - ${s.date}: kode "${s.code}" tidak dikenal`); continue; }
        toUpsert.push({ user_id: emp.id, tenant_id: tenantInfo, date: s.date, shift_id: shiftId });
      }
    }

    if (toUpsert.length > 0) {
      try {
        for (let i = 0; i < toUpsert.length; i += 100) {
          await supabase.from('user_schedules').upsert(toUpsert.slice(i, i + 100), { onConflict: 'user_id,date' });
        }
        stats.inserted = toUpsert.length;
        lastResult.current = stats;
        addLog(`✅ ${toUpsert.length} jadwal + ${stats.created} profil + ${stats.assigned} assign project.`);
        setUploadStatus('success');
      } catch (e) {
        addLog(`❌ Error: ${e.message}`);
        setUploadStatus('error');
      }
    } else {
      addLog('❌ Tidak ada data jadwal valid.');
      setUploadStatus('error');
    }

    stats.errors.slice(0, 15).forEach(e => addLog(`⚠️ ${e}`));
    if (stats.created > 0 || stats.assigned > 0) fetchReferences();
    setIsProcessing(false);
  };

  const handleDownloadTemplate = () => {
    let csv = 'No,Periode,KodeProject,NIK,Nama Karyawan,Project,Divisi';
    for (let i = 1; i <= 31; i++) csv += `,${i}`;
    csv += '\n';
    csv += '1,2026-05,PVI-05,701083,INDRA BUDI,KEMENDAG-CIRACAS,Security,' + 'OFF,'.repeat(31).slice(0, -1) + '\n';
    csv += '2,2026-05,PVI-05,701971,TRI WINARSO,BK.PERDAG,Security,' + 'PS,'.repeat(31).slice(0, -1) + '\n';

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Template_Jadwal_Bulanan.csv';
    a.click();
  };

  return (
    <div className="glass-panel p-6 border border-white/5 space-y-6 animate-fade-in">
      {uploadStatus && (
        <div className={`p-5 rounded-3xl border flex items-start gap-4 ${
          uploadStatus === 'success'
            ? 'bg-[var(--success)]/10 border-[var(--success)]/30 text-[var(--success)]'
            : 'bg-[var(--danger)]/10 border-[var(--danger)]/30 text-[var(--danger)]'
        }`}>
          {uploadStatus === 'success' ? <CheckCircle size={24} className="shrink-0" /> : <AlertTriangle size={24} className="shrink-0" />}
          <div className="flex-1">
            <h4 className="font-bold text-sm text-white">
              {uploadStatus === 'success' ? '✅ Jadwal Berhasil Disimpan!' : '❌ Gagal Menyimpan Jadwal'}
            </h4>
            <p className="text-xs text-gray-400 mt-1">
              {uploadStatus === 'success'
                ? `${lastResult.current?.inserted || 0} jadwal + ${lastResult.current?.created || 0} profil baru + ${lastResult.current?.assigned || 0} assign project.`
                : 'Cek konsol untuk detail error.'}
            </p>
          </div>
          <button onClick={() => setUploadStatus(null)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><XCircle size={16} /></button>
        </div>
      )}

      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-serif font-bold text-white flex items-center gap-2">
            <Database className="text-[var(--aurora-1)]" /> Upload Jadwal Bulanan
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Kolom <strong>Project</strong> & <strong>Divisi</strong> otomatis assign ke profil pegawai untuk geofencing lokasi absen.
          </p>
        </div>
        <button onClick={handleDownloadTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-gray-300 hover:text-white transition-all uppercase tracking-widest">
          <Download size={14} /> Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border-2 border-dashed border-white/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-[var(--aurora-1)] transition-colors relative overflow-hidden group bg-white/5">
          <input type="file" accept=".csv" onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
          <FileSpreadsheet size={48} className="text-gray-500 group-hover:text-[var(--aurora-1)] transition-colors mb-4" />
          <p className="text-white font-bold mb-1">{file ? file.name : 'Klik atau seret CSV'}</p>
          <p className="text-xs text-gray-500">Format: No,Periode,KodeProject,NIK,Nama,Project,Divisi,1,2,3...</p>

          {parsedData.length > 0 && !isProcessing && (
            <button onClick={(e) => { e.stopPropagation(); executeInject(); }}
              className="mt-6 px-6 py-2 bg-gradient-to-r from-[var(--aurora-1)] to-[#1E90FF] text-white rounded-full font-bold text-sm tracking-widest hover:shadow-[0_0_15px_var(--aurora-1)] flex items-center gap-2 z-20 relative">
              <Play size={16} /> MULAI INJEKSI
            </button>
          )}
        </div>

        <div className="bg-[#0B0C10] border border-white/5 rounded-2xl p-4 flex flex-col h-64">
          <h3 className="text-xs text-gray-500 font-bold tracking-widest uppercase mb-3 flex items-center gap-2">
            <Database size={12} /> Konsol Proses
          </h3>
          <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-1.5">
            {logs.length === 0 ? (
              <p className="text-gray-600 italic">Menunggu file...</p>
            ) : (
              logs.map((log, i) => (
                <p key={i} className={`${log.startsWith('✅') ? 'text-[var(--success)]' : log.startsWith('❌') ? 'text-[var(--danger)]' : 'text-gray-300'}`}>{log}</p>
              ))
            )}
            {isProcessing && <p className="text-[var(--aurora-3)] animate-pulse">Memproses...</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkScheduleUpload;
