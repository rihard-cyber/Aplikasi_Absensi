/**
 * =======================================================
 *   SMPJDC SECURITY MANAGEMENT SYSTEM
 *   Module: Main Application Entry (App.jsx)
 *   Signed by: Richard Meha (by -Richard)
 *   Last Maintained: 2026-06-07
 *   Description: Main orchestrator of JDC management dashboard,
 *                complaints sync, and safe localStorage handler.
 * =======================================================
 */

import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import './jdc_style.css';
import { initRipple } from './utils/ripple.js';
initRipple();
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Geolocation } from '@capacitor/geolocation';
import { Camera as CapCamera } from '@capacitor/camera';
import { executeBackHandlers } from './utils/navigation';
import { hashPin, verifyPin, validateSession, signUserData, verifyUserDataSignature, signRoleInSession, verifyRoleInSession } from './utils/security';
import { isSupabaseConfigured } from './utils/supabaseConfig';
import { compressImage } from './utils/image';
import db from './utils/db';
import { hapticLight } from './utils/haptics';
import ErrorBoundary from './components/ErrorBoundary';
import { initSupabase,
  subscribeComplaints, addComplaintToFirestore, updateComplaintInFirestore, deleteComplaintFromFirestore,
  subscribeReports, addReportToFirestore, updateReportInFirestore, deleteReportFromFirestore,
  subscribeFindings, addFindingToFirestore, updateFindingInFirestore, deleteFindingFromFirestore,
  subscribeAttendanceLogs, addAttendanceLogToFirestore, updateAttendanceLogInFirestore, deleteAttendanceLogFromFirestore,
  subscribeMutasiLogs, addMutasiLogToFirestore, updateMutasiLogInFirestore, deleteMutasiLogFromFirestore,
  subscribeUsers, addUserToFirestore, updateUserInFirestore, deleteUserFromFirestore, resetUsersInFirestore,
  subscribeAreas, addAreaToFirestore, updateAreaInFirestore, deleteAreaFromFirestore,
  subscribePosList, addPosToFirestore, updatePosInFirestore, deletePosFromFirestore,
  subscribeWAContacts, saveWAContactsToFirestore,
  clearAllPatrolDataInFirestore, deleteOldDataInFirestore, uploadPhoto } from './utils/supabase';
