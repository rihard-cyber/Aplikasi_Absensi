import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Save, X, AlertTriangle, Flame, Shield, Lock, Eye, Loader2, MapPin, Camera, User, ArrowLeft } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { logAudit } from '../../../utils/auditLogger';

const t = (s) => s;

const INCIDENT_TYPES = [
  { value: 'kebakaran', label: 'Kebakaran', icon: <Flame size={14} /> },
  { value: 'kecelakaan_kerja', label: 'Kecelakaan Kerja', icon: <AlertTriangle size={14} /> },
  { value: 'pencurian', label: 'Pencurian', icon: <Lock size={14} /> },
  { value: 'k3', label: 'K3', icon: <Shield size={14} /> },
  { value: 'near_miss', label: 'Near Miss', icon: <AlertTriangle size={14} /> },
  { value: 'lainnya', label: 'Lainnya', icon: <AlertTriangle size={14} /> },
];

const SEVERITY_STYLES = new Map([
  ['low', 'bg-gray-500/10 text-gray-400 border-gray-500/30'],
  ['medium', 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'],
  ['high', 'bg-orange-500/10 text-orange-400 border-orange-500/30'],
  ['critical', 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/30']
]);

const STATUS_STYLES = new Map([
  ['Reported', 'bg-gray-500/10 text-gray-400 border-gray-500/30'],
  ['Investigating', 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'],
  ['Resolved', 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30'],
  ['Closed', 'bg-blue-500/10 text-blue-400 border-blue-500/30']
]);

const IncidentReporting = ({ onBack }) => {
  const [incidents, setIncidents] = useState([]);
  const [tenantId, setTenantId] = useState(null);
  const [profileId, setProfileId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [showForm, setShowForm] = useState(false);
  const [showAction, setShowAction] = useState(null);
  const [form, setForm] = useState({ incident_type: 'k3', location: '', description: '', severity: 'medium', photo_url: '' });
  const [actionForm, setActionForm] = useState({ action_pic: '', action_deadline: '', corrective_action: '' });
  const [profiles, setProfiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: p } = await supabase.from('profiles').select('id, tenant_id').eq('auth_id', session.user.id).maybeSingle();
    
    let activeTenantId = p?.tenant_id;
    if (!activeTenantId && isGod) {
      try {
        const impTenant = JSON.parse(localStorage.getItem('impersonated_tenant'));
        if (impTenant?.id) activeTenantId = impTenant.id;
      } catch (e) {
        console.error("Failed to parse impersonated tenant", e);
      }
    }

    if (!activeTenantId && !isGod) return;
    if (p) setProfileId(p.id);
    if (activeTenantId) setTenantId(activeTenantId);

    let q = supabase.from('incident_reports').select('*, profiles!reporter_id(full_name, nip)');
    if (activeTenantId) q = q.eq('tenant_id', activeTenantId);
    q = q.order('created_at', { ascending: false });
    const { data: r } = await q;
    if (r) {
      const formatted = r.map(inc => {
        const rawStatus = inc.status ? inc.status.toLowerCase() : 'reported';
        const displayStatus = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
        return {
          ...inc,
          status: displayStatus
        };
      });
      setIncidents(formatted);
    }

    let q2 = supabase.from('profiles').select('id, full_name, nip');
    if (activeTenantId) q2 = q2.eq('tenant_id', activeTenantId);
    q2 = q2.in('role', ['EMPLOYEE', 'SUB_ADMIN']);
    const { data: pr } = await q2;
    if (pr) setProfiles(pr);
  };

  const handleSubmit = async () => {
    if (!form.location || !form.description) { toast('Lokasi & deskripsi wajib', 'error'); return; }
    try {
      const insertData = {
        incident_type: form.incident_type,
        location: form.location,
        description: form.description,
        severity: form.severity,
        photos: form.photo_url ? [form.photo_url] : [],
        tenant_id: tenantId,
        reporter_id: profileId,
        status: 'reported'
      };
      const { error } = await supabase.from('incident_reports').insert(insertData);
      if (error) throw error;
      toast('Laporan insiden dikirim', 'success');
      logAudit('REPORT_INCIDENT', { type: form.incident_type, severity: form.severity });
      setShowForm(false);
      setForm({ incident_type: 'k3', location: '', description: '', severity: 'medium', photo_url: '' });
      fetchData();
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    await supabase.from('incident_reports').update({ status: newStatus.toLowerCase() }).eq('id', id);
    toast(`Status: ${newStatus}`, 'success');
    fetchData();
  };

  const handleActionSubmit = async (id) => {
    if (!actionForm.corrective_action) { toast('Tindakan korektif wajib', 'error'); return; }
    await supabase.from('incident_reports').update({
      corrective_action: actionForm.corrective_action,
      action_pic: actionForm.action_pic || null,
      action_deadline: actionForm.action_deadline || null,
    }).eq('id', id);
    toast('Tindakan korektif ditetapkan', 'success');
    setShowAction(null);
    setActionForm({ action_pic: '', action_deadline: '', corrective_action: '' });
    fetchData();
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `incidents/${profileId}/${Date.now()}.${ext}`;
      await supabase.storage.from('documents').upload(path, file);
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
      setForm({...form, photo_url: urlData.publicUrl});
    } catch (e) { toast('Gagal upload: ' + e.message, 'error'); }
    finally { setUploading(false); }
  };

  const nextStatus = new Map([
    ['Reported', 'Investigating'],
    ['Investigating', 'Resolved'],
    ['Resolved', 'Closed'],
    ['Closed', null]
  ]);

  const filtered = incidents.filter(i => {
    if (filterStatus !== 'ALL' && i.status !== filterStatus) return false;
    if (filterSeverity !== 'ALL' && i.severity !== filterSeverity) return false;
    return i.description?.toLowerCase().includes(search.toLowerCase()) ||
      i.location?.toLowerCase().includes(search.toLowerCase()) ||
      i.profiles?.full_name?.toLowerCase().includes(search.toLowerCase());
  });

  const statsByType = new Map();
  incidents.forEach(i => {
    statsByType.set(i.incident_type, (statsByType.get(i.incident_type) || 0) + 1);
  });
  const openIncidents = incidents.filter(i => i.status === 'Reported' || i.status === 'Investigating').length;

  return (
    <div className="glass-panel p-4 sm:p-6 lg:p-8">
      {onBack && (
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-serif font-bold text-white">{t('Incident Reporting')}</h2>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5 font-sans font-bold">{t('Lapor insiden & keselamatan kerja')}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-6 mb-8">
        <div>
          {!onBack && (
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">{t('Incident & Safety Reporting')}</h2>
          )}
          <p className="text-sm text-gray-400 mt-1">{incidents.length} {t('laporan')} • {openIncidents} {t('open')} • {statsByType.size} {t('jenis')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-6">
        {Array.from(statsByType.entries()).map(([type, count]) => (
          <div key={type} className="p-3 bg-white/5 rounded-xl border border-white/10 text-center">
            <p className="text-lg font-bold text-white font-mono">{count}</p>
            <p className="text-[8px] text-gray-500 uppercase tracking-widest">{type.replace(/_/g, ' ')}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('Cari...')} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-3)]" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-2 text-white text-xs outline-none">
          <option value="ALL">{t('Semua Status')}</option>
          {Array.from(STATUS_STYLES.keys()).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} className="bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-2 text-white text-xs outline-none">
          <option value="ALL">{t('Semua Severity')}</option>
          {Array.from(SEVERITY_STYLES.keys()).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-bold flex items-center gap-2"><Plus size={16} /> {t('Lapor Insiden')}</button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('Jenis Insiden')}</label>
              <div className="grid grid-cols-3 gap-2">
                {INCIDENT_TYPES.map(t => (
                  <button key={t.value} onClick={() => setForm({...form, incident_type: t.value})}
                    className={`p-2 rounded-xl border text-[10px] flex items-center justify-center gap-1 transition-all ${form.incident_type === t.value ? 'bg-[var(--aurora-3)]/20 border-[var(--aurora-3)] text-white' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('Severity')}</label>
              <div className="grid grid-cols-4 gap-2">
                {Array.from(SEVERITY_STYLES.keys()).map(s => (
                  <button key={s} onClick={() => setForm({...form, severity: s})}
                    className={`p-2 rounded-xl border text-[9px] font-bold uppercase tracking-widest transition-all ${form.severity === s ? SEVERITY_STYLES.get(s) + ' bg-white/10' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('Lokasi')}</label>
              <div className="relative">
                <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none" placeholder={t('Gedung A Lantai 3')} />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('Foto (opsional)')}</label>
              {form.photo_url ? (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/20 shadow-md group">
                  <img src={form.photo_url} alt="Incident Preview" className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => setForm({...form, photo_url: ''})}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/80 hover:bg-black text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col items-center justify-center py-2.5 px-2 border border-dashed border-white/20 rounded-xl cursor-pointer hover:bg-white/5 transition-colors text-center">
                    {uploading ? (
                      <Loader2 size={14} className="animate-spin text-gray-400" />
                    ) : (
                      <>
                        <Camera size={14} className="text-gray-400 mb-1" />
                        <span className="text-[9px] text-white font-bold">{t('Kamera')}</span>
                      </>
                    )}
                    <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
                  </label>

                  <label className="flex flex-col items-center justify-center py-2.5 px-2 border border-dashed border-white/20 rounded-xl cursor-pointer hover:bg-white/5 transition-colors text-center">
                    {uploading ? (
                      <Loader2 size={14} className="animate-spin text-gray-400" />
                    ) : (
                      <>
                        <Plus size={14} className="text-gray-400 mb-1" />
                        <span className="text-[9px] text-white font-bold">{t('Galeri')}</span>
                      </>
                    )}
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
                  </label>
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('Deskripsi')}</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none resize-none" placeholder={t('Jelaskan kronologi insiden...')} />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSubmit} className="px-6 py-3 rounded-xl bg-[var(--success)] text-black text-xs font-bold flex items-center gap-2"><Save size={14} /> {t('Kirim Laporan')}</button>
            <button onClick={() => setShowForm(false)} className="px-6 py-3 rounded-xl bg-white/5 text-gray-400 border border-white/10 text-xs font-bold"><X size={14} /> {t('Batal')}</button>
          </div>
        </motion.div>
      )}

      <div className="space-y-3">
        {filtered.map(inc => (
          <div key={inc.id} className="p-5 bg-white/5 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${SEVERITY_STYLES.get(inc.severity) || ''}`}>
                  {INCIDENT_TYPES.find(t => t.value === inc.incident_type)?.icon || <AlertTriangle size={18} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white">{inc.incident_type?.replace(/_/g, ' ')}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest border ${SEVERITY_STYLES.get(inc.severity) || ''}`}>{inc.severity}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest border ${STATUS_STYLES.get(inc.status) || ''}`}>{inc.status}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[9px] text-gray-500 mt-0.5">
                    <span className="flex items-center gap-1"><MapPin size={10} /> {inc.location}</span>
                    <span className="flex items-center gap-1"><User size={10} /> {inc.profiles?.full_name}</span>
                    <span>{new Date(inc.created_at).toLocaleDateString()}</span>
                  </div>
                  {inc.description && <p className="text-xs text-gray-400 mt-2">{inc.description}</p>}
                  {inc.corrective_action && (
                    <div className="mt-2 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                      <p className="text-[9px] text-blue-400 uppercase tracking-widest font-bold mb-1">{t('Tindakan Korektif')}</p>
                      <p className="text-xs text-gray-300">{inc.corrective_action}</p>
                      {inc.action_pic && <p className="text-[9px] text-gray-500 mt-1">{t('PIC: ')}{inc.action_pic} {inc.action_deadline ? `${t('• Deadline: ')}${inc.action_deadline}` : ''}</p>}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {inc.photos && inc.photos.length > 0 && <a href={inc.photos[0]} target="_blank" className="p-2 hover:bg-white/10 rounded-lg text-[var(--aurora-3)]"><Eye size={14} /></a>}
                {nextStatus.get(inc.status) && (
                  <button onClick={() => handleStatusUpdate(inc.id, nextStatus.get(inc.status))}
                    className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[9px] font-bold text-gray-400 hover:text-white">
                    → {nextStatus.get(inc.status)}
                  </button>
                )}
                {inc.status !== 'Closed' && inc.status !== 'Resolved' && (
                  <button onClick={() => { setShowAction(showAction === inc.id ? null : inc.id); setActionForm({ action_pic: inc.action_pic || '', action_deadline: inc.action_deadline || '', corrective_action: inc.corrective_action || '' }); }}
                    className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[9px] font-bold text-gray-400 hover:text-white">
                    {t('Assign Action')}
                  </button>
                )}
              </div>
            </div>
            {showAction === inc.id && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 pt-4 border-t border-white/10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('PIC')}</label>
                    <select value={actionForm.action_pic} onChange={e => setActionForm({...actionForm, action_pic: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none">
                      <option value="">— {t('Pilih')} —</option>
                      {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('Deadline')}</label>
                    <input type="date" value={actionForm.action_deadline} onChange={e => setActionForm({...actionForm, action_deadline: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('Tindakan')}</label>
                    <input value={actionForm.corrective_action} onChange={e => setActionForm({...actionForm, corrective_action: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none" placeholder={t('Tindakan...')} />
                  </div>
                </div>
                <button onClick={() => handleActionSubmit(inc.id)} className="px-4 py-2 rounded-xl bg-blue-500 text-white text-[10px] font-bold">{t('Simpan Tindakan')}</button>
              </motion.div>
            )}
          </div>
        ))}
        {!filtered.length && <p className="text-center text-gray-500 py-8 text-sm">{t('Tidak ada laporan insiden')}</p>}
      </div>
    </div>
  );
};

export default IncidentReporting;
