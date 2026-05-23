/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, CalendarDays, Clock, DollarSign, Loader2 } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';

const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

const MiniBar = ({ data, max, color, height = 32 }) => (
  <div className="flex items-end gap-0.5 h-full">
    {data.map((v, i) => (
      <div key={i} className="flex-1 rounded-t-sm transition-all hover:opacity-80 cursor-pointer relative group" style={{ height: `${max > 0 ? (v / max) * 100 : 0}%`, minHeight: '2px', background: color }}>
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/90 text-white text-[7px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">{v}</div>
      </div>
    ))}
  </div>
);

const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0, totalProjects: 0, totalDivisions: 0,
    attendanceToday: 0, attendanceOnTime: 0, attendanceLate: 0,
    totalPayroll: 0, avgSalary: 0,
    departmentData: [], monthlyAttendance: [], monthlyPayroll: []
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const { data: p } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!p?.tenant_id && !isGod) { setLoading(false); return; }
    const tid = p?.tenant_id;

    let q1 = supabase.from('profiles').select('*', { count: 'exact', head: true });
    if (tid) q1 = q1.eq('tenant_id', tid);
    q1 = q1.in('role', ['EMPLOYEE', 'SUB_ADMIN']);
    const { count: empCount } = await q1;
    let q2 = supabase.from('projects').select('*', { count: 'exact', head: true });
    if (tid) q2 = q2.eq('tenant_id', tid);
    const { count: projCount } = await q2;
    let q3 = supabase.from('divisions').select('*', { count: 'exact', head: true });
    if (tid) q3 = q3.eq('tenant_id', tid);
    const { count: divCount } = await q3;

    const today = new Date().toISOString().split('T')[0];
    const { data: todayLogs } = await supabase.from('attendance_logs')
      .select('user_id, status').gte('timestamp', today + 'T00:00:00Z').lte('timestamp', today + 'T23:59:59Z');
    const uniqueToday = new Set((todayLogs || []).map(l => l.user_id)).size;
    const onTime = (todayLogs || []).filter(l => l.status === 'ONTIME').length;
    const late = (todayLogs || []).filter(l => l.status === 'LATE' || l.status === 'OUT_OF_RANGE').length;

    const { data: payrolls } = await supabase.from('payroll_summary').select('take_home_pay, period_id, payroll_periods!inner(period_month, period_year)').eq('payroll_periods.status', 'PAID');
    const totalPayroll = (payrolls || []).reduce((s, r) => s + Number(r.take_home_pay), 0);
    const avgSalary = empCount && (payrolls || []).length > 0 ? Math.round(totalPayroll / (payrolls || []).length) : 0;

    const monthlyPayrollData = {};
    (payrolls || []).forEach(r => {
      const key = `${r.payroll_periods?.period_year}-${r.payroll_periods?.period_month}`;
      const currentVal = Reflect.get(monthlyPayrollData, key) || 0;
      Reflect.set(monthlyPayrollData, key, currentVal + Number(r.take_home_pay));
    });
    const monthlyPayroll = Object.entries(monthlyPayrollData).sort().slice(-6).map(([, v]) => Math.round(v));

    const monthlyAttData = {};
    (todayLogs || []).forEach(l => {
      const d = new Date(l.timestamp);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const currentVal = Reflect.get(monthlyAttData, key) || 0;
      Reflect.set(monthlyAttData, key, currentVal + 1);
    });
    const monthlyAttendance = Object.entries(monthlyAttData).sort().slice(-6).map(([, v]) => v);

    let qDivs = supabase.from('divisions').select('id, name, tenant_id');
    if (tid) qDivs = qDivs.eq('tenant_id', tid);
    const { data: divs } = await qDivs;
    const deptData = [];
    for (const div of divs || []) {
      let qc = supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('division_id', div.id);
      if (tid) qc = qc.eq('tenant_id', tid);
      const { count } = await qc;
      if (count > 0) deptData.push({ name: div.name, count });
    }

    setStats({
      totalEmployees: empCount || 0, totalProjects: projCount || 0, totalDivisions: divCount || 0,
      attendanceToday: uniqueToday, attendanceOnTime: onTime, attendanceLate: late,
      totalPayroll, avgSalary, departmentData: deptData.slice(0, 8), monthlyAttendance, monthlyPayroll
    });
    setLoading(false);
  };

  if (loading) return <div className="p-20 text-center"><Loader2 size={32} className="animate-spin mx-auto text-[var(--aurora-3)]" /></div>;

  const maxDept = Math.max(...stats.departmentData.map(d => d.count), 1);
  const maxAtt = Math.max(...stats.monthlyAttendance, 1);
  const maxPay = Math.max(...stats.monthlyPayroll, 1);

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <h2 className="text-xl font-serif font-bold text-white">Analytics Dashboard</h2>
        <p className="text-sm text-gray-400">Data real-time: absensi, payroll, dan demografi</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: <Users size={18} />, label: 'Karyawan', value: stats.totalEmployees, color: 'var(--aurora-3)' },
          { icon: <CalendarDays size={18} />, label: 'Hadir Hari Ini', value: stats.attendanceToday, color: 'var(--success)', sub: `${stats.attendanceOnTime} tepat • ${stats.attendanceLate} telat` },
          { icon: <DollarSign size={18} />, label: 'Total Payroll', value: `Rp${(stats.totalPayroll / 1000000).toFixed(1)}jt`, color: 'var(--aurora-1)' },
          { icon: <TrendingUp size={18} />, label: 'Rata-rata Gaji', value: `Rp${(stats.avgSalary / 1000000).toFixed(1)}jt`, color: 'var(--warning)' },
        ].map((card, i) => (
          <div key={i} className="glass-panel p-5 border-l-4" style={{ borderLeftColor: card.color }}>
            <div className="flex items-center gap-2 mb-2" style={{ color: card.color }}>{card.icon}<span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">{card.label}</span></div>
            <p className="text-2xl font-bold text-white font-mono">{card.value}</p>
            {card.sub && <p className="text-[8px] text-gray-500 mt-1">{card.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><BarChart3 size={16} className="text-[var(--aurora-3)]" />Karyawan per Divisi</h3>
          {stats.departmentData.length > 0 ? (
            <div className="space-y-3">
              {stats.departmentData.map((d, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300">{d.name}</span>
                    <span className="text-white font-mono font-bold">{d.count}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(d.count / maxDept) * 100}%` }} className="h-full rounded-full bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)]" />
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-500 text-xs">Belum ada data divisi</p>}
        </div>

        <div className="glass-panel p-6">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Clock size={16} className="text-[var(--success)]" />Tren Absensi (6 bulan)</h3>
          <div className="h-32">
            {stats.monthlyAttendance.length > 0 ? (
              <MiniBar data={stats.monthlyAttendance} max={maxAtt} color="var(--aurora-3)" />
            ) : <p className="text-gray-500 text-xs">Belum ada data absensi</p>}
          </div>
          <div className="flex justify-between mt-2 text-[8px] text-gray-500">
            {stats.monthlyAttendance.map((_, i) => <span key={i}>{MONTHS[(new Date().getMonth() - 5 + i + 12) % 12]}</span>)}
          </div>
        </div>
      </div>

      <div className="glass-panel p-6">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><DollarSign size={16} className="text-[var(--warning)]" />Tren Payroll (6 bulan)</h3>
        <div className="h-40">
          {stats.monthlyPayroll.length > 0 ? (
            <MiniBar data={stats.monthlyPayroll} max={maxPay} color="var(--success)" />
          ) : <p className="text-gray-500 text-xs">Belum ada data payroll</p>}
        </div>
        <div className="flex justify-between mt-2 text-[8px] text-gray-500">
          {stats.monthlyPayroll.map((_, i) => <span key={i}>{MONTHS[(new Date().getMonth() - 5 + i + 12) % 12]}</span>)}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
