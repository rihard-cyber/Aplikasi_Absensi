import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Clock, CheckCircle2, AlertTriangle, CalendarDays, FileText, Megaphone, Loader2, TrendingUp, DollarSign, Bell } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useNavigate } from 'react-router-dom';

const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

const DashboardHome = ({ onNavigate }) => {
  const [data, setData] = useState({ totalEmployees: 0, presentToday: 0, lateToday: 0, onLeave: 0, pendingApprovals: 0, totalPayroll: 0, pendingLoans: 0, pendingReimb: 0, upcomingHolidays: [], recentActivity: [] });
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass-panel p-6">
        <h2 className="text-2xl font-serif font-bold text-white">Dashboard</h2>
        <p className="text-sm text-gray-400 mt-1">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {quickLinks.map((item, i) => (
          <motion.button key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            onClick={() => onNavigate && onNavigate(item.tab)}
            className="glass-panel p-4 text-center hover:bg-white/[0.06] transition-all border-l-2 group" style={{ borderLeftColor: item.color }}>
            <div className="flex items-center justify-center mb-2" style={{ color: item.color }}>{item.icon}</div>
            <p className="text-xl font-bold text-white">{item.count}</p>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mt-1">{item.label}</p>
          </motion.button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-5">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <CalendarDays size={16} className="text-[var(--warning)]" /> Hari Libur Mendatang
          </h3>
          {data.upcomingHolidays.length > 0 ? (
            <div className="space-y-3">
              {data.upcomingHolidays.map((h, i) => {
                const d = new Date(h.date);
                const daysLeft = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="text-center w-10">
                        <p className="text-sm font-bold text-white">{d.getDate()}</p>
                        <p className="text-[8px] text-gray-500 uppercase">{MONTHS[d.getMonth()]}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{h.name}</p>
                        <p className="text-[9px] text-gray-500">{d.toLocaleDateString('id-ID', { weekday: 'long' })}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold ${daysLeft <= 3 ? 'text-[var(--danger)]' : daysLeft <= 7 ? 'text-[var(--warning)]' : 'text-gray-500'}`}>
                      {daysLeft === 0 ? 'Hari ini!' : `H-${daysLeft}`}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-xs text-gray-500">Belum ada hari libur</p>
              <button onClick={() => onNavigate && onNavigate('holidays')} className="mt-2 text-[10px] text-[var(--aurora-3)] hover:underline">Atur Kalendar Libur</button>
            </div>
          )}
        </div>

        <div className="glass-panel p-5">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <FileText size={16} className="text-[var(--aurora-3)]" /> Aktivitas Terkini
          </h3>
          {data.recentActivity.length > 0 ? (
            <div className="space-y-2">
              {data.recentActivity.map((l, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 bg-white/[0.02] rounded-xl border border-white/5">
                  <div className="w-2 h-2 rounded-full bg-[var(--aurora-3)]" />
                  <p className="text-[10px] text-gray-400 flex-1">{l.action?.replace(/_/g, ' ') || 'Unknown'}</p>
                  <span className="text-[9px] text-gray-600">{new Date(l.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-xs text-gray-500">Belum ada aktivitas</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-5 border border-[var(--warning)]/20">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-[var(--warning)]" /> Perlu Tindakan
          </h3>
          <div className="space-y-2">
            {data.pendingLoans > 0 && (
              <button onClick={() => onNavigate && onNavigate('loans')} className="w-full flex items-center justify-between p-3 bg-[var(--warning)]/5 rounded-xl border border-[var(--warning)]/20 hover:bg-[var(--warning)]/10 transition-colors">
                <span className="text-xs text-gray-300">{data.pendingLoans} pengajuan pinjaman</span>
                <span className="text-xs text-[var(--warning)] font-bold">Pending →</span>
              </button>
            )}
            {data.pendingReimb > 0 && (
              <button onClick={() => onNavigate && onNavigate('reimbursements')} className="w-full flex items-center justify-between p-3 bg-[var(--warning)]/5 rounded-xl border border-[var(--warning)]/20 hover:bg-[var(--warning)]/10 transition-colors">
                <span className="text-xs text-gray-300">{data.pendingReimb} klaim reimbursemen</span>
                <span className="text-xs text-[var(--warning)] font-bold">Pending →</span>
              </button>
            )}
            {data.pendingApprovals === 0 && <p className="text-xs text-gray-500 text-center py-4">Semua sudah diproses ✅</p>}
          </div>
        </div>

        <div className="glass-panel p-5 border border-[var(--aurora-3)]/20">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-[var(--aurora-3)]" /> Ringkasan Cepat
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-white">{data.totalEmployees}</p>
              <p className="text-[9px] text-gray-500 uppercase tracking-widest">Total Karyawan</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-[var(--success)]">{data.presentToday}</p>
              <p className="text-[9px] text-gray-500 uppercase tracking-widest">Hadir Hari Ini</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-[var(--danger)]">{data.lateToday}</p>
              <p className="text-[9px] text-gray-500 uppercase tracking-widest">Terlambat</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-[var(--aurora-1)]">{data.onLeave}</p>
              <p className="text-[9px] text-gray-500 uppercase tracking-widest">Sedang Cuti</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
