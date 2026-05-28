/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Webhook, Plus, Trash2, Play, CheckCircle2, XCircle, Clock,
  Loader2, Copy, Eye, EyeOff, RefreshCw, Zap, Info, Activity
} from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { useConfirm } from '../../../components/ConfirmDialog';

/**
 * WebhookSettings — Webhook & Integrasi Eksternal
 * 
 * Memungkinkan admin mengirim notifikasi HTTP POST ke sistem eksternal
 * (Slack, Zapier, n8n, Make, Google Sheets, dll) saat event HR terjadi.
 * 
 * Tabel Supabase yang dibutuhkan:
 * 
 * CREATE TABLE tenant_webhooks (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
 *   name TEXT NOT NULL,
 *   url TEXT NOT NULL,
 *   events TEXT[] NOT NULL DEFAULT '{}',
 *   secret TEXT,
 *   is_active BOOLEAN DEFAULT TRUE,
 *   last_triggered_at TIMESTAMPTZ,
 *   last_status INTEGER,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * ALTER TABLE tenant_webhooks ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Tenant admin manage webhooks" ON tenant_webhooks FOR ALL
 *   USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE auth_id = auth.uid() AND role IN ('TENANT_ADMIN','SUB_ADMIN')));
 * 
 * CREATE TABLE webhook_logs (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   webhook_id UUID REFERENCES tenant_webhooks(id) ON DELETE CASCADE,
 *   event TEXT,
 *   payload JSONB,
 *   response_status INTEGER,
 *   response_body TEXT,
 *   triggered_at TIMESTAMPTZ DEFAULT NOW()
 * );
 */

const AVAILABLE_EVENTS = [
  { id: 'attendance.checkin', label: 'Check-in Absensi', icon: '🟢', desc: 'Saat karyawan check-in' },
  { id: 'attendance.checkout', label: 'Check-out Absensi', icon: '🔴', desc: 'Saat karyawan check-out' },
  { id: 'attendance.late', label: 'Keterlambatan', icon: '⏰', desc: 'Saat karyawan terlambat' },
  { id: 'leave.submitted', label: 'Pengajuan Cuti', icon: '📅', desc: 'Saat karyawan submit cuti' },
  { id: 'leave.approved', label: 'Cuti Disetujui', icon: '✅', desc: 'Saat cuti disetujui atasan' },
  { id: 'leave.rejected', label: 'Cuti Ditolak', icon: '❌', desc: 'Saat cuti ditolak' },
  { id: 'reimbursement.submitted', label: 'Pengajuan Reimbursement', icon: '💳', desc: 'Saat karyawan submit klaim' },
  { id: 'payroll.processed', label: 'Proses Penggajian', icon: '💰', desc: 'Saat payroll diproses' },
  { id: 'employee.created', label: 'Karyawan Baru', icon: '👤', desc: 'Saat karyawan baru dibuat' },
  { id: 'employee.offboarded', label: 'Karyawan Resign', icon: '🚪', desc: 'Saat karyawan offboarding' },
];

const SLACK_TEMPLATE = {
  text: '{{emoji}} *{{event_name}}*',
  blocks: [{ type: 'section', text: { type: 'mrkdwn', text: '{{message}}' } }]
};

