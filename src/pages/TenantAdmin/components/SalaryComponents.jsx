import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit3, Trash2, Save, X, DollarSign, Percent } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { useConfirm } from '../../../components/ConfirmDialog';

const defaultComponents = [
  { code: 'GP', name: 'Gaji Pokok', type: 'ALLOWANCE', category: 'FIXED', is_taxable: true, is_bpjs: true },
  { code: 'TJ', name: 'Tunjangan Jabatan', type: 'ALLOWANCE', category: 'FIXED', is_taxable: true, is_bpjs: true },
  { code: 'TM', name: 'Tunjangan Makan', type: 'ALLOWANCE', category: 'FIXED', is_taxable: false, is_bpjs: false },
  { code: 'TT', name: 'Tunjangan Transport', type: 'ALLOWANCE', category: 'FIXED', is_taxable: false, is_bpjs: false },
  { code: 'LEMBUR', name: 'Lembur', type: 'ALLOWANCE', category: 'VARIABLE', is_taxable: true, is_bpjs: true },
  { code: 'BPJS_KES', name: 'BPJS Kesehatan', type: 'DEDUCTION', category: 'FIXED', is_taxable: false, is_bpjs: false },
  { code: 'BPJS_TK', name: 'BPJS Ketenagakerjaan', type: 'DEDUCTION', category: 'FIXED', is_taxable: false, is_bpjs: false },
  { code: 'PPH21', name: 'PPh 21', type: 'DEDUCTION', category: 'FIXED', is_taxable: false, is_bpjs: false },
  { code: 'PINJAMAN', name: 'Potongan Pinjaman', type: 'DEDUCTION', category: 'FIXED', is_taxable: false, is_bpjs: false },
];

