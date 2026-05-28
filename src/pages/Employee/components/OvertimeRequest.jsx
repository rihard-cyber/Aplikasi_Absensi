/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Send, ArrowLeft, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';

const OVERTIME_TYPES = [
  { value: 'voluntary', label: 'Sukarela', desc: 'Lembur atas inisiatif sendiri' },
  { value: 'forced', label: 'Lembur Paksa', desc: 'Diminta atasan untuk lembur' },
  { value: 'emergency', label: 'Darurat', desc: 'Kondisi darurat / tidak terduga' },
  { value: 'holiday', label: 'Hari Libur', desc: 'Lembur di hari libur nasional' },
];

const OvertimeRequest = ({ onBack }) => {
  const [myId, setMyId] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    overtime_type: 'voluntary',
    start_time: '17:00',
    end_time: '20:00',
    description: '',
  });
  const toast = useToast();

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: prof } = await supabase.from('profiles').select('id, tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!prof) { setLoading(false); return; }
    setMyId(prof.id);
    setTenantId(prof.tenant_id);
    await fetchRequests(prof.id, prof.tenant_id);
  };

  const fetchRequests = async (uid, tid) => {
    setLoading(true);
    const { data } = await supabase.from('overtime_requests')
      .select('*')
      .eq('profile_id', uid)
      .eq('tenant_id', tid)
      .order('created_at', { ascending: false });
    if (data) setRequests(data);
    setLoading(false);
  };

  const calcHours = (start, end) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    return Math.max(0, (endMin - startMin) / 60);
  };

  const submitRequest = async () => {
    if (!form.date || !form.start_time || !form.end_time) { toast('Lengkapi semua field!', 'error'); return; }
    const hours = calcHours(form.start_time, form.end_time);
    if (hours <= 0) { toast('Jam selesai harus setelah jam mulai!', 'error'); return; }

    setSubmitting(true);
    const { error } = await supabase.from('overtime_requests').insert({
      tenant_id: tenantId,
      profile_id: myId,
      date: form.date,
      overtime_type: form.overtime_type,
      start_time: form.start_time,
      end_time: form.end_time,
      total_hours: Math.round(hours * 100) / 100,
      description: form.description || null,
      status: 'pending',
    });
    setSubmitting(false);
    if (error) { toast('Gagal: ' + error.message, 'error'); return; }
    toast('Permintaan lembur dikirim!', 'success');
    setForm({ date: new Date().toISOString().split('T')[0], overtime_type: 'voluntary', start_time: '17:00', end_time: '20:00', description: '' });
    await fetchRequests(myId, tenantId);
  };

  const getStatusBadge = (status) => {
    const styles = { pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30', approved: 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30', rejected: 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/30', billed: 'bg-blue-500/10 text-blue-400 border-blue-500/30', cancelled: 'bg-gray-500/10 text-gray-400 border-gray-500/30' };
    return <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${styles[status] || styles.pending}`}>{status}</span>;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-serif font-bold text-white">Pengajuan Lembur</h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Ajukan lembur untuk disetujui atasan</p>
        </div>
      </div>

      {/* Form */}
      <div className="glass-panel p-6 rounded-[32px] border border-white/5 mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">Tanggal Lembur</label>
            <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})}
              className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[var(--aurora-3)] transition-colors" />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">Jenis Lembur</label>
            <div className="grid grid-cols-2 gap-2">
              {OVERTIME_TYPES.map(t => (
                <button key={t.value} onClick={() => setForm({...form, overtime_type: t.value})}
                  className={`p-3 rounded-xl border text-left transition-all ${form.overtime_type === t.value ? 'bg-[var(--aurora-3)]/20 border-[var(--aurora-3)] text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}>
                  <p className="text-xs font-bold">{t.label}</p>
                  <p className="text-[9px] text-gray-500 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">Jam Mulai</label>
              <input type="time" value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})}
                className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[var(--aurora-3)]" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">Jam Selesai</label>
              <input type="time" value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})}
                className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[var(--aurora-3)]" />
            </div>
          </div>
          {form.start_time && form.end_time && (
            <div className="bg-white/5 rounded-xl p-3 flex items-center gap-3">
              <Clock size={16} className="text-[var(--aurora-3)]" />
              <span className="text-sm text-gray-400">Total: <strong className="text-white">{calcHours(form.start_time, form.end_time).toFixed(1)} jam</strong></span>
            </div>
          )}
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">Alasan / Keterangan</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3}
              placeholder="Jelaskan alasan lembur..."
              className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[var(--aurora-3)] resize-none text-sm" />
          </div>
          <button onClick={submitRequest} disabled={submitting}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-50">
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Kirim Permintaan Lembur
          </button>
        </div>
      </div>

      {/* Riwayat */}
      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Riwayat Pengajuan</h3>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-[var(--aurora-3)]" /></div>
      ) : requests.length === 0 ? (
        <div className="text-center py-8 glass-panel rounded-[32px]">
          <AlertCircle size={32} className="mx-auto text-gray-500 mb-2" />
          <p className="text-gray-500 text-sm">Belum ada pengajuan lembur</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map(req => (
            <div key={req.id} className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${req.status === 'approved' ? 'bg-[var(--success)]/10 text-[var(--success)]' : req.status === 'rejected' ? 'bg-[var(--danger)]/10 text-[var(--danger)]' : 'bg-yellow-500/10 text-yellow-400'}`}>
                  {req.status === 'approved' ? <CheckCircle2 size={16} /> : req.status === 'rejected' ? <XCircle size={16} /> : <Clock size={16} />}
                </div>
                <div>
                  <p className="text-white text-xs font-bold">{req.date} • {req.start_time?.substring(0,5)} - {req.end_time?.substring(0,5)}</p>
                  <p className="text-[9px] text-gray-500">{req.total_hours} jam • {req.overtime_type}</p>
                </div>
              </div>
              {getStatusBadge(req.status)}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default OvertimeRequest;
