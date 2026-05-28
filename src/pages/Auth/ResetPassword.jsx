import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, Lock, AlertCircle } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { useToast } from '../../components/Toast';

/** @type {(s: string) => string} Passthrough i18n - app is monolingual Indonesian */
const t = (s) => s;

const ResetPassword = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (password.length < 6) {
      toast('Kata sandi minimal 6 karakter.', 'error');
      return;
    }
    if (password !== confirmPassword) {
      toast('Konfirmasi kata sandi tidak sama.', 'error');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      toast('Kata sandi berhasil diperbarui. Silakan masuk kembali.', 'success');
      setTimeout(() => navigate('/login', { replace: true }), 1400);
    } catch (error) {
      toast(`Gagal memperbarui kata sandi: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0C10] flex items-center justify-center p-6 text-white">
      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="w-full max-w-md glass-panel p-8 rounded-3xl border border-white/10"
      >
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center mb-6">
          {done ? <CheckCircle2 size={26} /> : <Lock size={26} />}
        </div>
        <h1 className="text-2xl font-serif font-bold mb-2">{t('Reset Kata Sandi')}</h1>
        <p className="text-sm text-gray-400 mb-6">{t('Masukkan kata sandi baru untuk akun Anda.')}</p>

        <div className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('Kata sandi baru')}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm outline-none focus:border-[var(--aurora-3)]"
            required
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t('Ulangi kata sandi baru')}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm outline-none focus:border-[var(--aurora-3)]"
            required
          />
        </div>

        <div className="mt-5 flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-[11px] text-gray-400">
          <AlertCircle size={14} className="mt-0.5 text-[var(--aurora-3)] shrink-0" />
          {t('Link reset dari email harus dibuka dari browser yang sama sampai proses ini selesai.')}
        </div>

        <button
          type="submit"
          disabled={loading || done}
          className="mt-6 w-full py-4 rounded-2xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : done ? <CheckCircle2 size={16} /> : <Lock size={16} />}
          {done ? t('Berhasil') : t('Simpan Kata Sandi')}
        </button>
      </motion.form>
    </div>
  );
};

export default ResetPassword;
