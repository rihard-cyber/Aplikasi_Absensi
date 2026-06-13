import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Sun, Moon, CalendarDays, Save, X } from 'lucide-react';
import { safeGet } from '../../../utils/safeAccess';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';

const HOLIDAY_TYPES = [
  { value: 'NATIONAL', labelKey: 'holiday.types.national', icon: '🇮🇩' },
  { value: 'RELIGIOUS', labelKey: 'holiday.types.religious', icon: '🕌' },
  { value: 'COMPANY', labelKey: 'holiday.types.company', icon: '🏢' },
];

const HolidayManagement = () => {
  const { t, i18n } = useTranslation();
  const [holidays, setHolidays] = useState([]);
  const [tenantId, setTenantId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', date: '', type: 'NATIONAL', is_recurring: false });
  const toast = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: p } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!p?.tenant_id && !isGod) return;
    if (p?.tenant_id) setTenantId(p.tenant_id);

    let q = supabase.from('company_holidays').select('*');
    if (p?.tenant_id) q = q.eq('tenant_id', p.tenant_id);
    q = q.order('date', { ascending: false });
    const { data: h } = await q;
    if (h) setHolidays(h);
  };

  const handleSave = async () => {
    if (!form.name || !form.date) { toast(t('holiday.toast.required'), 'error'); return; }
    await supabase.from('company_holidays').insert({
      tenant_id: tenantId, name: form.name, date: form.date,
      type: form.type, is_recurring: form.is_recurring
    });
    toast(t('holiday.toast.added'), 'success');
    setShowForm(false);
    setForm({ name: '', date: '', type: 'NATIONAL', is_recurring: false });
    fetchData();
  };

  const handleDelete = async (id) => {
    await supabase.from('company_holidays').delete().eq('id', id);
    toast(t('holiday.toast.deleted'), 'success');
    fetchData();
  };

  const grouped = {};
  holidays.forEach(h => {
    const year = h.date?.split('-')[0] || '0000';
    if (!grouped[year]) grouped[year] = [];
    grouped[year].push(h);
  });

  return (
    <div className="glass-panel p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-6 mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">{t('holiday.title')}</h2>
          <p className="text-sm text-gray-400 mt-1">{t('holiday.subtitle')}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-bold flex items-center gap-2 whitespace-nowrap"><Plus size={16} /> {t('holiday.addHoliday')}</button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('holiday.name')}</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder={t('holiday.namePlaceholder')} className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('holiday.date')}</label>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('holiday.type')}</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white outline-none placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" >
                {HOLIDAY_TYPES.map(typeItem => <option key={typeItem.value} value={typeItem.value}>{typeItem.icon} {t(typeItem.labelKey)}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button onClick={handleSave} className="px-6 py-3 rounded-xl bg-[var(--success)] text-black text-xs font-bold flex items-center gap-2"><Save size={14} /> {t('holiday.save')}</button>
              <button onClick={() => setShowForm(false)} className="px-6 py-3 rounded-xl bg-white/5 text-gray-400 border border-white/10 text-xs font-bold"><X size={14} /> {t('holiday.cancel')}</button>
            </div>
          </div>
          <label className="flex items-center gap-2 mt-4 cursor-pointer">
            <input type="checkbox" checked={form.is_recurring} onChange={e => setForm({...form, is_recurring: e.target.checked})} className="w-4 h-4" />
            <span className="text-xs text-gray-400">{t('holiday.recurring')}</span>
          </label>
        </motion.div>
      )}

      {Object.entries(grouped).sort(([a],[b]) => b - a).map(([year, items]) => (
        <div key={year} className="mb-8 last:mb-0">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <CalendarDays size={16} className="text-[var(--aurora-3)]" /> {year} ({items.length} {t('holiday.daysSuffix')})
          </h3>
          <div className="space-y-1">
            {items.sort((a, b) => b.date?.localeCompare(a.date)).map(h => {
              const d = new Date(h.date);
              const dayName = d.toLocaleDateString(i18n.language === 'id' ? 'id-ID' : 'en-US', { weekday: 'long' });
              return (
                <div key={h.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/20 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="text-center w-12">
                      <p className="text-lg font-bold text-white">{d.getDate()}</p>
                      <p className="text-[8px] text-gray-500 uppercase">{t('months.' + d.getMonth()).slice(0, 3)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{h.name}</p>
                      <p className="text-[10px] text-gray-500">
                        {dayName} • {t(safeGet(HOLIDAY_TYPES.find(typeItem => typeItem.value === h.type), 'labelKey')) || h.type} {h.is_recurring ? '🔁' : ''}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(h.id)} className="p-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-[var(--danger)] transition-all expand-touch-target"><Trash2 size={14} /></button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {!holidays.length && <p className="text-center text-gray-500 py-8 text-sm">{t('holiday.noHoliday')}</p>}
    </div>
  );
};

export default HolidayManagement;
