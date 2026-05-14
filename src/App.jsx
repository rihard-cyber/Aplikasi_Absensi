import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { requestAppPermissions } from './utils/permissionInit';
import { ToastProvider, useToast } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmDialog';
import { supabase } from './utils/supabaseClient';

const AttendanceScreen = lazy(() => import('./pages/Employee/AttendanceScreen'));
const CommandCenter = lazy(() => import('./pages/SuperAdmin/CommandCenter'));
const TenantDashboard = lazy(() => import('./pages/TenantAdmin/TenantDashboard'));
const AuthPortal = lazy(() => import('./pages/Auth/AuthPortal'));
const SubAdminDashboard = lazy(() => import('./pages/SubAdmin/SubAdminDashboard'));

// Komponen Pembungkus Transisi Halaman (Efek Blur & Scale yang mulus)
const PageTransition = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 1.02 }}
    transition={{ duration: 0.4, ease: "easeInOut" }}
    className="w-full min-h-screen overflow-x-hidden gpu-accelerate"
  >
    {children}
  </motion.div>
);

// Health check: test Supabase connectivity via DNS (simple GET, no custom headers = no CORS preflight)
const useSupabaseHealthCheck = () => {
  const toast = useToast();
  useEffect(() => {
    const controller = new AbortController();
    const check = async () => {
      try {
        const url = import.meta.env.VITE_SUPABASE_URL || 'https://bhauqlobuiuavaoeoawc.supabase.co';
        const res = await fetch(url, { method: 'HEAD', mode: 'no-cors', signal: controller.signal });
        if (res.type === 'error') {
          toast('Supabase tidak dapat dijangkau. Cek koneksi internet atau restore project di Supabase Dashboard.', 'error');
        }
      } catch (e) {
        if (e.name !== 'AbortError') {
          toast('Supabase tidak dapat dijangkau. Cek koneksi internet atau restore project.', 'error');
        }
      }
    };
    check();
    return () => controller.abort();
  }, []);
};

