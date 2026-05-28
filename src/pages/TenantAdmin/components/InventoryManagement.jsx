import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Save, X, Edit3, Package, AlertTriangle, Barcode, DollarSign, MapPin, TrendingUp, Box, ArrowUpDown, Loader2 } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { logAudit } from '../../../utils/auditLogger';

const TABS = [
  { key: 'items', label: 'Items', icon: <Package size={14} /> },
  { key: 'transactions', label: 'Transaksi', icon: <ArrowUpDown size={14} /> },
];

const CATEGORIES = [
  'ATK', 'Elektronik', 'Kebersihan', 'Makanan', 'Minuman', 'Seragam', 'Alat Kerja', 'Safety', 'Lainnya'
];

const InventoryManagement = () => {
  const [tab, setTab] = useState('items');
  const [items, setItems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [tenantId, setTenantId] = useState(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showTxForm, setShowTxForm] = useState(false);
  const [form, setForm] = useState({ name: '', sku: '', category: 'ATK', quantity: 0, min_stock: 0, unit: 'pcs', location: '', barcode: '', price: '' });
  const [txForm, setTxForm] = useState({ item_id: '', type: 'in', quantity: 1, reference: '', notes: '' });
  const toast = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: p } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!p?.tenant_id && !isGod) return;
    if (p?.tenant_id) setTenantId(p.tenant_id);

    let q1 = supabase.from('inventory_items').select('*');
    if (p?.tenant_id) q1 = q1.eq('tenant_id', p.tenant_id);
    q1 = q1.order('created_at', { ascending: false });
    const { data: inv } = await q1;
    if (inv) setItems(inv);

    let q2 = supabase.from('inventory_transactions').select('*, inventory_items(name, sku)');
    if (p?.tenant_id) q2 = q2.eq('tenant_id', p.tenant_id);
    q2 = q2.order('created_at', { ascending: false });
    const { data: tx } = await q2;
    if (tx) setTransactions(tx);
  };

  const openNew = () => {
    setForm({ name: '', sku: '', category: 'ATK', quantity: 0, min_stock: 0, unit: 'pcs', location: '', barcode: '', price: '' });
    setEditingId(null); setShowForm(true);
  };

  const openEdit = (item) => {
    setForm({ name: item.name, sku: item.sku || '', category: item.category || 'ATK', quantity: item.quantity || 0, min_stock: item.min_stock || 0, unit: item.unit || 'pcs', location: item.location || '', barcode: item.barcode || '', price: item.price || '' });
    setEditingId(item.id); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast('Nama item wajib', 'error'); return; }
    try {
      const payload = { ...form, tenant_id: tenantId, quantity: Number(form.quantity), min_stock: Number(form.min_stock), price: form.price ? Number(form.price) : null };
      if (editingId) {
        await supabase.from('inventory_items').update(payload).eq('id', editingId);
        toast('Item diperbarui', 'success');
      } else {
        await supabase.from('inventory_items').insert(payload);
        toast('Item ditambahkan', 'success');
      }
      logAudit(editingId ? 'UPDATE_INVENTORY_ITEM' : 'ADD_INVENTORY_ITEM', { name: form.name });
      setShowForm(false);
      fetchData();
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
  };

  const handleTxSubmit = async () => {
    if (!txForm.item_id || !txForm.quantity) { toast('Lengkapi transaksi', 'error'); return; }
    try {
      const qty = txForm.type === 'out' ? -Math.abs(Number(txForm.quantity)) : Math.abs(Number(txForm.quantity));
      await supabase.from('inventory_transactions').insert({
        ...txForm, tenant_id: tenantId, quantity: qty,
        type: txForm.type,
      });
      const item = items.find(i => i.id === txForm.item_id);
      if (item) {
        const newQty = (item.quantity || 0) + (txForm.type === 'in' ? Math.abs(Number(txForm.quantity)) : -Math.abs(Number(txForm.quantity)));
        await supabase.from('inventory_items').update({ quantity: Math.max(0, newQty) }).eq('id', txForm.item_id);
      }
      toast('Transaksi dicatat', 'success');
      setShowTxForm(false);
      setTxForm({ item_id: '', type: 'in', quantity: 1, reference: '', notes: '' });
      fetchData();
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
  };

  const totalItems = items.length;
  const totalValue = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.price) || 0), 0);
  const lowStockCount = items.filter(i => (i.quantity || 0) <= (i.min_stock || 0)).length;

  const filteredItems = items.filter(i =>
    i.name?.toLowerCase().includes(search.toLowerCase()) ||
    i.sku?.toLowerCase().includes(search.toLowerCase()) ||
    i.location?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTx = transactions.filter(t =>
    t.inventory_items?.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.inventory_items?.sku?.toLowerCase().includes(search.toLowerCase()) ||
    t.reference?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="glass-panel p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-6 mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">Manajemen Inventori</h2>
          <p className="text-sm text-gray-400 mt-1">{totalItems} item • Rp{Math.round(totalValue).toLocaleString()} total nilai • {lowStockCount} low stock</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
          <Package size={18} className="text-[var(--aurora-3)] mb-2" />
          <p className="text-2xl font-bold text-white font-mono">{totalItems}</p>
          <p className="text-[9px] text-gray-500 uppercase tracking-widest">Total Item</p>
        </div>
        <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
          <DollarSign size={18} className="text-[var(--success)] mb-2" />
          <p className="text-2xl font-bold text-white font-mono">Rp{Math.round(totalValue / 1000)}k</p>
          <p className="text-[9px] text-gray-500 uppercase tracking-widest">Total Nilai</p>
        </div>
        <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
          <AlertTriangle size={18} className={`mb-2 ${lowStockCount > 0 ? 'text-[var(--warning)]' : 'text-gray-500'}`} />
          <p className="text-2xl font-bold text-white font-mono">{lowStockCount}</p>
          <p className="text-[9px] text-gray-500 uppercase tracking-widest">Low Stock</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setSearch(''); }}
            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all flex items-center gap-2 ${tab === t.key ? 'bg-white/10 border-[var(--aurora-3)]/30 text-white' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari item, SKU, lokasi..." className="w-full bg-[#1A1C23] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-3)]" />
      </div>

      {tab === 'items' && (
        <>
          <button onClick={openNew} className="mb-6 px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-bold flex items-center gap-2"><Plus size={16} /> Tambah Item</button>

          {showForm && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Nama Item</label>
                  <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="Kertas A4" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">SKU</label>
                  <input value={form.sku} onChange={e => setForm({...form, sku: e.target.value.toUpperCase()})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="KRT-A4-001" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Kategori</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white outline-none">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Quantity</label>
                  <input type="number" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Min. Stock</label>
                  <input type="number" value={form.min_stock} onChange={e => setForm({...form, min_stock: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Unit</label>
                  <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white outline-none">
                    <option value="pcs">Pcs</option>
                    <option value="box">Box</option>
                    <option value="pack">Pack</option>
                    <option value="kg">Kg</option>
                    <option value="liter">Liter</option>
                    <option value="meter">Meter</option>
                    <option value="unit">Unit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Lokasi</label>
                  <input value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="Gudang A - Rak 3" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Barcode</label>
                  <input value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="8991234567890" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Harga Satuan (Rp)</label>
                  <input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="50000" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleSave} className="px-6 py-3 rounded-xl bg-[var(--success)] text-black text-xs font-bold flex items-center gap-2"><Save size={14} /> Simpan</button>
                <button onClick={() => setShowForm(false)} className="px-6 py-3 rounded-xl bg-white/5 text-gray-400 border border-white/10 text-xs font-bold"><X size={14} /> Batal</button>
              </div>
            </motion.div>
          )}

          <div className="space-y-3">
            {filteredItems.map(item => {
              const isLow = (item.quantity || 0) <= (item.min_stock || 0);
              return (
                <div key={item.id} className={`p-5 rounded-2xl border transition-all group ${isLow ? 'bg-[var(--warning)]/5 border-[var(--warning)]/20' : 'bg-white/5 border-white/10 hover:border-white/20'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isLow ? 'bg-[var(--warning)]/10 text-[var(--warning)]' : 'bg-white/5 text-gray-400'}`}>
                        {isLow ? <AlertTriangle size={18} /> : <Package size={18} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{item.name}</span>
                          {item.sku && <span className="text-[9px] font-mono text-gray-500">{item.sku}</span>}
                        </div>
                        <div className="flex items-center gap-3 text-[9px] text-gray-500 mt-0.5 flex-wrap">
                          {item.category && <span>{item.category}</span>}
                          {item.location && <span className="flex items-center gap-1"><MapPin size={10} /> {item.location}</span>}
                          {item.barcode && <span className="flex items-center gap-1"><Barcode size={10} /> {item.barcode}</span>}
                          {item.price > 0 && <span>Rp{Number(item.price).toLocaleString()}/{item.unit}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={`text-lg font-bold font-mono ${isLow ? 'text-[var(--warning)]' : 'text-white'}`}>{item.quantity || 0}</p>
                        <p className="text-[9px] text-gray-500">{item.unit} {isLow ? `(min: ${item.min_stock})` : ''}</p>
                      </div>
                      <button onClick={() => openEdit(item)} className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"><Edit3 size={12} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
            {!filteredItems.length && <p className="text-center text-gray-500 py-8 text-sm">Belum ada item inventori</p>}
          </div>
        </>
      )}

      {tab === 'transactions' && (
        <>
          <button onClick={() => setShowTxForm(true)} className="mb-6 px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-bold flex items-center gap-2"><Plus size={16} /> Catat Transaksi</button>

          {showTxForm && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Item</label>
                  <select value={txForm.item_id} onChange={e => setTxForm({...txForm, item_id: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white outline-none">
                    <option value="">— Pilih —</option>
                    {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.sku || i.category}) - stock: {i.quantity}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Tipe</label>
                  <div className="flex gap-2">
                    {['in', 'out'].map(t => (
                      <button key={t} onClick={() => setTxForm({...txForm, type: t})}
                        className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all ${txForm.type === t ? (t === 'in' ? 'bg-[var(--success)]/10 border-[var(--success)]/30 text-[var(--success)]' : 'bg-[var(--danger)]/10 border-[var(--danger)]/30 text-[var(--danger)]') : 'bg-white/5 border-white/10 text-gray-500'}`}>
                        {t === 'in' ? 'Stock In' : 'Stock Out'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Quantity</label>
                  <input type="number" value={txForm.quantity} onChange={e => setTxForm({...txForm, quantity: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" min="1" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Referensi</label>
                  <input value={txForm.reference} onChange={e => setTxForm({...txForm, reference: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="PO-001 / Bon 123" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Catatan</label>
                  <input value={txForm.notes} onChange={e => setTxForm({...txForm, notes: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="Catatan..." />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleTxSubmit} className="px-6 py-3 rounded-xl bg-[var(--success)] text-black text-xs font-bold flex items-center gap-2"><Save size={14} /> Simpan Transaksi</button>
                <button onClick={() => setShowTxForm(false)} className="px-6 py-3 rounded-xl bg-white/5 text-gray-400 border border-white/10 text-xs font-bold"><X size={14} /> Batal</button>
              </div>
            </motion.div>
          )}

          <div className="space-y-3">
            {filteredTx.map(tx => (
              <div key={tx.id} className="p-5 bg-white/5 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'in' ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--danger)]/10 text-[var(--danger)]'}`}>
                      {tx.type === 'in' ? <TrendingUp size={18} /> : <ArrowUpDown size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{tx.inventory_items?.name}</p>
                      <div className="flex items-center gap-2 text-[9px] text-gray-500 mt-0.5">
                        <span className={tx.type === 'in' ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>{tx.type === 'in' ? 'Stock In' : 'Stock Out'}</span>
                        <span>•</span>
                        <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                        {tx.reference && <><span>•</span><span>Ref: {tx.reference}</span></>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold font-mono ${tx.type === 'in' ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                      {tx.type === 'in' ? '+' : '-'}{tx.quantity}
                    </p>
                    {tx.notes && <p className="text-[9px] text-gray-500 italic">{tx.notes}</p>}
                  </div>
                </div>
              </div>
            ))}
            {!filteredTx.length && <p className="text-center text-gray-500 py-8 text-sm">Belum ada transaksi</p>}
          </div>
        </>
      )}
    </div>
  );
};

export default InventoryManagement;
