import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, DollarSign, CheckCircle2, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';

const LoanRequest = ({ onBack }) => {
  const [form, setForm] = useState({ amount: '', installments: '1', purpose: '' });
  const [loans, setLoans] = useState([]);
  const [profile, setProfile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: p } = await supabase.from('profiles').select('id, tenant_id, full_name').eq('auth_id', session.user.id).maybeSingle();
    if (p) setProfile(p);
    const { data: l } = await supabase.from('loans').select('*').eq('user_id', p?.id).order('created_at', { ascending: false });
    if (l) setLoans(l);
  };

  const handleSubmit = async () => {
    const amount = Number(form.amount);
    if (!amount || amount < 10000) { toast('Minimal pinjaman Rp 10.000', 'error'); return; }
    if (!form.purpose) { toast('Tujuan pinjaman wajib diisi', 'error'); return; }
    setSubmitting(true);
    const installments = Number(form.installments);
    const monthly = Math.round(amount / installments);
    try {
      await supabase.from('loans').insert({
        tenant_id: profile.tenant_id, user_id: profile.id,
        amount, installment_count: installments,
        monthly_deduction: monthly, remaining: amount,
        purpose: form.purpose, status: 'PENDING'
      });
      toast('Pinjaman diajukan! Menunggu persetujuan admin.', 'success');
      setForm({ amount: '', installments: '1', purpose: '' });
      fetchData();
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const activeLoans = loans.filter(l => l.status === 'ACTIVE');
  const totalRemaining = activeLoans.reduce((s, l) => s + Number(l.remaining), 0);
  const t = (s) => s;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6 pb-8">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors w-fit"><ArrowLeft size={18} /> Kembali</button>

      <div className="glass-panel p-6">
        <h2 className="text-xl font-serif font-bold text-white mb-2 flex items-center gap-2"><DollarSign className="text-[var(--aurora-3)]" /> Ajukan Pinjaman</h2>
        <p className="text-xs text-gray-400 mb-6">{t('Pinjaman akan dipotong otomatis dari gaji setiap bulan.')}</p>

        {totalRemaining > 0 && (
          <div className="mb-6 p-4 bg-[var(--warning)]/10 border border-[var(--warning)]/20 rounded-xl">
            <p className="text-xs text-[var(--warning)] font-bold">{t('Pinjaman aktif: Rp ')}{totalRemaining.toLocaleString()} (dipotong dari gaji)</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('Jumlah Pinjaman')}</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">Rp</span>
              <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-3)]" placeholder="1000000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('Cicilan (bulan)')}</label>
              <select value={form.installments} onChange={e => setForm({...form, installments: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white outline-none">
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>{n}x</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('Per Bulan')}</label>
              <div className="h-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white font-mono font-bold text-sm flex items-center">
                {t('\n                Rp ')}{form.amount ? Math.round(Number(form.amount) / Number(form.installments)).toLocaleString() : '0'}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('Tujuan')}</label>
            <input value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-3)]" placeholder="Pembelian laptop, renovasi rumah, dll" />
          </div>
          <button onClick={handleSubmit} disabled={submitting} className="w-full py-4 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Ajukan Pinjaman
          </button>
        </div>
      </div>

      {loans.length > 0 && (
        <div className="glass-panel p-6">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">{t('Riwayat Pinjaman')}</h3>
          <div className="space-y-3">
            {loans.map(l => (
              <div key={l.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                <div>
                  <p className="text-sm font-bold text-white">{t('Rp ')}{Number(l.amount).toLocaleString()}</p>
                  <p className="text-[10px] text-gray-500">{l.installment_count}x cicilan • Sisa: Rp {Number(l.remaining).toLocaleString()}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${
                  l.status === 'PAID' ? 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30' :
                  l.status === 'ACTIVE' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                  l.status === 'REJECTED' ? 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/30' :
                  'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/30'
                }`}>{l.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default LoanRequest;
