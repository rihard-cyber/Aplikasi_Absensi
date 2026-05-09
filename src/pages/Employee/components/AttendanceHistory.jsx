import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, CalendarCheck, AlertTriangle } from 'lucide-react';

const mockHistory = [
  { id: 1, date: 'Hari ini, 9 Mei', in: '07:55', out: '--:--', status: 'Tepat Waktu', location: 'Kantor Pusat' },
  { id: 2, date: 'Rab, 8 Mei', in: '08:15', out: '17:30', status: 'Terlambat', location: 'Remote (Rumah)' },
  { id: 3, date: 'Sel, 7 Mei', in: '07:50', out: '17:05', status: 'Tepat Waktu', location: 'Kantor Pusat' },
  { id: 4, date: 'Sen, 6 Mei', in: '08:00', out: '17:15', status: 'Tepat Waktu', location: 'Kantor Pusat' },
  { id: 5, date: 'Jum, 3 Mei', in: '--:--', out: '--:--', status: 'Mangkir', location: '-' },
];

const AttendanceHistory = () => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col gap-4 pb-20"
    >
      <div className="flex justify-between items-center mb-2 px-1">
        <h2 className="text-xl font-serif font-bold text-white tracking-wide">Log Aktivitas</h2>
        <button className="text-xs text-[var(--aurora-3)] uppercase tracking-widest font-bold">Saring</button>
      </div>

      {mockHistory.map((record, index) => (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          key={record.id}
          className="glass-panel p-5 rounded-3xl border border-white/5 relative overflow-hidden group"
        >
          {/* Status Glow Indicator */}
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${record.status === 'Tepat Waktu' ? 'bg-[var(--success)] shadow-[0_0_10px_var(--success)]' :
              record.status === 'Terlambat' ? 'bg-[var(--warning)] shadow-[0_0_10px_var(--warning)]' :
                'bg-[var(--danger)] shadow-[0_0_10px_var(--danger)]'
            }`}></div>

          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <CalendarCheck size={16} className="text-gray-400" />
              <span className="text-white font-medium text-sm tracking-wide">{record.date}</span>
            </div>
            <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-md ${record.status === 'Tepat Waktu' ? 'text-[var(--success)] bg-[var(--success)]/10' :
                record.status === 'Terlambat' ? 'text-[var(--warning)] bg-[var(--warning)]/10' :
                  'text-[var(--danger)] bg-[var(--danger)]/10'
              }`}>
              {record.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-[#0B0C10]/50 p-3 rounded-2xl border border-white/5">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Masuk</p>
              <div className="flex items-center gap-2">
                <Clock size={14} className={record.status === 'Terlambat' ? 'text-[var(--warning)]' : 'text-[var(--aurora-3)]'} />
                <span className="text-white font-bold text-sm">{record.in}</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Keluar</p>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-[var(--aurora-1)]" />
                <span className="text-white font-bold text-sm">{record.out}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
            <MapPin size={12} className="text-[var(--aurora-3)]" />
            <span>{record.location}</span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default AttendanceHistory;
