import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Monitor, Plus, Loader2, ChevronLeft, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';

const t = (s) => s;

const ITTask = ({ onBack, user }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({ equipment_type: 'laptop', specification: '', quantity: 1, reason: '', urgency: 'normal' });

  useEffect(() => { init(); }, []);

  const init = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles').select('tenant_id, id').eq('auth_id', session.user.id).maybeSingle();
      if (!profile) return;
      setTenantId(profile.tenant_id);
      if (profile.tenant_id) {
        const res = await supabase.from('it_equipment_requests').select('*').eq('tenant_id', profile.tenant_id).eq('requester_id', profile.id).order('created_at', { ascending: false });
        setRequests(res.data || []);
      }
    } catch (e) { 
      console.error(e); 
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.reason) return;
    setSubmitting(true);
    try {
      await supabase.from('it_equipment_requests').insert({
        tenant_id: tenantId, requester_id: user?.id,
        ...form, quantity: parseInt(form.quantity) || 1,
      });
      setForm({ equipment_type: 'laptop', specification: '', quantity: 1, reason: '', urgency: 'normal' });
      setShowForm(false);
      await init();
    } catch (e) { alert('Gagal: ' + e.message); }
    setSubmitting(false);
  };

  const statusBadge = (s) => {
    const map = { pending: 'bg-amber-500/10 text-amber-400', approved: 'bg-blue-500/10 text-blue-400', rejected: 'bg-red-500/10 text-red-400', fulfilled: 'bg-emerald-500/10 text-emerald-400' };
    return <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${map[s] || 'bg-gray-500/10 text-gray-400'}`}>{s}</span>;
  };

  if (loading) return <div className="p-20 text-center"><div className="w-8 h-8 border-2 border-[var(--aurora-3)] border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && <button onClick={onBack} className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white"><ChevronLeft size={18} /></button>}
          <div>
            <h3 className="text-lg font-serif font-bold text-white">IT Equipment</h3>
            <p className="text-xs text-gray-500 mt-0.5">{requests.length} permintaan</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="px-3 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-[10px] text-blue-400 font-bold flex items-center gap-1"><Plus size={14} /> Request</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-[#1A1C23] border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
            <h4 className="text-sm font-bold text-white">Request IT Equipment</h4>
            <select value={form.equipment_type} onChange={e => setForm({ ...form, equipment_type: e.target.value })} className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none">
              <option value="laptop">Laptop</option><option value="monitor">Monitor</option><option value="keyboard">Keyboard</option><option value="mouse">Mouse</option>
              <option value="headset">Headset</option><option value="phone">Phone</option><option value="tablet">Tablet</option><option value="printer">Printer</option>
              <option value="accessory">Aksesoris</option><option value="other">Lainnya</option>
            </select>
            <textarea value={form.specification} onChange={e => setForm({ ...form, specification: e.target.value })} placeholder="Spesifikasi yang diinginkan" className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none min-h-[60px]" />
            <div className="grid grid-cols-2 gap-2">
              <input value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} type="number" min="1" placeholder="Jumlah" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none" />
              <select value={form.urgency} onChange={e => setForm({ ...form, urgency: e.target.value })} className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none">
                <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
              </select>
            </div>
            <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Alasan" className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none min-h-[60px]" />
            <button onClick={handleSubmit} disabled={submitting} className="w-full py-3 rounded-xl bg-blue-500/20 text-blue-400 text-xs font-bold">Kirim</button>
            <button onClick={() => setShowForm(false)} className="w-full py-2.5 rounded-xl bg-white/5 text-gray-400 text-[10px] font-bold">Batal</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {requests.map(r => (
          <div key={r.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-white capitalize">{r.equipment_type} x{r.quantity}</p>
              {statusBadge(r.status)}
            </div>
            {r.specification && <p className="text-[9px] text-gray-500">{r.specification}</p>}
            <div className="flex items-center gap-2 mt-1 text-[9px] text-gray-500">
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${r.urgency === 'urgent' ? 'bg-red-500/10 text-red-400' : r.urgency === 'high' ? 'bg-amber-500/10 text-amber-400' : 'bg-gray-500/10 text-gray-400'}`}>{r.urgency}</span>
              <span>• {new Date(r.created_at).toLocaleDateString('id-ID')}</span>
            </div>
          </div>
        ))}
        {!requests.length && <div className="p-12 text-center text-gray-500 text-sm">Belum ada request equipment.</div>}
      </div>
    </div>
  );
};

export default ITTask;
