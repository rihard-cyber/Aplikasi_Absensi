import React, { useState, useEffect, useRef } from 'react';
import { Building, MapPin, Phone, Globe, Upload, Save, Loader2, CheckCircle2, Key, Copy, RefreshCcw } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { copyToClipboard } from '../../../utils/clipboardUtil';

const CompanyProfile = ({ onUpdate }) => {
  const [tenant, setTenant] = useState({
    name: '',
    address: '',
    phone: '',
    website: '',
    logo_url: '',
    subscription_tier: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [isCopied, setIsCopied] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchTenantData();
  }, []);

  const fetchTenantData = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).single();
      
      if (profile?.tenant_id) {
        const { data: tData, error } = await supabase.from('tenants').select('*').eq('id', profile.tenant_id).single();
        if (error) throw error;
        setTenant(tData);
      }
    } catch (e) {
      console.error("Gagal menarik data perusahaan", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaveStatus('saving');
    try {
      const { error } = await supabase.from('tenants').update({
        name: tenant.name,
        address: tenant.address,
        phone: tenant.phone,
        website: tenant.website
      }).eq('id', tenant.id);

      if (error) throw error;
      setSaveStatus('saved');
      alert("Profil perusahaan berhasil disimpan!");
      if (onUpdate) onUpdate(); // Trigger sidebar refresh
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (e) {
      console.error("Gagal update profil", e);
      setSaveStatus('error');
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${tenant.id}-${Math.random()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase.from('tenants')
        .update({ logo_url: publicUrl })
        .eq('id', tenant.id);

      if (updateError) throw updateError;
      
      setTenant({ ...tenant, logo_url: publicUrl });
      alert("Logo perusahaan berhasil diperbarui!");
      if (onUpdate) onUpdate(); // Trigger sidebar refresh
    } catch (e) {
      console.error("Logo upload failed", e);
      alert("Gagal mengunggah logo: " + e.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateCode = async () => {
    if (tenant.activation_code && !window.confirm("Peringatan: Mengubah Kode Aktivasi akan membuat kode lama hangus untuk karyawan yang belum mendaftar. Lanjutkan?")) return;
    try {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let newCode = 'SI-';
      for (let i = 0; i < 4; i++) newCode += chars.charAt(Math.floor(Math.random() * chars.length));
      newCode += '-';
      for (let i = 0; i < 4; i++) newCode += chars.charAt(Math.floor(Math.random() * chars.length));

      const { error } = await supabase.from('tenants').update({ activation_code: newCode }).eq('id', tenant.id);
      if (error) throw new Error(`Gagal menyimpan kode (${error.code}): ${error.message}`);
      
      setTenant(prev => ({ ...prev, activation_code: newCode }));
      alert(`Kode Aktivasi Karyawan berhasil diperbarui!\n\nKode Baru: ${newCode}\n\nBagikan kode ini ke karyawan.`);
    } catch (e) {
      console.error('Gagal generate kode:', e);
      alert('Gagal membuat kode baru: ' + e.message);
    }
  };

  if (isLoading) return <div className="p-10 text-center text-gray-500">Memuat Profil Perusahaan...</div>;

  if (!tenant?.id) {
    return (
      <div className="p-10 text-center glass-panel max-w-2xl mx-auto mt-10">
        <h3 className="text-[var(--danger)] font-bold text-xl mb-2">Akses Ditolak</h3>
        <p className="text-gray-400">Anda tidak terkait dengan perusahaan manapun (Atau sedang dalam mode SuperAdmin). Silakan akses menu Manajemen Tenant di Dasbor Global untuk membuat perusahaan baru.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-serif font-bold text-white tracking-wide">Profil Perusahaan</h2>
          <p className="text-gray-400 text-sm mt-1">Kelola identitas dan informasi publik organisasi Anda.</p>
        </div>
        <div className="flex items-center gap-2">
          {tenant.subscription_tier && (
            <span className="px-3 py-1 rounded-full bg-[var(--warning)]/10 text-[var(--warning)] text-[10px] font-black uppercase tracking-widest border border-[var(--warning)]/20">
              Paket {tenant.subscription_tier}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Logo Section */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-8 border border-white/5 flex flex-col items-center text-center">
            <div className="relative group">
              <div className="w-32 h-32 rounded-[32px] bg-[#0B0C10] border-2 border-white/10 overflow-hidden flex items-center justify-center shadow-2xl transition-all group-hover:border-[var(--aurora-1)]/50">
                {tenant.logo_url ? (
                  <img src={tenant.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <Building size={48} className="text-gray-700" />
                )}
                
                {isUploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-[var(--aurora-1)]" />
                  </div>
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-[var(--aurora-1)] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
              >
                <Upload size={18} />
              </button>
              <input type="file" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
            </div>
            
            <div className="mt-6">
              <h4 className="text-white font-bold">{tenant.name}</h4>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mt-1">Company Identity</p>
            </div>
          </div>

          <div className="glass-panel p-6 border border-white/5 bg-[var(--aurora-3)]/5">
             <h5 className="text-xs font-black text-[var(--aurora-3)] uppercase tracking-[0.2em] mb-3">Tips Branding</h5>
             <p className="text-[11px] text-gray-400 leading-relaxed">Gunakan logo berformat PNG transparan dengan ukuran minimal 512x512px untuk tampilan terbaik di semua perangkat.</p>
          </div>

          <div className="glass-panel p-6 border border-[var(--warning)]/20 bg-gradient-to-br from-[var(--warning)]/10 to-transparent relative overflow-hidden group">
             <Key size={100} className="absolute -bottom-5 -right-5 text-[var(--warning)] opacity-10 group-hover:scale-110 transition-transform" />
             <h5 className="text-xs font-black text-[var(--warning)] uppercase tracking-[0.2em] mb-3 flex items-center gap-2"><Key size={14} /> Kode Aktivasi Perusahaan</h5>
             <p className="text-[10px] text-gray-400 leading-relaxed mb-4">Bagikan kode ini kepada karyawan agar mereka dapat bergabung ke sistem presensi perusahaan Anda.</p>
             <div className="flex items-center justify-between bg-[#0B0C10] border border-[var(--warning)]/30 rounded-xl p-3">
               <span className="font-mono text-white tracking-widest font-bold text-sm">{tenant.activation_code || 'TIDAK TERSEDIA'}</span>
               <div className="flex gap-2">
                 <button 
                   type="button"
                   onClick={handleGenerateCode}
                   className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-2 px-3"
                   title="Generate Kode Baru"
                 >
                   <RefreshCcw size={14} className={!tenant.activation_code ? 'animate-spin-slow text-[var(--warning)]' : ''} />
                   <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:block">Generate</span>
                 </button>
                 <button 
                   type="button"
                    onClick={() => {
                      if (!tenant.activation_code) return alert("Generate kode terlebih dahulu!");
                      copyToClipboard(tenant.activation_code);
                      setIsCopied(true);
                      setTimeout(() => setIsCopied(false), 2000);
                    }}
                   className={`p-2 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${isCopied ? 'bg-[var(--success)]/20 text-[var(--success)]' : 'bg-[var(--warning)]/20 hover:bg-[var(--warning)] text-[var(--warning)] hover:text-[#0B0C10]'}`}
                   title="Salin Kode"
                 >
                   {isCopied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                   {isCopied && <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:block">Tersalin!</span>}
                 </button>
               </div>
             </div>
          </div>
        </div>

        {/* Data Section */}
        <div className="lg:col-span-2">
          <form onSubmit={handleUpdate} className="glass-panel p-8 border border-white/5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-2 ml-1">Nama Resmi Perusahaan</label>
                <div className="relative">
                  <Building size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                  <input required value={tenant.name} onChange={e => setTenant({...tenant, name: e.target.value})} type="text" className="w-full bg-[#0B0C10] border border-white/10 rounded-2xl pl-12 pr-5 py-4 text-white outline-none focus:border-[var(--aurora-1)] transition-all" />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-2 ml-1">Alamat Kantor Pusat</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-4 top-4 text-gray-600" />
                  <textarea value={tenant.address || ''} onChange={e => setTenant({...tenant, address: e.target.value})} className="w-full bg-[#0B0C10] border border-white/10 rounded-2xl pl-12 pr-5 py-4 text-white outline-none focus:border-[var(--aurora-1)] transition-all h-24 resize-none" placeholder="Masukkan alamat lengkap..." />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-2 ml-1">Nomor Telepon</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                  <input value={tenant.phone || ''} onChange={e => setTenant({...tenant, phone: e.target.value})} type="tel" className="w-full bg-[#0B0C10] border border-white/10 rounded-2xl pl-12 pr-5 py-4 text-white outline-none focus:border-[var(--aurora-1)] transition-all" placeholder="021-XXXXXXX" />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-2 ml-1">Website (Opsional)</label>
                <div className="relative">
                  <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                  <input value={tenant.website || ''} onChange={e => setTenant({...tenant, website: e.target.value})} type="url" className="w-full bg-[#0B0C10] border border-white/10 rounded-2xl pl-12 pr-5 py-4 text-white outline-none focus:border-[var(--aurora-1)] transition-all" placeholder="https://..." />
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-white/5 mt-8">
              <div className="flex items-center gap-3">
                {saveStatus === 'saving' && <span className="text-xs text-[var(--aurora-1)] animate-pulse">Menyimpan perubahan...</span>}
                {saveStatus === 'saved' && <span className="text-xs text-[var(--success)] flex items-center gap-2"><CheckCircle2 size={14}/> Perubahan disimpan!</span>}
              </div>
              <button disabled={saveStatus === 'saving'} type="submit" className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[var(--aurora-1)] to-[#1E90FF] text-white font-bold tracking-widest uppercase hover:scale-[1.02] transition-transform shadow-lg flex items-center gap-2 disabled:opacity-50">
                {saveStatus === 'saving' ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Simpan Profil
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

export default CompanyProfile;
