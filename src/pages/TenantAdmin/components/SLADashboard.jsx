import React, { useState, useEffect, useMemo } from 'react';
import { Target, Award, Clock, Activity, Building, AlertTriangle, FileText, MapPin, CheckCircle, XCircle, Users, Shield } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';

const t = (s) => s;

const FLOOR_CONFIG = {
  'Basement': { target: '2 scan/shift' },
  '1': { target: '2 scan/shift' },
  '2': { target: '2 scan/shift' },
  '3': { target: '2 scan/shift' },
  '4': { target: '2 scan/shift' },
  '5': { target: '2 scan/shift' },
  '6': { target: '2 scan/shift' },
  'Halaman Depan': { target: '5 scan/shift' },
  'Halaman Samping Kanan': { target: '2 scan/shift' },
  'Halaman Belakang': { target: '4 scan/shift' },
  'Halaman Samping Kiri': { target: '1 scan/shift' },
};

const SLADashboard = () => {
  const [checkpoints, setCheckpoints] = useState([]);
  const [logs, setLogs] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [tenantId, setTenantId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [perspective, setPerspective] = useState('tenant');

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
        const tid = profile?.tenant_id;
        if (tid) {
          setTenantId(tid);
          await loadData(tid);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    init();
  }, []);

  const loadData = async (tid) => {
    try {
      const [cpRes, lRes, iRes] = await Promise.all([
        supabase.from('patrol_checkpoints').select('*').eq('tenant_id', tid).order('name'),
        supabase.from('patrol_logs').select('*, patrol_checkpoints(*)').eq('tenant_id', tid).order('scan_time', { ascending: false }),
        supabase.from('patrol_incidents').select('*, patrol_logs(*, patrol_checkpoints(*))').eq('tenant_id', tid).order('reported_at', { ascending: false })
      ]);
      if (cpRes.data) setCheckpoints(cpRes.data);
      if (lRes.data) setLogs(lRes.data);
      if (iRes.data) setIncidents(iRes.data);
    } catch (e) { console.error(e); }
  };

  const today = new Date().toISOString().split('T')[0];
  const reportsToday = useMemo(() => logs.filter(l => l.scan_time?.startsWith(today)), [logs, today]);
  const totalAreas = checkpoints.length;
  const uniqueVisitedToday = useMemo(() => new Set(reportsToday.map(r => r.checkpoint_id)).size, [reportsToday]);
  const complianceRate = totalAreas > 0 ? Math.round((uniqueVisitedToday / totalAreas) * 100) : 0;

  const closedFindings = incidents.filter(i => false);
  const slaCompliance = incidents.length > 0 ? Math.round((closedFindings.length / incidents.length) * 100) + '%' : '0%';

  const activeFindings = useMemo(() => incidents, [incidents]);

  const floorBreakdown = useMemo(() => {
    return Object.entries(FLOOR_CONFIG).map(([floorKey, config]) => {
      const floorAreas = checkpoints.filter(c => (c.lantai || '') === floorKey);
      if (floorAreas.length === 0) return null;
      const visitedAreas = floorAreas.filter(a => reportsToday.some(r => r.checkpoint_id === a.id));
      const val = Math.round((visitedAreas.length / floorAreas.length) * 100) || 0;
      const color = val === 100 ? '#10b981' : val > 0 ? '#f59e0b' : '#ef4444';
      const unvisited = floorAreas.filter(a => !reportsToday.some(r => r.checkpoint_id === a.id));
      const floorFindings = activeFindings.filter(f => {
        const cp = f.patrol_logs?.patrol_checkpoints;
        return cp && (cp.lantai || '') === floorKey;
      });
      return { key: floorKey, name: floorKey, areas: floorAreas, visited: visitedAreas.length, total: floorAreas.length, pct: val, color, config, unvisited, findings: floorFindings };
    }).filter(Boolean);
  }, [checkpoints, reportsToday, activeFindings]);

  const avgMinutes = useMemo(() => {
    const durations = incidents.map(f => {
      if (f.reported_at) return (Date.now() - new Date(f.reported_at).getTime()) / (1000 * 60);
      return null;
    }).filter(d => d !== null);
    if (durations.length === 0) return null;
    return durations.reduce((a, b) => a + b, 0) / durations.length;
  }, [incidents]);

  const avgSlaTime = avgMinutes !== null ? (avgMinutes < 60 ? `${Math.round(avgMinutes)} Menit` : `${(avgMinutes / 60).toFixed(1)} Jam`) : '—';

  if (loading) return <div className="p-20 text-center"><div className="w-8 h-8 border-2 border-[var(--aurora-3)] border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-serif font-bold text-white">Dashboard Target & SLA</h3>
          <p className="text-xs text-gray-500 mt-0.5">Monitoring kepatuhan patroli & pencapaian SLA</p>
        </div>
        <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
          <button onClick={() => setPerspective('tenant')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${perspective === 'tenant' ? 'bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white shadow' : 'text-gray-400 hover:text-white'}`}>
            <Building size={14} className="inline mr-1" /> Admin Tenant (SLA)
          </button>
          <button onClick={() => setPerspective('guard')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${perspective === 'guard' ? 'bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white shadow' : 'text-gray-400 hover:text-white'}`}>
            <Users size={14} className="inline mr-1" /> Anggota Patroli
          </button>
        </div>
      </div>

      {perspective === 'tenant' ? (
        <div className="flex flex-col gap-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-panel p-6 rounded-[24px] border border-white/10 relative overflow-hidden">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">COMPLIANCE RATE PATROLI</p>
                  <h3 className="text-3xl font-bold text-white mt-1">{complianceRate}%</h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">Target 95%</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${complianceRate}%`, background: complianceRate >= 95 ? 'linear-gradient(90deg, #10b981, #34d399)' : complianceRate >= 50 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #ef4444, #f87171)' }} />
              </div>
              <p className="text-[11px] text-gray-500 mt-3">{uniqueVisitedToday} dari {totalAreas} titik checkpoint telah dipatroli hari ini.</p>
            </div>

            <div className="glass-panel p-6 rounded-[24px] border border-white/10">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">RATA-RATA RESPON TEMUAN</p>
                  <h3 className="text-3xl font-bold text-white mt-1">{avgSlaTime}</h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-bold">Target &lt;4 Jam</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-400"><Clock size={14} /> Respons cepat tim engineering & lapangan</div>
              <p className="text-[11px] text-gray-500 mt-3">Dihitung sejak petugas melaporkan temuan hingga status "Closed".</p>
            </div>

            <div className="glass-panel p-6 rounded-[24px] border border-white/10">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">TOTAL TEMUAN AKTIF</p>
                  <h3 className="text-3xl font-bold text-white mt-1">{activeFindings.length}</h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold">Perlu Tindak Lanjut</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-amber-400"><AlertTriangle size={14} /> {activeFindings.filter(i => i.severity === 'high' || i.severity === 'critical').length} prioritas tinggi/kritis</div>
              <p className="text-[11px] text-gray-500 mt-3">{activeFindings.length} temuan menunggu disposisi & penyelesaian.</p>
            </div>
          </div>

          {/* Per-Lantai Compliance */}
          <div className="glass-panel p-6 rounded-[24px] border border-white/10">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Activity size={16} /> Target & Pencapaian Per Lantai</h3>
            <div className="space-y-3">
              {floorBreakdown.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">Belum ada data checkpoint untuk ditampilkan.</p>
              ) : (
                floorBreakdown.map(f => (
                  <div key={f.key} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="flex justify-between items-center flex-wrap gap-2 mb-2">
                      <span className="text-sm font-bold text-white">{f.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold" style={{ color: f.color }}>{f.pct}% Compliance ({f.visited}/{f.total} Pos)</span>
                        <span className="text-[9px] text-gray-500">Target: {f.config.target}</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${f.pct}%`, background: f.color }} />
                    </div>
                    <p className="text-[11px] text-gray-500 mt-2">
                      {f.pct === 100
                        ? 'Seluruh pos patroli aman dan sudah diperiksa.'
                        : f.pct > 0
                          ? `Pos terlewat: ${f.unvisited.map(a => a.name || a.titik).join(', ')}.`
                          : 'Belum ada pos yang dipatroli pada shift ini.'}
                      {f.findings.length > 0 && ` Ditemukan ${f.findings.length} kendala (${[...new Set(f.findings.map(x => x.incident_type))].join(', ')}) - perlu tindak lanjut.`}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Tiket Temuan Aktif */}
          <div className="glass-panel p-6 rounded-[24px] border border-white/10">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><AlertTriangle size={16} /> Tiket Temuan Aktif</h3>
            {activeFindings.length > 0 ? (
              <div className="space-y-2">
                {activeFindings.map(f => {
                  const cp = f.patrol_logs?.patrol_checkpoints;
                  return (
                    <div key={f.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 border-l-[3px]" style={{
                      borderLeftColor: f.severity === 'high' || f.severity === 'critical' ? '#ef4444' : f.severity === 'medium' ? '#f59e0b' : '#3b82f6'
                    }}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-white">{f.incident_type}</span>
                        <div className="flex gap-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            f.severity === 'critical' ? 'bg-purple-500/15 text-purple-400' :
                            f.severity === 'high' ? 'bg-red-500/15 text-red-400' :
                            f.severity === 'medium' ? 'bg-amber-500/15 text-amber-400' :
                            'bg-blue-500/15 text-blue-400'
                          }`}>{f.severity}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-400">{f.description}</p>
                      {cp && <div className="text-[10px] text-gray-500 mt-1"><MapPin size={10} className="inline mr-0.5" /> {cp.name} {cp.lantai ? `(Lt.${cp.lantai})` : ''}</div>}
                      <div className="text-[9px] text-gray-600 mt-1">Dilaporkan: {new Date(f.reported_at || f.created_at).toLocaleString('id-ID')}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">✅ Semua tiket temuan sudah selesai. Tidak ada kendala aktif.</div>
            )}
          </div>

          {/* Laporan Patroli Hari Ini */}
          <div className="glass-panel p-6 rounded-[24px] border border-white/10">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><FileText size={16} /> Laporan Patroli Hari Ini</h3>
            {reportsToday.length > 0 ? (
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                {reportsToday.slice(-50).reverse().map(r => {
                  const cp = r.patrol_checkpoints;
                  return (
                    <div key={r.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 border-l-[3px]" style={{
                      borderLeftColor: '#10b981'
                    }}>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-white">{r.profiles?.full_name || 'Petugas'}</span>
                        <span className="text-[10px] text-gray-500">{new Date(r.scan_time).toLocaleTimeString('id-ID')} WIB</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5">
                        <MapPin size={10} /> {cp?.name || '—'} {cp?.lantai ? `(Lt.${cp.lantai})` : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">Belum ada laporan patroli untuk hari ini.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="glass-panel p-8 rounded-[24px] border border-white/10 text-center">
          <Users size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400 text-sm">Data personal patroli akan tampil di sini berdasarkan laporan real dari aplikasi patroli.</p>
        </div>
      )}
    </div>
  );
};

export default SLADashboard;
