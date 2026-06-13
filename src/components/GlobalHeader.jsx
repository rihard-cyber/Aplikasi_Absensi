import React, { useState, useEffect } from 'react';
import { Menu, ArrowLeft } from 'lucide-react';

const getShortName = (name) => {
  if (!name || name === 'Memuat...') return 'ABSENSI';
  // Remove common prefixes
  let clean = name.replace(/^(PT\.?|CV\.?|UD\.?)\s+/i, '').trim();
  if (clean.length > 10) {
    const words = clean.split(/\s+/);
    if (words.length > 1) {
      const initials = words
        .filter(w => !['dan', '&', 'of', 'the', 'bersama', 'jaya', 'indonesia'].includes(w.toLowerCase()))
        .map(w => w.charAt(0))
        .join('')
        .toUpperCase();
      if (initials.length >= 2) return initials;
    }
    return words[0].toUpperCase();
  }
  return clean.toUpperCase();
};

const getLogoInitials = (name) => {
  if (!name || name === 'Memuat...' || name === 'ABSENSI') return 'AB';
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

export default function GlobalHeader({ title, onMenuClick, onBack }) {
  const [logoUrl, setLogoUrl] = useState(null);
  const [tenantName, setTenantName] = useState(() => {
    try {
      return localStorage.getItem('tenant_name') || 'ABSENSI';
    } catch {
      return 'ABSENSI';
    }
  });
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isImpersonating, setIsImpersonating] = useState(() => {
    try {
      return localStorage.getItem('original_role') === 'SUPER_ADMIN';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      const url = localStorage.getItem('tenant_logo_url');
      if (url) setLogoUrl(url);

      const name = localStorage.getItem('tenant_name');
      if (name) setTenantName(name);
    } catch {}

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Sync state changes periodically (for logo & impersonation & tenant name)
    const interval = setInterval(() => {
      try {
        const url = localStorage.getItem('tenant_logo_url');
        if (url !== logoUrl) setLogoUrl(url);

        const name = localStorage.getItem('tenant_name');
        if (name && name !== tenantName) setTenantName(name);

        const imp = localStorage.getItem('original_role') === 'SUPER_ADMIN';
        if (imp !== isImpersonating) setIsImpersonating(imp);
      } catch {}
    }, 1500);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [logoUrl, tenantName, isImpersonating]);

  return (
    <header className="global-header-jdc">
      {/* Row 1: Logo, App Name, Badges */}
      <div className="header-top-row">
        <div className="header-left">
          {onBack ? (
            <button onClick={onBack} className="menu-toggle-btn-jdc" aria-label="Kembali">
              <ArrowLeft size={16} />
            </button>
          ) : onMenuClick ? (
            <button onClick={onMenuClick} className="menu-toggle-btn-jdc menu-toggle-btn-jdc-hamburger" aria-label="Menu">
              <Menu size={16} />
            </button>
          ) : null}
          <div className="header-logo-box-jdc">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="logo-3d-spin w-full h-full object-contain p-0.5" 
                onError={() => setLogoUrl(null)} 
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-[var(--aurora-3)] to-[var(--aurora-1)] flex items-center justify-center font-serif font-bold text-white text-[15px] logo-3d-spin">
                {getLogoInitials(tenantName)}
              </div>
            )}
          </div>
        </div>

        <div className="header-right">
          {isImpersonating && (
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('cycle-impersonation-role'))}
              className="connectivity-badge bg-[var(--danger)]/15 border border-[var(--danger)]/30 text-[var(--danger)] animate-pulse font-bold tracking-wider select-none shrink-0"
              title="Super Admin Impersonate"
            >
              <span>PREVIEW</span>
            </button>
          )}

          {isOnline ? (
            <span className="connectivity-badge online-jdc flex items-center gap-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse shrink-0 shadow-[0_0_8px_var(--success)]" />
              <span>ONLINE</span>
            </span>
          ) : (
            <span className="connectivity-badge offline-jdc flex items-center gap-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger)] shrink-0 shadow-[0_0_8px_var(--danger)]" />
              <span>OFFLINE</span>
            </span>
          )}
        </div>
      </div>

      {/* Row 2: Page Title (Auto-shrinks if long) */}
      <div className="header-bottom-row">
        <h1 className={`header-page-title-jdc ${title.length > 20 ? 'text-xs-long' : ''}`}>
          {title}
        </h1>
      </div>
    </header>
  );
}


