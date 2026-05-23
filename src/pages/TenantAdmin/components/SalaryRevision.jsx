/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, CheckCircle2, XCircle, Plus, Save, User, Loader2, DollarSign, Calendar, X } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';

const SalaryRevision = () => {
  const [revisions, setRevisions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [tenantId, setTenantId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ user_id: '', new_amount: '', reason: '', effective_date: '' });
  const [prevAmount, setPrevAmount] = useState(0);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: p } = await supabase.from('profiles').select('id, tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!p?.tenant_id && !isGod) return;
    if (p?.tenant_id) setTenantId(p.tenant_id);

    let q1 = supabase.from('profiles').select('id, full_name, nip, position');
    if (p?.tenant_id) q1 = q1.eq('tenant_id', p.tenant_id);
    q1 = q1.in('role', ['EMPLOYEE', 'SUB_ADMIN']);
    const { data: e } = await q1;
    if (e) setEmployees(e);

    let q2 = supabase.from('salary_revisions').select('*, profiles!user_id(full_name, nip), approver!approved_by(full_name)');
    if (p?.tenant_id) q2 = q2.eq('tenant_id', p.tenant_id);
    q2 = q2.order('created_at', { ascending: false });
    const { data: r } = await q2;
    if (r) setRevisions(r);
  };

  const selectEmployee = async (userId) => {
    setForm({ ...form, user_id: userId });
    const { data: sals } = await supabase.from('employee_salaries').select('amount, salary_components!inner(code)').eq('user_id', userId).eq('salary_components.code', 'GP').maybeSingle();
    setPrevAmount(sals?.amount || 0);
  };

  const handleSubmit = async () => {
    if (!form.user_id || !form.new_amount || !form.reason) { toast('Lengkapi semua field', 'error'); return; }
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { data: admin } = await supabase.from('profiles').select('id').eq('auth_id', session.user.id).maybeSingle();
    const changeAmount = Number(form.new_amount) - prevAmount;
    const changePercent = prevAmount > 0 ? Math.round((changeAmount / prevAmount) * 100 * 100) / 100 : 0;
    try {
      await supabase.from('salary_revisions').insert({
        tenant_id: tenantId, user_id: form.user_id,
        previous_amount: prevAmount, new_amount: Number(form.new_amount),
        change_amount: changeAmount, change_percent: changePercent,
        reason: form.reason, approved_by: admin?.id,
        effective_date: form.effective_date || new Date().toISOString().split('T')[0],
        status: 'APPROVED'
      });
      await supabase.from('employee_salaries').upsert({
        tenant_id: tenantId, user_id: form.user_id,
        component_id: (await supabase.from('salary_components').select('id').eq('tenant_id', tenantId).eq('code', 'GP').single()).data?.id,
        amount: Number(form.new_amount), effective_date: new Date().toISOString().split('T')[0]
      }, { onConflict: 'user_id,component_id,effective_date' });
      toast('Perubahan gaji berhasil!', 'success');
      setShowForm(false);
      setForm({ user_id: '', new_amount: '', reason: '', effective_date: '' });
      fetchData();
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
    finally { setSaving(false); }
  };

  const filtered = revisions.filter(r => filterStatus === 'ALL' || r.status === filterStatus).filter(r =>
    r.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.profiles?.nip?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="glass-panel p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-6 mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">Riwayat Perubahan Gaji</h2>
          <p className="text-sm text-gray-400 mt-1">Track kenaikan gaji, promosi, dan penyesuaian</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-bold flex items-center gap-2 whitespace-nowrap"><Plus size={16} /> Perubahan Baru</button>
      </div>

      <div className="flex gap-4 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari karyawan..." className="w-full bg-[#1A1C23] border border-white/10 rounded-xl pl-9 pr-3 py-3 text-white text-xs outline-none focus:border-[var(--aurora-3)]" />
        </div>
        {['ALL','APPROVED','PENDING','REJECTED'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${filterStatus === s ? 'bg-white/10 border-[var(--aurora-3)]/30 text-white' : 'bg-white/5 border-white/10 text-gray-500'}`}>{s}</button>
        ))}
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Karyawan</label>
              <select value={form.user_id} onChange={e => selectEmployee(e.target.value)} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white outline-none">
                <option value="">Pilih karyawan</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.full_name} — {e.nip}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Tanggal Efektif</label>
              <input type="date" value={form.effective_date} onChange={e => setForm({...form, effective_date: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Gaji Saat Ini</label>
              <div className="bg-white/5 rounded-xl px-4 py-3 text-white font-mono font-bold border border-white/10">Rp {prevAmount.toLocaleString()}</div>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Gaji Baru</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rp</span>
                <input type="number" value={form.new_amount} onChange={e => setForm({...form, new_amount: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-3)]" />
              </div>
              {form.new_amount && prevAmount > 0 && (
                <p className={`text-[10px] mt-1 font-bold ${Number(form.new_amount) > prevAmount ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                  {Number(form.new_amount) > prevAmount ? '↑' : '↓'} {Math.abs(Number(form.new_amount) - prevAmount).toLocaleString()} ({Math.abs(Math.round((Number(form.new_amount) - prevAmount) / prevAmount * 100))}%)
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Alasan Perubahan</label>
              <input value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="Promosi jabatan, kenaikan tahunan, penyesuaian UMR..." />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSubmit} disabled={saving} className="px-6 py-3 rounded-xl bg-[var(--success)] text-black text-xs font-bold flex items-center gap-2 disabled:opacity-50"><Save size={14} /> Simpan Perubahan</button>
            <button onClick={() => setShowForm(false)} className="px-6 py-3 rounded-xl bg-white/5 text-gray-400 border border-white/10 text-xs font-bold"><X size={14} /> Batal</button>
          </div>
        </motion.div>
      )}

      <div className="space-y-3">
        {filtered.map(r => {
          const isUp = r.change_amount > 0;
          return (
            <div key={r.id} className="p-5 bg-white/5 rounded-2xl border border-white/10 hover:border-white/20 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center text-white font-bold">{r.profiles?.full_name?.charAt(0)}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">{r.profiles?.full_name}</p>
                      <span className="text-[9px] text-gray-500">{r.profiles?.nip}</span>
                    </div>
                    <p className="text-[10px] text-gray-400">{r.reason} • {r.effective_date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400 font-mono line-through">Rp {Number(r.previous_amount).toLocaleString()}</span>
                    <span className={`text-xl font-bold font-mono ${isUp ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>Rp {Number(r.new_amount).toLocaleString()}</span>
                  </div>
                  <span className={`text-[10px] font-bold ${isUp ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                    {isUp ? '↑' : '↓'} {Math.abs(Number(r.change_amount)).toLocaleString()} ({Math.abs(Number(r.change_percent))}%)
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-end mt-3 pt-3 border-t border-white/5 gap-3">
                <span className={`px-3 py-1 rounded-full text-[9px] font-bold border ${r.status === 'APPROVED' ? 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30' : r.status === 'REJECTED' ? 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/30' : 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/30'}`}>{r.status}</span>
                {r.approver?.full_name && <span className="text-[9px] text-gray-500">oleh {r.approver.full_name}</span>}
              </div>
            </div>
          );
        })}
        {!filtered.length && <p className="text-center text-gray-500 py-8">Belum ada riwayat perubahan gaji</p>}
      </div>
    </div>
  );
};

export default SalaryRevision;
