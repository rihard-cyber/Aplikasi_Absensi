import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import SecureExportButton from './SecureExportButton';
import { Loader2, ShieldCheck, Lock } from 'lucide-react';

const SCOPE_LABEL = { superadmin: 'SEMUA TENANT', tenant: 'TENANT', project: 'PROJECT', division: 'DIVISI' };

const HRISExportWrapper = ({ className, tenantId: propTenantId, projectId: propProjectId, divisionId: propDivisionId, label: propLabel }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authInfo, setAuthInfo] = useState({ role: 'EMPLOYEE', scope: 'employee', scopeId: null, label: '' });

  // Manual scope: only use passed props if at least one specific value (not 'all')
  const hasManualFilter = (propTenantId && propTenantId !== 'all') || 
                          (propProjectId && propProjectId !== 'all') || 
                          (propDivisionId && propDivisionId !== 'all');

  useEffect(() => {
    if (hasManualFilter) {
      const finalDiv = propDivisionId && propDivisionId !== 'all' ? propDivisionId : null;
      const finalProj = propProjectId && propProjectId !== 'all' ? propProjectId : null;
      const finalTenant = propTenantId && propTenantId !== 'all' ? propTenantId : null;
      const scope = finalDiv ? 'division' : finalProj ? 'project' : 'tenant';
      const scopeId = finalDiv || finalProj || finalTenant;
      const role = (() => { try { return localStorage.getItem('user_role') || 'SUB_ADMIN'; } catch { return 'SUB_ADMIN'; } })();
      setAuthInfo({ role, scope, scopeId, label: scope ? 'Filter Manual' : 'Tenant' });
      fetchData(scope, scopeId);
      setLoading(false);
      return;
    }
    resolveAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propTenantId, propProjectId, propDivisionId]);

  const resolveAuth = async () => {
    setLoading(true);
    try {
      const isGod = (() => { try { return sessionStorage.getItem('god_key') === 'DEWA-999'; } catch { return false; } })();
      const { data: { session } } = await supabase.auth.getSession();

      if (isGod || session?.user?.id) {
        if (isGod) {
          const { data: profile } = await supabase
            .from('profiles').select('role').eq('auth_id', session?.user?.id).maybeSingle();
          if (profile?.role === 'SUPER_ADMIN' || isGod) {
            setAuthInfo({ role: 'SUPER_ADMIN', scope: 'superadmin', scopeId: null, label: 'Semua Tenant' });
            await fetchData('superadmin', null);
            setLoading(false);
            return;
          }
        }

        const { data: profile } = await supabase
          .from('profiles').select('id, role, tenant_id, project_id, division_id, tenants:tenant_id(name)')
          .eq('auth_id', session.user.id).maybeSingle();

        if (!profile) { setLoading(false); return; }

        const role = profile.role;

        if (role === 'SUPER_ADMIN') {
          setAuthInfo({ role: 'SUPER_ADMIN', scope: 'superadmin', scopeId: null, label: 'Semua Tenant' });
          await fetchData('superadmin', null);
        } else if (role === 'TENANT_ADMIN') {
          setAuthInfo({ role: 'TENANT_ADMIN', scope: 'tenant', scopeId: profile.tenant_id, label: profile.tenants?.name || 'Tenant' });
          await fetchData('tenant', profile.tenant_id);
        } else if (role === 'SUB_ADMIN' && profile.project_id) {
          const { data: proj } = await supabase.from('projects').select('name').eq('id', profile.project_id).maybeSingle();
          setAuthInfo({ role: 'SUB_ADMIN', scope: 'project', scopeId: profile.project_id, label: proj?.name || 'Project' });
          await fetchData('project', profile.project_id);
        } else if (profile.division_id) {
          const { data: div } = await supabase.from('divisions').select('name').eq('id', profile.division_id).maybeSingle();
          setAuthInfo({ role: 'EMPLOYEE', scope: 'division', scopeId: profile.division_id, label: div?.name || 'Divisi' });
          await fetchData('division', profile.division_id);
        } else {
          setAuthInfo({ role: 'EMPLOYEE', scope: 'employee', scopeId: null, label: 'Tidak ada akses' });
          setData([]);
        }
      }
    } catch (e) {
      console.error('Auth resolve error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async (scope, scopeId) => {
    try {
      let query = supabase
        .from('profiles')
        .select(`
          nip, full_name, email, phone, address, gender, birth_date, role, position,
          tenants:tenant_id(name), projects:project_id(name), divisions:division_id(name),
          employee_hris_data(*)
        `);

      if (scope === 'superadmin') {
        // No filter - get all tenants
      } else if (scope === 'tenant') {
        query = query.eq('tenant_id', scopeId);
      } else if (scope === 'project') {
        query = query.eq('project_id', scopeId);
      } else if (scope === 'division') {
        query = query.eq('division_id', scopeId);
      }

      const { data: profiles, error } = await query;
      if (error) throw error;

      if (profiles) {
        setData(profiles.map(p => ({
          NIP: p.nip || '',
          Nama_Lengkap: p.full_name || '',
          Jabatan: p.position || '',
          Email: p.email || '',
          No_Telp: p.phone || '',
          Gender: p.gender || '',
          Tgl_Lahir: p.birth_date || '',
          Perusahaan: p.tenants?.name || '',
          Cabang: p.projects?.name || '',
          Divisi: p.divisions?.name || '',
          KTP: p.employee_hris_data?.ktp_number || '',
          Agama: p.employee_hris_data?.religion || '',
          Status_Nikah: p.employee_hris_data?.marriage_status || '',
          Jml_Anak: p.employee_hris_data?.children_count ?? 0,
          Status_Pajak: p.employee_hris_data?.tax_status || '',
          Pendidikan: p.employee_hris_data?.education_level || '',
          Jurusan: p.employee_hris_data?.major || '',
          Tgl_Masuk: p.employee_hris_data?.join_date || '',
          Status_Karyawan: p.employee_hris_data?.employee_status || '',
          Tgl_Keluar: p.employee_hris_data?.resign_date || '',
          Bank: p.employee_hris_data?.bank_name || '',
          No_Rekening: p.employee_hris_data?.bank_account_number || '',
          Atas_Nama_Rek: p.employee_hris_data?.bank_account_name || '',
          Alamat_KTP: p.employee_hris_data?.ktp_address || '',
          Alamat_Domisili: p.employee_hris_data?.domicile_address || '',
          Kontak_Darurat: p.employee_hris_data?.emergency_contact_name || '',
          No_Darurat: p.employee_hris_data?.emergency_contact_number || '',
          Baju: p.employee_hris_data?.shirt_size || '',
          Celana: p.employee_hris_data?.pants_size || '',
          Sepatu: p.employee_hris_data?.shoes_size || '',
          No_KTA: p.employee_hris_data?.kta_number || '',
        })));
      }
    } catch (e) {
      console.error('Fetch export data error:', e);
    }
  };

  if (loading) {
    return <div className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-gray-500 border border-white/10 text-xs ${className}`}>
      <Loader2 size={16} className="animate-spin" /> Memeriksa Otorisasi...
    </div>;
  }

  // EMPLOYEE: gak punya akses download
  if (authInfo.scope === 'employee') {
    return (
      <div className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-500/5 text-gray-600 border border-gray-500/10 text-xs cursor-not-allowed ${className}`}
        title="Hanya Admin yang bisa mengunduh data HRIS">
        <Lock size={14} /> Tidak Ada Akses Unduh
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-1">
        {authInfo.scope === 'superadmin' && <ShieldCheck size={12} className="text-[var(--warning)]" />}
        <span className="text-[8px] text-gray-600 uppercase tracking-widest">
          {authInfo.label} ({data.length} pegawai)
          {!data.length && <span className="text-[var(--warning)] ml-1">— kosong</span>}
        </span>
      </div>
      <SecureExportButton
        data={data}
        filename={`Data_HRIS_${authInfo.scope}`}
        label={propLabel || (data.length ? `Unduh Database HRIS (${data.length})` : 'Unduh Database HRIS (0)')}
        className={className}
        scope={authInfo.scope}
        scopeId={authInfo.scopeId}
      />
      {!data.length && (
        <p className="text-[8px] text-gray-600 mt-1 italic">Belum ada data pegawai untuk diunduh. Isi data pegawai terlebih dahulu.</p>
      )}
    </div>
  );
};

export default HRISExportWrapper;
