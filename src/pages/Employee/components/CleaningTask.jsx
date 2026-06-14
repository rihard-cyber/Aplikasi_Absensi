import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Clock, MapPin, Camera, Loader2, ChevronLeft, AlertCircle, ClipboardList, Sparkles, Package, X } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';

const t = (s) => s;

const CleaningTask = ({ onBack, user }) => {
  const [tasks, setTasks] = useState([]);
  const [areas, setAreas] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [photoBefore, setPhotoBefore] = useState(null);
  const [photoAfter, setPhotoAfter] = useState(null);
  const [taskNotes, setTaskNotes] = useState('');
  const [checkResults, setCheckResults] = useState({});
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [tenantId, setTenantId] = useState(null);

  useEffect(() => { init(); }, []);

  const init = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
      if (!profile?.tenant_id) return;
      setTenantId(profile.tenant_id);

      const [aRes, tRes, lRes, cRes] = await Promise.all([
        supabase.from('cleaning_areas').select('*').eq('tenant_id', profile.tenant_id).eq('is_active', true).order('name'),
        supabase.from('cleaning_tasks').select('*, cleaning_areas(*)').eq('tenant_id', profile.tenant_id).eq('is_active', true).order('task_name'),
        supabase.from('cleaning_logs').select('*, cleaning_areas(name), cleaning_tasks(task_name)').eq('tenant_id', profile.tenant_id).eq('assigned_to', profile.id).order('created_at', { ascending: false }),
        supabase.from('cleaning_checklist').select('*').eq('tenant_id', profile.tenant_id).eq('is_active', true).order('sort_order'),
      ]);
      setAreas(aRes.data || []);
      setTasks(tRes.data || []);
      setHistory(lRes.data || []);
      setChecklist(cRes.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const todayTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const doneIds = new Set(history.filter(h => h.created_at?.startsWith(today)).map(h => h.task_id));
    return tasks.filter(t => !doneIds.has(t.id));
  }, [tasks, history]);

  const handleStartTask = (task) => {
    setActiveTask(task);
    setPhotoBefore(null);
    setPhotoAfter(null);
    setTaskNotes('');
    const initCheck = {};
    checklist.forEach(c => { if (c.area_id === task.area_id) initCheck[c.id] = false; });
    setCheckResults(initCheck);
  };

  const capturePhoto = async (type) => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          if (type === 'before') setPhotoBefore(file);
          else setPhotoAfter(file);
        }
      };
      input.click();
    } catch { }
  };

  const uploadPhoto = async (file, prefix) => {
    if (!file) return null;
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `cleaning/${Date.now()}_${prefix}.${ext}`;
    const { error } = await supabase.storage.from('documents').upload(path, file);
    if (error) return null;
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
    return urlData?.publicUrl || null;
  };

  const handleComplete = async () => {
    if (!activeTask) return;
    setSubmitting(true);
    try {
      const urlBefore = photoBefore ? await uploadPhoto(photoBefore, 'before') : null;
      const urlAfter = photoAfter ? await uploadPhoto(photoAfter, 'after') : null;
      const { data: logData, error: logErr } = await supabase.from('cleaning_logs').insert({
        tenant_id: tenantId,
        task_id: activeTask.id,
        area_id: activeTask.area_id,
        assigned_to: user?.id,
        status: 'completed',
        notes: taskNotes.trim() || null,
        photo_before: urlBefore,
        photo_after: urlAfter,
        completed_at: new Date().toISOString(),
      }).select().single();
      if (logErr) throw logErr;

      if (logData && checklist.length > 0) {
        const results = Object.entries(checkResults)
          .filter(([, val]) => val === true || val === false)
          .map(([checklistId, isChecked]) => ({
            tenant_id: tenantId,
            log_id: logData.id,
            checklist_id: checklistId,
            is_checked: isChecked,
          }));
        if (results.length > 0) {
          await supabase.from('cleaning_checklist_results').insert(results);
        }
      }
      setActiveTask(null);
      await init();
    } catch (e) {
      alert('Gagal: ' + e.message);
    }
    setSubmitting(false);
  };

  if (loading) return <div className="p-20 text-center"><div className="w-8 h-8 border-2 border-[var(--aurora-3)] border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && <button onClick={onBack} className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white"><ChevronLeft size={18} /></button>}
          <div>
            <h3 className="text-lg font-serif font-bold text-white">{showHistory ? t('Riwayat Cleaning') : t('Cleaning Task')}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{showHistory ? 'Laporan tugas kebersihan' : `${todayTasks.length} tugas hari ini`}</p>
          </div>
        </div>
        <button onClick={() => setShowHistory(!showHistory)} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] text-gray-400 hover:text-white font-bold">
          {showHistory ? 'Tugas' : 'Riwayat'}
        </button>
      </div>

      {activeTask ? (
        <motion.div initial={{ opacity: 0, y: 10 }} className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-4">
          <h4 className="text-sm font-bold text-white">{activeTask.task_name}</h4>
          <p className="text-xs text-gray-400 flex items-center gap-1.5"><MapPin size={12} /> {activeTask.cleaning_areas?.name}</p>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => capturePhoto('before')} className={`p-4 rounded-xl border border-dashed text-center transition-all ${photoBefore ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/[0.02] border-white/10 hover:bg-white/5'}`}>
              {photoBefore ? <img src={URL.createObjectURL(photoBefore)} className="w-full h-24 object-cover rounded-lg" /> : <Camera size={24} className="mx-auto text-gray-500 mb-1" />}
              <p className="text-[10px] text-gray-500 font-bold mt-1">{photoBefore ? 'Foto Before ✅' : 'Foto Before'}</p>
            </button>
            <button onClick={() => capturePhoto('after')} className={`p-4 rounded-xl border border-dashed text-center transition-all ${photoAfter ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/[0.02] border-white/10 hover:bg-white/5'}`}>
              {photoAfter ? <img src={URL.createObjectURL(photoAfter)} className="w-full h-24 object-cover rounded-lg" /> : <Camera size={24} className="mx-auto text-gray-500 mb-1" />}
              <p className="text-[10px] text-gray-500 font-bold mt-1">{photoAfter ? 'Foto After ✅' : 'Foto After'}</p>
            </button>
          </div>

          {checklist.filter(c => c.area_id === activeTask.area_id).length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Checklist</p>
              {checklist.filter(c => c.area_id === activeTask.area_id).map(item => (
                <label key={item.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 cursor-pointer hover:bg-white/5">
                  <input type="checkbox" checked={checkResults[item.id] || false} onChange={(e) => setCheckResults(prev => ({ ...prev, [item.id]: e.target.checked }))} className="w-4 h-4 rounded accent-[var(--aurora-3)]" />
                  <span className="text-xs text-gray-300">{item.item_name}</span>
                </label>
              ))}
            </div>
          )}

          <textarea value={taskNotes} onChange={e => setTaskNotes(e.target.value)} placeholder="Catatan (opsional)..." className="w-full bg-[#13151A] border border-white/20 rounded-xl p-3 text-xs text-white outline-none resize-none h-20" />

          <div className="flex gap-3">
            <button onClick={() => setActiveTask(null)} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-xs font-bold">Batal</button>
            <button onClick={handleComplete} disabled={submitting} className="flex-[2] py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-500/30">
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Selesai
            </button>
          </div>
        </motion.div>
      ) : !showHistory ? (
        <div className="space-y-2">
          {todayTasks.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-sm">
              <Sparkles size={32} className="mx-auto mb-3 text-emerald-500/50" />
              Semua tugas hari ini sudah selesai!
            </div>
          ) : (
            todayTasks.map(task => (
              <motion.button key={task.id} initial={{ opacity: 0, y: 5 }} onClick={() => handleStartTask(task)} className="w-full text-left p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:bg-white/5 transition-all flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0"><ClipboardList size={18} className="text-emerald-400" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{task.task_name}</p>
                  <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5"><MapPin size={10} /> {task.cleaning_areas?.name || 'Tanpa area'}</p>
                </div>
                <Clock size={14} className="text-gray-500 shrink-0" />
              </motion.button>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {history.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-sm">Belum ada riwayat.</div>
          ) : (
            history.map(log => (
              <div key={log.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-white">{log.cleaning_tasks?.task_name || '-'}</p>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] font-bold">{t('completed')}</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1"><MapPin size={10} className="inline" /> {log.cleaning_areas?.name} • {new Date(log.completed_at).toLocaleString('id-ID')}</p>
                {log.photo_after && <img src={log.photo_after} className="w-full h-32 object-cover rounded-xl mt-2" />}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CleaningTask;
