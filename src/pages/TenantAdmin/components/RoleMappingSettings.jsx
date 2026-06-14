import React, { useState, useEffect } from 'react';
import { Shield, Key, Plus, Trash2, Save, Loader2, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';

const ROLE_CATEGORIES = ['DIREKTUR', 'HRD', 'MANAJEMEN', 'KARYAWAN'];

const RoleMappingSettings = () => {
  const [mappings, setMappings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState(null);
  const toast = useToast();

  useEffect(() => {
    fetchMappings();
  }, []);

  const fetchMappings = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).single();
      setTenantId(profile.tenant_id);

      const { data } = await supabase
        .from('tenant_role_permissions')
        .select('*')
        .eq('tenant_id', profile.tenant_id);

      if (data && data.length > 0) {
        setMappings(data);
      } else {
        // Default mappings if empty
        setMappings(ROLE_CATEGORIES.map(r => ({
          role_name: r,
          allowed_modules: [],
          keyword_triggers: r === 'MANAJEMEN' ? ['manager', 'supervisor', 'spv', 'lead'] : []
        })));
      }
    } catch (e) {
      console.error('Failed to fetch role mappings:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      const payload = mappings.map(m => ({
        tenant_id: tenantId,
        role_name: m.role_name,
        allowed_modules: m.allowed_modules || [],
        keyword_triggers: m.keyword_triggers || []
      }));

      const { error } = await supabase
        .from('tenant_role_permissions')
        .upsert(payload, { onConflict: 'tenant_id, role_name' });

      if (error) throw error;
      toast('Pengaturan roles berhasil disimpan!', 'success');
    } catch (e) {
      toast('Gagal menyimpan: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateMapping = (roleName, field, value) => {
    setMappings(prev => prev.map(m => 
      m.role_name === roleName ? { ...m, [field]: value } : m
    ));
  };

  if (isLoading) return <div className="flex items-center justify-center p-12"><Loader2 className="animate-spin text-[var(--aurora-3)]" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass-panel p-6 border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--aurora-1)]/5 rounded-full blur-[100px] pointer-events-none" />
        <h2 className="text-xl font-serif font-bold text-white mb-1">Konfigurasi Hak Akses Otomatis</h2>
        <p className="text-xs text-gray-400">Tentukan kata kunci (keywords) yang akan memicu penentuan peran (role) saat data di-upload.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {mappings.map((m) => (
          <div key={m.role_name} className="glass-panel p-6 border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[var(--aurora-1)]/10 flex items-center justify-center text-[var(--aurora-1)]">
                  <Shield size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-white">{m.role_name}</h4>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">Kategori Peran Sistem</p>
                </div>
              </div>

              <div className="flex-1 max-w-xl">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Kata Kunci Pemicu (Keywords)</label>
                <div className="flex flex-wrap gap-2 p-3 bg-[#0B0C10] border border-white/10 rounded-xl">
                  {m.keyword_triggers?.map((kw, idx) => (
                    <span key={idx} className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] text-white flex items-center gap-2">
                      {kw}
                      <button 
                        onClick={() => {
                          const newKws = m.keyword_triggers.filter((_, i) => i !== idx);
                          updateMapping(m.role_name, 'keyword_triggers', newKws);
                        }}
                        className="text-gray-500 hover:text-[var(--danger)]"
                      >
                        <Trash2 size={10} />
                      </button>
                    </span>
                  ))}
                  <input 
                    type="text" 
                    placeholder="Tambah kata kunci..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value) {
                        const newKws = [...(m.keyword_triggers || []), e.target.value.toLowerCase()];
                        updateMapping(m.role_name, 'keyword_triggers', newKws);
                        e.target.value = '';
                      }
                    }}
                    className="flex-1 min-w-[120px] bg-transparent text-[10px] text-white outline-none"
                  />
                </div>
                <p className="text-[9px] text-gray-600 mt-2 flex items-center gap-1">
                  <Info size={10} /> Contoh: Jika jabatan di Excel mengandung "Manager", maka otomatis masuk kategori ini.
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-4">
        <button 
          onClick={handleSave}
          disabled={saving}
          className="px-10 py-4 bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-[0_0_20px_rgba(142,45,226,0.3)] hover:scale-105 flex items-center gap-2"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Simpan Konfigurasi Otomatisasi
        </button>
      </div>
    </div>
  );
};

export default RoleMappingSettings;
