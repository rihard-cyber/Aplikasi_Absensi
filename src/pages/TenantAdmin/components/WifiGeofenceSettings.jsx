/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Plus, Trash2, ShieldCheck, Info, Loader2, Signal } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { addWifiZone, removeWifiZone, fetchWifiZones, clearWifiZoneCache } from '../../../utils/wifiGeofence';
import { useToast } from '../../../components/Toast';
import { useConfirm } from '../../../components/ConfirmDialog';

/**
 * WifiGeofenceSettings — Admin UI untuk kelola zona Wi-Fi kantor.
 * Tabel Supabase yang dibutuhkan:
 * 
 * CREATE TABLE tenant_wifi_zones (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
 *   ssid TEXT NOT NULL,
 *   bssid TEXT,
 *   description TEXT,
 *   is_active BOOLEAN DEFAULT TRUE,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * ALTER TABLE tenant_wifi_zones ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Tenant admin manage wifi zones" ON tenant_wifi_zones FOR ALL
 *   USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE auth_id = auth.uid() AND role IN ('TENANT_ADMIN','SUB_ADMIN')));
 */

const WifiGeofenceSettings = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [geofenceEnabled, setGeofenceEnabled] = useState(false);
  const [newZone, setNewZone] = useState({ ssid: '', bssid: '', description: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      clearWifiZoneCache();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();

      // Load wifi zones
      const result = await fetchWifiZones();
      setZones(result);

      // Load geofence enabled setting from general_settings
      if (profile?.tenant_id) {
        const { data: settings } = await supabase.from('tenant_settings')
          .select('wifi_geofence_enabled')
          .eq('tenant_id', profile.tenant_id)
          .maybeSingle();
        setGeofenceEnabled(settings?.wifi_geofence_enabled === true);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleToggleGeofence = async (val) => {
    setGeofenceEnabled(val);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
      if (profile?.tenant_id) {
        await supabase.from('tenant_settings').upsert({
          tenant_id: profile.tenant_id,
          wifi_geofence_enabled: val,
        }, { onConflict: 'tenant_id' });
        toast(val ? 'Validasi Wi-Fi diaktifkan' : 'Validasi Wi-Fi dinonaktifkan', val ? 'success' : 'info');
      }
    } catch { toast('Gagal menyimpan pengaturan', 'error'); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newZone.ssid.trim()) return;
    setSaving(true);
    const { error } = await addWifiZone(newZone);
    if (error) {
      toast('Gagal menambah zona: ' + (error.message || error), 'error');
    } else {
      toast(`Zona Wi-Fi "${newZone.ssid}" berhasil ditambahkan!`, 'success');
      setNewZone({ ssid: '', bssid: '', description: '' });
      await fetchData();
    }
    setSaving(false);
  };

  const handleRemove = async (id, ssid) => {
    const ok = await confirm(`Hapus zona Wi-Fi "${ssid}"?`, 'Hapus Zona');
    if (!ok) return;
    const { error } = await removeWifiZone(id);
    if (error) toast('Gagal menghapus zona', 'error');
    else { toast('Zona dihapus', 'info'); await fetchData(); }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-20">
      <Loader2 size={28} className="animate-spin text-[var(--aurora-3)]" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      <div>
        <h2 className="text-2xl font-serif font-bold text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--aurora-3)] to-[var(--success)] flex items-center justify-center">
            <Wifi size={20} className="text-black" />
          </div>
          Geofencing Wi-Fi
        </h2>
        <p className="text-gray-400 text-sm mt-1 ml-[52px]">
          Validasi absensi berdasarkan jaringan Wi-Fi kantor yang terdaftar
        </p>
      </div>

      {/* Master Toggle */}
      <div className="glass-panel p-5 border border-white/5 rounded-2xl flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-white">Aktifkan Validasi Wi-Fi</p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Karyawan hanya bisa absen jika terhubung ke jaringan Wi-Fi terdaftar
          </p>
        </div>
        <button
          onClick={() => handleToggleGeofence(!geofenceEnabled)}
          className={`w-12 h-6 rounded-full relative transition-all duration-300 ${geofenceEnabled ? 'bg-[var(--success)]' : 'bg-gray-700'}`}
        >
          <motion.div
            className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
            animate={{ left: geofenceEnabled ? '26px' : '2px' }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </button>
      </div>

      {/* Info Banner */}
      <div className="p-4 bg-[var(--aurora-3)]/5 border border-[var(--aurora-3)]/20 rounded-2xl flex items-start gap-3">
        <Info size={16} className="text-[var(--aurora-3)] flex-shrink-0 mt-0.5" />
        <div className="text-[10px] text-gray-400 leading-relaxed">
          <strong className="text-white">Cara Kerja:</strong> Saat karyawan absen, sistem mendeteksi SSID Wi-Fi yang aktif
          (tersedia di aplikasi native/Android). Di browser, deteksi dilakukan via tipe koneksi.
          Daftarkan seluruh SSID Wi-Fi di lokasi kantor Anda (termasuk repeater/extender dengan nama berbeda).
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Add Zone Form */}
        <div className="glass-panel p-5 border border-white/5 rounded-2xl">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Plus size={16} className="text-[var(--aurora-3)]" /> Tambah Zona Wi-Fi
          </h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block mb-2">
                Nama Jaringan (SSID) *
              </label>
              <input
                required
                value={newZone.ssid}
                onChange={e => setNewZone({ ...newZone, ssid: e.target.value })}
                placeholder="Contoh: Kantor_WiFi"
                className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-3)]"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block mb-2">
                MAC Address (BSSID) — Opsional
              </label>
              <input
                value={newZone.bssid}
                onChange={e => setNewZone({ ...newZone, bssid: e.target.value })}
                placeholder="Contoh: AA:BB:CC:DD:EE:FF"
                className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono outline-none focus:border-[var(--aurora-3)]"
              />
              <p className="text-[9px] text-gray-600 mt-1">BSSID lebih aman karena spesifik ke satu router fisik</p>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block mb-2">
                Keterangan
              </label>
              <input
                value={newZone.description}
                onChange={e => setNewZone({ ...newZone, description: e.target.value })}
                placeholder="Contoh: Wi-Fi Lantai 2 Kantor Pusat"
                className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-3)]"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[var(--aurora-3)] to-[var(--success)] text-black font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-all"
            >
              {saving ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : <><Plus size={16} /> Tambah Zona</>}
            </button>
          </form>
        </div>

        {/* Zone List */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Signal size={16} className="text-[var(--success)]" />
            Zona Terdaftar ({zones.length})
          </h3>
          {zones.length === 0 ? (
            <div className="glass-panel p-8 rounded-2xl border border-white/5 text-center">
              <WifiOff size={40} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Belum ada zona Wi-Fi terdaftar</p>
              <p className="text-[10px] text-gray-600 mt-1">Tambahkan SSID Wi-Fi kantor untuk mulai memvalidasi absensi</p>
            </div>
          ) : (
            <div className="space-y-2">
              {zones.map((zone, i) => (
                <motion.div
                  key={zone.id || i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="glass-panel p-4 rounded-2xl border border-white/5 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[var(--success)]/10 flex items-center justify-center text-[var(--success)] flex-shrink-0 mt-0.5">
                      <Wifi size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{zone.ssid}</p>
                      {zone.bssid && <p className="text-[9px] text-gray-500 font-mono mt-0.5">{zone.bssid}</p>}
                      {zone.description && <p className="text-[9px] text-gray-400 mt-0.5">{zone.description}</p>}
                      <span className="inline-flex items-center gap-1 mt-1 text-[8px] px-1.5 py-0.5 bg-[var(--success)]/10 text-[var(--success)] rounded-full font-bold uppercase">
                        <ShieldCheck size={8} /> Aktif
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(zone.id, zone.ssid)}
                    className="p-2 bg-[var(--danger)]/10 hover:bg-[var(--danger)]/20 text-[var(--danger)] rounded-xl transition-colors flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WifiGeofenceSettings;
