/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, ShieldCheck } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import LoadingSkeleton from '../../../components/LoadingSkeleton';

const actionColor = (action) => {
  if (!action) return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  const upper = action.toUpperCase();
  if (upper.includes('DELETE') || upper.includes('DEACTIVATE') || upper.includes('REJECT')) 
    return 'bg-[var(--danger)]/20 text-[var(--danger)] border-[var(--danger)]/50';
  if (upper.includes('UPDATE') || upper.includes('EDIT') || upper.includes('CHANGE'))
    return 'bg-[var(--warning)]/20 text-[var(--warning)] border-[var(--warning)]/50';
  if (upper.includes('CREATE') || upper.includes('ACTIVATE') || upper.includes('APPROVE') || upper.includes('VERIFY'))
    return 'bg-[var(--success)]/20 text-[var(--success)] border-[var(--success)]/50';
  return 'bg-[var(--aurora-3)]/10 text-[var(--aurora-3)] border-[var(--aurora-3)]/30';
};

const formatDate = (ts) => {
  if (!ts) return '-';
  const d = new Date(ts);
  return d.toLocaleString('id-ID', { 
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
};

const AuditTrailView = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase.from('profiles')
        .select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
      if (!profile?.tenant_id && !isGod) return;

      let q = supabase
        .from('audit_logs')
        .select('id, action, details, created_at, user_id, tenant_id');
      if (profile?.tenant_id) q = q.eq('tenant_id', profile.tenant_id);
      q = q.order('created_at', { ascending: false }).limit(100);
      const { data, error } = await q;

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(l => l.user_id).filter(Boolean))];
        const { data: users } = await supabase
          .from('profiles')
          .select('id, full_name, nip')
          .in('id', userIds);

        const userMap = {};
        if (users) users.forEach(u => {
          userMap[u.id] = u.full_name + (u.nip ? ` (NIP: ${u.nip})` : '');
        });

        const formatted = data.map(l => ({
          id: l.id?.substring(0, 8) || '-',
          date: formatDate(l.created_at),
          user: userMap[l.user_id] || 'Sistem',
          action: l.action || 'UNKNOWN',
          details: l.details || '-'
        }));
        setLogs(formatted);
      } else {
        setLogs([]);
      }
    } catch (e) {
      console.error("Gagal menarik audit trail", e);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter(log =>
    searchQuery === '' ||
    log.user?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.details?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="glass-panel p-8">
      <div className="border-b border-white/10 pb-6 mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-serif font-bold text-white flex items-center gap-3 tracking-wide">
            <ShieldCheck size={28} className="text-[var(--aurora-3)] drop-shadow-[0_0_10px_rgba(0,201,255,0.8)]" /> Jejak Audit Sistem
          </h2>
          <p className="text-sm text-gray-400 mt-2 font-sans tracking-wide">Catatan permanen dari modifikasi data penting.</p>
        </div>
      </div>

      <div className="flex gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan Pengguna, Aksi, atau Detail..."
            className="w-full pl-12 pr-4 py-3 bg-[#1A1C23] border border-white/10 rounded-xl text-white light-bloom-input focus:border-[var(--aurora-3)] outline-none"
          />
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-300 hover:bg-white/10 transition-colors">
          <Filter size={18} className="text-[var(--aurora-1)]" /> Filter Tanggal
        </button>
      </div>

      <div className="overflow-x-auto border border-white/10 rounded-2xl bg-[#0B0C10]/50 backdrop-blur-md">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-gray-400 border-b border-white/10 uppercase tracking-widest text-xs">
            <tr>
              <th className="p-5 font-semibold">Log ID</th>
              <th className="p-5 font-semibold">Stempel Waktu</th>
              <th className="p-5 font-semibold">Aktor</th>
              <th className="p-5 font-semibold">Aksi</th>
              <th className="p-5 font-semibold">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-10">
                  <div className="flex justify-center"><LoadingSkeleton type="table" /></div>
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-10 text-center text-gray-500">
                  {searchQuery ? 'Tidak ada hasil yang cocok.' : 'Belum ada data audit.'}
                </td>
              </tr>
            ) : (
              filteredLogs.map(log => (
                <tr key={log.id + log.date} className="hover:bg-white/5 transition-colors group">
                  <td className="p-5 font-mono text-xs text-gray-500 group-hover:text-[var(--aurora-3)] transition-colors">
                    #{log.id}
                  </td>
                  <td className="p-5 text-gray-400 whitespace-nowrap">{log.date}</td>
                  <td className="p-5 font-medium text-gray-200">{log.user}</td>
                  <td className="p-5">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider border ${actionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="p-5 text-gray-400 max-w-xs truncate">{log.details}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditTrailView;
