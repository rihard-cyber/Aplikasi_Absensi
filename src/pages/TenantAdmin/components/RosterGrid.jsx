import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, Save, Loader2, Search, Download, Upload, FileSpreadsheet, Users, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { logAudit } from '../../../utils/auditLogger';
import { useConfirm } from '../../../components/ConfirmDialog';

const t = (s) => s;
const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const SHIFT_COLORS = {
  P: { label: 'Pagi', jam: '06:00-14:00', color: '#3b82f6', bg: 'rgba(59,130,246,0.2)' },
  S: { label: 'Siang', jam: '14:00-22:00', color: '#f59e0b', bg: 'rgba(245,158,11,0.2)' },
  M: { label: 'Malam', jam: '22:00-06:00', color: '#8b5cf6', bg: 'rgba(139,92,246,0.2)' },
  X: { label: 'Libur', jam: '-', color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
};

const RosterGrid = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const [tenantId, setTenantId] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [showShiftPicker, setShowShiftPicker] = useState(null);

  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const yearMonth = `${year}-${String(month + 1).padStart(2, '0')}`;

  useEffect(() => { fetchData(); }, [year, month, tenantId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
      const tid = profile?.tenant_id;
      if (!tid) return;
      setTenantId(tid);

      const [eRes, sRes, schRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, nip, position, division_id').eq('tenant_id', tid).in('role', ['EMPLOYEE', 'SUB_ADMIN']).order('full_name'),
        supabase.from('master_shifts').select('*').eq('tenant_id', tid).eq('is_active', true).order('shift_code'),
        supabase.from('user_schedules').select('*, master_shifts!inner(shift_code, shift_name, time_in, time_out)').eq('tenant_id', tid)
          .gte('date', `${yearMonth}-01`).lte('date', `${yearMonth}-${daysInMonth}`)
      ]);
      setEmployees(eRes.data || []);
      setShifts(sRes.data || []);
      setSchedules(schRes.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const filteredEmployees = useMemo(() => {
    if (!search) return employees;
    const q = search.toLowerCase();
    return employees.filter(e => e.full_name?.toLowerCase().includes(q) || e.nip?.toLowerCase().includes(q));
  }, [employees, search]);

  const getShiftForDay = (empId, day) => {
    const dateStr = `${yearMonth}-${String(day).padStart(2, '0')}`;
    const sched = schedules.find(s => s.user_id === empId && s.date === dateStr);
    return sched?.master_shifts || null;
  };

  const setShiftForDay = async (empId, day, shiftCode) => {
    const dateStr = `${yearMonth}-${String(day).padStart(2, '0')}`;
    const existing = schedules.find(s => s.user_id === empId && s.date === dateStr);
    const shift = shifts.find(s => s.shift_code === shiftCode);

    try {
      if (shiftCode === 'X' || !shiftCode) {
        if (existing) {
          await supabase.from('user_schedules').delete().eq('id', existing.id);
        }
      } else if (existing) {
        await supabase.from('user_schedules').update({ shift_id: shift.id }).eq('id', existing.id);
      } else {
        await supabase.from('user_schedules').insert({
          tenant_id: tenantId, user_id: empId, date: dateStr, shift_id: shift.id
        });
      }
      await fetchData();
      logAudit('ROSTER_UPDATE', { employee: empId, date: dateStr, shift: shiftCode });
    } catch (e) {
      toast('Gagal: ' + e.message, 'error');
    }
  };

  const quickSetWeek = async (empId, shiftCode) => {
    if (!await confirm(`Terapkan shift ${SHIFT_COLORS[shiftCode]?.label || shiftCode} untuk semua hari dalam sebulan untuk karyawan ini?`, 'Isi Otomatis')) return;
    setSaving(true);
    const shift = shifts.find(s => s.shift_code === shiftCode);
    if (!shift) { toast('Shift tidak ditemukan', 'error'); setSaving(false); return; }
    try {
      const inserts = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${yearMonth}-${String(day).padStart(2, '0')}`;
        const existing = schedules.find(s => s.user_id === empId && s.date === dateStr);
        if (!existing) inserts.push({ tenant_id: tenantId, user_id: empId, date: dateStr, shift_id: shift.id });
      }
      if (inserts.length > 0) {
        await supabase.from('user_schedules').insert(inserts);
      }
      await fetchData();
      toast(`Shift ${SHIFT_COLORS[shiftCode]?.label} diisi untuk ${inserts.length} hari!`, 'success');
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
    setSaving(false);
  };

  const clearAll = async () => {
    if (!await confirm('Hapus SEMUA jadwal shift bulan ini?', 'Reset Roster')) return;
    setSaving(true);
    try {
      await supabase.from('user_schedules').delete().eq('tenant_id', tenantId)
        .gte('date', `${yearMonth}-01`).lte('date', `${yearMonth}-${daysInMonth}`);
      await fetchData();
      toast('Jadwal dikosongkan!', 'success');
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
    setSaving(false);
  };

  if (loading) return <div className="p-20 text-center"><div className="w-8 h-8 border-2 border-[var(--aurora-3)] border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-serif font-bold text-white">{t('Roster Bulanan')}</h3>
          <p className="text-xs text-gray-500 mt-0.5">Jadwal shift karyawan — grid bulanan</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setDate(new Date(year, month - 1, 1)); }} className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white"><ChevronLeft size={16} /></button>
          <span className="text-sm font-bold text-white px-3">{MONTHS[month]} {year}</span>
          <button onClick={() => { setDate(new Date(year, month + 1, 1)); }} className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white"><ChevronRight size={16} /></button>
          <button onClick={() => setDate(new Date())} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white text-[10px] font-bold">Hari Ini</button>
        </div>
      </div>

      {/* Legend & Actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {Object.entries(SHIFT_COLORS).map(([code, shift]) => (
            <div key={code} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ background: shift.color }} />
              <span className="text-[9px] text-gray-500 uppercase font-bold">{shift.label} ({code})</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={clearAll} disabled={saving} className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold flex items-center gap-1.5"><X size={12} /> Reset</button>
          <button onClick={fetchData} disabled={saving} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-[10px] font-bold"><Loader2 size={12} className={`inline ${saving ? 'animate-spin' : ''}`} /> Refresh</button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama / NIP..." className="w-full bg-[#13151A] border border-white/20 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white outline-none focus:border-[var(--aurora-3)]" />
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
      </div>

      {/* Roster Grid */}
      <div className="overflow-x-auto border border-white/10 rounded-2xl bg-black/20">
        <div className="min-w-[900px]">
          {/* Header Row */}
          <div className="grid grid-cols-[180px_repeat(31,1fr)] gap-0">
            <div className="p-2.5 bg-white/5 border-r border-b border-white/10 text-[9px] text-gray-500 uppercase font-bold tracking-wider flex items-center gap-1 sticky left-0">
              <Users size={12} /> KARYAWAN
            </div>
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const d = new Date(year, month, day);
              const isToday = d.toDateString() === new Date().toDateString();
              return (
                <div key={day} className={`p-1.5 text-center border-r border-b border-white/10 ${isToday ? 'bg-[var(--aurora-3)]/10' : 'bg-white/[0.02]'}`}>
                  <div className={`text-[8px] font-bold ${isToday ? 'text-[var(--aurora-3)]' : 'text-gray-500'}`}>{DAYS[d.getDay()]}</div>
                  <div className={`text-[11px] font-bold ${isToday ? 'text-white' : 'text-gray-400'}`}>{day}</div>
                </div>
              );
            })}
          </div>

          {/* Employee Rows */}
          {filteredEmployees.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">Tidak ada karyawan ditemukan.</div>
          ) : (
            filteredEmployees.map(emp => (
              <div key={emp.id} className="grid grid-cols-[180px_repeat(31,1fr)] gap-0 border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                <div className="p-2.5 border-r border-white/5 sticky left-0 bg-[var(--bg-darker)] flex items-center gap-2 min-w-0">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{emp.full_name}</p>
                    <p className="text-[9px] text-gray-500 truncate">{emp.nip || '-'}</p>
                  </div>
                  <button onClick={() => setShowShiftPicker(showShiftPicker === emp.id ? null : emp.id)} className="ml-auto p-1 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white shrink-0">
                    <Calendar size={12} />
                  </button>
                </div>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const shift = getShiftForDay(emp.id, day);
                  const code = shift?.shift_code;
                  const sc = SHIFT_COLORS[code];
                  const d = new Date(year, month, day);
                  const isToday = d.toDateString() === new Date().toDateString();
                  return (
                    <div
                      key={day}
                      onClick={() => setShowShiftPicker(showShiftPicker === `${emp.id}-${day}` ? null : `${emp.id}-${day}`)}
                      className={`p-1 border-r border-white/5 cursor-pointer transition-all hover:bg-white/10 text-center relative ${isToday ? 'ring-1 ring-inset ring-[var(--aurora-3)]/30' : ''}`}
                      style={sc ? { background: sc.bg } : {}}
                    >
                      {sc ? (
                        <span className="text-[9px] font-bold" style={{ color: sc.color }}>{code}</span>
                      ) : (
                        <span className="text-[7px] text-gray-700">...</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Shift Picker Popover */}
      {showShiftPicker && (() => {
        const [empId, day] = typeof showShiftPicker === 'string' && showShiftPicker.includes('-')
          ? showShiftPicker.split('-')
          : [showShiftPicker, null];
        const emp = employees.find(e => e.id === empId);
        if (!emp) return null;
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowShiftPicker(null)}>
            <div className="bg-[#1A1C23] border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white">Atur Shift</h4>
                <button onClick={() => setShowShiftPicker(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400"><X size={16} /></button>
              </div>
              <p className="text-xs text-gray-400">{emp.full_name} {day ? `• Tgl ${day}` : '• Semua hari'}</p>

              <div className="grid grid-cols-2 gap-2">
                {Object.entries(SHIFT_COLORS).map(([code, sc]) => (
                  <button key={code} onClick={async () => {
                    if (day) await setShiftForDay(empId, parseInt(day), code);
                    else await quickSetWeek(empId, code);
                    setShowShiftPicker(null);
                  }} className="flex items-center gap-2 p-3 rounded-xl border border-white/10 hover:bg-white/10 transition-colors" style={{ background: sc.bg }}>
                    <div className="w-3 h-3 rounded" style={{ background: sc.color }} />
                    <div className="text-left">
                      <span className="text-xs font-bold text-white">{sc.label}</span>
                      <span className="text-[9px] text-gray-500 block">{sc.jam}</span>
                    </div>
                  </button>
                ))}
              </div>

              {day && (
                <button onClick={async () => {
                  await setShiftForDay(empId, parseInt(day), '');
                  setShowShiftPicker(null);
                }} className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center justify-center gap-2">
                  <X size={14} /> Hapus Shift
                </button>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default RosterGrid;
