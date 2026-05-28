import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, ChevronDown, ChevronUp, UserCheck, MessageSquare, Clock, CheckCircle2, XCircle, AlertCircle, Star, Loader2, Image, Search, BarChart3, Send } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { logAudit } from '../../../utils/auditLogger';
import { notifyAdminsInTenant, sendNotification, NOTIF_TYPES } from '../../../utils/notificationEngine';

const CATEGORIES = {
  listrik: { label: 'Listrik', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
  ac: { label: 'AC', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
  plumbing: { label: 'Plumbing', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  it: { label: 'IT', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  kebersihan: { label: 'Kebersihan', color: 'text-green-400 bg-green-500/10 border-green-500/30' },
  umum: { label: 'Umum', color: 'text-gray-400 bg-gray-500/10 border-gray-500/30' },
};

const PRIORITIES = {
  low: { label: 'Low', color: 'text-gray-400 bg-gray-500/10 border-gray-500/30' },
  medium: { label: 'Medium', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
  high: { label: 'High', color: 'text-[var(--danger)] bg-[var(--danger)]/10 border-[var(--danger)]/30' },
  critical: { label: 'Critical', color: 'text-[var(--danger)] bg-[var(--danger)]/20 border-[var(--danger)]/50 animate-pulse' },
};

const STATUS_STYLES = {
  open: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  in_progress: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  resolved: 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30',
  closed: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
};

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
  const openCount = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;

  const renderCategoryBadge = (cat) => {
    const c = CATEGORIES[cat] || CATEGORIES.umum;
    return <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${c.color}`}>{c.label}</span>;
  };

  const renderPriorityBadge = (p) => {
    const pr = PRIORITIES[p] || PRIORITIES.low;
    return <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest border ${pr.color}`}>{pr.label}</span>;
  };

  const renderStatusBadge = (status) => {
    const labels = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed' };
    return <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${STATUS_STYLES[status] || STATUS_STYLES.open}`}>{labels[status] || status}</span>;
  };

  const renderStars = (rating) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(s => (
          <Star key={s} size={12} className={s <= rating ? 'text-[var(--warning)] fill-[var(--warning)]' : 'text-gray-600'} />
        ))}
      </div>
    );
  };

  const renderDetailModal = () => {
    if (!selectedTicket) return null;
    const t = selectedTicket;
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setSelectedTicket(null); setResolutionNotes(''); }}>
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#1A1C23] rounded-3xl border border-white/10 p-6 max-w-xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">{t.ticket_number}</h3>
              <p className="text-xs text-gray-500 mt-1">{t.subject}</p>
            </div>
            <button onClick={() => { setSelectedTicket(null); setResolutionNotes(''); }} className="text-gray-500 hover:text-white p-2">✕</button>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between bg-white/5 p-3 rounded-xl"><span className="text-gray-400">Kategori</span>{renderCategoryBadge(t.category)}</div>
            <div className="flex justify-between bg-white/5 p-3 rounded-xl"><span className="text-gray-400">Prioritas</span>{renderPriorityBadge(t.priority)}</div>
            <div className="flex justify-between bg-white/5 p-3 rounded-xl"><span className="text-gray-400">Status</span>{renderStatusBadge(t.status)}</div>
            <div className="flex justify-between bg-white/5 p-3 rounded-xl"><span className="text-gray-400">Pengirim</span><span className="text-white font-bold">{t.submitter?.full_name || '-'}</span></div>
            <div className="flex justify-between bg-white/5 p-3 rounded-xl"><span className="text-gray-400">Ditugaskan Ke</span><span className="text-white font-bold">{t.assigned?.full_name || '—'}</span></div>
            {t.sla_deadline && <div className="flex justify-between bg-white/5 p-3 rounded-xl"><span className="text-gray-400">SLA Deadline</span><span className={`font-bold ${new Date(t.sla_deadline) < new Date() ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>{new Date(t.sla_deadline).toLocaleString('id-ID')}</span></div>}
            {t.description && <div className="bg-white/5 p-3 rounded-xl"><span className="text-gray-400 block mb-1">Deskripsi</span><span className="text-white whitespace-pre-wrap">{t.description}</span></div>}
            {t.resolution_notes && <div className="bg-white/5 p-3 rounded-xl"><span className="text-gray-400 block mb-1">Catatan Resolusi</span><span className="text-[var(--success)] whitespace-pre-wrap">{t.resolution_notes}</span></div>}
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
                <textarea value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} rows={3} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none resize-none" placeholder="Jelaskan solusi..." />
                <button onClick={addResolutionNotes} disabled={submittingNotes || !resolutionNotes.trim()} className="mt-2 px-4 py-2 rounded-xl bg-[var(--success)] text-black text-[10px] font-bold flex items-center gap-1 disabled:opacity-50">
                  {submittingNotes ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Simpan & Resolve
                </button>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-6">
            <button onClick={() => { setSelectedTicket(null); setResolutionNotes(''); }} className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-xs font-bold">Tutup</button>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className="glass-panel p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-6 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">Helpdesk Ticketing</h2>
          <p className="text-sm text-gray-400 mt-1">Kelola tiket bantuan dari karyawan</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white/5 rounded-2xl border border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--aurora-3)]/10 text-[var(--aurora-3)] flex items-center justify-center"><BarChart3 size={20} /></div>
            <div><p className="text-2xl font-bold text-white">{tickets.length}</p><p className="text-[10px] text-gray-500 uppercase tracking-widest">Total Tiket</p></div>
          </div>
        </div>
        <div className="bg-white/5 rounded-2xl border border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 text-yellow-400 flex items-center justify-center"><AlertCircle size={20} /></div>
            <div><p className="text-2xl font-bold text-white">{openCount}</p><p className="text-[10px] text-gray-500 uppercase tracking-widest">Open / In Progress</p></div>
          </div>
        </div>
        <div className="bg-white/5 rounded-2xl border border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--success)]/10 text-[var(--success)] flex items-center justify-center"><Clock size={20} /></div>
            <div><p className="text-2xl font-bold text-white">{calcAvgResolution()}j</p><p className="text-[10px] text-gray-500 uppercase tracking-widest">Rata-rata Resolusi</p></div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map(f => (
          <button key={f} onClick={() => setTab(f)} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${tab === f ? 'bg-[var(--aurora-3)]/20 border-[var(--aurora-3)] text-white' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}>
            {f === 'all' ? 'Semua' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={32} className="animate-spin text-[var(--aurora-3)]" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Ticket size={40} className="mx-auto text-gray-500 mb-4" />
          <p className="text-gray-400">Tidak ada tiket</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => (
            <div key={t.id} className="bg-white/5 rounded-2xl border border-white/10 hover:border-white/20 transition-all">
              <div className="p-4 cursor-pointer" onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}>
                <div className="flex flex-col sm:flex-row justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-white font-bold text-sm font-mono">{t.ticket_number}</h4>
                      {renderCategoryBadge(t.category)}
                      {renderPriorityBadge(t.priority)}
                      {renderStatusBadge(t.status)}
                    </div>
                    <p className="text-white text-sm mt-1">{t.subject}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
                      <span>Dari: {t.submitter?.full_name || '-'}</span>
                      <span>•</span>
                      <span>Ditugaskan: {t.assigned?.full_name || '—'}</span>
                      <span>•</span>
                      <span>{new Date(t.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {expandedId === t.id ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                  </div>
                </div>
              </div>
              {expandedId === t.id && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="border-t border-white/10 px-4 pb-4 pt-3 space-y-3">
                  {t.description && <p className="text-sm text-gray-400 bg-white/[0.03] p-3 rounded-xl">{t.description}</p>}
                  {t.photo_urls?.length > 0 && (
                    <div className="flex gap-2">
                      {t.photo_urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-xl overflow-hidden bg-black/30 border border-white/10">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 items-center">
                    {/* Assign */}
                    <div className="relative group">
                      <button className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-[10px] font-bold flex items-center gap-1 hover:bg-white/10"><UserCheck size={12} /> Assign</button>
                      <div className="absolute top-full left-0 mt-1 w-56 bg-[#1A1C23] border border-white/10 rounded-xl shadow-xl z-10 hidden group-hover:block max-h-40 overflow-y-auto">
                        <button onClick={() => assignTechnician(t.id, null)} className="w-full text-left px-4 py-2 text-[10px] text-gray-400 hover:bg-white/5 hover:text-white">Unassign</button>
                        {technicians.map(tech => (
                          <button key={tech.id} onClick={() => assignTechnician(t.id, tech.id)} className="w-full text-left px-4 py-2 text-[10px] text-gray-300 hover:bg-white/5 hover:text-white">{tech.full_name} ({tech.role})</button>
                        ))}
                      </div>
                    </div>
                    {/* Status transitions */}
                    {t.status === 'open' && <button onClick={() => updateStatus(t, 'in_progress')} className="px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-[10px] font-bold flex items-center gap-1"><AlertCircle size={12} /> Mulai</button>}
                    {t.status === 'in_progress' && (
                      <>
                        <button onClick={() => { setSelectedTicket(t); }} className="px-3 py-2 rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/30 text-[var(--success)] text-[10px] font-bold flex items-center gap-1"><CheckCircle2 size={12} /> Resolve</button>
                      </>
                    )}
                    {t.status !== 'closed' && t.status !== 'resolved' && (
                      <button onClick={() => updateStatus(t, 'closed')} className="px-3 py-2 rounded-xl bg-gray-500/10 border border-gray-500/30 text-gray-400 text-[10px] font-bold flex items-center gap-1"><XCircle size={12} /> Tutup</button>
                    )}
                    {t.status === 'resolved' && (
                      <button onClick={() => updateStatus(t, 'closed')} className="px-3 py-2 rounded-xl bg-gray-500/10 border border-gray-500/30 text-gray-400 text-[10px] font-bold flex items-center gap-1"><XCircle size={12} /> Tutup</button>
                    )}
                    {t.status === 'closed' && (
                      <button onClick={() => updateStatus(t, 'open')} className="px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-bold flex items-center gap-1"><MessageSquare size={12} /> Buka Ulang</button>
                    )}
                    <button onClick={() => setSelectedTicket(t)} className="px-3 py-2 rounded-xl bg-[var(--aurora-3)]/10 border border-[var(--aurora-3)]/30 text-[var(--aurora-3)] text-[10px] font-bold flex items-center gap-1"><Search size={12} /> Detail</button>
                  </div>
                </motion.div>
              )}
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>{renderDetailModal()}</AnimatePresence>
    </div>
  );
};

export default HelpdeskTicketing;
