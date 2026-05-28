import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Home, MapPin, ClipboardCheck, Clock, ShieldCheck,
  Save, Loader2, ToggleLeft, ToggleRight, RefreshCw
} from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';

const DEFAULT_POLICY = {
  enable_wfh: false,
  enable_wfa: false,
  max_wfh_days_per_week: 2,
  max_wfa_days_per_month: 3,
  require_home_address: true,
  require_task_plan: false,
  verification_method: 'gps_selfie',
  random_check_frequency: 2,
  random_check_timeout_min: 5,
  wfh_hours_flexible: true,
  wfh_core_start: '09:00',
  wfh_core_end: '15:00',
};

const VERIFICATION_OPTIONS = [
  { value: 'gps_selfie', label: 'GPS + Selfie' },
  { value: 'selfie_only', label: 'Selfie Saja' },
  { value: 'random_check', label: 'Pemeriksaan Acak' },
];

const Toggle = ({ value, onChange, label, desc }) => (
  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all">
    <div>
      <p className="text-xs font-bold text-white">{label}</p>
      {desc && <p className="text-[9px] text-gray-500 mt-0.5">{desc}</p>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`w-11 h-6 rounded-full relative transition-all duration-300 shrink-0 ${value ? 'bg-[var(--success)]' : 'bg-gray-700'}`}
    >
      <motion.div
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow"
        animate={{ left: value ? '22px' : '2px' }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  </div>
);

const NumberField = ({ label, value, onChange, min = 0, max = 31, suffix }) => (
  <div>
    <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block mb-1.5">{label}</label>
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || 0)))}
        className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[var(--aurora-3)]"
      />
      {suffix && <span className="text-[10px] text-gray-500 font-bold uppercase shrink-0">{suffix}</span>}
    </div>
  </div>
);

