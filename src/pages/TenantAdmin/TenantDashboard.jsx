import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Settings, FileText, CheckCircle, Activity, Calculator, BarChart3, ShieldCheck, Building2, Megaphone, CalendarDays, LogOut, XCircle, Upload, Fingerprint, Users, DollarSign, TrendingUp, Sun, Calendar, Star, Briefcase, Gift, ScrollText, PartyPopper, ClipboardList, QrCode, Activity as ActivityIcon, LineChart, UserCircle, Wallet, Layers, GitBranch, Landmark, ClipboardCheck, Image, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '../../components/ConfirmDialog';
import DashboardHome from './components/DashboardHome';
import CompanyProfile from './components/CompanyProfile';
import SubAdminDashboard from '../SubAdmin/SubAdminDashboard'; // Reuse monitoring components

const PayrollSettings = lazy(() => import('./components/PayrollSettings'));
const ApprovalWorkflow = lazy(() => import('./components/ApprovalWorkflow'));
const AuditTrailView = lazy(() => import('./components/AuditTrailView'));
const StructureManagement = lazy(() => import('./components/StructureManagement'));
const GeneralSettings = lazy(() => import('./components/GeneralSettings'));
const PermissionManager = lazy(() => import('./components/PermissionManager'));
const BroadcastCenter = lazy(() => import('./components/BroadcastCenter'));
const ShiftDictionary = lazy(() => import('./components/ShiftDictionary'));
const ScheduleUpload = lazy(() => import('./components/ScheduleUpload'));
const LoanManagement = lazy(() => import('./components/LoanManagement'));
const FinanceDashboard = lazy(() => import('./components/FinanceDashboard'));
const ScheduleCalendar = lazy(() => import('./components/ScheduleCalendar'));
const HolidayManagement = lazy(() => import('./components/HolidayManagement'));
const EmployeeDirectory = lazy(() => import('./components/EmployeeDirectory'));
const ReimbursementManagement = lazy(() => import('./components/ReimbursementManagement'));
const OrgChart = lazy(() => import('./components/OrgChart'));
const PerformanceAppraisal = lazy(() => import('./components/PerformanceAppraisal'));
const AssetManagement = lazy(() => import('./components/AssetManagement'));
const CompanyEvents = lazy(() => import('./components/CompanyEvents'));
const CompanyPolicies = lazy(() => import('./components/CompanyPolicies'));
const PayrollRun = lazy(() => import('./components/PayrollRun'));
const THRCalculation = lazy(() => import('./components/THRCalculation'));
const BulkImport = lazy(() => import('./components/BulkImport'));
const QRCodeManagement = lazy(() => import('./components/QRCodeManagement'));
const ActivityFeed = lazy(() => import('./components/ActivityFeed'));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));
const BankExport = lazy(() => import('./components/BankExport'));
const BannerManager = lazy(() => import('./components/BannerManager'));
const EmployeeProfileView = lazy(() => import('./components/EmployeeProfileView'));
const EmployeeSalary = lazy(() => import('./components/EmployeeSalary'));
const OnboardingChecklist = lazy(() => import('./components/OnboardingChecklist'));
const PayrollReports = lazy(() => import('./components/PayrollReports'));
const SalaryComponents = lazy(() => import('./components/SalaryComponents'));
const SalaryRevision = lazy(() => import('./components/SalaryRevision'));
const SystemConfig = lazy(() => import('./components/SystemConfig'));
const TaxReports = lazy(() => import('./components/TaxReports'));
import HRISExportWrapper from '../../components/HRISExportWrapper';
import { supabase } from '../../utils/supabaseClient';

