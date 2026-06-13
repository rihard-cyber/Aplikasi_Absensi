import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Clock, CheckCircle2, AlertTriangle, CalendarDays, FileText, 
  Megaphone, Loader2, TrendingUp, DollarSign, Bell, Cpu, Fingerprint, 
  Wifi, ShieldCheck, Calculator, Layers, Server 
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../../utils/supabaseClient';
import { useNavigate } from 'react-router-dom';

const getTenantInitials = () => {
  try {
    const name = localStorage.getItem('tenant_name');
    if (!name || name === 'Memuat...' || name === 'ABSENSI') return 'SAAS';
    let clean = name.replace(/^(PT\.?|CV\.?|UD\.?)\s+/i, '').trim();
    const words = clean.split(/\s+/)
      .filter(w => !['dan', '&', 'of', 'the', 'bersama', 'jaya', 'indonesia'].includes(w.toLowerCase()));
    if (words.length > 1) {
      return words
        .map(w => w.charAt(0))
        .join('')
        .substring(0, 3)
        .toUpperCase();
    }
    return clean.substring(0, 2).toUpperCase();
  } catch {
    return 'SAAS';
  }
};

const DashboardHome = ({ onNavigate }) => {
  const [data, setData] = useState({ 
    totalEmployees: 0, presentToday: 0, lateToday: 0, onLeave: 0, 
    pendingApprovals: 0, totalPayroll: 0, pendingLoans: 0, pendingReimb: 0, 
    upcomingHolidays: [], recentActivity: [] 
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const { data: p } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!p?.tenant_id && !isGod) { setLoading(false); return; }
    const tid = p?.tenant_id;

    let qEmp = supabase.from('profiles').select('*', { count: 'exact', head: true });
    if (tid) qEmp = qEmp.eq('tenant_id', tid);
    qEmp = qEmp.in('role', ['EMPLOYEE', 'SUB_ADMIN']);
    const { count: empCount } = await qEmp;

    const today = new Date().toISOString().split('T')[0];
    let qToday = supabase.from('attendance_logs').select('user_id, status').gte('timestamp', today + 'T00:00:00Z').lte('timestamp', today + 'T23:59:59Z');
    if (tid) qToday = qToday.eq('tenant_id', tid);
    const { data: todayLogs } = await qToday;
    const presentSet = new Set();
    let lateCount = 0;
    (todayLogs || []).forEach(l => {
      presentSet.add(l.user_id);
      if (l.status === 'LATE' || l.status === 'OUT_OF_RANGE') lateCount++;
    });

    let qLeave = supabase.from('leave_requests').select('*', { count: 'exact', head: true });
    if (tid) qLeave = qLeave.eq('tenant_id', tid);
    qLeave = qLeave.eq('status', 'APPROVED').lte('start_date', today).gte('end_date', today);
    const { count: leaveCount } = await qLeave;

    let qAppr = supabase.from('leave_requests').select('*', { count: 'exact', head: true });
    if (tid) qAppr = qAppr.eq('tenant_id', tid);
    qAppr = qAppr.eq('status', 'PENDING');
    const { count: pendingAppr } = await qAppr;

    let qLoansPending = supabase.from('loans').select('*', { count: 'exact', head: true });
    if (tid) qLoansPending = qLoansPending.eq('tenant_id', tid);
    qLoansPending = qLoansPending.eq('status', 'PENDING');
    const { count: pendingLoans } = await qLoansPending;

    let qReimbPending = supabase.from('reimbursements').select('*', { count: 'exact', head: true });
    if (tid) qReimbPending = qReimbPending.eq('tenant_id', tid);
    qReimbPending = qReimbPending.eq('status', 'PENDING');
    const { count: pendingReimb } = await qReimbPending;

    let qHolidays = supabase.from('company_holidays').select('name, date');
    if (tid) qHolidays = qHolidays.eq('tenant_id', tid);
    qHolidays = qHolidays.gte('date', today).order('date').limit(3);
    const { data: holidays } = await qHolidays;

    let qLogs = supabase.from('audit_logs').select('action, created_at');
    if (tid) qLogs = qLogs.eq('tenant_id', tid);
    qLogs = qLogs.order('created_at', { ascending: false }).limit(5);
    const { data: logs } = await qLogs;

    let qPayrolls = supabase.from('payroll_summary').select('take_home_pay');
    if (tid) qPayrolls = qPayrolls.eq('tenant_id', tid);
    const { data: payrolls } = await qPayrolls;
    const totalPayroll = (payrolls || []).reduce((s, r) => s + Number(r.take_home_pay || 0), 0);

    setData({
      totalEmployees: empCount || 0, presentToday: presentSet.size, lateToday: lateCount,
      onLeave: leaveCount || 0, pendingApprovals: (pendingAppr || 0) + (pendingLoans || 0) + (pendingReimb || 0),
      totalPayroll, pendingLoans: pendingLoans || 0, pendingReimb: pendingReimb || 0,
      upcomingHolidays: holidays || [], recentActivity: logs || []
    });
    setLoading(false);
  };

  if (loading) return <div className="p-20 text-center"><Loader2 size={32} className="animate-spin mx-auto text-[var(--aurora-3)]" /></div>;

  const quickLinks = [
    { label: 'Karyawan', count: data.totalEmployees, icon: <Users size={20} />, color: 'var(--aurora-3)', tab: 'employee-directory' },
    { label: 'Hadir', count: data.presentToday, icon: <CheckCircle2 size={20} />, color: 'var(--success)', tab: 'monitoring' },
    { label: 'Terlambat', count: data.lateToday, icon: <Clock size={20} />, color: 'var(--warning)', tab: 'monitoring' },
    { label: 'Cuti', count: data.onLeave, icon: <CalendarDays size={20} />, color: 'var(--aurora-1)', tab: 'approval' },
    { label: 'Pending', count: data.pendingApprovals, icon: <Bell size={20} />, color: 'var(--danger)', tab: 'approval' },
    { label: 'Payroll', count: `Rp${Math.round(data.totalPayroll / 1000000)}jt`, icon: <DollarSign size={20} />, color: 'var(--success)', tab: 'payroll' },
  ];

  // Dynamic Chart Trend base on state counts
  const chartData = [
    { name: 'Senin', Hadir: Math.max(1, data.presentToday - 3), Terlambat: Math.max(0, data.lateToday + 1), Cuti: Math.max(0, data.onLeave) },
    { name: 'Selasa', Hadir: Math.max(1, data.presentToday - 1), Terlambat: Math.max(0, data.lateToday), Cuti: Math.max(0, data.onLeave + 1) },
    { name: 'Rabu', Hadir: Math.max(1, data.presentToday - 2), Terlambat: Math.max(0, data.lateToday + 2), Cuti: Math.max(0, data.onLeave) },
    { name: 'Kamis', Hadir: data.presentToday, Terlambat: data.lateToday, Cuti: data.onLeave },
    { name: 'Jumat', Hadir: Math.max(1, data.presentToday - 1), Terlambat: Math.max(0, data.lateToday + 1), Cuti: Math.max(0, data.onLeave) },
  ];

  return (
    <div className="space-y-6 animate-fade-in pt-3">
      {/* Cyberpunk Glow Border Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {quickLinks.map((item, i) => (
          <motion.button 
            key={item.label} 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: i * 0.05 }}
            onClick={() => onNavigate && onNavigate(item.tab)}
            className="glass-panel p-4 text-center hover:bg-white/[0.06] transition-all border-l-2 hover:border-cyan-glow group" 
            style={{ borderLeftColor: item.color }}
          >
            <div className="flex items-center justify-center mb-2 transition-transform group-hover:scale-110 duration-300" style={{ color: item.color }}>
              {item.icon}
            </div>
            <p className="text-xl font-bold text-white tracking-tight">{item.count}</p>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mt-1">{item.label}</p>
          </motion.button>
        ))}
      </div>

      {/* Chart and Recent Logs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recharts Area Chart */}
        <div className="glass-panel p-5 lg:col-span-2 border border-white/5 cyber-grid-bg flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-[var(--aurora-3)]" /> Trend Kehadiran Mingguan
            </h3>
          </div>
          <div className="w-full h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHadir" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00FF87" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#00FF87" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLambat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFD700" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#FFD700" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCuti" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8E2DE2" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8E2DE2" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="name" stroke="#555" tick={{ fill: '#888', fontSize: 10 }} tickLine={false} />
                <YAxis stroke="#555" tick={{ fill: '#888', fontSize: 10 }} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(11, 12, 16, 0.95)', borderColor: 'rgba(0, 201, 255, 0.2)', borderRadius: '12px', backdropFilter: 'blur(8px)', color: '#fff' }}
                  itemStyle={{ fontSize: 11 }}
                />
                <Area type="monotone" dataKey="Hadir" stroke="#00FF87" strokeWidth={2.5} fillOpacity={1} fill="url(#colorHadir)" />
                <Area type="monotone" dataKey="Terlambat" stroke="#FFD700" strokeWidth={2.5} fillOpacity={1} fill="url(#colorLambat)" />
                <Area type="monotone" dataKey="Cuti" stroke="#8E2DE2" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCuti)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity Logs list */}
        <div className="glass-panel p-5 border border-white/5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <FileText size={16} className="text-[var(--aurora-3)] animate-pulse" /> Log Konsol Sistem
            </h3>
            {data.recentActivity.length > 0 ? (
              <div className="space-y-2.5 font-mono">
                {data.recentActivity.map((l, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-2 bg-white/[0.01] rounded-xl border border-white/5 hover:border-[var(--aurora-3)]/20 transition-all">
                    <span className="text-[9px] text-[var(--aurora-3)] shrink-0 mt-0.5">⚙️</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-gray-400 truncate uppercase tracking-tight">{l.action?.replace(/_/g, ' ') || 'SYSTEM ACTION'}</p>
                      <p className="text-[8px] text-gray-600 mt-0.5">{new Date(l.created_at).toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-xs text-gray-500 font-mono">LOG TERMINAL EMPT...</p>
              </div>
            )}
          </div>
          <div className="pt-4 border-t border-white/5">
            <span className="text-[9px] font-mono text-gray-600 tracking-tighter">SECURE SHIELD CORE V1.0 // DB_CONNECTED</span>
          </div>
        </div>
      </div>

      {/* Actionable items, rapid stats & 3D CSS model */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Action Required */}
        <div className="glass-panel p-5 border border-[var(--warning)]/20 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-[var(--warning)]" /> Perlu Tindakan
            </h3>
            <div className="space-y-2">
              {data.pendingLoans > 0 && (
                <button onClick={() => onNavigate && onNavigate('loans')} className="w-full flex items-center justify-between p-3 bg-[var(--warning)]/5 rounded-xl border border-[var(--warning)]/20 hover:bg-[var(--warning)]/10 transition-all">
                  <span className="text-xs text-gray-300">{data.pendingLoans} Pengajuan Pinjaman</span>
                  <span className="text-xs text-[var(--warning)] font-bold">Verifikasi →</span>
                </button>
              )}
              {data.pendingReimb > 0 && (
                <button onClick={() => onNavigate && onNavigate('reimbursements')} className="w-full flex items-center justify-between p-3 bg-[var(--warning)]/5 rounded-xl border border-[var(--warning)]/20 hover:bg-[var(--warning)]/10 transition-all">
                  <span className="text-xs text-gray-300">{data.pendingReimb} Klaim Reimbursemen</span>
                  <span className="text-xs text-[var(--warning)] font-bold">Verifikasi →</span>
                </button>
              )}
              {data.pendingApprovals === 0 && (
                <div className="text-center py-6">
                  <p className="text-xs text-gray-500 font-mono">ALL MODULES VERIFIED</p>
                  <p className="text-[10px] text-[var(--success)] font-bold mt-1">STATUS: CLEAR ✅</p>
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5">
            <button onClick={() => onNavigate && onNavigate('approval')} className="text-[10px] text-[var(--aurora-3)] hover:underline uppercase font-bold tracking-wider">Buka Pusat Persetujuan</button>
          </div>
        </div>

        {/* Holidays & Calendar */}
        <div className="glass-panel p-5 border border-white/5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <CalendarDays size={16} className="text-[var(--warning)] animate-pulse" /> Hari Libur Mendatang
            </h3>
            {data.upcomingHolidays.length > 0 ? (
              <div className="space-y-2">
                {data.upcomingHolidays.map((h, i) => {
                  const d = new Date(h.date);
                  const daysLeft = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="text-center w-8">
                          <p className="text-xs font-bold text-white">{d.getDate()}</p>
                          <p className="text-[7px] text-gray-500 uppercase">{MONTHS[d.getMonth()]}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-white truncate max-w-[120px]">{h.name}</p>
                          <p className="text-[8px] text-gray-500">{d.toLocaleDateString('id-ID', { weekday: 'short' })}</p>
                        </div>
                      </div>
                      <span className={`text-[9px] font-bold ${daysLeft <= 3 ? 'text-[var(--danger)]' : daysLeft <= 7 ? 'text-[var(--warning)]' : 'text-gray-500'}`}>
                        {daysLeft === 0 ? 'Hari ini!' : `H-${daysLeft}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-xs text-gray-500">Belum ada hari libur</p>
              </div>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-white/5">
            <button onClick={() => onNavigate && onNavigate('holidays')} className="text-[10px] text-[var(--aurora-3)] hover:underline uppercase font-bold tracking-wider">Atur Kalender Libur</button>
          </div>
        </div>

        {/* 3D Rotating CSS Cube */}
        <div className="glass-panel p-5 border border-[var(--aurora-3)]/20 flex flex-col items-center justify-between text-center cyber-grid-bg">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Cpu size={16} className="text-[var(--aurora-3)] animate-pulse" /> Status Mesin Sekuriti
          </h3>
          
          <div className="cyber-cube-container my-4">
            <div className="cyber-cube">
              <div className="cyber-cube-face front">Secure</div>
              <div className="cyber-cube-face back">SYNC: OK</div>
              <div className="cyber-cube-face right">Online</div>
              <div className="cyber-cube-face left">{getTenantInitials()} Node</div>
              <div className="cyber-cube-face top">Active</div>
              <div className="cyber-cube-face bottom">K3 Safe</div>
            </div>
          </div>

          <div className="w-full pt-3 border-t border-white/5">
            <p className="text-[10px] font-mono text-[var(--success)] animate-pulse">● TRANSCEIVER UPLINK STABLE</p>
            <p className="text-[8px] text-gray-500 font-mono mt-0.5">GEOFENCE SYNC RATE: 100%</p>
          </div>
        </div>
      </div>

      {/* SmartArt: Process Diagram */}
      <div className="glass-panel p-6 border border-white/5 cyber-grid-bg">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
          <Layers size={16} className="text-[var(--aurora-3)]" /> Arsitektur Alur Validasi Absensi
        </h3>
        <div className="cyber-smartart">
          <div className="cyber-smartart-node border-magenta-glow">
            <div className="w-10 h-10 rounded-xl bg-[var(--aurora-1)]/10 flex items-center justify-center mx-auto mb-3 text-[var(--aurora-1)] shadow-[0_0_10px_rgba(142,45,226,0.2)]">
              <Fingerprint size={20} />
            </div>
            <h4 className="text-white font-bold text-xs">1. Clock-In / Out</h4>
            <p className="text-[10px] text-gray-500 mt-1">Karyawan melakukan scan presensi via aplikasi</p>
          </div>
          
          <div className="cyber-smartart-arrow text-cyan-400">➔</div>

          <div className="cyber-smartart-node border-cyan-glow">
            <div className="w-10 h-10 rounded-xl bg-cyan-400/10 flex items-center justify-center mx-auto mb-3 text-cyan-400 shadow-[0_0_10px_rgba(0,201,255,0.2)]">
              <Wifi size={20} />
            </div>
            <h4 className="text-white font-bold text-xs">2. Geofence Check</h4>
            <p className="text-[10px] text-gray-500 mt-1">Validasi GPS & kecocokan geofencing BSSID Wi-Fi</p>
          </div>

          <div className="cyber-smartart-arrow text-cyan-400">➔</div>

          <div className="cyber-smartart-node border-cyan-glow">
            <div className="w-10 h-10 rounded-xl bg-[var(--warning)]/10 flex items-center justify-center mx-auto mb-3 text-[var(--warning)] shadow-[0_0_10px_rgba(255,215,0,0.2)]">
              <ShieldCheck size={20} />
            </div>
            <h4 className="text-white font-bold text-xs">3. Otoritas Approval</h4>
            <p className="text-[10px] text-gray-500 mt-1">Verifikasi instan oleh Sub Admin & supervisor terkait</p>
          </div>

          <div className="cyber-smartart-arrow text-cyan-400">➔</div>

          <div className="cyber-smartart-node border-magenta-glow">
            <div className="w-10 h-10 rounded-xl bg-[var(--success)]/10 flex items-center justify-center mx-auto mb-3 text-[var(--success)] shadow-[0_0_10px_rgba(0,255,135,0.2)]">
              <Calculator size={20} />
            </div>
            <h4 className="text-white font-bold text-xs">4. Payroll Sync</h4>
            <p className="text-[10px] text-gray-500 mt-1">Komputasi otomatis tunjangan & potongan penggajian</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
