/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Home, Clock, FileText, User, Fingerprint, CheckCircle2, ShieldAlert, Megaphone, Building2, Zap, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '../../components/ConfirmDialog';
import { Geolocation } from '@capacitor/geolocation';
import { App } from '@capacitor/app';

import EmployeeHome from './components/EmployeeHome';
import AttendanceHistory from './components/AttendanceHistory';
import DocumentVault from './components/DocumentVault';
import EmployeeProfile from './components/EmployeeProfile';
import LeaveRequest from './components/LeaveRequest';
import LoanRequest from './components/LoanRequest';
import ReimbursementRequest from './components/ReimbursementRequest';
import PayslipView from './components/PayslipView';
import QRScanner from './components/QRScanner';
import ProfileEditor from './components/ProfileEditor';
import BannerCarousel from './components/BannerCarousel';
import OvertimeRequest from './components/OvertimeRequest';
import HelpdeskRequest from './components/HelpdeskRequest';
import BookingRequest from './components/BookingRequest';
import PatrolScan from './components/PatrolScan';
import HomeAddressRegistration from './components/HomeAddressRegistration';
import DailyTaskPlan from './components/DailyTaskPlan';
import ShiftSwapRequest from './components/ShiftSwapRequest';
import HRChatbot from '../TenantAdmin/components/HRChatbot';
import IncidentReporting from '../TenantAdmin/components/IncidentReporting';
import AttendanceCalendar from './components/AttendanceCalendar';
import { supabase } from '../../utils/supabaseClient';
import { analyzePosition, logFakeGpsAttempt } from '../../utils/antiFakeGps';
import { enqueueAttendance, registerOnlineSyncListener, getQueueCount } from '../../utils/offlineSync';
import { showLocalNotification } from '../../utils/pushNotification';
import { useToast } from '../../components/Toast';
import { verifyFace } from '../../utils/faceVerification';
import { checkWifiGeofence } from '../../utils/wifiGeofence';

  // --- Extracted Clock In UI ---
