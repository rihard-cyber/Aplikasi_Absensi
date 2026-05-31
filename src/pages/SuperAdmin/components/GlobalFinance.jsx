import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Building2, Users, TrendingUp, CalendarDays, Loader2, ArrowUpRight, ArrowDownRight, Wallet, CreditCard } from 'lucide-react';
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

  const metricCards = [
    {
      label: 'Total Tenant',
      value: summary.totalTenants,
      icon: Building2,
      color: 'var(--aurora-3)',
      glow: 'rgba(0,201,255,0.4)',
      change: '+2 minggu ini',
      up: true
    },
    {
      label: 'Total Karyawan',
      value: summary.totalEmployees.toLocaleString(),
      icon: Users,
      color: 'var(--aurora-1)',
      glow: 'rgba(142,45,226,0.4)',
      change: '+12% dari bulan lalu',
      up: true
    },
    {
      label: 'Total Payroll Dibayar',
      value: `Rp ${summary.totalPayrollPaid.toLocaleString()}`,
      icon: DollarSign,
      color: '#00E676',
      glow: 'rgba(0,230,118,0.4)',
      change: 'Termasuk semua tenant',
      up: true
    },
    {
      label: 'Menunggu Persetujuan',
      value: summary.totalPendingLoans + summary.totalPendingReimb,
      icon: CreditCard,
      color: '#FFD600',
      glow: 'rgba(255,214,0,0.4)',
      change: `${summary.totalPendingLoans} pinjaman • ${summary.totalPendingReimb} klaim`,
      up: false
    }
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--aurora-3)]/5 rounded-full blur-[100px] pointer-events-none" />
        <h2 className="text-xl font-serif font-bold text-white mb-1">Global Finance Overview</h2>
        <p className="text-sm text-gray-400">Cross-tenant payroll & employee finance analytics</p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] hover:bg-white/10 hover:border-white/20 transition-all duration-300 relative overflow-hidden group"
          >
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500" style={{ background: `radial-gradient(circle, ${card.glow}, transparent)` }} />
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${card.color}15`, color: card.color, boxShadow: `0 0 15px ${card.glow}` }}>
                <card.icon size={18} />
              </div>
              {card.change && (
                <span className={`flex items-center gap-0.5 text-[9px] font-bold ${card.up ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {card.up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {card.change}
                </span>
              )}
            </div>
            <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold mb-1">{card.label}</p>
            <p className="text-2xl font-bold font-serif tracking-tight" style={{ color: card.label === 'Total Payroll Dibayar' ? '#00E676' : card.label === 'Menunggu Persetujuan' ? '#FFD600' : 'white' }}>
              {card.value}
              <span className="inline-block w-1.5 h-1.5 rounded-full ml-1 align-middle animate-pulse" style={{ backgroundColor: card.color, boxShadow: `0 0 6px ${card.glow}` }} />
            </p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[var(--aurora-3)]/30 to-transparent pointer-events-none" />
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--aurora-3)]/10 flex items-center justify-center text-[var(--aurora-3)] shadow-[0_0_10px_rgba(0,201,255,0.2)]">
              <Wallet size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Payroll by Tenant</h3>
              <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">{summary.tenantStats.length} tenant terdaftar</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/5">
                <th className="p-4 pl-6 font-bold text-gray-400 uppercase tracking-widest text-[9px]">Tenant</th>
                <th className="p-4 font-bold text-gray-400 uppercase tracking-widest text-[9px]">Tier</th>
                <th className="p-4 font-bold text-gray-400 uppercase tracking-widest text-[9px] text-right">Karyawan</th>
                <th className="p-4 font-bold text-gray-400 uppercase tracking-widest text-[9px] text-right">Total Payroll</th>
                <th className="p-4 font-bold text-gray-400 uppercase tracking-widest text-[9px] text-center">Pinjaman</th>
                <th className="p-4 font-bold text-gray-400 uppercase tracking-widest text-[9px] text-center">Klaim</th>
                <th className="p-4 pr-6 font-bold text-gray-400 uppercase tracking-widest text-[9px]">Periode Terakhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {summary.tenantStats.map((t, i) => (
                <motion.tr
                  key={t.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="hover:bg-white/[0.03] transition-colors group relative"
                >
                  <td className="p-4 pl-6 font-bold text-white">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 shadow-[0_0_6px_currentColor] ${t.isActive ? 'text-emerald-400 bg-emerald-400' : 'text-rose-500 bg-rose-500'}`} />
                      <span className="text-sm">{t.name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${
                      t.tier === 'Enterprise' ? 'bg-[var(--warning)]/10 text-[var(--warning)] border border-[var(--warning)]/30' :
                      t.tier === 'Gold' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                      t.tier === 'Silver' ? 'bg-gray-400/10 text-gray-400 border border-gray-400/30' :
                      'bg-orange-500/10 text-orange-400 border border-orange-500/30'
                    }`}>{t.tier || 'Standard'}</span>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-gray-300 font-medium">{t.employeeCount}</span>
                  </td>
                  <td className="p-4 text-right">
                    <span className="font-mono font-bold text-emerald-400 drop-shadow-[0_0_6px_rgba(0,230,118,0.3)]">
                      Rp {t.totalPayroll.toLocaleString()}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={t.pendingLoans > 0 ? 'text-amber-400 font-bold' : 'text-gray-500'}>{t.pendingLoans}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={t.pendingReimb > 0 ? 'text-[var(--aurora-3)] font-bold' : 'text-gray-500'}>{t.pendingReimb}</span>
                  </td>
                  <td className="p-4 pr-6">
                    <span className="text-gray-400 font-mono text-[10px]">{t.latestPeriod}</span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {summary.tenantStats.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">Belum ada data payroll tenant.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default GlobalFinance;
