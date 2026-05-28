import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageSquare, Webhook, Save, Loader2, Eye, EyeOff, Link, Shield } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';

const SystemConfig = () => {
  const [config, setConfig] = useState({
    email_sender_name: 'SI PRESENSI', email_sender_address: '', email_provider: 'smtp',
    smtp_host: '', smtp_port: 587, smtp_username: '', smtp_password: '', smtp_encryption: 'tls',
    whatsapp_api_key: '', whatsapp_api_url: '',
    webhook_url: '', webhook_secret: ''
  });
  const [tenantId, setTenantId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const toast = useToast();

  useEffect(() => { fetchConfig(); }, []);

  const fetchConfig = async () => {
    const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: p } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
    if (!p?.tenant_id && !isGod) return;
    if (p?.tenant_id) setTenantId(p.tenant_id);

    let q = supabase.from('system_configs').select('*');
    if (p?.tenant_id) q = q.eq('tenant_id', p.tenant_id);
    const { data: c } = await q.maybeSingle();
    if (c) {
      setConfig({
        email_sender_name: c.email_sender_name || 'SI PRESENSI',
        email_sender_address: c.email_sender_address || '',
        email_provider: c.email_provider || 'smtp',
        smtp_host: c.smtp_host || '',
        smtp_port: c.smtp_port || 587,
        smtp_username: c.smtp_username || '',
        smtp_password: c.smtp_password || '',
        smtp_encryption: c.smtp_encryption || 'tls',
        whatsapp_api_key: c.whatsapp_api_key || '',
        whatsapp_api_url: c.whatsapp_api_url || '',
        webhook_url: c.webhook_url || '',
        webhook_secret: c.webhook_secret || ''
      });
    }
  };

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      await supabase.from('system_configs').upsert({ tenant_id: tenantId, ...config }, { onConflict: 'tenant_id' });
      toast('Konfigurasi tersimpan!', 'success');
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleChange = (field, value) => setConfig(prev => ({ ...prev, [field]: value }));

  return (
    <div className="glass-panel p-8">
      <div className="border-b border-white/10 pb-6 mb-8">
        <h2 className="text-2xl font-serif font-bold text-white">Konfigurasi Sistem</h2>
        <p className="text-sm text-gray-400 mt-1">Email, WhatsApp, dan Webhook untuk notifikasi otomatis</p>
      </div>

      <div className="space-y-8">
        <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6"><Mail size={20} className="text-[var(--aurora-3)]" /> Email Gateway</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Nama Pengirim</label>
              <input value={config.email_sender_name} onChange={e => handleChange('email_sender_name', e.target.value)} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-3)]" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Alamat Email</label>
              <input value={config.email_sender_address} onChange={e => handleChange('email_sender_address', e.target.value)} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="noreply@perusahaan.com" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Provider</label>
              <select value={config.email_provider} onChange={e => handleChange('email_provider', e.target.value)} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white outline-none">
                <option value="smtp">SMTP Server</option>
                <option value="sendgrid">SendGrid</option>
                <option value="mailgun">Mailgun</option>
              </select>
            </div>
            <div className="flex items-end">
              <a href="https://www.google.com/search?q=SMTP+configuration+guide" target="_blank" className="text-[10px] text-[var(--aurora-3)] hover:underline">Butuh bantuan konfigurasi SMTP?</a>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">SMTP Host</label>
              <input value={config.smtp_host} onChange={e => handleChange('smtp_host', e.target.value)} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="smtp.gmail.com" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">SMTP Port</label>
              <input type="number" value={config.smtp_port} onChange={e => handleChange('smtp_port', Number(e.target.value))} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Username</label>
              <input value={config.smtp_username} onChange={e => handleChange('smtp_username', e.target.value)} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" />
            </div>
            <div className="relative">
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={config.smtp_password} onChange={e => handleChange('smtp_password', e.target.value)} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none pr-10" />
                <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Enkripsi</label>
              <select value={config.smtp_encryption} onChange={e => handleChange('smtp_encryption', e.target.value)} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white outline-none">
                <option value="tls">TLS</option>
                <option value="ssl">SSL</option>
                <option value="none">None</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6"><MessageSquare size={20} className="text-[var(--success)]" /> WhatsApp Gateway</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">API Key</label>
              <input value={config.whatsapp_api_key} onChange={e => handleChange('whatsapp_api_key', e.target.value)} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="your-whatsapp-api-key" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">API URL</label>
              <input value={config.whatsapp_api_url} onChange={e => handleChange('whatsapp_api_url', e.target.value)} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="https://api.whatsapp.com/send..." />
            </div>
          </div>
        </div>

        <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6"><Webhook size={20} className="text-[var(--warning)]" /> Webhook & Integrasi</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Webhook URL</label>
              <input value={config.webhook_url} onChange={e => handleChange('webhook_url', e.target.value)} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="https://api.example.com/webhook" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Webhook Secret</label>
              <div className="relative">
                <input type="password" value={config.webhook_secret} onChange={e => handleChange('webhook_secret', e.target.value)} className="w-full bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none pr-10 font-mono" placeholder="your-webhook-secret" />
                <Shield size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
              </div>
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} className="w-full py-4 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Simpan Semua Konfigurasi
        </button>
      </div>
    </div>
  );
};

export default SystemConfig;
