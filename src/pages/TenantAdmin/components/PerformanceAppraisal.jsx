import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2, Plus, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';

const PerformanceAppraisal = () => {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [tenantId, setTenantId] = useState(null);
  const [adminId, setAdminId] = useState(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ user_id: '', period_label: '', kpi_score: 80, behavioral_score: 80, achievements: '', improvements: '', reviewer_notes: '' });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: p } = await supabase.from('profiles').select('id, tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!p?.tenant_id && !isGod) return;
    if (p?.tenant_id) setTenantId(p.tenant_id);
    if (p?.id) setAdminId(p.id);

    let q1 = supabase.from('profiles').select('id, full_name, nip, position');
    if (p?.tenant_id) q1 = q1.eq('tenant_id', p.tenant_id);
    q1 = q1.in('role', ['EMPLOYEE', 'SUB_ADMIN']).order('full_name');
    const { data: emps } = await q1;
    if (emps) setEmployees(emps);

    let q2 = supabase.from('performance_reviews').select('*, profiles!user_id(full_name, nip), reviewers!reviewer_id(full_name)');
    if (p?.tenant_id) q2 = q2.eq('tenant_id', p.tenant_id);
    q2 = q2.order('created_at', { ascending: false });
    const { data: r } = await q2;
    if (r) setReviews(r);
  };

  const handleSubmit = async () => {
    if (!form.user_id || !form.period_label) { toast(t('appraisal.selectRequired'), 'error'); return; }
    setSaving(true);
    const finalScore = Math.round((Number(form.kpi_score) + Number(form.behavioral_score)) / 2);
    try {
      await supabase.from('performance_reviews').insert({
        tenant_id: tenantId, user_id: form.user_id, reviewer_id: adminId,
        period_label: form.period_label,
        period_start: new Date().toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
        kpi_score: Number(form.kpi_score), behavioral_score: Number(form.behavioral_score),
        final_score: finalScore, achievements: form.achievements, improvements: form.improvements,
        reviewer_notes: form.reviewer_notes, status: 'SUBMITTED'
      });
      toast(t('appraisal.saved'), 'success');
      setShowForm(false);
      setForm({ user_id: '', period_label: '', kpi_score: 80, behavioral_score: 80, achievements: '', improvements: '', reviewer_notes: '' });
      fetchData();
    } catch (e) { toast(t('appraisal.saveFail') + e.message, 'error'); }
    finally { setSaving(false); }
  };

  const filtered = reviews.filter(r =>
    r.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.profiles?.nip?.toLowerCase().includes(search.toLowerCase())
  );

  const scoreColor = (s) => s >= 85 ? 'var(--success)' : s >= 70 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div className="glass-panel p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-6 mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">{t('appraisal.title')}</h2>
          <p className="text-sm text-gray-400 mt-1">{t('appraisal.subtitle')}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-bold flex items-center gap-2 whitespace-nowrap"><Plus size={16} /> {t('appraisal.newReview')}</button>
      </div>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('appraisal.searchPlaceholder')} className="w-full bg-white/5 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('appraisal.employee')}</label>
              <select value={form.user_id} onChange={e => setForm({...form, user_id: e.target.value})} className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white outline-none placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" >
                <option value="">{t('appraisal.selectEmployee')}</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.full_name} — {e.nip}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('appraisal.period')}</label>
              <input value={form.period_label} onChange={e => setForm({...form, period_label: e.target.value})} placeholder={t('appraisal.periodPlaceholder')} className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('appraisal.kpiScore')}</label>
              <div className="flex items-center gap-3">
                <input type="range" min="0" max="100" value={form.kpi_score} onChange={e => setForm({...form, kpi_score: e.target.value})} className="flex-1 accent-[var(--aurora-3)]" />
                <span className="text-sm font-bold text-white font-mono w-8 text-right">{form.kpi_score}</span>
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('appraisal.behavioralScore')}</label>
              <div className="flex items-center gap-3">
                <input type="range" min="0" max="100" value={form.behavioral_score} onChange={e => setForm({...form, behavioral_score: e.target.value})} className="flex-1 accent-[var(--aurora-3)]" />
                <span className="text-sm font-bold text-white font-mono w-8 text-right">{form.behavioral_score}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('appraisal.achievements')}</label>
              <textarea value={form.achievements} onChange={e => setForm({...form, achievements: e.target.value})} rows={3} className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('appraisal.improvements')}</label>
              <textarea value={form.improvements} onChange={e => setForm({...form, improvements: e.target.value})} rows={3} className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
            </div>
          </div>
          <div className="p-4 bg-[var(--aurora-1)]/5 rounded-xl border border-[var(--aurora-1)]/20 mb-4">
            <p className="text-xs text-gray-400">{t('appraisal.finalScore')}<span className="font-bold font-mono text-lg" style={{ color: scoreColor((Number(form.kpi_score) + Number(form.behavioral_score)) / 2) }}>{Math.round((Number(form.kpi_score) + Number(form.behavioral_score)) / 2)}</span></p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSubmit} disabled={saving} className="px-6 py-3 rounded-xl bg-[var(--success)] text-black text-xs font-bold flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {t('appraisal.saveReview')}
            </button>
            <button onClick={() => setShowForm(false)} className="px-6 py-3 rounded-xl bg-white/5 text-gray-400 border border-white/10 text-xs font-bold">{t('appraisal.cancel')}</button>
          </div>
        </motion.div>
      )}

      <div className="space-y-3">
        {filtered.map(r => {
          const score = Number(r.final_score || 0);
          return (
            <div key={r.id} className="p-5 bg-white/5 rounded-2xl border border-white/10 hover:border-white/20 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center text-white font-bold">{r.profiles?.full_name?.charAt(0)}</div>
                  <div>
                    <p className="text-sm font-bold text-white">{r.profiles?.full_name}</p>
                    <p className="text-[10px] text-gray-400">{r.profiles?.nip} • {r.period_label}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold font-mono" style={{ color: scoreColor(score) }}>{score}</p>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${r.status === 'APPROVED' ? 'bg-[var(--success)]/10 text-[var(--success)]' : r.status === 'SUBMITTED' ? 'bg-[var(--aurora-3)]/10 text-[var(--aurora-3)]' : 'bg-gray-500/10 text-gray-400'}`}>{r.status}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/5">
                <div>
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest">{t('appraisal.kpiPrefix')}{r.kpi_score}</p>
                  <div className="w-full bg-white/5 rounded-full h-1.5 mt-1">
                    <div className="h-full rounded-full bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)]" style={{ width: `${r.kpi_score || 0}%` }} />
                  </div>
                </div>
                <div>
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest">{t('appraisal.behaviorPrefix')}{r.behavioral_score}</p>
                  <div className="w-full bg-white/5 rounded-full h-1.5 mt-1">
                    <div className="h-full rounded-full bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)]" style={{ width: `${r.behavioral_score || 0}%` }} />
                  </div>
                </div>
              </div>
              {r.reviewer_notes && <p className="text-xs text-gray-500 italic mt-3 border-t border-white/5 pt-3">"{r.reviewer_notes}" — {r.reviewers?.full_name || 'Reviewer'}</p>}
            </div>
          );
        })}
        {!filtered.length && <p className="text-center text-gray-500 py-8 text-sm">{t('appraisal.noData')}</p>}
      </div>
    </div>
  );
};

export default PerformanceAppraisal;
