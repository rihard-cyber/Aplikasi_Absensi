import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, Clock, Moon, Sun } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';

const PayrollSettings = () => {
  const [config, setConfig] = useState({
    bpjs_kesehatan: 1,
    bpjs_ketenagakerjaan: 2,
    use_pph21: true,
    overtime_rate_weekday: 1.5,
    overtime_rate_holiday: 2.0,
    night_shift_rate: 1.5,
    overtime_calculation: 'daily',
    bpjs_kesehatan_max: 12000000,
    bpjs_jht_max: 106584000,
    bpjs_jp_max: 106584000,
  });
  const [tenantId, setTenantId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToast();

  useEffect(() => { fetchConfig(); }, []);

  const fetchConfig = async () => {
    try {
      const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
      if (!profile?.tenant_id && !isGod) return;
      if (profile?.tenant_id) setTenantId(profile.tenant_id);
      const tid = profile?.tenant_id;

      let q = supabase.from('payroll_settings').select('*');
      if (tid) q = q.eq('tenant_id', tid);
      const { data } = await q.maybeSingle();
      if (data) {
        setConfig(prev => ({ ...prev, ...data }));
      }
      let q2 = supabase.from('tenant_settings').select('*');
      if (tid) q2 = q2.eq('tenant_id', tid);
      const { data: ts } = await q2.maybeSingle();
      if (ts) {
        setConfig(prev => ({ ...prev, late_penalty_fee: ts.late_penalty_fee || 0 }));
      }
    } catch (e) { console.error("Gagal menarik pengaturan payroll", e); }
  };

  const handleSave = async () => {
    if (!tenantId) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('payroll_settings').upsert({
        tenant_id: tenantId,
        bpjs_kesehatan: config.bpjs_kesehatan,
        bpjs_ketenagakerjaan: config.bpjs_ketenagakerjaan,
        use_pph21: config.use_pph21,
        overtime_rate_weekday: config.overtime_rate_weekday,
        overtime_rate_holiday: config.overtime_rate_holiday,
        night_shift_rate: config.night_shift_rate,
        overtime_calculation: config.overtime_calculation,
        bpjs_kesehatan_max: config.bpjs_kesehatan_max,
        bpjs_jht_max: config.bpjs_jht_max,
        bpjs_jp_max: config.bpjs_jp_max,
      }, { onConflict: 'tenant_id' });

      if (error) throw error;
      toast("Konfigurasi penggajian berhasil disimpan!", 'success');
    } catch (e) { toast("Gagal: " + e.message, 'error'); }
    finally { setIsSaving(false); }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : Number(value) }));
  };

  return (
    <div className="glass-panel p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-6 mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-wide">Pengaturan Payroll</h2>
          <p className="text-sm text-gray-400 mt-2">BPJS, PPh 21, lembur, dan rate perhitungan</p>
        </div>
        <button onClick={handleSave} disabled={isSaving} className="bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold text-xs tracking-widest uppercase transition-all shadow-lg hover:shadow-purple-500/30 disabled:opacity-50 whitespace-nowrap">
          <Save size={16} /> {isSaving ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-8">
          <div className="space-y-4">
            <h3 className="font-serif text-lg text-white flex items-center gap-2 border-l-2 border-[var(--aurora-3)] pl-3">Potongan BPJS</h3>
            <div>
              <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">BPJS Kesehatan (%)</label>
              <input type="number" name="bpjs_kesehatan" value={config.bpjs_kesehatan} onChange={handleChange} step="0.1"   className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-[#00C9FF]/30 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
              <p className="text-[9px] text-gray-600 mt-1">Max gaji untuk BPJS Kes: Rp {config.bpjs_kesehatan_max?.toLocaleString()}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">BPJS Ketenagakerjaan JHT (%)</label>
              <input type="number" name="bpjs_ketenagakerjaan" value={config.bpjs_ketenagakerjaan} onChange={handleChange} step="0.1"   className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-[#00C9FF]/30 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Max BPJS Kesehatan</label>
                <input type="number" name="bpjs_kesehatan_max" value={config.bpjs_kesehatan_max} onChange={handleChange}   className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white text-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-[#00C9FF]/30 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Max BPJS JHT/JP</label>
                <input type="number" name="bpjs_jht_max" value={config.bpjs_jht_max} onChange={handleChange}   className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white text-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-[#00C9FF]/30 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-serif text-lg text-white flex items-center gap-2 border-l-2 border-[var(--aurora-1)] pl-3">PPh 21</h3>
            <div className="bg-[var(--aurora-2)]/10 border border-[var(--aurora-2)]/30 p-4 rounded-xl flex gap-3 items-start">
              <AlertCircle size={20} className="mt-0.5 shrink-0 text-[var(--aurora-3)]" />
              <p className="text-sm text-gray-300 leading-relaxed">TER (Tarif Efektif Rata-Rata) dihitung otomatis berdasarkan PTKP dan penghasilan bruto setahun.</p>
            </div>
            <label className="flex items-center gap-4 cursor-pointer p-3 rounded-xl border border-white/5 hover:bg-white/5 transition-colors">
              <input type="checkbox" name="use_pph21" checked={config.use_pph21} onChange={handleChange} className="w-5 h-5" />
              <span className="text-sm font-medium text-gray-300">Aktifkan Perhitungan PPh 21 Otomatis</span>
            </label>
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <h3 className="font-serif text-lg text-white flex items-center gap-2 border-l-2 border-[var(--warning)] pl-3"><Clock size={18} /> Rate Lembur & Shift</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Lembur Hari Kerja (x)</label>
                <input type="number" name="overtime_rate_weekday" value={config.overtime_rate_weekday} onChange={handleChange} step="0.1"   className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white outline-none focus:border-[var(--warning)] placeholder:text-gray-400 focus:ring-2 focus:ring-[#00C9FF]/30 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Lembur Hari Libur (x)</label>
                <input type="number" name="overtime_rate_holiday" value={config.overtime_rate_holiday} onChange={handleChange} step="0.1"   className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white outline-none focus:border-[var(--warning)] placeholder:text-gray-400 focus:ring-2 focus:ring-[#00C9FF]/30 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider"><Moon size={12} /> Shift Malam (x)</label>
                <input type="number" name="night_shift_rate" value={config.night_shift_rate} onChange={handleChange} step="0.1"   className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white outline-none focus:border-[var(--warning)] placeholder:text-gray-400 focus:ring-2 focus:ring-[#00C9FF]/30 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Metode Lembur</label>
                <select name="overtime_calculation" value={config.overtime_calculation} onChange={handleChange}  className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-[#00C9FF]/30 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" >
                  <option value="daily">Harian</option>
                  <option value="weekly">Mingguan</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-serif text-lg text-white flex items-center gap-2 border-l-2 border-[var(--danger)] pl-3">Denda & Penalti</h3>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Denda Terlambat (Rp/jam)</label>
              <input type="number" name="late_penalty_fee" value={config.late_penalty_fee || 0} onChange={handleChange}   className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white outline-none focus:border-[var(--danger)] placeholder:text-gray-400 focus:ring-2 focus:ring-[#00C9FF]/30 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayrollSettings;
