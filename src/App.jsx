import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import AttendanceScreen from './pages/Employee/AttendanceScreen';
import CommandCenter from './pages/SuperAdmin/CommandCenter';
import TenantDashboard from './pages/TenantAdmin/TenantDashboard';
import AuthPortal from './pages/Auth/AuthPortal';

// Komponen Pembungkus Transisi Halaman (Efek Blur & Scale yang mulus)
const PageTransition = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.98, filter: 'blur(5px)' }}
    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
    exit={{ opacity: 0, scale: 1.02, filter: 'blur(5px)' }}
    transition={{ duration: 0.4, ease: "easeInOut" }}
    className="w-full min-h-screen"
  >
    {children}
  </motion.div>
);

// Komponen Rute Animasi agar `useLocation` dapat menangkap perubahan path
const AppRoutes = ({ isAuthenticated, userRole, originalRole, handleLogin, handleImpersonate, handleGodModeReturn }) => {
  const location = useLocation();
  const navigate = useNavigate();

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

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Unified Triple-Gate Portal */}
        <Route
          path="/login"
          element={!isAuthenticated ? <PageTransition><AuthPortal onLogin={handleLogin} /></PageTransition> : <Navigate to="/" replace />}
        />

        {/* Employee Route */}
        <Route
          path="/"
          element={isAuthenticated && userRole === 'EMPLOYEE' ? <PageTransition><AttendanceScreen onGodModeReturn={handleGodModeReturnWithNav} isImpersonating={originalRole === 'SUPER_ADMIN'} /></PageTransition> : <Navigate to="/login" replace />}
        />

        {/* Super Admin Route */}
        <Route
          path="/superadmin"
          element={isAuthenticated && userRole === 'SUPER_ADMIN' ? <PageTransition><CommandCenter onImpersonate={handleImpersonateWithNav} /></PageTransition> : <Navigate to="/login" replace />}
        />

        {/* Tenant Admin Route */}
        <Route
          path="/tenantadmin"
          element={isAuthenticated && userRole === 'TENANT_ADMIN' ? <PageTransition><TenantDashboard onGodModeReturn={handleGodModeReturnWithNav} isImpersonating={originalRole === 'SUPER_ADMIN'} /></PageTransition> : <Navigate to="/login" replace />}
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null); // 'SUPER_ADMIN', 'TENANT_ADMIN', 'EMPLOYEE'
  const [originalRole, setOriginalRole] = useState(null); // For God Mode impersonation

  const handleLogin = (role) => {
    setUserRole(role);
    setIsAuthenticated(true);
    setOriginalRole(null);
  };

  const handleImpersonate = (role) => {
    if (userRole === 'SUPER_ADMIN') {
      setOriginalRole('SUPER_ADMIN');
      setUserRole(role);
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
  };

  return (
    <BrowserRouter>
      <AppRoutes
        isAuthenticated={isAuthenticated}
        userRole={userRole}
        originalRole={originalRole}
        handleLogin={handleLogin}
        handleImpersonate={handleImpersonate}
        handleGodModeReturn={handleGodModeReturn}
      />
    </BrowserRouter>
  );
}

export default App;
