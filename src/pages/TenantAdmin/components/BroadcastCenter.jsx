import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Megaphone, Send, Trash2, Clock, Globe, Building } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import LoadingSkeleton from '../../../components/LoadingSkeleton';
import { useToast } from '../../../components/Toast';
import { useConfirm } from '../../../components/ConfirmDialog';
import { notifyMultipleUsers, NOTIF_TYPES } from '../../../utils/notificationEngine';

const BroadcastCenter = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tenantId, setTenantId] = useState(null);
  const toast = useToast();
  const confirm = useConfirm();
  const { t } = useTranslation();

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetProject, setTargetProject] = useState('ALL'); // ALL or project_id
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
      
      if (profile?.tenant_id || isGod) {
        if (profile?.tenant_id) setTenantId(profile.tenant_id);

        // Fetch Projects for Dropdown
        let q1 = supabase.from('projects').select('id, name, code');
        if (profile?.tenant_id) q1 = q1.eq('tenant_id', profile.tenant_id);
        const { data: pData } = await q1;
        if (pData) setProjects(pData);

        // Fetch Announcements
        let q2 = supabase.from('announcements')
          .select('*, projects(name)');
        if (profile?.tenant_id) q2 = q2.eq('tenant_id', profile.tenant_id);
        q2 = q2.order('created_at', { ascending: false });
        const { data: aData } = await q2;
        if (aData) setAnnouncements(aData);
      }
    } catch (e) {
      console.error("Gagal menarik data broadcast", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!title || !message) {
      toast("Judul dan Pesan wajib diisi!", 'error');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const payload = {
        tenant_id: tenantId,
        project_id: targetProject === 'ALL' ? null : targetProject,
        title,
        content: message,
        is_active: true
      };

      const { data, error } = await supabase.from('announcements').insert([payload]).select('*, projects(name)');
      if (error) throw error;

      setAnnouncements([data[0], ...announcements]);
      setTitle('');
      setMessage('');
      setTargetProject('ALL');
      toast("Pengumuman berhasil disiarkan!", 'success');

      // Send notifications to all employees
      try {
        let userQuery = supabase.from('profiles').select('id').eq('tenant_id', tenantId);
        if (targetProject !== 'ALL') {
          userQuery = userQuery.eq('project_id', targetProject);
        }
        const { data: users } = await userQuery;
        if (users?.length) {
          await notifyMultipleUsers({
            userIds: users.map(u => u.id),
            type: NOTIF_TYPES.INFO,
            title,
            body: message.length > 150 ? message.substring(0, 150) + '...' : message,
            link: '/announcements',
            metadata: { announcement_id: data[0].id },
          });
        }
      } catch (notifErr) {
        console.warn('Notif delivery error:', notifErr);
      }
    } catch (e) {
      toast("Gagal menyiarkan pengumuman: " + e.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActiveStatus = async (id, currentStatus) => {
    try {
      const { error } = await supabase.from('announcements').update({ is_active: !currentStatus }).eq('id', id);
      if (error) throw error;
      setAnnouncements(announcements.map(a => a.id === id ? { ...a, is_active: !currentStatus } : a));
    } catch (e) {
      toast("Gagal merubah status: " + e.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm("Yakin ingin menghapus pengumuman ini permanen?", "Hapus Pengumuman");
    if (!ok) return;
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
      setAnnouncements(announcements.filter(a => a.id !== id));
    } catch (e) {
      toast("Gagal menghapus: " + e.message, 'error');
    }
  };

  if (isLoading) return <div className="p-10"><LoadingSkeleton type="card" /></div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-serif font-bold text-white tracking-wide flex items-center gap-2">
            <Megaphone className="text-[var(--aurora-1)]" /> Pusat Pengumuman
          </h2>
          <p className="text-gray-400 text-sm mt-1">{t('broadcast.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Composer Form */}
        <div className="lg:col-span-1 glass-panel p-6 border border-white/5 h-fit sticky top-6">
          <h3 className="text-lg font-bold text-white mb-6">{t('broadcast.writeAnnouncement')}</h3>
          <form onSubmit={handleBroadcast} className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-2">{t('broadcast.targetAudience')}</label>
              <select value={targetProject} onChange={e => setTargetProject(e.target.value)}  className="w-full bg-[#0B0C10] border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-400 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" >
                <option value="ALL">🌐 Semua Pegawai (Global)</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>🏢 {p.code ? `[${p.code}] ` : ''}{p.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-2">{t('broadcast.announcementTitle')}</label>
              <input required value={title} onChange={e => setTitle(e.target.value)} type="text" maxLength={100}  placeholder="Contoh: Info Libur Nasional"  className="w-full bg-[#0B0C10] border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-400 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
            </div>

            <div>
              <label className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-2">{t('broadcast.messageContent')}</label>
              <textarea required value={message} onChange={e => setMessage(e.target.value)}  placeholder="Ketik pesan pengumuman di sini..." className="w-full bg-[#0B0C10] border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors resize-none h-32 placeholder:text-gray-400 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" ></textarea>
            </div>

            <button disabled={isSubmitting} type="submit" className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[#1E90FF] text-white font-bold tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50">
              {isSubmitting ? 'Mengirim...' : <><Send size={18} /> Siarkan Sekarang</>}
            </button>
          </form>
        </div>

        {/* Broadcast History */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-white mb-4">{t('broadcast.history')}</h3>
          
          {announcements.length === 0 ? (
            <div className="glass-panel p-10 text-center flex flex-col items-center">
              <Megaphone size={48} className="text-gray-600 mb-4" />
              <p className="text-gray-400">{t('broadcast.noAnnouncement')}</p>
            </div>
          ) : announcements.map(a => (
            <div key={a.id} className={`glass-panel p-5 border transition-colors ${a.is_active ? 'border-[var(--aurora-1)]/30' : 'border-white/5 opacity-60'}`}>
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {a.project_id ? (
                      <span className="px-2 py-0.5 bg-[var(--aurora-3)]/10 text-[var(--aurora-3)] text-[10px] font-bold uppercase rounded flex items-center gap-1"><Building size={10} /> {a.projects?.name}</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-[var(--aurora-1)]/10 text-[var(--aurora-1)] text-[10px] font-bold uppercase rounded flex items-center gap-1"><Globe size={10} /> Global</span>
                    )}
                    {!a.is_active && <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 text-[10px] font-bold uppercase rounded">{t('broadcast.archived')}</span>}
                  </div>
                  <h4 className="text-lg font-bold text-white mb-1">{a.title}</h4>
                  <p className="text-sm text-gray-400 whitespace-pre-wrap leading-relaxed">{a.content}</p>
                  <p className="text-xs text-gray-500 mt-4 flex items-center gap-1"><Clock size={12} /> {new Date(a.created_at).toLocaleString('id-ID')}</p>
                </div>

                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => toggleActiveStatus(a.id, a.is_active)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${a.is_active ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-[var(--aurora-1)]/20 hover:bg-[var(--aurora-1)]/30 text-[var(--aurora-1)]'}`}
                  >
                    {a.is_active ? 'Arsipkan' : 'Aktifkan'}
                  </button>
                  <button onClick={() => handleDelete(a.id)} className="px-4 py-2 bg-[var(--danger)]/10 hover:bg-[var(--danger)]/20 text-[var(--danger)] rounded-lg text-xs font-bold transition-colors">
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default BroadcastCenter;
