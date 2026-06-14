import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { useConfirm } from '../../../components/ConfirmDialog';
import { useSFX } from '../../../utils/useSFX';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Users, Layers, Search, Edit3, CheckCircle2, X, Loader2, Check, ArrowRight, UserCheck, ShieldCheck } from 'lucide-react';

const ROLE_CATEGORIES = [
  { key: 'DIREKTUR', label: 'Direktur' },
  { key: 'HRD', label: 'HRD' },
  { key: 'MANAJEMEN', label: 'Manajemen' },
  { key: 'KARYAWAN', label: 'Karyawan / Staff' },
  { key: 'ADMIN', label: 'Admin (Tenant / Project)' }
];

const MODULE_LIST = [
  { key: 'helpdesk', label: 'Helpdesk Tiket' },
  { key: 'work_order', label: 'Work Order' },
  { key: 'patrol', label: 'Patroli & Mutasi' },
  { key: 'visitor', label: 'Manajemen Tamu' },
  { key: 'booking', label: 'Booking Fasilitas' },
  { key: 'incident', label: 'Laporan K3 Insiden' },
  { key: 'fleet', label: 'Logistik Kendaraan' },
  { key: 'inventory', label: 'Stok & Inventaris' },
  { key: 'shift_swap', label: 'Tukar Shift' },
  { key: 'hybrid_work', label: 'Aturan WFH/WFA' },
  { key: 'payroll', label: 'Keuangan & Payroll' },
  { key: 'it', label: 'IT Management' },
  { key: 'legal', label: 'Legal Management' }
];

const FEATURE_LIST = [
  { id: 'leave', label: 'Izin / Cuti', category: 'Umum' },
  { id: 'lembur', label: 'Pengajuan Lembur', category: 'Umum' },
  { id: 'qr', label: 'QR Presensi', category: 'Umum' },
  { id: 'req-absen', label: 'Request Absensi', category: 'Umum' },
  { id: 'edit-profile', label: 'Edit Profil Mandiri', category: 'Umum' },
  { id: 'contract', label: 'PKWT / Kontrak Kerja', category: 'Umum' },
  { id: 'chatbot', label: 'Tanya AI (Chatbot)', category: 'Umum' },
  { id: 'attendance-calendar', label: 'Riwayat & Kalender Absen', category: 'Umum' },
  { id: 'task-plan', label: 'Rencana Kerja Harian', category: 'Umum' },
  { id: 'salary', label: 'Slip Gaji & Upah', category: 'Keuangan', module: 'payroll' },
  { id: 'loan', label: 'Pinjaman Karyawan', category: 'Keuangan', module: 'payroll' },
  { id: 'reimbursement', label: 'Reimbursement Klaim', category: 'Keuangan', module: 'payroll' },
  { id: 'helpdesk', label: 'Portal Tiket Helpdesk', category: 'Operasional', module: 'helpdesk' },
  { id: 'booking', label: 'Booking Ruangan/Fasilitas', category: 'Operasional', module: 'booking' },
  { id: 'patrol-scan', label: 'Scan Pos Patroli', category: 'Operasional', module: 'patrol' },
  { id: 'patrol-lapor', label: 'Lapor Temuan Patroli', category: 'Operasional', module: 'patrol' },
  { id: 'patrol-mutasi', label: 'Buku Mutasi Satpam', category: 'Operasional', module: 'patrol' },
  { id: 'patrol-handover', label: 'Handover Jaga Shift', category: 'Operasional', module: 'patrol' },
  { id: 'cleaning-task', label: 'Task Sheet Cleaning', category: 'Operasional' },
  { id: 'teknisi-task', label: 'Worksheet Maintenance Teknik', category: 'Operasional' },
  { id: 'driver-trip', label: 'Log Perjalanan Driver', category: 'Operasional' },
  { id: 'office-ga', label: 'GA & Inventaris Kantor', category: 'Operasional' },
  { id: 'it-equipment', label: 'Pemesanan Alat IT', category: 'Operasional', module: 'it' },
  { id: 'legal-view', label: 'Portal Dokumen Legal', category: 'Operasional', module: 'legal' },
  { id: 'shift-swap', label: 'Form Tukar Shift Kerja', category: 'Umum', module: 'shift_swap' },
  { id: 'incident-report', label: 'Lapor Insiden K3', category: 'Operasional', module: 'incident' },
  { id: 'home-address', label: 'Registrasi Alamat Rumah WFH', category: 'Umum', module: 'hybrid_work' }
];

