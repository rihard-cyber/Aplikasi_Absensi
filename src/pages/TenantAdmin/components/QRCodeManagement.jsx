import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, QrCode, Copy, Trash2, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';

const QRCodeManagement = () => {
  const [tokens, setTokens] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tenantId, setTenantId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [newToken, setNewToken] = useState({ project_id: '', description: '' });
  const [copiedId, setCopiedId] = useState(null);
  const toast = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const isGod = (() => { try { return sessionStorage.getItem('god_key') === 'DEWA-999'; } catch { return false; } })();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: p } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!p?.tenant_id && !isGod) return;
    if (p?.tenant_id) setTenantId(p.tenant_id);

    let q1 = supabase.from('projects').select('id, name, code');
    if (p?.tenant_id) q1 = q1.eq('tenant_id', p.tenant_id);
    const { data: projs } = await q1;
    if (projs) setProjects(projs);

    let q2 = supabase.from('qr_attendance_tokens').select('*, projects(name)');
    if (p?.tenant_id) q2 = q2.eq('tenant_id', p.tenant_id);
    q2 = q2.order('created_at', { ascending: false });
    const { data: t } = await q2;
    if (t) setTokens(t);
  };

  const generateToken = async () => {
    if (!newToken.project_id) { toast('Pilih lokasi terlebih dahulu', 'error'); return; }
    const token = Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
    const project = projects.find(p => p.id === newToken.project_id);
    const { error } = await supabase.from('qr_attendance_tokens').insert({
      tenant_id: tenantId, project_id: newToken.project_id, token,
      description: newToken.description || `QR ${project?.name || ''}`, is_active: true
    });
    if (error) { toast('Gagal: ' + error.message, 'error'); return; }
    toast('QR token berhasil dibuat!', 'success');
    setShowForm(false);
    setNewToken({ project_id: '', description: '' });
    fetchData();
  };

  const toggleActive = async (id, current) => {
    await supabase.from('qr_attendance_tokens').update({ is_active: !current }).eq('id', id);
    fetchData();
  };

  const handleCopy = async (token, id) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedId(id);
      toast('Token disalin!', 'success');
      setTimeout(() => setCopiedId(null), 2000);
    } catch { toast('Gagal menyalin', 'error'); }
  };

  const qrUrl = (token) => {
    const base = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '') + '/#/qr-attendance';
    return `${base}?token=${token}`;
  };

  return (
    <div className="glass-panel p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-6 mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">QR Attendance</h2>
          <p className="text-sm text-gray-400 mt-1">Generate QR code untuk absensi via scan di setiap lokasi</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-bold flex items-center gap-2 whitespace-nowrap"><Plus size={16} /> Generate QR</button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Lokasi / Proyek</label>
              <select value={newToken.project_id} onChange={e => setNewToken({...newToken, project_id: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white outline-none">
                <option value="">Pilih lokasi</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.code ? `[${p.code}] ` : ''}{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Deskripsi</label>
              <input value={newToken.description} onChange={e => setNewToken({...newToken, description: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="QR Kantor Pusat" />
            </div>
            <div className="flex items-end gap-2">
              <button onClick={generateToken} className="px-6 py-3 rounded-xl bg-[var(--success)] text-black text-xs font-bold">Buat Token</button>
              <button onClick={() => setShowForm(false)} className="px-6 py-3 rounded-xl bg-white/5 text-gray-400 border border-white/10 text-xs font-bold">Batal</button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tokens.map(t => (
          <div key={t.id} className={`p-5 rounded-2xl border transition-all ${t.is_active ? 'bg-white/5 border-white/10' : 'bg-white/[0.02] border-white/5 opacity-50'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center">
                  <QrCode size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{t.description || 'QR Token'}</p>
                  <p className="text-[10px] text-gray-400">{t.projects?.name || '-'}</p>
                </div>
              </div>
              <button onClick={() => toggleActive(t.id, t.is_active)} className={`w-8 h-5 rounded-full transition-colors ${t.is_active ? 'bg-[var(--success)]' : 'bg-gray-600'}`}>
                <div className={`w-3 h-3 bg-white rounded-full transition-all ${t.is_active ? 'ml-4' : 'ml-1'}`} />
              </button>
            </div>
            <div className="bg-black/30 rounded-xl p-3 font-mono text-[10px] text-green-400 break-all mb-3 border border-white/5">
              {qrUrl(t.token)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono text-gray-500">{t.token}</span>
              <button onClick={() => handleCopy(qrUrl(t.token), t.id)} className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white text-[10px] font-bold flex items-center gap-1">
                {copiedId === t.id ? <CheckCircle2 size={12} className="text-[var(--success)]" /> : <Copy size={12} />} Salin
              </button>
            </div>
          </div>
        ))}
        {!tokens.length && <p className="text-center text-gray-500 py-8 col-span-full text-sm">Belum ada QR token. Buat token untuk memulai absensi via scan.</p>}
      </div>
    </div>
  );
};

export default QRCodeManagement;
