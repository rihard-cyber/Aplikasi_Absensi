import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  FileText, Download, Search, User, ChevronDown, RefreshCw,
  Printer, CheckCircle2, AlertCircle, Loader2, Building2, Calendar, Calculator
} from 'lucide-react';
import { safeGet } from '../../../utils/safeAccess';
import { supabase } from '../../../utils/supabaseClient';

/**
 * Form1721A1 — Generator Bukti Potong PPh 21 (Form 1721-A1)
 * 
 * Menghasilkan Bukti Pemotongan Pajak Penghasilan Pasal 21 sesuai
 * format DJP (Direktorat Jenderal Pajak) untuk karyawan tetap.
 * 
 * Referensi: PER-14/PJ/2013 dan PMK-168/PMK.010/2023
 * 
 * Komponen:
 * - Pilih tahun pajak & karyawan
 * - Hitung PPh 21 berdasarkan data gaji dari Supabase
 * - Preview form sebelum cetak
 * - Print / Export PDF via window.print()
 */

// PTKP 2024 (PMK-168/2023)
const PTKP = {
  TK0: 54000000,   // Tidak Kawin, 0 Tanggungan
  TK1: 58500000,   // Tidak Kawin, 1 Tanggungan
  TK2: 63000000,   // Tidak Kawin, 2 Tanggungan
  TK3: 67500000,   // Tidak Kawin, 3 Tanggungan
  K0:  58500000,   // Kawin, 0 Tanggungan
  K1:  63000000,   // Kawin, 1 Tanggungan
  K2:  67500000,   // Kawin, 2 Tanggungan
  K3:  72000000,   // Kawin, 3 Tanggungan
};

const TAX_BRACKETS = [
  { limit: 60000000,  rate: 0.05 },
  { limit: 250000000, rate: 0.15 },
  { limit: 500000000, rate: 0.25 },
  { limit: 5000000000, rate: 0.30 },
  { limit: Infinity,  rate: 0.35 },
];

/**
 * Hitung PPh 21 dengan tarif progresif
 */
const calcPPh21 = (pkhBruto, ptkpCode = 'TK0', hasNPWP = true) => {
  const ptkp = safeGet(PTKP, ptkpCode) || PTKP.TK0;
  const biayaJabatan = Math.min(pkhBruto * 0.05, 6000000);
  const pkpNetto = Math.max(0, pkhBruto - biayaJabatan - ptkp);

  // Round down to nearest 1000
  const pkp = Math.floor(pkpNetto / 1000) * 1000;

  let pph = 0;
  let prev = 0;
  for (const bracket of TAX_BRACKETS) {
    if (pkp <= prev) break;
    const taxable = Math.min(pkp, bracket.limit) - prev;
    pph += taxable * bracket.rate;
    prev = bracket.limit;
    if (pkp <= bracket.limit) break;
  }

  if (!hasNPWP) pph *= 1.2; // Tanpa NPWP = tarif + 20%

  return {
    penghasilan_bruto: pkhBruto,
    biaya_jabatan: biayaJabatan,
    ptkp,
    pkp,
    pph21_terutang: Math.round(pph),
  };
};

