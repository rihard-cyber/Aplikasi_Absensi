/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, Calculator, Loader2, DollarSign, Users, CalendarDays } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

const TaxReports = () => {
  const [periods, setPeriods] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [tenantId, setTenantId] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [calculating, setCalculating] = useState(false);
  const [pphData, setPphData] = useState([]);
  const [bpjsData, setBpjsData] = useState([]);
  const [view, setView] = useState('pph');
  const toast = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: p } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!p?.tenant_id && !isGod) return;
    if (p?.tenant_id) setTenantId(p.tenant_id);

    let q1 = supabase.from('profiles').select('id, full_name, nip, position, employee_hris_data!left(npwp_number, tax_status, marriage_status, children_count)');
    if (p?.tenant_id) q1 = q1.eq('tenant_id', p.tenant_id);
    q1 = q1.in('role', ['EMPLOYEE', 'SUB_ADMIN']);
    const { data: e } = await q1;
    if (e) setEmployees(e);

    let q2 = supabase.from('payroll_periods').select('*');
    if (p?.tenant_id) q2 = q2.eq('tenant_id', p.tenant_id);
    q2 = q2.in('status', ['LOCKED', 'PAID']).order('period_year', { ascending: false }).order('period_month', { ascending: false });
    const { data: pers } = await q2;
    if (pers) setPeriods(pers);
  };

  const calculatePPh21 = async () => {
    setCalculating(true);
    try {
      const result = [];
      for (const emp of employees) {
        const { data: payrolls } = await supabase.from('payroll_summary')
          .select('total_allowance, total_deduction, take_home_pay, payroll_periods!inner(period_month, period_year)')
          .eq('user_id', emp.id).eq('payroll_periods.period_year', year)
          .in('payroll_periods.status', ['LOCKED', 'PAID']);

        const yearlyGross = (payrolls || []).reduce((s, r) => s + Number(r.total_allowance), 0);
        const yearlyNet = (payrolls || []).reduce((s, r) => s + Number(r.take_home_pay), 0);
        const monthsPaid = (payrolls || []).length;

        const hris = emp.employee_hris_data || {};
        const maritalStatus = hris.marriage_status || 'TK';
        const children = Math.min(Number(hris.children_count) || 0, 3);
        const ptkp = maritalStatus === 'K' ? 58500000 + children * 4500000 : 54000000;
        const pkp = Math.max(0, yearlyGross - ptkp);

        let pph21PerYear = 0;
        if (pkp <= 60000000) pph21PerYear = pkp * 0.05;
        else if (pkp <= 250000000) pph21PerYear = 60000000 * 0.05 + (pkp - 60000000) * 0.15;
        else if (pkp <= 500000000) pph21PerYear = 60000000 * 0.05 + 190000000 * 0.15 + (pkp - 250000000) * 0.25;
        else pph21PerYear = 60000000 * 0.05 + 190000000 * 0.15 + 250000000 * 0.25 + (pkp - 500000000) * 0.30;

        const monthlyPPh21 = monthsPaid > 0 ? Math.round(pph21PerYear / monthsPaid) : 0;

        result.push({
          id: emp.id, name: emp.full_name, nip: emp.nip,
          position: emp.position || 'Staff',
          npwp: hris.npwp_number || '-',
          ptkp: `Rp ${ptkp.toLocaleString()}`,
          yearlyGross, yearlyNet, pkp,
          pph21PerYear: Math.round(pph21PerYear),
          monthlyPPh21,
          monthsPaid,
          ptkpStatus: maritalStatus === 'K' ? `K/${hris.children_count || 0}` : 'TK/0'
        });
      }
      setPphData(result.sort((a, b) => b.pph21PerYear - a.pph21PerYear));
      toast(`PPh 21 tahun ${year} berhasil dihitung untuk ${result.length} karyawan`, 'success');
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
    finally { setCalculating(false); }
  };

  const calculateBPJS = async () => {
    setCalculating(true);
    try {
      const yearPeriods = periods.filter(p => p.period_year === year);
      const result = [];
      for (const emp of employees) {
        let totalBpjsKes = 0, totalBpjsTk = 0, totalBpjsCompany = 0;
        for (const period of yearPeriods) {
          const { data: res } = await supabase.from('payroll_results')
            .select('amount, component_code').eq('period_id', period.id).eq('user_id', emp.id);
          (res || []).forEach(r => {
            if (r.component_code === 'BPJS_KES') totalBpjsKes += Number(r.amount);
            if (r.component_code === 'BPJS_TK') totalBpjsTk += Number(r.amount);
          });
          totalBpjsCompany += totalBpjsKes * 4 + totalBpjsTk * 2;
        }
        if (totalBpjsKes > 0 || totalBpjsTk > 0) {
          result.push({
            id: emp.id, name: emp.full_name, nip: emp.nip,
            bpjsKes: Math.round(totalBpjsKes),
            bpjsTk: Math.round(totalBpjsTk),
            bpjsKesCompany: Math.round(totalBpjsKes * 4),
            bpjsTkCompany: Math.round(totalBpjsTk * 2),
            total: Math.round(totalBpjsKes + totalBpjsTk)
          });
        }
      }
      setBpjsData(result.sort((a, b) => b.total - a.total));
      toast(`BPJS tahun ${year} berhasil dihitung`, 'success');
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
    finally { setCalculating(false); }
  };

  const downloadCSV = (data, filename) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]).filter(k => k !== 'id');
    const lines = [headers.join(','), ...data.map(r => headers.map(h => `"${r[h] || ''}"`).join(','))];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    toast('File diunduh', 'success');
  };

  const totalPPh = pphData.reduce((s, r) => s + r.pph21PerYear, 0);
  const totalBPJS = bpjsData.reduce((s, r) => s + r.total, 0);

  return (
    <div className="glass-panel p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-6 mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">Laporan Pajak & BPJS</h2>
          <p className="text-sm text-gray-400 mt-1">Generate laporan PPh 21 1721-A1 dan BPJS untuk pelaporan</p>
        </div>
        <div className="flex gap-2">
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none w-full sm:w-auto">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => { setView('pph'); calculatePPh21(); }} className={`px-5 py-3 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${view === 'pph' ? 'bg-white/10 border-[var(--aurora-3)]/30 text-white' : 'bg-white/5 border-white/10 text-gray-400'}`}>
          <FileText size={14} className="inline mr-1" /> PPh 21 1721-A1
        </button>
        <button onClick={() => { setView('bpjs'); calculateBPJS(); }} className={`px-5 py-3 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${view === 'bpjs' ? 'bg-white/10 border-[var(--aurora-3)]/30 text-white' : 'bg-white/5 border-white/10 text-gray-400'}`}>
          <Calculator size={14} className="inline mr-1" /> BPJS
        </button>
      </div>

      {view === 'pph' && (
        <>
          {pphData.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-[9px] text-gray-500 uppercase tracking-widest">Total PPh 21</p>
                <p className="text-xl font-bold font-mono text-[var(--danger)]">Rp {totalPPh.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-[9px] text-gray-500 uppercase tracking-widest">Karyawan</p>
                <p className="text-xl font-bold text-white">{pphData.length}</p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-[9px] text-gray-500 uppercase tracking-widest">Rata-rata</p>
                <p className="text-xl font-bold font-mono text-white">Rp {pphData.length > 0 ? Math.round(totalPPh / pphData.length).toLocaleString() : 0}</p>
              </div>
            </div>
          )}
          {pphData.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-gray-500 uppercase tracking-widest">
                  <tr>
                    <th className="p-3 font-bold">Karyawan</th>
                    <th className="p-3 font-bold">NIP</th>
                    <th className="p-3 font-bold">NPWP</th>
                    <th className="p-3 font-bold">PTKP</th>
                    <th className="p-3 font-bold text-right">Bruto/thn</th>
                    <th className="p-3 font-bold text-right">PKP</th>
                    <th className="p-3 font-bold text-right">PPh 21/thn</th>
                    <th className="p-3 font-bold text-right">PPh 21/bln</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {pphData.map(r => (
                    <tr key={r.id} className="hover:bg-white/[0.02]">
                      <td className="p-3 font-bold text-white">{r.name}</td>
                      <td className="p-3 text-gray-400">{r.nip}</td>
                      <td className="p-3 text-gray-400">{r.npwp}</td>
                      <td className="p-3 text-gray-400">{r.ptkpStatus} ({r.ptkp})</td>
                      <td className="p-3 text-right font-mono">Rp {r.yearlyGross.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono">Rp {r.pkp.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono font-bold text-[var(--danger)]">Rp {r.pph21PerYear.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono">Rp {r.monthlyPPh21.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {pphData.length > 0 && (
            <button onClick={() => downloadCSV(pphData, `PPh21_1721_A1_${year}.csv`)} className="mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-bold flex items-center gap-2">
              <Download size={14} /> Download 1721-A1 CSV
            </button>
          )}
        </>
      )}

      {view === 'bpjs' && (
        <>
          {bpjsData.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-[9px] text-gray-500 uppercase tracking-widest">Total BPJS Karyawan</p>
                <p className="text-xl font-bold font-mono text-[var(--warning)]">Rp {totalBPJS.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-[9px] text-gray-500 uppercase tracking-widest">Total BPJS Perusahaan</p>
                <p className="text-xl font-bold font-mono text-[var(--aurora-3)]">Rp {bpjsData.reduce((s, r) => s + r.bpjsKesCompany + r.bpjsTkCompany, 0).toLocaleString()}</p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-[9px] text-gray-500 uppercase tracking-widest">Peserta</p>
                <p className="text-xl font-bold text-white">{bpjsData.length}</p>
              </div>
            </div>
          )}
          {bpjsData.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-gray-500 uppercase tracking-widest">
                  <tr>
                    <th className="p-3 font-bold">Karyawan</th>
                    <th className="p-3 font-bold">NIP</th>
                    <th className="p-3 font-bold text-right">BPJS Kes</th>
                    <th className="p-3 font-bold text-right">BPJS TK</th>
                    <th className="p-3 font-bold text-right">Total Karyawan</th>
                    <th className="p-3 font-bold text-right">Total Perusahaan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {bpjsData.map(r => (
                    <tr key={r.id} className="hover:bg-white/[0.02]">
                      <td className="p-3 font-bold text-white">{r.name}</td>
                      <td className="p-3 text-gray-400">{r.nip}</td>
                      <td className="p-3 text-right font-mono">Rp {r.bpjsKes.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono">Rp {r.bpjsTk.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono font-bold">Rp {r.total.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono text-[var(--aurora-3)]">Rp {(r.bpjsKesCompany + r.bpjsTkCompany).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {bpjsData.length > 0 && (
            <button onClick={() => downloadCSV(bpjsData, `BPJS_${year}.csv`)} className="mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-bold flex items-center gap-2">
              <Download size={14} /> Download BPJS CSV
            </button>
          )}
        </>
      )}

      {!pphData.length && !bpjsData.length && !calculating && (
        <p className="text-center text-gray-500 py-12">Pilih jenis laporan dan klik untuk menghitung</p>
      )}
      {calculating && <div className="text-center py-12"><Loader2 size={32} className="animate-spin mx-auto text-[var(--aurora-3)]" /></div>}
    </div>
  );
};

export default TaxReports;
