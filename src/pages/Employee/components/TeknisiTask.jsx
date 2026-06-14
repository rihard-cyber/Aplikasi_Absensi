import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Wrench, Clock, MapPin, Camera, Loader2, ChevronLeft, CheckCircle2, ClipboardList, Package, Calendar, Search, Filter, FileText } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';

const t = (s) => s;

const TeknisiTask = ({ onBack, user }) => {
  const [workOrders, setWorkOrders] = useState([]);
  const [pmLogs, setPmLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeWO, setActiveWO] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState('wo');
  const [photoBefore, setPhotoBefore] = useState(null);
  const [photoAfter, setPhotoAfter] = useState(null);
  const [taskNotes, setTaskNotes] = useState('');
  const [tenantId, setTenantId] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [checklistItems, setChecklistItems] = useState([]);

  useEffect(() => { init(); }, []);

  const init = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles').select('tenant_id, id').eq('auth_id', session.user.id).maybeSingle();
      if (!profile?.tenant_id) return;
      setTenantId(profile.tenant_id);

      const [woRes, pmRes, histRes] = await Promise.all([
        supabase.from('work_orders').select('*, profiles!assigned_to(full_name)').eq('tenant_id', profile.tenant_id).eq('assigned_to', profile.id).in('status', ['OPEN', 'IN_PROGRESS']).order('created_at', { ascending: false }),
        supabase.from('pm_schedules').select('*, equipment_list(name, location, floor)').eq('tenant_id', profile.tenant_id).eq('is_active', true).order('task_name'),
        supabase.from('work_orders').select('*, profiles!assigned_to(full_name)').eq('tenant_id', profile.tenant_id).eq('assigned_to', profile.id).in('status', ['COMPLETED', 'CLOSED']).order('completed_at', { ascending: false }).limit(20),
      ]);
      setWorkOrders(woRes.data || []);
      setPmLogs(pmRes.data || []);
      setHistory(histRes.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const capturePhoto = (type) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.capture = 'environment';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) type === 'before' ? setPhotoBefore(file) : setPhotoAfter(file);
    };
    input.click();
  };

  const uploadPhoto = async (file, prefix) => {
    if (!file) return null;
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `engineering/${Date.now()}_${prefix}.${ext}`;
    const { error } = await supabase.storage.from('documents').upload(path, file);
    if (error) return null;
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
    return urlData?.publicUrl || null;
  };

  const handleComplete = async () => {
    if (!activeWO) return;
    setSubmitting(true);
    try {
      const urlBefore = photoBefore ? await uploadPhoto(photoBefore, 'before') : null;
      const urlAfter = photoAfter ? await uploadPhoto(photoAfter, 'after') : null;
      await supabase.from('work_orders').update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        completion_notes: taskNotes.trim() || null,
        photo_before: urlBefore,
        photo_after: urlAfter,
      }).eq('id', activeWO.id);
      setActiveWO(null);
      await init();
    } catch (e) { alert('Gagal: ' + e.message); }
    setSubmitting(false);
  };

  if (loading) return <div className="p-20 text-center"><div className="w-8 h-8 border-2 border-[var(--aurora-3)] border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && <button onClick={onBack} className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white"><ChevronLeft size={18} /></button>}
          <div>
            <h3 className="text-lg font-serif font-bold text-white">{showHistory ? t('Riwayat Tugas') : t('Tugas Teknisi')}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{showHistory ? `${history.length} tugas selesai` : `${workOrders.length} WO aktif`}</p>
          </div>
        </div>
        <button onClick={() => setShowHistory(!showHistory)} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] text-gray-400 hover:text-white font-bold">
          {showHistory ? 'Tugas' : 'Riwayat'}
        </button>
      </div>

      {activeWO ? (
        <motion.div initial={{ opacity: 0, y: 10 }} className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-4">
          <h4 className="text-sm font-bold text-white">{activeWO.title}</h4>
          <p className="text-xs text-gray-400">{activeWO.description}</p>
          {activeWO.profiles?.full_name && <p className="text-[10px] text-gray-500">Ditugaskan ke: {activeWO.profiles.full_name}</p>}

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => capturePhoto('before')} className={`p-4 rounded-xl border border-dashed text-center transition-all ${photoBefore ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/[0.02] border-white/10 hover:bg-white/5'}`}>
              {photoBefore ? <img src={URL.createObjectURL(photoBefore)} className="w-full h-24 object-cover rounded-lg" /> : <Camera size={24} className="mx-auto text-gray-500 mb-1" />}
              <p className="text-[10px] text-gray-500 font-bold mt-1">{photoBefore ? '✅ Before' : 'Foto Before'}</p>
            </button>
            <button onClick={() => capturePhoto('after')} className={`p-4 rounded-xl border border-dashed text-center transition-all ${photoAfter ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/[0.02] border-white/10 hover:bg-white/5'}`}>
              {photoAfter ? <img src={URL.createObjectURL(photoAfter)} className="w-full h-24 object-cover rounded-lg" /> : <Camera size={24} className="mx-auto text-gray-500 mb-1" />}
              <p className="text-[10px] text-gray-500 font-bold mt-1">{photoAfter ? '✅ After' : 'Foto After'}</p>
            </button>
          </div>

          <textarea value={taskNotes} onChange={e => setTaskNotes(e.target.value)} placeholder="Catatan pekerjaan (opsional)..." className="w-full bg-[#13151A] border border-white/20 rounded-xl p-3 text-xs text-white outline-none resize-none h-20" />

          <div className="flex gap-3">
            <button onClick={() => setActiveWO(null)} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-xs font-bold">Batal</button>
            <button onClick={handleComplete} disabled={submitting} className="flex-[2] py-3 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-500/30">
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Selesaikan WO
            </button>
          </div>
        </motion.div>
      ) : !showHistory ? (
        <div className="space-y-2">
          {workOrders.length === 0 && pmLogs.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-sm">
              <Wrench size={32} className="mx-auto mb-3 text-blue-500/50" />
              Tidak ada tugas aktif.
            </div>
          ) : (
            <>
              {workOrders.map(wo => (
                <motion.button key={wo.id} initial={{ opacity: 0, y: 5 }} onClick={() => setActiveWO(wo)} className="w-full text-left p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:bg-white/5 transition-all flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0"><FileText size={18} className="text-blue-400" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{wo.title}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{wo.work_type} • {wo.schedule_date ? new Date(wo.schedule_date).toLocaleDateString('id-ID') : '-'}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[9px] font-bold">{wo.status}</span>
                </motion.button>
              ))}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {history.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-sm">Belum ada riwayat.</div>
          ) : (
            history.map(wo => (
              <div key={wo.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-white">{wo.title}</p>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] font-bold">Selesai</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">{wo.work_type} • {wo.completed_at ? new Date(wo.completed_at).toLocaleString('id-ID') : '-'}</p>
                {wo.completion_notes && <p className="text-[10px] text-gray-400 mt-1 italic">"{wo.completion_notes}"</p>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default TeknisiTask;
