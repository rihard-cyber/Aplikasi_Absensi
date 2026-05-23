/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator, Shield, Heart, ChevronDown, ChevronUp,
  RefreshCw, Download, Info, CheckCircle2, Users, Building2
} from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';

/**
 * BPJSCalculator — Kalkulator Iuran BPJS 2024
 * 
 * Menghitung iuran BPJS Ketenagakerjaan & Kesehatan berdasarkan:
 * - Upah/Gaji Pokok karyawan
 * - Peraturan terbaru 2024 (PP No. 44/2015 & PP No. 82/2013)
 * 
 * Dapat menghitung untuk 1 karyawan atau seluruh tim.
 */

// ─── TARIF BPJS 2024 ────────────────────────────────────────────────────────
const BPJS_RATES = {
  ketenagakerjaan: {
    jkk: { employee: 0, employer_rates: [0.24, 0.54, 0.89, 1.27, 1.74], default_rate: 0.24, label: 'JKK (Jaminan Kecelakaan Kerja)' },
    jkm: { employee: 0, employer: 0.3, label: 'JKM (Jaminan Kematian)' },
    jht: { employee: 2.0, employer: 3.7, label: 'JHT (Jaminan Hari Tua)' },
    jp:  { employee: 1.0, employer: 2.0, label: 'JP (Jaminan Pensiun)', max_wage: 9559600 },
  },
  kesehatan: {
    bpjskes: { employee: 1.0, employer: 4.0, label: 'BPJS Kesehatan', max_wage: 12000000 },
  }
};

const RISK_LEVELS = [
  { label: 'Sangat Rendah (0.24%)', value: 0 },
  { label: 'Rendah (0.54%)', value: 1 },
  { label: 'Sedang (0.89%)', value: 2 },
  { label: 'Tinggi (1.27%)', value: 3 },
  { label: 'Sangat Tinggi (1.74%)', value: 4 },
];

const fmt = (n) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const pct = (p) => p.toFixed(2) + '%';

const calcBPJS = (wage, jkkRiskLevel = 0) => {
  const r = BPJS_RATES;
  const wageKes = Math.min(wage, r.kesehatan.bpjskes.max_wage);
  const wageJP = Math.min(wage, r.ketenagakerjaan.jp.max_wage);
  const jkkRate = r.ketenagakerjaan.jkk.employer_rates[jkkRiskLevel];

  return {
    jkk:    { emp: 0, erl: wage * jkkRate / 100, rate_emp: 0, rate_erl: jkkRate },
    jkm:    { emp: 0, erl: wage * r.ketenagakerjaan.jkm.employer / 100, rate_emp: 0, rate_erl: r.ketenagakerjaan.jkm.employer },
    jht:    { emp: wage * r.ketenagakerjaan.jht.employee / 100, erl: wage * r.ketenagakerjaan.jht.employer / 100, rate_emp: r.ketenagakerjaan.jht.employee, rate_erl: r.ketenagakerjaan.jht.employer },
    jp:     { emp: wageJP * r.ketenagakerjaan.jp.employee / 100, erl: wageJP * r.ketenagakerjaan.jp.employer / 100, rate_emp: r.ketenagakerjaan.jp.employee, rate_erl: r.ketenagakerjaan.jp.employer, capped: wage > wageJP },
    bpjskes:{ emp: wageKes * r.kesehatan.bpjskes.employee / 100, erl: wageKes * r.kesehatan.bpjskes.employer / 100, rate_emp: r.kesehatan.bpjskes.employee, rate_erl: r.kesehatan.bpjskes.employer, capped: wage > wageKes },
  };
};

// Row component
const Row = ({ label, emp, erl, ratEmp, ratErl, capped }) => (
  <tr className="border-b border-white/5 hover:bg-white/3 transition-colors">
    <td className="px-4 py-3 text-xs text-gray-300">{label}</td>
    <td className="px-4 py-3 text-xs text-center text-gray-500">{pct(ratEmp)}</td>
    <td className="px-4 py-3 text-xs text-right font-mono text-[var(--aurora-3)]">{fmt(emp)}</td>
    <td className="px-4 py-3 text-xs text-center text-gray-500">{pct(ratErl)}</td>
    <td className="px-4 py-3 text-xs text-right font-mono text-[var(--aurora-1)]">{fmt(erl)}</td>
    {capped && <td className="px-4 py-3"><span className="text-[8px] bg-[var(--warning)]/20 text-[var(--warning)] px-1.5 py-0.5 rounded font-bold">Max</span></td>}
  </tr>
);

