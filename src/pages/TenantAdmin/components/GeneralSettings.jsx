import React, { useState, useEffect, useRef } from 'react';
import { Clock, CalendarDays, AlertTriangle, ShieldCheck, Database, Save, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../../utils/supabaseClient';

const GeneralSettings = () => {
  const [settings, setSettings] = useState({
    work_days: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
    check_in_time: '08:00',
    check_out_time: '17:00',
    grace_period_minutes: 15,
    late_penalty_fee: 0,
    auto_approval_toggle: false,
    delegated_approval: false,
    audit_retention_days: 90
  });
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle, saving, saved, error
  const debounceTimer = useRef(null);
  const [tenantId, setTenantId] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
      
      if (profile?.tenant_id) {
        setTenantId(profile.tenant_id);
        const { data: ts } = await supabase.from('tenant_settings').select('*').eq('tenant_id', profile.tenant_id).maybeSingle();
        if (ts) {
          // parse times if needed
          setSettings({
            work_days: ts.work_days || ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
            check_in_time: ts.check_in_time ? ts.check_in_time.substring(0, 5) : '08:00',
            check_out_time: ts.check_out_time ? ts.check_out_time.substring(0, 5) : '17:00',
            grace_period_minutes: ts.grace_period_minutes || 0,
            late_penalty_fee: ts.late_penalty_fee || 0,
            auto_approval_toggle: ts.auto_approval_toggle || false,
            delegated_approval: ts.delegated_approval || false,
            audit_retention_days: ts.audit_retention_days || 90
          });
        }
      }
    } catch (e) {
      console.error("Gagal menarik data pengaturan", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = (field, value) => {
    const newSettings = { ...settings, [field]: value };
    setSettings(newSettings);
    autoSave(newSettings);
  };

  const handleDayToggle = (day) => {
    const currentDays = [...settings.work_days];
    const index = currentDays.indexOf(day);
    if (index > -1) currentDays.splice(index, 1);
    else currentDays.push(day);
    handleUpdate('work_days', currentDays);
  };

  const autoSave = (newSettings) => {
    setSaveStatus('saving');
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    debounceTimer.current = setTimeout(async () => {
      try {
        if (!tenantId) return;
        
        // Prepare payload (convert arrays to JSON, format times)
        const payload = {
          tenant_id: tenantId,
          work_days: newSettings.work_days,
          check_in_time: newSettings.check_in_time + ':00',
          check_out_time: newSettings.check_out_time + ':00',
          grace_period_minutes: parseInt(newSettings.grace_period_minutes) || 0,
          late_penalty_fee: parseFloat(newSettings.late_penalty_fee) || 0,
          auto_approval_toggle: newSettings.auto_approval_toggle,
          delegated_approval: newSettings.delegated_approval,
          audit_retention_days: parseInt(newSettings.audit_retention_days) || 90
        };

        const { error } = await supabase.from('tenant_settings').upsert(payload, { onConflict: 'tenant_id' });
        if (error) throw error;
        
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (e) {
        console.error("Auto-save failed", e);
        setSaveStatus('error');
      }
    }, 1000); // 1 second debounce
  };

  if (isLoading) return <div className="p-10 text-center text-gray-500">Memuat Pengaturan...</div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-serif font-bold text-white tracking-wide">Pengaturan Umum</h2>
          <p className="text-gray-400 text-sm mt-1">Regulasi Operasional Terpusat (Auto-Saved).</p>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && <span className="text-xs text-[var(--aurora-3)] flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Menyimpan...</span>}
          {saveStatus === 'saved' && <span className="text-xs text-[var(--success)] flex items-center gap-1"><Save size={12} /> Tersimpan</span>}
          {saveStatus === 'error' && <span className="text-xs text-[var(--danger)] flex items-center gap-1"><AlertTriangle size={12} /> Gagal Menyimpan</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Jadwal Kerja */}
        <div className="glass-panel p-6 border border-white/5 space-y-5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4"><CalendarDays size={20} className="text-[var(--aurora-1)]"/> Jadwal Kerja Standar</h3>
          
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-3">Hari Kerja Efektif</label>
            <div className="flex flex-wrap gap-2">
              {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map(day => (
                <button 
                  key={day}
                  onClick={() => handleDayToggle(day)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${settings.work_days.includes(day) ? 'bg-[var(--aurora-1)]/20 text-[var(--aurora-1)] border border-[var(--aurora-1)]/50' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-2">Jam Masuk</label>
              <input type="time" value={settings.check_in_time} onChange={(e) => handleUpdate('check_in_time', e.target.value)} className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-1)] transition-colors" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-2">Jam Pulang</label>
              <input type="time" value={settings.check_out_time} onChange={(e) => handleUpdate('check_out_time', e.target.value)} className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-1)] transition-colors" />
            </div>
          </div>
        </div>

        {/* Toleransi & Denda */}
        <div className="glass-panel p-6 border border-white/5 space-y-5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4"><Clock size={20} className="text-[var(--warning)]"/> Toleransi & Denda</h3>
          
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-2">Grace Period (Menit)</label>
            <p className="text-[10px] text-gray-500 mb-2">Batas waktu telat sebelum dihitung denda.</p>
            <input type="number" value={settings.grace_period_minutes} onChange={(e) => handleUpdate('grace_period_minutes', e.target.value)} className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--warning)] transition-colors" />
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-2">Denda Keterlambatan (Rp / Jam)</label>
            <p className="text-[10px] text-gray-500 mb-2">Berlaku jika melewati batas Grace Period.</p>
            <input type="number" value={settings.late_penalty_fee} onChange={(e) => handleUpdate('late_penalty_fee', e.target.value)} className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--warning)] transition-colors" />
          </div>
        </div>

        {/* Hierarki Persetujuan */}
        <div className="glass-panel p-6 border border-white/5 space-y-5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4"><ShieldCheck size={20} className="text-[var(--aurora-3)]"/> Hierarki Persetujuan</h3>
          
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
            <div>
              <p className="text-sm font-bold text-white">Delegasi ke Admin Project</p>
              <p className="text-[10px] text-gray-400 mt-1">Jika ON, Admin Lapangan dapat menyetujui Cuti/Ijin.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={settings.delegated_approval} onChange={(e) => handleUpdate('delegated_approval', e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--aurora-3)]"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
            <div>
              <p className="text-sm font-bold text-white">Auto-Approval Sistem</p>
              <p className="text-[10px] text-gray-400 mt-1">Otomatis setujui ijin sakit jika melampirkan Surat Dokter.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={settings.auto_approval_toggle} onChange={(e) => handleUpdate('auto_approval_toggle', e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--aurora-3)]"></div>
            </label>
          </div>
        </div>

        {/* Retensi Data */}
        <div className="glass-panel p-6 border border-white/5 space-y-5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4"><Database size={20} className="text-gray-400"/> Retensi Data & Audit</h3>
          
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-2">Simpan Log Absen & Foto (Hari)</label>
            <p className="text-[10px] text-gray-500 mb-2">Data lebih tua akan di-Archive untuk menghemat Storage.</p>
            <select value={settings.audit_retention_days} onChange={(e) => handleUpdate('audit_retention_days', e.target.value)} className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-white/30 transition-colors">
              <option value="30">30 Hari</option>
              <option value="90">90 Hari (3 Bulan)</option>
              <option value="180">180 Hari (6 Bulan)</option>
              <option value="365">1 Tahun</option>
            </select>
          </div>
        </div>

      </div>

      {/* Authority Management Section */}
      <AuthorityManagement tenantId={tenantId} />
    </div>
  );
};

