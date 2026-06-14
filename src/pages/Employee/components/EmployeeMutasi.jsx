import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ClipboardList, History, Send, Camera, Loader2, AlertTriangle, Search, Trash2, Eye, ShieldOff } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { useConfirm } from '../../../components/ConfirmDialog';
import { logAudit } from '../../../utils/auditLogger';
import { isSecurityDivision } from '../../../utils/featureAccess';

const t = (s) => s;

const KATEGORI_MUTASI = [
  { id: 'informasi', label: 'Informasi', colorClass: 'text-blue-400' },
  { id: 'kehilangan', label: 'Kehilangan', colorClass: 'text-amber-500' },
  { id: 'kerusakan', label: 'Kerusakan', colorClass: 'text-red-400' },
  { id: 'gangguan', label: 'Gangguan', colorClass: 'text-red-600' },
  { id: 'emergency', label: 'Emergency', colorClass: 'text-purple-500' },
  { id: '__lainnya__', label: 'Lainnya...', colorClass: 'text-gray-400' }
];

const EmployeeMutasi = ({ onBack, user }) => {
  if (!isSecurityDivision(localStorage.getItem('user_division'))) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
        <div className="w-20 h-20 rounded-3xl bg-[var(--danger)]/10 flex items-center justify-center">
          <ShieldOff size={40} className="text-[var(--danger)]" />
        </div>
        <h3 className="text-xl font-serif font-bold text-white text-center">Akses Ditolak</h3>
        <p className="text-sm text-gray-400 text-center max-w-xs">Fitur Mutasi khusus untuk divisi Security / Satpam.</p>
        {onBack && <button onClick={onBack} className="mt-4 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 font-bold text-sm">Kembali</button>}
      </div>
    );
  }

  const toast = useToast();
  const confirm = useConfirm();
  const [profile, setProfile] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [mutasiLogs, setMutasiLogs] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [searchMutasi, setSearchMutasi] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const [form, setForm] = useState({
    tanggal_kejadian: new Date().toISOString().split('T')[0],
    jam_kejadian: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    kategori: 'informasi',
    kategori_lainnya: '',
    lokasi: '',
    lokasi_custom: '',
    is_custom_lokasi: false,
    uraian: '',
    photo: null
  });

  const canManage = useMemo(() => {
    const role = user?.role || localStorage.getItem('user_role');
    const pos = user?.position || '';
    return role === 'TENANT_ADMIN' || role === 'SUPER_ADMIN' || role === 'SUB_ADMIN'
      || /^(Manajemen|SPV|Admin|Supervisor)/i.test(pos);
  }, [user]);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data: p } = await supabase.from('profiles').select('id, tenant_id').eq('auth_id', session.user.id).maybeSingle();
        if (p) {
          setProfile(p);
          setTenantId(p.tenant_id);
          await loadData(p.id, p.tenant_id);
        }
      } catch (e) { console.error(e); }
    };
    init();
  }, []);

  const loadData = async (uid, tid) => {
    try {
      const [cpRes, mRes] = await Promise.all([
        supabase.from('patrol_checkpoints').select('*').eq('tenant_id', tid).eq('is_active', true).order('name'),
        supabase.from('mutasi_logs').select('*, profiles(*)').eq('tenant_id', tid).order('created_at', { ascending: false })
      ]);
      if (cpRes.data) setCheckpoints(cpRes.data);
      if (mRes.data) setMutasiLogs(mRes.data);
    } catch (e) { console.error(e); }
  };

  const uploadFile = async (file, folder) => {
    if (!file) return null;
    const ext = file.name.split('.').pop();
    const path = `${folder}/${profile.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('documents').upload(path, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
    return urlData?.publicUrl || null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalLokasi = form.is_custom_lokasi ? form.lokasi_custom : form.lokasi;
    const finalKategori = form.kategori === '__lainnya__' ? form.kategori_lainnya : form.kategori;
    if (!finalLokasi.trim() || !finalKategori.trim() || !form.uraian.trim()) {
      toast('Lengkapi form Buku Mutasi!', 'error');
      return;
    }
    setSubmitting(true);
    try {
      let photo_url = null;
      if (form.photo) photo_url = await uploadFile(form.photo, 'mutasi_logs');
      const { error } = await supabase.from('mutasi_logs').insert({
        tenant_id: tenantId,
        profile_id: profile.id,
        tanggal: new Date().toISOString().split('T')[0],
        waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        tanggal_kejadian: form.tanggal_kejadian,
        jam_kejadian: form.jam_kejadian,
        lokasi: finalLokasi,
        uraian: form.uraian,
        kategori: finalKategori,
        foto: photo_url,
        shift: new Date().getHours() >= 7 && new Date().getHours() < 19 ? 'Pagi (07:00 - 19:00)' : 'Malam (19:00 - 07:00)'
      });
      if (error) throw error;
      logAudit('PATROL_MUTASI_LOG', { kategori: finalKategori, lokasi: finalLokasi });
      toast('Catatan Buku Mutasi disimpan!', 'success');
      setForm({ tanggal_kejadian: new Date().toISOString().split('T')[0], jam_kejadian: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }), kategori: 'informasi', kategori_lainnya: '', lokasi: '', lokasi_custom: '', is_custom_lokasi: false, uraian: '', photo: null });
      await loadData(profile.id, tenantId);
    } catch (e) {
      toast('Gagal mencatat mutasi: ' + e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!canManage) { toast('Tidak memiliki izin hapus', 'error'); return; }
    const ok = await confirm('Hapus catatan mutasi ini?', 'Hapus Mutasi');
    if (!ok) return;
    try {
      const { error } = await supabase.from('mutasi_logs').delete().eq('id', id);
      if (error) throw error;
      toast('Catatan mutasi dihapus!', 'success');
      await loadData(profile.id, tenantId);
    } catch (e) {
      toast('Gagal: ' + e.message, 'error');
    }
  };

  const filteredLogs = useMemo(() => {
    if (!searchMutasi) return mutasiLogs;
    const q = searchMutasi.toLowerCase();
    return mutasiLogs.filter(l =>
      l.uraian?.toLowerCase().includes(q) ||
      l.lokasi?.toLowerCase().includes(q) ||
      (l.profiles?.full_name || '').toLowerCase().includes(q) ||
      (l.kategori || '').toLowerCase().includes(q)
    );
  }, [mutasiLogs, searchMutasi]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full flex flex-col gap-6 pb-8">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-gray-400 hover:text-white transition-colors"><ArrowLeft size={20} /></button>
        <div>
          <h2 className="text-xl font-serif font-bold text-white">Buku Mutasi</h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Catat & Lihat Riwayat Mutasi Jaga</p>
        </div>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="glass-panel p-5 rounded-[24px] border border-white/10 space-y-4">
        <div className="flex items-center justify-between text-white font-serif font-bold text-sm mb-2">
          <span>📝 CATAT BUKU MUTASI JAGA</span>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-black mb-1">Tanggal Kejadian</label>
              <input type="date" value={form.tanggal_kejadian} onChange={e => setForm({ ...form, tanggal_kejadian: e.target.value })} className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[var(--aurora-3)]" />
            </div>
            <div>
              <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-black mb-1">Jam Kejadian</label>
              <input type="time" value={form.jam_kejadian} onChange={e => setForm({ ...form, jam_kejadian: e.target.value })} className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[var(--aurora-3)]" />
            </div>
          </div>

          <div>
            <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-black mb-1">Plotting Pos / Lokasi</label>
            {!form.is_custom_lokasi ? (
              <select value={form.lokasi} onChange={e => { if (e.target.value === '__custom__') setForm({ ...form, is_custom_lokasi: true, lokasi: '' }); else setForm({ ...form, lokasi: e.target.value }); }} required className="w-full bg-[#13151A] border border-white/20 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[var(--aurora-3)]">
                <option value="">-- Pilih Pos Jaga --</option>
                {checkpoints.map(cp => <option key={cp.id} value={cp.name || cp.titik}>{cp.name || cp.titik}</option>)}
                <option value="__custom__">-- Ketik Lokasi Lain (Custom) --</option>
              </select>
            ) : (
              <div className="flex flex-col gap-2">
                <input type="text" value={form.lokasi_custom} onChange={e => setForm({ ...form, lokasi_custom: e.target.value })} placeholder="Masukkan lokasi kustom..." required className="w-full bg-[#13151A] border border-white/20 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[var(--aurora-3)]" />
                <button type="button" onClick={() => setForm({ ...form, is_custom_lokasi: false, lokasi: '', lokasi_custom: '' })} className="text-[10px] text-gray-400 hover:text-white underline text-left w-fit self-start">← Kembali ke pilihan pos</button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-black mb-2">Kategori Kejadian</label>
            <div className="grid grid-cols-2 gap-2">
              {KATEGORI_MUTASI.map(k => (
                <button key={k.id} type="button" onClick={() => setForm({ ...form, kategori: k.id })}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${form.kategori === k.id ? 'bg-[var(--aurora-3)]/20 border-[var(--aurora-3)] text-white shadow' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}>
                  <span className={k.colorClass}>{k.label}</span>
                </button>
              ))}
            </div>
            {form.kategori === '__lainnya__' && (
              <input type="text" value={form.kategori_lainnya} onChange={e => setForm({ ...form, kategori_lainnya: e.target.value })} placeholder="Ketik kategori lainnya..." required className="mt-2 w-full bg-[#13151A] border border-white/20 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[var(--aurora-3)]" />
            )}
          </div>

          <div>
            <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-black mb-1">Uraian Kejadian</label>
            <textarea value={form.uraian} onChange={e => setForm({ ...form, uraian: e.target.value })} placeholder="Tuliskan catatan uraian laporan..." rows={4} required className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-xs text-white outline-none resize-none focus:border-[var(--aurora-3)] hover:border-white/40 transition-colors" />
          </div>

          <div>
            <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-black mb-1">Bukti Foto</label>
            {form.photo ? (
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-white/20">
                <img src={URL.createObjectURL(form.photo)} alt="Preview" className="w-full h-full object-cover" />
                <button type="button" onClick={() => setForm({ ...form, photo: null })} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center font-bold text-xs">X</button>
              </div>
            ) : (
              <label className="flex items-center gap-3 p-3 bg-white/5 border border-dashed border-white/20 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                <Camera size={18} className="text-gray-400" />
                <span className="text-xs text-gray-400">Lampirkan foto kejadian (opsional)</span>
                <input type="file" accept="image/*" onChange={e => setForm({ ...form, photo: e.target.files[0] })} className="hidden" />
              </label>
            )}
          </div>
        </div>
        <button type="submit" disabled={submitting} className="w-full py-4 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-black text-xs uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_10px_35px_rgba(142,45,226,0.2)]">
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} SIMPAN CATATAN MUTASI
        </button>
      </form>

      {/* RIWAYAT */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><History size={16} /> Riwayat Mutasi</h3>
          <div className="relative">
            <input type="text" value={searchMutasi} onChange={e => setSearchMutasi(e.target.value)} placeholder="Cari mutasi..." className="w-40 bg-[#13151A] border border-white/20 rounded-xl pl-7 pr-3 py-1.5 text-xs text-white outline-none focus:border-[var(--aurora-3)] placeholder:text-gray-500" />
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
          </div>
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-xs">
              <ClipboardList size={28} className="mx-auto text-gray-600 mb-2" />
              Belum ada log buku mutasi terdaftar.
            </div>
          ) : (
            filteredLogs.map(m => (
              <div key={m.id} className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-2 relative group">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-[var(--aurora-3)]/15 text-[var(--aurora-3)] font-bold text-[8px] uppercase tracking-wide">{m.kategori}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-gray-500">{m.tanggal_kejadian} {m.jam_kejadian} WIB</span>
                    {canManage && (
                      <button onClick={() => handleDelete(m.id)} className="p-1 hover:bg-[var(--danger)]/20 rounded-lg text-gray-400 hover:text-[var(--danger)] transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button>
                    )}
                  </div>
                </div>
                <div className="text-[11px] text-gray-400 font-bold">📍 Pos Jaga: {m.lokasi}</div>
                <p className="text-xs text-gray-300 leading-relaxed">{m.uraian}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-gray-600">{m.profiles?.full_name || '—'} • {m.shift || '-'}</span>
                  {m.foto && (
                    <button onClick={() => setSelectedPhoto(m.foto)} className="p-1.5 bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
                      <Eye size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedPhoto && (
        <div onClick={() => setSelectedPhoto(null)} className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[9999]">
          <div className="relative max-w-[90%] max-h-[90%]" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedPhoto(null)} className="absolute -top-10 right-0 text-white font-bold text-xs flex items-center gap-1 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl hover:bg-white/10"><Eye size={14} /> Tutup</button>
            <img src={selectedPhoto} alt="Bukti Mutasi" className="max-w-full max-h-[80vh] object-contain rounded-2xl border border-white/10 shadow-2xl" />
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default EmployeeMutasi;