const ClockInTab = () => {
  const toast = useToast();
  const [isPressing, setIsPressing] = useState(false);
  const [chargeProgress, setChargeProgress] = useState(0);
  const [status, setStatus] = useState('IDLE'); // IDLE, SCANNING, VERIFIED, FAILED
  const [isClockOut, setIsClockOut] = useState(false);
  const [fraudBlocked, setFraudBlocked] = useState(false);
  const [workMode, setWorkMode] = useState('WFO');
  const [workModeLabel, setWorkModeLabel] = useState('');

  // --- Geofencing & Location State ---
  const [locationState, setLocationState] = useState('CHECKING');
  const [distance, setDistance] = useState(null);
  const [officeCoords, setOfficeCoords] = useState({ latitude: -6.200000, longitude: 106.816666, radius: 50, name: 'Mencari Lokasi...' });
  const [projectCode, setProjectCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const isGodMode = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();

  // --- Camera State ---
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraError, setCameraError] = useState('');

  // Fetch project by code
  const lookupProjectByCode = async (code) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
      const tid = profile?.tenant_id;
      if (!tid && !isGodMode) return;
      let q = supabase.from('projects').select('*').eq('code', code.toUpperCase());
      if (tid) q = q.eq('tenant_id', tid);
      const { data: project } = await q.maybeSingle();
      if (project) {
        setOfficeCoords({ latitude: project.latitude, longitude: project.longitude, radius: project.radius || 50, name: project.name });
        setProjectCode(code.toUpperCase());
        setShowCodeInput(false);
        checkLocation();
      } else {
        toast(`Kode "${code}" tidak ditemukan.`, 'error');
      }
    } catch (e) {
      console.error("Lookup project error:", e);
    }
  };

  // LIVE FETCH: Project Location Radius
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data: profile } = await supabase.from('profiles').select('project_id').eq('auth_id', session.user.id).maybeSingle();
        if (profile?.project_id) {
          const { data: loc } = await supabase.from('projects').select('*').eq('id', profile.project_id).maybeSingle();
          if (loc) {
            setOfficeCoords({ latitude: loc.latitude, longitude: loc.longitude, radius: loc.radius || 50, name: loc.name });
          }
        } else {
          const { data: profileFallback } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
          if (profileFallback?.tenant_id) {
            const { data: firstProject } = await supabase.from('projects').select('*').eq('tenant_id', profileFallback.tenant_id).limit(1).maybeSingle();
            if (firstProject) {
              setOfficeCoords({ latitude: firstProject.latitude, longitude: firstProject.longitude, radius: firstProject.radius || 50, name: firstProject.name });
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch location data");
      }
    };
    fetchLocation();
  }, []);

  // Hybrid Work: Fetch mode + home address
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data: profile } = await supabase.from('profiles').select('id').eq('auth_id', session.user.id).maybeSingle();
        if (!profile?.id) return;
        const today = new Date().toISOString().split('T')[0];
        const { data: schedule } = await supabase.from('user_schedules')
          .select('work_mode').eq('user_id', profile.id).eq('date', today).maybeSingle();
        const mode = schedule?.work_mode || 'WFO';
        setWorkMode(mode);
        const labels = { WFO: 'Kerja di Kantor', WFH: 'Kerja dari Rumah', WFA: 'Kerja di Mana Saja' };
        setWorkModeLabel(labels[mode] || '');

        if (mode === 'WFH') {
          const { data: home } = await supabase.from('employee_home_addresses')
            .select('latitude, longitude, radius_meters, address')
            .eq('profile_id', profile.id).eq('is_verified', true).maybeSingle();
          if (home) {
            setOfficeCoords({ latitude: home.latitude, longitude: home.longitude, radius: home.radius_meters || 50, name: '🏠 ' + (home.address || 'Rumah') });
          }
        }
      } catch (e) { console.warn('Work mode fetch error:', e); }
    })();
  }, []);

  // Initialize Camera
  useEffect(() => {
    let stream = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn("Camera access denied or unavailable", err);
        setCameraError('Kamera tidak dapat diakses. Pastikan izin kamera sudah diberikan di Pengaturan HP.');
      }
    };
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Trigger location check after workMode is known
  useEffect(() => {
    if (workMode) checkLocation();
  }, [workMode]);

  // Formula Haversine: Kalkulasi Akurat Jarak GPS
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Radius bumi (meter)
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const checkLocation = async () => {
    // WFA: skip location check entirely
    if (workMode === 'WFA') {
      setLocationState('IN_RANGE');
      setDistance(0);
      return;
    }
    setLocationState('CHECKING');
    try {
      if (sessionStorage.getItem('super_admin_verified') === 'true') {
        setDistance(0);
        setLocationState('IN_RANGE');
        return;
      }

      // Capacitor Geolocation dengan Akurasi Tinggi
      if (!Geolocation) throw new Error("Geolocation plugin not available");
      
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });

      // Anti-Fake GPS: Analisis multi-level
      const gpsAnalysis = analyzePosition(position);
      if (gpsAnalysis.isMocked) {
        toast(`⚠️ ${gpsAnalysis.reason} - Absensi ditolak.`, 'error');
        setLocationState('ERROR');
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: profile } = await supabase.from('profiles')
              .select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
            await logFakeGpsAttempt(session.user.id, profile?.tenant_id, {
              reason: gpsAnalysis.reason,
              coords: position.coords,
              flags: gpsAnalysis.flags,
              riskScore: gpsAnalysis.riskScore
            });
          }
        } catch {}
        return;
      }

      const { latitude, longitude, accuracy } = position.coords;
      const dist = calculateDistance(latitude, longitude, officeCoords.latitude, officeCoords.longitude);

      setDistance(Math.round(dist));
      if (dist <= officeCoords.radius) {
        setLocationState('IN_RANGE');
      } else {
        setLocationState('OUT_OF_RANGE');
      }
    } catch (error) {
      console.warn("Geolocation Error:", error);
      setLocationState('ERROR');
      if (error.message?.includes('permission')) {
        toast('Mohon aktifkan izin lokasi di browser Anda agar bisa melakukan presensi.', 'error');
      }
    }
  };

  useEffect(() => {
    checkLocation();

    // Robust Offline Sync via offlineSync utility
    const cleanup = registerOnlineSyncListener(toast);
    return cleanup;
  }, []);

  useEffect(() => {
    let interval;
    if (isPressing && status !== 'VERIFIED') {
      setStatus('SCANNING');
      interval = setInterval(() => {
        setChargeProgress(prev => {
          if (prev >= 100) {
            if (locationState === 'OUT_OF_RANGE' && !isGodMode) {
              setStatus('FAILED');
              setFraudBlocked(true);
              if (window.navigator?.vibrate) window.navigator.vibrate([300]);
              setTimeout(() => { setStatus('IDLE'); setFraudBlocked(false); }, 3000);
              setIsPressing(false);
              return 100;
            }
            runVerificationSequence();
            setIsPressing(false);
            return 100;
          }
          return prev + 2;
        });
      }, 40);
    } else if (!isPressing && status === 'SCANNING') {
      setStatus('IDLE');
      setChargeProgress(0);
    }
    return () => clearInterval(interval);
  }, [isPressing, status]);

  const runVerificationSequence = async () => {
    try {
      // WFO: check wifi geofence (soft warning, not blocking)
      if (workMode === 'WFO') {
        const wifiResult = await checkWifiGeofence();
        if (!wifiResult.allowed && wifiResult.method !== 'NO_ZONES_CONFIGURED') {
          toast(wifiResult.message, 'warning');
        }
      }

      // Face verification for all modes (liveness check)
      let faceResult = { verified: true, confidence: 100, snapshot: null, message: '' };
      if (videoRef.current?.srcObject) {
        faceResult = await verifyFace(videoRef.current);
        if (!faceResult.verified && workMode !== 'WFO') {
          toast(faceResult.message, 'error');
          setStatus('FAILED');
          setTimeout(() => setStatus('IDLE'), 3000);
          return;
        }
        if (faceResult.confidence < 55) {
          toast(`Verifikasi wajah: ${faceResult.message}`, workMode === 'WFO' ? 'warning' : 'error');
          if (workMode !== 'WFO') {
            setStatus('FAILED');
            setTimeout(() => setStatus('IDLE'), 3000);
            return;
          }
        }
      }

      setStatus('VERIFIED');
      await saveAttendanceLog(faceResult.snapshot);
      if (window.navigator?.vibrate) window.navigator.vibrate([100, 50, 100]);
    } catch (err) {
      console.error('Verification error:', err);
      toast('Gagal verifikasi: ' + err.message, 'error');
      setStatus('FAILED');
      setTimeout(() => setStatus('IDLE'), 3000);
    }
  };

  const saveAttendanceLog = async (faceSnapshot = null) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles').select('id, tenant_id').eq('auth_id', session.user.id).maybeSingle();

      // Capture Photo (use face snapshot if available, else capture fresh frame)
      let capturedPhoto = null;
      const blobToUpload = faceSnapshot;
      if (!blobToUpload && videoRef.current && canvasRef.current && videoRef.current.srcObject) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 480;
        canvas.height = video.videoHeight || 640;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.75));
        if (blob) {
          if (navigator.onLine) {
            const filePath = `${session.user.id}/attendance_${Date.now()}.jpg`;
            const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, blob, {
              contentType: 'image/jpeg',
              upsert: false
            });
            if (!uploadError) {
              capturedPhoto = supabase.storage.from('documents').getPublicUrl(filePath).data.publicUrl;
            }
          }
        }
      } else if (blobToUpload && navigator.onLine) {
        const filePath = `${session.user.id}/attendance_${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, blobToUpload, {
          contentType: 'image/jpeg',
          upsert: false
        });
        if (!uploadError) {
          capturedPhoto = supabase.storage.from('documents').getPublicUrl(filePath).data.publicUrl;
        }
      }

      const verificationMethod = workMode === 'WFA' ? 'selfie' : workMode === 'WFH' ? 'gps_home' : 'gps';
      const logData = {
        user_id: profile?.id,
        tenant_id: profile?.tenant_id,
        action: isClockOut ? 'CLOCK_OUT' : 'CLOCK_IN',
        distance_meters: distance,
        status: locationState === 'IN_RANGE' || isGodMode ? 'ONTIME' : 'OUT_OF_RANGE',
        photo_url: capturedPhoto,
        timestamp: new Date().toISOString(),
        work_mode: workMode,
        verification_method: verificationMethod,
      };

      if (!navigator.onLine) {
        enqueueAttendance(logData);
        const qCount = getQueueCount();
        toast(`Internet terputus. Data disimpan (${qCount} antrian) & dikirim saat online.`, 'info');
      } else {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            logData.user_id = profile.id;
            await supabase.from('attendance_logs').insert([logData]);
            // Push notification konfirmasi absensi
            const now = new Date();
            const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            showLocalNotification('SI PRESENSI — Absensi Tercatat ✅', {
              body: `${isClockOut ? 'Absen Keluar' : 'Absen Masuk'} berhasil dicatat pukul ${timeStr}`,
              tag: `attendance-${logData.action}-${Date.now()}`,
              data: { url: '/attendance' },
            });
          }
        } catch (e) {
          console.error("Save error", e);
        }
      }
    } catch (e) {
      console.error("Save error", e);
    }
  };

  const handleReset = () => {
    if (status === 'VERIFIED') {
      setIsClockOut(!isClockOut);
      setStatus('IDLE');
      setChargeProgress(0);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 w-full max-w-md flex flex-col items-center justify-center relative z-10 pb-20">

      {/* Face ID Scanner Container */}
      <div className="relative flex items-center justify-center w-full max-w-[288px] aspect-square mb-10">

        {/* Pulsing Outer Rings */}
        {status === 'SCANNING' && (
          <div className="absolute inset-0">
            <motion.div initial={{ scale: 0.8, opacity: 0.5 }} animate={{ scale: 1.4, opacity: 0 }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute inset-0 rounded-full border border-[var(--aurora-3)]" />
            <motion.div initial={{ scale: 0.8, opacity: 0.5 }} animate={{ scale: 1.6, opacity: 0 }} transition={{ duration: 1.5, delay: 0.5, repeat: Infinity }} className="absolute inset-0 rounded-full border border-[var(--aurora-1)]" />
          </div>
        )}

        {/* Camera/Scanner Mask */}
        <div className="w-44 h-44 sm:w-56 sm:h-56 rounded-full border-4 border-white/5 bg-[#1A1C23] relative overflow-hidden flex items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.5)]">

          {/* Real Camera Feed */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${status === 'SCANNING' ? 'scale-110 opacity-60 blur-[1px]' : 'opacity-100'}`}
          />
          {/* Overlay gradient so text is readable */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 opacity-60" />
          
          <canvas ref={canvasRef} className="hidden" />

          {/* Camera Error Message */}
          {cameraError && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[var(--danger)]/20 flex items-center justify-center mb-3">
                <span className="text-2xl">📷</span>
              </div>
              <p className="text-[11px] text-gray-300 leading-relaxed">{cameraError}</p>
            </div>
          )}

          {/* Scanning Laser Line */}
          {status === 'SCANNING' && (
            <motion.div
              initial={{ top: '-10%' }} animate={{ top: '110%' }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--aurora-3)] to-transparent shadow-[0_0_15px_var(--aurora-3)] z-30"
            />
          )}

          {/* Verification Progress Overlay */}
          {status === 'SCANNING' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-[var(--aurora-3)]/10 backdrop-blur-[2px]">
                <p className="text-[10px] font-bold text-[var(--aurora-3)] uppercase tracking-[0.3em] mb-2">Merekam Bukti...</p>
              <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div className="h-full bg-[var(--aurora-3)]" style={{ width: `${chargeProgress}%` }} />
              </div>
            </div>
          )}

          {/* Success / Failure Overlays */}
          <AnimatePresence>
            {status === 'VERIFIED' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-[var(--success)]/20 backdrop-blur-md flex flex-col items-center justify-center z-50">
                <CheckCircle2 size={48} className="text-[var(--success)] drop-shadow-[0_0_10px_var(--success)]" />
                <p className="text-[10px] font-black text-[var(--success)] uppercase tracking-widest mt-2">Bukti Terekam</p>
              </motion.div>
            )}
            {status === 'FAILED' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-[var(--danger)]/20 backdrop-blur-md flex flex-col items-center justify-center z-50 text-center p-4">
                <ShieldAlert size={48} className="text-[var(--danger)]" />
                <p className="text-[10px] font-black text-[var(--danger)] uppercase tracking-widest mt-2">Lokasi Tidak Valid</p>
                <p className="text-[8px] text-white/60 mt-1 uppercase">Absensi diblokir oleh validasi lokasi</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Main Interaction Button (Floating above scanner) */}
        <motion.button
          onPointerDown={() => status === 'IDLE' && (locationState === 'IN_RANGE' || isGodMode) && setIsPressing(true)}
          onPointerUp={() => setIsPressing(false)}
          onPointerLeave={() => setIsPressing(false)}
          onClick={handleReset}
          whileTap={{ scale: 0.95 }}
          className={`absolute z-50 w-36 h-36 sm:w-44 sm:h-44 rounded-full flex flex-col items-center justify-center transition-all duration-500 border-4 ${status === 'VERIFIED' ? 'bg-[var(--success)] border-white/20 shadow-[0_0_60px_rgba(0,255,135,0.4)]' :
            status === 'FAILED' ? 'bg-[var(--danger)] border-white/20' :
              locationState === 'OUT_OF_RANGE' && !isGodMode ? 'bg-[var(--danger)]/20 backdrop-blur-md border-[var(--danger)]/30 cursor-not-allowed' :
                'bg-black/40 backdrop-blur-md border-white/10'
            }`}
        >
          <div className="relative flex flex-col items-center">
            {status === 'VERIFIED' ? (
              <span className="text-black font-black text-xl tracking-tighter">SUCCESS</span>
            ) : (
              <>
                <Fingerprint size={24} className={`mb-1 sm:mb-2 transition-colors ${isPressing ? 'text-[var(--aurora-3)]' : 'text-white/40'}`} />
                <span className="text-[11px] sm:text-sm font-bold font-serif tracking-widest text-white leading-tight text-center px-1 sm:px-2">
                  {locationState === 'CHECKING' ? 'MENCARI LOKASI...' : locationState === 'OUT_OF_RANGE' && !isGodMode ? `DILUAR RADIUS (${distance}m)` : isClockOut ? 'ABSEN KELUAR' : 'ABSEN MASUK'}
                </span>
                <span className="text-[7px] sm:text-[8px] mt-1 sm:mt-2 text-gray-500 uppercase tracking-widest font-bold text-center px-2 sm:px-4">
                  {isPressing ? 'TAHAN SEBENTAR' : 'TAP & HOLD ABSEN'}
                </span>
              </>
            )}
          </div>
        </motion.button>
      </div>

      {/* Location Details */}
      <div className="glass-panel w-full p-5 mt-2 border border-white/5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--aurora-3)]/5 rounded-full blur-2xl group-hover:bg-[var(--aurora-3)]/10 transition-all" />
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 relative">
            <MapPin size={22} className="text-[var(--aurora-3)]" />
            <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 bg-[var(--aurora-3)] rounded-2xl" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-sm tracking-wide text-white truncate">{locationState === 'CHECKING' ? 'Mencari Satelit GPS...' : `${officeCoords.name} • Jarak: ${distance !== null ? distance + 'm' : '...'}`}</h3>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full shadow-[0_0_10px_currentColor] animate-pulse ${locationState === 'IN_RANGE' || isGodMode ? 'bg-[var(--success)] text-[var(--success)]' : 'bg-[var(--danger)] text-[var(--danger)]'}`} />
              <p className={`text-[10px] font-black uppercase tracking-widest ${locationState === 'IN_RANGE' || isGodMode ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>{locationState === 'IN_RANGE' ? 'Dalam Radius Aman' : isGodMode ? 'SUPER ADMIN PREVIEW' : 'Di Luar Radius Aman'}</p>
            </div>
          </div>
          {workMode !== 'WFO' && (
            <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${
              workMode === 'WFH' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              {workMode === 'WFH' ? 'WFH' : 'WFA'}
            </div>
          )}
        </div>

        {/* Project Code Selector */}
        <div className="w-full mt-3 flex items-center gap-2">
          {showCodeInput ? (
            <div className="flex-1 flex gap-2">
              <input type="text" maxLength={6} autoFocus
                placeholder="Masukkan kode project..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') lookupProjectByCode(e.target.value);
                  if (e.key === 'Escape') setShowCodeInput(false);
                }}
                className="flex-1 bg-[#0B0C10] border border-[var(--aurora-3)]/30 rounded-xl px-4 py-2.5 text-white text-xs outline-none focus:border-[var(--aurora-3)] uppercase tracking-widest font-mono placeholder:text-gray-700"
              />
              <button onClick={() => setShowCodeInput(false)}
                className="px-3 py-2 bg-white/5 rounded-xl text-gray-500 hover:text-white text-[10px] font-bold">Batal</button>
            </div>
          ) : (
            <button onClick={() => setShowCodeInput(true)}
              className="glass-panel w-full py-2.5 rounded-xl border border-dashed border-white/10 text-[10px] font-bold tracking-widest text-gray-500 hover:text-[var(--aurora-3)] hover:border-[var(--aurora-3)]/30 transition-all flex items-center justify-center gap-2">
              <MapPin size={12} />
              {projectCode ? `📍 ${officeCoords.name} (${projectCode}) — Ketuk untuk ganti` : '📍 Ketuk untuk pilih lokasi absen'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
// --- End Extracted Clock In UI ---

const AttendanceScreen = ({ onGodModeReturn, isImpersonating, onCycleRole }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('home');
  const [activeSubView, setActiveSubView] = useState(null); // 'leave', etc.
  const [clickCount, setClickCount] = useState(0);
  const [tenantName, setTenantName] = useState('Memuat...');
  const [structureName, setStructureName] = useState('PORTAL KARYAWAN');
  const [announcements, setAnnouncements] = useState([]);
  const [todayShift, setTodayShift] = useState(null); // null = follow Pengaturan Umum
  
  // NEW DYNAMIC STATES
  const confirm = useConfirm();
  const [userData, setUserData] = useState({ full_name: 'User', position: 'Staff', division: 'Division' });
  const [stats, setStats] = useState({ weeklyHours: 0, leaveBalance: 12 });
  const [companyInfo, setCompanyInfo] = useState({ 
    workHours: '08:00 - 17:00', 
    workDays: 'Senin - Jumat', 
    gracePeriod: '15 Menit',
    tenantName: 'PT. PERUSAHAAN',
    logo_url: null,
    banners: []
  });

  const isGodMode = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
  const userRole = (() => { try { return localStorage.getItem('user_role'); } catch { return null; } })();
  const isAdminUser = userRole === 'TENANT_ADMIN' || userRole === 'SUB_ADMIN';

  // --- SMART NAVIGATION (ANTI-EXIT) ---
  useEffect(() => {
    let backPressCount = 0;
    let backPressTimer;

    const backButtonListener = App.addListener('backButton', ({ canGoBack }) => {
      if (activeTab !== 'home' || activeSubView !== null) {
        setActiveTab('home');
        setActiveSubView(null);
      } else {
        backPressCount++;
        if (backPressCount >= 3) {
          (async () => {
            const shouldExit = await confirm('Apakah Anda yakin ingin keluar dari aplikasi SI Presensi?', 'Keluar');
            if (shouldExit) {
              App.exitApp();
            }
          })();
          backPressCount = 0;
        } else {
          if (window.navigator?.vibrate) window.navigator.vibrate([100, 50, 100]);
          clearTimeout(backPressTimer);
          backPressTimer = setTimeout(() => { backPressCount = 0; }, 2000);
        }
      }
    });

    return () => backButtonListener.then(listener => listener.remove());
  }, [activeTab, activeSubView]);

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data: profile } = await supabase.from('profiles')
          .select('tenant_id, project_id, division_id, tenants(name, logo_url), projects(name), divisions(name)')
          .eq('auth_id', session.user.id).maybeSingle();
        
        if (profile) {
          let tName = profile.tenants?.name;
          let tLogo = profile.tenants?.logo_url;

          // Fallback if join fails (RLS or Schema) or if SUPER ADMIN PREVIEW with no tenant_id
          if (!tName && (profile.tenant_id || isGodMode)) {
            let tQuery = supabase.from('tenants').select('name, logo_url');
            if (profile.tenant_id) tQuery = tQuery.eq('id', profile.tenant_id);
            else tQuery = tQuery.order('created_at').limit(1);
            
            const { data: tData } = await tQuery.maybeSingle();
            if (tData) {
              tName = tData.name;
              tLogo = tData.logo_url;
            }
          }

          tName = tName || 'PT. PERUSAHAAN CONTOH';
          const pName = profile.projects?.name || 'GLOBAL';
          const dName = profile.divisions?.name || 'ALL DIVISION';
          
          setTenantName(tName);
          setStructureName(`${pName} - ${dName}`);

          // Fetch Full Profile for Greeting
          const { data: fullProfile } = await supabase.from('profiles').select('*').eq('auth_id', session.user.id).maybeSingle();
          if (fullProfile) {
            setUserData({
              full_name: fullProfile.full_name || 'Karyawan',
              position: fullProfile.position || (fullProfile.role === 'SUB_ADMIN' ? 'Supervisor' : 'Staff'),
              division: dName
            });
            // stats.leaveBalance fallback
            setStats(prev => ({ ...prev, leaveBalance: fullProfile.leave_balance || 12 }));
          }

          // Fetch Weekly Working Hours (Last 7 Days) — user_id = profiles.id
          const startOfWeek = new Date();
          startOfWeek.setDate(startOfWeek.getDate() - 7);
          const { data: weeklyLogs } = await supabase
            .from('attendance_logs')
            .select('*')
            .eq('user_id', fullProfile?.id || profile?.id)
            .gte('timestamp', startOfWeek.toISOString());
          
          if (weeklyLogs) {
            const sortedLogs = [...weeklyLogs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            let totalMinutes = 0;
            let lastIn = null;
            sortedLogs.forEach(log => {
              if (log.action === 'CLOCK_IN') lastIn = new Date(log.timestamp);
              else if (log.action === 'CLOCK_OUT' && lastIn) {
                totalMinutes += (new Date(log.timestamp) - lastIn) / 60000;
                lastIn = null;
              }
            });
            setStats(prev => ({ ...prev, weeklyHours: Math.round(totalMinutes / 60) }));
          }

          // Fetch Company Settings
          const tid = profile.tenant_id;
          let tSettingsQuery = supabase.from('tenant_settings').select('*');
          if (tid) {
            tSettingsQuery = tSettingsQuery.eq('tenant_id', tid);
          } else if (isGodMode) {
            // SUPER ADMIN PREVIEW: pick any tenant that has settings
            tSettingsQuery = tSettingsQuery.order('created_at').limit(1);
          }
          
          const { data: tSettings } = await (tid || isGodMode ? tSettingsQuery.maybeSingle() : Promise.resolve({ data: null }));
          
          if (tSettings) {
            setCompanyInfo({
              tenantId: tid || tSettings.tenant_id,
              tenantName: tName,
              logo_url: tLogo,
              workHours: `${tSettings.check_in_time?.substring(0, 5) || '08:00'} - ${tSettings.check_out_time?.substring(0, 5) || '17:00'}`,
              workDays: tSettings.work_days?.join(', ') || 'Senin - Jumat',
              gracePeriod: `${tSettings.grace_period_minutes || 0} Menit`,
              banners: tSettings.banners || []
            });
          } else {
            setCompanyInfo(prev => ({ ...prev, tenantId: tid, tenantName: tName, logo_url: tLogo, banners: [] }));
          }

          // Fetch Announcements
          const { data: aData } = await supabase.from('announcements')
            .select('*')
            .eq('is_active', true)
            .eq('tenant_id', profile.tenant_id)
            .or(`project_id.is.null,project_id.eq.${profile.project_id || '00000000-0000-0000-0000-000000000000'}`)
            .order('created_at', { ascending: false });
          
          if (aData) setAnnouncements(aData);

          // Fetch today's shift (user_id = profiles.id, BUKAN auth.users.id)
          const today = new Date().toISOString().split('T')[0];
          const { data: scheduleData } = await supabase
            .from('user_schedules')
            .select('*, master_shifts(shift_code, shift_name, time_in, time_out, is_cross_day)')
            .eq('user_id', profile.id)
            .eq('date', today)
            .maybeSingle();

          if (scheduleData?.master_shifts) {
            setTodayShift(scheduleData.master_shifts);
          }
        }
      } catch (e) {
        console.error("Failed to fetch tenant/project info", e);
      }
    };
    fetchTenant();
  }, []);

  const handleLogoClick = () => {
    if (!isGodMode && !isImpersonating) return;
    setClickCount(prev => prev + 1);

    // Haptic Feedback for Luxury Feel
    if (window.navigator?.vibrate) window.navigator.vibrate(50);

    if (clickCount === 1) {
      if (onCycleRole && isGodMode) {
        onCycleRole();
      } else if (onGodModeReturn) {
        onGodModeReturn();
      }
      setClickCount(0);
    }
    setTimeout(() => setClickCount(0), 1000);
  };

  return (
    <div className="min-h-screen pb-24 pt-8 px-0 flex flex-col items-center relative overflow-hidden bg-[var(--bg-darker)]">

      <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
        <div className="absolute top-0 left-0 w-full h-[30%] bg-gradient-to-b from-[var(--aurora-1)]/20 to-transparent"></div>
      </div>

      {/* SUPER ADMIN PREVIEW OVERLAY */}
      {isGodMode && (
        <motion.div initial={{ y: -50 }} animate={{ y: 0 }} className="fixed top-4 right-4 z-50 bg-[var(--danger)]/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-[var(--danger)] text-white text-[10px] font-black tracking-widest flex items-center gap-2 shadow-[0_0_15px_rgba(255,0,85,0.5)] safe-top">
          <ShieldAlert size={12} /> SUPER ADMIN PREVIEW ACTIVE
        </motion.div>
      )}

      {/* Announcements Marquee */}
      {announcements.length > 0 && (
        <div className="w-full mx-4 mb-4 bg-[var(--aurora-1)]/10 border border-[var(--aurora-1)]/30 rounded-xl overflow-hidden relative z-10 flex items-center px-3 py-2">
          <Megaphone size={14} className="text-[var(--aurora-1)] flex-shrink-0 mr-3 animate-pulse" />
          <div className="flex-1 overflow-hidden relative">
            <div className="whitespace-nowrap animate-marquee inline-block text-xs text-[var(--aurora-1)] font-bold tracking-wide">
              {announcements.map((a, i) => (
                <span key={a.id} className="mr-8">📢 {a.title}: {a.message}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Banner Carousel Header */}
      <BannerCarousel
        tenantName={tenantName}
        structureName={structureName}
        isGodMode={isGodMode}
        isImpersonating={isImpersonating}
        todayShift={todayShift}
        onCycleRole={onCycleRole}
        onGodModeReturn={onGodModeReturn}
        companyInfo={companyInfo}
        bannersList={companyInfo.banners}
        tenantId={companyInfo.tenantId}
      />

      {/* Admin Back to Dashboard */}
      {isAdminUser && !isGodMode && !isImpersonating && (
        <div className="w-full max-w-md mb-4 relative z-10 flex justify-center">
          <button onClick={() => navigate(userRole === 'TENANT_ADMIN' ? '/tenantadmin' : '/subadmin')}
            className="glass-panel px-5 py-2 rounded-full border border-[var(--aurora-3)]/20 text-[10px] font-bold uppercase tracking-widest text-[var(--aurora-3)] hover:bg-[var(--aurora-3)]/10 transition-all flex items-center gap-2">
            <Building2 size={14} /> Dashboard Admin
          </button>
        </div>
      )}

      {/* Dynamic Tab Content */}
      <div className="w-full flex-1 relative z-10 overflow-y-auto hide-scrollbar px-4">
        <AnimatePresence mode="wait">
          {activeSubView === 'helpdesk' ? (
            <HelpdeskRequest key="helpdesk" onBack={() => setActiveSubView(null)} />
          ) : activeSubView === 'booking' ? (
            <BookingRequest key="booking" onBack={() => setActiveSubView(null)} />
          ) : activeSubView === 'patrol-scan' ? (
            <PatrolScan key="patrol-scan" onBack={() => setActiveSubView(null)} />
          ) : activeSubView === 'home-address' ? (
            <HomeAddressRegistration key="home-address" onBack={() => setActiveSubView(null)} />
          ) : activeSubView === 'task-plan' ? (
            <DailyTaskPlan key="task-plan" onBack={() => setActiveSubView(null)} />
          ) : activeSubView === 'shift-swap' ? (
            <ShiftSwapRequest key="shift-swap" onBack={() => setActiveSubView(null)} />
          ) : activeSubView === 'incident-report' ? (
            <IncidentReporting key="incident-report" onBack={() => setActiveSubView(null)} />
          ) : activeSubView === 'lembur' ? (
            <OvertimeRequest
              key="lembur"
              onBack={() => setActiveSubView(null)}
            />
          ) : activeSubView === 'leave' || activeSubView === 'req-absen' || activeSubView === 'shift' || activeSubView === 'contract' ? (
            <LeaveRequest
              key={activeSubView}
              onBack={() => setActiveSubView(null)}
              category={activeSubView}
            />
          ) : activeSubView === 'loan' ? (
            <LoanRequest
              key="loan"
              onBack={() => setActiveSubView(null)}
            />
          ) : activeSubView === 'reimbursement' ? (
            <ReimbursementRequest
              key="reimbursement"
              onBack={() => setActiveSubView(null)}
            />
          ) : activeSubView === 'salary' ? (
            <PayslipView
              key="salary"
              onBack={() => setActiveSubView(null)}
            />
          ) : activeSubView === 'qr' ? (
            <QRScanner
              key="qr"
              onBack={() => setActiveSubView(null)}
            />
          ) : activeSubView === 'edit-profile' ? (
            <ProfileEditor
              key="edit-profile"
              onBack={() => setActiveSubView(null)}
            />
          ) : activeSubView === 'attendance-calendar' ? (
            <AttendanceCalendar
              key="attendance-calendar"
              onBack={() => setActiveSubView(null)}
            />
          ) : activeSubView === 'chatbot' ? (
            <div className="w-full flex-1 relative z-10 flex flex-col pb-24">
              <div className="flex items-center gap-4 mb-6">
                <button onClick={() => setActiveSubView(null)} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-gray-400 hover:text-white transition-colors">
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h2 className="text-xl font-serif font-bold text-white">Tanya AI</h2>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Asisten Kebijakan HR</p>
                </div>
              </div>
              <div className="glass-panel p-6 rounded-[32px] border border-white/5 bg-white/[0.02] flex-1 flex flex-col overflow-hidden">
                <HRChatbot />
              </div>
            </div>
          ) : activeTab === 'home' ? (
            <EmployeeHome 
              key="home" 
              onAction={(view) => setActiveSubView(view)} 
              user={userData}
              stats={stats}
              companyInfo={companyInfo}
            />
          ) : activeTab === 'absensi' ? (
            <ClockInTab key="absensi" />
          ) : activeTab === 'history' ? (
            <AttendanceHistory key="history" />
          ) : activeTab === 'docs' ? (
            <DocumentVault key="docs" />
          ) : activeTab === 'profile' ? (
            <EmployeeProfile key="profile" />
          ) : null}
        </AnimatePresence>
      </div>

      {/* Floating Dock Navigation Bar */}
      <div className="fixed bottom-6 w-full px-0 flex justify-center z-50 safe-bottom">
        <div className="glass-panel px-6 py-3 mx-4 flex items-center justify-between w-full rounded-full">
          {[
            { id: 'home', icon: Home },
            { id: 'history', icon: Clock },
            { id: 'absensi', icon: Fingerprint, center: true },
            { id: 'docs', icon: FileText },
            { id: 'profile', icon: User },
          ].map((item) => (
            <motion.button
              key={item.id}
              onClick={() => {
                if (window.navigator?.vibrate) window.navigator.vibrate(40);
                setActiveTab(item.id);
                setActiveSubView(null); // Reset subview when changing tabs
              }}
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.9 }}
              className={`relative ${item.center
                ? 'bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] w-14 h-14 rounded-full flex items-center justify-center text-white shadow-[0_0_15px_rgba(142,45,226,0.5)] -mt-8 border-4 border-[#0B0C10]'
                : `p-3 rounded-full transition-colors ${activeTab === item.id ? 'text-[var(--aurora-3)]' : 'text-gray-500'}`
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

      {/* GLOBAL BRANDING FOOTER */}
      <div className="fixed bottom-1 w-full text-center pointer-events-none z-40 safe-bottom">
        <p className="text-[8px] text-gray-600 font-bold tracking-[0.3em] uppercase">SI PRESENSI PRO MAX - v3.5</p>
      </div>

    </div>
  );
};

export default AttendanceScreen;