const BPJSCalculator = () => {
  const [mode, setMode] = useState('single'); // single | bulk
  const [wage, setWage] = useState(5000000);
  const [wageInput, setWageInput] = useState('5000000');
  const [jkkLevel, setJkkLevel] = useState(0);
  const [result, setResult] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [bulkResults, setBulkResults] = useState([]);
  const [loadingEmps, setLoadingEmps] = useState(false);
  const [expandedEmp, setExpandedEmp] = useState(null);

  useEffect(() => {
    // Auto calculate on wage/jkk change
    const parsed = parseInt(wageInput.replace(/\D/g, '')) || 0;
    setWage(parsed);
    if (parsed > 0) setResult(calcBPJS(parsed, jkkLevel));
  }, [wageInput, jkkLevel]);

  const loadEmployees = async () => {
    setLoadingEmps(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
      let q = supabase.from('profiles').select('id, full_name, nip, position, basic_salary').in('role', ['EMPLOYEE', 'SUB_ADMIN']);
      if (profile?.tenant_id) q = q.eq('tenant_id', profile.tenant_id);
      const { data: emps } = await q;
      const withCalc = (emps || []).map(e => ({
        ...e,
        salary: e.basic_salary || 0,
        bpjs: e.basic_salary ? calcBPJS(e.basic_salary, jkkLevel) : null,
      }));
      setEmployees(withCalc);
      setBulkResults(withCalc);
    } catch (e) { console.error(e); }
    setLoadingEmps(false);
  };

  useEffect(() => {
    if (mode === 'bulk') loadEmployees();
  }, [mode]);

  const totalBulk = bulkResults.reduce((acc, e) => {
    if (!e.bpjs) return acc;
    const keys = ['jkk', 'jkm', 'jht', 'jp', 'bpjskes'];
    keys.forEach(k => {
      acc.emp += e.bpjs[k].emp;
      acc.erl += e.bpjs[k].erl;
    });
    return acc;
  }, { emp: 0, erl: 0 });

  const exportCSV = () => {
    if (mode === 'single' && result) {
      const rows = [
        ['Komponen', 'Tarif Karyawan (%)', 'Potongan Karyawan (Rp)', 'Tarif Perusahaan (%)', 'Kontribusi Perusahaan (Rp)'],
        ['JKK', 0, 0, BPJS_RATES.ketenagakerjaan.jkk.employer_rates[jkkLevel], result.jkk.erl],
        ['JKM', 0, 0, BPJS_RATES.ketenagakerjaan.jkm.employer, result.jkm.erl],
        ['JHT', BPJS_RATES.ketenagakerjaan.jht.employee, result.jht.emp, BPJS_RATES.ketenagakerjaan.jht.employer, result.jht.erl],
        ['JP', BPJS_RATES.ketenagakerjaan.jp.employee, result.jp.emp, BPJS_RATES.ketenagakerjaan.jp.employer, result.jp.erl],
        ['BPJS Kesehatan', BPJS_RATES.kesehatan.bpjskes.employee, result.bpjskes.emp, BPJS_RATES.kesehatan.bpjskes.employer, result.bpjskes.erl],
      ];
      const csv = rows.map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'bpjs_calculation.csv'; a.click();
    } else {
      const rows = [['Nama', 'NIP', 'Gaji', 'Potongan Karyawan', 'Kontribusi Perusahaan', 'Total']];
      bulkResults.forEach(e => {
        if (!e.bpjs) return;
        const emp = ['jkk','jkm','jht','jp','bpjskes'].reduce((s, k) => s + e.bpjs[k].emp, 0);
        const erl = ['jkk','jkm','jht','jp','bpjskes'].reduce((s, k) => s + e.bpjs[k].erl, 0);
        rows.push([e.full_name, e.nip, e.salary, Math.round(emp), Math.round(erl), Math.round(emp + erl)]);
      });
      const csv = rows.map(r => r.join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'bpjs_bulk.csv'; a.click();
    }
  };

  const r = result;
  const totalEmp = r ? Object.values(r).reduce((s, v) => s + v.emp, 0) : 0;
  const totalErl = r ? Object.values(r).reduce((s, v) => s + v.erl, 0) : 0;

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--success)] to-[#00C9FF] flex items-center justify-center">
              <Shield size={20} className="text-black" />
            </div>
            Kalkulator BPJS 2024
          </h2>
          <p className="text-gray-400 text-sm mt-1 ml-[52px]">Hitung iuran BPJS Ketenagakerjaan & Kesehatan otomatis</p>
        </div>
        <div className="flex gap-2">
          {['single', 'bulk'].map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all ${mode === m ? 'bg-[var(--success)]/20 border-[var(--success)]/40 text-[var(--success)]' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'}`}>
              {m === 'single' ? '1 Karyawan' : 'Massal'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'single' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Panel */}
          <div className="lg:col-span-1 space-y-4">
            <div className="glass-panel p-5 border border-white/5 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white">Parameter Kalkulasi</h3>

              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block mb-2">Gaji / Upah Pokok</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold">Rp</span>
                  <input
                    type="text"
                    value={wageInput}
                    onChange={e => setWageInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#0B0C10] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white font-mono text-sm outline-none focus:border-[var(--success)]"
                    placeholder="5000000"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {[3000000, 5000000, 8000000, 12000000].map(v => (
                    <button key={v} onClick={() => setWageInput(String(v))}
                      className={`flex-1 py-1 rounded-lg text-[9px] font-bold border transition-all ${wage === v ? 'bg-[var(--success)]/20 border-[var(--success)]/40 text-[var(--success)]' : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'}`}>
                      {v >= 1000000 ? `${v / 1000000}jt` : v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block mb-2">Tingkat Risiko Pekerjaan (JKK)</label>
                <select value={jkkLevel} onChange={e => setJkkLevel(parseInt(e.target.value))}
                  className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--success)]">
                  {RISK_LEVELS.map((r, i) => <option key={i} value={i} className="bg-[#0B0C10]">{r.label}</option>)}
                </select>
              </div>

              {/* Info box */}
              <div className="p-3 bg-[var(--aurora-3)]/5 border border-[var(--aurora-3)]/20 rounded-xl">
                <div className="flex items-start gap-2">
                  <Info size={12} className="text-[var(--aurora-3)] flex-shrink-0 mt-0.5" />
                  <p className="text-[9px] text-gray-400 leading-relaxed">
                    JP max upah: <strong className="text-white">Rp 9.559.600</strong><br />
                    BPJS Kes max upah: <strong className="text-white">Rp 12.000.000</strong><br />
                    Berdasarkan PP 44/2015 & PP 82/2013
                  </p>
                </div>
              </div>
            </div>

            {/* Summary cards */}
            {r && (
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-panel p-4 rounded-2xl border border-[var(--aurora-3)]/20 text-center">
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Potongan Gaji</p>
                  <p className="text-lg font-black text-[var(--aurora-3)]">{fmt(totalEmp)}</p>
                </div>
                <div className="glass-panel p-4 rounded-2xl border border-[var(--aurora-1)]/20 text-center">
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Beban Perusahaan</p>
                  <p className="text-lg font-black text-[var(--aurora-1)]">{fmt(totalErl)}</p>
                </div>
                <div className="col-span-2 glass-panel p-4 rounded-2xl border border-[var(--success)]/20 text-center">
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Total BPJS per Bulan</p>
                  <p className="text-xl font-black text-[var(--success)]">{fmt(totalEmp + totalErl)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Result Table */}
          <div className="lg:col-span-2">
            {r ? (
              <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
                <div className="p-5 border-b border-white/10 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Calculator size={16} className="text-[var(--success)]" />
                    Rincian Iuran — {fmt(wage)} / bulan
                  </h3>
                  <button onClick={exportCSV} className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-all">
                    <Download size={12} /> CSV
                  </button>
                </div>

                {/* Ketenagakerjaan */}
                <div className="p-4 bg-[var(--aurora-1)]/5 border-b border-white/5">
                  <p className="text-[9px] font-bold text-[var(--aurora-1)] uppercase tracking-widest flex items-center gap-1">
                    <Shield size={10} /> BPJS Ketenagakerjaan
                  </p>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-4 py-2 text-left text-[9px] text-gray-500 uppercase tracking-widest">Komponen</th>
                      <th className="px-4 py-2 text-center text-[9px] text-[var(--aurora-3)] uppercase tracking-widest">% Pegawai</th>
                      <th className="px-4 py-2 text-right text-[9px] text-[var(--aurora-3)] uppercase tracking-widest">Potongan</th>
                      <th className="px-4 py-2 text-center text-[9px] text-[var(--aurora-1)] uppercase tracking-widest">% Perusahaan</th>
                      <th className="px-4 py-2 text-right text-[9px] text-[var(--aurora-1)] uppercase tracking-widest">Kontribusi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <Row label="JKK (Kecelakaan Kerja)" emp={r.jkk.emp} erl={r.jkk.erl} ratEmp={0} ratErl={r.jkk.rate_erl} />
                    <Row label="JKM (Kematian)" emp={r.jkm.emp} erl={r.jkm.erl} ratEmp={0} ratErl={r.jkm.rate_erl} />
                    <Row label="JHT (Hari Tua)" emp={r.jht.emp} erl={r.jht.erl} ratEmp={r.jht.rate_emp} ratErl={r.jht.rate_erl} />
                    <Row label={`JP (Pensiun)${r.jp.capped ? ' *' : ''}`} emp={r.jp.emp} erl={r.jp.erl} ratEmp={r.jp.rate_emp} ratErl={r.jp.rate_erl} capped={r.jp.capped} />
                  </tbody>
                </table>

                {/* Kesehatan */}
                <div className="p-4 bg-[var(--success)]/5 border-y border-white/5">
                  <p className="text-[9px] font-bold text-[var(--success)] uppercase tracking-widest flex items-center gap-1">
                    <Heart size={10} /> BPJS Kesehatan
                  </p>
                </div>
                <table className="w-full">
                  <tbody>
                    <Row label={`BPJS Kesehatan${r.bpjskes.capped ? ' *' : ''}`} emp={r.bpjskes.emp} erl={r.bpjskes.erl} ratEmp={r.bpjskes.rate_emp} ratErl={r.bpjskes.rate_erl} capped={r.bpjskes.capped} />
                  </tbody>
                </table>

                {/* Total Row */}
                <div className="p-4 bg-white/5 border-t border-white/10 flex justify-between items-center">
                  <span className="text-sm font-bold text-white">TOTAL</span>
                  <div className="flex gap-6">
                    <div className="text-right">
                      <p className="text-[9px] text-gray-500">Potongan Karyawan</p>
                      <p className="text-sm font-black font-mono text-[var(--aurora-3)]">{fmt(totalEmp)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-gray-500">Beban Perusahaan</p>
                      <p className="text-sm font-black font-mono text-[var(--aurora-1)]">{fmt(totalErl)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-gray-500">Grand Total</p>
                      <p className="text-sm font-black font-mono text-[var(--success)]">{fmt(totalEmp + totalErl)}</p>
                    </div>
                  </div>
                </div>

                {(r.jp.capped || r.bpjskes.capped) && (
                  <p className="px-4 pb-3 text-[9px] text-gray-500">* Menggunakan upah maksimum yang diatur oleh regulasi</p>
                )}
              </div>
            ) : (
              <div className="glass-panel p-10 rounded-2xl border border-white/5 text-center">
                <Calculator size={48} className="text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">Masukkan gaji untuk melihat kalkulasi BPJS</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* BULK MODE */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Users size={16} />
              <span>{employees.length} karyawan • {employees.filter(e => e.salary > 0).length} dengan data gaji</span>
            </div>
            <div className="flex gap-2">
              <button onClick={loadEmployees} disabled={loadingEmps}
                className="px-3 py-2 text-xs flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:border-white/20 transition-all">
                <RefreshCw size={12} className={loadingEmps ? 'animate-spin' : ''} /> Refresh
              </button>
              <button onClick={exportCSV} className="px-3 py-2 text-xs flex items-center gap-2 bg-[var(--success)]/10 border border-[var(--success)]/30 rounded-xl text-[var(--success)] hover:bg-[var(--success)]/20 transition-all">
                <Download size={12} /> Export CSV
              </button>
            </div>
          </div>

          {/* Bulk Summary */}
          {bulkResults.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total Potongan Karyawan', value: fmt(totalBulk.emp), color: 'var(--aurora-3)' },
                { label: 'Total Beban Perusahaan', value: fmt(totalBulk.erl), color: 'var(--aurora-1)' },
                { label: 'Grand Total BPJS/Bulan', value: fmt(totalBulk.emp + totalBulk.erl), color: 'var(--success)' },
              ].map(item => (
                <div key={item.label} className="glass-panel p-4 rounded-2xl border border-white/5 text-center">
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">{item.label}</p>
                  <p className="text-sm font-black" style={{ color: item.color }}>{item.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Employee List */}
          <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-white/10">
                <tr>
                  {['Karyawan', 'Gaji Pokok', 'Potongan Karyawan', 'Beban Perusahaan', 'Total', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[9px] text-gray-500 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {bulkResults.map((emp) => {
                  const empTotal = emp.bpjs ? Object.values(emp.bpjs).reduce((s, v) => s + v.emp, 0) : 0;
                  const erlTotal = emp.bpjs ? Object.values(emp.bpjs).reduce((s, v) => s + v.erl, 0) : 0;
                  return (
                    <React.Fragment key={emp.id}>
                      <tr className="hover:bg-white/3 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-xs font-bold text-white">{emp.full_name}</p>
                          <p className="text-[9px] text-gray-500">{emp.nip}</p>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-300">{emp.salary ? fmt(emp.salary) : <span className="text-gray-600">N/A</span>}</td>
                        <td className="px-4 py-3 text-xs font-mono text-[var(--aurora-3)]">{emp.bpjs ? fmt(empTotal) : '-'}</td>
                        <td className="px-4 py-3 text-xs font-mono text-[var(--aurora-1)]">{emp.bpjs ? fmt(erlTotal) : '-'}</td>
                        <td className="px-4 py-3 text-xs font-mono text-[var(--success)] font-bold">{emp.bpjs ? fmt(empTotal + erlTotal) : '-'}</td>
                        <td className="px-4 py-3">
                          {emp.bpjs && (
                            <button onClick={() => setExpandedEmp(expandedEmp === emp.id ? null : emp.id)}
                              className="text-gray-500 hover:text-white transition-colors">
                              {expandedEmp === emp.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          )}
                        </td>
                      </tr>
                      {expandedEmp === emp.id && emp.bpjs && (
                        <tr>
                          <td colSpan={6} className="px-4 pb-3 bg-white/3">
                            <div className="grid grid-cols-5 gap-2 text-[9px] text-gray-400 p-3 bg-white/5 rounded-xl">
                              {[
                                ['JKK', emp.bpjs.jkk.emp, emp.bpjs.jkk.erl],
                                ['JKM', emp.bpjs.jkm.emp, emp.bpjs.jkm.erl],
                                ['JHT', emp.bpjs.jht.emp, emp.bpjs.jht.erl],
                                ['JP', emp.bpjs.jp.emp, emp.bpjs.jp.erl],
                                ['Kesehatan', emp.bpjs.bpjskes.emp, emp.bpjs.bpjskes.erl],
                              ].map(([k, e, r]) => (
                                <div key={k} className="text-center">
                                  <p className="font-bold text-white mb-1">{k}</p>
                                  <p className="text-[var(--aurora-3)]">{fmt(e)}</p>
                                  <p className="text-[var(--aurora-1)]">{fmt(r)}</p>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            {bulkResults.length === 0 && !loadingEmps && (
              <div className="p-10 text-center">
                <Users size={40} className="text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Belum ada data karyawan dengan informasi gaji</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BPJSCalculator;
