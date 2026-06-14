import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Save, Package, Wrench, CheckCircle2, XCircle, Clock, User, Loader2, Edit3, Minus, Plus as PlusIcon } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';

const TABS = [
  { key: 'requests', label: 'Requests', icon: <Package size={14} /> },
  { key: 'reports', label: 'Laporan', icon: <Wrench size={14} /> },
  { key: 'supplies', label: 'Stok', icon: <Package size={14} /> },
];

const OfficeGAManagement = () => {
  const [tab, setTab] = useState('requests');
  const [requests, setRequests] = useState([]);
  const [reports, setReports] = useState([]);
  const [supplies, setSupplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: p } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
      if (!p?.tenant_id) return;
      setTenantId(p.tenant_id);

      const [reqRes, repRes, supRes] = await Promise.all([
        supabase.from('ga_supply_requests').select('*, profiles!requester_id(full_name, nip)').eq('tenant_id', p.tenant_id).order('created_at', { ascending: false }).limit(50),
        supabase.from('ga_maintenance_reports').select('*, profiles!reporter_id(full_name, nip), profiles!assigned_to(full_name)').eq('tenant_id', p.tenant_id).order('created_at', { ascending: false }).limit(50),
        supabase.from('ga_supplies').select('*').eq('tenant_id', p.tenant_id).order('name'),
      ]);
      setRequests(reqRes.data || []);
      setReports(repRes.data || []);
      setSupplies(supRes.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleRequestAction = async (id, status) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { data: admin } = await supabase.from('profiles').select('id').eq('auth_id', session.user.id).maybeSingle();
    const payload = { status };
    if (status === 'fulfilled') payload.fulfilled_at = new Date().toISOString();
    if (['approved', 'rejected', 'fulfilled'].includes(status)) payload.approved_by = admin?.id || null;
    await supabase.from('ga_supply_requests').update(payload).eq('id', id);
    fetchData();
  };

  const handleReportAction = async (id, status) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { data: admin } = await supabase.from('profiles').select('id').eq('auth_id', session.user.id).maybeSingle();
    const payload = { status };
    if (status === 'resolved') payload.resolved_at = new Date().toISOString();
    if (['in_progress', 'resolved'].includes(status)) payload.assigned_to = admin?.id || null;
    await supabase.from('ga_maintenance_reports').update(payload).eq('id', id);
    fetchData();
  };

  const handleSupplySave = async (item) => {
    if (!item.name) return;
    await supabase.from('ga_supplies').upsert({
      ...item, tenant_id: tenantId,
      stock: parseInt(item.stock) || 0,
      min_stock: parseInt(item.min_stock) || 5,
    }).eq('id', item.id || undefined);
    fetchData();
  };

  const stats = useMemo(() => ({
    pending: requests.filter(r => r.status === 'pending').length,
    openReports: reports.filter(r => r.status !== 'resolved' && r.status !== 'closed').length,
    lowStock: supplies.filter(s => s.stock <= s.min_stock).length,
  }), [requests, reports, supplies]);

  if (loading) return <div className="p-20 text-center"><div className="w-8 h-8 border-2 border-[var(--aurora-3)] border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-serif font-bold text-white">Office / GA Management</h2>
        <p className="text-sm text-gray-400 mt-1">Kelola permintaan barang, laporan kerusakan, dan stok logistik</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
          <p className="text-[10px] text-gray-400">Pending Request</p>
        </div>
        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
          <p className="text-2xl font-bold text-blue-400">{stats.openReports}</p>
          <p className="text-[10px] text-gray-400">Laporan Aktif</p>
        </div>
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
          <p className="text-2xl font-bold text-red-400">{stats.lowStock}</p>
          <p className="text-[10px] text-gray-400">Stok Menipis</p>
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

      {tab === 'requests' && (
        <div className="space-y-2">
          {requests.filter(r => r.item_name?.toLowerCase().includes(search.toLowerCase()) || r.profiles?.full_name?.toLowerCase().includes(search.toLowerCase())).map(r => (
            <div key={r.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">{r.item_name} x{r.quantity} {r.unit}</p>
                  <p className="text-[9px] text-gray-500">{r.profiles?.full_name} • {r.profiles?.nip} • {new Date(r.created_at).toLocaleDateString('id-ID')}</p>
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
                <span className="capitalize">{r.category}</span>
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${r.urgency === 'urgent' ? 'bg-red-500/10 text-red-400' : r.urgency === 'high' ? 'bg-amber-500/10 text-amber-400' : 'bg-gray-500/10 text-gray-400'}`}>{r.urgency}</span>
                {r.reason && <span>• "{r.reason}"</span>}
              </div>
            </div>
          ))}
          {!requests.filter(r => r.item_name?.toLowerCase().includes(search.toLowerCase()) || r.profiles?.full_name?.toLowerCase().includes(search.toLowerCase())).length && <p className="text-center text-gray-500 py-8 text-sm">Belum ada request.</p>}
        </div>
      )}

      {tab === 'reports' && (
        <div className="space-y-2">
          {reports.filter(r => r.description?.toLowerCase().includes(search.toLowerCase()) || r.location?.toLowerCase().includes(search.toLowerCase())).map(r => (
            <div key={r.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{r.description}</p>
                  <p className="text-[9px] text-gray-500">{r.profiles?.full_name} {r.location ? `• ${r.location}` : ''}</p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  {r.status === 'pending' ? (
                    <button onClick={() => handleReportAction(r.id, 'in_progress')} className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-[9px] font-bold">Ambil</button>
                  ) : r.status === 'in_progress' ? (
                    <button onClick={() => handleReportAction(r.id, 'resolved')} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400"><CheckCircle2 size={14} /></button>
                  ) : (
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${r.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>{r.status}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1 text-[9px] text-gray-500">
                <span className="capitalize">{r.category}</span>
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${r.priority === 'urgent' ? 'bg-red-500/10 text-red-400' : r.priority === 'high' ? 'bg-amber-500/10 text-amber-400' : 'bg-gray-500/10 text-gray-400'}`}>{r.priority}</span>
                <span>• {new Date(r.created_at).toLocaleDateString('id-ID')}</span>
              </div>
            </div>
          ))}
          {!reports.filter(r => r.description?.toLowerCase().includes(search.toLowerCase()) || r.location?.toLowerCase().includes(search.toLowerCase())).length && <p className="text-center text-gray-500 py-8 text-sm">Belum ada laporan.</p>}
        </div>
      )}

      {tab === 'supplies' && (
        <div className="space-y-2">
          <button onClick={async () => {
            const name = prompt('Nama barang baru:');
            if (name) { await handleSupplySave({ name, tenant_id: tenantId, stock: 0, min_stock: 5, unit: 'pcs', category: 'atk' }); }
          }} className="mb-3 px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px] font-bold flex items-center gap-2"><Plus size={14} /> Tambah Barang</button>
          {supplies.filter(s => s.name?.toLowerCase().includes(search.toLowerCase())).map(s => (
            <div key={s.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">{s.name}</p>
                  <p className="text-[9px] text-gray-500 capitalize">{s.category} • {s.unit}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`text-xs font-bold font-mono ${s.stock <= s.min_stock ? 'text-red-400' : 'text-emerald-400'}`}>{s.stock}</div>
                  <div className="flex gap-1">
                    <button onClick={async () => { await handleSupplySave({ ...s, stock: Math.max(0, (s.stock || 0) - 1) }); }} className="p-1 rounded bg-white/5 text-gray-400 hover:text-white"><Minus size={12} /></button>
                    <button onClick={async () => { await handleSupplySave({ ...s, stock: (s.stock || 0) + 1 }); }} className="p-1 rounded bg-white/5 text-gray-400 hover:text-white"><PlusIcon size={12} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!supplies.filter(s => s.name?.toLowerCase().includes(search.toLowerCase())).length && <p className="text-center text-gray-500 py-8 text-sm">Belum ada stok barang.</p>}
        </div>
      )}
    </div>
  );
};

export default OfficeGAManagement;
