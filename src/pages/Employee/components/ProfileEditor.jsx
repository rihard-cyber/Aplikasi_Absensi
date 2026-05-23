/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, ArrowLeft, User, Phone, Mail, MapPin, Calendar, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';

const ProfileEditor = ({ onBack }) => {
  const [profile, setProfile] = useState({ full_name: '', phone: '', address: '', gender: '', birth_date: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const toast = useToast();

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: p } = await supabase.from('profiles').select('id, full_name, phone, address, gender, birth_date').eq('auth_id', session.user.id).maybeSingle();
    if (p) setProfile({ full_name: p.full_name || '', phone: p.phone || '', address: p.address || '', gender: p.gender || '', birth_date: p.birth_date || '' });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { error } = await supabase.from('profiles').update({
        full_name: profile.full_name, phone: profile.phone, address: profile.address,
        gender: profile.gender, birth_date: profile.birth_date || null
      }).eq('auth_id', session.user.id);
      if (error) throw error;
      setSaved(true);
      toast('Profil berhasil diperbarui!', 'success');
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
    finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6 pb-8">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors w-fit"><ArrowLeft size={18} /> Kembali</button>

      <div className="glass-panel p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center text-xl font-bold text-white">{profile.full_name?.charAt(0) || 'U'}</div>
          <div>
            <h2 className="text-xl font-serif font-bold text-white">Edit Profil Saya</h2>
            <p className="text-sm text-gray-400">Perbarui data diri Anda</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1"><User size={12} /> Nama Lengkap</label>
            <input value={profile.full_name} onChange={e => setProfile({...profile, full_name: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-3)]" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1"><Phone size={12} /> No. HP</label>
              <input value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1"><Calendar size={12} /> Tanggal Lahir</label>
              <input type="date" value={profile.birth_date} onChange={e => setProfile({...profile, birth_date: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1"><MapPin size={12} /> Alamat</label>
            <textarea value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})} rows={3} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-3)]" />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Jenis Kelamin</label>
            <div className="flex gap-4">
              {['Laki-laki', 'Perempuan'].map(g => (
                <label key={g} className={`flex-1 p-4 rounded-xl border cursor-pointer text-center transition-all ${profile.gender === g ? 'bg-[var(--aurora-3)]/10 border-[var(--aurora-3)]/30 text-[var(--aurora-3)]' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'}`}>
                  <input type="radio" name="gender" value={g} checked={profile.gender === g} onChange={e => setProfile({...profile, gender: e.target.value})} className="hidden" />
                  {g}
                </label>
              ))}
            </div>
          </div>
          <button onClick={handleSave} disabled={saving} className="w-full py-4 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <><CheckCircle2 size={16} /> Tersimpan!</> : <><Save size={16} /> Simpan Perubahan</>}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProfileEditor;
