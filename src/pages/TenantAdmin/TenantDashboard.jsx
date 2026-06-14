import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Settings, FileText, CheckCircle, Activity, Key, Calculator, BarChart3, ShieldCheck, Building2, Megaphone, CalendarDays, LogOut, XCircle, Upload, Fingerprint, Users, DollarSign, TrendingUp, Sun, Moon, Calendar, Star, Briefcase, Gift, ScrollText, PartyPopper, ClipboardList, QrCode, Activity as ActivityIcon, LineChart, UserCircle, Wallet, Layers, GitBranch, Landmark, ClipboardCheck, Image, Wrench, Zap, Wifi, Bot, ScanLine, Webhook, Headphones, Route, DoorOpen, UserCheck, Hammer, Truck, Package, AlertTriangle, Repeat, Home, MapPin, Bell, Menu, Target, Building, HardDrive, Monitor, Scale, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '../../components/ConfirmDialog';
import { useTheme } from '../../context/ThemeContext';
import DashboardHome from './components/DashboardHome';
import CompanyProfile from './components/CompanyProfile';
import SubAdminDashboard from '../SubAdmin/SubAdminDashboard';
import { registerBackHandler } from '../../utils/navigation';
import { useNotifications } from '../../components/Notifications';
import GlobalHeader from '../../components/GlobalHeader';
import DeveloperWatermark from '../../components/DeveloperWatermark';
import BottomNav from '../../components/BottomNav';
import DeveloperWatermarkBackground from '../../components/DeveloperWatermarkBackground';

const bottomNavItems = [
  { id: 'home', label: 'Beranda', icon: BarChart3 },
  { id: 'monitoring', label: 'Monitor', icon: Activity },
  { id: 'approval', label: 'Persetujuan', icon: ShieldCheck },
  { id: 'employee-directory', label: 'Karyawan', icon: Users },
  { id: 'menu', label: 'Menu', icon: Menu, isMenu: true }
];

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
const RoleMappingSettings = lazy(() => import('./components/RoleMappingSettings'));
// Phase 2 — Essential Features
const AutoShift = lazy(() => import('./components/AutoShift'));
const BPJSCalculator = lazy(() => import('./components/BPJSCalculator'));
const Form1721A1 = lazy(() => import('./components/Form1721A1'));
// Phase 3 — Innovations
const WifiGeofenceSettings = lazy(() => import('./components/WifiGeofenceSettings'));
const OCRScanner = lazy(() => import('./components/OCRScanner'));
const HRChatbot = lazy(() => import('./components/HRChatbot'));
const WebhookSettings = lazy(() => import('./components/WebhookSettings'));

const SLADashboard = lazy(() => import('./components/SLADashboard'));
const TenantComplaintAdmin = lazy(() => import('./components/TenantComplaintAdmin'));
const BackupRestore = lazy(() => import('./components/BackupRestore'));
const RosterGrid = lazy(() => import('./components/RosterGrid'));
const WADispatch = lazy(() => import('./components/WADispatch'));
const CleaningManagement = lazy(() => import('./components/CleaningManagement'));
const EngineeringManagement = lazy(() => import('./components/EngineeringManagement'));
const DriverManagement = lazy(() => import('./components/DriverManagement'));
const OfficeGAManagement = lazy(() => import('./components/OfficeGAManagement'));
const TimesheetView = lazy(() => import('./components/TimesheetView'));
const OvertimeManagement = lazy(() => import('./components/OvertimeManagement'));
const HelpdeskTicketing = lazy(() => import('./components/HelpdeskTicketing'));
const PatrolManagement = lazy(() => import('./components/PatrolManagement'));
const FacilityBooking = lazy(() => import('./components/FacilityBooking'));
const VisitorManagement = lazy(() => import('./components/VisitorManagement'));
const WorkOrderManagement = lazy(() => import('./components/WorkOrderManagement'));
const FleetManagement = lazy(() => import('./components/FleetManagement'));
const InventoryManagement = lazy(() => import('./components/InventoryManagement'));
const IncidentReporting = lazy(() => import('./components/IncidentReporting'));
const ShiftSwapManagement = lazy(() => import('./components/ShiftSwapManagement'));
const HybridWorkSettings = lazy(() => import('./components/HybridWorkSettings'));
const WorkModeDashboard = lazy(() => import('./components/WorkModeDashboard'));
const ITManagement = lazy(() => import('./components/ITManagement'));
const LegalManagement = lazy(() => import('./components/LegalManagement'));
const SecurityOpsShell = lazy(() => import('../../modules/security/SecurityOpsShell'));
import HRISExportWrapper from '../../components/HRISExportWrapper';
import { supabase } from '../../utils/supabaseClient';

