import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Loader2, AlertTriangle, ChevronLeft } from 'lucide-react';
import { resolveSaasJdcUser } from './securityAuthBridge';
import './securityModule.css';

const JDCApp = lazy(() => import('../../jdc/App'));

const Loading = () => (
  <div className="security-module-loading">
    <Loader2 size={32} className="animate-spin text-[#00f0ff]" />
    <p className="text-xs text-gray-400 uppercase tracking-widest mt-4">Memuat Modul Keamanan...</p>
  </div>
);

/**
 * Wrapper embed JDC di dalam TenantDashboard.
 * Session absensi SaaS tetap aktif — tidak ada logout/login ganda.
 */
const SecurityOpsShell = ({ onBack }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    resolveSaasJdcUser()
      .then((u) => {
        if (!mounted) return;
        if (!u) setError('Profil keamanan tidak ditemukan. Pastikan Anda sudah login.');
        else setUser(u);
        setLoading(false);
      })
      .catch(() => {
        if (mounted) {
          setError('Gagal memuat modul keamanan.');
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    return () => {
      document.body.classList.remove('dashboard-active');
      document.documentElement.classList.remove('dashboard-active');
    };
  }, []);

  if (loading) {
    return (
      <div className="security-module-embedded">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="security-module-embedded security-module-error">
        <AlertTriangle size={40} className="text-amber-400 mb-4" />
        <p className="text-white font-bold mb-2">{error}</p>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-sm text-gray-300 hover:bg-white/15"
          >
            <ChevronLeft size={16} /> Kembali ke Dashboard
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="security-module-embedded">
      <Suspense fallback={<Loading />}>
        <JDCApp embedded saasUser={user} skipSplash onBack={onBack} />
      </Suspense>
    </div>
  );
};

export default SecurityOpsShell;
