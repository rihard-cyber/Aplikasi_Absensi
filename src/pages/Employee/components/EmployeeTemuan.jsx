import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, AlertTriangle, History, Send, Camera, Loader2, Search, Eye, ShieldOff, MapPin } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { useConfirm } from '../../../components/ConfirmDialog';
import { logAudit } from '../../../utils/auditLogger';
import { isSecurityDivision } from '../../../utils/featureAccess';

const t = (s) => s;

const KATEGORI_TEMUAN = [
  { id: 'tenant', nama: 'Tenant & Ruang Sewa', items: [
    { kode: 'T001', nama: 'Renovasi Sesuai Aturan' },
    { kode: 'T002', nama: 'Renovasi Melanggar Aturan' },
    { kode: 'T003', nama: 'Overtime Tenant' },
    { kode: 'T004', nama: 'Pintu Tidak Terkunci' },
  ]},
  { id: 'fasilitas', nama: 'Fasilitas Gedung', items: [
    { kode: 'F001', nama: 'Service AHU' },
    { kode: 'F002', nama: 'Service Chiller' },
    { kode: 'F003', nama: 'Lift Maintenance' },
    { kode: 'F004', nama: 'Eskalator Maintenance' },
    { kode: 'F005', nama: 'Instalasi Listrik' },
    { kode: 'F006', nama: 'Pipa' },
  ]},
  { id: 'gangguan', nama: 'Gangguan Operasional', items: [
    { kode: 'G001', nama: 'Air Bocor' },
    { kode: 'G002', nama: 'Alarm Bunyi' },
    { kode: 'G003', nama: 'Lampu Mati' },
    { kode: 'G004', nama: 'Keributan' },
    { kode: 'G005', nama: 'Demonstrasi' },
    { kode: 'G006', nama: 'Listrik Mati' },
    { kode: 'G007', nama: 'Bau Asap' },
    { kode: 'G008', nama: 'Api' },
  ]},
  { id: 'event', nama: 'Event & Aktivitas Khusus', items: [
    { kode: 'E001', nama: 'Pameran Tenant' },
    { kode: 'E002', nama: 'Event Tenant' },
    { kode: 'E003', nama: 'Aktivitas Khusus Tenant' },
  ]},
  { id: 'lainnya', nama: 'Lain-Lain', items: [
    { kode: 'O001', nama: 'Temuan Lainnya' },
    { kode: 'O002', nama: 'Kondisi Tidak Normal' },
    { kode: 'O003', nama: 'Catatan Petugas' },
  ]}
];