// Komponen Rute Animasi agar `useLocation` dapat menangkap perubahan path
const AppRoutes = ({ isAuthenticated, userRole, originalRole, handleLogin, handleImpersonate, handleGodModeReturn, handleLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  useSupabaseHealthCheck();

  // Wrapper that sets role AND navigates to correct path
  const handleImpersonateWithNav = (role) => {
    handleImpersonate(role);
    if (role === 'TENANT_ADMIN') navigate('/tenantadmin');
    else if (role === 'EMPLOYEE') navigate('/');
  };

  const handleGodModeReturnWithNav = () => {
    handleGodModeReturn();
    navigate('/superadmin');
  };

  // Back-button Anti-Exit Logic (Android + Web)
  const [backCount, setBackCount] = useState(0);
  const [showExitModal, setShowExitModal] = useState(false);
  const backTimeoutRef = useRef(null);

  const isRootRoute = () => {
    const hash = window.location.hash;
    return !hash || hash === '#/' || hash === '#/login';
  };

  const onBackPressed = useCallback(() => {
    if (isRootRoute()) {
      setBackCount(prev => {
        const next = prev + 1;
        if (backTimeoutRef.current) clearTimeout(backTimeoutRef.current);
        backTimeoutRef.current = setTimeout(() => setBackCount(0), 2000);
        if (next >= 2) {
          setShowExitModal(true);
          return 0;
        }
        return next;
      });
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    // Web fallback (local only, Capacitor handles back natively)
    window.addEventListener('popstate', onBackPressed);
    return () => window.removeEventListener('popstate', onBackPressed);
  }, [onBackPressed]);

  const handleCycleRole = () => {
    if (sessionStorage.getItem('god_key') !== 'DEWA-999') return;
    
    const roles = ['SUPER_ADMIN', 'TENANT_ADMIN', 'SUB_ADMIN', 'EMPLOYEE'];
    const currentIdx = roles.indexOf(userRole);
    const nextRole = roles[(currentIdx + 1) % roles.length];
    
    handleLogin(nextRole);
    if (nextRole === 'SUPER_ADMIN') navigate('/superadmin');
    else if (nextRole === 'TENANT_ADMIN') navigate('/tenantadmin');
    else if (nextRole === 'SUB_ADMIN') navigate('/subadmin');
    else if (nextRole === 'EMPLOYEE') navigate('/');
    
    if (window.navigator?.vibrate) window.navigator.vibrate([100, 50, 100]);
  };

  return (
    <>
      {/* GOD MODE INDICATOR */}
      {sessionStorage.getItem('god_key') === 'DEWA-999' && (
        <div 
          onClick={handleCycleRole}
          className="fixed top-2 left-1/2 -translate-x-1/2 z-[9999] px-4 py-1 bg-[var(--danger)] text-white text-[10px] font-bold rounded-full shadow-[0_0_15px_rgba(255,0,85,0.5)] border border-white/20 animate-pulse cursor-pointer hover:bg-red-600 transition-colors active:scale-95 safe-top"
          title="Klik untuk Pindah Dasbor"
        >
          GOD MODE ACTIVE (TAP TO SWITCH DASHBOARD)
        </div>
      )}

      {/* EXIT CONFIRMATION MODAL */}
      <AnimatePresence>
        {showExitModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-md p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-sm glass-panel p-8 text-center border border-white/10"
            >
              <h3 className="text-xl font-serif font-bold text-white mb-2">Yakin ingin keluar?</h3>
              <p className="text-sm text-gray-400 mb-8">Anda akan keluar dari aplikasi RichardMeha SI PRESENSI.</p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleLogout}
                  className="w-full py-4 rounded-xl bg-[var(--danger)] text-white font-bold uppercase tracking-widest text-xs"
                >
                  Ya, Keluar Aplikasi
                </button>
                <button 
                  onClick={() => setShowExitModal(false)}
                  className="w-full py-4 rounded-xl bg-white/5 text-gray-400 font-bold uppercase tracking-widest text-xs border border-white/5"
                >
                  Tidak, Tetap di Sini
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Suspense fallback={
        <div className="min-h-screen bg-[var(--bg-darker)] flex items-center justify-center">
          <div className="flex flex-col items-center gap-6 animate-pulse">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] p-[2px] shadow-[0_0_30px_rgba(142,45,226,0.3)]">
              <div className="w-full h-full bg-[var(--bg-darker)] rounded-[22px] flex items-center justify-center font-serif font-bold text-white text-lg">SP</div>
            </div>
            <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-bold">Memuat...</p>
          </div>
        </div>
      }>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Unified Triple-Gate Portal */}
          <Route
            path="/login"
            element={!isAuthenticated 
              ? <PageTransition><AuthPortal onLogin={handleLogin} /></PageTransition> 
              : <Navigate to={userRole === 'SUPER_ADMIN' ? '/superadmin' : userRole === 'TENANT_ADMIN' ? '/tenantadmin' : userRole === 'SUB_ADMIN' ? '/subadmin' : '/'} replace />
            }
          />

          {/* Employee / Attendance Route (all roles bisa absen) */}
          <Route
            path="/"
            element={
              isAuthenticated && (userRole === 'EMPLOYEE' || userRole === 'TENANT_ADMIN' || userRole === 'SUB_ADMIN')
                ? <PageTransition><AttendanceScreen onGodModeReturn={handleGodModeReturnWithNav} isImpersonating={originalRole === 'SUPER_ADMIN'} onCycleRole={handleCycleRole} /></PageTransition>
                : isAuthenticated && userRole === 'SUPER_ADMIN' ? <Navigate to="/superadmin" replace />
                : <Navigate to="/login" replace />
            }
          />

          {/* Super Admin Route */}
          <Route
            path="/superadmin"
            element={
              isAuthenticated && userRole === 'SUPER_ADMIN' 
                ? <PageTransition><CommandCenter onImpersonate={handleImpersonateWithNav} onCycleRole={handleCycleRole} onLogout={handleLogout} /></PageTransition>
                : isAuthenticated ? <Navigate to="/" replace />
                : <Navigate to="/login" replace />
            }
          />

          {/* Tenant Admin Route */}
          <Route
            path="/tenantadmin"
            element={
              isAuthenticated && userRole === 'TENANT_ADMIN' 
                ? <PageTransition><TenantDashboard onGodModeReturn={handleGodModeReturnWithNav} isImpersonating={originalRole === 'SUPER_ADMIN'} onCycleRole={handleCycleRole} onLogout={handleLogout} /></PageTransition>
                : isAuthenticated ? <Navigate to="/" replace />
                : <Navigate to="/login" replace />
            }
          />

          {/* Sub Admin / Otoritas Tim Route */}
          <Route
            path="/subadmin"
            element={
              isAuthenticated && (userRole === 'SUB_ADMIN' || userRole === 'TENANT_ADMIN' || userRole === 'SUPER_ADMIN')
                ? <PageTransition><SubAdminDashboard onCycleRole={handleCycleRole} /></PageTransition>
                : isAuthenticated ? <Navigate to="/" replace />
                : <Navigate to="/login" replace />
            }
          />

          <Route path="*" element={isAuthenticated ? <Navigate to="/" replace /> : <Navigate to="/login" replace />} />
        </Routes>
      </AnimatePresence>
      </Suspense>
    </>
  );
};

