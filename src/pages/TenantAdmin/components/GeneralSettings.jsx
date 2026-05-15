import React, { useState, useEffect, useRef } from 'react';
import { Clock, CalendarDays, AlertTriangle, ShieldCheck, Database, Save, Loader2, DollarSign, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../../utils/supabaseClient';
import LoadingSkeleton from '../../../components/LoadingSkeleton';
import { useToast } from '../../../components/Toast';

const GeneralSettings = () => {
  const [settings, setSettings] = useState({
    work_days: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
    check_in_time: '08:00',
    check_out_time: '17:00',
    grace_period_minutes: 15,
    late_penalty_fee: 0,
    auto_approval_toggle: false,
    delegated_approval: false,
    audit_retention_days: 90,
    overtime_rate_weekday: 1.5,
    overtime_rate_holiday: 2.0,
    bpjs_kesehatan_company: 4,
    bpjs_ketenagakerjaan_company: 3.7,
    pph21_method: 'TER',
    payday_date: 25,
    use_attendance_deduction: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle, saving, saved, error
  const debounceTimer = useRef(null);
  const [tenantId, setTenantId] = useState(null);
  const toast = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
      
      if (profile?.tenant_id) {
        setTenantId(profile.tenant_id);
        const { data: ts } = await supabase.from('tenant_settings').select('*').eq('tenant_id', profile.tenant_id).maybeSingle();
        if (ts) {
          // parse times if needed
          setSettings({
            work_days: ts.work_days || ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
            check_in_time: ts.check_in_time ? ts.check_in_time.substring(0, 5) : '08:00',
            check_out_time: ts.check_out_time ? ts.check_out_time.substring(0, 5) : '17:00',
            grace_period_minutes: ts.grace_period_minutes || 0,
            late_penalty_fee: ts.late_penalty_fee || 0,
            auto_approval_toggle: ts.auto_approval_toggle || false,
            delegated_approval: ts.delegated_approval || false,
            audit_retention_days: ts.audit_retention_days || 90,
            overtime_rate_weekday: ts.overtime_rate_weekday || 1.5,
            overtime_rate_holiday: ts.overtime_rate_holiday || 2.0,
            bpjs_kesehatan_company: ts.bpjs_kesehatan_company || 4,
            bpjs_ketenagakerjaan_company: ts.bpjs_ketenagakerjaan_company || 3.7,
            pph21_method: ts.pph21_method || 'TER',
            payday_date: ts.payday_date || 25,
            use_attendance_deduction: ts.use_attendance_deduction || false
          });
        }
      }
    } catch (e) {
      console.error("Gagal menarik data pengaturan", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = (field, value) => {
    const newSettings = { ...settings, [field]: value };
    setSettings(newSettings);
    autoSave(newSettings);
  };

  const handleDayToggle = (day) => {
    const currentDays = [...settings.work_days];
    const index = currentDays.indexOf(day);
    if (index > -1) currentDays.splice(index, 1);
    else currentDays.push(day);
    handleUpdate('work_days', currentDays);
  };

  const autoSave = (newSettings) => {
    setSaveStatus('saving');
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    debounceTimer.current = setTimeout(async () => {
      try {
        if (!tenantId) return;
        
        // Prepare payload (convert arrays to JSON, format times)
        const payload = {
          tenant_id: tenantId,
          work_days: newSettings.work_days,
          check_in_time: newSettings.check_in_time + ':00',
          check_out_time: newSettings.check_out_time + ':00',
          grace_period_minutes: parseInt(newSettings.grace_period_minutes) || 0,
          late_penalty_fee: parseFloat(newSettings.late_penalty_fee) || 0,
          auto_approval_toggle: newSettings.auto_approval_toggle,
          delegated_approval: newSettings.delegated_approval,
          audit_retention_days: parseInt(newSettings.audit_retention_days) || 90,
          overtime_rate_weekday: parseFloat(newSettings.overtime_rate_weekday) || 1.5,
          overtime_rate_holiday: parseFloat(newSettings.overtime_rate_holiday) || 2.0,
          bpjs_kesehatan_company: parseFloat(newSettings.bpjs_kesehatan_company) || 4,
          bpjs_ketenagakerjaan_company: parseFloat(newSettings.bpjs_ketenagakerjaan_company) || 3.7,
          pph21_method: newSettings.pph21_method || 'TER',
          payday_date: parseInt(newSettings.payday_date) || 25,
          use_attendance_deduction: newSettings.use_attendance_deduction || false
        };

        const { error } = await supabase.from('tenant_settings').upsert(payload, { onConflict: 'tenant_id' });
        if (error) throw error;
        
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (e) {
        console.error("Auto-save failed", e);
        setSaveStatus('error');
      }
    }, 1000); // 1 second debounce
  };

  if (isLoading) return <div className="p-10"><LoadingSkeleton type="card" /></div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-serif font-bold text-white tracking-wide">Pengaturan Umum</h2>
          <p className="text-gray-400 text-sm mt-1">Regulasi Operasional Terpusat (Auto-Saved).</p>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && <span className="text-xs text-[var(--aurora-3)] flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Menyimpan...</span>}
          {saveStatus === 'saved' && <span className="text-xs text-[var(--success)] flex items-center gap-1"><Save size={12} /> Tersimpan</span>}
          {saveStatus === 'error' && <span className="text-xs text-[var(--danger)] flex items-center gap-1"><AlertTriangle size={12} /> Gagal Menyimpan</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Jadwal Kerja */}
        <div className="glass-panel p-6 border border-white/5 space-y-5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4"><CalendarDays size={20} className="text-[var(--aurora-1)]"/> Jadwal Kerja Standar</h3>
          
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-3">Hari Kerja Efektif</label>
            <div className="flex flex-wrap gap-2">
              {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map(day => (
                <button 
                  key={day}
                  onClick={() => handleDayToggle(day)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${settings.work_days.includes(day) ? 'bg-[var(--aurora-1)]/20 text-[var(--aurora-1)] border border-[var(--aurora-1)]/50' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-2">Jam Masuk</label>
              <input type="time" value={settings.check_in_time} onChange={(e) => handleUpdate('check_in_time', e.target.value)} className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-1)] transition-colors" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-2">Jam Pulang</label>
              <input type="time" value={settings.check_out_time} onChange={(e) => handleUpdate('check_out_time', e.target.value)} className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-1)] transition-colors" />
            </div>
          </div>
        </div>

        {/* Toleransi & Denda */}
        <div className="glass-panel p-6 border border-white/5 space-y-5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4"><Clock size={20} className="text-[var(--warning)]"/> Toleransi & Denda</h3>
          
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-2">Grace Period (Menit)</label>
            <p className="text-[10px] text-gray-500 mb-2">Batas waktu telat sebelum dihitung denda.</p>
            <input type="number" value={settings.grace_period_minutes} onChange={(e) => handleUpdate('grace_period_minutes', e.target.value)} className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--warning)] transition-colors" />
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-2">Denda Keterlambatan (Rp / Jam)</label>
            <p className="text-[10px] text-gray-500 mb-2">Berlaku jika melewati batas Grace Period.</p>
            <input type="number" value={settings.late_penalty_fee} onChange={(e) => handleUpdate('late_penalty_fee', e.target.value)} className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--warning)] transition-colors" />
          </div>
        </div>

        {/* Hierarki Persetujuan */}
        <div className="glass-panel p-6 border border-white/5 space-y-5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4"><ShieldCheck size={20} className="text-[var(--aurora-3)]"/> Hierarki Persetujuan</h3>
          
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
            <div>
              <p className="text-sm font-bold text-white">Delegasi ke Admin Project</p>
              <p className="text-[10px] text-gray-400 mt-1">Jika ON, Admin Lapangan dapat menyetujui Cuti/Ijin.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={settings.delegated_approval} onChange={(e) => handleUpdate('delegated_approval', e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--aurora-3)]"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
            <div>
              <p className="text-sm font-bold text-white">Auto-Approval Sistem</p>
              <p className="text-[10px] text-gray-400 mt-1">Otomatis setujui ijin sakit jika melampirkan Surat Dokter.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={settings.auto_approval_toggle} onChange={(e) => handleUpdate('auto_approval_toggle', e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--aurora-3)]"></div>
            </label>
          </div>
        </div>

        {/* Retensi Data */}
        <div className="glass-panel p-6 border border-white/5 space-y-5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4"><Database size={20} className="text-gray-400"/> Retensi Data & Audit</h3>
          
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-2">Simpan Log Absen & Foto (Hari)</label>
            <p className="text-[10px] text-gray-500 mb-2">Data lebih tua akan di-Archive untuk menghemat Storage.</p>
            <select value={settings.audit_retention_days} onChange={(e) => handleUpdate('audit_retention_days', e.target.value)} className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-white/30 transition-colors">
              <option value="30">30 Hari</option>
              <option value="90">90 Hari (3 Bulan)</option>
              <option value="180">180 Hari (6 Bulan)</option>
              <option value="365">1 Tahun</option>
            </select>
          </div>
        </div>

      </div>

      {/* Advanced Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="glass-panel p-6 border border-white/5 space-y-5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2"><DollarSign size={20} className="text-[var(--success)]" /> Kompensasi & Lembur</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Rate Lembur (Weekday)</label>
              <input type="number" step="0.1" value={settings.overtime_rate_weekday} onChange={e => handleUpdate('overtime_rate_weekday', e.target.value)} className="w-full bg-[#1A1C23] border border-white/10 rounded-lg p-3 text-white text-sm outline-none focus:border-[var(--success)]" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Rate Lembur (Holiday)</label>
              <input type="number" step="0.1" value={settings.overtime_rate_holiday} onChange={e => handleUpdate('overtime_rate_holiday', e.target.value)} className="w-full bg-[#1A1C23] border border-white/10 rounded-lg p-3 text-white text-sm outline-none focus:border-[var(--success)]" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Tanggal Payroll (tgl gajian)</label>
            <input type="number" min="1" max="31" value={settings.payday_date} onChange={e => handleUpdate('payday_date', e.target.value)} className="w-full bg-[#1A1C23] border border-white/10 rounded-lg p-3 text-white text-sm outline-none focus:border-[var(--success)]" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-white/5 hover:bg-white/5">
            <input type="checkbox" checked={settings.use_attendance_deduction} onChange={e => handleUpdate('use_attendance_deduction', e.target.checked)} className="w-4 h-4" />
            <span className="text-xs text-gray-300">Potong gaji berdasarkan absensi (tidak hadir = tidak dibayar)</span>
          </label>
        </div>

        <div className="glass-panel p-6 border border-white/5 space-y-5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2"><Sun size={20} className="text-[var(--warning)]" /> BPJS & Pajak</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">BPJS Kes (Perusahaan %)</label>
              <input type="number" step="0.1" value={settings.bpjs_kesehatan_company} onChange={e => handleUpdate('bpjs_kesehatan_company', e.target.value)} className="w-full bg-[#1A1C23] border border-white/10 rounded-lg p-3 text-white text-sm outline-none focus:border-[var(--warning)]" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">BPJS TK (Perusahaan %)</label>
              <input type="number" step="0.1" value={settings.bpjs_ketenagakerjaan_company} onChange={e => handleUpdate('bpjs_ketenagakerjaan_company', e.target.value)} className="w-full bg-[#1A1C23] border border-white/10 rounded-lg p-3 text-white text-sm outline-none focus:border-[var(--warning)]" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Metode PPh 21</label>
            <select value={settings.pph21_method} onChange={e => handleUpdate('pph21_method', e.target.value)} className="w-full bg-[#1A1C23] border border-white/10 rounded-lg p-3 text-white outline-none">
              <option value="TER">TER (Tarif Efektif Rata-rata)</option>
              <option value="GROSS_UP">Gross Up</option>
              <option value="NETTO">Netto</option>
            </select>
          </div>
        </div>
      </div>

      {/* Permission Manager Quick Link */}
      <div className="glass-panel p-8 rounded-[40px] border border-white/5 mt-10 bg-gradient-to-br from-[var(--aurora-1)]/5 to-transparent relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <ShieldCheck size={120} />
        </div>
        <div className="relative z-10">
          <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
            <ShieldCheck size={24} className="text-[var(--aurora-1)]"/> Manajemen Otoritas Tim
          </h3>
          <p className="text-sm text-gray-400 max-w-lg mb-6">
            Delegasikan akses dashboard operasional kepada staff kepercayaan Anda. Anda dapat menentukan cakupan otoritas berdasarkan Project atau Divisi tertentu secara spesifik.
          </p>
          <button 
            onClick={() => {
              toast("Gunakan menu 'Otoritas Tim' di panel samping.", 'info');
            }}
            className="px-6 py-3 bg-[var(--aurora-1)] hover:bg-[#8E2DE2] text-white text-xs font-black uppercase rounded-xl transition-all shadow-[0_0_20px_rgba(142,45,226,0.3)]"
          >
            Pelajari Lebih Lanjut
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeneralSettings;
