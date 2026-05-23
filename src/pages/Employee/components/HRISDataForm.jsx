/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Calendar, MapPin, Briefcase, Heart, CreditCard, Shield, Activity, GraduationCap, Building2, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';

const HRISDataForm = ({ user, onCancel, onSave }) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();
  const [formData, setFormData] = useState({
    // Profiles Table Base Data
    full_name: user.full_name || '',
    email: user.email || '',
    phone: user.phone || '',
    address: user.address || '',
    gender: user.gender || '',
    birth_date: user.birth_date || '',
    nip: user.nip || '',
    
    // Employee HRIS Data
    ktp_number: '', birth_place: '', religion: '', marriage_status: 'TK', children_count: 0,
    tax_status: 'TK-0', mother_name: '', education_level: '', major: '', school_name: '',
    join_date: '', employee_status: '', contract_end_date: '', permanent_date: '', resign_date: '',
    kk_number: '', npwp_number: '', passport_number: '', bpjs_tk_number: '', bpjs_kes_number: '',
    other_insurance_name: '', other_insurance_number: '', bank_name: '', bank_account_number: '',
    bank_account_name: '', bank_branch: '', ktp_address: '', postal_code: '', domicile_address: '',
    mobile_phone: '', emergency_contact_name: '', emergency_contact_relation: '', emergency_contact_number: '',
    shirt_size: '', pants_size: '', shoes_size: '', kta_number: '', certificate_number: '',
    certificate_issued_date: '', certificate_expiry_date: ''
  });

  const isSatpam = (user.divisions?.name || user.division || '').toLowerCase().includes('satpam') || (user.divisions?.name || user.division || '').toLowerCase().includes('security');

  useEffect(() => {
    fetchHRISData();
  }, [user.id]);

  const fetchHRISData = async () => {
    try {
      const { data, error } = await supabase
        .from('employee_hris_data')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data) {
        setFormData(prev => ({ ...prev, ...data }));
      }
    } catch (e) {
      console.error("Error fetching HRIS Data:", e);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // Auto-calculate tax status
      if (name === 'marriage_status' || name === 'children_count') {
        const ms = newData.marriage_status || 'TK';
        const cc = parseInt(newData.children_count || 0);
        const validCc = cc > 3 ? 3 : cc; // Max 3 anak untuk PTKP
        newData.tax_status = `${ms}-${validCc}`;
      }
      
      return newData;
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // 1. Update basic data in profiles table
      const profilePayload = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        gender: formData.gender,
        birth_date: formData.birth_date === '' ? null : formData.birth_date,
      };
      const { error: profileError } = await supabase.from('profiles').update(profilePayload).eq('id', user.id);
      
      if (profileError) throw profileError;

      // 2. Prepare HRIS Data Payload
      const hrisPayload = { ...formData };
      
      // Clean up empty strings for date columns to avoid Postgres syntax errors
      const dateColumns = ['join_date', 'contract_end_date', 'permanent_date', 'resign_date', 'certificate_issued_date', 'certificate_expiry_date'];
      dateColumns.forEach(key => {
        if (hrisPayload[key] === '') {
          hrisPayload[key] = null;
        }
      });

      delete hrisPayload.full_name;
      delete hrisPayload.email;
      delete hrisPayload.phone;
      delete hrisPayload.address;
      delete hrisPayload.gender;
      delete hrisPayload.birth_date;
      delete hrisPayload.nip;
      delete hrisPayload.id; // ensure no conflict
      
      hrisPayload.user_id = user.id;
      hrisPayload.tenant_id = user.tenant_id;

      // 3. Upsert HRIS Data
      const { data: existingData } = await supabase.from('employee_hris_data').select('id').eq('user_id', user.id).maybeSingle();
      
      let hrisError;
      if (existingData) {
        const { error } = await supabase.from('employee_hris_data').update(hrisPayload).eq('user_id', user.id);
        hrisError = error;
      } else {
        const { error } = await supabase.from('employee_hris_data').insert([hrisPayload]);
        hrisError = error;
      }

      if (hrisError) throw hrisError;

      onSave({ ...user, ...formData });
    } catch (e) {
      toast("Gagal menyimpan data: " + e.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicators = () => (
    <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar">
      {[1, 2, 3, 4, 5, isSatpam ? 6 : null].filter(Boolean).map(s => (
        <div key={s} className={`h-1.5 flex-1 rounded-full ${step >= s ? 'bg-[var(--aurora-3)]' : 'bg-white/10'}`} />
      ))}
    </div>
  );

  return (
    <div className="flex flex-col h-full max-h-[85vh]">
      {renderStepIndicators()}
      
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6 pb-6">
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <h4 className="text-[var(--aurora-3)] font-bold text-sm uppercase tracking-widest flex items-center gap-2 mb-4"><User size={16}/> 1. Data Diri Utama</h4>
            <SmartInput icon={<CreditCard />} label="Nomor KTP (NIK)" name="ktp_number" value={formData.ktp_number} onChange={handleInputChange} />
            <SmartInput icon={<User />} label="Nama Lengkap (Sesuai KTP)" name="full_name" value={formData.full_name} onChange={handleInputChange} />
            <div className="grid grid-cols-2 gap-4">
              <SmartSelect label="Jenis Kelamin" name="gender" value={formData.gender} onChange={handleInputChange} options={[{val: 'Laki-laki', label: 'Laki-laki'}, {val: 'Perempuan', label: 'Perempuan'}]} />
              <SmartSelect label="Agama" name="religion" value={formData.religion} onChange={handleInputChange} options={[{val: 'Islam', label: 'Islam'}, {val: 'Kristen', label: 'Kristen'}, {val: 'Katolik', label: 'Katolik'}, {val: 'Hindu', label: 'Hindu'}, {val: 'Buddha', label: 'Buddha'}, {val: 'Konghucu', label: 'Konghucu'}]} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SmartInput label="Tempat Lahir" name="birth_place" value={formData.birth_place} onChange={handleInputChange} />
              <SmartInput type="date" label="Tanggal Lahir" name="birth_date" value={formData.birth_date} onChange={handleInputChange} />
            </div>
            <SmartInput label="Nama Ibu Kandung" name="mother_name" value={formData.mother_name} onChange={handleInputChange} />
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <h4 className="text-[var(--aurora-3)] font-bold text-sm uppercase tracking-widest flex items-center gap-2 mb-4"><Heart size={16}/> 2. Keluarga & Pendidikan</h4>
            <div className="grid grid-cols-2 gap-4">
              <SmartSelect label="Status Pernikahan" name="marriage_status" value={formData.marriage_status} onChange={handleInputChange} options={[{val: 'TK', label: 'Tidak Kawin'}, {val: 'K', label: 'Kawin'}]} />
              <SmartInput type="number" label="Jumlah Anak" name="children_count" value={formData.children_count} onChange={handleInputChange} />
            </div>
            <div className="p-3 bg-[var(--aurora-3)]/10 border border-[var(--aurora-3)]/30 rounded-xl">
              <p className="text-[10px] text-gray-400">Estimasi Status PTKP Pajak: <span className="font-bold text-[var(--aurora-3)]">{formData.tax_status}</span></p>
            </div>
            
            <h4 className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-6 mb-2">Riwayat Pendidikan</h4>
            <SmartSelect label="Pendidikan Terakhir" name="education_level" value={formData.education_level} onChange={handleInputChange} options={[{val: 'SMA/SMK', label: 'SMA/SMK'}, {val: 'D3', label: 'D3'}, {val: 'S1', label: 'S1'}, {val: 'S2', label: 'S2'}]} />
            <SmartInput label="Jurusan" name="major" value={formData.major} onChange={handleInputChange} />
            <SmartInput label="Nama Sekolah / Universitas" name="school_name" value={formData.school_name} onChange={handleInputChange} />
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <h4 className="text-[var(--aurora-3)] font-bold text-sm uppercase tracking-widest flex items-center gap-2 mb-4"><Briefcase size={16}/> 3. Informasi Pekerjaan</h4>
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl mb-4">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Data Read-Only (HR)</p>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-[9px] text-gray-400">NIP</p><p className="text-xs font-bold text-white">{formData.nip}</p></div>
                <div><p className="text-[9px] text-gray-400">Jabatan & Divisi</p><p className="text-xs font-bold text-white">{user.position} - {user.division}</p></div>
              </div>
            </div>
            
            <SmartSelect label="Status Karyawan" name="employee_status" value={formData.employee_status} onChange={handleInputChange} options={[{val: 'PKWT', label: 'PKWT (Kontrak)'}, {val: 'PKWTT', label: 'PKWTT'}, {val: 'TETAP', label: 'Karyawan Tetap'}, {val: 'INTERN', label: 'Magang'}]} />
            <div className="grid grid-cols-2 gap-4">
              <SmartInput type="date" label="Tanggal Masuk" name="join_date" value={formData.join_date} onChange={handleInputChange} />
              <SmartInput type="date" label="Akhir Kontrak (Jika PKWT)" name="contract_end_date" value={formData.contract_end_date} onChange={handleInputChange} />
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <h4 className="text-[var(--aurora-3)] font-bold text-sm uppercase tracking-widest flex items-center gap-2 mb-4"><Activity size={16}/> 4. Legal, Asuransi & Bank</h4>
            <SmartInput label="No. Kartu Keluarga" name="kk_number" value={formData.kk_number} onChange={handleInputChange} />
            <SmartInput label="NPWP" name="npwp_number" value={formData.npwp_number} onChange={handleInputChange} />
            <div className="grid grid-cols-2 gap-4">
              <SmartInput label="BPJS Ketenagakerjaan" name="bpjs_tk_number" value={formData.bpjs_tk_number} onChange={handleInputChange} />
              <SmartInput label="BPJS Kesehatan" name="bpjs_kes_number" value={formData.bpjs_kes_number} onChange={handleInputChange} />
            </div>
            
            <h4 className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-6 mb-2">Informasi Bank</h4>
            <div className="grid grid-cols-2 gap-4">
              <SmartInput label="Nama Bank" name="bank_name" value={formData.bank_name} onChange={handleInputChange} placeholder="BCA / Mandiri" />
              <SmartInput label="No. Rekening" name="bank_account_number" value={formData.bank_account_number} onChange={handleInputChange} />
            </div>
            <SmartInput label="Nama Pemilik Rekening" name="bank_account_name" value={formData.bank_account_name} onChange={handleInputChange} />
            <SmartInput label="Kantor Cabang Bank" name="bank_branch" value={formData.bank_branch} onChange={handleInputChange} />
          </motion.div>
        )}

        {step === 5 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <h4 className="text-[var(--aurora-3)] font-bold text-sm uppercase tracking-widest flex items-center gap-2 mb-4"><MapPin size={16}/> 5. Alamat & Kontak</h4>
            <SmartInput label="Alamat Sesuai KTP" name="ktp_address" value={formData.ktp_address} onChange={handleInputChange} isTextArea />
            <SmartInput label="Alamat Domisili" name="domicile_address" value={formData.domicile_address} onChange={handleInputChange} isTextArea />
            <div className="grid grid-cols-2 gap-4">
              <SmartInput label="No. HP Pribadi" name="mobile_phone" value={formData.mobile_phone} onChange={handleInputChange} />
              <SmartInput label="Email Aktif" name="email" value={formData.email} onChange={handleInputChange} />
            </div>
            
            <h4 className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-6 mb-2">Kontak Darurat</h4>
            <SmartInput label="Nama Kontak Darurat" name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleInputChange} />
            <div className="grid grid-cols-2 gap-4">
              <SmartInput label="Hubungan Keluarga" name="emergency_contact_relation" value={formData.emergency_contact_relation} onChange={handleInputChange} placeholder="Istri / Kakak / Ayah" />
              <SmartInput label="No. Telepon Darurat" name="emergency_contact_number" value={formData.emergency_contact_number} onChange={handleInputChange} />
            </div>

            <h4 className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-6 mb-2">Ukuran Seragam</h4>
            <div className="grid grid-cols-3 gap-4">
              <SmartInput label="Baju" name="shirt_size" value={formData.shirt_size} onChange={handleInputChange} placeholder="M / L" />
              <SmartInput label="Celana" name="pants_size" value={formData.pants_size} onChange={handleInputChange} placeholder="32" />
              <SmartInput label="Sepatu" name="shoes_size" value={formData.shoes_size} onChange={handleInputChange} placeholder="42" />
            </div>
          </motion.div>
        )}

        {step === 6 && isSatpam && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <h4 className="text-[var(--warning)] font-bold text-sm uppercase tracking-widest flex items-center gap-2 mb-4"><Shield size={16}/> 6. Data Spesifik Security</h4>
            <div className="p-4 bg-[var(--warning)]/10 border border-[var(--warning)]/30 rounded-2xl mb-4 text-xs text-gray-300">
              Form ini hanya muncul karena divisi Anda adalah <strong>{user.division}</strong>. Lengkapi data legalitas Satpam Anda.
            </div>
            <SmartInput label="Nomor KTA" name="kta_number" value={formData.kta_number} onChange={handleInputChange} />
            <SmartInput label="Nomor Sertifikat" name="certificate_number" value={formData.certificate_number} onChange={handleInputChange} />
            <div className="grid grid-cols-2 gap-4">
              <SmartInput type="date" label="Tgl Sertifikat Keluar" name="certificate_issued_date" value={formData.certificate_issued_date} onChange={handleInputChange} />
              <SmartInput type="date" label="Tgl Sertifikat Berakhir" name="certificate_expiry_date" value={formData.certificate_expiry_date} onChange={handleInputChange} />
            </div>
          </motion.div>
        )}

      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-4 pt-4 border-t border-white/10 mt-auto">
        <button 
          onClick={() => step > 1 ? setStep(step - 1) : onCancel()} 
          className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all flex items-center justify-center"
        >
          {step > 1 ? <ChevronLeft size={16} /> : 'Batal'}
        </button>
        <button 
          onClick={() => step < (isSatpam ? 6 : 5) ? setStep(step + 1) : handleSubmit()}
          disabled={isSubmitting}
          className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(142,45,226,0.3)]"
        >
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : step < (isSatpam ? 6 : 5) ? <>Lanjut <ChevronRight size={16} /></> : 'Simpan Data HRIS'}
        </button>
      </div>
    </div>
  );
};

const SmartInput = ({ label, icon, isTextArea, ...props }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative">
      {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">{icon}</div>}
      {isTextArea ? (
        <textarea
          {...props}
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-xs text-white outline-none focus:border-[var(--aurora-3)] transition-all min-h-[80px]"
        />
      ) : (
        <input
          {...props}
          className={`w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 ${icon ? 'pl-11 pr-4' : 'px-4'} text-xs text-white outline-none focus:border-[var(--aurora-3)] transition-all`}
        />
      )}
    </div>
  </div>
);

const SmartSelect = ({ label, options, ...props }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-1">{label}</label>
    <select
      {...props}
      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 text-xs text-white outline-none focus:border-[var(--aurora-3)] transition-all"
    >
      <option value="" disabled>Pilih...</option>
      {options.map(opt => <option key={opt.val} value={opt.val} className="bg-[#0B0C10]">{opt.label}</option>)}
    </select>
  </div>
);

export default HRISDataForm;
