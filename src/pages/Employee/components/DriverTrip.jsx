import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Truck, MapPin, Clock, Camera, Loader2, ChevronLeft, CheckCircle2, Fuel, DollarSign, Plus, X, Navigation } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';

const t = (s) => s;

const DriverTrip = ({ onBack, user }) => {
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTrip, setActiveTrip] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [tenantId, setTenantId] = useState(null);
  const [tab, setTab] = useState('trip');

  // Form state
  const [tripForm, setTripForm] = useState({ vehicle_id: '', destination: '', purpose: '', notes: '' });
  const [fuelForm, setFuelForm] = useState({ liter: '', amount: '', fuel_type: 'solar', station: '', odometer: '' });
  const [claimForm, setClaimForm] = useState({ claim_type: 'toll', amount: '', notes: '' });
  const [photoReceipt, setPhotoReceipt] = useState(null);
  const [photoVehicle, setPhotoVehicle] = useState(null);

  useEffect(() => { init(); }, []);

  const init = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles').select('tenant_id, id').eq('auth_id', session.user.id).maybeSingle();
      if (!profile?.tenant_id) return;
      setTenantId(profile.tenant_id);

      const [vRes, tRes] = await Promise.all([
        supabase.from('fleet_vehicles').select('*').eq('tenant_id', profile.tenant_id).eq('status', 'available').in('status', ['available', 'in_use']).order('plate_number'),
        supabase.from('fleet_trips').select('*, fleet_vehicles(plate_number, brand, model)').eq('tenant_id', profile.tenant_id).eq('driver_id', profile.id).order('created_at', { ascending: false }),
      ]);
      setVehicles(vRes.data || []);
      setTrips(tRes.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const activeTrips = useMemo(() => trips.filter(t => t.status === 'IN_PROGRESS'), [trips]);
  const historyTrips = useMemo(() => trips.filter(t => t.status !== 'IN_PROGRESS'), [trips]);

  const capturePhoto = (type) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.capture = 'environment';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) type === 'receipt' ? setPhotoReceipt(file) : setPhotoVehicle(file);
    };
    input.click();
  };

  const uploadPhoto = async (file, prefix) => {
    if (!file) return null;
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `driver/${Date.now()}_${prefix}.${ext}`;
    const { error } = await supabase.storage.from('documents').upload(path, file);
    if (error) return null;
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
    return urlData?.publicUrl || null;
  };

  const handleStartTrip = async () => {
    if (!tripForm.vehicle_id || !tripForm.destination) return;
    setSubmitting(true);
    try {
      const photoUrl = photoVehicle ? await uploadPhoto(photoVehicle, 'start') : null;
      const { error } = await supabase.from('fleet_trips').insert({
        tenant_id: tenantId,
        driver_id: user?.id,
        vehicle_id: tripForm.vehicle_id,
        destination: tripForm.destination,
        purpose: tripForm.purpose || null,
        start_km: parseInt(tripForm.notes) || 0,
        notes: tripForm.notes,
        photo_start: photoUrl,
        status: 'IN_PROGRESS',
        start_time: new Date().toISOString(),
      });
      if (error) throw error;
      await supabase.from('fleet_vehicles').update({ status: 'in_use' }).eq('id', tripForm.vehicle_id);
      setTripForm({ vehicle_id: '', destination: '', purpose: '', notes: '' });
      setPhotoVehicle(null);
      await init();
    } catch (e) { alert('Gagal: ' + e.message); }
    setSubmitting(false);
  };

  const handleEndTrip = async (trip) => {
    setSubmitting(true);
    try {
      const photoUrl = photoVehicle ? await uploadPhoto(photoVehicle, 'end') : null;
      await supabase.from('fleet_trips').update({
        status: 'COMPLETED',
        end_time: new Date().toISOString(),
        end_km: parseInt(tripForm.notes) || null,
        photo_end: photoUrl,
        notes: tripForm.notes || trip.notes,
      }).eq('id', trip.id);
      await supabase.from('fleet_vehicles').update({ status: 'available' }).eq('id', trip.vehicle_id);
      setActiveTrip(null);
      setPhotoVehicle(null);
      setTripForm({ vehicle_id: '', destination: '', purpose: '', notes: '' });
      await init();
    } catch (e) { alert('Gagal: ' + e.message); }
    setSubmitting(false);
  };

  const handleAddFuel = async (trip) => {
    if (!fuelForm.liter) return;
    setSubmitting(true);
    try {
      const photoUrl = photoReceipt ? await uploadPhoto(photoReceipt, 'fuel') : null;
      await supabase.from('fuel_logs').insert({
        tenant_id: tenantId, vehicle_id: trip.vehicle_id, driver_id: user?.id, trip_id: trip.id,
        liter: parseFloat(fuelForm.liter), amount: parseFloat(fuelForm.amount) || null,
        fuel_type: fuelForm.fuel_type, station: fuelForm.station || null,
        odometer: parseInt(fuelForm.odometer) || null, receipt_photo: photoUrl,
      });
      setFuelForm({ liter: '', amount: '', fuel_type: 'solar', station: '', odometer: '' });
      setPhotoReceipt(null);
    } catch (e) { alert('Gagal: ' + e.message); }
    setSubmitting(false);
  };

  const handleAddClaim = async (trip) => {
    if (!claimForm.amount) return;
    setSubmitting(true);
    try {
      const photoUrl = photoReceipt ? await uploadPhoto(photoReceipt, 'claim') : null;
      await supabase.from('trip_claims').insert({
        tenant_id: tenantId, driver_id: user?.id, trip_id: trip.id,
        claim_type: claimForm.claim_type, amount: parseFloat(claimForm.amount),
        receipt_photo: photoUrl, notes: claimForm.notes || null,
      });
      setClaimForm({ claim_type: 'toll', amount: '', notes: '' });
      setPhotoReceipt(null);
    } catch (e) { alert('Gagal: ' + e.message); }
    setSubmitting(false);
  };

  if (loading) return <div className="p-20 text-center"><div className="w-8 h-8 border-2 border-[var(--aurora-3)] border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && <button onClick={onBack} className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white"><ChevronLeft size={18} /></button>}
          <div>
            <h3 className="text-lg font-serif font-bold text-white">{showHistory ? t('Riwayat Perjalanan') : t('Perjalanan Dinas')}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{showHistory ? `${historyTrips.length} perjalanan` : activeTrips.length > 0 ? `${activeTrips.length} perjalanan aktif` : 'Mulai perjalanan baru'}</p>
          </div>
        </div>
        <button onClick={() => setShowHistory(!showHistory)} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] text-gray-400 hover:text-white font-bold">
          {showHistory ? 'Baru' : 'Riwayat'}
        </button>
      </div>

      {!showHistory ? (
        activeTrips.length > 0 ? (
          activeTrips.map(trip => (
            <div key={trip.id} className="space-y-3">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">Perjalanan Aktif</p>
                    <p className="text-xs text-gray-400">{trip.fleet_vehicles?.plate_number} • {trip.destination}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[9px] font-bold">IN PROGRESS</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-2">Mulai: {new Date(trip.start_time).toLocaleString('id-ID')}</p>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setActiveTrip(trip)} className="flex-1 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold">Selesaikan</button>
              </div>

              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-2"><Fuel size={14} /> Isi BBM</h4>
                <div className="grid grid-cols-2 gap-2">
                  <input value={fuelForm.liter} onChange={e => setFuelForm({ ...fuelForm, liter: e.target.value })} type="number" step="0.1" placeholder="Liter" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none" />
                  <input value={fuelForm.amount} onChange={e => setFuelForm({ ...fuelForm, amount: e.target.value })} type="number" placeholder="Biaya" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none" />
                  <select value={fuelForm.fuel_type} onChange={e => setFuelForm({ ...fuelForm, fuel_type: e.target.value })} className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none">
                    <option value="solar">Solar</option><option value="pertalite">Pertalite</option><option value="pertamax">Pertamax</option><option value="pertamax_turbo">Pertamax Turbo</option>
                  </select>
                  <input value={fuelForm.odometer} onChange={e => setFuelForm({ ...fuelForm, odometer: e.target.value })} type="number" placeholder="Km" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none" />
                </div>
                <button onClick={() => capturePhoto('receipt')} className={`w-full p-3 rounded-xl border border-dashed text-center ${photoReceipt ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/[0.02] border-white/10'}`}>
                  {photoReceipt ? '✅ Foto struk' : '📷 Foto struk'}
                </button>
                <button onClick={() => handleAddFuel(trip)} disabled={submitting} className="w-full py-2.5 rounded-xl bg-blue-500/20 text-blue-400 text-[10px] font-bold">Simpan BBM</button>
              </div>

              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-2"><DollarSign size={14} /> Klaim (Tol/Parkir)</h4>
                <div className="grid grid-cols-2 gap-2">
                  <select value={claimForm.claim_type} onChange={e => setClaimForm({ ...claimForm, claim_type: e.target.value })} className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none">
                    <option value="toll">Tol</option><option value="parking">Parkir</option><option value="meal">Makan</option><option value="other">Lainnya</option>
                  </select>
                  <input value={claimForm.amount} onChange={e => setClaimForm({ ...claimForm, amount: e.target.value })} type="number" placeholder="Jumlah" className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none" />
                </div>
                <input value={claimForm.notes} onChange={e => setClaimForm({ ...claimForm, notes: e.target.value })} placeholder="Catatan" className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none" />
                <button onClick={() => handleAddClaim(trip)} disabled={submitting} className="w-full py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">Simpan Klaim</button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white">Mulai Perjalanan Baru</h4>
            <select value={tripForm.vehicle_id} onChange={e => setTripForm({ ...tripForm, vehicle_id: e.target.value })} className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none">
              <option value="">Pilih Kendaraan</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate_number} - {v.brand} {v.model}</option>)}
            </select>
            <input value={tripForm.destination} onChange={e => setTripForm({ ...tripForm, destination: e.target.value })} placeholder="Tujuan" className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none" />
            <input value={tripForm.purpose} onChange={e => setTripForm({ ...tripForm, purpose: e.target.value })} placeholder="Keperluan" className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none" />
            <input value={tripForm.notes} onChange={e => setTripForm({ ...tripForm, notes: e.target.value })} type="number" placeholder="KM Awal" className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none" />
            <button onClick={() => capturePhoto('vehicle')} className={`w-full p-4 rounded-xl border border-dashed text-center ${photoVehicle ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/[0.02] border-white/10'}`}>
              {photoVehicle ? <img src={URL.createObjectURL(photoVehicle)} className="w-full h-24 object-cover rounded-lg mx-auto" /> : '📷 Foto kendaraan sebelum jalan'}
            </button>
            <button onClick={handleStartTrip} disabled={submitting} className="w-full py-3 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-bold flex items-center justify-center gap-2">
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />} Mulai Perjalanan
            </button>
          </div>
        )
      ) : (
        <div className="space-y-2">
          {historyTrips.map(trip => (
            <div key={trip.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">{trip.destination}</p>
                  <p className="text-[10px] text-gray-500">{trip.fleet_vehicles?.plate_number} • {new Date(trip.start_time).toLocaleDateString('id-ID')}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${trip.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>{trip.status}</span>
              </div>
              {trip.purpose && <p className="text-[10px] text-gray-400 mt-1">{trip.purpose}</p>}
            </div>
          ))}
          {historyTrips.length === 0 && <div className="p-12 text-center text-gray-500 text-sm">Belum ada riwayat perjalanan.</div>}
        </div>
      )}

      {/* End Trip Modal */}
      {activeTrip && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setActiveTrip(null)}>
          <div className="bg-[#1A1C23] border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
            <h4 className="text-sm font-bold text-white">Selesaikan Perjalanan</h4>
            <p className="text-xs text-gray-400">{activeTrip.fleet_vehicles?.plate_number} → {activeTrip.destination}</p>
            <input value={tripForm.notes} onChange={e => setTripForm({ ...tripForm, notes: e.target.value })} type="number" placeholder="KM Akhir" className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none" />
            <button onClick={() => capturePhoto('vehicle')} className={`w-full p-3 rounded-xl border border-dashed text-center ${photoVehicle ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/[0.02] border-white/10'}`}>
              {photoVehicle ? '✅ Foto' : '📷 Foto kendaraan'}
            </button>
            <div className="flex gap-3">
              <button onClick={() => setActiveTrip(null)} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-xs font-bold">Batal</button>
              <button onClick={() => handleEndTrip(activeTrip)} disabled={submitting} className="flex-[2] py-3 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs font-bold">Selesai</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverTrip;
