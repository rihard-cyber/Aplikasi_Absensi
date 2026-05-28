import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Send, DollarSign, ArrowLeft, Loader2, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';

const CATEGORIES = [
  { value: 'MEDICAL', label: 'Kesehatan', desc: 'Biaya berobat, obat, rumah sakit' },
  { value: 'TRANSPORT', label: 'Transportasi', desc: 'Bensin, tol, parkir, tiket' },
  { value: 'MEAL', label: 'Makan', desc: 'Makan lembur, meeting' },
  { value: 'TRAINING', label: 'Pelatihan', desc: 'Biaya kursus, seminar, sertifikasi' },
  { value: 'SUPPLIES', label: 'Perlengkapan', desc: 'ATK, tools, seragam' },
  { value: 'ENTERTAINMENT', label: 'Representasi', desc: 'Client meeting, gathering' },
  { value: 'OTHER', label: 'Lainnya', desc: 'Kategori lainnya' },
];

const ReimbursementRequest = ({ onBack }) => {
  const [form, setForm] = useState({ category: 'MEDICAL', amount: '', description: '' });
  const [file, setFile] = useState(null);
  const [history, setHistory] = useState([]);
  const [profile, setProfile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: p } = await supabase.from('profiles').select('id, tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (p) setProfile(p);
    const { data: r } = await supabase.from('reimbursements').select('*').eq('user_id', p?.id).order('created_at', { ascending: false });
    if (r) setHistory(r);
  };

  const handleSubmit = async () => {
    const amount = Number(form.amount);
    if (!amount || amount < 1000) { toast('Minimal klaim Rp 1.000', 'error'); return; }
    if (!form.description) { toast('Deskripsi wajib diisi', 'error'); return; }
    setSubmitting(true);
    try {
      let receipt_url = null;
      if (file) {
        const ext = file.name.split('.').pop();
        const path = `reimbursements/${profile.id}/${Date.now()}.${ext}`;
        await supabase.storage.from('documents').upload(path, file);
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
        receipt_url = urlData.publicUrl;
      }
      await supabase.from('reimbursements').insert({
        tenant_id: profile.tenant_id, user_id: profile.id,
        category: form.category, amount, description: form.description,
        receipt_url, status: 'PENDING'
      });
      toast('Klaim berhasil diajukan!', 'success');
      setForm({ category: 'MEDICAL', amount: '', description: '' });
      setFile(null);
      fetchData();
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const statusStyles = new Map([
    ['PENDING', 'bg-[var(--warning)]/10 text-[var(--warning)]'],
    ['APPROVED', 'bg-[var(--success)]/10 text-[var(--success)]'],
    ['REJECTED', 'bg-[var(--danger)]/10 text-[var(--danger)]'],
    ['PAID', 'bg-blue-500/10 text-blue-400']
  ]);
  const t = (s) => s;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6 pb-8">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors w-fit"><ArrowLeft size={18} /> Kembali</button>

      <div className="glass-panel p-6">
        <h2 className="text-xl font-serif font-bold text-white mb-2 flex items-center gap-2"><DollarSign className="text-[var(--success)]" /> Klaim Biaya</h2>
        <p className="text-xs text-gray-400 mb-6">{t('Ajukan klaim biaya untuk kesehatan, transportasi, atau kebutuhan lainnya.')}</p>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('Kategori')}</label>
            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white outline-none">
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label} — {c.desc}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('Jumlah Klaim')}</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">Rp</span>
              <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-3)]" placeholder="500000" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('Deskripsi')}</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-3)]" placeholder="Jelaskan detail klaim..." />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('Bukti (opsional)')}</label>
            <label className="flex items-center gap-3 p-4 bg-white/5 border border-dashed border-white/20 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
              <Upload size={20} className="text-gray-400" />
              <span className="text-sm text-gray-400">{file ? file.name : 'Upload file bukti (PDF/gambar)'}</span>
              <input type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files[0])} className="hidden" />
            </label>
          </div>
          <button onClick={handleSubmit} disabled={submitting} className="w-full py-4 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50">
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Ajukan Klaim
          </button>
        </div>
      </div>

      {history.length > 0 && (
        <div className="glass-panel p-6">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">{t('Riwayat Klaim')}</h3>
          <div className="space-y-3">
            {history.map(r => (
              <div key={r.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                <div>
                  <p className="text-sm font-bold text-white">{CATEGORIES.find(c => c.value === r.category)?.label || r.category} — Rp {Number(r.amount).toLocaleString()}</p>
                  <p className="text-[10px] text-gray-500">{r.description}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${statusStyles.get(r.status) || statusStyles.get('PENDING')}`}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ReimbursementRequest;
