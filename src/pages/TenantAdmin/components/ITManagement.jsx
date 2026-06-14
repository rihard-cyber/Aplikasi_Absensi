import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Monitor, Plus, Save, CheckCircle2, XCircle, Clock, Loader2, Edit3, Calendar, DollarSign, AlertTriangle, Laptop } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';

const TABS = [
  { key: 'licenses', label: 'License', icon: <Monitor size={14} /> },
  { key: 'requests', label: 'Requests', icon: <Laptop size={14} /> },
];

const ITManagement = () => {
  const [tab, setTab] = useState('licenses');
  const [licenses, setLicenses] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingLicense, setEditingLicense] = useState(null);
  const [form, setForm] = useState({ software_name: '', vendor: '', license_key: '', seats: 1, used_seats: 0, purchase_date: '', expiry_date: '', cost: '', renewal_type: 'annual', status: 'active', assigned_to: '', notes: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: p } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
      if (!p) return;
      setTenantId(p.tenant_id);

      if (p.tenant_id) {
        const [licRes, reqRes] = await Promise.all([
          supabase.from('it_software_licenses').select('*').eq('tenant_id', p.tenant_id).order('created_at', { ascending: false }).limit(50),
          supabase.from('it_equipment_requests').select('*, profiles!requester_id(full_name, nip)').eq('tenant_id', p.tenant_id).order('created_at', { ascending: false }).limit(50),
        ]);
        setLicenses(licRes.data || []);
        setRequests(reqRes.data || []);
      }
    } catch (e) { 
      console.error(e); 
    } finally {
      setLoading(false);
    }
  };

  const handleLicenseSave = async () => {
    if (!form.software_name) return;
    const payload = { ...form, tenant_id: tenantId, seats: parseInt(form.seats) || 1, used_seats: parseInt(form.used_seats) || 0, cost: form.cost ? parseFloat(form.cost) : null };
    if (editingLicense) {
      await supabase.from('it_software_licenses').update(payload).eq('id', editingLicense);
    } else {
      await supabase.from('it_software_licenses').insert(payload);
    }
    setShowForm(false); setEditingLicense(null);
    setForm({ software_name: '', vendor: '', license_key: '', seats: 1, used_seats: 0, purchase_date: '', expiry_date: '', cost: '', renewal_type: 'annual', status: 'active', assigned_to: '', notes: '' });
    fetchData();
  };

  const handleRequestAction = async (id, status) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { data: admin } = await supabase.from('profiles').select('id').eq('auth_id', session.user.id).maybeSingle();
    const payload = { status };
    if (status === 'fulfilled') payload.fulfilled_at = new Date().toISOString();
    if (['approved', 'rejected', 'fulfilled'].includes(status)) payload.approved_by = admin?.id || null;
    await supabase.from('it_equipment_requests').update(payload).eq('id', id);
    fetchData();
  };

  const openEdit = (l) => {
    setEditingLicense(l.id);
    setForm({ software_name: l.software_name, vendor: l.vendor || '', license_key: l.license_key || '', seats: l.seats || 1, used_seats: l.used_seats || 0, purchase_date: l.purchase_date || '', expiry_date: l.expiry_date || '', cost: l.cost || '', renewal_type: l.renewal_type || 'annual', status: l.status || 'active', assigned_to: l.assigned_to || '', notes: l.notes || '' });
    setShowForm(true);
  };

  const stats = useMemo(() => ({
    active: licenses.filter(l => l.status === 'active').length,
    expiring: licenses.filter(l => l.expiry_date && new Date(l.expiry_date) > new Date() && new Date(l.expiry_date) < new Date(Date.now() + 30*86400000)).length,
    pending: requests.filter(r => r.status === 'pending').length,
  }), [licenses, requests]);

  if (loading) return <div className="p-20 text-center"><div className="w-8 h-8 border-2 border-[var(--aurora-3)] border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-serif font-bold text-white">IT Management</h2>
        <p className="text-sm text-gray-400 mt-1">Software licenses & equipment requests</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
          <p className="text-[10px] text-gray-400">License Active</p>
        </div>
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-2xl font-bold text-amber-400">{stats.expiring}</p>
          <p className="text-[10px] text-gray-400">Akan Expire</p>
        </div>
        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
          <p className="text-2xl font-bold text-blue-400">{stats.pending}</p>
          <p className="text-[10px] text-gray-400">Pending Equipment</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border flex items-center gap-2 ${tab === t.key ? 'bg-white/10 border-[var(--aurora-3)]/30 text-white' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari..." className="w-full bg-white/5 border border-white/20 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white outline-none placeholder:text-gray-400" />
      </div>

      {tab === 'licenses' && (
        <>
          <button onClick={() => { setShowForm(true); setEditingLicense(null); setForm({ software_name: '', vendor: '', license_key: '', seats: 1, used_seats: 0, purchase_date: '', expiry_date: '', cost: '', renewal_type: 'annual', status: 'active', assigned_to: '', notes: '' }); }} className="px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px] font-bold flex items-center gap-2 w-fit"><Plus size={14} /> Tambah License</button>

          {showForm && (
            <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
              <h4 className="text-sm font-bold text-white">{editingLicense ? 'Edit License' : 'Tambah License'}</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input value={form.software_name} onChange={e => setForm({ ...form, software_name: e.target.value })} placeholder="Nama Software" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none" />
                <input value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} placeholder="Vendor" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none" />
                <input value={form.license_key} onChange={e => setForm({ ...form, license_key: e.target.value })} placeholder="License Key" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={form.seats} onChange={e => setForm({ ...form, seats: e.target.value })} type="number" placeholder="Total Seats" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none" />
                  <input value={form.used_seats} onChange={e => setForm({ ...form, used_seats: e.target.value })} type="number" placeholder="Used Seats" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none" />
                </div>
                <input value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })} type="date" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none" />
                <input value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} type="date" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none" />
                <input value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} type="number" placeholder="Biaya" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none" />
                <select value={form.renewal_type} onChange={e => setForm({ ...form, renewal_type: e.target.value })} className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none">
                  <option value="monthly">Monthly</option><option value="annual">Annual</option><option value="perpetual">Perpetual</option><option value="lifetime">Lifetime</option>
                </select>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none">
                  <option value="active">Active</option><option value="expiring">Expiring</option><option value="expired">Expired</option><option value="cancelled">Cancelled</option>
                </select>
                <input value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} placeholder="Assigned To" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none" />
              </div>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notes" className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none min-h-[60px]" />
              <div className="flex gap-3">
                <button onClick={handleLicenseSave} className="px-5 py-2.5 rounded-xl bg-blue-500/20 text-blue-400 text-xs font-bold"><Save size={14} className="inline" /> Simpan</button>
                <button onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl bg-white/5 text-gray-400 border border-white/10 text-xs font-bold">Batal</button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {licenses.filter(l => l.software_name?.toLowerCase().includes(search.toLowerCase()) || l.vendor?.toLowerCase().includes(search.toLowerCase())).map(l => (
              <div key={l.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center"><Monitor size={14} className="text-gray-400" /></div>
                    <div>
                      <p className="text-xs font-bold text-white">{l.software_name}</p>
                      <p className="text-[9px] text-gray-500">{l.vendor} {l.expiry_date && `• Exp: ${l.expiry_date}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-gray-400 font-mono">{l.used_seats}/{l.seats}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${l.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : l.status === 'expiring' ? 'bg-amber-500/10 text-amber-400' : l.status === 'expired' ? 'bg-red-500/10 text-red-400' : 'bg-gray-500/10 text-gray-400'}`}>{l.status}</span>
                    <button onClick={() => openEdit(l)} className="p-1 hover:bg-white/10 rounded-lg text-gray-400"><Edit3 size={12} /></button>
                  </div>
                </div>
              </div>
            ))}
            {!licenses.filter(l => l.software_name?.toLowerCase().includes(search.toLowerCase()) || l.vendor?.toLowerCase().includes(search.toLowerCase())).length && <p className="text-center text-gray-500 py-8 text-sm">Belum ada license.</p>}
          </div>
        </>
      )}

      {tab === 'requests' && (
        <div className="space-y-2">
          {requests.filter(r => r.equipment_type?.toLowerCase().includes(search.toLowerCase()) || r.profiles?.full_name?.toLowerCase().includes(search.toLowerCase())).map(r => (
            <div key={r.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white capitalize">{r.equipment_type} x{r.quantity}</p>
                  <p className="text-[9px] text-gray-500">{r.profiles?.full_name} • {new Date(r.created_at).toLocaleDateString('id-ID')}</p>
                </div>
                <div className="flex items-center gap-2">
                  {r.status === 'pending' ? (
                    <>
                      <button onClick={() => handleRequestAction(r.id, 'approved')} className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400"><CheckCircle2 size={14} /></button>
                      <button onClick={() => handleRequestAction(r.id, 'rejected')} className="p-1.5 rounded-lg bg-red-500/10 text-red-400"><XCircle size={14} /></button>
                    </>
                  ) : r.status === 'approved' ? (
                    <button onClick={() => handleRequestAction(r.id, 'fulfilled')} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400"><CheckCircle2 size={14} /></button>
                  ) : (
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${r.status === 'fulfilled' ? 'bg-emerald-500/10 text-emerald-400' : r.status === 'rejected' ? 'bg-red-500/10 text-red-400' : ''}`}>{r.status}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1 text-[9px] text-gray-500">
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${r.urgency === 'urgent' ? 'bg-red-500/10 text-red-400' : r.urgency === 'high' ? 'bg-amber-500/10 text-amber-400' : 'bg-gray-500/10 text-gray-400'}`}>{r.urgency}</span>
                {r.specification && <span>• {r.specification}</span>}
              </div>
            </div>
          ))}
          {!requests.filter(r => r.equipment_type?.toLowerCase().includes(search.toLowerCase()) || r.profiles?.full_name?.toLowerCase().includes(search.toLowerCase())).length && <p className="text-center text-gray-500 py-8 text-sm">Belum ada request.</p>}
        </div>
      )}
    </div>
  );
};

export default ITManagement;
