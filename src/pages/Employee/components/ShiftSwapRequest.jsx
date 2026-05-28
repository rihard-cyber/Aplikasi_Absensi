/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Send, Clock, RefreshCw, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';

const ShiftSwapRequest = ({ onBack }) => {
  const [myId, setMyId] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [colleagues, setColleagues] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedColleague, setSelectedColleague] = useState('');
  const [selectedColleagueShift, setSelectedColleagueShift] = useState('');
  const [reason, setReason] = useState('');
  const toast = useToast();

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const twoWeeksOut = new Date(today.getTime() + 13 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const { data: prof } = await supabase.from('profiles').select('id, tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!prof) { setLoading(false); return; }
    setMyId(prof.id);
    setTenantId(prof.tenant_id);
    await Promise.all([
      fetchSchedules(prof.id, prof.tenant_id),
      fetchColleagues(prof.id, prof.tenant_id),
      fetchRequests(prof.id),
    ]);
    setLoading(false);
  };

  const fetchSchedules = async (uid, tid) => {
    const { data } = await supabase.from('user_schedules')
      .select('*, master_shifts(shift_code, shift_name, time_in, time_out)')
      .eq('profile_id', uid)
      .eq('tenant_id', tid)
      .gte('schedule_date', todayStr)
      .lte('schedule_date', twoWeeksOut)
      .order('schedule_date', { ascending: true });
    if (data) setSchedules(data);
  };

  const fetchColleagues = async (uid, tid) => {
    const { data } = await supabase.from('profiles')
      .select('id, full_name, nip')
      .eq('tenant_id', tid)
      .neq('id', uid)
      .in('role', ['EMPLOYEE', 'SUB_ADMIN']);
    if (data) setColleagues(data);
  };

  const fetchRequests = async (uid) => {
    const { data } = await supabase.from('shift_swaps')
      .select('*, profiles!from_employee(full_name, nip), profiles!to_employee(full_name, nip)')
      .eq('from_employee', uid)
      .order('created_at', { ascending: false });
    if (data) setRequests(data);
  };

  const handleDateSelect = async (date) => {
    setSelectedDate(date);
    setSelectedColleague('');
    setSelectedColleagueShift('');
  };

  const handleColleagueSelect = async (colleagueId) => {
    setSelectedColleague(colleagueId);
    if (selectedDate && colleagueId) {
      const { data } = await supabase.from('user_schedules')
        .select('*, master_shifts(shift_code, shift_name, time_in, time_out)')
        .eq('profile_id', colleagueId)
        .eq('tenant_id', tenantId)
        .eq('schedule_date', selectedDate)
        .maybeSingle();
      setSelectedColleagueShift(data?.master_shifts?.shift_name || '—');
    }
  };

  const submitSwap = async () => {
    if (!selectedDate || !selectedColleague) { toast('Pilih tanggal & kolega', 'error'); return; }
    setSubmitting(true);
    const { error } = await supabase.from('shift_swaps').insert({
      tenant_id: tenantId,
      from_employee: myId,
      to_employee: selectedColleague,
      swap_date: selectedDate,
      reason: reason || null,
      status: 'pending',
    });
    setSubmitting(false);
    if (error) { toast('Gagal: ' + error.message, 'error'); return; }
    toast('Permintaan swap dikirim!', 'success');
    setSelectedDate(null);
    setSelectedColleague('');
    setSelectedColleagueShift('');
    setReason('');
    await fetchRequests(myId);
  };

  const getStatusBadge = (status) => {
    const styles = { pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30', approved: 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30', rejected: 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/30' };
    return <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${styles[status] || styles.pending}`}>{status}</span>;
  };

  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-serif font-bold text-white">Shift Swap Request</h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Tukar shift dengan rekan kerja</p>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-[32px] border border-white/5 mb-6">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Calendar size={14} /> Jadwal Saya (14 Hari)</h3>
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-[var(--aurora-3)]" /></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
            {schedules.map(s => {
              const dateObj = new Date(s.schedule_date + 'T00:00:00');
              const isSelected = selectedDate === s.schedule_date;
              return (
                <button key={s.id} onClick={() => handleDateSelect(s.schedule_date)}
                  className={`p-3 rounded-xl border text-left transition-all ${isSelected ? 'bg-[var(--aurora-3)]/20 border-[var(--aurora-3)]' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                  <p className="text-[9px] text-gray-500">{dayNames[dateObj.getDay()]}</p>
                  <p className="text-sm font-bold text-white">{dateObj.getDate()}</p>
                  <p className="text-[9px] text-gray-400">{s.master_shifts?.shift_name || s.master_shifts?.shift_code || '—'}</p>
                  {s.master_shifts?.time_in && (
                    <p className="text-[8px] text-gray-500">{s.master_shifts.time_in.substring(0,5)}-{s.master_shifts.time_out?.substring(0,5)}</p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedDate && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 rounded-[32px] border border-white/5 mb-6">
          <h3 className="text-sm font-bold text-white mb-4">Tukar Shift Tanggal: <span className="text-[var(--aurora-3)]">{selectedDate}</span></h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">Pilih Kolega</label>
              <select value={selectedColleague} onChange={e => handleColleagueSelect(e.target.value)} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[var(--aurora-3)]">
                <option value="">— Pilih —</option>
                {colleagues.map(c => <option key={c.id} value={c.id}>{c.full_name} ({c.nip})</option>)}
              </select>
            </div>
            {selectedColleague && (
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-3">
                  <RefreshCw size={18} className="text-[var(--aurora-3)]" />
                  <div>
                    <p className="text-xs text-gray-400">Shift kolega pada {selectedDate}:</p>
                    <p className="text-sm font-bold text-white">{selectedColleagueShift}</p>
                  </div>
                </div>
              </div>
            )}
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">Alasan</label>
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-3)] resize-none" placeholder="Alasan pertukaran shift..." />
            </div>
            <button onClick={submitSwap} disabled={submitting || !selectedColleague}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Kirim Permintaan Swap
            </button>
          </div>
        </motion.div>
      )}

      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Permintaan Saya</h3>
      {requests.length === 0 ? (
        <div className="text-center py-8 glass-panel rounded-[32px]">
          <AlertCircle size={32} className="mx-auto text-gray-500 mb-2" />
          <p className="text-gray-500 text-sm">Belum ada permintaan swap</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map(r => (
            <div key={r.id} className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${r.status === 'approved' ? 'bg-[var(--success)]/10 text-[var(--success)]' : r.status === 'rejected' ? 'bg-[var(--danger)]/10 text-[var(--danger)]' : 'bg-yellow-500/10 text-yellow-400'}`}>
                  {r.status === 'approved' ? <CheckCircle2 size={16} /> : r.status === 'rejected' ? <XCircle size={16} /> : <Clock size={16} />}
                </div>
                <div>
                  <p className="text-white text-xs font-bold">{r.swap_date} → {r.profiles_to_employee?.full_name}</p>
                  {r.reason && <p className="text-[9px] text-gray-500">{r.reason}</p>}
                </div>
              </div>
              {getStatusBadge(r.status)}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default ShiftSwapRequest;
