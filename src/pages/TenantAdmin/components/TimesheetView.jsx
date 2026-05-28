/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarRange, Download, FileText, CheckCircle2, Loader2, Users, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

const TimesheetView = () => {
  const [tenantId, setTenantId] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [timesheetData, setTimesheetData] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const toast = useToast();

  useEffect(() => { init(); }, []);

  const init = async () => {
    const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!profile?.tenant_id && !isGod) return;
    if (profile?.tenant_id) setTenantId(profile.tenant_id);
    const tid = profile?.tenant_id;

    let qp = supabase.from('payroll_periods').select('*');
    if (tid) qp = qp.eq('tenant_id', tid);
    qp = qp.order('period_year', { ascending: false }).order('period_month', { ascending: false });
    const { data: pers } = await qp;
    if (pers) setPeriods(pers);

    let qe = supabase.from('profiles').select('id, full_name, nip, position');
    if (tid) qe = qe.eq('tenant_id', tid);
    qe = qe.in('role', ['EMPLOYEE', 'SUB_ADMIN']);
    const { data: emps } = await qe;
    if (emps) setProfiles(emps);
  };

  const loadTimesheet = async (period) => {
    setSelectedPeriod(period);
    setLoading(true);
    try {
      const { data: logs } = await supabase.from('attendance_logs')
        .select('user_id, action, status, timestamp')
        .eq('tenant_id', tenantId)
        .gte('timestamp', period.start_date + 'T00:00:00Z')
        .lte('timestamp', period.end_date + 'T23:59:59Z')
        .order('timestamp', { ascending: true });

      const logsByUser = {};
      (logs || []).forEach(log => {
        if (!logsByUser[log.user_id]) logsByUser[log.user_id] = [];
        logsByUser[log.user_id].push(log);
      });

      const result = profiles.map(emp => {
        const empLogs = logsByUser[emp.id] || [];

        const datesMap = {};
        empLogs.forEach(log => {
          const date = log.timestamp?.split('T')[0];
          if (!datesMap[date]) datesMap[date] = { date, clockIn: null, clockOut: null, status: [] };
          if (log.action === 'CLOCK_IN') datesMap[date].clockIn = log.timestamp;
          if (log.action === 'CLOCK_OUT') datesMap[date].clockOut = log.timestamp;
          datesMap[date].status.push(log.status);
        });

        const daily = Object.values(datesMap).sort((a, b) => a.date.localeCompare(b.date));
        let totalWorkMinutes = 0;
        let totalOvertimeMinutes = 0;
        daily.forEach(d => {
          if (d.clockIn && d.clockOut) {
            const diff = (new Date(d.clockOut) - new Date(d.clockIn)) / 60000;
            totalWorkMinutes += diff;
            if (diff > 480) totalOvertimeMinutes += diff - 480;
          }
        });

        return {
          ...emp,
          daily,
          totalDays: daily.length,
          totalHours: Math.round(totalWorkMinutes / 60 * 100) / 100,
          totalOvertime: Math.round(totalOvertimeMinutes / 60 * 100) / 100,
          lateCount: daily.filter(d => d.status.includes('LATE')).length,
        };
      });

      setTimesheetData(result);
    } catch (e) {
      console.error('Timesheet error:', e);
      toast('Gagal memuat timesheet', 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    setExporting(true);
    try {
      let csv = 'Karyawan,NIP,Posisi,Total Hari,Masuk,Telat,Total Jam,Jam Lembur\n';
      timesheetData.forEach(emp => {
        csv += `"${emp.full_name}","${emp.nip || ''}","${emp.position || ''}",${emp.totalDays},${emp.daily.filter(d => d.clockIn).length},${emp.lateCount},${emp.totalHours},${emp.totalOvertime}\n`;
      });
      csv += '\n\nTanggal,Karyawan,Jam Masuk,Jam Keluar,Total Jam,Status\n';
      timesheetData.forEach(emp => {
        emp.daily.forEach(d => {
          const mins = d.clockIn && d.clockOut ? Math.round((new Date(d.clockOut) - new Date(d.clockIn)) / 60000) : 0;
          csv += `"${d.date}","${emp.full_name}","${d.clockIn ? new Date(d.clockIn).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'}) : '-'}","${d.clockOut ? new Date(d.clockOut).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'}) : '-'}",${mins},"${d.status.join(', ')}"\n`;
        });
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timesheet_${selectedPeriod?.start_date}_${selectedPeriod?.end_date}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast('CSV timesheet diunduh', 'success');
    } catch (e) {
      toast('Gagal export CSV', 'error');
    } finally {
      setExporting(false);
    }
  };

  const printTimesheet = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const rows = timesheetData.flatMap(emp =>
      emp.daily.map(d => {
        const mins = d.clockIn && d.clockOut ? Math.round((new Date(d.clockOut) - new Date(d.clockIn)) / 60000) : 0;
        return `<tr>
          <td class="p-2 border">${emp.full_name}</td>
          <td class="p-2 border">${d.date}</td>
          <td class="p-2 border">${d.clockIn ? new Date(d.clockIn).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'}) : '-'}</td>
          <td class="p-2 border">${d.clockOut ? new Date(d.clockOut).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'}) : '-'}</td>
          <td class="p-2 border text-right">${mins}</td>
          <td class="p-2 border">${d.status.join(', ')}</td>
        </tr>`;
      }).join('')
    );
    w.document.write(`<html><head><title>Timesheet</title><style>body{font-family:sans-serif;margin:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#f5f5f5}h2{margin-bottom:4px}.text-right{text-align:right}</style></head><body>
      <h2>Timesheet — ${selectedPeriod?.start_date} s.d ${selectedPeriod?.end_date}</h2>
      <p style="color:#666;margin-bottom:16px">Total Karyawan: ${timesheetData.length} | Total Hari: ${timesheetData.reduce((s,e) => s + e.totalDays, 0)}</p>
      <table><thead><tr><th>Karyawan</th><th>Tanggal</th><th>Masuk</th><th>Keluar</th><th>Menit</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
      <p style="margin-top:16px;color:#999;font-size:11px">Dicetak dari SI PRESENSI PRO MAX — Timesheet View</p>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const getPeriodLabel = (p) => {
    if (p.period_type === 'custom') return p.label || `${p.start_date} s.d ${p.end_date}`;
    return `${MONTHS[p.period_month - 1]} ${p.period_year}`;
  };

  return (
    <div className="glass-panel p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-6 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">Timesheet Karyawan</h2>
          <p className="text-sm text-gray-400 mt-1">Rekapitulasi absensi harian per periode</p>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2">Pilih Periode Payroll</label>
        <div className="flex flex-wrap gap-2">
          {periods.map(p => (
            <button
              key={p.id}
              onClick={() => loadTimesheet(p)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${selectedPeriod?.id === p.id ? 'bg-[var(--aurora-3)]/20 border-[var(--aurora-3)] text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
            >
              {getPeriodLabel(p)}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-[var(--aurora-3)]" />
        </div>
      )}

      {selectedPeriod && !loading && timesheetData.length > 0 && (
        <>
          <div className="flex flex-wrap gap-3 mb-6">
            <button onClick={exportCSV} disabled={exporting} className="px-4 py-2.5 rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/30 text-[var(--success)] text-[10px] font-bold flex items-center gap-2 whitespace-nowrap">
              <Download size={14} /> Export CSV
            </button>
            <button onClick={printTimesheet} className="px-4 py-2.5 rounded-xl bg-[var(--aurora-3)]/10 border border-[var(--aurora-3)]/30 text-[var(--aurora-3)] text-[10px] font-bold flex items-center gap-2 whitespace-nowrap">
              <FileText size={14} /> Cetak / PDF
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 text-center">
              <Users size={20} className="mx-auto text-[var(--aurora-3)] mb-2" />
              <p className="text-2xl font-bold text-white">{timesheetData.length}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Karyawan</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 text-center">
              <CalendarRange size={20} className="mx-auto text-[var(--aurora-1)] mb-2" />
              <p className="text-2xl font-bold text-white">{timesheetData.reduce((s,e) => s + e.totalDays, 0)}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Total Hari</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 text-center">
              <Clock size={20} className="mx-auto text-[var(--success)] mb-2" />
              <p className="text-2xl font-bold text-white">{timesheetData.reduce((s,e) => s + e.totalHours, 0).toFixed(1)}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Total Jam</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 text-center">
              <AlertCircle size={20} className="mx-auto text-[var(--warning)] mb-2" />
              <p className="text-2xl font-bold text-white">{timesheetData.reduce((s,e) => s + e.lateCount, 0)}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Telat</p>
            </div>
          </div>

          {/* Per-employee accordion */}
          <div className="space-y-3">
            {timesheetData.map(emp => (
              <details key={emp.id} className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden group">
                <summary className="p-4 cursor-pointer hover:bg-white/[0.02] transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center text-white font-bold text-sm">
                      {emp.full_name?.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-sm">{emp.full_name}</h4>
                      <p className="text-[10px] text-gray-500">{emp.nip || emp.position || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>{emp.totalDays} hari</span>
                    <span className="text-[var(--aurora-3)]">{emp.totalHours} jam</span>
                    {emp.lateCount > 0 && <span className="text-[var(--warning)]">{emp.lateCount}x telat</span>}
                  </div>
                </summary>
                <div className="overflow-x-auto border-t border-white/5">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-white/5 text-gray-500 uppercase tracking-widest">
                      <tr>
                        <th className="p-3 font-bold">Tanggal</th>
                        <th className="p-3 font-bold">Jam Masuk</th>
                        <th className="p-3 font-bold">Jam Keluar</th>
                        <th className="p-3 font-bold text-right">Total (menit)</th>
                        <th className="p-3 font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {emp.daily.map(d => {
                        const mins = d.clockIn && d.clockOut ? Math.round((new Date(d.clockOut) - new Date(d.clockIn)) / 60000) : 0;
                        return (
                          <tr key={d.date} className="hover:bg-white/[0.02]">
                            <td className="p-3 text-white font-medium">{d.date}</td>
                            <td className="p-3 text-gray-400">{d.clockIn ? new Date(d.clockIn).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'}) : <span className="text-[var(--danger)]">—</span>}</td>
                            <td className="p-3 text-gray-400">{d.clockOut ? new Date(d.clockOut).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'}) : <span className="text-[var(--danger)]">—</span>}</td>
                            <td className="p-3 text-right font-mono text-white font-bold">{mins}</td>
                            <td className="p-3">
                              {d.status.includes('LATE') ? <span className="text-[var(--warning)] text-[10px] font-bold">TELAT</span> : d.clockIn ? <span className="text-[var(--success)] text-[10px] font-bold">HADIR</span> : <span className="text-[var(--danger)] text-[10px] font-bold">TIDAK ABSEN</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
            ))}
          </div>
        </>
      )}

      {selectedPeriod && !loading && timesheetData.length === 0 && (
        <div className="text-center py-16">
          <AlertCircle size={40} className="mx-auto text-gray-500 mb-4" />
          <p className="text-gray-400">Tidak ada data absensi untuk periode ini</p>
        </div>
      )}
    </div>
  );
};

export default TimesheetView;
