/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, CalendarDays, Users, RefreshCw, CheckCircle2, X, ChevronDown,
  Play, AlertCircle, Settings2, Repeat, ArrowRight, Loader2, Info, Shuffle
} from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { useConfirm } from '../../../components/ConfirmDialog';

/**
 * AutoShift Component — Automatic Shift Assignment Engine
 * 
 * Features:
 * - Generate jadwal shift untuk seluruh / grup karyawan
 * - Pola: Repeating (berulang), Rotating (rotasi bergilir), Fixed (tetap)
 * - Range tanggal fleksibel (hari ini + N hari)
 * - Preview sebelum submit
 * - Batch insert ke user_schedules
 * - Skip hari libur (Sabtu/Minggu jika dikonfigurasi)
 * - Overwrite existing atau skip jika sudah ada jadwal
 */

const DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const dateRange = (startDate, days) => {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });
};

const AutoShift = () => {
  const toast = useToast();
  const confirm = useConfirm();

  // Data
  const [tenantId, setTenantId] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Config
  const [selectedEmployees, setSelectedEmployees] = useState('ALL'); // 'ALL' or 'DIVISION' or 'CUSTOM'
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedCustomEmps, setSelectedCustomEmps] = useState([]);
  const [pattern, setPattern] = useState('FIXED'); // FIXED | REPEATING | ROTATING
  const [fixedShiftId, setFixedShiftId] = useState('');
  const [repeatingShifts, setRepeatingShifts] = useState([]); // [shiftId, ...]
  const [rotatingAssignments, setRotatingAssignments] = useState([]); // [{empId, shiftId}]
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [durationDays, setDurationDays] = useState(7);
  const [skipWeekends, setSkipWeekends] = useState(false);
  const [overwrite, setOverwrite] = useState(false);

  // Preview & Progress
  const [preview, setPreview] = useState(null); // [{userId, date, shiftId, shiftCode, empName}]
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles')
        .select('tenant_id').eq('auth_id', session.user.id).maybeSingle();

      const tid = profile?.tenant_id;
      if (tid) setTenantId(tid);

      // Fetch employees
      let empQ = supabase.from('profiles').select('id, full_name, nip, position, division_id, divisions(name)')
        .in('role', ['EMPLOYEE', 'SUB_ADMIN']);
      if (tid) empQ = empQ.eq('tenant_id', tid);
      const { data: emps } = await empQ;
      setEmployees(emps || []);

      // Fetch shifts
      let shiftQ = supabase.from('master_shifts').select('id, shift_code, shift_name, time_in, time_out, is_cross_day')
        .eq('is_active', true);
      if (tid) shiftQ = shiftQ.eq('tenant_id', tid);
      const { data: sData } = await shiftQ;
      setShifts(sData || []);
      if (sData?.length > 0) {
        setFixedShiftId(sData[0].id);
        setRepeatingShifts([sData[0].id]);
      }

      // Fetch divisions
      let divQ = supabase.from('divisions').select('id, name');
      if (tid) divQ = divQ.eq('tenant_id', tid);
      const { data: divData } = await divQ;
      setDivisions(divData || []);
    } catch (e) {
      console.error('AutoShift fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Get the list of employees to schedule
  const getTargetEmployees = useCallback(() => {
    if (selectedEmployees === 'ALL') return employees;
    if (selectedEmployees === 'DIVISION') {
      return employees.filter(e => e.division_id === selectedDivision);
    }
    if (selectedEmployees === 'CUSTOM') {
      return employees.filter(e => selectedCustomEmps.includes(e.id));
    }
    return employees;
  }, [employees, selectedEmployees, selectedDivision, selectedCustomEmps]);

  const getShiftById = (id) => shifts.find(s => s.id === id);

  // Generate preview rows
  const generatePreview = () => {
    setGenerating(true);
    try {
      const targetEmps = getTargetEmployees();
      const dates = dateRange(startDate, durationDays).filter(d => {
        if (!skipWeekends) return true;
        const dow = new Date(d).getDay();
        return dow !== 0 && dow !== 6;
      });

      const rows = [];

      targetEmps.forEach((emp, empIdx) => {
        dates.forEach((date, dateIdx) => {
          let shiftId;

          if (pattern === 'FIXED') {
            shiftId = fixedShiftId;
          } else if (pattern === 'REPEATING') {
            // Cycle through the repeatingShifts array by day index
            shiftId = repeatingShifts[dateIdx % repeatingShifts.length];
          } else if (pattern === 'ROTATING') {
            // Each employee gets a different shift, rotating by empIdx + dateIdx
            const assignment = rotatingAssignments[empIdx % rotatingAssignments.length];
            shiftId = assignment?.shiftId || fixedShiftId;
          }

          const shift = getShiftById(shiftId);
          if (!shift) return;

          rows.push({
            userId: emp.id,
            empName: emp.full_name || emp.nip,
            date,
            shiftId,
            shiftCode: shift.shift_code,
            shiftName: shift.shift_name,
            timeIn: shift.time_in,
            timeOut: shift.time_out,
          });
        });
      });

      setPreview(rows);
      setShowPreview(true);
    } catch (e) {
      toast('Gagal membuat preview: ' + e.message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  // Save preview to Supabase
  const handleSave = async () => {
    if (!preview?.length) return;

    const ok = await confirm(
      `Akan menyimpan ${preview.length} jadwal shift ke database. ${overwrite ? 'Jadwal yang sudah ada akan ditimpa.' : 'Jadwal yang sudah ada akan dilewati.'}`,
      'Konfirmasi Generate Jadwal'
    );
    if (!ok) return;

    setSaving(true);
    setSaveProgress(0);

    const BATCH_SIZE = 50;
    let saved = 0;
    let skipped = 0;
    let failed = 0;

    // Process in batches
    for (let i = 0; i < preview.length; i += BATCH_SIZE) {
      const batch = preview.slice(i, i + BATCH_SIZE);
      const payload = batch.map(row => ({
        user_id: row.userId,
        tenant_id: tenantId,
        shift_id: row.shiftId,
        date: row.date,
        updated_at: new Date().toISOString(),
      }));

      try {
        if (overwrite) {
          const { error } = await supabase.from('user_schedules').upsert(payload, { onConflict: 'user_id,date' });
          if (error) throw error;
          saved += batch.length;
        } else {
          // Insert and ignore conflicts
          const { error, data } = await supabase.from('user_schedules').insert(payload);
          if (error && error.code !== '23505') throw error; // 23505 = unique violation = skip
          saved += batch.length;
        }
      } catch (e) {
        failed += batch.length;
        console.error('Batch save error:', e);
      }

      setSaveProgress(Math.round(((i + BATCH_SIZE) / preview.length) * 100));
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 50));
    }

    setSaving(false);
    setSaveProgress(0);

    if (failed === 0) {
      toast(`✅ Berhasil menyimpan ${saved} jadwal shift!`, 'success');
    } else {
      toast(`Tersimpan ${saved}, gagal ${failed}. Periksa koneksi.`, 'error');
    }

    setShowPreview(false);
    setPreview(null);
  };

  const toggleCustomEmp = (id) => {
    setSelectedCustomEmps(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const addRepeatingShift = () => {
    if (shifts.length === 0) return;
    setRepeatingShifts(prev => [...prev, shifts[0].id]);
  };

  const removeRepeatingShift = (idx) => {
    setRepeatingShifts(prev => prev.filter((_, i) => i !== idx));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 size={32} className="animate-spin text-[var(--aurora-3)]" />
      </div>
    );
  }

  const targetEmps = getTargetEmployees();

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-serif font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center">
              <Zap size={20} className="text-white" />
            </div>
            Auto-Shift Generator
          </h2>
          <p className="text-gray-400 text-sm mt-1 ml-[52px]">
            Generate jadwal shift massal untuk {employees.length} karyawan secara otomatis
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--aurora-1)]/10 border border-[var(--aurora-1)]/20 rounded-full">
          <Users size={14} className="text-[var(--aurora-1)]" />
          <span className="text-xs font-bold text-[var(--aurora-1)]">{targetEmps.length} karyawan dipilih</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* === LEFT CONFIG PANEL === */}
        <div className="lg:col-span-2 space-y-4">

          {/* 1. Target Karyawan */}
          <div className="glass-panel p-5 border border-white/5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users size={16} className="text-[var(--aurora-3)]" /> Target Karyawan
            </h3>
            <div className="space-y-2">
              {[
                { value: 'ALL', label: `Semua Karyawan (${employees.length})` },
                { value: 'DIVISION', label: 'Berdasarkan Divisi' },
                { value: 'CUSTOM', label: 'Pilih Manual' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedEmployees(opt.value)}
                  className={`w-full p-3 rounded-xl border text-left text-sm font-medium transition-all flex items-center gap-3 ${selectedEmployees === opt.value
                    ? 'bg-[var(--aurora-3)]/10 border-[var(--aurora-3)]/40 text-[var(--aurora-3)]'
                    : 'bg-white/3 border-white/10 text-gray-400 hover:border-white/20'}`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedEmployees === opt.value ? 'border-[var(--aurora-3)] bg-[var(--aurora-3)]' : 'border-gray-600'}`}>
                    {selectedEmployees === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                  </div>
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Division Selector */}
            <AnimatePresence>
              {selectedEmployees === 'DIVISION' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                  <select
                    value={selectedDivision}
                    onChange={e => setSelectedDivision(e.target.value)}
                    className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-3)]"
                  >
                    <option value="">-- Pilih Divisi --</option>
                    {divisions.map(d => <option key={d.id} value={d.id} className="bg-[#0B0C10]">{d.name}</option>)}
                  </select>
                </motion.div>
              )}

              {selectedEmployees === 'CUSTOM' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                  {employees.map(emp => (
                    <button
                      key={emp.id}
                      onClick={() => toggleCustomEmp(emp.id)}
                      className={`w-full p-2.5 rounded-lg border text-left text-xs flex items-center gap-2 transition-all ${selectedCustomEmps.includes(emp.id)
                        ? 'bg-[var(--aurora-3)]/10 border-[var(--aurora-3)]/30 text-[var(--aurora-3)]'
                        : 'bg-white/3 border-white/5 text-gray-400 hover:border-white/15'}`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selectedCustomEmps.includes(emp.id) ? 'bg-[var(--aurora-3)] border-[var(--aurora-3)]' : 'border-gray-600'}`}>
                        {selectedCustomEmps.includes(emp.id) && <CheckCircle2 size={10} className="text-black" />}
                      </div>
                      <span className="font-semibold text-white">{emp.full_name}</span>
                      <span className="text-gray-600 ml-auto">{emp.nip}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 2. Rentang Tanggal */}
          <div className="glass-panel p-5 border border-white/5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CalendarDays size={16} className="text-[var(--aurora-1)]" /> Rentang Tanggal
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1.5">Mulai Dari</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[var(--aurora-1)]"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1.5">Durasi (Hari)</label>
                <input
                  type="number"
                  value={durationDays}
                  min={1}
                  max={365}
                  onChange={e => setDurationDays(Math.max(1, Math.min(365, parseInt(e.target.value) || 1)))}
                  className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[var(--aurora-1)]"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {[7, 14, 30].map(d => (
                <button
                  key={d}
                  onClick={() => setDurationDays(d)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${durationDays === d ? 'bg-[var(--aurora-1)]/20 border-[var(--aurora-1)]/40 text-[var(--aurora-1)]' : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'}`}
                >
                  {d === 7 ? '1 Minggu' : d === 14 ? '2 Minggu' : '1 Bulan'}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
              <p className="text-xs text-white font-medium">Skip Sabtu & Minggu</p>
              <button
                onClick={() => setSkipWeekends(!skipWeekends)}
                className={`w-10 h-5 rounded-full transition-all relative ${skipWeekends ? 'bg-[var(--aurora-3)]' : 'bg-gray-700'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${skipWeekends ? 'left-5.5' : 'left-0.5'}`} />
              </button>
            </div>
          </div>

          {/* 3. Overwrite */}
          <div className="flex items-center justify-between p-4 glass-panel border border-white/5 rounded-2xl">
            <div>
              <p className="text-sm font-bold text-white">Timpa Jadwal Existing</p>
              <p className="text-[9px] text-gray-500 mt-0.5">Jika OFF, jadwal yang sudah ada akan dilewati</p>
            </div>
            <button
              onClick={() => setOverwrite(!overwrite)}
              className={`w-10 h-5 rounded-full transition-all relative ${overwrite ? 'bg-[var(--danger)]' : 'bg-gray-700'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${overwrite ? 'left-5.5' : 'left-0.5'}`} />
            </button>
          </div>
        </div>

        {/* === RIGHT PATTERN PANEL === */}
        <div className="lg:col-span-3 space-y-4">

          {/* Pattern Selector */}
          <div className="glass-panel p-5 border border-white/5 rounded-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <Settings2 size={16} className="text-[var(--aurora-3)]" /> Pola Penjadwalan
            </h3>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { value: 'FIXED', icon: <CalendarDays size={18} />, label: 'Fixed', desc: '1 shift untuk semua hari' },
                { value: 'REPEATING', icon: <Repeat size={18} />, label: 'Berulang', desc: 'Urutan shift berputar' },
                { value: 'ROTATING', icon: <Shuffle size={18} />, label: 'Rotasi', desc: 'Beda shift per karyawan' },
              ].map(p => (
                <button
                  key={p.value}
                  onClick={() => setPattern(p.value)}
                  className={`p-4 rounded-2xl border text-left transition-all ${pattern === p.value
                    ? 'bg-[var(--aurora-1)]/15 border-[var(--aurora-1)]/40'
                    : 'bg-white/3 border-white/10 hover:border-white/20'}`}
                >
                  <div className={`mb-2 ${pattern === p.value ? 'text-[var(--aurora-1)]' : 'text-gray-500'}`}>{p.icon}</div>
                  <p className={`text-xs font-bold ${pattern === p.value ? 'text-[var(--aurora-1)]' : 'text-white'}`}>{p.label}</p>
                  <p className="text-[9px] text-gray-500 mt-0.5">{p.desc}</p>
                </button>
              ))}
            </div>

            {/* FIXED */}
            {pattern === 'FIXED' && (
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block mb-2">Shift Tetap</label>
                <select
                  value={fixedShiftId}
                  onChange={e => setFixedShiftId(e.target.value)}
                  className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-1)]"
                >
                  {shifts.map(s => (
                    <option key={s.id} value={s.id} className="bg-[#0B0C10]">
                      [{s.shift_code}] {s.shift_name} {s.time_in ? `(${s.time_in.slice(0, 5)} - ${s.time_out.slice(0, 5)})` : '(OFF)'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* REPEATING */}
            {pattern === 'REPEATING' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Urutan Shift (Hari 1, 2, 3 ...)</label>
                  <button onClick={addRepeatingShift} className="text-[10px] text-[var(--aurora-3)] font-bold flex items-center gap-1 hover:text-white transition-colors">
                    + Tambah Hari
                  </button>
                </div>
                {repeatingShifts.map((sId, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 w-16 font-mono">Hari {(idx % 7) + 1} {DAYS_ID[(idx) % 7]}:</span>
                    <select
                      value={sId}
                      onChange={e => {
                        const updated = [...repeatingShifts];
                        updated[idx] = e.target.value;
                        setRepeatingShifts(updated);
                      }}
                      className="flex-1 bg-[#0B0C10] border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[var(--aurora-3)]"
                    >
                      {shifts.map(s => <option key={s.id} value={s.id} className="bg-[#0B0C10]">[{s.shift_code}] {s.shift_name}</option>)}
                    </select>
                    {repeatingShifts.length > 1 && (
                      <button onClick={() => removeRepeatingShift(idx)} className="text-[var(--danger)] hover:opacity-70 p-1">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <p className="text-[9px] text-gray-600 flex items-center gap-1">
                  <Info size={10} />
                  Setelah {repeatingShifts.length} hari, pola akan berulang dari awal
                </p>
              </div>
            )}

            {/* ROTATING */}
            {pattern === 'ROTATING' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Assign Shift per Karyawan</label>
                  <button
                    onClick={() => {
                      const emps = getTargetEmployees();
                      setRotatingAssignments(emps.map((e, i) => ({ empId: e.id, empName: e.full_name, shiftId: shifts[i % shifts.length]?.id })));
                    }}
                    className="text-[10px] text-[var(--aurora-3)] font-bold hover:text-white transition-colors flex items-center gap-1"
                  >
                    <Zap size={10} /> Auto-distribute
                  </button>
                </div>
                {rotatingAssignments.length === 0 && (
                  <div className="p-4 bg-white/3 rounded-xl border border-white/5 text-center">
                    <p className="text-xs text-gray-500">Klik "Auto-distribute" untuk assign shift otomatis ke setiap karyawan</p>
                  </div>
                )}
                <div className="max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
                  {rotatingAssignments.map((a, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 flex-1 truncate">{a.empName || 'Karyawan'}</span>
                      <ArrowRight size={10} className="text-gray-600 flex-shrink-0" />
                      <select
                        value={a.shiftId || ''}
                        onChange={e => {
                          const updated = [...rotatingAssignments];
                          updated[idx] = { ...updated[idx], shiftId: e.target.value };
                          setRotatingAssignments(updated);
                        }}
                        className="bg-[#0B0C10] border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs outline-none focus:border-[var(--aurora-3)]"
                      >
                        {shifts.map(s => <option key={s.id} value={s.id} className="bg-[#0B0C10]">[{s.shift_code}] {s.shift_name}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Summary Info */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Karyawan', value: targetEmps.length, color: 'var(--aurora-3)' },
              { label: 'Durasi', value: `${durationDays} hari`, color: 'var(--aurora-1)' },
              { label: 'Est. Baris', value: targetEmps.length * durationDays, color: 'var(--success)' },
            ].map(item => (
              <div key={item.label} className="glass-panel p-4 rounded-2xl border border-white/5 text-center">
                <p className="text-xl font-black" style={{ color: item.color }}>{item.value}</p>
                <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mt-1">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Generate Button */}
          <button
            id="auto-shift-generate-btn"
            onClick={generatePreview}
            disabled={generating || targetEmps.length === 0 || shifts.length === 0}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shadow-[0_0_30px_rgba(142,45,226,0.3)]"
          >
            {generating ? <><Loader2 size={18} className="animate-spin" /> Generating...</> : <><Play size={18} /> Generate Preview Jadwal</>}
          </button>

          {shifts.length === 0 && (
            <div className="flex items-center gap-2 p-3 bg-[var(--warning)]/10 border border-[var(--warning)]/20 rounded-xl">
              <AlertCircle size={14} className="text-[var(--warning)] flex-shrink-0" />
              <p className="text-[10px] text-[var(--warning)]">Belum ada master shift. Buat shift terlebih dahulu di menu Kamus Shift.</p>
            </div>
          )}
        </div>
      </div>

      {/* === PREVIEW MODAL === */}
      <AnimatePresence>
        {showPreview && preview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="w-full max-w-2xl glass-panel rounded-3xl overflow-hidden border border-white/10 flex flex-col max-h-[85vh]"
            >
              {/* Preview Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between flex-shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-white">Preview Jadwal</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{preview.length} baris akan disimpan</p>
                </div>
                <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all">
                  <X size={20} />
                </button>
              </div>

              {/* Preview Table */}
              <div className="overflow-y-auto flex-1 custom-scrollbar">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-[#0B0C10]/95 backdrop-blur-sm border-b border-white/10">
                    <tr>
                      {['Karyawan', 'Tanggal', 'Hari', 'Shift', 'Jam'].map(h => (
                        <th key={h} className="p-3 text-left text-[9px] uppercase tracking-widest font-bold text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {preview.slice(0, 200).map((row, i) => (
                      <tr key={i} className="hover:bg-white/3 transition-colors">
                        <td className="p-3 font-medium text-white truncate max-w-[120px]">{row.empName}</td>
                        <td className="p-3 font-mono text-gray-300">{row.date}</td>
                        <td className="p-3 text-gray-400">{DAYS_ID[new Date(row.date + 'T00:00:00').getDay()]}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold"
                            style={{ background: `${['#8E2DE2', '#00C9FF', '#FFD700', '#FF0055'][i % 4]}20`, color: ['#8E2DE2', '#00C9FF', '#FFD700', '#FF0055'][i % 4] }}>
                            {row.shiftCode}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-gray-400 text-[10px]">
                          {row.timeIn ? `${row.timeIn.slice(0, 5)} - ${row.timeOut?.slice(0, 5)}` : 'OFF'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 200 && (
                  <div className="p-4 text-center text-xs text-gray-500">
                    ... dan {preview.length - 200} baris lainnya (semua akan disimpan)
                  </div>
                )}
              </div>

              {/* Save Button */}
              <div className="p-5 border-t border-white/10 flex gap-3 flex-shrink-0">
                <button
                  onClick={() => setShowPreview(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 font-bold text-sm hover:border-white/20 transition-all"
                >
                  Batal
                </button>
                <button
                  id="auto-shift-save-btn"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Menyimpan {saveProgress}%...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      Simpan {preview.length} Jadwal
                    </>
                  )}
                </button>
              </div>

              {/* Progress bar */}
              {saving && (
                <div className="h-1 bg-white/5 flex-shrink-0">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)]"
                    animate={{ width: `${saveProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AutoShift;
