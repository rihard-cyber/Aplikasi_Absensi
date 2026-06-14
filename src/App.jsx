import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, LogOut } from 'lucide-react';
import { requestAppPermissions } from './utils/permissionInit';
import { ToastProvider, useToast } from './components/Toast';
import { ThemeProvider } from './context/ThemeContext';
import { ConfirmProvider } from './components/ConfirmDialog';
import { NotificationProvider } from './components/Notifications';
import OfflineIndicator from './components/OfflineIndicator';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { supabase } from './utils/supabaseClient';
import ErrorBoundary from './components/ErrorBoundary';
import { executeBackHandlers } from './utils/navigation';
import { isSecurityDivision } from './utils/featureAccess';
import { clearAllAuthData } from './utils/authCleanup';

const AttendanceScreen = lazy(() => import('./pages/Employee/AttendanceScreen'));
const AuthPortal = lazy(() => import('./pages/Auth/AuthPortal'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const NotFound = lazy(() => import('./pages/NotFound'));
const CommandCenter = lazy(() => import('./pages/SuperAdmin/CommandCenter'));
const TenantDashboard = lazy(() => import('./pages/TenantAdmin/TenantDashboard'));
const SubAdminDashboard = lazy(() => import('./pages/SubAdmin/SubAdminDashboard'));
const ResetPassword = lazy(() => import('./pages/Auth/ResetPassword'));
const QRScanner = lazy(() => import('./pages/Employee/components/QRScanner'));
const PublicServicePortal = lazy(() => import('./pages/PublicPortal/PublicServicePortal'));

const DASHBOARD_ROUTES = ['/app', '/tenantadmin', '/superadmin', '/subadmin'];
const EXIT_ROUTES = ['/', '/login'];
const t = (s) => s;

const LoadingScreen = React.memo(() => {
  const [logoUrl, setLogoUrl] = useState(null);
  const [tenantName, setTenantName] = useState('ABSENSI');

  useEffect(() => {
    try {
      const url = localStorage.getItem('tenant_logo_url');
      if (url) setLogoUrl(url);
      const name = localStorage.getItem('tenant_name');
      if (name) setTenantName(name);
    } catch {}
  }, []);

  const getLogoInitials = (name) => {
    if (!name || name === 'Memuat...' || name === 'ABSENSI') return 'SP';
    let clean = name.replace(/^(PT\.?|CV\.?|UD\.?)\s+/i, '').trim();
    const words = clean.split(/\s+/)
      .filter(w => !['dan', '&', 'of', 'the', 'bersama', 'jaya', 'indonesia'].includes(w.toLowerCase()));
    if (words.length > 1) {
      return words
        .map(w => w.charAt(0))
        .join('')
        .substring(0, 3)
        .toUpperCase();
    }
    return clean.substring(0, 2).toUpperCase();
  };

  return (
    <div className="fixed inset-0 bg-[#0B0C10] z-[99999] flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] p-[2px] shadow-[0_0_40px_rgba(142,45,226,0.4)] animate-pulse">
          <div className="w-full h-full bg-[#0B0C10] rounded-[22px] flex items-center justify-center font-serif font-bold text-white text-lg relative overflow-hidden">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="w-full h-full object-contain p-2 logo-3d-spin rounded-[22px]" 
                onError={() => setLogoUrl(null)} 
              />
            ) : (
              <span className="relative z-10 logo-3d-spin">{getLogoInitials(tenantName)}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[var(--aurora-1)] animate-bounce" style={{ animationDelay: '0s' }} />
          <div className="w-2 h-2 rounded-full bg-[var(--aurora-3)] animate-bounce" style={{ animationDelay: '0.15s' }} />
          <div className="w-2 h-2 rounded-full bg-[var(--aurora-1)] animate-bounce" style={{ animationDelay: '0.3s' }} />
        </div>
        <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-bold">{t('Memuat...')}</p>
      </div>
    </div>
  );
});

const isInstalledApp = () => {
  if (typeof window === 'undefined') return false;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isIOSStandalone = window.navigator?.standalone === true;
  const isCapacitor = !!window.Capacitor;
  return isStandalone || isIOSStandalone || isCapacitor;
};

// Global PWA prompt event handler
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredPWAInstallPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa-installable'));
  });
}

const includeLanding = import.meta.env.VITE_INCLUDE_LANDING !== 'false' && !isInstalledApp();

const PageTransition = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 1.02 }}
    transition={{ duration: 0.25, ease: "easeInOut" }}
    className="w-full min-h-screen overflow-x-hidden"
  >
    {children}
  </motion.div>
);

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
          toast('Supabase tidak dapat dijangkau.', 'error');
        }
      } catch (e) {
        if (e.name !== 'AbortError') {
          toast('Supabase tidak dapat dijangkau.', 'error');
        }
      }
    };
    check();
    return () => controller.abort();
  }, []);
};