const SalaryComponents = () => {
  const { t } = useTranslation();
  const [components, setComponents] = useState([]);
  const [tenantId, setTenantId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ code: '', name: '', type: 'ALLOWANCE', category: 'FIXED', is_taxable: true, is_bpjs: true });
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!profile?.tenant_id && !isGod) return;
    if (profile?.tenant_id) setTenantId(profile.tenant_id);

    let q = supabase.from('salary_components').select('*');
    if (profile?.tenant_id) q = q.eq('tenant_id', profile.tenant_id);
    q = q.order('type').order('code');
    const { data } = await q;
    if (data?.length) setComponents(data);
  };

  const openNew = () => { setForm({ code: '', name: '', type: 'ALLOWANCE', category: 'FIXED', is_taxable: true, is_bpjs: true }); setEditingId(null); setShowForm(true); };

  const openEdit = (c) => { setForm({ code: c.code, name: c.name, type: c.type, category: c.category, is_taxable: c.is_taxable, is_bpjs: c.is_bpjs }); setEditingId(c.id); setShowForm(true); };

  const handleSave = async () => {
    if (!form.code || !form.name) { toast(t('salaryComps.requiredFields'), 'error'); return; }
    if (!tenantId) return;
    try {
      if (editingId) {
        await supabase.from('salary_components').update(form).eq('id', editingId);
        toast(t('salaryComps.updated'), 'success');
      } else {
        await supabase.from('salary_components').insert({ ...form, tenant_id: tenantId, is_active: true });
        toast(t('salaryComps.added'), 'success');
      }
      setShowForm(false);
      init();
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('salary_components').delete().eq('id', id);
    if (error) { toast('Gagal: ' + error.message, 'error'); return; }
    toast(t('salaryComps.deleted'), 'success');
    init();
  };

  const toggleActive = async (id, current) => {
    await supabase.from('salary_components').update({ is_active: !current }).eq('id', id);
    init();
  };

  const resetDefaults = async () => {
    const ok = await confirm(t('salaryComps.resetConfirmMsg'), t('salaryComps.resetConfirmTitle'));
    if (!ok) return;
    await supabase.from('salary_components').delete().eq('tenant_id', tenantId);
    await supabase.from('salary_components').insert(defaultComponents.map(c => ({ ...c, tenant_id: tenantId })));
    toast(t('salaryComps.resetSuccess'), 'success');
    init();
  };

  const allowances = components.filter(c => c.type === 'ALLOWANCE');
  const deductions = components.filter(c => c.type === 'DEDUCTION');

  return (
    <div className="glass-panel p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-6 mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">{t('salaryComps.title')}</h2>
          <p className="text-sm text-gray-400 mt-1">{t('salaryComps.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={resetDefaults} className="px-4 py-2 rounded-xl bg-white/5 text-gray-400 border border-white/10 text-xs font-bold hover:text-[var(--warning)] transition-all whitespace-nowrap">{t('salaryComps.resetDefault')}</button>
          <button onClick={openNew} className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-bold flex items-center gap-2 hover:shadow-lg transition-all whitespace-nowrap"><Plus size={16} /> {t('salaryComps.addComponent')}</button>
        </div>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('salaryComps.code')}</label>
              <input value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} placeholder="GP" className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('salaryComps.componentName')}</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Gaji Pokok" className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('salaryComps.type')}</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" >
                <option value="ALLOWANCE">{t('salaryComps.allowancePlus')}</option>
                <option value="DEDUCTION">{t('salaryComps.deductionMinus')}</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('salaryComps.category')}</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" >
                <option value="FIXED">{t('salaryComps.fixed')}</option>
                <option value="VARIABLE">{t('salaryComps.variable')}</option>
              </select>
            </div>
            <div className="flex items-center gap-6 pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_taxable} onChange={e => setForm({...form, is_taxable: e.target.checked})} className="w-4 h-4" />
                <span className="text-xs text-gray-300">{t('salaryComps.taxableCheckbox')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_bpjs} onChange={e => setForm({...form, is_bpjs: e.target.checked})} className="w-4 h-4" />
                <span className="text-xs text-gray-300">{t('salaryComps.bpjsCheckbox')}</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} className="px-6 py-3 rounded-xl bg-[var(--success)] text-black text-xs font-bold flex items-center gap-2"><Save size={16} /> {t('salaryComps.save')}</button>
            <button onClick={() => setShowForm(false)} className="px-6 py-3 rounded-xl bg-white/5 text-gray-400 border border-white/10 text-xs font-bold"><X size={16} /> {t('salaryComps.cancel')}</button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-sm font-bold text-[var(--success)] uppercase tracking-widest mb-4 flex items-center gap-2"><DollarSign size={16} /> {t('salaryComps.allowanceHeader')}</h3>
          <div className="space-y-2">
            {allowances.map(c => <ComponentRow key={c.id} c={c} t={t} onEdit={openEdit} onDelete={handleDelete} onToggle={toggleActive} />)}
            {!allowances.length && <p className="text-gray-500 text-xs italic">{t('salaryComps.noAllowance')}</p>}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-bold text-[var(--danger)] uppercase tracking-widest mb-4 flex items-center gap-2"><Percent size={16} /> {t('salaryComps.deductionHeader')}</h3>
          <div className="space-y-2">
            {deductions.map(c => <ComponentRow key={c.id} c={c} t={t} onEdit={openEdit} onDelete={handleDelete} onToggle={toggleActive} />)}
            {!deductions.length && <p className="text-gray-500 text-xs italic">{t('salaryComps.noDeduction')}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

const ComponentRow = ({ c, t, onEdit, onDelete, onToggle }) => (
  <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${c.is_active ? 'bg-white/5 border-white/10' : 'bg-white/[0.02] border-white/5 opacity-50'}`}>
    <div className="flex-1">
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono font-bold text-[var(--aurora-3)] bg-[var(--aurora-3)]/10 px-2 py-0.5 rounded">{c.code}</span>
        <span className="text-sm font-bold text-white">{c.name}</span>
        <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest font-bold ${c.category === 'FIXED' ? 'bg-blue-500/10 text-blue-400' : 'bg-[var(--warning)]/10 text-[var(--warning)]'}`}>{t(c.category === 'FIXED' ? 'salaryComps.fixed' : 'salaryComps.variable')}</span>
      </div>
      <div className="flex gap-4 mt-1 text-[9px] text-gray-500">
        <span>{c.is_taxable ? t('salaryComps.taxableYes') : t('salaryComps.taxableNo')}</span>
        <span>{c.is_bpjs ? t('salaryComps.bpjsYes') : t('salaryComps.bpjsNo')}</span>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <button onClick={() => onToggle(c.id, c.is_active)} className={`w-8 h-5 rounded-full transition-colors ${c.is_active ? 'bg-[var(--success)]' : 'bg-gray-600'}`}>
        <div className={`w-3 h-3 bg-white rounded-full transition-all ${c.is_active ? 'ml-4' : 'ml-1'}`} />
      </button>
      <button onClick={() => onEdit(c)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"><Edit3 size={14} /></button>
      <button onClick={() => onDelete(c.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-[var(--danger)]"><Trash2 size={14} /></button>
    </div>
  </div>
);

export default SalaryComponents;
