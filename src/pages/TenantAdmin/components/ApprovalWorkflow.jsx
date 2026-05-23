/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowDown, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';

const ApprovalWorkflow = () => {
  const [stages, setStages] = useState([]);
  const [tenantId, setTenantId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    setIsLoading(true);
    try {
      const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
      if (!profile?.tenant_id && !isGod) return;
      if (profile?.tenant_id) setTenantId(profile.tenant_id);

      let q = supabase.from('approval_workflows').select('*');
      if (profile?.tenant_id) q = q.eq('tenant_id', profile.tenant_id);
      q = q.order('stage_number', { ascending: true });
      const { data, error } = await q;
      if (error) throw error;
      
      if (data && data.length > 0) {
        setStages(data.map(d => ({ id: d.id, role: d.role, requirement: d.is_required ? 'Wajib' : 'Opsional (Hanya Info)' })));
      } else {
        setStages([
          { id: Date.now(), role: 'Supervisor', requirement: 'Wajib' },
          { id: Date.now() + 1, role: 'HR Manager', requirement: 'Wajib' }
        ]);
      }
    } catch (e) {
      console.error("Gagal menarik data alur persetujuan", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenantId) return;
    setIsSaving(true);
    try {
      // Simplest way to sync an ordered array: delete all and insert new
      await supabase.from('approval_workflows').delete().eq('tenant_id', tenantId);
      
      if (stages.length > 0) {
        const payload = stages.map((s, index) => ({
          tenant_id: tenantId,
          stage_number: index + 1,
          role: s.role,
          is_required: s.requirement === 'Wajib'
        }));
        const { error } = await supabase.from('approval_workflows').insert(payload);
        if (error) throw error;
      }
      
      toast("Alur persetujuan berhasil disimpan!", 'success');
    } catch (e) {
      toast("Gagal menyimpan alur: " + e.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const addStage = () => {
    setStages([...stages, { id: Date.now(), role: 'Pilih Peran', requirement: 'Wajib' }]);
  };

  const removeStage = (id) => {
    setStages(stages.filter(s => s.id !== id));
  };

  const handleRoleChange = (id, newRole) => {
    setStages(stages.map(s => s.id === id ? { ...s, role: newRole } : s));
  };

  const handleReqChange = (id, newReq) => {
    setStages(stages.map(s => s.id === id ? { ...s, requirement: newReq } : s));
  };

  return (
    <div className="glass-panel p-4 sm:p-6 lg:p-8">
      <div className="border-b border-white/10 pb-6 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-wide">Alur Kerja Multi-Persetujuan</h2>
          <p className="text-sm text-gray-400 mt-2 font-sans tracking-wide">Konfigurasikan hierarki persetujuan bertingkat untuk permintaan cuti dan lembur.</p>
        </div>
        <button onClick={handleSave} disabled={isSaving || isLoading} className="bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-2)] hover:from-[var(--aurora-2)] hover:to-[var(--aurora-3)] text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-all shadow-[0_0_20px_rgba(142,45,226,0.4)] hover:shadow-[0_0_30px_rgba(0,201,255,0.6)] disabled:opacity-50 whitespace-nowrap">
          <Save size={18} /> {isSaving ? 'Menyimpan...' : 'Simpan Alur'}
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="bg-[var(--aurora-1)]/10 border border-[var(--aurora-1)]/30 p-4 rounded-xl mb-6 text-sm text-[var(--aurora-3)] shadow-[0_0_15px_rgba(142,45,226,0.1)]">
          <strong className="tracking-widest uppercase text-xs mr-2 text-white">Cara kerjanya:</strong> Permintaan akan diproses secara berurutan. Jika ditolak di tahap mana pun, permintaan akan langsung digagalkan.
        </div>

        <AnimatePresence>
          {stages.map((stage, index) => (
            <React.Fragment key={stage.id}>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-3 sm:gap-6 bg-[#1A1C23] p-4 sm:p-5 rounded-2xl border border-white/5 shadow-lg relative group transition-all hover:border-white/20"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity"></div>
                
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] text-white flex items-center justify-center font-bold text-lg shadow-[0_0_15px_rgba(142,45,226,0.4)] z-10">
                  {index + 1}
                </div>
                
                <div className="flex-1 z-10">
                  <select value={stage.role} onChange={e => handleRoleChange(stage.id, e.target.value)} className="w-full bg-[#0B0C10] border border-white/10 rounded-lg p-3 text-white light-bloom-input transition-all outline-none appearance-none cursor-pointer">
                    <option value="Supervisor">Supervisor</option>
                    <option value="Department Head">Kepala Departemen</option>
                    <option value="HR Manager">Manajer HR</option>
                    <option value="Director">Direktur</option>
                    <option value="Pilih Peran">Pilih Peran...</option>
                  </select>
                </div>
                
                <div className="w-32 sm:w-48 z-10">
                  <select value={stage.requirement} onChange={e => handleReqChange(stage.id, e.target.value)} className="w-full bg-[#0B0C10] border border-white/10 rounded-lg p-3 text-white light-bloom-input transition-all outline-none appearance-none cursor-pointer">
                    <option value="Wajib">Wajib</option>
                    <option value="Opsional (Hanya Info)">Opsional (Hanya Info)</option>
                  </select>
                </div>
                
                <button 
                  onClick={() => removeStage(stage.id)}
                  className="p-3 text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white rounded-xl transition-colors z-10"
                  title="Hapus Tahap"
                >
                  <Trash2 size={20} />
                </button>
              </motion.div>
              
              {/* Arrow connecting stages */}
              {index < stages.length - 1 && (
                <div className="flex justify-center text-[var(--aurora-3)] py-2 opacity-50">
                  <ArrowDown size={24} className="animate-bounce" />
                </div>
              )}
            </React.Fragment>
          ))}
        </AnimatePresence>

        <button 
          onClick={addStage}
          className="mt-6 border-2 border-dashed border-white/20 text-gray-400 hover:text-white hover:border-[var(--aurora-3)] p-5 rounded-2xl flex items-center justify-center gap-3 transition-all font-medium hover:bg-white/5 hover:shadow-[0_0_20px_rgba(0,201,255,0.2)]"
        >
          <Plus size={20} className="text-[var(--aurora-3)]" /> Tambah Tahap Persetujuan
        </button>
      </div>
    </div>
  );
};

export default ApprovalWorkflow;
