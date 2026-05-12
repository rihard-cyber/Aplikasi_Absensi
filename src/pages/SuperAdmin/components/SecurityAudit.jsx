import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, MapPin, Smartphone, Radio, ArrowUp, Shield, Users, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../utils/supabaseClient';
import { useSFX } from '../../../utils/useSFX';

const MOCK_FALLBACK = [
  { id: 'mock-1', type: 'FAKE_GPS_ATTEMPT', tenant: 'Belum ada data', user: 'Sistem', time: '--', severity: 'low', isNew: false },
];

const severityMap = {
  FAKE_GPS_ATTEMPT: 'high',
  DEVICE_MISMATCH: 'medium',
  MASS_DATA_EXPORT: 'low',
  MULTIPLE_LOGIN_ATTEMPT: 'high',
  ACTIVE_TENANT: 'low',
  DEACTIVATE_TENANT: 'high',
  UPLOAD_DOCUMENT: 'low',
  UPDATE_PROFILE: 'low',
  CREATE_USER: 'medium',
  ATTENDANCE_ANOMALY: 'high',
};

const typeIcon = (type) => {
  if (type?.includes('FAKE_GPS') || type?.includes('ANOMALY')) return <MapPin size={16} />;
  if (type?.includes('DEVICE') || type?.includes('LOGIN')) return <Smartphone size={16} />;
  if (type?.includes('DEACTIVATE') || type?.includes('DELETE')) return <Shield size={16} />;
  if (type?.includes('CREATE') || type?.includes('EXPORT')) return <Users size={16} />;
  return <Activity size={16} />;
};

const timeAgo = (ts) => {
  if (!ts) return 'Baru saja';
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 10) return 'Baru saja';
  if (diff < 60) return `${diff} dtk lalu`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hr lalu`;
};

const SecurityAudit = ({ searchQuery = '' }) => {
  const [logs, setLogs] = useState([]);
  const [isLive, setIsLive] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef(null);
  const { playClick, playAlert } = useSFX();

  const fetchRealLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`id, action, details, created_at, user_id, tenant_id`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data && data.length > 0) {
        const { data: tenants } = await supabase.from('tenants').select('id, name');
        const { data: profiles } = await supabase.from('profiles').select('auth_id, full_name');

        const tenantMap = {};
        if (tenants) tenants.forEach(t => tenantMap[t.id] = t.name);
        const profileMap = {};
        if (profiles) profiles.forEach(p => profileMap[p.auth_id] = p.full_name);

        const formatted = data.map((log, i) => ({
          id: log.id,
          type: log.action,
          tenant: tenantMap[log.tenant_id] || 'Global',
          user: profileMap[log.user_id] || 'Sistem',
          time: timeAgo(log.created_at),
          severity: severityMap[log.action] || 'low',
          isNew: i < 3,
        }));
        setLogs(formatted);
      } else {
        setLogs(MOCK_FALLBACK);
      }
    } catch (e) {
      console.warn('Audit fetch error, using fallback:', e.message);
      setLogs(MOCK_FALLBACK);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRealLogs();
  }, [fetchRealLogs]);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      fetchRealLogs();
      playAlert();
    }, 5000);
    return () => clearInterval(interval);
  }, [isLive, fetchRealLogs, playAlert]);

  const handleScroll = () => {
    if (scrollRef.current) {
      setShowBackToTop(scrollRef.current.scrollTop > 100);
    }
  };

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    playClick();
  };

  const filteredLogs = logs.filter(log =>
    searchQuery === '' ||
    log.user?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.tenant?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full gap-4 relative">
      <div className="flex items-center justify-between sticky top-0 bg-[#0B0C10]/95 backdrop-blur-xl py-3 z-[20] border-b border-white/5 mb-3">
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-500 font-black uppercase tracking-[0.25em]">
            {isLoading ? 'MEMUAT...' : `${filteredLogs.length} LOG TERDETEKSI`}
          </span>
        </div>
        <button
          onClick={() => { setIsLive(v => !v); playClick(); }}
          className={`flex items-center gap-3 px-5 py-2 rounded-full text-[9px] font-black tracking-[0.15em] uppercase transition-all border ${
            isLive
              ? 'bg-[var(--danger)] text-white border-[var(--danger)]/50 shadow-[0_0_20px_rgba(255,0,85,0.4)]'
              : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
          }`}
        >
          <Radio size={12} strokeWidth={3} className={isLive ? 'animate-pulse' : ''} />
          {isLive ? 'LIVE MONITORING ACTIVE' : 'AKTIFKAN LIVE'}
        </button>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4 pb-6"
      >
        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="p-5 rounded-[24px] bg-white/[0.02] border border-white/5 flex items-center gap-5 animate-pulse">
                <div className="w-14 h-14 rounded-2xl bg-white/5 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/5 rounded w-1/3" />
                  <div className="h-2 bg-white/5 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filteredLogs.map((log) => (
              <motion.div
                key={log.id}
                layout
                initial={log.isNew ? { opacity: 0, x: -30, boxShadow: '0 0 30px rgba(0,201,255,0.6)' } : { opacity: 1 }}
                animate={{ opacity: 1, x: 0, boxShadow: '0 0 0px rgba(0,201,255,0)' }}
                exit={{ opacity: 0, scale: 0.95, x: 20 }}
                className={`p-5 rounded-[24px] border flex items-center gap-5 overflow-hidden relative backdrop-blur-xl group hover:scale-[1.01] transition-all cursor-default ${
                  log.severity === 'high'
                    ? 'bg-[var(--danger)]/[0.03] border-[var(--danger)]/30 hover:bg-[var(--danger)]/[0.06]'
                    : log.severity === 'medium'
                      ? 'bg-[var(--warning)]/[0.03] border-[var(--warning)]/20 hover:bg-[var(--warning)]/[0.06]'
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                }`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border border-white/5 transition-transform group-hover:scale-110 ${
                  log.severity === 'high' ? 'bg-[var(--danger)] text-white shadow-[0_0_20px_rgba(255,0,85,0.3)]' :
                  log.severity === 'medium' ? 'bg-[var(--warning)] text-gray-900 shadow-[0_0_20px_rgba(255,200,0,0.2)]' : 'bg-[#1A1C23] text-gray-400 border border-white/10'
                }`}>
                  {typeIcon(log.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center gap-4">
                    <h4 className={`font-black text-[10px] uppercase tracking-[0.2em] truncate ${
                      log.severity === 'high' ? 'text-[var(--danger)]' : 'text-gray-200'
                    }`}>
                      {log.type?.replace(/_/g, ' ') || 'UNKNOWN'}
                    </h4>
                    <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest shrink-0 italic">{log.time}</span>
                  </div>
                  <p className="text-[12px] text-gray-400 mt-1.5 truncate leading-relaxed">
                    <span className="text-white/80 font-bold">{log.user}</span> <span className="text-gray-600 px-1">@</span> <span className="text-[var(--aurora-3)]">{log.tenant}</span>
                  </p>
                </div>

                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {!isLoading && filteredLogs.length === 0 && (
          <div className="text-center text-gray-600 py-12 text-[10px] font-black uppercase tracking-[0.3em] border border-dashed border-white/5 rounded-[32px]">
            No threats detected.
          </div>
        )}
      </div>

      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={scrollToTop}
            className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-[var(--aurora-3)]/20 border border-[var(--aurora-3)]/40 flex items-center justify-center text-[var(--aurora-3)] shadow-[0_0_15px_rgba(0,201,255,0.4)] animate-pulse"
          >
            <ArrowUp size={14} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SecurityAudit;
