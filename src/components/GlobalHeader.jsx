import React, { useState, useEffect } from 'react';
import { Menu, ArrowLeft, Sun, Moon, Zap, Activity, Bell, Settings } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from './Notifications';

export default function GlobalHeader({ title, onMenuClick, onBack, onSettingsClick }) {
  const [logoUrl, setLogoUrl] = useState(null);
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const { theme, toggleTheme } = useTheme();
  const { unreadCount, setShowPanel } = useNotifications();
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
    } catch {}

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Sync state changes periodically (for logo & impersonation)
    const interval = setInterval(() => {
      try {
        const url = localStorage.getItem('tenant_logo_url');
        if (url !== logoUrl) setLogoUrl(url);

        const imp = localStorage.getItem('original_role') === 'SUPER_ADMIN';
        if (imp !== isImpersonating) setIsImpersonating(imp);
      } catch {}
    }, 1500);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [logoUrl, isImpersonating]);

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return <Sun size={16} className="text-orange-500 animate-pulse" />;
      case 'aurora': return <Zap size={16} className="text-purple-400" />;
      case 'neon': return <Activity size={16} className="text-cyan-400 animate-pulse" />;
      default: return <Moon size={16} className="text-blue-400" />;
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light': return 'Mode Terang';
      case 'aurora': return 'Mode Aurora';
      case 'neon': return 'Mode Neon';
      default: return 'Mode Gelap';
    }
  };

  return (
    <header className="global-header-jdc">
      <div className="header-left">
        {onBack ? (
          <button onClick={onBack} className="menu-toggle-btn-jdc" aria-label="Kembali">
            <ArrowLeft size={18} />
          </button>
        ) : onMenuClick ? (
          <button onClick={onMenuClick} className="menu-toggle-btn-jdc" aria-label="Menu">
            <Menu size={18} />
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
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--aurora-3)] to-[var(--aurora-1)] flex items-center justify-center font-serif font-bold text-white text-xs logo-3d-spin">
              SP
            </div>
          )}
        </div>
      </div>
      <div className="header-center">
        <h1 className="header-page-title-jdc">{title}</h1>
      </div>
      <div className="header-right flex items-center gap-2">
        {isImpersonating && (
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('cycle-impersonation-role'))}
            className="connectivity-badge bg-[var(--danger)]/15 border border-[var(--danger)]/30 text-[var(--danger)] animate-pulse font-bold tracking-wider select-none shrink-0"
            title="Super Admin Impersonate (Ketuk untuk Pindah Dasbor)"
          >
            <span>PREVIEW ACTIVE</span>
          </button>
        )}
        
        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          className="menu-toggle-btn-jdc shrink-0"
          title={getThemeLabel()}
          aria-label="Toggle Theme"
        >
          {getThemeIcon()}
        </button>

        {/* Notifications Bell */}
        <button 
          onClick={() => setShowPanel(true)}
          className="menu-toggle-btn-jdc relative shrink-0"
          title="Notifikasi"
          aria-label="Notifikasi"
        >
          <Bell size={16} className="text-gray-400 hover:text-white transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--danger)] text-white text-[8px] font-bold flex items-center justify-center shadow-lg">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Settings Gear */}
        {onSettingsClick && (
          <button 
            onClick={onSettingsClick}
            className="menu-toggle-btn-jdc shrink-0"
            title="Pengaturan"
            aria-label="Pengaturan"
          >
            <Settings size={16} className="text-cyan-400 animate-[spin_8s_linear_infinite]" />
          </button>
        )}

        {isOnline ? (
          <span className="connectivity-badge online-jdc flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse shrink-0 shadow-[0_0_8px_var(--success)]" />
            <span className="hidden sm:inline">ONLINE</span>
          </span>
        ) : (
          <span className="connectivity-badge offline-jdc flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger)] shrink-0 shadow-[0_0_8px_var(--danger)]" />
            <span className="hidden sm:inline">OFFLINE</span>
          </span>
        )}
      </div>
    </header>
  );
}

