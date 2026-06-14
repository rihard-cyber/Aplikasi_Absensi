import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Save, X, Wrench, Calendar, ClipboardList, Package, CheckCircle2, Clock, Loader2, Trash2, Search, Filter, Zap, Droplet, Thermometer, Shield, Cpu } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { useConfirm } from '../../../components/ConfirmDialog';

const t = (s) => s;

const TABS = [
  { id: 'equipment', label: 'Equipment', icon: Cpu },
  { id: 'pm', label: 'PM Schedule', icon: Calendar },
  { id: 'sparepart', label: 'Sparepart', icon: Package },
];

const TYPE_ICONS = { ac: <Thermometer size={14} />, electrical: <Zap size={14} />, plumbing: <Droplet size={14} />, mechanical: <Wrench size={14} />, fire: <Shield size={14} />, security: <Shield size={14} />, other: <Wrench size={14} /> };

const EngineeringManagement = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const [tenantId, setTenantId] = useState(null);
  const [activeTab, setActiveTab] = useState('equipment');
  const [loading, setLoading] = useState(true);
  const [equipment, setEquipment] = useState([]);
  const [pmSchedules, setPmSchedules] = useState([]);
  const [pmLogs, setPmLogs] = useState([]);
  const [sparepartReqs, setSparepartReqs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(null);

  const [eqForm, setEqForm] = useState({ name: '', type: 'other', brand: '', model: '', serial_number: '', location: '', floor: '', service_interval_days: 90 });
  const [pmForm, setPmForm] = useState({ equipment_id: '', task_name: '', frequency: 'monthly', estimated_duration_min: 30, notes: '' });
  const [spForm, setSpForm] = useState({ part_name: '', part_number: '', equipment_id: '', qty: 1, urgency: 'normal', reason: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
      if (!profile?.tenant_id) return;
      setTenantId(profile.tenant_id);
      await loadData(profile.tenant_id);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadData = async (tid) => {
    const [eRes, pmRes, plRes, spRes, empRes] = await Promise.all([
      supabase.from('equipment_list').select('*').eq('tenant_id', tid).order('name'),
      supabase.from('pm_schedules').select('*, equipment_list(name, location, type)').eq('tenant_id', tid).order('task_name'),
      supabase.from('pm_logs').select('*, equipment_list(name), profiles!pm_logs_assigned_to_fkey(full_name)').eq('tenant_id', tid).order('created_at', { ascending: false }).limit(50),
      supabase.from('sparepart_requests').select('*, equipment_list(name), profiles!sparepart_requests_requested_by_fkey(full_name)').eq('tenant_id', tid).order('created_at', { ascending: false }).limit(50),
      supabase.from('profiles').select('id, full_name').eq('tenant_id', tid).in('role', ['EMPLOYEE', 'SUB_ADMIN']).order('full_name'),
    ]);
    setEquipment(eRes.data || []);
    setPmSchedules(pmRes.data || []);
    setPmLogs(plRes.data || []);
    setSparepartReqs(spRes.data || []);
    setEmployees(empRes.data || []);
  };

  const handleSaveEquipment = async () => {
    if (!eqForm.name.trim()) return;
    setSaving(true);
    try {
      if (showForm?.edit) {
        await supabase.from('equipment_list').update(eqForm).eq('id', showForm.edit);
      } else {
        await supabase.from('equipment_list').insert({ ...eqForm, tenant_id: tenantId });
      }
      toast('Equipment saved!', 'success');
      setShowForm(null);
      setEqForm({ name: '', type: 'other', brand: '', model: '', serial_number: '', location: '', floor: '', service_interval_days: 90 });
      await loadData(tenantId);
    } catch (e) { toast('Error: ' + e.message, 'error'); }
    setSaving(false);
  };

  const handleSavePM = async () => {
    if (!pmForm.task_name.trim() || !pmForm.equipment_id) return;
    setSaving(true);
    try {
      await supabase.from('pm_schedules').insert({ ...pmForm, tenant_id: tenantId });
      toast('PM Schedule saved!', 'success');
      setPmForm({ equipment_id: '', task_name: '', frequency: 'monthly', estimated_duration_min: 30, notes: '' });
      setShowForm(null);
      await loadData(tenantId);
    } catch (e) { toast('Error: ' + e.message, 'error'); }
    setSaving(false);
  };

  const handleSaveSparepart = async () => {
    if (!spForm.part_name.trim()) return;
    setSaving(true);
    try {
      await supabase.from('sparepart_requests').insert({
        ...spForm, tenant_id: tenantId, requested_by: employees[0]?.id, status: 'pending',
      });
      toast('Request saved!', 'success');
      setSpForm({ part_name: '', part_number: '', equipment_id: '', qty: 1, urgency: 'normal', reason: '' });
      setShowForm(null);
      await loadData(tenantId);
    } catch (e) { toast('Error: ' + e.message, 'error'); }
    setSaving(false);
  };

  const handleDelete = async (table, id) => {
    if (!await confirm('Hapus data ini?', 'Hapus')) return;
    try {
      await supabase.from(table).delete().eq('id', id);
      toast('Deleted!', 'success');
      await loadData(tenantId);
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  };

  const stats = useMemo(() => ({
    totalEq: equipment.length,
    totalPM: pmSchedules.length,
    monthlyDue: pmSchedules.filter(s => s.frequency === 'monthly').length,
    pendingSp: sparepartReqs.filter(r => r.status === 'pending').length,
  }), [equipment, pmSchedules, sparepartReqs]);

  if (loading) return <div className="p-20 text-center"><div className="w-8 h-8 border-2 border-[var(--aurora-3)] border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-serif font-bold text-white">{t('Engineering Management')}</h3>
          <p className="text-xs text-gray-500 mt-0.5">Equipment, Preventive Maintenance & Sparepart</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-white/5 border border-white/10"><p className="text-[10px] text-gray-500 uppercase">Equipment</p><p className="text-lg font-bold text-white">{stats.totalEq}</p></div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/10"><p className="text-[10px] text-gray-500 uppercase">PM Schedules</p><p className="text-lg font-bold text-white">{stats.totalPM}</p></div>
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20"><p className="text-[10px] text-blue-400 uppercase">PM Bulanan</p><p className="text-lg font-bold text-blue-400">{stats.monthlyDue}</p></div>
        <div className={`p-3 rounded-xl border ${stats.pendingSp > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-white/5 border-white/10'}`}>
          <p className="text-[10px] text-gray-500 uppercase">Pending Sparepart</p><p className={`text-lg font-bold ${stats.pendingSp > 0 ? 'text-amber-400' : 'text-white'}`}>{stats.pendingSp}</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-white/10 pb-2">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all ${activeTab === tab.id ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
            <tab.icon size={14} className="inline mr-1.5" /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'equipment' && (
        <div className="space-y-3">
          <button onClick={() => setShowForm('equipment')} className="px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-bold flex items-center gap-1"><Plus size={12} /> Tambah Equipment</button>
          {showForm === 'equipment' && (
            <motion.div initial={{ opacity: 0, y: -10 }} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-white">{eqForm.edit ? 'Edit' : 'Tambah'} Equipment</h4>
              <div className="grid grid-cols-2 gap-3">
                <input value={eqForm.name} onChange={e => setEqForm({ ...eqForm, name: e.target.value })} placeholder="Nama (AC Lantai 1, Panel MDP, dll)" className="col-span-2 bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none" />
                <select value={eqForm.type} onChange={e => setEqForm({ ...eqForm, type: e.target.value })} className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none">
                  <option value="ac">AC</option><option value="electrical">Electrical</option><option value="plumbing">Plumbing</option>
                  <option value="mechanical">Mechanical</option><option value="fire">Fire System</option><option value="security">Security</option><option value="other">Other</option>
                </select>
                <input value={eqForm.brand} onChange={e => setEqForm({ ...eqForm, brand: e.target.value })} placeholder="Brand" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none" />
                <input value={eqForm.model} onChange={e => setEqForm({ ...eqForm, model: e.target.value })} placeholder="Model" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none" />
                <input value={eqForm.serial_number} onChange={e => setEqForm({ ...eqForm, serial_number: e.target.value })} placeholder="Serial Number" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none" />
                <input value={eqForm.location} onChange={e => setEqForm({ ...eqForm, location: e.target.value })} placeholder="Lokasi" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none" />
                <input value={eqForm.floor} onChange={e => setEqForm({ ...eqForm, floor: e.target.value })} placeholder="Lantai" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none" />
                <input value={eqForm.service_interval_days} onChange={e => setEqForm({ ...eqForm, service_interval_days: parseInt(e.target.value) || 90 })} type="number" placeholder="Interval servis (hari)" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowForm(null)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-[10px] font-bold">Batal</button>
                <button onClick={handleSaveEquipment} disabled={saving} className="px-4 py-2 rounded-xl bg-blue-500/20 text-blue-400 text-[10px] font-bold flex items-center gap-1"><Save size={12} /> Simpan</button>
              </div>
            </motion.div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {equipment.map(eq => (
              <div key={eq.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span style={{ color: eq.type === 'ac' ? '#3b82f6' : eq.type === 'electrical' ? '#f59e0b' : eq.type === 'plumbing' ? '#10b981' : '#6b7280' }}>{TYPE_ICONS[eq.type]}</span>
                    <p className="text-xs font-bold text-white">{eq.name}</p>
                  </div>
                  <button onClick={() => handleDelete('equipment_list', eq.id)} className="p-1 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400"><Trash2 size={12} /></button>
                </div>
                <p className="text-[9px] text-gray-500 mt-1">{eq.brand} {eq.model} • {eq.location} {eq.floor ? `Lt.${eq.floor}` : ''}</p>
                {eq.last_service && <p className="text-[9px] text-gray-600 mt-0.5">Servis terakhir: {new Date(eq.last_service).toLocaleDateString('id-ID')}</p>}
              </div>
            ))}
            {equipment.length === 0 && <div className="p-8 text-center text-gray-500 text-sm col-span-2">Belum ada equipment.</div>}
          </div>
        </div>
      )}

      {activeTab === 'pm' && (
        <div className="space-y-3">
          <button onClick={() => setShowForm('pm')} className="px-3 py-2 rounded-xl bg-[var(--aurora-3)]/10 border border-[var(--aurora-3)]/30 text-[var(--aurora-3)] text-[10px] font-bold flex items-center gap-1"><Plus size={12} /> Tambah PM Schedule</button>
          {showForm === 'pm' && (
            <motion.div initial={{ opacity: 0, y: -10 }} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-white">Tambah PM Schedule</h4>
              <select value={pmForm.equipment_id} onChange={e => setPmForm({ ...pmForm, equipment_id: e.target.value })} className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none">
                <option value="">Pilih Equipment</option>
                {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
              </select>
              <input value={pmForm.task_name} onChange={e => setPmForm({ ...pmForm, task_name: e.target.value })} placeholder="Nama tugas (Bersihkan filter AC, dll)" className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none" />
              <div className="grid grid-cols-2 gap-3">
                <select value={pmForm.frequency} onChange={e => setPmForm({ ...pmForm, frequency: e.target.value })} className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none">
                  <option value="daily">Harian</option><option value="weekly">Mingguan</option><option value="monthly">Bulanan</option><option value="quarterly">3 Bulanan</option><option value="yearly">Tahunan</option>
                </select>
                <input value={pmForm.estimated_duration_min} onChange={e => setPmForm({ ...pmForm, estimated_duration_min: parseInt(e.target.value) || 30 })} type="number" placeholder="Durasi (menit)" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowForm(null)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-[10px] font-bold">Batal</button>
                <button onClick={handleSavePM} disabled={saving} className="px-4 py-2 rounded-xl bg-[var(--aurora-3)]/20 text-[var(--aurora-3)] text-[10px] font-bold"><Save size={12} className="inline mr-1" /> Simpan</button>
              </div>
            </motion.div>
          )}
          <div className="space-y-2">
            {pmSchedules.map(pm => (
              <div key={pm.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">{pm.task_name}</p>
                    <p className="text-[10px] text-gray-500">{pm.equipment_list?.name} • {pm.frequency} • {pm.estimated_duration_min} menit</p>
                  </div>
                  <button onClick={() => handleDelete('pm_schedules', pm.id)} className="p-1 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
            {pmSchedules.length === 0 && <div className="p-8 text-center text-gray-500 text-sm">Belum ada PM schedule.</div>}
          </div>
        </div>
      )}

      {activeTab === 'sparepart' && (
        <div className="space-y-3">
          <button onClick={() => setShowForm('sparepart')} className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold flex items-center gap-1"><Plus size={12} /> Request Sparepart</button>
          {showForm === 'sparepart' && (
            <motion.div initial={{ opacity: 0, y: -10 }} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-white">Request Sparepart</h4>
              <input value={spForm.part_name} onChange={e => setSpForm({ ...spForm, part_name: e.target.value })} placeholder="Nama sparepart" className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none" />
              <div className="grid grid-cols-2 gap-3">
                <input value={spForm.part_number} onChange={e => setSpForm({ ...spForm, part_number: e.target.value })} placeholder="Part number" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none" />
                <select value={spForm.equipment_id} onChange={e => setSpForm({ ...spForm, equipment_id: e.target.value })} className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none">
                  <option value="">Untuk equipment</option>
                  {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
                </select>
                <input value={spForm.qty} onChange={e => setSpForm({ ...spForm, qty: parseInt(e.target.value) || 1 })} type="number" min="1" placeholder="Jumlah" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none" />
                <select value={spForm.urgency} onChange={e => setSpForm({ ...spForm, urgency: e.target.value })} className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none">
                  <option value="normal">Normal</option><option value="urgent">Urgent</option><option value="emergency">Emergency</option>
                </select>
              </div>
              <input value={spForm.reason} onChange={e => setSpForm({ ...spForm, reason: e.target.value })} placeholder="Alasan" className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none" />
              <div className="flex gap-2">
                <button onClick={() => setShowForm(null)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-[10px] font-bold">Batal</button>
                <button onClick={handleSaveSparepart} disabled={saving} className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 text-[10px] font-bold"><Save size={12} className="inline mr-1" /> Request</button>
              </div>
            </motion.div>
          )}
          <div className="space-y-2">
            {sparepartReqs.map(sp => (
              <div key={sp.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">{sp.part_name}</p>
                    <p className="text-[10px] text-gray-500">{sp.part_number || '-'} • Qty: {sp.qty} • {sp.equipment_list?.name || '-'}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    sp.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                    sp.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                    sp.status === 'ordered' ? 'bg-blue-500/10 text-blue-400' :
                    sp.status === 'received' ? 'bg-purple-500/10 text-purple-400' :
                    'bg-amber-500/10 text-amber-400'
                  }`}>{sp.status}</span>
                </div>
                <p className="text-[9px] text-gray-600 mt-1">{sp.urgency} • {sp.reason || '-'}</p>
              </div>
            ))}
            {sparepartReqs.length === 0 && <div className="p-8 text-center text-gray-500 text-sm">Belum ada request sparepart.</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default EngineeringManagement;
