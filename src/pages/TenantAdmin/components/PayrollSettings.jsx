import React, { useState, useEffect } from 'react';
import { Save, AlertCircle } from 'lucide-react';

import { supabase } from '../../../utils/supabaseClient';

const PayrollSettings = () => {
  const [config, setConfig] = useState({
    bpjs_kesehatan: 1,
    bpjs_ketenagakerjaan: 2,
    use_pph21: true
  });
  const [tenantId, setTenantId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).single();
      if (!profile?.tenant_id) return;
      setTenantId(profile.tenant_id);

      const { data } = await supabase.from('payroll_settings').select('*').eq('tenant_id', profile.tenant_id).maybeSingle();
      if (data) {
        setConfig({
          bpjs_kesehatan: data.bpjs_kesehatan,
          bpjs_ketenagakerjaan: data.bpjs_ketenagakerjaan,
          use_pph21: data.use_pph21
        });
      }
    } catch (e) {
      console.error("Gagal menarik pengaturan payroll", e);
    }
  };

  const handleSave = async () => {
    if (!tenantId) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('payroll_settings').upsert({
        tenant_id: tenantId,
        bpjs_kesehatan: config.bpjs_kesehatan,
        bpjs_ketenagakerjaan: config.bpjs_ketenagakerjaan,
        use_pph21: config.use_pph21
      }, { onConflict: 'tenant_id' });
      
      if (error) throw error;
      alert("Konfigurasi penggajian berhasil disimpan!");
    } catch (e) {
      alert("Gagal menyimpan konfigurasi: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : Number(value)
    }));
  };

  return (
    <div className="glass-panel p-8">
      <div className="border-b border-white/10 pb-6 mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-serif font-bold text-white tracking-wide">Konfigurasi Ekspor Penggajian Pintar</h2>
          <p className="text-sm text-gray-400 mt-2 font-sans tracking-wide">Atur potongan pajak (PPh 21) dan BPJS untuk perhitungan gaji otomatis.</p>
        </div>
        <button onClick={handleSave} disabled={isSaving} className="bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-2)] hover:from-[var(--aurora-2)] hover:to-[var(--aurora-3)] text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-all shadow-[0_0_20px_rgba(142,45,226,0.4)] hover:shadow-[0_0_30px_rgba(0,201,255,0.6)] disabled:opacity-50">
          <Save size={18} /> {isSaving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* BPJS Section */}
        <div className="space-y-6">
          <h3 className="font-serif text-lg text-white flex items-center gap-2 border-l-2 border-[var(--aurora-3)] pl-3">Potongan BPJS</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">BPJS Kesehatan (Karyawan %)</label>
              <input type="number" name="bpjs_kesehatan" value={config.bpjs_kesehatan} onChange={handleChange} className="w-full bg-[#1A1C23] border border-white/10 rounded-lg p-3 text-white light-bloom-input transition-all" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">BPJS Ketenagakerjaan JHT (Karyawan %)</label>
              <input type="number" name="bpjs_ketenagakerjaan" value={config.bpjs_ketenagakerjaan} onChange={handleChange} className="w-full bg-[#1A1C23] border border-white/10 rounded-lg p-3 text-white light-bloom-input transition-all" />
            </div>
          </div>
        </div>

        {/* Tax Section */}
        <div className="space-y-6">
          <h3 className="font-serif text-lg text-white border-l-2 border-[var(--aurora-1)] pl-3">PPh 21 (Pajak Penghasilan)</h3>
          <div className="bg-[var(--aurora-2)]/10 border border-[var(--aurora-2)]/30 text-blue-200 p-4 rounded-xl flex gap-3 items-start shadow-[0_0_15px_rgba(74,0,224,0.1)]">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-[var(--aurora-3)]" />
            <p className="text-sm font-sans tracking-wide leading-relaxed">TER (Tarif Efektif Rata-Rata) akan diterapkan secara otomatis berdasarkan status PTKP karyawan yang terdaftar di profil mereka.</p>
          </div>
          <label className="flex items-center gap-4 cursor-pointer mt-4 p-3 rounded-xl border border-white/5 hover:bg-white/5 transition-colors">
            <input type="checkbox" name="use_pph21" checked={config.use_pph21} onChange={handleChange} className="w-5 h-5 text-[var(--aurora-3)] rounded border-gray-600 bg-gray-700 focus:ring-[var(--aurora-3)] focus:ring-offset-gray-900" />
            <span className="text-sm font-medium text-gray-300">Aktifkan Perhitungan PPh 21 Otomatis</span>
          </label>
        </div>


      </div>
    </div>
  );
};

export default PayrollSettings;
