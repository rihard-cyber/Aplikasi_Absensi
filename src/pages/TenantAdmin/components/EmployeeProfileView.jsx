import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, User, Briefcase, Calendar, Clock, DollarSign, FileText, ShieldCheck, Package, Star, ClipboardCheck, ChevronRight, Loader2, Phone, Mail, MapPin } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';

const TABS = [
  { id: 'profile', label: 'Profil', icon: <User size={14} /> },
  { id: 'salary', label: 'Gaji', icon: <DollarSign size={14} /> },
  { id: 'attendance', label: 'Absensi', icon: <Clock size={14} /> },
  { id: 'assets', label: 'Aset', icon: <Package size={14} /> },
  { id: 'reviews', label: 'Kinerja', icon: <Star size={14} /> },
  { id: 'onboarding', label: 'Onboarding', icon: <ClipboardCheck size={14} /> },
];

const EmployeeProfileView = () => {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState(null);
  const [employeeSalaries, setEmployeeSalaries] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [assetsData, setAssetsData] = useState([]);
  const [reviewsData, setReviewsData] = useState([]);
  const [onboardingData, setOnboardingData] = useState([]);
  const [tenantId, setTenantId] = useState(null);

  useEffect(() => { fetchEmployees(); }, []);

  const fetchEmployees = async () => {
    const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: p } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!p?.tenant_id && !isGod) return;
    if (p?.tenant_id) setTenantId(p.tenant_id);
    let q = supabase.from('profiles').select('id, full_name, nip, position, role, project_id, division_id, profiles!project_id(name)');
    if (p?.tenant_id) q = q.eq('tenant_id', p.tenant_id);
    q = q.in('role', ['EMPLOYEE', 'SUB_ADMIN']);
    const { data: e } = await q;
    if (e) setEmployees(e);
  };

  const selectEmployee = async (id) => {
    setSelectedId(id);
    setActiveTab('profile');
    let profileQuery = supabase.from('profiles').select('*, projects(name), divisions(name), employee_hris_data(*)').eq('id', id);
    if (tenantId) profileQuery = profileQuery.eq('tenant_id', tenantId);
    const { data: p } = await profileQuery.single();
    if (p) setProfileData(p);

    let salaryQuery = supabase.from('employee_salaries').select('amount, salary_components!inner(code, name, type)').eq('user_id', id);
    if (tenantId) salaryQuery = salaryQuery.eq('tenant_id', tenantId);
    const { data: s } = await salaryQuery;
    if (s) setEmployeeSalaries(s || []);

    let attendanceQuery = supabase.from('attendance_logs').select('action, status, timestamp').eq('user_id', id);
    if (tenantId) attendanceQuery = attendanceQuery.eq('tenant_id', tenantId);
    const { data: a } = await attendanceQuery.order('timestamp', { ascending: false }).limit(20);
    if (a) setAttendanceData(a || []);

    let assetQuery = supabase.from('company_assets').select('*').eq('assigned_to', id);
    if (tenantId) assetQuery = assetQuery.eq('tenant_id', tenantId);
    const { data: as } = await assetQuery;
    if (as) setAssetsData(as || []);

    let reviewQuery = supabase.from('performance_reviews').select('*, reviewers!reviewer_id(full_name)').eq('user_id', id);
    if (tenantId) reviewQuery = reviewQuery.eq('tenant_id', tenantId);
    const { data: r } = await reviewQuery.order('created_at', { ascending: false });
    if (r) setReviewsData(r || []);

    let onboardingQuery = supabase.from('onboarding_tasks').select('*').eq('user_id', id);
    if (tenantId) onboardingQuery = onboardingQuery.eq('tenant_id', tenantId);
    const { data: o } = await onboardingQuery.order('created_at');
    if (o) setOnboardingData(o || []);
  };

  const filtered = employees.filter(e =>
    e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.nip?.toLowerCase().includes(search.toLowerCase()) ||
    e.position?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="glass-panel p-8">
      <div className="border-b border-white/10 pb-6 mb-8">
        <h2 className="text-2xl font-serif font-bold text-white">Profil Karyawan (360°)</h2>
        <p className="text-sm text-gray-400 mt-1">Lihat semua data karyawan dalam satu halaman</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari karyawan..." className="w-full bg-[#1A1C23] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white text-xs outline-none focus:border-[var(--aurora-3)]" />
          </div>
          <div className="space-y-1 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
            {filtered.map(e => (
              <button key={e.id} onClick={() => selectEmployee(e.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${selectedId === e.id ? 'bg-white/10 border-[var(--aurora-3)]/30' : 'bg-white/5 border-white/10 hover:border-white/20'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center text-xs font-bold text-white">{e.full_name?.charAt(0)}</div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{e.full_name}</p>
                    <p className="text-[9px] text-gray-500 truncate">{e.nip} • {e.position || '-'}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3">
          {selectedId && profileData ? (
            <>
              <div className="flex items-center gap-4 mb-6 p-5 bg-white/5 rounded-2xl border border-white/10">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center text-xl font-bold text-white">{profileData.full_name?.charAt(0)}</div>
                <div>
                  <h3 className="text-lg font-bold text-white">{profileData.full_name}</h3>
                  <p className="text-xs text-gray-400">{profileData.position || 'Staff'} • {profileData.nip} • {profileData.role}</p>
                  <p className="text-[10px] text-gray-500">{profileData.projects?.name} • {profileData.divisions?.name}</p>
                </div>
              </div>

              <div className="flex gap-1 mb-6 bg-white/5 p-1 rounded-xl overflow-x-auto">
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white' : 'text-gray-500 hover:text-white'}`}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {activeTab === 'profile' && (
                  <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: 'Email', value: profileData.email, icon: <Mail size={12} /> },
                      { label: 'No. HP', value: profileData.employee_hris_data?.mobile_phone || '-', icon: <Phone size={12} /> },
                      { label: 'Alamat', value: profileData.employee_hris_data?.ktp_address || '-', icon: <MapPin size={12} /> },
                      { label: 'NIP', value: profileData.nip, icon: <User size={12} /> },
                      { label: 'Posisi', value: profileData.position || '-', icon: <Briefcase size={12} /> },
                      { label: 'Role', value: profileData.role, icon: <ShieldCheck size={12} /> },
                      { label: 'Tgl Lahir', value: profileData.birth_date ? new Date(profileData.birth_date).toLocaleDateString('id-ID') : '-', icon: <Calendar size={12} /> },
                      { label: 'Gender', value: profileData.gender || '-', icon: <User size={12} /> },
                    ].map((f, i) => (
                      <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/5">
                        <p className="text-[9px] text-gray-500 uppercase tracking-widest flex items-center gap-1 mb-1">{f.icon} {f.label}</p>
                        <p className="text-sm font-bold text-white">{f.value}</p>
                      </div>
                    ))}
                  </motion.div>
                )}

                {activeTab === 'salary' && (
                  <motion.div key="salary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                    {employeeSalaries.filter(s => s.salary_components?.type === 'ALLOWANCE').map(s => (
                      <div key={s.id} className="flex justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                        <span className="text-xs text-gray-300">{s.salary_components?.code} — {s.salary_components?.name}</span>
                        <span className="text-xs font-bold font-mono text-[var(--success)]">Rp {Number(s.amount).toLocaleString()}</span>
                      </div>
                    ))}
                    {employeeSalaries.filter(s => s.salary_components?.type === 'DEDUCTION').map(s => (
                      <div key={s.id} className="flex justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                        <span className="text-xs text-gray-300">{s.salary_components?.code} — {s.salary_components?.name}</span>
                        <span className="text-xs font-bold font-mono text-[var(--danger)]">Rp {Number(s.amount).toLocaleString()}</span>
                      </div>
                    ))}
                    {!employeeSalaries.length && <p className="text-gray-500 text-xs text-center py-8">Belum ada data gaji</p>}
                  </motion.div>
                )}

                {activeTab === 'attendance' && (
                  <motion.div key="attendance" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                    {attendanceData.map(a => (
                      <div key={a.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full ${a.status === 'ONTIME' ? 'bg-[var(--success)]' : a.status === 'LATE' ? 'bg-[var(--warning)]' : 'bg-[var(--danger)]'}`} />
                          <span className="text-xs text-gray-300">{a.action}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${a.status === 'ONTIME' ? 'bg-[var(--success)]/10 text-[var(--success)]' : a.status === 'LATE' ? 'bg-[var(--warning)]/10 text-[var(--warning)]' : 'bg-[var(--danger)]/10 text-[var(--danger)]'}`}>{a.status}</span>
                          <span className="text-[10px] text-gray-500">{new Date(a.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} {new Date(a.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    ))}
                    {!attendanceData.length && <p className="text-gray-500 text-xs text-center py-8">Belum ada data absensi</p>}
                  </motion.div>
                )}

                {activeTab === 'assets' && (
                  <motion.div key="assets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                    {assetsData.map(a => (
                      <div key={a.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                        <div>
                          <p className="text-xs font-bold text-white">{a.asset_name}</p>
                          <p className="text-[9px] text-gray-500">{a.asset_code} {a.brand ? `• ${a.brand} ${a.model}` : ''}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[9px] font-bold border ${a.status === 'ASSIGNED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : a.status === 'MAINTENANCE' ? 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/30' : 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30'}`}>{a.status}</span>
                      </div>
                    ))}
                    {!assetsData.length && <p className="text-gray-500 text-xs text-center py-8">Tidak ada aset ditugaskan</p>}
                  </motion.div>
                )}

                {activeTab === 'reviews' && (
                  <motion.div key="reviews" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                    {reviewsData.map(r => (
                      <div key={r.id} className="p-4 bg-white/5 rounded-xl border border-white/10">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-xs font-bold text-white">{r.period_label}</p>
                          <span className={`text-lg font-bold font-mono ${(r.final_score || 0) >= 85 ? 'text-[var(--success)]' : (r.final_score || 0) >= 70 ? 'text-[var(--warning)]' : 'text-[var(--danger)]'}`}>{r.final_score || '-'}</span>
                        </div>
                        <p className="text-[9px] text-gray-500">KPI: {r.kpi_score} • Perilaku: {r.behavioral_score} • Status: {r.status}</p>
                      </div>
                    ))}
                    {!reviewsData.length && <p className="text-gray-500 text-xs text-center py-8">Belum ada review kinerja</p>}
                  </motion.div>
                )}

                {activeTab === 'onboarding' && (
                  <motion.div key="onboarding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                    {onboardingData.map(t => (
                      <div key={t.id} className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${t.is_completed ? 'bg-[var(--success)] border-[var(--success)]' : 'border-gray-500'}`}>
                          {t.is_completed && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        <div className="flex-1">
                          <p className={`text-xs ${t.is_completed ? 'text-gray-500 line-through' : 'text-white font-bold'}`}>{t.task_name}</p>
                          {t.completed_at && <p className="text-[9px] text-gray-500">{new Date(t.completed_at).toLocaleDateString('id-ID')}</p>}
                        </div>
                      </div>
                    ))}
                    {!onboardingData.length && <p className="text-gray-500 text-xs text-center py-8">Belum ada tugas onboarding</p>}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 text-gray-500">
              <User size={48} className="mb-4 opacity-30" />
              <p className="text-sm">Pilih karyawan untuk melihat profil lengkap</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfileView;