const NAV_BTN = (active) =>
  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active
    ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5'
    : 'text-gray-400 hover:bg-white/5 hover:text-white'}`;

const TenantDashboard = ({ onGodModeReturn, isImpersonating, onCycleRole, onLogout }) => {
  const navigate = useNavigate();
  const { unreadCount, setShowPanel } = useNotifications();
  const { theme, toggleTheme } = useTheme();

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return <Sun size={18} className="text-orange-500 animate-pulse" />;
      case 'aurora': return <Zap size={18} className="text-purple-400" />;
      case 'neon': return <ActivityIcon size={18} className="text-cyan-400 animate-pulse" />;
      default: return <Moon size={18} className="text-blue-400" />;
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light': return 'Mode Terang';
      case 'aurora': return 'Mode Aurora';
      case 'neon': return 'Mode Neon';
      default: return 'Mode Gelap';
    }
  };

  const [activeTab, setActiveTab] = useState(() => {
    try { return sessionStorage.getItem('tenant_active_tab') || 'home'; } catch { return 'home'; }
  });

  // Handle layer-by-layer back button
  useEffect(() => {
    const unregister = registerBackHandler(() => {
      if (activeTab !== 'home') {
        setActiveTab('home');
        return true;
      }
      return false;
    });
    return unregister;
  }, [activeTab]);
  const [clickCount, setClickCount] = useState(0);
  const [tenantData, setTenantData] = useState({ name: 'Memuat...', logo_url: null });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [modules, setModules] = useState({
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
  });
  const confirm = useConfirm();

  useEffect(() => { fetchTenantData(); }, []);
  useEffect(() => {
    try { sessionStorage.setItem('tenant_active_tab', activeTab); } catch {}
  }, [activeTab]);

  useEffect(() => {
    const tabModuleMapping = {
      'helpdesk': 'helpdesk',
      'work-order': 'work_order',
      'patrol': 'patrol',
      'security-ops': 'patrol',
      'visitor': 'visitor',
      'facility-booking': 'booking',
      'incident': 'incident',
      'fleet': 'fleet',
      'inventory': 'inventory',
      'work-mode-dashboard': 'hybrid_work',
      'shift-swap': 'shift_swap',
      'hybrid-work-settings': 'hybrid_work',
      'finance': 'payroll',
      'payroll': 'payroll',
      'salary-components': 'payroll',
      'salary-revision': 'payroll',
      'employee-salary': 'payroll',
      'payroll-run': 'payroll',
      'timesheet': 'payroll',
      'overtime': 'payroll',
      'payroll-reports': 'payroll',
      'tax-reports': 'payroll',
      'bank-export': 'payroll',
      'thr': 'payroll',
      'bpjs-calculator': 'payroll',
      'form-1721': 'payroll',
      'it-management': 'it',
      'legal-management': 'legal'
    };
    const mappedModule = tabModuleMapping[activeTab];
    if (mappedModule && !modules[mappedModule]) {
      setActiveTab('home');
    }
  }, [activeTab, modules]);

  const fetchTenantModules = async (tenantId) => {
    try {
      const { data, error } = await supabase
        .from('tenant_modules')
        .select('module_key, is_active')
        .eq('tenant_id', tenantId);
      if (error) throw error;
      if (data && data.length > 0) {
        const modulesObj = {
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
        };
        data.forEach(m => {
          modulesObj[m.module_key] = m.is_active;
        });
        setModules(modulesObj);
      }
    } catch (err) {
      console.error("Gagal menarik module flags:", err);
    }
  };

  const fetchTenantData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
      if (profile?.tenant_id) {
        const { data: tData } = await supabase.from('tenants').select('id, name, logo_url').eq('id', profile.tenant_id).maybeSingle();
        if (tData) {
          setTenantData(tData);
          try {
            if (tData.logo_url) localStorage.setItem('tenant_logo_url', tData.logo_url);
            if (tData.name) localStorage.setItem('tenant_name', tData.name);
          } catch {}
        }
        fetchTenantModules(profile.tenant_id);
      }
    } catch (e) { console.error('Gagal menarik data tenant', e); }
  };

  const handleLogout = async () => {
    const ok = await confirm('Apakah Anda yakin ingin keluar?', 'Keluar');
    if (ok) {
      supabase.auth.signOut().catch(() => {});
      if (onLogout) onLogout();
    }
  };

  const go = (tab) => { setActiveTab(tab); setIsSidebarOpen(false); };
  const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true' || isImpersonating; } catch { return isImpersonating; } })();

  const getTabTitle = () => {
    switch (activeTab) {
      case 'home': return 'DASHBOARD';
      case 'profile': return 'PROFIL PERUSAHAAN';
      case 'employee-directory': return 'DIREKTORI KARYAWAN';
      case 'monitoring': return 'MONITORING GLOBAL';
      case 'structure': return 'MANAJEMEN STRUKTUR';
      case 'shift': return 'ATURAN SHIFT';
      case 'auto-shift': return 'JADWAL OTOMATIS';
      case 'schedule': return 'UNGGAH JADWAL';
      case 'schedule-calendar': return 'KALENDAR SHIFT';
      case 'roster-grid': return 'ROSTER BULANAN';
      case 'wa-dispatch': return 'LAPORAN & WA DISPATCH';
      case 'cleaning': return 'CLEANING MANAGEMENT';
      case 'engineering': return 'ENGINEERING';
      case 'driver': return 'DRIVER';
      case 'office-ga': return 'OFFICE / GA';
      case 'holidays': return 'HARI LIBUR';
      case 'broadcast': return 'SIARAN INFORMASI';
      case 'approval': return 'PERSETUJUAN';
      case 'loans': return 'PINJAMAN';
      case 'reimbursements': return 'REIMBURSEMENT';
      case 'finance': return 'KEUANGAN';
      case 'org-chart': return 'BAGAN ORGANISASI';
      case 'performance': return 'KINERJA';
      case 'assets': return 'ASET PERUSAHAAN';
      case 'events': return 'KEGIATAN';
      case 'policies': return 'KEBIJAKAN';
      case 'role-mapping': return 'KONFIGURASI ROLE OTOMATIS';
      case 'payroll': return 'PENGATURAN PAYROLL';
      case 'payroll-run': return 'PROSES PAYROLL';
      case 'timesheet': return 'TIMESHEET';
      case 'overtime': return 'LEMBUR';
      case 'thr': return 'PERHITUNGAN THR';
      case 'it-management': return 'IT MANAGEMENT';
      case 'legal-management': return 'LEGAL MANAGEMENT';
      case 'security-ops': return 'OPERASI KEAMANAN JDC';
      case 'settings': return 'PENGATURAN UMUM';
      default: return 'ADMIN PANEL';
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-darker)] flex text-white relative overflow-hidden">
      <DeveloperWatermarkBackground theme="dark" />

      {/* Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[var(--aurora-1)] rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[var(--aurora-3)] rounded-full blur-[150px]" />
      </div>

      {/* Sidebar */}
      <aside className={`fixed lg:relative top-0 left-0 z-[90] h-full lg:h-[calc(100vh-32px)] w-[85vw] max-w-sm lg:w-72 m-0 lg:m-4 transition-all duration-500 ease-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-full bg-white/5 backdrop-blur-lg border border-white/10 p-6 flex flex-col gap-2 rounded-none lg:rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
          {/* Logo */}
          <div className="mb-8 lg:mb-10 px-2 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(0,201,255,0.15)] shrink-0">
              {tenantData.logo_url ? <img src={tenantData.logo_url} alt="Logo" className="w-full h-full object-contain p-1.5" /> : <span className="text-2xl text-[var(--aurora-3)] font-bold">{tenantData.name?.charAt(0)}</span>}
            </div>
            <h2
              className={`font-serif text-[14px] leading-tight tracking-wide bg-clip-text text-transparent bg-gradient-to-r ${isGod ? 'from-[var(--danger)] to-[var(--warning)] cursor-pointer active:scale-95' : 'from-white to-gray-400'}`}
              onClick={() => { try { if (sessionStorage.getItem('super_admin_verified') === 'true' && onCycleRole) onCycleRole(); else if (isImpersonating && onGodModeReturn) onGodModeReturn(); } catch {} }}
              title={isImpersonating ? 'Klik untuk Pindah Dasbor' : ''}
            >
              {tenantData.name}
              {isGod && <span className="text-[10px] ml-1 block text-[var(--danger)] font-black opacity-80">(SUPER ADMIN PREVIEW)</span>}
            </h2>
          </div>

          {/* Nav Links */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-1 min-h-0">

            {/* ─── Umum ─── */}
            <p className="text-[9px] text-gray-600 uppercase tracking-[0.2em] font-bold px-2 pt-2 pb-1">Umum</p>
            <button onClick={() => go('profile')} className={NAV_BTN(activeTab === 'profile')}><Building2 size={18} /><span className="text-sm">Profil Perusahaan</span></button>
            <button onClick={() => go('home')} className={NAV_BTN(activeTab === 'home')}><BarChart3 size={18} /><span className="text-sm">Dashboard</span></button>
            <button onClick={() => { setIsSidebarOpen(false); navigate('/app'); }} className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-gray-400 hover:bg-[var(--success)]/10 hover:text-[var(--success)] border border-dashed border-white/5 hover:border-[var(--success)]/30"><Fingerprint size={18} /><span className="text-sm">Absensi Saya</span></button>
            <button onClick={() => go('employee-directory')} className={NAV_BTN(activeTab === 'employee-directory')}><Users size={18} /><span className="text-sm">Direktori Karyawan</span></button>
            <button onClick={() => go('monitoring')} className={NAV_BTN(activeTab === 'monitoring')}><BarChart3 size={18} /><span className="text-sm">Monitoring Global</span></button>
            <button onClick={() => go('structure')} className={NAV_BTN(activeTab === 'structure')}><Building2 size={18} /><span className="text-sm">Manajemen Struktur</span></button>

            {/* ─── Helpdesk & Operasional ─── */}
            {(modules.helpdesk || modules.work_order || modules.patrol || modules.visitor || modules.booking || modules.incident) && (
              <>
                <p className="text-[9px] text-gray-600 uppercase tracking-[0.2em] font-bold px-2 pt-4 pb-1">Helpdesk & Operasional</p>
                {modules.helpdesk && <button onClick={() => go('helpdesk')} className={NAV_BTN(activeTab === 'helpdesk')}><Headphones size={18} /><span className="text-sm">Helpdesk Tiket</span></button>}
                {modules.work_order && <button onClick={() => go('work-order')} className={NAV_BTN(activeTab === 'work-order')}><Hammer size={18} /><span className="text-sm">Work Order Maintenance</span></button>}
                {modules.patrol && <button onClick={() => go('patrol')} className={NAV_BTN(activeTab === 'patrol')}><Route size={18} /><span className="text-sm">Patroli Satpam</span></button>}
                {modules.patrol && <button onClick={() => go('security-ops')} className={NAV_BTN(activeTab === 'security-ops')}><ShieldCheck size={18} /><span className="text-sm font-bold">Operasi Keamanan JDC</span></button>}
                {modules.patrol && (
                  <button onClick={() => { setIsSidebarOpen(false); navigate('/jdc'); }} className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-gray-500 hover:bg-white/5 hover:text-gray-300 border border-dashed border-white/5 text-xs">
                    <ShieldCheck size={16} />
                    <span>JDC Fullscreen (legacy)</span>
                  </button>
                )}
                <button onClick={() => go('sla-dashboard')} className={NAV_BTN(activeTab === 'sla-dashboard')}><Target size={18} /><span className="text-sm">Dashboard Target & SLA</span></button>
                {modules.visitor && <button onClick={() => go('visitor')} className={NAV_BTN(activeTab === 'visitor')}><UserCheck size={18} /><span className="text-sm">Manajemen Tamu</span></button>}
                {modules.booking && <button onClick={() => go('facility-booking')} className={NAV_BTN(activeTab === 'facility-booking')}><DoorOpen size={18} /><span className="text-sm">Booking Fasilitas</span></button>}
                {modules.incident && <button onClick={() => go('incident')} className={NAV_BTN(activeTab === 'incident')}><AlertTriangle size={18} /><span className="text-sm">Laporan Insiden (K3)</span></button>}
                <button onClick={() => go('wa-dispatch')} className={NAV_BTN(activeTab === 'wa-dispatch')}><Send size={18} /><span className="text-sm">Laporan & WA Dispatch</span></button>
                <button onClick={() => go('complaints')} className={NAV_BTN(activeTab === 'complaints')}><Building size={18} /><span className="text-sm">Komplain Tenant</span></button>
                <button onClick={() => go('cleaning')} className={NAV_BTN(activeTab === 'cleaning')}><ClipboardList size={18} /><span className="text-sm">Cleaning Management</span></button>
                <button onClick={() => go('engineering')} className={NAV_BTN(activeTab === 'engineering')}><Wrench size={18} /><span className="text-sm">Engineering</span></button>
                <button onClick={() => go('driver')} className={NAV_BTN(activeTab === 'driver')}><Truck size={18} /><span className="text-sm">Driver</span></button>
                <button onClick={() => go('office-ga')} className={NAV_BTN(activeTab === 'office-ga')}><Building2 size={18} /><span className="text-sm">Office / GA</span></button>
              </>
            )}

            {/* ─── Logistik & Transport ─── */}
            {(modules.fleet || modules.inventory) && (
              <>
                <p className="text-[9px] text-gray-600 uppercase tracking-[0.2em] font-bold px-2 pt-4 pb-1">Logistik & Transport</p>
                {modules.fleet && <button onClick={() => go('fleet')} className={NAV_BTN(activeTab === 'fleet')}><Truck size={18} /><span className="text-sm">Manajemen Kendaraan</span></button>}
                {modules.inventory && <button onClick={() => go('inventory')} className={NAV_BTN(activeTab === 'inventory')}><Package size={18} /><span className="text-sm">Inventaris & Stok</span></button>}
              </>
            )}

            {/* ─── Hybrid Work ─── */}
            {(modules.hybrid_work || modules.shift_swap) && (
              <>
                <p className="text-[9px] text-gray-600 uppercase tracking-[0.2em] font-bold px-2 pt-4 pb-1">Hybrid Work</p>
                {modules.hybrid_work && <button onClick={() => go('work-mode-dashboard')} className={NAV_BTN(activeTab === 'work-mode-dashboard')}><Home size={18} /><span className="text-sm">Mode Kerja Hari Ini</span></button>}
                {modules.shift_swap && <button onClick={() => go('shift-swap')} className={NAV_BTN(activeTab === 'shift-swap')}><Repeat size={18} /><span className="text-sm">Tukar Shift</span></button>}
              </>
            )}

            {/* ─── Inovasi ─── */}
            <p className="text-[9px] text-gray-600 uppercase tracking-[0.2em] font-bold px-2 pt-4 pb-1">Inovasi</p>
            <button onClick={() => go('wifi-geofence')} className={NAV_BTN(activeTab === 'wifi-geofence')}><Wifi size={18} /><span className="text-sm">Geofencing Wi-Fi</span></button>
            <button onClick={() => go('ocr-scanner')} className={NAV_BTN(activeTab === 'ocr-scanner')}><ScanLine size={18} /><span className="text-sm">Auto-OCR Dokumen</span></button>
            <button onClick={() => go('hr-chatbot')} className={NAV_BTN(activeTab === 'hr-chatbot')}><Bot size={18} /><span className="text-sm">AI Chatbot HR</span></button>
            <button onClick={() => go('webhooks')} className={NAV_BTN(activeTab === 'webhooks')}><Webhook size={18} /><span className="text-sm">Webhook & Integrasi</span></button>

            {/* ─── Jadwal & Shift ─── */}
            <p className="text-[9px] text-gray-600 uppercase tracking-[0.2em] font-bold px-2 pt-4 pb-1">Jadwal & Shift</p>
            <button onClick={() => go('shift')} className={NAV_BTN(activeTab === 'shift')}><CalendarDays size={18} /><span className="text-sm">Kamus Shift</span></button>
            <button onClick={() => go('auto-shift')} className={NAV_BTN(activeTab === 'auto-shift')}><Zap size={18} /><span className="text-sm">Auto-Shift Generator</span></button>
            <button onClick={() => go('schedule')} className={NAV_BTN(activeTab === 'schedule')}><Upload size={18} /><span className="text-sm">Upload Jadwal</span></button>
            <button onClick={() => go('schedule-calendar')} className={NAV_BTN(activeTab === 'schedule-calendar')}><Calendar size={18} /><span className="text-sm">Kalender Jadwal</span></button>
            <button onClick={() => go('roster-grid')} className={NAV_BTN(activeTab === 'roster-grid')}><Users size={18} /><span className="text-sm">Roster Bulanan</span></button>
            <button onClick={() => go('holidays')} className={NAV_BTN(activeTab === 'holidays')}><Sun size={18} /><span className="text-sm">Kalender Libur</span></button>

            {/* ─── SDM & Operasional ─── */}
            <p className="text-[9px] text-gray-600 uppercase tracking-[0.2em] font-bold px-2 pt-4 pb-1">SDM & Operasional</p>
            <button onClick={() => go('approval')} className={NAV_BTN(activeTab === 'approval')}><ShieldCheck size={18} /><span className="text-sm">Pusat Persetujuan</span></button>
            <button onClick={() => go('loans')} className={NAV_BTN(activeTab === 'loans')}><DollarSign size={18} /><span className="text-sm">Manajemen Pinjaman</span></button>
            <button onClick={() => go('reimbursements')} className={NAV_BTN(activeTab === 'reimbursements')}><FileText size={18} /><span className="text-sm">Reimbursemen</span></button>
            <button onClick={() => go('org-chart')} className={NAV_BTN(activeTab === 'org-chart')}><Briefcase size={18} /><span className="text-sm">Bagan Organisasi</span></button>
            <button onClick={() => go('performance')} className={NAV_BTN(activeTab === 'performance')}><Star size={18} /><span className="text-sm">Penilaian Kinerja</span></button>
            <button onClick={() => go('assets')} className={NAV_BTN(activeTab === 'assets')}><ClipboardList size={18} /><span className="text-sm">Manajemen Aset</span></button>
            <button onClick={() => go('events')} className={NAV_BTN(activeTab === 'events')}><PartyPopper size={18} /><span className="text-sm">Acara Perusahaan</span></button>
            <button onClick={() => go('policies')} className={NAV_BTN(activeTab === 'policies')}><ScrollText size={18} /><span className="text-sm">Kebijakan Perusahaan</span></button>
            <button onClick={() => go('onboarding')} className={NAV_BTN(activeTab === 'onboarding')}><ClipboardCheck size={18} /><span className="text-sm">Checklist Onboarding</span></button>
            <button onClick={() => go('employee-profile')} className={NAV_BTN(activeTab === 'employee-profile')}><UserCircle size={18} /><span className="text-sm">Profil Karyawan</span></button>
            {modules.it && <button onClick={() => go('it-management')} className={NAV_BTN(activeTab === 'it-management')}><Monitor size={18} /><span className="text-sm">IT Management</span></button>}
            {modules.legal && <button onClick={() => go('legal-management')} className={NAV_BTN(activeTab === 'legal-management')}><Scale size={18} /><span className="text-sm">Legal Management</span></button>}

            {/* ─── Keuangan & Payroll ─── */}
            {modules.payroll && (
              <>
                <p className="text-[9px] text-gray-600 uppercase tracking-[0.2em] font-bold px-2 pt-4 pb-1">Keuangan & Payroll</p>
                <button onClick={() => go('finance')} className={NAV_BTN(activeTab === 'finance')}><TrendingUp size={18} /><span className="text-sm">Dashboard Keuangan</span></button>
                <button onClick={() => go('payroll')} className={NAV_BTN(activeTab === 'payroll')}><Calculator size={18} /><span className="text-sm">Penggajian & Pajak</span></button>
                <button onClick={() => go('salary-components')} className={NAV_BTN(activeTab === 'salary-components')}><Layers size={18} /><span className="text-sm">Komponen Gaji</span></button>
                <button onClick={() => go('salary-revision')} className={NAV_BTN(activeTab === 'salary-revision')}><GitBranch size={18} /><span className="text-sm">Revisi Gaji</span></button>
                <button onClick={() => go('employee-salary')} className={NAV_BTN(activeTab === 'employee-salary')}><Wallet size={18} /><span className="text-sm">Data Gaji Karyawan</span></button>
                <button onClick={() => go('payroll-run')} className={NAV_BTN(activeTab === 'payroll-run')}><DollarSign size={18} /><span className="text-sm">Proses Penggajian</span></button>
                <button onClick={() => go('timesheet')} className={NAV_BTN(activeTab === 'timesheet')}><CalendarDays size={18} /><span className="text-sm">Timesheet</span></button>
                <button onClick={() => go('overtime')} className={NAV_BTN(activeTab === 'overtime')}><Zap size={18} /><span className="text-sm">Manajemen Lembur</span></button>
                <button onClick={() => go('payroll-reports')} className={NAV_BTN(activeTab === 'payroll-reports')}><FileText size={18} /><span className="text-sm">Laporan Penggajian</span></button>
                <button onClick={() => go('tax-reports')} className={NAV_BTN(activeTab === 'tax-reports')}><Landmark size={18} /><span className="text-sm">Laporan Pajak</span></button>
                <button onClick={() => go('bank-export')} className={NAV_BTN(activeTab === 'bank-export')}><Landmark size={18} /><span className="text-sm">Ekspor Bank</span></button>
                <button onClick={() => go('thr')} className={NAV_BTN(activeTab === 'thr')}><Gift size={18} /><span className="text-sm">Perhitungan THR</span></button>
                <button onClick={() => go('bpjs-calculator')} className={NAV_BTN(activeTab === 'bpjs-calculator')}><Calculator size={18} /><span className="text-sm">Kalkulator BPJS</span></button>
                <button onClick={() => go('form-1721')} className={NAV_BTN(activeTab === 'form-1721')}><FileText size={18} /><span className="text-sm">Form 1721-A1 PPh 21</span></button>
              </>
            )}

            {/* ─── Analitik & Sistem ─── */}
            <p className="text-[9px] text-gray-600 uppercase tracking-[0.2em] font-bold px-2 pt-4 pb-1">Analitik & Sistem</p>
            <button onClick={() => go('activity-feed')} className={NAV_BTN(activeTab === 'activity-feed')}><ActivityIcon size={18} /><span className="text-sm">Umpan Aktivitas</span></button>
            <button onClick={() => go('analytics')} className={NAV_BTN(activeTab === 'analytics')}><LineChart size={18} /><span className="text-sm">Dashboard Analitik</span></button>
            <button onClick={() => go('permissions')} className={NAV_BTN(activeTab === 'permissions')}><ShieldCheck size={18} /><span className="text-sm">Otoritas Tim</span></button>
            <button onClick={() => go('audit')} className={NAV_BTN(activeTab === 'audit')}><Activity size={18} /><span className="text-sm">Jejak Audit</span></button>
            <button onClick={() => go('role-mapping')} className={NAV_BTN(activeTab === 'role-mapping')}><Key size={18} /><span className="text-sm">Konfigurasi Role</span></button>
            <button onClick={() => go('broadcast')} className={NAV_BTN(activeTab === 'broadcast')}><Megaphone size={18} /><span className="text-sm">Pusat Pengumuman</span></button>
            <button onClick={() => go('banners')} className={NAV_BTN(activeTab === 'banners')}><Image size={18} /><span className="text-sm">Manajemen Banner</span></button>
            <button onClick={() => go('bulk-import')} className={NAV_BTN(activeTab === 'bulk-import')}><Upload size={18} /><span className="text-sm">Import Data</span></button>
            <button onClick={() => go('qrcode')} className={NAV_BTN(activeTab === 'qrcode')}><QrCode size={18} /><span className="text-sm">Manajemen QR</span></button>
            <button onClick={() => go('workflow')} className={NAV_BTN(activeTab === 'workflow')}><GitBranch size={18} /><span className="text-sm">Workflow Persetujuan</span></button>
            <button onClick={() => go('system-config')} className={NAV_BTN(activeTab === 'system-config')}><Wrench size={18} /><span className="text-sm">Konfigurasi Sistem</span></button>
            <button onClick={() => go('backup')} className={NAV_BTN(activeTab === 'backup')}><HardDrive size={18} /><span className="text-sm">Backup & Restore</span></button>
            {modules.hybrid_work && <button onClick={() => go('hybrid-work-settings')} className={NAV_BTN(activeTab === 'hybrid-work-settings')}><MapPin size={18} /><span className="text-sm">Aturan WFH/WFA</span></button>}
          </div>

          {/* Bottom Actions */}
          <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-2">
            <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-gray-400 hover:bg-white/5 hover:text-white">
              {getThemeIcon()}<span className="text-sm">{getThemeLabel()}</span>
            </button>
            <button onClick={() => { setIsSidebarOpen(false); setShowPanel(true); }} className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-gray-400 hover:bg-white/5 hover:text-white">
              <div className="flex items-center gap-3">
                <Bell size={18} className="text-gray-400" />
                <span className="text-sm">Notifikasi</span>
              </div>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[var(--danger)] text-white text-[10px] font-bold shadow-lg">
                  {unreadCount}
                </span>
              )}
            </button>
            <HRISExportWrapper tenantId={tenantData?.id} className="w-full justify-start py-3 border-none bg-white/5 hover:bg-[var(--danger)]/20 text-gray-400 hover:text-[var(--danger)]" label="Unduh Database HRIS" />
            <button onClick={() => go('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-white/10 text-[var(--aurora-3)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
              <Settings size={18} /><span className="text-sm">Pengaturan Umum</span>
            </button>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-[var(--danger)] hover:bg-[var(--danger)]/10">
              <LogOut size={18} /><span className="text-sm uppercase font-bold">Keluar</span>
            </button>

            {/* Developer Watermark Signature */}
            <DeveloperWatermark />
          </div>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] lg:hidden" />}

      {/* Main Content */}
      <main id="main-scroll-container" className="flex-1 p-0 z-10 overflow-y-auto flex flex-col">
        {activeTab === 'security-ops' ? (
          <Suspense fallback={<div className="p-20 text-center"><div className="w-8 h-8 border-2 border-[var(--aurora-3)] border-t-transparent rounded-full animate-spin mx-auto" /></div>}>
            <SecurityOpsShell onBack={() => go('home')} />
          </Suspense>
        ) : (
          <>
        <GlobalHeader 
          title={getTabTitle()} 
          onMenuClick={() => setIsSidebarOpen(true)} 
        />
        <div className={`w-full max-w-7xl mx-auto px-4 flex-1 pb-24 lg:pb-4 ${isImpersonating ? 'pt-10 mt-2 sm:mt-4' : 'mt-2 sm:mt-4'}`}>
          <Suspense fallback={<div className="p-20 text-center"><div className="w-8 h-8 border-2 border-[var(--aurora-3)] border-t-transparent rounded-full animate-spin mx-auto" /></div>}>
            {activeTab === 'home' && <DashboardHome onNavigate={(tab) => { setActiveTab(tab); setIsSidebarOpen(false); }} />}
            {activeTab === 'profile' && <CompanyProfile onUpdate={fetchTenantData} />}
            {activeTab === 'employee-directory' && <EmployeeDirectory />}
            {activeTab === 'monitoring' && <SubAdminDashboard isEmbedded={true} initialTab="monitor" />}
            {activeTab === 'structure' && <StructureManagement />}
            {activeTab === 'shift' && <ShiftDictionary />}
            {activeTab === 'auto-shift' && <AutoShift />}
            {activeTab === 'schedule' && <ScheduleUpload />}
            {activeTab === 'schedule-calendar' && <ScheduleCalendar />}
            {activeTab === 'roster-grid' && <RosterGrid />}
            {activeTab === 'holidays' && <HolidayManagement />}
            {activeTab === 'broadcast' && <BroadcastCenter />}
            {activeTab === 'approval' && <SubAdminDashboard isEmbedded={true} initialTab="verification" />}
            {activeTab === 'loans' && <LoanManagement />}
            {activeTab === 'reimbursements' && <ReimbursementManagement />}
            {activeTab === 'finance' && <FinanceDashboard />}
            {activeTab === 'org-chart' && <OrgChart />}
            {activeTab === 'performance' && <PerformanceAppraisal />}
            {activeTab === 'assets' && <AssetManagement />}
            {activeTab === 'events' && <CompanyEvents />}
            {activeTab === 'policies' && <CompanyPolicies />}
            {activeTab === 'payroll' && <PayrollSettings />}
            {activeTab === 'payroll-run' && <PayrollRun />}
            {activeTab === 'timesheet' && <TimesheetView />}
            {activeTab === 'overtime' && <OvertimeManagement />}
            {activeTab === 'thr' && <THRCalculation />}
            {activeTab === 'bpjs-calculator' && <BPJSCalculator />}
            {activeTab === 'form-1721' && <Form1721A1 />}
            {activeTab === 'wifi-geofence' && <WifiGeofenceSettings />}
            {activeTab === 'ocr-scanner' && <OCRScanner />}
            {activeTab === 'hr-chatbot' && <HRChatbot />}
            {activeTab === 'webhooks' && <WebhookSettings />}
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
            {activeTab === 'role-mapping' && <RoleMappingSettings />}
            {activeTab === 'qrcode' && <QRCodeManagement />}
            {activeTab === 'banners' && <BannerManager />}
            {activeTab === 'helpdesk' && <HelpdeskTicketing />}
            {activeTab === 'patrol' && <PatrolManagement />}
            {activeTab === 'sla-dashboard' && <SLADashboard />}
            {activeTab === 'facility-booking' && <FacilityBooking />}
            {activeTab === 'visitor' && <VisitorManagement />}
            {activeTab === 'work-order' && <WorkOrderManagement />}
            {activeTab === 'fleet' && <FleetManagement />}
            {activeTab === 'inventory' && <InventoryManagement />}
            {activeTab === 'incident' && <IncidentReporting />}
            {activeTab === 'complaints' && <TenantComplaintAdmin />}
            {activeTab === 'wa-dispatch' && <WADispatch />}
            {activeTab === 'cleaning' && <CleaningManagement />}
            {activeTab === 'engineering' && <EngineeringManagement />}
            {activeTab === 'driver' && <DriverManagement />}
            {activeTab === 'office-ga' && <OfficeGAManagement />}
            {activeTab === 'it-management' && <ITManagement />}
            {activeTab === 'legal-management' && <LegalManagement />}
            {activeTab === 'backup' && <BackupRestore />}
            {activeTab === 'shift-swap' && <ShiftSwapManagement />}
            {activeTab === 'work-mode-dashboard' && <WorkModeDashboard />}
            {activeTab === 'hybrid-work-settings' && <HybridWorkSettings />}
            {activeTab === 'system-config' && <SystemConfig />}
            {activeTab === 'settings' && <GeneralSettings />}
            {activeTab === 'auto-shift' && <AutoShift />}
          </Suspense>
        </div>

        {/* Clean JDC-Style centered footer */}
        <footer className="app-footer pb-28 lg:pb-8">
          <span>© 2026 <strong className="text-[var(--aurora-3)]">{tenantData?.name || 'Aplikasi Absensi'}</strong>. Hak Cipta Dilindungi.</span>
          <DeveloperWatermark />
        </footer>
          </>
        )}
      </main>

      {/* Bottom Navigation for Mobile */}
      {activeTab !== 'security-ops' && (
      <BottomNav
        currentTab={activeTab}
        onNavClick={(tab) => go(tab)}
        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        isSidebarOpen={isSidebarOpen}
        items={bottomNavItems}
      />
      )}
    </div>
  );
};

export default TenantDashboard;
