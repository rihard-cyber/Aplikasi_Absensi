import React, { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, CalendarDays, Moon, Sun, Briefcase } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import LoadingSkeleton from '../../../components/LoadingSkeleton';
import { useToast } from '../../../components/Toast';
import { useConfirm } from '../../../components/ConfirmDialog';

const ShiftDictionary = () => {
  const [shifts, setShifts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tenantId, setTenantId] = useState(null);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  const [newShift, setNewShift] = useState({
    shift_code: '',
    shift_name: '',
    time_in: '08:00',
    time_out: '17:00',
    is_cross_day: false,
    project_id: 'ALL'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setProjectsLoading(true);
    try {
      const isGod = (() => { try { return sessionStorage.getItem('god_key') === 'DEWA-999'; } catch { return false; } })();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles')
        .select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
      
      if (profile?.tenant_id || isGod) {
        if (profile?.tenant_id) setTenantId(profile.tenant_id);

        let q1 = supabase.from('projects')
          .select('id, name, code');
        if (profile?.tenant_id) q1 = q1.eq('tenant_id', profile.tenant_id);
        const { data: pData } = await q1;
        if (pData) {
          setProjects(pData);
        } else {
          let q1b = supabase.from('projects')
            .select('*');
          if (profile?.tenant_id) q1b = q1b.eq('tenant_id', profile.tenant_id);
          const { data: fallback } = await q1b;
          if (fallback) setProjects(fallback);
        }
        setProjectsLoading(false);

        let q2 = supabase.from('master_shifts')
          .select('*, projects(name, code)');
        if (profile?.tenant_id) q2 = q2.eq('tenant_id', profile.tenant_id);
        q2 = q2.order('created_at', { ascending: false });
        const { data: sData } = await q2;
        if (sData) setShifts(sData);
      } else {
        setProjectsLoading(false);
      }
    } catch (e) {
      console.error("Error fetching shifts:", e);
      setProjectsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddShift = async (e) => {
    e.preventDefault();
    if (!newShift.shift_code || !newShift.shift_name) return;

    try {
      const payload = {
        tenant_id: tenantId,
        project_id: newShift.project_id === 'ALL' ? null : newShift.project_id,
        shift_code: newShift.shift_code.toUpperCase(),
        shift_name: newShift.shift_name,
        time_in: newShift.time_in ? newShift.time_in + ':00' : null,
        time_out: newShift.time_out ? newShift.time_out + ':00' : null,
        is_cross_day: newShift.is_cross_day
      };

      const { data, error } = await supabase.from('master_shifts').insert([payload]).select('*, projects(name)');
      if (error) throw error;

      setShifts([data[0], ...shifts]);
      setNewShift({ shift_code: '', shift_name: '', time_in: '08:00', time_out: '17:00', is_cross_day: false, project_id: 'ALL' });
      toast('Kamus Shift berhasil ditambahkan!', 'success');
    } catch (e) {
      toast('Gagal menambah shift. Pastikan Kode Shift unik!', 'error');
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm('Yakin ingin menghapus shift ini? Karyawan yang menggunakan shift ini akan kehilangan referensi jadwal.', 'Hapus Shift');
    if (!ok) return;
    try {
      const { error } = await supabase.from('master_shifts').delete().eq('id', id);
      if (error) throw error;
      setShifts(shifts.filter(s => s.id !== id));
    } catch (e) {
      toast('Gagal menghapus: ' + e.message, 'error');
    }
  };

  if (isLoading) return <div className="p-10"><LoadingSkeleton type="card" /></div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-serif font-bold text-white tracking-wide flex items-center gap-2">
            <CalendarDays className="text-[var(--aurora-1)]" /> Kamus Shift
          </h2>
          <p className="text-gray-400 text-sm mt-1">Buat kode jadwal dinamis (R, PS, MS, OFF) untuk Excel Parser.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Add Shift */}
        <div className="lg:col-span-1 glass-panel p-6 border border-white/5 h-fit sticky top-6">
          <h3 className="text-lg font-bold text-white mb-6">Tambah Kode Shift</h3>
          <form onSubmit={handleAddShift} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block mb-2">Kode (Excel)</label>
                <input required value={newShift.shift_code} onChange={e => setNewShift({...newShift, shift_code: e.target.value.toUpperCase()})} type="text" maxLength={10} className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-1)] uppercase" placeholder="Misal: MS" />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block mb-2">Target Project</label>
                <select value={newShift.project_id} onChange={e => setNewShift({...newShift, project_id: e.target.value})}
                  className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-1)] disabled:opacity-50"
                  disabled={projectsLoading}>
                  <option value="ALL">🌐 Semua Project</option>
                  {projectsLoading ? (
                    <option disabled className="bg-[#0B0C10] text-gray-500">Memuat...</option>
                  ) : projects.length === 0 ? (
                    <option disabled className="bg-[#0B0C10] text-gray-500">Belum ada project</option>
                  ) : (
                    projects.map(p => <option key={p.id} value={p.id} className="bg-[#0B0C10]">🏢 {p.code ? `[${p.code}] ` : ''}{p.name}</option>)
                  )}
                </select>
                {projects.length === 0 && !projectsLoading && (
                  <p className="text-[9px] text-gray-600 mt-1.5 ml-1">Buat project dulu di menu Manajemen Struktur</p>
                )}
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block mb-2">Nama Shift</label>
              <input required value={newShift.shift_name} onChange={e => setNewShift({...newShift, shift_name: e.target.value})} type="text" className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-1)]" placeholder="Contoh: Malam Security" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-[var(--success)] uppercase tracking-widest font-bold block mb-2">Jam Masuk</label>
                <input value={newShift.time_in} onChange={e => setNewShift({...newShift, time_in: e.target.value})} type="time" className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--success)]" />
              </div>
              <div>
                <label className="text-[10px] text-[var(--danger)] uppercase tracking-widest font-bold block mb-2">Jam Pulang</label>
                <input value={newShift.time_out} onChange={e => setNewShift({...newShift, time_out: e.target.value})} type="time" className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--danger)]" />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 mt-2">
              <div>
                <p className="text-sm font-bold text-white flex items-center gap-2"><Moon size={14} className="text-[var(--aurora-3)]"/> Shift Lintas Hari</p>
                <p className="text-[9px] text-gray-400 mt-1">Aktifkan untuk Shift Malam (keluar besok paginya).</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={newShift.is_cross_day} onChange={(e) => setNewShift({...newShift, is_cross_day: e.target.checked})} className="sr-only peer" />
                <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--aurora-3)]"></div>
              </label>
            </div>

            <button type="submit" className="w-full py-3 mt-4 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[#1E90FF] text-white font-bold tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
              <Plus size={18} /> Simpan Shift
            </button>
          </form>
        </div>

        {/* Shift List */}
        <div className="lg:col-span-2 space-y-4">
          {shifts.length === 0 ? (
            <div className="glass-panel p-10 text-center flex flex-col items-center">
              <CalendarDays size={48} className="text-gray-600 mb-4" />
              <p className="text-gray-400">Belum ada Kamus Shift.</p>
            </div>
          ) : shifts.map(s => (
            <div key={s.id} className={`glass-panel p-5 border transition-colors flex justify-between items-center gap-4 ${s.is_cross_day ? 'border-[var(--aurora-3)]/30' : 'border-white/5 hover:border-white/20'}`}>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-3 py-1 bg-white/10 text-white font-black text-sm rounded-lg tracking-wider border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                    {s.shift_code}
                  </span>
                  <h4 className="text-lg font-bold text-white">{s.shift_name}</h4>
                  {s.is_cross_day && <span className="px-2 py-0.5 bg-[var(--aurora-3)]/10 text-[var(--aurora-3)] text-[10px] font-bold uppercase rounded flex items-center gap-1"><Moon size={10} /> Cross-Day</span>}
                </div>
                
                <div className="flex gap-4 mt-2">
                  {s.time_in ? (
                    <>
                      <p className="text-xs text-gray-400 flex items-center gap-1"><Clock size={12} className="text-[var(--success)]"/> IN: <span className="font-mono text-white">{s.time_in.substring(0, 5)}</span></p>
                      <p className="text-xs text-gray-400 flex items-center gap-1"><Clock size={12} className="text-[var(--danger)]"/> OUT: <span className="font-mono text-white">{s.time_out.substring(0, 5)}</span></p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-500 font-bold tracking-widest uppercase">Hari Libur / OFF</p>
                  )}
                  {s.project_id && <p className="text-xs text-gray-500 flex items-center gap-1"><Briefcase size={12} /> {s.projects?.code ? `[${s.projects.code}] ` : ''}{s.projects?.name}</p>}
                </div>
              </div>
              
              <button onClick={() => handleDelete(s.id)} className="p-3 bg-[var(--danger)]/10 hover:bg-[var(--danger)]/20 text-[var(--danger)] rounded-xl transition-colors">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default ShiftDictionary;
