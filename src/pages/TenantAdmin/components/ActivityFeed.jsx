/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, DollarSign, FileText, Users, ShieldCheck, AlertCircle, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';

const ACTION_ICONS = {
  PROCESS_PAYROLL: { icon: <DollarSign size={14} />, color: 'var(--success)' },
  APPROVE_LOAN: { icon: <CheckCircle2 size={14} />, color: 'var(--success)' },
  REJECT_LOAN: { icon: <XCircle size={14} />, color: 'var(--danger)' },
  CREATE_PAYROLL_PERIOD: { icon: <FileText size={14} />, color: 'var(--aurora-3)' },
  PAY_PAYROLL: { icon: <DollarSign size={14} />, color: 'var(--warning)' },
  TENANT_ACTIVATED: { icon: <ShieldCheck size={14} />, color: 'var(--success)' },
  TENANT_DEACTIVATED: { icon: <AlertCircle size={14} />, color: 'var(--danger)' },
  CREATE_TENANT: { icon: <Users size={14} />, color: 'var(--aurora-1)' },
};

const defaultIcon = { icon: <Clock size={14} />, color: 'var(--aurora-3)' };

const formatTime = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}h lalu`;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
};

const ActivityFeed = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchFeed(); }, []);

  const fetchFeed = async () => {
    setLoading(true);
    const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const { data: p } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!p?.tenant_id && !isGod) { setLoading(false); return; }

    let q = supabase.from('audit_logs').select('*, profiles!user_id(email, full_name)');
    if (p?.tenant_id) q = q.eq('tenant_id', p.tenant_id);
    q = q.order('created_at', { ascending: false }).limit(50);
    const { data: logs } = await q;
    if (logs) {
      const mapped = logs.map(l => {
        const safeAction = typeof l.action === 'string' && Object.prototype.hasOwnProperty.call(ACTION_ICONS, l.action) ? l.action : null;
        const cfg = safeAction ? ACTION_ICONS[safeAction] : defaultIcon;
        let details = '';
        if (l.details) {
          try {
            const parsed = typeof l.details === 'string' ? JSON.parse(l.details) : l.details;
            details = parsed.period || parsed.employee || parsed.status || l.details;
          } catch { details = l.details; }
        }
        return {
          id: l.id,
          action: l.action,
          details: details,
          user: l.profiles?.full_name || l.profiles?.email || 'System',
          time: l.created_at,
          icon: cfg.icon,
          color: cfg.color,
        };
      });
      setActivities(mapped);
    }
    setLoading(false);
  };

  const formatAction = (action) => {
    const map = {
      PROCESS_PAYROLL: 'Memproses Payroll',
      APPROVE_LOAN: 'Menyetujui Pinjaman',
      REJECT_LOAN: 'Menolak Pinjaman',
      CREATE_PAYROLL_PERIOD: 'Membuat Periode Payroll',
      PAY_PAYROLL: 'Pembayaran Payroll',
      TENANT_ACTIVATED: 'Mengaktifkan Tenant',
      TENANT_DEACTIVATED: 'Menonaktifkan Tenant',
      CREATE_TENANT: 'Mendaftarkan Tenant Baru',
    };
    const safeAct = typeof action === 'string' && Object.prototype.hasOwnProperty.call(map, action) ? action : null;
    return safeAct ? map[safeAct] : (typeof action === 'string' ? action.replace(/_/g, ' ') : '');
  };

  if (loading) return <div className="p-20 text-center"><Loader2 size={24} className="animate-spin mx-auto text-[var(--aurora-3)]" /></div>;

  return (
    <div className="glass-panel p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-6 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">Aktivitas Terkini</h2>
          <p className="text-sm text-gray-400 mt-1">Riwayat aktivitas payroll, pinjaman, dan pengelolaan</p>
        </div>
        <button onClick={fetchFeed} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-xs font-bold flex items-center gap-2 hover:text-white whitespace-nowrap"><RefreshCw size={14} /> Refresh</button>
      </div>

      <div className="space-y-1">
        {activities.map((act, i) => (
          <motion.div key={act.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
            className="flex items-start gap-4 p-4 rounded-xl hover:bg-white/[0.02] transition-colors group">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${act.color}15`, color: act.color }}>
              {act.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-white">{formatAction(act.action)}</span>
                <span className="text-[9px] text-gray-600">•</span>
                <span className="text-[9px] text-gray-500">{act.user}</span>
              </div>
              {act.details && <p className="text-[10px] text-gray-500 mt-0.5 truncate">{typeof act.details === 'string' ? act.details : JSON.stringify(act.details)}</p>}
            </div>
            <span className="text-[9px] text-gray-600 whitespace-nowrap">{formatTime(act.time)}</span>
          </motion.div>
        ))}
        {!activities.length && <p className="text-center text-gray-500 py-12 text-sm">Belum ada aktivitas tercatat</p>}
      </div>
    </div>
  );
};

export default ActivityFeed;
