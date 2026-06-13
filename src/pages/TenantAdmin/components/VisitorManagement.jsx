import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Search, Plus, Save, X, User, LogIn, LogOut, Ban, Printer, QrCode, Calendar, Phone, Car, Building2, Download } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../components/Toast';
import { useTranslation } from 'react-i18next';

const VisitorManagement = () => {
  const { t } = useTranslation();
  const [visitors, setVisitors] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [tenantId, setTenantId] = useState(null);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterHost, setFilterHost] = useState('');
  const [filterName, setFilterName] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ host_id: '', full_name: '', company: '', identity_number: '', phone: '', vehicle_plate: '', purpose: '', visit_date: new Date().toISOString().split('T')[0] });
  const [qrData, setQrData] = useState(null);
  const toast = useToast();

  const downloadQRCode = async (data, filename) => {
    try {
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data)}`;
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
      toast(t('visitor.qrDownloadSuccess'), 'success');
    } catch (err) {
      console.error(err);
      toast(t('visitor.qrDownloadFail'), 'error');
    }
  };

  const printQRCode = (data, title) => {
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data)}`;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${t('visitor.printQRTitle')}${title}</title>
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
            <p>${t('visitor.scanPrompt')}</p>
            <img src="${qrApiUrl}" onload="window.print(); window.close();" />
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
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

    let q1 = supabase.from('visitors').select('*, profiles!host_id(full_name, nip)');
    if (activeTenantId) q1 = q1.eq('tenant_id', activeTenantId);
    q1 = q1.order('visit_date', { ascending: false });
    const { data: v } = await q1;
    if (v) setVisitors(v);

    let q2 = supabase.from('profiles').select('id, full_name, nip');
    if (activeTenantId) q2 = q2.eq('tenant_id', activeTenantId);
    q2 = q2.in('role', ['EMPLOYEE', 'SUB_ADMIN']);
    const { data: e } = await q2;
    if (e) setEmployees(e);
  };

  const generateQR = (visitor) => {
    const data = JSON.stringify({ id: visitor.id, name: visitor.full_name, company: visitor.company, visit_date: visitor.visit_date });
    setQrData(data);
    toast(t('visitor.qrReady'), 'success');
  };

  const handleSave = async () => {
    if (!form.full_name || !form.visit_date) { toast(t('visitor.nameAndDateRequired'), 'error'); return; }
    try {
      const payload = { tenant_id: tenantId, host_id: form.host_id || null, full_name: form.full_name, company: form.company || null, identity_number: form.identity_number || null, phone: form.phone || null, vehicle_plate: form.vehicle_plate || null, purpose: form.purpose || null, visit_date: form.visit_date };
      const { data, error } = await supabase.from('visitors').insert(payload).select().single();
      if (error) throw error;
      toast(t('visitor.registerSuccess'), 'success');
      setShowForm(false);
      setForm({ host_id: '', full_name: '', company: '', identity_number: '', phone: '', vehicle_plate: '', purpose: '', visit_date: new Date().toISOString().split('T')[0] });
      if (data) generateQR(data);
      fetchAll();
    } catch (e) { toast(t('visitor.registerFail') + e.message, 'error'); }
  };

  const handleCheckIn = async (id) => {
    await supabase.from('visitors').update({ checked_in_at: new Date().toISOString(), is_checked_in: true }).eq('id', id);
    toast(t('visitor.checkInSuccess'), 'success');
    fetchAll();
  };

  const handleCheckOut = async (id) => {
    await supabase.from('visitors').update({ checked_out_at: new Date().toISOString(), is_checked_out: true }).eq('id', id);
    toast(t('visitor.checkOutSuccess'), 'success');
    fetchAll();
  };

  const toggleBlacklist = async (v) => {
    await supabase.from('visitors').update({ is_blacklisted: !v.is_blacklisted }).eq('id', v.id);
    toast(
      v.is_blacklisted 
        ? t('visitor.removedFromBlacklist') 
        : t('visitor.addedToBlacklist'), 
      'info'
    );
    fetchAll();
  };

  const toggleBadgePrinted = async (id, current) => {
    await supabase.from('visitors').update({ badge_printed: !current }).eq('id', id);
    toast(
      current 
        ? t('visitor.badgeUnmarked') 
        : t('visitor.badgeMarked'), 
      'success'
    );
    fetchAll();
  };

  const filtered = visitors.filter(v => {
    if (filterDate && v.visit_date !== filterDate) return false;
    if (filterHost && v.profiles?.full_name && !v.profiles.full_name.toLowerCase().includes(filterHost.toLowerCase())) return false;
    if (filterName && !v.full_name.toLowerCase().includes(filterName.toLowerCase())) return false;
    return true;
  });

  const todayVisitors = visitors.filter(v => v.visit_date === new Date().toISOString().split('T')[0]);
  const checkedInToday = todayVisitors.filter(v => v.is_checked_in).length;

  return (
    <div className="glass-panel p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-6 mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">{t('visitor.title')}</h2>
          <p className="text-sm text-gray-400 mt-1">{t('visitor.summary', { count: todayVisitors.length, checkedIn: checkedInToday, blacklisted: visitors.filter(v => v.is_blacklisted).length })}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-xs font-bold flex items-center gap-2 whitespace-nowrap"><Plus size={16} /> {t('visitor.preRegister')}</button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[150px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={filterName} onChange={e => setFilterName(e.target.value)} placeholder={t('visitor.searchNamePlaceholder')}   className="w-full bg-white/5 border border-white/20 rounded-xl pl-9 pr-3 py-2.5 text-white text-xs outline-none placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
        </div>
        <div>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}   className="bg-white/5 border border-white/20 rounded-xl px-3 py-2.5 text-white text-xs outline-none transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
        </div>
        <div className="relative flex-1 min-w-[150px]">
          <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={filterHost} onChange={e => setFilterHost(e.target.value)} placeholder={t('visitor.searchHostPlaceholder')}   className="w-full bg-white/5 border border-white/20 rounded-xl pl-9 pr-3 py-2.5 text-white text-xs outline-none placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
        </div>
      </div>

      {createPortal(
        <AnimatePresence>
          {showForm && (
            <div className="fixed inset-0 z-[9999] overflow-y-auto">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="fixed inset-0 bg-black/85 backdrop-blur-md" 
                onClick={() => setShowForm(false)}
              />
              <div className="flex min-h-screen items-start sm:items-center justify-center p-4 relative z-10 pointer-events-none">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0, y: 30 }} 
                  animate={{ scale: 1, opacity: 1, y: 0 }} 
                  exit={{ scale: 0.9, opacity: 0, y: 30 }} 
                  className="w-full max-w-lg glass-panel p-8 relative z-20 pointer-events-auto" 
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-serif font-bold text-white">{t('visitor.registerVisitorFormTitle')}</h3>
                    <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white expand-touch-target"><X size={20} /></button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('visitor.host')}</label>
                      <select value={form.host_id} onChange={e => setForm({...form, host_id: e.target.value})}  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" >
                        <option value="">{t('visitor.selectHost')}</option>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.nip})</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('visitor.fullName')}</label>
                        <input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})}   className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('visitor.company')}</label>
                        <input value={form.company} onChange={e => setForm({...form, company: e.target.value})}   className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('visitor.identityNumber')}</label>
                        <input value={form.identity_number} onChange={e => setForm({...form, identity_number: e.target.value})}   className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('visitor.phoneNumber')}</label>
                        <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}   className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('visitor.vehiclePlate')}</label>
                        <input value={form.vehicle_plate} onChange={e => setForm({...form, vehicle_plate: e.target.value})}   className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('visitor.visitDate')}</label>
                        <input type="date" value={form.visit_date} onChange={e => setForm({...form, visit_date: e.target.value})}   className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('visitor.purpose')}</label>
                      <textarea value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})} rows={3}   className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-gray-400 transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
                    </div>
                    <button onClick={handleSave} className="w-full py-4 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-bold text-xs flex items-center justify-center gap-2">
                      <Save size={14} /> {t('visitor.registerButton')}
                    </button>
                  </div>
                </motion.div>
              </div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {qrData && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-6 p-6 bg-white/5 rounded-2xl border border-[var(--aurora-3)]/30 text-center space-y-4 relative">
          <button 
            onClick={() => setQrData(null)} 
            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
          
          <p className="text-xs text-[var(--aurora-3)] font-bold">{t('visitor.qrGenerated')}</p>
          
          <div className="bg-white rounded-2xl p-4 w-fit mx-auto border border-white/5 shadow-inner">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}`} 
              alt="Visitor QR Code" 
              className="w-40 h-40 mx-auto"
            />
          </div>
          
          <p className="text-[9px] text-gray-500 break-all font-mono bg-black/30 rounded-xl p-3 border border-white/5 max-w-sm mx-auto">{qrData}</p>
          
          <div className="flex gap-2 max-w-sm mx-auto">
            <button 
              onClick={() => {
                const visitorObj = JSON.parse(qrData);
                downloadQRCode(qrData, `visitor-qr-${visitorObj.name || 'pass'}.png`);
              }}
              className="flex-1 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all"
            >
              <Download size={12} /> {t('visitor.download')}
            </button>
            
            <button 
              onClick={() => {
                const visitorObj = JSON.parse(qrData);
                printQRCode(qrData, `Visitor Pass - ${visitorObj.name || 'Guest'}`);
              }}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] hover:opacity-90 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-[0_4px_12px_rgba(142,45,226,0.2)]"
            >
              <Printer size={12} /> {t('visitor.printQR')}
            </button>
          </div>
        </motion.div>
      )}

      <div className="space-y-3">
        {filtered.map(v => (
          <div key={v.id} className={`p-5 bg-white/5 rounded-2xl border transition-all group ${v.is_blacklisted ? 'border-[var(--danger)]/30 opacity-70' : 'border-white/10 hover:border-white/20'}`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${v.is_blacklisted ? 'bg-[var(--danger)]/10 text-[var(--danger)]' : 'bg-white/5 text-gray-400'}`}>
                  {v.is_blacklisted ? <Ban size={18} /> : <User size={18} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{v.full_name}</span>
                    {v.is_blacklisted && <span className="text-[8px] px-1.5 py-0.5 rounded bg-[var(--danger)]/10 text-[var(--danger)] font-bold">{t('visitor.blacklistBadge')}</span>}
                    {v.badge_printed && <span className="text-[8px] px-1.5 py-0.5 rounded bg-[var(--success)]/10 text-[var(--success)] font-bold">{t('visitor.badgePrintedBadge')}</span>}
                  </div>
                  <div className="flex items-center gap-3 text-[9px] text-gray-500 mt-0.5">
                    {v.company && <span className="flex items-center gap-1"><Building2 size={9} /> {v.company}</span>}
                    {v.profiles?.full_name && <span className="flex items-center gap-1"><User size={9} /> Host: {v.profiles.full_name}</span>}
                    <span className="flex items-center gap-1"><Calendar size={9} /> {v.visit_date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-gray-500 mt-0.5">
                    {v.identity_number && <span>KTP: {v.identity_number}</span>}
                    {v.phone && <span className="flex items-center gap-1"><Phone size={9} /> {v.phone}</span>}
                    {v.vehicle_plate && <span className="flex items-center gap-1"><Car size={9} /> {v.vehicle_plate}</span>}
                  </div>
                  {v.purpose && <p className="text-[9px] text-gray-500 italic mt-0.5">&quot;{v.purpose}&quot;</p>}
                  <div className="flex items-center gap-2 mt-1">
                    {v.is_checked_in && <span className="text-[8px] text-blue-400 flex items-center gap-1"><LogIn size={8} /> {new Date(v.checked_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>}
                    {v.is_checked_out && <span className="text-[8px] text-gray-400 flex items-center gap-1"><LogOut size={8} /> {new Date(v.checked_out_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!v.is_checked_in && (
                  <button onClick={() => handleCheckIn(v.id)} className="p-2 rounded-lg bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20" title="Check-In"><LogIn size={14} /></button>
                )}
                {v.is_checked_in && !v.is_checked_out && (
                  <button onClick={() => handleCheckOut(v.id)} className="p-2 rounded-lg bg-gray-500/10 text-gray-400 hover:bg-gray-500/20" title="Check-Out"><LogOut size={14} /></button>
                )}
                <button onClick={() => toggleBadgePrinted(v.id, v.badge_printed)} className={`p-2 rounded-lg ${v.badge_printed ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-white/5 text-gray-500'} hover:bg-white/10`} title="Badge"><Printer size={14} /></button>
                <button onClick={() => toggleBlacklist(v)} className={`p-2 rounded-lg ${v.is_blacklisted ? 'bg-[var(--danger)]/10 text-[var(--danger)]' : 'bg-white/5 text-gray-500'} hover:bg-white/10`} title="Blacklist"><Ban size={14} /></button>
                <button onClick={() => generateQR(v)} className="p-2 rounded-lg bg-white/5 text-gray-500 hover:bg-white/10" title="Generate QR"><QrCode size={14} /></button>
              </div>
            </div>
          </div>
        ))}
        {!filtered.length && <p className="text-center text-gray-500 py-8 text-sm">{t('visitor.noVisitor')}</p>}
      </div>
    </div>
  );
};

export default VisitorManagement;
