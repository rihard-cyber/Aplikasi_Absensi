import React, { useState, useEffect } from 'react';
import { Calculator, Download, Loader2 } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { useTranslation } from 'react-i18next';

const THRCalculation = () => {
  const { t, i18n } = useTranslation();
  const [year, setYear] = useState(new Date().getFullYear());
  const [employees, setEmployees] = useState([]);
  const [results, setResults] = useState([]);
  const [calculating, setCalculating] = useState(false);
  const [tenantId, setTenantId] = useState(null);
  const toast = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: p } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!p?.tenant_id && !isGod) return;
    if (p?.tenant_id) setTenantId(p.tenant_id);

    let q = supabase.from('profiles').select('id, full_name, nip, position, join_date, employee_hris_data!inner(join_date, employee_status)');
    if (p?.tenant_id) q = q.eq('tenant_id', p.tenant_id);
    q = q.in('role', ['EMPLOYEE', 'SUB_ADMIN']);
    const { data: emps } = await q;
    if (emps) setEmployees(emps);
  };

  const calculate = async () => {
    setCalculating(true);
    try {
      const thrResults = [];
      for (const emp of employees) {
        const joinDate = emp.employee_hris_data?.join_date;
        let monthsWorked = 12;
        let thrAmount = 0;
        let prorata = false;

        if (joinDate) {
          const join = new Date(joinDate);
          const now = new Date(year, 5, 1);
          monthsWorked = Math.max(0, (now.getFullYear() - join.getFullYear()) * 12 + (now.getMonth() - join.getMonth()));
          prorata = monthsWorked < 12;
        }

        const { data: sals } = await supabase.from('employee_salaries')
          .select('amount, salary_components!inner(code, type)')
          .eq('user_id', emp.id).eq('tenant_id', tenantId);

        let monthlySalary = 0;
        if (sals) {
          monthlySalary = sals
            .filter(s => s.salary_components?.type === 'ALLOWANCE' && s.salary_components?.code !== 'LEMBUR')
            .reduce((sum, s) => sum + Number(s.amount), 0);
        }

        if (prorata) {
          thrAmount = Math.round((monthsWorked / 12) * monthlySalary);
        } else {
          thrAmount = monthlySalary;
        }

        thrResults.push({
          id: emp.id,
          name: emp.full_name,
          nip: emp.nip,
          position: emp.position || 'Staff',
          joinDate: joinDate || '-',
          monthsWorked: prorata ? monthsWorked : 12,
          monthlySalary,
          prorata,
          thrAmount
        });
      }
      thrResults.sort((a, b) => b.thrAmount - a.thrAmount);
      setResults(thrResults);
      toast(t('thr.toastSuccess', { year, count: thrResults.length }), 'success');
    } catch (e) { toast(t('thr.toastFailed') + e.message, 'error'); }
    finally { setCalculating(false); }
  };

  const handleDownload = () => {
    if (!results.length) return;
    const lines = [
      t('thr.csvTitle', { year }),
      t('thr.csvDate', { date: new Date().toLocaleDateString(i18n.language === 'id' ? 'id-ID' : 'en-US') }),
      '',
      t('thr.csvHeaders'),
      ...results.map((r, i) => `${i+1},"${r.name}",${r.nip},"${r.position}",${r.joinDate},${r.monthsWorked},${r.monthlySalary},${r.prorata ? t('thr.statusProrata') : t('thr.statusFull')},${r.thrAmount}`),
      '',
      t('thr.csvTotalEmployees', { count: results.length }),
      t('thr.csvTotalAmount', { total: results.reduce((s, r) => s + r.thrAmount, 0).toLocaleString() })
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `THR_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(t('thr.toastDownloaded'), 'success');
  };

  const totalTHR = results.reduce((s, r) => s + r.thrAmount, 0);

  return (
    <div className="glass-panel p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6 mb-8">
        <div className="w-full sm:w-auto">
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">{t('thr.title')}</h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">{t('thr.subtitle')}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <select value={year} onChange={e => setYear(Number(e.target.value))}  className="bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white outline-none w-full sm:w-auto placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" >
            {[2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={calculate} disabled={calculating} className="px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap">
            {calculating ? <Loader2 size={16} className="animate-spin" /> : <Calculator size={16} />} {t('thr.calculate')}
          </button>
          {results.length > 0 && (
            <button onClick={handleDownload} className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-xs font-bold flex items-center justify-center gap-2 hover:bg-white/10 whitespace-nowrap"><Download size={16} /> {t('thr.exportCsv')}</button>
          )}
        </div>
      </div>

      {totalTHR > 0 && (
        <div className="mb-6 p-5 bg-gradient-to-r from-[var(--aurora-1)]/10 to-[var(--aurora-3)]/10 rounded-2xl border border-[var(--aurora-1)]/20">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">{t('thr.totalThr', { year })}</p>
          <p className="text-3xl font-bold text-white font-mono">{t('thr.rpSymbol')} {totalTHR.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">{t('thr.summaryMeta', { employees: results.length, prorataCount: results.filter(r => r.prorata).length })}</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/5 text-gray-500 uppercase tracking-widest">
            <tr>
              <th className="p-4 font-bold">{t('thr.employeeCol')}</th>
              <th className="p-4 font-bold">{t('thr.nipCol')}</th>
              <th className="p-4 font-bold">{t('thr.positionCol')}</th>
              <th className="p-4 font-bold">{t('thr.tenureCol')}</th>
              <th className="p-4 font-bold text-right">{t('thr.salaryCol')}</th>
              <th className="p-4 font-bold text-center">{t('thr.statusCol')}</th>
              <th className="p-4 font-bold text-right">{t('thr.thrCol')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {results.map(r => (
              <tr key={r.id} className="hover:bg-white/[0.02]">
                <td className="p-4 font-bold text-white">{r.name}</td>
                <td className="p-4 text-gray-400">{r.nip}</td>
                <td className="p-4 text-gray-400">{r.position}</td>
                <td className="p-4 text-gray-400">{r.monthsWorked} {t('thr.months')}</td>
                <td className="p-4 text-right font-mono">{t('thr.rpSymbol')} {r.monthlySalary.toLocaleString()}</td>
                <td className="p-4 text-center">
                  <span className={`px-2 py-1 rounded text-[9px] font-bold ${r.prorata ? 'bg-[var(--warning)]/10 text-[var(--warning)]' : 'bg-[var(--success)]/10 text-[var(--success)]'}`}>{r.prorata ? t('thr.statusProrata') : t('thr.statusFull')}</span>
                </td>
                <td className="p-4 text-right font-mono font-bold text-[var(--success)]">{t('thr.rpSymbol')} {r.thrAmount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!results.length && !calculating && <p className="text-center text-gray-500 py-12 text-sm">{t('thr.placeholder')}</p>}
    </div>
  );
};

export default THRCalculation;
