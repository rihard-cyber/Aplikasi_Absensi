import React, { useState } from 'react';
import { Settings, FileText, CheckCircle, Activity, Calculator } from 'lucide-react';
import PayrollSettings from './components/PayrollSettings';
import ApprovalWorkflow from './components/ApprovalWorkflow';
import AuditTrailView from './components/AuditTrailView';

const TenantDashboard = ({ onGodModeReturn, isImpersonating }) => {
  const [activeTab, setActiveTab] = useState('payroll');
  const [clickCount, setClickCount] = useState(0);

  const handleLogoClick = () => {
    if (!isImpersonating) return;
    setClickCount(prev => prev + 1);
    if (clickCount === 1) {
      onGodModeReturn && onGodModeReturn();
      setClickCount(0);
    }
    setTimeout(() => setClickCount(0), 1000);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-darker)] flex text-white relative overflow-hidden">

      {/* Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[var(--aurora-1)] rounded-full blur-[150px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[var(--aurora-3)] rounded-full blur-[150px]"></div>
      </div>

      {/* Sidebar - Glassmorphism */}
      <aside className="w-72 glass-panel border-r border-white/5 p-6 flex flex-col gap-2 z-10 m-4 rounded-3xl h-[calc(100vh-32px)]">
        <div className="mb-10 px-2 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center text-white font-bold shadow-[0_0_15px_rgba(0,201,255,0.5)]">
            T
          </div>
          <h2 
            className={`font-serif text-lg tracking-wide bg-clip-text text-transparent bg-gradient-to-r ${isImpersonating ? 'from-[var(--danger)] to-[var(--warning)] cursor-pointer' : 'from-white to-gray-400'}`}
            onClick={handleLogoClick}
            title={isImpersonating ? "Klik 2x untuk kembali ke God Mode" : ""}
          >
            [Nama Perusahaan] {isImpersonating && <span className="text-xs ml-1 block">(God Mode)</span>}
          </h2>
        </div>

        <button
          onClick={() => setActiveTab('payroll')}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'payroll' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
        >
          <Calculator size={20} /> <span className="font-medium tracking-wide text-sm">Penggajian & Pajak Pintar</span>
        </button>
        <button
          onClick={() => setActiveTab('workflow')}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'workflow' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
        >
          <CheckCircle size={20} /> <span className="font-medium tracking-wide text-sm">Pengaturan Multi-Persetujuan</span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'audit' ? 'bg-white/10 text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.1)] border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
        >
          <Activity size={20} /> <span className="font-medium tracking-wide text-sm">Jejak Audit Sistem</span>
        </button>
        <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white mt-auto">
          <Settings size={20} /> <span className="font-medium tracking-wide text-sm">Pengaturan Umum</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 z-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto mt-4">
          {activeTab === 'payroll' && <PayrollSettings />}
          {activeTab === 'workflow' && <ApprovalWorkflow />}
          {activeTab === 'audit' && <AuditTrailView />}
        </div>
      </main>
    </div>
  );
};

export default TenantDashboard;
