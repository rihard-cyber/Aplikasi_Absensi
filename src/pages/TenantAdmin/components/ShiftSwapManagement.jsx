/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, CheckCircle2, XCircle, Filter, Clock, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { logAudit } from '../../../utils/auditLogger';
import { sendNotification, NOTIF_TYPES } from '../../../utils/notificationEngine';

const ShiftSwapManagement = () => {
  const [swaps, setSwaps] = useState([]);
  const [tenantId, setTenantId] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [processing, setProcessing] = useState(null);
  const toast = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: p } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!p?.tenant_id && !isGod) return;
    if (p?.tenant_id) setTenantId(p.tenant_id);

    let q = supabase.from('shift_swaps')
      .select('*, profiles!from_employee(full_name, nip), profiles!to_employee(full_name, nip)');
    if (p?.tenant_id) q = q.eq('tenant_id', p.tenant_id);
    q = q.order('created_at', { ascending: false });
    const { data: s } = await q;
    if (s) setSwaps(s);
  };

  const handleAction = async (swap, newStatus) => {
    setProcessing(swap.id);
    try {
      if (newStatus === 'approved') {
        const fromSched = await supabase.from('user_schedules')
          .select('*')
          .eq('profile_id', swap.from_employee)
          .eq('tenant_id', tenantId)
          .eq('schedule_date', swap.swap_date)
          .maybeSingle();

        const toSched = await supabase.from('user_schedules')
          .select('*')
          .eq('profile_id', swap.to_employee)
          .eq('tenant_id', tenantId)
          .eq('schedule_date', swap.swap_date)
          .maybeSingle();

        if (fromSched.data && toSched.data) {
          const fromShift = fromSched.data.shift_id;
          const toShift = toSched.data.shift_id;

          await supabase.from('user_schedules').update({ shift_id: toShift }).eq('id', fromSched.data.id);
          await supabase.from('user_schedules').update({ shift_id: fromShift }).eq('id', toSched.data.id);
        } else if (fromSched.data && !toSched.data) {
          await supabase.from('user_schedules').update({ profile_id: swap.to_employee }).eq('id', fromSched.data.id);
        } else if (!fromSched.data && toSched.data) {
          await supabase.from('user_schedules').update({ profile_id: swap.from_employee }).eq('id', toSched.data.id);
        }
      }

      await supabase.from('shift_swaps').update({ status: newStatus }).eq('id', swap.id);
      toast(`Swap ${newStatus === 'approved' ? 'disetujui' : 'ditolak'}`, newStatus === 'approved' ? 'success' : 'error');
      logAudit(newStatus === 'approved' ? 'APPROVE_SHIFT_SWAP' : 'REJECT_SHIFT_SWAP', { swap_id: swap.id });
      if (newStatus === 'approved') sendNotification({ userId: swap.from_employee, type: NOTIF_TYPES.SHIFT_SWAP_APPROVED, title: 'Tukar Shift Disetujui', body: 'Permintaan tukar shift tanggal ' + (swap.swap_date || '') + ' disetujui', link: '/shift-swap' });
      if (newStatus === 'rejected') sendNotification({ userId: swap.from_employee, type: NOTIF_TYPES.SHIFT_SWAP_REJECTED, title: 'Tukar Shift Ditolak', body: 'Permintaan tukar shift tanggal ' + (swap.swap_date || '') + ' ditolak', link: '/shift-swap' });
      fetchData();
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
    finally { setProcessing(null); }
  };

  const filtered = swaps.filter(s => filter === 'ALL' || s.status === filter).filter(s =>
    s.profiles_from_employee?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.profiles_to_employee?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.swap_date?.includes(search)
  );

  const statusStyles = { pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30', approved: 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30', rejected: 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/30' };

  return (
    <div className="glass-panel p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-6 mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">Shift Swap Management</h2>
          <p className="text-sm text-gray-400 mt-1">{swaps.filter(s => s.status === 'pending').length} pending • {swaps.length} total permintaan</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari karyawan..." className="w-full bg-[#1A1C23] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-3)]" />
        </div>
        {['pending', 'approved', 'rejected', 'ALL'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${filter === s ? 'bg-white/10 border-[var(--aurora-3)]/30 text-white' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}>{s === 'ALL' ? 'Semua' : s}</button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(swap => (
          <div key={swap.id} className="p-5 bg-white/5 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400">
                  <RefreshCw size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{swap.profiles_from_employee?.full_name}</span>
                    <span className="text-[9px] text-gray-500">→</span>
                    <span className="text-sm font-bold text-[var(--aurora-3)]">{swap.profiles_to_employee?.full_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-gray-500 mt-0.5">
                    <span className="flex items-center gap-1"><Clock size={10} /> {swap.swap_date}</span>
                    <span>•</span>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest border ${statusStyles[swap.status]}`}>{swap.status}</span>
                  </div>
                  {swap.reason && <p className="text-[10px] text-gray-400 italic mt-1">"{swap.reason}"</p>}
                </div>
              </div>
              <div className="flex gap-2">
                {swap.status === 'pending' && (
                  <>
                    <button onClick={() => handleAction(swap, 'approved')} disabled={processing === swap.id}
                      className="px-4 py-2 rounded-xl bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/30 text-[10px] font-bold flex items-center gap-1 hover:bg-[var(--success)]/20 disabled:opacity-50">
                      {processing === swap.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Setujui
                    </button>
                    <button onClick={() => handleAction(swap, 'rejected')} disabled={processing === swap.id}
                      className="px-4 py-2 rounded-xl bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/30 text-[10px] font-bold flex items-center gap-1 hover:bg-[var(--danger)]/20 disabled:opacity-50">
                      <XCircle size={12} /> Tolak
                    </button>
                  </>
                )}
                {swap.status === 'approved' && (
                  <span className="text-[10px] text-[var(--success)] flex items-center gap-1"><CheckCircle2 size={12} /> Disetujui</span>
                )}
                {swap.status === 'rejected' && (
                  <span className="text-[10px] text-[var(--danger)] flex items-center gap-1"><XCircle size={12} /> Ditolak</span>
                )}
              </div>
            </div>
          </div>
        ))}
        {!filtered.length && <p className="text-center text-gray-500 py-8 text-sm">Tidak ada data swap</p>}
      </div>
    </div>
  );
};

export default ShiftSwapManagement;
