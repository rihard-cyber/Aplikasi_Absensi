/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React, { useState, useEffect } from 'react';
import { CalendarDays, Clock, Moon, Filter, Search, Users, RefreshCcw } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';

/**
 * Global Shift Overview — God Mode
 * Menampilkan Kamus Shift dari SEMUA Tenant dan Jadwal Hari Ini
 * secara lintas-tenant untuk keperluan monitoring Super Admin.
 */
const GlobalShiftView = () => {
  const [shifts, setShifts] = useState([]);
  const [schedulesToday, setSchedulesToday] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('dict'); // dict | schedule
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch All Tenants
      const { data: tData } = await supabase.from('tenants').select('id, name');
      if (tData) setTenants(tData);

      // Fetch All Master Shifts (cross-tenant)
      const { data: sData } = await supabase
        .from('master_shifts')
        .select('*, tenants(name), projects(name, code)')
        .order('created_at', { ascending: false });
      if (sData) setShifts(sData);

      // Fetch Today's Schedules
      const today = new Date().toISOString().split('T')[0];
      const { data: schedData } = await supabase
        .from('user_schedules')
        .select(`
          *,
          profiles(full_name, tenant_id, tenants(name), projects(name)),
          master_shifts(shift_code, shift_name, time_in, time_out, is_cross_day)
        `)
        .eq('date', today)
        .order('created_at', { ascending: false });
      if (schedData) setSchedulesToday(schedData);

    } catch (e) {
      console.error('GlobalShiftView fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Filtered Data ---
  const filteredShifts = shifts.filter(s => {
    const matchTenant = selectedTenant === 'all' || s.tenant_id === selectedTenant;
    const matchSearch = !searchQuery || 
      s.shift_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.shift_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchTenant && matchSearch;
  });

  const filteredSchedules = schedulesToday.filter(s => {
    const matchTenant = selectedTenant === 'all' || s.profiles?.tenant_id === selectedTenant;
    const matchSearch = !searchQuery ||
      s.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.master_shifts?.shift_code?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchTenant && matchSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-white tracking-wide flex items-center gap-2">
            <CalendarDays className="text-[var(--aurora-1)]" /> Manajemen Jadwal Global
          </h2>
          <p className="text-gray-400 text-sm mt-1">Pantau Kamus Shift & Jadwal Harian dari semua Tenant.</p>
        </div>
        <button onClick={fetchData} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white text-xs font-bold tracking-widest flex items-center gap-2 transition-colors">
          <RefreshCcw size={14} /> REFRESH
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex-1">
          <Search size={14} className="text-gray-500" />
          <input
            type="text"
            placeholder="Cari kode shift, nama karyawan..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-transparent text-white text-sm outline-none flex-1 placeholder-gray-600"
          />
        </div>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
          <Filter size={14} className="text-[var(--aurora-1)]" />
          <select
            value={selectedTenant}
            onChange={e => setSelectedTenant(e.target.value)}
            className="bg-transparent text-white text-sm outline-none cursor-pointer"
          >
            <option value="all" className="bg-[#0B0C10]">🌐 Semua Tenant</option>
            {tenants.map(t => (
              <option key={t.id} value={t.id} className="bg-[#0B0C10]">{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sub-Tab Switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveSubTab('dict')}
          className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeSubTab === 'dict' ? 'bg-[var(--aurora-1)] text-white' : 'bg-white/5 text-gray-500 hover:text-white'}`}
        >
          📚 Kamus Shift
        </button>
        <button
          onClick={() => setActiveSubTab('schedule')}
          className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeSubTab === 'schedule' ? 'bg-[var(--aurora-3)] text-black' : 'bg-white/5 text-gray-500 hover:text-white'}`}
        >
          📅 Jadwal Hari Ini
        </button>
      </div>

      {isLoading ? (
        <div className="py-10"><div className="w-full glass-panel p-8 border border-white/5 animate-pulse space-y-6"><div className="h-5 bg-white/10 rounded w-1/3" /><div className="h-4 bg-white/5 rounded w-2/3" /><div className="grid grid-cols-3 gap-4"><div className="h-32 bg-white/5 rounded-2xl" /><div className="h-32 bg-white/5 rounded-2xl" /><div className="h-32 bg-white/5 rounded-2xl" /></div></div></div>
      ) : activeSubTab === 'dict' ? (
        /* ---- SHIFT DICTIONARY VIEW ---- */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredShifts.length === 0 ? (
            <div className="col-span-full p-16 text-center glass-panel text-gray-500">
              <CalendarDays size={48} className="mx-auto mb-4 opacity-20" />
              Belum ada Kamus Shift yang dibuat.
            </div>
          ) : filteredShifts.map(s => (
            <div key={s.id} className={`glass-panel p-5 border transition-all hover:border-white/20 ${s.is_cross_day ? 'border-[var(--aurora-3)]/20' : 'border-white/5'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1.5 bg-white/10 text-white font-black text-sm rounded-lg border border-white/20 tracking-wider">
                    {s.shift_code}
                  </span>
                  {s.is_cross_day && (
                    <span className="px-2 py-1 bg-[var(--aurora-3)]/10 text-[var(--aurora-3)] text-[9px] font-bold uppercase rounded border border-[var(--aurora-3)]/20 flex items-center gap-1">
                      <Moon size={9} /> Malam
                    </span>
                  )}
                </div>
              </div>
              <h4 className="text-base font-bold text-white mb-2">{s.shift_name}</h4>
              <div className="flex gap-4 text-xs text-gray-400">
                {s.time_in ? (
                  <>
                    <span className="flex items-center gap-1"><Clock size={11} className="text-[var(--success)]" /> IN: <span className="font-mono text-white">{s.time_in.substring(0,5)}</span></span>
                    <span className="flex items-center gap-1"><Clock size={11} className="text-[var(--danger)]" /> OUT: <span className="font-mono text-white">{s.time_out.substring(0,5)}</span></span>
                  </>
                ) : (
                  <span className="text-gray-600 uppercase tracking-wider text-[10px] font-bold">Hari Libur / OFF</span>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-600">
                <span>{s.tenants?.name || '—'}</span>
                {s.projects?.code ? <span className="text-gray-500 font-mono text-[10px]">[{s.projects.code}]</span> : null} {s.projects?.name && <span className="text-gray-500">{s.projects.name}</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ---- TODAY'S SCHEDULE VIEW ---- */
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-[var(--aurora-3)]" />
            <p className="text-sm text-gray-400">Total <span className="text-white font-bold">{filteredSchedules.length}</span> karyawan terjadwal hari ini.</p>
          </div>
          {filteredSchedules.length === 0 ? (
            <div className="p-16 text-center glass-panel text-gray-500">
              <CalendarDays size={48} className="mx-auto mb-4 opacity-20" />
              Tidak ada jadwal khusus untuk hari ini.
            </div>
          ) : filteredSchedules.map(s => (
            <div key={s.id} className="glass-panel p-4 border border-white/5 hover:border-white/15 transition-all flex items-center gap-4">
              <div className={`w-2 h-10 rounded-full flex-shrink-0 ${s.master_shifts?.is_cross_day ? 'bg-[var(--aurora-3)]' : 'bg-[var(--success)]'}`} />
              <div className="flex-1">
                <p className="font-bold text-white text-sm">{s.profiles?.full_name || '—'}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.profiles?.tenants?.name} • {s.profiles?.projects?.name}</p>
              </div>
              <div className="text-right">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase border ${
                  s.master_shifts?.is_cross_day
                    ? 'bg-[var(--aurora-3)]/10 border-[var(--aurora-3)]/30 text-[var(--aurora-3)]'
                    : 'bg-[var(--success)]/10 border-[var(--success)]/30 text-[var(--success)]'
                }`}>
                  {s.master_shifts?.is_cross_day ? <Moon size={10}/> : <span>☀️</span>}
                  {s.master_shifts?.shift_code}: {s.master_shifts?.shift_name}
                </div>
                {s.master_shifts?.time_in && (
                  <p className="text-[10px] text-gray-500 mt-1">
                    {s.master_shifts.time_in.substring(0,5)} → {s.master_shifts.time_out.substring(0,5)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GlobalShiftView;
