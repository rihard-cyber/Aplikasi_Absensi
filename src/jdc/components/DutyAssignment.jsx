import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Shield, MapPin, Send, 
  Calendar, Clock, CheckCircle2, 
  AlertCircle, Loader2, RefreshCw,
  Search, UserPlus, Trash2
} from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { useToast } from '../../components/Toast';
import { logAudit } from '../../utils/auditLogger';
import { NOTIF_TYPES } from '../../utils/notificationEngine';

const DutyAssignment = () => {
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [guards, setGuards] = useState([]);
  const [posts, setPosts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedRegu, setSelectedRegu] = useState('Regu A');
  const [selectedShift, setSelectedShift] = useState('Pagi');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchGuard, setSearchGuard] = useState('');
  const [tenantId, setTenantId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const toast = useToast();

  useEffect(() => { init(); }, []);
  useEffect(() => { fetchAssignments(); }, [selectedDate, selectedShift, selectedRegu]);

  const init = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data: profile } = await supabase.from('profiles')
        .select('id, tenant_id, full_name, role')
        .eq('auth_id', session.user.id)
        .single();
      
      if (!profile) return;
      setTenantId(profile.tenant_id);
      setCurrentUser(profile);

      // Fetch Guards
      const { data: guardsData } = await supabase.from('profiles')
        .select('id, full_name, nip, role, division_id')
        .eq('tenant_id', profile.tenant_id)
        .or('role.ilike.security,role.ilike.satpam');
      
      // Fetch Posts
      const { data: postsData } = await supabase.from('pos_list')
        .select('*')
        .eq('tenant_id', profile.tenant_id);

      setGuards(guardsData || []);
      setPosts(postsData || []);
    } catch (e) {
      toast('Gagal memuat data: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    if (!tenantId) return;
    try {
      const { data } = await supabase.from('guard_post_assignments')
        .select('*, profiles:user_id(full_name, nip), pos:pos_id(titik, kode)')
        .eq('tenant_id', tenantId)
        .eq('date', selectedDate)
        .eq('shift', selectedShift)
        .eq('regu', selectedRegu);
      
      setAssignments(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssign = async (guardId, posId) => {
    if (!tenantId) return;
    
    // Check if guard already assigned
    if (assignments.some(a => a.user_id === guardId)) {
      toast('Petugas sudah memiliki plotingan di shift ini', 'warning');
      return;
    }

    try {
      const { error } = await supabase.from('guard_post_assignments').insert({
        tenant_id: tenantId,
        assigned_by: currentUser.id,
        user_id: guardId,
        pos_id: posId,
        date: selectedDate,
        shift: selectedShift,
        regu: selectedRegu,
        status: 'PENDING'
      });

      if (error) throw error;
      toast('Plotingan ditambahkan', 'success');
      fetchAssignments();
    } catch (e) {
      toast('Gagal plotting: ' + e.message, 'error');
    }
  };

  const handleRemove = async (id) => {
    try {
      await supabase.from('guard_post_assignments').delete().eq('id', id);
      toast('Plotingan dihapus', 'success');
      fetchAssignments();
    } catch (e) {
      toast('Gagal menghapus', 'error');
    }
  };

  const handlePublish = async () => {
    if (assignments.length === 0) return;
    setPublishing(true);
    try {
      // 1. Mark as notified in DB
      const { error } = await supabase.from('guard_post_assignments')
        .update({ notified: true })
        .in('id', assignments.map(a => a.id));
      
      if (error) throw error;

      // 2. Trigger Push Notifications via Notification Engine
      // In a real scenario, this would loop through and send to each user
      // For now, we simulate the action
      for (const a of assignments) {
        if (!a.notified) {
          // This would ideally be a cloud function or backend trigger
          console.log(`Sending notif to ${a.profiles?.full_name} for post ${a.pos?.titik}`);
        }
      }

      logAudit('PUBLISH_DUTY_ASSIGNMENTS', { count: assignments.length, shift: selectedShift, regu: selectedRegu });
      toast(`Berhasil mempublikasikan ${assignments.length} plotingan regu!`, 'success');
      fetchAssignments();
    } catch (e) {
      toast('Gagal publikasi: ' + e.message, 'error');
    } finally {
      setPublishing(false);
    }
  };

  const filteredGuards = useMemo(() => {
    return guards.filter(g => 
      g.full_name?.toLowerCase().includes(searchGuard.toLowerCase()) ||
      g.nip?.includes(searchGuard)
    );
  }, [guards, searchGuard]);

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="animate-spin text-[var(--aurora-3)]" /></div>;

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 border border-white/10 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative z-10">
          <h2 className="text-xl font-serif font-bold text-white mb-1">Daily Plotting & Tasking</h2>
          <p className="text-xs text-gray-400">Atur penempatan anggota regu di pos jaga setiap harinya.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex items-center gap-2">
            <Calendar size={14} className="text-[var(--aurora-3)]" />
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-transparent text-xs text-white outline-none" />
          </div>
          <select value={selectedShift} onChange={e => setSelectedShift(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none">
            <option value="Pagi">Pagi</option>
            <option value="Siang">Siang</option>
            <option value="Malam">Malam</option>
          </select>
          <select value={selectedRegu} onChange={e => setSelectedRegu(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none">
            <option value="Regu A">Regu A</option>
            <option value="Regu B">Regu B</option>
            <option value="Regu C">Regu C</option>
            <option value="Regu D">Regu D</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Guard List */}
        <div className="glass-panel p-6 border border-white/10 flex flex-col gap-4 h-[600px]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Users size={16} /> Anggota Keamanan</h3>
            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-gray-400">{filteredGuards.length}</span>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Cari anggota..." 
              value={searchGuard}
              onChange={e => setSearchGuard(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white outline-none focus:border-[var(--aurora-3)] transition-all"
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {filteredGuards.map(g => {
              const isAssigned = assignments.some(a => a.user_id === g.id);
              return (
                <div key={g.id} className={`p-3 rounded-xl border transition-all ${isAssigned ? 'bg-[var(--success)]/5 border-[var(--success)]/20' : 'bg-white/[0.02] border-white/5'}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-white">{g.full_name}</p>
                      <p className="text-[10px] text-gray-500">NIP: {g.nip || '-'}</p>
                    </div>
                    {isAssigned ? (
                      <CheckCircle2 size={14} className="text-[var(--success)]" />
                    ) : (
                      <div className="relative group">
                        <button className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400"><UserPlus size={14} /></button>
                        <div className="absolute right-0 bottom-0 mt-1 w-48 bg-[#1A1C23] border border-white/10 rounded-xl shadow-2xl z-20 hidden group-hover:block max-h-48 overflow-y-auto">
                          <p className="px-3 py-2 text-[10px] font-black uppercase text-gray-500 border-b border-white/5">Plot ke Pos:</p>
                          {posts.map(p => (
                            <button 
                              key={p.supabase_id} 
                              onClick={() => handleAssign(g.id, p.supabase_id)}
                              className="w-full text-left px-3 py-2 text-[10px] text-gray-300 hover:bg-[var(--aurora-3)]/20 hover:text-white transition-colors"
                            >
                              {p.kode ? `[${p.kode}] ` : ''}{p.titik}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center: Current Assignments */}
        <div className="lg:col-span-2 glass-panel p-6 border border-white/10 flex flex-col gap-4 h-[600px]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><MapPin size={16} /> Plotingan Berjalan ({selectedRegu})</h3>
            <button 
              onClick={handlePublish}
              disabled={publishing || assignments.length === 0}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-30"
            >
              {publishing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Publish & Kirim Notif
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignments.map(a => (
                <div key={a.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 relative group">
                  <button 
                    onClick={() => handleRemove(a.id)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg text-gray-600 hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--aurora-3)]/10 text-[var(--aurora-3)] flex items-center justify-center shrink-0">
                      <Shield size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">{a.pos?.kode || 'POST'}</p>
                      <p className="text-sm font-bold text-white mb-2">{a.pos?.titik}</p>
                      <div className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-black/40 border border-white/5 w-fit">
                        <Users size={12} className="text-gray-500" />
                        <span className="text-xs text-gray-300 font-medium">{a.profiles?.full_name}</span>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${a.notified ? 'bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20' : 'bg-gray-500/10 text-gray-400 border border-white/5'}`}>
                          {a.notified ? 'TERKIRIM' : 'DRAFT'}
                        </span>
                        <span className="text-[8px] text-gray-600 italic">Assign by: {currentUser.id === a.assigned_by ? 'Anda' : 'Admin'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {assignments.length === 0 && (
                <div className="col-span-full h-full flex flex-col items-center justify-center text-center p-12 text-gray-500 border-2 border-dashed border-white/5 rounded-3xl">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <MapPin size={32} />
                  </div>
                  <p className="text-sm font-bold text-gray-400">Belum ada plotingan personil</p>
                  <p className="text-[10px]">Pilih anggota dari daftar kiri untuk ditempatkan ke pos jaga.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DutyAssignment;
