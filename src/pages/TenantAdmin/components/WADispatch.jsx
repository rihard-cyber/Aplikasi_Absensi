import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Send, Smartphone, Settings, Loader2, Clock, MapPin, AlertTriangle, RefreshCw, Users, X, User, Filter, Search } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';

const t = (s) => s;

const DEPARTMENTS = [
  { id: 'Keamanan', label: 'Keamanan', color: '#f59e0b', emoji: '🛡️' },
  { id: 'Teknisi', label: 'Teknisi', color: '#3b82f6', emoji: '🛠️' },
  { id: 'Cleaning', label: 'Cleaning Service', color: '#7c3aed', emoji: '🧹' },
];

const SEVERITY_STYLES = {
  low: 'bg-gray-500/10 text-gray-400',
  medium: 'bg-yellow-500/10 text-yellow-400',
  high: 'bg-orange-500/10 text-orange-400',
  critical: 'bg-red-500/10 text-red-400',
};

const getWAContacts = () => {
  try {
    const saved = localStorage.getItem('smpjdc_wa_contacts');
    if (!saved) return {};
    return JSON.parse(saved);
  } catch { return {}; }
};

const saveWAContacts = (contacts) => {
  localStorage.setItem('smpjdc_wa_contacts', JSON.stringify(contacts));
};

