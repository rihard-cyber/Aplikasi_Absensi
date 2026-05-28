import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import SecureExportButton from './SecureExportButton';
import { Loader2, ShieldCheck, Lock } from 'lucide-react';

/** @type {(s: string) => string} Passthrough i18n - app is monolingual Indonesian */
const t = (s) => s;

const HRISExportWrapper = ({ className, tenantId: propTenantId, projectId: propProjectId, divisionId: propDivisionId, label: propLabel }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authInfo, setAuthInfo] = useState({ role: 'EMPLOYEE', scope: 'employee', scopeId: null, label: '' });

  // Manual scope: only use passed props if at least one specific value (not 'all')
  const hasManualFilter = (propTenantId && propTenantId !== 'all') || 
                          (propProjectId && propProjectId !== 'all') || 
                          (propDivisionId && propDivisionId !== 'all');

  useEffect(() => {
    resolveAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propTenantId, propProjectId, propDivisionId]);

  const resolveAuth = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setAuthInfo({ role: 'EMPLOYEE', scope: 'employee', scopeId: null, label: t('Tidak ada akses') });
        setData([]);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles').select('id, role, tenant_id, project_id, division_id, tenants:tenant_id(name)')
        .eq('auth_id', session.user.id).maybeSingle();

      if (!profile) {
        setAuthInfo({ role: 'EMPLOYEE', scope: 'employee', scopeId: null, label: t('Tidak ada akses') });
        setData([]);
        return;
      }

      const role = profile.role?.toUpperCase();
      const finalDiv = propDivisionId && propDivisionId !== 'all' ? propDivisionId : null;
      const finalProj = propProjectId && propProjectId !== 'all' ? propProjectId : null;
      const finalTenant = propTenantId && propTenantId !== 'all' ? propTenantId : null;

      if (role === 'SUPER_ADMIN') {
        const scope = finalDiv ? 'division' : finalProj ? 'project' : finalTenant ? 'tenant' : 'superadmin';
        const scopeId = finalDiv || finalProj || finalTenant || null;
        setAuthInfo({ role, scope, scopeId, label: hasManualFilter ? t('Filter Manual') : t('Semua Tenant') });
        await fetchData(scope, scopeId);
      } else if (role === 'TENANT_ADMIN') {
        if (finalTenant && finalTenant !== profile.tenant_id) throw new Error('Scope tenant tidak sesuai profil admin.');
        let scope = 'tenant';
        let scopeId = profile.tenant_id;
        if (finalProj) {
          const { data: project } = await supabase.from('projects').select('id').eq('id', finalProj).eq('tenant_id', profile.tenant_id).maybeSingle();
          if (!project) throw new Error('Project berada di luar tenant Anda.');
          scope = 'project';
          scopeId = finalProj;
        }
        if (finalDiv) {
          const { data: division } = await supabase.from('divisions').select('id').eq('id', finalDiv).eq('tenant_id', profile.tenant_id).maybeSingle();
          if (!division) throw new Error('Divisi berada di luar tenant Anda.');
          scope = 'division';
          scopeId = finalDiv;
        }
        setAuthInfo({ role, scope, scopeId, label: profile.tenants?.name || t('Tenant') });
        await fetchData(scope, scopeId);
      } else if (role === 'SUB_ADMIN' && profile.project_id) {
        if (finalTenant && finalTenant !== profile.tenant_id) throw new Error('Scope tenant tidak sesuai profil sub-admin.');
        if (finalProj && finalProj !== profile.project_id) throw new Error('Project berada di luar otoritas Anda.');
        let scope = 'project';
        let scopeId = profile.project_id;
        if (finalDiv) {
          const { data: division } = await supabase.from('divisions').select('id').eq('id', finalDiv).eq('project_id', profile.project_id).maybeSingle();
          if (!division) throw new Error('Divisi berada di luar project Anda.');
          scope = 'division';
          scopeId = finalDiv;
        }
        const { data: proj } = await supabase.from('projects').select('name').eq('id', profile.project_id).maybeSingle();
        setAuthInfo({ role, scope, scopeId, label: proj?.name || t('Project') });
        await fetchData(scope, scopeId);
      } else {
        setAuthInfo({ role: role || 'EMPLOYEE', scope: 'employee', scopeId: null, label: t('Tidak ada akses') });
        setData([]);
      }
    } catch (e) {
      console.error('Auth resolve error:', e);
      setAuthInfo({ role: 'EMPLOYEE', scope: 'employee', scopeId: null, label: t('Tidak ada akses') });
      setData([]);
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
      <Loader2 size={16} className="animate-spin" /> {t('Memeriksa Otorisasi...')}
    </div>;
  }

  // EMPLOYEE: gak punya akses download
  if (authInfo.scope === 'employee') {
    return (
      <div className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-500/5 text-gray-600 border border-gray-500/10 text-xs cursor-not-allowed ${className}`}
        title={t('Hanya Admin yang bisa mengunduh data HRIS')}>
        <Lock size={14} /> {t('Tidak Ada Akses Unduh')}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-1">
        {authInfo.scope === 'superadmin' && <ShieldCheck size={12} className="text-[var(--warning)]" />}
        <span className="text-[8px] text-gray-600 uppercase tracking-widest">
          {authInfo.label} ({data.length} {t('pegawai')})
          {!data.length && <span className="text-[var(--warning)] ml-1">{t('- kosong')}</span>}
        </span>
      </div>
      <SecureExportButton
        data={data}
        filename={`Data_HRIS_${authInfo.scope}`}
        label={propLabel || (data.length ? t(`Unduh Database HRIS (${data.length})`) : t('Unduh Database HRIS (0)'))}
        className={className}
        scope={authInfo.scope}
        scopeId={authInfo.scopeId}
        canExport={['SUPER_ADMIN', 'TENANT_ADMIN', 'SUB_ADMIN'].includes(authInfo.role)}
        role={authInfo.role}
      />
      {!data.length && (
        <p className="text-[8px] text-gray-600 mt-1 italic">{t('Belum ada data pegawai untuk diunduh. Isi data pegawai terlebih dahulu.')}</p>
      )}
    </div>
  );
};

export default HRISExportWrapper;
