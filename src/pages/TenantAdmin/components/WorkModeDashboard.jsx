import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, MapPin, Home, Globe, Clock, Loader2,
  ChevronDown, ChevronUp, X, CalendarDays, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';

const MODE_CONFIG = {
  WFO: { label: 'WFO', color: 'var(--aurora-1)', bg: 'rgba(0,201,255,0.1)', icon: <MapPin size={14} /> },
  WFH: { label: 'WFH', color: 'var(--success)', bg: 'rgba(0,200,83,0.1)', icon: <Home size={14} /> },
  WFA: { label: 'WFA', color: 'var(--warning)', bg: 'rgba(255,193,7,0.1)', icon: <Globe size={14} /> },
};

const DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const WorkModeDashboard = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [weeklySchedules, setWeeklySchedules] = useState([]);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [wfhLimit, setWfhLimit] = useState(2);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles')
        .select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
      const tid = profile?.tenant_id;
      if (!tid) { setLoading(false); return; }

      // Fetch all employees
      const { data: emps } = await supabase.from('profiles')
        .select('id, full_name, nip, position, profile_photo')
        .in('role', ['EMPLOYEE', 'SUB_ADMIN'])
        .eq('tenant_id', tid);
      const empList = emps || [];
      setProfiles(empList);
      setTotalEmployees(empList.length);

      // Fetch policy for WFH limit
      const { data: policy } = await supabase.from('work_mode_policies')
        .select('max_wfh_days_per_week').eq('tenant_id', tid).maybeSingle();
      if (policy) setWfhLimit(policy.max_wfh_days_per_week || 2);

      // Fetch today's schedules with work_mode
      const today = new Date().toISOString().split('T')[0];
      const { data: todaySched } = await supabase
        .from('user_schedules')
        .select('user_id, date, work_mode, shift_id, master_shifts(shift_code, shift_name, time_in, time_out)')
        .eq('date', today)
        .eq('tenant_id', tid);

      setSchedules(todaySched || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const viewWeeklySchedule = async (empId, empName) => {
    setSelectedEmployee({ id: empId, name: empName });
    setLoadingWeek(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: prof } = await supabase.from('profiles')
        .select('tenant_id').eq('auth_id', session.user.id).maybeSingle();

      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const startStr = startOfWeek.toISOString().split('T')[0];
      const endStr = endOfWeek.toISOString().split('T')[0];

      const { data } = await supabase
        .from('user_schedules')
        .select('date, work_mode, shift_id, master_shifts(shift_code, shift_name, time_in, time_out)')
        .eq('user_id', empId)
        .eq('tenant_id', prof?.tenant_id)
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date');

      setWeeklySchedules(data || []);
    } catch (e) { console.error(e); }
    setLoadingWeek(false);
  };

  const getEmployeeSchedule = (empId) => {
    return schedules.find(s => s.user_id === empId);
  };

  const getEmployeeName = (empId) => {
    return profiles.find(p => p.id === empId);
  };

  const wfoCount = schedules.filter(s => s.work_mode === 'WFO').length;
  const wfhCount = schedules.filter(s => s.work_mode === 'WFH').length;
  const wfaCount = schedules.filter(s => s.work_mode === 'WFA').length;
  const notScheduled = totalEmployees - schedules.length;

  const filteredEmployees = filter === 'ALL'
    ? profiles
    : filter === 'UNSCHEDULED'
      ? profiles.filter(p => !schedules.find(s => s.user_id === p.id))
      : profiles.filter(p => {
          const s = schedules.find(sch => sch.user_id === p.id);
          return s?.work_mode === filter;
        });

  const complianceRate = totalEmployees > 0
    ? Math.round(((schedules.length) / totalEmployees) * 100)
    : 0;

  if (loading) return (
    <div className="flex items-center justify-center p-20">
      <Loader2 size={28} className="animate-spin text-[var(--aurora-3)]" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-serif font-bold text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center">
            <Globe size={20} className="text-white" />
          </div>
          Work Mode Dashboard
        </h2>
        <p className="text-gray-400 text-sm mt-1 ml-[52px]">
          Pantau mode kerja karyawan hari ini
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'WFO', value: wfoCount, color: 'var(--aurora-1)', bg: 'rgba(0,201,255,0.08)' },
          { label: 'WFH', value: wfhCount, color: 'var(--success)', bg: 'rgba(0,200,83,0.08)' },
          { label: 'WFA', value: wfaCount, color: 'var(--warning)', bg: 'rgba(255,193,7,0.08)' },
          { label: 'Belum Jadwal', value: notScheduled, color: 'var(--danger)', bg: 'rgba(255,0,85,0.08)' },
        ].map(card => (
          <motion.button
            key={card.label}
            onClick={() => setFilter(card.label === 'Belum Jadwal' ? 'UNSCHEDULED' : card.label === 'WFO' ? 'WFO' : card.label === 'WFH' ? 'WFH' : card.label === 'WFA' ? 'WFA' : 'ALL')}
            whileTap={{ scale: 0.97 }}
            className={`glass-panel p-4 rounded-2xl border text-left transition-all ${filter === (card.label === 'Belum Jadwal' ? 'UNSCHEDULED' : card.label) ? 'border-white/20 bg-white/[0.04]' : 'border-white/5'}`}
          >
            <p className="text-2xl font-black tracking-tight" style={{ color: card.color }}>{card.value}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-0.5">{card.label}</p>
          </motion.button>
        ))}
      </div>

      {/* Compliance Bar */}
      <div className="glass-panel p-4 border border-white/5 rounded-2xl flex items-center gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <CheckCircle2 size={16} className="text-[var(--success)]" />
          <span className="text-xs font-bold text-white">Kepatuhan Jadwal</span>
        </div>
        <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${complianceRate}%` }}
            className="h-full rounded-full bg-gradient-to-r from-[var(--aurora-3)] to-[var(--success)]"
          />
        </div>
        <span className="text-xs font-bold text-white shrink-0">{complianceRate}%</span>
        <span className="text-[9px] text-gray-500">{schedules.length}/{totalEmployees} karyawan terjadwal</span>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar flex-wrap">
        {[
          { key: 'ALL', label: 'Semua' },
          { key: 'WFO', label: 'WFO' },
          { key: 'WFH', label: 'WFH' },
          { key: 'WFA', label: 'WFA' },
          { key: 'UNSCHEDULED', label: 'Belum Jadwal' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${filter === f.key ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/5 text-gray-500 hover:border-white/15'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employee List */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
            <Users size={16} className="text-[var(--aurora-3)]" />
            Karyawan ({filteredEmployees.length})
          </h3>
          <AnimatePresence mode="popLayout">
            {filteredEmployees.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel p-8 rounded-2xl border border-white/5 text-center">
                <Users size={36} className="text-gray-600 mx-auto mb-2" />
                <p className="text-xs text-gray-500">Tidak ada karyawan</p>
              </motion.div>
            ) : (
              filteredEmployees.map((emp, i) => {
                const sched = getEmployeeSchedule(emp.id);
                const mode = sched?.work_mode || null;
                const shift = sched?.master_shifts || null;
                const config = MODE_CONFIG[mode] || null;
                return (
                  <motion.div
                    key={emp.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => viewWeeklySchedule(emp.id, emp.full_name)}
                    className={`glass-panel p-3.5 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all hover:border-white/20 ${selectedEmployee?.id === emp.id ? 'border-[var(--aurora-3)]/40 bg-white/[0.03]' : 'border-white/5'}`}
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {emp.profile_photo ? (
                        <img src={emp.profile_photo} alt="" className="w-full h-full rounded-xl object-cover" />
                      ) : (
                        emp.full_name?.charAt(0) || '?'
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{emp.full_name}</p>
                      <p className="text-[9px] text-gray-500 truncate">{emp.position || emp.nip}</p>
                    </div>
                    {/* Mode Badge + Shift Time */}
                    {mode && config ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold" style={{ background: config.bg, color: config.color }}>
                          {config.icon} {config.label}
                        </span>
                        {shift && (
                          <span className="text-[9px] font-mono text-gray-500">
                            {shift.time_in?.substring(0, 5)}-{shift.time_out?.substring(0, 5)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[9px] text-gray-600 px-2 py-1 rounded-lg bg-white/5 shrink-0">Belum Jadwal</span>
                    )}
                    <ChevronDown size={14} className="text-gray-600 shrink-0" />
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* Weekly Schedule Detail */}
        <div className="glass-panel p-5 border border-white/5 rounded-2xl">
          {selectedEmployee ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CalendarDays size={16} className="text-[var(--aurora-3)]" />
                  Jadwal {selectedEmployee.name}
                </h3>
                <button onClick={() => setSelectedEmployee(null)} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-all">
                  <X size={16} />
                </button>
              </div>
              {loadingWeek ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={20} className="animate-spin text-[var(--aurora-3)]" />
                </div>
              ) : weeklySchedules.length === 0 ? (
                <div className="text-center py-10">
                  <CalendarDays size={32} className="text-gray-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Tidak ada jadwal minggu ini</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {weeklySchedules.map((ws, idx) => {
                    const d = new Date(ws.date + 'T00:00:00');
                    const dayName = DAYS_ID[d.getDay()];
                    const isToday = ws.date === new Date().toISOString().split('T')[0];
                    const cfg = MODE_CONFIG[ws.work_mode] || null;
                    const s = ws.master_shifts || null;
                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-3 rounded-xl border ${isToday ? 'bg-[var(--aurora-3)]/5 border-[var(--aurora-3)]/20' : 'bg-white/5 border-white/5'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-center w-10">
                            <p className={`text-xs font-bold ${isToday ? 'text-[var(--aurora-3)]' : 'text-white'}`}>{d.getDate()}</p>
                            <p className="text-[8px] text-gray-500 uppercase">{dayName}</p>
                          </div>
                          {cfg ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold" style={{ background: cfg.bg, color: cfg.color }}>
                              {cfg.icon} {cfg.label}
                            </span>
                          ) : (
                            <span className="text-[9px] text-gray-600">—</span>
                          )}
                        </div>
                        <div className="text-right">
                          {s ? (
                            <p className="text-[10px] font-mono text-gray-400 font-bold">{s.shift_code}</p>
                          ) : (
                            <p className="text-[9px] text-gray-600">Tidak ada shift</p>
                          )}
                          {s?.time_in && (
                            <p className="text-[8px] font-mono text-gray-600">{s.time_in.substring(0, 5)}-{s.time_out?.substring(0, 5)}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users size={40} className="text-gray-600 mb-3" />
              <p className="text-sm text-gray-400 font-medium">Pilih Karyawan</p>
              <p className="text-[10px] text-gray-600 mt-1">Klik karyawan untuk melihat jadwal minggu ini</p>
            </div>
          )}
        </div>
      </div>

      {/* Summary Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: totalEmployees, color: 'var(--aurora-3)' },
          { label: 'Terjadwal', value: schedules.length, color: 'var(--success)' },
          { label: 'Max WFH/Minggu', value: wfhLimit, color: 'var(--warning)' },
          { label: 'Kepatuhan', value: `${complianceRate}%`, color: complianceRate > 75 ? 'var(--success)' : 'var(--danger)' },
        ].map(s => (
          <div key={s.label} className="glass-panel p-3 rounded-2xl border border-white/5 text-center">
            <p className="text-lg font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[8px] text-gray-500 uppercase tracking-widest font-bold mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkModeDashboard;
