import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { requestAppPermissions } from './utils/permissionInit';
import { ToastProvider, useToast } from './components/Toast';
import { ThemeProvider } from './context/ThemeContext';
import { ConfirmProvider } from './components/ConfirmDialog';
import { NotificationProvider } from './components/Notifications';
import OfflineIndicator from './components/OfflineIndicator';
import { supabase } from './utils/supabaseClient';
import ErrorBoundary from './components/ErrorBoundary';

const AttendanceScreen = lazy(() => import('./pages/Employee/AttendanceScreen'));
const AuthPortal = lazy(() => import('./pages/Auth/AuthPortal'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const NotFound = lazy(() => import('./pages/NotFound'));
const CommandCenter = lazy(() => import('./pages/SuperAdmin/CommandCenter'));
const TenantDashboard = lazy(() => import('./pages/TenantAdmin/TenantDashboard'));
const SubAdminDashboard = lazy(() => import('./pages/SubAdmin/SubAdminDashboard'));
const ResetPassword = lazy(() => import('./pages/Auth/ResetPassword'));
const QRScanner = lazy(() => import('./pages/Employee/components/QRScanner'));

const LoadingScreen = () => (
  <div className="fixed inset-0 bg-[#0B0C10] z-[99999] flex items-center justify-center">
    <div className="flex flex-col items-center gap-6">
      <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] p-[2px] shadow-[0_0_40px_rgba(142,45,226,0.4)] animate-pulse">
        <div className="w-full h-full bg-[#0B0C10] rounded-[22px] flex items-center justify-center font-serif font-bold text-white text-lg relative overflow-hidden">
          <span className="relative z-10">SP</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 rounded-full bg-[var(--aurora-1)] animate-bounce" style={{ animationDelay: '0s' }} />
        <div className="w-2 h-2 rounded-full bg-[var(--aurora-3)] animate-bounce" style={{ animationDelay: '0.15s' }} />
        <div className="w-2 h-2 rounded-full bg-[var(--aurora-1)] animate-bounce" style={{ animationDelay: '0.3s' }} />
      </div>
      <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-bold">Memuat...</p>
    </div>
  </div>
);

// Komponen Pembungkus Transisi Halaman (Efek Blur & Scale yang mulus)
const PageTransition = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 1.02 }}
    transition={{ duration: 0.4, ease: "easeInOut" }}
    className="w-full min-h-screen overflow-x-hidden"
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
        const url = import.meta.env.VITE_SUPABASE_URL;
        if (!url) return;
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

// Page loading bar
const RouteLoadingBar = () => {
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, [location]);
  return (
    <div className="fixed top-0 left-0 right-0 z-[99999] h-0.5">
      <div className={`h-full bg-gradient-to-r from-[var(--aurora-1)] via-[var(--aurora-3)] to-[var(--aurora-1)] transition-all duration-300 ease-out ${loading ? 'w-full opacity-100' : 'w-0 opacity-0'}`} style={{ backgroundSize: '200% 100%', animation: 'running-light 2s linear infinite' }} />
    </div>
  );
};