const RouteLoadingBar = React.memo(() => {
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, [location]);
  return (
    <div className="fixed top-0 left-0 right-0 z-[99999] h-0.5 pointer-events-none">
      <div className={`h-full bg-gradient-to-r from-[var(--aurora-1)] via-[var(--aurora-3)] to-[var(--aurora-1)] transition-all duration-300 ease-out ${loading ? 'w-full opacity-100' : 'w-0 opacity-0'}`} style={{ backgroundSize: '200% 100%', animation: loading ? 'running-light 2s linear infinite' : 'none' }} />
    </div>
  );
});

const AppRoutes = ({ isAuthenticated, authLoading, userRole, originalRole, handleLogin, handleImpersonate, handleGodModeReturn, handleLogout, sessionProfile, clearSessionProfile }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  useSupabaseHealthCheck();

  const isDashboard = DASHBOARD_ROUTES.includes(location.pathname);
  const isExitRoute = EXIT_ROUTES.includes(location.pathname);

  // Track the latest dashboard path so we can restore it
  const dashboardRef = useRef(null);
  useEffect(() => {
    if (isDashboard) dashboardRef.current = location.pathname;
  }, [location.pathname, isDashboard]);

  // ── Back-Button Exit Guard ──────────────────────────────────
  const [backCount, setBackCount] = useState(0);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showExitHint, setShowExitHint] = useState(false);
  const backTimeoutRef = useRef(null);
  const exitHintTimeoutRef = useRef(null);

  // Store current hash to restore it when user presses back on a dashboard
  const currentHashRef = useRef(window.location.hash);
  useEffect(() => {
    currentHashRef.current = window.location.hash;
  }, [location]);

  const showBackHint = useCallback(() => {
    setShowExitHint(true);
    if (exitHintTimeoutRef.current) clearTimeout(exitHintTimeoutRef.current);
    exitHintTimeoutRef.current = setTimeout(() => setShowExitHint(false), 2000);
  }, []);

  const triggerExit = useCallback(() => {
    setBackCount(0);
    setShowExitModal(true);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      // 1. Run custom back handlers first
      if (executeBackHandlers()) {
        window.history.pushState(null, '', currentHashRef.current);
        return;
      }

      // User pressed back on a dashboard → restore state, show hint
      if (isDashboard && dashboardRef.current) {
        window.history.pushState(null, '', currentHashRef.current);
        showBackHint();
        setBackCount(prev => {
          const next = prev + 1;
          if (backTimeoutRef.current) clearTimeout(backTimeoutRef.current);
          backTimeoutRef.current = setTimeout(() => setBackCount(0), 2000);
          if (next >= 2) {
            triggerExit();
            return 0;
          }
          return next;
        });
        return;
      }

      // User pressed back on login / root → double-press to exit
      if (isExitRoute) {
        setBackCount(prev => {
          const next = prev + 1;
          if (backTimeoutRef.current) clearTimeout(backTimeoutRef.current);
          backTimeoutRef.current = setTimeout(() => setBackCount(0), 2000);
          if (next >= 2) {
            triggerExit();
            return 0;
          }
          return next;
        });
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [isDashboard, isExitRoute, dashboardRef, currentHashRef, showBackHint, triggerExit]);

  // Handle native Android back button via Capacitor App plugin
  useEffect(() => {
    let backButtonSub;
    
    const initBackButton = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        const { App: CapApp } = await import('@capacitor/app');
        
        if (Capacitor.isNativePlatform()) {
          backButtonSub = CapApp.addListener('backButton', () => {
            // 1. Run custom back handlers first
            if (executeBackHandlers()) {
              return;
            }
            
            // 2. Standard exit/back logic
            if (isDashboard && dashboardRef.current) {
              showBackHint();
              setBackCount(prev => {
                const next = prev + 1;
                if (backTimeoutRef.current) clearTimeout(backTimeoutRef.current);
                backTimeoutRef.current = setTimeout(() => setBackCount(0), 2000);
                if (next >= 2) {
                  triggerExit();
                  return 0;
                }
                return next;
              });
            } else if (isExitRoute) {
              setBackCount(prev => {
                const next = prev + 1;
                if (backTimeoutRef.current) clearTimeout(backTimeoutRef.current);
                backTimeoutRef.current = setTimeout(() => setBackCount(0), 2000);
                if (next >= 2) {
                  triggerExit();
                  return 0;
                }
                return next;
              });
            } else {
              window.history.back();
            }
          });
        }
      } catch (e) {
        console.warn("Gagal inisialisasi tombol back native:", e);
      }
    };

    initBackButton();
    
    return () => {
      if (backButtonSub) {
        backButtonSub.then(sub => sub.remove()).catch(() => {});
      }
    };
  }, [isDashboard, isExitRoute, dashboardRef, showBackHint, triggerExit]);

  // Clean up hint
  useEffect(() => {
    return () => { if (exitHintTimeoutRef.current) clearTimeout(exitHintTimeoutRef.current); };
  }, []);

  // ── Role / Impersonation ─────────────────────────────────────
  const handleImpersonateWithNav = (role) => {
    handleImpersonate(role);
    if (role === 'TENANT_ADMIN') navigate('/tenantadmin');
    else if (role === 'EMPLOYEE') navigate('/app');
  };

  const handleGodModeReturnWithNav = () => {
    handleGodModeReturn();
    navigate('/superadmin');
  };

  const handleCycleRole = () => {
    if (userRole !== 'SUPER_ADMIN' && originalRole !== 'SUPER_ADMIN') return;
    const roles = ['SUPER_ADMIN', 'TENANT_ADMIN', 'SUB_ADMIN', 'EMPLOYEE'];
    const currentIdx = roles.indexOf(userRole);
    const nextRole = roles.at((currentIdx + 1) % roles.length);
    if (nextRole === 'SUPER_ADMIN') handleGodModeReturn();
    else handleImpersonate(nextRole);
    if (nextRole === 'SUPER_ADMIN') navigate('/superadmin');
    else if (nextRole === 'TENANT_ADMIN') navigate('/tenantadmin');
    else if (nextRole === 'SUB_ADMIN') {
      navigate('/subadmin');
    }
    else if (nextRole === 'EMPLOYEE') navigate('/app');
    if (window.navigator?.vibrate) window.navigator.vibrate([100, 50, 100]);
  };

  useEffect(() => {
    const handler = () => handleCycleRole();
    window.addEventListener('cycle-impersonation-role', handler);
    return () => window.removeEventListener('cycle-impersonation-role', handler);
  }, [handleCycleRole]);

  const getDashboardRedirect = () => {
    if (userRole === 'SUPER_ADMIN') return '/superadmin';
    if (userRole === 'TENANT_ADMIN') return '/tenantadmin';
    if (userRole === 'SUB_ADMIN') return '/subadmin';
    return '/app';
  };

  if (authLoading) return <LoadingScreen />;

  return (
    <>

      {/* FLOATING BACK HINT */}
      <AnimatePresence>
        {showExitHint && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl"
          >
            <p className="text-xs text-white font-bold flex items-center gap-2 whitespace-nowrap">
              <ChevronLeft size={14} /> {t('Tekan 2x untuk keluar aplikasi')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

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
              <div className="w-16 h-16 rounded-2xl bg-[var(--danger)]/20 flex items-center justify-center mx-auto mb-4">
                <LogOut size={28} className="text-[var(--danger)]" />
              </div>
              <h3 className="text-xl font-serif font-bold text-white mb-2">{t('Yakin ingin keluar?')}</h3>
              <p className="text-sm text-gray-400 mb-8">{t('Anda akan logout dan kembali ke halaman login. Dari halaman login, tekan back 2x untuk menutup aplikasi.')}</p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => { setShowExitModal(false); handleLogout(); }}
                  className="w-full py-4 rounded-xl bg-[var(--danger)] text-white font-bold uppercase tracking-widest text-xs"
                >
                  {t('Ya, Logout')}
                </button>
                <button
                  onClick={() => { setShowExitModal(false); setBackCount(0); }}
                  className="w-full py-4 rounded-xl bg-white/5 text-gray-400 font-bold uppercase tracking-widest text-xs border border-white/5"
                >
                  {t('Batal')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Suspense fallback={<LoadingScreen />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* LANDING PAGE */}
          <Route path="/" element={
            isAuthenticated
              ? <Navigate to={getDashboardRedirect()} replace />
              : includeLanding
                ? <PageTransition><LandingPage /></PageTransition>
                : <Navigate to="/login" replace />
          } />

          {/* LOGIN */}
          <Route path="/login" element={
            !isAuthenticated
              ? <PageTransition>
                  <AuthPortal 
                    onLogin={handleLogin} 
                    sessionProfile={sessionProfile} 
                    clearSessionProfile={clearSessionProfile} 
                  />
                </PageTransition>
              : <Navigate to={getDashboardRedirect()} replace />
          } />

          {/* RESET PASSWORD */}
          <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />

          {/* PUBLIC SERVICE PORTAL */}
          <Route path="/public-service" element={<PageTransition><PublicServicePortal /></PageTransition>} />

          {/* EMPLOYEE DASHBOARD */}
          <Route path="/app" element={
              isAuthenticated && (userRole === 'EMPLOYEE' || userRole === 'TENANT_ADMIN' || userRole === 'SUB_ADMIN')
                ? <AttendanceScreen onGodModeReturn={handleGodModeReturnWithNav} isImpersonating={originalRole === 'SUPER_ADMIN'} onCycleRole={handleCycleRole} />
                : isAuthenticated && userRole === 'SUPER_ADMIN' ? <Navigate to="/superadmin" replace />
                : <Navigate to="/login" replace />
            }
          />

          {/* QR ATTENDANCE */}
          <Route path="/qr-attendance" element={
              isAuthenticated && (userRole === 'EMPLOYEE' || userRole === 'TENANT_ADMIN' || userRole === 'SUB_ADMIN')
                ? <PageTransition><QRScanner onBack={() => navigate('/app')} /></PageTransition>
                : isAuthenticated && userRole === 'SUPER_ADMIN' ? <Navigate to="/superadmin" replace />
                : <Navigate to="/login" replace />
            }
          />

          {/* SUPER ADMIN */}
          <Route path="/superadmin" element={
              isAuthenticated && userRole === 'SUPER_ADMIN'
                ? <CommandCenter onImpersonate={handleImpersonateWithNav} onCycleRole={handleCycleRole} onLogout={handleLogout} />
                : isAuthenticated ? <Navigate to="/" replace />
                : <Navigate to="/login" replace />
            }
          />

          {/* TENANT ADMIN */}
          <Route path="/tenantadmin" element={
              isAuthenticated && userRole === 'TENANT_ADMIN'
                ? <TenantDashboard onGodModeReturn={handleGodModeReturnWithNav} isImpersonating={originalRole === 'SUPER_ADMIN'} onCycleRole={handleCycleRole} onLogout={handleLogout} />
                : isAuthenticated ? <Navigate to="/" replace />
                : <Navigate to="/login" replace />
            }
          />

          {/* SUB ADMIN */}
          <Route path="/subadmin" element={
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


      {/* OFFLINE INDICATOR */}
      <OfflineIndicator />
      <PWAInstallPrompt />
    </>
  );
};

function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [originalRole, setOriginalRole] = useState(null);
  const [sessionProfile, setSessionProfile] = useState(null);

  const clearClientAuthCache = useCallback(() => {
    clearAllAuthData();
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
      .select('id, role, tenant_id, operational_access, attendance_access, division_id, divisions(name)')
      .eq('auth_id', session.user.id)
      .maybeSingle();
    if (error || !profile) {
      setIsAuthenticated(false);
      setUserRole(null);
      setOriginalRole(null);
      clearClientAuthCache();
      return;
    }
    const divisionName = profile.divisions?.name || '';
    try { localStorage.setItem('user_division', divisionName); } catch {}
    if (profile?.tenant_id) {
      try {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('name, logo_url')
          .eq('id', profile.tenant_id)
          .maybeSingle();
        if (tenant) {
          if (tenant.logo_url) localStorage.setItem('tenant_logo_url', tenant.logo_url);
          if (tenant.name) localStorage.setItem('tenant_name', tenant.name);
        }
      } catch (e) {
        console.warn("Gagal sinkronisasi data logo tenant:", e);
      }
    }
    if (!isAuthenticated && profile) {
      setSessionProfile(profile);
    } else {
      applyProfileSession(profile);
    }
  }, [isAuthenticated, applyProfileSession, clearClientAuthCache]);

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

  useEffect(() => {
    try { if (userRole) localStorage.setItem('user_role', userRole); else localStorage.removeItem('user_role'); } catch {}
    try { if (originalRole) localStorage.setItem('original_role', originalRole); else localStorage.removeItem('original_role'); } catch {}
  }, [userRole, originalRole]);

  const handleLogin = useCallback((role) => {
    setUserRole(role?.toUpperCase());
    setIsAuthenticated(true);
    setOriginalRole(null);
  }, []);

  const handleImpersonate = useCallback((role) => {
    if (userRole === 'SUPER_ADMIN' || originalRole === 'SUPER_ADMIN') {
      setOriginalRole('SUPER_ADMIN');
      setUserRole(role?.toUpperCase());
    }
  }, [userRole, originalRole]);

  const handleGodModeReturn = useCallback(() => {
    if (originalRole === 'SUPER_ADMIN') {
      setUserRole('SUPER_ADMIN');
      setOriginalRole(null);
    }
  }, [originalRole]);

  const handleLogout = useCallback(async () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setOriginalRole(null);
    await supabase.auth.signOut();
    clearAllAuthData();
  }, []);

  // Session Heartbeat (lightweight)
  useEffect(() => {
    if (!isAuthenticated) return;
    const heartbeat = setInterval(async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data?.session) {
          handleLogout();
        }
      } catch {}
    }, 60000);
    return () => clearInterval(heartbeat);
  }, [isAuthenticated, handleLogout]);

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
               sessionProfile={sessionProfile}
               clearSessionProfile={() => setSessionProfile(null)}
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
