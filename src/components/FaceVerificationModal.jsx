import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CheckCircle2, XCircle, Loader2, AlertTriangle, ShieldCheck, X, RefreshCw } from 'lucide-react';
import { openCamera, closeCamera, verifyFace } from '../utils/faceVerification';

/**
 * FaceVerificationModal
 * 
 * Shows a full-screen modal with live camera feed.
 * Performs client-side face detection and calls onSuccess({ snapshot, confidence })
 * when verification passes, or onFailure(message) when it fails.
 * 
 * Props:
 *  - isOpen: boolean
 *  - onSuccess: ({ snapshot: Blob, confidence: number }) => void
 *  - onCancel: () => void
 *  - maxRetries: number (default 3)
 */
const FaceVerificationModal = ({ isOpen, onSuccess, onCancel, maxRetries = 3 }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [phase, setPhase] = useState('idle'); // idle | loading | ready | verifying | success | failed | error
  const [message, setMessage] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [retries, setRetries] = useState(0);
  const [countdown, setCountdown] = useState(null);

  const stopCamera = useCallback(() => {
    closeCamera(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    setPhase('loading');
    setMessage('Membuka kamera...');
    try {
      const stream = await openCamera();
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPhase('ready');
      setMessage('Posisikan wajah Anda di dalam bingkai, lalu tekan "Verifikasi".');
    } catch (err) {
      setPhase('error');
      if (err.name === 'NotAllowedError') {
        setMessage('Akses kamera ditolak. Harap izinkan kamera di pengaturan browser Anda.');
      } else if (err.name === 'NotFoundError') {
        setMessage('Kamera tidak ditemukan. Pastikan perangkat Anda memiliki kamera depan.');
      } else {
        setMessage('Gagal membuka kamera: ' + err.message);
      }
    }
  }, []);

  const runVerification = useCallback(async () => {
    if (!videoRef.current || phase !== 'ready') return;
    setPhase('verifying');
    setMessage('Menganalisis wajah...');
    setCountdown(null);

    // Small delay to show the verifying animation
    await new Promise(r => setTimeout(r, 500));

    const result = await verifyFace(videoRef.current);
    setConfidence(result.confidence);

    if (result.verified) {
      setPhase('success');
      setMessage(`Verifikasi berhasil! (${result.confidence}% kepercayaan)`);
      stopCamera();
      setTimeout(() => {
        onSuccess({ snapshot: result.snapshot, confidence: result.confidence });
      }, 1500);
    } else {
      const newRetries = retries + 1;
      setRetries(newRetries);
      if (newRetries >= maxRetries) {
        setPhase('failed');
        setMessage('Verifikasi gagal setelah beberapa percobaan. Silakan coba lagi nanti.');
        stopCamera();
      } else {
        setPhase('ready');
        setMessage(`${result.message} (Percobaan ${newRetries}/${maxRetries})`);
      }
    }
  }, [phase, retries, maxRetries, onSuccess, stopCamera]);

  // Auto-start countdown when ready
  useEffect(() => {
    if (phase !== 'ready' || retries !== 0) return;
    let count = 3;
    setCountdown(count);
    const iv = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(iv);
        setPhase('verifying');
        runVerification();
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [phase, retries]);

  useEffect(() => {
    if (isOpen) {
      setRetries(0);
      setConfidence(0);
      setCountdown(null);
      startCamera();
    } else {
      stopCamera();
      setPhase('idle');
    }
    return () => stopCamera();
  }, [isOpen]);

  const handleRetry = () => {
    setRetries(0);
    setConfidence(0);
    setPhase('idle');
    startCamera();
  };

  const phaseConfig = {
    loading:   { color: 'var(--aurora-3)', icon: <Loader2 className="animate-spin" size={32} /> },
    ready:     { color: 'var(--aurora-1)', icon: <Camera size={32} /> },
    verifying: { color: 'var(--warning)', icon: <ShieldCheck size={32} className="animate-pulse" /> },
    success:   { color: 'var(--success)', icon: <CheckCircle2 size={32} /> },
    failed:    { color: 'var(--danger)', icon: <XCircle size={32} /> },
    error:     { color: 'var(--danger)', icon: <AlertTriangle size={32} /> },
  };
  const cfg = phaseConfig[phase] || phaseConfig.loading;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-xl"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-sm mx-4 rounded-3xl overflow-hidden"
            style={{ border: `1.5px solid ${cfg.color}30`, background: 'rgba(15,16,20,0.97)', boxShadow: `0 0 60px ${cfg.color}20` }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${cfg.color}15`, color: cfg.color }}>
                  {cfg.icon}
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm tracking-wide">Verifikasi Wajah</h3>
                  <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">Keamanan Absensi</p>
                </div>
              </div>
              <button
                onClick={() => { stopCamera(); onCancel(); }}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Camera Viewport */}
            <div className="relative bg-black" style={{ aspectRatio: '1 / 1' }}>
              {/* Live Video */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)', display: (phase === 'loading' || phase === 'idle' || phase === 'error') ? 'none' : 'block' }}
              />

              {/* Face Guide Overlay */}
              {(phase === 'ready' || phase === 'verifying') && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {/* Corner brackets */}
                  <div className="relative w-56 h-64">
                    {/* Top-left */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 rounded-tl-lg" style={{ borderColor: cfg.color }} />
                    {/* Top-right */}
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 rounded-tr-lg" style={{ borderColor: cfg.color }} />
                    {/* Bottom-left */}
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 rounded-bl-lg" style={{ borderColor: cfg.color }} />
                    {/* Bottom-right */}
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 rounded-br-lg" style={{ borderColor: cfg.color }} />

                    {/* Scanning line animation */}
                    {phase === 'verifying' && (
                      <motion.div
                        className="absolute left-2 right-2 h-0.5 rounded-full"
                        style={{ background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)` }}
                        animate={{ top: ['10%', '85%', '10%'] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Countdown overlay */}
              {countdown !== null && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                  <motion.div
                    key={countdown}
                    initial={{ scale: 1.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    className="text-6xl font-black text-white drop-shadow-[0_0_20px_white]"
                  >
                    {countdown}
                  </motion.div>
                </div>
              )}

              {/* Placeholder when camera not shown */}
              {(phase === 'loading' || phase === 'idle' || phase === 'error') && (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6" style={{ minHeight: 280 }}>
                  <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: `${cfg.color}10`, color: cfg.color }}>
                    {cfg.icon}
                  </div>
                </div>
              )}

              {/* Success/Failed overlay */}
              <AnimatePresence>
                {(phase === 'success' || phase === 'failed') && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-4"
                    style={{ background: `${cfg.color}15`, backdropFilter: 'blur(4px)' }}
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                      className="w-24 h-24 rounded-full flex items-center justify-center"
                      style={{ background: `${cfg.color}20`, color: cfg.color, border: `2px solid ${cfg.color}50` }}
                    >
                      {cfg.icon && React.cloneElement(cfg.icon, { size: 48 })}
                    </motion.div>
                    {phase === 'success' && (
                      <div className="text-center">
                        <p className="font-bold text-white text-lg">Berhasil!</p>
                        <p className="text-xs text-gray-300 mt-1">{confidence}% kepercayaan</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="p-5 space-y-4">
              {/* Confidence bar */}
              {confidence > 0 && (
                <div>
                  <div className="flex justify-between text-[9px] text-gray-500 uppercase tracking-widest mb-1">
                    <span>Kepercayaan</span>
                    <span style={{ color: cfg.color }}>{confidence}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: cfg.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${confidence}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )}

              {/* Status message */}
              <p className="text-xs text-gray-400 text-center leading-relaxed min-h-[2.5rem] flex items-center justify-center">
                {message}
              </p>

              {/* Action buttons */}
              <div className="flex gap-3">
                {phase === 'ready' && countdown === null && (
                  <button
                    id="face-verify-btn"
                    onClick={runVerification}
                    className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 active:scale-95"
                    style={{ background: `linear-gradient(135deg, var(--aurora-1), var(--aurora-3))` }}
                  >
                    Verifikasi Sekarang
                  </button>
                )}

                {(phase === 'failed' || phase === 'error') && (
                  <button
                    onClick={handleRetry}
                    className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-white/10 hover:bg-white/15 transition-all flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={14} /> Coba Lagi
                  </button>
                )}

                {phase !== 'success' && (
                  <button
                    onClick={() => { stopCamera(); onCancel(); }}
                    className="py-3 px-4 rounded-xl font-bold text-xs text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 transition-all"
                  >
                    Lewati
                  </button>
                )}
              </div>

              {/* Retry info */}
              {retries > 0 && phase === 'ready' && (
                <p className="text-center text-[9px] text-gray-600 font-bold uppercase tracking-widest">
                  Percobaan {retries}/{maxRetries}
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FaceVerificationModal;
