import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Wallet, TrendingUp, Zap, RefreshCcw, CheckCircle2, FileText, Megaphone } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../../utils/supabaseClient';

const EmployeeHome = ({ onAction, user, stats, companyInfo }) => {
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles')
        .select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
      if (!profile?.tenant_id) return;

      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (data) setAnnouncements(data);
    } catch (e) {
      console.error("Gagal menarik pengumuman:", e);
    }
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6"
    >
      {/* Greeting Card */}
      <div className="glass-panel p-6 rounded-[32px] border-t border-[var(--aurora-1)]/30 shadow-[0_10px_40px_rgba(142,45,226,0.15)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--aurora-1)] rounded-full blur-[80px] opacity-40"></div>
        <h2 className="text-2xl font-serif font-bold text-white tracking-wide">Selamat datang kembali, <br /><span className="text-[var(--aurora-3)]">{user?.full_name?.split(' ')[0] || 'Alexander'}!</span></h2>
        <p className="text-gray-400 text-sm mt-1 font-sans">{user?.position || 'Software Engineer'} • Divisi {user?.division || 'Frontend'}</p>

        <div className="mt-6 flex items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-[var(--aurora-1)]/20 text-[var(--aurora-1)] flex items-center justify-center">
            <Zap size={20} className="drop-shadow-[0_0_10px_var(--aurora-1)]" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest">Status Kehadiran</p>
            <p className="font-bold text-white text-sm">Aktif • Sesuai Jadwal</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-panel p-5 rounded-3xl flex flex-col items-center text-center justify-center gap-2 border border-white/5 hover:border-[var(--aurora-3)]/50 transition-all group">
          <div className="text-[var(--aurora-3)] bg-[var(--aurora-3)]/10 p-3 rounded-2xl group-hover:scale-110 transition-transform">
            <Clock size={24} />
          </div>
          <h3 className="text-2xl font-bold text-white mt-1">{stats?.weeklyHours || 0}h</h3>
          <p className="text-xs text-gray-500 uppercase tracking-widest">Jam kerja minggu ini</p>
        </div>

        <div className="glass-panel p-5 rounded-3xl flex flex-col items-center text-center justify-center gap-2 border border-white/5 hover:border-[var(--aurora-1)]/50 transition-all group">
          <div className="text-[var(--aurora-1)] bg-[var(--aurora-1)]/10 p-3 rounded-2xl group-hover:scale-110 transition-transform">
            <Calendar size={24} />
          </div>
          <h3 className="text-2xl font-bold text-white mt-1">{stats?.leaveBalance || 0}</h3>
          <p className="text-xs text-gray-500 uppercase tracking-widest">Sisa cuti</p>
        </div>
      </div>

      {/* QUICK ACTIONS GRID */}
      <div className="grid grid-cols-4 gap-4 mb-2">
        <ActionButton icon={<Calendar />} label="Izin / Cuti" color="var(--aurora-3)" onClick={() => onAction('leave')} />
        <ActionButton icon={<Zap />} label="Lembur" color="var(--warning)" onClick={() => onAction('lembur')} />
        <ActionButton icon={<RefreshCcw />} label="Tukar Shift" color="var(--aurora-2)" onClick={() => onAction('shift')} />
        <ActionButton icon={<CheckCircle2 />} label="Req. Absen" color="var(--success)" onClick={() => onAction('req-absen')} />
        <ActionButton icon={<Wallet />} label="Slip Gaji" color="var(--aurora-1)" onClick={() => onAction('salary')} />
        <ActionButton icon={<FileText />} label="PKWT / Kontrak" color="var(--aurora-3)" onClick={() => onAction('contract')} />
        <ActionButton icon={<TrendingUp />} label="Overtime" color="var(--warning)" onClick={() => onAction('overtime')} />
      </div>

      {/* ANNOUNCEMENTS SECTION */}
      {announcements.length > 0 && (
        <div className="glass-panel p-6 rounded-[32px] border border-[var(--aurora-1)]/30 relative overflow-hidden bg-gradient-to-br from-[var(--aurora-1)]/5 to-transparent">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--aurora-1)]/20 text-[var(--aurora-1)] flex items-center justify-center animate-pulse">
              <Megaphone size={20} />
            </div>
            <h3 className="font-serif text-lg text-white font-bold tracking-tight">Pusat Pengumuman</h3>
          </div>
          
          <div className="space-y-3">
            {announcements.map((ann, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-2xl hover:border-[var(--aurora-1)]/50 transition-colors">
                <h4 className="text-white font-bold text-sm tracking-wide">{ann.title}</h4>
                <p className="text-gray-400 text-xs mt-1 leading-relaxed">{ann.content}</p>
                <div className="mt-3 flex items-center gap-2 text-[9px] text-gray-500 font-bold uppercase tracking-widest">
                  <Clock size={10} /> 
                  {new Date(ann.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Company Information Card (REPLACED SALARY ESTIMATE) */}
      <div className="glass-panel p-6 rounded-[32px] border border-white/5 relative overflow-hidden bg-gradient-to-br from-white/[0.02] to-transparent">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--aurora-3)]/10 text-[var(--aurora-3)] flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <h3 className="font-serif text-lg text-white font-bold tracking-tight">Informasi Perusahaan</h3>
          </div>
          <div className="px-3 py-1 rounded-full bg-[var(--success)]/10 border border-[var(--success)]/30">
            <span className="text-[8px] font-black text-[var(--success)] uppercase tracking-widest">Terhubung</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          <InfoRow icon={<Clock />} label="Jam Kerja Standar" value={companyInfo?.workHours || '08:00 - 17:00'} color="var(--aurora-3)" />
          <InfoRow icon={<Calendar />} label="Hari Kerja Efektif" value={companyInfo?.workDays || 'Senin - Jumat'} color="var(--aurora-1)" />
          <InfoRow icon={<Zap />} label="Toleransi Keterlambatan" value={companyInfo?.gracePeriod || '15 Menit'} color="var(--warning)" />
        </div>

        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
          <p className="text-[9px] text-gray-600 uppercase font-black tracking-[0.2em]">Tenant: {companyInfo?.tenantName || 'PT. Perusahaan'}</p>
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-[var(--success)] animate-pulse" />
            <span className="text-[8px] text-[var(--success)] font-bold uppercase">Sistem Online</span>
          </div>
        </div>
      </div>

    </motion.div>
  );
};

// --- SUB-COMPONENTS ---
const InfoRow = ({ icon, label, value, color }) => (
  <div className="flex items-center gap-4 group">
    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center transition-all group-hover:scale-110" style={{ color }}>
      {React.cloneElement(icon, { size: 16, className: 'opacity-80' })}
    </div>
    <div className="flex-1">
      <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">{label}</p>
      <p className="text-xs font-bold text-white tracking-wide">{value}</p>
    </div>
  </div>
);

const ActionButton = ({ icon, label, color, onClick }) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center gap-2 group"
  >
    <div 
      className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 group-active:scale-95 border border-white/5 bg-white/5"
      style={{ color }}
    >
      {React.cloneElement(icon, { size: 24, className: 'drop-shadow-[0_0_8px_currentColor] opacity-80' })}
    </div>
    <span className="text-[10px] text-gray-500 font-bold text-center leading-tight whitespace-nowrap group-hover:text-white transition-colors">{label}</span>
  </button>
);

export default EmployeeHome;
