/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, CalendarDays, Clock, User, Loader2 } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const DAYS = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

const ScheduleCalendar = () => {
  const [date, setDate] = useState(new Date());
  const [schedules, setSchedules] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);

  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  useEffect(() => { fetchData(); }, [year, month]);

  const fetchData = async () => {
    setLoading(true);
    const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const { data: p } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!p?.tenant_id && !isGod) { setLoading(false); return; }

    let q1 = supabase.from('profiles').select('id, full_name, nip, position');
    if (p?.tenant_id) q1 = q1.eq('tenant_id', p.tenant_id);
    q1 = q1.in('role', ['EMPLOYEE', 'SUB_ADMIN']);
    const { data: emps } = await q1;
    setEmployees(emps || []);

    let q2 = supabase.from('master_shifts').select('*');
    if (p?.tenant_id) q2 = q2.eq('tenant_id', p.tenant_id);
    q2 = q2.eq('is_active', true);
    const { data: sh } = await q2;
    setShifts(sh || []);

    const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${daysInMonth}`;
    let q3 = supabase.from('user_schedules')
      .select('*, master_shifts!inner(shift_code, shift_name, time_in, time_out, is_cross_day)');
    if (p?.tenant_id) q3 = q3.eq('tenant_id', p.tenant_id);
    q3 = q3.gte('date', monthStart).lte('date', monthEnd);
    const { data: scheds } = await q3;
    setSchedules(scheds || []);
    setLoading(false);
  };

  const prevMonth = () => setDate(new Date(year, month - 1, 1));
  const nextMonth = () => setDate(new Date(year, month + 1, 1));

  const getSchedulesForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return schedules.filter(s => s.date === dateStr);
  };

  const getEmployeeName = (id) => employees.find(e => e.id === id)?.full_name || 'Unknown';
  const getShiftColor = (code) => {
    const colors = { R: '#8E2DE2', PS: '#00C9FF', MS: '#FFD700', OFF: '#666', S: '#FF0055', SP: '#00FF87' };
    return colors[code] || '#8E2DE2';
  };

  const daySchedules = selectedDay ? getSchedulesForDay(selectedDay) : [];

  return (
    <div className="glass-panel p-4 sm:p-6 lg:p-8">
      <div className="border-b border-white/10 pb-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">Kalender Jadwal</h2>
            <p className="text-sm text-gray-400 mt-1">Visualisasi jadwal shift karyawan</p>
          </div>
          <div className="flex items-center gap-4 self-end sm:self-auto">
            <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white flex-shrink-0"><ChevronLeft size={20} /></button>
            <span className="text-lg font-bold text-white min-w-0 sm:min-w-[180px] text-center">{MONTHS[month]} {year}</span>
            <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white flex-shrink-0"><ChevronRight size={20} /></button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS.map(d => <div key={d} className="text-center text-[9px] text-gray-500 uppercase tracking-widest font-bold py-2">{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayScheds = getSchedulesForDay(day);
          const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
          const isSelected = day === selectedDay;

          return (
            <button key={day} onClick={() => setSelectedDay(isSelected ? null : day)}
              className={`min-h-[70px] p-1.5 rounded-xl border transition-all text-left ${isSelected ? 'bg-white/10 border-[var(--aurora-3)]/40' : isToday ? 'bg-[var(--aurora-3)]/10 border-[var(--aurora-3)]/20' : 'bg-white/5 border-white/10 hover:border-white/20'}`}>
              <p className={`text-[10px] font-bold mb-1 ${isToday ? 'text-[var(--aurora-3)]' : 'text-gray-400'}`}>{day}</p>
              <div className="space-y-0.5">
                {dayScheds.slice(0, 3).map(s => {
                  const shiftCode = s.master_shifts?.shift_code || '?';
                  return (
                    <div key={s.id} className="text-[6px] px-1 py-0.5 rounded text-white truncate font-bold" style={{ background: getShiftColor(shiftCode) + '40', color: getShiftColor(shiftCode) }}>
                      {shiftCode}
                    </div>
                  );
                })}
                {dayScheds.length > 3 && <p className="text-[6px] text-gray-500">+{dayScheds.length - 3} lagi</p>}
              </div>
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-5 bg-white/5 rounded-2xl border border-white/10">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <CalendarDays size={16} className="text-[var(--aurora-3)]" />
            {DAYS[new Date(year, month, selectedDay).getDay()]}, {selectedDay} {MONTHS[month]} {year}
            <span className="text-xs text-gray-500 font-normal">({daySchedules.length} karyawan)</span>
          </h3>
          {daySchedules.length > 0 ? (
            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
              {daySchedules.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center text-[10px] font-bold text-white">
                      {getEmployeeName(s.user_id).charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{getEmployeeName(s.user_id)}</p>
                      <p className="text-[9px] text-gray-500">{s.master_shifts?.shift_name || '-'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-[var(--aurora-3)]">{s.master_shifts?.shift_code}</span>
                    <p className="text-[9px] text-gray-500">
                      <Clock size={10} className="inline mr-1" />
                      {s.master_shifts?.time_in?.slice(0, 5) || '--:--'} - {s.master_shifts?.time_out?.slice(0, 5) || '--:--'}
                      {s.master_shifts?.is_cross_day ? ' +1' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-xs text-center py-4">Tidak ada jadwal untuk hari ini</p>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default ScheduleCalendar;