const Form1721A1 = () => {
  const { t, i18n } = useTranslation();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [tenantData, setTenantData] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [ptkpCode, setPtkpCode] = useState('TK0');
  const [hasNPWP, setHasNPWP] = useState(true);
  const [npwpManual, setNpwpManual] = useState('');
  const [manualSalary, setManualSalary] = useState('');
  const [result, setResult] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const printRef = useRef(null);

  useEffect(() => { fetchData(); }, []);

  const fmt = (n) => 'Rp ' + Math.round(n || 0).toLocaleString(i18n.language === 'id' ? 'id-ID' : 'en-US');
  const fmtNum = (n) => Math.round(n || 0).toLocaleString(i18n.language === 'id' ? 'id-ID' : 'en-US');

  const ptkpOptions = Object.keys(PTKP).map(k => {
    const descs = {
      TK0: t('ptkp.TK0'),
      TK1: t('ptkp.TK1'),
      TK2: t('ptkp.TK2'),
      TK3: t('ptkp.TK3'),
      K0:  t('ptkp.K0'),
      K1:  t('ptkp.K1'),
      K2:  t('ptkp.K2'),
      K3:  t('ptkp.K3'),
    };
    return { value: k, label: `${k} — ${safeGet(descs, k)}` };
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();

      let empQ = supabase.from('profiles').select('id, full_name, nip, position, basic_salary, npwp, ptkp_status, address, birth_date, gender').in('role', ['EMPLOYEE', 'SUB_ADMIN']);
      if (profile?.tenant_id) empQ = empQ.eq('tenant_id', profile.tenant_id);
      const { data: emps } = await empQ;
      setEmployees(emps || []);

      if (profile?.tenant_id) {
        const { data: tData } = await supabase.from('tenants').select('name, address, npwp, phone').eq('id', profile.tenant_id).maybeSingle();
        setTenantData(tData);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleGenerate = () => {
    if (!selectedEmp) return;
    const annualSalary = parseInt(manualSalary.replace(/\D/g, '')) || (selectedEmp.basic_salary * 12) || 0;
    const ptkp = ptkpCode || selectedEmp.ptkp_status || 'TK0';
    const calc = calcPPh21(annualSalary, ptkp, hasNPWP);
    setResult({ ...calc, emp: selectedEmp, year, ptkp, hasNPWP, annualSalary });
    setShowPreview(true);
  };

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    if (!printContent) return;
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    
    // Write boilerplate html
    printWindow.document.write('<!DOCTYPE html><html><head><title></title><meta charset="utf-8"></head><body><div class="form-container"></div></body></html>');
    printWindow.document.close();
    
    // Setup metadata and styles dynamically to avoid template literal HTML interpolation warning
    printWindow.document.title = `Form 1721-A1 — ${result?.emp?.full_name || ''} — ${result?.year || ''}`;
    
    const styleEl = printWindow.document.createElement('style');
    styleEl.textContent = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Arial', sans-serif; font-size: 10pt; color: #000; background: white; }
      .form-container { max-width: 210mm; margin: 0 auto; padding: 15mm 15mm 10mm; }
      h1 { font-size: 13pt; text-align: center; font-weight: bold; margin-bottom: 4px; }
      h2 { font-size: 11pt; text-align: center; font-weight: bold; margin-bottom: 2px; }
      .subtitle { text-align: center; font-size: 9pt; margin-bottom: 12px; color: #555; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
      td, th { border: 1px solid #000; padding: 4px 8px; font-size: 9pt; }
      .no-border td { border: none; }
      .section-title { background: #f0f0f0; font-weight: bold; font-size: 9pt; padding: 4px 8px; }
      .amount { text-align: right; font-family: monospace; }
      .label { width: 60%; }
      .footer { margin-top: 20px; font-size: 8pt; color: #555; border-top: 1px solid #ccc; padding-top: 8px; }
      @media print { body { -webkit-print-color-adjust: exact; } }
    `;
    printWindow.document.head.appendChild(styleEl);
    
    const container = printWindow.document.querySelector('.form-container');
    if (container) {
      container.innerHTML = printContent;
    }

    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const filtered = employees.filter(e =>
    e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.nip?.includes(search)
  );

  if (loading) return <div className="flex items-center justify-center p-20"><Loader2 size={32} className="animate-spin text-[var(--aurora-3)]" /></div>;

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--warning)] to-[var(--aurora-1)] flex items-center justify-center">
              <FileText size={20} className="text-black" />
            </div>
            {t('taxForm.title')}
          </h2>
          <p className="text-gray-400 text-sm mt-1 ml-[52px]">{t('taxForm.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={year} onChange={e => setYear(parseInt(e.target.value))}
             className="bg-[#0B0C10] border border-white/20 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-[var(--warning)] transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" >
            {[2022, 2023, 2024, 2025].map(y => <option key={y} value={y} className="bg-[#0B0C10]">{t('taxForm.yearPrefix')}{y}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left — Employee Picker */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-panel p-5 border border-white/5 rounded-2xl">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <User size={16} className="text-[var(--warning)]" /> {t('taxForm.selectEmployee')}
            </h3>
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('taxForm.searchPlaceholder')}
                  className="w-full bg-[#0B0C10] border border-white/20 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white outline-none focus:border-[var(--warning)] placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1 custom-scrollbar">
              {filtered.map(emp => (
                <button key={emp.id} onClick={() => {
                  setSelectedEmp(emp);
                  setPtkpCode(emp.ptkp_status || 'TK0');
                  setNpwpManual(emp.npwp || '');
                  setManualSalary(emp.basic_salary ? String(emp.basic_salary * 12) : '');
                  setResult(null);
                }}
                  className={`w-full p-3 rounded-xl border text-left transition-all ${selectedEmp?.id === emp.id
                    ? 'bg-[var(--warning)]/10 border-[var(--warning)]/40'
                    : 'bg-white/3 border-white/5 hover:border-white/15'}`}>
                  <p className="text-xs font-bold text-white">{emp.full_name}</p>
                  <p className="text-[9px] text-gray-500 mt-0.5">{emp.nip} • {emp.position || 'Staff'}</p>
                  {emp.basic_salary ? (
                    <p className="text-[9px] text-[var(--success)] mt-0.5">{t('taxForm.salaryPrefix')}{fmt(emp.basic_salary)}/bln</p>
                  ) : (
                    <p className="text-[9px] text-gray-600 mt-0.5">{t('taxForm.noSalary')}</p>
                  )}
                </button>
              ))}
              {filtered.length === 0 && <p className="text-gray-600 text-xs text-center py-4">{t('taxForm.noEmployeeFound')}</p>}
            </div>
          </div>

          {/* Config */}
          {selectedEmp && (
            <div className="glass-panel p-5 border border-white/5 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white">{t('taxForm.configTitle')}</h3>

              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block mb-2">{t('taxForm.grossIncome')}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">Rp</span>
                  <input
                    type="text"
                    value={manualSalary}
                    onChange={e => setManualSalary(e.target.value.replace(/\D/g, ''))}
                    placeholder="60000000"
                   className="w-full bg-[#0B0C10] border border-white/20 rounded-xl pl-8 pr-4 py-2.5 text-white text-sm font-mono outline-none focus:border-[var(--warning)] placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
                </div>
                {selectedEmp.basic_salary && (
                  <p className="text-[9px] text-gray-500 mt-1">{t('taxForm.autoLabel')}{fmt(selectedEmp.basic_salary)} × 12 = {fmt(selectedEmp.basic_salary * 12)}</p>
                )}
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block mb-2">{t('taxForm.ptkpStatus')}</label>
                <select value={ptkpCode} onChange={e => setPtkpCode(e.target.value)}
                   className="w-full bg-[#0B0C10] border border-white/20 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-[var(--warning)] placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" >
                  {ptkpOptions.map(o => <option key={o.value} value={o.value} className="bg-[#0B0C10]">{o.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block mb-2">{t('taxForm.employeeNpwp')}</label>
                <input
                  type="text"
                  value={npwpManual}
                  onChange={e => setNpwpManual(e.target.value)}
                  placeholder="00.000.000.0-000.000"
                 className="w-full bg-[#0B0C10] border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm font-mono outline-none focus:border-[var(--warning)] placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
              </div>

              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                <div>
                  <p className="text-xs font-bold text-white">{t('taxForm.hasNpwp')}</p>
                  <p className="text-[9px] text-gray-500">{t('taxForm.noNpwpRateInfo')}</p>
                </div>
                <button onClick={() => setHasNPWP(!hasNPWP)}
                  className={`w-10 h-5 rounded-full relative transition-all ${hasNPWP ? 'bg-[var(--success)]' : 'bg-gray-700'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${hasNPWP ? 'left-5.5' : 'left-0.5'}`} />
                </button>
              </div>

              <button onClick={handleGenerate}
                disabled={!manualSalary && !selectedEmp.basic_salary}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[var(--warning)] to-[var(--aurora-1)] text-black font-black text-sm uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 transition-all">
                <FileText size={16} /> {t('taxForm.generateButton')}
              </button>
            </div>
          )}
        </div>

        {/* Right — Preview */}
        <div className="lg:col-span-3">
          {result ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-[var(--success)]" />
                  {t('taxForm.successTitle')}
                </h3>
                <button onClick={handlePrint}
                  className="px-4 py-2 bg-[var(--warning)]/20 border border-[var(--warning)]/40 rounded-xl text-[var(--warning)] text-xs font-bold flex items-center gap-2 hover:bg-[var(--warning)]/30 transition-all">
                  <Printer size={14} /> {t('taxForm.printButton')}
                </button>
              </div>

              {/* Printable Form */}
              <div ref={printRef} className="glass-panel p-6 rounded-2xl border border-white/5 bg-white text-black text-[10px] leading-relaxed" style={{ fontFamily: 'Arial, sans-serif', color: '#000', background: 'white' }}>
                {/* Title */}
                <div className="text-center mb-4">
                  <h1 className="text-sm font-black uppercase">{t('taxForm.formTitle')}</h1>
                  <h2 className="text-[11px] font-bold uppercase">{t('taxForm.formSubtitle')}</h2>
                  <p className="text-[9px] text-gray-600">{t('taxForm.formTaxYear')}{result.year}</p>
                </div>

                {/* Pemberi Kerja */}
                <table className="w-full mb-3 text-[9pt]" style={{ borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '4px 8px', background: '#f0f0f0', fontWeight: 'bold' }} colSpan={4}>
                        {t('taxForm.sectionA')}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '4px 8px', width: '30%' }}>{t('taxForm.companyName')}</td>
                      <td style={{ border: '1px solid #000', padding: '4px 8px', fontWeight: 'bold' }} colSpan={3}>{tenantData?.name || '____________________'}</td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '4px 8px' }}>{t('taxForm.companyNpwp')}</td>
                      <td style={{ border: '1px solid #000', padding: '4px 8px', fontFamily: 'monospace' }}>{tenantData?.npwp || '__.___.___._.___._____'}</td>
                      <td style={{ border: '1px solid #000', padding: '4px 8px', width: '20%' }}>{t('taxForm.phone')}</td>
                      <td style={{ border: '1px solid #000', padding: '4px 8px' }}>{tenantData?.phone || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '4px 8px' }}>{t('taxForm.address')}</td>
                      <td style={{ border: '1px solid #000', padding: '4px 8px' }} colSpan={3}>{tenantData?.address || '____________________'}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Pegawai */}
                <table className="w-full mb-3 text-[9pt]" style={{ borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '4px 8px', background: '#f0f0f0', fontWeight: 'bold' }} colSpan={4}>
                        {t('taxForm.sectionB')}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '4px 8px', width: '30%' }}>{t('taxForm.fullName')}</td>
                      <td style={{ border: '1px solid #000', padding: '4px 8px', fontWeight: 'bold' }} colSpan={3}>{result.emp.full_name}</td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '4px 8px' }}>{t('taxForm.npwp')}</td>
                      <td style={{ border: '1px solid #000', padding: '4px 8px', fontFamily: 'monospace' }}>{npwpManual || result.emp.npwp || '__.___.___._.___._____'}</td>
                      <td style={{ border: '1px solid #000', padding: '4px 8px', width: '20%' }}>{t('taxForm.nikNip')}</td>
                      <td style={{ border: '1px solid #000', padding: '4px 8px' }}>{result.emp.nip || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '4px 8px' }}>{t('taxForm.ptkpStatus')}</td>
                      <td style={{ border: '1px solid #000', padding: '4px 8px', fontWeight: 'bold' }}>{result.ptkp}</td>
                      <td style={{ border: '1px solid #000', padding: '4px 8px' }}>{t('taxForm.position')}</td>
                      <td style={{ border: '1px solid #000', padding: '4px 8px' }}>{result.emp.position || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '4px 8px' }}>{t('taxForm.address')}</td>
                      <td style={{ border: '1px solid #000', padding: '4px 8px' }} colSpan={3}>{result.emp.address || '-'}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Kalkulasi PPh 21 */}
                <table className="w-full mb-3 text-[9pt]" style={{ borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '4px 8px', background: '#f0f0f0', fontWeight: 'bold' }} colSpan={3}>
                        {t('taxForm.sectionC')}
                      </td>
                    </tr>
                    {[
                      ['1.', t('taxForm.calcRows.1'), result.penghasilan_bruto],
                      ['2.', t('taxForm.calcRows.2'), result.biaya_jabatan],
                      ['3.', t('taxForm.calcRows.3'), result.penghasilan_bruto - result.biaya_jabatan],
                      ['4.', t('taxForm.calcRows.4', { status: result.ptkp, amount: fmt(result.ptkp) }), result.ptkp],
                      ['5.', t('taxForm.calcRows.5'), result.pkp],
                    ].map(([no, label, val]) => (
                      <tr key={no}>
                        <td style={{ border: '1px solid #000', padding: '4px 8px', width: '5%', textAlign: 'center' }}>{no}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 8px' }}>{label}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: no === '5.' ? 'bold' : 'normal' }}>
                          {fmtNum(val)}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'center' }}>6.</td>
                      <td style={{ border: '1px solid #000', padding: '4px 8px' }}>{t('taxForm.pph21Due')}{!result.hasNPWP ? t('taxForm.pph21DueNoNpwp') : ''}</td>
                      <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '10pt', color: '#c00' }}>
                        {fmtNum(result.pph21_terutang)}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'center' }}>7.</td>
                      <td style={{ border: '1px solid #000', padding: '4px 8px' }}>{t('taxForm.pph21Monthly')}</td>
                      <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>
                        {fmtNum(result.pph21_terutang / 12)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Tarif Brackets Info */}
                <table className="w-full mb-3 text-[8pt]" style={{ borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid #ccc', padding: '3px 6px', background: '#f9f9f9', fontWeight: 'bold' }} colSpan={3}>
                        {t('taxForm.refTitle')}
                      </td>
                    </tr>
                    {[
                      [t('taxForm.refRanges.0'), '5%'],
                      [t('taxForm.refRanges.1'), '15%'],
                      [t('taxForm.refRanges.2'), '25%'],
                      [t('taxForm.refRanges.3'), '30%'],
                      [t('taxForm.refRanges.4'), '35%'],
                    ].map(([range, rate]) => (
                      <tr key={range}>
                        <td style={{ border: '1px solid #ccc', padding: '2px 6px' }}>{range}</td>
                        <td style={{ border: '1px solid #ccc', padding: '2px 6px', textAlign: 'center', fontWeight: 'bold' }}>{rate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* TTD */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <div style={{ textAlign: 'center', width: '200px' }}>
                    <p style={{ fontSize: '9pt' }}>{tenantData?.name || '_______________'}, ___________</p>
                    <div style={{ height: '50px', borderBottom: '1px solid #000', marginBottom: '4px', marginTop: '8px' }} />
                    <p style={{ fontSize: '9pt', fontWeight: 'bold' }}>{t('taxForm.authorizedSignatory')}</p>
                  </div>
                </div>

                <div style={{ marginTop: '12px', fontSize: '7.5pt', color: '#666', borderTop: '1px solid #ccc', paddingTop: '6px' }}>
                  <p>{t('taxForm.disclaimer.0')}</p>
                  <p>{t('taxForm.disclaimer.1')}</p>
                  <p>{t('taxForm.disclaimer.2')}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-10 rounded-2xl border border-white/5 h-full flex flex-col items-center justify-center text-center">
              <FileText size={56} className="text-gray-700 mb-6" />
              <h3 className="text-lg font-bold text-white mb-2">{t('taxForm.selectAndGenerate')}</h3>
              <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
                {t('taxForm.instructions')}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3 text-left w-full max-w-xs">
                {[
                  { icon: <User size={14} />, text: t('taxForm.bullets.0') },
                  { icon: <Calculator size={14} />, text: t('taxForm.bullets.1') },
                  { icon: <Printer size={14} />, text: t('taxForm.bullets.2') },
                  { icon: <Calendar size={14} />, text: t('taxForm.bullets.3') },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 bg-white/3 rounded-xl border border-white/5">
                    <span className="text-[var(--warning)] mt-0.5">{item.icon}</span>
                    <p className="text-[10px] text-gray-400">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Form1721A1;
