import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Save, X, MapPin, ClipboardList, Package, Users, CheckCircle2, Clock, Loader2, Trash2, Edit3, Search, Filter, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { useConfirm } from '../../../components/ConfirmDialog';
import { logAudit } from '../../../utils/auditLogger';

const t = (s) => s;

const TABS = [
  { id: 'tasks', label: 'Area & Tugas', icon: ClipboardList },
  { id: 'logs', label: 'Laporan', icon: CheckCircle2 },
  { id: 'supplies', label: 'Perlengkapan', icon: Package },
];

const CleaningManagement = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const [tenantId, setTenantId] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks');
  const [loading, setLoading] = useState(true);
  const [areas, setAreas] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [supplies, setSupplies] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Form state
  const [showForm, setShowForm] = useState(null);
  const [form, setForm] = useState({ name: '', location: '', floor: '', priority: 'medium' });
  const [taskForm, setTaskForm] = useState({ area_id: '', task_name: '', frequency: 'daily', shift: '', notes: '' });
  const [supplyForm, setSupplyForm] = useState({ name: '', category: 'consumable', stock: 0, min_stock: 5, unit: 'pcs', notes: '' });
  const [checklistForm, setChecklistForm] = useState({ area_id: '', item_name: '' });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

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
    const [aRes, tRes, lRes, sRes, cRes, eRes] = await Promise.all([
      supabase.from('cleaning_areas').select('*').eq('tenant_id', tid).order('name'),
      supabase.from('cleaning_tasks').select('*, cleaning_areas(name)').eq('tenant_id', tid).order('task_name'),
      supabase.from('cleaning_logs').select('*, cleaning_areas(name), cleaning_tasks(task_name), profiles!cleaning_logs_assigned_to_fkey(full_name)').eq('tenant_id', tid).order('completed_at', { ascending: false }).limit(100),
      supabase.from('cleaning_supplies').select('*').eq('tenant_id', tid).order('name'),
      supabase.from('cleaning_checklist').select('*, cleaning_areas(name)').eq('tenant_id', tid).order('sort_order'),
      supabase.from('profiles').select('id, full_name').eq('tenant_id', tid).in('role', ['EMPLOYEE', 'SUB_ADMIN']).order('full_name'),
    ]);
    setAreas(aRes.data || []);
    setTasks(tRes.data || []);
    setLogs(lRes.data || []);
    setSupplies(sRes.data || []);
    setChecklist(cRes.data || []);
    setEmployees(eRes.data || []);
  };

  const handleSaveArea = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (showForm?.edit) {
        await supabase.from('cleaning_areas').update(form).eq('id', showForm.edit);
      } else {
        await supabase.from('cleaning_areas').insert({ ...form, tenant_id: tenantId });
      }
      toast('Area saved!', 'success');
      setShowForm(null);
      setForm({ name: '', location: '', floor: '', priority: 'medium' });
      await loadData(tenantId);
    } catch (e) { toast('Error: ' + e.message, 'error'); }
    setSaving(false);
  };

  const handleSaveTask = async () => {
    if (!taskForm.task_name.trim() || !taskForm.area_id) return;
    setSaving(true);
    try {
      await supabase.from('cleaning_tasks').insert({ ...taskForm, tenant_id: tenantId });
      toast('Task saved!', 'success');
      setTaskForm({ area_id: '', task_name: '', frequency: 'daily', shift: '', notes: '' });
      setShowForm(null);
      await loadData(tenantId);
    } catch (e) { toast('Error: ' + e.message, 'error'); }
    setSaving(false);
  };

  const handleSaveSupply = async () => {
    if (!supplyForm.name.trim()) return;
    setSaving(true);
    try {
      if (showForm?.edit) {
        await supabase.from('cleaning_supplies').update(supplyForm).eq('id', showForm.edit);
      } else {
        await supabase.from('cleaning_supplies').insert({ ...supplyForm, tenant_id: tenantId });
      }
      toast('Supply saved!', 'success');
      setShowForm(null);
      setSupplyForm({ name: '', category: 'consumable', stock: 0, min_stock: 5, unit: 'pcs', notes: '' });
      await loadData(tenantId);
    } catch (e) { toast('Error: ' + e.message, 'error'); }
    setSaving(false);
  };

  const handleDelete = async (table, id) => {
    if (!await confirm(`Hapus data ini?`, 'Hapus')) return;
    try {
      await supabase.from(table).delete().eq('id', id);
      toast('Deleted!', 'success');
      await loadData(tenantId);
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  };

  const handleAddChecklist = async () => {
    if (!checklistForm.item_name.trim() || !checklistForm.area_id) return;
    setSaving(true);
    try {
      await supabase.from('cleaning_checklist').insert({
        tenant_id: tenantId, area_id: checklistForm.area_id,
        item_name: checklistForm.item_name, sort_order: checklist.length + 1,
      });
      setChecklistForm({ area_id: '', item_name: '' });
      await loadData(tenantId);
    } catch (e) { toast('Error: ' + e.message, 'error'); }
    setSaving(false);
  };

  const stats = useMemo(() => ({
    totalAreas: areas.length,
    totalTasks: tasks.length,
    todayCompleted: logs.filter(l => l.completed_at?.startsWith(new Date().toISOString().split('T')[0])).length,
    lowStock: supplies.filter(s => s.stock <= s.min_stock).length,
  }), [areas, tasks, logs, supplies]);

  if (loading) return <div className="p-20 text-center"><div className="w-8 h-8 border-2 border-[var(--aurora-3)] border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-serif font-bold text-white">{t('Cleaning Management')}</h3>
          <p className="text-xs text-gray-500 mt-0.5">Manajemen tugas kebersihan & perlengkapan</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-white/5 border border-white/10"><p className="text-[10px] text-gray-500 uppercase">Area</p><p className="text-lg font-bold text-white">{stats.totalAreas}</p></div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/10"><p className="text-[10px] text-gray-500 uppercase">Tugas</p><p className="text-lg font-bold text-white">{stats.totalTasks}</p></div>
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20"><p className="text-[10px] text-emerald-400 uppercase">Selesai Hari Ini</p><p className="text-lg font-bold text-emerald-400">{stats.todayCompleted}</p></div>
        <div className={`p-3 rounded-xl border ${stats.lowStock > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-white/5 border-white/10'}`}><p className="text-[10px] text-gray-500 uppercase">Stok Menipis</p><p className={`text-lg font-bold ${stats.lowStock > 0 ? 'text-amber-400' : 'text-white'}`}>{stats.lowStock}</p></div>
      </div>

      <div className="flex gap-2 border-b border-white/10 pb-2">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all ${activeTab === tab.id ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
            <tab.icon size={14} className="inline mr-1.5" /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'tasks' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setShowForm('area')} className="px-3 py-2 rounded-xl bg-[var(--aurora-3)]/10 border border-[var(--aurora-3)]/30 text-[var(--aurora-3)] text-[10px] font-bold flex items-center gap-1"><Plus size={12} /> Area</button>
            <button onClick={() => setShowForm('task')} className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center gap-1"><Plus size={12} /> Tugas</button>
            <button onClick={() => setShowForm('checklist')} className="px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[10px] font-bold flex items-center gap-1"><Plus size={12} /> Checklist</button>
          </div>

          {showForm === 'area' && (
            <motion.div initial={{ opacity: 0, y: -10 }} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-white">{form.edit ? 'Edit Area' : 'Tambah Area'}</h4>
              <div className="grid grid-cols-2 gap-3">
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nama area (Lobby, Toilet, dll)" className="col-span-2 bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none" />
                <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Lokasi" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none" />
                <input value={form.floor} onChange={e => setForm({ ...form, floor: e.target.value })} placeholder="Lantai" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none" />
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="col-span-2 bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none">
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowForm(null)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-[10px] font-bold">Batal</button>
                <button onClick={handleSaveArea} disabled={saving} className="px-4 py-2 rounded-xl bg-[var(--aurora-3)]/20 text-[var(--aurora-3)] text-[10px] font-bold flex items-center gap-1"><Save size={12} /> Simpan</button>
              </div>
            </motion.div>
          )}

          {showForm === 'task' && (
            <motion.div initial={{ opacity: 0, y: -10 }} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-white">Tambah Tugas</h4>
              <select value={taskForm.area_id} onChange={e => setTaskForm({ ...taskForm, area_id: e.target.value })} className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none">
                <option value="">Pilih Area</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <input value={taskForm.task_name} onChange={e => setTaskForm({ ...taskForm, task_name: e.target.value })} placeholder="Nama tugas (Lap meja, Pel lantai, dll)" className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none" />
              <div className="grid grid-cols-2 gap-3">
                <select value={taskForm.frequency} onChange={e => setTaskForm({ ...taskForm, frequency: e.target.value })} className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none">
                  <option value="daily">Harian</option><option value="weekly">Mingguan</option><option value="monthly">Bulanan</option><option value="shift">Per Shift</option>
                </select>
                <input value={taskForm.shift} onChange={e => setTaskForm({ ...taskForm, shift: e.target.value })} placeholder="Shift (Pagi/Siang/Malam)" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowForm(null)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-[10px] font-bold">Batal</button>
                <button onClick={handleSaveTask} disabled={saving} className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center gap-1"><Save size={12} /> Simpan</button>
              </div>
            </motion.div>
          )}

          {showForm === 'checklist' && (
            <motion.div initial={{ opacity: 0, y: -10 }} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-white">Tambah Item Checklist</h4>
              <select value={checklistForm.area_id} onChange={e => setChecklistForm({ ...checklistForm, area_id: e.target.value })} className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none">
                <option value="">Pilih Area</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <input value={checklistForm.item_name} onChange={e => setChecklistForm({ ...checklistForm, item_name: e.target.value })} placeholder="Item (Lantai kering, Wastafel bersih, dll)" className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none" />
              <div className="flex gap-2">
                <button onClick={() => setShowForm(null)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-[10px] font-bold">Batal</button>
                <button onClick={handleAddChecklist} disabled={saving} className="px-4 py-2 rounded-xl bg-purple-500/20 text-purple-400 text-[10px] font-bold flex items-center gap-1"><Save size={12} /> Simpan</button>
              </div>
            </motion.div>
          )}

          <div className="space-y-2">
            {areas.map(area => (
              <div key={area.id} className="bg-white/[0.02] border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">{area.name}</p>
                    <p className="text-[10px] text-gray-500">{area.location} {area.floor ? `• Lt. ${area.floor}` : ''} • <span className={`${area.priority === 'high' ? 'text-red-400' : 'text-gray-400'}`}>{area.priority}</span></p>
                  </div>
                  <button onClick={() => handleDelete('cleaning_areas', area.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
                {tasks.filter(t => t.area_id === area.id).map(task => (
                  <div key={task.id} className="mt-2 ml-4 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-300">{task.task_name}</p>
                      <p className="text-[9px] text-gray-600">{task.frequency} {task.shift ? `• ${task.shift}` : ''}</p>
                    </div>
                    <button onClick={() => handleDelete('cleaning_tasks', task.id)} className="p-1 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400"><X size={12} /></button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none" />
            <button onClick={() => setFilterDate(new Date().toISOString().split('T')[0])} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-[10px] font-bold">Hari Ini</button>
          </div>
          {logs.filter(l => !filterDate || l.completed_at?.startsWith(filterDate)).map(log => (
            <div key={log.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-white">{log.cleaning_tasks?.task_name || '-'}</p>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] font-bold">Selesai</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                {log.cleaning_areas?.name} • {log.profiles?.full_name || 'Tanpa nama'} • {new Date(log.completed_at).toLocaleString('id-ID')}
              </p>
              {log.notes && <p className="text-[10px] text-gray-400 mt-1 italic">"{log.notes}"</p>}
              <div className="flex gap-2 mt-2">
                {log.photo_before && <img src={log.photo_before} className="w-20 h-16 object-cover rounded-lg" />}
                {log.photo_after && <img src={log.photo_after} className="w-20 h-16 object-cover rounded-lg" />}
              </div>
            </div>
          ))}
          {logs.filter(l => !filterDate || l.completed_at?.startsWith(filterDate)).length === 0 && (
            <div className="p-12 text-center text-gray-500 text-sm">Belum ada laporan untuk tanggal ini.</div>
          )}
        </div>
      )}

      {activeTab === 'supplies' && (
        <div className="space-y-3">
          <button onClick={() => setShowForm('supply')} className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold flex items-center gap-1"><Plus size={12} /> Tambah Stok</button>

          {showForm === 'supply' && (
            <motion.div initial={{ opacity: 0, y: -10 }} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-white">{supplyForm.edit ? 'Edit' : 'Tambah'} Perlengkapan</h4>
              <div className="grid grid-cols-2 gap-3">
                <input value={supplyForm.name} onChange={e => setSupplyForm({ ...supplyForm, name: e.target.value })} placeholder="Nama" className="col-span-2 bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none" />
                <select value={supplyForm.category} onChange={e => setSupplyForm({ ...supplyForm, category: e.target.value })} className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none">
                  <option value="chemical">Chemical</option><option value="tool">Alat</option><option value="consumable">Konsumsi</option><option value="other">Lainnya</option>
                </select>
                <input value={supplyForm.unit} onChange={e => setSupplyForm({ ...supplyForm, unit: e.target.value })} placeholder="Satuan (pcs, liter, dll)" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none" />
                <input value={supplyForm.stock} onChange={e => setSupplyForm({ ...supplyForm, stock: parseInt(e.target.value) || 0 })} type="number" placeholder="Stok" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none" />
                <input value={supplyForm.min_stock} onChange={e => setSupplyForm({ ...supplyForm, min_stock: parseInt(e.target.value) || 0 })} type="number" placeholder="Min. Stok" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none" />
                <input value={supplyForm.notes} onChange={e => setSupplyForm({ ...supplyForm, notes: e.target.value })} placeholder="Catatan" className="col-span-2 bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowForm(null)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-[10px] font-bold">Batal</button>
                <button onClick={handleSaveSupply} disabled={saving} className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 text-[10px] font-bold flex items-center gap-1"><Save size={12} /> Simpan</button>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {supplies.map(s => (
              <div key={s.id} className={`p-4 rounded-2xl border ${s.stock <= s.min_stock ? 'bg-amber-500/[0.03] border-amber-500/20' : 'bg-white/[0.02] border-white/10'}`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-white">{s.name}</p>
                  <button onClick={() => handleDelete('cleaning_supplies', s.id)} className="p-1 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400"><Trash2 size={12} /></button>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-sm font-bold ${s.stock <= s.min_stock ? 'text-amber-400' : 'text-white'}`}>{s.stock}</span>
                  <span className="text-[10px] text-gray-500">{s.unit}</span>
                  {s.stock <= s.min_stock && <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[8px] font-bold">Menipis</span>}
                </div>
                <p className="text-[9px] text-gray-600 mt-1">{s.category} • Min: {s.min_stock}</p>
              </div>
            ))}
            {supplies.length === 0 && <div className="p-8 text-center text-gray-500 text-sm col-span-2">Belum ada perlengkapan.</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default CleaningManagement;
