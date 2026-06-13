import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Home, Clock, FileText, User, Fingerprint, CheckCircle2, ShieldAlert, Megaphone, Building2, ArrowLeft, Navigation, Camera, QrCode, LogIn, Circle, UserCircle, MapPinned } from 'lucide-react';
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
import { registerBackHandler } from '../../utils/navigation';
import GlobalHeader from '../../components/GlobalHeader';
import DeveloperWatermark from '../../components/DeveloperWatermark';

/** @type {(s: string) => string} Passthrough i18n - app is monolingual Indonesian */
const t = (s) => s;

// --- Clock In / Presensi UI ---
const ClockInTab = () => {
  const toast = useToast();
  const [isPressing, setIsPressing] = useState(false);
  const [chargeProgress, setChargeProgress] = useState(0);
  const [status, setStatus] = useState('IDLE'); // IDLE, SCANNING, VERIFIED, FAILED
  const [isClockOut, setIsClockOut] = useState(false);
  const [workMode, setWorkMode] = useState('WFO');
  const [todayStats, setTodayStats] = useState({ hadir: 0, terlambat: 0, izin: 0 });

  // --- Geofencing & Location State ---
  const [locationState, setLocationState] = useState('CHECKING');
  const [distance, setDistance] = useState(null);
  const [coordsDisplay, setCoordsDisplay] = useState({ lat: '-6.2000', lng: '106.8166' });
  const [officeCoords, setOfficeCoords] = useState({ latitude: -6.200000, longitude: 106.816666, radius: 50, name: 'Mencari Lokasi...' });
  const [projectCode, setProjectCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const isGodMode = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();

  // --- Camera State ---
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraError, setCameraError] = useState('');
  const [faceMatched, setFaceMatched] = useState(false);

  // --- Today's date ---
  const todayDate = new Date();
  const dayName = todayDate.toLocaleDateString('id-ID', { weekday: 'long' });
  const dateStr = todayDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  // --- User Info ---
  const [userFullName, setUserFullName] = useState('User');

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
        const { data: profile } = await supabase.from('profiles').select('project_id, full_name').eq('auth_id', session.user.id).maybeSingle();
        if (profile?.full_name) setUserFullName(profile.full_name);
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

  // Fetch today's attendance stats
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data: profile } = await supabase.from('profiles').select('id').eq('auth_id', session.user.id).maybeSingle();
        if (!profile?.id) return;
        const today = new Date().toISOString().split('T')[0];
        const { data: logs } = await supabase.from('attendance_logs')
          .select('action, status')
          .eq('user_id', profile.id)
          .gte('timestamp', today);
        if (logs) {
          const hadir = logs.filter(l => l.action === 'CLOCK_IN' || l.action === 'CLOCK_OUT').length > 0 ? 1 : 0;
          const terlambat = logs.filter(l => l.status === 'LATE').length;
          const izin = logs.filter(l => l.action === 'LEAVE' || l.status === 'EXCUSED').length;
          setTodayStats({ hadir: hadir > 0 ? 1 : 0, terlambat, izin: izin || 0 });
        }
      } catch (e) { console.warn('Stats fetch error:', e); }
    })();
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
  const streamRef = useRef(null);

  const startCamera = useCallback(async () => {
    setCameraError('');
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Camera access denied or unavailable", err);
      setCameraError('Kamera tidak dapat diakses. Pastikan izin kamera sudah diberikan di Pengaturan HP.');
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [startCamera]);

  // Trigger location check after workMode is known
  useEffect(() => {
    if (workMode) checkLocation();
  }, [workMode]);

  // Formula Haversine
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const checkLocation = async () => {
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
      if (!Geolocation) throw new Error("Geolocation plugin not available");
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
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
      setCoordsDisplay({ lat: latitude.toFixed(4), lng: longitude.toFixed(4) });
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
              if (window.navigator?.vibrate) window.navigator.vibrate([300]);
              setTimeout(() => { setStatus('IDLE'); }, 3000);
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
      if (workMode === 'WFO') {
        const wifiResult = await checkWifiGeofence();
        if (!wifiResult.allowed && wifiResult.method !== 'NO_ZONES_CONFIGURED') {
          toast(wifiResult.message, 'warning');
        }
      }
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
      setFaceMatched(true);
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
      setFaceMatched(false);
    }
  };

  const handleMasukClick = () => {
    if (status === 'IDLE' && (locationState === 'IN_RANGE' || isGodMode)) {
      setIsPressing(true);
    }
  };

  const isInRange = locationState === 'IN_RANGE' || isGodMode;
  const isOutRange = locationState === 'OUT_OF_RANGE' && !isGodMode;

  return (
    <div className="w-full max-w-md mx-auto space-y-5 pb-20">
      {/* 1. Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Presensi Hari Ini</h1>
          <p className="text-sm text-gray-400 mt-0.5">{dayName}, {dateStr}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-gray-400 border border-white/5">
          <User size={18} />
        </div>
      </div>

      {/* 2. Card: Rangkuman Hadir */}
      <div className="bg-[#13151A] bg-opacity-80 backdrop-blur-xl border border-white/10 rounded-[20px] shadow-[inset_0_2px_10px_rgba(0,201,255,0.15)] p-5">
        <h3 className="text-sm text-gray-300 mb-3 font-medium">Rangkuman Hadir</h3>
        <div className="grid grid-cols-3 divide-x divide-white/10">
          {/* Hadir */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs">Hadir</span>
              <span className="bg-[#B2FF59] text-black rounded-full px-2 py-0.5 text-[10px] font-bold">H</span>
            </div>
            <p className="text-2xl font-bold text-white mt-1">{todayStats.hadir}</p>
          </div>
          {/* Terlambat */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs">Terlambat</span>
              <span className="bg-orange-500 text-white rounded-full px-2 py-0.5 text-[10px] font-bold">T</span>
            </div>
            <p className="text-2xl font-bold text-white mt-1">{todayStats.terlambat}</p>
          </div>
          {/* Izin */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs">Izin</span>
              <span className="bg-blue-500 text-white rounded-full px-2 py-0.5 text-[10px] font-bold">I</span>
            </div>
            <p className="text-2xl font-bold text-white mt-1">{todayStats.izin}</p>
          </div>
        </div>
      </div>

      {/* 3. Card: Main Action */}
      <div className="bg-[#13151A] bg-opacity-80 backdrop-blur-xl border border-white/10 rounded-[20px] border-t-teal-500/30 border-l-teal-500/30 p-5">
        <h3 className="text-sm text-gray-200 mb-4 font-medium">Presensi Masuk/Pulang</h3>

        {/* A. Face Recognition UI */}
        <div className="relative rounded-xl overflow-hidden h-48 bg-slate-800">
          {/* Camera Feed */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Camera overlay darkening */}
          <div className="absolute inset-0 bg-black/10" />

          {/* Header overlay: Camera icon + label */}
          <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 z-20">
            <Camera size={12} className="text-white" />
            <span className="text-white text-xs">Pengenalan Wajah</span>
          </div>

          {/* Face Oval */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-32 border-2 border-white/80 rounded-[50%] shadow-[0_0_15px_rgba(255,255,255,0.3)] z-10" />

          {/* Scanning laser line */}
          {status === 'SCANNING' && (
            <motion.div
              initial={{ top: '15%' }}
              animate={{ top: '85%' }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute left-[calc(50%-3rem)] right-[calc(50%-3rem)] h-0.5 bg-gradient-to-r from-transparent via-[#00C9FF] to-transparent shadow-[0_0_15px_#00C9FF] z-20"
              style={{ width: '6rem', marginLeft: 'auto', marginRight: 'auto' }}
            />
          )}

          {/* Camera Error */}
          {cameraError && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-lg p-6">
              <div className="text-center">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 flex items-center justify-center mx-auto mb-2 shadow-[0_0_15px_rgba(255,61,0,0.3)]">
                  <Camera size={18} className="text-rose-400" />
                </div>
                <p className="text-[11px] text-gray-300 mb-2">{cameraError}</p>
                <button
                  onClick={startCamera}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-[10px] text-white font-bold transition-all uppercase tracking-wider pointer-events-auto"
                >
                  Coba Lagi
                </button>
              </div>
            </div>
          )}

          {/* Success Overlay */}
          {status === 'VERIFIED' && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-emerald-500/10 backdrop-blur-sm">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(52,211,153,0.3)]">
                  <CheckCircle2 size={28} className="text-emerald-400" />
                </div>
                <p className="text-white text-sm font-bold mt-1">Tercatat</p>
              </div>
            </div>
          )}

          {/* Failed Overlay */}
          {status === 'FAILED' && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-rose-500/10 backdrop-blur-sm">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(255,61,0,0.3)]">
                  <ShieldAlert size={28} className="text-rose-400" />
                </div>
                <p className="text-rose-400 text-sm font-bold mt-1">Gagal</p>
              </div>
            </div>
          )}

          {/* Match Badge (Top Right) */}
          <div className="absolute top-3 right-3 z-20">
            <span className="bg-[#B2FF59] text-black text-[10px] font-bold px-2 py-1 rounded-t-lg block text-center">
              Wajah Dikenali
            </span>
            {/* Matched Face Box */}
            <div className="w-16 h-20 bg-black/60 border border-[#B2FF59]/50 rounded-b-lg rounded-tl-lg overflow-hidden relative">
              {/* Simulated face silhouette */}
              <div className="absolute inset-0 flex items-center justify-center">
                <UserCircle size={28} className="text-gray-400/60" />
              </div>
              {/* Cyan dotted mesh overlay */}
              <svg className="absolute inset-0 w-full h-full opacity-40" viewBox="0 0 64 80">
                <line x1="0" y1="20" x2="64" y2="20" stroke="#00C9FF" strokeWidth="0.5" strokeDasharray="2,2" />
                <line x1="0" y1="40" x2="64" y2="40" stroke="#00C9FF" strokeWidth="0.5" strokeDasharray="2,2" />
                <line x1="0" y1="60" x2="64" y2="60" stroke="#00C9FF" strokeWidth="0.5" strokeDasharray="2,2" />
                <line x1="16" y1="0" x2="16" y2="80" stroke="#00C9FF" strokeWidth="0.5" strokeDasharray="2,2" />
                <line x1="32" y1="0" x2="32" y2="80" stroke="#00C9FF" strokeWidth="0.5" strokeDasharray="2,2" />
                <line x1="48" y1="0" x2="48" y2="80" stroke="#00C9FF" strokeWidth="0.5" strokeDasharray="2,2" />
              </svg>
            </div>
          </div>

          {/* Name Tag (Bottom Right) */}
          <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-xs px-3 py-1 rounded-full z-20">
            {userFullName}
          </div>

          {/* Verification Progress */}
          {status === 'SCANNING' && (
            <div className="absolute bottom-3 left-3 z-20 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full">
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#8E2DE2] to-[#00C9FF] rounded-full"
                    style={{ width: `${chargeProgress}%` }}
                  />
                </div>
                <span className="text-[10px] text-white/80">{chargeProgress}%</span>
              </div>
            </div>
          )}
        </div>

        {/* B. GPS Location UI */}
        <div className="relative rounded-xl overflow-hidden h-32 mt-4 bg-slate-900">
          {/* Dark map pattern simulation */}
          <div className="absolute inset-0 opacity-30">
            <svg className="w-full h-full" viewBox="0 0 400 128" preserveAspectRatio="none">
              <rect width="400" height="128" fill="#0F172A" />
              {Array.from({ length: 20 }).map((_, i) => (
                <line key={`h${i}`} x1="0" y1={i * 6.4} x2="400" y2={i * 6.4} stroke="#1E293B" strokeWidth="0.5" />
              ))}
              {Array.from({ length: 20 }).map((_, i) => (
                <line key={`v${i}`} x1={i * 20} y1="0" x2={i * 20} y2="128" stroke="#1E293B" strokeWidth="0.5" />
              ))}
              {/* Random road-like lines */}
              <line x1="50" y1="0" x2="120" y2="128" stroke="#334155" strokeWidth="2" strokeDasharray="8,4" />
              <line x1="200" y1="0" x2="350" y2="128" stroke="#334155" strokeWidth="1.5" strokeDasharray="6,3" />
              <line x1="0" y1="80" x2="400" y2="80" stroke="#334155" strokeWidth="2" />
              <line x1="300" y1="0" x2="300" y2="128" stroke="#334155" strokeWidth="1" />
            </svg>
          </div>

          {/* Header overlay */}
          <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 z-10">
            <MapPin size={12} className="text-emerald-400" />
            <span className="text-white text-xs">Lokasi Presensi (GPS)</span>
          </div>

          {/* Status Badge */}
          <div className="absolute top-3 right-3 z-10">
            <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider backdrop-blur-md ${
              isInRange ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
              isOutRange ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
              'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
            }`}>
              {isInRange ? 'Aman' : isGodMode ? 'Preview' : isOutRange ? 'Luar' : 'Cek...'}
            </span>
          </div>

          {/* Radius Circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-emerald-500/20 border border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] z-10" />

          {/* Ping Dot */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
            <motion.div
              animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-4 h-4 bg-blue-500/30 rounded-full absolute inset-0"
            />
          </div>

          {/* Coordinate Text */}
          <div className="absolute bottom-2 right-2 text-gray-400 text-[10px] font-mono z-10 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded">
            Lat: {coordsDisplay.lat}, Long: {coordsDisplay.lng}
          </div>

          {/* Project Code Selector */}
          {showCodeInput ? (
            <div className="absolute bottom-2 left-2 z-10 flex gap-1">
              <input type="text" maxLength={6} autoFocus
                placeholder="Kode..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') lookupProjectByCode(e.target.value);
                  if (e.key === 'Escape') setShowCodeInput(false);
                }}
                
               className="w-24 bg-white/10 border border-[#00C9FF]/30 rounded px-2 py-1 text-white text-[10px] outline-none uppercase tracking-widest font-mono transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
              <button onClick={() => setShowCodeInput(false)}
                className="px-2 py-1 bg-white/10 rounded text-gray-400 hover:text-white text-[9px]">Batal</button>
            </div>
          ) : projectCode ? (
            <button onClick={() => setShowCodeInput(true)}
              className="absolute bottom-2 left-2 z-10 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-[#00C9FF] font-mono border border-[#00C9FF]/20">
              {projectCode}
            </button>
          ) : (
            <button onClick={() => setShowCodeInput(true)}
              className="absolute bottom-2 left-2 z-10 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-gray-400 hover:text-white border border-white/10">
              + Kode
            </button>
          )}
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 mt-2">
          <CheckCircle2 size={14} className={isInRange ? 'text-emerald-500' : 'text-gray-500'} />
          <span className={`text-xs ${isInRange ? 'text-emerald-500' : 'text-gray-400'}`}>
            {isInRange ? 'Dalam Area Radius' : isGodMode ? 'Super Admin Preview' : isOutRange ? `Di Luar Radius (${distance}m)` : 'Memeriksa lokasi...'}
          </span>
        </div>

        {/* C. Action Buttons */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onPointerDown={handleMasukClick}
            onPointerUp={() => setIsPressing(false)}
            onPointerLeave={() => setIsPressing(false)}
            onPointerCancel={() => setIsPressing(false)}
            onClick={status === 'VERIFIED' ? handleReset : undefined}
            disabled={isOutRange && status === 'IDLE'}
            style={{ touchAction: 'none' }}
            className={`bg-gradient-to-r from-[#8E2DE2] to-[#00C9FF] text-white py-3 rounded-xl text-sm font-semibold hover:opacity-90 shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 select-none ${
              isPressing ? 'scale-95 opacity-80' : ''
            } ${status === 'VERIFIED' ? 'ring-2 ring-[#B2FF59]/50' : ''}`}
          >
            {status === 'VERIFIED' ? (
              <><CheckCircle2 size={16} className="text-[#B2FF59]" /> {isClockOut ? 'Siapkan Masuk' : 'Siapkan Pulang'}</>
            ) : isPressing ? (
              <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Memproses...</>
            ) : (
              <><LogIn size={16} /> {isClockOut ? 'Presensi Pulang' : 'Presensi Masuk'}</>
            )}
          </button>
          <button
            onClick={() => {
              if (window.navigator?.vibrate) window.navigator.vibrate(40);
              window.dispatchEvent(new CustomEvent('navigate-to-qr'));
            }}
            className="border border-white/20 text-white py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-white/5 transition-all"
          >
            <QrCode size={16} /> Scan QR Code
          </button>
        </div>
      </div>
    </div>
  );
};

const AttendanceScreen = ({ onGodModeReturn, isImpersonating, onCycleRole }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => {
    try { return sessionStorage.getItem('employee_active_tab') || 'home'; } catch { return 'home'; }
  });
  const [activeSubView, setActiveSubView] = useState(() => {
    try { return sessionStorage.getItem('employee_active_subview') || null; } catch { return null; }
  });

  // Handle layer-by-layer back button
  useEffect(() => {
    const unregister = registerBackHandler(() => {
      if (activeSubView) {
        setActiveSubView(null);
        return true;
      }
      if (activeTab !== 'home') {
        setActiveTab('home');
        return true;
      }
      return false;
    });
    return unregister;
  }, [activeSubView, activeTab]);

  const [clickCount, setClickCount] = useState(0);
  const [tenantName, setTenantName] = useState('Memuat...');
  const [structureName, setStructureName] = useState('PORTAL KARYAWAN');
  const [announcements, setAnnouncements] = useState([]);
  const [todayShift, setTodayShift] = useState(null);

  // Listen for QR navigation from ClockInTab
  useEffect(() => {
    const handler = () => {
      try { sessionStorage.setItem('employee_active_tab', 'home'); } catch {}
      try { sessionStorage.setItem('employee_active_subview', 'qr'); } catch {}
      setActiveTab('home');
      setActiveSubView('qr');
    };
    window.addEventListener('navigate-to-qr', handler);
    return () => window.removeEventListener('navigate-to-qr', handler);
  }, []);

  useEffect(() => {
    try { sessionStorage.setItem('employee_active_tab', activeTab); } catch {}
  }, [activeTab]);

  useEffect(() => {
    try {
      if (activeSubView) {
        sessionStorage.setItem('employee_active_subview', activeSubView);
      } else {
        sessionStorage.removeItem('employee_active_subview');
      }
    } catch {}
  }, [activeSubView]);

  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const controlNavbar = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsNavVisible(false);
      } else if (currentScrollY < lastScrollY) {
        setIsNavVisible(true);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', controlNavbar, { passive: true });
    return () => window.removeEventListener('scroll', controlNavbar);
  }, [lastScrollY]);

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

  useEffect(() => {
    let backPressCount = 0;
    let backPressTimer;
    const backButtonListener = App.addListener('backButton', () => {
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

          if (!tName && (profile.tenant_id || isGodMode)) {
            let tQuery = supabase.from('tenants').select('name, logo_url');
            if (profile.tenant_id) tQuery = tQuery.eq('id', profile.tenant_id);
            else tQuery = tQuery.order('created_at').limit(1);
            const { data: tData } = await tQuery.maybeSingle();
            if (tData) { tName = tData.name; tLogo = tData.logo_url; }
          }

          tName = tName || 'PT. PERUSAHAAN CONTOH';
          const pName = profile.projects?.name || 'GLOBAL';
          const dName = profile.divisions?.name || 'ALL DIVISION';

          setTenantName(tName);
          setStructureName(`${pName} - ${dName}`);

          const { data: fullProfile } = await supabase.from('profiles').select('*').eq('auth_id', session.user.id).maybeSingle();
          if (fullProfile) {
            setUserData({
              full_name: fullProfile.full_name || 'Karyawan',
              position: fullProfile.position || (fullProfile.role === 'SUB_ADMIN' ? 'Supervisor' : 'Staff'),
              division: dName
            });
            setStats(prev => ({ ...prev, leaveBalance: fullProfile.leave_balance || 12 }));
          }

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

          const tid = profile.tenant_id;
          let tSettingsQuery = supabase.from('tenant_settings').select('*');
          if (tid) { tSettingsQuery = tSettingsQuery.eq('tenant_id', tid); }
          else if (isGodMode) { tSettingsQuery = tSettingsQuery.order('created_at').limit(1); }

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

          const { data: aData } = await supabase.from('announcements')
            .select('*').eq('is_active', true).eq('tenant_id', profile.tenant_id)
            .or(`project_id.is.null,project_id.eq.${profile.project_id || '00000000-0000-0000-0000-000000000000'}`)
            .order('created_at', { ascending: false });

          if (aData) setAnnouncements(aData);

          const today = new Date().toISOString().split('T')[0];
          const { data: scheduleData } = await supabase
            .from('user_schedules')
            .select('*, master_shifts(shift_code, shift_name, time_in, time_out, is_cross_day)')
            .eq('user_id', profile.id).eq('date', today).maybeSingle();

          if (scheduleData?.master_shifts) {
            setTodayShift(scheduleData.master_shifts);
          }
        }
      } catch (e) { console.error("Failed to fetch tenant/project info", e); }
    };
    fetchTenant();
  }, []);

  const handleLogoClick = () => {
    if (!isGodMode && !isImpersonating) return;
    setClickCount(prev => prev + 1);
    if (window.navigator?.vibrate) window.navigator.vibrate(50);
    if (clickCount === 1) {
      if (onCycleRole && isGodMode) { onCycleRole(); }
      else if (onGodModeReturn) { onGodModeReturn(); }
      setClickCount(0);
    }
    setTimeout(() => setClickCount(0), 1000);
  };

  return (
    <div className="min-h-screen pb-24 pt-0 flex flex-col items-center relative overflow-hidden bg-[#0B0C10] w-full">
      {!activeSubView && (
        <GlobalHeader title={activeTab === 'home' ? 'BERANDA' : activeTab === 'history' ? 'RIWAYAT PRESENSI' : activeTab === 'absensi' ? 'PRESENSI KARYAWAN' : activeTab === 'docs' ? 'DOKUMEN VAULT' : activeTab === 'profile' ? 'PROFIL SAYA' : 'PRESENSI'} />
      )}

      <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
        <div className="absolute top-0 left-0 w-full h-[30%] bg-gradient-to-b from-[var(--aurora-1)]/20 to-transparent"></div>
      </div>



      {announcements.length > 0 && (
        <div className="w-full max-w-4xl mx-4 mb-4 bg-[var(--aurora-1)]/5 backdrop-blur-lg border border-[var(--aurora-1)]/20 rounded-xl overflow-hidden relative z-10 flex items-center px-3 py-2">
          <Megaphone size={14} className="text-[var(--aurora-1)] flex-shrink-0 mr-3 animate-pulse" />
          <div className="flex-1 overflow-hidden relative">
            <div className="whitespace-nowrap animate-marquee inline-block text-xs text-[var(--aurora-1)] font-bold tracking-wide">
              {announcements.map((a) => (
                <span key={a.id} className="mr-8">📢 {a.title}: {a.message}</span>
              ))}
            </div>
          </div>
        </div>
      )}

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

      {isAdminUser && !isGodMode && !isImpersonating && (
        <div className="w-full max-w-md mb-4 relative z-10 flex justify-center">
          <button onClick={() => navigate(userRole === 'TENANT_ADMIN' ? '/tenantadmin' : '/subadmin')}
            className="bg-white/5 backdrop-blur-lg border border-[var(--aurora-3)]/20 rounded-full px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--aurora-3)] hover:bg-[var(--aurora-3)]/10 transition-all flex items-center gap-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
            <Building2 size={14} /> Dashboard Admin
          </button>
        </div>
      )}

      <div className="w-full max-w-4xl flex-1 relative z-10 overflow-y-auto hide-scrollbar px-4">
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
            <OvertimeRequest key="lembur" onBack={() => setActiveSubView(null)} />
          ) : activeSubView === 'leave' || activeSubView === 'req-absen' || activeSubView === 'shift' || activeSubView === 'contract' ? (
            <LeaveRequest key={activeSubView} onBack={() => setActiveSubView(null)} category={activeSubView} />
          ) : activeSubView === 'loan' ? (
            <LoanRequest key="loan" onBack={() => setActiveSubView(null)} />
          ) : activeSubView === 'reimbursement' ? (
            <ReimbursementRequest key="reimbursement" onBack={() => setActiveSubView(null)} />
          ) : activeSubView === 'salary' ? (
            <PayslipView key="salary" onBack={() => setActiveSubView(null)} />
          ) : activeSubView === 'qr' ? (
            <QRScanner key="qr" onBack={() => setActiveSubView(null)} />
          ) : activeSubView === 'edit-profile' ? (
            <ProfileEditor key="edit-profile" onBack={() => setActiveSubView(null)} />
          ) : activeSubView === 'attendance-calendar' ? (
            <AttendanceCalendar key="attendance-calendar" onBack={() => setActiveSubView(null)} />
          ) : activeSubView === 'chatbot' ? (
            <div className="w-full flex-1 relative z-10 flex flex-col pb-24">
              <div className="flex items-center gap-4 mb-6">
                <button onClick={() => setActiveSubView(null)} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-gray-400 hover:text-white transition-colors">
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h2 className="text-xl font-serif font-bold text-white">{t('Tanya AI')}</h2>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">{t('Asisten Kebijakan HR')}</p>
                </div>
              </div>
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-[32px] p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] flex-1 flex flex-col overflow-hidden">
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

      {/* Bottom Navigation Bar */}
      <div className={`bottom-nav ${isNavVisible ? 'translate-y-0' : 'translate-y-[150%]'}`}>
        {[
          { id: 'home', label: 'Home', icon: Home },
          { id: 'history', label: 'Riwayat', icon: Clock },
          { id: 'absensi', label: 'Presensi', icon: Fingerprint, center: true },
          { id: 'docs', label: 'Dokumen', icon: FileText },
          { id: 'profile', label: 'Profil', icon: User },
        ].map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (window.navigator?.vibrate) window.navigator.vibrate(40);
                setActiveTab(item.id);
                setActiveSubView(null);
              }}
              className={item.center 
                ? 'bottom-nav-btn-center' 
                : `bottom-nav-btn ${isActive ? 'active' : ''}`
              }
            >
              <item.icon size={item.center ? 26 : 20} />
              {!item.center && <span>{item.label}</span>}
            </button>
          );
        })}
      </div>


      {/* Copyright Watermark */}
      <div className="fixed bottom-1 w-full pointer-events-none z-40 safe-bottom flex flex-col items-center">
        <DeveloperWatermark />
      </div>

    </div>
  );
};

export default AttendanceScreen;
