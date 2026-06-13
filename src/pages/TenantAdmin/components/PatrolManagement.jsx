
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Route, ClipboardList, AlertTriangle, Users, Plus, QrCode, GripVertical, Loader2, CheckCircle2, XCircle, Map, Clock, Search, Save, Trash2, ToggleLeft, ToggleRight, Eye, Printer, Download, X } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { logAudit } from '../../../utils/auditLogger';
import { notifyAdminsInTenant, NOTIF_TYPES } from '../../../utils/notificationEngine';

/** @type {(s: string) => string} Passthrough i18n — app is monolingual Indonesian */
const t = (s) => s;

const TABS = [
  { key: 'checkpoints', label: 'Checkpoints', icon: MapPin },
  { key: 'routes', label: 'Routes', icon: Route },
  { key: 'logs', label: 'Logs', icon: ClipboardList },
  { key: 'incidents', label: 'Incidents', icon: AlertTriangle },
  { key: 'handovers', label: 'Shift Handovers', icon: Users },
];

const PatrolManagement = () => {
  const [tenantId, setTenantId] = useState(null);
  const [tab, setTab] = useState('checkpoints');
  const [checkpoints, setCheckpoints] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [logs, setLogs] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [handovers, setHandovers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddCheckpoint, setShowAddCheckpoint] = useState(false);
  const [showAddRoute, setShowAddRoute] = useState(false);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [missedGuards, setMissedGuards] = useState([]);
  const toast = useToast();

  const downloadQRCode = async (data, filename) => {
    try {
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data)}`;
      const response = await fetch(qrApiUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename || 'qrcode.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      toast('QR Code berhasil diunduh!', 'success');
    } catch (err) {
      console.error(err);
      toast('Gagal mengunduh QR Code', 'error');
    }
  };

  const printQRCode = (data, title) => {
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data)}`;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Code - ${title}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              font-family: sans-serif;
            }
            .container {
              border: 2px solid #ccc;
              border-radius: 16px;
              padding: 30px;
              text-align: center;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            h2 { margin-bottom: 5px; color: #333; }
            p { margin-top: 0; color: #666; font-size: 14px; margin-bottom: 20px; }
            img { width: 250px; height: 250px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>${title}</h2>
            <p>Scan barcode ini untuk melakukan patroli checkpoint</p>
            <img src="${qrApiUrl}" onload="window.print(); window.close();" />
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  useEffect(() => { init(); }, []);

  const init = async () => {
    setLoading(true);
    const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
    
    let activeTenantId = profile?.tenant_id;
    if (!activeTenantId && isGod) {
      try {
        const impTenant = JSON.parse(localStorage.getItem('impersonated_tenant'));
        if (impTenant?.id) activeTenantId = impTenant.id;
      } catch (e) {
        console.error("Failed to parse impersonated tenant", e);
      }
    }

    if (!activeTenantId && !isGod) return;
    if (activeTenantId) setTenantId(activeTenantId);
    const tid = activeTenantId;

    const [cpData, rData, lData, iData, hData, pData] = await Promise.all([
      tid ? supabase.from('patrol_checkpoints').select('*').eq('tenant_id', tid).order('name') : Promise.resolve({ data: [] }),
      tid ? supabase.from('patrol_routes').select('*, patrol_route_checkpoints(*, patrol_checkpoints(*))').eq('tenant_id', tid).order('name') : Promise.resolve({ data: [] }),
      tid ? supabase.from('patrol_logs').select('*, profiles(full_name, nip), patrol_checkpoints(name, qr_code, latitude, longitude)').eq('tenant_id', tid).order('scan_time', { ascending: false }).limit(100) : Promise.resolve({ data: [] }),
      tid ? supabase.from('patrol_incidents').select('*, patrol_logs(*, patrol_checkpoints(name), profiles(full_name))').eq('tenant_id', tid).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
      tid ? supabase.from('patrol_shift_handovers').select('*, from_profile:profiles!patrol_shift_handovers_from_profile_id_fkey(full_name), to_profile:profiles!patrol_shift_handovers_to_profile_id_fkey(full_name)').eq('tenant_id', tid).order('handover_time', { ascending: false }).limit(50) : Promise.resolve({ data: [] }),
      tid ? supabase.from('profiles').select('id, full_name, nip, role').in('role', ['security', 'satpam']).eq('tenant_id', tid) : Promise.resolve({ data: [] }),
    ]);
    if (cpData.data) setCheckpoints(cpData.data);
    if (rData.data) setRoutes(rData.data);
    if (lData.data) setLogs(lData.data);
    if (iData.data) setIncidents(iData.data);
    if (hData.data) setHandovers(hData.data);
    if (pData.data) setProfiles(pData.data);

    // Auto-detect missed guards (satpam with schedule but no clock-in today)
    if (tid) {
      const today = new Date().toISOString().split('T')[0];
      const guardIds = pData.data?.map(g => g.id) || [];
      if (guardIds.length > 0) {
        const { data: schedules } = await supabase
          .from('user_schedules').select('user_id').eq('tenant_id', tid).eq('date', today)
          .in('user_id', guardIds).not('shift_id', 'is', null);
        const scheduledIds = new Set((schedules || []).map(s => s.user_id));

        const { data: attendances } = await supabase
          .from('attendance_logs').select('user_id').eq('tenant_id', tid).gte('timestamp', today)
          .lt('timestamp', today + 'T23:59:59').eq('action', 'CLOCK_IN');
        const clockedIds = new Set((attendances || []).map(a => a.user_id));

        const missing = (pData.data || []).filter(g => scheduledIds.has(g.id) && !clockedIds.has(g.id));
        if (missing.length > 0) notifyAdminsInTenant({ type: NOTIF_TYPES.MISSED_GUARD, title: missing.length + ' Satpam Belum Absen', body: missing.map(g => g.full_name).join(', '), link: '/patrol' });
        setMissedGuards(missing);
      }
    }
    setLoading(false);
  };

  const generateQR = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 16; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  };

  const addCheckpoint = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const payload = {
      tenant_id: tenantId,
      name: form.get('name'),
      qr_code: generateQR(),
      latitude: form.get('latitude') ? parseFloat(form.get('latitude')) : null,
      longitude: form.get('longitude') ? parseFloat(form.get('longitude')) : null,
      location_description: form.get('location_description') || null,
      is_active: true,
    };
    const { error } = await supabase.from('patrol_checkpoints').insert(payload);
    if (error) { toast('Gagal: ' + error.message, 'error'); return; }
    logAudit('ADD_PATROL_CHECKPOINT', { name: payload.name, qr: payload.qr_code });
    toast('Checkpoint berhasil ditambahkan!', 'success');
    setShowAddCheckpoint(false);
    init();
  };

  const toggleCheckpoint = async (cp) => {
    await supabase.from('patrol_checkpoints').update({ is_active: !cp.is_active }).eq('id', cp.id);
    logAudit('TOGGLE_PATROL_CHECKPOINT', { name: cp.name, active: !cp.is_active });
    init();
  };

  const addRoute = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const name = form.get('name');
    const estimated_duration = parseInt(form.get('estimated_duration')) || null;
    const selectedCps = form.getAll('checkpoints[]');
    if (!selectedCps.length) { toast('Pilih minimal 1 checkpoint', 'error'); return; }
    const { data: route, error } = await supabase.from('patrol_routes').insert({
      tenant_id: tenantId, name, estimated_duration, is_active: true
    }).select().single();
    if (error) { toast('Gagal: ' + error.message, 'error'); return; }
    const cps = selectedCps.map((cpId, idx) => ({
      route_id: route.id, checkpoint_id: cpId, order_index: idx
    }));
    const { error: cpErr } = await supabase.from('patrol_route_checkpoints').insert(cps);
    if (cpErr) { toast('Gagal checkpoint: ' + cpErr.message, 'error'); return; }
    logAudit('ADD_PATROL_ROUTE', { name, checkpoints: selectedCps.length });
    toast('Route berhasil dibuat!', 'success');
    setShowAddRoute(false);
    init();
  };

  const deleteRoute = async (routeId) => {
    await supabase.from('patrol_route_checkpoints').delete().eq('route_id', routeId);
    await supabase.from('patrol_routes').delete().eq('id', routeId);
    logAudit('DELETE_PATROL_ROUTE', { routeId });
    toast('Route dihapus', 'success');
    init();
  };

  const renderCheckpoints = () => (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t('Daftar Checkpoint')}</h3>
        <button onClick={() => setShowAddCheckpoint(true)} className="px-3 py-2 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-[10px] font-bold flex items-center gap-1"><Plus size={14} /> Tambah</button>
      </div>
      {showAddCheckpoint && (
        <motion.form initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} onSubmit={addCheckpoint} className="mb-6 p-5 bg-white/5 rounded-2xl border border-white/10 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('Nama Checkpoint')}</label>
              <input name="name" required  placeholder="Pos Utama"  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-[#00C9FF]/30 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('Deskripsi Lokasi')}</label>
              <input name="location_description"  placeholder="Dekat pintu masuk utama"  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-[#00C9FF]/30 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('Latitude')}</label>
              <input name="latitude" type="number" step="any"  placeholder="-6.2088"  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-[#00C9FF]/30 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('Longitude')}</label>
              <input name="longitude" type="number" step="any"  placeholder="106.8456"  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-[#00C9FF]/30 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="px-6 py-3 rounded-xl bg-[var(--success)] text-black text-xs font-bold">{t('Simpan')}</button>
            <button type="button" onClick={() => setShowAddCheckpoint(false)} className="px-6 py-3 rounded-xl bg-white/5 text-gray-400 border border-white/10 text-xs font-bold">{t('Batal')}</button>
          </div>
        </motion.form>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {checkpoints.map(cp => (
          <div key={cp.id} className={`p-4 rounded-2xl border transition-all ${cp.is_active ? 'bg-white/5 border-white/10' : 'bg-white/[0.02] border-white/5 opacity-50'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center"><MapPin size={18} className="text-white" /></div>
                <div>
                  <p className="text-sm font-bold text-white">{cp.name}</p>
                  {cp.location_description && <p className="text-[9px] text-gray-500">{cp.location_description}</p>}
                </div>
              </div>
              <button onClick={() => toggleCheckpoint(cp)} className={`w-8 h-5 rounded-full transition-colors ${cp.is_active ? 'bg-[var(--success)]' : 'bg-gray-600'}`}>
                <div className={`w-3 h-3 bg-white rounded-full transition-all ${cp.is_active ? 'ml-4' : 'ml-1'}`} />
              </button>
            </div>
            <div className="bg-black/30 rounded-xl p-3 font-mono text-[10px] text-green-400 break-all mb-3 border border-white/5">
              {cp.qr_code}
            </div>
            <div className="flex items-center justify-between text-[9px] text-gray-500">
              {cp.latitude && cp.longitude ? (
                <span className="flex items-center gap-1"><Map size={10} /> {cp.latitude.toFixed(4)}, {cp.longitude.toFixed(4)}</span>
              ) : <span className="text-gray-600">{t('No GPS')}</span>}
              <button onClick={() => setSelectedCheckpoint(cp)} className="text-[var(--aurora-3)] hover:underline flex items-center gap-1"><Eye size={10} /> QR</button>
            </div>
          </div>
        ))}
        {!checkpoints.length && <p className="text-gray-500 text-sm col-span-full text-center py-8">{t('Belum ada checkpoint. Tambahkan sekarang!')}</p>}
      </div>
      {createPortal(
        <AnimatePresence>
          {selectedCheckpoint && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" 
              onClick={() => setSelectedCheckpoint(null)}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.95 }} 
                className="bg-[#1A1C23] border border-white/10 rounded-3xl p-6 max-w-sm w-full text-center relative shadow-2xl z-[10000]" 
                onClick={e => e.stopPropagation()}
              >
                <button onClick={() => setSelectedCheckpoint(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors expand-touch-target">
                  <X size={18} />
                </button>
                <h3 className="text-lg font-bold text-white mb-4">{selectedCheckpoint.name}</h3>
                
                <div className="bg-white rounded-2xl p-4 w-fit mx-auto mb-4 border border-white/5 shadow-inner">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(selectedCheckpoint.qr_code)}`} 
                    alt="QR Code" 
                    className="w-48 h-48 mx-auto"
                  />
                </div>
                
                <p className="text-xs font-mono text-green-400 break-all bg-black/30 rounded-xl p-3 border border-white/5 mb-4">{selectedCheckpoint.qr_code}</p>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => downloadQRCode(selectedCheckpoint.qr_code, `checkpoint-${selectedCheckpoint.name}.png`)}
                    className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/5 hover:border-white/10 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                  >
                    <Download size={12} /> Download
                  </button>
                  
                  <button 
                    onClick={() => printQRCode(selectedCheckpoint.qr_code, selectedCheckpoint.name)}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] hover:opacity-90 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-[0_4px_12px_rgba(142,45,226,0.2)]"
                  >
                    <Printer size={12} /> Print QR
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );

  const renderRoutes = () => (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t('Daftar Route Patroli')}</h3>
        <button onClick={() => setShowAddRoute(true)} className="px-3 py-2 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-[10px] font-bold flex items-center gap-1"><Plus size={14} /> Tambah Route</button>
      </div>
      {showAddRoute && (
        <motion.form initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} onSubmit={addRoute} className="mb-6 p-5 bg-white/5 rounded-2xl border border-white/10 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('Nama Route')}</label>
              <input name="name" required  placeholder="Route Pagi"  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-[#00C9FF]/30 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('Estimasi Durasi (menit)')}</label>
              <input name="estimated_duration" type="number"  placeholder="30"  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-[#00C9FF]/30 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('Pilih Checkpoint (urutkan sesuai keinginan)')}</label>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {checkpoints.filter(cp => cp.is_active).map(cp => (
                <label key={cp.id} className="flex items-center gap-3 p-2 bg-white/5 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10">
                  <input type="checkbox" name="checkpoints[]" value={cp.id} className="accent-[var(--aurora-3)]" />
                  <span className="text-xs text-white">{cp.name}</span>
                  {cp.location_description && <span className="text-[9px] text-gray-500 ml-auto">{cp.location_description}</span>}
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="px-6 py-3 rounded-xl bg-[var(--success)] text-black text-xs font-bold">{t('Simpan')}</button>
            <button type="button" onClick={() => setShowAddRoute(false)} className="px-6 py-3 rounded-xl bg-white/5 text-gray-400 border border-white/10 text-xs font-bold">{t('Batal')}</button>
          </div>
        </motion.form>
      )}
      <div className="space-y-3">
        {routes.map(r => (
          <div key={r.id} className="bg-white/5 rounded-2xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--aurora-2)] to-[var(--aurora-3)] flex items-center justify-center"><Route size={18} className="text-white" /></div>
                <div>
                  <h4 className="text-white font-bold text-sm">{r.name}</h4>
                  <p className="text-[10px] text-gray-500">{r.patrol_route_checkpoints?.length || 0} checkpoints{r.estimated_duration ? ` • ${r.estimated_duration} menit` : ''}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => deleteRoute(r.id)} className="p-2 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)]"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {(r.patrol_route_checkpoints || []).sort((a, b) => a.order_index - b.order_index).map((rc, idx) => (
                <div key={rc.id} className="flex items-center gap-1 text-[10px]">
                  <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-300">{rc.patrol_checkpoints?.name || '—'}</span>
                  {idx < (r.patrol_route_checkpoints?.length || 0) - 1 && <GripVertical size={12} className="text-gray-600" />}
                </div>
              ))}
            </div>
          </div>
        ))}
        {!routes.length && <p className="text-gray-500 text-sm text-center py-8">{t('Belum ada route patroli')}</p>}
      </div>
    </div>
  );

  const renderLogs = () => (
    <div>
      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">{t('Log Patroli')}</h3>
      <div className="space-y-2">
        {logs.map(l => (
          <div key={l.id} className="bg-white/5 rounded-2xl border border-white/10 p-4 flex flex-col sm:flex-row justify-between gap-3 cursor-pointer hover:border-white/20" onClick={() => setSelectedLog(selectedLog?.id === l.id ? null : l)}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center"><MapPin size={18} className="text-[var(--aurora-3)]" /></div>
              <div>
                <p className="text-white text-sm font-bold">{l.patrol_checkpoints?.name || '—'}</p>
                <p className="text-[10px] text-gray-500">{l.profiles?.full_name} • {new Date(l.scan_time).toLocaleString('id-ID')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {l.latitude && l.longitude && <span className="text-[9px] text-gray-500 flex items-center gap-1"><Map size={10} /> GPS</span>}
              <Clock size={14} className="text-gray-500" />
            </div>
          </div>
        ))}
        {!logs.length && <p className="text-gray-500 text-sm text-center py-8">{t('Belum ada log patroli')}</p>}
      </div>
      {selectedLog && selectedLog.latitude && selectedLog.longitude && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-4 bg-white/5 rounded-2xl border border-white/10">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">{t('Lokasi GPS')}</p>
          <a href={`https://www.google.com/maps?q=${selectedLog.latitude},${selectedLog.longitude}`} target="_blank" rel="noreferrer" className="text-[var(--aurora-3)] text-xs underline break-all">
            {selectedLog.latitude}, {selectedLog.longitude}
          </a>
        </motion.div>
      )}
    </div>
  );

  const renderIncidents = () => (
    <div>
      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">{t('Insiden Patroli')}</h3>
      <div className="space-y-3">
        {incidents.map(inc => (
          <div key={inc.id} className="bg-white/5 rounded-2xl border border-[var(--danger)]/20 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--danger)]/10 text-[var(--danger)] flex items-center justify-center shrink-0"><AlertTriangle size={18} /></div>
              <div>
                <p className="text-white text-sm font-bold">{inc.incident_type}</p>
                <p className="text-xs text-gray-400 mt-1">{inc.description}</p>
                <div className="flex items-center gap-3 mt-2 text-[9px] text-gray-500">
                  <span>{inc.patrol_logs?.profiles?.full_name || '—'}</span>
                  <span>•</span>
                  <span>{inc.patrol_logs?.patrol_checkpoints?.name || '—'}</span>
                  <span>•</span>
                  <span>{new Date(inc.created_at).toLocaleString('id-ID')}</span>
                </div>
                {inc.photo_url && (
                  <a href={inc.photo_url} target="_blank" rel="noreferrer" className="mt-2 inline-block w-20 h-20 rounded-xl overflow-hidden border border-white/10">
                    <img src={inc.photo_url} alt="" className="w-full h-full object-cover" />
                  </a>
                )}
                <span className={`mt-2 inline-block px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest border ${inc.severity === 'critical' ? 'bg-[var(--danger)]/20 text-[var(--danger)] border-[var(--danger)]/40' : inc.severity === 'high' ? 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/30' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'}`}>{inc.severity || 'medium'}</span>
              </div>
            </div>
          </div>
        ))}
        {!incidents.length && <p className="text-gray-500 text-sm text-center py-8">{t('Belum ada insiden tercatat')}</p>}
      </div>
    </div>
  );

  const renderHandovers = () => (
    <div>
      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">{t('Shift Handover')}</h3>
      <div className="space-y-3">
        {handovers.map(h => (
          <div key={h.id} className="bg-white/5 rounded-2xl border border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-2)] flex items-center justify-center text-white font-bold text-sm">
                <Users size={18} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-bold text-sm">{h.from_profile?.full_name}</span>
                  <span className="text-gray-500 text-[10px]">→</span>
                  <span className="text-[var(--aurora-3)] font-bold text-sm">{h.to_profile?.full_name}</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">{new Date(h.handover_time).toLocaleString('id-ID')}</p>
                {h.notes && <p className="text-xs text-gray-400 mt-2 bg-white/[0.03] p-2 rounded-xl">{h.notes}</p>}
              </div>
            </div>
          </div>
        ))}
        {!handovers.length && <p className="text-gray-500 text-sm text-center py-8">{t('Belum ada handover')}</p>}
      </div>
    </div>
  );

  const renderTabContent = () => {
    if (loading) return <div className="flex items-center justify-center py-16"><Loader2 size={32} className="animate-spin text-[var(--aurora-3)]" /></div>;
    switch (tab) {
      case 'checkpoints': return renderCheckpoints();
      case 'routes': return renderRoutes();
      case 'logs': return renderLogs();
      case 'incidents': return renderIncidents();
      case 'handovers': return renderHandovers();
      default: return null;
    }
  };

  return (
    <div className="glass-panel p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-6 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">{t('Patrol Management')}</h2>
          <p className="text-sm text-gray-400 mt-1">{t('Kelola checkpoint, route, dan log patroli satpam')}</p>
        </div>
      </div>

      {/* Missed Guard Alert */}
      {missedGuards.length > 0 && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-6 p-4 rounded-2xl bg-[var(--danger)]/10 border border-[var(--danger)]/30 flex items-start gap-3">
          <AlertTriangle size={20} className="text-[var(--danger)] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-[var(--danger)]">{missedGuards.length} Satpam Belum Absen Hari Ini</p>
            <p className="text-xs text-gray-400 mt-1">{t('Terjadwal tapi belum clock-in. Segera konfirmasi via telepon/HT.')}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {missedGuards.map(g => (
                <span key={g.id} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] text-white font-medium">
                  {g.full_name} ({g.nip || '-'})
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${tab === t.key ? 'bg-[var(--aurora-3)]/20 border-[var(--aurora-3)] text-white' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {renderTabContent()}
    </div>
  );
};

export default PatrolManagement;
