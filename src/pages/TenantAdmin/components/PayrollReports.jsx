import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, BarChart3, DollarSign, Users, CalendarDays, FileText, Loader2 } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

const PayrollReports = () => {
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [summaries, setSummaries] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => { fetchPeriods(); }, []);

  const fetchPeriods = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: p } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!p?.tenant_id) return;

    const { data: pers } = await supabase.from('payroll_periods').select('*').eq('tenant_id', p.tenant_id).in('status', ['LOCKED', 'PAID']).order('period_year', { ascending: false }).order('period_month', { ascending: false });
    if (pers) setPeriods(pers);
  };

  const loadPeriod = async (periodId) => {
    setLoading(true);
    const p = periods.find(x => x.id === periodId);
    setSelectedPeriod(p);
    if (!p) { setLoading(false); return; }

    const { data: sum } = await supabase.from('payroll_summary').select('*, profiles!inner(full_name, nip, position)').eq('period_id', periodId);
    setSummaries(sum || []);

    const { data: res } = await supabase.from('payroll_results').select('*').eq('period_id', periodId);
    setResults(res || []);
    setLoading(false);
  };

  const totalTakeHome = summaries.reduce((s, r) => s + Number(r.take_home_pay), 0);
  const totalAllowance = summaries.reduce((s, r) => s + Number(r.total_allowance), 0);
  const totalDeduction = summaries.reduce((s, r) => s + Number(r.total_deduction), 0);

  const componentSummary = {};
  (results || []).forEach(r => {
    const key = r.component_code || r.component_name;
    if (!componentSummary[key]) componentSummary[key] = { name: r.component_name, code: r.component_code, type: r.component_type, total: 0, count: 0 };
    componentSummary[key].total += Number(r.amount);
    componentSummary[key].count += 1;
  });

  const handleDownloadCSV = () => {
    if (!summaries.length) return;
    const lines = [
      'No,Nama,NIP,Posisi,Total Tunjangan,Total Potongan,Take Home Pay,Hari Kerja,Terlambat (menit)',
      ...summaries.map((s, i) => `${i+1},"${s.profiles?.full_name}",${s.profiles?.nip},"${s.profiles?.position}",${s.total_allowance},${s.total_deduction},${s.take_home_pay},${s.total_days_worked},${s.total_late_minutes}`),
      '',
      `Total,"${summaries.length} karyawan",,,,,${totalAllowance},${totalDeduction},${totalTakeHome}`
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Payroll_Report_${selectedPeriod?.period_month}_${selectedPeriod?.period_year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Laporan diunduh', 'success');
  };

  return (
    <div className="glass-panel p-8">
      <div className="flex justify-between items-center border-b border-white/10 pb-6 mb-8">
        <div>
          <h2 className="text-2xl font-serif font-bold text-white">Laporan Payroll</h2>
          <p className="text-sm text-gray-400 mt-1">Rekap payroll per periode, komponen, dan karyawan</p>
        </div>
        <div className="flex gap-3">
          <select value={selectedPeriod?.id || ''} onChange={e => loadPeriod(e.target.value)} className="bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none">
            <option value="">Pilih periode</option>
            {periods.map(p => <option key={p.id} value={p.id}>{MONTHS[p.period_month]} {p.period_year}</option>)}
          </select>
          {summaries.length > 0 && (
            <button onClick={handleDownloadCSV} className="px-5 py-3 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-bold flex items-center gap-2"><Download size={14} /> CSV</button>
          )}
        </div>
      </div>

      {selectedPeriod && !loading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
              <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1"><DollarSign size={14} className="inline mr-1 text-[var(--aurora-3)]" />Total Tunjangan</p>
              <p className="text-xl font-bold text-white font-mono">Rp {totalAllowance.toLocaleString()}</p>
            </div>
            <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
              <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1"><DollarSign size={14} className="inline mr-1 text-[var(--danger)]" />Total Potongan</p>
              <p className="text-xl font-bold text-[var(--danger)] font-mono">Rp {totalDeduction.toLocaleString()}</p>
            </div>
            <div className="bg-white/5 p-5 rounded-2xl border border-[var(--success)]/20">
              <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1"><DollarSign size={14} className="inline mr-1 text-[var(--success)]" />Take Home Pay</p>
              <p className="text-xl font-bold text-[var(--success)] font-mono">Rp {totalTakeHome.toLocaleString()}</p>
            </div>
            <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
              <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1"><Users size={14} className="inline mr-1 text-[var(--aurora-1)]" />Karyawan</p>
              <p className="text-xl font-bold text-white">{summaries.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Rekap Komponen</h3>
              <div className="space-y-2">
                {Object.entries(componentSummary).sort(([,a], [,b]) => b.total - a.total).map(([key, c]) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[var(--aurora-3)] bg-[var(--aurora-3)]/10 px-2 py-0.5 rounded">{c.code}</span>
                      <span className="text-sm text-gray-300">{c.name}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full ${c.type === 'ALLOWANCE' ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--danger)]/10 text-[var(--danger)]'}`}>{c.type === 'ALLOWANCE' ? '+' : '-'}</span>
                    </div>
                    <span className="text-sm font-mono font-bold text-white">Rp {c.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Statistik Kehadiran</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Total Hari Kerja</span>
                  <span className="text-sm font-bold text-white">{summaries.reduce((s, r) => s + (r.total_days_worked || 0), 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Total Keterlambatan (menit)</span>
                  <span className="text-sm font-bold text-[var(--warning)]">{summaries.reduce((s, r) => s + (r.total_late_minutes || 0), 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Rata-rata Take Home Pay</span>
                  <span className="text-sm font-bold text-[var(--success)]">Rp {summaries.length ? Math.round(totalTakeHome / summaries.length).toLocaleString() : 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Tertinggi</span>
                  <span className="text-sm font-bold text-white">Rp {Math.max(...summaries.map(s => Number(s.take_home_pay)), 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Terendah</span>
                  <span className="text-sm font-bold text-[var(--danger)]">Rp {Math.min(...summaries.map(s => Number(s.take_home_pay)), 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-gray-500 uppercase tracking-widest">
                <tr>
                  <th className="p-4 font-bold">Karyawan</th>
                  <th className="p-4 font-bold">NIP</th>
                  <th className="p-4 font-bold text-right">Tunjangan</th>
                  <th className="p-4 font-bold text-right">Potongan</th>
                  <th className="p-4 font-bold text-right">THP</th>
                  <th className="p-4 font-bold text-center">Hadir</th>
                  <th className="p-4 font-bold text-center">Telat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {summaries.map(s => (
                  <tr key={s.id} className="hover:bg-white/[0.02]">
                    <td className="p-4 font-bold text-white">{s.profiles?.full_name}</td>
                    <td className="p-4 text-gray-400">{s.profiles?.nip}</td>
                    <td className="p-4 text-right text-[var(--success)] font-mono">Rp {Number(s.total_allowance).toLocaleString()}</td>
                    <td className="p-4 text-right text-[var(--danger)] font-mono">Rp {Number(s.total_deduction).toLocaleString()}</td>
                    <td className="p-4 text-right text-white font-mono font-bold">Rp {Number(s.take_home_pay).toLocaleString()}</td>
                    <td className="p-4 text-center">{s.total_days_worked || 0}</td>
                    <td className="p-4 text-center text-[var(--warning)]">{s.total_late_minutes || 0}m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!summaries.length && <p className="text-center text-gray-500 py-12 text-sm">Pilih periode untuk melihat laporan</p>}
        </>
      )}
      {loading && <div className="text-center py-12"><Loader2 size={32} className="animate-spin mx-auto text-[var(--aurora-3)]" /></div>}
    </div>
  );
};

export default PayrollReports;
