import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, CheckCircle2, Camera, Building, Phone, User, MapPin, AlertTriangle } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { useToast } from '../../components/Toast';

const CATEGORIES = [
  { value: 'listrik', label: 'Listrik (mati, naik-turun)' },
  { value: 'ac', label: 'AC / Pendingin (panas, bocor)' },
  { value: 'plumbing', label: 'Pipa / Saluran Air (bocor, mampet)' },
  { value: 'kebersihan', label: 'Kebersihan (sampah, bau)' },
  { value: 'keamanan', label: 'Keamanan (pintu, akses)' },
  { value: 'kebisingan', label: 'Kebisingan (bising, konstruksi)' },
  { value: 'fasilitas', label: 'Fasilitas (lift, toilet, parkir)' },
  { value: 'umum', label: 'Pengaduan Umum' },
  { value: 'lainnya', label: 'Lainnya' },
];

const TenantComplaintForm = ({ tenantId, tenantName, onSuccess }) => {
  const toast = useToast();
  const [form, setForm] = useState({
    name: '', phone: '', company: '', location: '',
    category: '', subject: '', description: '', photo: null
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.category || !form.subject.trim() || !form.description.trim()) {
      toast('Lengkapi data: Nama, Kategori, Subjek, dan Deskripsi!', 'error');
      return;
    }
    setSubmitting(true);
    try {
      let photoUrls = [];
      if (form.photo) {
        const ext = form.photo.name.split('.').pop();
        const path = `complaints/${Date.now()}_${form.name.replace(/\s+/g, '_')}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('documents').upload(path, form.photo);
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
          if (urlData) photoUrls = [urlData.publicUrl];
        }
      }

      const ticketSlug = (tenantName || 'TENANT').substring(0, 4).toUpperCase();
      const today = new Date().toISOString().split('T')[0];

      let ticketNumber;
      let retries = 3;
      while (retries > 0) {
        const { count } = await supabase.from('tenant_complaints')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', today)
          .eq('tenant_id', tenantId);
        const seq = (count || 0) + 1;
        ticketNumber = `${ticketSlug}-CMP-${today.replace(/-/g, '')}-${String(seq).padStart(3, '0')}`;

        const { error: insErr } = await supabase.from('tenant_complaints').insert({
          tenant_id: tenantId,
          ticket_number: ticketNumber,
        complainant_name: form.name.trim(),
        complainant_phone: form.phone.trim() || null,
        complainant_company: form.company.trim() || null,
        location: form.location.trim() || null,
        category: form.category,
        priority: 'medium',
        subject: form.subject.trim(),
        description: form.description.trim(),
        photo_urls: photoUrls,
        source: 'web',
        status: 'baru'
      });
        if (!insErr) {
          retries = 0;
        } else if (insErr.code === '23505' && retries > 1) {
          retries--;
        } else {
          throw insErr;
        }
      }

      setSuccess({ ticket: ticketNumber, name: form.name });
      if (onSuccess) onSuccess();
      toast('Komplain berhasil dikirim!', 'success');
    } catch (e) {
      toast('Gagal: ' + e.message, 'error');
    }
    setSubmitting(false);
  };

  if (success) {
    return (
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="glass-panel p-8 rounded-[32px] border border-emerald-500/30 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} className="text-emerald-400" />
        </div>
        <h3 className="text-lg font-bold text-white">Komplain Terkirim!</h3>
        <p className="text-sm text-gray-400 mt-2">Terima kasih {success.name}, laporan Anda telah kami terima.</p>
        <div className="mt-4 p-4 bg-[#13151A] rounded-xl border border-white/5 inline-block">
          <p className="text-[10px] text-gray-500 uppercase">Nomor Tiket</p>
          <p className="text-lg font-bold text-[var(--aurora-3)]">{success.ticket}</p>
        </div>
        <p className="text-xs text-gray-500 mt-4">Tim pengelola akan memproses laporan Anda segera.</p>
        <button onClick={() => { setSuccess(null); setForm({ name: '', phone: '', company: '', location: '', category: '', subject: '', description: '', photo: null }); }} className="mt-6 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-xs font-bold">Kirim Komplain Lain</button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-[32px] border border-white/10 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
          <AlertTriangle size={20} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Kirim Komplain</h3>
          <p className="text-[10px] text-gray-500">Laporkan masalah atau pengaduan untuk {tenantName || 'Gedung'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1"><User size={10} className="inline mr-1" /> Nama *</label>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nama lengkap" required className="w-full bg-[#13151A] border border-white/20 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[var(--aurora-3)]" />
        </div>
        <div>
          <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1"><Phone size={10} className="inline mr-1" /> No. HP</label>
          <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="08xxx" className="w-full bg-[#13151A] border border-white/20 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[var(--aurora-3)]" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1"><Building size={10} className="inline mr-1" /> Perusahaan</label>
          <input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Nama perusahaan/unit" className="w-full bg-[#13151A] border border-white/20 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[var(--aurora-3)]" />
        </div>
        <div>
          <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1"><MapPin size={10} className="inline mr-1" /> Lokasi / Lantai</label>
          <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Lantai, nomor unit" className="w-full bg-[#13151A] border border-white/20 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[var(--aurora-3)]" />
        </div>
      </div>

      <div>
        <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Kategori *</label>
        <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required className="w-full bg-[#13151A] border border-white/20 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[var(--aurora-3)]">
          <option value="">Pilih kategori...</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Subjek *</label>
        <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Judul singkat komplain" required className="w-full bg-[#13151A] border border-white/20 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[var(--aurora-3)]" />
      </div>

      <div>
        <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Deskripsi *</label>
        <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Jelaskan masalah secara detail..." rows={4} required className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-xs text-white outline-none resize-none focus:border-[var(--aurora-3)]" />
      </div>

      <div>
        <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Lampiran Foto</label>
        {form.photo ? (
          <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-white/20">
            <img src={URL.createObjectURL(form.photo)} alt="Preview" className="w-full h-full object-cover" />
            <button type="button" onClick={() => setForm({ ...form, photo: null })} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center font-bold text-xs">X</button>
          </div>
        ) : (
          <label className="flex items-center gap-3 p-3 bg-white/5 border border-dashed border-white/20 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
            <Camera size={18} className="text-gray-400" />
            <span className="text-xs text-gray-400">Upload foto (opsional)</span>
            <input type="file" accept="image/*" onChange={e => setForm({ ...form, photo: e.target.files[0] })} className="hidden" />
          </label>
        )}
      </div>

      <button type="submit" disabled={submitting} className="w-full py-4 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-black text-xs uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_10px_35px_rgba(142,45,226,0.2)]">
        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Kirim Komplain
      </button>
    </form>
  );
};

export default TenantComplaintForm;