const WADispatch = () => {
  const [tenantId, setTenantId] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [showSettings, setShowSettings] = useState(false);
  const [contacts, setContacts] = useState(() => getWAContacts());
  const [editContact, setEditContact] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { fetchData(); }, [tenantId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
      if (!profile?.tenant_id) return;
      setTenantId(profile.tenant_id);

      const { data } = await supabase
        .from('patrol_incidents')
        .select('*, patrol_logs!inner(*, patrol_checkpoints!inner(name)), profiles!inner(full_name)')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false });
      setIncidents(data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const filteredIncidents = useMemo(() => {
    let list = incidents;
    if (filterSeverity !== 'all') list = list.filter(i => i.severity === filterSeverity);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.incident_type?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i.patrol_logs?.patrol_checkpoints?.name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [incidents, filterSeverity, search]);

  const getSLA = (createdAt) => {
    if (!createdAt) return { text: '-', urgent: false };
    const diff = now - new Date(createdAt).getTime();
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours < 1) return { text: `${mins} mnt`, urgent: false };
    if (hours < 4) return { text: `${hours}j ${mins}m`, urgent: false };
    if (hours < 8) return { text: `${hours}j ${mins}m`, urgent: true };
    return { text: `${hours}j ${mins}m`, urgent: true, critical: true };
  };

  const buildWAMsg = (inc, dept) => {
    const c = contacts[dept] || { nomor: '', nama: dept };
    const loc = inc.patrol_logs?.patrol_checkpoints?.name || 'Tidak diketahui';
    const reporter = inc.profiles?.full_name || 'Tidak diketahui';
    const nowStr = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });
    return [
      `*📋 LAPORAN TEMUAN - SISTEM PRESENSI*\n`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`,
      `${DEPARTMENTS.find(d => d.id === dept)?.emoji || ''} *Disposisi ke: ${c.nama || dept}*\n\n`,
      `🆔 *ID Tiket:* \`${inc.id}\`\n`,
      `📌 *Jenis:* ${inc.incident_type}\n`,
      `📍 *Lokasi:* ${loc}\n`,
      `⚠️ *Tingkat:* ${inc.severity || 'Rendah'}\n`,
      `🕐 *Waktu:* ${new Date(inc.created_at).toLocaleString('id-ID')} WIB\n`,
      `👮 *Pelapor:* ${reporter}\n\n`,
      `📝 *Keterangan:*\n"${inc.description || '-'}"\n\n`,
      `⚡ *Mohon segera ditindaklanjuti!*\n`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`,
      `_Sistem Informasi Presensi_\n`,
      `_Dikirim: ${nowStr}_`,
    ].join('');
  };

  const dispatchWA = (inc, dept) => {
    const c = contacts[dept];
    const nomor = c?.nomor || '6281234567890';
    const msg = buildWAMsg(inc, dept);
    window.open(`https://api.whatsapp.com/send?phone=${nomor}&text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  };

  const handleSaveContact = () => {
    if (!editContact) return;
    saveWAContacts({ ...contacts, [editContact.dept]: { nama: editContact.nama, nomor: editContact.nomor } });
    setContacts(getWAContacts());
    setEditContact(null);
  };

  if (loading) return <div className="p-20 text-center"><div className="w-8 h-8 border-2 border-[var(--aurora-3)] border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-serif font-bold text-white">{t('Laporan & WA Dispatch')}</h3>
          <p className="text-xs text-gray-500 mt-0.5">Kirim temuan ke PIC via WhatsApp</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white"><RefreshCw size={16} /></button>
          <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-xl border ${showSettings ? 'bg-[var(--aurora-3)]/10 border-[var(--aurora-3)]/30 text-[var(--aurora-3)]' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}>
            <Smartphone size={16} />
          </button>
        </div>
      </div>

      {/* WA Contacts Settings Panel */}
      {showSettings && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
          <h4 className="text-xs font-bold text-white flex items-center gap-2"><Smartphone size={14} /> Kontak WhatsApp</h4>
          {DEPARTMENTS.map(dept => {
            const c = contacts[dept.id] || { nama: '', nomor: '' };
            const isEditing = editContact?.dept === dept.id;
            return (
              <div key={dept.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: `${dept.color}20` }}>{dept.emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-500 uppercase font-bold">{dept.label}</p>
                  {isEditing ? (
                    <div className="flex gap-2 mt-1">
                      <input value={editContact.nama} onChange={e => setEditContact({ ...editContact, nama: e.target.value })} placeholder="Nama PIC" className="flex-1 bg-[#13151A] border border-white/20 rounded-lg px-2 py-1 text-xs text-white outline-none" />
                      <input value={editContact.nomor} onChange={e => setEditContact({ ...editContact, nomor: e.target.value })} placeholder="62812..." className="w-36 bg-[#13151A] border border-white/20 rounded-lg px-2 py-1 text-xs text-white outline-none" />
                      <button onClick={handleSaveContact} className="px-3 py-1 rounded-lg bg-[var(--aurora-3)]/20 text-[var(--aurora-3)] text-[10px] font-bold"><X size={14} /></button>
                    </div>
                  ) : (
                    <p className="text-xs text-white truncate">{c.nama || 'Belum diatur'} — {c.nomor || '...'}</p>
                  )}
                </div>
                <button onClick={() => isEditing ? setEditContact(null) : setEditContact({ dept: dept.id, nama: c.nama || '', nomor: c.nomor || '' })} className="text-[9px] text-gray-500 hover:text-white font-bold uppercase">
                  {isEditing ? 'Batal' : 'Ubah'}
                </button>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari lokasi / jenis..." className="w-full bg-[#13151A] border border-white/20 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white outline-none focus:border-[var(--aurora-3)]" />
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        </div>
        <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none">
          <option value="all">Semua Severity</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Temuan', value: incidents.length, color: 'text-white' },
          { label: 'High+Critical', value: incidents.filter(i => i.severity === 'high' || i.severity === 'critical').length, color: 'text-red-400' },
          { label: 'Medium', value: incidents.filter(i => i.severity === 'medium').length, color: 'text-yellow-400' },
          { label: 'Low', value: incidents.filter(i => i.severity === 'low').length, color: 'text-gray-400' },
        ].map((s, i) => (
          <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/10">
            <p className="text-[10px] text-gray-500 uppercase">{s.label}</p>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Incident List */}
      {filteredIncidents.length === 0 ? (
        <div className="p-12 text-center text-gray-500 text-sm">Tidak ada temuan yang perlu di-dispatch.</div>
      ) : (
        <div className="space-y-3">
          {filteredIncidents.map(inc => {
            const sla = getSLA(inc.created_at);
            const loc = inc.patrol_logs?.patrol_checkpoints?.name || 'Tidak diketahui';
            const reporter = inc.profiles?.full_name || 'Tidak diketahui';
            return (
              <motion.div key={inc.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${SEVERITY_STYLES[inc.severity] || 'bg-gray-500/10 text-gray-400'}`}>
                        {inc.severity || 'unknown'}
                      </span>
                      <span className="text-xs font-bold text-white truncate">{inc.incident_type}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{inc.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-500">
                      <span className="flex items-center gap-1"><MapPin size={10} /> {loc}</span>
                      <span className="flex items-center gap-1"><User size={10} /> {reporter}</span>
                      <span className={`flex items-center gap-1 ${sla.critical ? 'text-red-400 font-bold' : sla.urgent ? 'text-orange-400' : ''}`}>
                        <Clock size={10} /> {sla.text}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {DEPARTMENTS.map(dept => {
                      const c = contacts[dept.id];
                      if (!c?.nomor) return null;
                      return (
                        <button key={dept.id} onClick={() => dispatchWA(inc, dept.id)}
                          className="p-2 rounded-lg border border-white/10 hover:bg-white/10 transition-all group relative"
                          style={{ borderColor: `${dept.color}30` }}
                          title={`Kirim ke ${dept.label}`}
                        >
                          <span style={{ color: dept.color }}>{dept.emoji}</span>
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--aurora-3)] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      );
                    })}
                    <button onClick={() => dispatchWA(inc, 'Keamanan')}
                      className="px-3 py-2 rounded-lg bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] text-[10px] font-bold flex items-center gap-1 hover:bg-[#25D366]/20 transition-all">
                      <Send size={12} /> WA
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WADispatch;
