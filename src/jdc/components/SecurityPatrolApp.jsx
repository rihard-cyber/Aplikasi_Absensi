/**
 * =======================================================
 *   SMPJDC SECURITY MANAGEMENT SYSTEM
 *   Module: Security Patrol Mobile App (Simulation)
 *   Signed by: Richard Meha (by -Richard)
 *   Last Maintained: 2026-06-07
 *   Description: Mobile UI simulation for security officers, 
 *                html5-qrcode integration, GPS anti-fraud.
 * =======================================================
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Camera, Clock, Check, AlertTriangle, QrCode, Shield,
  Wifi, WifiOff, Database, ThumbsUp, MapPin,
  FileText, History, Send, Info, Search, Wrench, Radio, X, Home
} from 'lucide-react';
import KATEGORI_TEMUAN from '../data/kategoriTemuan';
import { Html5Qrcode } from 'html5-qrcode';
import { getGPSCoordinates, generateAntiFraudData } from '../utils/security';
import { compressImage } from '../utils/image';
import { registerBackHandler } from '../utils/navigation';
import { hapticMedium, hapticSuccess, hapticHeavy } from '../utils/haptics';

const KATEGORI_MUTASI = [
  { id: 'informasi', label: 'Informasi', icon: Info, color: '#3b82f6' },
  { id: 'kehilangan', label: 'Kehilangan', icon: Search, color: '#f59e0b' },
  { id: 'kerusakan', label: 'Kerusakan', icon: Wrench, color: '#ef4444' },
  { id: 'gangguan', label: 'Gangguan', icon: AlertTriangle, color: '#dc2626' },
  { id: 'emergency', label: 'Emergency', icon: Radio, color: '#7c3aed' },
  { id: '__lainnya__', label: 'Lainnya...', icon: X, color: '#6b7280' }
];

export default function SecurityPatrolApp({
  currentUser, areas, posList = [], attendanceLogs = [], reports = [], findings = [], mutasiLogs = [],
  onAddReport, onTriggerSOS, onAddLog, onAddAttendance
}) {
  const [online, setOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [logoUrl, setLogoUrl] = useState(() => {
    try {
      return localStorage.getItem('tenant_logo_url') || 'logo.png';
    } catch {
      return 'logo.png';
    }
  });
  const [queue, setQueue] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sapujagat_offline_queue')) || []; }
    catch { return []; }
  });

  // Real network detection
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('sapujagat_offline_queue', JSON.stringify(queue));
    } catch (e) {
      console.error('Gagal menyimpan antrean offline ke localStorage:', e);
    }
  }, [queue]);

  // Auto-flush queue when online (both on mount and on reconnect)
  useEffect(() => {
    if (online && queue.length > 0) {
      const flushQueue = async () => {
        const items = [...queue];
        for (const item of items) {
          try {
            const data = item.data || item;
            if (item.type === 'mutasi') {
              await onAddLog(data);
            } else {
              await onAddReport(data);
            }
          } catch (e) {
            console.error('Gagal kirim antrean offline:', e);
          }
        }
        setQueue([]);
      };
      flushQueue();
    }
  }, [online]);

  const [tab, setTab] = useState('home');
  const [cameraStream, setCameraStream] = useState(null);
  const [selfiePhoto, setSelfiePhoto] = useState(null);
  const [faceRecognized, setFaceRecognized] = useState(false);
  const [gpsLocation, setGpsLocation] = useState({ lat: -6.2000, lng: 106.8166 });
  const [isInRadius, setIsInRadius] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [clockedStatus, setClockedStatus] = useState(null); // null | 'in' | 'out'
  const [clockInTime, setClockInTime] = useState('');
  const [clockOutTime, setClockOutTime] = useState('');
  const [showPlottingModal, setShowPlottingModal] = useState(false);
  const [lastPlottingId, setLastPlottingId] = useState(() => {
    return localStorage.getItem('smpjdc_last_plotting_id') || '';
  });

  const getDetectedShiftCode = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 14) return 'P';
    if (hour >= 14 && hour < 22) return 'S';
    return 'M';
  };

  // ── Tab: Patroli ──
  const [step, setStep] = useState(1); // 1=start, 2=scan, 3=lapor, 4=done
  const [shift, setShift] = useState(() => {
    const active = getDetectedShiftCode();
    const shiftMap = { P: 'Pagi (06:00-14:00)', S: 'Siang (14:00-22:00)', M: 'Malam (22:00-06:00)' };
    return shiftMap[active] || 'Pagi (06:00-14:00)';
  });
  const [area, setArea] = useState(null);
  const [timeScan, setTimeScan] = useState(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [mode, setMode] = useState(null);
  const [kategori, setKategori] = useState('');
  const [temuan, setTemuan] = useState('');
  const [severity, setSeverity] = useState('low');
  const [deskripsi, setDeskripsi] = useState('');
  const [foto, setFoto] = useState(null);
  const [scanError, setScanError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);

  // Trigger early Geolocation permissions and warm up GPS coordinates
  useEffect(() => {
    if (step === 2) {
      setScanning(true);
      getGPSCoordinates().then(() => {});
    } else {
      setScanning(false);
    }
  }, [step]);

  // Handle back button interception for step and tab navigation in simulator app
  useEffect(() => {
    const unregister = registerBackHandler(() => {
      if (tab !== 'patroli') {
        setTab('patroli');
        return true;
      }
      if (step === 3 && mode) {
        setMode(null);
        return true;
      }
      if (step > 1) {
        if (step === 4) {
          resetLaporan();
        } else {
          setStep(prev => prev - 1);
        }
        return true;
      }
      return false;
    });
    return unregister;
  }, [tab, step, mode]);

  // Live Camera Scanner Lifecycle using html5-qrcode
  useEffect(() => {
    let html5QrCode;
    const elementId = "reader";
    
    if (scanning && step === 2) {
      setScanLoading(true);
      setScanError('');
      
      const timer = setTimeout(() => {
        try {
          html5QrCode = new Html5Qrcode(elementId);
          html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 220, height: 220 }
            },
            (decodedText) => {
              handleBarcodeScannedSuccessfully(decodedText);
              if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop().catch(err => console.error(err));
              }
            },
            () => {
              // scanning...
            }
          ).then(() => {
            setScanLoading(false);
          }).catch(err => {
            console.warn("Kamera scanner gagal aktif:", err);
            setScanLoading(false);
            setScanning(false);
            setScanError(`Gagal akses kamera: ${err.message || err}. Pastikan izin kamera telah diberikan. Gunakan input manual di bawah.`);
          });
        } catch (e) {
          console.error("Html5Qrcode scanner failed to initialize:", e);
          setScanLoading(false);
          setScanError(`Scanner Error: ${e.message || e}`);
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        if (html5QrCode && html5QrCode.isScanning) {
          html5QrCode.stop().catch(err => console.error(err));
        }
      };
    }
  }, [scanning, step]);

  const todayStr = new Date().toISOString().split('T')[0];

  const { todayLog, myPlotting } = useMemo(() => {
    const currentHourShift = getDetectedShiftCode();
    // 1. Find log for today matching current shift
    let activeLog = attendanceLogs.find(
      log => log.tanggal === todayStr && log.shift === currentHourShift
    );
    // 2. Fallback: find any log for today
    if (!activeLog) {
      activeLog = attendanceLogs.find(log => log.tanggal === todayStr);
    }
    const plotting = activeLog?.details?.find(d => String(d.personilId) === String(currentUser?.id));
    return {
      todayLog: activeLog || null,
      myPlotting: plotting || null
    };
  }, [attendanceLogs, currentUser, todayStr]);

  useEffect(() => {
    if (myPlotting && todayLog) {
      const shiftMap = { P: 'Pagi (06:00-14:00)', S: 'Siang (14:00-22:00)', M: 'Malam (22:00-06:00)', Kh: 'Khusus' };
      setShift(shiftMap[todayLog.shift] || todayLog.shift || 'Pagi (06:00-14:00)');
    }
  }, [myPlotting, todayLog]);

  // ── States & Handlers for Self Attendance (SI PRESENSI PRO MAX) ──
  const videoRef = React.useRef(null);

  // ── States for Scanning Presensi (Attendance Specific QR) ──
  const [scanningPresensi, setScanningPresensi] = useState(false);
  const [presensiScanLoading, setPresensiScanLoading] = useState(false);
  const [presensiScanError, setPresensiScanError] = useState('');
  const [presensiBarcodeInput, setPresensiBarcodeInput] = useState('');

  // Sync initial clockedStatus from database plotting
  useEffect(() => {
    if (myPlotting && myPlotting.status === 'Hadir') {
      setClockedStatus('in');
      if (myPlotting.checkInTime) {
        setClockInTime(myPlotting.checkInTime);
      }
    } else {
      setClockedStatus(null);
    }
  }, [myPlotting]);

  // Calculate Hadir, Terlambat, Izin stats from all logs for the current user
  const attendanceStats = useMemo(() => {
    let hadirCount = 0;
    let terlambatCount = 0;
    let izinCount = 0;

    attendanceLogs.forEach(log => {
      const myRow = log.details?.find(d => String(d.personilId) === String(currentUser?.id));
      if (myRow) {
        if (myRow.status === 'Hadir') hadirCount++;
        else if (myRow.status === 'Terlambat' || myRow.alasan?.toLowerCase().includes('telat')) terlambatCount++;
        else if (myRow.status === 'Izin' || myRow.status === 'Sakit' || myRow.status === 'Cuti') izinCount++;
      }
    });

    // Fallback: if clocked in today but logs are not refreshed, display at least 1
    if (clockedStatus === 'in' && hadirCount === 0) {
      hadirCount = 1;
    }

    return {
      hadir: hadirCount,
      terlambat: terlambatCount,
      izin: izinCount
    };
  }, [attendanceLogs, currentUser, clockedStatus]);

  // Camera stream and GPS fetching
  useEffect(() => {
    let activeStream = null;
    if (tab === 'presensi' && clockedStatus !== 'in' && !selfiePhoto && !scanningPresensi) {
      setGpsLoading(true);
      getGPSCoordinates().then(coords => {
        setGpsLoading(false);
        if (coords) {
          setGpsLocation({ lat: coords.latitude, lng: coords.longitude });
          setIsInRadius(true);
        } else {
          setGpsLocation({ lat: -6.2000, lng: 106.8166 });
          setIsInRadius(true);
        }
      });

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
          .then(stream => {
            activeStream = stream;
            setCameraStream(stream);
            setTimeout(() => {
              setFaceRecognized(true);
            }, 2000);
          })
          .catch(err => {
            console.warn('Camera blocked or unavailable, using simulation:', err);
            setTimeout(() => {
              setFaceRecognized(true);
            }, 1500);
          });
      } else {
        setTimeout(() => {
          setFaceRecognized(true);
        }, 1500);
      }
    } else {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
      setFaceRecognized(false);
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [tab, selfiePhoto, clockedStatus, scanningPresensi]);

  // Bind camera stream to video element when it becomes available in React lifecycle
  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(err => {
        console.warn("Gagal memutar video stream:", err);
      });
    }
  }, [cameraStream]);

  // Live Camera Scanner Lifecycle for Presensi QR (Staff Room)
  useEffect(() => {
    let html5QrCodePresensi;
    const elementId = "reader-presensi";
    
    if (scanningPresensi) {
      setPresensiScanLoading(true);
      setPresensiScanError('');
      
      const timer = setTimeout(() => {
        try {
          html5QrCodePresensi = new Html5Qrcode(elementId);
          html5QrCodePresensi.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 220, height: 220 }
            },
            (decodedText) => {
              handlePresensiBarcodeScannedSuccessfully(decodedText);
              if (html5QrCodePresensi && html5QrCodePresensi.isScanning) {
                html5QrCodePresensi.stop().catch(err => console.error(err));
              }
            },
            () => {
              // scanning...
            }
          ).then(() => {
            setPresensiScanLoading(false);
          }).catch(err => {
            console.warn("Kamera scanner presensi gagal aktif:", err);
            setPresensiScanLoading(false);
            setScanningPresensi(false);
            setPresensiScanError(`Gagal akses kamera: ${err.message || err}. Pastikan izin kamera telah diberikan. Gunakan input manual di bawah.`);
          });
        } catch (e) {
          console.error("Html5Qrcode scanner presensi failed to initialize:", e);
          setPresensiScanLoading(false);
          setPresensiScanError(`Scanner Error: ${e.message || e}`);
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        if (html5QrCodePresensi && html5QrCodePresensi.isScanning) {
          html5QrCodePresensi.stop().catch(err => console.error(err));
        }
      };
    }
  }, [scanningPresensi]);

  const handlePresensiBarcodeScannedSuccessfully = (val) => {
    hapticSuccess();
    let cleanVal = val.trim();
    if (!cleanVal) return;

    // Smart URL Parsing
    if (cleanVal.startsWith('http://') || cleanVal.startsWith('https://')) {
      try {
        const urlObj = new URL(cleanVal);
        const checkpointParam = urlObj.searchParams.get('checkpoint') || 
                                urlObj.searchParams.get('code') || 
                                urlObj.searchParams.get('id');
        if (checkpointParam) {
          cleanVal = checkpointParam.trim();
        } else {
          const pathSegments = urlObj.pathname.split('/').filter(Boolean);
          if (pathSegments.length > 0) {
            cleanVal = pathSegments[pathSegments.length - 1].trim();
          }
        }
      } catch (e) {
        console.warn('Gagal memproses QR URL:', e);
      }
    }

    if (cleanVal === 'JDC-MASTER-PRESENSI') {
      playBeepSound();
      setScanningPresensi(false);
      setPresensiScanError('');
      
      // Notify user, return to webcam view and auto clock-in/out after a small delay
      if (addToast) {
        addToast('✓ QR Presensi Terverifikasi! Mengambil foto selfie...', 'success');
      } else {
        alert('✓ QR Presensi Terverifikasi! Mengambil foto selfie...');
      }
      
      setTimeout(() => {
        if (clockedStatus === 'in') {
          handleSelfClockOut();
        } else {
          handleSelfClockIn();
        }
      }, 1500);
    } else {
      setPresensiScanError(`QR Code "${cleanVal}" tidak valid untuk absensi staff. Harap scan Barcode Master Presensi di Ruang Staff.`);
      setTimeout(() => {
        setPresensiScanError('');
      }, 5000);
    }
  };

  const handlePresensiBarcodeScan = () => {
    handlePresensiBarcodeScannedSuccessfully(presensiBarcodeInput);
  };

  const getJamDinasCode = (shiftCode) => {
    const shiftMap = { P: '06:00 - 14:00', S: '14:00 - 22:00', M: '22:00 - 06:00' };
    return shiftMap[shiftCode] || '08:00 - 16:00';
  };

  const handleSelfClockIn = async () => {
    setGpsLoading(true);
    // 1. Lock actual high-accuracy coordinates on check-in tap
    const coords = await getGPSCoordinates();
    setGpsLoading(false);

    if (!coords) {
      alert('⚠️ Gagal memperoleh lokasi GPS. Pastikan izin lokasi aktif dan GPS berakurasi tinggi dinyalakan.');
      return;
    }

    const lat = coords.latitude || 0;
    const lng = coords.longitude || 0;
    const accuracy = coords.accuracy || 999;
    
    // 2. Validate for Fake GPS / developer mocks
    const isMocked = coords.mocked === true || coords.isFromMockProvider === true;
    if (isMocked) {
      alert('⚠️ DETEKSI FAKE GPS: Sistem mendeteksi Anda menggunakan aplikasi pemalsuan lokasi! Absensi dibatalkan.');
      return;
    }
    
    if (accuracy === 0 || accuracy === 0.001) {
      alert('⚠️ DETEKSI EMULATOR: Sinyal GPS terdeteksi tidak valid. Harap gunakan perangkat fisik asli!');
      return;
    }

    // 3. JDC Area Radius Check (250 meters from JDC Center)
    const jdcLat = -6.2000;
    const jdcLng = 106.8166;
    const R = 6371e3; // Earth radius in meters
    const phi1 = (jdcLat * Math.PI) / 180;
    const phi2 = (lat * Math.PI) / 180;
    const deltaPhi = ((lat - jdcLat) * Math.PI) / 180;
    const deltaLambda = ((lng - jdcLng) * Math.PI) / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Check if test account (Richard / Admin Super) to bypass block but log actual distance
    const isTestAccount = ['Admin Super', 'admin', 'Admin'].includes(currentUser?.jabatan) || 
                          currentUser?.nama?.toLowerCase().includes('richard');

    if (distance > 250 && !isTestAccount) {
      alert(`⚠️ DI LUAR RADIUS: Jarak Anda ${Math.round(distance)}m dari JDC. Jarak maksimal absensi adalah 250m!`);
      return;
    }

    if (accuracy > 100 && !isTestAccount) {
      alert(`⚠️ SINYAL GPS BURUK: Akurasi GPS saat ini tidak memadai (${Math.round(accuracy)}m). Cari lokasi terbuka.`);
      return;
    }

    // 4. Take real-time snapshot of the webcam stream
    let selfieUrl = '';
    if (cameraStream && videoRef.current) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 320;
        canvas.height = videoRef.current.videoHeight || 240;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          selfieUrl = canvas.toDataURL('image/jpeg', 0.80); // Compress with 0.8 quality
        }
      } catch (e) {
        console.warn('Gagal capture video frame:', e);
      }
    }

    const finalSelfie = selfieUrl || currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120';
    const checkInTimeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    
    setClockInTime(checkInTimeStr);
    setClockedStatus('in');

    const currentHourShift = getDetectedShiftCode();
    
    // Auto-detect if this is an overtime (Lembur) shift
    // If user's roster schedule for today is Libur (X) or not defined, flag as Lembur
    const currentYearMonth = getYearMonth(new Date());
    const userRoster = getRoster(currentYearMonth);
    const mySchedule = userRoster[currentUser.id]?.[todayStr];
    const isOvertime = !mySchedule || mySchedule === 'X';

    const currentShiftDetails = {
      personilId: currentUser.id,
      nama: currentUser.nama,
      nrp: currentUser.nrp,
      regu: currentUser.regu || 'Regu A',
      jabatan: currentUser.jabatan,
      status: isOvertime ? 'Tukar Shift' : 'Hadir',
      checkInTime: checkInTimeStr,
      alasan: isOvertime ? 'Lembur Mandiri' : '',
      isLembur: isOvertime,
      jamLembur: isOvertime ? 8 : 0, // default full shift 8 hours
      penggantiId: '',
      posPlotting: 'Pintu Masuk Utama',
      jamDinas: getJamDinasCode(currentHourShift),
      lat: lat,
      lng: lng,
      fotoSelfie: finalSelfie
    };

    if (todayLog) {
      const existsIndex = todayLog.details?.findIndex(d => String(d.personilId) === String(currentUser.id));
      let newDetails = [...(todayLog.details || [])];
      if (existsIndex > -1) {
        newDetails[existsIndex] = { ...newDetails[existsIndex], ...currentShiftDetails };
      } else {
        newDetails.push(currentShiftDetails);
      }
      if (onAddAttendance) {
        onAddAttendance({
          ...todayLog,
          details: newDetails
        });
      }
    } else {
      const newLog = {
        tanggal: todayStr,
        hari: new Date().toLocaleDateString('id-ID', { weekday: 'long' }),
        regu: currentUser.regu || 'Regu A',
        shift: currentHourShift,
        jamDinas: getJamDinasCode(currentHourShift),
        details: [currentShiftDetails]
      };
      if (onAddAttendance) {
        onAddAttendance(newLog);
      }
    }
    hapticSuccess();
  };

  const handleSelfClockOut = () => {
    const checkOutTimeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    setClockOutTime(checkOutTimeStr);
    setClockedStatus(null);

    if (todayLog) {
      const existsIndex = todayLog.details?.findIndex(d => String(d.personilId) === String(currentUser.id));
      let newDetails = [...(todayLog.details || [])];
      if (existsIndex > -1) {
        newDetails[existsIndex] = { 
          ...newDetails[existsIndex], 
          status: 'Tidak Hadir', 
          alasan: 'Sudah Pulang',
          checkOutTime: checkOutTimeStr 
        };
      }
      if (onAddAttendance) {
        onAddAttendance({
          ...todayLog,
          details: newDetails
        });
      }
    }
    hapticHeavy();
  };

  const playAlarmSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const playBeep = (freq, duration, delay) => {
        setTimeout(() => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + duration);
        }, delay);
      };
      
      playBeep(880, 0.15, 0);
      playBeep(880, 0.15, 200);
      playBeep(1200, 0.3, 400);
    } catch (e) {
      console.warn('Gagal memutar suara alarm:', e);
    }
  };

  useEffect(() => {
    if (myPlotting && todayLog) {
      const currentPlottingId = `${todayLog.id}-${myPlotting.posPlotting}-${myPlotting.status}`;
      if (lastPlottingId && lastPlottingId !== currentPlottingId) {
        playAlarmSound();
        setShowPlottingModal(true);
        if (navigator.vibrate) {
          try { navigator.vibrate([200, 100, 200]); } catch (e) {}
        }
      }
      setLastPlottingId(currentPlottingId);
      localStorage.setItem('smpjdc_last_plotting_id', currentPlottingId);
    } else if (!myPlotting) {
      setLastPlottingId('');
      localStorage.removeItem('smpjdc_last_plotting_id');
    }
  }, [myPlotting, todayLog]);

  useEffect(() => { if (kategori) setTemuan(''); }, [kategori]);

  const kategoriData = KATEGORI_TEMUAN;
  const daftarTemuan = kategori ? kategoriData.find(k => k.id === kategori)?.items || [] : [];

  const resetLaporan = () => {
    setStep(1); setArea(null); setTimeScan(null);
    setMode(null); setKategori(''); setTemuan('');
    setSeverity('low'); setDeskripsi(''); setFoto(null);
    setBarcodeInput(''); setScanError('');
  };

  const playBeepSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, audioCtx.currentTime); // 1200Hz Beep
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12); // Beep duration 120ms
    } catch (e) {
      console.warn('Gagal memutar bip suara:', e);
    }
  };

  const handleBarcodeScannedSuccessfully = (val) => {
    hapticSuccess();
    let cleanVal = val.trim();
    if (!cleanVal) return;

    // Smart URL Parsing: Ekstrak parameter query jika QR code berisi URL lengkap
    if (cleanVal.startsWith('http://') || cleanVal.startsWith('https://')) {
      try {
        const urlObj = new URL(cleanVal);
        const checkpointParam = urlObj.searchParams.get('checkpoint') || 
                                urlObj.searchParams.get('code') || 
                                urlObj.searchParams.get('id');
        
        if (checkpointParam) {
          cleanVal = checkpointParam.trim();
        } else {
          // Fallback ke segment path terakhir
          const pathSegments = urlObj.pathname.split('/').filter(Boolean);
          if (pathSegments.length > 0) {
            cleanVal = pathSegments[pathSegments.length - 1].trim();
          }
        }
      } catch (e) {
        console.warn('Gagal memproses QR URL:', e);
      }
    }

    // Cari area berdasarkan kecocokan case-insensitive atau jika kode terdeteksi di dalam string QR
    const found = areas.find(a =>
      a.qrCode.toLowerCase() === cleanVal.toLowerCase() ||
      a.id.toLowerCase() === cleanVal.toLowerCase() ||
      cleanVal.toLowerCase().includes(a.qrCode.toLowerCase())
    );

    if (found) {
      playBeepSound();
      setArea(found);
      setTimeScan(new Date());
      setBarcodeInput('');
      setMode(null);
      setKategori('');
      setTemuan('');
      setSeverity('low');
      setDeskripsi('');
      setFoto(null);
      setStep(3);
      setScanning(false);
      setScanError('');
    } else {
      setScanError(`QR Code "${cleanVal}" tidak terdaftar di checkpoint JDC.`);
      // Sembunyikan error setelah 4 detik agar bisa mencoba scan ulang dengan nyaman
      setTimeout(() => {
        setScanError('');
      }, 4000);
    }
  };

  const handleBarcodeScan = () => {
    handleBarcodeScannedSuccessfully(barcodeInput);
  };

  const handleNormal = async () => {
    const fraudData = await generateAntiFraudData(currentUser.id);
    const r = {
      timestamp: timeScan.toISOString(), timestampEnd: new Date().toISOString(),
      userId: currentUser.id, userName: currentUser.nama,
      areaId: area.id, gedung: 'JDC', lantai: area.lantai, zona: area.zona, titik: area.titik,
      shift, kategori: '-', kodeTemuan: '-', temuan: 'Normal', status: 'normal',
      kondisi: 'Aman dan Kondusif', severity: 'Rendah', keterangan: '', foto: null,
      antiFraud: fraudData
    };
    (online ? onAddReport(r) : setQueue(p => [...p, { type: 'report', data: r }]));
    setStep(4);
  };

  const handleTemuanSubmit = async (e) => {
    e.preventDefault();
    if (!kategori || !temuan) return;
    const kat = kategoriData.find(k => k.id === kategori);
    const item = daftarTemuan.find(t => t.kode === temuan);
    const severityMap = { low: 'Rendah', medium: 'Sedang', high: 'Tinggi', critical: 'Kritis' };
    
    const fraudData = await generateAntiFraudData(currentUser.id);
    const r = {
      timestamp: timeScan.toISOString(), timestampEnd: new Date().toISOString(),
      userId: currentUser.id, userName: currentUser.nama,
      areaId: area.id, gedung: 'JDC', lantai: area.lantai, zona: area.zona, titik: area.titik,
      shift, kategori: kat?.nama || '', kodeTemuan: item?.kode || '', temuan: item?.nama || '',
      status: 'temuan', kondisi: item?.nama || 'Temuan', severity: severityMap[severity] || 'Rendah',
      keterangan: deskripsi, foto,
      antiFraud: fraudData
    };
    (online ? onAddReport(r) : setQueue(p => [...p, { type: 'report', data: r }]));
    setStep(4);
  };

  // ── Tab: Mutasi ──
  const [mKat, setMKat] = useState('informasi');
  const [mKatLainnya, setMKatLainnya] = useState('');
  const [mLokasi, setMLokasi] = useState('');
  const [mUraian, setMUraian] = useState('');
  const [mFoto, setMFoto] = useState(null);
  const [mErrors, setMErrors] = useState({});
  const [mSent, setMSent] = useState(false);
  const [mJamKejadian, setMJamKejadian] = useState(() => new Date().toTimeString().slice(0, 5));
  const [isCustomLokasi, setIsCustomLokasi] = useState(false);
  const [mLokasiCustom, setMLokasiCustom] = useState('');

  // ── Tab: Temuan (Standalone) ──
  const [tLokasi, setTLokasi] = useState('');
  const [tKategori, setTKategori] = useState('');
  const [tTemuan, setTTemuan] = useState('');
  const [tSeverity, setTSeverity] = useState('low');
  const [tDeskripsi, setTDeskripsi] = useState('');
  const [tFoto, setTFoto] = useState(null);
  const [tSent, setTSent] = useState(false);
  const [tWaktu, setTWaktu] = useState(() => new Date().toTimeString().slice(0, 5));

  const handleTemuanStandaloneSubmit = async (e) => {
    e.preventDefault();
    if (!tLokasi || !tKategori || !tTemuan) return;
    const fraudData = await generateAntiFraudData(currentUser.id);
    const selectedArea = areas.find(a => tLokasi.includes(a.titik));
    const reportDate = new Date();
    if (tWaktu) {
      const [h, m] = tWaktu.split(':');
      reportDate.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
    }
    
    const kat = kategoriData.find(k => k.id === tKategori);
    const standAloneDaftarTemuan = tKategori ? kat?.items || [] : [];
    const item = standAloneDaftarTemuan.find(t => t.kode === tTemuan);
    const severityMap = { low: 'Rendah', medium: 'Sedang', high: 'Tinggi', critical: 'Kritis' };

    const reportData = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      areaId: selectedArea?.id || 'manual',
      titik: tLokasi,
      lantai: selectedArea?.lantai || '-',
      zona: selectedArea?.zona || '-',
      gedung: selectedArea?.gedung || 'SMPJDC - Jakarta Design Center',
      qrCode: selectedArea?.qrCode || 'MANUAL',
      userName: currentUser.nama,
      userId: currentUser.id,
      nrp: currentUser.nrp,
      kategori: kat?.nama || '',
      kodeTemuan: item?.kode || '',
      temuan: item?.nama || '',
      status: 'temuan',
      kondisi: item?.nama || 'Temuan',
      keterangan: tDeskripsi,
      severity: severityMap[tSeverity] || 'Rendah',
      foto: tFoto,
      timestamp: reportDate.toISOString(),
      date: reportDate.toISOString().split('T')[0],
      time: tWaktu,
      shift: shift,
      antiFraud: fraudData,
      jabatan: currentUser.jabatan,
      regu: currentUser.regu || ''
    };
    if (online) {
      onAddReport(reportData);
    } else {
      setQueue(p => [...p, { type: 'report', data: reportData }]);
    }
    setTSent(true);
    setTKategori(''); setTTemuan(''); setTSeverity('low'); setTDeskripsi(''); setTFoto(null); setTLokasi('');
    setTWaktu(new Date().toTimeString().slice(0, 5));
    setTimeout(() => setTSent(false), 3000);
  };

  const handleMutasiSubmit = async (e) => {
    e.preventDefault();
    if (!mLokasi.trim()) { setMErrors(p => ({ ...p, lokasi: 'Lokasi wajib diisi!' })); return; }
    if (!mUraian.trim()) { setMErrors(p => ({ ...p, uraian: 'Uraian wajib diisi!' })); return; }
    const fraudData = await generateAntiFraudData(currentUser.id);
    const mutasiData = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      waktu: mJamKejadian,
      tanggalKejadian: todayStr,
      jamKejadian: mJamKejadian,
      lokasi: mLokasi,
      uraian: mUraian,
      kategori: mKat === '__lainnya__' ? `Lainnya: ${mKatLainnya}` : mKat,
      foto: mFoto, petugas: currentUser.nama, nrp: currentUser.nrp,
      tanggal: todayStr, pelapor: currentUser.nama,
      antiFraud: fraudData
    };
    if (online) {
      onAddLog(mutasiData);
    } else {
      setQueue(p => [...p, { type: 'mutasi', data: mutasiData }]);
    }
    setMSent(true);
    setMLokasi(''); setMUraian(''); setMFoto(null); setMKat('informasi'); setMKatLainnya('');
    setMJamKejadian(new Date().toTimeString().slice(0, 5));
    setIsCustomLokasi(false); setMLokasiCustom('');
    setTimeout(() => setMSent(false), 3000);
  };

  // ── Tab: Riwayat ──
  const myReports = reports.filter(r => r.userId === currentUser.id).slice(0, 20);
  const myFindings = findings.filter(f => f.pelapor === currentUser.nama).slice(0, 20);
  const myMutasi = mutasiLogs.filter(m => m.petugas === currentUser.nama).slice(0, 20);
  const [riwayatTab, setRiwayatTab] = useState('patroli');

  const labelSeverity = (v) => ({ low: 'Rendah', medium: 'Sedang', high: 'Tinggi', critical: 'Kritis' })[v] || v;
  const colorSeverity = (v) => ({ low: '#3b82f6', medium: '#f59e0b', high: '#ef4444', critical: '#dc2626' })[v] || '#3b82f6';

  return (
    <div className="mobile-phone-frame">
      <div className="mobile-screen">
        {/* Status Bar */}
        <div className="mobile-status-bar">
          <span>{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
          <button onClick={() => setOnline(!online)} className="mobile-conn-toggle">
            {online ? <Wifi size={12} /> : <WifiOff size={12} />}<span>{online ? 'Online' : 'Offline'}</span>
          </button>
        </div>
        {queue.length > 0 && <div className="offline-badge"><Database size={12} /><span>{queue.length} offline</span></div>}

        {/* Header with SOS */}
        <div className="mobile-header">
          <div style={{ justifySelf: 'start', display: 'flex', alignItems: 'center' }}>
            <img src={logoUrl} alt="" className="mobile-logo logo-3d" onError={() => setLogoUrl('logo.png')} />
          </div>
          <div className="mobile-brand-title" style={{ justifySelf: 'center', textAlign: 'center' }}>
            <h4 className="mobile-app-title" style={{ margin: 0 }}>SMPJDC</h4>
            <p className="mobile-app-sub" style={{ margin: 0 }}>Aplikasi Patroli</p>
          </div>
          <div style={{ justifySelf: 'end', display: 'flex', alignItems: 'center' }}>
            <button onClick={() => onTriggerSOS(currentUser.nama, area?.titik || 'Lobby')} className="sos-btn-small">SOS</button>
          </div>
        </div>

        {/* User info card */}
        <div className="glass-panel step-user-card" style={{ marginBottom: '0.5rem' }}>
          <img src={currentUser.avatar} alt="" className="step-avatar" onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=60'; }} />
          <div>
            <h4>{currentUser.nama}</h4>
            <p className="text-secondary" style={{ fontSize: '0.7rem' }}>NRP: {currentUser.nrp} • {currentUser.jabatan}</p>
          </div>
        </div>

        {/* Empty Plotting Warning Banner */}
        {(!todayLog || (todayLog && !myPlotting)) && (
          <>
            <style>{`
              @keyframes warning-pulse {
                0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                70% { transform: scale(1.02); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
                100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
              }
            `}</style>
            <div style={{
              margin: '0 0.5rem 0.6rem 0.5rem',
              padding: '0.65rem 0.8rem',
              background: !todayLog ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              border: !todayLog ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '8px',
              color: !todayLog ? '#f59e0b' : '#ef4444',
              fontSize: '0.72rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: !todayLog ? '0 0 10px rgba(245, 158, 11, 0.08)' : '0 0 10px rgba(239, 68, 68, 0.08)',
              animation: 'warning-pulse 2s infinite'
            }}>
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, lineHeight: '1.3' }}>
                <span style={{ fontWeight: 800, color: !todayLog ? '#fbbf24' : '#f87171', display: 'block', fontSize: '0.75rem', marginBottom: '0.1rem' }}>
                  {!todayLog ? 'PERINGATAN PLOTTING KOSONG' : 'ANDA TIDAK TERDAFTAR'}
                </span>
                {!todayLog 
                  ? 'Danru belum mengisi absensi & plotting hari ini! Harap hubungi Danru regu Anda untuk konfirmasi shift.' 
                  : 'Nama Anda tidak terdaftar pada plotting hari ini! Silakan hubungi Danru untuk update jadwal.'}
              </div>
            </div>
          </>
        )}

        {/* Tab Navigation */}
        <div className="mobile-tab-bar" style={{ display: 'flex', gap: '0.15rem', marginBottom: '0.75rem', background: 'var(--bg-glass)', borderRadius: '10px', padding: '0.2rem', overflowX: 'auto', flexWrap: 'nowrap', WebkitOverflowScrolling: 'touch' }}>
          <button onClick={() => setTab('home')} className={`mobile-tab ${tab === 'home' ? 'active' : ''}`} style={{
            flex: 1, padding: '0.45rem 0.2rem', fontSize: '0.65rem', fontWeight: 700, border: 'none', borderRadius: '8px', cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            background: tab === 'home' ? 'var(--color-primary)' : 'transparent',
            color: tab === 'home' ? 'white' : 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.15rem', minWidth: '55px'
          }}><Home size={12} /> Home</button>
          <button onClick={() => setTab('presensi')} className={`mobile-tab ${tab === 'presensi' ? 'active' : ''}`} style={{
            flex: 1, padding: '0.45rem 0.2rem', fontSize: '0.65rem', fontWeight: 700, border: 'none', borderRadius: '8px', cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            background: tab === 'presensi' ? 'var(--color-primary)' : 'transparent',
            color: tab === 'presensi' ? 'white' : 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.15rem', minWidth: '55px'
          }}><Clock size={12} /> Presensi</button>
          <button onClick={() => { setTab('patroli'); resetLaporan(); }} className={`mobile-tab ${tab === 'patroli' ? 'active' : ''}`} style={{
            flex: 1, padding: '0.45rem 0.2rem', fontSize: '0.65rem', fontWeight: 700, border: 'none', borderRadius: '8px', cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            background: tab === 'patroli' ? 'var(--color-primary)' : 'transparent',
            color: tab === 'patroli' ? 'white' : 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.15rem', minWidth: '55px'
          }}><QrCode size={12} /> Patroli</button>
          <button onClick={() => setTab('temuan')} className={`mobile-tab ${tab === 'temuan' ? 'active' : ''}`} style={{
            flex: 1, padding: '0.45rem 0.2rem', fontSize: '0.65rem', fontWeight: 700, border: 'none', borderRadius: '8px', cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            background: tab === 'temuan' ? 'var(--color-primary)' : 'transparent',
            color: tab === 'temuan' ? 'white' : 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.15rem', minWidth: '55px'
          }}><AlertTriangle size={12} /> Temuan</button>
          <button onClick={() => setTab('mutasi')} className={`mobile-tab ${tab === 'mutasi' ? 'active' : ''}`} style={{
            flex: 1, padding: '0.45rem 0.2rem', fontSize: '0.65rem', fontWeight: 700, border: 'none', borderRadius: '8px', cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            background: tab === 'mutasi' ? 'var(--color-primary)' : 'transparent',
            color: tab === 'mutasi' ? 'white' : 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.15rem', minWidth: '55px'
          }}><FileText size={12} /> Mutasi</button>
          <button onClick={() => setTab('riwayat')} className={`mobile-tab ${tab === 'riwayat' ? 'active' : ''}`} style={{
            flex: 1, padding: '0.45rem 0.2rem', fontSize: '0.65rem', fontWeight: 700, border: 'none', borderRadius: '8px', cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            background: tab === 'riwayat' ? 'var(--color-primary)' : 'transparent',
            color: tab === 'riwayat' ? 'white' : 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.15rem', minWidth: '55px'
          }}><History size={12} /> Riwayat</button>
        </div>

        {/* ============================================================ */}
        {/* TAB: HOME (MENU UTAMA) */}
        {/* ============================================================ */}
        {tab === 'home' && (
          <div className="tab-home-container animate-fade-in" style={{ padding: '0.2rem 0', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* Welcome Greeting & Active Shift status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Halo, {currentUser.nama}!
                </h3>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', margin: 0 }}>
                  {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
                </p>
              </div>
              <span style={{
                background: clockedStatus === 'in' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                color: clockedStatus === 'in' ? 'var(--color-success)' : 'var(--color-danger)',
                border: clockedStatus === 'in' ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(239,68,68,0.25)',
                fontSize: '0.6rem',
                fontWeight: 800,
                padding: '0.2rem 0.45rem',
                borderRadius: '6px',
                textTransform: 'uppercase'
              }}>
                {clockedStatus === 'in' ? 'Shift Aktif' : 'Belum Absen'}
              </span>
            </div>

            {/* Quick Status / Info Panel */}
            <div className="glass-panel" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Shift Dinas:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{shift}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Plotting Pos:</span>
                <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{myPlotting?.posPlotting || 'Belum Terplotting'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Presensi Masuk:</span>
                <span style={{ fontWeight: 700, color: clockedStatus === 'in' ? 'var(--color-success)' : 'var(--text-muted)' }}>{clockInTime || 'Belum Masuk'}</span>
              </div>
            </div>

            {/* Grid Menu Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              {/* Menu 1: Presensi */}
              <div onClick={() => setTab('presensi')} className="home-menu-card" style={{
                background: 'var(--bg-glass, rgba(255,255,255,0.01))', border: '1px solid var(--border-glass)', borderRadius: '14px', padding: '1rem 0.75rem',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
              }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(124, 58, 237, 0.12)', border: '1px solid rgba(124, 58, 237, 0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa'
                }}><Clock size={20} /></div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-primary)', marginBottom: '0.15rem' }}>Presensi Staff</div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)' }}>Selfie & GPS Absen</div>
                </div>
              </div>

              {/* Menu 2: Patroli */}
              <div onClick={() => { setTab('patroli'); resetLaporan(); }} className="home-menu-card" style={{
                background: 'var(--bg-glass, rgba(255,255,255,0.01))', border: '1px solid var(--border-glass)', borderRadius: '14px', padding: '1rem 0.75rem',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
              }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa'
                }}><QrCode size={20} /></div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-primary)', marginBottom: '0.15rem' }}>Patroli Barcode</div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)' }}>Scan Checkpoint</div>
                </div>
              </div>

              {/* Menu 3: Temuan */}
              <div onClick={() => setTab('temuan')} className="home-menu-card" style={{
                background: 'var(--bg-glass, rgba(255,255,255,0.01))', border: '1px solid var(--border-glass)', borderRadius: '14px', padding: '1rem 0.75rem',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
              }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24'
                }}><AlertTriangle size={20} /></div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-primary)', marginBottom: '0.15rem' }}>Lapor Temuan</div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)' }}>Kerusakan & Kendala</div>
                </div>
              </div>

              {/* Menu 4: Mutasi */}
              <div onClick={() => setTab('mutasi')} className="home-menu-card" style={{
                background: 'var(--bg-glass, rgba(255,255,255,0.01))', border: '1px solid var(--border-glass)', borderRadius: '14px', padding: '1rem 0.75rem',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
              }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171'
                }}><FileText size={20} /></div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-primary)', marginBottom: '0.15rem' }}>Mutasi Jaga</div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)' }}>Log Kejadian Petugas</div>
                </div>
              </div>

              {/* Menu 5: Riwayat */}
              <div onClick={() => setTab('riwayat')} className="home-menu-card" style={{
                background: 'var(--bg-glass, rgba(255,255,255,0.01))', border: '1px solid var(--border-glass)', borderRadius: '14px', padding: '1rem 0.75rem',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
              }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399'
                }}><History size={20} /></div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-primary)', marginBottom: '0.15rem' }}>Riwayat Aktivitas</div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)' }}>Log Absen & Patroli</div>
                </div>
              </div>

              {/* Menu 6: SOS Panggilan */}
              <div onClick={() => onTriggerSOS(currentUser.nama, area?.titik || 'Lobby')} className="home-menu-card-sos" style={{
                background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)', border: '1px solid rgba(220, 38, 38, 0.3)', borderRadius: '14px', padding: '1rem 0.75rem',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', boxShadow: '0 4px 10px rgba(220, 38, 38, 0.1)'
              }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%', background: '#dc2626', border: '2px solid rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 0 10px rgba(220,38,38,0.5)', animation: 'warning-pulse 1.5s infinite'
                }}><Radio size={20} /></div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.78rem', color: '#ef4444', marginBottom: '0.15rem' }}>Panggilan SOS</div>
                  <div style={{ fontSize: '0.62rem', color: '#fca5a5' }}>Picu Alarm Darurat</div>
                </div>
              </div>
            </div>

            <style>{`
              .home-menu-card:hover { background: rgba(255, 255, 255, 0.04) !important; transform: translateY(-2px); }
              .home-menu-card-sos:hover { background: linear-gradient(135deg, rgba(220, 38, 38, 0.25) 0%, rgba(239, 68, 68, 0.08) 100%) !important; transform: translateY(-2px); }
            `}</style>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB: PRESENSI (SI PRESENSI PRO MAX) */}
        {/* ============================================================ */}
        {tab === 'presensi' && (
          <div className="tab-presensi-container animate-fade-in" style={{ padding: '0.1rem 0' }}>
            {/* Back to Home Button */}
            <button onClick={() => setTab('home')} style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)',
              borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', padding: '0.35rem 0.65rem', marginBottom: '0.75rem', width: 'fit-content'
            }}>← Kembali ke Beranda</button>
            {/* Header Title & Mode Badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '0.02em' }}>Presensi Hari Ini</h2>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0 }}>
                  {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              
              {/* Top Warning Badge */}
              <span style={{
                background: clockedStatus === 'in' ? 'rgba(16,185,129,0.15)' : 'rgba(124,58,237,0.15)',
                color: clockedStatus === 'in' ? '#10b981' : '#a78bfa',
                border: clockedStatus === 'in' ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(124,58,237,0.3)',
                fontSize: '0.6rem',
                fontWeight: 800,
                padding: '0.2rem 0.5rem',
                borderRadius: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {clockedStatus === 'in' ? 'Shift Aktif' : 'Belum Absen'}
              </span>
            </div>

            {/* KPI Cards Panel (Rangkuman Hadir) */}
            <div className="glass-panel" style={{ 
              padding: '0.65rem 0.8rem', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '0.75rem', 
              background: 'rgba(255,255,255,0.01)', 
              border: '1px solid var(--border-glass)',
              borderRadius: '8px'
            }}>
              <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem', marginBottom: '0.15rem' }}>
                  Hadir <span style={{ background: '#10b981', color: 'white', width: '12px', height: '12px', borderRadius: '50%', fontSize: '0.52rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>H</span>
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>{attendanceStats.hadir}</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem', marginBottom: '0.15rem' }}>
                  Terlambat <span style={{ background: '#f59e0b', color: 'white', width: '12px', height: '12px', borderRadius: '50%', fontSize: '0.52rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>T</span>
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>{attendanceStats.terlambat}</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem', marginBottom: '0.15rem' }}>
                  Izin <span style={{ background: '#3b82f6', color: 'white', width: '12px', height: '12px', borderRadius: '50%', fontSize: '0.52rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>I</span>
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>{attendanceStats.izin}</div>
              </div>
            </div>

            {/* Main Presensi Panel */}
            <div className="glass-panel" style={{ 
              padding: '0.85rem', 
              background: 'rgba(255,255,255,0.01)', 
              border: '1px solid var(--border-glass)', 
              borderRadius: '10px' 
            }}>
              {scanningPresensi ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ textAlign: 'center', margin: '0.25rem 0' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: '0 0 0.2rem 0', color: 'var(--text-primary)' }}>Pindai QR Presensi Staff</h3>
                    <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', margin: 0 }}>Arahkan kamera ke Barcode Master Presensi di Ruang Staff</p>
                  </div>

                  {/* Video Scanner Container */}
                  <div style={{ position: 'relative', width: '100%', minHeight: '220px', borderRadius: '12px', overflow: 'hidden', background: '#090f1d', border: '2px solid rgba(167, 139, 250, 0.4)', boxShadow: '0 0 20px rgba(167, 139, 250, 0.25)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div id="reader-presensi" style={{ width: '100%', minHeight: '220px', pointerEvents: presensiScanLoading ? 'auto' : 'none' }}></div>
                    
                    {!presensiScanLoading && (
                      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1rem', zIndex: 10 }}>
                        <div style={{ position: 'absolute', top: 15, left: 15, width: 22, height: 22, borderTop: '4px solid #a78bfa', borderLeft: '4px solid #a78bfa' }}></div>
                        <div style={{ position: 'absolute', top: 15, right: 15, width: 22, height: 22, borderTop: '4px solid #a78bfa', borderRight: '4px solid #a78bfa' }}></div>
                        <div style={{ position: 'absolute', bottom: 15, left: 15, width: 22, height: 22, borderBottom: '4px solid #a78bfa', borderLeft: '4px solid #a78bfa' }}></div>
                        <div style={{ position: 'absolute', bottom: 15, right: 15, width: 22, height: 22, borderBottom: '4px solid #a78bfa', borderRight: '4px solid #a78bfa' }}></div>
                        
                        {/* Laser Line */}
                        <div className="cyber-scanner-line" style={{
                          position: 'absolute', left: '10%', right: '10%', height: '3px',
                          background: 'linear-gradient(90deg, transparent, #a78bfa, transparent)',
                          boxShadow: '0 0 10px #a78bfa',
                          animation: 'scan-anim 2.5s linear infinite'
                        }}></div>
                      </div>
                    )}

                    {presensiScanLoading && (
                      <div style={{ zIndex: 5, color: '#a78bfa', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', position: 'absolute' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '3px solid rgba(167,139,250,0.2)', borderTopColor: '#a78bfa', animation: 'spin 0.8s linear infinite' }}></div>
                        <span style={{ fontWeight: 600 }}>Menghidupkan Kamera Absensi...</span>
                      </div>
                    )}
                  </div>

                  {/* Fallback Manual Input for Presensi */}
                  <div className="glass-panel" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)' }}>
                    <label style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>INPUT MANUAL BARCODE PRESENSI</label>
                    <div className="scan-input-group" style={{ display: 'flex', gap: '0.35rem' }}>
                      <input 
                        type="text" 
                        value={presensiBarcodeInput} 
                        onChange={e => { setPresensiBarcodeInput(e.target.value); setPresensiScanError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handlePresensiBarcodeScan()}
                        placeholder="Contoh: JDC-MASTER-PRESENSI" 
                        className="modern-input" 
                        style={{ flex: 1, fontSize: '0.8rem', padding: '0.4rem 0.6rem' }} 
                      />
                      <button onClick={handlePresensiBarcodeScan} className="btn-primary" style={{ padding: '0.4rem 0.8rem', whiteSpace: 'nowrap', fontSize: '0.75rem', fontWeight: 700 }}>
                        Verifikasi
                      </button>
                    </div>
                    {presensiScanError && <div style={{ fontSize: '0.65rem', color: 'var(--color-danger)', marginTop: '0.3rem', fontWeight: 600 }}>⚠️ {presensiScanError}</div>}
                  </div>

                  <button 
                    onClick={() => setScanningPresensi(false)} 
                    className="btn-secondary btn-full"
                    style={{ minHeight: '44px', fontWeight: 700, fontSize: '0.8rem' }}
                  >
                    Kembali
                  </button>
                </div>
              ) : (
                <>
                  <h3 style={{ fontSize: '0.8rem', fontWeight: 700, margin: '0 0 0.65rem 0', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Presensi Masuk/Pulang</h3>

                  {/* Camera Scanner Box */}
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    height: '170px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: '#090d16',
                    border: '1px solid var(--border-glass)',
                    marginBottom: '0.65rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {/* Overlay Header: Title */}
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      background: 'rgba(0,0,0,0.6)',
                      backdropFilter: 'blur(4px)',
                      padding: '0.2rem 0.45rem',
                      borderRadius: '5px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      zIndex: 5,
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.08)'
                    }}>
                      <Camera size={10} />
                      <span>Pengenalan Wajah</span>
                    </div>

                    {/* Overlay Header: Status */}
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: faceRecognized ? '#10b981' : '#f59e0b',
                      padding: '0.2rem 0.45rem',
                      borderRadius: '5px',
                      zIndex: 5,
                      fontWeight: 800,
                      fontSize: '0.58rem',
                      color: '#fff',
                      boxShadow: faceRecognized ? '0 0 8px rgba(16,185,129,0.3)' : 'none'
                    }}>
                      {faceRecognized ? 'Wajah Dikenali' : 'Mencari Wajah...'}
                    </div>

                    {/* Video / Selfie Stream */}
                    {cameraStream ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                      />
                    ) : (
                      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                        <img
                          src={currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'}
                          alt="Selfie"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
                          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'; }}
                        />
                      </div>
                    )}

                    {/* Circular scanner overlay */}
                    <div style={{
                      position: 'absolute',
                      border: faceRecognized ? '2px solid #10b981' : '2px dashed rgba(255,255,255,0.35)',
                      borderRadius: '50%',
                      width: '90px',
                      height: '120px',
                      boxShadow: faceRecognized ? '0 0 15px rgba(16,185,129,0.25)' : 'none',
                      zIndex: 2,
                      pointerEvents: 'none',
                      transition: 'all 0.3s'
                    }} />

                    {/* Scanning animation laser bar */}
                    {!faceRecognized && (
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        width: '100%',
                        height: '2px',
                        background: '#10b981',
                        boxShadow: '0 0 8px #10b981, 0 0 12px #10b981',
                        zIndex: 3,
                        animation: 'laserScan 2.5s infinite linear',
                        pointerEvents: 'none'
                      }} />
                    )}

                    {/* Bounding/Profile Tag */}
                    <div style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      background: 'rgba(0,0,0,0.65)',
                      backdropFilter: 'blur(4px)',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '5px',
                      zIndex: 5,
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      color: '#fff',
                      border: '1px solid rgba(16,185,129,0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      <div style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        background: faceRecognized ? '#10b981' : '#f59e0b',
                        boxShadow: faceRecognized ? '0 0 5px #10b981' : 'none'
                      }} />
                      <span>{currentUser?.nama?.toUpperCase()} {currentUser?.jabatan === 'Admin Super' ? 'GOD MODE' : currentUser?.jabatan?.toUpperCase()}</span>
                    </div>
                  </div>

                  {/* GPS Information Panel */}
                  <div className="glass-panel" style={{
                    padding: '0.6rem 0.75rem',
                    background: 'rgba(0,0,0,0.15)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '6px',
                    marginBottom: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        <MapPin size={11} className="text-primary" />
                        <span>Lokasi Presensi (GPS)</span>
                      </div>
                      <span style={{
                        background: 'rgba(16,185,129,0.1)',
                        color: '#10b981',
                        fontSize: '0.55rem',
                        fontWeight: 800,
                        padding: '0.1rem 0.35rem',
                        borderRadius: '3px',
                        border: '1px solid rgba(16,185,129,0.15)'
                      }}>
                        AMAN
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
                      {/* Rotating/pulsing radar graphics */}
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        border: '1px solid rgba(16,185,129,0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        background: 'rgba(16,185,129,0.01)',
                        flexShrink: 0
                      }}>
                        {/* Outer pulse */}
                        <div style={{
                          position: 'absolute',
                          width: '100%',
                          height: '100%',
                          borderRadius: '50%',
                          border: '1px solid rgba(16,185,129,0.15)',
                          animation: 'radarPulse 2s infinite linear'
                        }} />
                        {/* Inner active marker */}
                        <div style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: '#3b82f6',
                          boxShadow: '0 0 8px #3b82f6',
                          zIndex: 2
                        }} />
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', fontSize: '0.65rem', color: '#10b981', fontWeight: 700 }}>
                          <Check size={9} />
                          <span>Dalam Area Radius</span>
                        </div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '0.05rem' }}>
                          Lat: {gpsLocation.lat.toFixed(4)}, Long: {gpsLocation.lng.toFixed(4)}
                        </div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                          GPS: {gpsLoading ? 'Melacak koordinat...' : 'Terverifikasi (JDC Radius)'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Trigger Buttons */}
                  <div style={{ display: 'flex', gap: '0.45rem' }}>
                    {clockedStatus === 'in' ? (
                      <button
                        onClick={handleSelfClockOut}
                        className="btn-danger"
                        style={{
                          flex: 1,
                          padding: '0.6rem',
                          borderRadius: '6px',
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          cursor: 'pointer',
                          border: 'none',
                          background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                          color: 'white',
                          boxShadow: '0 3px 10px rgba(239,68,68,0.25)'
                        }}
                      >
                        <Clock size={14} />
                        <span>Presensi Pulang</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleSelfClockIn}
                        disabled={!faceRecognized || gpsLoading}
                        style={{
                          flex: 1,
                          padding: '0.6rem',
                          borderRadius: '6px',
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          cursor: (!faceRecognized || gpsLoading) ? 'not-allowed' : 'pointer',
                          border: 'none',
                          background: (!faceRecognized || gpsLoading)
                            ? 'rgba(255,255,255,0.05)'
                            : 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)',
                          color: (!faceRecognized || gpsLoading) ? 'var(--text-muted)' : 'white',
                          boxShadow: (!faceRecognized || gpsLoading) ? 'none' : '0 3px 10px rgba(124,58,237,0.25)',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Clock size={14} />
                        <span>{gpsLoading ? 'Menyambung...' : 'Presensi Masuk'}</span>
                      </button>
                    )}

                    {/* Scan QR Presensi */}
                    <button
                      onClick={() => {
                        hapticMedium();
                        setScanningPresensi(true);
                      }}
                      className="btn-secondary"
                      style={{
                        padding: '0.6rem 0.8rem',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        cursor: 'pointer',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid var(--border-glass)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <QrCode size={14} />
                      <span>Scan QR Presensi</span>
                    </button>
                  </div>
                </>
              )}

              {/* Status details logging */}
              {clockedStatus && (
                <div style={{
                  marginTop: '0.65rem',
                  padding: '0.45rem 0.65rem',
                  background: 'rgba(16,185,129,0.04)',
                  border: '1px solid rgba(16,185,129,0.18)',
                  borderRadius: '5px',
                  fontSize: '0.65rem',
                  color: 'var(--text-secondary)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Masuk:</span>
                    <strong style={{ color: 'var(--color-success)' }}>{clockInTime || '-'}</strong>
                  </div>
                  {clockOutTime && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.15rem' }}>
                      <span>Pulang:</span>
                      <strong style={{ color: 'var(--color-danger)' }}>{clockOutTime}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB: PATROLI */}
        {/* ============================================================ */}
        {tab === 'patroli' && (
          <>
            {step === 1 && (
              <div className="step-login">
                {/* Back to Home Button */}
                <button onClick={() => setTab('home')} style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)',
                  borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', padding: '0.35rem 0.65rem', marginBottom: '0.75rem', width: 'fit-content'
                }}>← Kembali ke Beranda</button>
                <div className="step-login-header">
                  <h3>Mulai Patroli</h3>
                  <p>Scan barcode checkpoint untuk memulai patroli.</p>
                </div>
                {!todayLog && (
                  <div className="glass-panel" style={{ padding: '0.75rem', borderLeft: '3px solid var(--color-warning)', background: 'rgba(245,158,11,0.08)', marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.25rem' }}>
                      <AlertTriangle size={11} /> PLOTTING BELUM DIISI
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0 }}>
                      Danru/Wadanru belum mengisi absensi & plotting untuk hari ini. Hubungi Danru regu Anda.
                    </p>
                  </div>
                )}
                {todayLog && !myPlotting && (
                  <div className="glass-panel" style={{ padding: '0.75rem', borderLeft: '3px solid var(--color-danger)', background: 'rgba(239,68,68,0.08)', marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.25rem' }}>
                      <AlertTriangle size={11} /> ANDA TIDAK TERDAFTAR
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0 }}>
                      Nama Anda tidak ditemukan di absensi & plotting hari ini. Hubungi Danru untuk konfirmasi.
                    </p>
                  </div>
                )}
                {myPlotting && (
                  <div className="glass-panel" style={{ padding: '0.75rem', borderLeft: '3px solid var(--color-success)', background: 'rgba(16,185,129,0.05)' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
                      <Shield size={11} /> PLOTTING AKTIF
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Shift:</span>
                      <span style={{ fontWeight: 700 }}>{todayLog?.shift === 'P' ? 'Pagi' : todayLog?.shift === 'S' ? 'Siang' : todayLog?.shift === 'M' ? 'Malam' : shift}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Pos:</span>
                      <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{myPlotting.posPlotting}</span>
                    </div>
                  </div>
                )}
                <div className="glass-panel" style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-glass)', borderRadius: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>Shift Patroli:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{shift}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>Regu Dinas:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{myPlotting?.regu || currentUser?.regu || 'Regu A'}</strong>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-glass)', paddingTop: '0.25rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Info size={11} /> Shift & Regu terdeteksi otomatis sinkron real-time.
                  </div>
                </div>
                <button onClick={() => setStep(2)} className="btn-primary btn-full">Mulai Scan</button>
              </div>
            )}

            {step === 2 && (
              <div className="step-scan">
                <style>{`
                  @keyframes scan-anim {
                    0% { top: 10%; }
                    50% { top: 90%; }
                    100% { top: 10%; }
                  }
                  @keyframes spin {
                    to { transform: rotate(360deg); }
                  }
                `}</style>
                <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800 }}>Kamera Pemindai Checkpoint</h3>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Arahkan kamera ke QR Code checkpoint</p>
                </div>

                {/* Video Scanner Container */}
                <div style={{ position: 'relative', width: '100%', minHeight: '220px', borderRadius: '12px', overflow: 'hidden', background: '#090f1d', border: '2px solid rgba(59, 130, 246, 0.4)', boxShadow: '0 0 20px rgba(59, 130, 246, 0.25)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                  <div id="reader" style={{ width: '100%', minHeight: '220px', pointerEvents: scanLoading ? 'auto' : 'none' }}></div>
                  
                  {scanning && !scanLoading && (
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1rem', zIndex: 10 }}>
                      <div style={{ position: 'absolute', top: 15, left: 15, width: 22, height: 22, borderTop: '4px solid #00f0ff', borderLeft: '4px solid #00f0ff' }}></div>
                      <div style={{ position: 'absolute', top: 15, right: 15, width: 22, height: 22, borderTop: '4px solid #00f0ff', borderRight: '4px solid #00f0ff' }}></div>
                      <div style={{ position: 'absolute', bottom: 15, left: 15, width: 22, height: 22, borderBottom: '4px solid #00f0ff', borderLeft: '4px solid #00f0ff' }}></div>
                      <div style={{ position: 'absolute', bottom: 15, right: 15, width: 22, height: 22, borderBottom: '4px solid #00f0ff', borderRight: '4px solid #00f0ff' }}></div>
                      
                      {/* Laser Line */}
                      <div className="cyber-scanner-line" style={{
                        position: 'absolute', left: '10%', right: '10%', height: '3px',
                        background: 'linear-gradient(90deg, transparent, #00f0ff, transparent)',
                        boxShadow: '0 0 10px #00f0ff',
                        animation: 'scan-anim 2.5s linear infinite'
                      }}></div>
                    </div>
                  )}

                  {scanLoading && (
                    <div style={{ zIndex: 5, color: '#00f0ff', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', position: 'absolute' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '3px solid rgba(0,240,255,0.2)', borderTopColor: '#00f0ff', animation: 'spin 0.8s linear infinite' }}></div>
                      <span style={{ fontWeight: 600 }}>Menghidupkan Kamera...</span>
                    </div>
                  )}

                  {scanError && (
                    <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12, padding: '0.5rem', background: 'rgba(239, 68, 68, 0.95)', color: 'white', borderRadius: '8px', fontSize: '0.67rem', zIndex: 20, fontWeight: 700, textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.4)' }}>
                      ⚠️ {scanError}
                    </div>
                  )}
                </div>

                {/* Fallback Manual Input */}
                <div className="glass-panel" style={{ padding: '0.75rem', marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>INPUT MANUAL KODE BARCODE</label>
                  <div className="scan-input-group">
                    <input type="text" value={barcodeInput} onChange={e => { setBarcodeInput(e.target.value); setScanError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleBarcodeScan()}
                      placeholder="Cth: JDC-BSMT-B-1" className="modern-input" style={{ flex: 1, fontSize: '0.8rem' }} />
                    <button onClick={handleBarcodeScan} className="btn-primary" style={{ padding: '0.4rem 0.8rem', whiteSpace: 'nowrap', fontSize: '0.75rem', fontWeight: 700 }}><QrCode size={13} /> Scan</button>
                  </div>
                  {scanError && <div style={{ fontSize: '0.65rem', color: 'var(--color-danger)', marginTop: '0.3rem', fontWeight: 600 }}>⚠️ {scanError}</div>}
                </div>

                <div className="step-hint" style={{ marginBottom: '0.4rem' }}><MapPin size={12} style={{ opacity: 0.5 }} /><span>Atau pilih lokasi langsung:</span></div>
                <div className="scan-area-compact-list" style={{ maxHeight: '110px', overflowY: 'auto' }}>
                  {[...areas].sort((a, b) => {
                    const na = parseInt(a.nomorTitik, 10);
                    const nb = parseInt(b.nomorTitik, 10);
                    if (isNaN(na) && isNaN(nb)) return (a.nomorTitik || '').localeCompare(b.nomorTitik || '');
                    if (isNaN(na)) return 1; if (isNaN(nb)) return -1; return na - nb;
                  }).map(a => (
                    <button key={a.id} onClick={() => {
                      setArea(a); setTimeScan(new Date());
                      setMode(null); setKategori(''); setTemuan('');
                      setSeverity('low'); setDeskripsi(''); setFoto(null);
                      setStep(3);
                      setScanning(false);
                    }} className="scan-compact-item" style={{ padding: '0.35rem 0.5rem' }}>
                      <span className="scan-item-qr" style={{ fontSize: '0.62rem' }}>{a.qrCode}</span>
                      <span className="scan-item-name" style={{ fontSize: '0.65rem' }}>{a.titik}</span>
                      <span className="scan-item-floor" style={{ fontSize: '0.6rem' }}>{['1','2','3','4','5','6'].includes(a.lantai) ? `Lt.${a.lantai}` : a.lantai}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => { resetLaporan(); setStep(1); setScanning(false); }} className="btn-secondary btn-full" style={{ marginTop: '0.5rem', padding: '0.5rem' }}>Kembali</button>
              </div>
            )}

            {step === 3 && area && !mode && (
              <div className="step-decision">
                <div className="glass-panel form-location-box">
                  <p className="form-label">CHECKPOINT TERSCAN</p>
                  <h4 className="form-location-name">{area.titik}</h4>
                  <p className="text-secondary form-location-detail">{area.gedung} | {['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17'].includes(area.lantai) ? `Lantai ${area.lantai}` : area.lantai} | Zona: {area.zona}</p>
                  {timeScan && (
                    <div className="form-scan-time" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.6rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.6rem' }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Clock size={12} /> JAM SCAN / PATROLI
                      </label>
                      <input 
                        type="time" 
                        value={timeScan ? timeScan.toTimeString().slice(0, 5) : ''} 
                        onChange={(e) => {
                          if (!e.target.value) return;
                          const [hours, minutes] = e.target.value.split(':');
                          const newDate = new Date(timeScan || new Date());
                          newDate.setHours(parseInt(hours, 10));
                          newDate.setMinutes(parseInt(minutes, 10));
                          setTimeScan(newDate);
                        }} 
                        className="modern-input" 
                        style={{ height: '36px', fontSize: '0.82rem', padding: '0 0.6rem', fontFamily: 'var(--font-mono)' }} 
                      />
                    </div>
                  )}
                </div>
                <p className="decision-label">PILIH STATUS AREA:</p>
                <button onClick={handleNormal} className="decision-btn decision-normal">
                  <ThumbsUp size={32} />
                  <span className="decision-btn-title">NORMAL</span>
                  <span className="decision-btn-sub">Tidak ada temuan</span>
                </button>
                <button onClick={() => setMode('temuan')} className="decision-btn decision-temuan">
                  <AlertTriangle size={32} />
                  <span className="decision-btn-title">TEMUAN</span>
                  <span className="decision-btn-sub">Ada temuan / kendala</span>
                </button>
                <button onClick={() => setStep(2)} className="btn-secondary btn-full" style={{ marginTop: '0.5rem' }}>Kembali</button>
              </div>
            )}

            {step === 3 && area && mode === 'temuan' && (
              <form onSubmit={handleTemuanSubmit} className="step-form">
                <div className="glass-panel form-location-box">
                  <p className="form-label">LOKASI CHECKPOINT</p>
                  <h4 className="form-location-name">{area.titik}</h4>
                  <p className="text-secondary form-location-detail">{['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17'].includes(area.lantai) ? `Lantai ${area.lantai}` : area.lantai} | Zona: {area.zona}</p>
                  {timeScan && <div className="form-scan-time"><Clock size={12} /><span>{timeScan.toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'})} WIB</span></div>}
                </div>
                <div className="glass-panel form-section">
                  <h5 className="form-section-title"><AlertTriangle size={14} /> FORM TEMUAN</h5>
                  <div className="step-field">
                    <label>KATEGORI</label>
                    <select value={kategori} onChange={e => setKategori(e.target.value)} className="modern-select" required>
                      <option value="">-- Pilih --</option>
                      {kategoriData.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                    </select>
                  </div>
                  <div className="step-field">
                    <label>JENIS TEMUAN</label>
                    <select value={temuan} onChange={e => setTemuan(e.target.value)} className="modern-select" disabled={!kategori} required>
                      <option value="">-- Pilih --</option>
                      {daftarTemuan.map(t => <option key={t.kode} value={t.kode}>[{t.kode}] {t.nama}</option>)}
                    </select>
                  </div>
                  <div className="step-field">
                    <label>SEVERITY</label>
                    <div className="severity-grid">
                      {['low','medium','high','critical'].map(s => (
                        <button key={s} type="button" onClick={() => setSeverity(s)}
                          className={`severity-btn ${severity === s ? 'active' : ''}`}
                          style={{
                            '--c': colorSeverity(s), borderColor: severity === s ? colorSeverity(s) : 'var(--border-glass)',
                            background: severity === s ? `${colorSeverity(s)}1A` : 'transparent',
                            color: severity === s ? colorSeverity(s) : 'var(--text-secondary)'
                          }}>
                          {labelSeverity(s)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="step-field">
                    <label>DESKRIPSI</label>
                    <textarea value={deskripsi} onChange={e => setDeskripsi(e.target.value)} className="modern-input form-textarea" rows={3} placeholder="Jelaskan temuan..." />
                  </div>
                  <div className="step-field">
                    <label>FOTO</label>
                    {foto ? <div className="photo-preview"><img src={foto} alt="" /><button type="button" onClick={() => setFoto(null)} className="photo-remove">X</button></div>
                      : <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <label className="photo-upload-btn"><Camera size={14} /> 📷 Kamera
                            <input type="file" accept="image/*" capture="environment" onChange={e => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onloadend = () => { compressImage(r.result).then(compressed => setFoto(compressed)); }; r.readAsDataURL(f); } e.target.value = ''; }} hidden />
                          </label>
                          <label className="photo-upload-btn" style={{ background: 'rgba(255,255,255,0.04)' }}><Camera size={14} /> 🖼 Galeri
                            <input type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onloadend = () => { compressImage(r.result).then(compressed => setFoto(compressed)); }; r.readAsDataURL(f); } e.target.value = ''; }} hidden />
                          </label>
                        </div>}
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" onClick={() => setMode(null)} className="btn-secondary" style={{ flex: 1 }}>Kembali</button>
                  <button type="submit" className="btn-primary" style={{ flex: 2, opacity: kategori && temuan ? 1 : 0.5 }} disabled={!kategori || !temuan}>Kirim Laporan</button>
                </div>
              </form>
            )}

            {step === 4 && (
              <div className="step-success">
                <div className="success-icon-wrap"><Check size={40} /></div>
                <h3>Laporan Terkirim!</h3>
                <p className="text-secondary">Data patroli tercatat di Dashboard Monitoring.</p>
                <div className="glass-panel success-summary">
                  <div className="success-row"><span className="text-secondary">Lokasi:</span><span className="fw-700">{area?.titik}</span></div>
                  <div className="success-row"><span className="text-secondary">Status:</span>
                    <span className="fw-700" style={{ color: mode === 'temuan' ? 'var(--color-warning)' : 'var(--color-success)' }}>
                      {mode === 'temuan' ? 'Temuan' : 'Normal'}
                    </span>
                  </div>
                  {mode === 'temuan' && (
                    <>
                      <div className="success-row"><span className="text-secondary">Temuan:</span><span className="fw-700">{daftarTemuan.find(t => t.kode === temuan)?.nama || '-'}</span></div>
                      <div className="success-row"><span className="text-secondary">Severity:</span><span className="fw-700" style={{ color: colorSeverity(severity) }}>{labelSeverity(severity)}</span></div>
                    </>
                  )}
                </div>
                <button onClick={() => { resetLaporan(); setStep(2); }} className="btn-primary btn-full">Scan Checkpoint Berikutnya</button>
                <button onClick={() => { resetLaporan(); }} className="btn-secondary btn-full">Selesai Patroli</button>
              </div>
            )}
          </>
        )}

        {/* ============================================================ */}
        {/* TAB: TEMUAN (Standalone) */}
        {/* ============================================================ */}
        {tab === 'temuan' && (
          <div className="step-form">
            {tSent && (
              <div style={{ textAlign: 'center', padding: '1.5rem 1rem', background: 'rgba(16,185,129,0.08)', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.2)' }}>
                <Check size={36} style={{ color: 'var(--color-success)', marginBottom: '0.5rem' }} />
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-success)' }}>Temuan Terkirim!</h4>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Laporan temuan berhasil disimpan ke Dashboard.</p>
                <button onClick={() => { setTSent(false); setTKategori(''); setTTemuan(''); setTSeverity('low'); setTDeskripsi(''); setTFoto(null); setTLokasi(''); }} className="btn-secondary btn-full" style={{ marginTop: '0.75rem' }}>
                  Buat Temuan Baru
                </button>
              </div>
            )}
            {!tSent && (
              <form onSubmit={handleTemuanStandaloneSubmit}>
                {/* Back to Home Button */}
                <button type="button" onClick={() => setTab('home')} style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)',
                  borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', padding: '0.35rem 0.65rem', marginBottom: '0.75rem', width: 'fit-content'
                }}>← Kembali ke Beranda</button>
                <div className="glass-panel form-section">
                  <h5 className="form-section-title"><AlertTriangle size={14} /> FORM TEMUAN / KENDALA</h5>
                  
                  <div className="step-field">
                    <label>LOKASI / AREA</label>
                    <select value={tLokasi} onChange={e => setTLokasi(e.target.value)} className="modern-select" required>
                      <option value="">-- Pilih Area --</option>
                      {areas.map(a => (
                        <option key={a.id} value={`${a.titik} (${a.zona} - ${['1','2','3','4','5','6'].includes(a.lantai) ? `Lt.${a.lantai}` : a.lantai})`}>
                          {a.titik} — {a.qrCode}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="step-field">
                    <label><Clock size={12} /> WAKTU TEMUAN / KEJADIAN</label>
                    <input type="time" value={tWaktu} onChange={e => setTWaktu(e.target.value)} className="modern-input" required />
                  </div>

                  <div className="step-field">
                    <label>KATEGORI</label>
                    <select value={tKategori} onChange={e => setTKategori(e.target.value)} className="modern-select" required>
                      <option value="">-- Pilih --</option>
                      {kategoriData.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                    </select>
                  </div>

                  <div className="step-field">
                    <label>JENIS TEMUAN</label>
                    <select value={tTemuan} onChange={e => setTTemuan(e.target.value)} className="modern-select" disabled={!tKategori} required>
                      <option value="">-- Pilih Detail Temuan --</option>
                      {(tKategori ? (kategoriData.find(k => k.id === tKategori)?.items || []) : []).map(t => (
                        <option key={t.kode} value={t.kode}>[{t.kode}] {t.nama}</option>
                      ))}
                    </select>
                  </div>

                  <div className="step-field">
                    <label>SEVERITY</label>
                    <div className="severity-grid">
                      {['low','medium','high','critical'].map(s => (
                        <button key={s} type="button" onClick={() => setTSeverity(s)}
                          className={`severity-btn ${tSeverity === s ? 'active' : ''}`}
                          style={{
                            '--c': colorSeverity(s), borderColor: tSeverity === s ? colorSeverity(s) : 'var(--border-glass)',
                            background: tSeverity === s ? `${colorSeverity(s)}1A` : 'transparent',
                            color: tSeverity === s ? colorSeverity(s) : 'var(--text-secondary)'
                          }}>
                          {labelSeverity(s)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="step-field">
                    <label>DESKRIPSI</label>
                    <textarea value={tDeskripsi} onChange={e => setTDeskripsi(e.target.value)} className="modern-input form-textarea" rows={3} placeholder="Jelaskan temuan / kendala..." />
                  </div>

                  <div className="step-field">
                    <label>FOTO</label>
                    {tFoto ? <div className="photo-preview"><img src={tFoto} alt="" /><button type="button" onClick={() => setTFoto(null)} className="photo-remove">X</button></div>
                      : <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <label className="photo-upload-btn"><Camera size={14} /> 📷 Kamera
                            <input type="file" accept="image/*" capture="environment" onChange={e => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onloadend = () => { compressImage(r.result).then(compressed => setTFoto(compressed)); }; r.readAsDataURL(f); } e.target.value = ''; }} hidden />
                          </label>
                          <label className="photo-upload-btn" style={{ background: 'rgba(255,255,255,0.04)' }}><Camera size={14} /> 🖼 Galeri
                            <input type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onloadend = () => { compressImage(r.result).then(compressed => setTFoto(compressed)); }; r.readAsDataURL(f); } e.target.value = ''; }} hidden />
                          </label>
                        </div>}
                  </div>
                </div>
                <button type="submit" className="btn-primary btn-full" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                  <Send size={16} /> Kirim Temuan
                </button>
              </form>
            )}

            {/* Riwayat temuan terbaru */}
            {myFindings.length > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <h5 style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <History size={13} /> Riwayat Temuan Saya
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {myFindings.slice(0, 5).map(f => (
                    <div key={f.id} className="glass-panel" style={{ padding: '0.5rem 0.65rem', fontSize: '0.7rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 700 }}>{f.kategori}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{new Date(f.tanggal).toLocaleDateString('id-ID')}</span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>📍 {f.area}</div>
                      <div style={{ color: 'var(--text-primary)', marginTop: '0.15rem' }}>{f.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB: MUTASI */}
        {/* ============================================================ */}
        {tab === 'mutasi' && (
          <div className="step-form">
            {mSent && (
              <div style={{ textAlign: 'center', padding: '1.5rem 1rem', background: 'rgba(16,185,129,0.08)', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.2)' }}>
                <Check size={36} style={{ color: 'var(--color-success)', marginBottom: '0.5rem' }} />
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-success)' }}>Mutasi Terkirim!</h4>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Catatan mutasi berhasil disimpan.</p>
                <button onClick={() => { setMSent(false); setMLokasi(''); setMUraian(''); setMFoto(null); setTab('home'); }} className="btn-secondary btn-full" style={{ marginTop: '0.75rem' }}>
                  Kembali ke Beranda
                </button>
              </div>
            )}

            {!mSent && (
              <>
                {/* Back to Home Button */}
                <button type="button" onClick={() => setTab('home')} style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)',
                  borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', padding: '0.35rem 0.65rem', marginBottom: '0.75rem', width: 'fit-content'
                }}>← Kembali ke Beranda</button>
                <div className="glass-panel form-section">
                  <h5 className="form-section-title"><FileText size={14} /> FORM MUTASI / KEJADIAN</h5>

                  <div className="step-field">
                    <label>KATEGORI</label>
                    <div className="mutasi-kategori-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.45rem' }}>
                      {KATEGORI_MUTASI.map(k => (
                        <button key={k.id} type="button" onClick={() => { setMKat(k.id); if (k.id !== '__lainnya__') setMKatLainnya(''); }}
                          className={`mutasi-kat-btn ${mKat === k.id ? 'active' : ''}`}
                          style={{
                            padding: '0.5rem 0.25rem', borderRadius: '8px', fontSize: '0.72rem',
                            border: `1.5px solid ${mKat === k.id ? k.color : 'var(--border-glass)'}`,
                            background: mKat === k.id ? `${k.color}1A` : 'transparent',
                            color: mKat === k.id ? k.color : 'var(--text-secondary)',
                            fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
                            width: '100%', minWidth: 0
                          }}>{k.label}</button>
                      ))}
                    </div>
                    {mKat === '__lainnya__' && (
                      <input type="text" value={mKatLainnya} onChange={e => setMKatLainnya(e.target.value)}
                        placeholder="Ketik kategori lain..." className="modern-input" style={{ marginTop: '0.4rem', fontSize: '0.8rem' }} />
                    )}
                  </div>

                  <div className="step-field">
                    <label>LOKASI / POS JAGA</label>
                    {!isCustomLokasi ? (
                      <select value={mLokasi} onChange={e => {
                        const val = e.target.value;
                        if (val === '__custom__') {
                          setIsCustomLokasi(true);
                          setMLokasi('');
                        } else {
                          setMLokasi(val);
                          setMErrors(p => ({ ...p, lokasi: '' }));
                        }
                      }} className="modern-select" required>
                        <option value="">-- Pilih Pos Jaga --</option>
                        {posList.map(p => <option key={p.id} value={p.titik}>{p.titik}</option>)}
                        <option value="__custom__">-- Lainnya (Ketik Manual) --</option>
                      </select>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <input type="text" value={mLokasiCustom} onChange={e => {
                          setMLokasiCustom(e.target.value);
                          setMLokasi(e.target.value);
                          setMErrors(p => ({ ...p, lokasi: '' }));
                        }} placeholder="Ketik lokasi manual..." className="modern-input" style={{ fontSize: '0.8rem' }} required />
                        <button type="button" onClick={() => { setIsCustomLokasi(false); setMLokasiCustom(''); setMLokasi(''); }}
                          style={{ alignSelf: 'flex-start', fontSize: '0.72rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0', textDecoration: 'underline', minHeight: '36px', touchAction: 'manipulation' }}>
                          ← Kembali ke pilihan pos
                        </button>
                      </div>
                    )}
                    {mErrors.lokasi && <span style={{ fontSize: '0.65rem', color: 'var(--color-danger)' }}>{mErrors.lokasi}</span>}
                  </div>

                  <div className="step-field">
                    <label><Clock size={12} /> JAM KEJADIAN</label>
                    <input type="time" value={mJamKejadian} onChange={e => setMJamKejadian(e.target.value)} className="modern-input" required />
                  </div>

                  <div className="step-field">
                    <label>URAIAN KEJADIAN</label>
                    <textarea value={mUraian} onChange={e => { setMUraian(e.target.value); setMErrors(p => ({ ...p, uraian: '' })); }}
                      placeholder="Jelaskan kejadian secara detail..." className="modern-input" style={{ height: '80px', resize: 'vertical', fontSize: '0.8rem', padding: '0.5rem' }} />
                    {mErrors.uraian && <span style={{ fontSize: '0.65rem', color: 'var(--color-danger)' }}>{mErrors.uraian}</span>}
                  </div>

                  <div className="step-field">
                    <label>FOTO <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(opsional)</span></label>
                    {mFoto ? <div className="photo-preview"><img src={mFoto} alt="" /><button type="button" onClick={() => setMFoto(null)} className="photo-remove">X</button></div>
                      : <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <label className="photo-upload-btn"><Camera size={14} /> 📷 Kamera
                            <input type="file" accept="image/*" capture="environment" onChange={e => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onloadend = () => { compressImage(r.result).then(compressed => setMFoto(compressed)); }; r.readAsDataURL(f); } e.target.value = ''; }} hidden />
                          </label>
                          <label className="photo-upload-btn" style={{ background: 'rgba(255,255,255,0.04)' }}><Camera size={14} /> 🖼 Galeri
                            <input type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onloadend = () => { compressImage(r.result).then(compressed => setMFoto(compressed)); }; r.readAsDataURL(f); } e.target.value = ''; }} hidden />
                          </label>
                        </div>}
                  </div>
                </div>

                <button onClick={handleMutasiSubmit} className="btn-primary btn-full" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                  <Send size={16} /> Kirim Mutasi
                </button>
              </>
            )}

            {/* Riwayat mutasi terbaru */}
            {myMutasi.length > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <h5 style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <History size={13} /> Riwayat Mutasi Terbaru
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {myMutasi.slice(0, 5).map(m => (
                    <div key={m.id} className="glass-panel" style={{ padding: '0.5rem 0.65rem', fontSize: '0.7rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 700 }}>{m.kategori}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{m.tanggal} {m.waktu}</span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>{m.lokasi}</div>
                      <div style={{ color: 'var(--text-primary)', marginTop: '0.15rem' }}>{m.uraian}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB: RIWAYAT */}
        {/* ============================================================ */}
        {tab === 'riwayat' && (
          <div>
            {/* Back to Home Button */}
            <button onClick={() => setTab('home')} style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)',
              borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', padding: '0.35rem 0.65rem', marginBottom: '0.75rem', width: 'fit-content'
            }}>← Kembali ke Beranda</button>
            {/* Sub-tab: Patroli / Temuan / Mutasi */}
            <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.75rem', background: 'var(--bg-glass)', borderRadius: '8px', padding: '0.15rem' }}>
              {[
                { id: 'patroli', label: 'Patroli', icon: MapPin },
                { id: 'temuan', label: 'Temuan', icon: AlertTriangle },
                { id: 'mutasi', label: 'Mutasi', icon: FileText }
              ].map(st => (
                <button key={st.id} onClick={() => setRiwayatTab(st.id)} style={{
                  flex: 1, padding: '0.35rem 0.2rem', fontSize: '0.62rem', fontWeight: 700,
                  border: 'none', borderRadius: '6px', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  background: riwayatTab === st.id ? 'var(--color-primary)' : 'transparent',
                  color: riwayatTab === st.id ? 'white' : 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem'
                }}><st.icon size={11} /> {st.label}</button>
              ))}
            </div>

            {/* Riwayat Patroli */}
            {riwayatTab === 'patroli' && (
              <>
                {myReports.length === 0 ? (
                  <div className="empty-state" style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    <MapPin size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                    <p>Belum ada laporan patroli.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {myReports.map(r => (
                      <div key={r.id} className="glass-panel" style={{ padding: '0.55rem 0.65rem', fontSize: '0.7rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                          <span style={{ fontWeight: 700 }}>{r.titik}</span>
                          <span style={{ color: r.status === 'normal' ? 'var(--color-success)' : 'var(--color-warning)', fontWeight: 600, fontSize: '0.6rem' }}>
                            {r.status === 'normal' ? 'NORMAL' : 'TEMUAN'}
                          </span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>
                          {r.gedung} • {['1','2','3','4','5','6'].includes(r.lantai) ? `Lt.${r.lantai}` : r.lantai} • {r.shift}
                        </div>
                        {r.keterangan && <div style={{ marginTop: '0.2rem', color: 'var(--text-primary)' }}>{r.keterangan}</div>}
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem', marginTop: '0.15rem' }}>
                          {r.timestamp ? new Date(r.timestamp).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Riwayat Temuan */}
            {riwayatTab === 'temuan' && (
              <>
                {myFindings.length === 0 ? (
                  <div className="empty-state" style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    <AlertTriangle size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                    <p>Belum ada temuan.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {myFindings.map(f => (
                      <div key={f.id} className="glass-panel" style={{ padding: '0.55rem 0.65rem', fontSize: '0.7rem', borderLeft: `3px solid ${f.severity === 'Kritis' ? '#dc2626' : f.severity === 'Tinggi' ? '#ef4444' : f.severity === 'Sedang' ? '#f59e0b' : '#3b82f6'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700 }}>{f.kategori}</span>
                          <span style={{
                            fontSize: '0.55rem', padding: '0.1rem 0.3rem', borderRadius: '4px', fontWeight: 700,
                            background: f.status === 'Open' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                            color: f.status === 'Open' ? 'var(--color-danger)' : 'var(--color-success)'
                          }}>{f.status}</span>
                        </div>
                        <div style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.65rem' }}>{f.area}</div>
                        {f.detail && <div style={{ marginTop: '0.15rem', color: 'var(--text-primary)' }}>{f.detail}</div>}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem', color: 'var(--text-muted)', fontSize: '0.6rem' }}>
                          <span>{f.severity}</span>
                          <span>{f.tanggal ? new Date(f.tanggal).toLocaleString('id-ID', { dateStyle: 'short' }) : '-'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Riwayat Mutasi */}
            {riwayatTab === 'mutasi' && (
              <>
                {myMutasi.length === 0 ? (
                  <div className="empty-state" style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    <FileText size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                    <p>Belum ada catatan mutasi.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {myMutasi.map(m => (
                      <div key={m.id} className="glass-panel" style={{ padding: '0.55rem 0.65rem', fontSize: '0.7rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700 }}>{m.kategori}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>{m.tanggal} {m.waktu}</span>
                        </div>
                        <div style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.65rem' }}>{m.lokasi}</div>
                        <div style={{ marginTop: '0.15rem', color: 'var(--text-primary)' }}>{m.uraian}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Plotting Assignment Alarm Overlay */}
        {showPlottingModal && myPlotting && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(9, 15, 29, 0.96)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px'
          }}>
            <div className="glass-panel" style={{
              width: '100%',
              maxWidth: '280px',
              padding: '1.75rem 1.25rem',
              textAlign: 'center',
              border: '2px solid var(--color-primary)',
              boxShadow: '0 0 25px rgba(59, 130, 246, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                width: '55px',
                height: '55px',
                borderRadius: '50%',
                background: 'rgba(59, 130, 246, 0.15)',
                border: '2px solid var(--color-primary)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px rgba(59, 130, 246, 0.3)',
                animation: 'pulse 1.5s infinite'
              }}>
                <Shield size={28} />
              </div>
              
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'white', marginBottom: '0.2rem' }}>PLOTTING DITERIMA!</h3>
                <p style={{ fontSize: '0.67rem', color: 'var(--text-secondary)' }}>Danru telah memperbarui plotting penugasan Anda.</p>
              </div>

              <div className="glass-panel" style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(255,255,255,0.02)',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                fontSize: '0.75rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Shift:</span>
                  <strong style={{ color: 'white' }}>{todayLog?.shift === 'P' ? 'Pagi' : todayLog?.shift === 'S' ? 'Siang' : todayLog?.shift === 'M' ? 'Malam' : 'Khusus'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Jam Dinas:</span>
                  <strong style={{ color: 'white' }}>{myPlotting.jamDinas}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Pos Jaga:</span>
                  <strong style={{ color: 'var(--color-primary)', fontSize: '0.8rem' }}>📍 {myPlotting.posPlotting}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Status Jaga:</span>
                  <span className="badge badge-info" style={{ fontSize: '0.6rem', padding: '0.1rem 0.3rem' }}>{myPlotting.status}</span>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setShowPlottingModal(false)}
                className="btn-primary" 
                style={{ width: '100%', padding: '0.65rem', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Terima Tugas & Standby
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}