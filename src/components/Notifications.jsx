import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle2, DollarSign, FileText, X, ShieldCheck, AlertTriangle, Clock, CheckCheck } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { fetchNotifications, getUnreadCount, markAllAsRead, markNotifAsRead } from '../utils/notificationEngine';

import ThemeToggle from './ThemeToggle';

const NotificationContext = createContext(null);
export const useNotifications = () => useContext(NotificationContext);

const TYPE_ICONS = {
  ticket_created: { icon: FileText, color: 'var(--aurora-1)' },
  ticket_assigned: { icon: CheckCircle2, color: 'var(--aurora-3)' },
  ticket_resolved: { icon: CheckCircle2, color: 'var(--success)' },
  booking_requested: { icon: Clock, color: 'var(--warning)' },
  booking_approved: { icon: CheckCircle2, color: 'var(--success)' },
  booking_rejected: { icon: X, color: 'var(--danger)' },
  overtime_approved: { icon: CheckCircle2, color: 'var(--success)' },
  overtime_rejected: { icon: X, color: 'var(--danger)' },
  overtime_requested: { icon: Clock, color: 'var(--warning)' },
  incident_reported: { icon: AlertTriangle, color: 'var(--danger)' },
  shift_swap_requested: { icon: Clock, color: 'var(--warning)' },
  shift_swap_approved: { icon: CheckCircle2, color: 'var(--success)' },
  shift_swap_rejected: { icon: X, color: 'var(--danger)' },
  visitor_checked_in: { icon: ShieldCheck, color: 'var(--aurora-3)' },
  missed_guard: { icon: AlertTriangle, color: 'var(--danger)' },
};

const getDefaultIcon = (type) => {
  if (TYPE_ICONS[type]) return TYPE_ICONS[type];
  return { icon: Bell, color: 'var(--aurora-1)' };
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'baru saja';
  if (mins < 60) return `${mins}m lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}j lalu`;
  const days = Math.floor(hours / 24);
  return `${days}h lalu`;
};

const fetchLegacyNotifications = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];
    const { data: profile } = await supabase.from('profiles').select('id, tenant_id, role').eq('auth_id', session.user.id).maybeSingle();
    if (!profile) return [];
    const results = [];
    if ((profile.role === 'TENANT_ADMIN') && profile.tenant_id) {
      const { count: pendingLoans } = await supabase.from('loans').select('*', { count: 'exact', head: true }).eq('tenant_id', profile.tenant_id).eq('status', 'PENDING');
      if (pendingLoans) results.push({ id: 'legacy-loans', is_read: false, type: 'info', title: `${pendingLoans} pengajuan pinjaman menunggu`, created_at: new Date().toISOString(), actor_name: null, body: null });
      const { count: pendingReimb } = await supabase.from('reimbursements').select('*', { count: 'exact', head: true }).eq('tenant_id', profile.tenant_id).eq('status', 'PENDING');
      if (pendingReimb) results.push({ id: 'legacy-reimb', is_read: false, type: 'info', title: `${pendingReimb} klaim reimbursemen menunggu`, created_at: new Date().toISOString(), actor_name: null, body: null });
      const { count: draftPeriods } = await supabase.from('payroll_periods').select('*', { count: 'exact', head: true }).eq('tenant_id', profile.tenant_id).eq('status', 'DRAFT');
      if (draftPeriods) results.push({ id: 'legacy-payroll', is_read: false, type: 'info', title: `${draftPeriods} periode payroll siap diproses`, created_at: new Date().toISOString(), actor_name: null, body: null });
    }
    if ((profile.role === 'EMPLOYEE' || profile.role === 'SUB_ADMIN') && profile.id) {
      const { count: empLoans } = await supabase.from('loans').select('*', { count: 'exact', head: true }).eq('user_id', profile.id).eq('status', 'ACTIVE');
      if (empLoans) results.push({ id: 'legacy-emp-loans', is_read: false, type: 'info', title: `${empLoans} pinjaman aktif berjalan`, created_at: new Date().toISOString(), actor_name: null, body: null });
      const { data: leaveBal } = await supabase.from('leave_balances').select('total_days, used_days').eq('user_id', profile.id).eq('year', new Date().getFullYear()).maybeSingle();
      if (leaveBal) {
        const remaining = leaveBal.total_days - leaveBal.used_days;
        if (remaining <= 3) results.push({ id: 'legacy-leave', is_read: false, type: 'warning', title: `Sisa cuti ${remaining} hari — segera gunakan!`, created_at: new Date().toISOString(), actor_name: null, body: null });
      }
    }
    return results;
  } catch { return []; }
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const [dbNotifs, legacyNotifs] = await Promise.all([
        fetchNotifications(50),
        fetchLegacyNotifications(),
      ]);
      const combined = [...legacyNotifs, ...dbNotifs];
      setNotifications(combined);
      setUnreadCount(combined.filter(n => !n.is_read).length);
    } catch (e) {
      console.warn('Notif fetch error', e);
    }
  }, []);

  useEffect(() => { refresh(); const interval = setInterval(refresh, 30000); return () => clearInterval(interval); }, [refresh]);

  const handleMarkRead = async (notifId) => {
    await markNotifAsRead(notifId);
    refresh();
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    refresh();
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, showPanel, setShowPanel, refresh }}>
      {children}


      <AnimatePresence>
        {showPanel && (
          <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-16 right-4 w-80 z-[9999] glass-panel p-4 border border-white/10 shadow-2xl max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white">Notifikasi</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-[10px] text-[var(--aurora-3)] hover:underline flex items-center gap-1 font-bold">
                    <CheckCheck size={12} /> Baca Semua
                  </button>
                )}
                <button onClick={() => setShowPanel(false)} className="text-gray-500 hover:text-white"><X size={16} /></button>
              </div>
            </div>
            {notifications.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-8">Belum ada notifikasi</p>
            ) : (
              <div className="space-y-1">
                {notifications.map(n => {
                  const { icon: Icon, color } = getDefaultIcon(n.type);
                  return (
                    <div key={n.id}
                      onClick={() => { if (!n.is_read) handleMarkRead(n.id); }}
                      className={`p-3 rounded-xl text-xs flex items-start gap-3 cursor-pointer transition-all ${n.is_read ? 'bg-white/[0.02] opacity-60' : 'bg-white/5 border border-white/10 hover:bg-white/[0.08]'}`}>
                      <span style={{ color }} className="mt-0.5 shrink-0"><Icon size={14} /></span>
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold leading-snug ${n.is_read ? 'text-gray-500' : 'text-white'}`}>{n.title}</p>
                        {n.body && <p className="text-gray-400 mt-0.5 leading-relaxed">{n.body}</p>}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[9px] text-gray-600">{timeAgo(n.created_at)}</span>
                          {n.actor_name && <span className="text-[9px] text-gray-600">oleh {n.actor_name}</span>}
                        </div>
                      </div>
                      {!n.is_read && <div className="w-2 h-2 rounded-full bg-[var(--aurora-3)] shrink-0 mt-1" />}
                    </div>
                  );
                })}
              </div>
            )}
            {notifications.length > 0 && (
              <p className="text-[9px] text-gray-600 text-center mt-3">{notifications.length} notifikasi</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
};