const TenantDashboard = ({ onGodModeReturn, isImpersonating, onCycleRole, onLogout }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => {
    try { return sessionStorage.getItem('tenant_active_tab') || 'home'; } catch { return 'home'; }
  });
  const [clickCount, setClickCount] = useState(0);
  const [tenantData, setTenantData] = useState({ name: 'Memuat...', logo_url: null });

  useEffect(() => {
    fetchTenantData();
  }, []);

  useEffect(() => {
    try { sessionStorage.setItem('tenant_active_tab', activeTab); } catch {}
  }, [activeTab]);

  const fetchTenantData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
      if (profile?.tenant_id) {
        const { data: tData } = await supabase.from('tenants').select('id, name, logo_url').eq('id', profile.tenant_id).maybeSingle();
        if (tData) setTenantData(tData);
      }
    } catch (e) {
      console.error("Gagal menarik data tenant", e);
    }
  };

  const handleLogoClick = () => {
    if (!isImpersonating) return;
    setClickCount(prev => prev + 1);
    if (clickCount === 1) {
      onGodModeReturn && onGodModeReturn();
      setClickCount(0);
    }
    setTimeout(() => setClickCount(0), 1000);
  };

  const handleLogout = async () => {
    const ok = await confirm('Apakah Anda yakin ingin keluar?', 'Keluar');
    if (ok) {
      supabase.auth.signOut().catch(() => {});
      if (onLogout) onLogout();
    }
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const confirm = useConfirm();

  return (
    <div className="min-h-screen bg-[var(--bg-darker)] flex text-white relative overflow-hidden">

      {/* Mobile Sidebar Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-6 right-6 z-[100] w-12 h-12 rounded-2xl bg-[var(--aurora-3)]/20 border border-[var(--aurora-3)]/40 flex items-center justify-center text-[var(--aurora-3)] shadow-[0_0_20px_rgba(0,201,255,0.2)] backdrop-blur-md"
      >
        {isSidebarOpen ? <XCircle size={24} /> : <Settings size={24} />}
      </button>

      {/* Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[var(--aurora-1)] rounded-full blur-[150px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[var(--aurora-3)] rounded-full blur-[150px]"></div>
      </div>

      {/* Sidebar - Glassmorphism */}
      <aside className={`
        fixed lg:relative top-0 left-0 z-[90] h-full lg:h-[calc(100vh-32px)] w-[85vw] max-w-sm lg:w-72 m-0 lg:m-4 
        transition-all duration-500 ease-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full glass-panel border-r border-white/5 p-6 flex flex-col gap-2 rounded-none lg:rounded-3xl">
          <div className="mb-8 lg:mb-10 px-2 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#1A1C23] border border-white/10 flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(0,201,255,0.1)]">
              {tenantData.logo_url ? (
                <img src={tenantData.logo_url} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <span className="text-[var(--aurora-3)] font-bold">{tenantData.name?.charAt(0)}</span>
              )}
            </div>
            <h2 
              className={`font-serif text-[14px] leading-tight tracking-wide bg-clip-text text-transparent bg-gradient-to-r ${(() => { try { return sessionStorage.getItem('god_key') === 'DEWA-999' || isImpersonating; } catch { return isImpersonating; } })() ? 'from-[var(--danger)] to-[var(--warning)] cursor-pointer active:scale-95' : 'from-white to-gray-400'}`}
              onClick={() => {
                try {
                  if (sessionStorage.getItem('god_key') === 'DEWA-999' && onCycleRole) onCycleRole();
                  else if (isImpersonating && onGodModeReturn) onGodModeReturn();
                } catch {}
              }}
              title={(isImpersonating) ? "Klik untuk Pindah Dasbor" : ""}
            >
              {tenantData.name} {(() => { try { return sessionStorage.getItem('god_key') === 'DEWA-999' || isImpersonating; } catch { return isImpersonating; } })() && <span className="text-[10px] ml-1 block text-[var(--danger)] font-black opacity-80">(God Mode)</span>}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-2 min-h-0">
            <button
              onClick={() => { setActiveTab('profile'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'profile' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Building2 size={20} /> <span className="font-medium tracking-wide text-sm">Profil Perusahaan</span>
            </button>

            <button
              onClick={() => { setActiveTab('home'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'home' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <BarChart3 size={20} /> <span className="font-medium tracking-wide text-sm">Dashboard</span>
            </button>

            <button
              onClick={() => { setIsSidebarOpen(false); navigate('/'); }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-gray-400 hover:bg-[var(--success)]/10 hover:text-[var(--success)] border border-dashed border-white/5 hover:border-[var(--success)]/30"
            >
              <Fingerprint size={20} /> <span className="font-medium tracking-wide text-sm">Absensi Saya</span>
            </button>

            <button
              onClick={() => { setActiveTab('employee-directory'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'employee-directory' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Users size={20} /> <span className="font-medium tracking-wide text-sm">Direktori Karyawan</span>
            </button>

            <button
              onClick={() => { setActiveTab('monitoring'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'monitoring' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <BarChart3 size={20} /> <span className="font-medium tracking-wide text-sm">Monitoring Global</span>
            </button>
            <button
              onClick={() => { setActiveTab('structure'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'structure' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Building2 size={20} /> <span className="font-medium tracking-wide text-sm">Manajemen Struktur</span>
            </button>
            <button
              onClick={() => { setActiveTab('shift'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'shift' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <CalendarDays size={20} /> <span className="font-medium tracking-wide text-sm">Kamus Shift</span>
            </button>
            <button
              onClick={() => { setActiveTab('schedule'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'schedule' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Upload size={20} /> <span className="font-medium tracking-wide text-sm">Upload Jadwal</span>
            </button>
            <button
              onClick={() => { setActiveTab('approval'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'approval' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <ShieldCheck size={20} /> <span className="font-medium tracking-wide text-sm">Pusat Persetujuan</span>
            </button>
            <button
              onClick={() => { setActiveTab('loans'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'loans' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <DollarSign size={20} /> <span className="font-medium tracking-wide text-sm">Manajemen Pinjaman</span>
            </button>
            <button
              onClick={() => { setActiveTab('reimbursements'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'reimbursements' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <FileText size={20} /> <span className="font-medium tracking-wide text-sm">Reimbursemen</span>
            </button>
            <button
              onClick={() => { setActiveTab('finance'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'finance' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <TrendingUp size={20} /> <span className="font-medium tracking-wide text-sm">Dashboard Keuangan</span>
            </button>
            <button
              onClick={() => { setActiveTab('schedule-calendar'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'schedule-calendar' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Calendar size={20} /> <span className="font-medium tracking-wide text-sm">Kalender Jadwal</span>
            </button>
            <button
              onClick={() => { setActiveTab('holidays'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'holidays' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Sun size={20} /> <span className="font-medium tracking-wide text-sm">Kalendar Libur</span>
            </button>
            <button
              onClick={() => { setActiveTab('org-chart'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'org-chart' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Briefcase size={20} /> <span className="font-medium tracking-wide text-sm">Bagan Organisasi</span>
            </button>
            <button
              onClick={() => { setActiveTab('performance'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'performance' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Star size={20} /> <span className="font-medium tracking-wide text-sm">Penilaian Kinerja</span>
            </button>
            <button
              onClick={() => { setActiveTab('activity-feed'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'activity-feed' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <ActivityIcon size={20} /> <span className="font-medium tracking-wide text-sm">Umpan Aktivitas</span>
            </button>
            <button
              onClick={() => { setActiveTab('analytics'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'analytics' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <LineChart size={20} /> <span className="font-medium tracking-wide text-sm">Dashboard Analitik</span>
            </button>
            <button
              onClick={() => { setActiveTab('employee-profile'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'employee-profile' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <UserCircle size={20} /> <span className="font-medium tracking-wide text-sm">Profil Karyawan</span>
            </button>
            <button
              onClick={() => { setActiveTab('onboarding'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'onboarding' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <ClipboardCheck size={20} /> <span className="font-medium tracking-wide text-sm">Checklist Onboarding</span>
            </button>
            <button
              onClick={() => { setActiveTab('assets'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'assets' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <ClipboardList size={20} /> <span className="font-medium tracking-wide text-sm">Manajemen Aset</span>
            </button>
            <button
              onClick={() => { setActiveTab('events'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'events' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <PartyPopper size={20} /> <span className="font-medium tracking-wide text-sm">Acara Perusahaan</span>
            </button>
            <button
              onClick={() => { setActiveTab('policies'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'policies' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <ScrollText size={20} /> <span className="font-medium tracking-wide text-sm">Kebijakan Perusahaan</span>
            </button>
            <button
              onClick={() => { setActiveTab('payroll'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'payroll' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Calculator size={20} /> <span className="font-medium tracking-wide text-sm">Penggajian & Pajak</span>
            </button>
            <button
              onClick={() => { setActiveTab('salary-components'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'salary-components' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Layers size={20} /> <span className="font-medium tracking-wide text-sm">Komponen Gaji</span>
            </button>
            <button
              onClick={() => { setActiveTab('salary-revision'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'salary-revision' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <GitBranch size={20} /> <span className="font-medium tracking-wide text-sm">Revisi Gaji</span>
            </button>
            <button
              onClick={() => { setActiveTab('employee-salary'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'employee-salary' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Wallet size={20} /> <span className="font-medium tracking-wide text-sm">Data Gaji Karyawan</span>
            </button>
            <button
              onClick={() => { setActiveTab('payroll-run'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'payroll-run' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <DollarSign size={20} /> <span className="font-medium tracking-wide text-sm">Proses Penggajian</span>
            </button>
            <button
              onClick={() => { setActiveTab('payroll-reports'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'payroll-reports' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <FileText size={20} /> <span className="font-medium tracking-wide text-sm">Laporan Penggajian</span>
            </button>
            <button
              onClick={() => { setActiveTab('tax-reports'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'tax-reports' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Landmark size={20} /> <span className="font-medium tracking-wide text-sm">Laporan Pajak</span>
            </button>
            <button
              onClick={() => { setActiveTab('bank-export'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'bank-export' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Landmark size={20} /> <span className="font-medium tracking-wide text-sm">Ekspor Bank</span>
            </button>
            <button
              onClick={() => { setActiveTab('thr'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'thr' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Gift size={20} /> <span className="font-medium tracking-wide text-sm">Perhitungan THR</span>
            </button>
            <button
              onClick={() => { setActiveTab('permissions'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'permissions' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <ShieldCheck size={20} /> <span className="font-medium tracking-wide text-sm">Otoritas Tim</span>
            </button>
            <button
              onClick={() => { setActiveTab('audit'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'audit' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Activity size={20} /> <span className="font-medium tracking-wide text-sm">Jejak Audit</span>
            </button>
            <button
              onClick={() => { setActiveTab('broadcast'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'broadcast' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Megaphone size={20} /> <span className="font-medium tracking-wide text-sm">Pusat Pengumuman</span>
            </button>
            <button
              onClick={() => { setActiveTab('banners'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'banners' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Image size={20} /> <span className="font-medium tracking-wide text-sm">Manajemen Banner</span>
            </button>
            <button
              onClick={() => { setActiveTab('bulk-import'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'bulk-import' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Upload size={20} /> <span className="font-medium tracking-wide text-sm">Import Data</span>
            </button>
            <button
              onClick={() => { setActiveTab('qrcode'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'qrcode' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <QrCode size={20} /> <span className="font-medium tracking-wide text-sm">Manajemen QR</span>
            </button>
            <button
              onClick={() => { setActiveTab('workflow'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'workflow' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <GitBranch size={20} /> <span className="font-medium tracking-wide text-sm">Workflow Persetujuan</span>
            </button>
            <button
              onClick={() => { setActiveTab('system-config'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'system-config' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Wrench size={20} /> <span className="font-medium tracking-wide text-sm">Konfigurasi Sistem</span>
            </button>
          </div>
          
          <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-2">
            <HRISExportWrapper tenantId={tenantData?.id} className="w-full justify-start py-3 border-none bg-white/5 hover:bg-[var(--danger)]/20 text-gray-400 hover:text-[var(--danger)]" label="Unduh Database HRIS" />
            <button 
              onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-white/10 text-[var(--aurora-1)] shadow-[0_0_100px_rgba(142,45,226,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Settings size={20} /> <span className="font-medium tracking-wide text-sm">Pengaturan Umum</span>
            </button>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-[var(--danger)] hover:bg-[var(--danger)]/10 border border-transparent"
            >
              <LogOut size={20} /> <span className="font-medium tracking-wide text-sm uppercase">Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] lg:hidden"
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-0 z-10 overflow-y-auto">
        <div className="w-full px-4 mt-2 sm:mt-4">
          <Suspense fallback={<div className="p-20 text-center"><div className="w-8 h-8 border-2 border-[var(--aurora-3)] border-t-transparent rounded-full animate-spin mx-auto" /></div>}>
            {activeTab === 'home' && <DashboardHome onNavigate={(tab) => { setActiveTab(tab); setIsSidebarOpen(false); }} />}
            {activeTab === 'profile' && <CompanyProfile onUpdate={fetchTenantData} />}
            {activeTab === 'employee-directory' && <EmployeeDirectory />}
            {activeTab === 'monitoring' && <SubAdminDashboard isEmbedded={true} initialTab="monitor" />}
            {activeTab === 'structure' && <StructureManagement />}
            {activeTab === 'shift' && <ShiftDictionary />}
            {activeTab === 'schedule' && <ScheduleUpload />}
            {activeTab === 'broadcast' && <BroadcastCenter />}
            {activeTab === 'approval' && <SubAdminDashboard isEmbedded={true} initialTab="verification" />}
            {activeTab === 'loans' && <LoanManagement />}
            {activeTab === 'reimbursements' && <ReimbursementManagement />}
            {activeTab === 'finance' && <FinanceDashboard />}
            {activeTab === 'schedule-calendar' && <ScheduleCalendar />}
            {activeTab === 'holidays' && <HolidayManagement />}
            {activeTab === 'org-chart' && <OrgChart />}
            {activeTab === 'performance' && <PerformanceAppraisal />}
            {activeTab === 'assets' && <AssetManagement />}
            {activeTab === 'events' && <CompanyEvents />}
            {activeTab === 'policies' && <CompanyPolicies />}
            {activeTab === 'payroll' && <PayrollSettings />}
            {activeTab === 'payroll-run' && <PayrollRun />}
            {activeTab === 'thr' && <THRCalculation />}
            {activeTab === 'permissions' && <PermissionManager />}
            {activeTab === 'workflow' && <ApprovalWorkflow />}
            {activeTab === 'audit' && <AuditTrailView />}
            {activeTab === 'activity-feed' && <ActivityFeed />}
            {activeTab === 'analytics' && <AnalyticsDashboard />}
            {activeTab === 'employee-profile' && <EmployeeProfileView />}
            {activeTab === 'onboarding' && <OnboardingChecklist />}
            {activeTab === 'salary-components' && <SalaryComponents />}
            {activeTab === 'salary-revision' && <SalaryRevision />}
            {activeTab === 'employee-salary' && <EmployeeSalary />}
            {activeTab === 'payroll-reports' && <PayrollReports />}
            {activeTab === 'tax-reports' && <TaxReports />}
            {activeTab === 'bank-export' && <BankExport />}
            {activeTab === 'bulk-import' && <BulkImport />}
            {activeTab === 'qrcode' && <QRCodeManagement />}
            {activeTab === 'banners' && <BannerManager />}
            {activeTab === 'system-config' && <SystemConfig />}
            {activeTab === 'settings' && <GeneralSettings />}
          </Suspense>
        </div>
      </main>
    </div>
  );
};

export default TenantDashboard;
