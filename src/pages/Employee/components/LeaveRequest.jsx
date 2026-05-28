/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, FileText, Send, ChevronRight,
  CheckCircle2, AlertCircle, XCircle, Loader2,
  Image as ImageIcon, Plus, Filter,
  Eye, ArrowLeft, Zap, CheckCircle2 as CheckCircleIcon, Wallet, TrendingUp, RefreshCcw
} from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { compressImage } from '../../../utils/imageCompressor';
import PayslipView from './PayslipView';
import LoanRequest from './LoanRequest';
import ReimbursementRequest from './ReimbursementRequest';
import QRScanner from './QRScanner';
import ProfileEditor from './ProfileEditor';

const LeaveRequest = ({ onBack, category = 'leave' }) => {
  const [view, setView] = useState('history');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();
  const [showSuccess, setShowSuccess] = useState(false);

  // Delegate to sub-components BEFORE hooks
  if (category === 'salary') {
    return <div><button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"><ArrowLeft size={18} /> Kembali</button><PayslipView onBack={onBack} /></div>;
  }
  if (category === 'loan') {
    return <LoanRequest onBack={onBack} />;
  }
  if (category === 'reimbursement') {
    return <ReimbursementRequest onBack={onBack} />;
  }
  if (category === 'qr') {
    return <QRScanner onBack={onBack} />;
  }
  if (category === 'edit-profile') {
    return <ProfileEditor onBack={onBack} />;
  }

  // CATEGORY CONFIGURATION
  const config = {
    leave: {
      title: "Izin & Cuti",
      icon: <Calendar />,
      types: [
        "Surat Tugas", "Izin Pelatihan", "Izin Tidak Masuk Kerja", "Izin Khusus", "Izin Pulang Awal",
        "Izin Berobat", "Izin Datang Terlambat", "Cuti Pernikahan", "Cuti Melahirkan",
        "Keguguran, Khitan, Baptisan", "Cuti Bencana Alam / Kebanjiran / Musibah",
        "Cuti Tahunan", "Cuti Sakit", "Lupa Absen", "Perjalanan Dinas"
      ]
    },
    lembur: {
      title: "Lembur",
      icon: <Zap />,
      types: ["Lembur Hari Kerja", "Lembur Hari Libur", "Lembur Proyek Khusus"]
    },
    shift: {
      title: "Tukar Shift",
      icon: <RefreshCcw />,
      types: ["Tukar Shift Pagi-Malam", "Ganti Hari Libur"]
    },
    'req-absen': {
      title: "Request Absen",
      icon: <CheckCircleIcon />,
      types: ["Lupa Tapping", "Mesin Error", "Dinas Luar"]
    },
    salary: { title: "Slip Gaji", icon: <Wallet />, types: ["Download Slip Mei 2026", "Download Slip April 2026"] },
    contract: { title: "PKWT / Kontrak", icon: <FileText />, types: ["View Kontrak Aktif"] },
    overtime: { title: "Overtime", icon: <TrendingUp />, types: ["Pengajuan Overtime"] }
  };

  const currentConfig = config[category] || config.leave;

  // MOCK DATA: History
  const [history, setHistory] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [expandedId, setExpandedId] = useState(null);

  const [formData, setFormData] = useState({
    type: currentConfig.types[0],
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    reason: '',
    file: null
  });
  // Shift Exchange Extra Fields
  const [shiftSwapData, setShiftSwapData] = useState({ target_user_id: '', target_date: '' });
  const [colleagues, setColleagues] = useState([]);

  useEffect(() => {
    if (view === 'history') {
      fetchHistory();
    }
    if (view === 'form' && category === 'shift') {
      fetchColleagues();
    }
  }, [view]);

  const fetchHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: userProfile } = await supabase.from('profiles').select('id').eq('auth_id', session.user.id).maybeSingle();

      if (category === 'salary' || category === 'contract') {
        const docTypeFilter = category === 'salary' ? 'Slip Gaji' : 'Kartu Keluarga'; // Fallback to label patterns
        // Note: in DocumentVault, doc_type is label-based: "KTP (Identitas)", "Kartu Keluarga", etc.
        // We might need to check how they are stored.
        
        const { data } = await supabase
          .from('employee_documents')
          .select('*')
          .eq('user_id', userProfile?.id)
          .order('created_at', { ascending: false });

        if (data) {
          // Filter manually for flexibility or refine query
          const filtered = category === 'salary' 
            ? data.filter(d => d.doc_type.includes('Slip') || d.doc_type.includes('Gaji'))
            : data.filter(d => d.doc_type.includes('Kontrak') || d.doc_type.includes('PKWT') || d.doc_type.includes('Kartu Keluarga'));

          const formatted = filtered.map(item => ({
            id: item.id, 
            type: item.doc_type, 
            status: item.verification_status || 'VERIFIED', 
            reason: 'Dokumen digital tersedia untuk diunduh / dilihat.', 
            note: '',
            file_url: item.file_url,
            date: new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
          }));
          setHistory(formatted);
        }
      } else {
        const { data } = await supabase
          .from('leave_requests')
          .select('*')
          .eq('user_id', userProfile?.id)
          .in('type', currentConfig.types)
          .order('created_at', { ascending: false });

        if (data) {
          const formatted = data.map(item => ({
            id: item.id, type: item.type, status: item.status, reason: item.reason, note: item.note || '',
            date: item.start_date === item.end_date ? item.start_date : `${item.start_date} s/d ${item.end_date}`,
            startTime: item.start_time,
            endTime: item.end_time,
            file_url: item.file_url
          }));
          setHistory(formatted);
        }
      }
    } catch (e) {
      console.error("Gagal menarik data pengajuan", e);
    }
  };

  const fetchColleagues = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: myProfile } = await supabase.from('profiles').select('project_id').eq('auth_id', session.user.id).maybeSingle();
      if (myProfile?.project_id) {
        const { data: peers } = await supabase.from('profiles').select('auth_id, full_name').eq('project_id', myProfile.project_id);
        if (peers) setColleagues(peers);
      }
    } catch (e) { console.error(e); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) { toast('Sesi habis, silakan login ulang', 'error'); setIsSubmitting(false); return; }
      const { data: userProfile } = await supabase.from('profiles').select('id, tenant_id').eq('auth_id', session.user.id).maybeSingle();

      let fileUrl = null;
      // Auto Upload lampiran jika ada (compress images first)
      if (formData.file) {
        const ext = formData.file.name.split('.').pop();
        const fileName = `${session.user.id}/req_${Date.now()}.${ext}`;
        const fileToUpload = await compressImage(formData.file, 1, 1920);
        const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, fileToUpload);
        if (!uploadError) fileUrl = supabase.storage.from('documents').getPublicUrl(fileName).data.publicUrl;
      }

      const { error } = await supabase.from('leave_requests').insert({
        tenant_id: userProfile.tenant_id,
        user_id: userProfile.id, 
        type: formData.type, 
        start_date: formData.startDate, 
        end_date: formData.endDate, 
        start_time: formData.startTime || null,
        end_time: formData.endTime || null,
        reason: formData.reason, 
        file_url: fileUrl, 
        status: 'PENDING',
        is_shift_swap: category === 'shift',
        target_user_id: category === 'shift' ? shiftSwapData.target_user_id || null : null,
        target_date: category === 'shift' ? shiftSwapData.target_date || null : null
      });
      if (error) throw error;

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false); setView('history'); setFormData({ ...formData, reason: '', file: null });
      }, 2000);
    } catch (err) {
      toast('Pengajuan Gagal: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col gap-6 pb-24 relative min-h-[60vh]"
    >
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-serif font-bold text-white">{currentConfig.title}</h2>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Management Portal</p>
          </div>
        </div>
        {view === 'history' && (
          <button
            onClick={() => setView('form')}
            className="p-3 bg-[var(--aurora-3)] text-black rounded-2xl shadow-[0_0_20px_rgba(0,201,255,0.3)] hover:scale-110 transition-all"
          >
            <Plus size={24} />
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* VIEW 1: HISTORY LIST */}
        {view === 'history' ? (
          <motion.div
            key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
              <StatusChip label="Semua" active={filterStatus === 'ALL'} count={history.length} onClick={() => setFilterStatus('ALL')} />
              <StatusChip label="Menunggu" color="var(--warning)" active={filterStatus === 'PENDING'} count={history.filter(h => h.status === 'PENDING').length} onClick={() => setFilterStatus('PENDING')} />
              <StatusChip label="Disetujui" color="var(--success)" active={filterStatus === 'APPROVED'} count={history.filter(h => h.status === 'APPROVED').length} onClick={() => setFilterStatus('APPROVED')} />
            </div>

            {history.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-12 text-center glass-panel rounded-3xl border border-white/5 mt-4">
                <FileText size={48} className="text-gray-600 mb-4" />
                <h4 className="text-white font-bold text-sm">Belum Ada Pengajuan</h4>
                <p className="text-gray-500 text-xs mt-1">Data pengajuan {currentConfig.title} Anda akan muncul di sini.</p>
              </motion.div>
            ) : (
              <>
                {history.filter(h => filterStatus === 'ALL' || h.status === filterStatus).map((item) => (
                  <div 
                    key={item.id} 
                    className="glass-panel p-5 rounded-3xl border border-white/5 cursor-pointer hover:border-[var(--aurora-3)]/30 transition-all"
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-[var(--aurora-3)]">
                          {currentConfig.icon}
                        </div>
                        <div>
                          <h4 className="text-white font-bold text-sm">{item.type}</h4>
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">{item.date}</p>
                        </div>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    
                    <AnimatePresence>
                      {expandedId === item.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="pt-2 pb-2 space-y-2 border-t border-white/5 mt-2">
                            {item.startTime && item.endTime && (
                              <div className="flex items-center gap-2 text-[10px] text-[var(--aurora-3)] font-bold uppercase tracking-widest bg-[var(--aurora-3)]/10 px-3 py-2 rounded-xl inline-flex mb-2 border border-[var(--aurora-3)]/20">
                                <Clock size={12} /> {item.startTime.substring(0,5)} - {item.endTime.substring(0,5)}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="p-4 bg-black/20 rounded-2xl border border-white/5 flex justify-between items-center">
                      <p className={`text-[11px] text-gray-400 italic ${expandedId === item.id ? '' : 'line-clamp-1'}`}>"{item.reason}"</p>
                      {item.file_url && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); window.open(item.file_url, '_blank'); }}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--aurora-3)]/10 border border-[var(--aurora-3)]/30 text-[var(--aurora-3)] text-[10px] font-bold hover:bg-[var(--aurora-3)] hover:text-black transition-all shrink-0 ml-4"
                        >
                          <Eye size={12} /> Lihat
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col gap-6"
          >
            <div className="glass-panel p-8 rounded-[40px] border border-white/5 space-y-6 bg-white/[0.02]">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="text-[var(--aurora-3)]" size={20} />
                <h3 className="text-lg font-serif font-bold text-white tracking-wide">Formulir Pengajuan</h3>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Jenis Pengajuan</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-xs text-white outline-none focus:border-[var(--aurora-3)] transition-all"
                  >
                    {currentConfig.types.map(t => <option key={t} value={t} className="bg-[#0B0C10]">{t}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Tanggal Mulai</label>
                    <input
                      type="date" required value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-xs text-white outline-none focus:border-[var(--aurora-3)]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Tanggal Selesai</label>
                    <input
                      type="date" required value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-xs text-white outline-none focus:border-[var(--aurora-3)]"
                    />
                  </div>
                </div>

                {/* OVERTIME / LEMBUR TIME PICKERS */}
                {(category === 'overtime' || category === 'lembur') && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Jam Mulai</label>
                      <input
                        type="time" required value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-xs text-white outline-none focus:border-[var(--aurora-3)]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Jam Selesai</label>
                      <input
                        type="time" required value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-xs text-white outline-none focus:border-[var(--aurora-3)]"
                      />
                    </div>
                  </div>
                )}

                {/* SHIFT EXCHANGE SPECIFIC FIELDS */}
                {category === 'shift' && (
                  <div className="space-y-4 bg-[var(--aurora-3)]/5 border border-[var(--aurora-3)]/20 p-5 rounded-3xl">
                    <p className="text-xs font-bold text-[var(--aurora-3)] uppercase tracking-widest flex items-center gap-2"><RefreshCcw size={14}/> Info Tukar Shift</p>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Tukar dengan Karyawan</label>
                      <select value={shiftSwapData.target_user_id} onChange={e => setShiftSwapData({...shiftSwapData, target_user_id: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-xs text-white outline-none focus:border-[var(--aurora-3)]">
                        <option value="">Pilih Rekan Seproject...</option>
                        {colleagues.map(c => <option key={c.auth_id} value={c.auth_id} className="bg-[#0B0C10]">{c.full_name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Tanggal Shift yang Ditukar (Milik Rekan)</label>
                      <input type="date" value={shiftSwapData.target_date} onChange={e => setShiftSwapData({...shiftSwapData, target_date: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-xs text-white outline-none focus:border-[var(--aurora-3)]"/>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Keterangan / Alasan</label>
                  <textarea
                    rows="4" required placeholder="Tuliskan detail pengajuan Anda..."
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-xs text-white outline-none focus:border-[var(--aurora-3)] resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Lampiran Dokumen</label>
                  <label className="p-8 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-2 hover:border-[var(--aurora-3)]/50 transition-all cursor-pointer bg-white/[0.01] group">
                    <input
                      type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setFormData({ ...formData, file: e.target.files[0] })}
                    />
                    <ImageIcon size={32} className="text-gray-600 group-hover:text-[var(--aurora-3)]" />
                    <p className="text-[10px] text-center text-gray-500 uppercase font-bold tracking-tighter">
                      {formData.file ? formData.file.name : 'Upload Lampiran'}
                    </p>
                  </label>
                </div>

                <div className="pt-4">
                  {showSuccess ? (
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="w-full py-4 rounded-2xl bg-[var(--success)]/20 text-[var(--success)] flex items-center justify-center gap-3 border border-[var(--success)]/30">
                      <CheckCircle2 size={20} />
                      <span className="text-xs font-bold uppercase tracking-widest">Berhasil Diajukan</span>
                    </motion.div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        type="button" onClick={() => setView('history')}
                        className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-gray-400 font-bold uppercase tracking-widest text-[10px]"
                      >
                        Batal
                      </button>
                      <button
                        type="submit" disabled={isSubmitting}
                        className="flex-[2] py-4 rounded-2xl bg-gradient-to-r from-[var(--aurora-2)] to-[var(--aurora-3)] text-white font-bold uppercase tracking-widest text-[10px] shadow-[0_15px_30px_rgba(0,201,255,0.2)] flex items-center justify-center gap-3"
                      >
                        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <>Ajukan <Send size={14} /></>}
                      </button>
                    </div>
                  )}
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const StatusBadge = ({ status }) => {
  const colors = { PENDING: 'var(--warning)', APPROVED: 'var(--success)', REJECTED: 'var(--danger)' };
  const labels = { PENDING: 'MENUNGGU', APPROVED: 'DISETUJUI', REJECTED: 'DITOLAK' };
  return (
    <span className="text-[8px] font-black px-2 py-1 rounded bg-black/40 uppercase tracking-tighter" style={{ color: colors[status] || 'white' }}>
      {labels[status] || status}
    </span>
  );
};

const StatusChip = ({ label, count, color, active, onClick }) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all whitespace-nowrap ${active ? 'bg-white/10 border-white/20' : 'bg-transparent border-transparent'}`}>
    <span className="text-[10px] sm:text-[9px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
    <span className="text-[10px] font-bold px-1.5 rounded-md bg-white/5" style={{ color: color || 'white' }}>{count}</span>
  </button>
);

export default LeaveRequest;
