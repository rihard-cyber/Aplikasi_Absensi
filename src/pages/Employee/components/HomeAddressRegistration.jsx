import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Home, MapPin, Navigation, Save, Loader2, ArrowLeft,
  CheckCircle2, AlertCircle, Clock, ShieldCheck, Radius
} from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';

const STATUS_CONFIG = {
  pending: { label: 'Menunggu Verifikasi', color: 'var(--warning)', icon: <Clock size={14} /> },
  verified: { label: 'Terverifikasi', color: 'var(--success)', icon: <CheckCircle2 size={14} /> },
  rejected: { label: 'Ditolak', color: 'var(--danger)', icon: <AlertCircle size={14} /> },
};

const HomeAddressRegistration = ({ onBack }) => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState(null);
  const [statusInfo, setStatusInfo] = useState(null);
  const [profileId, setProfileId] = useState(null);
  const [form, setForm] = useState({
    address: '',
    latitude: '',
    longitude: '',
    radius_meters: 50,
  });

  useEffect(() => {
    fetchExisting();
  }, []);

  const fetchExisting = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: prof } = await supabase.from('profiles')
        .select('id').eq('auth_id', session.user.id).maybeSingle();
      if (!prof?.id) return;
      setProfileId(prof.id);

      const { data } = await supabase.from('employee_home_addresses')
        .select('*').eq('profile_id', prof.id).maybeSingle();
      if (data) {
        setExisting(data);
        setForm({
          address: data.address || '',
          latitude: data.latitude?.toString() || '',
          longitude: data.longitude?.toString() || '',
          radius_meters: data.radius_meters || 50,
        });
        const verStatus = data.is_verified ? 'verified' : 'pending';
        setStatusInfo(STATUS_CONFIG[verStatus] || STATUS_CONFIG.pending);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast('Geolokasi tidak didukung browser ini', 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm({
          ...form,
          latitude: pos.coords.latitude.toFixed(7),
          longitude: pos.coords.longitude.toFixed(7),
        });
        toast('Lokasi berhasil didapatkan', 'success');
      },
      () => toast('Gagal mendapatkan lokasi. Periksa izin GPS.', 'error'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!profileId) return;
    if (!form.address.trim()) { toast('Alamat wajib diisi', 'error'); return; }
    if (!form.latitude || !form.longitude) { toast('Koordinat wajib diisi', 'error'); return; }

    setSaving(true);
    try {
      const payload = {
        profile_id: profileId,
        address: form.address.trim(),
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        radius_meters: parseInt(form.radius_meters) || 50,
        is_verified: false,
        verified_by: null,
        verified_at: null,
      };
      const { error } = await supabase
        .from('employee_home_addresses')
        .upsert(payload, { onConflict: 'profile_id' });
      if (error) throw error;
      toast('Alamat rumah berhasil disimpan', 'success');
      await fetchExisting();
    } catch (e) {
      toast('Gagal menyimpan: ' + (e.message || e), 'error');
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center p-20">
      <Loader2 size={28} className="animate-spin text-[var(--aurora-3)]" />
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col gap-6 pb-24"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-serif font-bold text-white">Registrasi Alamat Rumah</h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Untuk Verifikasi WFH</p>
        </div>
      </div>

      {/* Status Card */}
      {existing && statusInfo && (
        <div className={`glass-panel p-4 rounded-2xl border flex items-center gap-3`} style={{ borderColor: statusInfo.color + '30', background: statusInfo.color + '08' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: statusInfo.color + '15', color: statusInfo.color }}>
            {statusInfo.icon}
          </div>
          <div>
            <p className="text-xs font-bold text-white">Status: <span style={{ color: statusInfo.color }}>{statusInfo.label}</span></p>
            {existing.verified_at && (
              <p className="text-[9px] text-gray-500 mt-0.5">
        Terverifikasi {new Date(existing.verified_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
            {!existing.is_verified && (
              <p className="text-[9px] text-gray-500 mt-0.5">Alamat akan diverifikasi oleh admin</p>
            )}
          </div>
        </div>
      )}

      {/* Existing Address Info */}
      {existing && (
        <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-2">
          <h3 className="text-[10px] text-gray-400 uppercase tracking-widest font-bold flex items-center gap-1">
            <Home size={12} /> Alamat Terdaftar
          </h3>
          <p className="text-xs text-white font-medium">{existing.address}</p>
          <div className="flex items-center gap-4 text-[10px] font-mono text-gray-500">
            <span>Lat: {existing.latitude}</span>
            <span>Lng: {existing.longitude}</span>
            <span>Radius: {existing.radius_meters}m</span>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSave} className="glass-panel p-6 rounded-[32px] border border-white/5 space-y-5 bg-white/[0.02]">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <MapPin size={16} className="text-[var(--aurora-3)]" />
          {existing ? 'Perbarui Alamat' : 'Daftar Alamat Baru'}
        </h3>

        {/* Address */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block">Alamat Lengkap *</label>
          <textarea
            required
            rows={3}
            value={form.address}
            onChange={e => setForm({ ...form, address: e.target.value })}
            placeholder="Jl. Contoh No. 123, RT/RW, Kelurahan, Kecamatan, Kota, Provinsi"
            className="w-full bg-[#0B0C10] border border-white/10 rounded-2xl px-4 py-3 text-white text-xs outline-none focus:border-[var(--aurora-3)] resize-none"
          />
        </div>

        {/* Coordinates */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Koordinat GPS *</label>
            <button
              type="button"
              onClick={getCurrentLocation}
              className="flex items-center gap-1 text-[10px] text-[var(--aurora-3)] font-bold hover:text-white transition-colors"
            >
              <Navigation size={12} /> Deteksi Lokasi Saya
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[8px] text-gray-600 font-mono block mb-1">Latitude</label>
              <input
                required
                type="number"
                step="any"
                value={form.latitude}
                onChange={e => setForm({ ...form, latitude: e.target.value })}
                placeholder="-6.2087634"
                className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs font-mono outline-none focus:border-[var(--aurora-3)]"
              />
            </div>
            <div>
              <label className="text-[8px] text-gray-600 font-mono block mb-1">Longitude</label>
              <input
                required
                type="number"
                step="any"
                value={form.longitude}
                onChange={e => setForm({ ...form, longitude: e.target.value })}
                placeholder="106.845599"
                className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs font-mono outline-none focus:border-[var(--aurora-3)]"
              />
            </div>
          </div>
        </div>

        {/* Radius Slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Radius Geofence</label>
            <span className="text-xs font-bold text-[var(--aurora-3)] font-mono">{form.radius_meters}m</span>
          </div>
          <input
            type="range"
            min={25}
            max={200}
            step={5}
            value={form.radius_meters}
            onChange={e => setForm({ ...form, radius_meters: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-[var(--aurora-3)]"
          />
          <div className="flex justify-between text-[8px] text-gray-600 font-mono">
            <span>25m</span>
            <span>50m</span>
            <span>100m</span>
            <span>150m</span>
            <span>200m</span>
          </div>
        </div>

        {/* Map Placeholder Info */}
        <div className="p-3 bg-[var(--aurora-3)]/5 border border-[var(--aurora-3)]/15 rounded-2xl flex items-start gap-2">
          <MapPin size={14} className="text-[var(--aurora-3)] shrink-0 mt-0.5" />
          <p className="text-[9px] text-gray-400 leading-relaxed">
            Koordinat digunakan untuk memvalidasi lokasi saat absen WFH. Radius geofence menentukan seberapa jauh dari alamat Anda sistem masih menerima absensi.
          </p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[var(--aurora-3)] to-[var(--success)] text-black font-bold text-sm flex items-center justify-center gap-3 disabled:opacity-50 hover:opacity-90 transition-all shadow-[0_0_25px_rgba(0,201,255,0.2)]"
        >
          {saving ? <><Loader2 size={18} className="animate-spin" /> Menyimpan...</> : <><Save size={18} /> {existing ? 'Perbarui Alamat' : 'Simpan Alamat'}</>}
        </button>
      </form>
    </motion.div>
  );
};

export default HomeAddressRegistration;
