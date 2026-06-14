import React, { useState, useEffect } from 'react';
import { 
  Users, Activity, Camera, Calendar, Download, Upload, 
  Search, Filter, CheckCircle2, XCircle, ChevronLeft, 
  MoreVertical, ArrowLeftRight, ShieldAlert, Zap,
  BarChart3, Clock, AlertTriangle, FileSpreadsheet,
  ShieldCheck, CheckSquare, Eye, Trash2, Network, Building2,
  Loader2, LogOut, Home, UserCheck, DollarSign, ClipboardList, Bell
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { downloadCSV } from '../../utils/downloadUtil';
import { useToast } from '../../components/Toast';
import { registerBackHandler } from '../../utils/navigation';
import ThemeToggle from '../../components/ThemeToggle';
import GlobalHeader from '../../components/GlobalHeader';
import DeveloperWatermark from '../../components/DeveloperWatermark';
import DeveloperWatermarkBackground from '../../components/DeveloperWatermarkBackground';
import { useNotifications } from '../../components/Notifications';
import BottomNav from '../../components/BottomNav';

const subAdminBottomNavItems = [
  { id: 'monitor', label: 'Monitor', icon: Activity },
  { id: 'approval', label: 'Persetujuan', icon: CheckCircle2 },
  { id: 'employees', label: 'Karyawan', icon: Users },
  { id: 'reports', label: 'Laporan', icon: BarChart3 }
];

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

const SubAdminDashboard = ({ isEmbedded = false, initialTab = 'monitor', onCycleRole, onGodModeReturn }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const { unreadCount, setShowPanel } = useNotifications();
  const [activeTab, setActiveTab] = useState(() => {
    try { return sessionStorage.getItem('subadmin_active_tab') || initialTab; } catch { return initialTab; }
  });

  // Handle layer-by-layer back button
  useEffect(() => {
    const unregister = registerBackHandler(() => {
      if (activeTab !== 'monitor') {
        setActiveTab('monitor');
        return true;
      }
      return false;
    });
    return unregister;
  }, [activeTab]);
  const [isChecking, setIsChecking] = useState(true);
  const [myTenantId, setMyTenantId] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isGod, setIsGod] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [accessLevel, setAccessLevel] = useState('full'); // 'full' | 'limited'

  // --- Data states ---
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [attLoading, setAttLoading] = useState(false);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [pendingLoans, setPendingLoans] = useState([]);
  const [pendingReimb, setPendingReimb] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [empSearch, setEmpSearch] = useState('');
  const [empLoading, setEmpLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, present: 0, late: 0, leave: 0 });

  useEffect(() => {
    try { sessionStorage.setItem('subadmin_active_tab', activeTab); } catch {}
  }, [activeTab]);

  useEffect(() => {
    const isG = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
    const isI = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true' || localStorage.getItem('original_role') !== null; } catch { return false; } })();
    setIsGod(isG);
    setIsImpersonating(isI);
    fetchAuth();
  }, []);

  useEffect(() => { if (isAuthorized && isChecking === false) { fetchToday(); fetchPending(); fetchEmployees(); fetchStats(); } }, [isAuthorized, isChecking]);

  const fetchAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setIsChecking(false); return; }
      const { data: prof } = await supabase.from('profiles')
        .select('role, operational_access, tenant_id')
        .eq('auth_id', session.user.id)
        .maybeSingle();
      if (prof) {
        const role = prof.role?.toUpperCase();
        const isLimited = role === 'EMPLOYEE' && prof.operational_access;
        const authOk = isEmbedded || ['SUPER_ADMIN', 'TENANT_ADMIN', 'SUB_ADMIN'].includes(role) || isLimited;
        if (!authOk) {
          navigate('/');
          return;
        }
        setAccessLevel(isLimited ? 'limited' : 'full');
        setMyTenantId(prof.tenant_id);
        setIsAuthorized(true);
      } else if (isGod) {
        setIsAuthorized(true);
      }
    } catch (e) { console.error(e); }
    finally { setIsChecking(false); }
  };

  const tid = myTenantId;

  const fetchToday = async () => {
    setAttLoading(true);
    const today = new Date().toISOString().split('T')[0];
    let q = supabase.from('attendance_logs')
      .select('user_id, status, timestamp, profiles!inner(full_name, nip, position, division_id, divisions(name))')
      .gte('timestamp', today + 'T00:00:00Z')
      .lte('timestamp', today + 'T23:59:59Z')
      .order('timestamp', { ascending: false });
    if (tid) q = q.eq('tenant_id', tid);
    const { data } = await q;
    setTodayAttendance(data || []);
    setAttLoading(false);
  };

  const fetchPending = async () => {
    let ql = supabase.from('leave_requests').select('*, profiles!inner(full_name, nip)').eq('status', 'PENDING').order('created_at');
    if (tid) ql = ql.eq('tenant_id', tid);
    const { data: leaves } = await ql;
    setPendingLeaves(leaves || []);

    let qln = supabase.from('loans').select('*, profiles!inner(full_name, nip)').eq('status', 'PENDING').order('created_at');
    if (tid) qln = qln.eq('tenant_id', tid);
    const { data: loans } = await qln;
    setPendingLoans(loans || []);

    let qr = supabase.from('reimbursements').select('*, profiles!inner(full_name, nip)').eq('status', 'PENDING').order('created_at');
    if (tid) qr = qr.eq('tenant_id', tid);
    const { data: reimb } = await qr;
    setPendingReimb(reimb || []);
  };

  const fetchEmployees = async () => {
    setEmpLoading(true);
    let q = supabase.from('profiles')
      .select('id, full_name, nip, position, role, divisions(name), projects(name), operational_access, attendance_access')
      .in('role', ['EMPLOYEE', 'SUB_ADMIN'])
      .order('full_name');
    if (tid) q = q.eq('tenant_id', tid);
    const { data } = await q;
    setEmployees(data || []);
    setEmpLoading(false);
  };

  const fetchStats = async () => {
    let qEmp = supabase.from('profiles').select('*', { count: 'exact', head: true }).in('role', ['EMPLOYEE', 'SUB_ADMIN']);
    if (tid) qEmp = qEmp.eq('tenant_id', tid);
    const { count: total } = await qEmp;
    const today = new Date().toISOString().split('T')[0];
    let qAtt = supabase.from('attendance_logs').select('status').gte('timestamp', today + 'T00:00:00Z').lte('timestamp', today + 'T23:59:59Z');
    if (tid) qAtt = qAtt.eq('tenant_id', tid);
    const { data: logs } = await qAtt;
    const present = (logs || []).filter(l => l.status === 'ONTIME').length;
    const late = (logs || []).filter(l => l.status === 'LATE' || l.status === 'OUT_OF_RANGE').length;
    let qLeave = supabase.from('leave_requests').select('*', { count: 'exact', head: true });
    if (tid) qLeave = qLeave.eq('tenant_id', tid);
    qLeave = qLeave.eq('status', 'APPROVED').lte('start_date', today).gte('end_date', today);
    const { count: leave } = await qLeave;
    setStats({ total: total || 0, present, late, leave: leave || 0 });
  };

  const exportAttendance = async () => {
    setAttLoading(true);
    const today = new Date().toISOString().split('T')[0];
    let q = supabase.from('attendance_logs')
      .select('timestamp, status, profiles!inner(full_name, nip, position, divisions(name))')
      .gte('timestamp', today + 'T00:00:00Z')
      .lte('timestamp', today + 'T23:59:59Z')
      .order('timestamp', { ascending: false });
    if (tid) q = q.eq('tenant_id', tid);
    const { data, error } = await q;
    if (error) { toast('Gagal memuat data', 'error'); setAttLoading(false); return; }
    const rows = (data || []).map(r => ({
      Nama: r.profiles?.full_name || '',
      NIK: r.profiles?.nip || '',
      Jabatan: r.profiles?.position || '',
      Divisi: r.profiles?.divisions?.name || '',
      Jam: new Date(r.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      Status: r.status === 'ONTIME' ? 'Tepat Waktu' : r.status === 'LATE' ? 'Terlambat' : r.status
    }));
    downloadCSV(rows, 'absensi');
    setAttLoading(false);
    toast('Download berhasil', 'success');
  };

  const exportPayroll = async () => {
    let q = supabase.from('payroll_periods').select('id, period_month, period_year').in('status', ['LOCKED', 'PAID']).order('period_year', { ascending: false }).order('period_month', { ascending: false }).limit(1);
    if (tid) q = q.eq('tenant_id', tid);
    const { data: periods } = await q;
    if (!periods?.length) { toast('Belum ada periode payroll terkunci', 'info'); return; }
    const period = periods[0];
    let qs = supabase.from('payroll_summary').select('take_home_pay, total_allowance, total_deduction, total_days_worked, total_late_minutes, profiles!inner(full_name, nip, position)').eq('period_id', period.id);
    if (tid) qs = qs.eq('profiles.tenant_id', tid);
    const { data: sum } = await qs;
    if (!sum?.length) { toast('Data payroll kosong', 'info'); return; }
    const rows = sum.map((s, i) => ({
      No: i + 1,
      Nama: s.profiles?.full_name || '',
      NIP: s.profiles?.nip || '',
      Posisi: s.profiles?.position || '',
      Tunjangan: Number(s.total_allowance).toLocaleString('id-ID'),
      Potongan: Number(s.total_deduction).toLocaleString('id-ID'),
      'Take Home Pay': Number(s.take_home_pay).toLocaleString('id-ID'),
      'Hari Kerja': s.total_days_worked || 0,
      'Terlambat (menit)': s.total_late_minutes || 0,
    }));
    downloadCSV(rows, `payroll_${MONTHS[period.period_month - 1]}_${period.period_year}`);
    toast('Download berhasil', 'success');
  };

  const exportEmployees = async () => {
    setEmpLoading(true);
    let q = supabase.from('profiles')
      .select('full_name, nip, position, role, divisions(name), projects(name)')
      .in('role', ['EMPLOYEE', 'SUB_ADMIN'])
      .order('full_name');
    if (tid) q = q.eq('tenant_id', tid);
    const { data, error } = await q;
    if (error) { toast('Gagal memuat data', 'error'); setEmpLoading(false); return; }
    const rows = (data || []).map(r => ({
      Nama: r.full_name || '',
      NIK: r.nip || '',
      Jabatan: r.position || '',
      Divisi: r.divisions?.name || '',
      Project: r.projects?.name || '',
      Role: r.role === 'SUB_ADMIN' ? 'Sub Admin' : 'Karyawan'
    }));
    downloadCSV(rows, 'karyawan');
    setEmpLoading(false);
    toast('Download berhasil', 'success');
  };

  const handleApprove = async (table, id) => {
    const { error } = await supabase.from(table).update({ status: 'APPROVED', reviewed_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast('Gagal: ' + error.message, 'error'); return; }
    toast('Disetujui!', 'success');
    fetchPending();
  };

  const handleReject = async (table, id) => {
    const { error } = await supabase.from(table).update({ status: 'REJECTED', reviewed_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast('Gagal: ' + error.message, 'error'); return; }
    toast('Ditolak', 'info');
    fetchPending();
  };

  if (isChecking) {
    return (<div className="fixed inset-0 bg-[#0B0C10] flex items-center justify-center z-50"><div className="text-white animate-pulse">MEMVERIFIKASI...</div></div>);
  }
  if (!isAuthorized) {
    return (<div className="min-h-screen bg-[#0B0C10] flex items-center justify-center text-white">Akses Ditolak</div>);
  }

  const navItems = [
    { key: 'monitor', label: 'Monitoring', icon: <Activity size={18} /> },
    { key: 'approval', label: 'Persetujuan' + (pendingLeaves.length + pendingLoans.length + pendingReimb.length > 0 ? ` (${pendingLeaves.length + pendingLoans.length + pendingReimb.length})` : ''), icon: <CheckCircle2 size={18} /> },
    { key: 'employees', label: 'Karyawan', icon: <Users size={18} /> },
    { key: 'reports', label: 'Laporan', icon: <BarChart3 size={18} /> },
  ];

  return (
    <div id={!isEmbedded ? "main-scroll-container" : undefined} className={`min-h-screen bg-[#0B0C10] text-white flex flex-col ${isImpersonating && !isEmbedded ? 'pt-10 overflow-y-auto' : ''}`}>
      {!isEmbedded && <DeveloperWatermarkBackground theme="dark" />}
      {!isEmbedded && (
        <GlobalHeader 
          title={"PORTAL OPERASIONAL" + (accessLevel === 'limited' ? ' (TERBATAS)' : '')}
          onBack={() => {
            const role = localStorage.getItem('user_role');
            if (role === 'TENANT_ADMIN') {
              navigate('/tenantadmin');
            } else {
              navigate('/app');
            }
          }} 
        />
      )}
      {accessLevel === 'limited' && !isEmbedded && (
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 pt-2">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--warning)]/10 border border-[var(--warning)]/20 text-[var(--warning)] text-xs font-bold">
            <ShieldAlert size={14} />
            Akses Terbatas — Anda login sebagai Karyawan dengan hak Operasional
          </div>
        </div>
      )}
      <div className={`max-w-6xl mx-auto w-full flex-1 ${isEmbedded ? '' : 'p-4 sm:p-6 pb-24 lg:pb-6'}`}>

        <nav className="hidden lg:flex flex-wrap gap-2 mb-6">
          {navItems.map(item => (
            <button key={item.key} onClick={() => setActiveTab(item.key)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === item.key ? 'bg-[var(--aurora-3)]/20 text-[var(--aurora-3)] border border-[var(--aurora-3)]/30 shadow-[0_0_10px_rgba(0,201,255,0.1)]' : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10 hover:text-white'}`}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        {activeTab === 'monitor' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="glass-panel p-4 rounded-2xl border border-white/5 text-center">
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Total Karyawan</p>
              </div>
              <div className="glass-panel p-4 rounded-2xl border border-white/5 text-center">
                <p className="text-2xl font-bold text-[var(--success)]">{stats.present}</p>
                <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Hadir</p>
              </div>
              <div className="glass-panel p-4 rounded-2xl border border-white/5 text-center">
                <p className="text-2xl font-bold text-[var(--warning)]">{stats.late}</p>
                <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Terlambat</p>
              </div>
              <div className="glass-panel p-4 rounded-2xl border border-white/5 text-center">
                <p className="text-2xl font-bold text-[var(--aurora-1)]">{stats.leave}</p>
                <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Cuti</p>
              </div>
            </div>

            <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
              <div className="p-4 border-b border-white/5 flex justify-between items-center">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Absensi Hari Ini</h3>
                <button onClick={fetchToday} className="text-[10px] text-[var(--aurora-3)] hover:underline">Refresh</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead><tr className="bg-white/5 text-[9px] text-gray-500 uppercase tracking-widest"><th className="p-3 font-medium">Nama</th><th className="p-3 font-medium">NIK</th><th className="p-3 font-medium">Jam</th><th className="p-3 font-medium">Status</th></tr></thead>
                  <tbody>
                    {attLoading ? (
                      <tr><td colSpan="4" className="p-8 text-center"><Loader2 size={20} className="animate-spin mx-auto text-[var(--aurora-3)]" /></td></tr>
                    ) : todayAttendance.length === 0 ? (
                      <tr><td colSpan="4" className="p-8 text-center text-gray-500 italic">Belum ada absensi hari ini</td></tr>
                    ) : todayAttendance.map((a, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="p-3 font-bold text-white">{a.profiles?.full_name}</td>
                        <td className="p-3 text-gray-400">{a.profiles?.nip}</td>
                        <td className="p-3 text-gray-400">{new Date(a.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${a.status === 'ONTIME' ? 'bg-[var(--success)]/10 text-[var(--success)]' : a.status === 'LATE' ? 'bg-[var(--warning)]/10 text-[var(--warning)]' : 'bg-[var(--danger)]/10 text-[var(--danger)]'}`}>{a.status === 'ONTIME' ? 'Tepat' : a.status === 'LATE' ? 'Terlambat' : a.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'approval' && (
          <div className="space-y-6">
            {[{ label: 'Cuti', data: pendingLeaves, table: 'leave_requests', color: 'var(--aurora-1)' },
              { label: 'Pinjaman', data: pendingLoans, table: 'loans', color: 'var(--warning)' },
              { label: 'Reimbursemen', data: pendingReimb, table: 'reimbursements', color: 'var(--aurora-3)' }
            ].map(category => (
              <div key={category.table} className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
                <div className="p-4 border-b border-white/5">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest" style={{ color: category.color }}>{category.label} — {category.data.length} menunggu</h3>
                </div>
                {category.data.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-xs italic">Tidak ada pengajuan pending</div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {category.data.map((item, i) => (
                      <div key={i} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-white">{item.profiles?.full_name?.charAt(0)}</div>
                          <div>
                            <p className="text-xs font-bold text-white">{item.profiles?.full_name}</p>
                            <p className="text-[9px] text-gray-500">{item.profiles?.nip}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button onClick={() => handleApprove(category.table, item.id)} className="flex-1 sm:flex-none px-3 py-1.5 bg-[var(--success)]/10 text-[var(--success)] rounded-lg text-[10px] font-bold border border-[var(--success)]/20 hover:bg-[var(--success)]/20 transition-all flex items-center justify-center gap-1"><CheckCircle2 size={12} /> Setuju</button>
                          <button onClick={() => handleReject(category.table, item.id)} className="flex-1 sm:flex-none px-3 py-1.5 bg-[var(--danger)]/10 text-[var(--danger)] rounded-lg text-[10px] font-bold border border-[var(--danger)]/20 hover:bg-[var(--danger)]/20 transition-all flex items-center justify-center gap-1"><XCircle size={12} /> Tolak</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'employees' && (
          <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Direktori Karyawan ({employees.length})</h3>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                  <input type="text" placeholder="Cari nama/NIK..." value={empSearch} onChange={e => setEmpSearch(e.target.value)}
                    className="w-full bg-[#0B0C10] border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white outline-none focus:border-[var(--aurora-3)]" />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead><tr className="bg-white/5 text-[9px] text-gray-500 uppercase tracking-widest"><th className="p-3 font-medium">Nama</th><th className="p-3 font-medium">NIK</th><th className="p-3 font-medium">Posisi</th><th className="p-3 font-medium">Divisi</th><th className="p-3 font-medium">Project</th></tr></thead>
                <tbody>
                  {empLoading ? (
                    <tr><td colSpan="5" className="p-8 text-center"><Loader2 size={20} className="animate-spin mx-auto text-[var(--aurora-3)]" /></td></tr>
                  ) : employees.filter(e => e.full_name.toLowerCase().includes(empSearch.toLowerCase()) || e.nip.toLowerCase().includes(empSearch.toLowerCase())).length === 0 ? (
                    <tr><td colSpan="5" className="p-8 text-center text-gray-500 italic">Karyawan tidak ditemukan</td></tr>
                  ) : employees.filter(e => e.full_name.toLowerCase().includes(empSearch.toLowerCase()) || e.nip.toLowerCase().includes(empSearch.toLowerCase())).map((e, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="p-3 font-bold text-white">{e.full_name}</td>
                      <td className="p-3 text-gray-400">{e.nip}</td>
                      <td className="p-3 text-gray-400">{e.position || '-'}</td>
                      <td className="p-3 text-gray-400">{e.divisions?.name || '-'}</td>
                      <td className="p-3 text-gray-400">{e.projects?.name || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="glass-panel rounded-2xl border border-white/5 p-6 text-center">
              <FileSpreadsheet size={40} className="mx-auto mb-4 text-gray-600" />
              <h3 className="text-sm font-bold text-white mb-2">Ekspor Data</h3>
              <p className="text-xs text-gray-500 mb-4">Download laporan absensi dan payroll dalam format spreadsheet.</p>
              <div className="flex flex-wrap justify-center gap-3">
                <button onClick={exportAttendance} className="px-4 py-2 bg-white/5 rounded-xl text-xs font-bold border border-white/10 hover:bg-white/10 transition-all flex items-center gap-2"><Download size={14} /> Absensi</button>
                <button onClick={exportPayroll} className="px-4 py-2 bg-white/5 rounded-xl text-xs font-bold border border-white/10 hover:bg-white/10 transition-all flex items-center gap-2"><Download size={14} /> Payroll</button>
                <button onClick={exportEmployees} className="px-4 py-2 bg-white/5 rounded-xl text-xs font-bold border border-white/10 hover:bg-white/10 transition-all flex items-center gap-2"><Download size={14} /> Karyawan</button>
              </div>
            </div>

            <div className="glass-panel rounded-2xl border border-white/5 p-6 text-center">
              <BarChart3 size={40} className="mx-auto mb-4 text-gray-600" />
              <h3 className="text-sm font-bold text-white mb-2">Ringkasan Bulan Ini</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="bg-white/5 rounded-xl p-3"><p className="text-lg font-bold text-white">{stats.total}</p><p className="text-[9px] text-gray-500 uppercase mt-1">Karyawan</p></div>
                <div className="bg-white/5 rounded-xl p-3"><p className="text-lg font-bold text-[var(--success)]">{stats.present}</p><p className="text-[9px] text-gray-500 uppercase mt-1">Hadir</p></div>
                <div className="bg-white/5 rounded-xl p-3"><p className="text-lg font-bold text-[var(--warning)]">{stats.late}</p><p className="text-[9px] text-gray-500 uppercase mt-1">Terlambat</p></div>
                <div className="bg-white/5 rounded-xl p-3"><p className="text-lg font-bold text-[var(--aurora-1)]">{stats.leave}</p><p className="text-[9px] text-gray-500 uppercase mt-1">Cuti</p></div>
              </div>
            </div>
          </div>
        )}
        {!isEmbedded && (
          <footer className="app-footer pb-28 lg:pb-8 mt-8">
            <span>© 2026 <strong className="text-[var(--aurora-3)]">Portal Operasional Sub-Admin</strong>. Hak Cipta Dilindungi.</span>
            <DeveloperWatermark />
          </footer>
        )}
      </div>
      {!isEmbedded && (
        <BottomNav
          currentTab={activeTab}
          onNavClick={(tab) => setActiveTab(tab)}
          onToggleSidebar={() => {}}
          isSidebarOpen={false}
          items={subAdminBottomNavItems}
        />
      )}
    </div>
  );
};

export default SubAdminDashboard;
