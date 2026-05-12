import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, UserPlus, Trash2, Edit3, CheckCircle2, Search } from 'lucide-react';

const PermissionManager = () => {
  const [subAdmins, setSubAdmins] = useState([
    { id: 1, name: 'Richard Meha', division: 'Security', permissions: 'Full Opr', status: 'Active' },
    { id: 2, name: 'Alexander Putra', division: 'IT Development', permissions: 'Validator', status: 'Active' },
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center bg-white/5 p-6 rounded-[32px] border border-white/10">
        <div>
          <h2 className="text-2xl font-serif font-bold text-white">Permission Manager</h2>
          <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Delegasikan Otoritas Devisi</p>
        </div>
        <button className="bg-[var(--aurora-1)] text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold text-sm hover:shadow-[0_0_20px_rgba(142,45,226,0.4)] transition-all">
          <UserPlus size={18} /> Tambah Sub-Admin
        </button>
      </div>

      <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input type="text" placeholder="Cari nama karyawan..." className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white outline-none focus:border-[var(--aurora-1)]" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 text-[10px] text-gray-500 uppercase tracking-widest">
                <th className="p-6 font-medium">Nama Karyawan</th>
                <th className="p-6 font-medium">Devisi Otoritas</th>
                <th className="p-6 font-medium">Ijin Akses</th>
                <th className="p-6 font-medium">Status</th>
                <th className="p-6 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {subAdmins.map((admin) => (
                <tr key={admin.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] p-[1px]">
                        <div className="w-full h-full bg-[var(--bg-dark)] rounded-[11px] flex items-center justify-center text-xs font-bold text-white">
                          {admin.name.split(' ').map(n => n[0]).join('')}
                        </div>
                      </div>
                      <span className="font-bold text-white">{admin.name}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className="px-3 py-1 rounded-full bg-[var(--aurora-3)]/10 text-[var(--aurora-3)] text-[10px] font-bold border border-[var(--aurora-3)]/20">
                      {admin.division}
                    </span>
                  </td>
                  <td className="p-6 text-sm text-gray-400">{admin.permissions}</td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[var(--success)] shadow-[0_0_8px_var(--success)]" />
                      <span className="text-xs text-[var(--success)] font-medium">{admin.status}</span>
                    </div>
                  </td>
                  <td className="p-6 text-right space-x-3">
                    <button className="text-gray-500 hover:text-white transition-colors"><Edit3 size={18} /></button>
                    <button className="text-[var(--danger)]/50 hover:text-[var(--danger)] transition-colors"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-3xl border border-white/5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--aurora-1)]/10 flex items-center justify-center text-[var(--aurora-1)]">
              <Shield size={24} />
            </div>
            <div>
              <h4 className="font-bold text-white">Audit Otoritas</h4>
              <p className="text-xs text-gray-500">Lihat riwayat perubahan ijin</p>
            </div>
          </div>
          <button className="w-full py-3 rounded-xl border border-white/10 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-all">
            Lihat Log Keamanan
          </button>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-white/5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--success)]/10 flex items-center justify-center text-[var(--success)]">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h4 className="font-bold text-white">Health Check</h4>
              <p className="text-xs text-gray-500">Otoritas sinkron dengan database</p>
            </div>
          </div>
          <button className="w-full py-3 rounded-xl border border-white/10 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-all">
            Verifikasi Sesi
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermissionManager;
