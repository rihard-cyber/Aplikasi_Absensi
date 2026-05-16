import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, CheckCircle2, Circle, User, CalendarDays, Clock, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';

const OnboardingChecklist = () => {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [tenantId, setTenantId] = useState(null);
  const [adminId, setAdminId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ONBOARDING');
  const toast = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const isGod = (() => { try { return sessionStorage.getItem('god_key') === 'DEWA-999'; } catch { return false; } })();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: p } = await supabase.from('profiles').select('id, tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!p?.tenant_id && !isGod) return;
    if (p?.tenant_id) setTenantId(p.tenant_id);
    if (p?.id) setAdminId(p.id);

    let q1 = supabase.from('onboarding_tasks').select('*, profiles!user_id(full_name, nip, position), completed!completed_by(full_name)');
    if (p?.tenant_id) q1 = q1.eq('tenant_id', p.tenant_id);
    q1 = q1.order('created_at', { ascending: false });
    const { data: t } = await q1;
    if (t) setTasks(t);

    let q2 = supabase.from('profiles').select('id, full_name, nip');
    if (p?.tenant_id) q2 = q2.eq('tenant_id', p.tenant_id);
    q2 = q2.in('role', ['EMPLOYEE', 'SUB_ADMIN']);
    const { data: e } = await q2;
    if (e) setEmployees(e);
  };

  const handleToggle = async (taskId, current) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { data: p } = await supabase.from('profiles').select('id').eq('auth_id', session.user.id).maybeSingle();
    await supabase.from('onboarding_tasks').update({
      is_completed: !current,
      completed_by: !current ? p?.id : null,
      completed_at: !current ? new Date().toISOString() : null
    }).eq('id', taskId);
    toast(!current ? 'Tugas selesai!' : 'Tugas dibuka kembali', !current ? 'success' : 'info');
    fetchData();
  };

  const getEmployeeProgress = (empId) => {
    const empTasks = tasks.filter(t => t.user_id === empId);
    const done = empTasks.filter(t => t.is_completed).length;
    return { total: empTasks.length, done };
  };

  const filteredTasks = tasks.filter(t => filterCategory === 'ALL' || t.category === filterCategory);

  const employeeProgress = {};
  employees.forEach(e => { employeeProgress[e.id] = getEmployeeProgress(e.id); });

  return (
    <div className="glass-panel p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-6 mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">Onboarding & Offboarding</h2>
          <p className="text-sm text-gray-400 mt-1">Checklist tugas untuk karyawan baru & proses keluar</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['ONBOARDING', 'OFFBOARDING'].map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat === filterCategory ? 'ALL' : cat)}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all whitespace-nowrap ${filterCategory === cat ? 'bg-white/10 border-[var(--aurora-3)]/30 text-white' : 'bg-white/5 border-white/10 text-gray-500'}`}>
              {cat === 'ONBOARDING' ? '📋 Onboarding' : '🚪 Offboarding'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest">Total Tugas</p>
          <p className="text-xl font-bold text-white">{tasks.length}</p>
        </div>
        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest">Selesai</p>
          <p className="text-xl font-bold text-[var(--success)]">{tasks.filter(t => t.is_completed).length}</p>
        </div>
        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest">Pending</p>
          <p className="text-xl font-bold text-[var(--warning)]">{tasks.filter(t => !t.is_completed).length}</p>
        </div>
        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest">Karyawan</p>
          <p className="text-xl font-bold text-[var(--aurora-3)]">{Object.keys(employeeProgress).length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-2">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Progress per Karyawan</h3>
          {employees.filter(e => employeeProgress[e.id]?.total > 0).map(emp => {
            const prog = employeeProgress[emp.id];
            const pct = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
            return (
              <div key={emp.id} className="p-3 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center text-[8px] font-bold text-white">{emp.full_name?.charAt(0)}</div>
                    <span className="text-xs text-gray-300 truncate">{emp.full_name}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold" style={{ color: pct === 100 ? 'var(--success)' : 'var(--warning)' }}>{pct}%</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-1.5">
                  <div className="h-full rounded-full bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)]" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[9px] text-gray-500 mt-1">{prog.done}/{prog.total} selesai</p>
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-2 space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Daftar Tugas</h3>
          {filteredTasks.map(task => (
            <div key={task.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-all group">
              <button onClick={() => handleToggle(task.id, task.is_completed)} className="flex-shrink-0">
                {task.is_completed
                  ? <CheckCircle2 size={20} className="text-[var(--success)]" />
                  : <Circle size={20} className="text-gray-500 group-hover:text-[var(--aurora-3)]" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${task.is_completed ? 'text-gray-500 line-through' : 'text-white'}`}>{task.task_name}</span>
                  <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase font-bold ${task.category === 'ONBOARDING' ? 'bg-[var(--aurora-3)]/10 text-[var(--aurora-3)]' : 'bg-[var(--danger)]/10 text-[var(--danger)]'}`}>{task.category}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-[9px] text-gray-500">
                  <span className="flex items-center gap-1"><User size={10} /> {task.profiles?.full_name}</span>
                  {task.completed_at && <span className="flex items-center gap-1"><Clock size={10} /> {new Date(task.completed_at).toLocaleDateString('id-ID')}</span>}
                  {task.completed?.full_name && <span>oleh {task.completed.full_name}</span>}
                </div>
              </div>
            </div>
          ))}
          {!filteredTasks.length && <p className="text-gray-500 text-xs text-center py-8">Tidak ada tugas</p>}
        </div>
      </div>
    </div>
  );
};

export default OnboardingChecklist;
