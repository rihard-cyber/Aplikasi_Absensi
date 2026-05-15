import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Image, ArrowUp, ArrowDown, Save, Loader2, Star } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';

const BannerManager = () => {
  const [banners, setBanners] = useState([]);
  const [tenantId, setTenantId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => { fetchBanners(); }, []);

  const fetchBanners = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: p } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!p?.tenant_id) return;
    setTenantId(p.tenant_id);

    const { data: ts } = await supabase.from('tenant_settings').select('banners').eq('tenant_id', p.tenant_id).maybeSingle();
    setBanners(ts?.banners || []);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || banners.length >= 6) { if (banners.length >= 6) toast('Maksimal 6 banner', 'error'); return; }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `banners/${tenantId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('banners').upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from('banners').getPublicUrl(path);
      setBanners(prev => [...prev, urlData.publicUrl]);
      toast('Banner berhasil diupload!', 'success');
    } catch (e) { toast('Gagal upload: ' + e.message, 'error'); }
    finally { setUploading(false); }
  };

  const removeBanner = (index) => {
    setBanners(prev => prev.filter((_, i) => i !== index));
  };

  const moveBanner = (index, direction) => {
    const newBanners = [...banners];
    const target = index + direction;
    if (target < 0 || target >= newBanners.length) return;
    [newBanners[index], newBanners[target]] = [newBanners[target], newBanners[index]];
    setBanners(newBanners);
  };

  const saveBanners = async () => {
    setSaving(true);
    try {
      await supabase.from('tenant_settings').update({ banners }).eq('tenant_id', tenantId);
      toast('Banner berhasil disimpan!', 'success');
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="glass-panel p-8">
      <div className="flex justify-between items-center border-b border-white/10 pb-6 mb-8">
        <div>
          <h2 className="text-2xl font-serif font-bold text-white">Banner Dashboard</h2>
          <p className="text-sm text-gray-400 mt-1">Upload hingga 6 gambar banner untuk ditampilkan di dashboard karyawan (ukuran terbaik: 1200x400px)</p>
        </div>
        <button onClick={saveBanners} disabled={saving} className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan Urutan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {banners.map((url, i) => (
          <div key={i} className="relative group rounded-2xl overflow-hidden border border-white/10 bg-white/5 aspect-[3/1]">
            <img src={url} alt={`Banner ${i + 1}`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button onClick={() => moveBanner(i, -1)} disabled={i === 0} className="p-2 bg-white/20 rounded-lg text-white hover:bg-white/30 disabled:opacity-30"><ArrowUp size={16} /></button>
              <button onClick={() => moveBanner(i, 1)} disabled={i === banners.length - 1} className="p-2 bg-white/20 rounded-lg text-white hover:bg-white/30 disabled:opacity-30"><ArrowDown size={16} /></button>
              <button onClick={() => removeBanner(i)} className="p-2 bg-red-500/30 rounded-lg text-white hover:bg-red-500/50"><X size={16} /></button>
            </div>
            <div className="absolute top-2 left-2 bg-black/60 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">{i === 0 ? '⭐ Utama' : `#${i + 1}`}</div>
          </div>
        ))}

        {banners.length < 6 && (
          <label className="flex flex-col items-center justify-center aspect-[3/1] rounded-2xl border-2 border-dashed border-white/10 cursor-pointer hover:border-[var(--aurora-3)]/30 transition-all bg-white/[0.02]">
            {uploading ? (
              <Loader2 size={24} className="animate-spin text-[var(--aurora-3)]" />
            ) : (
              <>
                <Upload size={24} className="text-gray-500 mb-2" />
                <span className="text-xs text-gray-500">Klik untuk upload ({banners.length}/6)</span>
              </>
            )}
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
        )}
      </div>

      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Preview di Dashboard Karyawan</h3>
        <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: '3/1' }}>
          {banners.length > 0 ? (
            <img src={banners[0]} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[var(--aurora-1)]/20 to-[var(--aurora-3)]/20 flex items-center justify-center">
              <p className="text-gray-500 text-xs">Upload banner untuk preview</p>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="text-white font-bold text-lg drop-shadow-lg">Nama Perusahaan</h3>
            <p className="text-white/80 text-xs">Project — Divisi</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BannerManager;
