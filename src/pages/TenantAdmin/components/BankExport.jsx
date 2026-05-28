import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Building2, Copy, CheckCircle2, DollarSign } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const monthName = (month) => MONTHS[Number(month) - 1] || '-';

const BANK_FORMATS = {
  BCA: { name: 'Bank BCA (BDI)', desc: 'Format BCA Data Import' },
  MANDIRI: { name: 'Bank Mandiri (CSV)', desc: 'Format Mandiri CSV' },
  BSI: { name: 'Bank BSI (CSV)', desc: 'Format BSI CSV' },
};

const BankExport = () => {
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [summaries, setSummaries] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [bankFormat, setBankFormat] = useState('BCA');
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  useEffect(() => { fetchPeriods(); }, []);

  const fetchPeriods = async () => {
    const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: p } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!p?.tenant_id && !isGod) return;

    let q1 = supabase.from('payroll_periods').select('*');
    if (p?.tenant_id) q1 = q1.eq('tenant_id', p.tenant_id);
    q1 = q1.in('status', ['LOCKED', 'PAID']).order('period_year', { ascending: false }).order('period_month', { ascending: false });
    const { data: pers } = await q1;
    if (pers) setPeriods(pers);

    let q2 = supabase.from('profiles').select('id, full_name, nip');
    if (p?.tenant_id) q2 = q2.eq('tenant_id', p.tenant_id);
    const { data: emps } = await q2;
    const pmap = {};
    (emps || []).forEach(e => pmap[e.id] = e);
    setProfiles(pmap);
  };

  const loadPeriod = async (periodId) => {
    const p = periods.find(x => x.id === periodId);
    setSelectedPeriod(p);
    if (!p) return;

    let summaryQuery = supabase.from('payroll_summary').select('*, employee_hris_data!user_id(bank_name, bank_account_number, bank_account_name)').eq('period_id', periodId);
    if (p.tenant_id) summaryQuery = summaryQuery.eq('tenant_id', p.tenant_id);
    const { data: s } = await summaryQuery;
    if (s) setSummaries(s);
  };

  const generateBankData = () => {
    const format = bankFormat;
    const lines = [];

    for (const s of summaries) {
      if (s.take_home_pay <= 0) continue;
      const emp = profiles[s.user_id];
      const bankName = s.employee_hris_data?.bank_name || '';
      const bankAccount = s.employee_hris_data?.bank_account_number || '';
      const accountName = s.employee_hris_data?.bank_account_name || emp?.full_name || '';

      if (!bankAccount) continue;

      if (format === 'BCA') {
        lines.push(`${bankAccount.padStart(10, '0')}${String(Math.round(s.take_home_pay)).padStart(10, '0')}${accountName.substring(0, 20).padEnd(20, ' ')}${(emp?.nip || '').padEnd(10, ' ')}`);
      } else if (format === 'MANDIRI') {
        lines.push(`${bankAccount},${Math.round(s.take_home_pay)},${accountName},${emp?.full_name || ''},${emp?.nip || ''}`);
      } else if (format === 'BSI') {
        lines.push(`${bankAccount};${Math.round(s.take_home_pay)};${accountName};${emp?.full_name || ''}`);
      }
    }
    return lines.join('\n');
  };

  const handleCopy = async () => {
    const data = generateBankData();
    if (!data) { toast('Tidak ada data untuk diekspor', 'error'); return; }
    try {
      await navigator.clipboard.writeText(data);
      setCopied(true);
      toast('Data bank berhasil disalin!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch { toast('Gagal menyalin', 'error'); }
  };

  const handleDownload = () => {
    const data = generateBankData();
    if (!data) { toast('Tidak ada data untuk diekspor', 'error'); return; }
    const ext = bankFormat === 'BCA' ? 'txt' : 'csv';
    const blob = new Blob([data], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const month = selectedPeriod ? `${selectedPeriod.period_month}_${selectedPeriod.period_year}` : 'export';
    a.download = `Payroll_${bankFormat}_${month}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast('File bank diunduh', 'success');
  };

  const totalTransfer = summaries.reduce((s, r) => s + Number(r.take_home_pay), 0);
  const validCount = summaries.filter(s => {
    const emp = profiles[s.user_id];
    const bankAcc = s.employee_hris_data?.bank_account_number || s.employee_hris_data?.bank_account_number;
    return s.take_home_pay > 0 && bankAcc;
  }).length;

  return (
    <div className="glass-panel p-4 sm:p-6 lg:p-8">
      <div className="border-b border-white/10 pb-6 mb-8">
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">Export Bank Transfer</h2>
        <p className="text-sm text-gray-400 mt-1">Generate file payroll untuk BCA, Mandiri, dan BSI</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div>
          <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Periode Payroll</label>
          <select value={selectedPeriod?.id || ''} onChange={e => loadPeriod(e.target.value)} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white outline-none">
            <option value="">Pilih periode</option>
            {periods.map(p => <option key={p.id} value={p.id}>{monthName(p.period_month)} {p.period_year}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Format Bank</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(BANK_FORMATS).map(([key, val]) => (
              <button key={key} onClick={() => setBankFormat(key)} className={`flex-1 min-w-[80px] px-3 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${bankFormat === key ? 'bg-white/10 border-[var(--aurora-3)]/30 text-white' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                <Building2 size={16} className="mx-auto mb-1" />{key}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-end gap-2">
          <button onClick={handleCopy} disabled={!selectedPeriod} className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-[10px] font-bold flex items-center justify-center gap-2 hover:bg-white/10 disabled:opacity-50">
            {copied ? <CheckCircle2 size={14} className="text-[var(--success)]" /> : <Copy size={14} />} Salin
          </button>
          <button onClick={handleDownload} disabled={!selectedPeriod} className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-[10px] font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            <Download size={14} /> Download
          </button>
        </div>
      </div>

      {selectedPeriod && (
        <>
          <div className="mb-6 p-5 bg-gradient-to-r from-[var(--aurora-3)]/10 to-[var(--aurora-1)]/10 rounded-2xl border border-white/10">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-[9px] text-gray-500 uppercase tracking-widest">Total Transfer</p>
                <p className="text-xl font-bold text-white font-mono">Rp {totalTransfer.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-500 uppercase tracking-widest">Karyawan</p>
                <p className="text-xl font-bold text-white">{summaries.length} org</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-500 uppercase tracking-widest">Valid Rekening</p>
                <p className="text-xl font-bold text-[var(--success)]">{validCount} org</p>
              </div>
            </div>
          </div>

          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Preview Export ({BANK_FORMATS[bankFormat].name})</h3>
          <pre className="bg-black/40 rounded-2xl p-6 text-[10px] text-green-400 font-mono leading-relaxed max-h-[400px] overflow-y-auto custom-scrollbar border border-white/5">
            {generateBankData() || <span className="text-gray-500">Tidak ada data rekening valid untuk diekspor. Pastikan karyawan memiliki data bank di profil HRIS.</span>}
          </pre>

          {validCount < summaries.length && (
            <div className="mt-4 p-4 bg-[var(--warning)]/10 rounded-xl border border-[var(--warning)]/20">
              <p className="text-xs text-[var(--warning)]">
                ⚠ {summaries.length - validCount} karyawan tidak memiliki data rekening bank. Lengkapi data bank di profil HRIS terlebih dahulu.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BankExport;
