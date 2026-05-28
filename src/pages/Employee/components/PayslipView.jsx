/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, ChevronDown, ChevronUp, DollarSign, Percent, FileText, Printer, ArrowLeft } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const monthName = (month) => MONTHS[Number(month) - 1] || '-';
const escapeHtml = (value) => String(value ?? '-')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const PayslipView = ({ onBack }) => {
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [summary, setSummary] = useState(null);
  const [details, setDetails] = useState([]);
  const [profile, setProfile] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: prof } = await supabase.from('profiles').select('*, projects(name), divisions(name)').eq('auth_id', session.user.id).maybeSingle();
      if (prof) setProfile(prof);

      const { data: pers } = await supabase.from('payroll_periods').select('*').in('status', ['LOCKED', 'PAID']).eq('tenant_id', prof?.tenant_id).order('period_year', { ascending: false }).order('period_month', { ascending: false });
      if (pers) setPeriods(pers);

      if (pers?.length) {
        setSelectedPeriod(pers[0]);
        fetchPayslip(pers[0], prof?.id);
      }
    } catch (e) { console.error('Fetch error:', e); }
  };

  const fetchPayslip = async (period, userId) => {
    try {
      if (!userId) return;
      const { data: sum } = await supabase.from('payroll_summary').select('*').eq('period_id', period.id).eq('user_id', userId).maybeSingle();
      if (sum) setSummary(sum);

      const { data: res } = await supabase.from('payroll_results').select('*').eq('period_id', period.id).eq('user_id', userId).order('component_type');
      if (res) setDetails(res);
    } catch (e) { console.error('Payslip fetch error:', e); }
  };

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    fetchPayslip(period, profile?.id);
  };

  const handleDownload = () => {
    if (!summary || !selectedPeriod || !profile) return;
    const lines = [
      `SLIP GAJI ${profile.full_name}`,
      `Periode: ${monthName(selectedPeriod.period_month)} ${selectedPeriod.period_year}`,
      `NIP: ${profile.nip} | ${profile.position || '-'}`,
      `Project: ${profile.projects?.name || '-'} | Divisi: ${profile.divisions?.name || '-'}`,
      '',
      '--- RINCIAN PENGHASILAN ---',
      ...details.filter(d => d.component_type === 'ALLOWANCE').map(d => `${d.component_code} - ${d.component_name}: Rp ${Number(d.amount).toLocaleString()}`),
      '',
      '--- RINCIAN POTONGAN ---',
      ...details.filter(d => d.component_type === 'DEDUCTION').map(d => `${d.component_code} - ${d.component_name}: Rp ${Number(d.amount).toLocaleString()}`),
      '',
      `Total Tunjangan: Rp ${Number(summary.total_allowance).toLocaleString()}`,
      `Total Potongan: Rp ${Number(summary.total_deduction).toLocaleString()}`,
      `TAKE HOME PAY: Rp ${Number(summary.take_home_pay).toLocaleString()}`,
      '',
      `Kehadiran: ${summary.total_days_worked} hari | Lembur: ${summary.total_overtime_hours} jam | Terlambat: ${summary.total_late_minutes} menit`,
      '',
      '— SI PRESENSI PRO MAX —'
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Slip_Gaji_${profile.nip}_${selectedPeriod.period_month}_${selectedPeriod.period_year}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Slip gaji diunduh', 'success');
  };

  const handlePrint = () => {
    if (!summary || !selectedPeriod || !profile) return;
    const w = window.open('', '_blank');
    if (!w) {
      toast('Gagal membuka jendela cetak. Pastikan pop-up diizinkan.', 'error');
      return;
    }
    const allowances = details.filter(d => d.component_type === 'ALLOWANCE');
    const deductions = details.filter(d => d.component_type === 'DEDUCTION');
    const periodLabel = `${monthName(selectedPeriod.period_month)} ${selectedPeriod.period_year}`;

    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Slip Gaji</title>
        <style>
          @page { margin: 15mm; size: A4 portrait; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #222; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 2px; }
          .header p { margin: 3px 0; color: #666; font-size: 11px; }
          .info { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; }
          .info div { flex: 1; }
          .info label { color: #888; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 12px; }
          th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #f5f5f5; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 1px; }
          .amount { text-align: right; font-family: 'Courier New', monospace; }
          .total-row { font-weight: bold; border-top: 2px solid #333; }
          .total-row td { padding-top: 10px; }
          .grand-total { text-align: center; margin-top: 25px; padding: 15px; background: #f8f8f8; border-radius: 8px; }
          .grand-total h2 { margin: 0; font-size: 24px; color: #1a73e8; }
          .grand-total p { margin: 3px 0; color: #666; font-size: 11px; }
          .footer { text-align: center; margin-top: 30px; font-size: 9px; color: #aaa; border-top: 1px solid #eee; padding-top: 10px; }
          .badge { display: inline-block; background: #e8f0fe; color: #1a73e8; padding: 2px 8px; border-radius: 3px; font-size: 9px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Slip Gaji</h1>
          <p id="period-label"></p>
        </div>
        <div class="info">
          <div><label>Nama:</label> <span id="info-nama"></span></div>
          <div><label>NIP:</label> <span id="info-nip"></span></div>
          <div><label>Posisi:</label> <span id="info-posisi"></span></div>
          <div><label>Project:</label> <span id="info-project"></span></div>
        </div>
        <table id="allowances-table">
          <thead>
            <tr><th>Kode</th><th>Komponen</th><th class="amount">Jumlah</th></tr>
          </thead>
          <tbody></tbody>
        </table>
        <table id="deductions-table">
          <thead>
            <tr><th>Kode</th><th>Potongan</th><th class="amount">Jumlah</th></tr>
          </thead>
          <tbody></tbody>
        </table>
        <table>
          <tbody>
            <tr>
              <td><strong>Total Tunjangan</strong></td>
              <td class="amount" id="total-allowance"></td>
            </tr>
            <tr>
              <td><strong>Total Potongan</strong></td>
              <td class="amount" id="total-deduction"></td>
            </tr>
            <tr class="total-row">
              <td><strong>TAKE HOME PAY</strong></td>
              <td class="amount" style="color:#1a73e8;font-size:16px;" id="take-home-pay"></td>
            </tr>
          </tbody>
        </table>
        <div class="grand-total">
          <p>Take Home Pay</p>
          <h2 id="grand-take-home-pay"></h2>
          <p id="grand-summary"></p>
        </div>
        <div class="footer" id="footer-text"></div>
      </body>
      </html>
    `);

    w.document.title = `Slip Gaji ${profile.nip} ${periodLabel}`;
    w.document.getElementById('period-label').textContent = periodLabel;
    w.document.getElementById('info-nama').textContent = profile.full_name;
    w.document.getElementById('info-nip').textContent = profile.nip;
    w.document.getElementById('info-posisi').textContent = profile.position || '-';
    w.document.getElementById('info-project').textContent = profile.projects?.name || '-';

    const allowancesBody = w.document.querySelector('#allowances-table tbody');
    allowances.forEach(d => {
      const tr = w.document.createElement('tr');
      const tdBadge = w.document.createElement('td');
      const badge = w.document.createElement('span');
      badge.className = 'badge';
      badge.textContent = d.component_code;
      tdBadge.appendChild(badge);

      const tdName = w.document.createElement('td');
      tdName.textContent = d.component_name;

      const tdAmount = w.document.createElement('td');
      tdAmount.className = 'amount';
      tdAmount.textContent = `Rp ${Number(d.amount).toLocaleString()}`;

      tr.appendChild(tdBadge);
      tr.appendChild(tdName);
      tr.appendChild(tdAmount);
      allowancesBody.appendChild(tr);
    });

    const deductionsBody = w.document.querySelector('#deductions-table tbody');
    deductions.forEach(d => {
      const tr = w.document.createElement('tr');
      const tdBadge = w.document.createElement('td');
      const badge = w.document.createElement('span');
      badge.className = 'badge';
      badge.textContent = d.component_code;
      tdBadge.appendChild(badge);

      const tdName = w.document.createElement('td');
      tdName.textContent = d.component_name;

      const tdAmount = w.document.createElement('td');
      tdAmount.className = 'amount';
      tdAmount.textContent = `Rp ${Number(d.amount).toLocaleString()}`;

      tr.appendChild(tdBadge);
      tr.appendChild(tdName);
      tr.appendChild(tdAmount);
      deductionsBody.appendChild(tr);
    });

    w.document.getElementById('total-allowance').textContent = `Rp ${Number(summary.total_allowance).toLocaleString()}`;
    w.document.getElementById('total-deduction').textContent = `Rp ${Number(summary.total_deduction).toLocaleString()}`;
    w.document.getElementById('take-home-pay').textContent = `Rp ${Number(summary.take_home_pay).toLocaleString()}`;
    w.document.getElementById('grand-take-home-pay').textContent = `Rp ${Number(summary.take_home_pay).toLocaleString()}`;
    w.document.getElementById('grand-summary').textContent = `Kehadiran: ${summary.total_days_worked} hari • Lembur: ${summary.total_overtime_hours} jam • Terlambat: ${summary.total_late_minutes} menit`;
    w.document.getElementById('footer-text').textContent = `SI PRESENSI PRO MAX — Dokumen ini digenerate secara otomatis pada ${new Date().toLocaleDateString('id-ID')}`;

    const script = w.document.createElement('script');
    script.textContent = "window.onload = function() { window.print(); window.close(); }";
    w.document.body.appendChild(script);

    w.document.close();
  };

  const allowances = details.filter(d => d.component_type === 'ALLOWANCE');
  const deductions = details.filter(d => d.component_type === 'DEDUCTION');

  if (!periods.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
          <FileText size={32} className="text-gray-500" />
        </div>
        <p className="text-gray-500 text-sm">Belum ada slip gaji tersedia</p>
        <p className="text-gray-600 text-[10px] mt-1">HR akan memproses payroll setiap periode</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6 pb-8">
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors w-fit mb-2">
          <ArrowLeft size={18} /> Kembali
        </button>
      )}
      <div className="glass-panel p-6 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--aurora-1)]/10 to-transparent rounded-full blur-2xl" />
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center mx-auto mb-4 shadow-lg">
          <DollarSign size={24} className="text-white" />
        </div>
        <h2 className="text-xl font-serif font-bold text-white">Slip Gaji</h2>
        <p className="text-xs text-gray-400 mt-1">{profile?.full_name} • {profile?.nip}</p>

        <select value={selectedPeriod?.id} onChange={e => handlePeriodChange(periods.find(p => p.id === e.target.value))}
          className="mt-4 bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-3)] w-full">
          {periods.map(p => (
            <option key={p.id} value={p.id}>{monthName(p.period_month)} {p.period_year} — {p.status}</option>
          ))}
        </select>
      </div>

      {summary && (
        <>
          <div className="glass-panel p-6 border border-[var(--aurora-3)]/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-[var(--aurora-3)]/5 rounded-full blur-3xl" />
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">Take Home Pay</p>
            <p className="text-4xl font-bold text-white font-mono tracking-tight">Rp {Number(summary.take_home_pay).toLocaleString()}</p>
            <div className="flex gap-6 mt-4 text-xs text-gray-400">
              <span>Tunjangan: <span className="text-[var(--success)] font-bold">Rp {Number(summary.total_allowance).toLocaleString()}</span></span>
              <span>Potongan: <span className="text-[var(--danger)] font-bold">Rp {Number(summary.total_deduction).toLocaleString()}</span></span>
            </div>
          </div>

          <button onClick={() => setExpanded(!expanded)} className="glass-panel p-4 flex items-center justify-between hover:bg-white/[0.03] transition-all">
            <span className="text-sm font-bold text-white">Rincian Komponen</span>
            {expanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
          </button>

          {expanded && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
              {allowances.length > 0 && (
                <div className="glass-panel p-5">
                  <h4 className="text-xs font-bold text-[var(--success)] uppercase tracking-widest mb-3">Tunjangan</h4>
                  {allowances.map(d => (
                    <div key={d.id} className="flex justify-between py-2 border-b border-white/5 last:border-0">
                      <span className="text-sm text-gray-300">{d.component_code} — {d.component_name}</span>
                      <span className="text-sm font-mono font-bold text-white">Rp {Number(d.amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
              {deductions.length > 0 && (
                <div className="glass-panel p-5">
                  <h4 className="text-xs font-bold text-[var(--danger)] uppercase tracking-widest mb-3">Potongan</h4>
                  {deductions.map(d => (
                    <div key={d.id} className="flex justify-between py-2 border-b border-white/5 last:border-0">
                      <span className="text-sm text-gray-300">{d.component_code} — {d.component_name}</span>
                      <span className="text-sm font-mono font-bold text-[var(--danger)]">Rp {Number(d.amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          <div className="glass-panel p-5">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Ringkasan Kehadiran</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-white">{summary.total_days_worked}</p>
                <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Hari Kerja</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-white">{summary.total_overtime_hours}</p>
                <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Jam Lembur</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-[var(--warning)]">{summary.total_late_minutes}</p>
                <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Menit Terlambat</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-[var(--danger)]">{summary.total_absence_days}</p>
                <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Absen Tidak Hadir</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handlePrint} className="flex-1 py-4 rounded-2xl bg-white/10 text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 border border-white/10 hover:bg-white/20 transition-all">
              <Printer size={16} /> Cetak / PDF
            </button>
            <button onClick={handleDownload} className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg hover:shadow-purple-500/30 transition-all">
              <Download size={16} /> Download TXT
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
};

export default PayslipView;
