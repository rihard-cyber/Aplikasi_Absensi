import React, { useState } from 'react';
import { Plus, Trash2, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ApprovalWorkflow = () => {
  const [stages, setStages] = useState([
    { id: 1, role: 'Supervisor', requirement: 'Wajib' },
    { id: 2, role: 'HR Manager', requirement: 'Wajib' }
  ]);

  const addStage = () => {
    setStages([...stages, { id: Date.now(), role: 'Pilih Peran', requirement: 'Wajib' }]);
  };

  const removeStage = (id) => {
    setStages(stages.filter(s => s.id !== id));
  };

  return (
    <div className="glass-panel p-8">
      <div className="border-b border-white/10 pb-6 mb-8">
        <h2 className="text-2xl font-serif font-bold text-white tracking-wide">Alur Kerja Multi-Persetujuan</h2>
        <p className="text-sm text-gray-400 mt-2 font-sans tracking-wide">Konfigurasikan hierarki persetujuan bertingkat untuk permintaan cuti dan lembur.</p>
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
                className="flex items-center gap-6 bg-[#1A1C23] p-5 rounded-2xl border border-white/5 shadow-lg relative group transition-all hover:border-white/20"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity"></div>
                
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] text-white flex items-center justify-center font-bold text-lg shadow-[0_0_15px_rgba(142,45,226,0.4)] z-10">
                  {index + 1}
                </div>
                
                <div className="flex-1 z-10">
                  <select className="w-full bg-[#0B0C10] border border-white/10 rounded-lg p-3 text-white light-bloom-input transition-all outline-none appearance-none cursor-pointer">
                    <option value="Supervisor">{stage.role}</option>
                    <option value="Department Head">Kepala Departemen</option>
                    <option value="HR Manager">Manajer HR</option>
                    <option value="Director">Direktur</option>
                  </select>
                </div>
                
                <div className="w-48 z-10">
                  <select className="w-full bg-[#0B0C10] border border-white/10 rounded-lg p-3 text-white light-bloom-input transition-all outline-none appearance-none cursor-pointer">
                    <option>Wajib</option>
                    <option>Opsional (Hanya Info)</option>
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
