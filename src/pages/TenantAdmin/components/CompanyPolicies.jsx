import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, FileText, Search, Download, Eye, Edit3, Trash2, Save, X, Loader2, Upload, BookOpen } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { useConfirm } from '../../../components/ConfirmDialog';

const CATEGORIES = [
  { value: 'HR', label: 'SDM & Kepegawaian', icon: '👥' },
  { value: 'FINANCE', label: 'Keuangan & Akuntansi', icon: '💰' },
  { value: 'OPERATIONAL', label: 'Operasional', icon: '⚙️' },
  { value: 'IT', label: 'Teknologi Informasi', icon: '💻' },
  { value: 'SAFETY', label: 'K3 & Keselamatan', icon: '🛡️' },
  { value: 'GENERAL', label: 'Umum', icon: '📋' },
];

const CompanyPolicies = () => {
  const [policies, setPolicies] = useState([]);
  const [tenantId, setTenantId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('ALL');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: '', category: 'GENERAL', content: '', file: null, version: '1.0' });
  const [viewingId, setViewingId] = useState(null);
  const toast = useToast();

  useEffect(() => { fetchPolicies(); }, []);

  const fetchPolicies = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: p } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!p?.tenant_id) return;
    setTenantId(p.tenant_id);

    const { data: docs } = await supabase.from('company_policies').select('*, profiles!created_by(full_name)').eq('tenant_id', p.tenant_id).order('created_at', { ascending: false });
    if (docs) setPolicies(docs);
  };

  const openNew = () => {
    setForm({ title: '', category: 'GENERAL', content: '', file: null, version: '1.0' });
    setEditingId(null);
    setShowForm(true);
    setViewingId(null);
  };

  const openEdit = (doc) => {
    setForm({ title: doc.title, category: doc.category, content: doc.content || '', file: null, version: doc.version || '1.0' });
    setEditingId(doc.id);
    setShowForm(true);
    setViewingId(null);
  };

  const handleSave = async () => {
    if (!form.title) { toast('Judul wajib diisi', 'error'); return; }
    try {
      let fileUrl = null;
      if (form.file) {
        const ext = form.file.name.split('.').pop();
        const path = `policies/${tenantId}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('policies').upload(path, form.file);
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('policies').getPublicUrl(path);
          fileUrl = urlData.publicUrl;
        }
      }

      const payload = { title: form.title, category: form.category, content: form.content || null, file_url: fileUrl, version: form.version, tenant_id: tenantId };
      if (editingId) {
        await supabase.from('company_policies').update(payload).eq('id', editingId);
        toast('Kebijakan diperbarui', 'success');
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        const { data: admin } = await supabase.from('profiles').select('id').eq('auth_id', session.user.id).maybeSingle();
        await supabase.from('company_policies').insert({ ...payload, created_by: admin?.id });
        toast('Kebijakan ditambahkan', 'success');
      }
      setShowForm(false);
      fetchPolicies();
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
  };

  const handleDelete = async (id) => {
    await supabase.from('company_policies').delete().eq('id', id);
    toast('Dokumen dihapus', 'success');
    if (viewingId === id) setViewingId(null);
    fetchPolicies();
  };

  const filtered = policies.filter(p =>
    (filterCat === 'ALL' || p.category === filterCat) &&
    (p.title?.toLowerCase().includes(search.toLowerCase()) || p.content?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="glass-panel p-8">
      <div className="flex justify-between items-center border-b border-white/10 pb-6 mb-8">
        <div>
          <h2 className="text-2xl font-serif font-bold text-white">Knowledge Base & Kebijakan</h2>
          <p className="text-sm text-gray-400 mt-1">{policies.length} dokumen • {policies.filter(p => p.is_active).length} aktif</p>
        </div>
        <button onClick={openNew} className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-bold flex items-center gap-2"><Plus size={16} /> Tambah Dokumen</button>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari dokumen..." className="w-full bg-[#1A1C23] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white text-xs outline-none focus:border-[var(--aurora-3)]" />
        </div>
        <button onClick={() => setFilterCat('ALL')} className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition-all ${filterCat === 'ALL' ? 'bg-white/10 border-[var(--aurora-3)]/30 text-white' : 'bg-white/5 border-white/10 text-gray-500'}`}>Semua</button>
        {CATEGORIES.map(c => (
          <button key={c.value} onClick={() => setFilterCat(c.value)} className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition-all ${filterCat === c.value ? 'bg-white/10 border-[var(--aurora-3)]/30 text-white' : 'bg-white/5 border-white/10 text-gray-500'}`}>{c.icon} {c.label.split(' ')[0]}</button>
        ))}
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Judul</label>
              <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-3)]" placeholder="Contoh: Kebijakan Cuti Tahunan" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Kategori</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white outline-none">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Versi</label>
              <input value={form.version} onChange={e => setForm({...form, version: e.target.value})} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="1.0" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Konten / Deskripsi</label>
              <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} rows={4} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-3)]" placeholder="Tulis konten kebijakan di sini..." />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">File Pendukung (PDF/Gambar)</label>
              <label className="flex items-center gap-3 p-4 bg-white/5 border border-dashed border-white/20 rounded-xl cursor-pointer hover:bg-white/10">
                <Upload size={18} className="text-gray-400" />
                <span className="text-xs text-gray-400">{form.file ? form.file.name : 'Upload file...'}</span>
                <input type="file" accept=".pdf,.doc,.docx,.jpg,.png" onChange={e => setForm({...form, file: e.target.files[0]})} className="hidden" />
              </label>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} className="px-6 py-3 rounded-xl bg-[var(--success)] text-black text-xs font-bold flex items-center gap-2"><Save size={14} /> Simpan</button>
            <button onClick={() => setShowForm(false)} className="px-6 py-3 rounded-xl bg-white/5 text-gray-400 border border-white/10 text-xs font-bold"><X size={14} /> Batal</button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${viewingId ? 'lg:col-span-1' : 'lg:col-span-3'}`}>
          <div className="space-y-2">
            {filtered.map(doc => (
              <button key={doc.id} onClick={() => setViewingId(viewingId === doc.id ? null : doc.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all group ${viewingId === doc.id ? 'bg-white/10 border-[var(--aurora-3)]/30' : 'bg-white/5 border-white/10 hover:border-white/20'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-lg flex-shrink-0">{CATEGORIES.find(c => c.value === doc.category)?.icon || '📋'}</div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{doc.title}</p>
                      <p className="text-[9px] text-gray-500">{CATEGORIES.find(c => c.value === doc.category)?.label || doc.category} • v{doc.version}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={(e) => { e.stopPropagation(); openEdit(doc); }} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400"><Edit3 size={11} /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }} className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-400"><Trash2 size={11} /></button>
                  </div>
                </div>
              </button>
            ))}
            {!filtered.length && <p className="text-gray-500 text-xs text-center py-8">Belum ada dokumen</p>}
          </div>
        </div>

        {viewingId && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2">
            {(() => {
              const doc = policies.find(p => p.id === viewingId);
              if (!doc) return null;
              return (
                <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{CATEGORIES.find(c => c.value === doc.category)?.icon || '📋'}</span>
                      <div>
                        <h3 className="text-lg font-bold text-white">{doc.title}</h3>
                        <p className="text-[10px] text-gray-500">{CATEGORIES.find(c => c.value === doc.category)?.label} • v{doc.version} • {doc.created_at ? new Date(doc.created_at).toLocaleDateString('id-ID') : '-'}</p>
                      </div>
                    </div>
                    {doc.file_url && (
                      <a href={doc.file_url} target="_blank" className="px-4 py-2 rounded-xl bg-[var(--aurora-3)]/10 text-[var(--aurora-3)] border border-[var(--aurora-3)]/30 text-[10px] font-bold flex items-center gap-2 hover:bg-[var(--aurora-3)]/20">
                        <Download size={12} /> Unduh
                      </a>
                    )}
                  </div>
                  {doc.content && (
                    <div className="bg-black/30 rounded-xl p-5 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap border border-white/5">
                      {doc.content}
                    </div>
                  )}
                  {!doc.content && !doc.file_url && <p className="text-gray-500 text-xs">Tidak ada konten</p>}
                </div>
              );
            })()}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CompanyPolicies;
