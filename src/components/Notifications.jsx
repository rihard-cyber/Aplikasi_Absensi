import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle2, DollarSign, FileText, X, ShieldCheck, AlertTriangle } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

const NotificationContext = createContext(null);
export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles').select('id, tenant_id, role').eq('auth_id', session.user.id).maybeSingle();
      if (!profile) return;

      const results = [];

      if (profile.role === 'TENANT_ADMIN' || profile.role === 'SUPER_ADMIN') {
        const { count: pendingLoans } = await supabase.from('loans').select('*', { count: 'exact', head: true }).eq('tenant_id', profile.tenant_id).eq('status', 'PENDING');
        if (pendingLoans) results.push({ id: 'loans', type: 'approval', icon: <DollarSign size={16} />, message: `${pendingLoans} pengajuan pinjaman menunggu`, time: new Date().toISOString() });

        const { count: pendingReimb } = await supabase.from('reimbursements').select('*', { count: 'exact', head: true }).eq('tenant_id', profile.tenant_id).eq('status', 'PENDING');
        if (pendingReimb) results.push({ id: 'reimb', type: 'approval', icon: <FileText size={16} />, message: `${pendingReimb} klaim reimbursemen menunggu`, time: new Date().toISOString() });

        const { count: draftPeriods } = await supabase.from('payroll_periods').select('*', { count: 'exact', head: true }).eq('tenant_id', profile.tenant_id).eq('status', 'DRAFT');
        if (draftPeriods) results.push({ id: 'payroll-draft', type: 'info', icon: <ShieldCheck size={16} />, message: `${draftPeriods} periode payroll siap diproses`, time: new Date().toISOString() });
      }

      if (profile.role === 'EMPLOYEE' || profile.role === 'SUB_ADMIN' || profile.role === 'SUPER_ADMIN') {
        const { count: empLoans } = await supabase.from('loans').select('*', { count: 'exact', head: true }).eq('user_id', profile.id).eq('status', 'ACTIVE');
        if (empLoans) results.push({ id: 'emp-loans', type: 'info', icon: <DollarSign size={16} />, message: `${empLoans} pinjaman aktif berjalan`, time: new Date().toISOString() });

        const { data: leaveBal } = await supabase.from('leave_balances').select('total_days, used_days').eq('user_id', profile.id).eq('year', new Date().getFullYear()).maybeSingle();
        if (leaveBal) {
          const remaining = leaveBal.total_days - leaveBal.used_days;
          if (remaining <= 3) results.push({ id: 'leave-low', type: 'warning', icon: <AlertTriangle size={16} />, message: `Sisa cuti ${remaining} hari — segera gunakan!`, time: new Date().toISOString() });
        }
      }

      setNotifications(results);
      setUnreadCount(results.length);
    } catch (e) { console.warn('Notif fetch error', e); }
  }, []);

  useEffect(() => { fetchNotifications(); const interval = setInterval(fetchNotifications, 30000); return () => clearInterval(interval); }, [fetchNotifications]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, showPanel, setShowPanel, refresh: fetchNotifications }}>
      {children}

      <div className="fixed top-4 right-16 z-[9999]">
        <button onClick={() => setShowPanel(!showPanel)} className="relative w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all backdrop-blur-md">
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--danger)] text-white text-[8px] font-bold flex items-center justify-center shadow-lg">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>
      </div>

      <AnimatePresence>
        {showPanel && (
          <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-16 right-4 w-80 z-[9999] glass-panel p-4 border border-white/10 shadow-2xl max-h-[60vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white">Notifikasi</h3>
              <button onClick={() => setShowPanel(false)} className="text-gray-500 hover:text-white"><X size={16} /></button>
            </div>
            {notifications.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-8">Tidak ada notifikasi</p>
            ) : (
              <div className="space-y-2">
                {notifications.map(n => (
                  <div key={n.id} className={`p-3 rounded-xl border text-xs flex items-start gap-3 ${n.type === 'warning' ? 'bg-[var(--warning)]/10 border-[var(--warning)]/20' : n.type === 'approval' ? 'bg-[var(--aurora-1)]/10 border-[var(--aurora-1)]/20' : 'bg-white/5 border-white/10'}`}>
                    <span className={`mt-0.5 ${n.type === 'warning' ? 'text-[var(--warning)]' : n.type === 'approval' ? 'text-[var(--aurora-3)]' : 'text-gray-400'}`}>{n.icon}</span>
                    <p className={`flex-1 leading-relaxed ${n.type === 'warning' ? 'text-[var(--warning)]' : 'text-gray-300'}`}>{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
};
