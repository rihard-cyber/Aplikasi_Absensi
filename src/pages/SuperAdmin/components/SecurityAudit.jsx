import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, MapPin, Smartphone, Radio, ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSFX } from '../../../utils/useSFX';

const MOCK_LOG_TEMPLATES = [
  { type: 'FAKE_GPS_ATTEMPT', tenants: ['Tenant Alpha', 'Tenant Beta', 'PT. Provices'], users: ['Budi S.', 'Andi W.', 'Sari P.'], severity: 'high' },
  { type: 'DEVICE_MISMATCH', tenants: ['Startup Inc.', 'CV. Maju Jaya'], users: ['Roni K.', 'Dewi L.'], severity: 'medium' },
  { type: 'MASS_DATA_EXPORT', tenants: ['Tenant Beta', 'PT. Solusi'], users: ['Admin X', 'Admin Y'], severity: 'low' },
  { type: 'MULTIPLE_LOGIN_ATTEMPT', tenants: ['Tenant Alpha'], users: ['Hendra P.'], severity: 'high' },
];

const generateLog = () => {
  const t = MOCK_LOG_TEMPLATES[Math.floor(Math.random() * MOCK_LOG_TEMPLATES.length)];
  return {
    id: Date.now() + Math.random(),
    type: t.type,
    tenant: t.tenants[Math.floor(Math.random() * t.tenants.length)],
    user: t.users[Math.floor(Math.random() * t.users.length)],
    time: 'Baru saja',
    severity: t.severity,
    isNew: true,
  };
};

const initialLogs = [
  { id: 1, type: 'FAKE_GPS_ATTEMPT', tenant: 'Tenant Company Beta', user: 'Budi Santoso', time: '2 mnt lalu', severity: 'high', isNew: false },
  { id: 2, type: 'DEVICE_MISMATCH', tenant: 'Tenant Company Alpha', user: 'Andi Setiawan', time: '5 mnt lalu', severity: 'medium', isNew: false },
  { id: 3, type: 'MASS_DATA_EXPORT', tenant: 'Startup Inc.', user: 'Admin CV', time: '10 mnt lalu', severity: 'low', isNew: false },
  { id: 4, type: 'MULTIPLE_LOGIN_ATTEMPT', tenant: 'PT. Provices Project', user: 'Hendra P.', time: '15 mnt lalu', severity: 'high', isNew: false },
  { id: 5, type: 'FAKE_GPS_ATTEMPT', tenant: 'CV. Maju Jaya', user: 'Sari P.', time: '20 mnt lalu', severity: 'medium', isNew: false },
  { id: 6, type: 'DEVICE_MISMATCH', tenant: 'Tenant Beta', user: 'Roni K.', time: '25 mnt lalu', severity: 'low', isNew: false },
];

const SecurityAudit = ({ searchQuery = '' }) => {
  const [logs, setLogs] = useState(initialLogs);
  const [isLive, setIsLive] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const scrollRef = useRef(null);
  const { playClick, playAlert } = useSFX();

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      const newLog = generateLog();
      setLogs(prev => [newLog, ...prev].slice(0, 50));
      playAlert();
    }, 5000);
    return () => clearInterval(interval);
  }, [isLive]);

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
    log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.tenant.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const severityIcon = (type) => {
    if (type === 'FAKE_GPS_ATTEMPT') return <MapPin size={16} />;
    if (type === 'DEVICE_MISMATCH') return <Smartphone size={16} />;
    return <AlertTriangle size={16} />;
  };

  return (
    <div className="flex flex-col gap-3 relative">
      {/* Sticky Header + Live Toggle */}
      <div className="flex items-center justify-between sticky top-0 bg-[#0B0C10]/90 backdrop-blur-md py-2 z-10 border-b border-white/5 mb-1">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-sans">
          {filteredLogs.length} entri
        </p>
        <button
          onClick={() => { setIsLive(v => !v); playClick(); }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase transition-all border ${
            isLive
              ? 'bg-[var(--danger)]/20 text-[var(--danger)] border-[var(--danger)]/50 shadow-[0_0_15px_rgba(255,0,85,0.3)]'
              : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
          }`}
        >
          <Radio size={12} className={isLive ? 'animate-pulse' : ''} />
          {isLive ? 'LIVE' : 'Aktifkan Live'}
        </button>
      </div>

      {/* Scrollable Log List */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar"
      >
        <AnimatePresence initial={false}>
          {filteredLogs.map((log) => (
            <motion.div
              key={log.id}
              layout
              initial={log.isNew ? { opacity: 0, x: -30, boxShadow: '0 0 30px rgba(0,201,255,0.6)' } : { opacity: 1 }}
              animate={{ opacity: 1, x: 0, boxShadow: '0 0 0px rgba(0,201,255,0)' }}
              exit={{ opacity: 0, scale: 0.95, x: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className={`p-3 rounded-xl border flex items-start gap-3 overflow-hidden relative backdrop-blur-md cursor-default select-none ${
                log.severity === 'high'
                  ? 'bg-[var(--danger)]/10 border-[var(--danger)]/40'
                  : log.severity === 'medium'
                    ? 'bg-[var(--warning)]/10 border-[var(--warning)]/30'
                    : 'bg-white/5 border-white/10'
              }`}
            >
              {log.isNew && (
                <div className="absolute inset-0 bg-[var(--aurora-3)]/5 animate-pulse pointer-events-none rounded-xl" />
              )}
              <div className={`p-2 rounded-lg flex-shrink-0 ${
                log.severity === 'high' ? 'bg-[var(--danger)] text-white shadow-[0_0_10px_rgba(255,0,85,0.5)]' :
                log.severity === 'medium' ? 'bg-[var(--warning)] text-gray-900' : 'bg-[#1A1C23] text-gray-400 border border-white/10'
              }`}>
                {severityIcon(log.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <h4 className={`font-bold text-[11px] tracking-wider truncate ${
                    log.severity === 'high' ? 'text-[var(--danger)]' : 'text-gray-200'
                  }`}>
                    {log.type.replace(/_/g, ' ')}
                  </h4>
                  <span className="text-[10px] text-gray-500 whitespace-nowrap">{log.time}</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                  <span className="text-white font-medium">{log.user}</span> @ {log.tenant}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredLogs.length === 0 && (
          <div className="text-center text-gray-500 py-8 text-sm">Tidak ada log yang cocok.</div>
        )}
      </div>

      {/* Back to Top Button */}
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
