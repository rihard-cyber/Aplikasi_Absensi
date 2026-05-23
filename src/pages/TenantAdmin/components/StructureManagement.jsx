/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Search, Plus, Trash2, Edit3, Network, Building, AlertCircle } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { useConfirm } from '../../../components/ConfirmDialog';

const StructureManagement = () => {
  const [activeTab, setActiveTab] = useState(() => {
    try { return sessionStorage.getItem('structure_active_tab') || 'projects'; } catch { return 'projects'; }
  }); // projects, divisions
  const [projects, setProjects] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tenantId, setTenantId] = useState(null);

  // Forms
  const [newProject, setNewProject] = useState({ name: '', code: '', _codeEdited: false, address: '', latitude: '', longitude: '', radius: 50 });
  const [newDivision, setNewDivision] = useState({ name: '', project_id: '' });
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    fetchStructure();
  }, []);

  useEffect(() => {
    try { sessionStorage.setItem('structure_active_tab', activeTab); } catch {}
  }, [activeTab]);

  const fetchStructure = async () => {
    setIsLoading(true);
    try {
      const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
      if (!profile?.tenant_id && !isGod) return;
      
      if (profile?.tenant_id) setTenantId(profile.tenant_id);

      let q1 = supabase.from('projects').select('*');
      if (profile?.tenant_id) q1 = q1.eq('tenant_id', profile.tenant_id);
      q1 = q1.order('created_at', { ascending: false });
      const { data: projData, error: projErr } = await q1;
      if (!projErr && projData) setProjects(projData);

      let q2 = supabase.from('divisions').select('*, projects(name)');
      if (profile?.tenant_id) q2 = q2.eq('tenant_id', profile.tenant_id);
      q2 = q2.order('created_at', { ascending: false });
      const { data: divData, error: divErr } = await q2;
      if (!divErr && divData) setDivisions(divData);
    } catch (e) {
      console.error("Error fetching structure:", e);
      if (e?.message) console.error("Detail:", e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProject = async (e) => {
    e.preventDefault();
    try {
      if (!tenantId) throw new Error("Tenant ID tidak ditemukan!");
      const { data, error } = await supabase.from('projects').insert([{
        tenant_id: tenantId,
        name: newProject.name,
        code: newProject.code?.toUpperCase() || null,
        address: newProject.address,
        latitude: parseFloat(newProject.latitude) || 0,
        longitude: parseFloat(newProject.longitude) || 0,
        radius: parseInt(newProject.radius) || 50
      }]).select();

      if (error) throw error;
      setProjects([data[0], ...projects]);
      setNewProject({ name: '', code: '', _codeEdited: false, address: '', latitude: '', longitude: '', radius: 50 });
      toast('Project berhasil ditambahkan!', 'success');
    } catch (e) {
      toast('Gagal menambah project: ' + e.message, 'error');
    }
  };

  const handleAddDivision = async (e) => {
    e.preventDefault();
    if (!newDivision.project_id) { toast('Pilih Project terlebih dahulu!', 'error'); return; }
    try {
      if (!tenantId) throw new Error("Tenant ID tidak ditemukan!");
      const { data, error } = await supabase.from('divisions').insert([{
        tenant_id: tenantId,
        name: newDivision.name,
        project_id: newDivision.project_id
      }]).select('*, projects(name)');

      if (error) throw error;
      setDivisions([data[0], ...divisions]);
      setNewDivision({ name: '', project_id: '' });
      toast('Divisi berhasil ditambahkan!', 'success');
    } catch (e) {
      toast('Gagal menambah divisi: ' + e.message, 'error');
    }
  };

  const handleDeleteProject = async (id) => {
    const ok = await confirm('Yakin ingin menghapus Project ini? Semua Divisi dan data terkait akan ikut terhapus!', 'Hapus Project');
    if (!ok) return;
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      setProjects(projects.filter(p => p.id !== id));
      setDivisions(divisions.filter(d => d.project_id !== id));
    } catch (e) {
      toast('Gagal menghapus: ' + e.message, 'error');
    }
  };

  const handleDeleteDivision = async (id) => {
    const ok = await confirm('Yakin ingin menghapus Divisi ini?', 'Hapus Divisi');
    if (!ok) return;
    try {
      const { error } = await supabase.from('divisions').delete().eq('id', id);
      if (error) throw error;
      setDivisions(divisions.filter(d => d.id !== id));
    } catch (e) {
      toast('Gagal menghapus: ' + e.message, 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-white tracking-wide">Manajemen Struktur</h2>
          <p className="text-gray-400 text-sm mt-1">Kelola hierarki Cabang (Project) dan Kelompok Kerja (Divisi).</p>
        </div>

        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
          <button 
            onClick={() => setActiveTab('projects')}
            className={`px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${activeTab === 'projects' ? 'bg-[var(--aurora-1)] text-black' : 'text-gray-400 hover:text-white'}`}
          >
            Data Cabang / Project
          </button>
          <button 
            onClick={() => setActiveTab('divisions')}
            className={`px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${activeTab === 'divisions' ? 'bg-[var(--aurora-3)] text-black' : 'text-gray-400 hover:text-white'}`}
          >
            Data Divisi
          </button>
        </div>
      </div>

      {activeTab === 'projects' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Add Project */}
          <div className="lg:col-span-1 glass-panel p-6 border border-white/5 h-fit">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Building2 size={20} className="text-[var(--aurora-1)]" /> Tambah Project Baru
            </h3>
            {!tenantId ? (
              <div className="text-[var(--danger)] text-sm font-bold p-4 bg-[var(--danger)]/10 rounded-xl">Silakan login sebagai Admin Perusahaan untuk menambah Cabang. Mode Dewa tidak memiliki Cabang spesifik.</div>
            ) : (
            <form onSubmit={handleAddProject} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-2">Nama Project / Cabang</label>
                <input required value={newProject.name} onChange={e => {
                  const name = e.target.value;
                  // Auto-generate code from name jika masih kosong atau belum diedit manual
                  const words = name.split(/[\s.-]+/).filter(Boolean);
                  const autoCode = words.map(w => w[0]).join('').toUpperCase().slice(0, 4);
                  setNewProject(prev => ({
                    ...prev,
                    name,
                    code: prev.code && prev._codeEdited ? prev.code : autoCode
                  }));
                }} type="text" className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-1)] transition-colors" placeholder="Contoh: Project A - Sudirman" />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-2"><span className="text-[var(--aurora-3)]">Kode</span> Project (untuk absensi)</label>
                <input value={newProject.code} onChange={e => setNewProject(prev => ({...prev, code: e.target.value.toUpperCase(), _codeEdited: true}))} type="text" maxLength={6} className="w-full bg-[#0B0C10] border border-[var(--aurora-3)]/30 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-3)] transition-colors uppercase tracking-widest font-mono" placeholder="Auto-generate" />
                <p className="text-[8px] text-gray-600 mt-1 ml-1">Otomatis dari nama. Bisa diedit manual. Contoh: KEMENDAG-CIRACAS → <span className="text-[var(--aurora-3)] font-bold">KC</span></p>
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-2">Alamat Lengkap</label>
                <textarea required value={newProject.address} onChange={e => setNewProject({...newProject, address: e.target.value})} className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-1)] transition-colors resize-none h-24" placeholder="Jalan Sudirman Kav. 12..."></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-2">Latitude</label>
                  <input required value={newProject.latitude} onChange={e => setNewProject({...newProject, latitude: e.target.value})} type="number" step="any" className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-1)] transition-colors" placeholder="-6.200000" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-2">Longitude</label>
                  <input required value={newProject.longitude} onChange={e => setNewProject({...newProject, longitude: e.target.value})} type="number" step="any" className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-1)] transition-colors" placeholder="106.816666" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-2">Radius Toleransi (Meter)</label>
                <input required value={newProject.radius} onChange={e => setNewProject({...newProject, radius: e.target.value})} type="number" className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-1)] transition-colors" placeholder="50" />
              </div>
              <button type="submit" className="w-full py-3 mt-4 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[#1E90FF] text-white font-bold tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                <Plus size={18} /> Simpan Project
              </button>
            </form>
            )}
          </div>

          {/* List Projects */}
          <div className="lg:col-span-2 space-y-4">
            {isLoading ? <div className="glass-panel p-6 border border-white/5 animate-pulse space-y-4"><div className="h-4 bg-white/10 rounded w-1/3" /><div className="h-3 bg-white/5 rounded w-2/3" /></div> : projects.length === 0 ? (
              <div className="glass-panel p-10 text-center flex flex-col items-center">
                <Building2 size={48} className="text-gray-600 mb-4" />
                <p className="text-gray-400">Belum ada data Project. Silakan tambahkan baru.</p>
              </div>
            ) : projects.map(p => (
              <div key={p.id} className="glass-panel p-5 border border-white/5 hover:border-[var(--aurora-1)]/30 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                    <Building size={18} className="text-[var(--aurora-1)]" /> {p.name}
                    {p.code && <span className="px-2 py-0.5 bg-[var(--aurora-3)]/10 text-[var(--aurora-3)] text-[10px] font-mono font-bold rounded border border-[var(--aurora-3)]/20">{p.code}</span>}
                  </h4>
                  <p className="text-sm text-gray-400 max-w-md">{p.address}</p>
                  <div className="flex gap-4 mt-3">
                    <span className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={12} /> {p.latitude}, {p.longitude}</span>
                    <span className="text-xs text-gray-500 flex items-center gap-1"><AlertCircle size={12} /> Radius: {p.radius}m</span>
                  </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <button className="flex-1 md:flex-none px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white transition-colors">Edit</button>
                  <button onClick={() => handleDeleteProject(p.id)} className="flex-1 md:flex-none px-4 py-2 bg-[var(--danger)]/10 hover:bg-[var(--danger)]/20 text-[var(--danger)] rounded-lg text-sm transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'divisions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Add Division */}
          <div className="lg:col-span-1 glass-panel p-6 border border-white/5 h-fit">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Network size={20} className="text-[var(--aurora-3)]" /> Tambah Divisi
            </h3>
            <form onSubmit={handleAddDivision} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-2">Pilih Project</label>
                <select required value={newDivision.project_id} onChange={e => setNewDivision({...newDivision, project_id: e.target.value})} className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-3)] transition-colors">
                  <option value="">-- Pilih Project Induk --</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-2">Nama Divisi</label>
                <input required value={newDivision.name} onChange={e => setNewDivision({...newDivision, name: e.target.value})} type="text" className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-3)] transition-colors" placeholder="Contoh: Security, IT, Ops..." />
              </div>
              <button type="submit" className="w-full py-3 mt-4 rounded-xl bg-gradient-to-r from-[var(--aurora-3)] to-[#8E2DE2] text-white font-bold tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                <Plus size={18} /> Simpan Divisi
              </button>
            </form>
          </div>

          {/* List Divisions */}
          <div className="lg:col-span-2 space-y-4">
            {isLoading ? <div className="glass-panel p-6 border border-white/5 animate-pulse space-y-4"><div className="h-4 bg-white/10 rounded w-1/3" /><div className="h-3 bg-white/5 rounded w-1/2" /></div> : divisions.length === 0 ? (
              <div className="glass-panel p-10 text-center flex flex-col items-center">
                <Network size={48} className="text-gray-600 mb-4" />
                <p className="text-gray-400">Belum ada data Divisi. Silakan tambahkan baru.</p>
              </div>
            ) : divisions.map(d => (
              <div key={d.id} className="glass-panel p-5 border border-white/5 hover:border-[var(--aurora-3)]/30 transition-colors flex justify-between items-center gap-4">
                <div>
                  <h4 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                    {d.name}
                  </h4>
                  <p className="text-xs text-[var(--aurora-3)] uppercase tracking-widest font-bold mt-1 bg-[var(--aurora-3)]/10 inline-block px-2 py-0.5 rounded">
                    Project: {d.projects?.name || 'Tanpa Project'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white transition-colors">Edit</button>
                  <button onClick={() => handleDeleteDivision(d.id)} className="px-4 py-2 bg-[var(--danger)]/10 hover:bg-[var(--danger)]/20 text-[var(--danger)] rounded-lg text-sm transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default StructureManagement;
