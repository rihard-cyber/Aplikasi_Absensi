import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Home, Clock, FileText, User, Fingerprint } from 'lucide-react';

import EmployeeHome from './components/EmployeeHome';
import AttendanceHistory from './components/AttendanceHistory';
import DocumentVault from './components/DocumentVault';
import EmployeeProfile from './components/EmployeeProfile';

// --- Extracted Clock In UI ---
const ClockInTab = () => {
  const [isPressing, setIsPressing] = useState(false);
  const [chargeProgress, setChargeProgress] = useState(0);
  const [clockedIn, setClockedIn] = useState(false);

  useEffect(() => {
    let interval;
    if (isPressing && !clockedIn) {
      interval = setInterval(() => {
        setChargeProgress(prev => {
          if (prev >= 100) {
            setClockedIn(true);
            setIsPressing(false);
            return 100;
          }
          return prev + 2;
        });
      }, 30);
    } else {
      setChargeProgress(0);
    }
    return () => clearInterval(interval);
  }, [isPressing, clockedIn]);

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 w-full max-w-md flex flex-col items-center justify-center relative z-10 pb-20">
      <div className="relative flex items-center justify-center w-64 h-64 mb-10">
        {!clockedIn && (
          <>
            <motion.div
              initial={{ scale: 0.8, opacity: 0.5 }} animate={{ scale: 1.4, opacity: 0 }} transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
              className="absolute inset-0 rounded-full" style={{ border: '1px solid var(--aurora-3)', boxShadow: '0 0 20px var(--aurora-3)' }}
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0.5 }} animate={{ scale: 1.6, opacity: 0 }} transition={{ duration: 2, delay: 1, repeat: Infinity, ease: "easeOut" }}
              className="absolute inset-0 rounded-full" style={{ border: '1px solid var(--aurora-1)', boxShadow: '0 0 20px var(--aurora-1)' }}
            />
          </>
        )}

        <motion.button
          onPointerDown={() => setIsPressing(true)} onPointerUp={() => setIsPressing(false)} onPointerLeave={() => setIsPressing(false)}
          whileTap={{ scale: 0.9, rotateX: 10, rotateY: 10 }}
          className={`w-44 h-44 rounded-full flex flex-col items-center justify-center relative z-20 transition-all duration-300 overflow-hidden ${clockedIn ? 'bg-[var(--success)] shadow-[0_0_50px_rgba(0,255,135,0.6)]' : 'bg-[#1A1C23]'
            }`}
          style={{
            boxShadow: isPressing && !clockedIn ? `0 0 ${20 + chargeProgress}px rgba(142, 45, 226, ${chargeProgress / 100})` : '0 10px 30px rgba(0,0,0,0.8)'
          }}
        >
          {!clockedIn && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[var(--aurora-1)] to-[var(--aurora-3)] opacity-80" style={{ height: `${chargeProgress}%`, transition: 'height 0.1s linear' }} />
          )}

          <div className="relative z-30 flex flex-col items-center">
            <span className={`text-2xl font-bold font-serif tracking-widest ${clockedIn ? 'text-black' : 'text-white'}`}>
              {clockedIn ? 'TERVERIFIKASI' : 'ABSEN MASUK'}
            </span>
            {!clockedIn && (
              <motion.span animate={isPressing ? { x: [-1, 1, -1] } : {}} transition={{ repeat: Infinity, duration: 0.1 }} className="text-xs mt-2 opacity-70 uppercase tracking-widest font-sans">
                {isPressing ? `Memproses ${chargeProgress}%` : 'Tahan untuk verifikasi'}
              </motion.span>
            )}
          </div>
        </motion.button>
      </div>

      <div className="glass-panel w-full p-4 mt-2">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#1A1C23] border border-white/10 relative">
            <MapPin size={18} className="text-[var(--aurora-3)] relative z-10" />
            <motion.div animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 bg-[var(--aurora-3)] rounded-xl blur-sm opacity-20" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm font-sans tracking-wide">Nama Lokasi / Cabang</h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-[var(--success)] shadow-[0_0_8px_var(--success)] animate-pulse" />
              <p className="text-xs text-[var(--success)] font-medium">GPS Locked (Akurasi: 5m)</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
// --- End Extracted Clock In UI ---

const AttendanceScreen = ({ onGodModeReturn, isImpersonating }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [clickCount, setClickCount] = useState(0);

  const handleLogoClick = () => {
    if (!isImpersonating) return;
    setClickCount(prev => prev + 1);
    if (clickCount === 1) {
      onGodModeReturn && onGodModeReturn();
      setClickCount(0);
    }
    setTimeout(() => setClickCount(0), 1000);
  };

  return (
    <div className="min-h-screen pb-24 pt-8 px-5 flex flex-col items-center relative overflow-hidden bg-[var(--bg-darker)]">

      <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
        <div className="absolute top-0 left-0 w-full h-[30%] bg-gradient-to-b from-[var(--aurora-1)]/20 to-transparent"></div>
      </div>

      {/* Floating Header */}
      <div className="w-full max-w-md mb-8 relative z-10">
        <div className="running-lights-border p-[1px] rounded-2xl">
          <div className="glass-panel p-5 text-center bg-[#0B0C10]/80">
            <h2 
              className={`text-2xl font-bold font-serif tracking-wide bg-clip-text text-transparent bg-gradient-to-r ${isImpersonating ? 'from-[var(--danger)] to-[var(--warning)] cursor-pointer' : 'from-[var(--aurora-1)] to-[var(--aurora-3)]'}`}
              onClick={handleLogoClick}
              title={isImpersonating ? "Klik 2x untuk kembali ke God Mode" : ""}
            >
              [Nama Perusahaan] {isImpersonating && <span className="text-xs ml-1 block">(God Mode)</span>}
            </h2>
            <p className="text-xs mt-2 text-gray-400 font-sans tracking-widest uppercase">Portal Karyawan</p>
          </div>
        </div>
      </div>

      {/* Dynamic Tab Content */}
      <div className="w-full max-w-md flex-1 relative z-10 overflow-y-auto hide-scrollbar">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && <EmployeeHome key="home" />}
          {activeTab === 'absensi' && <ClockInTab key="absensi" />}
          {activeTab === 'history' && <AttendanceHistory key="history" />}
          {activeTab === 'docs' && <DocumentVault key="docs" />}
          {activeTab === 'profile' && <EmployeeProfile key="profile" />}
        </AnimatePresence>
      </div>

      {/* Floating Dock Navigation Bar */}
      <div className="fixed bottom-6 w-full px-5 flex justify-center z-50">
        <div className="glass-panel px-6 py-3 flex items-center justify-between w-full max-w-sm rounded-full">
          {[
            { id: 'home', icon: Home },
            { id: 'history', icon: Clock },
            { id: 'absensi', icon: Fingerprint, center: true },
            { id: 'docs', icon: FileText },
            { id: 'profile', icon: User },
          ].map((item) => (
            <motion.button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.9 }}
              className={`relative ${item.center
                  ? 'bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] w-14 h-14 rounded-full flex items-center justify-center text-white shadow-[0_0_15px_rgba(142,45,226,0.5)] -mt-8 border-4 border-[#0B0C10]'
                  : `p-2 rounded-full transition-colors ${activeTab === item.id ? 'text-[var(--aurora-3)]' : 'text-gray-500'}`
                }`}
            >
              <item.icon size={item.center ? 28 : 22} />
              {activeTab === item.id && !item.center && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--aurora-3)] shadow-[0_0_8px_var(--aurora-3)]"
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>

    </div>
  );
};

export default AttendanceScreen;
