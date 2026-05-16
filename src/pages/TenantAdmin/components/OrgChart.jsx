import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, Users, ChevronDown, ChevronRight, Briefcase, Loader2 } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';

const OrgChart = () => {
  const [projects, setProjects] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [expandedProjects, setExpandedProjects] = useState({});
  const [expandedDivisions, setExpandedDivisions] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const isGod = (() => { try { return sessionStorage.getItem('god_key') === 'DEWA-999'; } catch { return false; } })();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: p } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!p?.tenant_id && !isGod) return;

    let q1 = supabase.from('projects').select('*');
    if (p?.tenant_id) q1 = q1.eq('tenant_id', p.tenant_id);
    q1 = q1.order('name');
    const { data: projs } = await q1;
    setProjects(projs || []);

    let q2 = supabase.from('divisions').select('*');
    if (p?.tenant_id) q2 = q2.eq('tenant_id', p.tenant_id);
    const { data: divs } = await q2;
    setDivisions(divs || []);

    let q3 = supabase.from('profiles')
      .select('id, full_name, nip, position, role, project_id, division_id');
    if (p?.tenant_id) q3 = q3.eq('tenant_id', p.tenant_id);
    q3 = q3.in('role', ['EMPLOYEE', 'SUB_ADMIN', 'TENANT_ADMIN']).order('full_name');
    const { data: emps } = await q3;
    setEmployees(emps || []);
    setLoading(false);
  };

  const toggleProject = (id) => setExpandedProjects(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleDivision = (id) => setExpandedDivisions(prev => ({ ...prev, [id]: !prev[id] }));

  const getDivisionEmployees = (divId) => employees.filter(e => e.division_id === divId);
  const getProjectDivisions = (projId) => divisions.filter(d => d.project_id === projId);
  const getUngroupedEmployees = () => employees.filter(e => !e.project_id && !e.division_id);

  if (loading) return <div className="p-20 text-center"><Loader2 size={32} className="animate-spin mx-auto text-[var(--aurora-3)]" /></div>;

  const totalCounts = { projects: projects.length, divisions: divisions.length, employees: employees.length };

  return (
    <div className="glass-panel p-8">
      <div className="border-b border-white/10 pb-6 mb-8">
        <h2 className="text-2xl font-serif font-bold text-white">Struktur Organisasi</h2>
        <p className="text-sm text-gray-400 mt-1">{totalCounts.projects} proyek • {totalCounts.divisions} divisi • {totalCounts.employees} karyawan</p>
      </div>

      <div className="space-y-4">
        {/* Root: Tenant */}
        <div className="p-5 bg-gradient-to-r from-[var(--aurora-1)]/10 to-[var(--aurora-3)]/10 rounded-2xl border border-[var(--aurora-1)]/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center shadow-lg">
              <Building2 size={24} className="text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">Perusahaan</p>
              <p className="text-[10px] text-gray-400">{totalCounts.projects} Proyek • {totalCounts.divisions} Divisi • {totalCounts.employees} Karyawan</p>
            </div>
          </div>
        </div>

        {/* Tree Connector */}
        <div className="ml-6 pl-6 border-l-2 border-[var(--aurora-3)]/20 space-y-4">
          {projects.map(proj => {
            const isExpanded = expandedProjects[proj.id];
            const projDivs = getProjectDivisions(proj.id);
            const projEmpCount = employees.filter(e => e.project_id === proj.id).length;
            return (
              <div key={proj.id}>
                <button onClick={() => toggleProject(proj.id)} className="w-full flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10 hover:border-[var(--aurora-3)]/30 transition-all text-left group">
                  <div className="w-8 h-8 rounded-lg bg-[var(--aurora-3)]/10 flex items-center justify-center text-[var(--aurora-3)]">
                    <Briefcase size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white group-hover:text-[var(--aurora-3)] transition-colors">{proj.name}</p>
                    <p className="text-[9px] text-gray-500">{proj.code ? `[${proj.code}] ` : ''}{projDivs.length} divisi • {projEmpCount} karyawan</p>
                  </div>
                  {projDivs.length > 0 && (
                    <div className="text-gray-500">{isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</div>
                  )}
                </button>

                {isExpanded && projDivs.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="ml-8 pl-6 border-l-2 border-[var(--aurora-1)]/20 space-y-3 mt-3">
                    {projDivs.map(div => {
                      const isDivExpanded = expandedDivisions[div.id];
                      const divEmps = getDivisionEmployees(div.id);
                      return (
                        <div key={div.id}>
                          <button onClick={() => toggleDivision(div.id)} className="w-full flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/5 hover:border-[var(--aurora-1)]/30 transition-all text-left group">
                            <div className="w-7 h-7 rounded-lg bg-[var(--aurora-1)]/10 flex items-center justify-center text-[var(--aurora-1)]">
                              <Users size={14} />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-bold text-gray-200 group-hover:text-[var(--aurora-1)] transition-colors">{div.name}</p>
                              <p className="text-[8px] text-gray-500">{divEmps.length} karyawan</p>
                            </div>
                            {divEmps.length > 0 && (
                              <div className="text-gray-500">{isDivExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</div>
                            )}
                          </button>

                          {isDivExpanded && divEmps.length > 0 && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ml-8 pl-6 border-l-2 border-[var(--success)]/20 space-y-2 mt-2">
                              {divEmps.map(emp => (
                                <div key={emp.id} className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/5">
                                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center text-[8px] font-bold text-white">{emp.full_name?.charAt(0)}</div>
                                  <div>
                                    <p className="text-xs font-bold text-gray-200">{emp.full_name}</p>
                                    <p className="text-[8px] text-gray-500">{emp.position || 'Staff'} • {emp.nip} • {emp.role}</p>
                                  </div>
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>

        {/* Ungrouped Employees */}
        {getUngroupedEmployees().length > 0 && (
          <div className="p-5 bg-white/5 rounded-2xl border border-dashed border-white/10">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Karyawan Tanpa Divisi ({getUngroupedEmployees().length})</p>
            <div className="flex flex-wrap gap-2">
              {getUngroupedEmployees().map(emp => (
                <span key={emp.id} className="px-3 py-1.5 bg-white/5 rounded-full text-[10px] text-gray-400 border border-white/5">
                  {emp.full_name} {emp.position ? `• ${emp.position}` : ''}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrgChart;
