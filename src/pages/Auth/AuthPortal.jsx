import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { Fingerprint, Smartphone, AlertCircle, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DeviceUtil } from '../../utils/deviceUtil';

const AuthPortal = ({ onLogin }) => {
  const navigate = useNavigate();

  // State management
  const [mode, setMode] = useState('login'); // login, register, verify, owner
  const [secretClickCount, setSecretClickCount] = useState(0);
  const [tenantBrand, setTenantBrand] = useState(null); // Simulated branding
  const [biometricScan, setBiometricScan] = useState(0);

  // Interactive Particles State & Generator
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // Optional: add spring physics to mouse movement for smoother parallax
  const smoothMouseX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const smoothMouseY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  const [particles] = useState(() =>
    Array.from({ length: 25 }).map(() => ({
      id: Math.random(),
      size: Math.random() * 3 + 1, 
      x: Math.random() * 100, 
      y: Math.random() * 100, 
      duration: Math.random() * 15 + 10,
      delay: Math.random() * 5,
    }))
  );

  const handleMouseMove = (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    mouseX.set(x);
    mouseY.set(y);
  };

  // Form Data
  const [formData, setFormData] = useState({ identifier: '', password: '', name: '', email: '', otp: '' });
  const [deviceError, setDeviceError] = useState(false);

  // OTP & Device Binding States
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpTimeLeft, setOtpTimeLeft] = useState(0);
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const otpInputRefs = useRef([]);

  const isLoginFormComplete = formData.identifier.length > 3 && formData.password.length > 3;

  // Timer Effect
  useEffect(() => {
    let timer;
    if (otpTimeLeft > 0 && mode === 'verify') {
      timer = setInterval(() => setOtpTimeLeft(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [otpTimeLeft, mode]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSendOTP = () => {
    setIsSendingOTP(true);
    // Simulate Backend sending email
    setTimeout(() => {
      setIsSendingOTP(false);
      setOtpTimeLeft(300); // 5 minutes expiry
      setMode('verify');
    }, 1500);
  };

  const handleOtpChange = (index, value) => {
    if (!/^[0-9]*$/.test(value)) return;
    const newOtp = [...otpValues];
    newOtp[index] = value;
    setOtpValues(newOtp);
    if (value && index < 5) otpInputRefs.current[index + 1].focus();
  };

  const handleVerifyAndBind = async () => {
    setIsVerifying(true);
    try {
      // Simulate verifying OTP against DB
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Get unique hardware ID via DeviceUtil (safe on web + native)
      const deviceIdInfo = await DeviceUtil.getId();
      console.log('Binding Device:', deviceIdInfo.identifier);

      // Save device ID binding to session (Simulating DB save)
      sessionStorage.setItem('bound_device_id', deviceIdInfo.identifier);

      setIsVerifying(false);
      setMode('login'); // Return to login to complete flow
      alert('Perangkat berhasil diikat. Silakan masuk.');
    } catch (e) {
      console.error("Binding failed", e);
      setIsVerifying(false);
    }
  };

  // Animasi Stagger (Muncul Bergantian) untuk efek profesional
  const formVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  // Handle Input Changes & Branding Simulation
  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setDeviceError(false);

    // Simulate adaptive branding
    if (name === 'identifier' && value.toLowerCase().includes('provices')) {
      setTenantBrand({ name: 'PT. Provices Project', color: '#1E90FF' });
    } else if (name === 'identifier' && value.toLowerCase().includes('owner')) {
      setTenantBrand(null);
    } else if (value.length < 5) {
      setTenantBrand(null);
    }
  };

  // Secret Owner Trigger (Double Click Logo)
  const handleLogoClick = () => {
    setSecretClickCount(prev => prev + 1);
    if (secretClickCount === 1) { // 2 clicks (0 -> 1 -> 2)
      setMode('owner');
      setSecretClickCount(0);
    }
    setTimeout(() => setSecretClickCount(0), 1000); // Reset if too slow
  };

  // Login Execution Logic
  const executeLogin = async () => {
    // 0. Master Bypass Code Check
    if (formData.password.startsWith('BYPASS-')) {
      if (formData.identifier.includes('admin')) {
        onLogin('TENANT_ADMIN');
        navigate('/tenantadmin');
      } else {
        onLogin('EMPLOYEE');
        navigate('/');
      }
      return; // Skip device checks completely
    }

    // 1. Check Device Binding (Rule 1 Account 1 Device)
    if (formData.identifier === 'karyawan') {
      try {
        const currentDevice = await DeviceUtil.getId();
        const storedDevice = sessionStorage.getItem('bound_device_id');

        // Mismatch or Not Bound -> Reject
        if (!storedDevice || storedDevice !== currentDevice.identifier) {
          if (!deviceError) setDeviceError(true);
          return; // Stop login
        }
      } catch (e) {
        console.warn('Device ID check failed:', e);
        if (!deviceError) {
          setDeviceError(true);
          return;
        }
      }
    }

    // 2. Route based on mock identifier logic
    if (mode === 'owner') {
      onLogin('SUPER_ADMIN');
      navigate('/superadmin');
    } else if (formData.identifier.includes('admin')) {
      onLogin('TENANT_ADMIN');
      navigate('/tenantadmin');
    } else {
      onLogin('EMPLOYEE');
      navigate('/');
    }
  };

  // Biometric Scan Effect
  useEffect(() => {
    let interval;
    if (mode === 'owner' && biometricScan > 0 && biometricScan < 100) {
      interval = setInterval(() => {
        setBiometricScan(prev => {
          if (prev >= 100) {
            setTimeout(executeLogin, 500); // Login when done
            return 100;
          }
          return prev + 5;
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [mode, biometricScan]);

  return (
    <div className="min-h-screen bg-[var(--bg-darker)] flex flex-col items-center justify-center relative overflow-hidden font-sans px-4" onMouseMove={handleMouseMove}>
      {/* Drifting Neon Blobs */}
      <div className="absolute inset-0 pointer-events-none opacity-40 z-0">
        <motion.div
          animate={{ x: [0, 50, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute top-[10%] left-[20%] w-96 h-96 bg-[var(--aurora-1)] rounded-full blur-[120px] mix-blend-screen"
        />
        <motion.div
          animate={{ x: [0, -50, 0], y: [0, 50, 0], scale: [1, 1.3, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[10%] right-[20%] w-96 h-96 bg-[var(--aurora-3)] rounded-full blur-[120px] mix-blend-screen"
        />
      </div>

      {/* Interactive Floating Particles Layer */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {particles.map((p) => (
          <Particle 
            key={p.id} 
            p={p} 
            smoothMouseX={smoothMouseX} 
            smoothMouseY={smoothMouseY} 
          />
        ))}
      </div>
      {/* Main Glassmorphism Card */}
      <motion.div
        layout
        className={`w-full max-w-md ${mode === 'owner' ? 'card-running-light-god shadow-[0_0_50px_rgba(255,0,85,0.2)]' : 'card-running-light shadow-[0_0_50px_rgba(142,45,226,0.2)]'} z-10 relative`}
      >
        <div className="p-8 md:p-10 relative z-10">
          {/* Logo Area & Adaptive Branding */}
          <div className="text-center mb-10 relative cursor-pointer" onClick={handleLogoClick}>
            <AnimatePresence mode="wait">
              {tenantBrand ? (
                <motion.div key="tenant" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
                  <h1 className="text-3xl font-serif font-bold text-white tracking-wide">{tenantBrand.name}</h1>
                  <p className="text-[var(--aurora-3)] text-xs mt-2 uppercase tracking-widest">Portal Perusahaan</p>
                </motion.div>
              ) : mode === 'owner' ? (
                <motion.div key="owner" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                  <h1 className="text-3xl font-serif font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--danger)] to-[var(--warning)]">
                    MODE DEWA
                  </h1>
                  <p className="text-gray-400 text-xs mt-2 uppercase tracking-widest">Akses Super Admin</p>
                </motion.div>
              ) : (
                <motion.div key="default" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h1 className="text-3xl font-serif font-bold text-white tracking-wide">
                    SI PRESENSI
                  </h1>
                  <p className="text-gray-400 text-xs mt-2 uppercase tracking-widest">Sistem Identitas Tunggal</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">

            {/* ---- DEVICE BINDING ERROR STATE ---- */}
            {deviceError && (
              <motion.div
                key="device-error"
                variants={formVariants} initial="hidden" animate="show" exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center text-center pb-4"
              >
                <motion.div variants={itemVariants} className="w-20 h-20 rounded-full bg-[var(--danger)]/20 flex items-center justify-center mb-6 relative">
                  <div className="absolute inset-0 border border-[var(--danger)] rounded-full animate-ping opacity-50"></div>
                  <Smartphone size={32} className="text-[var(--danger)]" />
                  <AlertCircle size={16} className="absolute -bottom-1 -right-1 text-[var(--danger)] bg-[#0B0C10] rounded-full" />
                </motion.div>
                <motion.h2 variants={itemVariants} className="text-xl font-serif text-white mb-2">Perangkat Tidak Terdaftar</motion.h2>
                <motion.p variants={itemVariants} className="text-sm text-gray-400 mb-8 font-sans">
                  Anda mencoba masuk dari perangkat yang tidak dikenal. Pengikatan perangkat membatasi akses hanya pada ponsel utama Anda untuk mencegah kecurangan absensi.
                </motion.p>
                <motion.div variants={itemVariants} className="w-full space-y-3">
                  <button className="w-full py-4 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors">
                    Ajukan Reset Perangkat
                  </button>
                  <button onClick={() => setDeviceError(false)} className="w-full py-4 rounded-xl border border-white/10 text-gray-400 hover:text-white transition-colors">
                    Kembali
                  </button>
                </motion.div>
              </motion.div>
            )}

            {/* ---- OWNER BIOMETRIC STATE ---- */}
            {mode === 'owner' && !deviceError && (
              <motion.div key="owner-login" variants={formVariants} initial="hidden" animate="show" className="flex flex-col items-center">
                <motion.div variants={itemVariants} className="w-full relative mb-8">
                  <div className="relative h-14 w-full">
                    <input 
                      type="password" 
                      name="password"
                      value={formData.password}
                      onChange={handleInput}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && formData.password === 'DEWA-999') {
                          executeLogin();
                        } else if (e.key === 'Enter') {
                          alert('Kode Master Salah!');
                        }
                      }}
                      placeholder=" " 
                      className="peer w-full h-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 pt-4 pb-2 text-white outline-none focus:border-[var(--danger)] transition-all" 
                    />
                    <label className="absolute left-4 top-4 text-gray-500 text-sm transition-all pointer-events-none peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-[var(--danger)] peer-valid:top-1.5 peer-valid:text-xs">
                      Kode Master (Ketik DEWA-999 & Enter)
                    </label>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="flex items-center gap-4 w-full mb-8">
                  <div className="h-[1px] flex-1 bg-white/10"></div>
                  <span className="text-xs text-gray-500 uppercase tracking-widest">ATAU</span>
                  <div className="h-[1px] flex-1 bg-white/10"></div>
                </motion.div>

                <motion.button
                  variants={itemVariants}
                  onPointerDown={() => setBiometricScan(5)}
                  onPointerUp={() => setBiometricScan(0)}
                  onPointerLeave={() => setBiometricScan(0)}
                  animate={{ boxShadow: biometricScan > 0 ? '0 0 50px rgba(255, 0, 85, 0.4)' : '0 0 0px rgba(255, 0, 85, 0)' }}
                  className="w-32 h-32 rounded-full border-2 border-white/10 flex flex-col items-center justify-center relative group hover:border-[var(--warning)]/50 transition-all"
                >
                  {/* Scan Overlay */}
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-[var(--warning)]/20 rounded-b-full overflow-hidden"
                    style={{ height: `${biometricScan}%`, transition: 'height 0.1s linear' }}
                  >
                    <div className="w-full h-1 bg-[var(--warning)] shadow-[0_0_10px_var(--warning)]"></div>
                  </div>

                  <Fingerprint size={48} className={biometricScan > 0 ? "text-[var(--warning)]" : "text-gray-500 group-hover:text-gray-300"} />
                  <span className="text-[10px] mt-3 uppercase tracking-widest text-gray-500 group-hover:text-gray-400">Tahan untuk Pindai</span>
                </motion.button>
              </motion.div>
            )}

            {/* ---- REGULAR LOGIN STATE ---- */}
            {mode === 'login' && !deviceError && (
              <motion.div key="standard-login" variants={formVariants} initial="hidden" animate="show" exit={{ opacity: 0, x: 20 }}>
                <div className="space-y-5">
                  {/* Floating Label Input */}
                  <motion.div variants={itemVariants} className="relative h-14">
                    <input
                      type="text" name="identifier" value={formData.identifier} onChange={handleInput} required
                      placeholder=" "
                      className="peer w-full h-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 pt-4 pb-2 text-white outline-none focus:border-[var(--aurora-3)] transition-all shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]"
                    />
                    <label className="absolute left-4 top-4 text-gray-500 text-sm transition-all pointer-events-none peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-[var(--aurora-3)] peer-valid:top-1.5 peer-valid:text-xs">
                      Email atau ID Karyawan
                    </label>
                  </motion.div>

                  <motion.div variants={itemVariants} className="relative h-14">
                    <input
                      type="password" name="password" value={formData.password} onChange={handleInput} required
                      placeholder=" "
                      className="peer w-full h-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 pt-4 pb-2 text-white outline-none focus:border-[var(--aurora-3)] transition-all shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]"
                    />
                    <label className="absolute left-4 top-4 text-gray-500 text-sm transition-all pointer-events-none peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-[var(--aurora-3)] peer-valid:top-1.5 peer-valid:text-xs">
                      Kata Sandi
                    </label>
                  </motion.div>

                  <motion.div variants={itemVariants} className="flex justify-end">
                    <button className="text-xs text-[var(--aurora-3)] hover:text-white transition-colors">Lupa Kata Sandi?</button>
                  </motion.div>

                  {/* Submit Button with Running Lights Condition */}
                  <motion.div variants={itemVariants} className={`relative rounded-xl p-[2px] mt-8 ${isLoginFormComplete ? 'running-lights-border' : ''}`}>
                    <button
                      onClick={executeLogin}
                      className={`w-full py-4 rounded-[10px] font-bold text-sm tracking-widest uppercase transition-all flex items-center justify-center gap-2 z-10 relative ${isLoginFormComplete
                        ? 'bg-[var(--bg-darker)] text-white hover:shadow-[0_0_25px_rgba(0,201,255,0.4)]'
                        : 'bg-[#1A1C23] text-gray-500 cursor-not-allowed border border-white/5'
                        }`}
                    >
                      Masuk Portal <ChevronRight size={18} />
                    </button>
                  </motion.div>

                  {/* Google SSO Placeholder */}
                  <motion.div variants={itemVariants} className="mt-6 pt-6 border-t border-white/10">
                    <button className="w-full py-3.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-3">
                      <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                      Lanjutkan dengan Google
                    </button>
                  </motion.div>
                </div>

                <motion.div variants={itemVariants} className="mt-8 text-center">
                  <p className="text-sm text-gray-400">
                    Karyawan Baru? <button onClick={() => setMode('register')} className="text-[var(--aurora-1)] font-semibold hover:text-white transition-colors">Daftar Identitas</button>
                  </p>
                </motion.div>
              </motion.div>
            )}

            {/* ---- REGISTRATION STATE ---- */}
            {mode === 'register' && !deviceError && (
              <motion.div key="register" variants={formVariants} initial="hidden" animate="show" exit={{ opacity: 0, x: -20 }}>
                <div className="space-y-4">
                  <motion.div variants={itemVariants} className="relative h-14">
                    <input type="text" placeholder=" " className="peer w-full h-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 pt-4 pb-2 text-white outline-none focus:border-[var(--aurora-1)] transition-all" />
                    <label className="absolute left-4 top-4 text-gray-500 text-sm transition-all pointer-events-none peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-[var(--aurora-1)] peer-valid:top-1.5 peer-valid:text-xs">Nama Lengkap (KTP)</label>
                  </motion.div>
                  <motion.div variants={itemVariants} className="relative h-14">
                    <input type="text" placeholder=" " className="peer w-full h-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 pt-4 pb-2 text-white outline-none focus:border-[var(--aurora-1)] transition-all" />
                    <label className="absolute left-4 top-4 text-gray-500 text-sm transition-all pointer-events-none peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-[var(--aurora-1)] peer-valid:top-1.5 peer-valid:text-xs">ID Karyawan</label>
                  </motion.div>
                  <motion.div variants={itemVariants} className="relative h-14">
                    <input type="email" placeholder=" " className="peer w-full h-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 pt-4 pb-2 text-white outline-none focus:border-[var(--aurora-1)] transition-all" />
                    <label className="absolute left-4 top-4 text-gray-500 text-sm transition-all pointer-events-none peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-[var(--aurora-1)] peer-valid:top-1.5 peer-valid:text-xs">Email Aktif</label>
                  </motion.div>

                  <motion.button
                    variants={itemVariants}
                    onClick={handleSendOTP}
                    disabled={isSendingOTP}
                    className="w-full mt-4 py-4 rounded-xl font-bold text-sm tracking-widest uppercase transition-all bg-[var(--aurora-1)] text-white hover:bg-[#A343F0] shadow-[0_0_20px_rgba(142,45,226,0.4)] flex items-center justify-center gap-2"
                  >
                    {isSendingOTP ? <Loader2 size={18} className="animate-spin" /> : 'Kirim Kode Verifikasi'}
                  </motion.button>
                </div>
                <motion.div variants={itemVariants} className="mt-8 text-center">
                  <p className="text-sm text-gray-400">
                    Sudah terdaftar? <button onClick={() => setMode('login')} className="text-[var(--aurora-3)] font-semibold hover:text-white transition-colors">Masuk</button>
                  </p>
                </motion.div>
              </motion.div>
            )}

            {/* ---- OTP VERIFICATION STATE ---- */}
            {mode === 'verify' && !deviceError && (
              <motion.div key="verify" variants={formVariants} initial="hidden" animate="show" className="flex flex-col items-center">
                <motion.div variants={itemVariants}><CheckCircle2 size={48} className="text-[var(--success)] mb-6 drop-shadow-[0_0_15px_var(--success)]" /></motion.div>
                <motion.h2 variants={itemVariants} className="text-xl font-serif text-white mb-2">Verifikasi Identitas</motion.h2>
                <motion.p variants={itemVariants} className="text-sm text-gray-400 mb-6 text-center">Kami telah mengirim 6 digit kode keamanan ke email Anda.</motion.p>

                {otpTimeLeft > 0 ? (
                  <motion.div variants={itemVariants} className="text-[var(--warning)] text-xs font-mono mb-6 tracking-widest bg-[var(--warning)]/10 px-3 py-1 rounded-full">
                    Kadaluarsa dalam: {formatTime(otpTimeLeft)}
                  </motion.div>
                ) : (
                  <motion.div variants={itemVariants} className="text-[var(--danger)] text-xs font-mono mb-6 tracking-widest bg-[var(--danger)]/10 px-3 py-1 rounded-full">
                    Kode Kadaluarsa. Kirim Ulang!
                  </motion.div>
                )}

                <motion.div variants={itemVariants} className="flex gap-3 justify-center mb-8">
                  {otpValues.map((val, i) => (
                    <input
                      key={i}
                      type="text"
                      maxLength="1"
                      value={val}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      ref={el => otpInputRefs.current[i] = el}
                      className="w-10 h-12 text-center bg-[#1A1C23] border border-white/10 rounded-lg text-white font-bold text-lg focus:border-[var(--aurora-3)] outline-none transition-all shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
                    />
                  ))}
                </motion.div>

                <motion.button
                  variants={itemVariants}
                  onClick={handleVerifyAndBind}
                  disabled={isVerifying || otpTimeLeft === 0 || otpValues.join('').length < 6}
                  className="w-full py-4 rounded-xl font-bold text-sm tracking-widest uppercase transition-all bg-[var(--bg-dark)] border border-white/20 text-white hover:bg-white/10 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isVerifying ? <Loader2 size={18} className="animate-spin text-[var(--aurora-3)]" /> : 'Konfirmasi & Ikat Perangkat'}
                </motion.button>

                <motion.button variants={itemVariants} onClick={() => setMode('register')} className="mt-6 text-sm text-gray-500 hover:text-white transition-colors">Kembali</motion.button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

// Extracted Particle Component to use hooks cleanly
const Particle = ({ p, smoothMouseX, smoothMouseY }) => {
  const xOffset = useTransform(smoothMouseX, value => value * (p.size * 15));
  const yOffset = useTransform(smoothMouseY, value => value * (p.size * 15));

  return (
    <motion.div
      className="absolute"
      style={{ left: `${p.x}%`, top: `${p.y}%`, x: xOffset, y: yOffset }}
    >
      <motion.div
        className="rounded-full bg-white"
        style={{
          width: p.size,
          height: p.size,
          opacity: p.size > 2.5 ? 0.4 : 0.15,
          boxShadow: p.size > 2.5 ? `0 0 ${p.size * 2}px rgba(255,255,255,0.8)` : 'none'
        }}
        animate={{ y: [0, -50, 0], opacity: [p.size > 2.5 ? 0.4 : 0.15, p.size > 2.5 ? 0.8 : 0.3, p.size > 2.5 ? 0.4 : 0.15] }}
        transition={{ duration: p.duration, repeat: Infinity, ease: "easeInOut", delay: p.delay }}
      />
    </motion.div>
  );
};

export default AuthPortal;
