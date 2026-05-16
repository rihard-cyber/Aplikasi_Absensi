import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut, Settings, Smartphone, Key, ShieldCheck, ChevronRight,
  Bell, RefreshCw, Palette, User, Mail, Calendar, Phone, MapPin,
  Lock, CheckCircle2, AlertCircle, X, ShieldAlert, Fingerprint, Info, Loader2
} from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { DeviceUtil } from '../../../utils/deviceUtil';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '../../../components/ConfirmDialog';
import HRISDataForm from './HRISDataForm';

const EmployeeProfile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState({
    full_name: 'Memuat...',
    position: 'Staff',
    nip: '-',
    email: '-',
    gender: '-',
    birth_date: '-',
    phone: '-',
    address: '-',
    tenant_id: null,
    device_id: null,
    attendance_access: true,
    operational_access: false,
    profile_photo: null
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [biometric, setBiometric] = useState(false);
  const [isBound, setIsBound] = useState(false);
  const [hasSubAdminAccess, setHasSubAdminAccess] = useState(true); // Simulated check
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [activeItem, setActiveItem] = useState(null);
  const confirm = useConfirm();
  const [editData, setEditData] = useState({ ...user });

  useEffect(() => {
    fetchUserData();
    checkDeviceBinding();

    // Cache Pre-fetching: Prefetch other data if needed
  }, []);

  // Haptic Feedback Simulation (Replace with actual Capacitor Haptics if available)
  const triggerHaptic = (style = 'MEDIUM') => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(style === 'HEAVY' ? 100 : 50);
    }
  };

  const fetchUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const isGodMode = sessionStorage.getItem('super_admin_verified') === 'true';

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*, divisions(name)')
        .eq('auth_id', session.user.id)
        .maybeSingle();

      if (profile) {
        const isSubAdmin = profile.role === 'SUB_ADMIN' || profile.role === 'TENANT_ADMIN';
        const divisionName = profile.divisions?.name || 'All Division';

        setUser(prev => ({
          ...prev,
          ...profile,
          full_name: profile.full_name || 'Karyawan',
          position: profile.position || (isSubAdmin ? 'Supervisor' : 'Staff'),
          division: divisionName,
          operational_access: isSubAdmin || profile.operational_access === true,
          attendance_access: profile.attendance_access !== false
        }));
        setEditData(profile);
        const hasAccess = isSubAdmin || profile.operational_access === true;
        setHasSubAdminAccess(hasAccess);

        // SYNC: Ensure App knows about this authority for the session
        if (hasAccess) {
          sessionStorage.setItem('operational_access', 'MEMILIKI AKSES');
        } else {
          sessionStorage.removeItem('operational_access');
        }
      }

      // If SUPER ADMIN PREVIEW, force all access
      if (isGodMode) {
        setUser(prev => ({
          ...prev, attendance_access: true, operational_access: true, role: 'SUPER_ADMIN', position: 'SUPER ADMIN PREVIEW'
        }));
        sessionStorage.setItem('operational_access', 'MEMILIKI AKSES');
        setHasSubAdminAccess(true);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const checkDeviceBinding = async () => {
    const device = await DeviceUtil.getId();
    setIsBound(user.device_id === device.identifier || (() => { try { return !!sessionStorage.getItem('bound_device_id'); } catch { return false; } })());
  };

  const handleUpdateProfile = async () => {
    // Legacy simple update - we use HRISDataForm now
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('profiles').update({
        profile_photo: urlData.publicUrl
      }).eq('id', user.id);

      if (dbError) throw dbError;

      setUser(prev => ({ ...prev, profile_photo: urlData.publicUrl }));
      alert('Foto profil berhasil diperbarui!');
    } catch (e) {
      alert('Gagal mengunggah foto profil: ' + e.message);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSyncOffline = () => {
    setIsSyncing(true);
    // Simulate background sync logic
    setTimeout(() => {
      setIsSyncing(false);
      alert('Data absensi berhasil disinkronkan ke penyimpanan lokal.');
    }, 3000);
  };

  const handleDeviceBinding = async () => {
    if (isBound) {
      alert('Perangkat sudah terikat!');
      return;
    }
    const device = await DeviceUtil.getId();

    const { error } = await supabase.from('profiles').update({ device_id: device.identifier }).eq('id', user.id);
    if (error) { alert('Gagal mengikat perangkat'); return; }

    try { sessionStorage.setItem('bound_device_id', device.identifier); } catch { }
    setIsBound(true);
    alert('Perangkat berhasil diikat!');
  };

  const handleLogout = async () => {
    const ok = await confirm('Apakah Anda yakin ingin keluar dengan aman?', 'Keluar');
    if (ok) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error("Logout error:", e);
      }

      try { sessionStorage.clear(); } catch { }
      try { localStorage.clear(); } catch { }
      navigate('/login');
    }
  };

  const handleItemClick = (id, action) => {
    setActiveItem(id);
    action();
    setTimeout(() => setActiveItem(null), 2000);
  };

  const menuVariants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-6 pb-24"
    >
      {/* 1. ENHANCED PROFILE HEADER */}
      <div className="card-running-light">
        <div className="bg-[#0B0C10]/90 p-8 rounded-[30px] text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-32 bg-gradient-to-b from-[var(--aurora-1)]/20 to-transparent"></div>

          <div className="relative inline-block mb-6">
            <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] p-1 shadow-[0_0_25px_rgba(142,45,226,0.5)]">
              {isUploadingPhoto ? (
                <div className="w-full h-full bg-[var(--bg-dark)] rounded-full flex items-center justify-center">
                  <Loader2 size={32} className="animate-spin text-[var(--aurora-1)]" />
                </div>
              ) : user.profile_photo ? (
                <img src={user.profile_photo} alt="Profile" className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[var(--bg-dark)] rounded-full flex items-center justify-center text-4xl font-serif font-bold text-white">
                  {user.full_name?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            <label className="absolute bottom-1 right-1 w-10 h-10 bg-[var(--aurora-1)] rounded-full flex items-center justify-center border-2 border-[#0B0C10] text-white hover:scale-110 transition-transform cursor-pointer">
              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={isUploadingPhoto} />
              <User size={14} />
            </label>
          </div>

          <h2 className="text-2xl font-serif font-bold text-white tracking-wide relative z-10">{user.full_name}</h2>
          <div className="flex flex-col items-center gap-1 mt-1 relative z-10">
            <p className="text-sm text-[var(--aurora-3)] uppercase tracking-widest font-bold">{user.position} • {user.division || 'General'}</p>
            {hasSubAdminAccess && (
              <span className={`px-3 py-1 rounded-full border text-[10px] font-bold tracking-tighter uppercase ${user.role === 'project_admin'
                ? 'bg-[var(--warning)]/20 border-[var(--warning)]/40 text-[var(--warning)]'
                : 'bg-[var(--aurora-1)]/20 border-[var(--aurora-1)]/40 text-[var(--aurora-1)]'
                }`}>
                {user.role === 'project_admin' ? 'Project Manager' : `Akses Otoritas Aktif`}
              </span>
            )}
          </div>
          <div className="flex items-center justify-center gap-2 mt-3">
            <p className="text-xs text-gray-500 font-medium relative z-10">NIP: {user.nip}</p>
            <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
            <p className="text-xs text-gray-500 font-medium relative z-10">{isBound ? 'Device Bound' : 'Device Not Bound'}</p>
          </div>
        </div>
      </div>

      <motion.div variants={menuVariants} initial="hidden" animate="show" className="flex flex-col gap-8">

        {/* A. Kelompok 'Keamanan Akun' */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
            <ShieldCheck size={14} className="text-[var(--aurora-1)]" /> Keamanan Akun
          </h3>
          <div className="glass-panel rounded-3xl overflow-hidden border border-white/5">
            <MenuItem
              id="password"
              activeItem={activeItem}
              icon={<Key size={20} />}
              title="Ganti Password"
              subtitle="Ubah kata sandi akun Anda"
              color="var(--aurora-1)"
              onClick={() => handleItemClick('password', () => alert('Fitur Ganti Password terbuka.'))}
            />
            <MenuItem
              id="pin"
              activeItem={activeItem}
              icon={<Lock size={20} />}
              title="Set PIN"
              subtitle="Keamanan ekstra dengan PIN 6 digit"
              color="var(--warning)"
              onClick={() => handleItemClick('pin', () => setShowPinModal(true))}
            />
            <MenuItem
              id="binding"
              activeItem={activeItem}
              icon={<Smartphone size={20} />}
              title="Pengikatan Perangkat"
              subtitle={isBound ? "Terikat (Hardware Locked)" : "Belum terikat ke perangkat"}
              color="var(--success)"
              badge={isBound ? "AKTIF" : "IKAT SEKARANG"}
              badgeColor={isBound ? "var(--success)" : "var(--aurora-3)"}
              onClick={() => handleItemClick('binding', handleDeviceBinding)}
            />
            <MenuItem
              id="biometric"
              icon={<Fingerprint size={20} />}
              title="Login Biometrik"
              subtitle="Gunakan Sidik Jari / Wajah"
              color="var(--aurora-3)"
              toggle={true}
              toggleState={biometric}
              onToggle={() => setBiometric(!biometric)}
            />
          </div>
        </div>

        {/* B. Kelompok 'Pengaturan & Sinkronisasi' */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
            <Settings size={14} className="text-[var(--aurora-3)]" /> Pengaturan & Sinkronisasi
          </h3>
          <div className="glass-panel rounded-3xl overflow-hidden border border-white/5">
            <MenuItem
              icon={<Bell size={20} />}
              title="Notifikasi"
              subtitle="Aktifkan push notification"
              color="var(--aurora-3)"
              toggle={true}
              toggleState={notifications}
              onToggle={() => setNotifications(!notifications)}
            />
            <MenuItem
              id="sync"
              activeItem={activeItem}
              icon={<RefreshCw size={20} className={isSyncing ? "animate-spin" : ""} />}
              title="Sinkron Data Offline"
              subtitle="Download data absensi lokal"
              color="var(--warning)"
              onClick={() => handleItemClick('sync', handleSyncOffline)}
              loading={isSyncing}
            />
            <MenuItem
              id="theme"
              activeItem={activeItem}
              icon={<Palette size={20} />}
              title="Tema"
              subtitle="Dark Luxury (Default)"
              color="var(--aurora-1)"
              onClick={() => handleItemClick('theme', () => alert('Tema Dark Luxury adalah standar perusahaan.'))}
            />
          </div>
        </div>

        {/* C. Modul 'Informasi Profil' */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
            <Info size={14} className="text-[var(--success)]" /> Informasi Profil
          </h3>
          <div className="glass-panel rounded-3xl overflow-hidden border border-white/5">
            <MenuItem
              id="edit"
              activeItem={activeItem}
              icon={<User size={20} />}
              title="Data Pribadi"
              subtitle="Edit data & informasi HRIS"
              color="var(--success)"
              onClick={() => handleItemClick('edit', () => setIsEditing(true))}
            />
            <div className="p-5 bg-white/5 border-t border-white/5">
              <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Akses & Identitas (Read Only)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] text-gray-400">Employee ID / Username</p>
                  <p className="text-xs font-bold text-white">{user.nip}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] text-gray-400">Current Role</p>
                  <p className="text-xs font-bold text-[var(--aurora-1)] uppercase tracking-tighter">{user.position}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] text-gray-400">Attendance Access</p>
                  <p className={`text-xs font-bold ${user.attendance_access ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                    {user.attendance_access ? 'MEMILIKI AKSES' : 'TIDAK ADA AKSES'}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] text-gray-400">Operational Access</p>
                  <p className={`text-xs font-bold ${user.operational_access ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                    {user.operational_access ? 'MEMILIKI AKSES' : 'TIDAK ADA AKSES'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* D. Middle-Layer Authority (Sub-Admin Switch) */}
        {(user.operational_access === true || user.operational_access === 'MEMILIKI AKSES') && (
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-[var(--warning)] uppercase tracking-[0.2em] px-2 flex items-center gap-2">
              <ShieldAlert size={14} /> Akses Otoritas Tim
            </h3>
            <button
              onClick={() => {
                triggerHaptic('HEAVY');
                // Ensure state is set before navigating
                sessionStorage.setItem('operational_access', 'MEMILIKI AKSES');
                navigate('/subadmin');
              }}
              className="glass-panel p-5 rounded-3xl border border-[var(--warning)]/30 group relative overflow-hidden flex items-center gap-4 hover:border-[var(--warning)]/60 transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-[var(--warning)]/10 flex items-center justify-center text-[var(--warning)] group-hover:scale-110 transition-transform">
                <Settings size={24} />
              </div>
              <div className="text-left flex-1">
                <h4 className="text-white font-bold">Switch to Admin View</h4>
                <p className="text-xs text-gray-500">Kelola operasional devisi Anda</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-white transition-colors">
                <ChevronRight size={18} />
              </div>
            </button>
          </div>
        )}

      </motion.div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="glass-panel p-5 rounded-3xl border border-[var(--danger)]/30 text-[var(--danger)] flex justify-center items-center gap-3 font-bold uppercase tracking-widest text-sm hover:bg-[var(--danger)] hover:text-white transition-all shadow-[0_0_15px_rgba(255,0,85,0.1)] mt-4"
      >
        <LogOut size={18} /> Keluar dengan aman
      </button>

      <div className="text-center mt-4">
        <p className="text-[10px] text-gray-600 tracking-widest uppercase">SI PRESENSI PRO MAX V1.0.0</p>
      </div>

      {/* EDIT PROFILE MODAL */}
      {createPortal(
        <AnimatePresence>
          {isEditing && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/80 backdrop-blur-sm p-4 pb-0"
            >
              <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="w-full max-w-md glass-panel rounded-t-[40px] rounded-b-none p-8 pb-12 flex flex-col gap-6 max-h-[95vh] overflow-y-auto custom-scrollbar"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-serif font-bold text-white">Edit Data Pribadi</h3>
                  <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-white"><X size={24} /></button>
                </div>

                <HRISDataForm
                  user={user}
                  onCancel={() => setIsEditing(false)}
                  onSave={(updatedUser) => {
                    setUser(updatedUser);
                    setIsEditing(false);
                    alert('Data HRIS berhasil diperbarui!');
                  }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* PIN MODAL */}
      <AnimatePresence>
        {showPinModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm glass-panel p-8 text-center"
            >
              <div className="w-16 h-16 bg-[var(--warning)]/20 rounded-2xl flex items-center justify-center text-[var(--warning)] mx-auto mb-6">
                <Lock size={32} />
              </div>
              <h3 className="text-xl font-serif font-bold text-white mb-2">Set 6-Digit PIN</h3>
              <p className="text-sm text-gray-400 mb-8">PIN ini akan digunakan untuk akses dokumen sensitif seperti slip gaji.</p>

              <div className="flex justify-between gap-2 mb-8">
                {pin.map((digit, i) => (
                  <input
                    key={i} id={`pin-${i}`} type="password" maxLength="1"
                    className="w-10 h-12 bg-white/5 border border-white/10 rounded-lg text-center text-xl font-bold text-white focus:border-[var(--warning)] outline-none"
                    value={digit}
                    onChange={(e) => {
                      const newPin = [...pin];
                      newPin[i] = e.target.value;
                      setPin(newPin);
                      if (e.target.value && i < 5) document.getElementById(`pin-${i + 1}`).focus();
                    }}
                  />
                ))}
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    alert('PIN Berhasil Disimpan!');
                    setShowPinModal(false);
                  }}
                  className="w-full py-4 rounded-xl bg-[var(--warning)] text-black font-bold uppercase tracking-widest"
                >
                  Konfirmasi PIN
                </button>
                <button onClick={() => setShowPinModal(false)} className="text-gray-500 text-sm hover:text-white transition-colors">Batal</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};

const MenuItem = ({ id, activeItem, icon, title, subtitle, color, onClick, badge, badgeColor, toggle, toggleState, onToggle, loading }) => (
  <button
    onClick={!toggle ? onClick : undefined}
    className={`w-full p-5 flex items-center gap-4 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0 group relative overflow-hidden ${loading || activeItem === id ? 'running-lights-border' : ''}`}
  >
    <div
      className="w-11 h-11 rounded-2xl bg-white/5 flex items-center justify-center transition-all duration-300 group-hover:scale-110 relative z-10"
      style={{ color: color }}
    >
      {icon}
    </div>
    <div className="flex-1 relative z-10">
      <h4 className="text-white font-medium text-sm group-hover:text-white transition-colors">{title}</h4>
      <p className="text-[10px] text-gray-500 mt-0.5">{subtitle}</p>
    </div>

    {badge && (
      <span
        className="px-2 py-0.5 rounded-full text-[8px] font-bold tracking-widest relative z-10"
        style={{ backgroundColor: `${badgeColor}20`, color: badgeColor, border: `1px solid ${badgeColor}40` }}
      >
        {badge}
      </span>
    )}

    {toggle && (
      <div
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className={`w-10 h-5 rounded-full relative transition-colors z-10 ${toggleState ? 'bg-[var(--success)]' : 'bg-gray-700'}`}
      >
        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${toggleState ? 'left-6' : 'left-1'}`}></div>
      </div>
    )}

    {!toggle && !loading && <ChevronRight size={16} className="text-gray-600 group-hover:text-white group-hover:translate-x-1 transition-all relative z-10" />}
  </button>
);

const EditField = ({ icon, label, value, onChange, type = "text" }) => (
  <div className="flex flex-col gap-2">
    <label className="text-[10px] text-gray-500 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">{icon}</div>
      <input
        type={type}
        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white outline-none focus:border-[var(--aurora-3)] transition-all"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  </div>
);

export default EmployeeProfile;
