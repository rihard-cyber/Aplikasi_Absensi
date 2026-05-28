import React, { useState, useEffect, useRef } from 'react';
import { Upload, Download, AlertCircle, CheckCircle2, Loader2, CalendarDays, FileSpreadsheet, Users, X, Briefcase, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';

const parseCSVLine = (line) => {
  const result = [];
  let current = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (c === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else current += c;
  }
  result.push(current.trim());
  return result;
};

const daysInMonth = (month, year) => new Date(year, month, 0).getDate();

const ScheduleUpload = () => {
  const [step, setStep] = useState('idle');
  const [tenantId, setTenantId] = useState(null);
  const [existingEmp, setExistingEmp] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [existingProjects, setExistingProjects] = useState([]);
  const [existingDivisions, setExistingDivisions] = useState([]);
  const [preview, setPreview] = useState(null);
  const [results, setResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const toast = useToast();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const fileRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles')
        .select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
      if (!profile?.tenant_id && !isGod) return;
      if (profile?.tenant_id) setTenantId(profile.tenant_id);
      const tid = profile?.tenant_id;

      const empQ = (() => { let q = supabase.from('profiles').select('id, nip, full_name, position'); if (tid) q = q.eq('tenant_id', tid); return q; })();
      const shiftQ = (() => { let q = supabase.from('master_shifts').select('id, shift_code, shift_name'); if (tid) q = q.eq('tenant_id', tid); return q; })();
      const projQ = (() => { let q = supabase.from('projects').select('id, name'); if (tid) q = q.eq('tenant_id', tid); return q; })();
      const divQ = (() => { let q = supabase.from('divisions').select('id, name, project_id'); if (tid) q = q.eq('tenant_id', tid); return q; })();
      const [empData, shiftData, projData, divData] = await Promise.all([empQ, shiftQ, projQ, divQ]);
      if (empData.data) setExistingEmp(empData.data);
      if (shiftData.data) setShifts(shiftData.data);
      if (projData.data) setExistingProjects(projData.data);
      if (divData.data) setExistingDivisions(divData.data);
    };
    init();
  }, []);

  const generateTemplate = () => {
    const totalDays = daysInMonth(selectedMonth, selectedYear);
    const headers = ['NIK', 'Nama', 'Jabatan', 'Project', 'Divisi', 'Mode'];
    for (let i = 1; i <= totalDays; i++) headers.push(`Tgl_${i}`);

    const example = [
      headers.join(','),
      ['701083', 'Budi Santoso', 'Security Guard', 'KEMENDAG-CIRACAS', 'Security', 'WFO', ...Array(totalDays).fill('OFF')].join(','),
      ['701084', 'Siti Rahma', 'Staff', 'KEMENDAG-PUSAT', 'Administrasi', 'WFH', ...Array(totalDays).fill('OFF')].join(','),
    ];

    const csv = example.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Template_Jadwal_${selectedMonth}_${selectedYear}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) { toast('CSV minimal 2 baris.', 'error'); return; }

        const headers = parseCSVLine(lines[0]);
        // Expected format: NIK, Nama, Jabatan, Project, Divisi, Mode, Tgl_1, Tgl_2, ...
        const modeColIdx = 5;
        const dateLabels = headers.slice(6);

        const rows = [];
        for (let i = 1; i < lines.length; i++) {
          const cells = parseCSVLine(lines[i]);
          if (cells.length < 7) continue;
          const schedules = [];
          for (let j = 6; j < cells.length && j - 6 < dateLabels.length; j++) {
            if (cells[j]) schedules.push({ day: dateLabels[j - 6], code: cells[j].toUpperCase() });
          }
          const rawMode = (cells[modeColIdx] || '').toUpperCase();
          const validModes = ['WFO','WFH','WFA'];
          rows.push({
            nik: cells[0],
            nama: cells[1],
            jabatan: cells[2],
            projectName: cells[3] || '',
            divisionName: cells[4] || '',
            workMode: validModes.includes(rawMode) ? rawMode : 'WFO',
            schedules
          });
        }

        setPreview({ headers: dateLabels, rows });
        setStep('parsed');
      } catch (err) {
        toast('Gagal parse CSV: ' + err.message, 'error');
      }
    };
    reader.readAsText(f);
  };

  const getDateFromDay = (dayLabel) => {
    const num = parseInt(dayLabel.replace(/^Tgl_/i, ''));
    if (isNaN(num)) return null;
    return `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(num).padStart(2, '0')}`;
  };

  const ensureProject = async (name) => {
    if (!name || !tenantId) return null;
    const existing = existingProjects.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing.id;
    const { data } = await supabase.from('projects').insert({
      tenant_id: tenantId, name, latitude: 0, longitude: 0, radius: 50
    }).select('id').single();
    if (data) { existingProjects.push(data); return data.id; }
    return null;
  };

  const ensureDivision = async (name, projId) => {
    if (!name || !projId) return null;
    const existing = existingDivisions.find(d => d.name.toLowerCase() === name.toLowerCase() && d.project_id === projId);
    if (existing) return existing.id;
    const { data } = await supabase.from('divisions').insert({
      tenant_id: tenantId, project_id: projId, name
    }).select('id').single();
    if (data) { existingDivisions.push(data); return data.id; }
    return null;
  };

  const executeImport = async () => {
    setIsProcessing(true);
    const shiftByCode = {};
    shifts.forEach(s => { shiftByCode[s.shift_code.toUpperCase()] = s; });

    const stats = { created: 0, updated: 0, assigned: 0, inserted: 0, errors: [] };

    for (const row of preview.rows) {
      try {
        let emp = existingEmp.find(e => e.nip === row.nik);

        if (!emp) {
          const { data: newEmp, error: createErr } = await supabase
            .from('profiles').insert([{
              tenant_id: tenantId, nip: row.nik,
              full_name: row.nama, position: row.jabatan,
              role: 'EMPLOYEE', attendance_access: true
            }]).select('id, nip, full_name, position').single();
          if (createErr) throw new Error(`Gagal buat profile: ${createErr.message}`);
          emp = newEmp; existingEmp.push(newEmp); stats.created++;
        } else {
          const updates = {};
          if (row.nama && row.nama !== emp.full_name) updates.full_name = row.nama;
          if (row.jabatan && row.jabatan !== emp.position) updates.position = row.jabatan;
          if (Object.keys(updates).length > 0) {
            const { error: updErr } = await supabase.from('profiles').update(updates).eq('id', emp.id);
            if (updErr) throw new Error(`Gagal update ${row.nik}: ${updErr.message}`);
            Object.assign(emp, updates); stats.updated++;
          }
        }

        // Assign project & division
        let projId = row.projectName ? await ensureProject(row.projectName) : null;
        let divId = (projId && row.divisionName) ? await ensureDivision(row.divisionName, projId) : null;
        if (projId || divId) {
          const upd = {};
          if (projId) upd.project_id = projId;
          if (divId) upd.division_id = divId;
          await supabase.from('profiles').update(upd).eq('id', emp.id);
          stats.assigned++;
        }

        // Insert schedules
        const toUpsert = [];
        for (const s of row.schedules) {
          const date = getDateFromDay(s.day);
          if (!date) { stats.errors.push(`${row.nik}: format tanggal salah (${s.day})`); continue; }
          const shift = shiftByCode[s.code];
          if (!shift) { stats.errors.push(`${row.nik} - ${date}: kode shift "${s.code}" tidak dikenal`); continue; }
          toUpsert.push({ tenant_id: tenantId, user_id: emp.id, shift_id: shift.id, date, work_mode: row.workMode });
        }
        if (toUpsert.length > 0) {
          for (let i = 0; i < toUpsert.length; i += 100) {
            await supabase.from('user_schedules').upsert(toUpsert.slice(i, i + 100), { onConflict: 'user_id,date' });
          }
          stats.inserted += toUpsert.length;
        }
      } catch (e) {
        stats.errors.push(`${row.nik}: ${e.message}`);
      }
    }

    setResults(stats);
    setStep('done');
    setIsProcessing(false);
  };

  const reset = () => {
    setStep('idle');
    setPreview(null);
    setResults(null);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-serif font-bold text-white tracking-wide flex items-center gap-2">
            <CalendarDays className="text-[var(--aurora-1)]" /> Upload Jadwal Bulanan
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Upload CSV. NIK baru akan otomatis dibuatkan profile + jadwal. Data <strong>Nama</strong> & <strong>Jabatan</strong> tersinkron ke profil pegawai.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-panel p-6 border border-white/5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <CalendarDays size={16} className="text-[var(--aurora-3)]" /> Periode Jadwal
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block mb-2">Bulan</label>
                <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}
                  className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-3 py-3 text-white text-sm outline-none focus:border-[var(--aurora-1)]">
                  {Array.from({length:12}, (_,i) => (
                    <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('id', {month:'long'})}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block mb-2">Tahun</label>
                <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
                  className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-3 py-3 text-white text-sm outline-none focus:border-[var(--aurora-1)]">
                  {[2024,2025,2026,2027,2028].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-4 text-[10px] text-gray-500">{daysInMonth(selectedMonth, selectedYear)} hari</div>
          </div>

          <div className="glass-panel p-6 border border-[var(--success)]/20 bg-[var(--success)]/5">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-[var(--success)]" /> Template CSV
            </h3>
            <p className="text-[10px] text-gray-400 mb-3">
              Format: <code className="text-[var(--success)]">NIK, Nama, Jabatan, Project, Divisi, Mode, Tgl_1, Tgl_2, ...</code>
            </p>
            <p className="text-[9px] text-gray-500 mb-3">
              NIK baru <strong className="text-[var(--aurora-3)]">auto-create profile</strong> + jadwal langsung masuk. Mode: WFO/WFH/WFA.</p>
            <button onClick={generateTemplate}
              className="w-full py-3 rounded-xl bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/30 hover:bg-[var(--success)] hover:text-black text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
              <Download size={14} /> Download Template
            </button>
          </div>

          <div className="glass-panel p-6 border border-white/5">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Users size={16} className="text-[var(--aurora-1)]" /> Referensi
            </h3>
            <p className="text-[10px] text-gray-400 mb-1">{existingEmp.length} pegawai existing</p>
            <p className="text-[10px] text-gray-400 mb-3">{shifts.length} kode shift</p>
            <div className="flex flex-wrap gap-1.5">
              {shifts.slice(0, 8).map(s => (
                <span key={s.id} className="px-2 py-0.5 bg-white/5 rounded text-[9px] font-mono text-gray-400 border border-white/5">
                  {s.shift_code}
                </span>
              ))}
              {shifts.length > 8 && <span className="text-[9px] text-gray-600">+{shifts.length - 8}</span>}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {step === 'idle' && (
            <div className="glass-panel p-10 border border-dashed border-white/10 hover:border-[var(--aurora-1)]/50 transition-all text-center"
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { handleFile({ target: { files: [f] } }); } }}>
              <Upload size={48} className="mx-auto text-gray-600 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Upload File CSV</h3>
              <p className="text-sm text-gray-400 mb-1">Drag & drop atau klik untuk pilih</p>
              <p className="text-[10px] text-gray-600 mb-6">Format: NIK, Nama, Jabatan, Project, Divisi, Mode, Tgl_1, Tgl_2, ...</p>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
              <button onClick={() => fileRef.current?.click()}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[var(--aurora-1)] to-[#1E90FF] text-white font-bold tracking-widest hover:opacity-90 transition-all">
                Pilih File CSV
              </button>
            </div>
          )}

          {step === 'parsed' && preview && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="glass-panel p-6 border border-[var(--success)]/30">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <CheckCircle2 size={20} className="text-[var(--success)]" /> Preview Data
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">{preview.rows.length} karyawan • {preview.headers.length} hari</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={reset} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-400 text-xs hover:text-white transition-colors flex items-center gap-1 whitespace-nowrap">
                      <X size={14} /> Batal
                    </button>
                    <button onClick={executeImport} disabled={isProcessing}
                      className="px-6 py-2 rounded-xl bg-gradient-to-r from-[var(--success)] to-emerald-500 text-white text-xs font-bold tracking-widest hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50 shadow-[0_0_20px_rgba(0,255,135,0.2)]">
                      {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      {isProcessing ? 'Memproses...' : 'Mulai Injeksi'}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto border border-white/10 rounded-xl max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/5 text-gray-400 uppercase tracking-widest sticky top-0">
                      <tr>
                        <th className="p-3 font-semibold text-white">NIK</th>
                        <th className="p-3 font-semibold text-[var(--aurora-3)]">Nama</th>
                        <th className="p-3 font-semibold text-[var(--aurora-1)]">Jabatan</th>
                        <th className="p-3 font-semibold">Mode</th>
                        <th className="p-3 font-semibold">Status</th>
                        {preview.headers.slice(0, 8).map(h => (
                          <th key={h} className="p-3 font-semibold whitespace-nowrap">{h}</th>
                        ))}
                        {preview.headers.length > 8 && <th className="p-3 text-gray-600">...</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {preview.rows.slice(0, 15).map((row, i) => {
                        const exists = existingEmp.find(e => e.nip === row.nik);
                        return (
                          <tr key={i} className="hover:bg-white/5">
                            <td className="p-3 font-mono text-white whitespace-nowrap">{row.nik}</td>
                            <td className="p-3 text-white font-medium">{row.nama}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-[var(--aurora-1)]/10 text-[var(--aurora-1)] text-[10px]">{row.jabatan || '-'}</span>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                row.workMode === 'WFH' ? 'bg-green-500/20 text-green-400' : 
                                row.workMode === 'WFA' ? 'bg-yellow-500/20 text-yellow-400' : 
                                'bg-blue-500/20 text-blue-400'
                              }`}>{row.workMode}</span>
                            </td>
                            <td className="p-3">
                              {exists ? (
                                <span className="text-[10px] text-[var(--aurora-3)] flex items-center gap-1">
                                  <CheckCircle2 size={10} /> Update
                                </span>
                              ) : (
                                <span className="text-[10px] text-[var(--warning)] flex items-center gap-1">
                                  <UserPlus size={10} /> Baru
                                </span>
                              )}
                            </td>
                            {row.schedules.slice(0, 8).map((s, j) => (
                              <td key={j} className="p-3 font-mono">
                                <span className={`px-1.5 py-0.5 rounded ${
                                  s.code === 'OFF' ? 'text-gray-600' : 
                                  s.code.includes('M') ? 'text-[var(--aurora-3)] bg-[var(--aurora-3)]/10' : 
                                  'text-white bg-white/10'
                                }`}>{s.code}</span>
                              </td>
                            ))}
                            {row.schedules.length > 8 && <td className="p-3 text-gray-600">...</td>}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {(preview.rows.length > 15 || preview.headers.length > 8) && (
                  <p className="text-[10px] text-gray-500 mt-2">Menampilkan sebagian. Total: {preview.rows.length} baris × {preview.headers.length} hari</p>
                )}
              </div>
            </motion.div>
          )}

          {step === 'done' && results && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
              <div className={`glass-panel p-8 border ${results.errors.length === 0 ? 'border-[var(--success)]/30' : 'border-[var(--warning)]/30'}`}>
                <div className="text-center mb-6">
                  {results.errors.length === 0
                    ? <CheckCircle2 size={48} className="mx-auto text-[var(--success)] mb-3" />
                    : <AlertCircle size={48} className="mx-auto text-[var(--warning)] mb-3" />}
                  <h3 className="text-xl font-bold text-white">Injeksi Selesai</h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <div className="bg-[var(--success)]/10 rounded-xl p-4 text-center border border-[var(--success)]/20">
                    <p className="text-2xl font-bold text-[var(--success)]">{results.inserted}</p>
                    <p className="text-[9px] text-gray-400 uppercase tracking-widest mt-1">Jadwal</p>
                  </div>
                  <div className="bg-[var(--aurora-1)]/10 rounded-xl p-4 text-center border border-[var(--aurora-1)]/20">
                    <p className="text-2xl font-bold text-[var(--aurora-1)]">{results.updated}</p>
                    <p className="text-[9px] text-gray-400 uppercase tracking-widest mt-1">Update</p>
                  </div>
                  <div className="bg-[var(--warning)]/10 rounded-xl p-4 text-center border border-[var(--warning)]/20">
                    <p className="text-2xl font-bold text-[var(--warning)]">{results.created}</p>
                    <p className="text-[9px] text-gray-400 uppercase tracking-widest mt-1">Profil Baru</p>
                  </div>
                  <div className="bg-[var(--danger)]/10 rounded-xl p-4 text-center border border-[var(--danger)]/20">
                    <p className="text-2xl font-bold text-[var(--danger)]">{results.errors.length}</p>
                    <p className="text-[9px] text-gray-400 uppercase tracking-widest mt-1">Error</p>
                  </div>
                </div>

                {results.errors.length > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-1 mb-4">
                    {results.errors.slice(0, 20).map((err, i) => (
                      <div key={i} className="text-[11px] text-[var(--danger)] bg-[var(--danger)]/5 px-3 py-1.5 rounded-lg border border-[var(--danger)]/10">{err}</div>
                    ))}
                    {results.errors.length > 20 && <p className="text-[10px] text-gray-500">...dan {results.errors.length - 20} error lainnya</p>}
                  </div>
                )}

                <button onClick={reset}
                  className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold tracking-widest hover:bg-white/10 transition-all">
                  Upload Lagi
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleUpload;
