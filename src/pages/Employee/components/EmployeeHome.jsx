import React from 'react';
import { Clock, Calendar, Wallet, TrendingUp, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const EmployeeHome = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6"
    >
      {/* Greeting Card */}
      <div className="glass-panel p-6 rounded-[32px] border-t border-[var(--aurora-1)]/30 shadow-[0_10px_40px_rgba(142,45,226,0.15)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--aurora-1)] rounded-full blur-[80px] opacity-40"></div>
        <h2 className="text-2xl font-serif font-bold text-white tracking-wide">Selamat datang kembali, <br /><span className="text-[var(--aurora-3)]">Alexander!</span></h2>
        <p className="text-gray-400 text-sm mt-1 font-sans">Software Engineer • Divisi Frontend</p>

        <div className="mt-6 flex items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-[var(--aurora-1)]/20 text-[var(--aurora-1)] flex items-center justify-center">
            <Zap size={20} className="drop-shadow-[0_0_10px_var(--aurora-1)]" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest">Sif Berikutnya</p>
            <p className="font-bold text-white text-sm">Pagi • 08:00 WIB</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-panel p-5 rounded-3xl flex flex-col items-center text-center justify-center gap-2 border border-white/5 hover:border-[var(--aurora-3)]/50 transition-all group">
          <div className="text-[var(--aurora-3)] bg-[var(--aurora-3)]/10 p-3 rounded-2xl group-hover:scale-110 transition-transform">
            <Clock size={24} />
          </div>
          <h3 className="text-2xl font-bold text-white mt-1">42h</h3>
          <p className="text-xs text-gray-500 uppercase tracking-widest">Jam kerja minggu ini</p>
        </div>

        <div className="glass-panel p-5 rounded-3xl flex flex-col items-center text-center justify-center gap-2 border border-white/5 hover:border-[var(--aurora-1)]/50 transition-all group">
          <div className="text-[var(--aurora-1)] bg-[var(--aurora-1)]/10 p-3 rounded-2xl group-hover:scale-110 transition-transform">
            <Calendar size={24} />
          </div>
          <h3 className="text-2xl font-bold text-white mt-1">12</h3>
          <p className="text-xs text-gray-500 uppercase tracking-widest">Sisa cuti</p>
        </div>
      </div>

      {/* Salary Estimate (Optional feature for Enterprise) */}
      <div className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-serif text-lg text-white">Estimasi Pendapatan</h3>
          <TrendingUp size={18} className="text-[var(--success)]" />
        </div>
        <div className="flex items-end gap-2">
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500 tracking-wider">
            Rp 8.5M
          </h2>
          <span className="text-sm text-gray-500 mb-1">/ bulan</span>
        </div>
        <p className="text-xs text-gray-500 mt-2 flex items-center gap-2">
          <Wallet size={12} className="text-[var(--aurora-3)]" /> Siap untuk batas waktu penggajian berikutnya
        </p>
      </div>

    </motion.div>
  );
};

export default EmployeeHome;