const HybridWorkSettings = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState(DEFAULT_POLICY);
  const [tenantId, setTenantId] = useState(null);

  useEffect(() => {
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles')
        .select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
      if (!profile?.tenant_id) return;
      setTenantId(profile.tenant_id);

      const { data } = await supabase.from('work_mode_policies')
        .select('*').eq('tenant_id', profile.tenant_id).maybeSingle();
      if (data) {
        setPolicy({
          enable_wfh: data.enable_wfh ?? false,
          enable_wfa: data.enable_wfa ?? false,
          max_wfh_days_per_week: data.max_wfh_days_per_week ?? 2,
          max_wfa_days_per_month: data.max_wfa_days_per_month ?? 3,
          require_home_address: data.require_home_address ?? true,
          require_task_plan: data.require_task_plan ?? false,
          verification_method: data.verification_method || 'gps_selfie',
          random_check_frequency: data.random_check_frequency ?? 2,
          random_check_timeout_min: data.random_check_timeout_min ?? 5,
          wfh_hours_flexible: data.wfh_hours_flexible ?? true,
          wfh_core_start: data.wfh_core_start ? data.wfh_core_start.substring(0, 5) : '09:00',
          wfh_core_end: data.wfh_core_end ? data.wfh_core_end.substring(0, 5) : '15:00',
        });
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenantId,
        enable_wfh: policy.enable_wfh,
        enable_wfa: policy.enable_wfa,
        max_wfh_days_per_week: policy.max_wfh_days_per_week,
        max_wfa_days_per_month: policy.max_wfa_days_per_month,
        require_home_address: policy.require_home_address,
        require_task_plan: policy.require_task_plan,
        verification_method: policy.verification_method,
        random_check_frequency: policy.random_check_frequency,
        random_check_timeout_min: policy.random_check_timeout_min,
        wfh_hours_flexible: policy.wfh_hours_flexible,
        wfh_core_start: policy.wfh_core_start + ':00',
        wfh_core_end: policy.wfh_core_end + ':00',
      };
      const { error } = await supabase.from('work_mode_policies')
        .upsert(payload, { onConflict: 'tenant_id' });
      if (error) throw error;
      toast('Kebijakan hybrid work berhasil disimpan', 'success');
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
    <div className="space-y-6 max-w-4xl animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-serif font-bold text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--aurora-3)] to-[var(--success)] flex items-center justify-center">
            <Home size={20} className="text-black" />
          </div>
          Pengaturan Hybrid Work
        </h2>
        <p className="text-gray-400 text-sm mt-1 ml-[52px]">
          Atur kebijakan WFH / WFA / WFO untuk seluruh karyawan
        </p>
      </div>

      {/* Mode Activation */}
      <div className="glass-panel p-5 border border-white/5 rounded-2xl space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
          <ToggleRight size={16} className="text-[var(--aurora-3)]" /> Aktivasi Mode Kerja
        </h3>
        <Toggle
          value={policy.enable_wfh}
          onChange={v => setPolicy({ ...policy, enable_wfh: v })}
          label="Aktifkan WFH (Work From Home)"
          desc="Izinkan karyawan bekerja dari rumah"
        />
        <Toggle
          value={policy.enable_wfa}
          onChange={v => setPolicy({ ...policy, enable_wfa: v })}
          label="Aktifkan WFA (Work From Anywhere)"
          desc="Izinkan karyawan bekerja dari lokasi mana pun"
        />
      </div>

      {/* Limits */}
      <div className="glass-panel p-5 border border-white/5 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
          <RefreshCw size={16} className="text-[var(--aurora-3)]" /> Batasan & Frekuensi
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            label="Max WFH Hari/Minggu"
            value={policy.max_wfh_days_per_week}
            onChange={v => setPolicy({ ...policy, max_wfh_days_per_week: v })}
            min={0} max={7} suffix="hari"
          />
          <NumberField
            label="Max WFA Hari/Bulan"
            value={policy.max_wfa_days_per_month}
            onChange={v => setPolicy({ ...policy, max_wfa_days_per_month: v })}
            min={0} max={31} suffix="hari"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            label="Pemeriksaan Acak Per Shift"
            value={policy.random_check_frequency}
            onChange={v => setPolicy({ ...policy, random_check_frequency: v })}
            min={0} max={10} suffix="kali"
          />
          <NumberField
            label="Timeout Pemeriksaan (Menit)"
            value={policy.random_check_timeout_min}
            onChange={v => setPolicy({ ...policy, random_check_timeout_min: v })}
            min={1} max={60} suffix="menit"
          />
        </div>
      </div>

      {/* Core Hours & Verification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Core Hours */}
        <div className="glass-panel p-5 border border-white/5 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock size={16} className="text-[var(--aurora-3)]" /> Jam Kerja WFH
          </h3>
          <Toggle
            value={policy.wfh_hours_flexible}
            onChange={v => setPolicy({ ...policy, wfh_hours_flexible: v })}
            label="Jam Kerja Fleksibel"
            desc="Karyawan bisa atur jam sendiri di luar core hours"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block mb-1.5">Core Start</label>
              <input
                type="time"
                value={policy.wfh_core_start}
                onChange={e => setPolicy({ ...policy, wfh_core_start: e.target.value })}
                className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[var(--aurora-3)]"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block mb-1.5">Core End</label>
              <input
                type="time"
                value={policy.wfh_core_end}
                onChange={e => setPolicy({ ...policy, wfh_core_end: e.target.value })}
                className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[var(--aurora-3)]"
              />
            </div>
          </div>
        </div>

        {/* Verification */}
        <div className="glass-panel p-5 border border-white/5 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck size={16} className="text-[var(--aurora-3)]" /> Verifikasi & Persyaratan
          </h3>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block mb-1.5">Metode Verifikasi</label>
            <select
              value={policy.verification_method}
              onChange={e => setPolicy({ ...policy, verification_method: e.target.value })}
              className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[var(--aurora-3)]"
            >
              {VERIFICATION_OPTIONS.map(o => (
                <option key={o.value} value={o.value} className="bg-[#0B0C10]">{o.label}</option>
              ))}
            </select>
          </div>
          <Toggle
            value={policy.require_home_address}
            onChange={v => setPolicy({ ...policy, require_home_address: v })}
            label="Wajib Isi Alamat Rumah"
            desc="Karyawan harus daftar alamat untuk WFH"
          />
          <Toggle
            value={policy.require_task_plan}
            onChange={v => setPolicy({ ...policy, require_task_plan: v })}
            label="Wajib Rencana Tugas Harian"
            desc="Karyawan harus submit task plan setiap hari WFH"
          />
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[var(--aurora-3)] to-[var(--success)] text-black font-bold text-sm flex items-center justify-center gap-3 disabled:opacity-50 hover:opacity-90 transition-all shadow-[0_0_25px_rgba(0,201,255,0.2)]"
      >
        {saving ? <><Loader2 size={18} className="animate-spin" /> Menyimpan...</> : <><Save size={18} /> Simpan Kebijakan</>}
      </button>
    </div>
  );
};

export default HybridWorkSettings;
