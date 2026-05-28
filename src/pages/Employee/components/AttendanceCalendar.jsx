import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, AlertTriangle, CalendarDays } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const STATUS_COLORS = {
  ONTIME: { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle2, label: 'Hadir' },
  LATE: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: AlertTriangle, label: 'Terlambat' },
  OUT_OF_RANGE: { bg: 'bg-red-500/20', text: 'text-red-400', icon: XCircle, label: 'Luar Radius' },
  CLOCK_OUT: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: Clock, label: 'Absen Keluar' },
  absent: { bg: 'bg-gray-500/10', text: 'text-gray-500', icon: XCircle, label: 'Tidak Hadir' },
  off: { bg: 'bg-white/5', text: 'text-gray-600', icon: CalendarDays, label: 'Libur' },
};

const AttendanceCalendar = ({ onBack }) => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [logs, setLogs] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ hadir: 0, telat: 0, absent: 0, off: 0 });

  useEffect(() => {
    fetchData();
  }, [year, month]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles').select('id, tenant_id').eq('auth_id', session.user.id).maybeSingle();
      if (!profile) return;

      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const [logData, schedData] = await Promise.all([
        supabase.from('attendance_logs')
          .select('*')
          .eq('user_id', profile.id)
          .gte('timestamp', startDate + 'T00:00:00')
          .lte('timestamp', endDate + 'T23:59:59')
          .order('timestamp'),
        supabase.from('user_schedules')
          .select('date, master_shifts(shift_name)')
          .eq('user_id', profile.id)
          .gte('date', startDate)
          .lte('date', endDate),
      ]);

      setLogs(logData.data || []);
      setSchedules(schedData.data || []);
      computeStats(logData.data || [], schedData.data || []);
    } catch (e) {
      console.error('Calendar fetch error:', e);
    }
    setLoading(false);
  };

  const computeStats = (logData, schedData) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const schedDates = new Set(schedData.map(s => s.date));
    let hadir = 0, telat = 0, absent = 0, off = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayLogs = logData.filter(l => l.timestamp?.startsWith(dateStr));
      const dayOfWeek = new Date(dateStr).getDay();
      const isScheduled = schedDates.has(dateStr);

      if (dayOfWeek === 0 || !isScheduled) {
        if (dayOfWeek !== 0) off++;
      } else if (dayLogs.length === 0) {
        absent++;
      } else {
        const clockIn = dayLogs.find(l => l.action === 'CLOCK_IN');
        if (clockIn?.status === 'LATE') telat++;
        else hadir++;
      }
    }
    setStats({ hadir, telat, absent, off });
  };

  const getDayStatus = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayLogs = logs.filter(l => l.timestamp?.startsWith(dateStr));
    const dayOfWeek = new Date(dateStr).getDay();
    const isScheduled = schedules.some(s => s.date === dateStr);

    if (dayOfWeek === 0 || !isScheduled) return null;
    if (dayLogs.length === 0) return 'absent';
    const clockIn = dayLogs.find(l => l.action === 'CLOCK_IN');
    if (clockIn?.status === 'ONTIME') return 'ONTIME';
    if (clockIn?.status === 'LATE') return 'LATE';
    if (clockIn?.status === 'OUT_OF_RANGE') return 'OUT_OF_RANGE';
    return 'absent';
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  return (
    <div className="w-full flex-1 flex flex-col pb-24">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-gray-400 hover:text-white transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-serif font-bold text-white">Riwayat Absensi</h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Kalender Bulanan</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {[
          { label: 'Hadir', value: stats.hadir, color: 'text-green-400' },
          { label: 'Telat', value: stats.telat, color: 'text-yellow-400' },
          { label: 'Alfa', value: stats.absent, color: 'text-red-400' },
          { label: 'Libur', value: stats.off, color: 'text-gray-500' },
        ].map(s => (
          <div key={s.label} className="glass-panel p-3 text-center border border-white/5">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-[10px]">
        {Object.entries(STATUS_COLORS).map(([key, v]) => (
          key !== 'absent' && key !== 'off' && (
            <span key={key} className={`flex items-center gap-1.5 ${v.text}`}>
              <v.icon size={12} /> {v.label}
            </span>
          )
        ))}
      </div>

      {/* Calendar */}
      <div className="glass-panel p-4 border border-white/5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400"><ChevronLeft size={16} /></button>
          <h3 className="text-sm font-bold text-white">{MONTHS[month]} {year}</h3>
          <button onClick={nextMonth} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400"><ChevronRight size={16} /></button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-[var(--aurora-3)] border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAYS.map(d => (
                <div key={d} className="text-center text-[9px] text-gray-500 uppercase tracking-widest font-bold py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const status = getDayStatus(day);
                const sc = status ? STATUS_COLORS[status] : null;
                const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
                return (
                  <motion.div
                    key={day}
                    whileTap={{ scale: 0.9 }}
                    className={`relative p-2 rounded-xl text-center transition-all ${
                      sc ? sc.bg : 'bg-white/[0.02]'
                    } ${isToday ? 'ring-2 ring-[var(--aurora-3)]' : ''}`}
                  >
                    <p className={`text-xs font-bold ${sc ? sc.text : 'text-gray-600'}`}>{day}</p>
                    {status && (
                      <div className={`mt-1 ${sc ? sc.text : 'text-gray-600'}`}>
                        <sc.icon size={10} className="mx-auto" />
                      </div>
                    )}
                    {isToday && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--aurora-3)]" />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Daily Detail */}
      {logs.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-bold text-white mb-3">Detail Hari Ini</h3>
          <div className="glass-panel p-4 border border-white/5">
            {logs.filter(l => l.timestamp?.startsWith(new Date().toISOString().split('T')[0])).map(l => (
              <div key={l.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                <span className="text-xs text-gray-400">{new Date(l.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                <span className={`text-[10px] font-bold ${l.action === 'CLOCK_IN' ? 'text-green-400' : 'text-blue-400'}`}>
                  {l.action === 'CLOCK_IN' ? 'Masuk' : 'Keluar'}
                </span>
                <span className={`text-[10px] ${l.status === 'ONTIME' ? 'text-green-400' : l.status === 'LATE' ? 'text-yellow-400' : 'text-red-400'}`}>
                  {l.status}
                </span>
              </div>
            ))}
            {logs.filter(l => l.timestamp?.startsWith(new Date().toISOString().split('T')[0])).length === 0 && (
              <p className="text-xs text-gray-500 text-center py-4">Belum ada absensi hari ini</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceCalendar;
