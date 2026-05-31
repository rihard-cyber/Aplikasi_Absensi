import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, CheckCircle2, Lock, Download, Eye, AlertCircle, Loader2, Plus, ChevronRight, FileText, CalendarRange } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { logAudit } from '../../../utils/auditLogger';

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

/** @type {(s: string) => string} Passthrough i18n — app is monolingual Indonesian */
const t = (s) => s;

const getMonthName = (monthNum) => {
  const m = MONTHS.at((monthNum - 1) % 12);
  return m || '';
};

const PayrollRun = () => {
  const [tenantId, setTenantId] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [components, setComponents] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [payrollSettings, setPayrollSettings] = useState(null);
  const [latePenaltyFee, setLatePenaltyFee] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [expandedUser, setExpandedUser] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [viewResult, setViewResult] = useState(null);
  const [showNewPeriod, setShowNewPeriod] = useState(false);
  const [newPeriod, setNewPeriod] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), period_type: 'monthly', start_date: '', end_date: '', label: '' });
  const [holidays, setHolidays] = useState([]);
  const toast = useToast();

  useEffect(() => { init(); }, []);

  const init = async () => {
    const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!profile?.tenant_id && !isGod) return;
    if (profile?.tenant_id) setTenantId(profile.tenant_id);
    const tid = profile?.tenant_id;

    let q1 = supabase.from('salary_components').select('*');
    if (tid) q1 = q1.eq('tenant_id', tid);
    q1 = q1.eq('is_active', true);
    const { data: comps } = await q1;
    if (comps) setComponents(comps);

    let q2 = supabase.from('profiles').select('id, full_name, nip, position');
    if (tid) q2 = q2.eq('tenant_id', tid);
    q2 = q2.in('role', ['EMPLOYEE', 'SUB_ADMIN']);
    const { data: emps } = await q2;
    if (emps) setProfiles(emps);

    let q3 = supabase.from('payroll_settings').select('*');
    if (tid) q3 = q3.eq('tenant_id', tid);
    const { data: ps } = await q3.maybeSingle();
    if (ps) setPayrollSettings(ps);

    let q4 = supabase.from('tenant_settings').select('late_penalty_fee');
    if (tid) q4 = q4.eq('tenant_id', tid);
    const { data: ts } = await q4.maybeSingle();
    if (ts?.late_penalty_fee) setLatePenaltyFee(Number(ts.late_penalty_fee));

    let q5 = supabase.from('payroll_periods').select('*');
    if (tid) q5 = q5.eq('tenant_id', tid);
    q5 = q5.order('period_year', { ascending: false }).order('period_month', { ascending: false });
    const { data: pers } = await q5;
    if (pers) setPeriods(pers);

    let q6 = supabase.from('company_holidays').select('date');
    if (tid) q6 = q6.eq('tenant_id', tid);
    const { data: hols } = await q6;
    if (hols) setHolidays(hols.map(h => h.date));
  };

  const isHoliday = (dateStr) => holidays.includes(dateStr);
  const isWeekend = (dateStr) => {
    const d = new Date(dateStr);
    return d.getDay() === 0 || d.getDay() === 6;
  };

  const getOvertimeRate = (dateStr, baseRate) => {
    if (isHoliday(dateStr)) return payrollSettings?.overtime_rate_holiday || 2;
    if (isWeekend(dateStr)) return payrollSettings?.overtime_rate_weekend || 2;
    return baseRate || 1.5;
  };

  const createPeriod = async () => {
    if (!tenantId) return;
    if (newPeriod.period_type === 'monthly') {
      const exists = periods.find(p => p.period_month === newPeriod.month && p.period_year === newPeriod.year);
      if (exists) { toast('Periode sudah ada!', 'error'); return; }
    }
    const startDate = newPeriod.period_type === 'custom' ? newPeriod.start_date : `${newPeriod.year}-${String(newPeriod.month).padStart(2,'0')}-01`;
    const endDate = newPeriod.period_type === 'custom' ? newPeriod.end_date : `${newPeriod.year}-${String(newPeriod.month).padStart(2,'0')}-${new Date(newPeriod.year, newPeriod.month, 0).getDate()}`;

    if (newPeriod.period_type === 'custom' && (!startDate || !endDate)) { toast('Isi tanggal mulai dan selesai!', 'error'); return; }

    const { data, error } = await supabase.from('payroll_periods').insert({
      tenant_id: tenantId,
      period_month: newPeriod.period_type === 'monthly' ? newPeriod.month : new Date(startDate).getMonth() + 1,
      period_year: newPeriod.period_type === 'monthly' ? newPeriod.year : new Date(startDate).getFullYear(),
      start_date: startDate, end_date: endDate,
      period_type: newPeriod.period_type,
      label: newPeriod.label || null,
      status: 'DRAFT'
    }).select().single();

    if (error) { toast('Gagal: ' + error.message, 'error'); return; }
    const label = newPeriod.period_type === 'custom' ? (newPeriod.label || `${startDate} s.d ${endDate}`) : `${getMonthName(newPeriod.month)} ${newPeriod.year}`;
    logAudit('CREATE_PAYROLL_PERIOD', { period: label, start_date: startDate, end_date: endDate, type: newPeriod.period_type });
    toast('Periode payroll dibuat', 'success');
    setShowNewPeriod(false);
    setPeriods(prev => [data, ...prev]);
  };

  const pairClockInOut = (logs) => {
    const sorted = [...logs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const pairs = [];
    let pendingIn = null;
    sorted.forEach(log => {
      const date = log.timestamp?.split('T')[0];
      if (log.action === 'CLOCK_IN') {
        if (pendingIn) pairs.push({ clockIn: pendingIn, clockOut: null });
        pendingIn = { ...log, date };
      } else if (log.action === 'CLOCK_OUT' && pendingIn) {
        pairs.push({ clockIn: pendingIn, clockOut: { ...log, date: pendingIn.date } });
        pendingIn = null;
      }
    });
    if (pendingIn) pairs.push({ clockIn: pendingIn, clockOut: null });
    return pairs;
  };

  const runPayroll = async (period) => {
    setIsProcessing(true);
    setSelectedPeriod(period);
    try {
      const { data: sals } = await supabase.from('employee_salaries').select('*, salary_components!inner(*)').eq('tenant_id', tenantId);
      const salaryMap = new Map();
      (sals || []).forEach(s => {
        if (!salaryMap.has(s.user_id)) salaryMap.set(s.user_id, []);
        salaryMap.get(s.user_id).push(s);
      });

      const { data: attendanceLogs } = await supabase.from('attendance_logs')
        .select('user_id, action, status, timestamp')
        .eq('tenant_id', tenantId)
        .gte('timestamp', period.start_date + 'T00:00:00Z')
        .lte('timestamp', period.end_date + 'T23:59:59Z');
      const attendanceByUser = new Map();
      (attendanceLogs || []).forEach(log => {
        if (!attendanceByUser.has(log.user_id)) attendanceByUser.set(log.user_id, []);
        attendanceByUser.get(log.user_id).push(log);
      });

      const { data: activeLoans } = await supabase.from('loans').select('*').eq('tenant_id', tenantId).eq('status', 'ACTIVE');
      const loansByUser = new Map();
      (activeLoans || []).forEach(l => {
        if (!loansByUser.has(l.user_id)) loansByUser.set(l.user_id, []);
        loansByUser.get(l.user_id).push(l);
      });

      const allowanceComponents = components.filter(c => c.type === 'ALLOWANCE');
      const deductionComponents = components.filter(c => c.type === 'DEDUCTION');

      const allResults = [];
      const allSummaries = [];

      for (const emp of profiles) {
        const empSals = salaryMap.get(emp.id) || [];
        const logs = attendanceByUser.get(emp.id) || [];
        const empLoans = loansByUser.get(emp.id) || [];
        let totalAllowance = 0, totalDeduction = 0;
        const empResults = [];

        const workedDates = new Set();
        let totalLateMinutes = 0;
        logs.forEach(log => {
          if (log.action === 'CLOCK_IN') workedDates.add(log.timestamp?.split('T')[0]);
          if (log.status === 'LATE') totalLateMinutes += 15;
        });
        const totalDaysWorked = workedDates.size;

        const pairs = pairClockInOut(logs);
        let totalOvertimeHours = 0;
        let totalOvertimePay = 0;

        for (const comp of allowanceComponents) {
          const sal = empSals.find(s => s.component_id === comp.id);
          let amount = Number(sal?.amount || 0);

          if (comp.code === 'LEMBUR' && logs.length > 0) {
            const shiftDuration = 8;
            const hourlyRate = Number(empSals.find(s => s.salary_components?.code === 'GP')?.amount || 0);
            totalOvertimeHours = 0;
            totalOvertimePay = 0;
            for (const pair of pairs) {
              if (!pair.clockIn || !pair.clockOut) continue;
              const start = new Date(pair.clockIn.timestamp);
              const end = new Date(pair.clockOut.timestamp);
              const hoursWorked = (end - start) / (1000 * 60 * 60);
              if (hoursWorked > shiftDuration) {
                const otHours = hoursWorked - shiftDuration;
                totalOvertimeHours += otHours;
                const otRate = getOvertimeRate(pair.clockIn.date, payrollSettings?.overtime_rate_weekday || 1.5);
                totalOvertimePay += otHours * (hourlyRate / 173) * otRate;
              }
            }
            amount = Math.round(totalOvertimePay);
          }

          totalAllowance += amount;
          empResults.push({
            period_id: period.id, tenant_id: tenantId, user_id: emp.id,
            component_id: comp.id, component_code: comp.code, component_name: comp.name,
            component_type: 'ALLOWANCE', amount
          });
        }

        const localLateFee = latePenaltyFee;

        for (const comp of deductionComponents) {
          const sal = empSals.find(s => s.component_id === comp.id);
          let amount = Number(sal?.amount || 0);

          if (comp.code === 'BPJS_KES' && payrollSettings) {
            const maxBpjsKes = payrollSettings.bpjs_kesehatan_max || 12000000;
            const bpjsBase = Math.min(totalAllowance, maxBpjsKes);
            amount = Math.round(bpjsBase * (payrollSettings.bpjs_kesehatan || 1) / 100);
          }
          if (comp.code === 'BPJS_TK' && payrollSettings) {
            const maxBpjsTk = payrollSettings.bpjs_jht_max || 106584000;
            const bpjsBase = Math.min(totalAllowance, maxBpjsTk);
            amount = Math.round(bpjsBase * (payrollSettings.bpjs_ketenagakerjaan || 2) / 100);
          }
          if (comp.code === 'PPH21' && payrollSettings?.use_pph21) {
            const annualized = totalAllowance * 12;
            const ptkp = 54000000;
            const pkp = Math.max(0, annualized - ptkp);
            const ter = pkp > 0 ? pkp * 0.05 / 12 : 0;
            amount = Math.round(ter);
          }
          if (comp.code === 'PINJAMAN') {
            amount = empLoans.reduce((sum, l) => sum + Number(l.monthly_deduction), 0);
          }
          if (comp.code === 'DENDA') {
            const lateHours = Math.ceil(totalLateMinutes / 60);
            amount = lateHours * localLateFee;
          }

          totalDeduction += amount;
          empResults.push({
            period_id: period.id, tenant_id: tenantId, user_id: emp.id,
            component_id: comp.id, component_code: comp.code, component_name: comp.name,
            component_type: 'DEDUCTION', amount
          });
        }

        allResults.push(...empResults);
        allSummaries.push({
          period_id: period.id, tenant_id: tenantId, user_id: emp.id,
          total_allowance: totalAllowance,
          total_deduction: totalDeduction,
          take_home_pay: totalAllowance - totalDeduction,
          total_days_worked: totalDaysWorked,
          total_overtime_hours: Math.round(totalOvertimeHours * 100) / 100,
          total_late_minutes: totalLateMinutes,
          total_absence_days: 0
        });
      }

      await supabase.from('payroll_results').delete().eq('period_id', period.id).eq('tenant_id', tenantId);
      await supabase.from('payroll_summary').delete().eq('period_id', period.id).eq('tenant_id', tenantId);

      if (allResults.length) await supabase.from('payroll_results').insert(allResults);
      if (allSummaries.length) await supabase.from('payroll_summary').insert(allSummaries);

      await supabase.from('payroll_periods').update({ status: 'LOCKED', processed_at: new Date().toISOString() }).eq('id', period.id).eq('tenant_id', tenantId);

      logAudit('PROCESS_PAYROLL', { period: `${getMonthName(period.period_month)} ${period.period_year}`, employees: profiles.length, total_thp: allSummaries.reduce((s,r) => s+Number(r.take_home_pay), 0) });

      toast(`Payroll ${getMonthName(period.period_month)} ${period.period_year} selesai diproses!`, 'success');
      init();
    } catch (e) {
      console.error('Payroll error:', e);
      toast('Gagal proses payroll: ' + e.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const viewPayroll = async (period) => {
    setViewResult(period);
    const { data: res } = await supabase.from('payroll_results').select('*').eq('period_id', period.id).eq('tenant_id', tenantId).order('user_id');
    setResults(res || []);
    const { data: sum } = await supabase.from('payroll_summary').select('*, profiles!inner(full_name, nip)').eq('period_id', period.id).eq('tenant_id', tenantId).order('take_home_pay', { ascending: false });
    setSummaries(sum || []);
  };

  const markPaid = async (period) => {
    await supabase.from('payroll_periods').update({ status: 'PAID' }).eq('id', period.id).eq('tenant_id', tenantId);
    logAudit('PAY_PAYROLL', { period: `${getMonthName(period.period_month)} ${period.period_year}` });
    toast('Payroll ditandai sebagai LUNAS', 'success');
    setViewResult(null);
    init();
  };

  const getStatusBadge = (status) => {
    const styleClass = status === 'LOCKED' ? 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30' : status === 'PAID' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    return <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${styleClass}`}>{status}</span>;
  };

  const getPeriodLabel = (p) => {
    if (p.period_type === 'custom') return p.label || `${p.start_date} s.d ${p.end_date}`;
    return `${getMonthName(p.period_month)} ${p.period_year}`;
  };

  const groupedResults = new Map();
  results.forEach(r => {
    if (!groupedResults.has(r.user_id)) groupedResults.set(r.user_id, []);
    groupedResults.get(r.user_id).push(r);
  });

  return (
    <div className="glass-panel p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-6 mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">{t('Proses Payroll')}</h2>
          <p className="text-sm text-gray-400 mt-1">{t('Kalkulasi gaji otomatis dari data absensi & komponen gaji')}</p>
        </div>
        <button onClick={() => { setShowNewPeriod(true); setNewPeriod({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), period_type: 'monthly', start_date: '', end_date: '', label: '' }); }} className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-bold flex items-center gap-2 whitespace-nowrap"><Plus size={16} /> {t('Periode Baru')}</button>
      </div>

      <AnimatePresence>
        {showNewPeriod && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/10">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('Tipe Periode')}</label>
                <select value={newPeriod.period_type} onChange={e => setNewPeriod({...newPeriod, period_type: e.target.value})}  className="bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white outline-none transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" >
                  <option value="monthly">{t('Bulanan')}</option>
                  <option value="custom">{t('Kustom (Tanggal)')}</option>
                </select>
              </div>
              {newPeriod.period_type === 'monthly' ? (
                <>
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('Bulan')}</label>
                    <select value={newPeriod.month} onChange={e => setNewPeriod({...newPeriod, month: Number(e.target.value)})}  className="bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white outline-none transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" >
                      {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('Tahun')}</label>
                    <select value={newPeriod.year} onChange={e => setNewPeriod({...newPeriod, year: Number(e.target.value)})}  className="bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white outline-none transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" >
                      {[2024,2025,2026,2027,2028].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('Tanggal Mulai')}</label>
                    <input type="date" value={newPeriod.start_date} onChange={e => setNewPeriod({...newPeriod, start_date: e.target.value})}   className="bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white outline-none transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('Tanggal Selesai')}</label>
                    <input type="date" value={newPeriod.end_date} onChange={e => setNewPeriod({...newPeriod, end_date: e.target.value})}   className="bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white outline-none transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('Label')}</label>
                    <input type="text" value={newPeriod.label} onChange={e => setNewPeriod({...newPeriod, label: e.target.value})} placeholder="Contoh: Proyek A"   className="bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white outline-none w-40 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
                  </div>
                </>
              )}
              <div className="flex gap-2">
                <button onClick={createPeriod} className="px-6 py-3 rounded-xl bg-[var(--success)] text-black text-xs font-bold">{t('Buat Periode')}</button>
                <button onClick={() => setShowNewPeriod(false)} className="px-6 py-3 rounded-xl bg-white/5 text-gray-400 border border-white/10 text-xs font-bold">{t('Batal')}</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3 mb-8">
        {periods.map(p => (
          <div key={p.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-5 bg-white/5 rounded-2xl border border-white/10 hover:border-white/20 transition-all">
            <div className="flex items-center gap-6">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold ${p.period_type === 'custom' ? 'bg-gradient-to-br from-[var(--warning)] to-[var(--aurora-2)]' : 'bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)]'}`}>
                {p.period_type === 'custom' ? <CalendarRange size={20} /> : getMonthName(p.period_month)?.slice(0,3)}
              </div>
              <div>
                <h4 className="text-white font-bold">{getPeriodLabel(p)}</h4>
                <p className="text-[10px] text-gray-500">{p.start_date} s.d {p.end_date} • {getStatusBadge(p.status)} {p.period_type === 'custom' && <span className="text-[var(--warning)]">• {t('Kustom')}</span>}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {p.status === 'DRAFT' && (
                <button onClick={() => runPayroll(p)} disabled={isProcessing} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-[10px] font-bold flex items-center gap-2 hover:shadow-lg transition-all disabled:opacity-50">
                  {isProcessing && selectedPeriod?.id === p.id ? <Loader2 size={14} className="animate-spin" /> : <Calculator size={14} />} {t('Proses Payroll')}
                </button>
              )}
              {p.status !== 'DRAFT' && (
                <button onClick={() => viewPayroll(p)} className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-[10px] font-bold flex items-center gap-2 hover:bg-white/10 transition-all"><Eye size={14} /> {t('Lihat Hasil')}</button>
              )}
            </div>
          </div>
        ))}
        {!periods.length && <p className="text-center text-gray-500 py-8 text-sm">{t('Belum ada periode payroll. Buat periode baru untuk memulai.')}</p>}
      </div>

      <AnimatePresence>
        {viewResult && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="border-t border-white/10 pt-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
              <h3 className="text-xl font-serif font-bold text-white">{t('Hasil Payroll • ')}{getPeriodLabel(viewResult)}</h3>
              <div className="flex flex-wrap gap-3">
                {viewResult.status === 'LOCKED' && <button onClick={() => markPaid(viewResult)} className="px-5 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-bold flex items-center gap-2 whitespace-nowrap"><CheckCircle2 size={14} /> {t('Tandai Lunas')}</button>}
                <button onClick={() => setViewResult(null)} className="px-5 py-2.5 rounded-xl bg-white/5 text-gray-400 border border-white/10 text-[10px] font-bold whitespace-nowrap">{t('Tutup')}</button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-gray-500 uppercase tracking-widest">
                  <tr>
                    <th className="p-4 font-bold">{t('Karyawan')}</th>
                    <th className="p-4 font-bold">{t('NIP')}</th>
                    <th className="p-4 font-bold text-right">{t('Jam Lembur')}</th>
                    <th className="p-4 font-bold text-right">{t('Tunjangan')}</th>
                    <th className="p-4 font-bold text-right">{t('Potongan')}</th>
                    <th className="p-4 font-bold text-right">{t('Take Home Pay')}</th>
                    <th className="p-4 font-bold text-center">{t('Detail')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {summaries.map(s => {
                    const userResults = groupedResults.get(s.user_id) || [];
                    const isExpanded = expandedUser === s.user_id;
                    return (
                      <tr key={s.id} className="hover:bg-white/[0.02]">
                        <td className="p-4 font-bold text-white">{s.profiles?.full_name}</td>
                        <td className="p-4 text-gray-400">{s.profiles?.nip}</td>
                        <td className="p-4 text-right text-[var(--aurora-3)] font-mono font-bold">{Number(s.total_overtime_hours).toFixed(1)}</td>
                        <td className="p-4 text-right text-[var(--success)] font-mono font-bold">{t('Rp ')}{Number(s.total_allowance).toLocaleString()}</td>
                        <td className="p-4 text-right text-[var(--danger)] font-mono font-bold">{t('Rp ')}{Number(s.total_deduction).toLocaleString()}</td>
                        <td className="p-4 text-right text-white font-mono font-bold">{t('Rp ')}{Number(s.take_home_pay).toLocaleString()}</td>
                        <td className="p-4 text-center">
                          <button onClick={() => setExpandedUser(isExpanded ? null : s.user_id)} className={`transition-all text-[var(--aurora-3)] hover:text-white ${isExpanded ? 'rotate-90' : ''}`}>
                            <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {expandedUser && (
              <div className="mt-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                <h4 className="text-sm font-bold text-white mb-3">{t('Rincian Komponen Gaji')}</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/5 text-gray-500 uppercase tracking-widest">
                      <tr>
                        <th className="p-3 font-bold">{t('Komponen')}</th>
                        <th className="p-3 font-bold">{t('Tipe')}</th>
                        <th className="p-3 font-bold text-right">{t('Jumlah')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {(groupedResults.get(expandedUser) || []).map(r => (
                        <tr key={r.id} className="hover:bg-white/[0.02]">
                          <td className="p-3 text-white font-bold">{r.component_name}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${r.component_type === 'ALLOWANCE' ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--danger)]/10 text-[var(--danger)]'}`}>
                              {r.component_type === 'ALLOWANCE' ? t('Tunjangan') : t('Potongan')}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-white">{t('Rp ')}{Number(r.amount).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PayrollRun;
