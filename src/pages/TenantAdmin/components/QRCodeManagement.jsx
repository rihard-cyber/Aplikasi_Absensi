import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, QrCode, Copy, Trash2, CheckCircle2, XCircle, Loader2, Eye, Printer, Download, X } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { useTranslation } from 'react-i18next';

const QRCodeManagement = () => {
  const { t } = useTranslation();
  const [tokens, setTokens] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tenantId, setTenantId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [newToken, setNewToken] = useState({ project_id: '', description: '' });
  const [copiedId, setCopiedId] = useState(null);
  const [activeQRModal, setActiveQRModal] = useState(null);
  const toast = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const isGod = (() => { try { return sessionStorage.getItem('super_admin_verified') === 'true'; } catch { return false; } })();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: p } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
    
    let activeTenantId = p?.tenant_id;
    if (!activeTenantId && isGod) {
      try {
        const impTenant = JSON.parse(localStorage.getItem('impersonated_tenant'));
        if (impTenant?.id) activeTenantId = impTenant.id;
      } catch (e) {
        console.error("Failed to parse impersonated tenant", e);
      }
    }

    if (!activeTenantId && !isGod) return;
    if (activeTenantId) setTenantId(activeTenantId);

    let q1 = supabase.from('projects').select('id, name, code, tenant_id');
    if (activeTenantId) q1 = q1.eq('tenant_id', activeTenantId);
    const { data: projs } = await q1;
    if (projs) setProjects(projs);

    let q2 = supabase.from('qr_attendance_tokens').select('*, projects(name)');
    if (activeTenantId) q2 = q2.eq('tenant_id', activeTenantId);
    q2 = q2.order('created_at', { ascending: false });
    const { data: t } = await q2;
    if (t) setTokens(t);
  };

  const generateToken = async () => {
    if (!newToken.project_id) { toast(t('qrCode.selectLocationError'), 'error'); return; }
    const randomBytes = new Uint8Array(12);
    crypto.getRandomValues(randomBytes);
    const token = Array.from(randomBytes, b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    const project = projects.find(p => p.id === newToken.project_id);
    const activeTenantId = tenantId || project?.tenant_id;
    const { error } = await supabase.from('qr_attendance_tokens').insert({
      tenant_id: activeTenantId, project_id: newToken.project_id, token,
      description: newToken.description || `QR ${project?.name || ''}`, is_active: true
    });
    if (error) { toast(t('qrCode.generateFail') + error.message, 'error'); return; }
    toast(t('qrCode.generateSuccess'), 'success');
    setShowForm(false);
    setNewToken({ project_id: '', description: '' });
    fetchData();
  };

  const toggleActive = async (id, current) => {
    let q = supabase.from('qr_attendance_tokens').update({ is_active: !current }).eq('id', id);
    if (tenantId) q = q.eq('tenant_id', tenantId);
    await q;
    fetchData();
  };

  const handleCopy = async (token, id) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedId(id);
      toast(t('qrCode.copied'), 'success');
      setTimeout(() => setCopiedId(null), 2000);
    } catch { toast(t('qrCode.copyFailed'), 'error'); }
  };

  const qrUrl = (token) => {
    const base = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '') + '/#/qr-attendance';
    return `${base}?token=${token}`;
  };

  const publicPortalUrl = (projectName) => {
    const base = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '') + '/#/public-service';
    return `${base}?tenant_id=${tenantId || ''}&location=${encodeURIComponent(projectName)}`;
  };

  const downloadQRCode = async (url, filename) => {
    try {
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
      const response = await fetch(qrApiUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename || 'qrcode.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      toast(t('qrCode.downloadSuccess'), 'success');
    } catch (err) {
      console.error(err);
      toast(t('qrCode.downloadFail'), 'error');
    }
  };

  const printQRCode = (url, title) => {
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${t('qrCode.printQRTitle')}${title}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              font-family: sans-serif;
            }
            .container {
              border: 2px solid #ccc;
              border-radius: 16px;
              padding: 30px;
              text-align: center;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            h2 { margin-bottom: 5px; color: #333; }
            p { margin-top: 0; color: #666; font-size: 14px; margin-bottom: 20px; }
            img { width: 250px; height: 250px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>${title}</h2>
            <p>${t('qrCode.scanPrompt')}</p>
            <img src="${qrApiUrl}" onload="window.print(); window.close();" />
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="glass-panel p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-6 mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">{t('qrCode.title')}</h2>
          <p className="text-sm text-gray-400 mt-1">{t('qrCode.subtitle')}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-bold flex items-center gap-2 whitespace-nowrap"><Plus size={16} /> {t('qrCode.generateQR')}</button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('qrCode.location')}</label>
              <select value={newToken.project_id} onChange={e => setNewToken({...newToken, project_id: e.target.value})}  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white outline-none placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" >
                <option value="">{t('qrCode.selectLocation')}</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.code ? `[${p.code}] ` : ''}{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('qrCode.description')}</label>
              <input value={newToken.description} onChange={e => setNewToken({...newToken, description: e.target.value})}  placeholder={t('qrCode.descriptionPlaceholder')}  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
            </div>
            <div className="flex items-end gap-2">
              <button onClick={generateToken} className="px-6 py-3 rounded-xl bg-[var(--success)] text-black text-xs font-bold">{t('qrCode.createToken')}</button>
              <button onClick={() => setShowForm(false)} className="px-6 py-3 rounded-xl bg-white/5 text-gray-400 border border-white/10 text-xs font-bold">{t('qrCode.cancel')}</button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tokens.map(token => (
          <div key={token.id} className={`p-5 rounded-2xl border transition-all ${token.is_active ? 'bg-white/5 border-white/10' : 'bg-white/[0.02] border-white/5 opacity-50'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center">
                  <QrCode size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{token.description || 'QR Token'}</p>
                  <p className="text-[10px] text-gray-400">{token.projects?.name || '-'}</p>
                </div>
              </div>
              <button onClick={() => toggleActive(token.id, token.is_active)} className={`w-8 h-5 rounded-full transition-colors ${token.is_active ? 'bg-[var(--success)]' : 'bg-gray-600'}`}>
                <div className={`w-3 h-3 bg-white rounded-full transition-all ${token.is_active ? 'ml-4' : 'ml-1'}`} />
              </button>
            </div>
            
            <div className="space-y-3 mb-4">
              <div>
                <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 font-bold">{t('qrCode.qrLinkTitle')}</p>
                <div className="flex items-center gap-2 bg-black/30 rounded-xl p-2.5 border border-white/5">
                  <div className="font-mono text-[9px] text-green-400 break-all flex-1 select-all">
                    {qrUrl(token.token)}
                  </div>
                  <button onClick={() => setActiveQRModal({ url: qrUrl(token.token), title: `QR Absensi - ${token.description || ''}`, filename: `qr-absen-${token.token}.png` })} className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white transition-colors" title={t('qrCode.printQR')}>
                    <QrCode size={12} />
                  </button>
                  <button onClick={() => handleCopy(qrUrl(token.token), `att-${token.id}`)} className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white transition-colors">
                    {copiedId === `att-${token.id}` ? <CheckCircle2 size={12} className="text-[var(--success)]" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 font-bold">{t('qrCode.publicPortalLinkTitle')}</p>
                <div className="flex items-center gap-2 bg-black/30 rounded-xl p-2.5 border border-white/5">
                  <div className="font-mono text-[9px] text-[var(--aurora-3)] break-all flex-1 select-all">
                    {publicPortalUrl(token.projects?.name || '')}
                  </div>
                  <button onClick={() => setActiveQRModal({ url: publicPortalUrl(token.projects?.name || ''), title: `Portal Publik - ${token.projects?.name || ''}`, filename: `qr-portal-${token.projects?.name || 'layanan'}.png` })} className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white transition-colors" title={t('qrCode.printQR')}>
                    <QrCode size={12} />
                  </button>
                  <button onClick={() => handleCopy(publicPortalUrl(token.projects?.name || ''), `pub-${token.id}`)} className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white transition-colors">
                    {copiedId === `pub-${token.id}` ? <CheckCircle2 size={12} className="text-[var(--success)]" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/5 pt-3">
              <span className="text-[9px] font-mono text-gray-500">{t('qrCode.tokenId')}{token.token}</span>
              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${token.is_active ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-red-500/10 text-red-400'}`}>
                {token.is_active ? t('qrCode.active') : t('qrCode.inactive')}
              </span>
            </div>
          </div>
        ))}
        {!tokens.length && <p className="text-center text-gray-500 py-8 col-span-full text-sm">{t('qrCode.noToken')}</p>}
      </div>

      {/* Visual QR Code Modal */}
      {createPortal(
        <AnimatePresence>
          {activeQRModal && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
              onClick={() => setActiveQRModal(null)}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.95 }} 
                className="bg-[#14151A] border border-white/10 rounded-3xl p-6 max-w-sm w-full text-center relative space-y-4 shadow-2xl z-[10000]" 
                onClick={e => e.stopPropagation()}
              >
                <button 
                  onClick={() => setActiveQRModal(null)} 
                  className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors expand-touch-target"
                >
                  <X size={18} />
                </button>
                
                <h3 className="text-base font-bold text-white pt-2">{activeQRModal.title}</h3>
                
                <div className="bg-white rounded-2xl p-4 w-fit mx-auto border border-white/5 shadow-inner">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(activeQRModal.url)}`} 
                    alt="QR Code" 
                    className="w-48 h-48 mx-auto"
                  />
                </div>
                
                <div className="bg-black/40 border border-white/5 rounded-xl p-2.5 text-left">
                  <p className="text-[8px] text-gray-500 uppercase tracking-widest font-black mb-1">{t('qrCode.tokenUrlLabel')}</p>
                  <p className="font-mono text-[9px] text-gray-400 break-all select-all">{activeQRModal.url}</p>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => downloadQRCode(activeQRModal.url, activeQRModal.filename)}
                    className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/5 hover:border-white/10 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                  >
                    <Download size={12} /> {t('qrCode.download')}
                  </button>
                  
                  <button 
                    onClick={() => printQRCode(activeQRModal.url, activeQRModal.title)}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] hover:opacity-90 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-[0_4px_12px_rgba(142,45,226,0.2)]"
                  >
                    <Printer size={12} /> {t('qrCode.printQR')}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default QRCodeManagement;
