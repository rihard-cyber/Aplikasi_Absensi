import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Save, Edit3, DollarSign, User, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { safeGet } from '../../../utils/safeAccess';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';

const EmployeeSalary = () => {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState([]);
  const [components, setComponents] = useState([]);
  const [tenantId, setTenantId] = useState(null);
  const [salaries, setSalaries] = useState(new Map());
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editingAmounts, setEditingAmounts] = useState({});
  const toast = useToast();

  useEffect(() => { init(); }, []);

  const init = async () => {
    const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!profile?.tenant_id && !isGod) return;
    if (profile?.tenant_id) setTenantId(profile.tenant_id);
    const tid = profile?.tenant_id;

    let q1 = supabase.from('salary_components').select('*');
    if (tid) q1 = q1.eq('tenant_id', tid);
    q1 = q1.eq('is_active', true);
    const { data: comps } = await q1;
    if (comps) setComponents(comps);

    let q2 = supabase.from('profiles').select('id, full_name, nip, position, role, project_id, division_id');
    if (tid) q2 = q2.eq('tenant_id', tid);
    q2 = q2.in('role', ['EMPLOYEE', 'SUB_ADMIN']).order('full_name');
    const { data: emps } = await q2;
    if (emps) setEmployees(emps);

    let q3 = supabase.from('employee_salaries').select('*');
    if (tid) q3 = q3.eq('tenant_id', tid);
    const { data: sals } = await q3;
    if (sals) {
      const map = new Map();
      sals.forEach(s => {
        map.set(`${s.user_id}_${s.component_id}`, s);
      });
      setSalaries(map);
    }
  };

  const handleAmountChange = (employeeId, componentId, value) => {
    setEditingAmounts(prev => ({
      ...prev,
      [`${employeeId}_${componentId}`]: value
    }));
  };

  const getAmount = (employeeId, componentId) => {
    const key = `${employeeId}_${componentId}`;
    if (safeGet(editingAmounts, key) !== undefined) return safeGet(editingAmounts, key);
    return salaries.get(key)?.amount || 0;
  };

  const handleSave = async (employeeId) => {
    const entries = components.map(c => ({
      tenant_id: tenantId,
      user_id: employeeId,
      component_id: c.id,
      amount: Number(getAmount(employeeId, c.id)) || 0,
      effective_date: new Date().toISOString().split('T')[0]
    })).filter(e => e.amount > 0);

    try {
      await supabase.from('employee_salaries').delete().eq('user_id', employeeId).eq('tenant_id', tenantId);
      if (entries.length) {
        const { error } = await supabase.from('employee_salaries').insert(entries);
        if (error) throw error;
      }
      toast(t('salary.saveSuccess'), 'success');
      init();
    } catch (e) {
      toast(t('salary.saveFail') + e.message, 'error');
    }
  };

  const filtered = employees.filter(e =>
    e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.nip?.toLowerCase().includes(search.toLowerCase())
  );

  const groupedComponents = [
    { label: t('salary.allowance'), type: 'ALLOWANCE', items: components.filter(c => c.type === 'ALLOWANCE') },
    { label: t('salary.deduction'), type: 'DEDUCTION', items: components.filter(c => c.type === 'DEDUCTION') },
  ];

  return (
    <div className="glass-panel p-4 sm:p-6 lg:p-8">
      <div className="border-b border-white/10 pb-6 mb-8">
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">{t('salary.title')}</h2>
        <p className="text-sm text-gray-400 mt-1">{t('salary.subtitle')}</p>
      </div>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('salary.searchPlaceholder')} className="w-full bg-white/5 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-1 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
          {filtered.map(emp => (
            <button key={emp.id} onClick={() => setSelectedEmployee(emp)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${selectedEmployee?.id === emp.id ? 'bg-white/10 border-[var(--aurora-3)]/30 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center text-xs font-bold text-white">{emp.full_name?.charAt(0)}</div>
                <div>
                  <p className="text-sm font-bold">{emp.full_name}</p>
                  <p className="text-[10px] text-gray-500">{emp.nip} • {emp.position || '-'}</p>
                </div>
              </div>
            </button>
          ))}
          {!filtered.length && <p className="text-gray-500 text-xs italic text-center py-8">{t('salary.noEmployee')}</p>}
        </div>

        <div className="lg:col-span-2">
          {selectedEmployee ? (
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 p-4 bg-white/5 rounded-2xl border border-white/10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center text-lg font-bold text-white">{selectedEmployee.full_name?.charAt(0)}</div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{selectedEmployee.full_name}</h3>
                    <p className="text-xs text-gray-400">{selectedEmployee.nip} • {selectedEmployee.position || 'Staff'} • {selectedEmployee.role}</p>
                  </div>
                </div>
                <button onClick={() => handleSave(selectedEmployee.id)} className="px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-bold flex items-center gap-2 whitespace-nowrap"><Save size={16} /> {t('salary.saveSalary')}</button>
              </div>

              {groupedComponents.map(group => group.items.length > 0 && (
                <div key={group.type} className="mb-6">
                  <h4 className={`text-xs font-bold uppercase tracking-widest mb-3 ${group.type === 'ALLOWANCE' ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                    {group.label} ({group.items.length})
                  </h4>
                  <div className="space-y-2">
                    {group.items.map(c => (
                      <div key={c.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-[var(--aurora-3)]">{c.code}</span>
                            <span className="text-sm text-white">{c.name}</span>
                          </div>
                          <p className="text-[9px] text-gray-500 mt-0.5">{c.category} • {c.is_taxable ? t('salary.taxable') : t('salary.nonTaxable')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-500">{t('bankExport.currencySymbol').trim()}</span>
                          <input type="number" value={getAmount(selectedEmployee.id, c.id)} onChange={e => handleAmountChange(selectedEmployee.id, c.id, e.target.value)}
                              className="w-32 bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm text-right outline-none font-mono transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="p-4 bg-[var(--aurora-1)]/5 rounded-2xl border border-[var(--aurora-1)]/20 mt-4">
                <p className="text-xs text-gray-400">
                  {t('salary.totalAllowance')}: <span className="text-[var(--success)] font-bold font-mono">
                    {t('bankExport.currencySymbol')}{components.filter(c => c.type === 'ALLOWANCE').reduce((sum, c) => sum + Number(getAmount(selectedEmployee.id, c.id)), 0).toLocaleString()}
                  </span>
                  {' | '}{t('salary.totalDeduction')}: <span className="text-[var(--danger)] font-bold font-mono">
                    {t('bankExport.currencySymbol')}{components.filter(c => c.type === 'DEDUCTION').reduce((sum, c) => sum + Number(getAmount(selectedEmployee.id, c.id)), 0).toLocaleString()}
                  </span>
                  {' | '}{t('salary.takeHomePay')}: <span className="text-white font-bold font-mono">
                    {t('bankExport.currencySymbol')}{(components.filter(c => c.type === 'ALLOWANCE').reduce((sum, c) => sum + Number(getAmount(selectedEmployee.id, c.id)), 0) -
                      components.filter(c => c.type === 'DEDUCTION').reduce((sum, c) => sum + Number(getAmount(selectedEmployee.id, c.id)), 0)).toLocaleString()}
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <User size={48} className="mb-4 opacity-30" />
              <p className="text-sm">{t('salary.selectEmployee')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeSalary;
