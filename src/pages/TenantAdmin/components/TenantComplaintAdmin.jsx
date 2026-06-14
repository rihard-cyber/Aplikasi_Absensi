import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Clock, CheckCircle, XCircle, MessageSquare, Phone, MapPin, Building, Loader2, Eye, Trash2, Printer, ChevronDown, ChevronUp, Star, Send, QrCode } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { useConfirm } from '../../../components/ConfirmDialog';
import { logAudit } from '../../../utils/auditLogger';
import { exportTableToPdf, formatDateForFile } from '../../../utils/exportPdf';

const t = (s) => s;

const STATUS_STYLES = {
  baru: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  diproses: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  selesai: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  ditutup: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
};

const PRIORITY_STYLES = {
  low: 'bg-gray-500/15 text-gray-400',
  medium: 'bg-blue-500/15 text-blue-400',
  high: 'bg-amber-500/15 text-amber-400',
  emergency: 'bg-red-500/15 text-red-400',
};

const CATEGORIES = ['listrik', 'ac', 'plumbing', 'kebersihan', 'keamanan', 'kebisingan', 'fasilitas', 'umum', 'lainnya'];

const TenantComplaintAdmin = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const [complaints, setComplaints] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [tenantId, setTenantId] = useState(null);
  const [tenantName, setTenantName] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [dispositionText, setDispositionText] = useState('');
  const [dispositionPic, setDispositionPic] = useState('');
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    const init = async () => {
      setFetchError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setLoading(false); return; }
        const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
        const tid = profile?.tenant_id;
        if (!tid) {
          setFetchError('Profile tenant tidak ditemukan. Login ulang?');
          setLoading(false);
          return;
        }
        setTenantId(tid);
        const { data: tData } = await supabase.from('tenants').select('name').eq('id', tid).maybeSingle();
        if (tData) setTenantName(tData.name);
        await loadData(tid);
      } catch (e) {
        setFetchError(e.message);
        console.error(e);
      }
      setLoading(false);
    };
    init();
  }, []);

  const loadData = async (tid) => {
    setFetchError(null);
    try {
      const [cRes, pRes] = await Promise.all([
        supabase.from('tenant_complaints').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name, nip').eq('tenant_id', tid)
      ]);
      if (cRes.error) {
        if (cRes.error.code === 'PGRST116' || cRes.error.message?.includes('does not exist')) {
          setFetchError('Tabel tenant_complaints belum dibuat. Jalankan migration SQL.');
        } else {
          setFetchError(cRes.error.message);
        }
        return;
      }
      setComplaints(cRes.data || []);
      if (pRes.data) setProfiles(pRes.data);
    } catch (e) {
      setFetchError(e.message);
      console.error(e);
    }
  };

  const filtered = useMemo(() => {
    let items = complaints;
    if (filterStatus) items = items.filter(c => c.status === filterStatus);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(c =>
        c.ticket_number?.toLowerCase().includes(q) ||
        c.complainant_name?.toLowerCase().includes(q) ||
        c.subject?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.complainant_company?.toLowerCase().includes(q)
      );
    }
    return items;
  }, [complaints, filterStatus, search]);

  const updateStatus = async (id, newStatus) => {
    setSaving(true);
    try {
      const updates = { status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === 'selesai' || newStatus === 'ditutup') updates.resolved_at = new Date().toISOString();
      const { error } = await supabase.from('tenant_complaints').update(updates).eq('id', id);
      if (error) throw error;
      logAudit('UPDATE_COMPLAINT_STATUS', { complaint_id: id, status: newStatus });
      toast(`Status komplain diubah ke "${newStatus}"`, 'success');
      await loadData(tenantId);
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
    setSaving(false);
  };

  const assignPic = async (id) => {
    if (!dispositionPic) { toast('Pilih petugas PIC', 'error'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('tenant_complaints').update({
        assigned_to: dispositionPic,
        disposition_notes: dispositionText || null,
        status: 'diproses',
        updated_at: new Date().toISOString()
      }).eq('id', id);
      if (error) throw error;
      logAudit('ASSIGN_COMPLAINT', { complaint_id: id, pic: dispositionPic });
      toast('Komplain didisposisikan!', 'success');
      setDispositionPic('');
      setDispositionText('');
      setSelected(null);
      await loadData(tenantId);
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
    setSaving(false);
  };

  const handleExportPDF = () => {
    exportTableToPdf({
      title: 'Laporan Komplain Tenant',
      subtitle: tenantName,
      fileName: `komplain-tenant-${formatDateForFile()}`,
      meta: [
        { label: 'Total Komplain', value: filtered.length },
        { label: 'Filter Status', value: filterStatus || 'Semua' },
      ],
      columns: [
        { header: 'NO', width: '5%' },
        { header: 'TIKET', width: '15%' },
        { header: 'PELAPOR', width: '15%' },
        { header: 'KATEGORI', width: '10%' },
        { header: 'SUBJEK', width: '20%' },
        { header: 'STATUS', width: '10%' },
        { header: 'TGL LAPOR', width: '15%' },
        { header: 'PIC', width: '10%' },
      ],
      rows: filtered.map((c, i) => [
        i + 1, c.ticket_number, `${c.complainant_name} (${c.complainant_company || '-'})`,
        c.category, c.subject, c.status.toUpperCase(),
        new Date(c.created_at).toLocaleDateString('id-ID'),
        profiles.find(p => p.id === c.assigned_to)?.full_name || '-'
      ]),
      footer: 'Dicetak dari Aplikasi Absensi Global SaaS',
    });
  };

  const deleteComplaint = async (id) => {
    if (!await confirm('Hapus komplain ini?', 'Hapus Komplain')) return;
    try {
      await supabase.from('tenant_complaints').delete().eq('id', id);
      toast('Komplain dihapus!', 'success');
      await loadData(tenantId);
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
  };

  if (loading) return <div className="p-20 text-center"><div className="w-8 h-8 border-2 border-[var(--aurora-3)] border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  if (fetchError) return (
    <div className="p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
        <XCircle size={28} className="text-red-400" />
      </div>
      <h4 className="text-sm font-bold text-white mb-2">Gagal Memuat Data</h4>
      <p className="text-xs text-gray-400 mb-4 max-w-md mx-auto">{fetchError}</p>
      <p className="text-[10px] text-gray-500">Pastikan tabel <code className="text-[var(--aurora-3)]">tenant_complaints</code> sudah dibuat di Supabase.</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-serif font-bold text-white">{t('Komplain Tenant')}</h3>
          <p className="text-xs text-gray-500 mt-0.5">Kelola laporan komplain dari penyewa gedung</p>
        </div>
        <div className="flex gap-2">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-[#13151A] border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[var(--aurora-3)]">
            <option value="">Semua Status</option>
            <option value="baru">Baru</option>
            <option value="diproses">Diproses</option>
            <option value="selesai">Selesai</option>
            <option value="ditutup">Ditutup</option>
          </select>
          <button onClick={handleExportPDF} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white text-[10px] font-bold flex items-center gap-1.5"><Printer size={14} /> Export PDF</button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Baru', count: complaints.filter(c => c.status === 'baru').length, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Diproses', count: complaints.filter(c => c.status === 'diproses').length, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Selesai', count: complaints.filter(c => c.status === 'selesai').length, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Total', count: complaints.length, color: 'text-white', bg: 'bg-white/5' },
        ].map(s => (
          <div key={s.label} className={`glass-panel p-4 rounded-2xl border border-white/5 ${s.bg}`}>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.count}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari berdasarkan tiket, nama, subjek..." className="w-full bg-[#13151A] border border-white/20 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white outline-none focus:border-[var(--aurora-3)]" />
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">Belum ada komplain masuk.</div>
        ) : (
          filtered.map(c => {
            const pic = profiles.find(p => p.id === c.assigned_to);
            const isExpanded = expandedId === c.id;
            return (
              <div key={c.id} className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
                <button onClick={() => setExpandedId(isExpanded ? null : c.id)} className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors text-left">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${c.status === 'baru' ? 'bg-blue-500' : c.status === 'diproses' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white">{c.ticket_number}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider border ${STATUS_STYLES[c.status] || 'text-gray-400'}`}>{c.status.toUpperCase()}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${PRIORITY_STYLES[c.priority] || ''}`}>{c.priority}</span>
                      </div>
                      <p className="text-sm text-gray-300 font-bold mt-0.5 truncate">{c.subject}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
                        <span>{c.complainant_name}</span>
                        {c.complainant_company && <span>• {c.complainant_company}</span>}
                        <span>• {new Date(c.created_at).toLocaleDateString('id-ID')}</span>
                      </div>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={16} className="text-gray-500 shrink-0" /> : <ChevronDown size={16} className="text-gray-500 shrink-0" />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-white/5 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                      <div><p className="text-[9px] text-gray-500 uppercase">Kategori</p><p className="text-xs text-white font-bold">{c.category}</p></div>
                      <div><p className="text-[9px] text-gray-500 uppercase">Lokasi</p><p className="text-xs text-white">{c.location || '-'}</p></div>
                      <div><p className="text-[9px] text-gray-500 uppercase">No. HP</p><p className="text-xs text-white">{c.complainant_phone || '-'}</p></div>
                      <div><p className="text-[9px] text-gray-500 uppercase">PIC</p><p className="text-xs text-white">{pic?.full_name || '-'}</p></div>
                      <div><p className="text-[9px] text-gray-500 uppercase">Sumber</p><p className="text-xs text-white">{c.source?.toUpperCase() || 'WEB'}</p></div>
                      <div><p className="text-[9px] text-gray-500 uppercase">Rating</p><p className="text-xs text-white">{c.rating ? '⭐'.repeat(c.rating) : '-'}</p></div>
                    </div>
                    <div>
                      <p className="text-[9px] text-gray-500 uppercase mb-1">Deskripsi</p>
                      <p className="text-xs text-gray-300 bg-[#13151A] p-3 rounded-xl border border-white/5">{c.description}</p>
                    </div>
                    {c.disposition_notes && (
                      <div>
                        <p className="text-[9px] text-gray-500 uppercase mb-1">Catatan Disposisi</p>
                        <p className="text-xs text-amber-300 bg-[#13151A] p-3 rounded-xl border border-white/5">{c.disposition_notes}</p>
                      </div>
                    )}
                    {c.rating_comment && (
                      <div>
                        <p className="text-[9px] text-gray-500 uppercase mb-1">Komentar Rating</p>
                        <p className="text-xs text-gray-300 bg-[#13151A] p-3 rounded-xl border border-white/5">{c.rating_comment}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                      {c.status === 'baru' && (
                        <button onClick={() => setSelected(c)} className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold flex items-center gap-1.5">
                          <Send size={12} /> Disposisi & Proses
                        </button>
                      )}
                      {c.status === 'diproses' && (
                        <>
                          <button onClick={() => updateStatus(c.id, 'selesai')} className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center gap-1.5"><CheckCircle size={12} /> Selesai</button>
                          <button onClick={() => updateStatus(c.id, 'ditutup')} className="px-3 py-2 rounded-xl bg-gray-500/10 border border-gray-500/20 text-gray-400 text-[10px] font-bold flex items-center gap-1.5"><XCircle size={12} /> Tutup</button>
                        </>
                      )}
                      <button onClick={() => deleteComplaint(c.id)} className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold flex items-center gap-1.5"><Trash2 size={12} /> Hapus</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Disposition Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
          <div className="bg-[#1A1C23] border border-white/10 rounded-3xl p-6 max-w-lg w-full space-y-4">
            <h4 className="text-sm font-bold text-white">Disposisi Komplain</h4>
            <p className="text-xs text-gray-400">{selected.ticket_number}: {selected.subject}</p>
            <select value={dispositionPic} onChange={e => setDispositionPic(e.target.value)} className="w-full bg-[#13151A] border border-white/20 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[var(--aurora-3)]">
              <option value="">Pilih PIC...</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name} ({p.nip || '-'})</option>)}
            </select>
            <textarea value={dispositionText} onChange={e => setDispositionText(e.target.value)} placeholder="Catatan disposisi..." rows={3} className="w-full bg-[#13151A] border border-white/20 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[var(--aurora-3)]" />
            <div className="flex gap-2">
              <button onClick={() => assignPic(selected.id)} disabled={saving} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-bold flex items-center justify-center gap-2">{saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Disposisi</button>
              <button onClick={() => { setSelected(null); setDispositionPic(''); setDispositionText(''); }} className="px-6 py-3 rounded-xl bg-white/5 text-gray-400 border border-white/10 text-xs font-bold">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantComplaintAdmin;