// Komponen Rute Animasi agar `useLocation` dapat menangkap perubahan path
const AppRoutes = ({ isAuthenticated, authLoading, userRole, originalRole, handleLogin, handleImpersonate, handleGodModeReturn, handleLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [navStack, setNavStack] = useState([]);
  useSupabaseHealthCheck();

  // Track navigation history
  useEffect(() => {
    setNavStack(prev => {
      if (prev.length === 0 || prev[prev.length - 1] !== location.pathname) {
        return [...prev, location.pathname].slice(-10);
      }
      return prev;
    });
  }, [location.pathname]);

  const handleGoBack = useCallback(() => {
    if (navStack.length >= 2) {
      navigate(navStack[navStack.length - 2]);
    } else if (location.pathname === '/login') {
      return;
    } else {
      navigate('/');
    }
  }, [navStack, navigate, location.pathname]);

  // Add popstate listener for Android back button
  useEffect(() => {
    const handler = () => handleGoBack();
    window.addEventListener('app-go-back', handler);
    return () => window.removeEventListener('app-go-back', handler);
  }, [handleGoBack]);

  // Wrapper that sets role AND navigates to correct path
  const handleImpersonateWithNav = (role) => {
    handleImpersonate(role);
    if (role === 'TENANT_ADMIN') navigate('/tenantadmin');
    else if (role === 'EMPLOYEE') navigate('/app');
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
    if (userRole !== 'SUPER_ADMIN' && originalRole !== 'SUPER_ADMIN') return;
    
    const roles = ['SUPER_ADMIN', 'TENANT_ADMIN', 'SUB_ADMIN', 'EMPLOYEE'];
    const currentIdx = roles.indexOf(userRole);
    const nextRole = roles[(currentIdx + 1) % roles.length];
    
    if (nextRole === 'SUPER_ADMIN') handleGodModeReturn();
    else handleImpersonate(nextRole);
    if (nextRole === 'SUPER_ADMIN') navigate('/superadmin');
    else if (nextRole === 'TENANT_ADMIN') navigate('/tenantadmin');
    else if (nextRole === 'SUB_ADMIN') navigate('/subadmin');
    else if (nextRole === 'EMPLOYEE') navigate('/app');
    
    if (window.navigator?.vibrate) window.navigator.vibrate([100, 50, 100]);
  };

  if (authLoading) return <LoadingScreen />;

  return (
    <>
      {/* SUPER ADMIN PREVIEW INDICATOR */}
      {originalRole === 'SUPER_ADMIN' && (
        <div 
          onClick={handleCycleRole}
          className="fixed top-2 left-1/2 -translate-x-1/2 z-[9999] px-4 py-1 bg-[var(--danger)] text-white text-[10px] font-bold rounded-full shadow-[0_0_15px_rgba(255,0,85,0.5)] border border-white/20 animate-pulse cursor-pointer hover:bg-red-600 transition-colors active:scale-95 safe-top"
          title="Klik untuk Pindah Dasbor"
        >
          SUPER ADMIN PREVIEW (TAP TO SWITCH DASHBOARD)
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

      <Suspense fallback={<LoadingScreen />}>
      <AnimatePresence>
        <Routes>
          {/* LANDING PAGE — company profile / marketing */}
          <Route path="/" element={
            isAuthenticated 
              ? <Navigate to={userRole === 'SUPER_ADMIN' ? '/superadmin' : userRole === 'TENANT_ADMIN' ? '/tenantadmin' : userRole === 'SUB_ADMIN' ? '/subadmin' : '/app'} replace />
              : <PageTransition><LandingPage /></PageTransition>
          } />

          {/* LOGIN */}
          <Route path="/login" element={
            !isAuthenticated 
              ? <PageTransition><AuthPortal onLogin={handleLogin} /></PageTransition> 
              : <Navigate to={userRole === 'SUPER_ADMIN' ? '/superadmin' : userRole === 'TENANT_ADMIN' ? '/tenantadmin' : userRole === 'SUB_ADMIN' ? '/subadmin' : '/app'} replace />
          } />

          {/* RESET PASSWORD */}
          <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />

          {/* EMPLOYEE DASHBOARD */}
          <Route path="/app" element={
              isAuthenticated && (userRole === 'EMPLOYEE' || userRole === 'TENANT_ADMIN' || userRole === 'SUB_ADMIN')
                ? <AttendanceScreen onGodModeReturn={handleGodModeReturnWithNav} isImpersonating={originalRole === 'SUPER_ADMIN'} onCycleRole={handleCycleRole} />
                : isAuthenticated && userRole === 'SUPER_ADMIN' ? <Navigate to="/superadmin" replace />
                : <Navigate to="/login" replace />
            }
          />

          {/* QR Attendance Route */}
          <Route
            path="/qr-attendance"
            element={
              isAuthenticated && (userRole === 'EMPLOYEE' || userRole === 'TENANT_ADMIN' || userRole === 'SUB_ADMIN')
                ? <PageTransition><QRScanner onBack={() => navigate('/app')} /></PageTransition>
                : isAuthenticated && userRole === 'SUPER_ADMIN' ? <Navigate to="/superadmin" replace />
                : <Navigate to="/login" replace />
            }
          />

          {/* Super Admin Route */}
          <Route
            path="/superadmin"
            element={
              isAuthenticated && userRole === 'SUPER_ADMIN' 
                ? <CommandCenter onImpersonate={handleImpersonateWithNav} onCycleRole={handleCycleRole} onLogout={handleLogout} />
                : isAuthenticated ? <Navigate to="/" replace />
                : <Navigate to="/login" replace />
            }
          />

          {/* Tenant Admin Route */}
          <Route
            path="/tenantadmin"
            element={
              isAuthenticated && userRole === 'TENANT_ADMIN' 
                ? <TenantDashboard onGodModeReturn={handleGodModeReturnWithNav} isImpersonating={originalRole === 'SUPER_ADMIN'} onCycleRole={handleCycleRole} onLogout={handleLogout} />
                : isAuthenticated ? <Navigate to="/" replace />
                : <Navigate to="/login" replace />
            }
          />

          {/* Sub Admin / Otoritas Tim Route */}
          <Route
            path="/subadmin"
            element={
              isAuthenticated && (['SUB_ADMIN', 'TENANT_ADMIN', 'SUPER_ADMIN'].includes(userRole))
                ? <SubAdminDashboard onCycleRole={handleCycleRole} />
                : isAuthenticated ? <Navigate to="/" replace />
                : <Navigate to="/login" replace />
            }
          />

          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </AnimatePresence>
      </Suspense>

      {/* ROUTE LOADING BAR */}
      <RouteLoadingBar />

      {/* GLOBAL BACK BUTTON */}
      {navStack.length > 1 && location.pathname !== '/login' && (
        <button onClick={handleGoBack}
          className="fixed bottom-24 left-4 z-[9999] w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg hover:bg-white/20 active:scale-90 transition-all safe-bottom">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {/* GLOBAL BRANDING FOOTER */}
      <div className="fixed bottom-1 w-full text-center pointer-events-none z-40 safe-bottom">
        <p className="text-[8px] text-gray-600 font-black tracking-[0.4em] uppercase opacity-40">
          SI PRESENSI PRO MAX — BY RICHARD MEHA
        </p>
      </div>

      {/* OFFLINE INDICATOR */}
      <OfflineIndicator />
    </>
  );
};

function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [originalRole, setOriginalRole] = useState(null);

  const clearClientAuthCache = useCallback(() => {
    try { sessionStorage.removeItem('god_key'); } catch {}
    try { sessionStorage.removeItem('super_admin_verified'); } catch {}
    try { sessionStorage.removeItem('operational_access'); } catch {}
    try { sessionStorage.removeItem('attendance_access'); } catch {}
    try { localStorage.removeItem('is_authenticated'); } catch {}
    try { localStorage.removeItem('user_role'); } catch {}
    try { localStorage.removeItem('original_role'); } catch {}
  }, []);

  const applyProfileSession = useCallback((profile) => {
    const role = profile?.role?.toUpperCase();
    if (!role) {
      setIsAuthenticated(false);
      setUserRole(null);
      setOriginalRole(null);
      clearClientAuthCache();
      return;
    }

    setIsAuthenticated(true);
    setUserRole(role);
    setOriginalRole(null);

    try {
      sessionStorage.removeItem('god_key');
      if (role === 'SUPER_ADMIN') sessionStorage.setItem('super_admin_verified', 'true');
      else sessionStorage.removeItem('super_admin_verified');
      sessionStorage.setItem('attendance_access', profile?.attendance_access ? 'YA' : 'TIDAK');
      sessionStorage.setItem('operational_access', profile?.operational_access || role !== 'EMPLOYEE' ? 'MEMILIKI AKSES' : 'TIDAK');
    } catch {}
  }, [clearClientAuthCache]);

  const resolveSession = useCallback(async (session) => {
    if (!session?.user?.id) {
      setIsAuthenticated(false);
      setUserRole(null);
      setOriginalRole(null);
      clearClientAuthCache();
      return;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, role, tenant_id, operational_access, attendance_access')
      .eq('auth_id', session.user.id)
      .maybeSingle();

    if (error || !profile) {
      setIsAuthenticated(false);
      setUserRole(null);
      setOriginalRole(null);
      clearClientAuthCache();
      return;
    }

    applyProfileSession(profile);
  }, [applyProfileSession, clearClientAuthCache]);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      setAuthLoading(true);
      try {
        const { data } = await supabase.auth.getSession();
        if (isMounted) await resolveSession(data?.session);
      } catch {
        if (isMounted) {
          setIsAuthenticated(false);
          setUserRole(null);
          setOriginalRole(null);
          clearClientAuthCache();
        }
      } finally {
        if (isMounted) setAuthLoading(false);
      }
    };

    bootstrap();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      resolveSession(session).finally(() => {
        if (isMounted) setAuthLoading(false);
      });
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [clearClientAuthCache, resolveSession]);

  // Simpan hanya cache UI non-otoritatif; otorisasi tetap bersumber dari Supabase session + profile.
  useEffect(() => {
    try { if (userRole) localStorage.setItem('user_role', userRole); else localStorage.removeItem('user_role'); } catch {}
    try { if (originalRole) localStorage.setItem('original_role', originalRole); else localStorage.removeItem('original_role'); } catch {}
  }, [userRole, originalRole]);

  const handleLogin = (role) => {
    setUserRole(role?.toUpperCase());
    setIsAuthenticated(true);
    setOriginalRole(null);
  };

  const handleImpersonate = (role) => {
    if (userRole === 'SUPER_ADMIN' || originalRole === 'SUPER_ADMIN') {
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

  const handleLogout = async () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setOriginalRole(null);
    try { sessionStorage.clear(); } catch {}
    try { await supabase.auth.signOut(); } catch (e) { /* ignore */ }
    clearClientAuthCache();
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
    <ErrorBoundary>
      <ThemeProvider>
      <HashRouter>
        <ToastProvider>
          <ConfirmProvider>
            <NotificationProvider>
            <AppRoutes
              isAuthenticated={isAuthenticated}
              authLoading={authLoading}
              userRole={userRole}
              originalRole={originalRole}
              handleLogin={handleLogin}
              handleImpersonate={handleImpersonate}
              handleGodModeReturn={handleGodModeReturn}
              handleLogout={handleLogout}
            />
            </NotificationProvider>
          </ConfirmProvider>
        </ToastProvider>
      </HashRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
