import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../utils/supabaseClient';

const BannerCarousel = ({ tenantName, structureName, isGodMode, isImpersonating, todayShift, onCycleRole, onGodModeReturn, companyInfo }) => {
  const [banners, setBanners] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchBanners();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const fetchBanners = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: p } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
    const tid = p?.tenant_id;
    if (!tid && !isGodMode) { setLoaded(true); return; }
    let q = supabase.from('tenant_settings').select('banners, banner_interval');
    if (tid) q = q.eq('tenant_id', tid); else q = q.not('banners', 'is', null).order('tenant_id').limit(1);
    const { data: ts } = await q.maybeSingle();
    setLoaded(true);
    if (ts?.banners?.length > 0) {
      setBanners(ts.banners);
      const interval = (ts.banner_interval || 5) * 1000;
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % ts.banners.length);
      }, interval);
      return;
    }
    // Fallback: coba baca manifest dari storage bucket (public, tidak kena RLS)
    if (tid) {
      try {
        const manifestUrl = supabase.storage.from('banners').getPublicUrl(`tenants/${tid}/banners_manifest.json`).data.publicUrl;
        const res = await fetch(manifestUrl);
        if (res.ok) {
          const manifest = await res.json();
          if (manifest?.banners?.length > 0) {
            setBanners(manifest.banners);
            const interval = 5000;
            intervalRef.current = setInterval(() => {
              setCurrentIndex(prev => (prev + 1) % manifest.banners.length);
            }, interval);
          }
        }
      } catch {}
    }
  };

  const currentBanner = banners[currentIndex];

  if (!loaded || banners.length === 0) {
    return (
      <div className="w-full max-w-md mb-4 relative z-10">
        <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '3/1' }}>
          <div className="w-full h-full bg-gradient-to-br from-[var(--aurora-1)]/15 to-[var(--aurora-3)]/15 flex flex-col items-center justify-center">
            {companyInfo?.logo_url && (
              <img src={companyInfo.logo_url} alt="Logo" className="w-10 h-10 object-contain mb-2 opacity-60" />
            )}
            <h3 className="text-lg font-bold text-white/80 font-serif tracking-wide">{tenantName}</h3>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest">{structureName}</p>
          </div>
          <div className="absolute top-2 right-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[8px] font-bold tracking-widest uppercase border transition-all ${
              todayShift?.shift_code === 'OFF' 
              ? 'bg-gray-500/10 border-gray-500/30 text-gray-400' 
              : todayShift ? 'bg-[var(--success)]/10 border-[var(--success)]/30 text-[var(--success)]' 
              : 'text-gray-500'
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
    <div className="w-full max-w-md mb-4 relative z-10">
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

        {/* Bottom info */}
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className={`text-base sm:text-lg font-bold text-white drop-shadow-lg font-serif tracking-wide ${(isGodMode || isImpersonating) ? 'cursor-pointer active:scale-95' : ''}`}
            onClick={() => { if (isGodMode && onCycleRole) onCycleRole(); else if (isImpersonating && onGodModeReturn) onGodModeReturn(); }}>
            {tenantName}
          </h3>
          <p className="text-[10px] text-white/70 drop-shadow tracking-widest uppercase font-bold">{structureName}</p>
        </div>

        {/* Shift badge */}
        <div className="absolute top-2 right-2">
          {todayShift ? (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[8px] font-bold tracking-widest uppercase border shadow-lg ${
              isGodMode || isImpersonating ? 'bg-[var(--danger)]/80 border-[var(--danger)]/40 text-white' :
              todayShift.shift_code === 'OFF' ? 'bg-gray-500/50 border-gray-500/30 text-gray-300' : 'bg-[var(--success)]/80 border-[var(--success)]/30 text-white'
            }`}>
              {isGodMode || isImpersonating ? '⚡' : todayShift.shift_code === 'OFF' ? '🔴' : '☀️'} {todayShift.shift_code}
            </span>
          ) : null}
        </div>

        {/* Dots indicator */}
        {banners.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
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
