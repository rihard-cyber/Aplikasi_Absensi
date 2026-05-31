import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, ChevronDown, ChevronUp, UserCheck, MessageSquare, Clock, CheckCircle2, XCircle, AlertCircle, Star, Loader2, Image, Search, BarChart3, Send, Headphones, Zap, Snowflake, Wifi, Trash2, HelpCircle, User, Plus } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { logAudit } from '../../../utils/auditLogger';
import { notifyAdminsInTenant, sendNotification, NOTIF_TYPES } from '../../../utils/notificationEngine';

const CATEGORIES = {
  listrik: { label: 'Listrik', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30', icon: 'Zap', iconBg: 'bg-yellow-500/20' },
  ac: { label: 'AC', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30', icon: 'Snowflake', iconBg: 'bg-purple-500/20' },
  plumbing: { label: 'Plumbing', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30', icon: 'Wifi', iconBg: 'bg-blue-500/20' },
  it: { label: 'IT', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30', icon: 'Wifi', iconBg: 'bg-purple-500/20' },
  kebersihan: { label: 'Kebersihan', color: 'text-green-400 bg-green-500/10 border-green-500/30', icon: 'Trash2', iconBg: 'bg-green-500/20' },
  umum: { label: 'Umum', color: 'text-gray-400 bg-gray-500/10 border-gray-500/30', icon: 'HelpCircle', iconBg: 'bg-gray-500/20' },
};

const CATEGORY_ICONS = { Zap, Snowflake, Wifi, Trash2, HelpCircle };

const PRIORITIES = {
  low: { label: 'Low', color: 'text-gray-400 bg-gray-500/10 border-gray-500/30' },
  medium: { label: 'Medium', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
  high: { label: 'High', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
  critical: { label: 'Critical', color: 'text-rose-400 bg-rose-500/20 border-rose-500/50 animate-pulse' },
};

const STATUS_STYLES = {
  open: 'border border-yellow-500/50 text-yellow-400 bg-yellow-500/10 shadow-[0_0_6px_rgba(255,255,0,0.1)]',
  in_progress: 'border border-amber-500/50 text-amber-400 bg-amber-500/10 shadow-[0_0_6px_rgba(251,191,36,0.1)]',
  resolved: 'border border-emerald-500/50 text-emerald-400 bg-emerald-500/10 shadow-[0_0_6px_rgba(52,211,153,0.1)]',
  closed: 'border border-gray-500/30 text-gray-400 bg-gray-500/10',
};

const STATUS_LABELS = { open: 'OPEN', in_progress: 'IN PROGRESS', resolved: 'RESOLVED', closed: 'CLOSED' };

const TABS = ['all', 'open', 'in_progress', 'resolved', 'closed'];

const HelpdeskTicketing = () => {
  const [tenantId, setTenantId] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submittingNotes, setSubmittingNotes] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const toast = useToast();

  useEffect(() => { init(); }, []);

  const init = async () => {
    setLoading(true);
    const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!profile?.tenant_id && !isGod) return;
    if (profile?.tenant_id) setTenantId(profile.tenant_id);
    const tid = profile?.tenant_id;

    let q = supabase.from('helpdesk_tickets').select('*, submitter:profiles!helpdesk_tickets_submitter_id_fkey(full_name, nip), assigned:profiles!helpdesk_tickets_assigned_to_fkey(full_name, nip)');
    if (tid) q = q.eq('tenant_id', tid);
    q = q.order('created_at', { ascending: false });
    const { data } = await q;
    if (data) setTickets(data);

    let tq = supabase.from('profiles').select('id, full_name, nip, role').in('role', ['teknisi', 'cleaning_service', 'security', 'teknisihvac', 'teknisiplumbing', 'teknisiac', 'teknisiit']);
    if (tid) tq = tq.eq('tenant_id', tid);
    const { data: techs } = await tq;
    if (techs) setTechnicians(techs);
    setLoading(false);
  };

  const generateTicketNumber = async () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `TKT-${y}/${m}/`;
    const { data: last } = await supabase.from('helpdesk_tickets')
      .select('ticket_number')
      .like('ticket_number', `${prefix}%`)
      .order('created_at', { ascending: false })
      .limit(1);
    let seq = 1;
    if (last?.length) {
      const parts = last[0].ticket_number.split('/');
      seq = parseInt(parts[2]) + 1;
    }
    return `${prefix}${String(seq).padStart(3, '0')}`;
  };

  const assignTechnician = async (ticketId, techId) => {
    await supabase.from('helpdesk_tickets').update({
      assigned_to: techId || null,
      status: techId ? 'in_progress' : 'open'
    }).eq('id', ticketId);
    const tech = technicians.find(t => t.id === techId);
    logAudit('ASSIGN_HELPDESK', { ticket: ticketId, technician: tech?.full_name });
    toast(`Ditugaskan ke ${tech?.full_name || '—'}`, 'success');
    if (techId) {
      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket) {
        sendNotification({ userId: techId, type: NOTIF_TYPES.TICKET_ASSIGNED, title: 'Anda Ditugaskan: ' + ticket.subject, body: ticket.description?.substring(0,100), link: '/helpdesk' });
      }
    }
    init();
  };

  const updateStatus = async (ticket, newStatus) => {
    const payload = { status: newStatus };
    if (newStatus === 'resolved') payload.resolved_at = new Date().toISOString();
    if (newStatus === 'closed') payload.closed_at = new Date().toISOString();
    await supabase.from('helpdesk_tickets').update(payload).eq('id', ticket.id);
    logAudit('UPDATE_HELPDESK_STATUS', { ticket: ticket.ticket_number, from: ticket.status, to: newStatus });
    toast(`Status berubah ke ${newStatus}`, 'success');
    if (newStatus === 'resolved' || newStatus === 'closed') {
      sendNotification({ userId: ticket.submitter_id, type: NOTIF_TYPES.TICKET_RESOLVED, title: 'Tiket Selesai: ' + ticket.subject, body: 'Tiket Anda telah ditandai selesai', link: '/helpdesk' });
    }
    init();
  };

  const addResolutionNotes = async () => {
    if (!resolutionNotes.trim() || !selectedTicket) return;
    setSubmittingNotes(true);
    await supabase.from('helpdesk_tickets').update({
      resolution_notes: resolutionNotes.trim(),
      status: 'resolved',
      resolved_at: new Date().toISOString()
    }).eq('id', selectedTicket.id);
    logAudit('HELPDESK_RESOLVED', { ticket: selectedTicket.ticket_number, notes: resolutionNotes.trim() });
    toast('Resolusi ditambahkan!', 'success');
    sendNotification({ userId: selectedTicket.submitter_id, type: NOTIF_TYPES.TICKET_RESOLVED, title: 'Tiket Selesai: ' + selectedTicket.subject, body: 'Tiket Anda telah ditandai selesai', link: '/helpdesk' });
    setResolutionNotes('');
    setSelectedTicket(null);
    setSubmittingNotes(false);
    init();
  };

  const calcAvgResolution = () => {
    const resolved = tickets.filter(t => t.resolved_at && (t.status === 'resolved' || t.status === 'closed'));
    if (!resolved.length) return 0;
    const total = resolved.reduce((sum, t) => {
      const created = new Date(t.created_at);
      const resolvedDate = new Date(t.resolved_at);
      return sum + (resolvedDate - created) / (1000 * 60 * 60);
    }, 0);
    return (total / resolved.length).toFixed(1);
  };

  const filtered = tab === 'all' ? tickets : tickets.filter(t => t.status === tab);
  const searched = searchQuery
    ? filtered.filter(t =>
        t.ticket_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.submitter?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filtered;
  const openCount = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;

  const CategoryIcon = ({ category, size = 14 }) => {
    const cat = CATEGORIES[category] || CATEGORIES.umum;
    const IconComponent = CATEGORY_ICONS[cat.icon] || HelpCircle;
    return (
      <div className={`w-8 h-8 rounded-lg ${cat.iconBg} flex items-center justify-center`}>
        <IconComponent size={size} className={cat.color.split(' ')[0]} />
      </div>
    );
  };

  const renderPriorityBadge = (p) => {
    const pr = PRIORITIES[p] || PRIORITIES.low;
    const neonMap = { low: '', medium: 'shadow-[0_0_4px_rgba(255,255,0,0.1)]', high: 'shadow-[0_0_4px_rgba(255,0,0,0.1)]', critical: 'shadow-[0_0_8px_rgba(255,0,0,0.2)]' };
    if (p === 'high' || p === 'critical') {
      return <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-rose-500 text-white ${neonMap[p] || ''}`}>{pr.label}</span>;
    }
    return <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${pr.color} ${neonMap[p] || ''}`}>{pr.label}</span>;
  };

  const renderStatusBadge = (status) => {
    return <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[status] || STATUS_STYLES.open}`}>{STATUS_LABELS[status] || status}</span>;
  };

  const renderStars = (rating) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(s => (
          <Star key={s} size={12} className={s <= rating ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_4px_rgba(255,214,0,0.3)]' : 'text-gray-600'} />
        ))}
      </div>
    );
  };

  const renderDetailModal = () => {
    if (!selectedTicket) return null;
    const t = selectedTicket;
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => { setSelectedTicket(null); setResolutionNotes(''); }}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-6 max-w-xl w-full max-h-[85vh] overflow-y-auto shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">{t.ticket_number}</h3>
              <p className="text-xs text-gray-400 mt-1">{t.subject}</p>
            </div>
            <button onClick={() => { setSelectedTicket(null); setResolutionNotes(''); }} className="text-gray-500 hover:text-white p-2 hover:bg-white/5 rounded-xl transition-colors">✕</button>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between bg-white/5 p-3 rounded-xl"><span className="text-gray-400">Kategori</span>{renderCategoryBadge(t.category)}</div>
            <div className="flex justify-between bg-white/5 p-3 rounded-xl"><span className="text-gray-400">Prioritas</span>{renderPriorityBadge(t.priority)}</div>
            <div className="flex justify-between bg-white/5 p-3 rounded-xl"><span className="text-gray-400">Status</span>{renderStatusBadge(t.status)}</div>
            <div className="flex justify-between bg-white/5 p-3 rounded-xl"><span className="text-gray-400">Pengirim</span><span className="text-white font-bold">{t.submitter?.full_name || '-'}</span></div>
            <div className="flex justify-between bg-white/5 p-3 rounded-xl"><span className="text-gray-400">Ditugaskan Ke</span><span className="text-white font-bold">{t.assigned?.full_name || '—'}</span></div>
            {t.sla_deadline && <div className="flex justify-between bg-white/5 p-3 rounded-xl"><span className="text-gray-400">SLA Deadline</span><span className={`font-bold ${new Date(t.sla_deadline) < new Date() ? 'text-rose-400' : 'text-emerald-400'}`}>{new Date(t.sla_deadline).toLocaleString('id-ID')}</span></div>}
            {t.description && <div className="bg-white/5 p-3 rounded-xl"><span className="text-gray-400 block mb-1">Deskripsi</span><span className="text-white whitespace-pre-wrap">{t.description}</span></div>}
            {t.resolution_notes && <div className="bg-white/5 p-3 rounded-xl"><span className="text-gray-400 block mb-1">Catatan Resolusi</span><span className="text-emerald-400 whitespace-pre-wrap">{t.resolution_notes}</span></div>}
            {t.rating && <div className="flex justify-between bg-white/5 p-3 rounded-xl"><span className="text-gray-400">Rating</span>{renderStars(t.rating)}</div>}
            {t.photo_urls?.length > 0 && (
              <div className="bg-white/5 p-3 rounded-xl">
                <span className="text-gray-400 block mb-2 flex items-center gap-1"><Image size={14} /> Foto</span>
                <div className="grid grid-cols-3 gap-2">
                  {t.photo_urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-xl overflow-hidden bg-black/30 border border-white/10">
                      <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover hover:scale-110 transition-transform" />
                    </a>
                  ))}
                </div>
              </div>
            )}
            {t.status !== 'closed' && t.status !== 'resolved' && (
              <div className="bg-white/5 p-3 rounded-xl">
                <label className="text-gray-400 block mb-2 text-[10px] uppercase tracking-widest font-bold">Tambahkan Catatan Resolusi</label>
                <textarea value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} rows={3}  placeholder="Jelaskan solusi..."  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-400/30 resize-none transition-all duration-300 placeholder:text-gray-400 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
                <button onClick={addResolutionNotes} disabled={submittingNotes || !resolutionNotes.trim()} className="mt-2 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 disabled:opacity-50 hover:bg-emerald-500/30 transition-all shadow-[0_0_10px_rgba(52,211,153,0.1)]">
                  {submittingNotes ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Simpan & Resolve
                </button>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-6">
            <button onClick={() => { setSelectedTicket(null); setResolutionNotes(''); }} className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-xs font-bold hover:bg-white/10 transition-all">Tutup</button>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  // Render category badge for modal
  const renderCategoryBadge = (cat) => {
    const c = CATEGORIES[cat] || CATEGORIES.umum;
    return <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${c.color}`}>{c.label}</span>;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--aurora-3)]/5 rounded-full blur-[100px] pointer-events-none" />

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-6 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-[var(--aurora-3)]/10 flex items-center justify-center shadow-[0_0_12px_rgba(0,201,255,0.2)]"><Headphones size={18} className="text-[var(--aurora-3)]" /></span>
            Helpdesk Tickets
          </h2>
          <p className="text-sm text-gray-400 mt-1 ml-12">Kelola tiket bantuan dari karyawan</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all duration-300 shadow-[0_0_12px_rgba(147,51,234,0.3)]">
          <Plus size={14} /> Dashboard
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] hover:bg-white/10 transition-all duration-300"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--aurora-3)]/10 text-[var(--aurora-3)] flex items-center justify-center shadow-[0_0_10px_rgba(0,201,255,0.15)]"><BarChart3 size={20} /></div>
            <div><p className="text-2xl font-bold text-white">{tickets.length}</p><p className="text-[10px] text-gray-500 uppercase tracking-widest">Total Tiket</p></div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] hover:bg-white/10 transition-all duration-300"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shadow-[0_0_10px_rgba(251,191,36,0.15)]"><AlertCircle size={20} /></div>
            <div><p className="text-2xl font-bold text-white">{openCount}</p><p className="text-[10px] text-gray-500 uppercase tracking-widest">Open / In Progress</p></div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] hover:bg-white/10 transition-all duration-300"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shadow-[0_0_10px_rgba(52,211,153,0.15)]"><Clock size={20} /></div>
            <div><p className="text-2xl font-bold text-white">{calcAvgResolution()}j</p><p className="text-[10px] text-gray-500 uppercase tracking-widest">Rata-rata Resolusi</p></div>
          </div>
        </motion.div>
      </div>

      {/* SEARCH & FILTER BAR */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari tiket, subjek, atau pengirim..."
            className="w-full bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2 text-white text-sm outline-none placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40"
          />
        </div>

        {/* Tabs as filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map(f => (
            <button key={f} onClick={() => setTab(f)} className={`whitespace-nowrap px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all shrink-0 ${
              tab === f
                ? 'bg-[var(--aurora-3)]/20 border-[var(--aurora-3)] text-white shadow-[0_0_10px_rgba(0,201,255,0.1)]'
                : 'bg-white/5 border-white/10 text-gray-500 hover:text-white hover:bg-white/10'
            }`}>
              {f === 'all' ? 'Semua' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* TICKET LIST */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={32} className="animate-spin text-[var(--aurora-3)]" /></div>
      ) : searched.length === 0 ? (
        <div className="text-center py-16">
          <Ticket size={40} className="mx-auto text-gray-500 mb-4" />
          <p className="text-gray-400">Tidak ada tiket</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Column Headers */}
          <div className="hidden sm:flex items-center px-4 py-2 text-xs uppercase text-gray-500 font-semibold tracking-wider border-b border-white/10">
            <div className="w-1/2">Ticket</div>
            <div className="w-1/6 text-center">Priority</div>
            <div className="w-1/6 text-center">Status</div>
            <div className="w-1/6 text-right">Actions</div>
          </div>

          {searched.map((t, i) => {
            const isExpanded = expandedId === t.id;
            const isActive = t.status === 'open' || t.status === 'in_progress';
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`bg-white/[0.02] backdrop-blur-md border rounded-2xl transition-all duration-300 hover:bg-white/5 hover:border-white/20 ${
                  isExpanded ? 'border-l-4 border-l-yellow-400 border-white/10' : 'border border-white/5'
                } ${isActive && !isExpanded ? 'border-white/10' : ''}`}
              >
                {/* COLLAPSED VIEW */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : t.id)}
                >
                  <div className="flex items-center gap-4">
                    {/* Category Icon */}
                    <div className="hidden sm:flex shrink-0">
                      <CategoryIcon category={t.category} size={16} />
                    </div>

                    {/* Ticket Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-gray-500 text-[11px] font-mono font-medium">{t.ticket_number}</span>
                        <h4 className="text-white text-sm font-semibold truncate">{t.subject}</h4>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                        <span className="flex items-center gap-1"><User size={10} /> {t.submitter?.full_name || '-'}</span>
                        <span>•</span>
                        <span>{new Date(t.created_at).toLocaleDateString('id-ID')}</span>
                        {t.assigned?.full_name && (
                          <>
                            <span>•</span>
                            <span>Teknisi: {t.assigned.full_name}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="hidden sm:flex items-center gap-2 shrink-0">
                      {renderPriorityBadge(t.priority)}
                      {renderStatusBadge(t.status)}
                    </div>
                    <div className="flex sm:hidden items-center gap-1.5 shrink-0">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide ${
                        t.priority === 'high' || t.priority === 'critical'
                          ? 'bg-rose-500 text-white'
                          : 'border border-gray-500/30 text-gray-400'
                      }`}>{PRIORITIES[t.priority]?.label || t.priority}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide ${STATUS_STYLES[t.status] || STATUS_STYLES.open}`}>{STATUS_LABELS[t.status] || t.status}</span>
                    </div>

                    <ChevronDown size={14} className={`text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {/* EXPANDED VIEW */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-white/5 px-4 pb-5 pt-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Left: Description + Photos */}
                      <div className="space-y-3">
                        {t.description && (
                          <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
                            <span className="text-[9px] text-gray-500 uppercase tracking-widest font-semibold block mb-1">Deskripsi</span>
                            <p className="text-sm text-gray-300 leading-relaxed">{t.description}</p>
                          </div>
                        )}
                        {t.photo_urls?.length > 0 && (
                          <div className="flex gap-2">
                            {t.photo_urls.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-xl overflow-hidden bg-black/30 border border-white/10 hover:border-white/30 transition-all">
                                <img src={url} alt="" className="w-full h-full object-cover" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right: Details Grid */}
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-white/[0.03] rounded-xl p-2.5 border border-white/5">
                            <span className="text-[9px] text-gray-500 uppercase tracking-widest font-semibold">Kategori</span>
                            <div className="mt-1">{renderCategoryBadge(t.category)}</div>
                          </div>
                          <div className="bg-white/[0.03] rounded-xl p-2.5 border border-white/5">
                            <span className="text-[9px] text-gray-500 uppercase tracking-widest font-semibold">Prioritas</span>
                            <div className="mt-1">{renderPriorityBadge(t.priority)}</div>
                          </div>
                          <div className="bg-white/[0.03] rounded-xl p-2.5 border border-white/5">
                            <span className="text-[9px] text-gray-500 uppercase tracking-widest font-semibold">Status</span>
                            <div className="mt-1">{renderStatusBadge(t.status)}</div>
                          </div>
                          <div className="bg-white/[0.03] rounded-xl p-2.5 border border-white/5">
                            <span className="text-[9px] text-gray-500 uppercase tracking-widest font-semibold">Teknisi</span>
                            <div className="mt-1 flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-[8px] font-bold text-white">
                                {(t.assigned?.full_name?.charAt(0) || '—')}
                              </div>
                              <span className="text-xs text-gray-300">{t.assigned?.full_name || 'Belum ditugaskan'}</span>
                            </div>
                          </div>
                          {t.sla_deadline && (
                            <div className="bg-white/[0.03] rounded-xl p-2.5 border border-white/5 col-span-2">
                              <span className="text-[9px] text-gray-500 uppercase tracking-widest font-semibold">SLA Deadline</span>
                              <div className="mt-1 flex items-center gap-1.5">
                                <Clock size={12} className={new Date(t.sla_deadline) < new Date() ? 'text-rose-400' : 'text-emerald-400'} />
                                <span className={`text-xs font-medium ${new Date(t.sla_deadline) < new Date() ? 'text-rose-400' : 'text-emerald-400'}`}>
                                  {new Date(t.sla_deadline).toLocaleString('id-ID')}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 items-center mt-4 pt-3 border-t border-white/5">
                      {/* Assign */}
                      <div className="relative group">
                        <button className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-[10px] font-bold flex items-center gap-1 hover:bg-white/10 transition-all"><UserCheck size={12} /> Assign</button>
                        <div className="absolute top-full left-0 mt-1 w-56 bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl shadow-xl z-10 hidden group-hover:block max-h-40 overflow-y-auto">
                          <button onClick={() => assignTechnician(t.id, null)} className="w-full text-left px-4 py-2 text-[10px] text-gray-400 hover:bg-white/10 hover:text-white transition-colors">Unassign</button>
                          {technicians.map(tech => (
                            <button key={tech.id} onClick={() => assignTechnician(t.id, tech.id)} className="w-full text-left px-4 py-2 text-[10px] text-gray-300 hover:bg-white/10 hover:text-white transition-colors">{tech.full_name} ({tech.role})</button>
                          ))}
                        </div>
                      </div>
                      {/* Status transitions */}
                      {t.status === 'open' && <button onClick={() => updateStatus(t, 'in_progress')} className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold flex items-center gap-1 hover:bg-amber-500/20 transition-all"><AlertCircle size={12} /> Mulai</button>}
                      {t.status === 'in_progress' && (
                        <>
                          <button onClick={() => { setSelectedTicket(t); }} className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center gap-1 hover:bg-emerald-500/20 transition-all shadow-[0_0_8px_rgba(52,211,153,0.1)]"><CheckCircle2 size={12} /> Resolve</button>
                        </>
                      )}
                      {t.status !== 'closed' && t.status !== 'resolved' && (
                        <button onClick={() => updateStatus(t, 'closed')} className="px-3 py-2 rounded-xl bg-gray-500/10 border border-gray-500/30 text-gray-400 text-[10px] font-bold flex items-center gap-1 hover:bg-gray-500/20 transition-all"><XCircle size={12} /> Tutup</button>
                      )}
                      {t.status === 'resolved' && (
                        <button onClick={() => updateStatus(t, 'closed')} className="px-3 py-2 rounded-xl bg-gray-500/10 border border-gray-500/30 text-gray-400 text-[10px] font-bold flex items-center gap-1 hover:bg-gray-500/20 transition-all"><XCircle size={12} /> Tutup</button>
                      )}
                      {t.status === 'closed' && (
                        <button onClick={() => updateStatus(t, 'open')} className="px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-bold flex items-center gap-1 hover:bg-blue-500/20 transition-all"><MessageSquare size={12} /> Buka Ulang</button>
                      )}
                      <button onClick={() => setSelectedTicket(t)} className="px-3 py-2 rounded-xl bg-[var(--aurora-3)]/10 border border-[var(--aurora-3)]/30 text-[var(--aurora-3)] text-[10px] font-bold flex items-center gap-1 hover:bg-[var(--aurora-3)]/20 transition-all"><Search size={12} /> Detail</button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>{renderDetailModal()}</AnimatePresence>
    </motion.div>
  );
};

export default HelpdeskTicketing;
