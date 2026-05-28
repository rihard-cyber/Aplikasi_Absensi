import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle2, XCircle, FileText, Loader2, Search, Download, Printer, Upload, Camera } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { logAudit } from '../../../utils/auditLogger';
import { sendNotification, NOTIF_TYPES } from '../../../utils/notificationEngine';

const OVERTIME_TYPES = { voluntary: 'Sukarela', forced: 'Lembur Paksa', emergency: 'Darurat', holiday: 'Hari Libur' };

const OvertimeManagement = () => {
  const [tenantId, setTenantId] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selected, setSelected] = useState(null);
  const [sigModal, setSigModal] = useState(null);
  const [uploadingSig, setUploadingSig] = useState(null);
  const [sigs, setSigs] = useState({ employee: null, supervisor: null, management: null });
  const toast = useToast();

  useEffect(() => { init(); }, []);

  const init = async () => {
    setLoading(true);
    const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!profile?.tenant_id && !isGod) return;
    if (profile?.tenant_id) setTenantId(profile.tenant_id);
    const tid = profile?.tenant_id;

    let q = supabase.from('overtime_requests').select('*, profiles!inner(full_name, nip, position), replaced:replaced_profile_id(full_name)');
    if (tid) q = q.eq('tenant_id', tid);
    q = q.order('created_at', { ascending: false });
    const { data } = await q;
    if (data) setRequests(data);
    setLoading(false);
  };

  const approveRequest = async (req) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: admin } = await supabase.from('profiles').select('id').eq('auth_id', session.user.id).maybeSingle();
    await supabase.from('overtime_requests').update({
      status: 'approved', approved_by: admin?.id, approved_at: new Date().toISOString()
    }).eq('id', req.id);
    logAudit('APPROVE_OVERTIME', { employee: req.profiles?.full_name, date: req.date, hours: req.total_hours });
    sendNotification({ userId: req.user_id, type: NOTIF_TYPES.OVERTIME_APPROVED, title: 'Lembur Disetujui', body: 'Lembur tanggal ' + req.date + ' (' + req.total_hours + ' jam) disetujui', link: '/lembur' });
    toast(`Lembur ${req.profiles?.full_name} disetujui!`, 'success');
    init();
  };

  const rejectRequest = async (req) => {
    await supabase.from('overtime_requests').update({ status: 'rejected' }).eq('id', req.id);
    sendNotification({ userId: req.user_id, type: NOTIF_TYPES.OVERTIME_REJECTED, title: 'Lembur Ditolak', body: 'Lembur tanggal ' + req.date + ' (' + req.total_hours + ' jam) ditolak', link: '/lembur' });
    toast(`Lembur ${req.profiles?.full_name} ditolak`, 'info');
    logAudit('REJECT_OVERTIME', { employee: req.profiles?.full_name, date: req.date });
    init();
  };

  const markBilled = async (req) => {
    await supabase.from('overtime_requests').update({ status: 'billed' }).eq('id', req.id);
    toast('Ditandai sebagai ditagih ke client', 'success');
    logAudit('BILL_OVERTIME', { employee: req.profiles?.full_name, date: req.date });
    init();
  };

  const openSigUpload = async (req) => {
    setSigModal(req);
    setUploadingSig(null);
    const { data: form } = await supabase.from('overtime_forms').select('*').eq('request_id', req.id).maybeSingle();
    setSigs({
      employee: form?.signature_employee_url || null,
      supervisor: form?.signature_supervisor_url || null,
      management: form?.signature_management_url || null,
    });
  };

  const uploadSignature = async (party) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploadingSig(party);
      try {
        const filePath = `signatures/${sigModal.id}/${party}_${Date.now()}.png`;
        const { error: upErr } = await supabase.storage.from('documents').upload(filePath, file, { contentType: 'image/png' });
        if (upErr) throw upErr;
        const url = supabase.storage.from('documents').getPublicUrl(filePath).data.publicUrl;
        await supabase.from('overtime_forms').upsert({ request_id: sigModal.id, [`signature_${party}_url`]: url }, { onConflict: 'request_id' });
        setSigs(prev => ({ ...prev, [party]: url }));
        toast(`Tanda tangan ${party} berhasil diupload`, 'success');
      } catch (err) {
        toast('Gagal upload tanda tangan', 'error');
        console.error(err);
      }
      setUploadingSig(null);
    };
    input.click();
  };

  const getTypeBadge = (type) => {
    const colors = { voluntary: 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30', forced: 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/30', emergency: 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/30', holiday: 'bg-[var(--aurora-3)]/10 text-[var(--aurora-3)] border-[var(--aurora-3)]/30' };
    return <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${colors[type] || colors.voluntary}`}>{OVERTIME_TYPES[type] || type}</span>;
  };

  const getStatusBadge = (status) => {
    const styles = { pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30', approved: 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30', rejected: 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/30', billed: 'bg-blue-500/10 text-blue-400 border-blue-500/30', cancelled: 'bg-gray-500/10 text-gray-400 border-gray-500/30' };
    return <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${styles[status] || styles.pending}`}>{status}</span>;
  };

  const printForm = async (req) => {
    const { data: form } = await supabase.from('overtime_forms').select('*').eq('request_id', req.id).maybeSingle();
    const sigEmp = form?.signature_employee_url;
    const sigSup = form?.signature_supervisor_url;
    const sigMgt = form?.signature_management_url;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Form Lembur</title><style>
      body{font-family:sans-serif;margin:40px;font-size:13px;line-height:1.6}
      h2{text-align:center;margin-bottom:4px}
      .sub{text-align:center;color:#666;font-size:12px;margin-bottom:24px}
      table{width:100%;border-collapse:collapse;margin-bottom:20px}
      td,th{border:1px solid #000;padding:8px 12px;text-align:left}
      th{background:#f0f0f0;font-size:11px;text-transform:uppercase}
      .signature-row{display:flex;justify-content:space-between;margin-top:40px}
      .signature-box{text-align:center;width:30%}
      .signature-box .line{border-top:1px solid #000;margin-top:60px;padding-top:8px;font-size:11px;font-weight:bold}
      .signature-box img{height:60px;margin-bottom:4px;object-fit:contain}
      .info{font-size:12px;margin-bottom:8px}
    </style></head><body>
      <h2>FORMULIR LEMBUR / OVERTIME</h2>
      <p class="sub">SI PRESENSI PRO MAX — ${req.profiles?.full_name} • ${req.date}</p>
      <table>
        <tr><th>Karyawan</th><td>${req.profiles?.full_name} (${req.profiles?.nip || '-'})</td></tr>
        <tr><th>Posisi</th><td>${req.profiles?.position || '-'}</td></tr>
        <tr><th>Tanggal</th><td>${req.date}</td></tr>
        <tr><th>Jenis Lembur</th><td>${OVERTIME_TYPES[req.overtime_type] || req.overtime_type}</td></tr>
        <tr><th>Jam Mulai</th><td>${req.start_time?.substring(0,5) || '-'}</td></tr>
        <tr><th>Jam Selesai</th><td>${req.end_time?.substring(0,5) || '-'}</td></tr>
        <tr><th>Total Jam</th><td>${req.total_hours} jam</td></tr>
        <tr><th>Alasan</th><td>${req.description || '-'}</td></tr>
        <tr><th>Status</th><td>${req.status.toUpperCase()}</td></tr>
      </table>
      <div class="signature-row">
        <div class="signature-box">${sigEmp ? `<img src="${sigEmp}" alt="TTD Karyawan" />` : ''}<div class="line">Karyawan</div></div>
        <div class="signature-box">${sigSup ? `<img src="${sigSup}" alt="TTD Supervisor" />` : ''}<div class="line">Supervisor</div></div>
        <div class="signature-box">${sigMgt ? `<img src="${sigMgt}" alt="TTD Manajemen" />` : ''}<div class="line">Manajemen Gedung</div></div>
      </div>
      <p style="margin-top:40px;color:#999;font-size:10px;text-align:center">Dicetak dari SI PRESENSI PRO MAX — Dokumen ini adalah bukti resmi lembur</p>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const filtered = requests.filter(r => filter === 'all' || r.status === filter);
  const counts = { pending: requests.filter(r => r.status === 'pending').length };

  const renderDetailModal = () => {
    if (!selected) return null;
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#1A1C23] rounded-3xl border border-white/10 p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">Detail Lembur</h3>
              <p className="text-xs text-gray-500">{selected.profiles?.full_name}</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white p-2">✕</button>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between bg-white/5 p-3 rounded-xl"><span className="text-gray-400">Tanggal</span><span className="text-white font-bold">{selected.date}</span></div>
            <div className="flex justify-between bg-white/5 p-3 rounded-xl"><span className="text-gray-400">Jenis</span>{getTypeBadge(selected.overtime_type)}</div>
            <div className="flex justify-between bg-white/5 p-3 rounded-xl"><span className="text-gray-400">Jam</span><span className="text-white font-bold">{selected.start_time?.substring(0,5)} - {selected.end_time?.substring(0,5)} ({selected.total_hours} jam)</span></div>
            <div className="flex justify-between bg-white/5 p-3 rounded-xl"><span className="text-gray-400">Status</span>{getStatusBadge(selected.status)}</div>
            {selected.description && <div className="bg-white/5 p-3 rounded-xl"><span className="text-gray-400 block mb-1">Alasan</span><span className="text-white">{selected.description}</span></div>}
            {selected.is_forced && <div className="flex justify-between bg-white/5 p-3 rounded-xl"><span className="text-gray-400">Status Paksa</span><span className="text-[var(--danger)] font-bold">LEMBUR PAKSA ⚠️</span></div>}
            {selected.is_forced && selected.replaced?.full_name && <div className="flex justify-between bg-white/5 p-3 rounded-xl"><span className="text-gray-400">Menggantikan</span><span className="text-white font-bold">{selected.replaced.full_name}</span></div>}
            {selected.forced_reason && <div className="bg-white/5 p-3 rounded-xl"><span className="text-gray-400 block mb-1">Alasan Paksa</span><span className="text-[var(--danger)]">{selected.forced_reason}</span></div>}
          </div>
          <div className="flex gap-2 mt-6">
            <button onClick={() => { printForm(selected); setSelected(null); }} className="flex-1 px-4 py-3 rounded-xl bg-[var(--aurora-3)]/10 border border-[var(--aurora-3)]/30 text-[var(--aurora-3)] text-xs font-bold flex items-center justify-center gap-2"><Printer size={14} /> Cetak Form</button>
            <button onClick={() => setSelected(null)} className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-xs font-bold">Tutup</button>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className="glass-panel p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-6 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">Manajemen Lembur</h2>
          <p className="text-sm text-gray-400 mt-1">Kelola permintaan lembur semua karyawan</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['pending', 'approved', 'rejected', 'billed', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${filter === f ? 'bg-[var(--aurora-3)]/20 border-[var(--aurora-3)] text-white' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}>
            {f === 'all' ? 'Semua' : f} {f === 'pending' && counts.pending > 0 && <span className="ml-1 px-1.5 py-0.5 bg-[var(--danger)] text-white rounded-full text-[8px]">{counts.pending}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={32} className="animate-spin text-[var(--aurora-3)]" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Clock size={40} className="mx-auto text-gray-500 mb-4" />
          <p className="text-gray-400">Tidak ada permintaan lembur dengan status "{filter}"</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => (
            <div key={req.id} className="bg-white/5 rounded-2xl border border-white/10 p-4 hover:border-white/20 transition-all">
              <div className="flex flex-col sm:flex-row justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center text-white font-bold text-sm">
                    {req.profiles?.full_name?.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm">{req.profiles?.full_name}</h4>
                    <p className="text-[10px] text-gray-500">{req.profiles?.nip || req.profiles?.position || '—'}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-[10px] text-gray-500">{req.date}</span>
                      <span className="text-[10px] text-gray-500">•</span>
                      <span className="text-[10px] text-gray-500">{req.start_time?.substring(0,5)} - {req.end_time?.substring(0,5)}</span>
                      <span className="text-[10px] text-gray-500">•</span>
                      <span className="text-[10px] font-bold text-[var(--aurora-3)]">{req.total_hours} jam</span>
                      <span className="text-[10px] text-gray-500">•</span>
                      {getTypeBadge(req.overtime_type)}
                      <span className="text-[10px] text-gray-500">•</span>
                      {getStatusBadge(req.status)}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <button onClick={() => setSelected(req)} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-[10px] font-bold flex items-center gap-1 hover:bg-white/10"><Search size={12} /> Detail</button>
                  {(req.status === 'approved' || req.status === 'billed') && (
                    <button onClick={() => openSigUpload(req)} className="px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[10px] font-bold flex items-center gap-1"><Upload size={12} /> TTD</button>
                  )}
                  {req.status === 'pending' && (
                    <>
                      <button onClick={() => approveRequest(req)} className="px-3 py-2 rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/30 text-[var(--success)] text-[10px] font-bold flex items-center gap-1"><CheckCircle2 size={12} /> Setuju</button>
                      <button onClick={() => rejectRequest(req)} className="px-3 py-2 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)] text-[10px] font-bold flex items-center gap-1"><XCircle size={12} /> Tolak</button>
                    </>
                  )}
                  {req.status === 'approved' && (
                    <button onClick={() => markBilled(req)} className="px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-bold flex items-center gap-1"><FileText size={12} /> Tagih ke Client</button>
                  )}
                  <button onClick={() => printForm(req)} className="px-3 py-2 rounded-xl bg-[var(--aurora-3)]/10 border border-[var(--aurora-3)]/30 text-[var(--aurora-3)] text-[10px] font-bold flex items-center gap-1"><Printer size={12} /> Cetak</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>{renderDetailModal()}</AnimatePresence>
      <AnimatePresence>{sigModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSigModal(null)}>
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#1A1C23] rounded-3xl border border-white/10 p-6 max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Upload Tanda Tangan</h3>
                <p className="text-xs text-gray-500">{sigModal.profiles?.full_name} — {sigModal.date}</p>
              </div>
              <button onClick={() => setSigModal(null)} className="text-gray-500 hover:text-white p-2">✕</button>
            </div>
            <div className="space-y-4">
              {[
                { key: 'employee', label: 'Karyawan', color: 'blue' },
                { key: 'supervisor', label: 'Supervisor', color: 'green' },
                { key: 'management', label: 'Manajemen Gedung', color: 'purple' },
              ].map(({ key, label, color }) => (
                <div key={key} className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-white">{label}</span>
                    <button
                      onClick={() => uploadSignature(key)}
                      disabled={uploadingSig === key}
                      className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border ${
                        sigs[key] ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      {uploadingSig === key ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                      {sigs[key] ? 'Ganti' : 'Upload'}
                    </button>
                  </div>
                  {sigs[key] ? (
                    <img src={sigs[key]} alt={label} className="h-16 object-contain bg-white/5 rounded-xl p-2" />
                  ) : (
                    <div className="h-16 flex items-center justify-center bg-white/5 rounded-xl border border-dashed border-white/10">
                      <span className="text-[10px] text-gray-500">Belum diupload</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
};

export default OvertimeManagement;
