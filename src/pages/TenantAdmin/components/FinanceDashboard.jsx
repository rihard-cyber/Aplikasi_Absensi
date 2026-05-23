/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, TrendingDown, Users, CalendarDays, BarChart3, Loader2 } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';

const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

const FinanceDashboard = () => {
  const [stats, setStats] = useState({ totalEmployee: 0, totalPayroll: 0, avgSalary: 0, totalTHR: 0, activeLoans: 0, pendingReimbursement: 0, totalLoanRemaining: 0, pendingLoanAmount: 0, chartData: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const { data: p } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
      if (!p?.tenant_id && !isGod) { setLoading(false); return; }
      const tid = p?.tenant_id;

      let qEmp = supabase.from('profiles').select('*', { count: 'exact', head: true });
      if (tid) qEmp = qEmp.eq('tenant_id', tid);
      qEmp = qEmp.in('role', ['EMPLOYEE', 'SUB_ADMIN']);
      const { count: empCount } = await qEmp;

      let qPs = supabase.from('payroll_periods').select('id, period_month, period_year');
      if (tid) qPs = qPs.eq('tenant_id', tid);
      qPs = qPs.in('status', ['LOCKED', 'PAID']);
      const { data: ps } = await qPs;
      const paidPeriodIds = (ps || []).map(p => p.id);
      const { data: payrolls } = paidPeriodIds.length > 0
        ? await (() => { let q = supabase.from('payroll_summary').select('take_home_pay, period_id'); if (tid) q = q.eq('tenant_id', tid); return q.in('period_id', paidPeriodIds); })()
        : { data: [] };
      const periodMap = {};
      (ps || []).forEach(p => { periodMap[p.id] = p; });
      let qLoans = supabase.from('loans').select('amount, remaining, status');
      if (tid) qLoans = qLoans.eq('tenant_id', tid);
      const { data: loans } = await qLoans;
      const activeLoans = (loans || []).filter(l => l.status === 'ACTIVE');
      const pendingLoans = (loans || []).filter(l => l.status === 'PENDING');
      const totalLoanRemaining = activeLoans.reduce((s, l) => s + Number(l.remaining || 0), 0);
      const pendingLoanAmount = pendingLoans.reduce((s, l) => s + Number(l.amount || 0), 0);

      let qReimb = supabase.from('reimbursements').select('*', { count: 'exact', head: true });
      if (tid) qReimb = qReimb.eq('tenant_id', tid);
      qReimb = qReimb.eq('status', 'PENDING');
      const { count: pendingReimb } = await qReimb;

      const totalPayroll = (payrolls || []).reduce((s, r) => s + Number(r.take_home_pay || 0), 0);
      const avgSalary = empCount && empCount > 0 && (payrolls || []).length > 0 ? Math.round(totalPayroll / (payrolls || []).length) : 0;

      const monthlyTotals = {};
      (payrolls || []).forEach(r => {
        const period = periodMap[r.period_id];
        if (period) {
          const key = `${period.period_year}-${String(period.period_month).padStart(2, '0')}`;
          monthlyTotals[key] = (monthlyTotals[key] || 0) + Number(r.take_home_pay || 0);
        }
      });
      const chartData = Object.entries(monthlyTotals).sort().map(([period, total]) => ({
        period, total,
        label: MONTHS[parseInt(period.split('-')[1]) - 1] + ' ' + period.split('-')[0]
      }));

      setStats({ totalEmployee: empCount || 0, totalPayroll, avgSalary, activeLoans: activeLoans.length, pendingReimbursement: pendingReimb || 0, totalLoanRemaining, pendingLoanAmount, chartData });
      setLoading(false);
    } catch (e) {
      console.error('FinanceDashboard error:', e);
      setLoading(false);
    }
  };

  if (loading) return <div className="glass-panel p-20 text-center"><Loader2 size={32} className="animate-spin mx-auto text-[var(--aurora-3)]" /></div>;

  const maxChart = Math.max(...stats.chartData.map(d => d.total), 1);

  return (
    <div className="glass-panel p-8">
      <div className="border-b border-white/10 pb-6 mb-8">
        <h2 className="text-2xl font-serif font-bold text-white">Dashboard Finance</h2>
        <p className="text-sm text-gray-400 mt-1">Analitik biaya gaji, pinjaman, dan klaim</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-[var(--aurora-1)]/10 to-[var(--aurora-3)]/10 p-5 rounded-2xl border border-white/10">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1"><Users size={14} className="inline mr-1 text-[var(--aurora-3)]" />Total Karyawan</p>
          <p className="text-2xl font-bold text-white">{stats.totalEmployee}</p>
        </div>
        <div className="bg-gradient-to-br from-[var(--success)]/10 to-[var(--aurora-3)]/10 p-5 rounded-2xl border border-white/10">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1"><DollarSign size={14} className="inline mr-1 text-[var(--success)]" />Total Payroll Dibayar</p>
          <p className="text-2xl font-bold text-white font-mono">Rp {stats.totalPayroll.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-[var(--warning)]/10 to-[var(--aurora-1)]/10 p-5 rounded-2xl border border-white/10">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1"><DollarSign size={14} className="inline mr-1 text-[var(--warning)]" />Rata-rata Gaji</p>
          <p className="text-2xl font-bold text-white font-mono">Rp {stats.avgSalary.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-[var(--danger)]/10 to-[var(--warning)]/10 p-5 rounded-2xl border border-white/10">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1"><DollarSign size={14} className="inline mr-1 text-[var(--danger)]" />Pinjaman Aktif</p>
          <p className="text-2xl font-bold text-white font-mono">Rp {stats.totalLoanRemaining.toLocaleString()}</p>
          <p className="text-[9px] text-gray-500">{stats.activeLoans} pinjaman • Rp {stats.pendingLoanAmount.toLocaleString()} pending</p>
        </div>
      </div>

      {stats.chartData.length > 0 && (
        <div className="mb-8 bg-white/5 p-6 rounded-2xl border border-white/10">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6"><TrendingUp size={16} className="inline mr-2 text-[var(--aurora-3)]" />Tren Payroll Bulanan</h3>
          <div className="flex items-end gap-2 h-40">
            {stats.chartData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-gradient-to-t from-[var(--aurora-1)] to-[var(--aurora-3)] rounded-t-lg transition-all hover:opacity-80 cursor-pointer relative group"
                  style={{ height: `${(d.total / maxChart) * 100}%`, minHeight: '8px' }}>
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                    Rp {d.total.toLocaleString()}
                  </div>
                </div>
                <span className="text-[7px] text-gray-500 font-bold">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4"><TrendingDown size={16} className="inline mr-2 text-[var(--danger)]" />Reimbursement Tertunda</h3>
          <p className="text-3xl font-bold text-[var(--warning)]">{stats.pendingReimbursement}</p>
          <p className="text-xs text-gray-500 mt-1">Klaim menunggu persetujuan</p>
        </div>
        <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4"><BarChart3 size={16} className="inline mr-2 text-[var(--aurora-3)]" />Biaya Karyawan</h3>
          <p className="text-3xl font-bold text-white font-mono">Rp {stats.totalPayroll > 0 ? Math.round(stats.totalPayroll / Math.max(1, stats.chartData.length)).toLocaleString() : 0}</p>
          <p className="text-xs text-gray-500 mt-1">Rata-rata per bulan</p>
        </div>
      </div>
    </div>
  );
};

export default FinanceDashboard;
