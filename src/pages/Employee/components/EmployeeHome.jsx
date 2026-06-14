import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Wallet, TrendingUp, Zap, CheckCircle2, FileText, Megaphone, Sun, QrCode, DollarSign, Receipt, Edit3, Bot, Headphones, DoorOpen, Route, Repeat, AlertTriangle, MapPin, ClipboardList, CalendarDays, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../../utils/supabaseClient';

/** @type {(s: string) => string} Passthrough i18n */
const t = (s) => s;

const EmployeeHome = ({ onAction, user, stats, companyInfo, modules = {
  helpdesk: true,
  work_order: true,
  patrol: true,
  visitor: true,
  booking: true,
  incident: true,
  fleet: true,
  inventory: true,
  shift_swap: true,
  hybrid_work: true,
  payroll: true
} }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [upcomingHolidays, setUpcomingHolidays] = useState([]);
  const [anniversaryData, setAnniversaryData] = useState([]);

  useEffect(() => {
    fetchAnnouncements();
    fetchLeaveBalance();
    fetchHolidays();
    fetchAnniversary();
  }, []);

  const fetchLeaveBalance = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: prof } = await supabase.from('profiles').select('id').eq('auth_id', session.user.id).maybeSingle();
      if (!prof?.id) return;
      const year = new Date().getFullYear();
      let { data: lb } = await supabase.from('leave_balances').select('*').eq('user_id', prof.id).eq('year', year).maybeSingle();
      if (!lb) {
        const { data: newLb } = await supabase.from('leave_balances').insert({ user_id: prof.id, year, total_days: 12, used_days: 0, pending_days: 0 }).select().single();
        if (newLb) lb = newLb;
      }
      if (lb) setLeaveBalance(lb);
    } catch (e) { console.error('Failed to fetch leave balance', e); }
  };

  const fetchHolidays = async () => {
    try {
      const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: prof } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
      const tid = prof?.tenant_id;
      if (!tid && !isGod) return;
      const today = new Date().toISOString().split('T')[0];
      const threeMonths = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];
      let q = supabase.from('company_holidays').select('*').gte('date', today).lte('date', threeMonths);
      if (tid) q = q.eq('tenant_id', tid); else q = q.limit(10);
      const { data } = await q.order('date');
      if (data) setUpcomingHolidays(data);
    } catch (e) { console.warn('Holiday fetch error', e); }
  };

  const fetchAnniversary = async () => {
    try {
      const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: prof } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
      const tid = prof?.tenant_id;
      if (!tid && !isGod) return;
      let q = supabase.from('profiles').select('id, full_name, position, birth_date').in('role', ['EMPLOYEE', 'SUB_ADMIN']);
      if (tid) q = q.eq('tenant_id', tid); else q = q.limit(50);
      const { data } = await q;
      if (data) {
        const thisMonth = new Date().getMonth();
        const monthBirthdays = data.filter(e => e.birth_date).filter(e => new Date(e.birth_date).getMonth() === thisMonth);
        setAnniversaryData(monthBirthdays.slice(0, 5));
      }
    } catch (e) { console.warn('Anniversary error', e); }
  };

  const fetchAnnouncements = async () => {
    try {
      const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles')
        .select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
      const tid = profile?.tenant_id;
      if (!tid && !isGod) return;

      let q = supabase.from('announcements').select('*').eq('is_active', true);
      if (tid) q = q.eq('tenant_id', tid); else q = q.limit(10);
      const { data } = await q.order('created_at', { ascending: false }).limit(3);
      
      if (data) setAnnouncements(data);
    } catch (e) {
      console.error("Gagal menarik pengumuman:", e);
    }
  };

  const allActions = [
    { id: 'leave', label: 'Izin / Cuti', icon: <Calendar />, color: 'var(--aurora-3)', module: null },
    { id: 'lembur', label: 'Lembur', icon: <Zap />, color: 'var(--warning)', module: 'payroll' },
    { id: 'qr', label: 'QR Absen', icon: <QrCode />, color: 'var(--aurora-3)', module: null },
    { id: 'req-absen', label: 'Req. Absen', icon: <CheckCircle2 />, color: 'var(--success)', module: null },
    { id: 'salary', label: 'Slip Gaji', icon: <Wallet />, color: 'var(--aurora-1)', module: 'payroll' },
    { id: 'loan', label: 'Pinjaman', icon: <DollarSign />, color: 'var(--aurora-3)', module: 'payroll' },
    { id: 'reimbursement', label: 'Klaim Biaya', icon: <Receipt />, color: 'var(--success)', module: 'payroll' },
    { id: 'edit-profile', label: 'Edit Profil', icon: <Edit3 />, color: 'var(--aurora-1)', module: null },
    { id: 'contract', label: 'PKWT / Kontrak', icon: <FileText />, color: 'var(--aurora-3)', module: null },
    { id: 'chatbot', label: 'Tanya AI', icon: <Bot />, color: 'var(--aurora-2)', module: null },
    { id: 'helpdesk', label: 'Helpdesk', icon: <Headphones />, color: 'var(--danger)', module: 'helpdesk' },
    { id: 'booking', label: 'Booking', icon: <DoorOpen />, color: 'var(--aurora-3)', module: 'booking' },
    { id: 'patrol-scan', label: 'Patroli', icon: <Route />, color: 'var(--warning)', module: 'patrol' },
    { id: 'patrol-lapor', label: 'Lapor Temuan', icon: <AlertTriangle />, color: 'var(--danger)', module: 'patrol' },
    { id: 'patrol-mutasi', label: 'Buku Mutasi', icon: <ClipboardList />, color: 'var(--warning)', module: 'patrol' },
    { id: 'patrol-handover', label: 'Handover Jaga', icon: <Users />, color: 'var(--aurora-2)', module: 'patrol' },
    { id: 'shift-swap', label: 'Tukar Shift', icon: <Repeat />, color: 'var(--aurora-2)', module: 'shift_swap' },
    { id: 'attendance-calendar', label: 'Riwayat Absen', icon: <CalendarDays />, color: 'var(--aurora-3)', module: null },
    { id: 'incident-report', label: 'Lapor Insiden', icon: <AlertTriangle />, color: 'var(--danger)', module: 'incident' },
    { id: 'home-address', label: 'Alamat Rumah', icon: <MapPin />, color: 'var(--success)', module: 'hybrid_work' },
    { id: 'task-plan', label: 'Rencana Kerja', icon: <ClipboardList />, color: 'var(--aurora-1)', module: null },
  ];

  const activeActions = allActions.filter(act => {
    // 1. Filter by tenant-wide module availability
    if (act.module && !modules[act.module]) return false;

    // 2. Filter dynamically by employee division
    const divisionName = (user?.division || '').toLowerCase();
    
    // Satpam / Security specific actions
    const isSecurityDiv = divisionName.includes('security') || divisionName.includes('satpam') || divisionName.includes('pengamanan');
    
    // Office / IT specific actions
    const isOfficeDiv = divisionName.includes('office') || divisionName.includes('it') || divisionName.includes('staff') || divisionName.includes('admin') || divisionName.includes('hr') || divisionName.includes('management') || divisionName.includes('developer') || divisionName === 'general' || divisionName === '';

    // Restrict patrol/incident to Security division
    if (act.id === 'patrol-scan' || act.id === 'patrol-lapor' || act.id === 'patrol-mutasi' || act.id === 'patrol-handover' || act.id === 'incident-report') {
      return isSecurityDiv;
    }
    
    // Restrict WFH/Hybrid work geofence, Booking facilities, and Rencana Kerja to Office/IT/General
    if (act.id === 'home-address' || act.id === 'booking' || act.id === 'task-plan') {
      return isOfficeDiv;
    }
    
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6"
    >
      {/* Greeting Card */}
      <div className="glass-panel p-6 rounded-[32px] border-t border-[var(--aurora-1)]/30 shadow-[0_10px_40px_rgba(142,45,226,0.15)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--aurora-1)] rounded-full blur-[80px] opacity-20"></div>
        <h2 className="text-2xl font-serif font-bold text-[var(--text-primary)] tracking-wide">{t('Selamat datang kembali,')} <br /><span className="text-[var(--aurora-3)]">{user?.full_name?.split(' ')[0] || 'Alexander'}!</span></h2>
        <p className="text-[var(--text-secondary)] text-sm mt-1 font-sans">{user?.position || 'Software Engineer'} • Divisi {user?.division || 'Frontend'}</p>

        <div className="mt-6 flex items-center gap-3 bg-[var(--text-primary)]/5 border border-[var(--text-primary)]/10 p-3 rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-[var(--aurora-1)]/20 text-[var(--aurora-1)] flex items-center justify-center">
            <Zap size={20} className="drop-shadow-[0_0_10px_var(--aurora-1)]" />
          </div>
          <div>
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest font-bold opacity-60">{t('Status Kehadiran')}</p>
            <p className="font-bold text-[var(--text-primary)] text-sm">{t('Aktif • Sesuai Jadwal')}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-panel p-5 rounded-3xl flex flex-col items-center text-center justify-center gap-2 border border-[var(--text-primary)]/5 hover:border-[var(--aurora-3)]/50 transition-all group">
          <div className="text-[var(--aurora-3)] bg-[var(--aurora-3)]/10 p-3 rounded-2xl group-hover:scale-110 transition-transform">
            <Clock size={24} />
          </div>
          <h3 className="text-2xl font-bold text-[var(--text-primary)] mt-1">{stats?.weeklyHours || 0}h</h3>
          <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest font-bold opacity-60">{t('Jam kerja minggu ini')}</p>
        </div>

        <div className="glass-panel p-5 rounded-3xl flex flex-col items-center text-center justify-center gap-2 border border-[var(--text-primary)]/5 hover:border-[var(--aurora-1)]/50 transition-all group">
          <div className="text-[var(--aurora-1)] bg-[var(--aurora-1)]/10 p-3 rounded-2xl group-hover:scale-110 transition-transform">
            <Calendar size={24} />
          </div>
          <h3 className="text-2xl font-bold text-[var(--text-primary)] mt-1">{leaveBalance ? leaveBalance.total_days - leaveBalance.used_days : stats?.leaveBalance || 0}</h3>
          <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest font-bold opacity-60">{t('Sisa cuti')} {leaveBalance ? `(${leaveBalance.used_days} ${t('terpakai')})` : ''}</p>
        </div>
      </div>

      {/* QUICK ACTIONS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-2">
        {activeActions.map(act => (
          <ActionButton key={act.id} icon={act.icon} label={act.label} color={act.color} onClick={() => onAction(act.id)} />
        ))}
      </div>

      {/* ANNOUNCEMENTS SECTION */}
      {announcements.length > 0 && (
        <div className="glass-panel p-6 rounded-[32px] border border-[var(--aurora-1)]/30 relative overflow-hidden bg-gradient-to-br from-[var(--aurora-1)]/5 to-transparent">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--aurora-1)]/20 text-[var(--aurora-1)] flex items-center justify-center animate-pulse">
              <Megaphone size={20} />
            </div>
            <h3 className="font-serif text-lg text-white font-bold tracking-tight">{t('Pusat Pengumuman')}</h3>
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

      {/* UPCOMING HOLIDAYS */}
      {upcomingHolidays.length > 0 && (
        <div className="glass-panel p-5 rounded-[32px] border border-[var(--warning)]/20 bg-gradient-to-br from-[var(--warning)]/5 to-transparent">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Sun size={16} className="text-[var(--warning)]" /> Hari Libur Mendatang</h3>
          <div className="space-y-2">
            {upcomingHolidays.map(h => {
              const d = new Date(h.date);
              const daysLeft = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
              return (
                <div key={h.id} className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <div className="text-center w-10"><p className="text-sm font-bold text-white">{d.getDate()}</p><p className="text-[8px] text-gray-500 uppercase">{d.toLocaleDateString('id-ID', { month: 'short' })}</p></div>
                    <div><p className="text-xs font-bold text-white">{h.name}</p><p className="text-[9px] text-gray-500">{h.type}</p></div>
                  </div>
                  <span className={`text-[9px] font-bold ${daysLeft <= 3 ? 'text-[var(--danger)]' : daysLeft <= 7 ? 'text-[var(--warning)]' : 'text-gray-500'}`}>{daysLeft === 0 ? 'Hari ini!' : `${daysLeft} hari lagi`}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* BIRTHDAYS THIS MONTH */}
      {anniversaryData.length > 0 && (
        <div className="glass-panel p-5 rounded-[32px] border border-[var(--aurora-1)]/20">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Calendar size={16} className="text-[var(--aurora-1)]" /> Ulang Tahun Bulan Ini</h3>
          <div className="flex flex-wrap gap-2">
            {anniversaryData.map(e => (
              <div key={e.id} className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-full border border-white/5">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center text-[8px] font-bold text-white">{e.full_name?.charAt(0)}</div>
                <span className="text-[10px] text-gray-300">{e.full_name?.split(' ')[0]}</span>
                {e.position && <span className="text-[8px] text-gray-500">• {e.position}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Company Information Card (REPLACED SALARY ESTIMATE) */}
      <div className="glass-panel p-6 rounded-[32px] border border-white/5 relative overflow-hidden bg-gradient-to-br from-white/[0.02] to-transparent">
        <div className="flex justify-between items-center gap-2 mb-6">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[var(--aurora-3)]/10 text-[var(--aurora-3)] flex items-center justify-center shrink-0">
              <TrendingUp size={16} />
            </div>
            <h3 className="font-serif text-sm sm:text-lg text-white font-bold tracking-tight">{t('Informasi Perusahaan')}</h3>
          </div>
          <div className="px-2.5 py-0.5 rounded-full bg-[var(--success)]/10 border border-[var(--success)]/30 shrink-0">
            <span className="text-[7.5px] font-black text-[var(--success)] uppercase tracking-wider">{t('Terhubung')}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          <InfoRow icon={<Clock />} label={t('Jam Kerja Standar')} value={companyInfo?.workHours || '08:00 - 17:00'} color="var(--aurora-3)" />
          <InfoRow icon={<Calendar />} label={t('Hari Kerja Efektif')} value={companyInfo?.workDays || 'Senin - Jumat'} color="var(--aurora-1)" />
          <InfoRow icon={<Zap />} label={t('Toleransi Keterlambatan')} value={companyInfo?.gracePeriod || '15 Menit'} color="var(--warning)" />
        </div>

        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
          <p className="text-[9px] text-gray-600 uppercase font-black tracking-[0.2em]">{t('Tenant:')} {companyInfo?.tenantName || 'PT. Perusahaan'}</p>
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-[var(--success)] animate-pulse" />
            <span className="text-[8px] text-[var(--success)] font-bold uppercase">{t('Sistem Online')}</span>
          </div>
        </div>
      </div>

    </motion.div>
  );
};

// --- SUB-COMPONENTS ---
const InfoRow = ({ icon, label, value, color }) => (
  <div className="flex items-center gap-4 group">
    <div className="w-8 h-8 rounded-lg bg-[var(--text-primary)]/5 flex items-center justify-center transition-all group-hover:scale-110" style={{ color }}>
      {React.cloneElement(icon, { size: 16, className: 'opacity-80' })}
    </div>
    <div className="flex-1">
      <p className="text-[9px] text-[var(--text-secondary)] uppercase tracking-widest font-bold opacity-60">{label}</p>
      <p className="text-xs font-bold text-[var(--text-primary)] tracking-wide">{value}</p>
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
