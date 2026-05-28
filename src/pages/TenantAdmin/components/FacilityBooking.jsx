/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Save, X, Edit3, Trash2, Building2, Truck, Wrench, CheckCircle2, XCircle, LogIn, LogOut, CalendarDays, Loader2, Users, Clock, ToggleLeft, ToggleRight, Image } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { sendNotification, notifyAdminsInTenant, NOTIF_TYPES } from '../../../utils/notificationEngine';

const FACILITY_TYPES = [
  { value: 'room', label: 'Ruangan', icon: <Building2 size={14} /> },
  { value: 'vehicle', label: 'Kendaraan', icon: <Truck size={14} /> },
  { value: 'equipment', label: 'Peralatan', icon: <Wrench size={14} /> },
];

const BookingStatusBadge = ({ status }) => {
  const styles = {
    PENDING: 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/30',
    APPROVED: 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30',
    REJECTED: 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/30',
    CHECKED_IN: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    CHECKED_OUT: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
  };
  return <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${styles[status] || 'bg-white/5 text-gray-400 border-white/10'}`}>{status}</span>;
};

const FacilityBooking = () => {
  const [tab, setTab] = useState('facilities');
  const [facilities, setFacilities] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [tenantId, setTenantId] = useState(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'room', capacity: '', facilities_json: '', location: '', photo_url: '', is_active: true });
  const [bookingFilter, setBookingFilter] = useState('ALL');
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const toast = useToast();

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: p } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!p?.tenant_id && !isGod) return;
    if (p?.tenant_id) setTenantId(p.tenant_id);

    let q1 = supabase.from('facilities').select('*');
    if (p?.tenant_id) q1 = q1.eq('tenant_id', p.tenant_id);
    q1 = q1.order('name', { ascending: true });
    const { data: f } = await q1;
    if (f) setFacilities(f);

    let q2 = supabase.from('booking_requests').select('*, facilities(name, type), profiles!user_id(full_name, nip)');
    if (p?.tenant_id) q2 = q2.eq('tenant_id', p.tenant_id);
    q2 = q2.order('created_at', { ascending: false });
    const { data: b } = await q2;
    if (b) setBookings(b);

    let q3 = supabase.from('profiles').select('id, full_name, nip');
    if (p?.tenant_id) q3 = q3.eq('tenant_id', p.tenant_id);
    q3 = q3.in('role', ['EMPLOYEE', 'SUB_ADMIN']);
    const { data: e } = await q3;
    if (e) setEmployees(e);
  };

  const openNew = () => {
    setForm({ name: '', type: 'room', capacity: '', facilities_json: '', location: '', photo_url: '', is_active: true });
    setEditingId(null); setShowForm(true);
  };

  const openEdit = (fac) => {
    setForm({
      name: fac.name, type: fac.type, capacity: fac.capacity || '',
      facilities_json: fac.facilities ? JSON.stringify(fac.facilities) : '',
      location: fac.location || '', photo_url: fac.photo_url || '', is_active: fac.is_active,
    });
    setEditingId(fac.id); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast('Nama fasilitas wajib', 'error'); return; }
    try {
      let parsedFacilities = [];
      try { if (form.facilities_json) parsedFacilities = JSON.parse(form.facilities_json); } catch { toast('Format facilities JSON tidak valid', 'error'); return; }
      const payload = { tenant_id: tenantId, name: form.name, type: form.type, capacity: form.capacity ? Number(form.capacity) : null, facilities: parsedFacilities, location: form.location || null, photo_url: form.photo_url || null, is_active: form.is_active };
      if (editingId) {
        await supabase.from('facilities').update(payload).eq('id', editingId);
        toast('Fasilitas diperbarui', 'success');
      } else {
        await supabase.from('facilities').insert(payload);
        toast('Fasilitas ditambahkan', 'success');
      }
      setShowForm(false);
      fetchAll();
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
  };

  const toggleActive = async (fac) => {
    await supabase.from('facilities').update({ is_active: !fac.is_active }).eq('id', fac.id);
    toast(`Fasilitas ${fac.is_active ? 'dinonaktifkan' : 'diaktifkan'}`, 'success');
    fetchAll();
  };

  const handleBookingAction = async (id, status) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { data: admin } = await supabase.from('profiles').select('id').eq('auth_id', session.user.id).maybeSingle();
    const update = { status, approved_by: admin?.id };
    if (status === 'CHECKED_IN') update.checked_in_at = new Date().toISOString();
    if (status === 'CHECKED_OUT') update.checked_out_at = new Date().toISOString();
    if (status === 'APPROVED') update.approved_at = new Date().toISOString();
    await supabase.from('booking_requests').update(update).eq('id', id);
    toast(`Booking ${status === 'APPROVED' ? 'disetujui' : status === 'REJECTED' ? 'ditolak' : status === 'CHECKED_IN' ? 'check-in' : 'check-out'} berhasil`, 'success');
    const booking = bookings.find(b => b.id === id);
    const facilityName = booking?.facilities?.name || '';
    if (status === 'APPROVED') {
      sendNotification({ userId: booking.user_id, type: NOTIF_TYPES.BOOKING_APPROVED, title: 'Booking Disetujui: ' + facilityName, body: booking.purpose?.substring(0,100), link: '/booking' });
    }
    if (status === 'REJECTED') {
      sendNotification({ userId: booking.user_id, type: NOTIF_TYPES.BOOKING_REJECTED, title: 'Booking Ditolak: ' + facilityName, body: booking.purpose?.substring(0,100), link: '/booking' });
    }
    fetchAll();
  };

  const filteredFacilities = facilities.filter(f =>
    f.name?.toLowerCase().includes(search.toLowerCase()) ||
    f.type?.toLowerCase().includes(search.toLowerCase()) ||
    f.location?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredBookings = bookings.filter(b => bookingFilter === 'ALL' || b.status === bookingFilter);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter(b => b.booking_date === todayStr && b.status !== 'REJECTED');
  const totalCapacity = facilities.reduce((s, f) => s + Number(f.capacity || 0), 0);
  const utilizationRate = totalCapacity > 0 ? Math.round((todayBookings.length / facilities.length) * 100) : 0;

  const calendarBookings = bookings.filter(b => {
    const d = new Date(b.booking_date);
    return d.getMonth() === calendarMonth && d.getFullYear() === calendarYear;
  });
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const bookingsByDate = {};
  calendarBookings.forEach(b => {
    const day = new Date(b.booking_date).getDate();
    if (!bookingsByDate[day]) bookingsByDate[day] = [];
    bookingsByDate[day].push(b);
  });

  const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

  const tabs = [
    { key: 'facilities', label: 'Fasilitas', icon: <Building2 size={14} /> },
    { key: 'bookings', label: 'Pemesanan', icon: <Clock size={14} /> },
    { key: 'calendar', label: 'Kalender', icon: <CalendarDays size={14} /> },
  ];

  return (
    <div className="glass-panel p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-6 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">Fasilitas & Pemesanan</h2>
          <p className="text-sm text-gray-400 mt-1">{facilities.length} fasilitas • {todayBookings.length} pemakaian hari ini • {utilizationRate}% utilisasi</p>
        </div>
        {tab === 'facilities' && (
          <button onClick={openNew} className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-bold flex items-center gap-2 whitespace-nowrap"><Plus size={16} /> Tambah Fasilitas</button>
        )}
      </div>

      <div className="flex gap-1 mb-6 bg-white/5 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${tab === t.key ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'facilities' && (
        <>
          <div className="relative mb-6">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari fasilitas, tipe, lokasi..." className="w-full bg-[#1A1C23] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-3)]" />
          </div>

          {showForm && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Nama Fasilitas</label>
                  <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="Ruang Meeting A" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Tipe</label>
                  <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white outline-none">
                    {FACILITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Kapasitas</label>
                  <input type="number" value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="10" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Lokasi</label>
                  <input value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="Lantai 2" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Fasilitas (JSON Array)</label>
                  <input value={form.facilities_json} onChange={e => setForm({...form, facilities_json: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder='["projector","tv","ac"]' />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">URL Foto</label>
                  <input value={form.photo_url} onChange={e => setForm({...form, photo_url: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="https://..." />
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-white/5 hover:bg-white/5 mb-4 w-fit">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} className="w-4 h-4" />
                <span className="text-xs text-gray-300">Aktif</span>
              </label>
              <div className="flex gap-3">
                <button onClick={handleSave} className="px-6 py-3 rounded-xl bg-[var(--success)] text-black text-xs font-bold flex items-center gap-2"><Save size={14} /> Simpan</button>
                <button onClick={() => setShowForm(false)} className="px-6 py-3 rounded-xl bg-white/5 text-gray-400 border border-white/10 text-xs font-bold"><X size={14} /> Batal</button>
              </div>
            </motion.div>
          )}

          <div className="space-y-3">
            {filteredFacilities.map(f => (
              <div key={f.id} className="p-5 bg-white/5 rounded-2xl border border-white/10 hover:border-white/20 transition-all group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400">
                      {FACILITY_TYPES.find(t => t.value === f.type)?.icon || <Building2 size={18} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{f.name}</span>
                        {!f.is_active && <span className="text-[8px] px-1.5 py-0.5 rounded bg-gray-500/10 text-gray-400 font-bold">NONAKTIF</span>}
                      </div>
                      <div className="flex items-center gap-3 text-[9px] text-gray-500 mt-0.5">
                        <span>{FACILITY_TYPES.find(t => t.value === f.type)?.label}</span>
                        {f.capacity && <span><Users size={9} className="inline mr-0.5" />{f.capacity} orang</span>}
                        {f.location && <span>{f.location}</span>}
                        {f.facilities?.length > 0 && <span>{f.facilities.join(', ')}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleActive(f)} className={`p-1.5 rounded-lg transition-all ${f.is_active ? 'text-[var(--success)] hover:bg-[var(--success)]/10' : 'text-gray-500 hover:bg-white/10'}`}>
                      {f.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    </button>
                    <button onClick={() => openEdit(f)} className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"><Edit3 size={12} /></button>
                    <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${f.is_active ? 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30' : 'bg-gray-500/10 text-gray-400 border-gray-500/30'}`}>{f.is_active ? 'AKTIF' : 'NONAKTIF'}</span>
                  </div>
                </div>
              </div>
            ))}
            {!filteredFacilities.length && <p className="text-center text-gray-500 py-8 text-sm">Belum ada fasilitas</p>}
          </div>
        </>
      )}

      {tab === 'bookings' && (
        <>
          <div className="flex flex-wrap gap-2 mb-6">
            {['ALL', 'PENDING', 'APPROVED', 'CHECKED_IN', 'CHECKED_OUT', 'REJECTED'].map(s => (
              <button key={s} onClick={() => setBookingFilter(s)} className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-all ${bookingFilter === s ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-transparent text-gray-500 hover:text-white'}`}>
                {s === 'ALL' ? 'Semua' : s}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredBookings.map(b => {
              const fac = b.facilities;
              const profile = b.profiles;
              return (
                <div key={b.id} className="p-5 bg-white/5 rounded-2xl border border-white/10 hover:border-white/20 transition-all">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400">
                        <Building2 size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{fac?.name || '—'}</span>
                          <span className="text-[9px] text-gray-500">{fac?.type}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[9px] text-gray-500 mt-0.5">
                          <span className="flex items-center gap-1"><Users size={9} /> {profile?.full_name || '—'}</span>
                          <span>{b.booking_date}</span>
                          {b.start_time && <span>{b.start_time?.substring(0, 5)} - {b.end_time?.substring(0, 5)}</span>}
                        </div>
                        {b.purpose && <p className="text-[9px] text-gray-500 italic mt-0.5">"{b.purpose}"</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookingStatusBadge status={b.status} />
                      {b.status === 'PENDING' && (
                        <>
                          <button onClick={() => handleBookingAction(b.id, 'APPROVED')} className="p-2 rounded-lg bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20" title="Setujui"><CheckCircle2 size={14} /></button>
                          <button onClick={() => handleBookingAction(b.id, 'REJECTED')} className="p-2 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20" title="Tolak"><XCircle size={14} /></button>
                        </>
                      )}
                      {b.status === 'APPROVED' && (
                        <button onClick={() => handleBookingAction(b.id, 'CHECKED_IN')} className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20" title="Check-In"><LogIn size={14} /></button>
                      )}
                      {b.status === 'CHECKED_IN' && (
                        <button onClick={() => handleBookingAction(b.id, 'CHECKED_OUT')} className="p-2 rounded-lg bg-gray-500/10 text-gray-400 hover:bg-gray-500/20" title="Check-Out"><LogOut size={14} /></button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {!filteredBookings.length && <p className="text-center text-gray-500 py-8 text-sm">Tidak ada pemesanan</p>}
          </div>
        </>
      )}

      {tab === 'calendar' && (
        <>
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <button onClick={() => { if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(calendarYear - 1); } else setCalendarMonth(calendarMonth - 1); }} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 flex-shrink-0">&lt;</button>
            <span className="text-lg font-bold text-white min-w-0 sm:min-w-[160px] text-center">{MONTHS[calendarMonth]} {calendarYear}</span>
            <button onClick={() => { if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(calendarYear + 1); } else setCalendarMonth(calendarMonth + 1); }} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 flex-shrink-0">&gt;</button>
            <button onClick={() => { setCalendarMonth(new Date().getMonth()); setCalendarYear(new Date().getFullYear()); }} className="px-3 py-1.5 rounded-lg bg-white/5 text-[10px] text-gray-400 hover:text-white whitespace-nowrap">Hari Ini</button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-6">
            {['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map(d => (
              <div key={d} className="text-center text-[9px] text-gray-500 uppercase tracking-widest font-bold py-2">{d}</div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayBookings = bookingsByDate[day] || [];
              const isToday = day === new Date().getDate() && calendarMonth === new Date().getMonth() && calendarYear === new Date().getFullYear();
              return (
                <div key={day} className={`min-h-[70px] p-1 rounded-xl border ${isToday ? 'bg-[var(--aurora-3)]/10 border-[var(--aurora-3)]/20' : 'bg-white/5 border-white/10'}`}>
                  <p className={`text-[9px] font-bold mb-0.5 ${isToday ? 'text-[var(--aurora-3)]' : 'text-gray-500'}`}>{day}</p>
                  {dayBookings.slice(0, 2).map(b => (
                    <div key={b.id} className={`text-[6px] px-1 py-0.5 rounded truncate text-white font-bold mb-0.5 cursor-pointer hover:opacity-80 ${b.status === 'APPROVED' ? 'bg-[var(--success)]/60' : b.status === 'CHECKED_IN' ? 'bg-blue-500/60' : b.status === 'REJECTED' ? 'bg-[var(--danger)]/60' : 'bg-[var(--warning)]/60'}`} title={`${b.facilities?.name} - ${b.profiles?.full_name}`}>
                      {b.facilities?.name}
                    </div>
                  ))}
                  {dayBookings.length > 2 && <p className="text-[6px] text-gray-500">+{dayBookings.length - 2} lagi</p>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default FacilityBooking;
