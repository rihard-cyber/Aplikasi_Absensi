import { supabase } from './supabaseClient';
import { showLocalNotification } from './pushNotification';

const NOTIF_TYPES = {
  TICKET_CREATED: 'ticket_created',
  TICKET_ASSIGNED: 'ticket_assigned',
  TICKET_RESOLVED: 'ticket_resolved',
  BOOKING_REQUESTED: 'booking_requested',
  BOOKING_APPROVED: 'booking_approved',
  BOOKING_REJECTED: 'booking_rejected',
  OVERTIME_APPROVED: 'overtime_approved',
  OVERTIME_REJECTED: 'overtime_rejected',
  OVERTIME_REQUESTED: 'overtime_requested',
  INCIDENT_REPORTED: 'incident_reported',
  SHIFT_SWAP_REQUESTED: 'shift_swap_requested',
  SHIFT_SWAP_APPROVED: 'shift_swap_approved',
  SHIFT_SWAP_REJECTED: 'shift_swap_rejected',
  VISITOR_CHECKED_IN: 'visitor_checked_in',
  MISSED_GUARD: 'missed_guard',
  INFO: 'info',
};

const getTenantId = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
  return profile?.tenant_id || null;
};

const getProfileId = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data: profile } = await supabase.from('profiles').select('id').eq('auth_id', session.user.id).maybeSingle();
  return profile?.id || null;
};

const getActorName = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('auth_id', session.user.id).maybeSingle();
  return profile?.full_name || null;
};

export const sendNotification = async ({ userId, type, title, body, link, metadata = {} }) => {
  try {
    const tenantId = await getTenantId();
    const actorName = await getActorName();
    if (!tenantId || !userId) return;

    await supabase.from('notifications').insert({
      user_id: userId,
      tenant_id: tenantId,
      type,
      title,
      body,
      link,
      actor_name: actorName,
      metadata,
    });

    showLocalNotification(title, { body, tag: type });
  } catch (e) {
    console.warn('sendNotification error:', e);
  }
};

export const notifyMultipleUsers = async ({ userIds, type, title, body, link, metadata = {} }) => {
  if (!userIds?.length) return;
  const tenantId = await getTenantId();
  const actorName = await getActorName();
  if (!tenantId) return;

  const rows = userIds.map(userId => ({
    user_id: userId,
    tenant_id: tenantId,
    type,
    title,
    body,
    link,
    actor_name: actorName,
    metadata,
  }));

  await supabase.from('notifications').insert(rows);
  rows.forEach(() => showLocalNotification(title, { body, tag: type }));
};

export const notifyAdminsInTenant = async ({ type, title, body, link, metadata = {} }) => {
  try {
    const tenantId = await getTenantId();
    const actorName = await getActorName();
    if (!tenantId) return;

    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('tenant_id', tenantId)
      .in('role', ['TENANT_ADMIN', 'SUB_ADMIN']);

    if (!admins?.length) return;

    const rows = admins.map(a => ({
      user_id: a.id,
      tenant_id: tenantId,
      type,
      title,
      body,
      link,
      actor_name: actorName,
      metadata,
    }));

    await supabase.from('notifications').insert(rows);
    showLocalNotification(title, { body, tag: type });
  } catch (e) {
    console.warn('notifyAdminsInTenant error:', e);
  }
};

export const markNotifAsRead = async (notifId) => {
  await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
};

export const markAllAsRead = async () => {
  const pid = await getProfileId();
  if (!pid) return;
  await supabase.from('notifications').update({ is_read: true }).eq('user_id', pid).eq('is_read', false);
};

export const fetchNotifications = async (limit = 50) => {
  const pid = await getProfileId();
  if (!pid) return [];
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', pid)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
};

export const getUnreadCount = async () => {
  const pid = await getProfileId();
  if (!pid) return 0;
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', pid)
    .eq('is_read', false);
  return count || 0;
};

export { NOTIF_TYPES };
