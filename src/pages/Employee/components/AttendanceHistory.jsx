import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, CalendarCheck, AlertTriangle, Filter, Search, ChevronRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';

const AttendanceHistory = () => {
  const [filter, setFilter] = useState('ALL'); // ALL, ONTIME, LATE, ABSENT
  const [historyData, setHistoryData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles').select('id').eq('auth_id', session.user.id).maybeSingle();

      if (profile) {
        const { data, error } = await supabase
          .from('attendance_logs')
          .select('*')
          .eq('user_id', profile.id)
          .order('timestamp', { ascending: false });

        if (error) throw error;

        if (data) {
          const formatted = data.map(log => {
            const dateObj = new Date(log.timestamp);
            return {
              id: log.id,
              date: dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
              in: log.action === 'CLOCK_IN' ? dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '--:--',
              out: log.action === 'CLOCK_OUT' ? dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '--:--',
              status: log.status,
              location: log.distance_meters !== null ? `Jarak: ${log.distance_meters}m` : 'Lokasi tidak diketahui',
              biometric: true
            };
          });
          setHistoryData(formatted);
        }
      }
    } catch (e) {
      console.error("Error fetching attendance history", e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredHistory = filter === 'ALL' ? historyData : historyData.filter(h => h.status === filter || (filter === 'LATE' && h.status === 'OUT_OF_RANGE'));

  const stats = {
    total: historyData.length,
    ontime: historyData.filter(h => h.status === 'ONTIME').length,
    late: historyData.filter(h => h.status === 'LATE' || h.status === 'OUT_OF_RANGE').length
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col gap-6 pb-32"
    >
      {/* Header & Stats Overview */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-serif font-bold text-white tracking-tight">Log Aktivitas</h2>
            <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-bold mt-1">Biometric Attendance Logs</p>
          </div>
          <button className="p-3 bg-white/5 border border-white/10 rounded-2xl text-gray-400 hover:text-[var(--aurora-3)] transition-all">
            <Filter size={20} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatMini label="Total" value={stats.total} color="var(--aurora-3)" active={filter === 'ALL'} onClick={() => setFilter('ALL')} />
          <StatMini label="Hadir" value={stats.ontime} color="var(--success)" active={filter === 'ONTIME'} onClick={() => setFilter('ONTIME')} />
          <StatMini label="Telat" value={stats.late} color="var(--warning)" active={filter === 'LATE'} onClick={() => setFilter('LATE')} />
        </div>
      </div>

      {/* History List */}
      <div className="flex flex-col gap-4">
        <AnimatePresence mode="popLayout">
          {filteredHistory.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-12 text-center glass-panel rounded-[32px] border border-white/5 mt-4">
              <Clock size={48} className="text-gray-600 mb-4" />
              <h4 className="text-white font-bold text-sm">Belum Ada Log Presensi</h4>
              <p className="text-gray-500 text-xs mt-1">Data absensi harian Anda akan tercatat di sini.</p>
            </motion.div>
          ) : (
            <>
              {filteredHistory.map((record, index) => (
                <motion.div
                  key={record.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass-panel p-5 rounded-[32px] border border-white/5 relative overflow-hidden group"
                >
                  {/* Status Accent */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${record.status === 'ONTIME' ? 'bg-[var(--success)] shadow-[0_0_15px_var(--success)]' :
                    record.status === 'LATE' ? 'bg-[var(--warning)] shadow-[0_0_15px_var(--warning)]' :
                      'bg-[var(--danger)] shadow-[0_0_15px_var(--danger)]'
                    }`} />

                  <div className="flex justify-between items-start mb-5">
                    <div className="flex flex-col gap-1">
                      <span className="text-white font-bold text-sm tracking-wide">{record.date}</span>
                      <div className="flex items-center gap-2">
                        <MapPin size={10} className="text-[var(--aurora-3)]" />
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">{record.location}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge status={record.status} />
                      {record.biometric && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--aurora-3)]/10 border border-[var(--aurora-3)]/20">
                          <ShieldCheck size={8} className="text-[var(--aurora-3)]" />
                          <span className="text-[7px] text-[var(--aurora-3)] font-black tracking-tighter uppercase">Face ID Verified</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#0B0C10]/40 p-4 rounded-[24px] border border-white/5 flex flex-col gap-2">
                      <p className="text-[8px] text-gray-500 uppercase tracking-[0.2em] font-black">Time In</p>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl bg-white/5 ${record.status === 'LATE' ? 'text-[var(--warning)]' : 'text-[var(--success)]'}`}>
                          <Clock size={16} />
                        </div>
                        <span className="text-xl font-bold text-white tracking-tighter">{record.in}</span>
                      </div>
                    </div>
                    <div className="bg-[#0B0C10]/40 p-4 rounded-[24px] border border-white/5 flex flex-col gap-2">
                      <p className="text-[8px] text-gray-500 uppercase tracking-[0.2em] font-black">Time Out</p>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white/5 text-[var(--aurora-1)]">
                          <Clock size={16} />
                        </div>
                        <span className="text-xl font-bold text-white tracking-tighter">{record.out}</span>
                      </div>
                    </div>
                  </div>

                  <button className="w-full mt-4 py-3 flex items-center justify-center gap-2 text-[11px] text-gray-600 font-black uppercase tracking-[0.3em] hover:text-white transition-colors group">
                    Lihat Detail <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </motion.div>
              ))}
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const StatMini = ({ label, value, color, active, onClick }) => (
  <button
    onClick={onClick}
    className={`p-3 rounded-2xl border transition-all flex flex-col items-center gap-1 ${active ? 'bg-white/5 border-white/10' : 'bg-transparent border-transparent opacity-40 hover:opacity-100'}`}
  >
    <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">{label}</span>
    <span className="text-lg font-bold" style={{ color }}>{value}</span>
  </button>
);

const StatusBadge = ({ status }) => {
  const config = {
    'ONTIME': { label: 'Tepat Waktu', color: 'var(--success)' },
    'LATE': { label: 'Terlambat', color: 'var(--warning)' },
    'ABSENT': { label: 'Mangkir', color: 'var(--danger)' },
    'OUT_OF_RANGE': { label: 'Luar Radius', color: 'var(--danger)' }
  };
  const { label, color } = config[status] || config.ONTIME;
  return (
    <span className="text-[8px] font-black px-2.5 py-1 rounded-lg bg-black/40 uppercase tracking-widest border border-white/5" style={{ color }}>
      {label}
    </span>
  );
};

export default AttendanceHistory;
