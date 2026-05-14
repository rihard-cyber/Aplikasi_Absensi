import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Activity, Camera, Calendar, Download, Upload, 
  Search, Filter, CheckCircle2, XCircle, ChevronLeft, 
  MoreVertical, ArrowLeftRight, ShieldAlert, Zap,
  BarChart3, Clock, AlertTriangle, FileSpreadsheet,
  ShieldCheck, CheckSquare, Eye, Trash2, Network
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import BulkScheduleUpload from './components/BulkScheduleUpload';
import HRISExportWrapper from '../../components/HRISExportWrapper';
import { useToast } from '../../components/Toast';


const SubAdminDashboard = ({ isEmbedded = false, initialTab = 'monitor', onCycleRole, tenantId = null }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => {
    if (isEmbedded) return initialTab;
    return sessionStorage.getItem('subadmin_active_tab') || initialTab;
  });

  // Sync auth check (no useEffect delay)
  const checkAccess = () => {
    const userRole = localStorage.getItem('user_role');
    const godKey = sessionStorage.getItem('god_key');
    const opAccess = sessionStorage.getItem('operational_access');
    if (godKey === 'DEWA-999' || opAccess === 'MEMILIKI AKSES' || isEmbedded) return true;
    if (userRole === 'TENANT_ADMIN' || userRole === 'SUB_ADMIN' || userRole === 'SUPER_ADMIN') return true;
    return false;
  };
  const [isAuthorized] = useState(() => checkAccess());

  const [selectedDivision, setSelectedDivision] = useState('all');
  const [selectedProject, setSelectedProject] = useState('all');
  const [projectsList, setProjectsList] = useState([]);
  const [divisionsList, setDivisionsList] = useState([]);
  const [myTenantId, setMyTenantId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [clickCount, setClickCount] = useState(0);
  const toast = useToast();

  React.useEffect(() => {
    if (!isAuthorized && !isEmbedded) {
      toast('Akses Ditolak: Anda tidak memiliki otoritas operasional.', 'error');
      navigate('/');
    }
  }, []);

  const handleLogoClick = () => {
    if (sessionStorage.getItem('god_key') !== 'DEWA-999') return;
    setClickCount(prev => prev + 1);
    if (window.navigator?.vibrate) window.navigator.vibrate(50);
    if (clickCount === 1) { if (onCycleRole) onCycleRole(); setClickCount(0); }
    setTimeout(() => setClickCount(0), 1000);
  };

  const triggerHaptic = (style = 'MEDIUM') => {
    if (window.navigator?.vibrate) window.navigator.vibrate(style === 'HEAVY' ? 80 : 40);
  };

  useEffect(() => {
    const fetchHierarchy = async () => {
      try {
        const userRole = localStorage.getItem('user_role');
        const { data: { session } } = await supabase.auth.getSession();
        let tenantFilter = null;
        if (userRole === 'TENANT_ADMIN' && session?.user?.id) {
          const { data: prof } = await supabase
            .from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
          if (prof?.tenant_id) {
            tenantFilter = prof.tenant_id;
            setMyTenantId(prof.tenant_id);
          }
        }
        let pQuery = supabase.from('projects').select('id, name, code');
        if (tenantFilter) pQuery = pQuery.eq('tenant_id', tenantFilter);
        const { data: pData } = await pQuery;
        if (pData) setProjectsList(pData);
        let dQuery = supabase.from('divisions').select('id, name, project_id');
        if (tenantFilter) dQuery = dQuery.eq('tenant_id', tenantFilter);
        const { data: dData } = await dQuery;
        if (dData) setDivisionsList(dData);
      } catch (e) {
        console.error("Failed to fetch hierarchy", e);
      }
    };
    fetchHierarchy();
  }, [isEmbedded]);

  useEffect(() => {
    if (!isEmbedded) sessionStorage.setItem('subadmin_active_tab', activeTab);
  }, [activeTab, isEmbedded]);

  if (!isAuthorized) return <div className="p-20 text-center opacity-50 uppercase tracking-widest text-xs">Authenticating Authority...</div>;

  // Filter divisions dynamically based on selected project
  const filteredDivisionsList = selectedProject === 'all' 
    ? divisionsList 
    : divisionsList.filter(d => d.project_id === selectedProject);

  return (
    <div className={`min-h-screen text-white font-sans selection:bg-[var(--aurora-3)]/30 ${isEmbedded ? 'bg-transparent' : 'bg-[#0B0C10]'}`}>
      
      {!isEmbedded && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[var(--aurora-3)]/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[var(--aurora-1)]/5 rounded-full blur-[120px]" />
        </div>
      )}

      <div className={`relative z-10 max-w-7xl mx-auto ${isEmbedded ? 'p-0' : 'p-6 pb-32'}`}>
        
        {/* HEADER: Only if not embedded */}
        {!isEmbedded && (
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--aurora-3)] to-[var(--aurora-2)] p-[1px] shadow-[0_0_20px_rgba(0,201,255,0.3)]">
                <div className="w-full h-full bg-[#0B0C10] rounded-2xl flex items-center justify-center text-[var(--aurora-3)]">
                  <ShieldAlert size={32} />
                </div>
              </div>
              <div className={sessionStorage.getItem('god_key') === 'DEWA-999' ? 'cursor-pointer active:scale-95' : ''} onClick={() => onCycleRole && onCycleRole()} title={sessionStorage.getItem('god_key') === 'DEWA-999' ? "Klik untuk Pindah Dasbor" : ""}>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-serif font-bold tracking-tight hover:text-[var(--aurora-3)] transition-colors">Command Center</h1>
                  {sessionStorage.getItem('god_key') === 'DEWA-999' && (
                    <span className="px-2 py-0.5 rounded bg-[var(--danger)] text-[8px] font-black uppercase tracking-tighter">GOD MODE</span>
                  )}
                </div>
                <p className="text-[var(--aurora-3)] text-[10px] uppercase tracking-[0.4em] font-bold mt-1 opacity-80">Operational Authority Portal</p>
              </div>
            </motion.div>
            <motion.button 
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              onClick={() => { triggerHaptic(); navigate('/'); }}
              className="glass-panel px-6 py-3 flex items-center gap-3 border border-white/10 hover:border-[var(--aurora-3)]/50 transition-all group"
            >
              <ArrowLeftRight size={16} className="text-gray-500 group-hover:text-[var(--aurora-3)] transition-colors" />
              <span className="text-xs font-bold uppercase tracking-widest">Kembali ke Portal</span>
            </motion.button>
          </header>
        )}

        {/* QUICK METRICS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
          <MetricCard icon={<Users />} label="Tim Aktif" value="128" color="var(--aurora-3)" />
          <MetricCard icon={<Activity />} label="Hadir" value="112" color="var(--success)" active={filterStatus === 'PRESENT'} onClick={() => setFilterStatus('PRESENT')} />
          <MetricCard icon={<Clock />} label="Terlambat" value="05" color="var(--warning)" active={filterStatus === 'LATE'} onClick={() => setFilterStatus('LATE')} />
          <MetricCard icon={<ShieldCheck />} label="Ijin" value="08" color="#8E2DE2" active={filterStatus === 'PERMISSION'} onClick={() => setFilterStatus('PERMISSION')} />
          <MetricCard icon={<Zap />} label="Cuti" value="03" color="#FF0055" active={filterStatus === 'LEAVE'} onClick={() => setFilterStatus('LEAVE')} />
          <MetricCard icon={<XCircle />} label="Mangkir" value="02" color="var(--danger)" active={filterStatus === 'ABSENT'} onClick={() => setFilterStatus('ABSENT')} />
        </div>

        {/* NAVIGATION & FILTER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar w-full md:w-auto">
            <TabButton active={activeTab === 'monitor'} onClick={() => { triggerHaptic(); setActiveTab('monitor'); }} icon={<BarChart3 />} label="Monitoring" />
            <TabButton active={activeTab === 'verification'} onClick={() => { triggerHaptic(); setActiveTab('verification'); }} icon={<ShieldCheck />} label="Verifikasi & Ijin" />
            <TabButton active={activeTab === 'selfie'} onClick={() => { triggerHaptic(); setActiveTab('selfie'); }} icon={<Camera />} label="Gallery" />
            <TabButton active={activeTab === 'schedule'} onClick={() => { triggerHaptic(); setActiveTab('schedule'); }} icon={<Upload />} label="Upload Jadwal" />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
            <div className="flex items-center gap-2 bg-white/5 p-2 px-4 rounded-2xl border border-white/5 flex-1 md:flex-none min-w-[140px]">
              <Filter size={14} className="text-[var(--aurora-1)]" />
              <select 
                value={selectedProject} 
                onChange={(e) => {
                  setSelectedProject(e.target.value);
                  setSelectedDivision('all'); // Reset division when project changes
                }}
                className="bg-transparent text-[10px] font-bold text-white outline-none cursor-pointer uppercase w-full"
              >
                <option value="all" className="bg-[#0B0C10] text-gray-400">Semua Project</option>
                {projectsList.map(p => (
                  <option key={p.id} value={p.id} className="bg-[#0B0C10] text-white">{p.code ? `[${p.code}] ` : ''}{p.name}</option>
                ))}
              </select>
            </div>
            
            <HRISExportWrapper 
              tenantId={tenantId} 
              projectId={selectedProject} 
              divisionId={selectedDivision} 
            />
            
            <div className="flex items-center gap-2 bg-white/5 p-2 px-4 rounded-2xl border border-white/5 flex-1 md:flex-none min-w-[140px]">
              <Network size={14} className="text-[var(--aurora-3)]" />
              <select 
                value={selectedDivision} 
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="bg-transparent text-[10px] font-bold text-white outline-none cursor-pointer uppercase w-full"
              >
                <option value="all" className="bg-[#0B0C10] text-gray-400">Semua Divisi</option>
                {filteredDivisionsList.map(d => (
                  <option key={d.id} value={d.id} className="bg-[#0B0C10] text-white">{d.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {activeTab === 'monitor' && <MonitoringView filterStatus={filterStatus} selectedDate={selectedDate} onDateChange={setSelectedDate} selectedProject={selectedProject} selectedDivision={selectedDivision} />}
            {activeTab === 'verification' && <VerificationCenterView selectedProject={selectedProject} selectedDivision={selectedDivision} />}
            {activeTab === 'selfie' && <SelfieGalleryView />}
            {activeTab === 'schedule' && <SchedulePortalView tenantId={myTenantId} projectId={selectedProject} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const MetricCard = ({ icon, label, value, color, active, onClick }) => (
  <div 
    onClick={onClick}
    className={`glass-panel p-5 rounded-3xl border transition-all cursor-pointer group ${active ? 'border-[var(--aurora-3)] bg-white/5 shadow-[0_0_20px_rgba(0,201,255,0.1)]' : 'border-white/5 hover:border-white/20'}`}
  >
    <div className="flex items-center gap-3 mb-3">
      <div className={`p-2 rounded-xl bg-white/5 text-[${color}]`} style={{ color }}>{icon}</div>
      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{label}</p>
    </div>
    <h3 className="text-3xl font-bold text-white tracking-tighter">{value}</h3>
  </div>
);

const TabButton = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-3 rounded-2xl transition-all whitespace-nowrap border ${active ? 'bg-white/10 border-white/20 text-[var(--aurora-3)]' : 'bg-transparent border-transparent text-gray-500 hover:text-white'}`}
  >
    {icon} <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
  </button>
);

const MonitoringView = ({ filterStatus, selectedDate, onDateChange, selectedProject, selectedDivision }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [divisions, setDivisions] = useState({});

  useEffect(() => {
    supabase.from('divisions').select('id, name').then(({ data }) => {
      if (data) {
        const map = {}; data.forEach(d => map[d.id] = d.name);
        setDivisions(map);
      }
    });
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [selectedDate, filterStatus, selectedProject, selectedDivision]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('attendance_logs')
        .select(`
          id, action, status, timestamp, distance_meters,
          profiles!inner ( full_name, role, division_id, tenant_id )
        `)
        .gte('timestamp', `${selectedDate}T00:00:00Z`)
        .lte('timestamp', `${selectedDate}T23:59:59Z`);

      if (selectedProject && selectedProject !== 'all') {
        query = query.eq('profiles.project_id', selectedProject);
      }
      if (selectedDivision && selectedDivision !== 'all') {
        query = query.eq('profiles.division_id', selectedDivision);
      }
      
      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        let formatted = data.map(log => ({
          id: log.id,
          name: log.profiles?.full_name || 'Unknown User',
          division: divisions[log.profiles?.division_id] || log.profiles?.role || 'Staff',
          time: new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          status: log.status,
          remarks: log.action === 'CLOCK_IN' ? 'Masuk' : 'Keluar'
        }));
        
        if (filterStatus !== 'ALL') {
          const statusMap = { 'PRESENT': 'ONTIME', 'LATE': 'LATE', 'PERMISSION': 'PERMISSION', 'LEAVE': 'LEAVE', 'ABSENT': 'ABSENT' };
          formatted = formatted.filter(e => 
            e.status === filterStatus || 
            e.status === statusMap[filterStatus] ||
            (filterStatus === 'LATE' && e.status === 'OUT_OF_RANGE')
          );
        }
        
        setEmployees(formatted);
      }
    } catch (e) {
      console.error("Fetch monitoring error", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel rounded-[32px] border border-white/5 overflow-hidden">
      <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
        <h3 className="text-sm font-bold uppercase tracking-widest">Live Monitoring • {selectedDate}</h3>
        <input type="date" value={selectedDate} onChange={(e) => onDateChange(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs outline-none focus:border-[var(--aurora-3)]" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-white/5 text-gray-500 uppercase tracking-widest">
            <tr>
              <th className="p-5 font-bold">Karyawan</th>
              <th className="p-5 font-bold">Role</th>
              <th className="p-5 font-bold">Waktu</th>
              <th className="p-5 font-bold">Status</th>
              <th className="p-5 font-bold">Keterangan</th>
              <th className="p-5 font-bold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan="6" className="p-10"><div className="flex justify-center"><div className="w-full glass-panel p-6 border border-white/5 animate-pulse space-y-4"><div className="h-4 bg-white/10 rounded w-1/4" /><div className="h-3 bg-white/5 rounded w-1/2" /><div className="h-3 bg-white/5 rounded w-1/3" /></div></div></td></tr>
            ) : employees.length === 0 ? (
              <tr><td colSpan="6" className="p-10 text-center text-gray-500 font-bold tracking-widest uppercase">Tidak ada data absensi</td></tr>
            ) : employees.map(emp => (
              <tr key={emp.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="p-5 font-bold">{emp.name}</td>
                <td className="p-5 text-gray-400">{emp.division}</td>
                <td className="p-5 font-mono">{emp.time}</td>
                <td className="p-5"><StatusBadge status={emp.status} /></td>
                <td className="p-5 text-gray-500 italic">"{emp.remarks}"</td>
                <td className="p-5 text-right"><button className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white"><MoreVertical size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const VerificationCenterView = ({ selectedProject, selectedDivision }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, [selectedProject, selectedDivision]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let leavesQuery = supabase
        .from('leave_requests')
        .select('id, type, start_date, reason, status, file_url, created_at, profiles!inner ( full_name, project_id, division_id )')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      if (selectedProject && selectedProject !== 'all') leavesQuery = leavesQuery.eq('profiles.project_id', selectedProject);
      if (selectedDivision && selectedDivision !== 'all') leavesQuery = leavesQuery.eq('profiles.division_id', selectedDivision);

      const { data: leaves, error: leavesErr } = await leavesQuery;

      let docsQuery = supabase
        .from('employee_documents')
        .select('id, doc_type, file_url, verification_status, created_at, profiles!inner ( full_name, project_id, division_id )')
        .eq('verification_status', 'PENDING')
        .order('created_at', { ascending: false });

      if (selectedProject && selectedProject !== 'all') docsQuery = docsQuery.eq('profiles.project_id', selectedProject);
      if (selectedDivision && selectedDivision !== 'all') docsQuery = docsQuery.eq('profiles.division_id', selectedDivision);

      const { data: docs, error: docsErr } = await docsQuery;

      let combined = [];
      if (leaves) {
        combined = [...combined, ...leaves.map(l => ({
          id: `leave_${l.id}`,
          originalId: l.id,
          source: 'leave_requests',
          name: l.profiles?.full_name || 'Unknown',
          type: l.type,
          date: l.start_date,
          reason: l.reason,
          file_url: l.file_url,
          timestamp: new Date(l.created_at).getTime()
        }))];
      }
      if (docs) {
        combined = [...combined, ...docs.map(d => ({
          id: `doc_${d.id}`,
          originalId: d.id,
          source: 'employee_documents',
          name: d.profiles?.full_name || 'Unknown',
          type: d.doc_type,
          date: new Date(d.created_at).toISOString().split('T')[0],
          reason: 'Verifikasi Dokumen Baru',
          file_url: d.file_url,
          timestamp: new Date(d.created_at).getTime()
        }))];
      }
      combined.sort((a, b) => b.timestamp - a.timestamp);
      setRequests(combined);
    } catch (e) {
      console.error("Error fetching requests", e);
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (req, action) => {
    try {
      if (req.source === 'leave_requests') {
        await supabase.from('leave_requests').update({ status: action }).eq('id', req.originalId);
      } else {
        await supabase.from('employee_documents').update({ verification_status: action }).eq('id', req.originalId);
      }
      setRequests(prev => prev.filter(r => r.id !== req.id));
      // Optional: Add to audit_logs
    } catch (e) {
      console.error("Verification failed", e);
    }
  };

  if (loading) return <div className="p-20 text-center text-gray-500 font-bold uppercase tracking-widest">Memuat Permintaan...</div>;
  if (requests.length === 0) return <div className="p-20 text-center text-[var(--success)] font-bold uppercase tracking-widest">Semua Permintaan Sudah Diverifikasi</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {requests.map(req => (
        <div key={req.id} className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4">
          <div className="flex justify-between items-start">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[var(--aurora-3)]"><ShieldCheck size={20} /></div>
              <div><h4 className="font-bold text-white">{req.name}</h4><p className="text-[10px] text-gray-500 uppercase">{req.type} • {req.date}</p></div>
            </div>
            {req.file_url && (
              <a href={req.file_url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-white/5 rounded-xl text-[var(--aurora-3)]" title="Lihat Lampiran">
                <Eye size={18} />
              </a>
            )}
          </div>
          <p className="text-xs text-gray-400 italic">"{req.reason}"</p>
          <div className="flex gap-3 pt-2">
            <button onClick={() => handleVerification(req, 'APPROVED')} className="flex-1 py-3 rounded-xl bg-[var(--success)] hover:bg-green-600 transition-colors text-black text-[10px] font-bold uppercase">Setujui</button>
            <button onClick={() => handleVerification(req, 'REJECTED')} className="flex-1 py-3 rounded-xl bg-white/5 border border-[var(--danger)]/50 text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white transition-colors text-[10px] font-bold uppercase">Tolak</button>
          </div>
        </div>
      ))}
    </div>
  );
};

const SelfieGalleryView = () => <div className="p-20 text-center opacity-30 uppercase tracking-widest text-xs">Gallery System Initializing...</div>;

const SchedulePortalView = ({ tenantId, projectId }) => {
  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 border border-white/5">
        <h2 className="text-xl font-serif font-bold text-white mb-2 flex items-center gap-2">
          <Upload size={20} className="text-[var(--aurora-3)]" /> Manajemen Jadwal Shift
        </h2>
        <p className="text-sm text-gray-400">Upload file CSV untuk mendistribusikan jadwal ke karyawan secara massal.</p>
      </div>
      <BulkScheduleUpload tenantId={tenantId} projectId={projectId} />
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const colors = { 'ONTIME': 'var(--success)', 'OUT_OF_RANGE': 'var(--warning)', 'PRESENT': 'var(--success)', 'LATE': 'var(--warning)', 'PERMISSION': '#8E2DE2', 'LEAVE': '#FF0055', 'ABSENT': 'var(--danger)' };
  return <span className="px-2 py-1 rounded bg-black/40 text-[8px] font-black uppercase tracking-tighter border border-white/5" style={{ color: colors[status] || 'white' }}>{status}</span>;
};

export default SubAdminDashboard;
