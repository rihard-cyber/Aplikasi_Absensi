import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../utils/supabaseClient';

// Abbreviation utilities for clean and aesthetic layout
const getAestheticShortName = (name) => {
  if (!name || name === 'Memuat...') return 'ABSENSI';
  const parenMatch = name.match(/\(([^)]+)\)/);
  if (parenMatch && parenMatch[1]) {
    return parenMatch[1].replace(/_/g, ' ').toUpperCase();
  }
  let clean = name.replace(/^(PT\.?|CV\.?|UD\.?)\s+/i, '').trim();
  if (clean.length > 15) {
    const words = clean.split(/\s+/).filter(w => !['dan', '&', 'of', 'the', 'bersama', 'jaya', 'indonesia', 'sistem', 'manajemen', 'manajement', 'pengamanan', 'keamanan'].includes(w.toLowerCase()));
    if (words.length > 0) {
      return words.slice(0, 3).join(' ').toUpperCase();
    }
    return clean.substring(0, 15).toUpperCase();
  }
  return clean.toUpperCase();
};

const getShortStructureName = (structure) => {
  if (!structure) return '';
  return structure
    .replace(/KANTOR PUSAT/gi, 'KP')
    .replace(/DIVISI/gi, 'DIV')
    .replace(/SECURITY/gi, 'SEC')
    .replace(/PENGAMANAN/gi, 'PAM')
    .replace(/ALL DIVISION/gi, 'ALL DIV');
};

