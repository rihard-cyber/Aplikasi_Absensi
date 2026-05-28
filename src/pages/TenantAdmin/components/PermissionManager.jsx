/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, UserPlus, Trash2, CheckCircle2, Search, Loader2, X } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { useConfirm } from '../../../components/ConfirmDialog';

const PermissionManager = () => {
  const [subAdmins, setSubAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [tenantId, setTenantId] = useState(null);

  // Form State for Adding Sub-Admin
  const [searchNik, setSearchNik] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundEmployee, setFoundEmployee] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedDivisionId, setSelectedDivisionId] = useState('');
  const [projects, setProjects] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
      const tenantId = profile?.tenant_id;

      if (!tenantId && !isGod) return;

      setTenantId(tenantId);

      // Fetch Sub-Admins
      let query = supabase
        .from('profiles')
        .select('id, full_name, role, nip, operational_access, projects(name), divisions(name)')
        .eq('operational_access', true)
        .in('role', ['SUB_ADMIN', 'TENANT_ADMIN']);
      if (tenantId) query = query.eq('tenant_id', tenantId);
      const { data: admins } = await query.order('full_name');
      if (admins) setSubAdmins(admins);

      if (tenantId) {
        const { data: projData } = await supabase.from('projects').select('id, name').eq('tenant_id', tenantId);
        if (projData) setProjects(projData);
        const { data: divData } = await supabase.from('divisions').select('id, name, project_id').eq('tenant_id', tenantId);
        if (divData) setDivisions(divData);
      }

    } catch (e) {
      console.error("Error fetching data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchEmployee = async () => {
    if (!searchNik) return;
    setIsSearching(true);
    setFoundEmployee(null);
    try {
      let query = supabase
        .from('profiles')
        .select('id, nip, full_name, project_id, division_id')
        .eq('nip', searchNik);
      if (tenantId) query = query.eq('tenant_id', tenantId);
      const { data } = await query.maybeSingle();
      
      if (data) {
        setFoundEmployee(data);
        setSelectedProjectId(data.project_id || '');
        setSelectedDivisionId(data.division_id || '');
      } else {
        toast('Karyawan tidak ditemukan!', 'error');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddSubAdmin = async () => {
    if (!foundEmployee) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          role: 'SUB_ADMIN', 
          operational_access: true,
          project_id: selectedProjectId || null,
          division_id: selectedDivisionId || null
        })
        .eq('id', foundEmployee.id);
      
      if (!error) {
        toast(`${foundEmployee.full_name} berhasil diberikan otoritas sub-admin.`, 'success');
        setIsAddModalOpen(false);
        setFoundEmployee(null);
        setSearchNik('');
        fetchInitialData();
      } else {
        throw error;
      }
    } catch (e) {
      toast("Gagal memberikan otoritas: " + e.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (adminId, name) => {
    const ok = await confirm(`Cabut otoritas admin untuk ${name}? Karyawan ini akan kembali menjadi Employee biasa.`, 'Cabut Otoritas');
    if (!ok) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          role: 'EMPLOYEE', 
          operational_access: false 
        })
        .eq('id', adminId);
      
      if (!error) {
        fetchInitialData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredAdmins = subAdmins.filter(admin => 
    admin.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.nip.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white/5 p-6 rounded-[32px] border border-white/10">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-wide">Permission Manager</h2>
          <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Delegasikan Otoritas Pengelolaan Tim</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-[var(--aurora-1)] text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold text-sm hover:shadow-[0_0_20px_rgba(142,45,226,0.4)] transition-all whitespace-nowrap"
        >
          <UserPlus size={18} /> Tambah Sub-Admin
        </button>
      </div>

      <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Cari nama atau NIK..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0B0C10] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white outline-none focus:border-[var(--aurora-1)]" 
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 text-[10px] text-gray-500 uppercase tracking-widest">
                <th className="p-6 font-medium">Nama Karyawan</th>
                <th className="p-6 font-medium">Cakupan Otoritas</th>
                <th className="p-6 font-medium">Ijin Akses</th>
                <th className="p-6 font-medium">Status</th>
                <th className="p-6 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="5" className="p-10"><div className="w-full glass-panel p-6 border border-white/5 animate-pulse space-y-4"><div className="h-4 bg-white/10 rounded w-1/4" /><div className="h-3 bg-white/5 rounded w-1/3" /><div className="h-3 bg-white/5 rounded w-1/2" /></div></td></tr>
              ) : filteredAdmins.length === 0 ? (
                <tr><td colSpan="5" className="p-10 text-center text-gray-500 italic">{(() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })() ? 'SUPER ADMIN PREVIEW — Tidak ada tenant terpilih. Silakan pilih tenant untuk mengelola otoritas.' : 'Tidak ada Sub-Admin ditemukan.'}</td></tr>
              ) : filteredAdmins.map((admin) => (
                <tr key={admin.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] p-[1px]">
                        <div className="w-full h-full bg-[var(--bg-dark)] rounded-[11px] flex items-center justify-center text-xs font-bold text-white">
                          {admin.full_name.charAt(0)}
                        </div>
                      </div>
                      <div>
                        <p className="font-bold text-white">{admin.full_name}</p>
                        <p className="text-[10px] text-gray-500">{admin.nip}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="space-y-1">
                      <span className="px-2 py-0.5 rounded-lg bg-[var(--aurora-3)]/10 text-[var(--aurora-3)] text-[10px] font-bold border border-[var(--aurora-3)]/20">
                        {admin.projects?.name || 'SEMUA PROJECT'}
                      </span>
                      {admin.divisions?.name && (
                        <p className="text-[9px] text-gray-500 mt-1">Divisi: {admin.divisions.name}</p>
                      )}
                    </div>
                  </td>
                  <td className="p-6">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                      {admin.role === 'TENANT_ADMIN' ? 'Full Control' : 'Validator & Monitoring'}
                    </span>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[var(--success)] shadow-[0_0_8px_var(--success)]" />
                      <span className="text-xs text-[var(--success)] font-medium">Active</span>
                    </div>
                  </td>
                  <td className="p-6 text-right space-x-3">
                    <button 
                      onClick={() => handleRevoke(admin.id, admin.full_name)}
                      className="text-gray-500 hover:text-[var(--danger)] transition-colors p-2 hover:bg-[var(--danger)]/10 rounded-lg"
                      title="Cabut Otoritas"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md glass-panel p-8 rounded-[40px] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-serif font-bold text-white">Delegasi Otoritas</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 text-gray-500 hover:text-white transition-colors"><X size={20}/></button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Cari Karyawan (NIK)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Masukkan NIK..." 
                      value={searchNik}
                      onChange={(e) => setSearchNik(e.target.value)}
                      className="flex-1 bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-1)]"
                    />
                    <button 
                      onClick={handleSearchEmployee}
                      disabled={isSearching}
                      className="px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-[var(--aurora-3)]"
                    >
                      {isSearching ? <Loader2 size={16} className="animate-spin" /> : 'CARI'}
                    </button>
                  </div>
                </div>

                {foundEmployee && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="w-12 h-12 rounded-full bg-[var(--aurora-1)]/20 flex items-center justify-center text-[var(--aurora-1)] font-bold">
                        {foundEmployee.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-white">{foundEmployee.full_name}</p>
                        <p className="text-xs text-gray-500">{foundEmployee.nip}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Cakupan Project</label>
                        <select 
                          value={selectedProjectId}
                          onChange={(e) => {
                            setSelectedProjectId(e.target.value);
                            setSelectedDivisionId('');
                          }}
                          className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-[var(--aurora-3)]"
                        >
                          <option value="">-- Semua Project --</option>
                          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Cakupan Divisi</label>
                        <select 
                          value={selectedDivisionId}
                          onChange={(e) => setSelectedDivisionId(e.target.value)}
                          className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-[var(--aurora-3)]"
                        >
                          <option value="">-- Semua Divisi --</option>
                          {divisions.filter(d => !selectedProjectId || d.project_id === selectedProjectId).map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button 
                      onClick={handleAddSubAdmin}
                      disabled={isSubmitting}
                      className="w-full py-4 bg-[var(--aurora-1)] hover:bg-[#8E2DE2] text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-[0_0_20px_rgba(142,45,226,0.3)] flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'BERIKAN OTORITAS ADMIN'}
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-3xl border border-white/5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--aurora-1)]/10 flex items-center justify-center text-[var(--aurora-1)]">
              <Shield size={24} />
            </div>
            <div>
              <h4 className="font-bold text-white">Log Keamanan</h4>
              <p className="text-xs text-gray-500">Audit perubahan otoritas tim</p>
            </div>
          </div>
          <button className="w-full py-3 rounded-xl border border-white/10 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-all">
            Lihat Audit Trail
          </button>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-white/5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--success)]/10 flex items-center justify-center text-[var(--success)]">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h4 className="font-bold text-white">Status Sinkron</h4>
              <p className="text-xs text-gray-500">Otoritas terikat RLS database</p>
            </div>
          </div>
          <div className="w-full py-3 rounded-xl bg-white/5 text-center text-[10px] font-bold uppercase tracking-widest text-[var(--success)]">
            DATABASE SECURED
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionManager;
