import React, { useState } from 'react';
import { Save, AlertCircle } from 'lucide-react';

const PayrollSettings = () => {
  const [config, setConfig] = useState({
    bpjsKesehatan: 1, // 1% employee deduction
    bpjsKetenagakerjaan: 2, // 2% JHT employee deduction
    usePPh21: true,
    latePenalty: 15000, // IDR per hour
  });

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
        <button className="bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-2)] hover:from-[var(--aurora-2)] hover:to-[var(--aurora-3)] text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-all shadow-[0_0_20px_rgba(142,45,226,0.4)] hover:shadow-[0_0_30px_rgba(0,201,255,0.6)]">
          <Save size={18} /> Simpan Konfigurasi
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* BPJS Section */}
        <div className="space-y-6">
          <h3 className="font-serif text-lg text-white flex items-center gap-2 border-l-2 border-[var(--aurora-3)] pl-3">Potongan BPJS</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">BPJS Kesehatan (Karyawan %)</label>
              <input type="number" name="bpjsKesehatan" value={config.bpjsKesehatan} onChange={handleChange} className="w-full bg-[#1A1C23] border border-white/10 rounded-lg p-3 text-white light-bloom-input transition-all" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">BPJS Ketenagakerjaan JHT (Karyawan %)</label>
              <input type="number" name="bpjsKetenagakerjaan" value={config.bpjsKetenagakerjaan} onChange={handleChange} className="w-full bg-[#1A1C23] border border-white/10 rounded-lg p-3 text-white light-bloom-input transition-all" />
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
            <input type="checkbox" name="usePPh21" checked={config.usePPh21} onChange={handleChange} className="w-5 h-5 text-[var(--aurora-3)] rounded border-gray-600 bg-gray-700 focus:ring-[var(--aurora-3)] focus:ring-offset-gray-900" />
            <span className="text-sm font-medium text-gray-300">Aktifkan Perhitungan PPh 21 Otomatis</span>
          </label>
        </div>

        {/* Penalty Section */}
        <div className="space-y-6">
          <h3 className="font-serif text-lg text-white border-l-2 border-[var(--danger)] pl-3">Denda Kehadiran</h3>
          <div>
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Potongan per Jam Terlambat (Rp)</label>
            <input type="number" name="latePenalty" value={config.latePenalty} onChange={handleChange} className="w-full bg-[#1A1C23] border border-white/10 rounded-lg p-3 text-white light-bloom-input transition-all" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayrollSettings;
