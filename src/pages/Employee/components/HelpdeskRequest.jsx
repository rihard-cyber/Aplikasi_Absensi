import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Ticket, Send, ArrowLeft, Loader2, Upload, Clock, CheckCircle2, XCircle, Star } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { notifyAdminsInTenant, NOTIF_TYPES } from '../../../utils/notificationEngine';

const CATEGORIES = [
  { value: 'listrik', label: 'Listrik', icon: '⚡' },
  { value: 'ac', label: 'AC', icon: '❄️' },
  { value: 'plumbing', label: 'Plumbing', icon: '🔧' },
  { value: 'it', label: 'IT', icon: '💻' },
  { value: 'kebersihan', label: 'Kebersihan', icon: '🧹' },
  { value: 'umum', label: 'Umum', icon: '📋' },
];

const PRIORITIES = [
  { value: 'low', label: 'Rendah', desc: 'Tidak urgent' },
  { value: 'medium', label: 'Sedang', desc: 'Perlu perhatian' },
  { value: 'high', label: 'Tinggi', desc: 'Butuh segera' },
  { value: 'critical', label: 'Kritis', desc: 'Darurat / mengganggu operasional' },
];

const STATUS_STYLES = new Map([
  ['open', 'bg-blue-500/10 text-blue-400 border-blue-500/30'],
  ['in_progress', 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'],
  ['resolved', 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30'],
  ['closed', 'bg-gray-500/10 text-gray-400 border-gray-500/30']
]);

/** @type {(s: string) => string} Passthrough i18n — app is monolingual Indonesian */
const t = (s) => s;

const HelpdeskRequest = ({ onBack }) => {
  const [profile, setProfile] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ category: '', priority: 'medium', subject: '', description: '' });
  const [photos, setPhotos] = useState([]);
  const [photoPreview, setPhotoPreview] = useState([]);
  const toast = useToast();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: prof } = await supabase.from('profiles').select('id, tenant_id, full_name').eq('auth_id', session.user.id).maybeSingle();
    if (!prof) { setLoading(false); return; }
    setProfile(prof);
    setTenantId(prof.tenant_id);
    await fetchMyTickets(prof.id, prof.tenant_id);
  };

  const fetchMyTickets = async (uid, tid) => {
    setLoading(true);
    const { data } = await supabase.from('helpdesk_tickets')
      .select('*')
      .eq('submitter_id', uid)
      .eq('tenant_id', tid)
      .order('created_at', { ascending: false });
    if (data) setTickets(data);
    setLoading(false);
  };

  const generateTicketNumber = async () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `TKT-${y}/${m}/`;
    const { data: last } = await supabase.from('helpdesk_tickets')
      .select('ticket_number')
      .like('ticket_number', `${prefix}%`)
      .order('created_at', { ascending: false })
      .limit(1);
    let seq = 1;
    if (last?.length) {
      const parts = last[0].ticket_number.split('/');
      seq = parseInt(parts[2]) + 1;
    }
    return `${prefix}${String(seq).padStart(3, '0')}`;
  };

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    setPhotos(prev => [...prev, ...files]);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(prev => [...prev, ev.target.result]);
      reader.readAsDataURL(f);
    });
  };

  const removePhoto = (idx) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
    setPhotoPreview(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!form.category) { toast('Pilih kategori!', 'error'); return; }
    if (!form.subject.trim()) { toast('Isi subjek!', 'error'); return; }
    if (!form.description.trim()) { toast('Isi deskripsi!', 'error'); return; }
    setSubmitting(true);
    try {
      const ticketNumber = await generateTicketNumber();
      const photoUrls = [];
      for (const photo of photos) {
        const ext = photo.name.split('.').pop();
        const path = `helpdesk/${profile.id}/${ticketNumber}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('documents').upload(path, photo);
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
          if (urlData?.publicUrl) photoUrls.push(urlData.publicUrl);
        }
      }
      const { error } = await supabase.from('helpdesk_tickets').insert({
        tenant_id: tenantId,
        submitter_id: profile.id,
        ticket_number: ticketNumber,
        category: form.category,
        priority: form.priority,
        subject: form.subject.trim(),
        description: form.description.trim(),
        photo_urls: photoUrls.length ? photoUrls : null,
        status: 'open',
      });
      if (error) throw error;
      toast(`Tiket ${ticketNumber} berhasil dikirim!`, 'success');
      notifyAdminsInTenant({ type: NOTIF_TYPES.TICKET_CREATED, title: 'Tiket Baru: ' + form.category, body: form.description?.substring(0,100), link: '/helpdesk' });
      setForm({ category: '', priority: 'medium', subject: '', description: '' });
      setPhotos([]);
      setPhotoPreview([]);
      await fetchMyTickets(profile.id, tenantId);
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const getStatusBadge = (status) => {
    const labels = new Map([
      ['open', 'Open'],
      ['in_progress', 'In Progress'],
      ['resolved', 'Resolved'],
      ['closed', 'Closed']
    ]);
    const styleClass = STATUS_STYLES.get(status) || STATUS_STYLES.get('open');
    const labelText = labels.get(status) || status;
    return <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${styleClass}`}>{labelText}</span>;
  };

  const renderStars = (rating) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(s => (
          <Star key={s} size={10} className={s <= rating ? 'text-[var(--warning)] fill-[var(--warning)]' : 'text-gray-600'} />
        ))}
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-serif font-bold text-white">{t('Bantuan / Helpdesk')}</h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">{t('Laporkan masalah atau ajukan permintaan bantuan')}</p>
        </div>
      </div>

      {/* Form */}
      <div className="glass-panel p-6 rounded-[32px] border border-white/5 mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">{t('Kategori')}</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(c => (
                <button key={c.value} onClick={() => setForm({...form, category: c.value})}
                  className={`p-3 rounded-xl border text-center transition-all ${form.category === c.value ? 'bg-[var(--aurora-3)]/20 border-[var(--aurora-3)] text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}>
                  <span className="text-lg">{c.icon}</span>
                  <p className="text-[10px] font-bold mt-1">{c.label}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">{t('Prioritas')}</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRIORITIES.map(p => (
                <button key={p.value} onClick={() => setForm({...form, priority: p.value})}
                  className={`p-3 rounded-xl border text-left transition-all ${form.priority === p.value ? 'bg-[var(--aurora-3)]/20 border-[var(--aurora-3)] text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}>
                  <p className="text-[10px] font-bold">{p.label}</p>
                  <p className="text-[8px] text-gray-500 mt-0.5">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">{t('Subjek')}</label>
            <input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})}
              className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[var(--aurora-3)]" placeholder="Contoh: AC kantor mati" />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">{t('Deskripsi')}</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={4}
              placeholder="Jelaskan masalah secara detail..."
              className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[var(--aurora-3)] resize-none text-sm" />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">{t('Foto (opsional, bisa lebih dari 1)')}</label>
            <label className="flex items-center gap-3 p-4 bg-white/5 border border-dashed border-white/20 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
              <Upload size={20} className="text-gray-400" />
              <span className="text-sm text-gray-400">{photos.length ? `${photos.length} file dipilih` : 'Upload foto bukti'}</span>
              <input type="file" accept="image/*" onChange={handlePhotoChange} multiple className="hidden" />
            </label>
            {photoPreview.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {photoPreview.map((preview, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden group border border-white/10">
                    <img src={preview} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => removePhoto(idx)} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <XCircle size={16} className="text-[var(--danger)]" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={handleSubmit} disabled={submitting}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-50">
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Kirim Tiket Bantuan
          </button>
        </div>
      </div>

      {/* My Tickets */}
      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">{t('Tiket Saya')}</h3>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-[var(--aurora-3)]" /></div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-8 glass-panel rounded-[32px]">
          <Ticket size={32} className="mx-auto text-gray-500 mb-2" />
          <p className="text-gray-500 text-sm">{t('Belum ada tiket bantuan')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map(t => (
            <div key={t.id} className="glass-panel p-4 rounded-2xl border border-white/5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-bold text-xs font-mono">{t.ticket_number}</span>
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest border bg-white/5 border-white/10 text-gray-400">{t.category}</span>
                    {getStatusBadge(t.status)}
                  </div>
                  <p className="text-white text-sm mt-1 font-bold">{t.subject}</p>
                  {t.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{t.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-[9px] text-gray-500">
                    <span className="flex items-center gap-1"><Clock size={10} /> {new Date(t.created_at).toLocaleDateString('id-ID')}</span>
                    {t.resolved_at && <span className="flex items-center gap-1"><CheckCircle2 size={10} /> Selesai: {new Date(t.resolved_at).toLocaleDateString('id-ID')}</span>}
                    {t.rating && <span className="flex items-center gap-1">{renderStars(t.rating)}</span>}
                  </div>
                  {t.resolution_notes && (
                    <div className="mt-2 bg-[var(--success)]/5 border border-[var(--success)]/10 rounded-xl p-2">
                      <p className="text-[9px] text-[var(--success)] font-bold uppercase tracking-widest mb-0.5">{t('Resolusi')}</p>
                      <p className="text-[10px] text-gray-300">{t.resolution_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default HelpdeskRequest;
