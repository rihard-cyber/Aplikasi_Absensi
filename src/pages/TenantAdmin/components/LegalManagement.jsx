import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Scale, Plus, Save, CheckCircle2, XCircle, FileText, Calendar, Loader2, AlertTriangle, Clock, Gavel } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';

const TABS = [
  { key: 'contracts', label: 'Kontrak', icon: <FileText size={14} /> },
  { key: 'cases', label: 'Kasus Hukum', icon: <Gavel size={14} /> },
];

const LegalManagement = () => {
  const [tab, setTab] = useState('contracts');
  const [contracts, setContracts] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const emptyContract = { title: '', contract_type: 'employment', party_name: '', start_date: '', end_date: '', value: '', status: 'active', notes: '' };
  const emptyCase = { title: '', case_type: 'litigation', case_number: '', party_opposing: '', description: '', status: 'open', priority: 'normal', next_hearing: '', notes: '' };
  const [form, setForm] = useState(emptyContract);

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
        const [cRes, casRes] = await Promise.all([
          supabase.from('legal_contracts').select('*').eq('tenant_id', p.tenant_id).order('created_at', { ascending: false }).limit(50),
          supabase.from('legal_cases').select('*, profiles!assigned_to(full_name)').eq('tenant_id', p.tenant_id).order('created_at', { ascending: false }).limit(50),
        ]);
        setContracts(cRes.data || []);
        setCases(casRes.data || []);
      }
    } catch (e) { 
      console.error(e); 
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const isCase = tab === 'cases';
    if (!form.title) return;
    const payload = { ...form, tenant_id: tenantId };
    if (!isCase) payload.value = form.value ? parseFloat(form.value) : null;

    if (editingId) {
      await supabase.from(isCase ? 'legal_cases' : 'legal_contracts').update(payload).eq('id', editingId);
    } else {
      await supabase.from(isCase ? 'legal_cases' : 'legal_contracts').insert(payload);
    }
    setShowForm(false); setEditingId(null);
    fetchData();
  };

  const openNew = () => {
    setEditingId(null);
    setForm(tab === 'cases' ? emptyCase : emptyContract);
    setShowForm(true);
  };
  const openEdit = (item) => {
    setEditingId(item.id);
    setForm(item);
    setShowForm(true);
  };

  const stats = useMemo(() => ({
    activeContracts: contracts.filter(c => c.status === 'active' || c.status === 'draft').length,
    expiringContracts: contracts.filter(c => c.end_date && new Date(c.end_date) > new Date() && new Date(c.end_date) < new Date(Date.now() + 30*86400000)).length,
    openCases: cases.filter(c => c.status !== 'resolved' && c.status !== 'closed').length,
  }), [contracts, cases]);

  if (loading) return <div className="p-20 text-center"><div className="w-8 h-8 border-2 border-[var(--aurora-3)] border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-serif font-bold text-white">Legal Management</h2>
        <p className="text-sm text-gray-400 mt-1">Kontrak, kasus hukum, dan compliance</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-2xl font-bold text-emerald-400">{stats.activeContracts}</p>
          <p className="text-[10px] text-gray-400">Kontrak Aktif</p>
        </div>
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-2xl font-bold text-amber-400">{stats.expiringContracts}</p>
          <p className="text-[10px] text-gray-400">Akan Expire</p>
        </div>
        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
          <p className="text-2xl font-bold text-blue-400">{stats.openCases}</p>
          <p className="text-[10px] text-gray-400">Kasus Aktif</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setSearch(''); setShowForm(false); }}
            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border flex items-center gap-2 ${tab === t.key ? 'bg-white/10 border-[var(--aurora-3)]/30 text-white' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari..." className="w-full bg-white/5 border border-white/20 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white outline-none placeholder:text-gray-400" />
      </div>

      <button onClick={openNew} className="px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px] font-bold flex items-center gap-2 w-fit"><Plus size={14} /> {tab === 'cases' ? 'Kasus Baru' : 'Kontrak Baru'}</button>

      {showForm && (
        <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
          <h4 className="text-sm font-bold text-white">{editingId ? 'Edit' : 'Baru'} {tab === 'cases' ? 'Kasus' : 'Kontrak'}</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Judul" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none" />
            {tab === 'cases' ? (
              <>
                <select value={form.case_type} onChange={e => setForm({ ...form, case_type: e.target.value })} className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none">
                  <option value="litigation">Litigasi</option><option value="arbitration">Arbitrase</option><option value="mediation">Mediasi</option>
                  <option value="labor">Ketenagakerjaan</option><option value="contract_dispute">Sengketa Kontrak</option><option value="regulatory">Regulasi</option><option value="other">Lainnya</option>
                </select>
                <input value={form.case_number} onChange={e => setForm({ ...form, case_number: e.target.value })} placeholder="No. Perkara" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none" />
                <input value={form.party_opposing} onChange={e => setForm({ ...form, party_opposing: e.target.value })} placeholder="Lawan" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none" />
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none min-h-[60px]" />
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none">
                  <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
                </select>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none">
                  <option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
                </select>
                <input value={form.next_hearing} onChange={e => setForm({ ...form, next_hearing: e.target.value })} type="date" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none" />
              </>
            ) : (
              <>
                <select value={form.contract_type} onChange={e => setForm({ ...form, contract_type: e.target.value })} className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none">
                  <option value="employment">Karyawan</option><option value="vendor">Vendor</option><option value="client">Client</option>
                  <option value="nda">NDA</option><option value="lease">Sewa</option><option value="service">Service</option><option value="partnership">Partnership</option><option value="other">Lainnya</option>
                </select>
                <input value={form.party_name} onChange={e => setForm({ ...form, party_name: e.target.value })} placeholder="Nama Pihak" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} type="date" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none" />
                  <input value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} type="date" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none" />
                </div>
                <input value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} type="number" placeholder="Nilai Kontrak" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none" />
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none">
                  <option value="draft">Draft</option><option value="active">Active</option><option value="expiring">Expiring</option><option value="expired">Expired</option><option value="terminated">Terminated</option>
                </select>
              </>
            )}
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notes" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none min-h-[60px]" />
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} className="px-5 py-2.5 rounded-xl bg-blue-500/20 text-blue-400 text-xs font-bold"><Save size={14} className="inline" /> Simpan</button>
            <button onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl bg-white/5 text-gray-400 border border-white/10 text-xs font-bold">Batal</button>
          </div>
        </div>
      )}

      {tab === 'contracts' ? (
        <div className="space-y-2">
          {contracts.filter(c => c.title?.toLowerCase().includes(search.toLowerCase()) || c.party_name?.toLowerCase().includes(search.toLowerCase())).map(c => (
            <div key={c.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center"><FileText size={14} className="text-gray-400" /></div>
                  <div>
                    <p className="text-xs font-bold text-white">{c.title}</p>
                    <p className="text-[9px] text-gray-500 capitalize">{c.contract_type} {c.party_name ? `• ${c.party_name}` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.end_date && new Date(c.end_date) < new Date(Date.now() + 30*86400000) && new Date(c.end_date) > new Date() && <AlertTriangle size={12} className="text-amber-400" />}
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${c.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : c.status === 'draft' ? 'bg-gray-500/10 text-gray-400' : c.status === 'expiring' ? 'bg-amber-500/10 text-amber-400' : c.status === 'expired' ? 'bg-red-500/10 text-red-400' : 'bg-gray-500/10 text-gray-400'}`}>{c.status}</span>
                  <button onClick={() => openEdit(c)} className="p-1 hover:bg-white/10 rounded-lg text-gray-400"><Edit3 size={12} /></button>
                </div>
              </div>
              <div className="flex gap-3 mt-1 text-[9px] text-gray-500">
                {c.start_date && <span><Calendar size={10} className="inline" /> {c.start_date} → {c.end_date || '-'}</span>}
                {c.value > 0 && <span>• Rp{Number(c.value).toLocaleString()}</span>}
              </div>
            </div>
          ))}
          {!contracts.filter(c => c.title?.toLowerCase().includes(search.toLowerCase()) || c.party_name?.toLowerCase().includes(search.toLowerCase())).length && <p className="text-center text-gray-500 py-8 text-sm">Belum ada kontrak.</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {cases.filter(c => c.title?.toLowerCase().includes(search.toLowerCase()) || c.case_number?.toLowerCase().includes(search.toLowerCase())).map(c => (
            <div key={c.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center"><Scale size={14} className="text-gray-400" /></div>
                  <div>
                    <p className="text-xs font-bold text-white">{c.title}</p>
                    <p className="text-[9px] text-gray-500 capitalize">{c.case_type} {c.case_number ? `• ${c.case_number}` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${c.priority === 'urgent' ? 'bg-red-500/10 text-red-400' : c.priority === 'high' ? 'bg-amber-500/10 text-amber-400' : 'bg-gray-500/10 text-gray-400'}`}>{c.priority}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${c.status === 'open' ? 'bg-amber-500/10 text-amber-400' : c.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400' : c.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>{c.status}</span>
                  <button onClick={() => openEdit(c)} className="p-1 hover:bg-white/10 rounded-lg text-gray-400"><Edit3 size={12} /></button>
                </div>
              </div>
              <div className="flex gap-3 mt-1 text-[9px] text-gray-500">
                {c.party_opposing && <span>Lawan: {c.party_opposing}</span>}
                {c.next_hearing && <span>• Sidang: {c.next_hearing}</span>}
              </div>
            </div>
          ))}
          {!cases.filter(c => c.title?.toLowerCase().includes(search.toLowerCase()) || c.case_number?.toLowerCase().includes(search.toLowerCase())).length && <p className="text-center text-gray-500 py-8 text-sm">Belum ada kasus.</p>}
        </div>
      )}
    </div>
  );
};

export default LegalManagement;
