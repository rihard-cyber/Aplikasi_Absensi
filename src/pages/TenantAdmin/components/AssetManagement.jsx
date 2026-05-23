/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Laptop, Smartphone, Shirt, Truck, Wrench, Plus, Save, X, Edit3, Trash2, User, Loader2 } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';

const CATEGORIES = [
  { value: 'LAPTOP', label: 'Laptop/Komputer', icon: <Laptop size={14} /> },
  { value: 'PHONE', label: 'Handphone', icon: <Smartphone size={14} /> },
  { value: 'UNIFORM', label: 'Seragam', icon: <Shirt size={14} /> },
  { value: 'VEHICLE', label: 'Kendaraan', icon: <Truck size={14} /> },
  { value: 'TOOL', label: 'Peralatan', icon: <Wrench size={14} /> },
  { value: 'OTHER', label: 'Lainnya', icon: <Wrench size={14} /> },
];

const STATUS_STYLES = {
  AVAILABLE: 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30',
  ASSIGNED: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  MAINTENANCE: 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/30',
  RETIRED: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
};

const AssetManagement = () => {
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [tenantId, setTenantId] = useState(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ asset_code: '', asset_name: '', category: 'LAPTOP', brand: '', model: '', serial_number: '', purchase_price: '', assigned_to: '', status: 'AVAILABLE', notes: '' });
  const toast = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: p } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!p?.tenant_id && !isGod) return;
    if (p?.tenant_id) setTenantId(p.tenant_id);

    let q1 = supabase.from('company_assets').select('*, profiles!assigned_to(full_name, nip)');
    if (p?.tenant_id) q1 = q1.eq('tenant_id', p.tenant_id);
    q1 = q1.order('created_at', { ascending: false });
    const { data: a } = await q1;
    if (a) setAssets(a);

    let q2 = supabase.from('profiles').select('id, full_name, nip');
    if (p?.tenant_id) q2 = q2.eq('tenant_id', p.tenant_id);
    q2 = q2.in('role', ['EMPLOYEE', 'SUB_ADMIN']);
    const { data: e } = await q2;
    if (e) setEmployees(e);
  };

  const openNew = () => {
    setForm({ asset_code: '', asset_name: '', category: 'LAPTOP', brand: '', model: '', serial_number: '', purchase_price: '', assigned_to: '', status: 'AVAILABLE', notes: '' });
    setEditingId(null); setShowForm(true);
  };

  const openEdit = (a) => {
    setForm({ asset_code: a.asset_code, asset_name: a.asset_name, category: a.category, brand: a.brand || '', model: a.model || '', serial_number: a.serial_number || '', purchase_price: a.purchase_price || '', assigned_to: a.assigned_to || '', status: a.status, notes: a.notes || '' });
    setEditingId(a.id); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.asset_code || !form.asset_name) { toast('Kode & nama aset wajib', 'error'); return; }
    try {
      const payload = { ...form, tenant_id: tenantId, purchase_price: form.purchase_price ? Number(form.purchase_price) : null, assigned_to: form.assigned_to || null };
      if (editingId) {
        await supabase.from('company_assets').update(payload).eq('id', editingId);
        toast('Aset diperbarui', 'success');
      } else {
        await supabase.from('company_assets').insert(payload);
        toast('Aset ditambahkan', 'success');
      }
      setShowForm(false);
      fetchData();
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
  };

  const handleDelete = async (id) => {
    await supabase.from('company_assets').delete().eq('id', id);
    toast('Aset dihapus', 'success');
    fetchData();
  };

  const filtered = assets.filter(a =>
    a.asset_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.asset_code?.toLowerCase().includes(search.toLowerCase()) ||
    a.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.serial_number?.toLowerCase().includes(search.toLowerCase())
  );

  const assignCount = assets.filter(a => a.status === 'ASSIGNED').length;
  const totalValue = assets.reduce((s, a) => s + Number(a.purchase_price || 0), 0);

  return (
    <div className="glass-panel p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-6 mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">Manajemen Aset</h2>
          <p className="text-sm text-gray-400 mt-1">{assets.length} aset • {assignCount} dipakai • Rp{Math.round(totalValue / 1000000)}jt total nilai</p>
        </div>
        <button onClick={openNew} className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-bold flex items-center gap-2 whitespace-nowrap"><Plus size={16} /> Tambah Aset</button>
      </div>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari aset, kode, pemilik, serial..." className="w-full bg-[#1A1C23] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-3)]" />
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Kode Aset</label>
              <input value={form.asset_code} onChange={e => setForm({...form, asset_code: e.target.value.toUpperCase()})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="LAP-001" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Nama Aset</label>
              <input value={form.asset_name} onChange={e => setForm({...form, asset_name: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="Laptop Dell XPS 15" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Kategori</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white outline-none">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Merek</label>
              <input value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Model / Tipe</label>
              <input value={form.model} onChange={e => setForm({...form, model: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Serial Number</label>
              <input value={form.serial_number} onChange={e => setForm({...form, serial_number: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Harga Beli (Rp)</label>
              <input type="number" value={form.purchase_price} onChange={e => setForm({...form, purchase_price: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Ditugaskan Ke</label>
              <select value={form.assigned_to} onChange={e => setForm({...form, assigned_to: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white outline-none">
                <option value="">— Tidak ditugaskan —</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.nip})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white outline-none">
                <option value="AVAILABLE">Tersedia</option>
                <option value="ASSIGNED">Dipinjamkan</option>
                <option value="MAINTENANCE">Perbaikan</option>
                <option value="RETIRED">Pensiun</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} className="px-6 py-3 rounded-xl bg-[var(--success)] text-black text-xs font-bold flex items-center gap-2"><Save size={14} /> Simpan</button>
            <button onClick={() => setShowForm(false)} className="px-6 py-3 rounded-xl bg-white/5 text-gray-400 border border-white/10 text-xs font-bold"><X size={14} /> Batal</button>
          </div>
        </motion.div>
      )}

      <div className="space-y-3">
        {filtered.map(a => (
          <div key={a.id} className="p-5 bg-white/5 rounded-2xl border border-white/10 hover:border-white/20 transition-all group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400">
                  {CATEGORIES.find(c => c.value === a.category)?.icon || <Wrench size={18} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[var(--aurora-3)]">{a.asset_code}</span>
                    <span className="text-sm font-bold text-white">{a.asset_name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[9px] text-gray-500 mt-0.5">
                    {a.brand && <span>{a.brand} {a.model}</span>}
                    {a.serial_number && <span>SN: {a.serial_number}</span>}
                    {a.purchase_price > 0 && <span>Rp{Number(a.purchase_price).toLocaleString()}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {a.assigned_to && a.profiles && (
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400 bg-white/5 px-3 py-1.5 rounded-full">
                    <User size={10} /> {a.profiles.full_name}
                  </div>
                )}
                <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${STATUS_STYLES[a.status]}`}>{a.status}</span>
                <button onClick={() => openEdit(a)} className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"><Edit3 size={12} /></button>
                <button onClick={() => handleDelete(a.id)} className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-[var(--danger)]"><Trash2 size={12} /></button>
              </div>
            </div>
          </div>
        ))}
        {!filtered.length && <p className="text-center text-gray-500 py-8 text-sm">Belum ada aset terdaftar</p>}
      </div>
    </div>
  );
};

export default AssetManagement;
