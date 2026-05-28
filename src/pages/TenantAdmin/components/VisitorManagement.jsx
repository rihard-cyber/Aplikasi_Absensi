import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Save, X, User, LogIn, LogOut, Ban, Printer, QrCode, Calendar, Loader2, Users, Shield, Phone, Car, Building2 } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';

const VisitorManagement = () => {
  const [visitors, setVisitors] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [tenantId, setTenantId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterHost, setFilterHost] = useState('');
  const [filterName, setFilterName] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ host_id: '', full_name: '', company: '', identity_number: '', phone: '', vehicle_plate: '', purpose: '', visit_date: new Date().toISOString().split('T')[0] });
  const [qrData, setQrData] = useState(null);
  const toast = useToast();

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: p } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
    
    let activeTenantId = p?.tenant_id;
    if (!activeTenantId && isGod) {
      try {
        const impTenant = JSON.parse(localStorage.getItem('impersonated_tenant'));
        if (impTenant?.id) activeTenantId = impTenant.id;
      } catch (e) {
        console.error("Failed to parse impersonated tenant", e);
      }
    }

    if (!activeTenantId && !isGod) return;
    if (activeTenantId) setTenantId(activeTenantId);

    let q1 = supabase.from('visitors').select('*, profiles!host_id(full_name, nip)');
    if (activeTenantId) q1 = q1.eq('tenant_id', activeTenantId);
    q1 = q1.order('visit_date', { ascending: false });
    const { data: v } = await q1;
    if (v) setVisitors(v);

    let q2 = supabase.from('profiles').select('id, full_name, nip');
    if (activeTenantId) q2 = q2.eq('tenant_id', activeTenantId);
    q2 = q2.in('role', ['EMPLOYEE', 'SUB_ADMIN']);
    const { data: e } = await q2;
    if (e) setEmployees(e);
  };

  const generateQR = (visitor) => {
    const data = JSON.stringify({ id: visitor.id, name: visitor.full_name, company: visitor.company, visit_date: visitor.visit_date });
    setQrData(data);
    toast('QR Code siap digunakan', 'success');
  };

  const handleSave = async () => {
    if (!form.full_name || !form.visit_date) { toast('Nama dan tanggal wajib', 'error'); return; }
    try {
      const payload = { tenant_id: tenantId, host_id: form.host_id || null, full_name: form.full_name, company: form.company || null, identity_number: form.identity_number || null, phone: form.phone || null, vehicle_plate: form.vehicle_plate || null, purpose: form.purpose || null, visit_date: form.visit_date };
      const { data, error } = await supabase.from('visitors').insert(payload).select().single();
      if (error) throw error;
      toast('Visitor pre-registered', 'success');
      setShowForm(false);
      setForm({ host_id: '', full_name: '', company: '', identity_number: '', phone: '', vehicle_plate: '', purpose: '', visit_date: new Date().toISOString().split('T')[0] });
      if (data) generateQR(data);
      fetchAll();
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
  };

  const handleCheckIn = async (id) => {
    await supabase.from('visitors').update({ checked_in_at: new Date().toISOString(), is_checked_in: true }).eq('id', id);
    toast('Visitor checked in', 'success');
    fetchAll();
  };

  const handleCheckOut = async (id) => {
    await supabase.from('visitors').update({ checked_out_at: new Date().toISOString(), is_checked_out: true }).eq('id', id);
    toast('Visitor checked out', 'success');
    fetchAll();
  };

  const toggleBlacklist = async (v) => {
    await supabase.from('visitors').update({ is_blacklisted: !v.is_blacklisted }).eq('id', v.id);
    toast(`Visitor ${v.is_blacklisted ? 'dihapus dari' : 'ditambahkan ke'} blacklist`, 'info');
    fetchAll();
  };

  const toggleBadgePrinted = async (id, current) => {
    await supabase.from('visitors').update({ badge_printed: !current }).eq('id', id);
    toast(`Badge ${current ? 'unmarked' : 'marked'} as printed`, 'success');
    fetchAll();
  };

  const filtered = visitors.filter(v => {
    if (filterDate && v.visit_date !== filterDate) return false;
    if (filterHost && v.profiles?.full_name && !v.profiles.full_name.toLowerCase().includes(filterHost.toLowerCase())) return false;
    if (filterName && !v.full_name.toLowerCase().includes(filterName.toLowerCase())) return false;
    return true;
  });

  const todayVisitors = visitors.filter(v => v.visit_date === new Date().toISOString().split('T')[0]);
  const checkedInToday = todayVisitors.filter(v => v.is_checked_in).length;

  return (
    <div className="glass-panel p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-6 mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">Manajemen Visitor</h2>
          <p className="text-sm text-gray-400 mt-1">{todayVisitors.length} hari ini • {checkedInToday} check-in • {visitors.filter(v => v.is_blacklisted).length} blacklisted</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-bold flex items-center gap-2 whitespace-nowrap"><Plus size={16} /> Pre-Register</button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[150px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={filterName} onChange={e => setFilterName(e.target.value)} placeholder="Cari nama..." className="w-full bg-[#1A1C23] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white text-xs outline-none focus:border-[var(--aurora-3)]" />
        </div>
        <div>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="bg-[#1A1C23] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-[var(--aurora-3)]" />
        </div>
        <div className="relative flex-1 min-w-[150px]">
          <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={filterHost} onChange={e => setFilterHost(e.target.value)} placeholder="Cari host..." className="w-full bg-[#1A1C23] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white text-xs outline-none focus:border-[var(--aurora-3)]" />
        </div>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg glass-panel p-8 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-serif font-bold text-white">Pre-Register Visitor</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Host (Pencarian)</label>
                <select value={form.host_id} onChange={e => setForm({...form, host_id: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none">
                  <option value="">— Pilih Host —</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.nip})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Nama Lengkap</label>
                  <input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Perusahaan</label>
                  <input value={form.company} onChange={e => setForm({...form, company: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">No. Identitas</label>
                  <input value={form.identity_number} onChange={e => setForm({...form, identity_number: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">No. Telepon</label>
                  <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Plat Kendaraan</label>
                  <input value={form.vehicle_plate} onChange={e => setForm({...form, vehicle_plate: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Tanggal Kunjungan</label>
                  <input type="date" value={form.visit_date} onChange={e => setForm({...form, visit_date: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Keperluan</label>
                <textarea value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})} rows={3} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" />
              </div>
              <button onClick={handleSave} className="w-full py-4 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-bold text-xs flex items-center justify-center gap-2">
                <Save size={14} /> Register Visitor
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {qrData && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-6 p-6 bg-white/5 rounded-2xl border border-[var(--aurora-3)]/30 text-center">
          <p className="text-xs text-[var(--aurora-3)] font-bold mb-2">QR Code Generated</p>
          <div className="inline-block p-4 bg-white rounded-xl">
            <QrCode size={120} className="text-black" />
          </div>
          <p className="text-[9px] text-gray-500 mt-2 break-all font-mono">{qrData}</p>
        </motion.div>
      )}

      <div className="space-y-3">
        {filtered.map(v => (
          <div key={v.id} className={`p-5 bg-white/5 rounded-2xl border transition-all group ${v.is_blacklisted ? 'border-[var(--danger)]/30 opacity-70' : 'border-white/10 hover:border-white/20'}`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${v.is_blacklisted ? 'bg-[var(--danger)]/10 text-[var(--danger)]' : 'bg-white/5 text-gray-400'}`}>
                  {v.is_blacklisted ? <Ban size={18} /> : <User size={18} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{v.full_name}</span>
                    {v.is_blacklisted && <span className="text-[8px] px-1.5 py-0.5 rounded bg-[var(--danger)]/10 text-[var(--danger)] font-bold">BLACKLIST</span>}
                    {v.badge_printed && <span className="text-[8px] px-1.5 py-0.5 rounded bg-[var(--success)]/10 text-[var(--success)] font-bold">BADGE</span>}
                  </div>
                  <div className="flex items-center gap-3 text-[9px] text-gray-500 mt-0.5">
                    {v.company && <span className="flex items-center gap-1"><Building2 size={9} /> {v.company}</span>}
                    {v.profiles?.full_name && <span className="flex items-center gap-1"><User size={9} /> Host: {v.profiles.full_name}</span>}
                    <span className="flex items-center gap-1"><Calendar size={9} /> {v.visit_date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-gray-500 mt-0.5">
                    {v.identity_number && <span>KTP: {v.identity_number}</span>}
                    {v.phone && <span className="flex items-center gap-1"><Phone size={9} /> {v.phone}</span>}
                    {v.vehicle_plate && <span className="flex items-center gap-1"><Car size={9} /> {v.vehicle_plate}</span>}
                  </div>
                  {v.purpose && <p className="text-[9px] text-gray-500 italic mt-0.5">"{v.purpose}"</p>}
                  <div className="flex items-center gap-2 mt-1">
                    {v.is_checked_in && <span className="text-[8px] text-blue-400 flex items-center gap-1"><LogIn size={8} /> {new Date(v.checked_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>}
                    {v.is_checked_out && <span className="text-[8px] text-gray-400 flex items-center gap-1"><LogOut size={8} /> {new Date(v.checked_out_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!v.is_checked_in && (
                  <button onClick={() => handleCheckIn(v.id)} className="p-2 rounded-lg bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20" title="Check-In"><LogIn size={14} /></button>
                )}
                {v.is_checked_in && !v.is_checked_out && (
                  <button onClick={() => handleCheckOut(v.id)} className="p-2 rounded-lg bg-gray-500/10 text-gray-400 hover:bg-gray-500/20" title="Check-Out"><LogOut size={14} /></button>
                )}
                <button onClick={() => toggleBadgePrinted(v.id, v.badge_printed)} className={`p-2 rounded-lg ${v.badge_printed ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-white/5 text-gray-500'} hover:bg-white/10`} title="Badge"><Printer size={14} /></button>
                <button onClick={() => toggleBlacklist(v)} className={`p-2 rounded-lg ${v.is_blacklisted ? 'bg-[var(--danger)]/10 text-[var(--danger)]' : 'bg-white/5 text-gray-500'} hover:bg-white/10`} title="Blacklist"><Ban size={14} /></button>
                <button onClick={() => generateQR(v)} className="p-2 rounded-lg bg-white/5 text-gray-500 hover:bg-white/10" title="Generate QR"><QrCode size={14} /></button>
              </div>
            </div>
          </div>
        ))}
        {!filtered.length && <p className="text-center text-gray-500 py-8 text-sm">Tidak ada visitor</p>}
      </div>
    </div>
  );
};

export default VisitorManagement;
