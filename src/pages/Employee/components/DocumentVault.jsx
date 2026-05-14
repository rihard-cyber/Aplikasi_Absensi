import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, UploadCloud, FileCheck, AlertCircle,
  CheckCircle2, ChevronRight, XCircle, CreditCard,
  Users, GraduationCap, Award, FileText, Loader2,
  MapPin, History, Info, HeartPulse, Banknote
} from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const DocumentVault = () => {
  const [activeCategory, setActiveCategory] = useState(null);
  const [view, setView] = useState('categories');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();
  const [showSuccess, setShowSuccess] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [hrisData, setHrisData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [categories, setCategories] = useState([
    { id: 'ktp', label: 'KTP (Identitas)', icon: <CreditCard />, color: 'var(--aurora-3)', complete: false },
    { id: 'kk', label: 'Kartu Keluarga', icon: <Users />, color: 'var(--aurora-2)', complete: false },
    { id: 'education', label: 'Pendidikan', icon: <GraduationCap />, color: 'var(--aurora-1)', complete: false },
    { id: 'cert', label: 'Sertifikat & KTA', icon: <Award />, color: 'var(--warning)', complete: false },
    { id: 'bpjs', label: 'BPJS & Asuransi', icon: <HeartPulse />, color: 'var(--success)', complete: false },
    { id: 'bank', label: 'Data Bank', icon: <Banknote />, color: '#FFD700', complete: false },
    { id: 'other', label: 'Berkas Lainnya', icon: <FileText />, color: 'gray', complete: false },
  ]);

  const [formData, setFormData] = useState({
    nik: '', address: '', rt: '', rw: '', kelurahan: '', kecamatan: '', city: '', province: '',
    no_kk: '', children_count: '0', marriage_status: 'TK',
    education_level: 'SMA', major: '', institution: '', grad_year: '',
    cert_name: '', cert_number: '', cert_issued: '', cert_expiry: '',
    kta_number: '',
    bpjs_kes: '', bpjs_tk: '', insurance_name: '', insurance_number: '',
    bank_name: '', bank_account: '', bank_holder: '', bank_branch: '',
    file: null, doc_name: '',
    ktp_address: '', postal_code: '', domicile_address: '',
    mobile_phone: '', emergency_name: '', emergency_relation: '', emergency_phone: '',
  });

  const loadData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: prof } = await supabase.from('profiles')
        .select('id, tenant_id, full_name, nip, position, phone, address, birth_date, gender')
        .eq('auth_id', session.user.id).maybeSingle();
      if (!prof) return;
      setProfile(prof);

      // Get HRIS data
      const { data: hris } = await supabase.from('employee_hris_data')
        .select('*').eq('user_id', prof.id).maybeSingle();
      if (hris) {
        setHrisData(hris);
        setFormData(prev => ({
          ...prev,
          nik: hris.ktp_number || '', no_kk: hris.kk_number || '',
          marriage_status: hris.marriage_status || 'TK', children_count: String(hris.children_count ?? 0),
          education_level: hris.education_level || 'SMA', major: hris.major || '', institution: hris.school_name || '',
          kta_number: hris.kta_number || '',
          cert_number: hris.certificate_number || '', cert_issued: hris.certificate_issued_date || '', cert_expiry: hris.certificate_expiry_date || '',
          bpjs_kes: hris.bpjs_kes_number || '', bpjs_tk: hris.bpjs_tk_number || '',
          insurance_name: hris.other_insurance_name || '', insurance_number: hris.other_insurance_number || '',
          bank_name: hris.bank_name || '', bank_account: hris.bank_account_number || '',
          bank_holder: hris.bank_account_name || '', bank_branch: hris.bank_branch || '',
          ktp_address: hris.ktp_address || '', postal_code: hris.postal_code || '',
          domicile_address: hris.domicile_address || '',
          mobile_phone: hris.mobile_phone || '', emergency_name: hris.emergency_contact_name || '',
          emergency_relation: hris.emergency_contact_relation || '', emergency_phone: hris.emergency_contact_number || '',
        }));
      }

      // Get documents & update category status
      const { data: docs } = await supabase.from('employee_documents')
        .select('*').eq('user_id', prof.id);
      if (docs) {
        setSubmissions(docs.map(d => ({
          id: d.id, type: d.doc_type, date: new Date(d.created_at).toISOString().split('T')[0],
          status: d.verification_status, note: d.note || '', file_url: d.file_url
        })));

        // Update category completion
        setCategories(prev => prev.map(cat => {
          const catLabels = { ktp: 'ktp', kk: 'kk', education: 'pendidikan', cert: 'sertifikat', bpjs: 'bpjs', bank: 'bank', other: 'lain' };
          const keyword = catLabels[cat.id] || cat.id;
          const catDocs = docs.filter(d => d.doc_type?.toLowerCase().includes(keyword));
          return { ...cat, complete: catDocs.some(d => d.verification_status === 'VERIFIED') };
        }));
      }
    } catch (e) {
      console.error('Load error:', e);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const calculatePTKP = () => {
    const ms = formData.marriage_status;
    const cc = Math.min(Number(formData.children_count) || 0, 3);
    return `${ms}/${cc}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.file) { toast('Lampirkan dokumen terlebih dahulu.', 'error'); return; }
    if (formData.file.size > MAX_FILE_SIZE) { toast('File maksimal 5MB.', 'error'); return; }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sesi tidak valid.');
      const { data: prof } = await supabase.from('profiles')
        .select('id, tenant_id').eq('auth_id', session.user.id).maybeSingle();
      if (!prof) throw new Error('Profil tidak ditemukan.');

      // Upload file
      const ext = formData.file.name.split('.').pop();
      const path = `${session.user.id}/${activeCategory}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('documents').upload(path, formData.file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path);

      // Determine doc type label
      let docLabel = categories.find(c => c.id === activeCategory)?.label || 'Dokumen';
      if ((activeCategory === 'cert' || activeCategory === 'other') && formData.doc_name) docLabel = formData.doc_name;
      if (activeCategory === 'cert' && formData.cert_name) docLabel = formData.cert_name;

      // Insert document record
      const { error: dbErr } = await supabase.from('employee_documents').insert({
        tenant_id: prof.tenant_id, user_id: prof.id,
        doc_type: docLabel, file_url: publicUrl, verification_status: 'PENDING'
      });
      if (dbErr) throw dbErr;

      // Build HRIS upsert payload
      const hrisPayload = { user_id: prof.id, tenant_id: prof.tenant_id };

      if (activeCategory === 'ktp') {
        Object.assign(hrisPayload, {
          ktp_number: formData.nik, ktp_address: formData.ktp_address || formData.address,
          postal_code: formData.postal_code, domicile_address: formData.domicile_address,
          mobile_phone: formData.mobile_phone,
        });
      }
      if (activeCategory === 'kk') {
        Object.assign(hrisPayload, {
          kk_number: formData.no_kk, marriage_status: formData.marriage_status,
          children_count: Number(formData.children_count) || 0,
          tax_status: calculatePTKP(),
          mother_name: formData.mother_name || '',
        });
      }
      if (activeCategory === 'education') {
        Object.assign(hrisPayload, {
          education_level: formData.education_level, major: formData.major,
          school_name: formData.institution,
        });
      }
      if (activeCategory === 'cert') {
        Object.assign(hrisPayload, {
          kta_number: formData.kta_number, certificate_number: formData.cert_number,
          certificate_issued_date: formData.cert_issued || null,
          certificate_expiry_date: formData.cert_expiry || null,
        });
      }
      if (activeCategory === 'bpjs') {
        Object.assign(hrisPayload, {
          bpjs_kes_number: formData.bpjs_kes, bpjs_tk_number: formData.bpjs_tk,
          other_insurance_name: formData.insurance_name, other_insurance_number: formData.insurance_number,
        });
      }
      if (activeCategory === 'bank') {
        Object.assign(hrisPayload, {
          bank_name: formData.bank_name, bank_account_number: formData.bank_account,
          bank_account_name: formData.bank_holder, bank_branch: formData.bank_branch,
        });
      }
      if (activeCategory === 'ktp' || activeCategory === 'kk') {
        Object.assign(hrisPayload, {
          emergency_contact_name: formData.emergency_name,
          emergency_contact_relation: formData.emergency_relation,
          emergency_contact_number: formData.emergency_phone,
        });
      }

      const { error: hrisErr } = await supabase.from('employee_hris_data')
        .upsert(hrisPayload, { onConflict: 'user_id' });
      if (hrisErr) throw hrisErr;

      setShowSuccess(true);
      loadData();
      setTimeout(() => {
        setShowSuccess(false); setView('categories'); setActiveCategory(null);
        setFormData(f => ({ ...f, file: null }));
      }, 2000);
    } catch (err) {
      toast('Gagal: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > MAX_FILE_SIZE) { toast('File maksimal 5MB.', 'error'); setFormData(fd => ({ ...fd, file: null })); return; }
    setFormData(fd => ({ ...fd, file: f }));
  };

  const renderFormFields = () => {
    switch (activeCategory) {
      case 'ktp':
        return (<>
          <SmartInput label="Nomor KTP (NIK)" name="nik" value={formData.nik} onChange={handleInputChange} placeholder="16 Digit NIK" maxLength={16} />
          <SmartInput label="Alamat KTP" name="ktp_address" value={formData.ktp_address} onChange={handleInputChange} placeholder="Jl. Contoh No. 123" />
          <div className="grid grid-cols-2 gap-4">
            <SmartInput label="Kode Pos" name="postal_code" value={formData.postal_code} onChange={handleInputChange} placeholder="12345" />
            <SmartInput label="Alamat Domisili" name="domicile_address" value={formData.domicile_address} onChange={handleInputChange} placeholder="Jika berbeda dengan KTP" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SmartInput label="No. HP" name="mobile_phone" value={formData.mobile_phone} onChange={handleInputChange} placeholder="0812xxxx" />
            <SmartInput label="Nama Ibu Kandung" name="mother_name" value={formData.mother_name} onChange={handleInputChange} placeholder="Untuk verifikasi" />
          </div>
        </>);

      case 'kk':
        return (<>
          <SmartInput label="Nomor Kartu Keluarga" name="no_kk" value={formData.no_kk} onChange={handleInputChange} placeholder="16 Digit No KK" />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-1">Status Pernikahan</label>
              <select name="marriage_status" value={formData.marriage_status} onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 text-xs text-white outline-none focus:border-[var(--aurora-3)]">
                <option value="TK" className="bg-[#0B0C10]">Tidak Kawin</option>
                <option value="K" className="bg-[#0B0C10]">Kawin</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-1">Jumlah Anak</label>
              <select name="children_count" value={formData.children_count} onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 text-xs text-white outline-none focus:border-[var(--aurora-3)]">
                {[0, 1, 2, 3].map(n => <option key={n} value={n} className="bg-[#0B0C10]">{n} {n > 0 ? 'Anak' : 'Anak'}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SmartInput label="Kontak Darurat" name="emergency_name" value={formData.emergency_name} onChange={handleInputChange} placeholder="Nama" />
            <SmartInput label="Hubungan" name="emergency_relation" value={formData.emergency_relation} onChange={handleInputChange} placeholder="Suami/Istri/Orangtua" />
          </div>
          <SmartInput label="No. HP Darurat" name="emergency_phone" value={formData.emergency_phone} onChange={handleInputChange} placeholder="08xxxx" />
          {/* PTKP Preview */}
          <div className="p-4 bg-[var(--aurora-3)]/5 border border-[var(--aurora-3)]/20 rounded-2xl flex justify-between items-center">
            <div className="flex items-center gap-3">
              <AlertCircle size={16} className="text-[var(--aurora-3)]" />
              <p className="text-[10px] text-gray-400">Estimasi Status Pajak (PTKP):</p>
            </div>
            <span className="text-lg font-bold text-[var(--aurora-3)] tracking-tighter">{calculatePTKP()}</span>
          </div>
        </>);

      case 'education':
        return (<>
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-1">Tingkat Pendidikan</label>
            <select name="education_level" value={formData.education_level} onChange={handleInputChange}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 text-xs text-white outline-none focus:border-[var(--aurora-3)]">
              {['SMA', 'D1', 'D3', 'S1', 'S2', 'S3'].map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <SmartInput label="Jurusan" name="major" value={formData.major} onChange={handleInputChange} placeholder="Teknik Informatika" />
          <SmartInput label="Institusi" name="institution" value={formData.institution} onChange={handleInputChange} placeholder="Universitas Indonesia" />
          <div className="grid grid-cols-2 gap-4">
            <SmartInput label="Tahun Lulus" name="grad_year" value={formData.grad_year} onChange={handleInputChange} placeholder="2020" />
          </div>
        </>);

      case 'cert':
        return (<>
          <div className="p-4 bg-[var(--warning)]/5 border border-[var(--warning)]/20 rounded-2xl mb-2 flex items-start gap-3">
            <Info size={16} className="text-[var(--warning)] shrink-0 mt-0.5" />
            <p className="text-[10px] text-gray-400">Untuk Satpam/Security: isi No. KTA dan Sertifikat Gada Pratama.</p>
          </div>
          <SmartInput label="Nama Sertifikat" name="cert_name" value={formData.cert_name} onChange={handleInputChange} placeholder="Gada Pratama / Sertifikat Ahli" />
          <div className="grid grid-cols-2 gap-4">
            <SmartInput label="No. KTA" name="kta_number" value={formData.kta_number} onChange={handleInputChange} placeholder="Nomor KTA" />
            <SmartInput label="No. Sertifikat" name="cert_number" value={formData.cert_number} onChange={handleInputChange} placeholder="Nomor Registrasi" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SmartInput label="Tgl Terbit" name="cert_issued" type="date" value={formData.cert_issued} onChange={handleInputChange} />
            <SmartInput label="Tgl Kadaluarsa" name="cert_expiry" type="date" value={formData.cert_expiry} onChange={handleInputChange} />
          </div>
        </>);

      case 'bpjs':
        return (<>
          <div className="p-4 bg-[var(--success)]/5 border border-[var(--success)]/20 rounded-2xl mb-2 flex items-start gap-3">
            <Info size={16} className="text-[var(--success)] shrink-0 mt-0.5" />
            <p className="text-[10px] text-gray-400">Data BPJS akan digunakan untuk perhitungan payroll otomatis.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SmartInput label="BPJS Kesehatan" name="bpjs_kes" value={formData.bpjs_kes} onChange={handleInputChange} placeholder="No. Peserta" />
            <SmartInput label="BPJS Ketenagakerjaan" name="bpjs_tk" value={formData.bpjs_tk} onChange={handleInputChange} placeholder="No. Peserta" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SmartInput label="Asuransi Lain" name="insurance_name" value={formData.insurance_name} onChange={handleInputChange} placeholder="Nama Asuransi" />
            <SmartInput label="No. Peserta" name="insurance_number" value={formData.insurance_number} onChange={handleInputChange} placeholder="No. Polis" />
          </div>
        </>);

      case 'bank':
        return (<>
          <SmartInput label="Nama Bank" name="bank_name" value={formData.bank_name} onChange={handleInputChange} placeholder="BCA / Mandiri / BRI" />
          <SmartInput label="No. Rekening" name="bank_account" value={formData.bank_account} onChange={handleInputChange} placeholder="1234567890" />
          <SmartInput label="Atas Nama" name="bank_holder" value={formData.bank_holder} onChange={handleInputChange} placeholder="Nama Pemilik Rekening" />
          <SmartInput label="Cabang" name="bank_branch" value={formData.bank_branch} onChange={handleInputChange} placeholder="Cabang Bank" />
        </>);

      case 'other':
        return (<>
          <SmartInput label="Nama Dokumen" name="doc_name" value={formData.doc_name} onChange={handleInputChange} placeholder="Contoh: Paklaring, SKCK, Surat Nikah" />
        </>);

      default: return null;
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6 pb-24 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[var(--aurora-3)]">
            <Shield size={24} />
          </div>
          <div>
            <h2 className="text-xl font-serif font-bold text-white">Brankas Digital</h2>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Secure Document Sync</p>
          </div>
        </div>
        <button onClick={() => setView(v => v === 'history' ? 'categories' : 'history')}
          className={`p-3 rounded-xl border transition-all ${view === 'history' ? 'bg-[var(--aurora-3)] text-black border-[var(--aurora-3)]' : 'bg-white/5 border-white/10 text-gray-400'}`}>
          {view === 'history' ? <XCircle size={20} /> : <History size={20} />}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {view === 'categories' && !activeCategory && (
          <motion.div key="categories" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="grid grid-cols-1 gap-4">
            <div className="p-5 bg-[var(--aurora-3)]/10 border border-[var(--aurora-3)]/30 rounded-3xl mb-2 flex items-start gap-4">
              <Info className="text-[var(--aurora-3)] shrink-0 mt-1" size={18} />
              <p className="text-xs text-gray-300 leading-relaxed">
                Lengkapi dokumen untuk sinkronisasi payroll & PPh 21. Dokumen {' '}
                <span className="text-[var(--success)] font-bold">TERVERIFIKASI</span> {' '}
akan ditandai centang hijau.
              </p>
            </div>
            {categories.map(cat => (
              <motion.button key={cat.id} whileHover={{ x: 5 }} whileTap={{ scale: 0.98 }}
                onClick={() => { setActiveCategory(cat.id); setView('form'); }}
                className="glass-panel p-5 rounded-3xl border border-white/5 flex items-center justify-between group hover:border-white/20 transition-all">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors" style={{ color: cat.color }}>
                    {cat.icon}
                  </div>
                  <div className="text-left">
                    <h4 className="text-white font-bold text-sm">{cat.label}</h4>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Digitalize Document</p>
                  </div>
                </div>
                {cat.complete ? (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--success)]/10 border border-[var(--success)]/20">
                    <span className="text-[8px] font-black text-[var(--success)] uppercase tracking-tighter">Lengkap</span>
                    <CheckCircle2 size={14} className="text-[var(--success)]" />
                  </div>
                ) : (
                  <ChevronRight size={20} className="text-gray-700 group-hover:text-white transition-colors" />
                )}
              </motion.button>
            ))}
          </motion.div>
        )}

        {view === 'form' && activeCategory && (
          <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col gap-6">
            <div className="flex items-center gap-4 p-4 glass-panel rounded-3xl border border-white/10 bg-white/[0.02]">
              <button onClick={() => { setActiveCategory(null); setView('categories'); }} className="p-2 hover:bg-white/5 rounded-xl text-gray-500">
                <ChevronRight className="rotate-180" size={20} />
              </button>
              <h3 className="text-lg font-serif font-bold text-white">{categories.find(c => c.id === activeCategory)?.label}</h3>
            </div>

            <div className="glass-panel p-8 rounded-[40px] border border-white/5 space-y-6">
              <label className="p-8 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-3 hover:border-[var(--aurora-3)]/50 transition-all cursor-pointer group bg-white/[0.02]">
                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} />
                <UploadCloud size={40} className="text-gray-600 group-hover:text-[var(--aurora-3)] transition-all" />
                <p className="text-xs text-center text-gray-500 font-bold uppercase tracking-widest group-hover:text-white">
                  {formData.file ? formData.file.name : `Upload File ${activeCategory.toUpperCase()}`}
                </p>
                <p className="text-[8px] text-gray-700">{formData.file ? 'Ketuk untuk ganti' : 'PDF, JPG, PNG (Max 5MB)'}</p>
              </label>

              <div className="space-y-4">{renderFormFields()}</div>

              <div className="pt-6">
                {showSuccess ? (
                  <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                    className="w-full py-4 rounded-2xl bg-[var(--success)]/20 text-[var(--success)] flex items-center justify-center gap-3 border border-[var(--success)]/30">
                    <CheckCircle2 size={20} />
                    <span className="text-xs font-bold uppercase tracking-widest">Tersimpan & Terkirim</span>
                  </motion.div>
                ) : (
                  <button onClick={handleSubmit} disabled={isSubmitting}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-[var(--aurora-2)] to-[var(--aurora-3)] text-white font-bold uppercase tracking-widest text-xs shadow-[0_15px_30px_rgba(0,201,255,0.2)] flex items-center justify-center gap-3 disabled:opacity-50">
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <><UploadCloud size={16} /> Ajukan Verifikasi <ChevronRight size={16} /></>}
                  </button>
                )}
                <p className="text-[8px] text-center text-gray-600 mt-4 uppercase tracking-[0.2em]">Data akan diverifikasi oleh HRD</p>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'history' && (
          <motion.div key="history" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col gap-4">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-[0.3em] mb-2 ml-2">Riwayat Pengajuan</h3>
            {submissions.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center glass-panel rounded-[32px] border border-white/5 mt-4">
                <FileCheck size={48} className="text-gray-600 mb-4" />
                <h4 className="text-white font-bold text-sm">Belum Ada Dokumen</h4>
                <p className="text-gray-500 text-xs mt-1">Dokumen yang diunggah akan muncul di sini.</p>
              </motion.div>
            ) : (
              submissions.map(sub => {
                const isVerified = sub.status === 'VERIFIED';
                const isRejected = sub.status === 'REJECTED';
                return (
                  <div key={sub.id} className="glass-panel p-5 rounded-3xl border border-white/5 flex justify-between items-center group hover:border-white/10 transition-all">
                    <div className="flex gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isVerified ? 'bg-[var(--success)]/10 text-[var(--success)]' :
                        isRejected ? 'bg-[var(--danger)]/10 text-[var(--danger)]' : 'bg-[var(--warning)]/10 text-[var(--warning)]'}`}>
                        {isVerified ? <CheckCircle2 size={18} /> : isRejected ? <XCircle size={18} /> : <Loader2 size={18} className="animate-spin-slow" />}
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-sm">{sub.type}</h4>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">{sub.date}</p>
                        {sub.note && <p className="text-[10px] text-[var(--danger)] italic mt-2">{sub.note}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {sub.file_url && (
                        <a href={sub.file_url} target="_blank" rel="noopener noreferrer" className="text-[var(--aurora-3)] hover:underline text-[10px]">Lihat</a>
                      )}
                      <span className={`text-[8px] font-black uppercase tracking-tighter px-2 py-0.5 rounded ${
                        isVerified ? 'bg-[var(--success)]/10 text-[var(--success)]' :
                        isRejected ? 'bg-[var(--danger)]/10 text-[var(--danger)]' : 'bg-[var(--warning)]/10 text-[var(--warning)]'}`}>
                        {sub.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const SmartInput = ({ label, ...props }) => (
  <div className="space-y-1.5">
    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-1">{label}</label>
    <input {...props}
      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 text-xs text-white outline-none focus:border-[var(--aurora-3)] placeholder:text-gray-700 transition-all shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]" />
  </div>
);

export default DocumentVault;
