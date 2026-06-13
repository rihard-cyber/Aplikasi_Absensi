import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { Fingerprint, Smartphone, AlertCircle, CheckCircle2, ChevronRight, Loader2, Eye, EyeOff, MessageCircle, User, Lock, Key, ClipboardList, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DeviceUtil } from '../../utils/deviceUtil';
import { supabase } from '../../utils/supabaseClient';
import { useToast } from '../../components/Toast';
import { registerBackHandler } from '../../utils/navigation';
import DeveloperWatermark from '../../components/DeveloperWatermark';
import DeveloperWatermarkBackground from '../../components/DeveloperWatermarkBackground';

const OTP_LENGTH = 6;

// ─── Field validation rules ──────────────────────────────────────
const FIELD_RULES = {
  name: {
    validate: (v) => (!v || v.trim().length < 2 ? 'Nama lengkap minimal 2 karakter' : ''),
  },
  email: {
    validate: (v) => (!v ? 'Email wajib diisi' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Format email tidak valid' : ''),
  },
  phone: {
    validate: (v) => (v && v.trim().length > 0 && v.trim().length < 8 ? 'Nomor HP minimal 8 digit' : ''),
  },
  nip: {
    validate: (v, deps) => (!deps?.isTenantReg && !v ? 'NIP wajib diisi' : ''),
  },
  activationCode: {
    validate: (v) => (!v || v.trim().length < 4 ? 'Kode aktivasi wajib diisi' : ''),
  },
  regPassword: {
    validate: (v) => (!v ? 'Password wajib diisi' : v.length < 6 ? 'Password minimal 6 karakter' : ''),
  },
  confirmPassword: {
    validate: (v, deps) => (!v ? 'Konfirmasi password wajib diisi' : v !== deps?.regPassword ? 'Password tidak cocok' : ''),
  },
  acceptTerms: {
    validate: (v) => (!v ? 'Anda harus menyetujui syarat & ketentuan' : ''),
  },
  identifier: {
    validate: (v) => (!v || v.trim().length < 2 ? 'Email / ID Karyawan wajib diisi' : ''),
  },
  password: {
    validate: (v) => (!v ? 'Password wajib diisi' : ''),
  },
};

const validateField = (name, value, deps = {}) => {
  const rule = FIELD_RULES[name];
  if (!rule) return '';
  return rule.validate(value, deps);
};

// ─── Helper: render floating input ────────────────────────────
const FloatingInput = ({ name, type = 'text', label, value, onChange, onBlur, onKeyDown, leftIcon, rightIcon, error, borderColor, extraClass, touched }) => {
  const hasError = error && touched?.[name];
  
  let displayLeftIcon = leftIcon;
  if (!displayLeftIcon) {
    if (name === 'identifier' || name === 'name' || name === 'email') {
      displayLeftIcon = <User size={16} />;
    } else if (name === 'password' || name === 'confirmPassword' || name === 'regPassword') {
      displayLeftIcon = <Lock size={16} />;
    } else if (name === 'activationCode') {
      displayLeftIcon = <Key size={16} />;
    } else if (name === 'nip' || name === 'phone') {
      displayLeftIcon = <Smartphone size={16} />;
    }
  }

  return (
    <div className="login-field">
      {label && <label className="text-[9px] text-gray-500 uppercase tracking-widest font-black ml-1">{label}</label>}
      <div className={`login-input-wrap ${hasError ? 'border-[var(--danger)]' : ''} ${extraClass || ''}`}>
        {displayLeftIcon && <div className="text-gray-500 shrink-0 flex items-center">{displayLeftIcon}</div>}
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          placeholder={`Masukkan ${label}...`}
          className="flex-1 bg-transparent border-none outline-none text-white text-sm"
        />
        {rightIcon && <div className="shrink-0 flex items-center">{rightIcon}</div>}
      </div>
      {hasError && <p className="text-[var(--danger)] text-[10px] mt-1 ml-1 font-medium">{error}</p>}
    </div>
  );
};

const getLogoInitials = (name) => {
  if (!name || name === 'Memuat...' || name === 'ABSENSI') return 'SP';
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

const AuthPortal = ({ onLogin }) => {
  const navigate = useNavigate();
  const toast = useToast();

  // State management
  const [mode, setMode] = useState('login'); // login, register, verify, owner, forgot-password, demo, demo-success

  // Handle layer-by-layer back button
  useEffect(() => {
    const unregister = registerBackHandler(() => {
      if (mode === 'verify') {
        setMode('register');
        return true;
      }
      if (mode !== 'login') {
        setMode('login');
        setFormData(prev => ({ ...prev, password: '' }));
        return true;
      }
      return false;
    });
    return unregister;
  }, [mode]);
  const [secretClickCount, setSecretClickCount] = useState(0);
  const [tenantBrand, setTenantBrand] = useState(null);
  const [biometricScan, setBiometricScan] = useState(0);

  // Login method toggle
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' | 'whatsapp'

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Interactive Particles & Mouse Parallax
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothMouseX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const smoothMouseY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  const particlesRef = useRef(null);
  if (!particlesRef.current) {
    particlesRef.current = Array.from({ length: 25 }).map(() => ({
      id: Math.random(),
      size: Math.random() * 3 + 1,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 15 + 10,
      delay: Math.random() * 5,
    }));
  }
  const particles = particlesRef.current;

  const handleMouseMove = (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    mouseX.set(x);
    mouseY.set(y);
  };

  // Form Data
  const [formData, setFormData] = useState({
    identifier: '', password: '', name: '', email: '', nip: '',
    regPassword: '', confirmPassword: '', otp: '', activationCode: '', phone: '',
    companyName: '', employeeCount: '10', demoMessage: '',
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isTenantReg, setIsTenantReg] = useState(false);
  const [deviceError, setDeviceError] = useState(false);

  // Inline validation
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const touchField = useCallback((name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);

  const validateAndSetError = useCallback((name, value, deps = {}) => {
    const error = validateField(name, value, deps);
    setErrors(prev => ({ ...prev, [name]: error }));
    return !error;
  }, []);

  // OTP & Device Binding States
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpTimeLeft, setOtpTimeLeft] = useState(0);

  const [otpValues, setOtpValues] = useState(Array(OTP_LENGTH).fill(''));
  const [otpError, setOtpError] = useState('');
  const otpInputRefs = useRef([]);

  const isLoginFormComplete = useMemo(() => {
    if (loginMethod === 'whatsapp') return formData.identifier.length > 4 && formData.password.length > 3;
    return formData.identifier.length > 3 && formData.password.length > 3;
  }, [formData.identifier, formData.password, loginMethod]);

  // PERSISTENT SESSION & AUTO-LOGIN ROUTING
  useEffect(() => {
    let cancelled = false;
    const checkSession = async () => {
      let session;
      try {
        const res = await supabase.auth.getSession();
        session = res.data?.session;
      } catch (e) {
        toast('Gagal terhubung ke server. Cek koneksi atau restore database.', 'error');
        return;
      }
      if (!session || cancelled) return;
      const { data: userProfile } = await supabase.from('profiles').select('*').eq('auth_id', session.user.id).maybeSingle();

      if (userProfile && !cancelled) {
        const role = userProfile?.role?.toUpperCase();
        if (role === 'SUPER_ADMIN') {
          sessionStorage.removeItem('god_key');
          sessionStorage.setItem('super_admin_verified', 'true');
          onLogin('SUPER_ADMIN');
          navigate('/superadmin');
        } else if (role === 'TENANT_ADMIN') {
          sessionStorage.setItem('operational_access', 'MEMILIKI AKSES');
          onLogin('TENANT_ADMIN');
          navigate('/tenantadmin');
        } else if (role === 'SUB_ADMIN') {
          sessionStorage.setItem('operational_access', 'MEMILIKI AKSES');
          onLogin('SUB_ADMIN');
          navigate('/subadmin');
        } else {
          sessionStorage.setItem('operational_access', userProfile?.operational_access ? 'MEMILIKI AKSES' : 'TIDAK');
          onLogin('EMPLOYEE');
          navigate('/app');
        }
      }
    };
    checkSession();
    return () => { cancelled = true; };
  }, [navigate, onLogin]);

  // Pre-load tenant brand from localStorage cache on mount
  useEffect(() => {
    const cachedName = localStorage.getItem('tenant_name');
    const cachedLogo = localStorage.getItem('tenant_logo_url');
    if (cachedName) {
      setTenantBrand({ name: cachedName, logo_url: cachedLogo });
    }
  }, []);

  // Debounced NIP/Email Tenant lookup
  useEffect(() => {
    if (mode !== 'login') return;
    const trimmed = formData.identifier.trim();
    if (trimmed.length < 3) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .rpc('get_tenant_theme', { p_identifier: trimmed });

        if (error) {
          console.warn("Tenant lookup error:", error);
          return;
        }

        const brand = Array.isArray(data) ? data[0] : data;
        if (brand?.name) {
          setTenantBrand(brand);
          localStorage.setItem('tenant_name', brand.name);
          if (brand.logo_url) {
            localStorage.setItem('tenant_logo_url', brand.logo_url);
          } else {
            localStorage.removeItem('tenant_logo_url');
          }
        }
      } catch (err) {
        console.warn("Tenant lookup failed:", err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formData.identifier, mode]);

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

  const resolveRegistrationTenant = async () => {
    const { data, error } = await supabase.rpc('resolve_tenant_registration_code', {
      p_code: formData.activationCode,
      p_admin: isTenantReg
    });

    const tenant = Array.isArray(data) ? data[0] : data;
    if (error || !tenant?.id) {
      throw new Error(
        isTenantReg
          ? 'Kode Lisensi Tenant tidak valid atau sudah pernah digunakan.\nGunakan kode yang diberikan oleh Super Admin.'
          : 'Kode Aktivasi Karyawan tidak valid.\nGunakan kode dengan prefix "SI-" yang diberikan oleh Admin perusahaan Anda.'
      );
    }
    return tenant;
  };

  const registerProfileWithCode = async (authId, deviceIdentifier) => {
    const { error } = await supabase.rpc('register_profile_with_code', {
      p_auth_id: authId,
      p_full_name: formData.name,
      p_nip: isTenantReg ? null : formData.nip,
      p_email: formData.email,
      p_activation_code: formData.activationCode,
      p_is_tenant_admin: isTenantReg,
      p_device_id: deviceIdentifier,
      p_phone: formData.phone || null
    });

    if (error) throw new Error(`Gagal menyimpan profil: ${error.message}`);
  };

  const handleSubmitDemoRequest = async () => {
    if (!formData.name || formData.name.trim().length < 2) {
      toast('Nama lengkap minimal 2 karakter', 'error');
      return;
    }
    if (!formData.companyName || formData.companyName.trim().length < 2) {
      toast('Nama perusahaan wajib diisi', 'error');
      return;
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast('Email tidak valid', 'error');
      return;
    }
    if (!formData.employeeCount || parseInt(formData.employeeCount) < 1) {
      toast('Jumlah karyawan minimal 1', 'error');
      return;
    }

    setIsSendingOTP(true);
    try {
      const { data, error } = await supabase.rpc('submit_demo_request', {
        p_name: formData.name.trim(),
        p_company_name: formData.companyName.trim(),
        p_email: formData.email.trim(),
        p_phone: formData.phone || null,
        p_employee_count: parseInt(formData.employeeCount),
        p_message: formData.demoMessage || null
      });

      if (error) throw error;
      if (!data) throw new Error('Gagal mengirim pengajuan demo');

      setMode('demo-success');
      toast('Pengajuan demo berhasil dikirim!', 'success');
    } catch (error) {
      console.error('Demo request failed:', error);
      toast(`Gagal: ${error.message}`, 'error');
    } finally {
      setIsSendingOTP(false);
    }
  };

  const handleSendOTP = async () => {
    // ── Validasi form ──────────────────────────────────
    const fieldsToValidate = [
      { name: 'name', value: formData.name },
      { name: 'email', value: formData.email },
      { name: 'regPassword', value: formData.regPassword },
      { name: 'activationCode', value: formData.activationCode },
      { name: 'confirmPassword', value: formData.confirmPassword, deps: { regPassword: formData.regPassword } },
      { name: 'acceptTerms', value: acceptTerms },
      { name: 'phone', value: formData.phone },
    ];
    if (!isTenantReg) fieldsToValidate.push({ name: 'nip', value: formData.nip, deps: { isTenantReg } });

    let hasError = false;
    const newErrors = {};
    const newTouched = {};
    fieldsToValidate.forEach(({ name, value, deps }) => {
      const err = validateField(name, value, deps);
      if (err) { newErrors[name] = err; hasError = true; }
      newTouched[name] = true;
    });

    setErrors(newErrors);
    setTouched(prev => ({ ...prev, ...newTouched }));

    if (hasError) {
      toast('Mohon lengkapi semua data dengan benar!', 'error');
      return;
    }

    setIsSendingOTP(true);
    let authUserId = null;

    try {
      // ── STEP 1: Validasi Kode Aktivasi ──────────────
      const tenant = await resolveRegistrationTenant();
      if (!tenant.id) throw new Error('Tenant tidak valid.');

      // ── STEP 2: Ambil Device ID ──────────────────────
      const deviceIdInfo = await DeviceUtil.getId();

      // ── STEP 3: Daftarkan ke Supabase Auth ────────────
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.regPassword,
        options: { data: { full_name: formData.name, nip: formData.nip } }
      });
      if (signUpError) throw signUpError;

      authUserId = data.user?.id;

      // ── STEP 4: Simpan profil ─────────────────────────
      if (data.session && data.user) {
        let insertError = null;
        try {
          await registerProfileWithCode(authUserId, deviceIdInfo.identifier);
        } catch (error) {
          insertError = error;
        }

        if (insertError) {
          await supabase.auth.signOut();
          throw insertError;
        }

        sessionStorage.setItem('bound_device_id', deviceIdInfo.identifier);
        toast('Pendaftaran berhasil! Silakan masuk.', 'success');
        setFormData(prev => ({ ...prev, identifier: formData.email, password: formData.regPassword }));
        setMode('login');
      } else {
        // Mode OTP email
        setOtpTimeLeft(300);
        setMode('verify');
      }

    } catch (error) {
      console.error('Pendaftaran gagal:', error);
      let friendlyMsg = error.message;
      if (error.message?.includes('User already registered') || error.message?.includes('already been registered')) {
        friendlyMsg = 'Email ini sudah terdaftar di sistem.\nSilakan gunakan email lain, atau klik "Masuk" jika sudah punya akun.';
      } else if (error.message?.includes('Password should be')) {
        friendlyMsg = 'Kata sandi terlalu lemah. Gunakan minimal 6 karakter.';
      } else if (error.message?.includes('Invalid email')) {
        friendlyMsg = 'Format email tidak valid. Periksa kembali email Anda.';
      }
      toast(`Pendaftaran Gagal: ${friendlyMsg}`, 'error');
    } finally {
      setIsSendingOTP(false);
    }
  };

  const handleOtpChange = (index, value) => {
    setOtpError('');
    if (!/^[0-9]*$/.test(value)) return;
    const targetIdx = Number(index);
    if (isNaN(targetIdx) || targetIdx < 0 || targetIdx >= OTP_LENGTH) return;
    const newOtp = [...otpValues];
    Reflect.set(newOtp, targetIdx, value);
    setOtpValues(newOtp);
    if (value && targetIdx < OTP_LENGTH - 1) {
      const nextInput = otpInputRefs.current.at(targetIdx + 1);
      if (nextInput) nextInput.focus();
    }
  };

  const handleVerifyAndBind = async () => {
    setIsVerifying(true);
    setOtpError('');
    try {
      const otpCode = otpValues.join('');

      const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
        email: formData.email,
        token: otpCode,
        type: 'signup'
      });

      if (verifyError) throw verifyError;

      const deviceIdInfo = await DeviceUtil.getId();
      await resolveRegistrationTenant();

      if (authData.user) {
        await registerProfileWithCode(authData.user.id, deviceIdInfo.identifier);
      }

      sessionStorage.setItem('bound_device_id', deviceIdInfo.identifier);

      toast('Pendaftaran berhasil! Silakan masuk.', 'success');
      setFormData(prev => ({ ...prev, identifier: formData.email, password: formData.regPassword }));
      setMode('login');
    } catch (e) {
      console.error("Binding failed", e);
      setOtpError(e.message.includes('Token has expired') || e.message.includes('invalid') ? 'Kode verifikasi salah atau sudah kadaluarsa.' : `Verifikasi gagal: ${e.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  // Animasi Stagger
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

    // Clear error on change if field was touched
    if (touched[name]) {
      const fieldRules = {
        name: () => validateField('name', value),
        email: () => validateField('email', value),
        phone: () => validateField('phone', value),
        nip: () => validateField('nip', value, { isTenantReg }),
        activationCode: () => validateField('activationCode', value),
        regPassword: () => validateField('regPassword', value),
        identifier: () => {},
        password: () => {},
        confirmPassword: () => validateField('confirmPassword', value, { regPassword: formData.regPassword }),
      };
      if (fieldRules[name]) {
        const err = fieldRules[name]();
        setErrors(prev => ({ ...prev, [name]: err }));
      }
    }

    // Adaptive branding lookup is handled by debounced useEffect
  };

  // Secret Owner/God Mode Trigger (Logo Clicks)
  const handleLogoClick = () => {
    setSecretClickCount(prev => prev + 1);
    if (window.navigator?.vibrate) window.navigator.vibrate(50);

    if (secretClickCount + 1 >= 3) {
      setSecretClickCount(0);
      setMode('owner');
      toast('Akses owner/SUPER_ADMIN diaktifkan.', 'info');
    }
    setTimeout(() => setSecretClickCount(0), 1000);
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      toast('Silakan masukkan email Anda terlebih dahulu.', 'error');
      return;
    }
    setIsSendingOTP(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}${window.location.pathname}#/reset-password`,
      });
      if (error) throw error;
      toast(`Instruksi reset kata sandi telah dikirim ke ${formData.email}.`, 'success');
      setMode('login');
    } catch (error) {
      console.error('Reset password failed:', error);
      toast(`Gagal: ${error.message}`, 'error');
    } finally {
      setIsSendingOTP(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${window.location.pathname}#/login`
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Google login failed:', error);
      toast(`Google Login Gagal: ${error.message}`, 'error');
    }
  };

  // Login Execution Logic
  const executeLogin = async () => {
    // ── Validasi field ─────────────────────────────────
    let identifierError = '';
    let passwordError = '';

    if (loginMethod === 'whatsapp') {
      if (!formData.identifier || formData.identifier.trim().length < 8) {
        identifierError = 'Nomor WhatsApp minimal 8 digit';
      }
    } else {
      if (!formData.identifier || formData.identifier.trim().length < 2) {
        identifierError = 'Email / ID Karyawan wajib diisi';
      }
    }
    if (!formData.password) passwordError = 'Password wajib diisi';

    if (identifierError || passwordError) {
      setErrors({
        identifier: identifierError,
        password: passwordError,
      });
      setTouched({ identifier: true, password: true });
      return;
    }

    setErrors({});

    try {
      if (!navigator.onLine) {
        throw new Error('Tidak ada koneksi internet. Periksa koneksi Anda.');
      }

      let loginEmail = formData.identifier;

      // Owner mode
      if (mode === 'owner') {
        loginEmail = 'richardpl.meha@gmail.com';
      } else if (loginMethod === 'whatsapp') {
        // Resolve phone → email
        const { data: emailData, error: rpcError } = await supabase.rpc('get_email_by_phone', { p_phone: formData.identifier });
        if (rpcError || !emailData) {
          throw new Error("Nomor WhatsApp tidak terdaftar di sistem.");
        }
        loginEmail = emailData;
      } else if (!formData.identifier.includes('@')) {
        // Resolve NIP → email
        const { data: emailData, error: rpcError } = await supabase.rpc('get_email_by_nip', { p_nip: formData.identifier });
        if (rpcError || !emailData) {
          throw new Error("ID Karyawan (NIP) tidak terdaftar di sistem.");
        }
        loginEmail = emailData;
      }

      // 1. Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: formData.password,
      });

      if (authError) throw authError;

      // 2. Fetch User Profile & Role
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_id', authData.user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!userProfile) throw new Error("Profil karyawan belum terbentuk. Hubungi tim HR/Admin Anda.");

      // 3. Check Device Binding (Karyawan Only)
      if (userProfile.role === 'EMPLOYEE') {
        let currentDevice;
        try {
          currentDevice = await DeviceUtil.getId();
        } catch {
          throw new Error('Gagal membaca identitas perangkat. Pastikan izin aplikasi diberikan.');
        }

        if (!userProfile.device_id) {
          await supabase.from('profiles').update({ device_id: currentDevice.identifier }).eq('id', userProfile.id);
          sessionStorage.setItem('bound_device_id', currentDevice.identifier);
        } else if (userProfile.device_id !== currentDevice.identifier) {
          setDeviceError(true);
          await supabase.auth.signOut();
          return;
        } else {
          sessionStorage.setItem('bound_device_id', userProfile.device_id);
        }
      }

      // 4. Route based on role
      const role = userProfile.role?.toUpperCase();
      if (role === 'SUPER_ADMIN') {
        onLogin('SUPER_ADMIN');
        navigate('/superadmin');
      } else if (role === 'TENANT_ADMIN') {
        sessionStorage.setItem('operational_access', 'MEMILIKI AKSES');
        sessionStorage.setItem('attendance_access', 'YA');
        onLogin('TENANT_ADMIN');
        navigate('/tenantadmin');
      } else if (role === 'SUB_ADMIN') {
        sessionStorage.setItem('operational_access', 'MEMILIKI AKSES');
        sessionStorage.setItem('attendance_access', 'YA');
        onLogin('SUB_ADMIN');
        navigate('/subadmin');
      } else {
        sessionStorage.setItem('attendance_access', userProfile.attendance_access ? 'YA' : 'TIDAK');
        sessionStorage.setItem('operational_access', userProfile.operational_access ? 'MEMILIKI AKSES' : 'TIDAK');
        onLogin('EMPLOYEE');
        navigate('/app');
      }
    } catch (error) {
      console.error("Login failed:", error.message);
      const isConnectionError = !navigator.onLine || error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError') || error.message?.includes('ERR_NAME_NOT_RESOLVED');
      if (isConnectionError) {
        toast(`Koneksi ke server terputus. Periksa koneksi internet atau database mungkin sedang tidur (restore di Supabase Dashboard).`, 'error');
      } else {
        let friendlyMsg = error.message;
        if (error.message === 'Invalid login credentials') {
          friendlyMsg = 'Periksa kembali kredensial Anda (email atau kata sandi salah).';
        } else if (error.message === 'Email not confirmed') {
          friendlyMsg = 'Email belum dikonfirmasi. Silakan periksa kotak masuk email Anda.';
        }
        toast(`Login Gagal: ${friendlyMsg}`, 'error');
      }
    }
  };

  // Biometric Scan Effect
  useEffect(() => {
    let interval;
    if (mode === 'owner' && biometricScan > 0 && biometricScan < 100) {
      interval = setInterval(() => {
        setBiometricScan(prev => {
          if (prev >= 100) {
            setTimeout(executeLogin, 500);
            return 100;
          }
          return prev + 5;
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [mode, biometricScan]);

  // ─── Helper: render floating input ────────────────────────────

  return (
    <div className="login-page" onMouseMove={handleMouseMove}>
      <DeveloperWatermarkBackground theme="dark" />
      <div className="login-bg-animation">
        <div className="login-grid"></div>
        <div className="login-scanline"></div>
      </div>

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

      {/* Main Glassmorphism Wrapper */}
      <div className="login-wrapper animate-fade-in">
        <div className="login-card">
          {/* Logo Area & Adaptive Branding */}
          <div className="login-header cursor-pointer" onClick={handleLogoClick}>
            <div className="login-logo-ring">
              {tenantBrand?.logo_url || localStorage.getItem('tenant_logo_url') ? (
                <img 
                  src={tenantBrand?.logo_url || localStorage.getItem('tenant_logo_url')} 
                  alt="Logo" 
                  className="w-full h-full object-contain p-2 logo-3d-spin rounded-full" 
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[var(--aurora-3)] to-[var(--aurora-1)] rounded-full flex items-center justify-center font-serif font-bold text-white text-xl shadow-[0_0_15px_rgba(0,201,255,0.4)] logo-3d-spin">
                  {getLogoInitials(tenantBrand?.name || localStorage.getItem('tenant_name') || 'SI PRESENSI')}
                </div>
              )}
            </div>
            <AnimatePresence mode="wait">
              {tenantBrand ? (
                <motion.div key="tenant" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
                  <h1 className="login-title">{tenantBrand.name}</h1>
                  <p className="login-subtitle">Portal Perusahaan</p>
                </motion.div>
              ) : mode === 'owner' ? (
                <motion.div key="owner" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                  <h1 className="login-title" style={{ background: 'linear-gradient(135deg, var(--danger) 0%, var(--warning) 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    AKUN ADMIN
                  </h1>
                  <p className="login-subtitle">Akses Super Admin</p>
                </motion.div>
              ) : (
                <motion.div key="default" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h1 className="login-title">
                    SI PRESENSI
                  </h1>
                  <p className="login-subtitle">Sistem Identitas Tunggal</p>
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
                <motion.div variants={itemVariants} className="w-full mb-8">
                  <FloatingInput
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    label="Kredensial Admin"
                    value={formData.password}
                    onChange={handleInput}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        executeLogin();
                      }
                    }}
                    error={errors.password}
                    touched={{ password: true }}
                    borderColor="border border-white/10 focus:border-[var(--danger)]"
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    }
                  />
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
                  onPointerCancel={() => setBiometricScan(0)}
                  style={{ touchAction: 'none' }}
                  animate={{ boxShadow: biometricScan > 0 ? '0 0 50px rgba(255, 0, 85, 0.4)' : '0 0 0px rgba(255, 0, 85, 0)' }}
                  className="w-32 h-32 rounded-full border-2 border-white/10 flex flex-col items-center justify-center relative group hover:border-[var(--warning)]/50 transition-all select-none"
                >
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-[var(--warning)]/20 rounded-b-full overflow-hidden"
                    style={{ height: `${biometricScan}%`, transition: 'height 0.1s linear' }}
                  >
                    <div className="w-full h-1 bg-[var(--warning)] shadow-[0_0_10px_var(--warning)]"></div>
                  </div>

                  <Fingerprint size={48} className={biometricScan > 0 ? "text-[var(--warning)]" : "text-gray-500 group-hover:text-gray-300"} />
                  <span className="text-[10px] mt-3 uppercase tracking-widest text-gray-500 group-hover:text-gray-400">Tahan untuk Pindai</span>
                </motion.button>

                <motion.button
                  variants={itemVariants}
                  onClick={() => {
                    setMode('login');
                    setFormData(prev => ({ ...prev, password: '' }));
                  }}
                  className="mt-6 text-sm text-gray-500 hover:text-white transition-colors"
                >
                  Kembali ke Login Biasa
                </motion.button>
              </motion.div>
            )}

            {/* ---- REGULAR LOGIN STATE ---- */}
            {mode === 'login' && !deviceError && (
              <motion.div key="standard-login" variants={formVariants} initial="hidden" animate="show" exit={{ opacity: 0, x: 20 }}>
                <div className="space-y-5">
                  {/* ── Method Toggle: Email / WhatsApp ── */}
                  <motion.div variants={itemVariants} className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                    <button
                      type="button"
                      onClick={() => { setLoginMethod('email'); setErrors(prev => ({ ...prev, identifier: '' })); }}
                      className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-1.5 ${loginMethod === 'email' ? 'bg-[var(--aurora-1)] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      <MessageCircle size={12} className={loginMethod === 'email' ? 'opacity-0 w-0' : ''} />
                      Email / NIP
                    </button>
                    <button
                      type="button"
                      onClick={() => { setLoginMethod('whatsapp'); setErrors(prev => ({ ...prev, identifier: '' })); }}
                      className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-1.5 ${loginMethod === 'whatsapp' ? 'bg-[#25D366] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      <MessageCircle size={12} />
                      WhatsApp
                    </button>
                  </motion.div>

                  {/* ── Identifier Field ── */}
                  <motion.div variants={itemVariants}>
                    <FloatingInput
                      name="identifier"
                      type={loginMethod === 'whatsapp' ? 'tel' : 'text'}
                      label={loginMethod === 'whatsapp' ? 'Nomor WhatsApp Aktif' : 'Email atau ID Karyawan'}
                      value={formData.identifier}
                      onChange={handleInput}
                      onBlur={() => { touchField('identifier'); validateAndSetError('identifier', formData.identifier); }}
                      error={errors.identifier}
                      touched={touched}
                      leftIcon={loginMethod === 'whatsapp' ? <MessageCircle size={16} /> : null}
                      borderColor={errors.identifier && touched.identifier ? 'border-2 border-[var(--danger)]' : 'border border-white/10 focus:border-[var(--aurora-3)]'}
                    />
                  </motion.div>

                  {/* ── Password Field ── */}
                  <motion.div variants={itemVariants}>
                    <FloatingInput
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      label="Kata Sandi"
                      value={formData.password}
                      onChange={handleInput}
                      onBlur={() => { touchField('password'); validateAndSetError('password', formData.password); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') executeLogin(); }}
                      error={errors.password}
                      touched={touched}
                      borderColor={errors.password && touched.password ? 'border-2 border-[var(--danger)]' : 'border border-white/10 focus:border-[var(--aurora-3)]'}
                      rightIcon={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-gray-500 hover:text-gray-300 transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      }
                    />
                  </motion.div>

                  <motion.div variants={itemVariants} className="flex justify-between items-center">
                    <div />
                    <button onClick={() => setMode('forgot-password')} className="text-xs text-[var(--aurora-3)] hover:text-white transition-colors">Lupa Kata Sandi?</button>
                  </motion.div>

                  {/* ── Submit Button ── */}
                  <motion.div variants={itemVariants} className={`relative rounded-xl p-[2px] mt-8 ${isLoginFormComplete ? 'running-lights-border' : ''}`}>
                    <button
                      onClick={executeLogin}
                      className={`w-full py-4 rounded-[10px] font-bold text-sm tracking-widest uppercase transition-all flex items-center justify-center gap-2 z-10 relative ${isLoginFormComplete
                        ? 'bg-[var(--bg-darker)] text-white hover:shadow-[0_0_25px_rgba(0,201,255,0.4)]'
                        : 'bg-[#1A1C23] text-gray-500 cursor-not-allowed border border-white/5'
                        }`}
                    >
                      {loginMethod === 'whatsapp' ? 'Masuk via WhatsApp' : 'Masuk Portal'} <ChevronRight size={18} />
                    </button>
                  </motion.div>

                  {/* ── Google SSO ── */}
                  <motion.div variants={itemVariants} className="mt-6 pt-6 border-t border-white/10">
                    <button 
                      onClick={handleGoogleLogin}
                      className="w-full py-3.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-3"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                      Lanjutkan dengan Google
                    </button>
                  </motion.div>
                </div>

                <motion.div variants={itemVariants} className="mt-8 text-center">
                  <p className="text-sm text-gray-400">
                    Karyawan Baru? <button onClick={() => setMode('register')} className="text-[var(--aurora-1)] font-semibold hover:text-white transition-colors">Daftar Identitas</button>
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Ingin mencoba? <button onClick={() => setMode('demo')} className="text-[var(--aurora-3)] font-semibold hover:text-white transition-colors">Minta Demo</button>
                  </p>
                </motion.div>
              </motion.div>
            )}

            {/* ---- FORGOT PASSWORD STATE ---- */}
            {mode === 'forgot-password' && (
              <motion.div key="forgot-password" variants={formVariants} initial="hidden" animate="show" exit={{ opacity: 0, x: -20 }}>
                <div className="space-y-6">
                  <motion.div variants={itemVariants} className="text-center">
                    <h2 className="text-xl font-serif text-white mb-2">Reset Kata Sandi</h2>
                    <p className="text-xs text-gray-400">Masukkan email Anda untuk menerima instruksi pemulihan.</p>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <FloatingInput
                      name="email"
                      type="email"
                      label="Email Terdaftar"
                      value={formData.email}
                      onChange={handleInput}
                      error={errors.email}
                      touched={{ email: true }}
                      borderColor="border border-white/10 focus:border-[var(--aurora-3)]"
                    />
                  </motion.div>

                  <motion.button
                    variants={itemVariants}
                    onClick={handleForgotPassword}
                    disabled={isSendingOTP}
                    className="w-full py-4 rounded-xl font-bold text-sm tracking-widest uppercase transition-all bg-[var(--aurora-3)] text-black hover:bg-[#00E5FF] shadow-[0_0_20px_rgba(0,201,255,0.3)] flex items-center justify-center gap-2"
                  >
                    {isSendingOTP ? <Loader2 size={18} className="animate-spin" /> : 'Kirim Link Reset'}
                  </motion.button>

                  <motion.div variants={itemVariants} className="text-center mt-4">
                    <button onClick={() => setMode('login')} className="text-xs text-gray-400 hover:text-white transition-colors font-medium">Kembali ke Login</button>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* ---- REGISTRATION STATE ---- */}
            {mode === 'register' && !deviceError && (
              <motion.div key="register" variants={formVariants} initial="hidden" animate="show" exit={{ opacity: 0, x: -20 }}>
                <div className="space-y-4">
                  {/* ── Role Toggle ── */}
                  <motion.div variants={itemVariants} className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                    <button type="button" onClick={() => setIsTenantReg(false)} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${!isTenantReg ? 'bg-[var(--aurora-1)] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>Karyawan</button>
                    <button type="button" onClick={() => setIsTenantReg(true)} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${isTenantReg ? 'bg-[var(--aurora-1)] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>Admin Perusahaan</button>
                  </motion.div>

                  {/* ── Nama Lengkap ── */}
                  <motion.div variants={itemVariants}>
                    <FloatingInput
                      name="name"
                      label="Nama Lengkap (KTP)"
                      value={formData.name}
                      onChange={handleInput}
                      onBlur={() => { touchField('name'); validateAndSetError('name', formData.name); }}
                      error={errors.name}
                      touched={touched}
                      borderColor={errors.name && touched.name ? 'border-2 border-[var(--danger)]' : 'border border-white/10 focus:border-[var(--aurora-1)]'}
                    />
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <FloatingInput
                      name="activationCode"
                      label={isTenantReg ? 'Kode Lisensi Tenant (Prefix: ADM-)' : 'Kode Aktivasi Karyawan (Prefix: SI-)'}
                      value={formData.activationCode}
                      onChange={handleInput}
                      onBlur={() => { touchField('activationCode'); validateAndSetError('activationCode', formData.activationCode); }}
                      error={errors.activationCode}
                      touched={touched}
                      borderColor={errors.activationCode && touched.activationCode ? 'border-2 border-[var(--danger)]' : isTenantReg ? 'border border-[var(--warning)]/30 focus:border-[var(--warning)]' : 'border border-[var(--aurora-3)]/30 focus:border-[var(--aurora-3)]'}
                    />
                  </motion.div>

                  {/* ── NIP (Karyawan only) ── */}
                  {!isTenantReg && (
                    <motion.div variants={itemVariants}>
                      <FloatingInput
                        name="nip"
                        label="ID Karyawan (NIP)"
                        value={formData.nip}
                        onChange={handleInput}
                        onBlur={() => { touchField('nip'); validateAndSetError('nip', formData.nip, { isTenantReg }); }}
                        error={errors.nip}
                        touched={touched}
                        borderColor={errors.nip && touched.nip ? 'border-2 border-[var(--danger)]' : 'border border-white/10 focus:border-[var(--aurora-1)]'}
                      />
                    </motion.div>
                  )}

                  {/* ── Nomor WhatsApp (baru) ── */}
                  <motion.div variants={itemVariants}>
                    <FloatingInput
                      name="phone"
                      type="tel"
                      label="Nomor WhatsApp Aktif"
                      value={formData.phone}
                      onChange={handleInput}
                      onBlur={() => { touchField('phone'); validateAndSetError('phone', formData.phone); }}
                      error={errors.phone}
                      touched={touched}
                      leftIcon={<MessageCircle size={16} />}
                      borderColor={errors.phone && touched.phone ? 'border-2 border-[var(--danger)]' : 'border border-white/10 focus:border-[var(--aurora-1)]'}
                    />
                  </motion.div>

                  {/* ── Email ── */}
                  <motion.div variants={itemVariants}>
                    <FloatingInput
                      name="email"
                      type="email"
                      label="Email Aktif"
                      value={formData.email}
                      onChange={handleInput}
                      onBlur={() => { touchField('email'); validateAndSetError('email', formData.email); }}
                      error={errors.email}
                      touched={touched}
                      borderColor={errors.email && touched.email ? 'border-2 border-[var(--danger)]' : 'border border-white/10 focus:border-[var(--aurora-1)]'}
                    />
                  </motion.div>

                  {/* ── Password ── */}
                  <motion.div variants={itemVariants}>
                    <FloatingInput
                      name="regPassword"
                      type={showRegPassword ? 'text' : 'password'}
                      label="Buat Kata Sandi"
                      value={formData.regPassword}
                      onChange={handleInput}
                      onBlur={() => { touchField('regPassword'); validateAndSetError('regPassword', formData.regPassword); }}
                      error={errors.regPassword}
                      touched={touched}
                      borderColor={errors.regPassword && touched.regPassword ? 'border-2 border-[var(--danger)]' : 'border border-white/10 focus:border-[var(--aurora-1)]'}
                      rightIcon={
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="text-gray-500 hover:text-gray-300 transition-colors"
                        >
                          {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      }
                    />
                  </motion.div>

                  {/* ── Konfirmasi Password ── */}
                  <motion.div variants={itemVariants}>
                    <FloatingInput
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      label="Ulangi Kata Sandi"
                      value={formData.confirmPassword}
                      onChange={handleInput}
                      onBlur={() => { touchField('confirmPassword'); validateAndSetError('confirmPassword', formData.confirmPassword, { regPassword: formData.regPassword }); }}
                      error={errors.confirmPassword}
                      touched={touched}
                      borderColor={errors.confirmPassword && touched.confirmPassword ? 'border-2 border-[var(--danger)]' : 'border border-white/10 focus:border-[var(--aurora-1)]'}
                      rightIcon={
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="text-gray-500 hover:text-gray-300 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      }
                    />
                  </motion.div>

                  {/* ── Terms & Conditions (baru) ── */}
                  <motion.div variants={itemVariants}>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptTerms}
                        onChange={(e) => {
                          setAcceptTerms(e.target.checked);
                          if (touched.acceptTerms) {
                            setErrors(prev => ({ ...prev, acceptTerms: e.target.checked ? '' : 'Anda harus menyetujui syarat & ketentuan' }));
                          }
                        }}
                        onBlur={() => {
                          touchField('acceptTerms');
                          setErrors(prev => ({ ...prev, acceptTerms: acceptTerms ? '' : 'Anda harus menyetujui syarat & ketentuan' }));
                        }}
                        className={`mt-0.5 w-4 h-4 rounded border-white/20 bg-navy-800 text-[var(--aurora-1)] focus:ring-[var(--aurora-1)]/50 ${errors.acceptTerms && touched.acceptTerms ? 'border-2 border-[var(--danger)]' : ''}`}
                      />
                      <span className="text-xs text-gray-400">
                        Saya menyetujui{' '}
                        <button type="button" className="text-[var(--aurora-3)] hover:text-white transition-colors font-medium">syarat & ketentuan</button>
                        {' '}yang berlaku
                      </span>
                    </label>
                    {errors.acceptTerms && touched.acceptTerms && (
                      <p className="text-[var(--danger)] text-[10px] mt-1 ml-1 font-medium">{errors.acceptTerms}</p>
                    )}
                  </motion.div>

                  {/* ── Submit ── */}
                  <motion.button
                    variants={itemVariants}
                    onClick={handleSendOTP}
                    disabled={isSendingOTP}
                    className="w-full mt-4 py-4 rounded-xl font-bold text-sm tracking-widest uppercase transition-all bg-[var(--aurora-1)] text-white hover:bg-[#A343F0] shadow-[0_0_20px_rgba(142,45,226,0.4)] flex items-center justify-center gap-2"
                  >
                    {isSendingOTP ? <Loader2 size={18} className="animate-spin" /> : isTenantReg ? 'Aktivasi Admin Tenant' : 'Kirim Kode Verifikasi'}
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

                <motion.div variants={itemVariants} className={`flex ${OTP_LENGTH > 6 ? 'gap-1.5' : 'gap-3'} justify-center mb-8`}>
                  {otpValues.map((val, i) => (
                    <input
                      key={i}
                      type="text"
                      maxLength="1"
                      value={val}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      ref={el => { if (otpInputRefs.current) Reflect.set(otpInputRefs.current, i, el); }}
                      className={`${OTP_LENGTH > 6 ? 'w-8 h-10 text-base' : 'w-10 h-12 text-lg'} text-center bg-[#1A1C23] border border-white/10 rounded-lg text-white font-bold focus:border-[var(--aurora-3)] outline-none transition-all shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]`}
                    />
                  ))}
                </motion.div>

                <AnimatePresence>
                  {otpError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                      className="text-[var(--danger)] text-xs font-bold mb-6 text-center bg-[var(--danger)]/10 border border-[var(--danger)]/20 px-4 py-3 rounded-xl"
                    >
                      {otpError}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  variants={itemVariants}
                  onClick={handleVerifyAndBind}
                  disabled={isVerifying || otpTimeLeft === 0 || otpValues.join('').length < OTP_LENGTH}
                  className="w-full py-4 rounded-xl font-bold text-sm tracking-widest uppercase transition-all bg-[var(--bg-dark)] border border-white/20 text-white hover:bg-white/10 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isVerifying ? <Loader2 size={18} className="animate-spin text-[var(--aurora-3)]" /> : 'Konfirmasi & Ikat Perangkat'}
                </motion.button>

                <motion.button variants={itemVariants} onClick={() => setMode('register')} className="mt-6 text-sm text-gray-500 hover:text-white transition-colors">Kembali</motion.button>
              </motion.div>
            )}

            {/* ---- DEMO REQUEST FORM ---- */}
            {mode === 'demo' && !deviceError && (
              <motion.div key="demo" variants={formVariants} initial="hidden" animate="show" exit={{ opacity: 0, x: -20 }}>
                <div className="space-y-4">
                  <motion.div variants={itemVariants} className="text-center mb-2">
                    <h2 className="text-xl font-serif text-white mb-1">Minta Demo</h2>
                    <p className="text-xs text-gray-400">Isi data perusahaan Anda, tim kami akan menghubungi Anda dalam 1x24 jam.</p>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <FloatingInput
                      name="name"
                      label="Nama Lengkap"
                      value={formData.name}
                      onChange={handleInput}
                      error={errors.name}
                      touched={touched}
                      borderColor={errors.name && touched.name ? 'border-2 border-[var(--danger)]' : 'border border-white/10 focus:border-[var(--aurora-3)]'}
                    />
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <FloatingInput
                      name="companyName"
                      label="Nama Perusahaan / Instansi"
                      value={formData.companyName}
                      onChange={handleInput}
                      borderColor="border border-white/10 focus:border-[var(--aurora-3)]"
                    />
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <FloatingInput
                      name="email"
                      type="email"
                      label="Email Aktif"
                      value={formData.email}
                      onChange={handleInput}
                      error={errors.email}
                      touched={touched}
                      borderColor={errors.email && touched.email ? 'border-2 border-[var(--danger)]' : 'border border-white/10 focus:border-[var(--aurora-3)]'}
                    />
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <FloatingInput
                      name="phone"
                      type="tel"
                      label="Nomor WhatsApp (opsional)"
                      value={formData.phone}
                      onChange={handleInput}
                      leftIcon={<MessageCircle size={16} />}
                      borderColor="border border-white/10 focus:border-[var(--aurora-3)]"
                    />
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <FloatingInput
                      name="employeeCount"
                      type="number"
                      label="Jumlah Karyawan"
                      value={formData.employeeCount}
                      onChange={handleInput}
                      borderColor="border border-white/10 focus:border-[var(--aurora-3)]"
                    />
                  </motion.div>

                  <motion.div variants={itemVariants} className="flex flex-col gap-1.5">
                    <label className="text-[9px] text-gray-500 uppercase tracking-widest font-black ml-1">Pesan Tambahan (opsional)</label>
                    <textarea
                      name="demoMessage"
                      value={formData.demoMessage}
                      onChange={handleInput}
                      placeholder="Tulis pesan atau kebutuhan Anda..."
                      className="w-full h-24 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-gray-600 focus:border-[var(--aurora-3)] focus:ring-2 focus:ring-[var(--aurora-3)]/25 resize-none"
                    />
                  </motion.div>

                  <motion.button
                    variants={itemVariants}
                    onClick={handleSubmitDemoRequest}
                    disabled={isSendingOTP}
                    className="w-full mt-4 py-4 rounded-xl font-bold text-sm tracking-widest uppercase transition-all bg-[var(--aurora-3)] text-black hover:bg-[#00E5FF] shadow-[0_0_20px_rgba(0,201,255,0.3)] flex items-center justify-center gap-2"
                  >
                    {isSendingOTP ? <Loader2 size={18} className="animate-spin" /> : 'Kirim Pengajuan Demo'}
                  </motion.button>
                </div>
                <motion.div variants={itemVariants} className="mt-8 text-center">
                  <p className="text-sm text-gray-400">
                    Sudah punya akun? <button onClick={() => setMode('login')} className="text-[var(--aurora-1)] font-semibold hover:text-white transition-colors">Masuk</button>
                  </p>
                </motion.div>
              </motion.div>
            )}

            {/* ---- DEMO SUCCESS STATE ---- */}
            {mode === 'demo-success' && (
              <motion.div key="demo-success" variants={formVariants} initial="hidden" animate="show" className="flex flex-col items-center">
                <motion.div variants={itemVariants} className="w-20 h-20 rounded-full bg-[var(--success)]/20 flex items-center justify-center mb-6 relative">
                  <div className="absolute inset-0 border border-[var(--success)] rounded-full animate-ping opacity-50"></div>
                  <CheckCircle2 size={40} className="text-[var(--success)]" />
                </motion.div>
                <motion.h2 variants={itemVariants} className="text-xl font-serif text-white mb-2">Pengajuan Demo Terkirim!</motion.h2>
                <motion.p variants={itemVariants} className="text-sm text-gray-400 mb-8 text-center leading-relaxed">
                  Terima kasih, <span className="text-white font-semibold">{formData.name}</span>!
                  <br />
                  Tim SI PRESENSI akan menghubungi Anda di <span className="text-[var(--aurora-3)]">{formData.email}</span> dalam 1x24 jam untuk memberikan akses demo.
                </motion.p>
                <motion.button
                  variants={itemVariants}
                  onClick={() => { setMode('login'); setFormData(prev => ({ ...prev, name: '', companyName: '', email: '', phone: '', employeeCount: '10', demoMessage: '' })); }}
                  className="w-full py-4 rounded-xl font-bold text-sm tracking-widest uppercase transition-all bg-[var(--aurora-1)] text-white hover:bg-[#A343F0] shadow-[0_0_20px_rgba(142,45,226,0.4)]"
                >
                  Kembali ke Login
                </motion.button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* Cursive Signature Watermark */}
      <div className="absolute bottom-4 left-0 right-0 z-10 pointer-events-none flex justify-center">
        <DeveloperWatermark />
      </div>
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
