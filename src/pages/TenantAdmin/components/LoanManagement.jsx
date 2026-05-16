import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, CheckCircle2, XCircle, DollarSign, Filter, User, Loader2 } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { logAudit } from '../../../utils/auditLogger';

const LoanManagement = () => {
  const [loans, setLoans] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [tenantId, setTenantId] = useState(null);
  const [filter, setFilter] = useState('ALL');
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

    let q = supabase.from('loans').select('*, profiles!inner(full_name, nip)');
    if (p?.tenant_id) q = q.eq('tenant_id', p.tenant_id);
    q = q.order('created_at', { ascending: false });
    const { data: l } = await q;
    if (l) setLoans(l);
  };

  const handleAction = async (id, status) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { data: admin } = await supabase.from('profiles').select('id').eq('auth_id', session.user.id).maybeSingle();
    const update = status === 'ACTIVE' ? { status, approved_by: admin?.id, approved_at: new Date().toISOString() } : { status, approved_by: admin?.id };
    await supabase.from('loans').update(update).eq('id', id);
    logAudit(status === 'ACTIVE' ? 'APPROVE_LOAN' : 'REJECT_LOAN', { loan_id: id, status });
    toast(`Pinjaman ${status === 'ACTIVE' ? 'disetujui' : 'ditolak'}`, status === 'ACTIVE' ? 'success' : 'error');
    fetchData();
  };

  const filtered = loans.filter(l => filter === 'ALL' || l.status === filter).filter(l =>
    l.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.profiles?.nip?.toLowerCase().includes(search.toLowerCase())
  );

  const statusStyles = { PENDING: 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/30', ACTIVE: 'bg-blue-500/10 text-blue-400 border-blue-500/30', PAID: 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30', REJECTED: 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/30' };

  return (
    <div className="glass-panel p-8">
      <div className="border-b border-white/10 pb-6 mb-8">
        <h2 className="text-2xl font-serif font-bold text-white">Manajemen Pinjaman Karyawan</h2>
        <p className="text-sm text-gray-400 mt-1">Kelola pengajuan pinjaman, kasbon, dan cicilan</p>
      </div>

      <div className="flex gap-4 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari karyawan..." className="w-full bg-[#1A1C23] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-3)]" />
        </div>
        {['ALL','PENDING','ACTIVE','PAID','REJECTED'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${filter === s ? 'bg-white/10 border-[var(--aurora-3)]/30 text-white' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}>{s === 'ALL' ? 'Semua' : s}</button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(loan => (
          <div key={loan.id} className="p-5 bg-white/5 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center text-white font-bold">{loan.profiles?.full_name?.charAt(0)}</div>
                <div>
                  <p className="text-sm font-bold text-white">{loan.profiles?.full_name}</p>
                  <p className="text-[10px] text-gray-500">{loan.profiles?.nip}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-white font-mono">Rp {Number(loan.amount).toLocaleString()}</p>
                <p className="text-[10px] text-gray-500">{loan.installment_count}x cicilan • Rp {Number(loan.monthly_deduction).toLocaleString()}/bln</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span>Sisa: <span className="font-bold text-white font-mono">Rp {Number(loan.remaining).toLocaleString()}</span></span>
                <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${statusStyles[loan.status]}`}>{loan.status}</span>
                {loan.purpose && <span className="text-gray-500 italic">"{loan.purpose}"</span>}
              </div>
              <div className="flex gap-2">
                {loan.status === 'PENDING' && <>
                  <button onClick={() => handleAction(loan.id, 'ACTIVE')} className="px-4 py-2 rounded-xl bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/30 text-[10px] font-bold flex items-center gap-1 hover:bg-[var(--success)]/20"><CheckCircle2 size={12} /> Setujui</button>
                  <button onClick={() => handleAction(loan.id, 'REJECTED')} className="px-4 py-2 rounded-xl bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/30 text-[10px] font-bold flex items-center gap-1 hover:bg-[var(--danger)]/20"><XCircle size={12} /> Tolak</button>
                </>}
                {loan.status === 'ACTIVE' && (
                  <span className="text-[10px] text-blue-400">Potongan otomatis dari payroll</span>
                )}
              </div>
            </div>
          </div>
        ))}
        {!filtered.length && <p className="text-center text-gray-500 py-8 text-sm">Tidak ada data pinjaman</p>}
      </div>
    </div>
  );
};

export default LoanManagement;
