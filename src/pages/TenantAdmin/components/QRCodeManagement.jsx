import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, QrCode, Copy, Trash2, CheckCircle2, XCircle, Loader2, Eye, Printer, Download, X } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { useTranslation } from 'react-i18next';

const QRCodeManagement = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('attendance');
  const [tokens, setTokens] = useState([]);
  const [patrolPoints, setPatrolPoints] = useState([]);
  const [guardPosts, setGuardPosts] = useState([]);
  const [assets, setAssets] = useState([]);
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
    const tid = activeTenantId;

    // 1. Attendance Tokens
    const { data: attTokens } = await supabase.from('qr_attendance_tokens').select('*, projects(name)').eq('tenant_id', tid).order('created_at', { ascending: false });
    if (attTokens) setTokens(attTokens);

    // 2. Patrol Points (Areas)
    const { data: points } = await supabase.from('areas').select('*').eq('tenant_id', tid).order('nomor_titik');
    if (points) setPatrolPoints(points);

    // 3. Guard Posts (Pos List)
    const { data: postsData } = await supabase.from('pos_list').select('*').eq('tenant_id', tid).order('kode');
    if (postsData) setGuardPosts(postsData);

    // 4. Assets
    const { data: assetData } = await supabase.from('company_assets').select('*').eq('tenant_id', tid).order('asset_name');
    if (assetData) setAssets(assetData);

    // 5. Projects for selector
    const { data: projs } = await supabase.from('projects').select('id, name, code').eq('tenant_id', tid);
    if (projs) setProjects(projs);
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
          <p className="text-sm text-gray-400 mt-1">Pusat Manajemen Barcode & QR Code Terpusat</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setActiveTab('attendance')} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${activeTab === 'attendance' ? 'bg-[var(--aurora-3)]/20 border border-[var(--aurora-3)] text-white' : 'bg-white/5 border border-white/10 text-gray-500 hover:text-white'}`}>Absensi</button>
          <button onClick={() => setActiveTab('patrol')} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${activeTab === 'patrol' ? 'bg-[var(--aurora-3)]/20 border border-[var(--aurora-3)] text-white' : 'bg-white/5 border border-white/10 text-gray-500 hover:text-white'}`}>Patroli</button>
          <button onClick={() => setActiveTab('pos')} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${activeTab === 'pos' ? 'bg-[var(--aurora-3)]/20 border border-[var(--aurora-3)] text-white' : 'bg-white/5 border border-white/10 text-gray-500 hover:text-white'}`}>Pos Jaga</button>
          <button onClick={() => setActiveTab('assets')} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${activeTab === 'assets' ? 'bg-[var(--aurora-3)]/20 border border-[var(--aurora-3)] text-white' : 'bg-white/5 border border-white/10 text-gray-500 hover:text-white'}`}>Aset/Fasilitas</button>
        </div>
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
          {activeTab === 'attendance' && 'QR Code untuk Absensi Mobile'}
          {activeTab === 'patrol' && 'Barcode untuk Titik Checkpoint Patroli'}
          {activeTab === 'pos' && 'Barcode Identitas Pos Penjagaan'}
          {activeTab === 'assets' && 'Barcode Tagging Aset & Fasilitas'}
        </p>
        <div className="flex flex-wrap gap-2">
          {activeTab === 'attendance' ? (
            <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 whitespace-nowrap shadow-[0_4px_12px_rgba(142,45,226,0.2)] hover:scale-105 transition-all"><Plus size={14} /> {t('qrCode.generateQR')}</button>
          ) : (
            <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[9px] text-gray-500 font-bold uppercase flex items-center gap-2">
              <Info size={12} /> Kelola Master Data di Modul Terkait
            </div>
          )}
        </div>
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
        {activeTab === 'attendance' && tokens.map(token => (
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

        {activeTab === 'patrol' && patrolPoints.map(p => (
          <div key={p.supabase_id} className="p-5 rounded-2xl border border-white/10 bg-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--aurora-3)]/10 text-[var(--aurora-3)] flex items-center justify-center">
                <MapPin size={20} />
              </div>
              <div>
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest">{p.qr_code}</p>
                <p className="text-sm font-bold text-white">{p.titik}</p>
              </div>
            </div>
            <div className="bg-black/30 p-3 rounded-xl border border-white/5 mb-4">
              <p className="text-[10px] text-gray-400 italic">Lt. {p.lantai} - {p.zona}</p>
            </div>
            <button 
              onClick={() => setActiveQRModal({ url: p.qr_code, title: `QR Patroli: ${p.titik}`, filename: `patrol-${p.qr_code}.png` })}
              className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-white/10"
            >
              <QrCode size={14} /> Lihat & Cetak Barcode
            </button>
          </div>
        ))}

        {activeTab === 'pos' && guardPosts.map(p => (
          <div key={p.supabase_id} className="p-5 rounded-2xl border border-white/10 bg-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--success)]/10 text-[var(--success)] flex items-center justify-center">
                <Shield size={20} />
              </div>
              <div>
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest">{p.kode || 'POS-UNSET'}</p>
                <p className="text-sm font-bold text-white">{p.titik}</p>
              </div>
            </div>
            <div className="bg-black/30 p-3 rounded-xl border border-white/5 mb-4">
              <p className="text-[10px] text-gray-400">Lantai: {p.lantai}</p>
            </div>
            <button 
              onClick={() => setActiveQRModal({ url: p.kode || p.titik, title: `QR Pos Jaga: ${p.titik}`, filename: `pos-${p.kode || 'unknown'}.png` })}
              className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-white/10"
            >
              <QrCode size={14} /> Generate Barcode Pos
            </button>
          </div>
        ))}

        {activeTab === 'assets' && assets.map(a => (
          <div key={a.id} className="p-5 rounded-2xl border border-white/10 bg-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--aurora-1)]/10 text-[var(--aurora-1)] flex items-center justify-center">
                <QrCode size={20} />
              </div>
              <div>
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest">{a.asset_code}</p>
                <p className="text-sm font-bold text-white">{a.asset_name}</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveQRModal({ url: a.asset_code, title: `QR Aset: ${a.asset_name}`, filename: `asset-${a.asset_code}.png` })}
              className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-white/10"
            >
              <QrCode size={14} /> Cetak Tag Aset
            </button>
          </div>
        ))}

        {activeTab === 'attendance' && !tokens.length && <p className="text-center text-gray-500 py-8 col-span-full text-sm">{t('qrCode.noToken')}</p>}
        {activeTab === 'patrol' && !patrolPoints.length && <p className="text-center text-gray-500 py-8 col-span-full text-sm">Belum ada titik patroli terdaftar.</p>}
        {activeTab === 'pos' && !guardPosts.length && <p className="text-center text-gray-500 py-8 col-span-full text-sm">Belum ada pos jaga terdaftar.</p>}
        {activeTab === 'assets' && !assets.length && <p className="text-center text-gray-500 py-8 col-span-full text-sm">Belum ada aset terdaftar.</p>}
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