function App() {
  // PERSISTENCE LOGIC: Load initial state from localStorage
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('is_authenticated') === 'true';
  });
  const [userRole, setUserRole] = useState(() => {
    const stored = localStorage.getItem('user_role');
    return stored ? stored.toUpperCase() : null;
  });
  const [originalRole, setOriginalRole] = useState(() => {
    const stored = localStorage.getItem('original_role');
    return stored ? stored.toUpperCase() : null;
  });

  // Sync state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('is_authenticated', isAuthenticated);
    if (userRole) localStorage.setItem('user_role', userRole);
    else localStorage.removeItem('user_role');
    
    if (originalRole) localStorage.setItem('original_role', originalRole);
    else localStorage.removeItem('original_role');
  }, [isAuthenticated, userRole, originalRole]);

  const handleLogin = (role) => {
    setUserRole(role?.toUpperCase());
    setIsAuthenticated(true);
    setOriginalRole(null);
  };

  const handleImpersonate = (role) => {
    if (userRole === 'SUPER_ADMIN') {
      setOriginalRole('SUPER_ADMIN');
      setUserRole(role?.toUpperCase());
    }
  };

  const handleGodModeReturn = () => {
    if (originalRole === 'SUPER_ADMIN') {
      setUserRole('SUPER_ADMIN');
      setOriginalRole(null);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setOriginalRole(null);
    sessionStorage.removeItem('god_key');
    sessionStorage.removeItem('operational_access');
    localStorage.clear();
  };

  // Session Heartbeat
  useEffect(() => {
    const heartbeat = setInterval(() => {
        if (isAuthenticated) {
        // Re-validate session with supabase if needed
      }
    }, 60000); // Every 1 minute
    return () => clearInterval(heartbeat);
  }, [isAuthenticated]);

  // Request permissions at startup (Android)
  useEffect(() => {
    requestAppPermissions().catch(() => {});
  }, []);

  return (
    <HashRouter>
      <ToastProvider>
        <ConfirmProvider>
        <AppRoutes
          isAuthenticated={isAuthenticated}
          userRole={userRole}
          originalRole={originalRole}
          handleLogin={handleLogin}
          handleImpersonate={handleImpersonate}
          handleGodModeReturn={handleGodModeReturn}
          handleLogout={handleLogout}
        />
        </ConfirmProvider>
      </ToastProvider>
    </HashRouter>
  );
}

export default App;
