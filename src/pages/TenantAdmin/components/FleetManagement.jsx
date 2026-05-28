import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Save, X, Edit3, Truck, AlertTriangle, Fuel, Calendar, ClipboardList, Users, DollarSign, Gauge, MapPin, Loader2 } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { logAudit } from '../../../utils/auditLogger';

const STATUS_STYLES = {
  available: 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30',
  in_use: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  maintenance: 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/30',
  retired: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
};

const TABS = [
  { key: 'vehicles', label: 'Kendaraan', icon: <Truck size={14} /> },
  { key: 'trips', label: 'Trip Logs', icon: <ClipboardList size={14} /> },
  { key: 'drivers', label: 'Driver Roster', icon: <Users size={14} /> },
];

const FleetManagement = () => {
  const [tab, setTab] = useState('vehicles');
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [tenantId, setTenantId] = useState(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showTripForm, setShowTripForm] = useState(false);
  const [form, setForm] = useState({ plate_number: '', brand: '', model: '', year: '', color: '', fuel_type: 'bensin', stnk_expiry: '', insurance_expiry: '', status: 'available' });
  const [tripForm, setTripForm] = useState({ vehicle_id: '', driver_id: '', departure_date: '', return_date: '', departure_km: '', return_km: '', destination: '', purpose: '', fuel_cost: '' });
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const toast = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: p } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!p?.tenant_id && !isGod) return;
    if (p?.tenant_id) setTenantId(p.tenant_id);

    let q1 = supabase.from('fleet_vehicles').select('*');
    if (p?.tenant_id) q1 = q1.eq('tenant_id', p.tenant_id);
    q1 = q1.order('created_at', { ascending: false });
    const { data: v } = await q1;
    if (v) setVehicles(v);

    let q2 = supabase.from('fleet_trips').select('*, fleet_vehicles(plate_number, brand, model), profiles!driver_id(full_name, nip)');
    if (p?.tenant_id) q2 = q2.eq('tenant_id', p.tenant_id);
    q2 = q2.order('created_at', { ascending: false });
    const { data: t } = await q2;
    if (t) setTrips(t);

    let q3 = supabase.from('profiles').select('id, full_name, nip');
    if (p?.tenant_id) q3 = q3.eq('tenant_id', p.tenant_id);
    q3 = q3.in('role', ['EMPLOYEE', 'SUB_ADMIN']);
    const { data: pr } = await q3;
    if (pr) setProfiles(pr);

    const { data: d } = await supabase.from('profiles').select('id, full_name, nip, phone, employee_id').eq('tenant_id', p?.tenant_id).eq('role', 'EMPLOYEE');
    if (d) setDrivers(d);
  };

  const selectedVehicleTrips = selectedVehicle ? trips.filter(t => t.vehicle_id === selectedVehicle.id) : [];
  const totalFuel = selectedVehicleTrips.reduce((s, t) => s + Number(t.fuel_cost || 0), 0);

  const openNew = () => {
    setForm({ plate_number: '', brand: '', model: '', year: '', color: '', fuel_type: 'bensin', stnk_expiry: '', insurance_expiry: '', status: 'available' });
    setEditingId(null); setShowForm(true);
  };

  const openEdit = (v) => {
    setForm({ plate_number: v.plate_number, brand: v.brand || '', model: v.model || '', year: v.year || '', color: v.color || '', fuel_type: v.fuel_type || 'bensin', stnk_expiry: v.stnk_expiry || '', insurance_expiry: v.insurance_expiry || '', status: v.status });
    setEditingId(v.id); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.plate_number) { toast('Nomor plat wajib', 'error'); return; }
    try {
      const payload = { ...form, tenant_id: tenantId, year: form.year ? Number(form.year) : null };
      if (editingId) {
        await supabase.from('fleet_vehicles').update(payload).eq('id', editingId);
        toast('Kendaraan diperbarui', 'success');
      } else {
        await supabase.from('fleet_vehicles').insert(payload);
        toast('Kendaraan ditambahkan', 'success');
      }
      logAudit(editingId ? 'UPDATE_VEHICLE' : 'ADD_VEHICLE', { plate: form.plate_number });
      setShowForm(false);
      fetchData();
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
  };

  const toggleActive = async (id, currentStatus) => {
    const newStatus = currentStatus === 'available' ? 'maintenance' : 'available';
    await supabase.from('fleet_vehicles').update({ status: newStatus }).eq('id', id);
    toast(`Status diubah ke ${newStatus}`, 'success');
    fetchData();
  };

  const handleTripSubmit = async () => {
    if (!tripForm.vehicle_id || !tripForm.driver_id || !tripForm.departure_date) { toast('Lengkapi data trip', 'error'); return; }
    try {
      await supabase.from('fleet_trips').insert({
        ...tripForm, tenant_id: tenantId,
        departure_km: tripForm.departure_km ? Number(tripForm.departure_km) : null,
        return_km: tripForm.return_km ? Number(tripForm.return_km) : null,
        fuel_cost: tripForm.fuel_cost ? Number(tripForm.fuel_cost) : null,
      });
      toast('Trip log ditambahkan', 'success');
      setShowTripForm(false);
      setTripForm({ vehicle_id: '', driver_id: '', departure_date: '', return_date: '', departure_km: '', return_km: '', destination: '', purpose: '', fuel_cost: '' });
      fetchData();
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
  };

  const isExpiring = (date) => {
    if (!date) return false;
    const diff = new Date(date) - new Date();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
  };

  const isExpired = (date) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const filteredVehicles = vehicles.filter(v =>
    v.plate_number?.toLowerCase().includes(search.toLowerCase()) ||
    v.brand?.toLowerCase().includes(search.toLowerCase()) ||
    v.model?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTrips = trips.filter(t =>
    t.fleet_vehicles?.plate_number?.toLowerCase().includes(search.toLowerCase()) ||
    t.destination?.toLowerCase().includes(search.toLowerCase()) ||
    t.profiles?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const statusLabel = { available: 'Tersedia', in_use: 'Digunakan', maintenance: 'Perbaikan', retired: 'Pensiun' };

  const fuelSummary = {};
  trips.forEach(t => {
    const plate = t.fleet_vehicles?.plate_number || 'Unknown';
    if (!fuelSummary[plate]) fuelSummary[plate] = { count: 0, total: 0 };
    fuelSummary[plate].count++;
    fuelSummary[plate].total += Number(t.fuel_cost || 0);
  });

  return (
    <div className="glass-panel p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-6 mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">Fleet & Transport</h2>
          <p className="text-sm text-gray-400 mt-1">{vehicles.length} kendaraan • {trips.length} trip • Rp{Math.round(totalFuel).toLocaleString()} total BBM</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setSearch(''); }}
            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all flex items-center gap-2 ${tab === t.key ? 'bg-white/10 border-[var(--aurora-3)]/30 text-white' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari..." className="w-full bg-[#1A1C23] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-3)]" />
      </div>

      {tab === 'vehicles' && (
        <>
          <button onClick={openNew} className="mb-6 px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-bold flex items-center gap-2"><Plus size={16} /> Tambah Kendaraan</button>

          {showForm && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Nomor Plat</label>
                  <input value={form.plate_number} onChange={e => setForm({...form, plate_number: e.target.value.toUpperCase()})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="B 1234 XYZ" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Merek</label>
                  <input value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="Toyota" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Model</label>
                  <input value={form.model} onChange={e => setForm({...form, model: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="Innova Reborn" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Tahun</label>
                  <input type="number" value={form.year} onChange={e => setForm({...form, year: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="2023" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Warna</label>
                  <input value={form.color} onChange={e => setForm({...form, color: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="Putih" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Jenis BBM</label>
                  <select value={form.fuel_type} onChange={e => setForm({...form, fuel_type: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white outline-none">
                    <option value="bensin">Bensin</option>
                    <option value="solar">Solar</option>
                    <option value="listrik">Listrik</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Masa Berlaku STNK</label>
                  <input type="date" value={form.stnk_expiry} onChange={e => setForm({...form, stnk_expiry: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Masa Berlaku Insurance</label>
                  <input type="date" value={form.insurance_expiry} onChange={e => setForm({...form, insurance_expiry: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white outline-none">
                    <option value="available">Tersedia</option>
                    <option value="in_use">Digunakan</option>
                    <option value="maintenance">Perbaikan</option>
                    <option value="retired">Pensiun</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleSave} className="px-6 py-3 rounded-xl bg-[var(--success)] text-black text-xs font-bold flex items-center gap-2"><Save size={14} /> Simpan</button>
                <button onClick={() => setShowForm(false)} className="px-6 py-3 rounded-xl bg-white/5 text-gray-400 border border-white/10 text-xs font-bold"><X size={14} /> Batal</button>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {Object.entries(fuelSummary).map(([plate, data]) => (
              <div key={plate} className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3">
                <Fuel size={20} className="text-[var(--aurora-3)]" />
                <div>
                  <p className="text-xs font-bold text-white">{plate}</p>
                  <p className="text-[9px] text-gray-500">{data.count} trip • Rp{Math.round(data.total).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {filteredVehicles.map(v => (
              <div key={v.id} className="p-5 bg-white/5 rounded-2xl border border-white/10 hover:border-white/20 transition-all group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400">
                      <Truck size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{v.plate_number}</span>
                        {v.brand && <span className="text-xs text-gray-400">{v.brand} {v.model}</span>}
                      </div>
                      <div className="flex items-center gap-3 text-[9px] text-gray-500 mt-0.5 flex-wrap">
                        {v.year && <span>{v.year}</span>}
                        {v.color && <span>{v.color}</span>}
                        {v.fuel_type && <span><Fuel size={10} className="inline" /> {v.fuel_type}</span>}
                        {v.stnk_expiry && (
                          <span className={`flex items-center gap-1 ${isExpired(v.stnk_expiry) ? 'text-[var(--danger)]' : isExpiring(v.stnk_expiry) ? 'text-[var(--warning)]' : ''}`}>
                            <Calendar size={10} /> STNK: {v.stnk_expiry}
                            {(isExpired(v.stnk_expiry) || isExpiring(v.stnk_expiry)) && <AlertTriangle size={10} />}
                          </span>
                        )}
                        {v.insurance_expiry && (
                          <span className={`flex items-center gap-1 ${isExpired(v.insurance_expiry) ? 'text-[var(--danger)]' : isExpiring(v.insurance_expiry) ? 'text-[var(--warning)]' : ''}`}>
                            <Calendar size={10} /> Insurance: {v.insurance_expiry}
                            {(isExpired(v.insurance_expiry) || isExpiring(v.insurance_expiry)) && <AlertTriangle size={10} />}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${STATUS_STYLES[v.status]}`}>{statusLabel[v.status] || v.status}</span>
                    <button onClick={() => toggleActive(v.id, v.status)} className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white" title="Toggle maintenance"><Edit3 size={12} /></button>
                    <button onClick={() => openEdit(v)} className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"><Edit3 size={12} /></button>
                  </div>
                </div>
                <button onClick={() => setSelectedVehicle(selectedVehicle?.id === v.id ? null : v)} className="mt-3 text-[9px] text-[var(--aurora-3)] hover:underline">
                  {selectedVehicle?.id === v.id ? 'Sembunyikan detail' : 'Lihat detail & trip'}
                </button>
                {selectedVehicle?.id === v.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-xs text-gray-400 mb-2">Total biaya BBM: <strong className="text-white font-mono">Rp{Math.round(totalFuel).toLocaleString()}</strong> ({selectedVehicleTrips.length} trip)</p>
                    {selectedVehicleTrips.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl mb-2 text-xs">
                        <div>
                          <p className="text-white font-bold">{t.destination}</p>
                          <p className="text-gray-500">{t.departure_date} {t.return_date ? `- ${t.return_date}` : ''}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-400"><Gauge size={12} className="inline" /> {t.departure_km}km</p>
                          {t.fuel_cost && <p className="text-[var(--aurora-3)]">Rp{Number(t.fuel_cost).toLocaleString()}</p>}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>
            ))}
            {!filteredVehicles.length && <p className="text-center text-gray-500 py-8 text-sm">Belum ada kendaraan</p>}
          </div>
        </>
      )}

      {tab === 'trips' && (
        <>
          <button onClick={() => setShowTripForm(true)} className="mb-6 px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-bold flex items-center gap-2"><Plus size={16} /> Tambah Trip Log</button>

          {showTripForm && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Kendaraan</label>
                  <select value={tripForm.vehicle_id} onChange={e => setTripForm({...tripForm, vehicle_id: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white outline-none">
                    <option value="">— Pilih —</option>
                    {vehicles.filter(v => v.status !== 'retired').map(v => <option key={v.id} value={v.id}>{v.plate_number} - {v.brand} {v.model}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Driver</label>
                  <select value={tripForm.driver_id} onChange={e => setTripForm({...tripForm, driver_id: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white outline-none">
                    <option value="">— Pilih —</option>
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name} ({p.nip})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Tanggal Berangkat</label>
                  <input type="date" value={tripForm.departure_date} onChange={e => setTripForm({...tripForm, departure_date: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Tanggal Kembali</label>
                  <input type="date" value={tripForm.return_date} onChange={e => setTripForm({...tripForm, return_date: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">KM Berangkat</label>
                  <input type="number" value={tripForm.departure_km} onChange={e => setTripForm({...tripForm, departure_km: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="12000" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">KM Kembali</label>
                  <input type="number" value={tripForm.return_km} onChange={e => setTripForm({...tripForm, return_km: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="12500" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Tujuan</label>
                  <input value={tripForm.destination} onChange={e => setTripForm({...tripForm, destination: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="Jakarta" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Tujuan Perjalanan</label>
                  <input value={tripForm.purpose} onChange={e => setTripForm({...tripForm, purpose: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="Meeting klien" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Biaya BBM (Rp)</label>
                  <input type="number" value={tripForm.fuel_cost} onChange={e => setTripForm({...tripForm, fuel_cost: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="200000" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleTripSubmit} className="px-6 py-3 rounded-xl bg-[var(--success)] text-black text-xs font-bold flex items-center gap-2"><Save size={14} /> Simpan Trip</button>
                <button onClick={() => setShowTripForm(false)} className="px-6 py-3 rounded-xl bg-white/5 text-gray-400 border border-white/10 text-xs font-bold"><X size={14} /> Batal</button>
              </div>
            </motion.div>
          )}

          <div className="space-y-3">
            {filteredTrips.map(t => (
              <div key={t.id} className="p-5 bg-white/5 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400">
                      <MapPin size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{t.destination || 'No destination'}</p>
                      <div className="flex items-center gap-2 text-[9px] text-gray-500 mt-0.5">
                        <span>{t.fleet_vehicles?.plate_number} {t.fleet_vehicles?.brand}</span>
                        <span>•</span>
                        <span>{t.profiles?.full_name}</span>
                        <span>•</span>
                        <span>{t.departure_date}</span>
                        {t.return_date && <><span>•</span><span>Kembali: {t.return_date}</span></>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-gray-400">
                    {t.departure_km && <p><Gauge size={12} className="inline" /> {t.departure_km} km {t.return_km ? `→ ${t.return_km} km` : ''}</p>}
                    {t.fuel_cost > 0 && <p className="text-[var(--aurora-3)] font-bold">Rp{Number(t.fuel_cost).toLocaleString()}</p>}
                    {t.purpose && <p className="italic text-gray-500">"{t.purpose}"</p>}
                  </div>
                </div>
              </div>
            ))}
            {!filteredTrips.length && <p className="text-center text-gray-500 py-8 text-sm">Belum ada trip log</p>}
          </div>
        </>
      )}

      {tab === 'drivers' && (
        <div className="space-y-3">
          {drivers.map(d => (
            <div key={d.id} className="p-5 bg-white/5 rounded-2xl border border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center text-white font-bold">{d.full_name?.charAt(0)}</div>
                <div>
                  <p className="text-sm font-bold text-white">{d.full_name}</p>
                  <p className="text-[10px] text-gray-400">{d.nip} {d.phone ? `• ${d.phone}` : ''}</p>
                </div>
              </div>
            </div>
          ))}
          {!drivers.length && <p className="text-center text-gray-500 py-8 text-sm">Tidak ada driver terdaftar</p>}
        </div>
      )}
    </div>
  );
};

export default FleetManagement;