const BannerCarousel = ({ tenantName, structureName, isGodMode, isImpersonating, todayShift, onCycleRole, onGodModeReturn, companyInfo, bannersList = [], tenantId }) => {
  const [banners, setBanners] = useState(bannersList);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loaded, setLoaded] = useState(bannersList.length > 0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (bannersList?.length > 0) {
      setBanners(bannersList);
      setLoaded(true);
      startInterval(bannersList);
    } else {
      fetchBanners();
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [bannersList, tenantId]);

  const startInterval = (list) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (list.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % list.length);
      }, 5000);
    }
  };

  const fetchBanners = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    let tid = tenantId;
    if (!tid) {
      const { data: p } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
      tid = p?.tenant_id;
    }
    
    if (!tid && !isGodMode) { setLoaded(true); return; }
    let q = supabase.from('tenant_settings').select('banners, banner_interval');
    if (tid) q = q.eq('tenant_id', tid); else q = q.not('banners', 'is', null).order('tenant_id').limit(1);
    const { data: ts } = await q.maybeSingle();
    setLoaded(true);
    if (ts?.banners?.length > 0) {
      setBanners(ts.banners);
      startInterval(ts.banners);
      return;
    }
    // Fallback: baca manifest dari storage via authenticated API (bypass RLS & CORS)
    if (tid) {
      try {
        const { data: fileData } = await supabase.storage.from('banners').download(`tenants/${tid}/banners_manifest.json`);
        if (fileData) {
          const manifest = JSON.parse(await fileData.text());
          if (manifest?.banners?.length > 0) {
            setBanners(manifest.banners);
            intervalRef.current = setInterval(() => {
              setCurrentIndex(prev => (prev + 1) % manifest.banners.length);
            }, 5000);
          }
        }
      } catch {}
      // Second fallback: coba via public URL (kalau bucket public)
      if (banners.length === 0) {
        try {
          const manifestUrl = supabase.storage.from('banners').getPublicUrl(`tenants/${tid}/banners_manifest.json`).data.publicUrl;
          const res = await fetch(manifestUrl);
          if (res.ok) {
            const manifest = await res.json();
            if (manifest?.banners?.length > 0) {
              setBanners(manifest.banners);
              intervalRef.current = setInterval(() => {
                setCurrentIndex(prev => (prev + 1) % manifest.banners.length);
              }, 5000);
            }
          }
        } catch {}
      }
    }
  };

  const currentBanner = banners.at(currentIndex);

  if (!loaded || banners.length === 0) {
    return (
      <div className="w-full max-w-md mb-4 relative z-10 px-2 sm:px-0">
        <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '3/1' }}>
          <div className="w-full h-full bg-gradient-to-br from-[var(--aurora-1)]/20 to-[var(--aurora-3)]/20 flex flex-col items-center justify-center p-4 text-center">
            {companyInfo?.logo_url && (
              <img src={companyInfo.logo_url} alt="Logo" className="w-8 h-8 object-contain mb-1.5 opacity-80" />
            )}
            <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] font-serif tracking-wide text-center leading-tight">
              {getAestheticShortName(tenantName)}
            </h3>
            <p className="text-[8px] sm:text-[9px] text-[var(--text-secondary)] uppercase tracking-wider text-center mt-1 opacity-80 leading-none">
              {getShortStructureName(structureName)}
            </p>
          </div>
          <div className="absolute top-2 right-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold tracking-widest uppercase border transition-all ${
              todayShift?.shift_code === 'OFF' 
              ? 'bg-gray-500/10 border-gray-500/30 text-gray-400' 
              : todayShift ? 'bg-[var(--success)]/10 border-[var(--success)]/30 text-[var(--success)]' 
              : 'bg-black/40 border-white/10 text-white/90 shadow-lg'
            }`}>
              {todayShift ? `${todayShift.shift_code}: ${todayShift.shift_name}` : 'Reguler'}
            </span>
          </div>
        </div>
        {(isGodMode || isImpersonating) && (
          <button onClick={() => { if (isGodMode && onCycleRole) onCycleRole(); else if (isImpersonating && onGodModeReturn) onGodModeReturn(); }}
            className="mt-1 text-[8px] text-center w-full text-[var(--danger)] font-bold uppercase tracking-widest animate-pulse">
            ⚡ GOD MODE — Ketuk untuk pindah dashboard
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mb-4 relative z-10 px-2 sm:px-0">
      <div className="relative rounded-2xl overflow-hidden shadow-lg" style={{ aspectRatio: '3/1' }}>
        <AnimatePresence mode="wait">
          <motion.img
            key={currentIndex}
            src={currentBanner}
            alt={`Banner ${currentIndex + 1}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </AnimatePresence>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* Bottom info centered */}
        <div className="absolute bottom-2.5 left-4 right-4 flex flex-col items-center justify-center text-center">
          <h3 className={`text-sm sm:text-base font-bold text-white drop-shadow-lg font-serif tracking-wide text-center leading-tight ${(isGodMode || isImpersonating) ? 'cursor-pointer active:scale-95' : ''}`}
            onClick={() => { if (isGodMode && onCycleRole) onCycleRole(); else if (isImpersonating && onGodModeReturn) onGodModeReturn(); }}>
            {getAestheticShortName(tenantName)}
          </h3>
          <p className="text-[8px] sm:text-[9px] text-white/80 drop-shadow tracking-wider uppercase font-bold text-center mt-1 leading-none">
            {getShortStructureName(structureName)}
          </p>
        </div>

        {/* Shift badge */}
        <div className="absolute top-2 right-2">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[8px] font-bold tracking-widest uppercase border shadow-lg ${
            isGodMode || isImpersonating ? 'bg-[var(--danger)]/80 border-[var(--danger)]/40 text-white' :
            todayShift?.shift_code === 'OFF' ? 'bg-gray-500/50 border-gray-500/30 text-gray-300' :
            todayShift ? 'bg-[var(--success)]/80 border-[var(--success)]/30 text-white' :
            'bg-black/40 border-white/10 text-white/90'
          }`}>
            {isGodMode || isImpersonating ? '⚡' : todayShift?.shift_code === 'OFF' ? '🔴' : todayShift ? '☀️' : '⚙️'} {todayShift ? todayShift.shift_code : 'REGULER'}
          </span>
        </div>

        {/* Dots indicator */}
        {banners.length > 1 && (
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((_, i) => (
              <button key={i} onClick={() => setCurrentIndex(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentIndex ? 'bg-white w-3' : 'bg-white/50'}`} />
            ))}
          </div>
        )}

        {/* God mode overlay */}
        {(isGodMode || isImpersonating) && (
          <div className="absolute top-2 left-2">
            <span className="px-2 py-0.5 rounded-full bg-[var(--danger)]/80 text-white text-[7px] font-bold uppercase tracking-widest border border-[var(--danger)]/40 shadow-lg">
              {isGodMode ? 'GOD MODE' : 'IMPERSONATE'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BannerCarousel;