const TenantAuthorityControl = ({ searchQuery = '' }) => {
  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  
  // Loading states
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [savingModules, setSavingModules] = useState(false);
  
  // Settings state
  const [activeModules, setActiveModules] = useState({});
  const [rolePermissions, setRolePermissions] = useState({
    DIREKTUR: [],
    HRD: [],
    MANAJEMEN: [],
    KARYAWAN: [],
    ADMIN: []
  });
  const [activeRoleTab, setActiveRoleTab] = useState('KARYAWAN');
  
  // Employees list for selected tenant
  const [employees, setEmployees] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  
  // Projects & Divisions of selected tenant (for promotion modal)
  const [projects, setProjects] = useState([]);
  const [divisions, setDivisions] = useState([]);
  
  // Edit Employee modal
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editRole, setEditRole] = useState('EMPLOYEE');
  const [editPosition, setEditPosition] = useState('');
  const [editProjectId, setEditProjectId] = useState('');
  const [editDivisionId, setEditDivisionId] = useState('');
  const [editOperationalAccess, setEditOperationalAccess] = useState(false);
  const [savingEmployee, setSavingEmployee] = useState(false);
  
  const toast = useToast();
  const confirm = useConfirm();
  const { playClick, playConfirm, playAlert } = useSFX();

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    if (selectedTenantId) {
      fetchTenantConfigurations(selectedTenantId);
      fetchTenantEmployees(selectedTenantId);
    } else {
      setEmployees([]);
      setActiveModules({});
      setRolePermissions({
        DIREKTUR: [],
        HRD: [],
        MANAJEMEN: [],
        KARYAWAN: [],
        ADMIN: []
      });
    }
  }, [selectedTenantId]);

  useEffect(() => {
    if (!selectedTenantId) return;

    const channel = supabase
      .channel(`realtime:tenant-employees-${selectedTenantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
        if (payload.new?.tenant_id === selectedTenantId || payload.old?.tenant_id === selectedTenantId) {
          fetchTenantEmployees(selectedTenantId);
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendance_logs' }, (payload) => {
        if (payload.new?.tenant_id === selectedTenantId) {
          fetchTenantEmployees(selectedTenantId);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTenantId]);

  const fetchTenants = async () => {
    setLoadingTenants(true);
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, tier')
        .order('name');
      if (error) throw error;
      setTenants(data || []);
      if (data && data.length > 0) {
        setSelectedTenantId(data[0].id);
      }
    } catch (e) {
      console.error('Error fetching tenants:', e);
      toast('Gagal mengambil daftar tenant.', 'error');
    } finally {
      setLoadingTenants(false);
    }
  };

  const fetchTenantConfigurations = async (tenantId) => {
    setLoadingConfig(true);
    try {
      // 1. Fetch Tenant Modules
      const { data: moduleData, error: moduleError } = await supabase
        .from('tenant_modules')
        .select('module_key, is_active')
        .eq('tenant_id', tenantId);
      if (moduleError) throw moduleError;
      
      const modulesObj = {};
      MODULE_LIST.forEach(m => {
        modulesObj[m.key] = false;
      });
      if (moduleData) {
        moduleData.forEach(m => {
          modulesObj[m.module_key] = m.is_active;
        });
      }
      setActiveModules(modulesObj);

      // 2. Fetch Role Permissions
      const { data: permData, error: permError } = await supabase
        .from('tenant_role_permissions')
        .select('role_name, allowed_modules')
        .eq('tenant_id', tenantId);
      
      // If error is code for relation not found, do not crash but warn
      if (permError && permError.code !== 'PGRST116') {
        console.warn('Otoritas table might not exist yet:', permError.message);
      }
      
      const permissionsObj = {
        DIREKTUR: [],
        HRD: [],
        MANAJEMEN: [],
        KARYAWAN: [],
        ADMIN: []
      };
      if (permData) {
        permData.forEach(p => {
          if (permissionsObj[p.role_name]) {
            permissionsObj[p.role_name] = p.allowed_modules || [];
          }
        });
      }
      setRolePermissions(permissionsObj);

      // 3. Fetch Projects and Divisions for selected tenant
      const { data: projData } = await supabase.from('projects').select('id, name').eq('tenant_id', tenantId).order('name');
      const { data: divData } = await supabase.from('divisions').select('id, name').eq('tenant_id', tenantId).order('name');
      setProjects(projData || []);
      setDivisions(divData || []);
    } catch (e) {
      console.error('Error loading tenant configs:', e);
    } finally {
      setLoadingConfig(false);
    }
  };

  const fetchTenantEmployees = async (tenantId) => {
    setLoadingEmployees(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, nip, role, position, project_id, division_id, operational_access, projects(name), divisions(name)')
        .eq('tenant_id', tenantId)
        .order('full_name');
      if (error) throw error;
      setEmployees(data || []);
    } catch (e) {
      console.error('Error fetching employees:', e);
      toast('Gagal memuat data karyawan.', 'error');
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleToggleModule = async (moduleKey, currentStatus) => {
    playClick();
    const nextStatus = !currentStatus;
    setActiveModules(prev => ({ ...prev, [moduleKey]: nextStatus }));
    setSavingModules(true);
    try {
      const { error } = await supabase
        .from('tenant_modules')
        .upsert({
          tenant_id: selectedTenantId,
          module_key: moduleKey,
          is_active: nextStatus,
          updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id, module_key' });
      if (error) throw error;
      toast(`Modul ${moduleKey} diperbarui menjadi ${nextStatus ? 'Aktif' : 'Non-aktif'}`, 'success');
    } catch (e) {
      console.error('Module update failed:', e);
      toast('Gagal memperbarui modul tenant.', 'error');
      setActiveModules(prev => ({ ...prev, [moduleKey]: currentStatus }));
    } finally {
      setSavingModules(false);
    }
  };

  const handleToggleFeature = async (featureId) => {
    playClick();
    const currentAllowed = rolePermissions[activeRoleTab] || [];
    let nextAllowed;
    if (currentAllowed.includes(featureId)) {
      nextAllowed = currentAllowed.filter(id => id !== featureId);
    } else {
      nextAllowed = [...currentAllowed, featureId];
    }

    setRolePermissions(prev => ({
      ...prev,
      [activeRoleTab]: nextAllowed
    }));

    setSavingPermissions(true);
    try {
      const { error } = await supabase
        .from('tenant_role_permissions')
        .upsert({
          tenant_id: selectedTenantId,
          role_name: activeRoleTab,
          allowed_modules: nextAllowed,
          updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id, role_name' });
      if (error) {
        // If table doesn't exist, prompt migration
        if (error.code === '42P01') {
          throw new Error('Tabel tenant_role_permissions belum dibuat. Harap jalankan script migration SQL add_tenant_role_permissions.sql terlebih dahulu.');
        }
        throw error;
      }
      playConfirm();
    } catch (e) {
      console.error('Error saving role permissions:', e);
      toast(e.message || 'Gagal menyimpan otoritas. Pastikan script migrasi SQL sudah dijalankan.', 'error');
      setRolePermissions(prev => ({
        ...prev,
        [activeRoleTab]: currentAllowed
      }));
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleSelectAllFeatures = async () => {
    playConfirm();
    const allIds = FEATURE_LIST.map(f => f.id);
    const prevAllowed = rolePermissions[activeRoleTab] || [];
    
    setRolePermissions(prev => ({
      ...prev,
      [activeRoleTab]: allIds
    }));

    try {
      const { error } = await supabase
        .from('tenant_role_permissions')
        .upsert({
          tenant_id: selectedTenantId,
          role_name: activeRoleTab,
          allowed_modules: allIds,
          updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id, role_name' });
      if (error) throw error;
      toast(`Semua hak akses diberikan ke role ${activeRoleTab}`, 'success');
    } catch (e) {
      toast('Gagal menyimpan otoritas.', 'error');
      setRolePermissions(prev => ({ ...prev, [activeRoleTab]: prevAllowed }));
    }
  };

  const handleClearAllFeatures = async () => {
    playConfirm();
    const prevAllowed = rolePermissions[activeRoleTab] || [];
    
    setRolePermissions(prev => ({
      ...prev,
      [activeRoleTab]: []
    }));

    try {
      const { error } = await supabase
        .from('tenant_role_permissions')
        .upsert({
          tenant_id: selectedTenantId,
          role_name: activeRoleTab,
          allowed_modules: [],
          updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id, role_name' });
      if (error) throw error;
      toast(`Semua hak akses dicabut untuk role ${activeRoleTab}`, 'success');
    } catch (e) {
      toast('Gagal menyimpan otoritas.', 'error');
      setRolePermissions(prev => ({ ...prev, [activeRoleTab]: prevAllowed }));
    }
  };

  const handleEditEmployee = (emp) => {
    playClick();
    setEditingEmployee(emp);
    setEditRole(emp.role || 'EMPLOYEE');
    setEditPosition(emp.position || '');
    setEditProjectId(emp.project_id || '');
    setEditDivisionId(emp.division_id || '');
    setEditOperationalAccess(!!emp.operational_access);
  };

  const handleSaveEmployeeOtoritas = async () => {
    if (!editingEmployee) return;
    setSavingEmployee(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          role: editRole,
          position: editPosition,
          project_id: editProjectId || null,
          division_id: editDivisionId || null,
          operational_access: editOperationalAccess
        })
        .eq('id', editingEmployee.id);
      
      if (error) throw error;
      
      toast(`Otoritas profil ${editingEmployee.full_name} berhasil diperbarui.`, 'success');
      playConfirm();
      setEditingEmployee(null);
      fetchTenantEmployees(selectedTenantId);
    } catch (e) {
      console.error('Failed to update employee access:', e);
      toast('Gagal memperbarui otoritas karyawan.', 'error');
    } finally {
      setSavingEmployee(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const query = (employeeSearch || searchQuery || '').toLowerCase();
    return (
      emp.full_name?.toLowerCase().includes(query) ||
      emp.nip?.toLowerCase().includes(query) ||
      emp.position?.toLowerCase().includes(query) ||
      emp.role?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex flex-col gap-6 animate-fade-in w-full text-white pb-16">
      
      {/* 1. Header & Selector Tenant */}
      <div className="glass-panel p-6 rounded-[32px] border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden bg-gradient-to-br from-white/[0.02] to-transparent">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--aurora-1)] rounded-full blur-[80px] opacity-10 pointer-events-none"></div>
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold tracking-wide flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[var(--warning)]/10 text-[var(--warning)] flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.2)] shrink-0">
              <Shield size={20} />
            </span>
            Pengaturan Otoritas & Tenant
          </h2>
          <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Super Admin Core Control & RBAC Panel</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
          <span className="text-xs text-gray-400 font-bold whitespace-nowrap uppercase tracking-wider">Pilih Tenant:</span>
          {loadingTenants ? (
            <div className="flex items-center gap-2 text-xs text-gray-500"><Loader2 size={16} className="animate-spin text-[var(--aurora-3)]" /> Loading...</div>
          ) : (
            <div className="relative flex-1 md:flex-initial">
              <select
                value={selectedTenantId}
                onChange={(e) => { setSelectedTenantId(e.target.value); playClick(); }}
                className="w-full bg-[#12141A] border border-white/20 rounded-xl px-4 py-3 text-sm text-white outline-none appearance-none pr-10 focus:border-[var(--aurora-3)] transition-all cursor-pointer font-bold"
              >
                <option value="">-- Pilih Perusahaan --</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.tier})</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">▼</div>
            </div>
          )}
        </div>
      </div>

      {selectedTenantId ? (
        <>
          {/* 2. Main Config Area: Modules (Left) and RBAC Permissions (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* [LEFT COLUMN: MODULE CONTROL] - 4 Columns Span */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="glass-panel p-5 rounded-3xl border border-white/10 relative overflow-hidden flex flex-col h-full bg-[#0E1015]/80">
                <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
                  <div>
                    <h3 className="font-serif text-base font-bold flex items-center gap-2">
                      <Layers size={16} className="text-[var(--aurora-3)]" />
                      Fitur SaaS Aktif
                    </h3>
                    <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">Kontrol Akses Level Perusahaan</p>
                  </div>
                  {loadingConfig && <Loader2 size={14} className="animate-spin text-gray-500" />}
                </div>

                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                  {MODULE_LIST.map(mod => {
                    const active = !!activeModules[mod.key];
                    return (
                      <label 
                        key={mod.key} 
                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                          active 
                            ? 'bg-[var(--aurora-3)]/5 border-[var(--aurora-3)]/30 hover:border-[var(--aurora-3)]/50' 
                            : 'bg-white/5 border-white/5 hover:bg-white/[0.08] hover:border-white/10'
                        }`}
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="text-xs font-bold text-white tracking-wide truncate">{mod.label}</span>
                          <span className="text-[8px] text-gray-500 font-mono mt-0.5 uppercase">{mod.key}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={active}
                          disabled={savingModules}
                          onChange={() => handleToggleModule(mod.key, active)}
                          className="accent-[var(--aurora-3)] w-4 h-4 rounded-lg cursor-pointer"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* [RIGHT COLUMN: RBAC PERMISSIONS] - 8 Columns Span */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              <div className="glass-panel p-5 rounded-3xl border border-white/10 relative overflow-hidden flex flex-col bg-[#0E1015]/80">
                
                {/* Header configuration */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 border-b border-white/5 pb-4">
                  <div>
                    <h3 className="font-serif text-base font-bold flex items-center gap-2">
                      <ShieldCheck size={18} className="text-[var(--warning)]" />
                      Pengaturan Otoritas Jabatan
                    </h3>
                    <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">Hak Akses Berdasarkan Kategori Pegawai</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSelectAllFeatures}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-[9px] font-black uppercase tracking-wider transition-all"
                    >
                      Beri Semua
                    </button>
                    <button
                      onClick={handleClearAllFeatures}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-[9px] font-black uppercase tracking-wider text-rose-400 transition-all"
                    >
                      Cabut Semua
                    </button>
                  </div>
                </div>

                {/* Role Tabs */}
                <div className="flex flex-wrap gap-1.5 mb-4 p-1 bg-black/40 rounded-2xl border border-white/5">
                  {ROLE_CATEGORIES.map(role => {
                    const active = activeRoleTab === role.key;
                    return (
                      <button
                        key={role.key}
                        onClick={() => { setActiveRoleTab(role.key); playClick(); }}
                        className={`flex-1 min-w-[90px] py-2 px-3 rounded-xl text-center text-xs font-bold transition-all uppercase tracking-wide whitespace-nowrap ${
                          active
                            ? 'bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white shadow-lg shadow-purple-900/30'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {role.label}
                      </button>
                    );
                  })}
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                  {FEATURE_LIST.map(feat => {
                    const isModuleRequiredActive = !feat.module || activeModules[feat.module];
                    const currentAllowed = rolePermissions[activeRoleTab] || [];
                    const isChecked = currentAllowed.includes(feat.id);

                    return (
                      <div 
                        key={feat.id}
                        onClick={() => isModuleRequiredActive && handleToggleFeature(feat.id)}
                        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all select-none ${
                          !isModuleRequiredActive 
                            ? 'opacity-30 cursor-not-allowed bg-black/20 border-white/5' 
                            : 'cursor-pointer'
                        } ${
                          isChecked && isModuleRequiredActive
                            ? 'bg-[var(--aurora-1)]/5 border-[var(--aurora-1)]/30'
                            : 'bg-white/5 border-white/5 hover:bg-white/[0.08]'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                          isChecked && isModuleRequiredActive
                            ? 'bg-[var(--aurora-1)] border-[var(--aurora-1)] text-white'
                            : 'border-white/20 text-transparent'
                        }`}>
                          <Check size={12} strokeWidth={4} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white leading-tight">{feat.label}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[7.5px] px-1.5 py-0.5 rounded bg-white/10 text-gray-400 uppercase tracking-widest font-black">{feat.category}</span>
                            {feat.module && (
                              <span className={`text-[7.5px] px-1.5 py-0.5 rounded uppercase tracking-widest font-black ${
                                isModuleRequiredActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                              }`}>
                                Modul: {feat.module} {!isModuleRequiredActive && '(Mati)'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>

          {/* 3. Employee Access Control Section */}
          <div className="glass-panel p-6 rounded-[32px] border border-white/10 flex flex-col bg-[#0E1015]/80 mt-2">
            
            {/* Header / Search bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h3 className="font-serif text-lg font-bold flex items-center gap-2">
                  <Users size={18} className="text-[var(--aurora-3)]" />
                  Kontrol Otoritas & Jabatan Pegawai
                </h3>
                <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Promosi Admin, Penugasan Cabang / Divisi</p>
              </div>

              <div className="relative w-full md:w-80">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Cari nama karyawan, NIP, atau Jabatan..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="w-full bg-[#12141A] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-xs text-white outline-none transition-all focus:border-[var(--aurora-3)] hover:border-white/20"
                />
              </div>
            </div>

            {/* Employees Table / Grid */}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 text-[9px] text-gray-500 uppercase tracking-widest border-b border-white/10">
                    <th className="p-4 font-bold">Nama Karyawan</th>
                    <th className="p-4 font-bold">NIP / Jabatan</th>
                    <th className="p-4 font-bold">Role Absensi</th>
                    <th className="p-4 font-bold">Lokasi / Cabang Project</th>
                    <th className="p-4 font-bold">Divisi</th>
                    <th className="p-4 font-bold">Status Otoritas</th>
                    <th className="p-4 font-bold text-center">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loadingEmployees ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-xs text-gray-500">
                        <Loader2 size={20} className="animate-spin text-[var(--aurora-3)] mx-auto mb-2" />
                        Memuat data karyawan...
                      </td>
                    </tr>
                  ) : filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-xs text-gray-500 italic">
                        Karyawan tidak ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map(emp => {
                      const isSubAdmin = emp.role === 'SUB_ADMIN';
                      const isTenantAdmin = emp.role === 'TENANT_ADMIN';
                      const isSuper = emp.role === 'SUPER_ADMIN';

                      return (
                        <tr key={emp.id} className="hover:bg-white/[0.02] transition-colors text-xs">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center font-bold text-white shrink-0">
                                {emp.full_name?.charAt(0)}
                              </div>
                              <span className="font-bold text-white tracking-wide">{emp.full_name}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <p className="font-mono text-gray-400 text-[10px]">{emp.nip || '-'}</p>
                            <p className="text-gray-500 text-[10px] mt-0.5 font-bold uppercase tracking-wider">{emp.position || 'Staff'}</p>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                              isSuper ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                              isTenantAdmin ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                              isSubAdmin ? 'bg-[var(--aurora-3)]/10 text-[var(--aurora-3)] border border-[var(--aurora-3)]/20' :
                              'bg-gray-500/10 text-gray-400'
                            }`}>
                              {emp.role}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-gray-300 font-medium">{emp.projects?.name || 'GLOBAL / HO'}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-gray-300 font-medium">{emp.divisions?.name || 'ALL DIVISION'}</span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${emp.operational_access ? 'bg-[var(--success)] shadow-[0_0_6px_var(--success)]' : 'bg-gray-600'}`} />
                              <span className={`text-[10px] font-bold ${emp.operational_access ? 'text-[var(--success)]' : 'text-gray-500'}`}>
                                {emp.operational_access ? 'Akses Operasional' : 'Akses Presensi'}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleEditEmployee(emp)}
                              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 mx-auto"
                            >
                              <Edit3 size={12} /> Edit Otoritas
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 glass-panel rounded-3xl border border-white/5">
          <p className="text-gray-500 text-sm">Pilih tenant terlebih dahulu untuk mengonfigurasi modul & otoritas.</p>
        </div>
      )}

      {/* --- MODAL EDIT OTORITAS KARYAWAN --- */}
      <AnimatePresence>
        {editingEmployee && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => !savingEmployee && setEditingEmployee(null)}
            />

            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              className="relative z-10 w-full max-w-md bg-[#12141A] border border-white/10 rounded-[32px] p-6 shadow-2xl overflow-y-auto max-h-[85vh] custom-scrollbar text-white"
            >
              <div className="absolute top-4 right-4 z-20">
                <button
                  disabled={savingEmployee}
                  onClick={() => setEditingEmployee(null)}
                  className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[var(--aurora-3)]/10 text-[var(--aurora-3)] flex items-center justify-center border border-white/5">
                  <UserCheck size={20} />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-white leading-tight">Ubah Otoritas & Project</h3>
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">Pegawai: {editingEmployee.full_name}</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* 1. NIP & Name View */}
                <div className="p-3 bg-white/5 rounded-2xl border border-white/5 flex flex-col gap-1">
                  <span className="text-[8px] text-gray-500 uppercase tracking-widest font-black">Identitas Pegawai</span>
                  <p className="text-xs font-bold text-white">{editingEmployee.full_name}</p>
                  <p className="text-[10px] font-mono text-gray-400">NIP: {editingEmployee.nip || '-'}</p>
                </div>

                {/* 2. Select Role */}
                <div>
                  <label className="text-[9px] text-gray-500 uppercase tracking-widest font-black ml-1 mb-1 block">Role Keanggotaan</label>
                  <div className="relative">
                    <select
                      value={editRole}
                      onChange={(e) => { setEditRole(e.target.value); playClick(); }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none text-white focus:border-[var(--aurora-3)] appearance-none pr-10 cursor-pointer"
                    >
                      <option value="EMPLOYEE" className="bg-[#12141A]">EMPLOYEE (Karyawan Biasa)</option>
                      <option value="SUB_ADMIN" className="bg-[#12141A]">SUB_ADMIN (Admin Project / Supervisor)</option>
                      <option value="TENANT_ADMIN" className="bg-[#12141A]">TENANT_ADMIN (Admin Utama Perusahaan)</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">▼</div>
                  </div>
                </div>

                {/* 3. Input Position */}
                <div>
                  <label className="text-[9px] text-gray-500 uppercase tracking-widest font-black ml-1 mb-1 block">Jabatan Resmi (Position)</label>
                  <input
                    type="text"
                    value={editPosition}
                    onChange={(e) => setEditPosition(e.target.value)}
                    placeholder="Contoh: Direktur, HR Manajer, Security, Staff..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none text-white focus:border-[var(--aurora-3)] placeholder:text-gray-600"
                  />
                  <p className="text-[8px] text-gray-600 mt-1 ml-1 leading-relaxed">
                    *Jabatan ini otomatis memetakan hak akses jika tab RBAC di atas terkonfigurasi. (Contoh: ketik "Direktur" untuk otomatis memetakan hak akses role DIREKTUR).
                  </p>
                </div>

                {/* 4. Select Project */}
                <div>
                  <label className="text-[9px] text-gray-500 uppercase tracking-widest font-black ml-1 mb-1 block">Penugasan Cabang / Lokasi Project</label>
                  <div className="relative">
                    <select
                      value={editProjectId}
                      onChange={(e) => { setEditProjectId(e.target.value); setEditDivisionId(''); playClick(); }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none text-white focus:border-[var(--aurora-3)] appearance-none pr-10 cursor-pointer"
                    >
                      <option value="" className="bg-[#12141A]">-- Global / Head Office --</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id} className="bg-[#12141A]">{p.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">▼</div>
                  </div>
                </div>

                {/* 5. Select Division */}
                <div>
                  <label className="text-[9px] text-gray-500 uppercase tracking-widest font-black ml-1 mb-1 block">Penugasan Divisi Kerja</label>
                  <div className="relative">
                    <select
                      value={editDivisionId}
                      disabled={!editProjectId}
                      onChange={(e) => { setEditDivisionId(e.target.value); playClick(); }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none text-white focus:border-[var(--aurora-3)] appearance-none pr-10 cursor-pointer disabled:opacity-40"
                    >
                      <option value="" className="bg-[#12141A]">-- Pilih Divisi (Pilih Project Dulu) --</option>
                      {divisions.filter(d => d.project_id === editProjectId).map(d => (
                        <option key={d.id} value={d.id} className="bg-[#12141A]">{d.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">▼</div>
                  </div>
                </div>

                {/* 6. Toggle Operational Access */}
                <label className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-2xl cursor-pointer hover:bg-white/[0.08] transition-all">
                  <div>
                    <p className="text-xs font-bold text-white">Ijin Akses Dashboard Admin</p>
                    <p className="text-[8px] text-gray-500 mt-1 uppercase tracking-wider">Operational / Dashboard Access</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={editOperationalAccess}
                    onChange={(e) => { setEditOperationalAccess(e.target.checked); playClick(); }}
                    className="accent-[var(--aurora-3)] w-4 h-4 rounded-lg cursor-pointer"
                  />
                </label>

                {/* Submit button */}
                <button
                  onClick={handleSaveEmployeeOtoritas}
                  disabled={savingEmployee}
                  className="w-full py-4 bg-gradient-to-r from-[var(--aurora-1)] to-[#00C9FF] text-white font-black text-xs tracking-[0.2em] uppercase rounded-xl shadow-lg hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2 mt-2"
                >
                  {savingEmployee ? (
                    <><Loader2 size={14} className="animate-spin" /> Menyimpan...</>
                  ) : (
                    <>Simpan Perubahan Otoritas</>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TenantAuthorityControl;