const EmployeeTemuan = ({ onBack, user }) => {
  if (!isSecurityDivision(localStorage.getItem('user_division'))) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
        <div className="w-20 h-20 rounded-3xl bg-[var(--danger)]/10 flex items-center justify-center">
          <ShieldOff size={40} className="text-[var(--danger)]" />
        </div>
        <h3 className="text-xl font-serif font-bold text-white text-center">Akses Ditolak</h3>
        <p className="text-sm text-gray-400 text-center max-w-xs">Fitur Temuan khusus untuk divisi Security / Satpam.</p>
        {onBack && <button onClick={onBack} className="mt-4 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 font-bold text-sm">Kembali</button>}
      </div>
    );
  }

  const toast = useToast();
  const confirm = useConfirm();
  const [profile, setProfile] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [searchTemuan, setSearchTemuan] = useState('');

  const [form, setForm] = useState({
    checkpoint_id: '',
    kategori: '',
    temuan: '',
    severity: 'medium',
    description: '',
    photo: null
  });

  const canManage = useMemo(() => {
    const role = user?.role || localStorage.getItem('user_role');
    const pos = user?.position || '';
    return role === 'TENANT_ADMIN' || role === 'SUPER_ADMIN' || role === 'SUB_ADMIN'
      || /^(Manajemen|SPV|Admin|Supervisor)/i.test(pos);
  }, [user]);

  const dropdownTemuans = useMemo(() => {
    const cat = KATEGORI_TEMUAN.find(k => k.id === form.kategori);
    return cat ? cat.items : [];
  }, [form.kategori]);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data: p } = await supabase.from('profiles').select('id, tenant_id').eq('auth_id', session.user.id).maybeSingle();
        if (p) {
          setProfile(p);
          setTenantId(p.tenant_id);
          await loadData(p.id, p.tenant_id);
        }
      } catch (e) { console.error(e); }
    };
    init();
  }, []);

  const loadData = async (uid, tid) => {
    try {
      const [cpRes, incRes] = await Promise.all([
        supabase.from('patrol_checkpoints').select('*').eq('tenant_id', tid).eq('is_active', true).order('name'),
        supabase.from('patrol_incidents').select('*, patrol_logs(*)').eq('tenant_id', tid).order('created_at', { ascending: false })
      ]);
      if (cpRes.data) setCheckpoints(cpRes.data);
      if (incRes.data) setIncidents(incRes.data);
    } catch (e) { console.error(e); }
  };

  const uploadFile = async (file, folder) => {
    if (!file) return null;
    const ext = file.name.split('.').pop();
    const path = `${folder}/${profile.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('documents').upload(path, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
    return urlData?.publicUrl || null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.checkpoint_id || !form.kategori || !form.temuan) {
      toast('Lengkapi data form temuan!', 'error');
      return;
    }
    setSubmitting(true);
    try {
      let photo_url = null;
      if (form.photo) photo_url = await uploadFile(form.photo, 'patrol_incidents');
      const selectedCp = checkpoints.find(c => c.id === form.checkpoint_id);
      const { data: logData, error: logErr } = await supabase.from('patrol_logs').insert({
        tenant_id: tenantId, profile_id: profile.id, checkpoint_id: form.checkpoint_id,
        scan_time: new Date().toISOString()
      }).select().single();
      if (logErr) throw logErr;
      const matchedKat = KATEGORI_TEMUAN.find(k => k.id === form.kategori);
      const matchedTemuan = matchedKat?.items.find(t => t.kode === form.temuan);
      const { error: incErr } = await supabase.from('patrol_incidents').insert({
        tenant_id: tenantId, patrol_log_id: logData.id,
        incident_type: `[${form.temuan}] ${matchedTemuan?.nama || 'Temuan'}`,
        description: form.description || `Laporan temuan untuk ${selectedCp?.name || 'Checkpoint'}.`,
        severity: form.severity, photo_url
      });
      if (incErr) throw incErr;
      logAudit('PATROL_INCIDENT', { checkpoint: selectedCp?.name, type: form.temuan, severity: form.severity });
      toast('Laporan temuan berhasil dikirim!', 'success');
      setForm({ checkpoint_id: '', kategori: '', temuan: '', severity: 'medium', description: '', photo: null });
      await loadData(profile.id, tenantId);
    } catch (e) {
      toast('Gagal mengirim temuan: ' + e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredIncidents = useMemo(() => {
    if (!searchTemuan) return incidents;
    const q = searchTemuan.toLowerCase();
    return incidents.filter(l =>
      l.incident_type?.toLowerCase().includes(q) ||
      l.description?.toLowerCase().includes(q) ||
      l.severity?.toLowerCase().includes(q)
    );
  }, [incidents, searchTemuan]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full flex flex-col gap-6 pb-8">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-gray-400 hover:text-white transition-colors"><ArrowLeft size={20} /></button>
        <div>
          <h2 className="text-xl font-serif font-bold text-white">Lapor Temuan</h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Laporkan Temuan & Insiden di Lapangan</p>
        </div>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="glass-panel p-5 rounded-[24px] border border-white/10 space-y-4">
        <div className="flex items-center gap-2 text-amber-400 font-serif font-bold text-sm mb-2">
          <AlertTriangle size={16} /> <span>LAPOR TEMUAN MANDIRI</span>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-black mb-1">Pilih Lokasi Checkpoint</label>
            <select value={form.checkpoint_id} onChange={e => setForm({ ...form, checkpoint_id: e.target.value })} required className="w-full bg-[#13151A] border border-white/20 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[var(--aurora-3)]">
              <option value="">-- Pilih Pos Jaga --</option>
              {checkpoints.map(cp => <option key={cp.id} value={cp.id}>{cp.name || cp.titik}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-black mb-1">Kategori</label>
            <select value={form.kategori} onChange={e => setForm({ ...form, kategori: e.target.value, temuan: '' })} required className="w-full bg-[#13151A] border border-white/20 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[var(--aurora-3)]">
              <option value="">-- Pilih Kategori --</option>
              {KATEGORI_TEMUAN.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-black mb-1">Jenis Temuan</label>
            <select value={form.temuan} onChange={e => setForm({ ...form, temuan: e.target.value })} required disabled={!form.kategori} className="w-full bg-[#13151A] border border-white/20 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[var(--aurora-3)] disabled:opacity-50">
              <option value="">-- Pilih Jenis --</option>
              {dropdownTemuans.map(t => <option key={t.kode} value={t.kode}>[{t.kode}] {t.nama}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-black mb-2">Tingkat Bahaya (Severity)</label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'low', label: 'Rendah', colorClass: 'border-blue-500/40 text-blue-400 bg-blue-500/10' },
                { id: 'medium', label: 'Sedang', colorClass: 'border-amber-500/40 text-amber-400 bg-amber-500/10' },
                { id: 'high', label: 'Tinggi', colorClass: 'border-red-500/40 text-red-400 bg-red-500/10' },
                { id: 'critical', label: 'Kritis', colorClass: 'border-purple-500/40 text-purple-400 bg-purple-500/10' }
              ].map(sv => {
                const active = form.severity === sv.id;
                return (
                  <button key={sv.id} type="button" onClick={() => setForm({ ...form, severity: sv.id })}
                    className={`py-2 px-1.5 rounded-xl border text-[9px] uppercase font-black tracking-wide text-center transition-all ${active ? sv.colorClass + ' ring-1 ring-white/20 scale-105' : 'border-white/10 text-gray-500 hover:text-white'}`}>
                    {sv.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-black mb-1">Deskripsi Uraian</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Tuliskan keterangan detail temuan..." rows={3} className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-xs text-white outline-none resize-none focus:border-[var(--aurora-3)] hover:border-white/40 transition-colors" />
          </div>

          <div>
            <label className="block text-[8px] text-gray-500 uppercase tracking-widest font-black mb-1">Lampiran Foto Bukti</label>
            {form.photo ? (
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-white/20">
                <img src={URL.createObjectURL(form.photo)} alt="Preview" className="w-full h-full object-cover" />
                <button type="button" onClick={() => setForm({ ...form, photo: null })} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center font-bold text-xs">X</button>
              </div>
            ) : (
              <label className="flex items-center gap-3 p-3 bg-white/5 border border-dashed border-white/20 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                <Camera size={18} className="text-gray-400" />
                <span className="text-xs text-gray-400">Upload foto bukti...</span>
                <input type="file" accept="image/*" onChange={e => setForm({ ...form, photo: e.target.files[0] })} className="hidden" />
              </label>
            )}
          </div>
        </div>

        <button type="submit" disabled={submitting || !form.checkpoint_id || !form.kategori || !form.temuan}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-black text-xs uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_10px_35px_rgba(142,45,226,0.2)]">
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} KIRIM LAPORAN TEMUAN
        </button>
      </form>

      {/* RIWAYAT */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><History size={16} /> Riwayat Temuan</h3>
          <div className="relative">
            <input type="text" value={searchTemuan} onChange={e => setSearchTemuan(e.target.value)} placeholder="Cari temuan..." className="w-40 bg-[#13151A] border border-white/20 rounded-xl pl-7 pr-3 py-1.5 text-xs text-white outline-none focus:border-[var(--aurora-3)] placeholder:text-gray-500" />
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
          </div>
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
          {filteredIncidents.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-xs">
              <AlertTriangle size={28} className="mx-auto text-gray-600 mb-2" />
              Belum ada temuan insiden tercatat.
            </div>
          ) : (
            filteredIncidents.map(inc => {
              const cp = checkpoints.find(c => c.id === inc.patrol_logs?.checkpoint_id);
              return (
                <div key={inc.id} className="bg-white/5 border border-[var(--danger)]/20 p-4 rounded-2xl space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                        <AlertTriangle size={16} />
                      </div>
                      <div>
                        <p className="text-white text-xs font-bold">{inc.incident_type}</p>
                        <p className="text-[9px] text-gray-500">{new Date(inc.created_at).toLocaleString('id-ID')} WIB</p>
                      </div>
                    </div>
                    <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      inc.severity === 'critical' ? 'bg-purple-500/15 text-purple-400' :
                      inc.severity === 'high' ? 'bg-red-500/15 text-red-400' :
                      inc.severity === 'low' ? 'bg-blue-500/15 text-blue-400' :
                      'bg-amber-500/15 text-amber-400'
                    }`}>{inc.severity}</span>
                  </div>
                  <p className="text-[11px] text-gray-400">{inc.description}</p>
                  {cp && <div className="text-[9px] text-[var(--aurora-3)] font-medium"><MapPin size={10} className="inline" /> Pos: {cp.name || cp.titik}</div>}
                  {inc.photo_url && (
                    <a href={inc.photo_url} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 mt-1 block">
                      <img src={inc.photo_url} alt="" className="w-full h-full object-cover" />
                    </a>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default EmployeeTemuan;
