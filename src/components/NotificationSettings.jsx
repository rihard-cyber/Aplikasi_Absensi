/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, BellOff, BellRing, Check, X, Loader2,
  ShieldCheck, Smartphone, Info, ChevronRight
} from 'lucide-react';
import {
  isPushSupported,
  getPermissionStatus,
  subscribeUser,
  unsubscribeUser,
  isSubscribed,
  showLocalNotification
} from '../utils/pushNotification';
import { useToast } from './Toast';

/**
 * NotificationSettings Component
 * 
 * Displays a card for the user to toggle push notifications on/off.
 * Used inside EmployeeProfile or ProfileEditor.
 * 
 * Props: none
 */
const NotificationSettings = () => {
  const toast = useToast();
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    const init = async () => {
      const s = isPushSupported();
      setSupported(s);
      if (s) {
        setPermission(getPermissionStatus());
        const sub = await isSubscribed();
        setSubscribed(sub);
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleToggle = async () => {
    if (toggling) return;
    setToggling(true);

    if (subscribed) {
      // Unsubscribe
      const result = await unsubscribeUser();
      if (result.success) {
        setSubscribed(false);
        setPermission(getPermissionStatus());
        toast(result.message, 'info');
      } else {
        toast(result.message, 'error');
      }
    } else {
      // Subscribe
      const result = await subscribeUser();
      if (result.success) {
        setSubscribed(true);
        setPermission('granted');
        toast(result.message, 'success');
        // Send a test notification
        setTimeout(() => {
          showLocalNotification('SI PRESENSI', {
            body: '🔔 Notifikasi aktif! Anda akan menerima pemberitahuan absensi, persetujuan izin, dan pengumuman.',
            tag: 'welcome-notification',
          });
        }, 1000);
      } else {
        toast(result.message, 'error');
        setPermission(getPermissionStatus());
      }
    }

    setToggling(false);
  };

  if (loading) {
    return (
      <div className="glass-panel p-5 rounded-3xl flex items-center gap-3">
        <Loader2 size={18} className="animate-spin text-gray-500" />
        <span className="text-xs text-gray-500">Memeriksa dukungan notifikasi...</span>
      </div>
    );
  }

  if (!supported) {
    return (
      <div className="glass-panel p-5 rounded-3xl border border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-500/10 text-gray-500 flex items-center justify-center flex-shrink-0">
            <BellOff size={18} />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Notifikasi Tidak Didukung</p>
            <p className="text-[9px] text-gray-500 mt-0.5">Browser atau perangkat ini belum mendukung push notifications.</p>
          </div>
        </div>
      </div>
    );
  }

  const isBlocked = permission === 'denied';
  const statusColor = subscribed ? 'var(--success)' : isBlocked ? 'var(--danger)' : 'var(--aurora-3)';
  const statusLabel = subscribed ? 'Notifikasi Aktif' : isBlocked ? 'Diblokir Oleh Browser' : 'Notifikasi Nonaktif';
  const StatusIcon = subscribed ? BellRing : isBlocked ? BellOff : Bell;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-3xl overflow-hidden border border-white/5"
    >
      {/* Header */}
      <div className="p-5 flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${statusColor}15`, color: statusColor }}
        >
          <StatusIcon size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-white">Push Notifications</p>
            {subscribed && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: 'var(--success)' }}
              >
                <Check size={10} className="text-black font-black" />
              </motion.div>
            )}
          </div>
          <p className="text-[9px] uppercase font-bold tracking-widest mt-0.5" style={{ color: statusColor }}>
            {statusLabel}
          </p>
        </div>

        {/* Toggle Switch */}
        {!isBlocked && (
          <button
            id="push-notif-toggle"
            onClick={handleToggle}
            disabled={toggling}
            className="relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 focus:outline-none"
            style={{
              background: subscribed ? 'var(--success)' : 'rgba(255,255,255,0.1)',
              border: `1.5px solid ${subscribed ? 'var(--success)' : 'rgba(255,255,255,0.15)'}`,
            }}
            aria-label={subscribed ? 'Nonaktifkan notifikasi' : 'Aktifkan notifikasi'}
          >
            <motion.div
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md flex items-center justify-center"
              animate={{ left: subscribed ? '24px' : '2px' }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              {toggling && <Loader2 size={10} className="animate-spin text-gray-400" />}
            </motion.div>
          </button>
        )}
      </div>

      {/* Blocked warning */}
      <AnimatePresence>
        {isBlocked && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-5 pb-4"
          >
            <div className="bg-[var(--danger)]/5 border border-[var(--danger)]/20 rounded-2xl p-3 flex items-start gap-3">
              <Info size={14} className="text-[var(--danger)] flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-gray-400 leading-relaxed">
                Notifikasi diblokir di level browser. Aktifkan kembali melalui{' '}
                <strong className="text-white">Pengaturan Browser → Izin Situs → Notifikasi</strong>
                {' '}untuk domain ini.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feature list */}
      <div className="px-5 pb-5 space-y-2">
        <p className="text-[9px] text-gray-600 uppercase font-bold tracking-widest mb-2">
          Notifikasi yang akan diterima:
        </p>
        {[
          { icon: <ShieldCheck size={12} />, text: 'Persetujuan / Penolakan Izin & Cuti' },
          { icon: <Smartphone size={12} />, text: 'Pengingat Absensi (Clock-In Reminder)' },
          { icon: <BellRing size={12} />, text: 'Pengumuman Perusahaan Terbaru' },
          { icon: <Check size={12} />, text: 'Status Pembayaran Gaji & Slip Gaji' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div
              className="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: subscribed ? `${statusColor}15` : 'rgba(255,255,255,0.03)',
                color: subscribed ? statusColor : 'rgba(255,255,255,0.2)',
              }}
            >
              {item.icon}
            </div>
            <p className={`text-[10px] ${subscribed ? 'text-gray-300' : 'text-gray-600'} leading-tight`}>
              {item.text}
            </p>
          </div>
        ))}
      </div>

      {/* Action hint when not subscribed */}
      <AnimatePresence>
        {!subscribed && !isBlocked && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleToggle}
            disabled={toggling}
            className="w-full p-4 border-t border-white/5 flex items-center justify-between text-[10px] font-bold text-gray-500 hover:text-[var(--aurora-3)] hover:bg-[var(--aurora-3)]/5 transition-all"
          >
            <span className="flex items-center gap-2">
              <Bell size={12} />
              Aktifkan notifikasi sekarang
            </span>
            <ChevronRight size={12} />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default NotificationSettings;
