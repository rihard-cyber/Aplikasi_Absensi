import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Fuel, DollarSign, Truck, CheckCircle2, XCircle, Clock, User, Loader2, ChevronDown, Filter } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';

const TABS = [
  { key: 'trips', label: 'Perjalanan', icon: <Truck size={14} /> },
  { key: 'claims', label: 'Klaim', icon: <DollarSign size={14} /> },
  { key: 'fuel', label: 'BBM', icon: <Fuel size={14} /> },
];

const DriverManagement = () => {
  const [tab, setTab] = useState('trips');
  const [trips, setTrips] = useState([]);
  const [claims, setClaims] = useState([]);
  const [fuels, setFuels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: p } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
      if (!p?.tenant_id) return;
      setTenantId(p.tenant_id);

      const [tRes, cRes, fRes] = await Promise.all([
        supabase.from('fleet_trips').select('*, fleet_vehicles(plate_number, brand, model), profiles!driver_id(full_name, nip)').eq('tenant_id', p.tenant_id).order('created_at', { ascending: false }).limit(50),
        supabase.from('trip_claims').select('*, profiles!driver_id(full_name), profiles!approved_by(full_name)').eq('tenant_id', p.tenant_id).order('created_at', { ascending: false }).limit(50),
        supabase.from('fuel_logs').select('*, fleet_vehicles(plate_number), profiles!driver_id(full_name)').eq('tenant_id', p.tenant_id).order('created_at', { ascending: false }).limit(50),
      ]);
      setTrips(tRes.data || []);
      setClaims(cRes.data || []);
      setFuels(fRes.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleClaimAction = async (id, status) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { data: admin } = await supabase.from('profiles').select('id').eq('auth_id', session.user.id).maybeSingle();
    await supabase.from('trip_claims').update({ status, approved_by: admin?.id || null }).eq('id', id);
    fetchData();
  };

  const stats = useMemo(() => ({
    active: trips.filter(t => t.status === 'IN_PROGRESS').length,
    pendingClaims: claims.filter(c => c.status === 'pending').length,
    totalFuel: fuels.reduce((s, f) => s + Number(f.amount || 0), 0),
  }), [trips, claims, fuels]);

  const filteredTrips = trips.filter(t =>
    t.fleet_vehicles?.plate_number?.toLowerCase().includes(search.toLowerCase()) ||
    t.destination?.toLowerCase().includes(search.toLowerCase()) ||
    t.profiles?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredClaims = claims.filter(c =>
    c.claim_type?.toLowerCase().includes(search.toLowerCase()) ||
    c.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.status?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-20 text-center"><div className="w-8 h-8 border-2 border-[var(--aurora-3)] border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-serif font-bold text-white">Driver Management</h2>
        <p className="text-sm text-gray-400 mt-1">Monitor perjalanan, klaim, dan konsumsi BBM sopir</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
          <p className="text-2xl font-bold text-blue-400">{stats.active}</p>
          <p className="text-[10px] text-gray-400">Aktif</p>
        </div>
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-2xl font-bold text-amber-400">{stats.pendingClaims}</p>
          <p className="text-[10px] text-gray-400">Klaim Pending</p>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-2xl font-bold text-emerald-400">Rp{(stats.totalFuel / 1000).toFixed(0)}K</p>
          <p className="text-[10px] text-gray-400">Total BBM</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border flex items-center gap-2 ${tab === t.key ? 'bg-white/10 border-[var(--aurora-3)]/30 text-white' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari..." className="w-full bg-white/5 border border-white/20 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white outline-none placeholder:text-gray-400" />
      </div>

      {tab === 'trips' && (
        <div className="space-y-2">
          {filteredTrips.map(t => (
            <div key={t.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center"><Truck size={14} className="text-gray-400" /></div>
                  <div>
                    <p className="text-xs font-bold text-white">{t.destination}</p>
                    <p className="text-[9px] text-gray-500">{t.fleet_vehicles?.plate_number} • {t.profiles?.full_name}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${t.status === 'IN_PROGRESS' ? 'bg-amber-500/10 text-amber-400' : t.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>{t.status}</span>
              </div>
              <div className="flex gap-3 mt-2 text-[9px] text-gray-500">
                <span><Clock size={10} className="inline" /> {new Date(t.start_time).toLocaleDateString('id-ID')}</span>
                {t.purpose && <span>• {t.purpose}</span>}
              </div>
            </div>
          ))}
          {!filteredTrips.length && <p className="text-center text-gray-500 py-8 text-sm">Belum ada perjalanan.</p>}
        </div>
      )}

      {tab === 'claims' && (
        <div className="space-y-2">
          {filteredClaims.map(c => (
            <div key={c.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center"><DollarSign size={14} className="text-gray-400" /></div>
                  <div>
                    <p className="text-xs font-bold text-white">Rp{Number(c.amount).toLocaleString()}</p>
                    <p className="text-[9px] text-gray-500 capitalize">{c.claim_type} • {c.profiles?.full_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.status === 'pending' ? (
                    <>
                      <button onClick={() => handleClaimAction(c.id, 'approved')} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400"><CheckCircle2 size={14} /></button>
                      <button onClick={() => handleClaimAction(c.id, 'rejected')} className="p-1.5 rounded-lg bg-red-500/10 text-red-400"><XCircle size={14} /></button>
                    </>
                  ) : (
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${c.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{c.status}</span>
                  )}
                </div>
              </div>
              {c.notes && <p className="text-[9px] text-gray-500 mt-1">{c.notes}</p>}
            </div>
          ))}
          {!filteredClaims.length && <p className="text-center text-gray-500 py-8 text-sm">Belum ada klaim.</p>}
        </div>
      )}

      {tab === 'fuel' && (
        <div className="space-y-2">
          {fuels.map(f => (
            <div key={f.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center"><Fuel size={14} className="text-gray-400" /></div>
                  <div>
                    <p className="text-xs font-bold text-white">{f.liter}L {f.fuel_type}</p>
                    <p className="text-[9px] text-gray-500">{f.fleet_vehicles?.plate_number} • {f.profiles?.full_name}</p>
                  </div>
                </div>
                <p className="text-xs text-emerald-400 font-bold">{f.amount ? `Rp${Number(f.amount).toLocaleString()}` : '-'}</p>
              </div>
              <div className="flex gap-3 mt-1 text-[9px] text-gray-500">
                {f.station && <span>{f.station}</span>}
                {f.odometer && <span>• {f.odometer} km</span>}
                <span>• {new Date(f.created_at).toLocaleDateString('id-ID')}</span>
              </div>
            </div>
          ))}
          {!fuels.length && <p className="text-center text-gray-500 py-8 text-sm">Belum ada isi BBM.</p>}
        </div>
      )}
    </div>
  );
};

export default DriverManagement;
