/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Plus, Save, X, Edit3, Trash2, MapPin, Clock, Users, Loader2 } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';

const CATEGORIES = [
  { value: 'TRAINING', label: 'Pelatihan', icon: '📚', color: 'var(--aurora-3)' },
  { value: 'GATHERING', label: 'Gathering', icon: '🎉', color: 'var(--success)' },
  { value: 'MEETING', label: 'Rapat', icon: '📋', color: 'var(--aurora-1)' },
  { value: 'HOLIDAY', label: 'Libur', icon: '🏖️', color: 'var(--warning)' },
  { value: 'BIRTHDAY', label: 'Ulang Tahun', icon: '🎂', color: 'var(--danger)' },
  { value: 'OTHER', label: 'Lainnya', icon: '📌', color: 'gray' },
];

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

const CompanyEvents = () => {
  const [events, setEvents] = useState([]);
  const [tenantId, setTenantId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: '', category: 'GATHERING', description: '', event_date: '', event_time: '', location: '', is_mandatory: false });
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const toast = useToast();

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: p } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!p?.tenant_id && !isGod) return;
    if (p?.tenant_id) setTenantId(p.tenant_id);

    let q = supabase.from('company_events').select('*, profiles!created_by(full_name)');
    if (p?.tenant_id) q = q.eq('tenant_id', p.tenant_id);
    q = q.order('event_date', { ascending: false });
    const { data: e } = await q;
    if (e) setEvents(e);
  };

  const openNew = () => {
    setForm({ title: '', category: 'GATHERING', description: '', event_date: '', event_time: '', location: '', is_mandatory: false });
    setEditingId(null); setShowForm(true);
  };

  const openEdit = (ev) => {
    setForm({ title: ev.title, category: ev.category, description: ev.description || '', event_date: ev.event_date, event_time: ev.event_time || '', location: ev.location || '', is_mandatory: ev.is_mandatory });
    setEditingId(ev.id); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.event_date) { toast('Judul dan tanggal wajib', 'error'); return; }
    try {
      const payload = { tenant_id: tenantId, title: form.title, category: form.category, description: form.description, event_date: form.event_date, event_time: form.event_time || null, location: form.location || null, is_mandatory: form.is_mandatory };
      if (editingId) {
        await supabase.from('company_events').update(payload).eq('id', editingId);
        toast('Acara diperbarui', 'success');
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        const { data: admin } = await supabase.from('profiles').select('id').eq('auth_id', session.user.id).maybeSingle();
        await supabase.from('company_events').insert({ ...payload, created_by: admin?.id });
        toast('Acara ditambahkan', 'success');
      }
      setShowForm(false);
      fetchEvents();
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
  };

  const handleDelete = async (id) => {
    await supabase.from('company_events').delete().eq('id', id);
    toast('Acara dihapus', 'success');
    fetchEvents();
  };

  const filtered = events.filter(e => {
    const d = new Date(e.event_date);
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  });

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();

  const eventsByDate = {};
  filtered.forEach(e => {
    const day = new Date(e.event_date).getDate();
    if (!eventsByDate[day]) eventsByDate[day] = [];
    eventsByDate[day].push(e);
  });

  return (
    <div className="glass-panel p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-6 mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">Kalender Acara</h2>
          <p className="text-sm text-gray-400 mt-1">{events.length} acara • {filtered.length} bulan ini</p>
        </div>
        <button onClick={openNew} className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-bold flex items-center gap-2 whitespace-nowrap"><Plus size={16} /> Tambah Acara</button>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <button onClick={() => { if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(selectedYear - 1); } else setSelectedMonth(selectedMonth - 1); }} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 flex-shrink-0">&lt;</button>
        <span className="text-lg font-bold text-white min-w-0 sm:min-w-[160px] text-center">{MONTHS[selectedMonth]} {selectedYear}</span>
        <button onClick={() => { if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(selectedYear + 1); } else setSelectedMonth(selectedMonth + 1); }} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 flex-shrink-0">&gt;</button>
        <button onClick={() => { setSelectedMonth(new Date().getMonth()); setSelectedYear(new Date().getFullYear()); }} className="px-3 py-1.5 rounded-lg bg-white/5 text-[10px] text-gray-400 hover:text-white whitespace-nowrap">Hari Ini</button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-6">
        {['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map(d => (
          <div key={d} className="text-center text-[9px] text-gray-500 uppercase tracking-widest font-bold py-2">{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayEvents = eventsByDate[day] || [];
          const isToday = day === new Date().getDate() && selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear();
          return (
            <div key={day} className={`min-h-[60px] p-1 rounded-xl border ${isToday ? 'bg-[var(--aurora-3)]/10 border-[var(--aurora-3)]/20' : 'bg-white/5 border-white/10'}`}>
              <p className={`text-[9px] font-bold mb-0.5 ${isToday ? 'text-[var(--aurora-3)]' : 'text-gray-500'}`}>{day}</p>
              {dayEvents.slice(0, 2).map(ev => {
                const cat = CATEGORIES.find(c => c.value === ev.category);
                return (
                  <div key={ev.id} className="text-[6px] px-1 py-0.5 rounded truncate text-white font-bold mb-0.5 cursor-pointer hover:opacity-80"
                    style={{ background: (cat?.color || 'gray') + '60' }}
                    title={ev.title}>
                    {cat?.icon} {ev.title}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><CalendarDays size={16} className="text-[var(--aurora-3)]" /> Daftar Acara</h3>
        {filtered.map(ev => {
          const cat = CATEGORIES.find(c => c.value === ev.category);
          const d = new Date(ev.event_date);
          return (
            <div key={ev.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-all group">
              <div className="flex items-center gap-4">
                <div className="text-center w-12">
                  <p className="text-lg font-bold text-white">{d.getDate()}</p>
                  <p className="text-[8px] text-gray-500 uppercase">{MONTHS[d.getMonth()].slice(0, 3)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{cat?.icon}</span>
                    <span className="text-sm font-bold text-white">{ev.title}</span>
                    {ev.is_mandatory && <span className="text-[8px] px-1.5 py-0.5 rounded bg-[var(--danger)]/10 text-[var(--danger)] font-bold">WAJIB</span>}
                  </div>
                  <div className="flex items-center gap-3 text-[9px] text-gray-500 mt-0.5">
                    {ev.event_time && <span className="flex items-center gap-1"><Clock size={9} /> {ev.event_time}</span>}
                    {ev.location && <span className="flex items-center gap-1"><MapPin size={9} /> {ev.location}</span>}
                    <span className="px-1.5 py-0.5 rounded" style={{ background: (cat?.color || 'gray') + '20', color: cat?.color }}>{cat?.label}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                <button onClick={() => openEdit(ev)} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400"><Edit3 size={12} /></button>
                <button onClick={() => handleDelete(ev.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-400"><Trash2 size={12} /></button>
              </div>
            </div>
          );
        })}
        {!filtered.length && <p className="text-gray-500 text-xs text-center py-4">Tidak ada acara bulan ini</p>}
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md glass-panel p-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-serif font-bold text-white">{editingId ? 'Edit' : 'Tambah'} Acara</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Judul</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Tanggal</label>
                  <input type="date" value={form.event_date} onChange={e => setForm({...form, event_date: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Waktu</label>
                  <input type="time" value={form.event_time} onChange={e => setForm({...form, event_time: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Kategori</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white outline-none">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Lokasi</label>
                <input value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Deskripsi</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-white/5 hover:bg-white/5">
                <input type="checkbox" checked={form.is_mandatory} onChange={e => setForm({...form, is_mandatory: e.target.checked})} className="w-4 h-4" />
                <span className="text-xs text-gray-300">Acara wajib dihadiri</span>
              </label>
              <button onClick={handleSave} className="w-full py-4 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-bold text-xs flex items-center justify-center gap-2">
                <Save size={14} /> Simpan Acara
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default CompanyEvents;
