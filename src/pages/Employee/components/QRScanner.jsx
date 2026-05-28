import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, CheckCircle2, XCircle, Camera, ArrowLeft, Loader2, Smartphone, ShieldCheck } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import FaceVerificationModal from '../../../components/FaceVerificationModal';

const QRScanner = ({ onBack }) => {
  const [mode, setMode] = useState('scan');
  const [manualCode, setManualCode] = useState('');
  const [status, setStatus] = useState('idle');
  const [profile, setProfile] = useState(null);
  const [showFaceVerif, setShowFaceVerif] = useState(false);
  const [pendingToken, setPendingToken] = useState(null);
  const autoSubmitRef = useRef(false);
  const location = useLocation();
  const toast = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: p } = await supabase.from('profiles').select('id, tenant_id, full_name').eq('auth_id', session.user.id).maybeSingle();
      if (p) setProfile(p);
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    if (token) setManualCode(token);
  }, [location.search]);

  const t = (s) => s;

  const handleManualSubmit = async (codeOverride) => {
    const rawCode = typeof codeOverride === 'string' ? codeOverride : manualCode;
    if (!rawCode.trim()) { toast('Masukkan kode QR', 'error'); return; }
    setStatus('scanning');
    try {
      const token = rawCode.trim().split('token=').pop()?.split('&')[0] || rawCode.trim();
      const { data: qrToken, error } = await supabase.from('qr_attendance_tokens')
        .select('id, project_id, is_active, tenant_id, expires_at')
        .eq('token', token)
        .maybeSingle();

      if (error || !qrToken) { setStatus('failed'); toast('Kode QR tidak valid!', 'error'); return; }
      if (!qrToken.is_active) { setStatus('failed'); toast('Kode QR sudah tidak aktif!', 'error'); return; }
      if (qrToken.tenant_id !== profile?.tenant_id) { setStatus('failed'); toast('Kode QR bukan untuk perusahaan Anda!', 'error'); return; }
      if (qrToken.expires_at && new Date(qrToken.expires_at) < new Date()) { setStatus('failed'); toast('Kode QR sudah kadaluarsa!', 'error'); return; }

      // QR valid — trigger face verification before recording attendance
      setStatus('idle');
      setPendingToken(qrToken);
      setShowFaceVerif(true);
    } catch (e) {
      setStatus('failed');
      toast('Gagal: ' + e.message, 'error');
    }
  };

  /** Called by FaceVerificationModal when face is verified successfully */
  const handleFaceVerified = async ({ confidence }) => {
    setShowFaceVerif(false);
    if (!pendingToken) return;
    setStatus('scanning');
    try {
      await supabase.from('attendance_logs').insert({
        tenant_id: profile.tenant_id, user_id: profile.id,
        action: 'CLOCK_IN', status: 'ONTIME', timestamp: new Date().toISOString(),
        face_confidence: confidence,
      });

      await supabase.from('qr_attendance_logs').insert({
        tenant_id: profile.tenant_id, user_id: profile.id,
        token_id: pendingToken.id, action: 'CLOCK_IN', timestamp: new Date().toISOString()
      });

      setPendingToken(null);
      setStatus('success');
      toast('Absensi via QR berhasil!', 'success');
      setTimeout(() => onBack(), 2000);
    } catch (e) {
      setStatus('failed');
      toast('Gagal: ' + e.message, 'error');
    }
  };

  /** Called when user skips/cancels face verification */
  const handleFaceSkipped = async () => {
    setShowFaceVerif(false);
    if (!pendingToken) return;
    setStatus('scanning');
    try {
      await supabase.from('attendance_logs').insert({
        tenant_id: profile.tenant_id, user_id: profile.id,
        action: 'CLOCK_IN', status: 'ONTIME', timestamp: new Date().toISOString(),
        face_confidence: null,
      });

      await supabase.from('qr_attendance_logs').insert({
        tenant_id: profile.tenant_id, user_id: profile.id,
        token_id: pendingToken.id, action: 'CLOCK_IN', timestamp: new Date().toISOString()
      });

      setPendingToken(null);
      setStatus('success');
      toast('Absensi berhasil (tanpa verifikasi wajah).', 'success');
      setTimeout(() => onBack(), 2000);
    } catch (e) {
      setStatus('failed');
      toast('Gagal: ' + e.message, 'error');
    }
  };

  useEffect(() => {
    if (profile && manualCode && !autoSubmitRef.current) {
      autoSubmitRef.current = true;
      handleManualSubmit(manualCode);
    }
  }, [profile, manualCode]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6 pb-8">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors w-fit"><ArrowLeft size={18} /> Kembali</button>

      {/* Face Verification Modal */}
      <FaceVerificationModal
        isOpen={showFaceVerif}
        onSuccess={handleFaceVerified}
        onCancel={handleFaceSkipped}
        maxRetries={3}
      />

      <div className="glass-panel p-8 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-[var(--aurora-3)]/5 rounded-full blur-3xl" />
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center mx-auto mb-6 shadow-lg">
          <QrCode size={36} className="text-white" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-white mb-2">{t('Absensi via QR Code')}</h2>
        <p className="text-sm text-gray-400 mb-8">{t('Scan QR code yang tersedia di lokasi kerja Anda')}</p>

        <div className="w-full space-y-4">
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2 text-left">{t('Masukkan Kode QR')}</label>
            <div className="flex gap-2">
              <input value={manualCode} onChange={e => setManualCode(e.target.value)}
                placeholder="Tempel URL atau kode QR di sini..."
                onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
                className="flex-1 bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-3)]" />
              <button onClick={handleManualSubmit} disabled={status === 'scanning'}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-bold text-xs disabled:opacity-50">
                {status === 'scanning' ? <Loader2 size={18} className="animate-spin" /> : 'Absen'}
              </button>
            </div>
            <p className="text-[9px] text-gray-600 mt-2 text-left">{t('Atau scan langsung dari kamera (jika tersedia)')}</p>
          </div>

          <div className="border-t border-white/10 pt-6">
            {/* Face Verification Security Badge */}
            <div className="flex items-center gap-3 bg-[var(--aurora-1)]/5 border border-[var(--aurora-1)]/20 rounded-2xl p-4 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--aurora-1)]/10 text-[var(--aurora-1)] flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-white">{t('Verifikasi Wajah Aktif')}</p>
                <p className="text-[9px] text-gray-500 mt-0.5">{t('Setelah QR terverifikasi, sistem akan meminta konfirmasi wajah Anda untuk keamanan tambahan.')}</p>
              </div>
            </div>
            <div className="bg-white/5 rounded-2xl p-6 border border-dashed border-white/10">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Camera size={28} className="text-gray-500" />
              </div>
              <p className="text-xs text-gray-500">{t('Arahkan kamera ke QR code yang tersedia di lokasi')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel p-5">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Smartphone size={16} /> Cara Penggunaan</h3>
        <ol className="text-xs text-gray-400 space-y-2 list-decimal list-inside">
          <li>{t('Buka halaman QR Attendance di aplikasi')}</li>
          <li>{t('Scan QR code yang terpajang di lokasi kerja (pintu masuk, resepsionis)')}</li>
          <li>{t('Atau minta URL QR dari admin dan tempel di kolom di atas')}</li>
          <li>{t('Konfirmasi absensi masuk otomatis tercatat')}</li>
        </ol>
      </div>

      <AnimatePresence>
        {status === 'success' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md">
            <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="glass-panel p-10 text-center border border-[var(--success)]/30 shadow-[0_0_50px_rgba(0,255,135,0.2)]">
              <CheckCircle2 size={64} className="text-[var(--success)] mx-auto mb-4 drop-shadow-[0_0_20px_var(--success)]" />
              <h3 className="text-xl font-serif font-bold text-white mb-2">Absensi Berhasil!</h3>
              <p className="text-sm text-gray-400">{profile?.full_name} — {new Date().toLocaleTimeString('id-ID')}</p>
            </motion.div>
          </motion.div>
        )}
        {status === 'failed' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md">
            <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="glass-panel p-10 text-center border border-[var(--danger)]/30">
              <XCircle size={64} className="text-[var(--danger)] mx-auto mb-4" />
              <h3 className="text-xl font-serif font-bold text-white mb-2">{t('Gagal')}</h3>
              <p className="text-sm text-gray-400">{t('Kode QR tidak valid. Coba lagi.')}</p>
              <button onClick={() => setStatus('idle')} className="mt-6 px-6 py-3 rounded-xl bg-white/10 text-white text-xs font-bold">{t('Tutup')}</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default QRScanner;
