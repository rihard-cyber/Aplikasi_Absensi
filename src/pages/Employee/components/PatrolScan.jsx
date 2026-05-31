import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, CheckCircle2, XCircle, ArrowLeft, Loader2, MapPin, AlertTriangle, Users, Send, Camera, ClipboardList, Route, ShieldCheck } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { logAudit } from '../../../utils/auditLogger';

/** @type {(s: string) => string} Passthrough i18n — app is monolingual Indonesian */
const t = (s) => s;

const PatrolScan = ({ onBack }) => {
  const [profile, setProfile] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [mode, setMode] = useState('scan');
  const [manualCode, setManualCode] = useState('');
  const [status, setStatus] = useState('idle');
  const [currentRoute, setCurrentRoute] = useState(null);
  const [routeCheckpoints, setRouteCheckpoints] = useState([]);
  const [scannedIds, setScannedIds] = useState([]);
  const [logs, setLogs] = useState([]);
  const [checkpoints, setCheckpoints] = useState([]);
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [showHandoverForm, setShowHandoverForm] = useState(false);
  const [guards, setGuards] = useState([]);
  const [incidentForm, setIncidentForm] = useState({ incident_type: '', description: '', severity: 'medium', photo: null });
  const [handoverForm, setHandoverForm] = useState({ to_profile_id: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [gpsPosition, setGpsPosition] = useState(null);
  const autoSubmitRef = useRef(false);
  const toast = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data: p } = await supabase.from('profiles').select('id, tenant_id, full_name').eq('auth_id', session.user.id).maybeSingle();
        if (p) {
          setProfile(p);
          setTenantId(p.tenant_id);
          await loadData(p.id, p.tenant_id);
        }
      } catch (e) { console.error('Fetch profile error:', e); }
    };
    fetchProfile();
    startGps();
  }, []);

  useEffect(() => {
    if (profile && manualCode && !autoSubmitRef.current) {
      autoSubmitRef.current = true;
      handleScan(manualCode);
    }
  }, [profile, manualCode]);

  const startGps = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGpsPosition({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  const loadData = async (uid, tid) => {
    try {
    const [cpData, rData, lData, gData] = await Promise.all([
      supabase.from('patrol_checkpoints').select('*').eq('tenant_id', tid).eq('is_active', true),
      supabase.from('patrol_routes').select('*, patrol_route_checkpoints(*, patrol_checkpoints(*))').eq('tenant_id', tid).eq('is_active', true),
      supabase.from('patrol_logs').select('*').eq('profile_id', uid).eq('tenant_id', tid).order('scan_time', { ascending: false }),
      supabase.from('profiles').select('id, full_name, nip').eq('tenant_id', tid).in('role', ['security', 'satpam']),
    ]);
    if (cpData.data) setCheckpoints(cpData.data);
    if (rData.data?.length) {
      setCurrentRoute(rData.data[0]);
      setRouteCheckpoints((rData.data[0].patrol_route_checkpoints || []).sort((a, b) => a.order_index - b.order_index));
    }
    if (lData.data) {
      setLogs(lData.data);
      const todayStr = new Date().toDateString();
      const todayScans = lData.data.filter(l => new Date(l.scan_time).toDateString() === todayStr);
      if (todayScans?.length) setScannedIds(todayScans.map(l => l.checkpoint_id));
    }
    if (gData.data) setGuards(gData.data.filter(g => g.id !== uid));
    } catch (e) { console.error('Load data error:', e); }
  };

  const handleScan = async (codeOverride) => {
    const rawCode = typeof codeOverride === 'string' ? codeOverride : manualCode;
    if (!rawCode.trim()) { toast('Masukkan kode QR', 'error'); return; }
    setStatus('scanning');
    try {
      const code = rawCode.trim();
      const { data: cp, error } = await supabase.from('patrol_checkpoints')
        .select('id, name, qr_code, latitude, longitude, is_active')
        .eq('qr_code', code)
        .maybeSingle();
      if (error || !cp) { setStatus('failed'); toast('QR Code tidak valid!', 'error'); return; }
      if (!cp.is_active) { setStatus('failed'); toast('Checkpoint sudah tidak aktif!', 'error'); return; }

      const { error: logErr } = await supabase.from('patrol_logs').insert({
        tenant_id: tenantId,
        profile_id: profile.id,
        checkpoint_id: cp.id,
        scan_time: new Date().toISOString(),
        latitude: gpsPosition?.latitude || null,
        longitude: gpsPosition?.longitude || null,
      });
      if (logErr) throw logErr;

      logAudit('PATROL_SCAN', { checkpoint: cp.name, location: gpsPosition ? `${gpsPosition.latitude},${gpsPosition.longitude}` : null });
      setStatus('success');
      toast(`Checkpoint "${cp.name}" tercatat!`, 'success');
      setManualCode('');
      autoSubmitRef.current = false;
      const todayStr = new Date().toDateString();
      const { data: newLogs } = await supabase.from('patrol_logs')
        .select('*')
        .eq('profile_id', profile.id)
        .eq('tenant_id', tenantId)
        .order('scan_time', { ascending: false });
      if (newLogs) {
        setLogs(newLogs);
        const todayScans = newLogs.filter(l => new Date(l.scan_time).toDateString() === todayStr);
        setScannedIds(todayScans.map(l => l.checkpoint_id));
      }
      setTimeout(() => setStatus('idle'), 1500);
    } catch (e) {
      setStatus('failed');
      toast('Gagal: ' + e.message, 'error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  const submitIncident = async () => {
    if (!incidentForm.incident_type.trim() || !incidentForm.description.trim()) { toast('Lengkapi form insiden!', 'error'); return; }
    setSubmitting(true);
    try {
      const lastLog = logs[0];
      let photo_url = null;
      if (incidentForm.photo) {
        const ext = incidentForm.photo.name.split('.').pop();
        const path = `patrol_incidents/${profile.id}/${Date.now()}.${ext}`;
        await supabase.storage.from('documents').upload(path, incidentForm.photo);
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
        if (urlData?.publicUrl) photo_url = urlData.publicUrl;
      }
      await supabase.from('patrol_incidents').insert({
        tenant_id: tenantId,
        patrol_log_id: lastLog?.id || null,
        incident_type: incidentForm.incident_type.trim(),
        description: incidentForm.description.trim(),
        severity: incidentForm.severity,
        photo_url,
      });
      logAudit('PATROL_INCIDENT', { type: incidentForm.incident_type, severity: incidentForm.severity });
      toast('Insiden dilaporkan!', 'success');
      setShowIncidentForm(false);
      setIncidentForm({ incident_type: '', description: '', severity: 'medium', photo: null });
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const submitHandover = async () => {
    if (!handoverForm.to_profile_id) { toast('Pilih petugas pengganti!', 'error'); return; }
    setSubmitting(true);
    try {
      await supabase.from('patrol_shift_handovers').insert({
        tenant_id: tenantId,
        from_profile_id: profile.id,
        to_profile_id: handoverForm.to_profile_id,
        handover_time: new Date().toISOString(),
        notes: handoverForm.notes || null,
      });
      logAudit('PATROL_HANDOVER', { to: handoverForm.to_profile_id });
      toast('Handover berhasil!', 'success');
      setShowHandoverForm(false);
      setHandoverForm({ to_profile_id: '', notes: '' });
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const todayLogs = logs.filter(l => new Date(l.scan_time).toDateString() === new Date().toDateString());
  const scannedToday = todayLogs.length;
  const totalRouteCps = routeCheckpoints.length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex flex-col gap-6 pb-8">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors w-fit"><ArrowLeft size={18} /> Kembali</button>

      {/* Route Progress */}
      {currentRoute && (
        <div className="glass-panel p-5 rounded-[32px] border border-[var(--aurora-3)]/20 bg-gradient-to-br from-[var(--aurora-3)]/5 to-transparent">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--aurora-3)]/10 text-[var(--aurora-3)] flex items-center justify-center"><Route size={20} /></div>
            <div>
              <h3 className="text-white font-bold text-sm">{currentRoute.name}</h3>
              <p className="text-[10px] text-gray-500">{scannedToday} dari {totalRouteCps || checkpoints.length} checkpoint hari ini</p>
            </div>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] rounded-full transition-all" style={{ width: `${totalRouteCps ? Math.min((scannedToday / totalRouteCps) * 100, 100) : 0}%` }} />
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {routeCheckpoints.map((rc, idx) => {
              const scanned = scannedIds.includes(rc.checkpoint_id);
              return (
                <div key={rc.id} className="flex items-center gap-1">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[8px] font-bold ${scanned ? 'bg-[var(--success)]/20 text-[var(--success)] border border-[var(--success)]/30' : 'bg-white/5 text-gray-500 border border-white/10'}`}>
                    {scanned ? <CheckCircle2 size={12} /> : idx + 1}
                  </div>
                  <span className="text-[8px] text-gray-500 hidden sm:inline">{rc.patrol_checkpoints?.name}</span>
                  {idx < routeCheckpoints.length - 1 && <span className="text-gray-600 text-[8px]">→</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* QR Scan Section */}
      <div className="glass-panel p-6 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-[var(--aurora-1)]/5 rounded-full blur-3xl" />
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center mx-auto mb-4 shadow-lg">
          <QrCode size={28} className="text-white" />
        </div>
        <h2 className="text-xl font-serif font-bold text-white mb-1">{t('Scan Checkpoint')}</h2>
        <p className="text-xs text-gray-400 mb-6">{t('Scan QR code di checkpoint patroli untuk mencatat kunjungan')}</p>
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2 text-left">{t('Masukkan Kode QR')}</label>
            <div className="flex gap-2">
              <input value={manualCode} onChange={e => setManualCode(e.target.value)}
                placeholder="Tempel kode QR checkpoint..."
                onKeyDown={e => e.key === 'Enter' && handleScan()}
                  className="flex-1 bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
              <button onClick={() => handleScan()} disabled={status === 'scanning'}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-bold text-xs disabled:opacity-50 flex items-center gap-1">
                {status === 'scanning' ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />} Scan
              </button>
            </div>
          </div>
          {gpsPosition && (
            <div className="flex items-center gap-2 bg-[var(--success)]/5 border border-[var(--success)]/10 rounded-xl p-3 text-left">
              <MapPin size={14} className="text-[var(--success)]" />
              <span className="text-[10px] text-gray-400">{t('GPS: ')}{gpsPosition.latitude.toFixed(6)}, {gpsPosition.longitude.toFixed(6)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => setShowIncidentForm(true)} className="glass-panel p-5 rounded-[32px] border border-[var(--danger)]/20 hover:border-[var(--danger)]/40 transition-all text-center">
          <div className="w-12 h-12 rounded-2xl bg-[var(--danger)]/10 text-[var(--danger)] flex items-center justify-center mx-auto mb-3"><AlertTriangle size={24} /></div>
          <p className="text-white font-bold text-xs">{t('Lapor Insiden')}</p>
          <p className="text-[9px] text-gray-500 mt-1">{t('Laporkan kejadian selama patroli')}</p>
        </button>
        <button onClick={() => setShowHandoverForm(true)} className="glass-panel p-5 rounded-[32px] border border-[var(--aurora-3)]/20 hover:border-[var(--aurora-3)]/40 transition-all text-center">
          <div className="w-12 h-12 rounded-2xl bg-[var(--aurora-3)]/10 text-[var(--aurora-3)] flex items-center justify-center mx-auto mb-3"><Users size={24} /></div>
          <p className="text-white font-bold text-xs">{t('Shift Handover')}</p>
          <p className="text-[9px] text-gray-500 mt-1">{t('Serahkan shift ke petugas lain')}</p>
        </button>
      </div>

      {/* Today's Logs */}
      <div className="glass-panel p-5 rounded-[32px]">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><ClipboardList size={16} /> Log Hari Ini</h3>
        {todayLogs.length === 0 ? (
          <div className="text-center py-6">
            <ShieldCheck size={28} className="mx-auto text-gray-600 mb-2" />
            <p className="text-xs text-gray-500">{t('Belum ada scan hari ini')}</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {todayLogs.map(l => {
              const cp = checkpoints.find(c => c.id === l.checkpoint_id);
              return (
                <div key={l.id} className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/5">
                  <div className="w-8 h-8 rounded-lg bg-[var(--success)]/10 text-[var(--success)] flex items-center justify-center"><CheckCircle2 size={14} /></div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-white">{cp?.name || '—'}</p>
                    <p className="text-[9px] text-gray-500">{new Date(l.scan_time).toLocaleTimeString('id-ID')}</p>
                  </div>
                  {l.latitude && l.longitude && <MapPin size={12} className="text-gray-500" />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Incident Modal */}
      <AnimatePresence>
        {showIncidentForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowIncidentForm(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-[#1A1C23] rounded-3xl border border-white/10 p-6 max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2"><AlertTriangle size={18} className="text-[var(--danger)]" /> Lapor Insiden</h3>
              <p className="text-xs text-gray-500 mb-6">{t('Laporkan kejadian selama patroli')}</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('Jenis Insiden')}</label>
                  <input value={incidentForm.incident_type} onChange={e => setIncidentForm({...incidentForm, incident_type: e.target.value})}  placeholder="Misal: Kebakaran kecil, Pintu rusak"  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('Severity')}</label>
                  <div className="flex gap-2">
                    {['low', 'medium', 'high', 'critical'].map(s => (
                      <button key={s} onClick={() => setIncidentForm({...incidentForm, severity: s})}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${incidentForm.severity === s ? 'bg-[var(--aurora-3)]/20 border-[var(--aurora-3)] text-white' : 'bg-white/5 border-white/10 text-gray-500'}`}>{s}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('Deskripsi')}</label>
                  <textarea value={incidentForm.description} onChange={e => setIncidentForm({...incidentForm, description: e.target.value})} rows={3}  placeholder="Jelaskan detail insiden..."  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none resize-none placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('Foto (opsional)')}</label>
                  <label className="flex items-center gap-3 p-3 bg-white/5 border border-dashed border-white/20 rounded-xl cursor-pointer hover:bg-white/10">
                    <Camera size={18} className="text-gray-400" />
                    <span className="text-xs text-gray-400">{incidentForm.photo ? incidentForm.photo.name : 'Upload foto'}</span>
                    <input type="file" accept="image/*" onChange={e => setIncidentForm({...incidentForm, photo: e.target.files[0]})} className="hidden" />
                  </label>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={submitIncident} disabled={submitting} className="flex-1 py-4 rounded-xl bg-gradient-to-r from-[var(--danger)] to-red-600 text-white font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50">
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Laporkan
                  </button>
                  <button onClick={() => setShowIncidentForm(false)} className="flex-1 py-4 rounded-xl bg-white/5 text-gray-400 border border-white/10 text-xs font-bold">{t('Batal')}</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Handover Modal */}
      <AnimatePresence>
        {showHandoverForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowHandoverForm(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-[#1A1C23] rounded-3xl border border-white/10 p-6 max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2"><Users size={18} className="text-[var(--aurora-3)]" /> Shift Handover</h3>
              <p className="text-xs text-gray-500 mb-6">{t('Serahkan shift ke petugas selanjutnya')}</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('Petugas Pengganti')}</label>
                  <select value={handoverForm.to_profile_id} onChange={e => setHandoverForm({...handoverForm, to_profile_id: e.target.value})}  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white outline-none placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" >
                    <option value="">{t('Pilih petugas')}</option>
                    {guards.map(g => <option key={g.id} value={g.id}>{g.full_name} ({g.nip || '—'})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('Catatan (opsional)')}</label>
                  <textarea value={handoverForm.notes} onChange={e => setHandoverForm({...handoverForm, notes: e.target.value})} rows={3}  placeholder="Catatan penting untuk petugas selanjutnya..."  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none resize-none placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={submitHandover} disabled={submitting} className="flex-1 py-4 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50">
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Serahkan Shift
                  </button>
                  <button onClick={() => setShowHandoverForm(false)} className="flex-1 py-4 rounded-xl bg-white/5 text-gray-400 border border-white/10 text-xs font-bold">{t('Batal')}</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scan Success/Fail Overlay */}
      <AnimatePresence>
        {status === 'success' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md">
            <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="glass-panel p-10 text-center border border-[var(--success)]/30 shadow-[0_0_50px_rgba(0,255,135,0.2)]">
              <CheckCircle2 size={64} className="text-[var(--success)] mx-auto mb-4 drop-shadow-[0_0_20px_var(--success)]" />
              <h3 className="text-xl font-serif font-bold text-white mb-2">{t('Checkpoint Tercatat!')}</h3>
              <p className="text-sm text-gray-400">{new Date().toLocaleTimeString('id-ID')}</p>
            </motion.div>
          </motion.div>
        )}
        {status === 'failed' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md">
            <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="glass-panel p-10 text-center border border-[var(--danger)]/30">
              <XCircle size={64} className="text-[var(--danger)] mx-auto mb-4" />
              <h3 className="text-xl font-serif font-bold text-white mb-2">{t('Gagal')}</h3>
              <p className="text-sm text-gray-400">{t('Kode QR tidak valid. Coba lagi.')}</p>
              <button onClick={() => setStatus('idle')} className="mt-6 px-6 py-3 rounded-xl bg-white/10 text-white text-xs font-bold">{t('Tutup')}</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PatrolScan;
