import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Truck, Wrench, Calendar, Send, CheckCircle2, Loader2, ArrowLeft, FileText, StepBack } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { notifyAdminsInTenant, NOTIF_TYPES } from '../../../utils/notificationEngine';

/** @type {(s: string) => string} Passthrough i18n — app is monolingual Indonesian */
const t = (s) => s;

const FACILITY_TYPES = [
  { value: 'room', label: 'Ruangan', icon: <Building2 size={16} />, desc: 'Ruang meeting, rapat, pelatihan' },
  { value: 'vehicle', label: 'Kendaraan', icon: <Truck size={16} />, desc: 'Mobil, motor operasional' },
  { value: 'equipment', label: 'Peralatan', icon: <Wrench size={16} />, desc: 'Proyektor, sound system, dll' },
];

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

const BookingRequest = ({ onBack }) => {
  const [step, setStep] = useState(1);
  const [facilityType, setFacilityType] = useState('');
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [myBookings, setMyBookings] = useState([]);
  const [tenantId, setTenantId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [form, setForm] = useState({ booking_date: '', start_time: '', end_time: '', purpose: '' });
  const toast = useToast();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchInitial(); }, []);

  const fetchInitial = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: p } = await supabase.from('profiles').select('id, tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!p) return;
    setTenantId(p.tenant_id);
    setUserId(p.id);
    fetchMyBookings(p.id, p.tenant_id);
  };

  const fetchMyBookings = async (uid, tid) => {
    let q = supabase.from('booking_requests').select('*, facilities(name, type, location)').eq('user_id', uid);
    if (tid) q = q.eq('tenant_id', tid);
    q = q.order('booking_date', { ascending: false });
    const { data } = await q;
    if (data) setMyBookings(data);
  };

  const selectType = async (type) => {
    setFacilityType(type);
    setSelectedFacility(null);
    let q = supabase.from('facilities').select('*').eq('type', type).eq('is_active', true);
    if (tenantId) q = q.eq('tenant_id', tenantId);
    q = q.order('name', { ascending: true });
    const { data } = await q;
    if (data) setFacilities(data);
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!selectedFacility || !form.booking_date || !form.start_time || !form.end_time) { toast('Lengkapi semua data', 'error'); return; }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('booking_requests').insert({
        tenant_id: tenantId, user_id: userId, facility_id: selectedFacility,
        booking_date: form.booking_date, start_time: form.start_time, end_time: form.end_time,
        purpose: form.purpose || null, status: 'PENDING',
      });
      if (error) throw error;
      const facility = facilities.find(f => f.id === selectedFacility);
      notifyAdminsInTenant({ type: NOTIF_TYPES.BOOKING_REQUESTED, title: 'Booking Baru: ' + (facility?.name || ''), body: (form.purpose || '').substring(0,100), link: '/booking' });
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setStep(1); setFacilityType(''); setSelectedFacility(null);
        setForm({ booking_date: '', start_time: '', end_time: '', purpose: '' });
        fetchMyBookings(userId, tenantId);
      }, 2000);
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
    finally { setIsSubmitting(false); }
  };

  const upcoming = myBookings.filter(b => new Date(b.booking_date) >= new Date(new Date().toDateString()));
  const past = myBookings.filter(b => new Date(b.booking_date) < new Date(new Date().toDateString()));

  const calBookings = myBookings.filter(b => {
    const d = new Date(b.booking_date);
    return d.getMonth() === calMonth && d.getFullYear() === calYear;
  });
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const bookingsByDate = {};
  calBookings.forEach(b => {
    const day = new Date(b.booking_date).getDate();
    if (!bookingsByDate[day]) bookingsByDate[day] = [];
    bookingsByDate[day].push(b);
  });

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-6 pb-24 relative min-h-[60vh]">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-serif font-bold text-white">{t('Pesan Fasilitas')}</h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">{t('Ruangan, Kendaraan & Peralatan')}</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
            <p className="text-xs text-gray-400 mb-2">{t('Pilih tipe fasilitas yang ingin dipesan:')}</p>
            {FACILITY_TYPES.map(t => (
              <button key={t.value} onClick={() => selectType(t.value)} className="w-full p-5 bg-white/5 rounded-2xl border border-white/10 hover:border-[var(--aurora-3)]/30 hover:bg-white/[0.08] transition-all text-left flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-[var(--aurora-3)] group-hover:bg-[var(--aurora-3)]/10 transition-all">
                  {t.icon}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{t.label}</h4>
                  <p className="text-[10px] text-gray-500">{t.desc}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => { setStep(1); setFacilityType(''); }} className="text-[10px] text-gray-500 hover:text-white flex items-center gap-1"><StepBack size={12} /> Kembali</button>
              <span className="text-[10px] text-gray-600">/</span>
              <span className="text-[10px] text-[var(--aurora-3)] font-bold">{FACILITY_TYPES.find(t => t.value === facilityType)?.label}</span>
            </div>
            <p className="text-xs text-gray-400 mb-2">{t('Pilih ')}{FACILITY_TYPES.find(t => t.value === facilityType)?.label}{t(' yang tersedia:')}</p>
            {facilities.map(f => (
              <button key={f.id} onClick={() => { setSelectedFacility(f.id); setStep(3); }} className="w-full p-5 bg-white/5 rounded-2xl border border-white/10 hover:border-[var(--aurora-3)]/30 hover:bg-white/[0.08] transition-all text-left flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-[var(--aurora-3)]">
                  {FACILITY_TYPES.find(t => t.value === f.type)?.icon || <Building2 size={18} />}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white">{f.name}</h4>
                  <div className="flex items-center gap-3 text-[9px] text-gray-500 mt-0.5">
                    {f.capacity && <span>{t('Kapasitas: ')}{f.capacity}</span>}
                    {f.location && <span>{f.location}</span>}
                    {f.facilities?.length > 0 && <span>{f.facilities.join(', ')}</span>}
                  </div>
                </div>
              </button>
            ))}
            {!facilities.length && <p className="text-center text-gray-500 py-8 text-sm">{t('Tidak ada ')}{FACILITY_TYPES.find(t => t.value === facilityType)?.label}{t(' tersedia')}</p>}
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setStep(2)} className="text-[10px] text-gray-500 hover:text-white flex items-center gap-1"><StepBack size={12} /> Kembali</button>
              <span className="text-[10px] text-gray-600">/</span>
              <span className="text-[10px] text-gray-500">{t('Detail Pemesanan')}</span>
            </div>
            <div className="glass-panel p-8 rounded-[40px] border border-white/5 space-y-6 bg-white/[0.02]">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="text-[var(--aurora-3)]" size={20} />
                <h3 className="text-lg font-serif font-bold text-white tracking-wide">{t('Detail Pemesanan')}</h3>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">{t('Tanggal')}</label>
                  <input type="date" required value={form.booking_date} onChange={e => setForm({...form, booking_date: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-xs text-white outline-none focus:border-[var(--aurora-3)]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">{t('Jam Mulai')}</label>
                    <input type="time" required value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-xs text-white outline-none focus:border-[var(--aurora-3)]" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">{t('Jam Selesai')}</label>
                    <input type="time" required value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-xs text-white outline-none focus:border-[var(--aurora-3)]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">{t('Keperluan')}</label>
                  <textarea rows="3" placeholder="Tuliskan keperluan pemesanan..." value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-xs text-white outline-none focus:border-[var(--aurora-3)] resize-none" />
                </div>
                <div className="pt-4">
                  {showSuccess ? (
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="w-full py-4 rounded-2xl bg-[var(--success)]/20 text-[var(--success)] flex items-center justify-center gap-3 border border-[var(--success)]/30">
                      <CheckCircle2 size={20} />
                      <span className="text-xs font-bold uppercase tracking-widest">{t('Berhasil Diajukan')}</span>
                    </motion.div>
                  ) : (
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setStep(2)} className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-gray-400 font-bold uppercase tracking-widest text-[10px]">{t('Batal')}</button>
                      <button type="submit" disabled={isSubmitting} className="flex-[2] py-4 rounded-2xl bg-gradient-to-r from-[var(--aurora-2)] to-[var(--aurora-3)] text-white font-bold uppercase tracking-widest text-[10px] shadow-[0_15px_30px_rgba(0,201,255,0.2)] flex items-center justify-center gap-3">
                        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <>{t('Ajukan')} <Send size={14} /></>}
                      </button>
                    </div>
                  )}
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><Calendar size={16} className="text-[var(--aurora-3)]" /> Pemesanan Saya</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400">&lt;</button>
          <span className="text-xs font-bold text-white min-w-[120px] text-center">{MONTHS.at(calMonth)} {calYear}</span>
          <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); }} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400">&gt;</button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 mb-6">
          {['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map(d => (
            <div key={d} className="text-center text-[8px] text-gray-500 uppercase tracking-widest font-bold py-1">{d}</div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayBookings = bookingsByDate[day] || [];
            const isToday = day === new Date().getDate() && calMonth === new Date().getMonth() && calYear === new Date().getFullYear();
            return (
              <div key={day} className={`min-h-[40px] p-0.5 rounded-lg border ${isToday ? 'bg-[var(--aurora-3)]/10 border-[var(--aurora-3)]/20' : 'bg-white/5 border-white/10'}`}>
                <p className={`text-[8px] font-bold ${isToday ? 'text-[var(--aurora-3)]' : 'text-gray-500'}`}>{day}</p>
                {dayBookings.slice(0, 1).map(b => (
                  <div key={b.id} className={`text-[5px] px-0.5 py-0.5 rounded truncate text-white font-bold ${b.status === 'APPROVED' ? 'bg-[var(--success)]/60' : b.status === 'REJECTED' ? 'bg-[var(--danger)]/60' : 'bg-[var(--warning)]/60'}`}>
                    {b.facilities?.name}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {upcoming.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">{t('Akan Datang')}</p>
            <div className="space-y-2">
              {upcoming.map(b => (
                <div key={b.id} className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{b.facilities?.name}</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border ${b.status === 'PENDING' ? 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/30' : b.status === 'APPROVED' ? 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30' : b.status === 'REJECTED' ? 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/30' : 'bg-gray-500/10 text-gray-400'}`}>{b.status}</span>
                      </div>
                      <p className="text-[9px] text-gray-500 mt-0.5">{b.booking_date} • {b.start_time?.substring(0,5)} - {b.end_time?.substring(0,5)}</p>
                    </div>
                    <div className="text-gray-400">{FACILITY_TYPES.find(t => t.value === b.facilities?.type)?.icon || <Building2 size={14} />}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {past.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">{t('Riwayat')}</p>
            <div className="space-y-2">
              {past.map(b => (
                <div key={b.id} className="p-4 bg-white/5 rounded-xl border border-white/10 opacity-60">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{b.facilities?.name}</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border ${b.status === 'APPROVED' ? 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30' : b.status === 'CHECKED_IN' ? 'bg-blue-500/10 text-blue-400' : b.status === 'CHECKED_OUT' ? 'bg-gray-500/10 text-gray-400' : b.status === 'REJECTED' ? 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/30' : 'bg-[var(--warning)]/10 text-[var(--warning)]'}`}>{b.status}</span>
                      </div>
                      <p className="text-[9px] text-gray-500 mt-0.5">{b.booking_date}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {!myBookings.length && <p className="text-center text-gray-500 text-xs py-6">{t('Belum ada pemesanan')}</p>}
      </div>
    </motion.div>
  );
};

export default BookingRequest;