const StatusBadge = ({ status }) => {
  if (!status) return null;
  const ok = status >= 200 && status < 300;
  return (
    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${ok ? 'bg-[var(--success)]/20 text-[var(--success)]' : 'bg-[var(--danger)]/20 text-[var(--danger)]'}`}>
      {status} {ok ? '✓' : '✗'}
    </span>
  );
};

const WebhookSettings = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const [webhooks, setWebhooks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [showSecrets, setShowSecrets] = useState({});
  const [activeTab, setActiveTab] = useState('list'); // list | add | logs

  // New webhook form state
  const [form, setForm] = useState({ name: '', url: '', events: [], secret: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
      if (!profile?.tenant_id) { setLoading(false); return; }
      setTenantId(profile.tenant_id);

      const { data: wh } = await supabase.from('tenant_webhooks')
        .select('*').eq('tenant_id', profile.tenant_id).order('created_at', { ascending: false });
      setWebhooks(wh || []);

      const { data: wl } = await supabase.from('webhook_logs')
        .select('*').order('triggered_at', { ascending: false }).limit(30);
      setLogs(wl || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.name || !form.url || form.events.length === 0) {
      toast('Lengkapi nama, URL, dan pilih minimal 1 event', 'error');
      return;
    }
    try { new URL(form.url); } catch { toast('URL tidak valid', 'error'); return; }

    setSaving(true);
    const { error } = await supabase.from('tenant_webhooks').insert({
      tenant_id: tenantId,
      name: form.name,
      url: form.url,
      events: form.events,
      secret: form.secret || null,
      is_active: true,
    });

    if (error) toast('Gagal menyimpan webhook: ' + error.message, 'error');
    else {
      toast('Webhook berhasil ditambahkan!', 'success');
      setForm({ name: '', url: '', events: [], secret: '' });
      setActiveTab('list');
      await fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async (id, name) => {
    const ok = await confirm(`Hapus webhook "${name}"?`, 'Hapus Webhook');
    if (!ok) return;
    await supabase.from('tenant_webhooks').delete().eq('id', id);
    toast('Webhook dihapus', 'info');
    await fetchData();
  };

  const handleToggle = async (id, currentState) => {
    await supabase.from('tenant_webhooks').update({ is_active: !currentState }).eq('id', id);
    await fetchData();
  };

  const handleTest = async (webhook) => {
    setTesting(webhook.id);
    const payload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      tenant_id: tenantId,
      data: {
        message: 'Test webhook dari SI PRESENSI',
        webhook_name: webhook.name,
      }
    };

    try {
      const res = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhook.secret ? { 'X-Webhook-Secret': webhook.secret } : {}),
          'X-Source': 'SI-PRESENSI',
        },
        body: JSON.stringify(payload),
      });

      await supabase.from('tenant_webhooks').update({
        last_triggered_at: new Date().toISOString(),
        last_status: res.status,
      }).eq('id', webhook.id);

      if (res.ok) toast(`Test berhasil! Status: ${res.status}`, 'success');
      else toast(`Test gagal: Status ${res.status}`, 'error');
    } catch (e) {
      toast('Gagal kirim: ' + e.message, 'error');
    }
    setTesting(null);
    await fetchData();
  };

  const toggleEvent = (eventId) => {
    setForm(prev => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter(e => e !== eventId)
        : [...prev.events, eventId]
    }));
  };

  if (loading) return <div className="flex items-center justify-center p-20"><Loader2 size={28} className="animate-spin text-[var(--aurora-3)]" /></div>;

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--warning)] flex items-center justify-center">
              <Webhook size={20} className="text-white" />
            </div>
            Webhook & Integrasi
          </h2>
          <p className="text-gray-400 text-sm mt-1 ml-[52px]">Kirim event HR ke Slack, Zapier, n8n, dan sistem eksternal lainnya</p>
        </div>
        <div className="flex gap-2">
          {['list', 'add', 'logs'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all ${activeTab === t ? 'bg-[var(--aurora-1)]/20 border-[var(--aurora-1)]/40 text-[var(--aurora-1)]' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'}`}>
              {t === 'list' ? `Webhook (${webhooks.length})` : t === 'add' ? '+ Baru' : 'Logs'}
            </button>
          ))}
        </div>
      </div>

      {/* Info Banner */}
      {activeTab === 'list' && webhooks.length === 0 && (
        <div className="p-4 bg-[var(--aurora-1)]/5 border border-[var(--aurora-1)]/20 rounded-2xl flex items-start gap-3">
          <Info size={16} className="text-[var(--aurora-1)] flex-shrink-0 mt-0.5" />
          <div className="text-[10px] text-gray-400 leading-relaxed">
            <strong className="text-white">Cara mulai:</strong> Klik tombol <strong className="text-[var(--aurora-1)]">+ Baru</strong> untuk menambah webhook.
            Dapatkan Webhook URL dari Slack (App Directory → Incoming Webhooks), Zapier, Make, atau n8n workflow Anda.
          </div>
        </div>
      )}

      {/* === WEBHOOK LIST === */}
      {activeTab === 'list' && (
        <div className="space-y-3">
          {webhooks.length === 0 ? (
            <div className="glass-panel p-12 rounded-2xl border border-white/5 text-center">
              <Webhook size={48} className="text-gray-700 mx-auto mb-4" />
              <p className="text-gray-400 text-sm font-bold">Belum ada webhook</p>
              <p className="text-gray-600 text-xs mt-1">Tambahkan webhook untuk mengintegrasikan dengan Slack, Zapier, dll</p>
              <button onClick={() => setActiveTab('add')}
                className="mt-4 px-6 py-2.5 rounded-xl bg-[var(--aurora-1)]/20 border border-[var(--aurora-1)]/40 text-[var(--aurora-1)] text-sm font-bold hover:bg-[var(--aurora-1)]/30 transition-all">
                + Tambah Webhook Pertama
              </button>
            </div>
          ) : webhooks.map(wh => (
            <motion.div key={wh.id} className="glass-panel p-5 rounded-2xl border border-white/5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <div className={`w-2 h-2 rounded-full ${wh.is_active ? 'bg-[var(--success)] animate-pulse' : 'bg-gray-600'}`} />
                    <h3 className="text-sm font-bold text-white">{wh.name}</h3>
                    {wh.last_status && <StatusBadge status={wh.last_status} />}
                  </div>
                  <p className="text-[10px] text-gray-500 font-mono truncate mb-2">{wh.url}</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {wh.events?.map(ev => {
                      const def = AVAILABLE_EVENTS.find(e => e.id === ev);
                      return def ? (
                        <span key={ev} className="text-[8px] px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-gray-400">
                          {def.icon} {def.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                  {wh.last_triggered_at && (
                    <p className="text-[9px] text-gray-600 flex items-center gap-1">
                      <Clock size={9} /> Last triggered: {new Date(wh.last_triggered_at).toLocaleString('id-ID')}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Toggle */}
                  <button onClick={() => handleToggle(wh.id, wh.is_active)}
                    className={`w-10 h-5 rounded-full relative transition-all ${wh.is_active ? 'bg-[var(--success)]' : 'bg-gray-700'}`}>
                    <motion.div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
                      animate={{ left: wh.is_active ? '22px' : '2px' }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                  </button>

                  {/* Test */}
                  <button onClick={() => handleTest(wh)} disabled={testing === wh.id || !wh.is_active}
                    className="p-2 bg-[var(--aurora-3)]/10 hover:bg-[var(--aurora-3)]/20 text-[var(--aurora-3)] rounded-xl transition-colors disabled:opacity-40">
                    {testing === wh.id ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  </button>

                  {/* Delete */}
                  <button onClick={() => handleDelete(wh.id, wh.name)}
                    className="p-2 bg-[var(--danger)]/10 hover:bg-[var(--danger)]/20 text-[var(--danger)] rounded-xl transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* === ADD WEBHOOK === */}
      {activeTab === 'add' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel p-5 border border-white/5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white">Informasi Webhook</h3>

            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block mb-2">Nama Webhook *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Contoh: Slack Notifikasi Absensi"
                className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-1)]" />
            </div>

            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block mb-2">URL Endpoint *</label>
              <input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono outline-none focus:border-[var(--aurora-1)]" />
            </div>

            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block mb-2">Secret (Opsional)</label>
              <div className="relative">
                <input
                  type={showSecrets.form ? 'text' : 'password'}
                  value={form.secret} onChange={e => setForm({ ...form, secret: e.target.value })}
                  placeholder="Signature secret untuk verifikasi"
                  className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 pr-10 py-3 text-white text-sm font-mono outline-none focus:border-[var(--aurora-1)]" />
                <button onClick={() => setShowSecrets(p => ({ ...p, form: !p.form }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                  {showSecrets.form ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p className="text-[9px] text-gray-600 mt-1">Dikirim sebagai header <code className="text-[var(--aurora-3)]">X-Webhook-Secret</code></p>
            </div>

            <button onClick={handleSave} disabled={saving}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-all">
              {saving ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : <><Plus size={16} /> Simpan Webhook</>}
            </button>
          </div>

          {/* Event Selector */}
          <div className="glass-panel p-5 border border-white/5 rounded-2xl">
            <h3 className="text-sm font-bold text-white mb-4">
              Pilih Events <span className="text-gray-500 font-normal">({form.events.length} dipilih)</span>
            </h3>
            <div className="space-y-2">
              {AVAILABLE_EVENTS.map(ev => (
                <button key={ev.id} onClick={() => toggleEvent(ev.id)}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${form.events.includes(ev.id)
                    ? 'bg-[var(--aurora-1)]/10 border-[var(--aurora-1)]/40'
                    : 'bg-white/3 border-white/5 hover:border-white/15'}`}>
                  <span className="text-base flex-shrink-0">{ev.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white">{ev.label}</p>
                    <p className="text-[9px] text-gray-500">{ev.desc}</p>
                    <code className="text-[8px] text-gray-600 font-mono">{ev.id}</code>
                  </div>
                  {form.events.includes(ev.id) && <CheckCircle2 size={14} className="text-[var(--aurora-1)] flex-shrink-0 mt-0.5" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* === LOGS === */}
      {activeTab === 'logs' && (
        <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity size={16} className="text-[var(--aurora-1)]" /> Log Webhook (30 Terbaru)
            </h3>
            <button onClick={fetchData} className="p-2 bg-white/5 rounded-xl text-gray-400 hover:text-white transition-all">
              <RefreshCw size={14} />
            </button>
          </div>
          {logs.length === 0 ? (
            <div className="p-10 text-center">
              <Activity size={40} className="text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Belum ada log webhook</p>
              <p className="text-gray-600 text-xs mt-1">Log akan muncul setelah webhook berhasil dikirim</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {logs.map(log => (
                <div key={log.id} className="p-4 flex items-start gap-4 hover:bg-white/2 transition-colors">
                  <StatusBadge status={log.response_status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-white">{log.event}</p>
                    </div>
                    <p className="text-[9px] text-gray-500 mt-0.5">
                      <Clock size={9} className="inline mr-1" />
                      {new Date(log.triggered_at).toLocaleString('id-ID')}
                    </p>
                    {log.response_body && (
                      <p className="text-[9px] text-gray-600 mt-1 truncate font-mono">{log.response_body?.slice(0, 100)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payload Preview */}
      {activeTab === 'add' && (
        <div className="glass-panel p-4 border border-white/5 rounded-2xl">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-3">Contoh Payload yang Dikirim</p>
          <pre className="text-[9px] text-[var(--aurora-3)] font-mono bg-[#0B0C10] p-4 rounded-xl overflow-auto custom-scrollbar">
{`{
  "event": "attendance.checkin",
  "timestamp": "2024-05-24T07:30:00+07:00",
  "tenant_id": "uuid...",
  "data": {
    "employee_id": "uuid...",
    "employee_name": "John Doe",
    "nip": "EMP001",
    "location": { "lat": -6.2088, "lng": 106.8456 },
    "method": "GPS",
    "risk_score": 0
  }
}`}
          </pre>
        </div>
      )}
    </div>
  );
};

export default WebhookSettings;
