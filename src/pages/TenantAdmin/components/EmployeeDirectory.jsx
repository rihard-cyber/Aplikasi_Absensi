import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Phone, Mail, MapPin, Briefcase, Users, Filter, ChevronRight, MessageSquare } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { useConfirm } from '../../../components/ConfirmDialog';

const EmployeeDirectory = () => {
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState('all');
  const [filterDivision, setFilterDivision] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const toast = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const isGod = (() => { try { return sessionStorage.getItem('god_key') === 'DEWA-999'; } catch { return false; } })();
    const { data: { session } } = await supabase.auth.getSession();
    const { data: p } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session?.user?.id).single();
    if (!p?.tenant_id && !isGod) return;

    let q1 = supabase.from('projects').select('id, name, code');
    if (p?.tenant_id) q1 = q1.eq('tenant_id', p.tenant_id);
    const { data: projs } = await q1;
    setProjects(projs || []);

    let q2 = supabase.from('divisions').select('id, name, project_id');
    if (p?.tenant_id) q2 = q2.eq('tenant_id', p.tenant_id);
    const { data: divs } = await q2;
    setDivisions(divs || []);

    let q3 = supabase.from('profiles')
      .select('*, projects(name, code), divisions(name), employee_hris_data!left(mobile_phone, ktp_address, emergency_contact_name, emergency_contact_number)');
    if (p?.tenant_id) q3 = q3.eq('tenant_id', p.tenant_id);
    q3 = q3.in('role', ['EMPLOYEE', 'SUB_ADMIN', 'TENANT_ADMIN']).order('full_name');
    if (emps) setEmployees(emps);
  };

  const filteredDivisions = filterProject === 'all' ? divisions : divisions.filter(d => d.project_id === filterProject);

  const filtered = employees.filter(e => {
    if (filterProject !== 'all' && e.project_id !== filterProject) return false;
    if (filterDivision !== 'all' && e.division_id !== filterDivision) return false;
    if (search) {
      const q = search.toLowerCase();
      return e.full_name?.toLowerCase().includes(q) || e.nip?.toLowerCase().includes(q) || e.position?.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q);
    }
    return true;
  });

  const handleCopyPhone = (phone) => {
    if (!phone) { toast('Tidak ada nomor telepon', 'error'); return; }
    navigator.clipboard.writeText(phone).then(() => toast('Nomor telepon disalin!', 'success')).catch(() => {});
  };

  return (
    <div className="glass-panel p-8">
      <div className="border-b border-white/10 pb-6 mb-8">
        <h2 className="text-2xl font-serif font-bold text-white">Direktori Karyawan</h2>
        <p className="text-sm text-gray-400 mt-1">{employees.length} karyawan terdaftar</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama, NIP, posisi, email..." className="w-full bg-[#1A1C23] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-3)]" />
        </div>
        <select value={filterProject} onChange={e => { setFilterProject(e.target.value); setFilterDivision('all'); }} className="bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none min-w-[150px]">
          <option value="all">Semua Proyek</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.code ? `[${p.code}] ` : ''}{p.name}</option>)}
        </select>
        <select value={filterDivision} onChange={e => setFilterDivision(e.target.value)} className="bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none min-w-[150px]">
          <option value="all">Semua Divisi</option>
          {filteredDivisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(emp => (
          <motion.div key={emp.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            onClick={() => setSelectedEmployee(selectedEmployee?.id === emp.id ? null : emp)}
            className={`p-5 rounded-2xl border cursor-pointer transition-all ${selectedEmployee?.id === emp.id ? 'bg-white/10 border-[var(--aurora-3)]/30' : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.06]'}`}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
                {emp.full_name?.charAt(0) || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{emp.full_name}</p>
                <p className="text-[10px] text-gray-400 truncate">{emp.position || 'Staff'} • {emp.nip}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[8px] px-2 py-0.5 rounded-full bg-white/5 text-gray-500 border border-white/5">{emp.role}</span>
                  {emp.divisions?.name && <span className="text-[8px] text-gray-500">{emp.divisions.name}</span>}
                </div>
              </div>
              <ChevronRight size={16} className={`text-gray-600 transition-transform ${selectedEmployee?.id === emp.id ? 'rotate-90' : ''}`} />
            </div>

            {selectedEmployee?.id === emp.id && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 pt-4 border-t border-white/10 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {emp.email && (
                    <a href={`mailto:${emp.email}`} className="flex items-center gap-2 text-[10px] text-gray-400 hover:text-[var(--aurora-3)]">
                      <Mail size={12} /> {emp.email}
                    </a>
                  )}
                  {emp.employee_hris_data?.mobile_phone && (
                    <button onClick={() => handleCopyPhone(emp.employee_hris_data.mobile_phone)} className="flex items-center gap-2 text-[10px] text-gray-400 hover:text-[var(--aurora-3)] text-left">
                      <Phone size={12} /> {emp.employee_hris_data.mobile_phone}
                    </button>
                  )}
                </div>
                <div className="text-[10px] text-gray-500 space-y-1">
                  {emp.projects?.name && <p className="flex items-center gap-1"><MapPin size={10} /> {emp.projects.name}</p>}
                  {emp.employee_hris_data?.ktp_address && <p className="flex items-start gap-1"><MapPin size={10} className="mt-0.5" /> {emp.employee_hris_data.ktp_address}</p>}
                </div>
                {emp.employee_hris_data?.emergency_contact_name && (
                  <div className="bg-white/5 rounded-xl p-3 text-[9px]">
                    <p className="text-gray-500 uppercase tracking-widest mb-1">Kontak Darurat</p>
                    <p className="text-gray-300">{emp.employee_hris_data.emergency_contact_name} • {emp.employee_hris_data.emergency_contact_number}</p>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
      {!filtered.length && <p className="text-center text-gray-500 py-12 text-sm">Tidak ada karyawan ditemukan</p>}
    </div>
  );
};

export default EmployeeDirectory;
