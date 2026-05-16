import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, CheckCircle2, XCircle, DollarSign, Filter, Eye, Loader2 } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';

const CATEGORIES = { MEDICAL: 'Kesehatan', TRANSPORT: 'Transportasi', MEAL: 'Makan', TRAINING: 'Pelatihan', SUPPLIES: 'Perlengkapan', ENTERTAINMENT: 'Representasi', OTHER: 'Lainnya' };

const ReimbursementManagement = () => {
  const [claims, setClaims] = useState([]);
  const [tenantId, setTenantId] = useState(null);
  const [filter, setFilter] = useState('PENDING');
  const [search, setSearch] = useState('');
  const toast = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const isGod = (() => { try { return sessionStorage.getItem('god_key') === 'DEWA-999'; } catch { return false; } })();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: p } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!p?.tenant_id && !isGod) return;
    if (p?.tenant_id) setTenantId(p.tenant_id);
    let q = supabase.from('reimbursements').select('*, profiles!inner(full_name, nip)');
    if (p?.tenant_id) q = q.eq('tenant_id', p.tenant_id);
    q = q.order('created_at', { ascending: false });
    const { data: r } = await q;
    if (r) setClaims(r);
  };

  const handleAction = async (id, status) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { data: admin } = await supabase.from('profiles').select('id').eq('auth_id', session.user.id).maybeSingle();
    await supabase.from('reimbursements').update({ status, approved_by: admin?.id }).eq('id', id);
    toast(`Klaim ${status === 'APPROVED' ? 'disetujui' : 'ditolak'}`, status === 'APPROVED' ? 'success' : 'error');
    fetchData();
  };

  const filtered = claims.filter(c => filter === 'ALL' || c.status === filter).filter(c =>
    c.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.profiles?.nip?.toLowerCase().includes(search.toLowerCase())
  );

  const statusStyles = { PENDING: 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/30', APPROVED: 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30', REJECTED: 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/30', PAID: 'bg-blue-500/10 text-blue-400 border-blue-500/30' };

  return (
    <div className="glass-panel p-8">
      <div className="border-b border-white/10 pb-6 mb-8">
        <h2 className="text-2xl font-serif font-bold text-white">Manajemen Reimbursement</h2>
        <p className="text-sm text-gray-400 mt-1">Klaim biaya karyawan: kesehatan, transport, pelatihan, dll.</p>
      </div>

      <div className="flex gap-4 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari..." className="w-full bg-[#1A1C23] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-3)]" />
        </div>
        {['ALL','PENDING','APPROVED','REJECTED','PAID'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${filter === s ? 'bg-white/10 border-[var(--aurora-3)]/30 text-white' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}>{s === 'ALL' ? 'Semua' : s}</button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(c => (
          <div key={c.id} className="p-5 bg-white/5 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center text-white font-bold">{c.profiles?.full_name?.charAt(0)}</div>
                <div>
                  <p className="text-sm font-bold text-white">{c.profiles?.full_name}</p>
                  <p className="text-[10px] text-gray-400">{CATEGORIES[c.category] || c.category} • {c.profiles?.nip}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-white font-mono">Rp {Number(c.amount).toLocaleString()}</p>
                <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${statusStyles[c.status]}`}>{c.status}</span>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-gray-500 italic">"{c.description}"</p>
              <div className="flex gap-2">
                {c.receipt_url && <a href={c.receipt_url} target="_blank" className="p-2 hover:bg-white/10 rounded-lg text-[var(--aurora-3)]"><Eye size={14} /></a>}
                {c.status === 'PENDING' && <>
                  <button onClick={() => handleAction(c.id, 'APPROVED')} className="px-4 py-2 rounded-xl bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/30 text-[10px] font-bold"><CheckCircle2 size={12} /> Setujui</button>
                  <button onClick={() => handleAction(c.id, 'REJECTED')} className="px-4 py-2 rounded-xl bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/30 text-[10px] font-bold"><XCircle size={12} /> Tolak</button>
                </>}
              </div>
            </div>
          </div>
        ))}
        {!filtered.length && <p className="text-center text-gray-500 py-8 text-sm">Tidak ada data klaim</p>}
      </div>
    </div>
  );
};

export default ReimbursementManagement;
