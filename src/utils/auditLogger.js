import { supabase } from './supabaseClient';

export const logAudit = async (action, details = null) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, tenant_id')
      .eq('auth_id', session.user.id)
      .maybeSingle();

    await supabase.from('audit_logs').insert({
      user_id: session.user.id,
      tenant_id: profile?.tenant_id || null,
      action,
      details: details ? (typeof details === 'object' ? JSON.stringify(details) : details) : null
    });
  } catch (e) {
    console.warn('Audit log failed:', e);
  }
};
