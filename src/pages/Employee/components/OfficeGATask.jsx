import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Wrench, Plus, Loader2, ChevronLeft, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';

const t = (s) => s;

const OfficeGATask = ({ onBack, user }) => {
  const [tab, setTab] = useState('supply');
  const [requests, setRequests] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const [reqForm, setReqForm] = useState({ item_name: '', category: 'atk', quantity: 1, unit: 'pcs', urgency: 'normal', reason: '' });
  const [repForm, setRepForm] = useState({ category: 'other', description: '', location: '', priority: 'normal' });
  const [showForm, setShowForm] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);

  useEffect(() => { init(); }, []);

  const init = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles').select('tenant_id, id').eq('auth_id', session.user.id).maybeSingle();
      if (!profile?.tenant_id) return;
      setTenantId(profile.tenant_id);

      const [reqRes, repRes] = await Promise.all([
        supabase.from('ga_supply_requests').select('*').eq('tenant_id', profile.tenant_id).eq('requester_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('ga_maintenance_reports').select('*').eq('tenant_id', profile.tenant_id).eq('reporter_id', profile.id).order('created_at', { ascending: false }),
      ]);
      setRequests(reqRes.data || []);
      setReports(repRes.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const uploadPhoto = async (file) => {
    if (!file) return null;
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `ga/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('documents').upload(path, file);
    if (error) return null;
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
    return urlData?.publicUrl || null;
  };

  const handleSubmitRequest = async () => {
    if (!reqForm.item_name) return;
    setSubmitting(true);
    try {
      await supabase.from('ga_supply_requests').insert({
        tenant_id: tenantId, requester_id: user?.id,
        ...reqForm, quantity: parseInt(reqForm.quantity) || 1,
      });
      setReqForm({ item_name: '', category: 'atk', quantity: 1, unit: 'pcs', urgency: 'normal', reason: '' });
      setShowForm(false);
      await init();
    } catch (e) { alert('Gagal: ' + e.message); }
    setSubmitting(false);
  };

  const handleSubmitReport = async () => {
    if (!repForm.description) return;
    setSubmitting(true);
    try {
      const photoUrl = photoFile ? await uploadPhoto(photoFile) : null;
      await supabase.from('ga_maintenance_reports').insert({
        tenant_id: tenantId, reporter_id: user?.id,
        ...repForm, photo_url: photoUrl,
      });
      setRepForm({ category: 'other', description: '', location: '', priority: 'normal' });
      setPhotoFile(null);
      setShowForm(false);
      await init();
    } catch (e) { alert('Gagal: ' + e.message); }
    setSubmitting(false);
  };

  const statusBadge = (status) => {
    const s = {
      pending: 'bg-amber-500/10 text-amber-400',
      approved: 'bg-blue-500/10 text-blue-400',
      rejected: 'bg-red-500/10 text-red-400',
      fulfilled: 'bg-emerald-500/10 text-emerald-400',
      in_progress: 'bg-amber-500/10 text-amber-400',
      resolved: 'bg-emerald-500/10 text-emerald-400',
      closed: 'bg-gray-500/10 text-gray-400',
    }[status] || 'bg-gray-500/10 text-gray-400';
    return <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${s}`}>{status}</span>;
  };

  if (loading) return <div className="p-20 text-center"><div className="w-8 h-8 border-2 border-[var(--aurora-3)] border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && <button onClick={onBack} className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white"><ChevronLeft size={18} /></button>}
          <div>
            <h3 className="text-lg font-serif font-bold text-white">Office / GA</h3>
            <p className="text-xs text-gray-500 mt-0.5">{tab === 'supply' ? `${requests.length} permintaan` : `${reports.length} laporan`}</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="px-3 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-[10px] text-blue-400 font-bold flex items-center gap-1"><Plus size={14} /> Baru</button>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('supply')} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${tab === 'supply' ? 'bg-white/10 border-[var(--aurora-3)]/30 text-white' : 'bg-white/5 border-white/10 text-gray-500'}`}><ClipboardList size={14} className="inline" /> Request</button>
        <button onClick={() => setTab('report')} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${tab === 'report' ? 'bg-white/10 border-[var(--aurora-3)]/30 text-white' : 'bg-white/5 border-white/10 text-gray-500'}`}><Wrench size={14} className="inline" /> Laporan</button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-[#1A1C23] border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
            <h4 className="text-sm font-bold text-white">{tab === 'supply' ? 'Permintaan Barang' : 'Laporan Kerusakan'}</h4>

            {tab === 'supply' ? (
              <>
                <input value={reqForm.item_name} onChange={e => setReqForm({ ...reqForm, item_name: e.target.value })} placeholder="Nama barang" className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none" />
                <select value={reqForm.category} onChange={e => setReqForm({ ...reqForm, category: e.target.value })} className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none">
                  <option value="atk">ATK</option><option value="cleaning">Cleaning</option><option value="kitchen">Kitchen</option><option value="furniture">Furniture</option><option value="electronic">Elektronik</option><option value="other">Lainnya</option>
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input value={reqForm.quantity} onChange={e => setReqForm({ ...reqForm, quantity: e.target.value })} type="number" min="1" placeholder="Jumlah" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none" />
                  <input value={reqForm.unit} onChange={e => setReqForm({ ...reqForm, unit: e.target.value })} placeholder="Satuan" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none" />
                </div>
                <select value={reqForm.urgency} onChange={e => setReqForm({ ...reqForm, urgency: e.target.value })} className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none">
                  <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
                </select>
                <textarea value={reqForm.reason} onChange={e => setReqForm({ ...reqForm, reason: e.target.value })} placeholder="Alasan" className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none min-h-[60px]" />
                <button onClick={handleSubmitRequest} disabled={submitting} className="w-full py-3 rounded-xl bg-blue-500/20 text-blue-400 text-xs font-bold">Kirim</button>
              </>
            ) : (
              <>
                <select value={repForm.category} onChange={e => setRepForm({ ...repForm, category: e.target.value })} className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none">
                  <option value="ac">AC</option><option value="listrik">Listrik</option><option value="plumbing">Plumbing</option><option value="furniture">Furniture</option><option value="electronic">Elektronik</option><option value="building">Bangunan</option><option value="cleaning">Kebersihan</option><option value="other">Lainnya</option>
                </select>
                <textarea value={repForm.description} onChange={e => setRepForm({ ...repForm, description: e.target.value })} placeholder="Deskripsi kerusakan" className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none min-h-[80px]" />
                <input value={repForm.location} onChange={e => setRepForm({ ...repForm, location: e.target.value })} placeholder="Lokasi" className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none" />
                <select value={repForm.priority} onChange={e => setRepForm({ ...repForm, priority: e.target.value })} className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none">
                  <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
                </select>
                <button onClick={() => { const inp = document.createElement('input'); inp.type='file'; inp.accept='image/*'; inp.onchange=(e) => { if(e.target.files[0]) setPhotoFile(e.target.files[0]) }; inp.click(); }} className={`w-full p-3 rounded-xl border border-dashed text-center ${photoFile ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/[0.02] border-white/10'}`}>
                  {photoFile ? '✅ Foto terpasang' : '📷 Foto kerusakan'}
                </button>
                <button onClick={handleSubmitReport} disabled={submitting} className="w-full py-3 rounded-xl bg-blue-500/20 text-blue-400 text-xs font-bold">Kirim</button>
              </>
            )}

            <button onClick={() => setShowForm(false)} className="w-full py-2.5 rounded-xl bg-white/5 text-gray-400 text-[10px] font-bold">Batal</button>
          </div>
        </div>
      )}

      {/* List */}
      {tab === 'supply' ? (
        <div className="space-y-2">
          {requests.map(r => (
            <div key={r.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-bold text-white">{r.item_name} x{r.quantity} {r.unit}</p>
                {statusBadge(r.status)}
              </div>
              <div className="flex items-center gap-2 text-[9px] text-gray-500">
                <span className="capitalize">{r.category}</span>
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${r.urgency === 'urgent' ? 'bg-red-500/10 text-red-400' : r.urgency === 'high' ? 'bg-amber-500/10 text-amber-400' : 'bg-gray-500/10 text-gray-400'}`}>{r.urgency}</span>
                <span>• {new Date(r.created_at).toLocaleDateString('id-ID')}</span>
              </div>
              {r.reason && <p className="text-[9px] text-gray-500 mt-1 italic">"{r.reason}"</p>}
            </div>
          ))}
          {!requests.length && <div className="p-12 text-center text-gray-500 text-sm">Belum ada permintaan.</div>}
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map(r => (
            <div key={r.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-bold text-white">{r.description?.slice(0, 60)}{r.description?.length > 60 ? '...' : ''}</p>
                {statusBadge(r.status)}
              </div>
              <div className="flex items-center gap-2 text-[9px] text-gray-500">
                <span className="capitalize">{r.category}</span>
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${r.priority === 'urgent' ? 'bg-red-500/10 text-red-400' : r.priority === 'high' ? 'bg-amber-500/10 text-amber-400' : 'bg-gray-500/10 text-gray-400'}`}>{r.priority}</span>
                {r.location && <span>• {r.location}</span>}
                <span>• {new Date(r.created_at).toLocaleDateString('id-ID')}</span>
              </div>
            </div>
          ))}
          {!reports.length && <div className="p-12 text-center text-gray-500 text-sm">Belum ada laporan.</div>}
        </div>
      )}
    </div>
  );
};

export default OfficeGATask;