import { 
  LayoutDashboard, 
  QrCode, 
  FileSpreadsheet, 
  Smartphone, 
  Building,
  Target,
  LogOut,
  Shield,
  Menu,
  X,
  BookOpen,
  Users,
  Sun,
  Moon,
  ClipboardList,
  Mail,
  MessageSquare,
  Check,
  Key,
  FileText,
  Database,
  Camera,
  Lock,
  Calendar,
  Wifi,
  WifiOff,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import ReportsExport from './components/ReportsExport';
import TargetDashboard from './components/TargetDashboard';
import LoginPage from './components/LoginPage';
import MutasiPenjagaan from './components/MutasiPenjagaan';
import UserManagement from './components/UserManagement';
import AbsensiRegu from './components/AbsensiRegu';
import RosterManagement from './components/RosterManagement';
import LaporForm from './components/LaporForm';
import BackupRestore from './components/BackupRestore';
import ComplaintForm from './components/ComplaintForm';
import BottomNav from './components/BottomNav';
import ConfirmModal from './components/ConfirmModal';
import INITIAL_POS_LIST from './data/posList';

const ManagementDashboard = lazy(() => import('./components/ManagementDashboard'));
const SecurityPatrolApp = lazy(() => import('./components/SecurityPatrolApp'));
const BarcodeGenerator = lazy(() => import('./components/BarcodeGenerator'));
const ComplaintAdmin = lazy(() => import('./components/ComplaintAdmin'));

const DB_VERSION_KEY = 'smpjdc_db_version';
const CURRENT_DB_VERSION = '5.2-stable';

const INITIAL_AREAS = [
  { id: 'bsmt-b-1',  gedung: 'SMPJDC - Jakarta Design Center', lantai: 'Basement',          nomorTitik: '1',  zona: 'B',              titik: 'Depan R. Elektrik',                 qrCode: 'JDC-BSMT-B-1' },
  { id: 'bsmt-a-2',  gedung: 'SMPJDC - Jakarta Design Center', lantai: 'Basement',          nomorTitik: '2',  zona: 'A',              titik: 'R. Ganti Pakaian Security',          qrCode: 'JDC-BSMT-A-2' },
  { id: 'l1-a-3',    gedung: 'SMPJDC - Jakarta Design Center', lantai: '1',                 nomorTitik: '3',  zona: 'A',              titik: 'Tangga Sudut BNI 46',               qrCode: 'JDC-LT01-A-3' },
  { id: 'l1-b-4',    gedung: 'SMPJDC - Jakarta Design Center', lantai: '1',                 nomorTitik: '4',  zona: 'B',              titik: 'Tangga Sudut Gardu PLN',            qrCode: 'JDC-LT01-B-4' },
  { id: 'l2-b-5',    gedung: 'SMPJDC - Jakarta Design Center', lantai: '2',                 nomorTitik: '5',  zona: 'B',              titik: 'Tangga Sudut Pantry',               qrCode: 'JDC-LT02-B-5' },
  { id: 'l2-a-6',    gedung: 'SMPJDC - Jakarta Design Center', lantai: '2',                 nomorTitik: '6',  zona: 'A',              titik: 'Tangga Sudut BNI 46',               qrCode: 'JDC-LT02-A-6' },
  { id: 'l3-a-7',    gedung: 'SMPJDC - Jakarta Design Center', lantai: '3',                 nomorTitik: '7',  zona: 'A',              titik: 'Tangga Sudut Staff Security',       qrCode: 'JDC-LT03-A-7' },
  { id: 'l3-b-8',    gedung: 'SMPJDC - Jakarta Design Center', lantai: '3',                 nomorTitik: '8',  zona: 'B',              titik: 'Tangga Sudut Gardu PLN',            qrCode: 'JDC-LT03-B-8' },
  { id: 'l4-b-9',    gedung: 'SMPJDC - Jakarta Design Center', lantai: '4',                 nomorTitik: '9',  zona: 'B',              titik: 'Tangga Sudut Pantry',               qrCode: 'JDC-LT04-B-9' },
  { id: 'l4-a-10',   gedung: 'SMPJDC - Jakarta Design Center', lantai: '4',                 nomorTitik: '10', zona: 'A',              titik: 'Tangga Sudut BNI 46',               qrCode: 'JDC-LT04-A-10' },
  { id: 'l5-b-11',   gedung: 'SMPJDC - Jakarta Design Center', lantai: '5',                 nomorTitik: '11', zona: 'B',              titik: 'Tangga Sudut Gardu PLN',            qrCode: 'JDC-LT05-B-11' },
  { id: 'l5-a-12',   gedung: 'SMPJDC - Jakarta Design Center', lantai: '5',                 nomorTitik: '12', zona: 'A',              titik: 'Tangga Sudut R. Rapat JDC OFFICE Office', qrCode: 'JDC-LT05-A-12' },
  { id: 'l6-a-13',   gedung: 'SMPJDC - Jakarta Design Center', lantai: '6',                 nomorTitik: '13', zona: 'A',              titik: 'Tangga Sudut Mushola',              qrCode: 'JDC-LT06-A-13' },
  { id: 'l6-b-14',   gedung: 'SMPJDC - Jakarta Design Center', lantai: '6',                 nomorTitik: '14', zona: 'B',              titik: 'Depan Gudang Banquet / R.Carnition', qrCode: 'JDC-LT06-B-14' },
  { id: 'hd-c-15',   gedung: 'SMPJDC - Jakarta Design Center', lantai: 'Halaman Depan',     nomorTitik: '15', zona: 'C',              titik: 'Coridor IAI DKI',                   qrCode: 'JDC-HD-C-15' },
  { id: 'hd-a-16',   gedung: 'SMPJDC - Jakarta Design Center', lantai: 'Halaman Depan',     nomorTitik: '16', zona: 'A',              titik: 'Ruang Chiller',                     qrCode: 'JDC-HD-A-16' },
  { id: 'hd-lobby-17', gedung: 'SMPJDC - Jakarta Design Center', lantai: 'Halaman Depan',   nomorTitik: '17', zona: 'Lobby',           titik: 'Luar ATM Bank Mandiri',              qrCode: 'JDC-HD-LOBBY-17' },
  { id: 'hd-hd-18',  gedung: 'SMPJDC - Jakarta Design Center', lantai: 'Halaman Depan',     nomorTitik: '18', zona: 'Halaman Depan',    titik: 'Pos Keluar',                        qrCode: 'JDC-HD-HD-18' },
  { id: 'hd-hd-19',  gedung: 'SMPJDC - Jakarta Design Center', lantai: 'Halaman Depan',     nomorTitik: '19', zona: 'Halaman Depan',    titik: 'Pos Masuk',                         qrCode: 'JDC-HD-HD-19' },
  { id: 'hskn-a-20', gedung: 'SMPJDC - Jakarta Design Center', lantai: 'Halaman Samping Kanan', nomorTitik: '20', zona: 'A',              titik: 'Tiang Canopy Basement',             qrCode: 'JDC-HSKN-A-20' },
  { id: 'hskn-ps-21', gedung: 'SMPJDC - Jakarta Design Center', lantai: 'Halaman Samping Kanan', nomorTitik: '21', zona: 'Posco Security',   titik: 'Posco OO',                          qrCode: 'JDC-HSKN-PS-21' },
  { id: 'hskn-pt-22', gedung: 'SMPJDC - Jakarta Design Center', lantai: 'Halaman Samping Kanan', nomorTitik: '22', zona: 'Petugas Teknik',   titik: 'R. Teknik',                         qrCode: 'JDC-HSKN-PT-22' },
  { id: 'hb-hb-23',  gedung: 'SMPJDC - Jakarta Design Center', lantai: 'Halaman Belakang',  nomorTitik: '23', zona: 'Halaman Belakang',  titik: 'Tembok Belakang Gardu Genset',       qrCode: 'JDC-HB-HB-23' },
  { id: 'hb-hb-24',  gedung: 'SMPJDC - Jakarta Design Center', lantai: 'Halaman Belakang',  nomorTitik: '24', zona: 'Halaman Belakang',  titik: 'Tembok Ujung Parkir Motor',          qrCode: 'JDC-HB-HB-24' },
  { id: 'hb-hb-25',  gedung: 'SMPJDC - Jakarta Design Center', lantai: 'Halaman Belakang',  nomorTitik: '25', zona: 'Halaman Belakang',  titik: 'Tembok Depan Gardu PLN',            qrCode: 'JDC-HB-HB-25' },
  { id: 'hb-hb-26',  gedung: 'SMPJDC - Jakarta Design Center', lantai: 'Halaman Belakang',  nomorTitik: '26', zona: 'Halaman Belakang',  titik: 'Kantin Belakang',                    qrCode: 'JDC-HB-HB-26' },
  { id: 'hb-lp-27',  gedung: 'SMPJDC - Jakarta Design Center', lantai: 'Halaman Belakang',  nomorTitik: '27', zona: 'Lapangan Padel',     titik: 'Lap Padel I',                       qrCode: 'JDC-HB-LP-27' },
  { id: 'hb-lp-28',  gedung: 'SMPJDC - Jakarta Design Center', lantai: 'Halaman Belakang',  nomorTitik: '28', zona: 'Lapangan Padel',     titik: 'Lap Padel II',                      qrCode: 'JDC-HB-LP-28' },
  { id: 'hb-ap-29',  gedung: 'SMPJDC - Jakarta Design Center', lantai: 'Halaman Belakang',  nomorTitik: '29', zona: 'Area Padel',         titik: 'Pintu Padel',                       qrCode: 'JDC-HB-AP-29' },
  { id: 'hskr-b-30', gedung: 'SMPJDC - Jakarta Design Center', lantai: 'Halaman Samping Kiri', nomorTitik: '30', zona: 'B',              titik: 'Kopi Tuku',                         qrCode: 'JDC-HSKR-B-30' },
];

const INITIAL_REPORTS = [];
const INITIAL_FINDINGS = [];

// ── SUPERADMIN FALLBACK ────────────────────────────────────────────────────────
// Hanya digunakan jika localStorage DAN Firebase sama-sama kosong (instalasi baru)
// BUKAN data default yang dimunculkan ke semua browser
const BASE_USERS = [
  { id: 1, nrp: '10001', nama: 'Richard', jabatan: 'Admin Super', regu: '',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=60',
    status: 'Aktif', email: '' }
];

// NRP daftar akun sistem yang tidak boleh dihapus
const SYSTEM_NRPS = new Set(BASE_USERS.map(u => u.nrp));


const mapDepartment = (kategori, temuanText = '') => {
  const text = (kategori + ' ' + temuanText).toLowerCase();
  const wordMatch = (words) => {
    const escaped = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return new RegExp('\\b(' + escaped.join('|') + ')\\b', 'i').test(text);
  };
  if (wordMatch(['ahu', 'chiller', 'lift', 'eskalator', 'listrik', 'pipa', 'lampu', 'teknik', 'bocor', 'rusak', 'fasilitas'])) {
    return 'Teknisi';
  }
  if (wordMatch(['kotor', 'sampah', 'bersih', 'basah', 'cleaning', 'toilet', 'jamban', 'bau', 'aroma'])) {
    return 'Cleaning';
  }
  return 'Keamanan';
};

// [NEW COMPONENT] DeveloperWatermarkBackground
// [NEW COMPONENT] DeveloperWatermarkBackground (Optimized with hardware-accelerated CSS animations)
function DeveloperWatermarkBackground({ theme = 'dark' }) {
  return (
    <div className={`watermark-bg-container theme-${theme}`}>
      <style>{`
        .watermark-bg-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
          user-select: none;
        }
        @keyframes watermark-drift {
          0% { transform: translate3d(5vw, 5vh, 0); }
          25% { transform: translate3d(45vw, 15vh, 0); }
          50% { transform: translate3d(10vw, 60vh, 0); }
          75% { transform: translate3d(48vw, 40vh, 0); }
          100% { transform: translate3d(5vw, 5vh, 0); }
        }
        .ukiran-watermark {
          position: fixed;
          left: 0;
          top: 0;
          animation: watermark-drift 60s ease-in-out infinite;
          text-align: center;
          font-family: 'Consolas', monospace;
          pointer-events: none;
          user-select: none;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          width: 340px;
          padding: 1rem;
          border-radius: 12px;
          transition: all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        
        .theme-dark .ukiran-watermark {
          color: #00ffff;
          box-shadow: inset 0 0 15px rgba(0, 255, 255, 0.15);
          border: 1px solid rgba(0, 255, 255, 0.2);
          background: rgba(13, 19, 36, 0.45);
          opacity: 0.12;
        }
        .theme-dark .ukiran-logo-text {
          color: #00ffff;
          font-size: 1.45rem;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
          -webkit-text-stroke: 0.6px rgba(0, 0, 0, 0.8);
        }
        .theme-dark .ukiran-sub-text {
          font-size: 0.75rem;
          letter-spacing: 0.22em;
          color: #c7d2fe;
          font-weight: bold;
          -webkit-text-stroke: 0.3px rgba(0, 0, 0, 0.5);
        }
        .theme-dark .ukiran-ornament-top, .theme-dark .ukiran-ornament-bottom {
          font-size: 1.05rem;
          color: #00ffff;
          letter-spacing: 0.1em;
          font-weight: bold;
          -webkit-text-stroke: 0.6px rgba(0, 0, 0, 0.8);
        }

        .theme-light .ukiran-watermark {
          color: #1e3a8a;
          box-shadow: inset 0 0 12px rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.15);
          background: rgba(255, 255, 255, 0.5);
          opacity: 0.08;
        }
        .theme-light .ukiran-logo-text {
          color: #1e3a8a;
          font-size: 1.45rem;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-shadow: 0 0 8px rgba(59, 130, 246, 0.3);
          -webkit-text-stroke: 0.6px rgba(255, 255, 255, 0.9);
        }
        .theme-light .ukiran-sub-text {
          font-size: 0.75rem;
          letter-spacing: 0.22em;
          color: #2563eb;
          font-weight: bold;
          -webkit-text-stroke: 0.3px rgba(255, 255, 255, 0.7);
        }
        .theme-light .ukiran-ornament-top, .theme-light .ukiran-ornament-bottom {
          font-size: 1.05rem;
          color: #2563eb;
          letter-spacing: 0.1em;
          font-weight: bold;
          -webkit-text-stroke: 0.6px rgba(255, 255, 255, 0.9);
        }

        .login-page {
          background: transparent !important;
        }

        @media (max-width: 768px) {
          .ukiran-watermark {
            width: 260px;
            padding: 0.5rem;
          }
          .theme-dark .ukiran-logo-text, .theme-light .ukiran-logo-text {
            font-size: 1.15rem;
            letter-spacing: 0.12em;
          }
          .theme-dark .ukiran-sub-text, .theme-light .ukiran-sub-text {
            font-size: 0.65rem;
            letter-spacing: 0.12em;
          }
          .theme-dark .ukiran-ornament-top, .theme-dark .ukiran-ornament-bottom,
          .theme-light .ukiran-ornament-top, .theme-light .ukiran-ornament-bottom {
            font-size: 0.85rem;
          }
          @keyframes watermark-drift {
            0% { transform: translate3d(5vw, 5vh, 0); }
            25% { transform: translate3d(25vw, 15vh, 0); }
            50% { transform: translate3d(5vw, 55vh, 0); }
            75% { transform: translate3d(28vw, 35vh, 0); }
            100% { transform: translate3d(5vw, 5vh, 0); }
          }
        }
      `}</style>
      <div className="ukiran-watermark">
        <div className="ukiran-ornament-top">
          ◤━━━━ ❖ ━━━━◥
        </div>
        <div className="ukiran-logo-text">DEVELOPER: RICHARD MEHA</div>
        <div className="ukiran-sub-text">★ JDC SECURITY CORE ARCHITECT ★</div>
        <div className="ukiran-ornament-bottom">
          ◣━━━━ ❖ ━━━━◢
        </div>
      </div>
    </div>
  );
}

// [NEW COMPONENT] OrnamentalWatermark (Safe, responsive watermark signature)
export function OrnamentalWatermark() {
  return (
    <div className="ornamental-watermark">
      <span className="ornament-line"></span>
      <span className="ornament-symbol">❁❀❁</span>
      <span className="watermark-text">Developer Richard Meha</span>
      <span className="ornament-symbol">❁❀❁</span>
      <span className="ornament-line"></span>
    </div>
  );
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [hasUsers, setHasUsers] = useState(true);
  const [firebaseUsersLoaded, setFirebaseUsersLoaded] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [cyberLogs, setCyberLogs] = useState([]);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('BOOTING...');
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSOS, setActiveSOS] = useState(null);
  const [toasts, setToasts] = useState([]);
  const toastTimers = useRef({});
  const [sosAudio, setSosAudio] = useState(null);
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    return () => {
      Object.values(toastTimers.current).forEach(clearTimeout);
      toastTimers.current = {};
    };
  }, []);

  // Request native permissions on mount for camera and GPS to prevent crashes and enable auto-start
  useEffect(() => {
    const initNativePermissions = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          // Check/Request Camera permission
          const cameraStatus = await CapCamera.checkPermissions();
          if (cameraStatus.camera !== 'granted') {
            await CapCamera.requestPermissions();
          }
          // Check/Request Location permission
          const locationStatus = await Geolocation.checkPermissions();
          if (locationStatus.location !== 'granted') {
            await Geolocation.requestPermissions();
          }
        } catch (e) {
          console.warn('[Permissions] Failed to initialize native permissions:', e);
        }
      }
    };
    initNativePermissions();
  }, []);

  useEffect(() => {
    if (authenticated) {
      document.body.classList.add('dashboard-active');
      document.documentElement.classList.add('dashboard-active');
    } else {
      document.body.classList.remove('dashboard-active');
      document.documentElement.classList.remove('dashboard-active');
    }
    return () => {
      document.body.classList.remove('dashboard-active');
      document.documentElement.classList.remove('dashboard-active');
    };
  }, [authenticated]);

  // Profile & Email Verification State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [verifStep, setVerifStep] = useState('idle'); // idle | send | verify | done
  const [newEmail, setNewEmail] = useState('');
  const [verifCode, setVerifCode] = useState('');
  const [verifSentCode, setVerifSentCode] = useState('');
  const [verifMethod, setVerifMethod] = useState('email');
  const [verifLoading, setVerifLoading] = useState(false);
  const [verifError, setVerifError] = useState('');

  // Custom Profile Update States
  const [tempAvatar, setTempAvatar] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [activeProfileTab, setActiveProfileTab] = useState('info'); // info | photo | pin | email
  const [editingWA, setEditingWA] = useState(false);
  const [editWAValue, setEditWAValue] = useState('');

  useEffect(() => {
    if (showProfileModal && currentUser) {
      setTempAvatar(currentUser.avatar || '');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setProfileError('');
      setProfileSuccess('');
      setActiveProfileTab('info');
      setNewEmail(currentUser.email || '');
      setVerifStep('idle');
      setVerifError('');
    }
  }, [showProfileModal, currentUser]);

  // Real network detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addToast('Koneksi internet tersambung kembali', 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      addToast('Koneksi internet terputus! Data mungkin tidak tersimpan', 'danger');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSendVerification = () => {
    if (!newEmail.includes('@') || !newEmail.includes('.')) {
      setVerifError('Masukkan alamat email yang valid');
      return;
    }
    setVerifError('');
    setVerifLoading(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setTimeout(() => {
      setVerifSentCode(code);
      setVerifStep('verify');
      setVerifLoading(false);
      addToast(`Kode verifikasi telah dikirim ke ${verifMethod === 'email' ? 'email' : 'WhatsApp'}`, 'success');
    }, 800);
  };

  const handleVerifyCode = () => {
    if (verifCode === verifSentCode) {
      setVerifStep('done');
      const updatedUsers = users.map(u =>
        u.id === currentUser.id ? { ...u, email: newEmail } : u
      );
      setUsers(updatedUsers);
      setCurrentUser(prev => ({ ...prev, email: newEmail }));
      localStorage.setItem('sapujagat_users', JSON.stringify(updatedUsers));
      signUserData(updatedUsers);
      addToast('Email berhasil diperbarui!', 'success');
    } else {
      setVerifError('Kode verifikasi salah. Coba lagi.');
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem('sapujagat_users');
    const users = stored ? JSON.parse(stored) : null;
    const hasExistingUsers = Array.isArray(users) && users.length > 0;

    // If Firebase configured but localStorage empty (e.g. incognito), assume users exist
    if (!hasExistingUsers && isSupabaseConfigured()) {
      setHasUsers(true);
      return;
    }

    // Anti-tamper: verifikasi signature data user
    if (hasExistingUsers) {
      const valid = verifyUserDataSignature(users);
      if (!valid) {
        console.warn('[Security] Data user telah dimanipulasi! Menghapus session.');
        localStorage.removeItem('smpjdc_session');
        localStorage.removeItem('sapujagat_users_sig');
        setHasUsers(false);
        setAuthenticated(false);
        return;
      }
    }
    setHasUsers(hasExistingUsers);

    const sessionStr = localStorage.getItem('smpjdc_session');
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        if (validateSession(session)) {
          const userList = hasExistingUsers ? users : [];
          const found = userList.find(u => u.id === session.userId);
          if (found) {
            // Anti-tamper: verifikasi role dalam session
            if (session.roleToken && !verifyRoleInSession(found.id, found.jabatan, session.roleToken)) {
              console.warn('[Security] Role user telah dimanipulasi! Logout paksa.');
              localStorage.removeItem('smpjdc_session');
              setAuthenticated(false);
              return;
            }
            setCurrentUser(found);
            setAuthenticated(true);
            setShowSplash(true);
            
            // Restore last active route from last_route, default to guard/dashboard
            const lastRoute = localStorage.getItem('smpjdc_last_route');
            const defaultTab = ['Danru', 'Wadanru', 'Anggota'].includes(found.jabatan) ? 'guard-simulator' : 'dashboard';
            const initialTab = lastRoute && lastRoute !== 'jdc' ? lastRoute : defaultTab;
            
            setCurrentTab(initialTab);
            localStorage.setItem('smpjdc_last_route', initialTab);
            return;
          }
        }
      } catch (e) {
        localStorage.removeItem('smpjdc_session');
      }
    }
    setAuthenticated(false);
  }, []);

  // Sync tab state when browser popstate triggers (e.g. Back button in browser/PWA)
  useEffect(() => {
    const handlePopState = () => {
      if (executeBackHandlers()) {
        window.history.pushState(null, '', window.location.href);
        return;
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const clearSOS = React.useCallback(() => {
    if (sosAudio) {
      try {
        sosAudio.stop();
      } catch (e) {}
      setSosAudio(null);
    }
    setActiveSOS(null);
  }, [sosAudio]);

  // Handle Android back button natively (Capacitor WebView)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let backButtonSub;
    try {
      backButtonSub = CapApp.addListener('backButton', () => {
        // 1. Run custom back handlers (modals inside sub-components)
        if (executeBackHandlers()) {
          return;
        }

        // 2. Handle overlays in App.jsx itself
        if (showProfileModal) {
          setShowProfileModal(false);
          setVerifStep('idle');
          setVerifError('');
          return;
        }

        if (activeSOS) {
          clearSOS();
          return;
        }

        // 3. If on home/dashboard tab, show exit confirmation modal
        const defaultTab = currentUser && ['Danru', 'Wadanru', 'Anggota'].includes(currentUser.jabatan) 
          ? 'guard-simulator' 
          : 'dashboard';
          
        if (currentTab === defaultTab) {
          setShowExitConfirm(true);
        } else {
          // 4. Otherwise, go back in history
          window.history.back();
        }
      });
    } catch (e) {
      console.warn("Gagal menambahkan listener tombol back native:", e);
    }

    return () => {
      if (backButtonSub) {
        backButtonSub.then(sub => sub.remove()).catch(() => {});
      }
    };
  }, [currentUser, currentTab, showProfileModal, activeSOS, sosAudio, clearSOS]);

  // Splash screen effect
  useEffect(() => {
    if (!showSplash) return;
    const allLogs = [
      '>> INITIALIZING SMPJDC SECURITY SYSTEM...',
      '>> LOAD SYSTEM DRIVER: anti_fraud_gps.sys ... OK',
      '>> CONNECTING CENTRAL DATABASE DIRECTORY...',
      '>> VERIFYING ACCESS PRIVILEGES... BY_RICHARDMEHA',
      '>> SYNCING TENANT TARGETS & FLOOR MAPS...',
      '>> DEPLOYING OFFLINE TRANSACTION CACHE...',
      '>> INTRUSION DETECTION SYSTEM: SHIELD ACTIVE',
      '>> PROTOCOL STACK STABILIZED... SECURE',
      '>> BOOT COMPLETED: SMPJDC IS READY!'
    ];

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return Math.min(prev + Math.floor(Math.random() * 8) + 4, 100);
      });
    }, 120);

    let logIndex = 0;
    const logInterval = setInterval(() => {
      if (logIndex < allLogs.length) {
        setCyberLogs(prev => [...prev, allLogs[logIndex]]);
        logIndex++;
      } else {
        clearInterval(logInterval);
      }
    }, 320);

    const statusInterval = setInterval(() => {
      setProgress(p => {
        if (p < 30) setStatusText('BOOTING CORE...');
        else if (p < 65) setStatusText('CALIBRATING SENSORS...');
        else if (p < 90) setStatusText('DECRYPTING INTERFACE...');
        else {
          setStatusText('SECURE & OPERATIONAL');
          clearInterval(statusInterval);
        }
        return p;
      });
    }, 200);

    const timer = setTimeout(() => setShowSplash(false), 3500);
    return () => {
      clearInterval(progressInterval);
      clearInterval(logInterval);
      clearInterval(statusInterval);
      clearTimeout(timer);
    };
  }, [showSplash]);

  const [theme, setTheme] = useState(() => localStorage.getItem('smpjdc_theme') || 'dark');
  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('smpjdc_theme', next);
      return next;
    });
  };

  useEffect(() => {
    const setStatusBarStyle = async () => {
      try {
        const { StatusBar } = await import('@capacitor/status-bar');
        if (theme === 'dark') {
          await StatusBar.setStyle({ style: 'DARK' });
          await StatusBar.setBackgroundColor({ color: '#0f172a' });
        } else {
          await StatusBar.setStyle({ style: 'LIGHT' });
          await StatusBar.setBackgroundColor({ color: '#ffffff' });
        }
      } catch (_) {}
    };
    setStatusBarStyle();
  }, [theme]);

  // ── Inisialisasi Users: Prioritaskan localStorage → Firebase fallback ──────────
  // BASE_USERS HANYA digunakan jika localStorage benar-benar kosong (install baru)
  // Data real 51 user yang sudah diinput TIDAK akan tertimpa dummy
  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem('sapujagat_users');
      const parsed = saved ? JSON.parse(saved) : null;

      if (Array.isArray(parsed) && parsed.length > 0) {
        // ✅ Ada data real di localStorage — pakai sepenuhnya, abaikan BASE_USERS
        // Hanya normalize PIN
        parsed.forEach(u => {
          const stored = localStorage.getItem(`smpjdc_pin_${u.id}`);
          if (stored && !stored.startsWith('h')) {
            localStorage.setItem(`smpjdc_pin_${u.id}`, hashPin(stored));
          }
          delete u.pin;
          // Auto-init PIN jika belum ada (default = NRP)
          if (!localStorage.getItem(`smpjdc_pin_${u.id}`)) {
            localStorage.setItem(`smpjdc_pin_${u.id}`, hashPin(u.nrp || String(u.id)));
          }
        });
        // Pastikan superadmin ada (jangan sampai terkunci)
        const hasSuperAdmin = parsed.some(u => SYSTEM_NRPS.has(u.nrp));
        if (!hasSuperAdmin) {
          BASE_USERS.forEach(bu => {
            parsed.unshift(bu);
            if (!localStorage.getItem(`smpjdc_pin_${bu.id}`)) {
              localStorage.setItem(`smpjdc_pin_${bu.id}`, hashPin(bu.nrp));
            }
          });
        }
        localStorage.setItem('sapujagat_users', JSON.stringify(parsed));
        signUserData(parsed);
        return parsed;
      }

      // ❌ localStorage kosong — gunakan BASE_USERS sebagai seed minimal
      BASE_USERS.forEach(bu => {
        if (!localStorage.getItem(`smpjdc_pin_${bu.id}`)) {
          localStorage.setItem(`smpjdc_pin_${bu.id}`, hashPin(bu.nrp));
        }
      });
      localStorage.setItem('sapujagat_users', JSON.stringify(BASE_USERS));
      signUserData(BASE_USERS);
      return [...BASE_USERS];
    } catch (e) {
      return [...BASE_USERS];
    }
  });


  const [areas, setAreas] = useState(() => {
    try {
      const saved = localStorage.getItem('sapujagat_areas');
      const parsed = saved ? JSON.parse(saved) : null;
      const initialIds = new Set(INITIAL_AREAS.map(a => a.id));
      const merged = [...INITIAL_AREAS];
      if (Array.isArray(parsed)) {
        parsed.forEach(area => {
          if (!initialIds.has(area.id)) {
            merged.push(area);
          }
        });
      }
      localStorage.setItem('sapujagat_areas', JSON.stringify(merged));
      localStorage.setItem(DB_VERSION_KEY, CURRENT_DB_VERSION);
      return merged;
    } catch (e) {
      return INITIAL_AREAS;
    }
  });

  const [posList, setPosList] = useState(() => {
    try {
      const saved = localStorage.getItem('smpjdc_pos_list');
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      localStorage.setItem('smpjdc_pos_list', JSON.stringify(INITIAL_POS_LIST));
      return INITIAL_POS_LIST;
    } catch (e) {
      return INITIAL_POS_LIST;
    }
  });

  const [reports, setReports] = useState(() => {
    try {
      const saved = localStorage.getItem('sapujagat_reports');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_REPORTS;
    } catch (e) {
      return INITIAL_REPORTS;
    }
  });

  const [findings, setFindings] = useState(() => {
    try {
      const saved = localStorage.getItem('sapujagat_findings');
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(f => ({
          ...f,
          department: f.department || mapDepartment(f.kategori, f.detail || ''),
          waStatus: f.waStatus || 'Belum Dikirim'
        }));
      }
      return INITIAL_FINDINGS;
    } catch (e) {
      return INITIAL_FINDINGS;
    }
  });

  const [mutasiLogs, setMutasiLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('smpjdc_mutasi_logs');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });

  const [attendanceLogs, setAttendanceLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('smpjdc_attendance_logs');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });

  const [complaints, setComplaints] = useState(() => {
    try {
      const saved = localStorage.getItem('smpjdc_complaints');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [syncTrigger, setSyncTrigger] = useState(0);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);

  const checkOfflineQueue = () => {
    const keys = ['smpjdc_complaints', 'sapujagat_reports', 'sapujagat_findings', 'smpjdc_attendance_logs', 'smpjdc_mutasi_logs'];
    let total = 0;
    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const items = JSON.parse(raw);
          const unsynced = items.filter(item => !item.supabaseId && !item.firebaseId).length;
          total += unsynced;
        }
      } catch (e) {}
    }
    setOfflineQueueCount(total);
  };

  useEffect(() => {
    checkOfflineQueue();
    const interval = setInterval(checkOfflineQueue, 3000);
    return () => clearInterval(interval);
  }, []);

  const persistState = (key, data) => {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (_) {}
    db.set(key, data);
  };

  useEffect(() => {
    try {
      localStorage.setItem('sapujagat_users', JSON.stringify(users));
      signUserData(users);
      
      // Auto-initialize PINs for all users synced from Firebase/local who don't have one in localStorage
      if (Array.isArray(users)) {
        users.forEach(u => {
          const stored = localStorage.getItem(`smpjdc_pin_${u.id}`);
          if (!stored) {
            localStorage.setItem(`smpjdc_pin_${u.id}`, hashPin(u.nrp));
          } else if (stored && !stored.startsWith('h')) {
            localStorage.setItem(`smpjdc_pin_${u.id}`, hashPin(stored));
          }
        });
      }
    } catch (e) {
      console.error('Failed to save users to localStorage', e);
    }
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem('sapujagat_areas', JSON.stringify(areas));
    } catch (e) {
      console.error('Failed to save areas to localStorage', e);
    }
  }, [areas]);

  useEffect(() => {
    try {
      localStorage.setItem('smpjdc_pos_list', JSON.stringify(posList));
    } catch (e) {
      console.error('Failed to save pos list to localStorage', e);
    }
  }, [posList]);

  useEffect(() => { persistState('sapujagat_reports', reports); }, [reports]);
  useEffect(() => { persistState('sapujagat_findings', findings); }, [findings]);
  useEffect(() => { persistState('smpjdc_mutasi_logs', mutasiLogs); }, [mutasiLogs]);
  useEffect(() => { persistState('smpjdc_attendance_logs', attendanceLogs); }, [attendanceLogs]);

  useEffect(() => {
    try {
      localStorage.setItem('smpjdc_complaints', JSON.stringify(complaints));
    } catch (e) {
      console.warn('[Complaint] Gagal sync ke localStorage:', e);
    }
  }, [complaints]);

  // Firebase real-time subscription untuk complaints
  useEffect(() => {
    const db = initSupabase();
    if (!db) return;

    const unsub = subscribeComplaints((firebaseData) => {
      if (!firebaseData) return;
      setComplaints(prev => {
        const merged = [...firebaseData];
        prev.forEach(local => {
          const exists = merged.find(m => m.id === local.id || (m.firebaseId && m.firebaseId === local.firebaseId));
          if (!exists && merged.length < 500) merged.push(local);
        });
        try { localStorage.setItem('smpjdc_complaints', JSON.stringify(merged)); } catch (e) {}
        return merged;
      });
    }, { limit: 500 });
    return () => unsub();
  }, []);

  // Firebase real-time subscription untuk patrol reports
  useEffect(() => {
    const db = initSupabase();
    if (!db) return;
    const unsub = subscribeReports((firebaseData) => {
      if (!firebaseData) return;
      setReports(prev => {
        const merged = [...firebaseData];
        prev.forEach(local => {
          const exists = merged.find(m => m.id === local.id || (m.firebaseId && m.firebaseId === local.firebaseId));
          if (!exists && merged.length < 500) merged.push(local);
        });
        try { localStorage.setItem('sapujagat_reports', JSON.stringify(merged)); } catch (e) {}
        return merged;
      });
    }, { limit: 500 });
    return () => unsub();
  }, []);

  // Firebase real-time subscription untuk findings
  useEffect(() => {
    const db = initSupabase();
    if (!db) return;
    const unsub = subscribeFindings((firebaseData) => {
      if (!firebaseData) return;
      setFindings(prev => {
        const merged = [...firebaseData];
        prev.forEach(local => {
          const exists = merged.find(m => m.id === local.id || (m.firebaseId && m.firebaseId === local.firebaseId));
          if (!exists && merged.length < 500) merged.push(local);
        });
        persistState('sapujagat_findings', merged);
        return merged;
      });
    }, { limit: 500 });
    return () => unsub();
  }, []);

  // Firebase real-time subscription untuk attendance logs
  useEffect(() => {
    const db = initSupabase();
    if (!db) return;
    const unsub = subscribeAttendanceLogs((firebaseData) => {
      if (!firebaseData) return;
      setAttendanceLogs(prev => {
        const merged = [...firebaseData];
        prev.forEach(local => {
          const exists = merged.find(m => m.id === local.id || (m.firebaseId && m.firebaseId === local.firebaseId));
          if (!exists && merged.length < 500) merged.push(local);
        });
        try { localStorage.setItem('smpjdc_attendance_logs', JSON.stringify(merged)); } catch (e) {}
        return merged;
      });
    }, { limit: 500 });
    return () => unsub();
  }, []);

  // Firebase real-time subscription untuk mutasi logs
  useEffect(() => {
    const db = initSupabase();
    if (!db) return;
    const unsub = subscribeMutasiLogs((firebaseData) => {
      if (!firebaseData) return;
      setMutasiLogs(prev => {
        const merged = [...firebaseData];
        prev.forEach(local => {
          const exists = merged.find(m => m.id === local.id || (m.firebaseId && m.firebaseId === local.firebaseId));
          if (!exists && merged.length < 500) merged.push(local);
        });
        try { localStorage.setItem('smpjdc_mutasi_logs', JSON.stringify(merged)); } catch (e) {}
        return merged;
      });
    }, { limit: 500 });
    return () => unsub();
  }, []);

  // Firebase real-time subscription untuk users
  // ⚠️ PENTING: Firebase data TIDAK boleh hapus user lokal yang ada
  // Firebase hanya MENAMBAH / MEMPERBARUI user yang sudah ada
  useEffect(() => {
    const db = initSupabase();
    if (!db) { setFirebaseUsersLoaded(true); return; }
    const unsub = subscribeUsers((firebaseData) => {
      if (!firebaseData || !Array.isArray(firebaseData)) { setFirebaseUsersLoaded(true); return; }
      setUsers(prev => {
        // Buat map dari Firebase berdasarkan id & nrp
        const fbMap = new Map();
        firebaseData.forEach(u => {
          if (u.id) fbMap.set(String(u.id), u);
          if (u.nrp) fbMap.set(`nrp_${u.nrp}`, u);
        });

        // Mulai dari data lokal (prev) — Supabase hanya update/tambah
        const merged = prev.map(u => ({ ...u }));

        firebaseData.forEach(fbUser => {
          const existingByNrp = merged.findIndex(u => u.nrp && u.nrp === fbUser.nrp);
          const existingById = merged.findIndex(u => String(u.id) === String(fbUser.id));
          const existingByFbId = merged.findIndex(u => u.firebaseId && u.firebaseId === fbUser.firebaseId);

          const idx = existingByFbId !== -1 ? existingByFbId 
                    : existingByNrp !== -1 ? existingByNrp
                    : existingById !== -1 ? existingById : -1;

          if (idx !== -1) {
            // Update user yang sudah ada — preserve data lokal yang lebih baru
            merged[idx] = {
              ...fbUser,
              ...merged[idx],            // data lokal menang untuk field yang ada
              firebaseId: fbUser.firebaseId || merged[idx].firebaseId,
              lastActive: fbUser.lastActive || merged[idx].lastActive,
            };
          } else {
            // User baru dari Firebase yang belum ada di lokal — tambahkan
            merged.push(fbUser);
          }
        });

        try {
          localStorage.setItem('sapujagat_users', JSON.stringify(merged));
          signUserData(merged);
        } catch (e) {}
        return merged;
      });
      setFirebaseUsersLoaded(true);
    }, { limit: 1000 });
    return () => unsub();
  }, []);

  // Upload semua user lokal ke Firestore yang belum punya firebaseId
  // Menggunakan batched upload dengan delay agar tidak rate-limit
  useEffect(() => {
    if (!firebaseUsersLoaded) return;
    let cancelled = false;

    const uploadMissing = async () => {
      if (cancelled) return;
      const currentUsers = JSON.parse(localStorage.getItem('sapujagat_users') || '[]');
      const missing = currentUsers.filter(u => !u.supabaseId);
      if (missing.length === 0) return;

      console.log(`[Supabase] Mengupload ${missing.length} user yang belum tersync...`);

      // Upload satu per satu dengan delay 300ms agar tidak flood Firebase
      for (let i = 0; i < missing.length; i++) {
        if (cancelled) break;
        const u = missing[i];
        try {
          const fid = await addUserToFirestore({ ...u, pin: undefined, shift: undefined });
          if (fid && !cancelled) {
            setUsers(p => {
              const updated = p.map(x => x.id === u.id ? { ...x, supabaseId: fid, firebaseId: fid } : x);
              try { localStorage.setItem('sapujagat_users', JSON.stringify(updated)); } catch(e) {}
              return updated;
            });
          }
        } catch(e) {
          console.warn('[Firebase] Gagal upload user:', u.nama, e);
        }
        // Delay antar upload untuk hindari rate limit
        if (i < missing.length - 1) {
          await new Promise(r => setTimeout(r, 300));
        }
      }
      // Retry setelah 30 detik jika masih ada yang gagal
      if (!cancelled) {
        setTimeout(uploadMissing, 30000);
      }
    };

    uploadMissing();
    return () => { cancelled = true; };
  }, [firebaseUsersLoaded]);


  // Firebase real-time subscription untuk areas/checkpoints
  useEffect(() => {
    const db = initSupabase();
    if (!db) return;
    const unsub = subscribeAreas((firebaseData) => {
      if (!firebaseData) return;
      setAreas(prev => {
        const fbMap = new Map(firebaseData.map(fb => [fb.id, fb]));
        const initialIds = new Set(INITIAL_AREAS.map(a => a.id));
        const merged = INITIAL_AREAS.map(a => {
          const fbMatch = fbMap.get(a.id);
          return fbMatch ? { ...a, firebaseId: fbMatch.firebaseId } : a;
        });
        firebaseData.forEach(fb => {
          if (!initialIds.has(fb.id)) {
            merged.push(fb);
          }
        });
        const fbIds = new Set(firebaseData.map(fb => fb.id));
        prev.forEach(local => {
          if (!initialIds.has(local.id) && !fbIds.has(local.id)) {
            if (merged.length < 500) merged.push(local);
          }
        });
        try {
          localStorage.setItem('sapujagat_areas', JSON.stringify(merged));
        } catch (e) {}
        return merged;
      });
    }, { limit: 500 });
    return () => unsub();
  }, []);

  // Upload area lokal yang belum tersimpan ke Firestore (dengan retry otomatis)
  useEffect(() => {
    if (!firebaseUsersLoaded) return;
    let cancelled = false;
    let retryTimer;

    const uploadMissing = () => {
      if (cancelled) return;
      setAreas(prev => {
        const missing = prev.filter(a => !a.firebaseId);
        if (missing.length === 0) return prev;
        missing.forEach(a => {
          addAreaToFirestore(a).then(fid => {
            if (fid && !cancelled) {
              setAreas(p => p.map(x => x.id === a.id ? { ...x, firebaseId: fid } : x));
            }
          }).catch(e => console.warn('[App] Gagal upload area:', a.id, e));
        });
        return prev;
      });
      retryTimer = setTimeout(uploadMissing, 10000);
    };

    uploadMissing();
    return () => { cancelled = true; clearTimeout(retryTimer); };
  }, [firebaseUsersLoaded]);

  // Firebase real-time subscription untuk pos list
  useEffect(() => {
    const db = initSupabase();
    if (!db) return;
    const unsub = subscribePosList((firebaseData) => {
      if (!firebaseData) return;
      setPosList(prev => {
        const initialIds = new Set(INITIAL_POS_LIST.map(p => p.id));
        const merged = [...INITIAL_POS_LIST];
        const fbIds = new Set();
        firebaseData.forEach(fb => {
          if (!initialIds.has(fb.id)) {
            merged.push(fb);
          }
          fbIds.add(fb.id);
        });
        prev.forEach(local => {
          if (!initialIds.has(local.id) && !fbIds.has(local.id)) {
            merged.push(local);
          }
        });
        return merged;
      });
    });
    return () => unsub();
  }, []);

  // Firebase real-time subscription untuk WA Contacts
  useEffect(() => {
    const db = initSupabase();
    if (!db) return;
    const unsub = subscribeWAContacts((firebaseData) => {
      if (!firebaseData) return;
      const { updatedAt, ...contacts } = firebaseData;
      localStorage.setItem('smpjdc_wa_contacts', JSON.stringify(contacts));
    });
    return () => unsub();
  }, []);

  // Upload posList yang belum tersimpan ke Firestore (dengan retry otomatis)
  useEffect(() => {
    if (!firebaseUsersLoaded) return;
    let cancelled = false;
    let retryTimer;

    const uploadMissing = () => {
      if (cancelled) return;
      setPosList(prev => {
        const missing = prev.filter(p => !p.firebaseId && !INITIAL_POS_LIST.some(init => init.id === p.id));
        if (missing.length === 0) return prev;
        missing.forEach(p => {
          addPosToFirestore(p).then(fid => {
            if (fid && !cancelled) {
              setPosList(list => list.map(x => x.id === p.id ? { ...x, firebaseId: fid } : x));
            }
          }).catch(e => console.warn('[App] Gagal upload pos:', p.id, e));
        });
        return prev;
      });
      retryTimer = setTimeout(uploadMissing, 10000);
    };

    uploadMissing();
    return () => { cancelled = true; clearTimeout(retryTimer); };
  }, [firebaseUsersLoaded]);

  // ── Batch sync semua localStorage ke Supabase ──────────────────────────
  // Upload data lokal yang belum punya firebaseId/supabaseId ke Supabase
  // Menjamin tidak ada data yang hilang saat migrasi
  useEffect(() => {
    const db = initSupabase();
    if (!db || !firebaseUsersLoaded) return;
    let cancelled = false;

    const SYNC_COLLECTIONS = [
      { key: 'smpjdc_complaints', adder: addComplaintToFirestore },
      { key: 'sapujagat_reports', adder: addReportToFirestore },
      { key: 'sapujagat_findings', adder: addFindingToFirestore },
      { key: 'smpjdc_attendance_logs', adder: addAttendanceLogToFirestore },
      { key: 'smpjdc_mutasi_logs', adder: addMutasiLogToFirestore },
    ];

    const syncAll = async () => {
      for (const { key, adder } of SYNC_COLLECTIONS) {
        if (cancelled) break;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        let items;
        try { items = JSON.parse(raw); } catch { continue; }
        const missing = items.filter(item => !item.supabaseId);
        if (missing.length === 0) continue;

        console.log(`[Sync] Upload ${missing.length} items from ${key}...`);

        for (let i = 0; i < missing.length; i++) {
          if (cancelled) break;
          let item = { ...missing[i] };
          try {
            // Intercept foto Base64 dan unggah ke Storage sebelum disync ke database Cloud
            if (item.foto && item.foto.startsWith('data:image')) {
              const folder = key.includes('reports') ? 'reports' : key.includes('findings') ? 'findings' : 'mutasi';
              item.foto = await uploadPhoto(item.foto, `${folder}/${item.id}.jpg`);
            }
            if (item.photos && Array.isArray(item.photos)) {
              const uploadedPhotos = [];
              for (let p = 0; p < item.photos.length; p++) {
                if (item.photos[p].startsWith('data:image')) {
                  uploadedPhotos.push(await uploadPhoto(item.photos[p], `complaints/${item.id}_${p}.jpg`));
                } else {
                  uploadedPhotos.push(item.photos[p]);
                }
              }
              item.photos = uploadedPhotos;
            }

            const id = await adder(item);
            if (id) {
              const updater = (setter, field) => {
                setter(prev => prev.map(x => x.id === item.id
                  ? { ...x, [field]: id, firebaseId: id, foto: item.foto, photos: item.photos }
                  : x
                ));
              };

              if (key === 'smpjdc_complaints') updater(setComplaints, 'supabaseId');
              else if (key === 'sapujagat_reports') updater(setReports, 'supabaseId');
              else if (key === 'sapujagat_findings') updater(setFindings, 'supabaseId');
              else if (key === 'smpjdc_attendance_logs') updater(setAttendanceLogs, 'supabaseId');
              else if (key === 'smpjdc_mutasi_logs') updater(setMutasiLogs, 'supabaseId');

              try {
                const current = JSON.parse(localStorage.getItem(key) || '[]');
                const synced = current.map(x => x.id === item.id ? { ...x, supabaseId: id, firebaseId: id, foto: item.foto, photos: item.photos } : x);
                localStorage.setItem(key, JSON.stringify(synced));
              } catch (e) {}
            }
          } catch (e) {
            console.warn(`[Sync] Gagal upload item ${item.id} dari ${key}:`, e?.message || e);
          }
          if (i < missing.length - 1) await new Promise(r => setTimeout(r, 200));
        }
      }
    };

    syncAll().then(() => {
      checkOfflineQueue();
    });
    return () => { cancelled = true; };
  }, [firebaseUsersLoaded, syncTrigger]);

  // Auto-sync currentUser ketika data dari Supabase berubah
  useEffect(() => {
    if (!currentUser) return;
    const found = users.find(u => u.id === currentUser.id);
    if (!found) return;
    const keys = ['nama','jabatan','regu','email','nomorHp','avatar','nrp','status'];
    if (keys.some(k => found[k] !== currentUser[k])) {
      setCurrentUser(prev => ({ ...prev, ...found }));
    }
  }, [users]);

  // Live user presence tracking (lastActive) updated periodically (every 60s)
  useEffect(() => {
    if (!currentUser || !authenticated) return;

    const updatePresence = () => {
      const nowStr = new Date().toISOString();
      
      // Update local state
      setUsers(prev => {
        const updated = prev.map(u => u.id === currentUser.id ? { ...u, lastActive: nowStr } : u);
        try {
          localStorage.setItem('sapujagat_users', JSON.stringify(updated));
          signUserData(updated);
        } catch (e) {}
        return updated;
      });

      // Update Firestore if connected and online
      if (isOnline && (currentUser.supabaseId || currentUser.firebaseId)) {
        const fid = currentUser.supabaseId || currentUser.firebaseId;
        updateUserInFirestore(fid, { lastActive: nowStr }).catch(err => {
          console.warn('[Firebase] Gagal memperbarui kehadiran user:', err);
        });
      }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 60000);
    return () => clearInterval(interval);
  }, [currentUser?.id, authenticated, isOnline]);

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    toastTimers.current[id] = setTimeout(() => {
      delete toastTimers.current[id];
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const playSOSSiren = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.connect(audioCtx.destination);
      let osc = null;
      let sirenInterval = null;

      const startOsc = () => {
        if (osc) { try { osc.stop(); } catch(e) {} }
        osc = audioCtx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(1200, audioCtx.currentTime + 0.5);
        osc.frequency.linearRampToValueAtTime(800, audioCtx.currentTime + 1.0);
        osc.connect(gain);
        osc.start();
        osc.onended = () => { osc = null; };
      };

      startOsc();
      sirenInterval = setInterval(startOsc, 1000);

      return {
        audioCtx,
        stop: () => {
          clearInterval(sirenInterval);
          if (osc) { try { osc.stop(); } catch(e) {} }
          try { audioCtx.close(); } catch(e) {}
        }
      };
    } catch (e) {
      return null;
    }
  };

  const handleArchiveOldData = async () => {
    const days = 90;
    addToast(`Mengarsipkan data lebih dari ${days} hari...`, 'info');
    const result = await deleteOldDataInFirestore(days);
    if (result.success) {
      addToast(`Berhasil menghapus ${result.count} dokumen lama! Data akan sinkron otomatis.`, 'success');
      // Re-fetch akan terjadi otomatis via onSnapshot
    } else {
      addToast('Gagal mengarsipkan data. Periksa koneksi internet.', 'danger');
    }
  };

  const triggerSOS = (officerName, areaName) => {
    const alert = {
      id: Date.now(),
      officer: officerName,
      location: areaName,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    setActiveSOS(alert);
    addToast(`🚨 ALARM SOS DARURAT! Petugas ${officerName} di ${areaName}`, 'danger');
    const audio = playSOSSiren();
    if (audio) setSosAudio(audio);
  };

  const getDetectedShiftCode = (timestamp) => {
    const d = timestamp ? new Date(timestamp) : new Date();
    const hour = d.getHours();
    if (hour >= 6 && hour < 14) return 'P';
    if (hour >= 14 && hour < 22) return 'S';
    return 'M';
  };

  const resolveActiveShiftAndRegu = (userId, userDefaultRegu, timestamp, logsList) => {
    const todayStr = (timestamp ? new Date(timestamp) : new Date()).toISOString().split('T')[0];
    let foundRegu = null;
    let foundShift = null;

    if (logsList && Array.isArray(logsList)) {
      for (const log of logsList) {
        if (log.tanggal === todayStr) {
          const detail = log.details?.find(d => String(d.personilId) === String(userId));
          if (detail && (detail.status === 'Hadir' || detail.status === 'Tukar Shift')) {
            foundRegu = log.regu;
            foundShift = log.shift;
            break;
          }
        }
      }
    }

    const detectedShift = getDetectedShiftCode(timestamp);
    return {
      regu: foundRegu || userDefaultRegu || 'Regu A',
      shift: foundShift || detectedShift
    };
  };

  const handleAddReport = async (newReport) => {
    const reportId = `rep-${Date.now()}-${Math.floor(Math.random() * 90000)}`;
    const timestamp = newReport.timestamp || new Date().toISOString();
    const resolved = resolveActiveShiftAndRegu(currentUser?.id, currentUser?.regu, timestamp, attendanceLogs);

    let reportData = { 
      id: reportId, 
      ...newReport,
      timestamp,
      userId: currentUser?.id,
      userName: currentUser?.nama,
      nrp: currentUser?.nrp,
      nomorHp: currentUser?.nomorHp || currentUser?.nomor_hp || '',
      shift: resolved.shift,
      regu: resolved.regu
    };
    
    // Simpan ke state lokal terlebih dahulu untuk feedback UI instan (Offline-first approach)
    setReports(prev => [reportData, ...prev]);
    addToast(`Patroli sukses disubmit di ${newReport.titik} (${newReport.kondisi})`, 'success');

    let findingId = null;
    let findingData = null;
    if (newReport.kondisi !== 'Aman dan Kondusif' && newReport.kondisi !== 'Ada Aktivitas' && newReport.kondisi !== 'Renovasi') {
      findingId = `find-${Math.floor(1000 + Math.random() * 9000)}`;
      const dept = mapDepartment(newReport.kondisi, newReport.keterangan || '');
      findingData = {
        id: findingId,
        reportId,
        kategori: newReport.kondisi,
        area: `${newReport.gedung || 'JDC'} Lt.${newReport.lantai} ${newReport.zona} - ${newReport.titik}`,
        tanggal: timestamp,
        pelapor: currentUser?.nama,
        nrp: currentUser?.nrp,
        nomorHp: currentUser?.nomorHp || currentUser?.nomor_hp || '',
        shift: resolved.shift,
        regu: resolved.regu,
        status: 'Open',
        severity: newReport.severity || 'Rendah',
        detail: newReport.keterangan || `Ditemukan kondisi ${newReport.kondisi}`,
        foto: reportData.foto, // Base64 sementara hingga berhasil upload
        department: dept,
        waStatus: 'Belum Dikirim',
        waSentAt: null
      };
      setFindings(prev => [findingData, ...prev]);
      addToast(`⚠️ Tiket temuan otomatis dibuat untuk ${dept} [Severity: ${newReport.severity || 'Rendah'}]`, 'warning');
    }

    try {
      // 1. Upload Foto ke Supabase Storage secara background
      if (reportData.foto && reportData.foto.startsWith('data:image')) {
        const photoUrl = await uploadPhoto(reportData.foto, `reports/${reportId}.jpg`);
        reportData.foto = photoUrl;
        if (findingData) findingData.foto = photoUrl;
        
        // Memperbarui state lokal agar data referensi gambar beralih dari Base64 ke Storage URL yang ringan
        setReports(prev => prev.map(r => r.id === reportId ? { ...r, foto: photoUrl } : r));
        if (findingData) {
          setFindings(prev => prev.map(f => f.id === findingId ? { ...f, foto: photoUrl } : f));
        }
      }

      // 2. Insert referensi Database
      const reportProm = addReportToFirestore(reportData).then(fid => {
        if (fid) {
          setReports(prev => prev.map(r =>
            r.id === reportId ? { ...r, supabaseId: fid, firebaseId: fid } : r
          ));
        }
      });
      reportProm.catch(e => addToast(`Gagal sync laporan: ${e.message}`, 'warning'));

      if (findingData) {
        addFindingToFirestore(findingData).then(fid => {
          if (fid) {
            setFindings(prev => prev.map(f =>
              f.id === findingId ? { ...f, supabaseId: fid, firebaseId: fid } : f
            ));
          }
        }).catch(e => addToast(`Gagal sync temuan: ${e.message}`, 'warning'));
      }
      
      return reportProm;
    } catch (err) {
      console.warn('Gagal memproses upload:', err);
      addToast(`Gagal proses foto: ${err.message}`, 'danger');
    }
  };

  const handleDeleteReport = (id) => {
    const target = reports.find(r => r.id === id);
    if (!target) return;
    setConfirmDelete({
      title: 'Hapus Laporan Patroli',
      message: <>Yakin ingin menghapus laporan patroli di <strong>{target.titik}</strong> ({target.kondisi})?<br/>Tindakan ini tidak bisa dibatalkan.</>,
      confirmLabel: 'Hapus',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDelete(null);
        try {
          const fid = target.supabaseId || target.firebaseId;
          if (fid) await deleteReportFromFirestore(fid);
          setReports(prev => {
            const filtered = prev.filter(r => r.id !== id);
            try { localStorage.setItem('sapujagat_reports', JSON.stringify(filtered)); } catch (e) {}
            return filtered;
          });
          addToast('Laporan patroli berhasil dihapus!', 'success');
        } catch (e) {
          addToast(`Gagal hapus laporan: ${e.message}`, 'danger');
        }
      },
      onCancel: () => setConfirmDelete(null),
    });
  };

  const updateFindingStatus = (findingId, newStatus) => {
    let updatedFinding = null;
    setFindings(prev => prev.map(f => {
      if (f.id === findingId) {
        addToast(`Status temuan ${f.kategori} diubah ke ${newStatus}`, 'info');
        updatedFinding = { ...f, status: newStatus };
        const fid = updatedFinding.supabaseId || updatedFinding.firebaseId;
        if (fid) {
          updateFindingInFirestore(fid, { status: newStatus }).catch(e => addToast(`Gagal update status temuan: ${e.message}`, 'warning'));
        }
        return updatedFinding;
      }
      return f;
    }));
  };

  const dispatchFinding = (findingId, dept) => {
    let updatedFinding = null;
    setFindings(prev => prev.map(f => {
      if (f.id === findingId) {
        addToast(`Tiket didisposisikan ke ${dept}`, 'info');
        updatedFinding = { 
          ...f, 
          department: dept, 
          waStatus: `Terkirim (${dept})`,
          waSentAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
        };
        const fid = updatedFinding.supabaseId || updatedFinding.firebaseId;
        if (fid) {
          updateFindingInFirestore(fid, {
            department: dept,
            waStatus: `Terkirim (${dept})`,
            waSentAt: updatedFinding.waSentAt
          }).catch(e => addToast(`Gagal disposisi temuan: ${e.message}`, 'warning'));
        }
        return updatedFinding;
      }
      return f;
    }));
  };

  const handleDeleteFinding = (id) => {
    const target = findings.find(f => f.id === id);
    if (!target) return;
    setConfirmDelete({
      title: 'Hapus Temuan',
      message: <>Yakin ingin menghapus temuan <strong>{target.kategori}</strong> (#{String(target.id).slice(-6)})?<br/>Tindakan ini tidak bisa dibatalkan.</>,
      confirmLabel: 'Hapus',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDelete(null);
        try {
          const fid = target.supabaseId || target.firebaseId;
          if (fid) await deleteFindingFromFirestore(fid);
          setFindings(prev => {
            const filtered = prev.filter(f => f.id !== id);
            try { localStorage.setItem('sapujagat_findings', JSON.stringify(filtered)); } catch (e) {}
            return filtered;
          });
          addToast('Temuan berhasil dihapus!', 'success');
        } catch (e) {
          addToast(`Gagal hapus temuan: ${e.message}`, 'danger');
        }
      },
      onCancel: () => setConfirmDelete(null),
    });
  };

  const handleAddMutasi = async (log) => {
    const id = `mut-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const timestamp = new Date().toISOString();
    const resolved = resolveActiveShiftAndRegu(currentUser?.id, currentUser?.regu, timestamp, attendanceLogs);

    let mutasiData = { 
      id, 
      ...log,
      tanggal: timestamp.split('T')[0],
      waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      petugas: currentUser?.nama,
      nrp: currentUser?.nrp,
      nomorHp: currentUser?.nomorHp || currentUser?.nomor_hp || '',
      shift: resolved.shift,
      regu: resolved.regu
    };
    setMutasiLogs(prev => [mutasiData, ...prev]);
    addToast('Catatan mutasi berhasil disimpan', 'success');
    
    try {
      if (mutasiData.foto && mutasiData.foto.startsWith('data:image')) {
        const photoUrl = await uploadPhoto(mutasiData.foto, `mutasi/${id}.jpg`);
        mutasiData.foto = photoUrl;
        setMutasiLogs(prev => prev.map(m => m.id === id ? { ...m, foto: photoUrl } : m));
      }

      const prom = addMutasiLogToFirestore(mutasiData).then(fid => {
        if (fid) {
          setMutasiLogs(prev => prev.map(m =>
            m.id === id ? { ...m, supabaseId: fid, firebaseId: fid } : m
          ));
        }
      });
      prom.catch(e => addToast(`Gagal sync mutasi: ${e.message}`, 'warning'));
      return prom;
    } catch (err) {
      addToast(`Gagal upload foto mutasi: ${err.message}`, 'danger');
    }
  };

  const handleDeleteMutasi = (id) => {
    const target = mutasiLogs.find(l => l.id === id);
    if (!target) return;
    setConfirmDelete({
      title: 'Hapus Catatan Mutasi',
      message: <>Yakin ingin menghapus catatan mutasi ini?<br/>Tindakan ini tidak bisa dibatalkan.</>,
      confirmLabel: 'Hapus',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDelete(null);
        try {
          const fid = target.supabaseId || target.firebaseId;
          if (fid) await deleteMutasiLogFromFirestore(fid);
          setMutasiLogs(prev => prev.filter(l => l.id !== id));
          addToast('Catatan mutasi dihapus', 'info');
        } catch (e) {
          addToast(`Gagal hapus mutasi: ${e.message}`, 'danger');
        }
      },
      onCancel: () => setConfirmDelete(null),
    });
  };

  const handleDeleteAttendanceLog = (id) => {
    const target = attendanceLogs.find(l => l.id === id);
    if (!target) return;
    setConfirmDelete({
      title: 'Hapus Absensi',
      message: <>Yakin ingin menghapus absensi <strong>{target.regu}</strong> tanggal {target.tanggal} (Shift {target.shift})?<br/>Tindakan ini tidak bisa dibatalkan.</>,
      confirmLabel: 'Hapus',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDelete(null);
        try {
          const fid = target.supabaseId || target.firebaseId;
          if (fid) await deleteAttendanceLogFromFirestore(fid);
          setAttendanceLogs(prev => {
            const filtered = prev.filter(l => l.id !== id);
            try { localStorage.setItem('smpjdc_attendance_logs', JSON.stringify(filtered)); } catch (e) {}
            return filtered;
          });
          addToast('Absensi berhasil dihapus!', 'success');
        } catch (e) {
          addToast(`Gagal hapus absensi: ${e.message}`, 'danger');
        }
      },
      onCancel: () => setConfirmDelete(null),
    });
  };

  const handleAddComplaint = async (complaint) => {
    let complaintData = { ...complaint };
    setComplaints(prev => {
      const updated = [complaintData, ...prev];
      try { localStorage.setItem('smpjdc_complaints', JSON.stringify(updated)); } catch (e) {}
      return updated;
    });
    addToast(`Komplain ${complaint.ticketId} berhasil dikirim!`, 'success');
    
    try {
      if (complaintData.photos && complaintData.photos.length > 0) {
        const uploadedPhotos = [];
        for (let i = 0; i < complaintData.photos.length; i++) {
          const p = complaintData.photos[i];
          if (p.startsWith('data:image')) {
             const photoUrl = await uploadPhoto(p, `complaints/${complaintData.id}_${i}.jpg`);
             uploadedPhotos.push(photoUrl);
          } else {
             uploadedPhotos.push(p);
          }
        }
        complaintData.photos = uploadedPhotos;
        setComplaints(prev => prev.map(c => c.id === complaintData.id ? { ...c, photos: uploadedPhotos } : c));
      }

      addComplaintToFirestore(complaintData).then(fid => {
        if (fid) {
          setComplaints(prev => prev.map(c =>
            c.id === complaintData.id ? { ...c, supabaseId: fid, firebaseId: fid } : c
          ));
        }
      }).catch(e => addToast(`Gagal sync komplain: ${e.message}`, 'warning'));
    } catch (err) {
      addToast(`Gagal upload foto komplain: ${err.message}`, 'danger');
    }
  };

  const handleUpdateComplaint = (id, updates) => {
    const target = complaints.find(c => c.id === id);
    setComplaints(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, ...updates } : c);
      try { localStorage.setItem('smpjdc_complaints', JSON.stringify(updated)); } catch (e) {}
      return updated;
    });
    if (updates.status === 'Selesai') {
      addToast(`Komplain #${id} ditandai selesai`, 'success');
    }
    const updatedComplaint = { ...target, ...updates };
    const fid = updatedComplaint.supabaseId || updatedComplaint.firebaseId;
    if (fid) {
      updateComplaintInFirestore(fid, updates).catch(e => addToast(`Gagal update komplain: ${e.message}`, 'warning'));
    } else {
      addComplaintToFirestore(updatedComplaint).then(fid2 => {
        if (fid2) {
          setComplaints(prev => prev.map(c =>
            c.id === id ? { ...c, supabaseId: fid2, firebaseId: fid2 } : c
          ));
        }
      }).catch(e => addToast(`Gagal sync komplain: ${e.message}`, 'warning'));
    }
  };

  const handleDeleteComplaint = (id) => {
    const target = complaints.find(c => c.id === id);
    if (!target) return;
    setConfirmDelete({
      title: 'Hapus Komplain',
      message: <>Yakin ingin menghapus komplain <strong>{target.ticketId}</strong> dari <strong>{target.name}</strong>?<br/>Tindakan ini tidak bisa dibatalkan.</>,
      confirmLabel: 'Hapus',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDelete(null);
        try {
          const fid = target.supabaseId || target.firebaseId;
          if (fid) await deleteComplaintFromFirestore(fid);
          setComplaints(prev => {
            const filtered = prev.filter(c => c.id !== id);
            try { localStorage.setItem('smpjdc_complaints', JSON.stringify(filtered)); } catch (e) {}
            return filtered;
          });
          addToast('Komplain berhasil dihapus!', 'success');
        } catch (e) {
          addToast(`Gagal hapus komplain: ${e.message}`, 'danger');
        }
      },
      onCancel: () => setConfirmDelete(null),
    });
  };

  const handleAddArea = (newArea) => {
    const areaId = newArea.qrCode.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const area = { id: areaId, ...newArea };
    setAreas(prev => [...prev, area]);
    addAreaToFirestore(area).then(fid => {
      if (fid) {
        setAreas(prev => prev.map(a => a.id === areaId ? { ...a, supabaseId: fid, firebaseId: fid } : a));
      }
    }).catch(e => addToast(`Gagal sync area: ${e.message}`, 'warning'));
    addToast(`Area ${newArea.titik} (Lt.${newArea.lantai} - ${newArea.zona}) berhasil didaftarkan!`, 'success');
  };

  const handleUpdateArea = (areaId, updates) => {
    setAreas(prev => prev.map(a => {
      if (a.id !== areaId) return a;
      const fid = a.supabaseId || a.firebaseId;
      if (fid) updateAreaInFirestore(fid, updates).catch(e => addToast(`Gagal update area: ${e.message}`, 'warning'));
      return { ...a, ...updates };
    }));
    addToast('Area berhasil diperbarui!', 'success');
  };

  const handleDeleteArea = (areaId) => {
    const target = areas.find(a => a.id === areaId);
    if (!target) return;
    setConfirmDelete({
      title: 'Hapus Area',
      message: <>Yakin ingin menghapus area/checkpoint <strong>{target.titik}</strong>?<br/>Tindakan ini tidak bisa dibatalkan.</>,
      confirmLabel: 'Hapus',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDelete(null);
        try {
          const fid = target.supabaseId || target.firebaseId;
          if (fid) await deleteAreaFromFirestore(fid);
          setAreas(prev => prev.filter(a => a.id !== areaId));
          addToast('Area/checkpoint berhasil dihapus!', 'info');
        } catch (e) {
          addToast(`Gagal hapus area: ${e.message}`, 'danger');
        }
      },
      onCancel: () => setConfirmDelete(null),
    });
  };

  const handleAddPos = (newPos) => {
    const posId = newPos.id || `pos-${Date.now()}`;
    setPosList(prev => [...prev, { id: posId, ...newPos }]);
    addPosToFirestore({ id: posId, ...newPos }).then(fid => {
      if (fid) {
        setPosList(prev => prev.map(p => p.id === posId ? { ...p, supabaseId: fid, firebaseId: fid } : p));
      }
    }).catch(e => addToast(`Gagal sync pos: ${e.message}`, 'warning'));
    addToast(`Pos ${newPos.titik} berhasil ditambahkan!`, 'success');
  };

  const handleUpdatePos = (posId, updates) => {
    setPosList(prev => prev.map(p => {
      if (p.id !== posId) return p;
      const fid = p.supabaseId || p.firebaseId;
      if (fid) updatePosInFirestore(fid, updates).catch(e => addToast(`Gagal update pos: ${e.message}`, 'warning'));
      return { ...p, ...updates };
    }));
    addToast('Pos jaga berhasil diperbarui!', 'success');
  };

  const handleDeletePos = (posId) => {
    const target = posList.find(p => p.id === posId);
    if (!target) return;
    setConfirmDelete({
      title: 'Hapus Pos Jaga',
      message: <>Yakin ingin menghapus pos jaga <strong>{target.titik}</strong>?<br/>Tindakan ini tidak bisa dibatalkan.</>,
      confirmLabel: 'Hapus',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDelete(null);
        try {
          const fid = target.supabaseId || target.firebaseId;
          if (fid) await deletePosFromFirestore(fid);
          setPosList(prev => prev.filter(p => p.id !== posId));
          addToast('Pos jaga berhasil dihapus!', 'info');
        } catch (e) {
          addToast(`Gagal hapus pos: ${e.message}`, 'danger');
        }
      },
      onCancel: () => setConfirmDelete(null),
    });
  };

  const handleSaveWAContacts = async (contacts) => {
    saveWAContactsToFirestore(contacts);
  };

  const handleAddUser = (newUser) => {
    const userId = Date.now() + Math.floor(Math.random() * 1000);
    const userData = {
      id: userId,
      nama: newUser.nama,
      nrp: newUser.nrp,
      jabatan: newUser.jabatan,
      regu: newUser.regu || '',
      shift: newUser.shift || 'Pagi',
      nomorHp: newUser.nomorHp || '',
      status: newUser.status || 'Aktif',
      avatar: newUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=60',
      email: newUser.email || ''
    };
    setUsers(prev => [...prev, userData]);
    addUserToFirestore(userData).then(fid => {
      if (fid) {
        setUsers(prev => prev.map(u =>
          u.id === userId ? { ...u, supabaseId: fid, firebaseId: fid } : u
        ));
      }
    }).catch(e => addToast(`Gagal sync user baru ke Cloud: ${e.message}`, 'warning'));
    if (newUser.pin) {
      localStorage.setItem(`smpjdc_pin_${userId}`, hashPin(newUser.pin));
    }
    addToast(`Anggota baru ${newUser.nama} (${newUser.jabatan}) berhasil didaftarkan!`, 'success');
  };

  const handleUpdateUser = (userId, updates) => {
    setUsers(prev => {
      const user = prev.find(u => u.id === userId);
      if (user) {
        const fid = user.supabaseId || user.firebaseId;
        if (fid) {
          updateUserInFirestore(fid, updates).catch(e =>
            addToast(`Gagal update user di Cloud: ${e.message}`, 'warning')
          );
        }
      }
      const updated = prev.map(u => u.id === userId ? { ...u, ...updates } : u);
      try { localStorage.setItem('sapujagat_users', JSON.stringify(updated)); } catch(e) {}
      return updated;
    });
    if (currentUser && currentUser.id === userId) {
      setCurrentUser(prev => ({ ...prev, ...updates }));
    }
    addToast('Data user berhasil diperbarui!', 'success');
  };

  const handleDeleteUser = (userId) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    setConfirmDelete({
      title: 'Hapus User',
      message: <>Yakin ingin menghapus <strong>{user.nama}</strong> (NRP: {user.nrp})?<br/>Tindakan ini tidak bisa dibatalkan.</>,
      confirmLabel: 'Hapus',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDelete(null);
        try {
          const fid = user.supabaseId || user.firebaseId;
          if (fid) await deleteUserFromFirestore(fid);
          setUsers(prev => {
            const filtered = prev.filter(u => u.id !== userId);
            try { localStorage.setItem('sapujagat_users', JSON.stringify(filtered)); } catch(e) {}
            return filtered;
          });
          addToast(`User ${user.nama} berhasil dihapus!`, 'success');
        } catch (e) {
          addToast(`Gagal menghapus ${user.nama} dari Cloud: ${e.message}`, 'danger');
        }
      },
      onCancel: () => setConfirmDelete(null),
    });
  };

  const handleResetUsers = async () => {
    addToast('Mereset database user di Firestore...', 'info');
    const success = await resetUsersInFirestore(BASE_USERS);
    if (success) {
      addToast('Database user di Firestore berhasil direset!', 'success');
      setUsers(BASE_USERS);
      localStorage.setItem('sapujagat_users', JSON.stringify(BASE_USERS));
      signUserData(BASE_USERS);
      BASE_USERS.forEach(bu => {
        localStorage.setItem(`smpjdc_pin_${bu.id}`, hashPin(bu.nrp));
      });
    } else {
      addToast('Gagal mereset database user di Firestore. Periksa koneksi internet.', 'danger');
    }
  };

  const handleClearAllData = async () => {
    addToast('Membersihkan seluruh data operasional di Firestore...', 'info');
    const success = await clearAllPatrolDataInFirestore();
    if (success) {
      addToast('Seluruh data operasional di Firestore berhasil dibersihkan!', 'success');
      setReports([]);
      setFindings([]);
      setMutasiLogs([]);
      setAttendanceLogs([]);
      setComplaints([]);
      localStorage.setItem('sapujagat_reports', JSON.stringify([]));
      localStorage.setItem('sapujagat_findings', JSON.stringify([]));
      localStorage.setItem('smpjdc_mutasi_logs', JSON.stringify([]));
      localStorage.setItem('smpjdc_attendance_logs', JSON.stringify([]));
      localStorage.setItem('smpjdc_complaints', JSON.stringify([]));
    } else {
      addToast('Gagal membersihkan data di Firestore. Periksa koneksi internet.', 'danger');
    }
  };

  const handleUpdateAvatar = async () => {
    setProfileError('');
    setProfileSuccess('');
    if (!tempAvatar) {
      setProfileError('Pilih atau upload foto terlebih dahulu.');
      return;
    }
    
    try {
      let finalAvatar = tempAvatar;
      if (finalAvatar.startsWith('data:image')) {
        addToast('Mengupload foto...', 'info');
        finalAvatar = await uploadPhoto(finalAvatar, `avatars/${currentUser.id}.jpg`);
      }
      
      const updatedUsers = users.map(u =>
        u.id === currentUser.id ? { ...u, avatar: finalAvatar } : u
      );
      
      setUsers(updatedUsers);
      setCurrentUser(prev => ({ ...prev, avatar: finalAvatar }));
      localStorage.setItem('sapujagat_users', JSON.stringify(updatedUsers));
      signUserData(updatedUsers);
      
      if (currentUser.supabaseId || currentUser.firebaseId) {
        await updateUserInFirestore(currentUser.supabaseId || currentUser.firebaseId, { avatar: finalAvatar });
      }
      
      setProfileSuccess('Foto profil berhasil diperbarui!');
      addToast('Foto profil berhasil diperbarui!', 'success');
    } catch (e) {
      console.error(e);
      setProfileError('Gagal memperbarui foto profil.');
    }
  };

  const handleSaveWA = () => {
    const val = editWAValue.trim();
    setProfileError('');
    setProfileSuccess('');
    if (currentUser) {
      handleUpdateUser(currentUser.id, { nomorHp: val });
      setEditingWA(false);
      setProfileSuccess('Nomor WhatsApp berhasil diperbarui!');
    }
  };

  const handleUpdatePin = async () => {
    setProfileError('');
    setProfileSuccess('');
    
    if (!currentPin || !newPin || !confirmPin) {
      setProfileError('Semua field PIN harus diisi.');
      return;
    }
    
    const storedPinHash = localStorage.getItem(`smpjdc_pin_${currentUser.id}`);
    
    if (storedPinHash && !verifyPin(currentPin, storedPinHash)) {
      setProfileError('PIN saat ini salah.');
      return;
    }
    
    if (newPin.length < 4) {
      setProfileError('PIN baru minimal 4 karakter.');
      return;
    }
    
    if (newPin !== confirmPin) {
      setProfileError('Konfirmasi PIN baru tidak cocok.');
      return;
    }
    
    try {
      const hashed = hashPin(newPin);
      localStorage.setItem(`smpjdc_pin_${currentUser.id}`, hashed);
      
      setProfileSuccess('PIN berhasil diperbarui!');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      addToast('PIN keamanan berhasil diperbarui!', 'success');
    } catch (e) {
      console.error(e);
      setProfileError('Gagal memperbarui PIN.');
    }
  };

  const handleLogin = (user) => {
    const synced = users.find(u => u.id === user.id || u.nrp === user.nrp);
    setCurrentUser(synced || user);
    setAuthenticated(true);
    setShowSplash(true);
    const targetTab = ['Danru', 'Wadanru', 'Anggota'].includes(user.jabatan) ? 'guard-simulator' : 'dashboard';
    setCurrentTab(targetTab);
    localStorage.setItem('smpjdc_last_route', targetTab);
  };

  const handleSetup = (user) => {
    setCurrentUser(user);
    setAuthenticated(true);
    setShowSplash(true);
    setHasUsers(true);
    setCurrentTab('dashboard');
    localStorage.setItem('smpjdc_last_route', 'dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('smpjdc_session');
    localStorage.removeItem('smpjdc_last_route');
    setAuthenticated(false);
    setCurrentUser(null);
    setShowSplash(false);
    addToast('Anda telah logout', 'info');
  };

  const handleNavClick = (tabName) => {
    setCurrentTab(tabName);
    localStorage.setItem('smpjdc_last_route', tabName);
    setIsSidebarOpen(false);
  };

  useEffect(() => {
    // Scroll ke atas saat ganti tab
    // main-content adalah scroll container sendiri (height:100vh + overflow-y:auto)
    // Jadi reset scrollTop pada container, BUKAN window.scrollTo
    const el = document.getElementById('main-scroll-container');
    if (el) {
      el.scrollTop = 0;
      el.focus({ preventScroll: true });
    }
  }, [currentTab]);

  const handleExitApp = () => {
    if (Capacitor.isNativePlatform()) {
      CapApp.exitApp();
    } else {
      setShowExitConfirm(false);
    }
  };

  const handleCancelExit = () => {
    setShowExitConfirm(false);
  };

  const jabatanShort = {
    'Admin Super': 'Admin Super',
    'Manajemen': 'Manajemen',
    'SPV': 'SPV',
    'Danru': 'Danru',
    'Wadanru': 'Wadanru',
    'Anggota': 'Anggota',
    'BKO': 'BKO',
    'KH (Khusus)': 'KH',
    'Guest Viewer': 'Guest'
  };

  const isGodMode = currentUser?.jabatan === 'Admin Super';
  const isAdmin = ['Manajemen', 'SPV'].includes(currentUser?.jabatan);
  const isClient = currentUser?.jabatan === 'Guest Viewer';
  const isSuperAdmin = isGodMode;
  const isPatrol = ['Danru', 'Wadanru', 'Anggota', 'BKO', 'KH (Khusus)', 'Middle 1', 'Middle 2'].includes(currentUser?.jabatan);

  // Public complaint form — accessible without login via QR code or direct URL
  const isPublicComplaint = typeof window !== 'undefined' && window.location.search.includes('complaint');
  if (isPublicComplaint) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', position: 'relative' }}>
        <DeveloperWatermarkBackground theme="dark" />
        <ComplaintForm onAddComplaint={handleAddComplaint} />
      </div>
    );
  }

  if (authenticated === null) {
    return <div className="login-page" style={{ alignItems: 'center', justifyContent: 'center', display: 'flex' }}><div className="cyber-grid" style={{ position: 'absolute', inset: 0 }}></div></div>;
  }

  if (!authenticated) {
    return (
      <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at center, #0f172a 0%, #020617 100%)', position: 'relative' }}>
        <DeveloperWatermarkBackground theme="dark" />
        <LoginPage users={users} onLogin={handleLogin} onSetup={handleSetup} hasUsers={hasUsers} firebaseUsersLoaded={firebaseUsersLoaded} />
      </div>
    );
  }

  if (showSplash) {
    return (
      <div className="splash-screen cyber-screen">
        <div className="cyber-corner corner-tl"></div>
        <div className="cyber-corner corner-tr"></div>
        <div className="cyber-corner corner-bl"></div>
        <div className="cyber-corner corner-br"></div>
        <div className="cyber-grid"></div>
        <div className="cyber-scanline"></div>
        <div className="cyber-hud-container">
          <div className="hud-ring ring-outer"></div>
          <div className="hud-ring ring-middle"></div>
          <div className="hud-ring ring-inner"></div>
          <div className="hud-ring ring-dashed"></div>
          <div className="splash-logo-container">
            <img src="jdc-logo.png" alt="SMPJDC" className="splash-logo cyber-logo logo-3d-spin" />
          </div>
        </div>
        <div className="cyber-progress-container">
          <div className="cyber-progress-header">
            <span className="progress-label">CORE CALIBRATION</span>
            <span className="progress-percent">{progress}%</span>
          </div>
          <div className="cyber-progress-bar">
            <div className="cyber-progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
        <div className="cyber-console">
          <div className="console-header">
            <span className="console-title">[SMPJDC SECURE BOOT]</span>
            <span className="console-status blink">{statusText}</span>
          </div>
          <div className="console-body">
            {cyberLogs.slice(-4).map((log, idx) => (
              <p key={idx} className="console-line">{log}</p>
            ))}
          </div>
        </div>
        <div className="splash-footer cyber-footer">
          <p className="splash-title cyber-title">SMPJDC v2.0</p>
          <p className="splash-subtitle cyber-subtitle">SISTEM MANAGEMENT KEAMANAN JDC // DEVELOPER: RICHARD MEHA</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <div className={`jdc-root jdc-root-container dashboard-layout theme-${theme} ${currentTab === 'guard-simulator' ? 'in-simulator' : ''}`} style={{ position: 'relative', width: '100%', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <DeveloperWatermarkBackground theme={theme} />
      {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />}

      <aside className={`sidebar ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-logo-box">
            <img src="jdc-logo.png" alt="SMPJDC" className="logo-3d" />
          </div>
          <div>
            <h2>SMPJDC<span className="text-primary"> JDC</span></h2>
            <p>SISTEM MANAGEMENT KEAMANAN JDC</p>
          </div>
        </div>

        <div className="sidebar-user glass-panel" onClick={() => setShowProfileModal(true)} style={{ cursor: 'pointer' }}>
          <img src={currentUser.avatar} alt={currentUser.nama} className="sidebar-avatar" onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=60'; }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{currentUser.nama}</h4>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{currentUser.jabatan}</p>
          </div>
          <Mail size={14} style={{ color: 'var(--text-muted)', flexShrink: 0, opacity: 0.6 }} />
        </div>

        <nav className="sidebar-nav">

          {/* GOD MODE — Admin Super: semua menu */}
          {isGodMode && (
            <>
              <button onClick={() => handleNavClick('dashboard')} className={`nav-tab-btn ${currentTab === 'dashboard' ? 'active' : ''}`}>
                <LayoutDashboard size={18} /> <span>Dashboard Utama</span>
              </button>
              <button onClick={() => handleNavClick('absensi')} className={`nav-tab-btn ${currentTab === 'absensi' ? 'active' : ''}`}>
                <ClipboardList size={18} /> <span>Absensi & Plotting</span>
              </button>
              <button onClick={() => handleNavClick('target-compliance')} className={`nav-tab-btn ${currentTab === 'target-compliance' ? 'active' : ''}`}>
                <Target size={18} /> <span>Dashboard Target</span>
              </button>
              <button onClick={() => handleNavClick('barcodes')} className={`nav-tab-btn ${currentTab === 'barcodes' ? 'active' : ''}`}>
                <QrCode size={18} /> <span>Master & Barcode QR</span>
              </button>
              <button onClick={() => handleNavClick('mutasi')} className={`nav-tab-btn ${currentTab === 'mutasi' ? 'active' : ''}`}>
                <BookOpen size={18} /> <span>Mutasi Penjagaan</span>
              </button>
              <button onClick={() => handleNavClick('reports')} className={`nav-tab-btn ${currentTab === 'reports' ? 'active' : ''}`}>
                <FileSpreadsheet size={18} /> <span>Laporan & Export</span>
              </button>
              <button onClick={() => handleNavClick('user-management')} className={`nav-tab-btn ${currentTab === 'user-management' ? 'active' : ''}`}>
                <Users size={18} /> <span>Management User</span>
              </button>
              <button onClick={() => handleNavClick('roster')} className={`nav-tab-btn ${currentTab === 'roster' ? 'active' : ''}`}>
                <Calendar size={18} /> <span>Roster Jadwal Bulanan</span>
              </button>
              <button onClick={() => handleNavClick('backup')} className={`nav-tab-btn ${currentTab === 'backup' ? 'active' : ''}`}>
                <Database size={18} /> <span>Backup & Restore</span>
              </button>
              <button onClick={() => handleNavClick('complaint')} className={`nav-tab-btn ${currentTab === 'complaint' ? 'active' : ''}`}>
                <MessageSquare size={18} /> <span>Komplain Masuk</span>
              </button>
              <button onClick={() => handleNavClick('guard-simulator')} className={`nav-tab-btn ${currentTab === 'guard-simulator' ? 'active' : ''}`}
                style={{ marginTop: '1.5rem', border: '1px dashed var(--color-primary-glow)', background: currentTab === 'guard-simulator' ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.03)' }}>
                <Smartphone size={18} /> <span style={{ fontWeight: 600 }}>Simulasi HP Petugas</span>
              </button>
            </>
          )}

          {/* HIERARCHY ADMIN — Manajemen / SPV */}
          {isAdmin && !isClient && !isGodMode && (
            <>
              <button onClick={() => handleNavClick('dashboard')} className={`nav-tab-btn ${currentTab === 'dashboard' ? 'active' : ''}`}>
                <LayoutDashboard size={18} /> <span>Dashboard Management</span>
              </button>
              <button onClick={() => handleNavClick('absensi')} className={`nav-tab-btn ${currentTab === 'absensi' ? 'active' : ''}`}>
                <ClipboardList size={18} /> <span>Absensi & Plotting</span>
              </button>
              <button onClick={() => handleNavClick('target-compliance')} className={`nav-tab-btn ${currentTab === 'target-compliance' ? 'active' : ''}`}>
                <Target size={18} /> <span>Dashboard Target</span>
              </button>
              <button onClick={() => handleNavClick('barcodes')} className={`nav-tab-btn ${currentTab === 'barcodes' ? 'active' : ''}`}>
                <QrCode size={18} /> <span>Master & Barcode QR</span>
              </button>
              <button onClick={() => handleNavClick('mutasi')} className={`nav-tab-btn ${currentTab === 'mutasi' ? 'active' : ''}`}>
                <BookOpen size={18} /> <span>Mutasi Penjagaan</span>
              </button>
              <button onClick={() => handleNavClick('reports')} className={`nav-tab-btn ${currentTab === 'reports' ? 'active' : ''}`}>
                <FileSpreadsheet size={18} /> <span>Laporan & Export</span>
              </button>
              <button onClick={() => handleNavClick('complaint')} className={`nav-tab-btn ${currentTab === 'complaint' ? 'active' : ''}`}>
                <MessageSquare size={18} /> <span>Komplain Masuk</span>
              </button>
              <button onClick={() => handleNavClick('user-management')} className={`nav-tab-btn ${currentTab === 'user-management' ? 'active' : ''}`}>
                <Users size={18} /> <span>Management User</span>
              </button>
              <button onClick={() => handleNavClick('roster')} className={`nav-tab-btn ${currentTab === 'roster' ? 'active' : ''}`}>
                <Calendar size={18} /> <span>Roster Jadwal Bulanan</span>
              </button>
            </>
          )}

          {/* GUEST VIEWER */}
          {isClient && (
            <button onClick={() => handleNavClick('target-compliance')} className={`nav-tab-btn ${currentTab === 'target-compliance' ? 'active' : ''}`}>
              <Target size={18} /> <span>Dashboard Target SMPJDC</span>
            </button>
          )}

          {/* PATROL — Danru / Wadanru / Anggota */}
          {isPatrol && (
            <>
              {['Danru', 'Wadanru'].includes(currentUser.jabatan) && (
                <>
                  <button onClick={() => handleNavClick('absensi')} className={`nav-tab-btn ${currentTab === 'absensi' ? 'active' : ''}`}>
                    <ClipboardList size={18} /> <span>Absensi & Plotting</span>
                  </button>
                  <button onClick={() => handleNavClick('mutasi')} className={`nav-tab-btn ${currentTab === 'mutasi' ? 'active' : ''}`}>
                    <BookOpen size={18} /> <span>Mutasi Penjagaan</span>
                  </button>
                  <button onClick={() => handleNavClick('reports')} className={`nav-tab-btn ${currentTab === 'reports' ? 'active' : ''}`}>
                    <FileSpreadsheet size={18} /> <span>Laporan & Log Temuan</span>
                  </button>
                </>
              )}
              {['Danru', 'Wadanru', 'Anggota'].includes(currentUser.jabatan) && (
                <button onClick={() => handleNavClick('guard-simulator')} className={`nav-tab-btn ${currentTab === 'guard-simulator' ? 'active' : ''}`}
                  style={{ border: '1px dashed var(--color-primary-glow)', background: currentTab === 'guard-simulator' ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.03)' }}>
                  <Smartphone size={18} /> <span style={{ fontWeight: 600 }}>Aplikasi Patroli</span>
                </button>
              )}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-info">
            <Building size={14} />
            <span>SMPJDC - Jakarta Design Center</span>
          </div>
          <button onClick={toggleTheme} className="theme-toggle-btn" title={`Mode ${theme === 'dark' ? 'Terang' : 'Gelap'}`}>
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            <span>{theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}</span>
          </button>
          <button onClick={() => window.location.hash = '#/tenantadmin'} className="sidebar-logout-btn" style={{ borderColor: 'rgba(59, 130, 246, 0.3)', color: '#3b82f6', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }} title="Kembali ke Dashboard">
            <ArrowLeft size={15} />
            <span>Kembali ke Absensi</span>
          </button>
          <button onClick={handleLogout} className="sidebar-logout-btn" title="Keluar">
            <LogOut size={15} />
            <span>Keluar</span>
          </button>
          <div className="sidebar-footer-copy" style={{ opacity: 0.9, padding: '0 0.5rem' }}>
            <div style={{ fontSize: '0.65rem', marginBottom: '0.2rem', opacity: 0.6 }}>© 2026 SMPJDC. Hak Cipta Dilindungi.</div>
            <OrnamentalWatermark />
          </div>
        </div>
        <div className="sidebar-spacer" />
      </aside>

      <main className="main-content" tabIndex={-1} id="main-scroll-container">
        <header className={`global-header ${currentTab === 'guard-simulator' ? 'hide-on-simulator-mobile' : ''}`}>
          <div className="header-left">
            <div className="header-brand-row">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="menu-toggle-btn" aria-label="Toggle Sidebar">
                {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div className="header-logo-box">
                <img src="jdc-logo.png" alt="SMPJDC" className="logo-3d" />
              </div>
              <div className="header-brand-text">
                <span className="header-brand-name">SMPJDC</span>
                <h1 className="header-page-title">
                  {currentTab === 'dashboard' && 'Dashboard Manajemen Keamanan'}
                  {currentTab === 'absensi' && 'Absensi & Plotting Penjagaan'}
                  {currentTab === 'target-compliance' && 'Dashboard Target & SLA'}
                  {currentTab === 'barcodes' && 'Master Area & Barcode Generator'}
                  {currentTab === 'mutasi' && 'Mutasi Penjagaan'}
                  {currentTab === 'reports' && 'Laporan Patroli & Log Temuan'}
                  {currentTab === 'guard-simulator' && (isGodMode ? 'Simulasi HP Petugas' : 'Aplikasi Patroli')}
                  {currentTab === 'user-management' && 'Management User'}
                  {currentTab === 'roster' && 'Roster Jadwal Kerja Bulanan'}
                  {currentTab === 'backup' && 'Backup & Restore Data'}
                  {currentTab === 'lapor' && 'Lapor Cepat'}
                  {currentTab === 'complaint' && 'Komplain Masuk & Management Tiket'}
                </h1>
              </div>
            </div>
          </div>

          <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {offlineQueueCount > 0 && (
              <button 
                onClick={() => {
                  setSyncTrigger(prev => prev + 1);
                  addToast('Sinkronisasi manual dipicu...', 'info');
                }}
                className="header-status-badge"
                style={{
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  color: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  cursor: 'pointer',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '20px',
                  fontSize: '0.72rem',
                  fontWeight: 700
                }}
                title="Klik untuk sinkronisasi paksa"
              >
                <RefreshCw size={12} className="spin-slow" />
                <span>{offlineQueueCount} Antrean</span>
              </button>
            )}
            <div className={`header-status-badge ${isOnline ? 'status-online' : 'status-offline'}`} title={isOnline ? 'Koneksi Terhubung' : 'Koneksi Terputus'}>
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
            <div className="header-user-badge">
              <Shield size={14} />
              <span>{currentUser.nama} ({jabatanShort[currentUser.jabatan] || currentUser.jabatan})</span>
            </div>
          </div>
        </header>

        <div className="animate-slide-up">
          {currentTab === 'dashboard' && (isGodMode || (isAdmin && !isClient)) && (
            <Suspense fallback={<div className="loading-pulse" style={{padding:'2rem',textAlign:'center',color:'var(--text-muted)'}}>Memuat Dashboard...</div>}>
            <ManagementDashboard
              theme={theme}
              reports={reports} findings={findings} areas={areas} users={users}
              attendanceLogs={attendanceLogs} mutasiLogs={mutasiLogs} complaints={complaints}
              onUpdateStatus={updateFindingStatus} onDispatchFinding={dispatchFinding}
              onUpdateComplaint={handleUpdateComplaint}
              onDeleteComplaint={handleDeleteComplaint}
              onDeleteFinding={handleDeleteFinding}
              onArchiveOldData={handleArchiveOldData}
            />
            </Suspense>
          )}

          {currentTab === 'absensi' && (isGodMode || isAdmin || ['Danru', 'Wadanru'].includes(currentUser.jabatan)) && (
            <AbsensiRegu 
              users={users} 
              areas={areas}
              posList={posList}
              attendanceLogs={attendanceLogs} 
              currentUser={currentUser}
              onUpdateUser={handleUpdateUser}
              reports={reports}
              onAddAttendance={(newAttendance) => {
                const id = `att-${Date.now()}`;
                setAttendanceLogs(prev => {
                  const existingIndex = prev.findIndex(
                    l => l.tanggal === newAttendance.tanggal && l.regu === newAttendance.regu && l.shift === newAttendance.shift
                  );
                  if (existingIndex > -1) {
                    const updated = [...prev];
                    updated[existingIndex] = { id: prev[existingIndex].id, ...newAttendance };
                    addToast(`Absensi ${newAttendance.regu} (${newAttendance.tanggal}) berhasil diperbarui`, 'success');
                    const fbId = prev[existingIndex].supabaseId || prev[existingIndex].firebaseId;
                    if (fbId) {
                      updateAttendanceLogInFirestore(fbId, newAttendance).catch(e => addToast(`Gagal update absensi: ${e.message}`, 'warning'));
                    }
                    return updated;
                  } else {
                    const entry = { id, ...newAttendance };
                    addAttendanceLogToFirestore(entry).then(fid => {
                      if (fid) {
                        setAttendanceLogs(prev => prev.map(a =>
                          a.id === id ? { ...a, supabaseId: fid, firebaseId: fid } : a
                        ));
                      }
                    }).catch(e => addToast(`Gagal sync absensi: ${e.message}`, 'warning'));
                    addToast(`Absensi ${newAttendance.regu} (${newAttendance.tanggal}) berhasil disimpan`, 'success');
                    return [...prev, entry];
                  }
                });
              }} 
            />
          )}

          {currentTab === 'target-compliance' && (
            <TargetDashboard reports={reports} findings={findings} areas={areas} currentUser={currentUser} isClient={isClient} />
          )}

          {currentTab === 'barcodes' && (isGodMode || (isAdmin && !isClient)) && (
            <Suspense fallback={<div className="loading-pulse" style={{padding:'2rem',textAlign:'center',color:'var(--text-muted)'}}>Memuat...</div>}>
            <BarcodeGenerator areas={areas} onAddArea={handleAddArea} onUpdateArea={handleUpdateArea} onDeleteArea={handleDeleteArea} posList={posList} onAddPos={handleAddPos} onUpdatePos={handleUpdatePos} onDeletePos={handleDeletePos} users={users} onAddUser={handleAddUser} addToast={addToast} />
            </Suspense>
          )}

          {currentTab === 'mutasi' && (isGodMode || (isAdmin && !isClient) || ['Danru', 'Wadanru', 'Anggota'].includes(currentUser?.jabatan)) && (
            <MutasiPenjagaan currentUser={currentUser} logs={mutasiLogs} onAddLog={handleAddMutasi} onDeleteLog={handleDeleteMutasi} areas={areas} posList={posList} canViewResults={isGodMode || isAdmin} />
          )}

          {currentTab === 'reports' && (isGodMode || (isAdmin && !isClient) || ['Danru', 'Wadanru'].includes(currentUser?.jabatan)) && (
            <ReportsExport reports={reports} findings={findings} users={users} onUpdateFindingStatus={updateFindingStatus} onDispatchFinding={dispatchFinding} onDeleteReport={handleDeleteReport} />
          )}

          {currentTab === 'guard-simulator' && currentUser && (isGodMode || ['Danru', 'Wadanru', 'Anggota'].includes(currentUser.jabatan)) && (
            <div className="mobile-simulator-container">
              <Suspense fallback={<div className="loading-pulse" style={{padding:'2rem',textAlign:'center',color:'var(--text-muted)'}}>Memuat Panel Patroli...</div>}>
              <SecurityPatrolApp 
                currentUser={currentUser} 
                areas={areas} 
                posList={posList} 
                attendanceLogs={attendanceLogs} 
                reports={reports} 
                findings={findings} 
                mutasiLogs={mutasiLogs} 
                onAddReport={handleAddReport} 
                onAddLog={handleAddMutasi} 
                onTriggerSOS={triggerSOS}
                onAddAttendance={(newAttendance) => {
                  const id = `att-${Date.now()}`;
                  setAttendanceLogs(prev => {
                    const existingIndex = prev.findIndex(
                      l => l.tanggal === newAttendance.tanggal && l.regu === newAttendance.regu && l.shift === newAttendance.shift
                    );
                    if (existingIndex > -1) {
                      const updated = [...prev];
                      updated[existingIndex] = { id: prev[existingIndex].id, ...newAttendance };
                      addToast(`Presensi Anda berhasil disimpan`, 'success');
                      const fbId = prev[existingIndex].supabaseId || prev[existingIndex].firebaseId;
                      if (fbId) {
                        updateAttendanceLogInFirestore(fbId, newAttendance).catch(e => addToast(`Gagal update absensi: ${e.message}`, 'warning'));
                      }
                      return updated;
                    } else {
                      const entry = { id, ...newAttendance };
                      addAttendanceLogToFirestore(entry).then(fid => {
                        if (fid) {
                          setAttendanceLogs(prev => prev.map(a =>
                            a.id === id ? { ...a, supabaseId: fid, firebaseId: fid } : a
                          ));
                        }
                      }).catch(e => addToast(`Gagal sync absensi: ${e.message}`, 'warning'));
                      addToast(`Presensi Anda berhasil disimpan`, 'success');
                      return [...prev, entry];
                    }
                  });
                }}
              />
              </Suspense>
            </div>
          )}

          {currentTab === 'user-management' && (isGodMode || isAdmin) && (
            <UserManagement users={users} currentUser={currentUser} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser} onSaveWAContacts={handleSaveWAContacts} />
          )}

          {currentTab === 'roster' && (isGodMode || isAdmin) && (
            <RosterManagement users={users} currentUser={currentUser} />
          )}  

          {currentTab === 'backup' && isSuperAdmin && (
            <div style={{ padding: '1rem 0' }}>
              <BackupRestore addToast={addToast} onResetUsers={handleResetUsers} onClearAllData={handleClearAllData} />
            </div>
          )}

          {currentTab === 'lapor' && isPatrol && (
            <LaporForm currentUser={currentUser} areas={areas} posList={posList} onAddReport={handleAddReport} onAddLog={handleAddMutasi} />
          )}

          {currentTab === 'complaint' && (isGodMode || (isAdmin && !isClient)) && (
            <Suspense fallback={<div className="loading-pulse" style={{padding:'2rem',textAlign:'center',color:'var(--text-muted)'}}>Memuat...</div>}>
            <ComplaintAdmin complaints={complaints} onUpdateComplaint={handleUpdateComplaint} onDeleteComplaint={handleDeleteComplaint} />
            </Suspense>
          )}

          <footer className={`app-footer ${currentTab === 'guard-simulator' ? 'hide-on-simulator-mobile' : ''}`}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', width: '100%' }}>
              <span>© 2026 <strong className="text-primary">SMPJDC</strong>. Hak Cipta Dilindungi.</span>
              <OrnamentalWatermark />
            </div>
          </footer>
        </div>
      </main>

      <BottomNav
        currentTab={currentTab}
        onNavClick={handleNavClick}
        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        user={currentUser}
        isSidebarOpen={isSidebarOpen}
      />

      {activeSOS && (
        <div className="panic-overlay">
          <div className="panic-card">
            <div className="panic-sos-icon">SOS</div>
            <h2 style={{ color: 'var(--color-danger)', fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 800 }}>DARURAT / EMERGENCY!</h2>
            <p style={{ color: 'var(--text-primary)', fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 500 }}>
              Petugas <span style={{ textDecoration: 'underline', fontWeight: 700 }}>{activeSOS.officer}</span> menekan Tombol SOS Panic!
            </p>
            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '2rem', textAlign: 'left', background: 'rgba(239, 68, 68, 0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Lokasi Kejadian:</span>
                <span style={{ fontWeight: 700 }}>{activeSOS.location}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Waktu Kejadian:</span>
                <span style={{ fontWeight: 700 }}>{activeSOS.time} WIB</span>
              </div>
            </div>
            <button onClick={clearSOS} className="btn-danger" style={{ width: '100%', padding: '1rem' }}>
              Matikan Alarm & Tanggapi Kejadian
            </button>
          </div>
        </div>
      )}

      {showExitConfirm && (
        <div className="panic-overlay" style={{ zIndex: 10000 }}>
          <div className="panic-card" style={{ maxWidth: '360px', width: '90%', background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: 'var(--border-radius-lg)' }}>
            <div className="panic-sos-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)' }}>
              <Shield size={32} />
            </div>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 800 }}>Keluar dari Aplikasi?</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Apakah Anda yakin ingin menutup aplikasi patroli SMPJDC?
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={handleExitApp} className="btn-danger" style={{ flex: 1, padding: '0.65rem', fontSize: '0.85rem', fontWeight: 700 }}>
                Ya, Keluar
              </button>
              <button onClick={handleCancelExit} className="btn-secondary" style={{ flex: 1, padding: '0.65rem', fontSize: '0.85rem', fontWeight: 700 }}>
                Tidak
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile & Email Reset Modal */}
      {showProfileModal && (
        <div className="sidebar-overlay" onClick={() => { setShowProfileModal(false); setVerifStep('idle'); setVerifError(''); }} style={{ zIndex: 200 }}>
          <div className="panic-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px', width: '90%', maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: 'var(--border-radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
                <Shield size={20} className="text-primary" /> Pengaturan Profil
              </h3>
              <button onClick={() => { setShowProfileModal(false); setVerifStep('idle'); setVerifError(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
            </div>

            {/* Modal Navigation Tabs */}
            <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem', marginBottom: '1.25rem', overflowX: 'auto', whiteSpace: 'nowrap' }} className="filter-tabs-wrap">
              <button onClick={() => { setActiveProfileTab('info'); setProfileError(''); setProfileSuccess(''); }} style={{ background: activeProfileTab === 'info' ? 'rgba(59, 130, 246, 0.15)' : 'transparent', border: 'none', color: activeProfileTab === 'info' ? 'var(--color-primary)' : 'var(--text-secondary)', padding: '0.5rem 0.8rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>Informasi</button>
              <button onClick={() => { setActiveProfileTab('photo'); setProfileError(''); setProfileSuccess(''); }} style={{ background: activeProfileTab === 'photo' ? 'rgba(59, 130, 246, 0.15)' : 'transparent', border: 'none', color: activeProfileTab === 'photo' ? 'var(--color-primary)' : 'var(--text-secondary)', padding: '0.5rem 0.8rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>Foto Profil</button>
              <button onClick={() => { setActiveProfileTab('pin'); setProfileError(''); setProfileSuccess(''); }} style={{ background: activeProfileTab === 'pin' ? 'rgba(59, 130, 246, 0.15)' : 'transparent', border: 'none', color: activeProfileTab === 'pin' ? 'var(--color-primary)' : 'var(--text-secondary)', padding: '0.5rem 0.8rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>PIN Keamanan</button>
              <button onClick={() => { setActiveProfileTab('email'); setProfileError(''); setProfileSuccess(''); }} style={{ background: activeProfileTab === 'email' ? 'rgba(59, 130, 246, 0.15)' : 'transparent', border: 'none', color: activeProfileTab === 'email' ? 'var(--color-primary)' : 'var(--text-secondary)', padding: '0.5rem 0.8rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>Verifikasi Email</button>
            </div>

            {/* Profile Notifications */}
            {profileError && (
              <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.15)', marginBottom: '1rem', textAlign: 'left' }}>
                ⚠️ {profileError}
              </div>
            )}
            {profileSuccess && (
              <div style={{ fontSize: '0.75rem', color: 'var(--color-success)', background: 'rgba(16, 185, 129, 0.1)', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.15)', marginBottom: '1rem', textAlign: 'left' }}>
                ✅ {profileSuccess}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Tab: Info */}
              {activeProfileTab === 'info' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-glass)' }}>
                    <img src={currentUser.avatar} alt="" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--color-primary)' }} onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&fit=crop'; }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{currentUser.nama}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{currentUser.jabatan}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>NRP: {currentUser.nrp} • Regu: {currentUser.regu || '-'}</div>
                    </div>
                  </div>
                  
                  <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(255, 255, 255, 0.01)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Status Akun:</span>
                      <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>AKTIF / SECURE</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Email Terdaftar:</span>
                      <span style={{ fontWeight: 600 }}>{currentUser.email || '(Belum disinkronkan)'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>No. WhatsApp:</span>
                      {editingWA ? (
                        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                          <input value={editWAValue} onChange={e => setEditWAValue(e.target.value)} placeholder="6281234567890" style={{ width: '130px', padding: '0.25rem 0.4rem', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid var(--border-glass)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                          <button onClick={handleSaveWA} style={{ border: 'none', background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 }} title="Simpan"><Check size={12} /></button>
                          <button onClick={() => setEditingWA(false)} style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.7rem', padding: '0.2rem 0.3rem' }} title="Batal">✕</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600 }}>{currentUser.nomorHp || <span style={{ color: 'var(--text-muted)' }}>Belum diisi</span>}</span>
                          <button onClick={() => { setEditWAValue(currentUser.nomorHp || ''); setEditingWA(true); }} style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '0' }} title="Ubah No. WA"><Smartphone size={12} /></button>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Sumber Sesi:</span>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{currentUser.firebaseId ? `Cloud (FB-${currentUser.firebaseId.slice(0,6)})` : 'Local Storage'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Photo */}
              {activeProfileTab === 'photo' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '0.5rem' }}>
                    <img src={tempAvatar} alt="Preview Avatar" style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--color-primary)', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }} onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&fit=crop'; }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Preview Foto Profil</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label className="photo-upload-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px dashed var(--color-primary)', background: 'rgba(59, 130, 246, 0.05)', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}>
                      <Camera size={16} /> Ambil / Upload Foto Baru
                      <input type="file" accept="image/*" onChange={e => {
                        const f = e.target.files[0];
                        if (f) {
                          const r = new FileReader();
                          r.onloadend = () => {
                            compressImage(r.result, 400, 400, 0.6).then(compressed => setTempAvatar(compressed));
                          };
                          r.readAsDataURL(f);
                        }
                        e.target.value = '';
                      }} hidden />
                    </label>

                    {/* Presets Grid */}
                    <div style={{ textAlign: 'left' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Atau Pilih Avatar Default:</span>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between' }}>
                        {[
                          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&fit=crop',
                          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&fit=crop',
                          'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&fit=crop',
                          'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&fit=crop',
                          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&fit=crop'
                        ].map((url, idx) => (
                          <img 
                            key={idx} 
                            src={url} 
                            alt="" 
                            onClick={() => setTempAvatar(url)}
                            style={{ 
                              width: '42px', 
                              height: '42px', 
                              borderRadius: '50%', 
                              objectFit: 'cover', 
                              cursor: 'pointer', 
                              border: tempAvatar === url ? '3.5px solid var(--color-primary)' : '2px solid transparent',
                              transition: 'all 0.2s',
                              opacity: tempAvatar === url ? 1 : 0.75
                            }} 
                          />
                        ))}
                      </div>
                    </div>

                    <button onClick={handleUpdateAvatar} className="btn-primary" style={{ width: '100%', padding: '0.75rem', fontSize: '0.8rem', fontWeight: 700, marginTop: '0.5rem' }}>
                      Simpan Foto Profil
                    </button>
                  </div>
                </div>
              )}

              {/* Tab: PIN */}
              {activeProfileTab === 'pin' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div className="form-field">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Lock size={12} /> PIN Keamanan Saat Ini</label>
                    <input 
                      type="password" 
                      value={currentPin} 
                      onChange={e => setCurrentPin(e.target.value.slice(0, 12))} 
                      placeholder="Masukkan PIN saat ini" 
                      className="modern-input" 
                      style={{ fontSize: '0.82rem' }} 
                    />
                  </div>
                  
                  <div className="form-field">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Lock size={12} /> PIN Baru</label>
                    <input 
                      type="password" 
                      value={newPin} 
                      onChange={e => setNewPin(e.target.value.slice(0, 12))} 
                      placeholder="Masukkan PIN baru" 
                      className="modern-input" 
                      style={{ fontSize: '0.82rem' }} 
                    />
                  </div>
                  
                  <div className="form-field">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Lock size={12} /> Konfirmasi PIN Baru</label>
                    <input 
                      type="password" 
                      value={confirmPin} 
                      onChange={e => setConfirmPin(e.target.value.slice(0, 12))} 
                      placeholder="Ulangi PIN baru" 
                      className="modern-input" 
                      style={{ fontSize: '0.82rem' }} 
                    />
                  </div>

                  <button onClick={handleUpdatePin} className="btn-primary" style={{ width: '100%', padding: '0.75rem', fontSize: '0.8rem', fontWeight: 700, marginTop: '0.5rem' }}>
                    Perbarui PIN Keamanan
                  </button>
                </div>
              )}

              {/* Tab: Email */}
              {activeProfileTab === 'email' && (
                <div className="glass-panel" style={{ padding: '1.25rem', background: 'rgba(255, 255, 255, 0.01)', border: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <Mail size={16} className="text-primary" />
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Email & Verifikasi</span>
                  </div>

                  {verifStep === 'idle' && (
                    <>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                        Email saat ini: <strong style={{ color: 'var(--text-primary)' }}>{currentUser.email || '(belum diatur)'}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Masukkan email baru" className="modern-input" style={{ fontSize: '0.82rem' }} />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={handleSendVerification} className="btn-primary" style={{ flex: 1, padding: '0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                            <Key size={14} /> Kirim Kode Verifikasi
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {verifStep === 'verify' && (
                    <>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                        Kode verifikasi telah dikirim ke <strong>{verifMethod === 'email' ? newEmail : 'WhatsApp'}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <input type="text" value={verifCode} onChange={e => setVerifCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Masukkan kode 6 digit" className="modern-input" style={{ fontSize: '1.1rem', textAlign: 'center', letterSpacing: '0.3em', fontWeight: 700 }} maxLength={6} />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={handleVerifyCode} className="btn-primary" style={{ flex: 1, padding: '0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                            <Check size={14} /> Verifikasi & Simpan
                          </button>
                        </div>
                        <button onClick={() => { setVerifStep('idle'); setVerifError(''); setVerifCode(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', padding: '0.25rem' }}>← Kembali</button>
                      </div>
                    </>
                  )}

                  {verifStep === 'done' && (
                    <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem' }}>Email Berhasil Diperbarui!</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Email baru: <strong style={{ color: 'var(--color-primary)' }}>{newEmail}</strong></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Offline Banner */}
      {!isOnline && (
        <div className="offline-banner">
          <span>⚠️ Koneksi terputus — data aman di lokal, sync otomatis saat online kembali</span>
        </div>
      )}

      <ConfirmModal
        show={!!confirmDelete}
        title={confirmDelete?.title}
        message={confirmDelete?.message}
        confirmLabel={confirmDelete?.confirmLabel}
        variant={confirmDelete?.variant}
        onConfirm={confirmDelete?.onConfirm}
        onCancel={confirmDelete?.onCancel}
      />

      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className="glass-panel toast-item" style={{
            borderLeft: `4px solid ${
              t.type === 'success' ? 'var(--color-success)' : 
              t.type === 'danger' ? 'var(--color-danger)' : 
              t.type === 'warning' ? 'var(--color-warning)' : 'var(--color-primary)'
            }`
          }}>
            <span>{t.message}</span>
          </div>
        ))}
      </div>

    </div>
    </ErrorBoundary>
  );
}
