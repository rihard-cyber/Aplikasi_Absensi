import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, TrendingDown, Users, CalendarDays, BarChart3, Loader2, Wallet, CreditCard } from 'lucide-react';
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

  if (loading) return <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-20 text-center"><Loader2 size={32} className="animate-spin mx-auto text-[var(--aurora-3)]" /></div>;

  const maxChart = Math.max(...stats.chartData.map(d => d.total), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--aurora-1)]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="border-b border-white/10 pb-6 mb-8">
        <h2 className="text-2xl font-serif font-bold text-white">Dashboard Finance</h2>
        <p className="text-sm text-gray-400 mt-1">Analitik biaya gaji, pinjaman, dan klaim</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] hover:bg-white/10 hover:border-white/20 transition-all duration-300"
        >
          <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">
            <Users size={14} className="inline mr-1 text-[var(--aurora-3)]" />Total Karyawan
          </p>
          <p className="text-2xl font-bold text-white">{stats.totalEmployee}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] hover:bg-white/10 hover:border-white/20 transition-all duration-300"
        >
          <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">
            <DollarSign size={14} className="inline mr-1 text-emerald-400" />Total Payroll Dibayar
          </p>
          <p className="text-2xl font-bold text-emerald-400 font-mono drop-shadow-[0_0_6px_rgba(0,230,118,0.3)]">Rp {stats.totalPayroll.toLocaleString()}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] hover:bg-white/10 hover:border-white/20 transition-all duration-300"
        >
          <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">
            <Wallet size={14} className="inline mr-1 text-amber-400" />Rata-rata Gaji
          </p>
          <p className="text-2xl font-bold text-amber-400 font-mono drop-shadow-[0_0_6px_rgba(255,214,0,0.3)]">Rp {stats.avgSalary.toLocaleString()}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] hover:bg-white/10 hover:border-white/20 transition-all duration-300 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-rose-500/10 rounded-full blur-2xl" />
          <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">
            <CreditCard size={14} className="inline mr-1 text-rose-400" />Pinjaman Aktif
          </p>
          <p className="text-2xl font-bold text-rose-400 font-mono drop-shadow-[0_0_6px_rgba(255,61,0,0.3)]">Rp {stats.totalLoanRemaining.toLocaleString()}</p>
          <p className="text-[9px] text-gray-500">{stats.activeLoans} pinjaman • Rp {stats.pendingLoanAmount.toLocaleString()} pending</p>
        </motion.div>
      </div>

      {stats.chartData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-8 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
        >
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">
            <TrendingUp size={16} className="inline mr-2 text-[var(--aurora-3)]" />Tren Payroll Bulanan
          </h3>
          <div className="flex items-end gap-2 h-40">
            {stats.chartData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(d.total / maxChart) * 100}%` }}
                  transition={{ delay: 0.3 + i * 0.05, duration: 0.5 }}
                  className="w-full min-h-[8px] rounded-t-lg transition-all hover:opacity-80 cursor-pointer relative group"
                  style={{
                    background: 'linear-gradient(180deg, var(--aurora-3), var(--aurora-1))',
                    boxShadow: '0 -2px 12px rgba(0,201,255,0.2)'
                  }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-lg text-white text-[8px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity border border-white/10">
                    Rp {d.total.toLocaleString()}
                  </div>
                </motion.div>
                <span className="text-[7px] text-gray-500 font-bold">{d.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] hover:bg-white/10 transition-all duration-300"
        >
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
            <TrendingDown size={16} className="inline mr-2 text-rose-400" />Reimbursement Tertunda
          </h3>
          <p className="text-3xl font-bold text-amber-400 drop-shadow-[0_0_6px_rgba(255,214,0,0.2)]">{stats.pendingReimbursement}</p>
          <p className="text-xs text-gray-500 mt-1">Klaim menunggu persetujuan</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] hover:bg-white/10 transition-all duration-300"
        >
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
            <BarChart3 size={16} className="inline mr-2 text-[var(--aurora-3)]" />Biaya Karyawan
          </h3>
          <p className="text-3xl font-bold text-white font-mono drop-shadow-[0_0_6px_rgba(255,255,255,0.1)]">Rp {stats.totalPayroll > 0 ? Math.round(stats.totalPayroll / Math.max(1, stats.chartData.length)).toLocaleString() : 0}</p>
          <p className="text-xs text-gray-500 mt-1">Rata-rata per bulan</p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default FinanceDashboard;
