import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Scale, FileText, Gavel, Plus, ChevronLeft, Save, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';

const LegalTask = ({ onBack, user }) => {
  const [contracts, setContracts] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('contracts');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states for creating a legal request/consultation
  const [form, setForm] = useState({
    title: '',
    case_type: 'labor',
    party_opposing: '',
    description: '',
    priority: 'normal',
    notes: ''
  });

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles').select('tenant_id, id, full_name').eq('auth_id', session.user.id).maybeSingle();
      if (!profile) return;
      setTenantId(profile.tenant_id);
      setUserId(profile.id);

      if (profile.tenant_id) {
        // Load contracts created by this employee, or matching party_name as their full name
        const contractRes = await supabase.from('legal_contracts')
          .select('*')
          .eq('tenant_id', profile.tenant_id)
          .or(`created_by.eq.${profile.id},party_name.ilike.%${profile.full_name || ''}%`)
          .order('created_at', { ascending: false });

        // Load cases assigned to this employee, or created/relevant to them
        const caseRes = await supabase.from('legal_cases')
          .select('*')
          .eq('tenant_id', profile.tenant_id)
          .eq('assigned_to', profile.id)
          .order('created_at', { ascending: false });

        setContracts(contractRes.data || []);
        setCases(caseRes.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCase = async () => {
    if (!form.title || !form.description) return;
    setSubmitting(true);
    try {
      await supabase.from('legal_cases').insert({
        tenant_id: tenantId,
        title: form.title,
        case_type: form.case_type,
        party_opposing: form.party_opposing,
        description: form.description,
        priority: form.priority,
        status: 'open',
        notes: form.notes,
        assigned_to: userId // Self-assigned / reported by employee
      });

      setForm({
        title: '',
        case_type: 'labor',
        party_opposing: '',
        description: '',
        priority: 'normal',
        notes: ''
      });
      setShowForm(false);
      await init();
    } catch (e) {
      alert('Gagal membuat aduan hukum: ' + e.message);
    }
    setSubmitting(false);
  };

  const statusBadge = (status, type) => {
    let classes = 'bg-gray-500/10 text-gray-400';
    if (type === 'contract') {
      const map = {
        draft: 'bg-gray-500/10 text-gray-400',
        active: 'bg-emerald-500/10 text-emerald-400',
        expiring: 'bg-amber-500/10 text-amber-400',
        expired: 'bg-red-500/10 text-red-400',
        terminated: 'bg-red-500/20 text-red-500'
      };
      classes = map[status] || classes;
    } else {
      const map = {
        open: 'bg-amber-500/10 text-amber-400',
        in_progress: 'bg-blue-500/10 text-blue-400',
        resolved: 'bg-emerald-500/10 text-emerald-400',
        closed: 'bg-gray-500/20 text-gray-400'
      };
      classes = map[status] || classes;
    }
    return <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${classes}`}>{status}</span>;
  };

  if (loading) return <div className="p-20 text-center"><div className="w-8 h-8 border-2 border-[var(--aurora-3)] border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all">
              <ChevronLeft size={18} />
            </button>
          )}
          <div>
            <h3 className="text-lg font-serif font-bold text-white">Legal Portal</h3>
            <p className="text-xs text-gray-500 mt-0.5">{contracts.length} kontrak • {cases.length} kasus aktif</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-3 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-[10px] text-blue-400 font-bold flex items-center gap-1 hover:bg-blue-500/30 transition-all"
        >
          <Plus size={14} /> Aduan Hukum
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
        <button
          onClick={() => setActiveSubTab('contracts')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeSubTab === 'contracts' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
        >
          <FileText size={14} /> Kontrak
        </button>
        <button
          onClick={() => setActiveSubTab('cases')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeSubTab === 'cases' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
        >
          <Gavel size={14} /> Kasus Hukum
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn" onClick={() => setShowForm(false)}>
          <div className="bg-[#1A1C23] border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h4 className="text-sm font-bold text-white flex items-center gap-2"><Scale size={16} className="text-blue-400" /> Buat Aduan Hukum / Konsultasi</h4>
            
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Judul Aduan / Kasus</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="Contoh: Klaim Perselisihan Ketenagakerjaan"
                  className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Kategori Masalah</label>
                <select
                  value={form.case_type}
                  onChange={e => setForm({ ...form, case_type: e.target.value })}
                  className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                >
                  <option value="labor">Ketenagakerjaan</option>
                  <option value="contract_dispute">Sengketa Kontrak</option>
                  <option value="regulatory">Kepatuhan Regulasi</option>
                  <option value="litigation">Litigasi / Pengadilan</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Pihak Lawan / Terkait</label>
                <input
                  type="text"
                  value={form.party_opposing}
                  onChange={e => setForm({ ...form, party_opposing: e.target.value })}
                  placeholder="Nama perusahaan / perorangan"
                  className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Urgensi</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm({ ...form, priority: e.target.value })}
                    className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                  >
                    <option value="low">Rendah</option>
                    <option value="normal">Normal</option>
                    <option value="high">Tinggi</option>
                    <option value="urgent">Mendesak</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Deskripsi & Kronologi Singkat</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Tulis kronologi atau detail konsultasi..."
                  className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none min-h-[80px]"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Nomor dokumen pendukung, dsb."
                  className="w-full bg-[#13151A] border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                onClick={handleSubmitCase}
                disabled={submitting || !form.title || !form.description}
                className="w-full py-3 rounded-xl bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> Kirim Aduan</>}
              </button>
              <button onClick={() => setShowForm(false)} className="w-full py-2.5 rounded-xl bg-white/5 text-gray-400 text-[10px] font-bold hover:bg-white/10 transition-colors">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="space-y-2">
        {activeSubTab === 'contracts' ? (
          <>
            {contracts.map(c => (
              <div key={c.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center"><FileText size={14} className="text-gray-400" /></div>
                    <div>
                      <p className="text-xs font-bold text-white">{c.title}</p>
                      <p className="text-[9px] text-gray-500 capitalize">{c.contract_type} {c.party_name ? `• ${c.party_name}` : ''}</p>
                    </div>
                  </div>
                  {statusBadge(c.status, 'contract')}
                </div>
                {c.end_date && (
                  <div className="flex items-center gap-2 mt-2 text-[9px] text-gray-500">
                    <Clock size={10} />
                    <span>Berlaku s/d: {new Date(c.end_date).toLocaleDateString('id-ID')}</span>
                    {new Date(c.end_date) < new Date(Date.now() + 30 * 86400000) && (
                      <span className="flex items-center gap-0.5 text-amber-400 ml-auto font-bold"><AlertTriangle size={10} /> Segera Berakhir</span>
                    )}
                  </div>
                )}
              </div>
            ))}
            {!contracts.length && <div className="p-12 text-center text-gray-500 text-sm">Belum ada kontrak terdaftar yang terkait Anda.</div>}
          </>
        ) : (
          <>
            {cases.map(c => (
              <div key={c.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center"><Gavel size={14} className="text-gray-400" /></div>
                    <div>
                      <p className="text-xs font-bold text-white">{c.title}</p>
                      <p className="text-[9px] text-gray-500 capitalize">{c.case_type} {c.case_number ? `• No: ${c.case_number}` : ''}</p>
                    </div>
                  </div>
                  {statusBadge(c.status, 'case')}
                </div>
                <p className="text-[10px] text-gray-400 mt-2 bg-black/20 p-2.5 rounded-lg border border-white/5">{c.description}</p>
                <div className="flex items-center gap-2 mt-2 text-[9px] text-gray-500">
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${c.priority === 'urgent' ? 'bg-red-500/10 text-red-400' : c.priority === 'high' ? 'bg-amber-500/10 text-amber-400' : 'bg-gray-500/10 text-gray-400'}`}>Urgensi: {c.priority}</span>
                  <span>• Dilaporkan: {new Date(c.created_at).toLocaleDateString('id-ID')}</span>
                </div>
              </div>
            ))}
            {!cases.length && <div className="p-12 text-center text-gray-500 text-sm">Belum ada aduan atau kasus hukum yang ditugaskan kepada Anda.</div>}
          </>
        )}
      </div>
    </div>
  );
};

export default LegalTask;
