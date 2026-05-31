import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { useConfirm } from '../../../components/ConfirmDialog';
import { CheckCircle2, XCircle, Clock, Building2, Mail, Phone, Users, MessageSquare, Loader2, Copy } from 'lucide-react';

const statusColors = {
  pending: { bg: 'bg-[var(--warning)]/10', border: 'border-[var(--warning)]/30', text: 'text-[var(--warning)]', icon: Clock },
  approved: { bg: 'bg-[var(--success)]/10', border: 'border-[var(--success)]/30', text: 'text-[var(--success)]', icon: CheckCircle2 },
  rejected: { bg: 'bg-[var(--danger)]/10', border: 'border-[var(--danger)]/30', text: 'text-[var(--danger)]', icon: XCircle },
};

const DemoApproval = ({ searchQuery }) => {
  const toast = useToast();
  const confirm = useConfirm();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [showApproved, setShowApproved] = useState(false);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [copiedCode, setCopiedCode] = useState(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_pending_demo_requests');
      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      toast(`Gagal memuat pengajuan demo: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchApproved = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('demo_requests')
        .select('*')
        .in('status', ['approved', 'rejected', 'expired'])
        .order('processed_at', { ascending: false });
      if (!error) setApprovedRequests(data || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  useEffect(() => {
    if (showApproved) fetchApproved();
  }, [showApproved, fetchApproved]);

  const handleApprove = async (req) => {
    const ok = await confirm(
      `Setujui demo untuk ${req.company_name}?`,
      'Setujui & Buat Tenant Demo'
    );
    if (!ok) return;

    setProcessingId(req.id);
    try {
      const { data, error } = await supabase.rpc('approve_demo_request', {
        p_request_id: req.id,
        p_admin_notes: null
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];
        toast(`Tenant demo "${result.company_name}" berhasil dibuat! Kode aktivasi: ${result.activation_code}`, 'success');
        await fetchRequests();
        await fetchApproved();
      }
    } catch (error) {
      toast(`Gagal menyetujui: ${error.message}`, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (req) => {
    const ok = await confirm(
      `Tolak pengajuan demo dari ${req.company_name}?`,
      'Tolak Pengajuan'
    );
    if (!ok) return;

    setProcessingId(req.id);
    try {
      const { error } = await supabase.rpc('reject_demo_request', {
        p_request_id: req.id,
        p_admin_notes: 'Ditolak oleh Super Admin'
      });

      if (error) throw error;

      toast('Pengajuan demo ditolak.', 'info');
      await fetchRequests();
      await fetchApproved();
    } catch (error) {
      toast(`Gagal menolak: ${error.message}`, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  const filteredRequests = searchQuery
    ? requests.filter(r =>
        r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : requests;

  const filteredApproved = searchQuery
    ? approvedRequests.filter(r =>
        r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : approvedRequests;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-lg tracking-wide flex items-center gap-3 text-white">
            <Building2 size={20} className="text-[var(--aurora-3)]" /> Pengajuan Demo
          </h2>
          <p className="text-[9px] text-gray-500 uppercase tracking-[0.3em] mt-1 font-black">
            {requests.length} menunggu persetujuan
          </p>
        </div>
        <button
          onClick={() => setShowApproved(!showApproved)}
          className={`px-4 py-2 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all border ${
            showApproved
              ? 'bg-[var(--aurora-3)]/10 border-[var(--aurora-3)]/30 text-[var(--aurora-3)]'
              : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
          }`}
        >
          {showApproved ? 'Lihat Antrean' : 'Riwayat'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-[var(--aurora-3)]" />
        </div>
      ) : showApproved ? (
        filteredApproved.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">Belum ada riwayat persetujuan demo.</div>
        ) : (
          <div className="space-y-3">
            {filteredApproved.map((req) => {
              const sc = statusColors[req.status] || statusColors.pending;
              const StatusIcon = sc.icon;
              return (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`glass-panel p-4 border ${sc.border} ${sc.bg}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-white text-sm truncate">{req.company_name}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${sc.bg} ${sc.text}`}>
                          <StatusIcon size={10} /> {req.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">{req.name} &middot; {req.email}</p>
                      {req.tenant_id && (
                        <p className="text-[10px] text-gray-500 mt-1 font-mono">Tenant: {req.tenant_id}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">
          <CheckCircle2 size={40} className="mx-auto mb-3 text-[var(--success)]/50" />
          Semua pengajuan demo sudah diproses. Tidak ada antrean.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => (
            <motion.div
              key={req.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel p-4 border border-[var(--warning)]/30 bg-[var(--warning)]/[0.02]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-base truncate">{req.company_name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{req.name}</p>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1"><Mail size={11} /> {req.email}</span>
                    {req.phone && <span className="flex items-center gap-1"><Phone size={11} /> {req.phone}</span>}
                    <span className="flex items-center gap-1"><Users size={11} /> {req.employee_count || '?'} karyawan</span>
                  </div>

                  <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full bg-[var(--warning)]/10 text-[var(--warning)] text-[9px] font-black uppercase tracking-widest">
                    <Clock size={10} /> Menunggu
                  </span>
                </div>

                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleApprove(req)}
                    disabled={processingId === req.id}
                    className="px-4 py-2 rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/30 text-[var(--success)] hover:bg-[var(--success)]/20 transition-all text-[10px] font-bold tracking-widest uppercase flex items-center gap-2 disabled:opacity-50"
                  >
                    {processingId === req.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                    Setujui
                  </button>
                  <button
                    onClick={() => handleReject(req)}
                    disabled={processingId === req.id}
                    className="px-4 py-2 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)] hover:bg-[var(--danger)]/20 transition-all text-[10px] font-bold tracking-widest uppercase flex items-center gap-2 disabled:opacity-50"
                  >
                    <XCircle size={12} /> Tolak
                  </button>
                </div>
              </div>

              {req.message && (
                <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-1"><MessageSquare size={10} /> Pesan</p>
                  <p className="text-xs text-gray-300 whitespace-pre-wrap">{req.message}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {copiedCode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 px-4 py-3 rounded-xl bg-[var(--success)]/20 border border-[var(--success)]/30 text-[var(--success)] text-xs font-bold shadow-lg backdrop-blur-md z-50"
          >
            Kode aktivasi disalin!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DemoApproval;
