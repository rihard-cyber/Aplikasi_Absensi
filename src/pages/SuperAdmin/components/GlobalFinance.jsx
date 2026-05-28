import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Building2, Users, TrendingUp, CalendarDays, Loader2 } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';

const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

const GlobalFinance = () => {
  const [tenants, setTenants] = useState([]);
  const [summary, setSummary] = useState({ totalTenants: 0, totalEmployees: 0, totalPayrollPaid: 0, totalPendingLoans: 0, totalPendingReimb: 0, recentPeriods: [], tenantStats: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const { data: allTenants } = await supabase.from('tenants').select('id, name, tier, is_active');
    if (!allTenants) { setLoading(false); return; }
    setTenants(allTenants);

    let totalEmployees = 0, totalPayrollPaid = 0, totalPendingLoans = 0, totalPendingReimb = 0;
    const tenantStats = [];

    for (const t of allTenants) {
      const { count: empCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('tenant_id', t.id).in('role', ['EMPLOYEE', 'SUB_ADMIN']);
      const employeeCount = empCount || 0;
      totalEmployees += employeeCount;

      const { data: payrolls } = await supabase.from('payroll_summary').select('take_home_pay').eq('tenant_id', t.id);
      const tenantPayroll = (payrolls || []).reduce((s, r) => s + Number(r.take_home_pay), 0);
      totalPayrollPaid += tenantPayroll;

      const { count: loans } = await supabase.from('loans').select('*', { count: 'exact', head: true }).eq('tenant_id', t.id).in('status', ['PENDING', 'ACTIVE']);
      totalPendingLoans += loans || 0;

      const { count: reimb } = await supabase.from('reimbursements').select('*', { count: 'exact', head: true }).eq('tenant_id', t.id).eq('status', 'PENDING');
      totalPendingReimb += reimb || 0;

      const { data: periods } = await supabase.from('payroll_periods').select('period_month, period_year, status').eq('tenant_id', t.id).eq('status', 'LOCKED');
      const latestPeriod = periods?.[0];

      tenantStats.push({
        id: t.id, name: t.name, tier: t.tier, isActive: t.is_active,
        employeeCount, totalPayroll: tenantPayroll,
        pendingLoans: loans || 0, pendingReimb: reimb || 0,
        latestPeriod: latestPeriod ? `${MONTHS[latestPeriod.period_month-1]} ${latestPeriod.period_year}` : '-'
      });
    }

    tenantStats.sort((a, b) => b.totalPayroll - a.totalPayroll);

    const { data: recentLogs } = await supabase.from('payroll_periods')
      .select('period_month, period_year, status, processed_at, tenant_id')
      .eq('status', 'LOCKED')
      .order('processed_at', { ascending: false })
      .limit(10);

    setSummary({ totalTenants: allTenants.length, totalEmployees, totalPayrollPaid, totalPendingLoans, totalPendingReimb, recentPeriods: recentLogs || [], tenantStats });
    setLoading(false);
  };

  if (loading) return <div className="p-20 text-center"><Loader2 size={32} className="animate-spin mx-auto text-[var(--aurora-3)]" /></div>;

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <h2 className="text-xl font-serif font-bold text-white mb-1">Global Finance Overview</h2>
        <p className="text-sm text-gray-400">Cross-tenant payroll & employee finance analytics</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1"><Building2 size={14} className="inline mr-1 text-[var(--aurora-3)]" />Tenants</p>
          <p className="text-2xl font-bold text-white">{summary.totalTenants}</p>
        </div>
        <div className="glass-panel p-5">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1"><Users size={14} className="inline mr-1 text-[var(--aurora-1)]" />Total Employees</p>
          <p className="text-2xl font-bold text-white">{summary.totalEmployees.toLocaleString()}</p>
        </div>
        <div className="glass-panel p-5 border-[var(--success)]/20">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1"><DollarSign size={14} className="inline mr-1 text-[var(--success)]" />Total Payroll Paid</p>
          <p className="text-2xl font-bold text-[var(--success)] font-mono">Rp {summary.totalPayrollPaid.toLocaleString()}</p>
        </div>
        <div className="glass-panel p-5">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1"><TrendingUp size={14} className="inline mr-1 text-[var(--warning)]" />Pending Approvals</p>
          <p className="text-2xl font-bold text-[var(--warning)]">{summary.totalPendingLoans + summary.totalPendingReimb}</p>
          <p className="text-[9px] text-gray-500">{summary.totalPendingLoans} loans • {summary.totalPendingReimb} claims</p>
        </div>
      </div>

      <div className="glass-panel p-6">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Payroll by Tenant</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-gray-500 uppercase tracking-widest">
              <tr>
                <th className="p-4 font-bold">Tenant</th>
                <th className="p-4 font-bold">Tier</th>
                <th className="p-4 font-bold text-right">Karyawan</th>
                <th className="p-4 font-bold text-right">Total Payroll</th>
                <th className="p-4 font-bold text-center">Pinjaman</th>
                <th className="p-4 font-bold text-center">Klaim</th>
                <th className="p-4 font-bold">Period Terakhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {summary.tenantStats.map(t => (
                <tr key={t.id} className="hover:bg-white/[0.02]">
                  <td className="p-4 font-bold text-white">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${t.isActive ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'}`} />
                    {t.name}
                  </td>
                  <td className="p-4 text-gray-400">{t.tier || 'Standard'}</td>
                  <td className="p-4 text-right">{t.employeeCount}</td>
                  <td className="p-4 text-right font-mono text-[var(--success)]">Rp {t.totalPayroll.toLocaleString()}</td>
                  <td className="p-4 text-center">{t.pendingLoans}</td>
                  <td className="p-4 text-center">{t.pendingReimb}</td>
                  <td className="p-4 text-gray-400">{t.latestPeriod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GlobalFinance;
