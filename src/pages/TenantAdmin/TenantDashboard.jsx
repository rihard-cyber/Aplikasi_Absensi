import React, { useState, useEffect } from 'react';
import { Settings, FileText, CheckCircle, Activity, Calculator, BarChart3, ShieldCheck, Building2, Megaphone, CalendarDays, LogOut, XCircle, Upload, Fingerprint } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PayrollSettings from './components/PayrollSettings';
import ApprovalWorkflow from './components/ApprovalWorkflow';
import AuditTrailView from './components/AuditTrailView';
import StructureManagement from './components/StructureManagement';
import GeneralSettings from './components/GeneralSettings';
import PermissionManager from './components/PermissionManager';
import BroadcastCenter from './components/BroadcastCenter';
import ShiftDictionary from './components/ShiftDictionary';
import CompanyProfile from './components/CompanyProfile';
import ScheduleUpload from './components/ScheduleUpload';
import SubAdminDashboard from '../SubAdmin/SubAdminDashboard'; // Reuse monitoring components
import HRISExportWrapper from '../../components/HRISExportWrapper';
import { supabase } from '../../utils/supabaseClient';

const TenantDashboard = ({ onGodModeReturn, isImpersonating, onCycleRole }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('tenant_active_tab') || 'profile');
  const [clickCount, setClickCount] = useState(0);
  const [tenantData, setTenantData] = useState({ name: 'Memuat...', logo_url: null });

  useEffect(() => {
    fetchTenantData();
  }, []);

  useEffect(() => {
    sessionStorage.setItem('tenant_active_tab', activeTab);
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
    if (window.confirm('Apakah Anda yakin ingin keluar?')) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error("Logout error:", e);
      }
      sessionStorage.clear();
      localStorage.clear();
      navigate('/login');
    }
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
        fixed lg:relative top-0 left-0 z-[90] h-full lg:h-[calc(100vh-32px)] w-72 m-0 lg:m-4 
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
              className={`font-serif text-[14px] leading-tight tracking-wide bg-clip-text text-transparent bg-gradient-to-r ${(sessionStorage.getItem('god_key') === 'DEWA-999' || isImpersonating) ? 'from-[var(--danger)] to-[var(--warning)] cursor-pointer active:scale-95' : 'from-white to-gray-400'}`}
              onClick={() => {
                if (sessionStorage.getItem('god_key') === 'DEWA-999' && onCycleRole) onCycleRole();
                else if (isImpersonating && onGodModeReturn) onGodModeReturn();
              }}
              title={(sessionStorage.getItem('god_key') === 'DEWA-999' || isImpersonating) ? "Klik untuk Pindah Dasbor" : ""}
            >
              {tenantData.name} {(sessionStorage.getItem('god_key') === 'DEWA-999' || isImpersonating) && <span className="text-[10px] ml-1 block text-[var(--danger)] font-black opacity-80">(God Mode)</span>}
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
              onClick={() => { setIsSidebarOpen(false); navigate('/'); }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-gray-400 hover:bg-[var(--success)]/10 hover:text-[var(--success)] border border-dashed border-white/5 hover:border-[var(--success)]/30"
            >
              <Fingerprint size={20} /> <span className="font-medium tracking-wide text-sm">Absensi Saya</span>
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
              onClick={() => { setActiveTab('payroll'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'payroll' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Calculator size={20} /> <span className="font-medium tracking-wide text-sm">Penggajian & Pajak</span>
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
      <main className="flex-1 p-8 z-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto mt-4">
          {activeTab === 'profile' && <CompanyProfile onUpdate={fetchTenantData} />}
          {activeTab === 'monitoring' && <SubAdminDashboard isEmbedded={true} initialTab="monitor" />}
          {activeTab === 'structure' && <StructureManagement />}
          {activeTab === 'shift' && <ShiftDictionary />}
          {activeTab === 'schedule' && <ScheduleUpload />}
          {activeTab === 'broadcast' && <BroadcastCenter />}
          {activeTab === 'approval' && <SubAdminDashboard isEmbedded={true} initialTab="verification" />}
          {activeTab === 'payroll' && <PayrollSettings />}
          {activeTab === 'permissions' && <PermissionManager />}
          {activeTab === 'workflow' && <ApprovalWorkflow />}
          {activeTab === 'audit' && <AuditTrailView />}
          {activeTab === 'settings' && <GeneralSettings />}
        </div>
      </main>
    </div>
  );
};

export default TenantDashboard;
