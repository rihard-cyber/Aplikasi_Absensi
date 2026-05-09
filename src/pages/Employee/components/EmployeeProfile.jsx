import React from 'react';
import { motion } from 'framer-motion';
import { LogOut, Settings, Smartphone, Key, ShieldCheck, ChevronRight } from 'lucide-react';

const EmployeeProfile = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col gap-6 pb-20"
    >
      {/* Profile Header Card */}
      <div className="glass-panel p-6 rounded-[32px] border-t border-white/20 shadow-lg text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-32 bg-gradient-to-b from-[var(--aurora-1)]/20 to-transparent"></div>
        
        <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] p-1 relative z-10 mb-4 shadow-[0_0_20px_rgba(142,45,226,0.4)]">
          <div className="w-full h-full bg-[var(--bg-dark)] rounded-2xl flex items-center justify-center text-3xl font-bold text-white">
            AP
          </div>
        </div>
        
        <h2 className="text-2xl font-serif font-bold text-white tracking-wide relative z-10">Alexander Putra</h2>
        <p className="text-sm text-[var(--aurora-3)] uppercase tracking-widest font-bold mt-1 relative z-10">Frontend Engineer</p>
        <p className="text-xs text-gray-400 mt-1 relative z-10">NIP: 3201123456</p>
      </div>

      {/* Settings Menu */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-white/5">
        
        <button className="w-full p-5 flex items-center gap-4 hover:bg-white/5 transition-colors text-left border-b border-white/5 group">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-[var(--aurora-1)] group-hover:bg-[var(--aurora-1)]/10 transition-colors">
            <ShieldCheck size={20} />
          </div>
          <div className="flex-1">
            <h4 className="text-white font-medium">Keamanan Akun</h4>
            <p className="text-xs text-gray-500">Pengaturan Sandi & 2FA</p>
          </div>
          <ChevronRight size={18} className="text-gray-600 group-hover:text-white" />
        </button>

        <button className="w-full p-5 flex items-center gap-4 hover:bg-white/5 transition-colors text-left border-b border-white/5 group">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-[var(--aurora-3)] group-hover:bg-[var(--aurora-3)]/10 transition-colors">
            <Smartphone size={20} />
          </div>
          <div className="flex-1">
            <h4 className="text-white font-medium">Pengikatan Perangkat</h4>
            <p className="text-xs text-gray-500">Kelola perangkat terdaftar</p>
          </div>
          <ChevronRight size={18} className="text-gray-600 group-hover:text-white" />
        </button>

        <button className="w-full p-5 flex items-center gap-4 hover:bg-white/5 transition-colors text-left group">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-white transition-colors">
            <Settings size={20} />
          </div>
          <div className="flex-1">
            <h4 className="text-white font-medium">Pengaturan Aplikasi</h4>
            <p className="text-xs text-gray-500">Notifikasi & Tema</p>
          </div>
          <ChevronRight size={18} className="text-gray-600 group-hover:text-white" />
        </button>
      </div>

      {/* Logout Button */}
      <button 
        className="glass-panel p-5 rounded-3xl border border-[var(--danger)]/30 text-[var(--danger)] flex justify-center items-center gap-3 font-bold uppercase tracking-widest text-sm hover:bg-[var(--danger)] hover:text-white transition-all shadow-[0_0_15px_rgba(255,0,85,0.1)]"
        onClick={() => window.location.href = '/login'}
      >
        <LogOut size={18} /> Keluar dengan aman
      </button>

      <div className="text-center mt-4">
        <p className="text-[10px] text-gray-600 tracking-widest uppercase">SI Presensi Pro Max v1.0.0</p>
      </div>
    </motion.div>
  );
};

export default EmployeeProfile;