const AuthorityManagement = ({ tenantId }) => {
  const [admins, setAdmins] = useState([]);
  const [searchNik, setSearchNik] = useState('');
  const [selectedRole, setSelectedRole] = useState('PROJECT_ADMIN');
  const [isSearching, setIsSearching] = useState(false);
  const [foundEmployee, setFoundEmployee] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (tenantId) fetchAdmins();
  }, [tenantId]);

  const fetchAdmins = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nip, full_name, role, operational_access, projects(name), divisions(name)')
      .eq('tenant_id', tenantId)
      .eq('operational_access', true)
      .in('role', ['SUB_ADMIN', 'TENANT_ADMIN']);
    
    if (data) setAdmins(data);
  };

  const handleSearch = async () => {
    if (!searchNik) return;
    setIsSearching(true);
    setFoundEmployee(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nip, full_name, project_id, division_id')
        .eq('tenant_id', tenantId)
        .eq('nip', searchNik)
        .maybeSingle();
      
      if (data) setFoundEmployee(data);
      else alert('Karyawan dengan NIK tersebut tidak ditemukan.');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!foundEmployee) return;
    setIsAdding(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          role: 'SUB_ADMIN', 
          operational_access: true 
        })
        .eq('id', foundEmployee.id);
      
      if (!error) {
        alert(`${foundEmployee.full_name} berhasil diberikan otoritas admin.`);
        setFoundEmployee(null);
        setSearchNik('');
        fetchAdmins();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRevoke = async (adminId) => {
    if (!window.confirm('Cabut otoritas admin untuk karyawan ini?')) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          role: 'EMPLOYEE', 
          operational_access: false 
        })
        .eq('id', adminId);
      
      if (!error) fetchAdmins();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="glass-panel p-6 border border-white/5 mt-10 space-y-6">
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2"><ShieldCheck size={24} className="text-[var(--aurora-3)]"/> Manajemen Otoritas Admin</h3>
          <p className="text-xs text-gray-500 mt-1">Kelola siapa saja yang berhak mengakses dashboard operasional (Project/Divisi).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Add */}
        <div className="lg:col-span-1 space-y-4">
          <label className="text-xs text-gray-400 uppercase tracking-widest font-bold">Cari Karyawan (NIK)</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Masukkan NIK..." 
              value={searchNik}
              onChange={(e) => setSearchNik(e.target.value)}
              className="flex-1 bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-3)]"
            />
            <button 
              onClick={handleSearch}
              disabled={isSearching}
              className="px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all"
            >
              {isSearching ? <Loader2 size={16} className="animate-spin" /> : 'CARI'}
            </button>
          </div>

          {foundEmployee && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-[var(--aurora-3)]/10 border border-[var(--aurora-3)]/30 rounded-2xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--aurora-3)]/20 flex items-center justify-center text-[var(--aurora-3)] font-bold">
                  {foundEmployee.full_name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{foundEmployee.full_name}</p>
                  <p className="text-[10px] text-gray-400 uppercase">{foundEmployee.nip}</p>
                </div>
              </div>
              <button 
                onClick={handleAddAdmin}
                disabled={isAdding}
                className="w-full py-2.5 bg-[var(--aurora-3)] hover:bg-[var(--aurora-2)] text-black text-xs font-black uppercase rounded-xl transition-all shadow-[0_0_15px_rgba(0,201,255,0.3)]"
              >
                JADIKAN ADMIN OPERASIONAL
              </button>
            </motion.div>
          )}
        </div>

        {/* List Admins */}
        <div className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-500 uppercase tracking-widest border-b border-white/5">
                <tr>
                  <th className="py-4 px-2">Admin</th>
                  <th className="py-4 px-2">Cakupan (Project/Divisi)</th>
                  <th className="py-4 px-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {admins.length === 0 ? (
                  <tr><td colSpan="3" className="py-10 text-center text-gray-600 italic">Belum ada admin operasional yang didaftarkan.</td></tr>
                ) : admins.map(admin => (
                  <tr key={admin.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-[var(--aurora-3)] group-hover:bg-[var(--aurora-3)]/20">
                          {admin.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-white">{admin.full_name}</p>
                          <p className="text-[9px] text-gray-500 uppercase">{admin.nip}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="space-y-1">
                        <p className="text-[10px] text-gray-300 font-bold">{admin.projects?.name || 'SEMUA PROJECT'}</p>
                        {admin.divisions?.name && <p className="text-[9px] text-gray-500">Divisi: {admin.divisions.name}</p>}
                      </div>
                    </td>
                    <td className="py-4 px-2 text-right">
                      <button 
                        onClick={() => handleRevoke(admin.id)}
                        className="p-2 text-gray-500 hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 rounded-lg transition-all"
                        title="Cabut Akses"
                      >
                        <ShieldCheck size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneralSettings;
