import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Home, Clock, ShieldCheck, Save, Loader2, ToggleRight, RefreshCw
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  { value: 'gps_selfie', labelKey: 'hybridSettings.gpsSelfie' },
  { value: 'selfie_only', labelKey: 'hybridSettings.selfieOnly' },
  { value: 'random_check', labelKey: 'hybridSettings.randomCheckOption' },
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
        className="w-full bg-[#0B0C10] border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm outline-none placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
      {suffix && <span className="text-[10px] text-gray-500 font-bold uppercase shrink-0">{suffix}</span>}
    </div>
  </div>
);

const HybridWorkSettings = () => {
  const { t } = useTranslation();
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
      toast(t('hybridSettings.saveSuccess'), 'success');
    } catch (e) {
      toast(t('hybridSettings.saveFail') + (e.message || e), 'error');
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
          {t('hybridSettings.title')}
        </h2>
        <p className="text-gray-400 text-sm mt-1 ml-[52px]">
          {t('hybridSettings.subtitle')}
        </p>
      </div>

      {/* Mode Activation */}
      <div className="glass-panel p-5 border border-white/5 rounded-2xl space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
          <ToggleRight size={16} className="text-[var(--aurora-3)]" /> {t('hybridSettings.modeActivation')}
        </h3>
        <Toggle
          value={policy.enable_wfh}
          onChange={v => setPolicy({ ...policy, enable_wfh: v })}
          label={t('hybridSettings.enableWfh')}
          desc={t('hybridSettings.enableWfhDesc')}
        />
        <Toggle
          value={policy.enable_wfa}
          onChange={v => setPolicy({ ...policy, enable_wfa: v })}
          label={t('hybridSettings.enableWfa')}
          desc={t('hybridSettings.enableWfaDesc')}
        />
      </div>

      {/* Limits */}
      <div className="glass-panel p-5 border border-white/5 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
          <RefreshCw size={16} className="text-[var(--aurora-3)]" /> {t('hybridSettings.limits')}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            label={t('hybridSettings.maxWfh')}
            value={policy.max_wfh_days_per_week}
            onChange={v => setPolicy({ ...policy, max_wfh_days_per_week: v })}
            min={0} max={7} suffix={t('hybridSettings.daysSuffix')}
          />
          <NumberField
            label={t('hybridSettings.maxWfa')}
            value={policy.max_wfa_days_per_month}
            onChange={v => setPolicy({ ...policy, max_wfa_days_per_month: v })}
            min={0} max={31} suffix={t('hybridSettings.daysSuffix')}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            label={t('hybridSettings.randomCheck')}
            value={policy.random_check_frequency}
            onChange={v => setPolicy({ ...policy, random_check_frequency: v })}
            min={0} max={10} suffix={t('hybridSettings.timesSuffix')}
          />
          <NumberField
            label={t('hybridSettings.randomCheckTimeout')}
            value={policy.random_check_timeout_min}
            onChange={v => setPolicy({ ...policy, random_check_timeout_min: v })}
            min={1} max={60} suffix={t('hybridSettings.minutesSuffix')}
          />
        </div>
      </div>

      {/* Core Hours & Verification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Core Hours */}
        <div className="glass-panel p-5 border border-white/5 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock size={16} className="text-[var(--aurora-3)]" /> {t('hybridSettings.wfhHours')}
          </h3>
          <Toggle
            value={policy.wfh_hours_flexible}
            onChange={v => setPolicy({ ...policy, wfh_hours_flexible: v })}
            label={t('hybridSettings.flexibleHours')}
            desc={t('hybridSettings.flexibleHoursDesc')}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block mb-1.5">{t('hybridSettings.coreStart')}</label>
              <input
                type="time"
                value={policy.wfh_core_start}
                onChange={e => setPolicy({ ...policy, wfh_core_start: e.target.value })}
                className="w-full bg-[#0B0C10] border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm outline-none placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block mb-1.5">{t('hybridSettings.coreEnd')}</label>
              <input
                type="time"
                value={policy.wfh_core_end}
                onChange={e => setPolicy({ ...policy, wfh_core_end: e.target.value })}
                className="w-full bg-[#0B0C10] border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm outline-none placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
            </div>
          </div>
        </div>

        {/* Verification */}
        <div className="glass-panel p-5 border border-white/5 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck size={16} className="text-[var(--aurora-3)]" /> {t('hybridSettings.verification')}
          </h3>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block mb-1.5">{t('hybridSettings.verificationMethod')}</label>
            <select
              value={policy.verification_method}
              onChange={e => setPolicy({ ...policy, verification_method: e.target.value })}
              className="w-full bg-[#0B0C10] border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm outline-none placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" >
              {VERIFICATION_OPTIONS.map(o => (
                <option key={o.value} value={o.value} className="bg-[#0B0C10]">{t(o.labelKey)}</option>
              ))}
            </select>
          </div>
          <Toggle
            value={policy.require_home_address}
            onChange={v => setPolicy({ ...policy, require_home_address: v })}
            label={t('hybridSettings.requireHomeAddress')}
            desc={t('hybridSettings.requireHomeAddressDesc')}
          />
          <Toggle
            value={policy.require_task_plan}
            onChange={v => setPolicy({ ...policy, require_task_plan: v })}
            label={t('hybridSettings.requireTaskPlan')}
            desc={t('hybridSettings.requireTaskPlanDesc')}
          />
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[var(--aurora-3)] to-[var(--success)] text-black font-bold text-sm flex items-center justify-center gap-3 disabled:opacity-50 hover:opacity-90 transition-all shadow-[0_0_25px_rgba(0,201,255,0.2)]"
      >
        {saving ? <><Loader2 size={18} className="animate-spin" /> {t('hybridSettings.saving')}</> : <><Save size={18} /> {t('hybridSettings.savePolicy')}</>}
      </button>
    </div>
  );
};

export default HybridWorkSettings;
