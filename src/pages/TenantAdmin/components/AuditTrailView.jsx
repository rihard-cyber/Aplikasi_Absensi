import React from 'react';
import { Search, Filter, ShieldCheck } from 'lucide-react';

const mockLogs = [
  { id: 'LOG-992', date: '2026-05-09 14:30', user: 'Admin HR (NIP: 1001)', action: 'UPDATE_SHIFT', details: 'Mengubah waktu selesai Shift "Malam" dari 06:00 menjadi 07:00' },
  { id: 'LOG-991', date: '2026-05-09 11:15', user: 'System Auto', action: 'PAYROLL_GENERATED', details: 'Membuat penggajian untuk April 2026 (125 karyawan)' },
  { id: 'LOG-990', date: '2026-05-08 16:45', user: 'Admin Spv (NIP: 1055)', action: 'DELETE_ATTENDANCE', details: 'Menghapus data kehadiran untuk NIP: 2044 pada 2026-05-08' },
  { id: 'LOG-989', date: '2026-05-08 09:10', user: 'Admin HR (NIP: 1001)', action: 'VERIFY_DOCUMENT', details: 'Memverifikasi KTP untuk NIP: 3012' },
];

const AuditTrailView = () => {
  return (
    <div className="glass-panel p-8">
      <div className="border-b border-white/10 pb-6 mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-serif font-bold text-white flex items-center gap-3 tracking-wide">
            <ShieldCheck size={28} className="text-[var(--aurora-3)] drop-shadow-[0_0_10px_rgba(0,201,255,0.8)]" /> Jejak Audit Sistem
          </h2>
          <p className="text-sm text-gray-400 mt-2 font-sans tracking-wide">Catatan permanen dari modifikasi data penting.</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Cari berdasarkan Pengguna, Aksi, atau Detail..." 
            className="w-full pl-12 pr-4 py-3 bg-[#1A1C23] border border-white/10 rounded-xl text-white light-bloom-input focus:border-[var(--aurora-3)]"
          />
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-300 hover:bg-white/10 transition-colors">
          <Filter size={18} className="text-[var(--aurora-1)]" /> Filter Tanggal
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-white/10 rounded-2xl bg-[#0B0C10]/50 backdrop-blur-md">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-gray-400 border-b border-white/10 uppercase tracking-widest text-xs">
            <tr>
              <th className="p-5 font-semibold">Log ID</th>
              <th className="p-5 font-semibold">Stempel Waktu</th>
              <th className="p-5 font-semibold">Aktor</th>
              <th className="p-5 font-semibold">Aksi</th>
              <th className="p-5 font-semibold">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {mockLogs.map(log => (
              <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                <td className="p-5 font-mono text-xs text-gray-500 group-hover:text-[var(--aurora-3)] transition-colors">{log.id}</td>
                <td className="p-5 text-gray-400 whitespace-nowrap">{log.date}</td>
                <td className="p-5 font-medium text-gray-200">{log.user}</td>
                <td className="p-5">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider ${
                    log.action.includes('DELETE') ? 'bg-[var(--danger)]/20 text-[var(--danger)] border border-[var(--danger)]/50' :
                    log.action.includes('UPDATE') ? 'bg-[var(--warning)]/20 text-[var(--warning)] border border-[var(--warning)]/50' :
                    'bg-[var(--success)]/20 text-[var(--success)] border border-[var(--success)]/50'
                  }`}>
                    {log.action}
                  </span>
                </td>
                <td className="p-5 text-gray-400">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditTrailView;
