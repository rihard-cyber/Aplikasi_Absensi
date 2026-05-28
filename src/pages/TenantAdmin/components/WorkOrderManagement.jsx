/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Save, X, Edit3, CheckCircle2, Loader2, Calendar, User, Wrench, ClipboardList, Image, PenTool, Package, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';

const WORK_TYPES = [
  { value: 'preventive', label: 'Preventive', icon: <Wrench size={14} /> },
  { value: 'corrective', label: 'Corrective', icon: <Wrench size={14} /> },
  { value: 'inspection', label: 'Inspection', icon: <ClipboardList size={14} /> },
];

const WorkOrderManagement = () => {
  const [workOrders, setWorkOrders] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [tenantId, setTenantId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [selectedWO, setSelectedWO] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [checklistItems, setChecklistItems] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [photoAfter, setPhotoAfter] = useState(null);
  const [signature, setSignature] = useState('');
  const [form, setForm] = useState({ title: '', description: '', work_type: 'preventive', schedule_date: '', assigned_to: '', helpdesk_ticket_id: '' });
  const toast = useToast();

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: p } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!p?.tenant_id && !isGod) return;
    if (p?.tenant_id) setTenantId(p.tenant_id);

    let q1 = supabase.from('work_orders').select('*, profiles!assigned_to(full_name, nip)');
    if (p?.tenant_id) q1 = q1.eq('tenant_id', p.tenant_id);
    q1 = q1.order('created_at', { ascending: false });
    const { data: w } = await q1;
    if (w) setWorkOrders(w);

    let q2 = supabase.from('profiles').select('id, full_name, nip');
    if (p?.tenant_id) q2 = q2.eq('tenant_id', p.tenant_id);
    q2 = q2.or('role.eq.TEKNISI,role.eq.SUB_ADMIN,role.eq.EMPLOYEE');
    const { data: t } = await q2;
    if (t) setTechnicians(t);
  };

  const openNew = () => {
    setForm({ title: '', description: '', work_type: 'preventive', schedule_date: '', assigned_to: '', helpdesk_ticket_id: '' });
    setEditingId(null); setShowForm(true);
  };

  const openEdit = (wo) => {
    setForm({ title: wo.title, description: wo.description || '', work_type: wo.work_type, schedule_date: wo.schedule_date || '', assigned_to: wo.assigned_to || '', helpdesk_ticket_id: wo.helpdesk_ticket_id || '' });
    setEditingId(wo.id); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.work_type) { toast('Judul dan tipe pekerjaan wajib', 'error'); return; }
    try {
      const payload = { tenant_id: tenantId, title: form.title, description: form.description || null, work_type: form.work_type, schedule_date: form.schedule_date || null, assigned_to: form.assigned_to || null, helpdesk_ticket_id: form.helpdesk_ticket_id || null };
      if (editingId) {
        await supabase.from('work_orders').update(payload).eq('id', editingId);
        toast('Work order diperbarui', 'success');
      } else {
        await supabase.from('work_orders').insert({ ...payload, status: 'OPEN' });
        toast('Work order dibuat', 'success');
      }
      setShowForm(false);
      fetchAll();
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
  };

  const openDetail = (wo) => {
    setSelectedWO(wo);
    setChecklistItems(wo.checklist_items || [{ task: '', is_done: false }]);
    setMaterials(wo.materials_used || [{ item_name: '', quantity: '' }]);
    setPhotoAfter(null);
    setSignature('');
    setShowDetail(true);
  };

  const toggleChecklistItem = (idx) => {
    const updated = [...checklistItems];
    updated[idx] = { ...updated[idx], is_done: !updated[idx].is_done };
    setChecklistItems(updated);
  };

  const addChecklistItem = () => {
    setChecklistItems([...checklistItems, { task: '', is_done: false }]);
  };

  const addMaterial = () => {
    setMaterials([...materials, { item_name: '', quantity: '' }]);
  };

  const handleMarkComplete = async () => {
    if (!selectedWO) return;
    try {
      const payload = { status: 'COMPLETED', completed_at: new Date().toISOString(), checklist_items: checklistItems, materials_used: materials };
      if (photoAfter) payload.photo_after = photoAfter;
      if (signature) payload.technician_signature = signature;
      await supabase.from('work_orders').update(payload).eq('id', selectedWO.id);
      toast('Work order selesai', 'success');
      setShowDetail(false);
      fetchAll();
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
  };

  const filtered = workOrders.filter(wo => {
    if (filterType !== 'ALL' && wo.work_type !== filterType) return false;
    if (filterStatus !== 'ALL' && wo.status !== filterStatus) return false;
    return wo.title?.toLowerCase().includes(search.toLowerCase()) ||
      wo.profiles?.full_name?.toLowerCase().includes(search.toLowerCase());
  });

  const statusStyles = {
    OPEN: 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/30',
    IN_PROGRESS: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    COMPLETED: 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30',
    CANCELLED: 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/30',
  };

  return (
    <div className="glass-panel p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-6 mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">Work Order</h2>
          <p className="text-sm text-gray-400 mt-1">{workOrders.length} total • {workOrders.filter(w => w.status === 'OPEN').length} open</p>
        </div>
        <button onClick={openNew} className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-bold flex items-center gap-2 whitespace-nowrap"><Plus size={16} /> Buat WO</button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari work order..." className="w-full bg-[#1A1C23] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white text-xs outline-none focus:border-[var(--aurora-3)]" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-[#1A1C23] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-[var(--aurora-3)]">
          <option value="ALL">Semua Tipe</option>
          {WORK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-[#1A1C23] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-[var(--aurora-3)]">
          <option value="ALL">Semua Status</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg glass-panel p-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-serif font-bold text-white">{editingId ? 'Edit' : 'Buat'} Work Order</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Judul</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Tipe Pekerjaan</label>
                  <select value={form.work_type} onChange={e => setForm({...form, work_type: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white outline-none">
                    {WORK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Jadwal</label>
                  <input type="date" value={form.schedule_date} onChange={e => setForm({...form, schedule_date: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Assign Ke</label>
                <select value={form.assigned_to} onChange={e => setForm({...form, assigned_to: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white outline-none">
                  <option value="">— Pilih Teknisi —</option>
                  {technicians.map(t => <option key={t.id} value={t.id}>{t.full_name} ({t.nip})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Helpdesk Ticket ID (opsional)</label>
                <input value={form.helpdesk_ticket_id} onChange={e => setForm({...form, helpdesk_ticket_id: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Deskripsi</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" />
              </div>
              <button onClick={handleSave} className="w-full py-4 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-bold text-xs flex items-center justify-center gap-2">
                <Save size={14} /> {editingId ? 'Update' : 'Buat'} Work Order
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="space-y-3">
        {filtered.map(wo => (
          <div key={wo.id} className="p-5 bg-white/5 rounded-2xl border border-white/10 hover:border-white/20 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400">
                  {WORK_TYPES.find(t => t.value === wo.work_type)?.icon || <Wrench size={18} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{wo.title}</span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border ${statusStyles[wo.status] || 'bg-white/5 text-gray-400'}`}>{wo.status}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[9px] text-gray-500 mt-0.5">
                    <span>{WORK_TYPES.find(t => t.value === wo.work_type)?.label}</span>
                    {wo.profiles?.full_name && <span className="flex items-center gap-1"><User size={9} /> {wo.profiles.full_name}</span>}
                    {wo.schedule_date && <span className="flex items-center gap-1"><Calendar size={9} /> {wo.schedule_date}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openDetail(wo)} className="p-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10" title="Detail"><ClipboardList size={14} /></button>
                <button onClick={() => openEdit(wo)} className="p-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10" title="Edit"><Edit3 size={14} /></button>
              </div>
            </div>
            {wo.description && <p className="text-[10px] text-gray-500 italic mt-2 ml-14">{wo.description}</p>}
          </div>
        ))}
        {!filtered.length && <p className="text-center text-gray-500 py-8 text-sm">Belum ada work order</p>}
      </div>

      {showDetail && selectedWO && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowDetail(false)}>
          <div className="w-full max-w-2xl glass-panel p-8 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-serif font-bold text-white">{selectedWO.title}</h3>
              <button onClick={() => setShowDetail(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
              <div><span className="text-gray-500">Tipe:</span> <span className="text-white font-bold">{WORK_TYPES.find(t => t.value === selectedWO.work_type)?.label}</span></div>
              <div><span className="text-gray-500">Status:</span> <span className="text-white font-bold">{selectedWO.status}</span></div>
              {selectedWO.schedule_date && <div><span className="text-gray-500">Jadwal:</span> <span className="text-white">{selectedWO.schedule_date}</span></div>}
              {selectedWO.profiles?.full_name && <div><span className="text-gray-500">Teknisi:</span> <span className="text-white">{selectedWO.profiles.full_name}</span></div>}
            </div>

            {selectedWO.description && (
              <div className="mb-6 p-4 bg-black/20 rounded-xl border border-white/5">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">Deskripsi</p>
                <p className="text-xs text-gray-300">{selectedWO.description}</p>
              </div>
            )}

            {selectedWO.status !== 'COMPLETED' && (
              <>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Checklist</p>
                    <button onClick={addChecklistItem} className="text-[10px] text-[var(--aurora-3)] flex items-center gap-1"><Plus size={12} /> Tambah</button>
                  </div>
                  <div className="space-y-2">
                    {checklistItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                        <button onClick={() => toggleChecklistItem(idx)} className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${item.is_done ? 'bg-[var(--success)] border-[var(--success)] text-black' : 'border-white/20'}`}>
                          {item.is_done && <CheckCircle2 size={12} />}
                        </button>
                        <input value={item.task} onChange={e => { const u = [...checklistItems]; u[idx] = { ...u[idx], task: e.target.value }; setChecklistItems(u); }} placeholder="Task..." className="flex-1 bg-transparent border-none text-xs text-white outline-none" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Material Terpakai</p>
                    <button onClick={addMaterial} className="text-[10px] text-[var(--aurora-3)] flex items-center gap-1"><Plus size={12} /> Tambah</button>
                  </div>
                  <div className="space-y-2">
                    {materials.map((m, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                        <input value={m.item_name} onChange={e => { const u = [...materials]; u[idx] = { ...u[idx], item_name: e.target.value }; setMaterials(u); }} placeholder="Nama material..." className="flex-1 bg-transparent border-none text-xs text-white outline-none" />
                        <input value={m.quantity} onChange={e => { const u = [...materials]; u[idx] = { ...u[idx], quantity: e.target.value }; setMaterials(u); }} placeholder="Qty" className="w-20 bg-[#1A1C23] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-3">Foto Setelah</p>
                  <label className="p-6 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center gap-2 hover:border-[var(--aurora-3)]/50 cursor-pointer bg-white/[0.01]">
                    <input type="file" className="hidden" accept="image/*" onChange={e => { const file = e.target.files[0]; if (file) setPhotoAfter(URL.createObjectURL(file)); }} />
                    <Image size={24} className="text-gray-600" />
                    <p className="text-[10px] text-gray-500">{photoAfter ? 'Foto dipilih' : 'Upload foto setelah pekerjaan'}</p>
                  </label>
                  {photoAfter && <img src={photoAfter} alt="Preview" className="mt-3 rounded-xl max-h-48 object-cover" />}
                </div>

                <div className="mb-6">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-3">Tanda Tangan Teknisi</p>
                  <label className="p-6 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center gap-2 hover:border-[var(--aurora-3)]/50 cursor-pointer bg-white/[0.01]">
                    <input type="file" className="hidden" accept="image/*" onChange={e => { const file = e.target.files[0]; if (file) setSignature(URL.createObjectURL(file)); }} />
                    <PenTool size={24} className="text-gray-600" />
                    <p className="text-[10px] text-gray-500">{signature ? 'Tanda tangan dipilih' : 'Upload tanda tangan'}</p>
                  </label>
                  {signature && <img src={signature} alt="Signature" className="mt-3 rounded-xl max-h-24 object-contain bg-white/5" />}
                </div>

                <button onClick={handleMarkComplete} className="w-full py-4 rounded-xl bg-[var(--success)] text-black font-bold text-xs flex items-center justify-center gap-2">
                  <CheckCircle2 size={14} /> Mark Complete
                </button>
              </>
            )}

            {selectedWO.status === 'COMPLETED' && (
              <div className="space-y-4">
                {selectedWO.checklist_items?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">Checklist</p>
                    <div className="space-y-1">
                      {selectedWO.checklist_items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <span className={`w-4 h-4 rounded flex items-center justify-center ${item.is_done ? 'bg-[var(--success)]/20 text-[var(--success)]' : 'bg-white/5 text-gray-500'}`}>
                            {item.is_done ? <CheckCircle2 size={10} /> : <X size={10} />}
                          </span>
                          <span className={item.is_done ? 'text-white' : 'text-gray-500'}>{item.task}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedWO.materials_used?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">Material</p>
                    <div className="space-y-1">
                      {selectedWO.materials_used.map((m, idx) => (
                        <div key={idx} className="text-xs text-gray-300 flex items-center gap-2">
                          <Package size={10} /> {m.item_name} x{m.quantity}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedWO.photo_after && (
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">Foto Setelah</p>
                    <img src={selectedWO.photo_after} alt="After" className="rounded-xl max-h-48 object-cover" />
                  </div>
                )}
                {selectedWO.technician_signature && (
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">Tanda Tangan</p>
                    <img src={selectedWO.technician_signature} alt="Signature" className="rounded-xl max-h-20 object-contain bg-white/5" />
                  </div>
                )}
                {selectedWO.completed_at && (
                  <p className="text-[10px] text-gray-500">Selesai: {new Date(selectedWO.completed_at).toLocaleString('id-ID')}</p>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default WorkOrderManagement;
