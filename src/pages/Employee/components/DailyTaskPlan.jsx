import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardCheck, Plus, Trash2, GripVertical, Send,
  Loader2, ArrowLeft, Clock, CalendarDays, CheckCircle2,
  AlertCircle, XCircle, FileText
} from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'var(--warning)' },
  submitted: { label: 'Terkirim', color: 'var(--aurora-3)' },
  approved: { label: 'Disetujui', color: 'var(--success)' },
  rejected: { label: 'Ditolak', color: 'var(--danger)' },
};

const DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const DailyTaskPlan = ({ onBack }) => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState(null);
  const [isWfhToday, setIsWfhToday] = useState(false);
  const [todayPlan, setTodayPlan] = useState(null);
  const [weeklyPlans, setWeeklyPlans] = useState([]);
  const [tasks, setTasks] = useState([{ title: '', description: '', estimated_hours: 1 }]);
  const [currentStatus, setCurrentStatus] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: prof } = await supabase.from('profiles')
        .select('id, tenant_id').eq('auth_id', session.user.id).maybeSingle();
      if (!prof?.id) return;
      setProfileId(prof.id);

      // Check today's schedule
      const { data: sched } = await supabase
        .from('user_schedules')
        .select('work_mode')
        .eq('user_id', prof.id)
        .eq('date', today)
        .maybeSingle();

      const wfh = sched?.work_mode === 'WFH';
      setIsWfhToday(wfh);

      // Fetch today's plan if exists
      const { data: plan } = await supabase
        .from('daily_task_plans')
        .select('*')
        .eq('profile_id', prof.id)
        .eq('date', today)
        .maybeSingle();

      if (plan) {
        setTodayPlan(plan);
        setCurrentStatus(STATUS_CONFIG[plan.status] || STATUS_CONFIG.pending);
        if (plan.tasks && Array.isArray(plan.tasks) && plan.tasks.length > 0) {
          setTasks(plan.tasks);
        }
      }

      // Fetch this week's plans
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      const startStr = startOfWeek.toISOString().split('T')[0];
      const endStr = endOfWeek.toISOString().split('T')[0];

      const { data: weekData } = await supabase
        .from('daily_task_plans')
        .select('*')
        .eq('profile_id', prof.id)
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date');

      setWeeklyPlans(weekData || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const addTask = () => {
    setTasks([...tasks, { title: '', description: '', estimated_hours: 1 }]);
  };

  const removeTask = (idx) => {
    if (tasks.length <= 1) return;
    setTasks(tasks.filter((_, i) => i !== idx));
  };

  const updateTask = (idx, field, value) => {
    const updated = tasks.map((t, i) => i === idx ? { ...t, [field]: value } : t);
    setTasks(updated);
  };

  const moveTask = (from, to) => {
    if (to < 0 || to >= tasks.length) return;
    const updated = [...tasks];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setTasks(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!profileId) return;
    const validTasks = tasks.filter(t => t.title.trim());
    if (validTasks.length === 0) {
      toast('Tambahkan minimal satu tugas', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        profile_id: profileId,
        date: today,
        tasks: validTasks,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('daily_task_plans')
        .upsert(payload, { onConflict: 'profile_id,date' });
      if (error) throw error;

      toast('Rencana tugas berhasil dikirim', 'success');
      await fetchData();
    } catch (e) {
      toast('Gagal menyimpan: ' + (e.message || e), 'error');
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center p-20">
      <Loader2 size={28} className="animate-spin text-[var(--aurora-3)]" />
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col gap-6 pb-24"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-serif font-bold text-white">Rencana Tugas Harian</h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Not WFH Warning */}
      {!isWfhToday && (
        <div className="p-4 bg-[var(--danger)]/5 border border-[var(--danger)]/20 rounded-2xl flex items-start gap-3">
          <AlertCircle size={16} className="text-[var(--danger)] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-white">Hari ini bukan jadwal WFH</p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Rencana tugas harian hanya tersedia untuk hari kerja WFH. Jadwal Anda hari ini adalah WFO.
            </p>
          </div>
        </div>
      )}

      {/* Today's Plan Status */}
      {todayPlan && currentStatus && (
        <div className={`glass-panel p-4 rounded-2xl border flex items-center gap-3`} style={{ borderColor: currentStatus.color + '30', background: currentStatus.color + '08' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: currentStatus.color + '15', color: currentStatus.color }}>
            {currentStatus.label === 'Disetujui' ? <CheckCircle2 size={18} /> : currentStatus.label === 'Ditolak' ? <XCircle size={18} /> : <Clock size={18} />}
          </div>
          <div>
            <p className="text-xs font-bold text-white">
              Status Hari Ini: <span style={{ color: currentStatus.color }}>{currentStatus.label}</span>
            </p>
            {todayPlan.submitted_at && (
              <p className="text-[9px] text-gray-500 mt-0.5">
                Dikirim {new Date(todayPlan.submitted_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Form */}
      {isWfhToday && (
        <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-[32px] border border-white/5 space-y-5 bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ClipboardCheck size={16} className="text-[var(--aurora-3)]" />
              Daftar Tugas
            </h3>
            <button
              type="button"
              onClick={addTask}
              className="flex items-center gap-1 text-[10px] text-[var(--aurora-3)] font-bold hover:text-white transition-colors"
            >
              <Plus size={14} /> Tambah Tugas
            </button>
          </div>

          <AnimatePresence mode="popLayout">
            {tasks.map((task, idx) => (
              <motion.div
                key={idx}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => moveTask(idx, idx - 1)}
                    className="text-gray-600 hover:text-white transition-colors p-1"
                  >
                    <GripVertical size={14} />
                  </button>
                  <span className="text-[9px] text-gray-500 font-mono font-bold">#{idx + 1}</span>
                  {tasks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTask(idx)}
                      className="ml-auto text-[var(--danger)] hover:opacity-70 transition-opacity p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div>
                  <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Judul Tugas *</label>
                  <input
                    required
                    value={task.title}
                    onChange={e => updateTask(idx, 'title', e.target.value)}
                    placeholder="Deskripsi singkat tugas"
                    className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs outline-none focus:border-[var(--aurora-3)]"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Deskripsi</label>
                  <textarea
                    rows={2}
                    value={task.description}
                    onChange={e => updateTask(idx, 'description', e.target.value)}
                    placeholder="Detail pekerjaan yang akan dilakukan"
                    className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs outline-none focus:border-[var(--aurora-3)] resize-none"
                  />
                </div>
                <div className="w-1/2">
                  <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Estimasi Jam</label>
                  <input
                    type="number"
                    min={0.5}
                    max={24}
                    step={0.5}
                    value={task.estimated_hours}
                    onChange={e => updateTask(idx, 'estimated_hours', parseFloat(e.target.value) || 1)}
                    className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs outline-none focus:border-[var(--aurora-3)]"
                  />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {tasks.length === 0 && (
            <div className="text-center py-6">
              <ClipboardCheck size={32} className="text-gray-600 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Belum ada tugas. Klik "Tambah Tugas" untuk memulai.</p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[var(--aurora-3)] to-[var(--success)] text-black font-bold text-sm flex items-center justify-center gap-3 disabled:opacity-50 hover:opacity-90 transition-all shadow-[0_0_25px_rgba(0,201,255,0.2)]"
          >
            {saving ? <><Loader2 size={18} className="animate-spin" /> Menyimpan...</> : <><Send size={18} /> Kirim Rencana Tugas</>}
          </button>
        </form>
      )}

      {/* This Week's Plans */}
      <div className="glass-panel p-5 border border-white/5 rounded-2xl">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
          <CalendarDays size={16} className="text-[var(--aurora-3)]" />
          Rencana Minggu Ini
        </h3>
        {weeklyPlans.length === 0 ? (
          <div className="text-center py-8">
            <FileText size={32} className="text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Belum ada rencana tugas minggu ini</p>
          </div>
        ) : (
          <div className="space-y-2">
            {weeklyPlans.map((plan, i) => {
              const d = new Date(plan.date + 'T00:00:00');
              const dayName = DAYS_ID[d.getDay()];
              const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
              const isTodayPlan = plan.date === today;
              const planStatus = STATUS_CONFIG[plan.status] || STATUS_CONFIG.pending;
              const taskCount = Array.isArray(plan.tasks) ? plan.tasks.length : 0;
              const totalHours = Array.isArray(plan.tasks) ? plan.tasks.reduce((s, t) => s + (t.estimated_hours || 0), 0) : 0;

              return (
                <div
                  key={plan.id || i}
                  className={`flex items-center justify-between p-3 rounded-xl border ${isTodayPlan ? 'bg-[var(--aurora-3)]/5 border-[var(--aurora-3)]/20' : 'bg-white/5 border-white/5'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-center w-12">
                      <p className={`text-xs font-bold ${isTodayPlan ? 'text-[var(--aurora-3)]' : 'text-white'}`}>{d.getDate()}</p>
                      <p className="text-[8px] text-gray-500 uppercase">{dayName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white font-medium">{dateStr} {isTodayPlan ? '(Hari ini)' : ''}</p>
                      <p className="text-[8px] text-gray-500">{taskCount} tugas • ~{totalHours} jam</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg" style={{ color: planStatus.color, background: planStatus.color + '15' }}>
                    {planStatus.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default DailyTaskPlan;
