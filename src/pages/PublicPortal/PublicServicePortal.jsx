import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building, Phone, MapPin, AlertTriangle, Calendar, Wrench, Clock, 
  Send, CheckCircle2, Loader2, ArrowLeft, Plus, X, Copy, 
  Sparkles, HelpCircle, User, ChevronRight, ChevronDown, Check, Search, Ticket, Info, Camera
} from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { useToast } from '../../components/Toast';
import TenantComplaintForm from './TenantComplaintForm';

const t = (s) => s;

const SERVICE_TYPES = [
  { 
    id: 'incident', 
    label: 'Lapor Insiden', 
    desc: 'Laporkan AC rusak, pipa bocor, lampu mati, atau masalah K3 lainnya', 
    icon: <AlertTriangle className="text-red-500" size={24} />,
    gradient: 'from-red-500/10 via-red-500/5 to-transparent hover:border-red-500/30 hover:shadow-[0_12px_40px_rgba(239,68,68,0.18)]'
  },
  { 
    id: 'booking', 
    label: 'Booking Fasilitas', 
    desc: 'Booking ruang rapat, aula, kendaraan operasional, atau peralatan', 
    icon: <Calendar className="text-[var(--aurora-3)]" size={24} />,
    gradient: 'from-[var(--aurora-3)]/10 via-[var(--aurora-3)]/5 to-transparent hover:border-[var(--aurora-3)]/30 hover:shadow-[0_12px_40px_rgba(0,201,255,0.18)]'
  },
  { 
    id: 'helpdesk', 
    label: 'Hubungi Helpdesk', 
    desc: 'Kirim tiket bantuan ke tim pengelola gedung / vendor IT & umum', 
    icon: <HelpCircle className="text-[var(--warning)]" size={24} />,
    gradient: 'from-[var(--warning)]/10 via-[var(--warning)]/5 to-transparent hover:border-[var(--warning)]/30 hover:shadow-[0_12px_40px_rgba(241,196,15,0.18)]'
  },
  { 
    id: 'complaint', 
    label: 'Komplain Tenant', 
    desc: 'Laporkan masalah listrik, AC, pipa, kebersihan, atau fasilitas gedung lainnya', 
    icon: <Building className="text-amber-400" size={24} />,
    gradient: 'from-amber-500/10 via-amber-500/5 to-transparent hover:border-amber-500/30 hover:shadow-[0_12px_40px_rgba(245,158,11,0.18)]'
  }
];

const INCIDENT_TYPES = [
  { value: 'kerusakan_fasilitas', label: 'Kerusakan Fasilitas Gedung' },
  { value: 'k3', label: 'Keamanan, Kesehatan, Keselamatan (K3)' },
  { value: 'kebakaran', label: 'Bahaya Kebakaran / Asap' },
  { value: 'kecelakaan_kerja', label: 'Kecelakaan Kerja' },
  { value: 'pencurian', label: 'Pencurian / Keamanan' },
  { value: 'kebersihan', label: 'Masalah Kebersihan / Sampah' },
  { value: 'lainnya', label: 'Masalah Lainnya' }
];

const HELPDESK_CATEGORIES = [
  { value: 'maintenance', label: 'Pemeliharaan Gedung (Sipil/ME)' },
  { value: 'cleaning', label: 'Kebersihan / Pest Control' },
  { value: 'it_support', label: 'Bantuan IT & Jaringan' },
  { value: 'logistics', label: 'Logistik / Alat Tulis Kantor' },
  { value: 'security', label: 'Layanan Keamanan' },
  { value: 'others', label: 'Pertanyaan / Masalah Lainnya' }
];

export default function PublicServicePortal() {
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  
  // Dynamic facilities list (for booking)
  const [facilities, setFacilities] = useState([]);
  
  // Loading & UI state
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [successData, setSuccessData] = useState(null); // { type, code, waLink }
  
  // Shared user identity
  const [identity, setIdentity] = useState({ name: '', phone: '', location: '' });
  
  // Specific Form States
  const [incidentForm, setIncidentForm] = useState({ incident_type: 'kerusakan_fasilitas', severity: 'medium', description: '', photo_url: '' });
  const [bookingForm, setBookingForm] = useState({ facility_id: '', booking_date: '', start_time: '', end_time: '', purpose: '' });
  const [helpdeskForm, setHelpdeskForm] = useState({ category: 'maintenance', priority: 'medium', subject: '', description: '', photo_url: '' });

  // Tab & Tracking Progress States
  const [activePortalTab, setActivePortalTab] = useState('request'); // 'request' or 'progress'
  const [progressInput, setProgressInput] = useState('');
  const [progressResults, setProgressResults] = useState([]);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [searchedQuery, setSearchedQuery] = useState('');

  const toast = useToast();

  // Load active tenants
  useEffect(() => {
    async function loadTenants() {
      const params = new URLSearchParams(window.location.hash.split('?')[1] || window.location.search);
      const tenantIdParam = params.get('tenant_id');
      const locationParam = params.get('location');

      if (tenantIdParam) {
        try {
          const { data: singleTenant } = await supabase
            .from('tenants')
            .select('id, name, is_active')
            .eq('id', tenantIdParam)
            .maybeSingle();
          if (singleTenant) {
            setSelectedTenant(singleTenant);
            setTenants([singleTenant]);
            if (locationParam) {
              setIdentity(prev => ({ ...prev, location: decodeURIComponent(locationParam) }));
            }
            setLoadingTenants(false);
            return;
          }
        } catch (err) {
          console.error('Failed to load specific tenant:', err);
        }
      }

      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('id, name, is_active')
          .eq('is_active', true)
          .order('name', { ascending: true });
        
        if (error) throw error;
        setTenants(data || []);
      } catch (err) {
        console.error('Failed to load tenants:', err);
        toast('Gagal memuat daftar lokasi gedung', 'error');
      } finally {
        setLoadingTenants(false);
      }
    }
    loadTenants();
  }, [toast]);

  // Load facilities when tenant and service=booking is selected
  useEffect(() => {
    if (!selectedTenant || selectedService !== 'booking') return;
    
    async function loadFacilities() {
      setLoadingFacilities(true);
      try {
        const { data, error } = await supabase
          .from('facilities')
          .select('*')
          .eq('tenant_id', selectedTenant.id)
          .eq('is_active', true)
          .order('name', { ascending: true });
        
        if (error) throw error;
        setFacilities(data || []);
      } catch (err) {
        console.error('Failed to load facilities:', err);
        toast('Gagal memuat daftar fasilitas ruangan', 'error');
      } finally {
        setLoadingFacilities(false);
      }
    }
    loadFacilities();
  }, [selectedTenant, selectedService, toast]);

  // Handle Photo Upload
  const handlePhotoUpload = async (e, formType) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `public_portal/${formType}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('documents').upload(path, file);
      if (uploadErr) throw uploadErr;
      
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
      
      if (formType === 'incident') {
        setIncidentForm(prev => ({ ...prev, photo_url: urlData.publicUrl }));
      } else if (formType === 'helpdesk') {
        setHelpdeskForm(prev => ({ ...prev, photo_url: urlData.publicUrl }));
      }
      toast('Foto berhasil diunggah!', 'success');
    } catch (err) {
      console.error(err);
      toast('Gagal mengunggah foto: ' + err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  // Submit Incident Report
  const submitIncident = async () => {
    if (!identity.name || !identity.phone || !identity.location || !incidentForm.description) {
      toast('Harap lengkapi semua bidang isian wajib', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const referenceCode = `INC-${Date.now().toString().slice(-6)}`;
      const prefix = `[EKSTERNAL - ${identity.name} / WA: ${identity.phone} / Unit: ${identity.location} / Ref: ${referenceCode}]`;
      const fullDescription = `${prefix} ${incidentForm.description.trim()}`;
      
      const { error } = await supabase.from('incident_reports').insert({
        tenant_id: selectedTenant.id,
        incident_type: incidentForm.incident_type,
        location: identity.location,
        description: fullDescription,
        severity: incidentForm.severity,
        photos: incidentForm.photo_url ? [incidentForm.photo_url] : [],
        status: 'reported'
      });

      if (error) throw error;

      // Construct WhatsApp message link
      const waText = encodeURIComponent(
        `Halo Admin ${selectedTenant.name},\n\nSaya telah melaporkan insiden baru via Portal Layanan:\n` +
        `- Pelapor: ${identity.name}\n` +
        `- No. Kontak: ${identity.phone}\n` +
        `- Lokasi: ${identity.location}\n` +
        `- Ref Tiket: ${referenceCode}\n` +
        `- Jenis: ${INCIDENT_TYPES.find(i => i.value === incidentForm.incident_type)?.label || incidentForm.incident_type}\n` +
        `- Detail: ${incidentForm.description}\n\nMohon bantuannya untuk ditindaklanjuti. Terima kasih!`
      );
      const waLink = `https://wa.me/?text=${waText}`;

      setSuccessData({
        type: 'Lapor Insiden',
        code: referenceCode,
        waLink
      });
    } catch (err) {
      console.error(err);
      toast('Gagal mengirimkan laporan insiden: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Booking Request
  const submitBooking = async () => {
    if (!identity.name || !identity.phone || !identity.location || !bookingForm.facility_id || !bookingForm.booking_date || !bookingForm.start_time || !bookingForm.end_time || !bookingForm.purpose) {
      toast('Harap lengkapi semua bidang isian wajib', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const referenceCode = `BKG-${Date.now().toString().slice(-6)}`;
      const prefix = `[EKSTERNAL - ${identity.name} / WA: ${identity.phone} / Unit: ${identity.location} / Ref: ${referenceCode}]`;
      const fullPurpose = `${prefix} ${bookingForm.purpose.trim()}`;
      const selectedFac = facilities.find(f => f.id === bookingForm.facility_id);

      const { error } = await supabase.from('booking_requests').insert({
        tenant_id: selectedTenant.id,
        facility_id: bookingForm.facility_id,
        booking_date: bookingForm.booking_date,
        start_time: bookingForm.start_time,
        end_time: bookingForm.end_time,
        purpose: fullPurpose,
        status: 'pending'
      });

      if (error) throw error;

      const waText = encodeURIComponent(
        `Halo Admin ${selectedTenant.name},\n\nSaya telah mengajukan pemesanan fasilitas via Portal Layanan:\n` +
        `- Pemesan: ${identity.name}\n` +
        `- No. Kontak: ${identity.phone}\n` +
        `- Lokasi: ${identity.location}\n` +
        `- Ref Booking: ${referenceCode}\n` +
        `- Fasilitas: ${selectedFac?.name || 'Fasilitas'}\n` +
        `- Tanggal: ${bookingForm.booking_date}\n` +
        `- Waktu: ${bookingForm.start_time} - ${bookingForm.end_time}\n` +
        `- Keperluan: ${bookingForm.purpose}\n\nMohon bantuannya untuk menyetujui reservasi ini. Terima kasih!`
      );
      const waLink = `https://wa.me/?text=${waText}`;

      setSuccessData({
        type: 'Booking Fasilitas',
        code: referenceCode,
        waLink
      });
    } catch (err) {
      console.error(err);
      toast('Gagal melakukan pemesanan: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Helpdesk Ticket
  const submitHelpdesk = async () => {
    if (!identity.name || !identity.phone || !identity.location || !helpdeskForm.subject || !helpdeskForm.description) {
      toast('Harap lengkapi semua bidang isian wajib', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const ticketNumber = `TKT-${Date.now().toString().slice(-6)}`;
      const prefix = `[EKSTERNAL - ${identity.name} / WA: ${identity.phone} / Unit: ${identity.location}]`;
      const fullSubject = `[EKSTERNAL] ${helpdeskForm.subject.trim()}`;
      const fullDescription = `${prefix} ${helpdeskForm.description.trim()}`;

      const { error } = await supabase.from('helpdesk_tickets').insert({
        tenant_id: selectedTenant.id,
        ticket_number: ticketNumber,
        category: helpdeskForm.category,
        priority: helpdeskForm.priority,
        subject: fullSubject,
        description: fullDescription,
        photo_urls: helpdeskForm.photo_url ? [helpdeskForm.photo_url] : null,
        status: 'open'
      });

      if (error) throw error;

      const waText = encodeURIComponent(
        `Halo Admin ${selectedTenant.name},\n\nSaya telah membuat tiket bantuan baru via Portal Layanan:\n` +
        `- Pengaju: ${identity.name}\n` +
        `- No. Kontak: ${identity.phone}\n` +
        `- Lokasi: ${identity.location}\n` +
        `- Tiket ID: ${ticketNumber}\n` +
        `- Subjek: ${helpdeskForm.subject}\n` +
        `- Kategori: ${HELPDESK_CATEGORIES.find(c => c.value === helpdeskForm.category)?.label || helpdeskForm.category}\n` +
        `- Detail: ${helpdeskForm.description}\n\nMohon bantuannya untuk ditindaklanjuti. Terima kasih!`
      );
      const waLink = `https://wa.me/?text=${waText}`;

      setSuccessData({
        type: 'Helpdesk',
        code: ticketNumber,
        waLink
      });
    } catch (err) {
      console.error(err);
      toast('Gagal membuat tiket bantuan: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Check Progress (Support WhatsApp Search & Code Search)
  const handleCheckProgress = async () => {
    const query = progressInput.trim();
    if (!query) {
      toast('Harap masukkan nomor WhatsApp atau Kode Tiket', 'warning');
      return;
    }
    setLoadingProgress(true);
    setProgressResults([]);
    try {
      let incs = [], bkgs = [], tkts = [];

      if (query.startsWith('INC-')) {
        const { data } = await supabase
          .from('incident_reports')
          .select('*')
          .eq('tenant_id', selectedTenant.id)
          .like('description', `%Ref: ${query}%`);
        if (data) incs = data;
      } else if (query.startsWith('BKG-')) {
        const { data } = await supabase
          .from('booking_requests')
          .select('*, facilities(name, location)')
          .eq('tenant_id', selectedTenant.id)
          .like('purpose', `%Ref: ${query}%`);
        if (data) bkgs = data;
      } else if (query.startsWith('TKT-')) {
        const { data } = await supabase
          .from('helpdesk_tickets')
          .select('*')
          .eq('tenant_id', selectedTenant.id)
          .eq('ticket_number', query);
        if (data) tkts = data;
      } else {
        // Search by WhatsApp / Phone Number
        const { data: d1 } = await supabase
          .from('incident_reports')
          .select('*')
          .eq('tenant_id', selectedTenant.id)
          .like('description', `%WA: ${query}%`);
        const { data: d2 } = await supabase
          .from('booking_requests')
          .select('*, facilities(name, location)')
          .eq('tenant_id', selectedTenant.id)
          .like('purpose', `%WA: ${query}%`);
        const { data: d3 } = await supabase
          .from('helpdesk_tickets')
          .select('*')
          .eq('tenant_id', selectedTenant.id)
          .like('description', `%WA: ${query}%`);
        
        if (d1) incs = d1;
        if (d2) bkgs = d2;
        if (d3) tkts = d3;
      }

      const combined = [
        ...incs.map(i => {
          const rawStatus = i.status ? i.status.toLowerCase() : 'reported';
          const displayStatus = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
          return {
            id: i.id,
            type: 'Lapor Insiden',
            title: INCIDENT_TYPES.find(it => it.value === i.incident_type)?.label || i.incident_type,
            date: i.created_at ? i.created_at.split('T')[0] : '',
            status: displayStatus,
            details: i.description.split(']')[1] || i.description,
            actionPic: i.action_pic || null,
            correctiveAction: i.corrective_action || null,
            colorClass: rawStatus === 'resolved' || rawStatus === 'closed' 
              ? 'text-green-400 bg-green-500/10 border-green-500/20 shadow-[0_0_15px_rgba(46,213,115,0.08)]' 
              : rawStatus === 'investigating' 
                ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' 
                : 'text-gray-400 bg-white/5 border-white/10'
          };
        }),
        ...bkgs.map(b => {
          const rawStatus = b.status ? b.status.toUpperCase() : 'PENDING';
          return {
            id: b.id,
            type: 'Booking Fasilitas',
            title: b.facilities?.name || 'Fasilitas',
            date: b.booking_date,
            status: rawStatus,
            details: `${b.start_time.substring(0, 5)} - ${b.end_time.substring(0, 5)} (${b.purpose.split(']')[1] || b.purpose})`,
            actionPic: null,
            correctiveAction: null,
            colorClass: rawStatus === 'APPROVED' || rawStatus === 'CHECKED_IN' || rawStatus === 'CHECKED_OUT' 
              ? 'text-green-400 bg-green-500/10 border-green-500/20 shadow-[0_0_15px_rgba(46,213,115,0.08)]' 
              : rawStatus === 'PENDING' 
                ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' 
                : 'text-red-400 bg-red-500/10 border-red-500/20'
          };
        }),
        ...tkts.map(t => {
          const rawStatus = t.status ? t.status.toLowerCase() : 'open';
          return {
            id: t.id,
            type: 'Helpdesk',
            title: t.subject.replace('[EKSTERNAL] ', ''),
            date: t.created_at ? t.created_at.split('T')[0] : '',
            status: rawStatus,
            details: t.description.split(']')[1] || t.description,
            actionPic: null,
            correctiveAction: t.resolution_notes || null,
            colorClass: rawStatus === 'closed' 
              ? 'text-green-400 bg-green-500/10 border-green-500/20 shadow-[0_0_15px_rgba(46,213,115,0.08)]' 
              : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
          };
        })
      ];

      setProgressResults(combined);
      setSearchedQuery(query);
      if (combined.length === 0) {
        toast('Tidak ditemukan laporan aktif untuk input tersebut.', 'info');
      } else {
        toast(`Berhasil memuat ${combined.length} status laporan`, 'success');
      }
    } catch (err) {
      console.error(err);
      toast('Gagal melacak progres: ' + err.message, 'error');
    } finally {
      setLoadingProgress(false);
    }
  };

  const handleReset = () => {
    setSelectedService(null);
    setSuccessData(null);
    setIncidentForm({ incident_type: 'kerusakan_fasilitas', severity: 'medium', description: '', photo_url: '' });
    setBookingForm({ facility_id: '', booking_date: '', start_time: '', end_time: '', purpose: '' });
    setHelpdeskForm({ category: 'maintenance', priority: 'medium', subject: '', description: '', photo_url: '' });
  };

  if (loadingTenants) {
    return (
      <div className="min-h-screen bg-[#0B0C10] flex flex-col items-center justify-center text-white relative">
        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[var(--aurora-3)] rounded-full blur-[100px] opacity-10 animate-pulse" />
        <Loader2 size={36} className="animate-spin text-[var(--aurora-3)] relative z-10" />
        <p className="text-xs text-gray-500 mt-6 uppercase tracking-[0.25em] font-black relative z-10">{t('Memuat Portal Layanan...')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0C10] text-white p-4 relative overflow-x-hidden font-sans selection:bg-[var(--aurora-3)]/30 selection:text-white">
      {/* Dynamic Animated Ambient Lights */}
      <div className="absolute top-[-10%] left-[-15%] w-[65%] h-[65%] bg-[var(--aurora-1)] rounded-full blur-[160px] pointer-events-none opacity-25 animate-pulse" style={{ animationDuration: '15s' }} />
      <div className="absolute bottom-[-10%] right-[-15%] w-[65%] h-[65%] bg-[var(--aurora-3)] rounded-full blur-[160px] pointer-events-none opacity-15 animate-pulse" style={{ animationDuration: '12s', animationDelay: '3s' }} />
      <div className="absolute top-[35%] right-[-25%] w-[55%] h-[55%] bg-[#00C9FF] rounded-full blur-[200px] pointer-events-none opacity-[0.06] animate-pulse" style={{ animationDuration: '20s', animationDelay: '1s' }} />

      <div className="max-w-md mx-auto py-6 sm:py-10 relative z-10">
        
        {/* Step 1: Select Tenant (If not locked by URL) */}
        {!selectedTenant ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4 backdrop-blur-md">
                <Sparkles size={12} className="text-[var(--aurora-3)] animate-pulse" />
                <span className="text-[9px] text-gray-300 font-bold uppercase tracking-[0.15em]">{t('Akses Cepat Eksternal')}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-gray-400">{t('Portal Layanan Mandiri')}</h1>
              <p className="text-xs text-gray-500 mt-2 uppercase tracking-widest">{t('Fasilitas, Reservasi & Laporan Gedung')}</p>
            </div>

            <div className="glass-panel p-6 border border-white/10 bg-[#14151A]/80 backdrop-blur-xl rounded-[32px] shadow-2xl">
              <label className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black block mb-4 ml-1">{t('PILIH LOKASI GEDUNG / APARTEMEN')}</label>
              
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                {tenants.map(tenant => (
                  <motion.button
                    key={tenant.id}
                    onClick={() => setSelectedTenant(tenant)}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/20 text-left transition-all group shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-[var(--aurora-3)]/10 text-[var(--aurora-3)] group-hover:bg-[var(--aurora-3)]/20 transition-all">
                        <Building size={16} />
                      </div>
                      <span className="text-sm font-bold text-white tracking-wide group-hover:text-[var(--aurora-3)] transition-colors">{tenant.name}</span>
                    </div>
                    <ChevronRight size={14} className="text-gray-600 group-hover:text-white transition-colors" />
                  </motion.button>
                ))}
                {tenants.length === 0 && (
                  <p className="text-center text-xs text-gray-500 py-8 italic">{t('Tidak ada lokasi aktif saat ini')}</p>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          /* Step 2: Show Services & Forms */
          <div className="space-y-6">
            
            {/* Header info */}
            <div className="flex items-center justify-between glass-panel p-4 rounded-2xl border border-white/10 bg-[#14151A]/60 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--aurora-3)]/10 text-[var(--aurora-3)] flex items-center justify-center border border-[var(--aurora-3)]/20">
                  <Building size={18} />
                </div>
                <div>
                  <h3 className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-500">{t('Layanan Gedung')}</h3>
                  <p className="text-sm font-serif font-black text-white leading-tight">{selectedTenant.name}</p>
                </div>
              </div>
              {/* Only let them reset/change tenant if NOT locked via query parameter */}
              {!(new URLSearchParams(window.location.hash.split('?')[1] || window.location.search).get('tenant_id')) && (
                <motion.button 
                  onClick={() => { setSelectedTenant(null); handleReset(); setActivePortalTab('request'); }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-[8px] font-black text-gray-400 hover:text-white border border-white/10 hover:border-white/30 px-3.5 py-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-all"
                >
                  {t('GANTI LOKASI')}
                </motion.button>
              )}
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-2 p-1.5 bg-black/40 rounded-2xl border border-white/5 w-full">
              <button
                onClick={() => { setActivePortalTab('request'); handleReset(); }}
                className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activePortalTab === 'request' ? 'bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
              >
                {t('Ajukan Layanan')}
              </button>
              <button
                onClick={() => { setActivePortalTab('progress'); handleReset(); }}
                className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activePortalTab === 'progress' ? 'bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
              >
                {t('Cek Progres')}
              </button>
            </div>

            <AnimatePresence mode="wait">
              {/* PORTAL TAB 1: SUBMIT REQUESTS */}
              {activePortalTab === 'request' && (
                <motion.div
                  key="request-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {successData ? (
                    /* Success view */
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -20 }}
                      transition={{ type: 'spring', duration: 0.8, bounce: 0.3 }}
                      className="glass-panel p-6 border border-[var(--success)]/30 bg-[#14151A]/90 rounded-[32px] text-center shadow-[0_20px_50px_rgba(46,213,115,0.12)]"
                    >
                      <motion.div 
                        initial={{ scale: 0, rotate: -45 }} 
                        animate={{ scale: 1, rotate: 0 }} 
                        transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 10 }}
                        className="w-16 h-16 rounded-full bg-[var(--success)]/10 text-[var(--success)] flex items-center justify-center mx-auto mb-5 border border-[var(--success)]/20 shadow-[0_0_20px_rgba(46,213,115,0.2)]"
                      >
                        <CheckCircle2 size={32} />
                      </motion.div>
                      <h2 className="text-xl font-serif font-bold text-white mb-2">{t('Pengiriman Sukses!')}</h2>
                      <p className="text-xs text-gray-400 max-w-xs mx-auto mb-6 leading-relaxed">
                        {t('Permintaan')} <span className="font-bold text-white">{successData.type}</span> {t('Anda telah diterima. Simpan kode referensi Anda:')}
                      </p>
                      
                      <motion.div 
                        initial={{ opacity: 0, y: 15 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
                        className="bg-gradient-to-r from-black/60 to-black/30 border border-white/10 rounded-2xl py-3.5 px-6 w-fit mx-auto mb-8 font-mono text-xl font-black text-[var(--aurora-3)] tracking-[0.2em] shadow-inner"
                      >
                        {successData.code}
                      </motion.div>

                      <div className="space-y-3">
                        <motion.a
                          href={successData.waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 text-black font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_12px_24px_rgba(46,213,115,0.25)] transition-all"
                        >
                          <Phone size={14} fill="black" /> {t('KONFIRMASI VIA WHATSAPP')}
                        </motion.a>
                        
                        <motion.button
                          onClick={handleReset}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 hover:border-white/20 font-black text-xs uppercase tracking-widest transition-all"
                        >
                          {t('BUAT LAPORAN LAIN')}
                        </motion.button>
                      </div>
                    </motion.div>
                  ) : !selectedService ? (
                    /* Service Options Menu */
                    <div className="space-y-4">
                      <div className="text-center py-2">
                        <h2 className="text-lg font-black text-white tracking-wide">{t('Ada yang bisa kami bantu?')}</h2>
                        <p className="text-xs text-gray-500 mt-1">{t('Pilih salah satu menu layanan di bawah ini')}</p>
                      </div>

                      <div className="space-y-4">
                        {SERVICE_TYPES.map(service => (
                          <motion.button
                            key={service.id}
                            onClick={() => setSelectedService(service.id)}
                            whileHover={{ scale: 1.03, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            className={`w-full p-5 rounded-[28px] bg-gradient-to-br ${service.gradient} border border-white/5 hover:border-white/20 text-left transition-all group flex items-start gap-4 shadow-lg`}
                          >
                            <div className="p-4 bg-black/40 rounded-2xl group-hover:scale-110 transition-all border border-white/5">
                              {service.icon}
                            </div>
                            <div>
                              <h4 className="text-base font-bold text-white tracking-wide group-hover:text-white transition-colors">{service.label}</h4>
                              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed opacity-75">{service.desc}</p>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Specific Form Submission */
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="glass-panel p-6 border border-white/10 bg-[#14151A]/85 backdrop-blur-xl rounded-[32px] shadow-2xl space-y-6"
                    >
                      {/* Header Form */}
                      <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <motion.button 
                          onClick={() => setSelectedService(null)}
                          whileHover={{ scale: 1.05, x: -2 }}
                          whileTap={{ scale: 0.95 }}
                          className="flex items-center gap-1.5 text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest transition-colors"
                        >
                          <ArrowLeft size={12} /> {t('Kembali')}
                        </motion.button>
                        <span className="text-xs font-serif font-black text-[var(--aurora-3)] uppercase tracking-[0.15em]">
                          {SERVICE_TYPES.find(s => s.id === selectedService)?.label}
                        </span>
                      </div>

                      {/* Shared Identity Fields */}
                      <div className="space-y-4">
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black border-l-2 border-[var(--aurora-3)] pl-2">{t('DATA DIRI PELAPOR')}</div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold ml-1 block mb-1.5">{t('Nama Lengkap')}</label>
                            <div className="relative">
                              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 w-4 h-4" />
                              <input 
                                required 
                                value={identity.name} 
                                onChange={e => setIdentity({ ...identity, name: e.target.value })} 
                                type="text" 
                                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-[var(--aurora-3)] focus:shadow-[0_0_15px_rgba(0,201,255,0.15)] transition-all placeholder:text-gray-700" 
                                placeholder={t("Nama Anda...")} 
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold ml-1 block mb-1.5">{t('No. Telepon / WA')}</label>
                            <div className="relative">
                              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 w-4 h-4" />
                              <input 
                                required 
                                value={identity.phone} 
                                onChange={e => setIdentity({ ...identity, phone: e.target.value })} 
                                type="tel" 
                                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-[var(--aurora-3)] focus:shadow-[0_0_15px_rgba(0,201,255,0.15)] transition-all placeholder:text-gray-700" 
                                placeholder={t("Contoh: 0812...")} 
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold ml-1 block mb-1.5">{t('Nomor Unit / Ruang / Lokasi')}</label>
                          <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 w-4 h-4" />
                            <input 
                              required 
                              value={identity.location} 
                              onChange={e => setIdentity({ ...identity, location: e.target.value })} 
                              type="text" 
                              className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-[var(--aurora-3)] focus:shadow-[0_0_15px_rgba(0,201,255,0.15)] transition-all placeholder:text-gray-700" 
                              placeholder={t("Contoh: Unit 12B / Ruang Rapat Lt. 3")} 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Form 1: Incident Form */}
                      {selectedService === 'incident' && (
                        <div className="space-y-5 border-t border-white/5 pt-4">
                          <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black border-l-2 border-red-500 pl-2">{t('DETAIL MASALAH')}</div>
                          
                          <div>
                            <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold ml-1 block mb-1.5">{t('Jenis Masalah')}</label>
                            <div className="relative">
                              <select 
                                value={incidentForm.incident_type} 
                                onChange={e => setIncidentForm({ ...incidentForm, incident_type: e.target.value })}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[var(--aurora-3)] transition-all appearance-none pr-10"
                              >
                                {INCIDENT_TYPES.map(type => (
                                  <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none w-4 h-4" />
                            </div>
                          </div>

                          <div>
                            <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold ml-1 block mb-1.5">{t('Tingkat Keparahan')}</label>
                            <div className="grid grid-cols-3 gap-2">
                              {['low', 'medium', 'high'].map(sev => (
                                <button
                                  key={sev}
                                  type="button"
                                  onClick={() => setIncidentForm({ ...incidentForm, severity: sev })}
                                  className={`py-2.5 px-3 text-xs font-bold rounded-xl border capitalize transition-all ${
                                    incidentForm.severity === sev 
                                      ? 'bg-red-500/10 text-red-500 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.15)]' 
                                      : 'bg-transparent text-gray-500 border-white/10 hover:border-white/20'
                                  }`}
                                >
                                  {sev === 'low' ? t('Rendah') : sev === 'medium' ? t('Sedang') : t('Tinggi')}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold ml-1 block mb-1.5">{t('Detail Laporan')}</label>
                            <textarea 
                              required 
                              value={incidentForm.description} 
                              onChange={e => setIncidentForm({ ...incidentForm, description: e.target.value })}
                              rows={3} 
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[var(--aurora-3)] focus:shadow-[0_0_15px_rgba(0,201,255,0.15)] transition-all placeholder:text-gray-700" 
                              placeholder={t("Jelaskan masalah secara detail...")}
                            />
                          </div>

                          {/* Photo upload */}
                          <div>
                            <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold ml-1 block mb-1.5">{t('Foto Kondisi (Opsional)')}</label>
                            <div className="flex items-center gap-3">
                              {incidentForm.photo_url ? (
                                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/20 shadow-md group">
                                  <img src={incidentForm.photo_url} alt="Incident Preview" className="w-full h-full object-cover" />
                                  <button 
                                    type="button"
                                    onClick={() => setIncidentForm({ ...incidentForm, photo_url: '' })}
                                    className="absolute top-1 right-1 p-1 rounded-full bg-black/80 hover:bg-black text-gray-400 hover:text-white transition-colors"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : (
                                <div className="grid grid-cols-2 gap-3 w-full">
                                  <label className="flex flex-col items-center justify-center py-5 px-3 border border-dashed border-white/15 rounded-xl cursor-pointer hover:bg-white/[0.02] hover:border-[var(--aurora-3)]/30 transition-all text-center">
                                    {uploading ? (
                                      <Loader2 size={18} className="animate-spin text-[var(--aurora-3)]" />
                                    ) : (
                                      <>
                                        <Camera size={18} className="text-[var(--aurora-3)] mb-1" />
                                        <span className="text-[9px] text-white font-bold uppercase tracking-wider">{t('KAMERA')}</span>
                                        <span className="text-[7px] text-gray-500 mt-0.5">{t('Ambil foto')}</span>
                                      </>
                                    )}
                                    <input 
                                      type="file" 
                                      accept="image/*" 
                                      capture="environment"
                                      onChange={e => handlePhotoUpload(e, 'incident')} 
                                      className="hidden" 
                                      disabled={uploading}
                                    />
                                  </label>

                                  <label className="flex flex-col items-center justify-center py-5 px-3 border border-dashed border-white/15 rounded-xl cursor-pointer hover:bg-white/[0.02] hover:border-[var(--aurora-3)]/30 transition-all text-center">
                                    {uploading ? (
                                      <Loader2 size={18} className="animate-spin text-[var(--aurora-3)]" />
                                    ) : (
                                      <>
                                        <Plus size={18} className="text-gray-500 mb-1" />
                                        <span className="text-[9px] text-white font-bold uppercase tracking-wider">{t('GALERI')}</span>
                                        <span className="text-[7px] text-gray-500 mt-0.5">{t('Pilih dari album')}</span>
                                      </>
                                    )}
                                    <input 
                                      type="file" 
                                      accept="image/*" 
                                      onChange={e => handlePhotoUpload(e, 'incident')} 
                                      className="hidden" 
                                      disabled={uploading}
                                    />
                                  </label>
                                </div>
                              )}
                            </div>
                          </div>

                          <motion.button
                            onClick={submitIncident}
                            disabled={submitting}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_12px_24px_rgba(239,68,68,0.25)] transition-all disabled:opacity-50"
                          >
                            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={12} />}
                            {t('KIRIM LAPORAN')}
                          </motion.button>
                        </div>
                      )}

                      {/* Form 2: Booking Form */}
                      {selectedService === 'booking' && (
                        <div className="space-y-5 border-t border-white/5 pt-4">
                          <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black border-l-2 border-[var(--aurora-3)] pl-2">{t('DETAIL PEMESANAN')}</div>
                          
                          {loadingFacilities ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 size={20} className="animate-spin text-[var(--aurora-3)]" />
                            </div>
                          ) : (
                            <div>
                              <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold ml-1 block mb-1.5">{t('Pilih Fasilitas')}</label>
                              <div className="relative">
                                <select 
                                  value={bookingForm.facility_id} 
                                  onChange={e => setBookingForm({ ...bookingForm, facility_id: e.target.value })}
                                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[var(--aurora-3)] transition-all appearance-none pr-10"
                                >
                                  <option value="">-- Pilih Ruang/Kendaraan/Alat --</option>
                                  {facilities.map(fac => (
                                    <option key={fac.id} value={fac.id}>{fac.name} {fac.location ? `(${fac.location})` : ''}</option>
                                  ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none w-4 h-4" />
                              </div>
                            </div>
                          )}

                          <div>
                            <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold ml-1 block mb-1.5">{t('Tanggal Reservasi')}</label>
                            <input 
                              required 
                              value={bookingForm.booking_date} 
                              onChange={e => setBookingForm({ ...bookingForm, booking_date: e.target.value })}
                              type="date" 
                              min={new Date().toISOString().split('T')[0]}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[var(--aurora-3)] transition-all" 
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold ml-1 block mb-1.5">{t('Waktu Mulai')}</label>
                              <input 
                                required 
                                value={bookingForm.start_time} 
                                onChange={e => setBookingForm({ ...bookingForm, start_time: e.target.value })}
                                type="time" 
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[var(--aurora-3)] transition-all" 
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold ml-1 block mb-1.5">{t('Waktu Selesai')}</label>
                              <input 
                                required 
                                value={bookingForm.end_time} 
                                onChange={e => setBookingForm({ ...bookingForm, end_time: e.target.value })}
                                type="time" 
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[var(--aurora-3)] transition-all" 
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold ml-1 block mb-1.5">{t('Tujuan / Keperluan')}</label>
                            <textarea 
                              required 
                              value={bookingForm.purpose} 
                              onChange={e => setBookingForm({ ...bookingForm, purpose: e.target.value })}
                              rows={3} 
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[var(--aurora-3)] focus:shadow-[0_0_15px_rgba(0,201,255,0.15)] transition-all placeholder:text-gray-700" 
                              placeholder={t("Contoh: Rapat RT, Presentasi Proyek, dll...")}
                            />
                          </div>

                          <motion.button
                            onClick={submitBooking}
                            disabled={submitting}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[var(--aurora-3)] to-blue-500 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_12px_24px_rgba(0,201,255,0.25)] transition-all disabled:opacity-50"
                          >
                            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={12} />}
                            {t('KIRIM AJUAN RESERVASI')}
                          </motion.button>
                        </div>
                      )}

                      {/* Form 3: Helpdesk Form */}
                      {selectedService === 'complaint' && (
                        <TenantComplaintForm tenantId={selectedTenant?.id} tenantName={selectedTenant?.name} onSuccess={() => {
                          setSelectedService(null);
                          setActivePortalTab('progress');
                          setProgressInput(selectedTenant?.name || '');
                        }} />
                      )}
                      {selectedService === 'helpdesk' && (
                        <div className="space-y-5 border-t border-white/5 pt-4">
                          <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black border-l-2 border-[var(--warning)] pl-2">{t('DETAIL PERMINTAAN TIKET')}</div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold ml-1 block mb-1.5">{t('Kategori Tiket')}</label>
                              <div className="relative">
                                <select 
                                  value={helpdeskForm.category} 
                                  onChange={e => setHelpdeskForm({ ...helpdeskForm, category: e.target.value })}
                                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[var(--aurora-3)] transition-all appearance-none pr-10"
                                >
                                  {HELPDESK_CATEGORIES.map(cat => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                  ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none w-4 h-4" />
                              </div>
                            </div>
                            <div>
                              <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold ml-1 block mb-1.5">{t('Prioritas Tiket')}</label>
                              <div className="relative">
                                <select 
                                  value={helpdeskForm.priority} 
                                  onChange={e => setHelpdeskForm({ ...helpdeskForm, priority: e.target.value })}
                                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[var(--aurora-3)] transition-all appearance-none pr-10"
                                >
                                  <option value="low">{t('Rendah')}</option>
                                  <option value="medium">{t('Sedang')}</option>
                                  <option value="high">{t('Tinggi')}</option>
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none w-4 h-4" />
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold ml-1 block mb-1.5">{t('Subjek Singkat')}</label>
                            <input 
                              required 
                              value={helpdeskForm.subject} 
                              onChange={e => setHelpdeskForm({ ...helpdeskForm, subject: e.target.value })}
                              type="text" 
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[var(--aurora-3)] focus:shadow-[0_0_15px_rgba(0,201,255,0.15)] transition-all placeholder:text-gray-700" 
                              placeholder={t("Subjek / Judul Masalah...")} 
                            />
                          </div>

                          <div>
                            <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold ml-1 block mb-1.5">{t('Deskripsi Masalah')}</label>
                            <textarea 
                              required 
                              value={helpdeskForm.description} 
                              onChange={e => setHelpdeskForm({ ...helpdeskForm, description: e.target.value })}
                              rows={3} 
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[var(--aurora-3)] focus:shadow-[0_0_15px_rgba(0,201,255,0.15)] transition-all placeholder:text-gray-700" 
                              placeholder={t("Jelaskan permintaan bantuan atau masalah logistik Anda...")}
                            />
                          </div>

                          {/* Photo upload */}
                          <div>
                            <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold ml-1 block mb-1.5">{t('Foto Kondisi (Opsional)')}</label>
                            <div className="flex items-center gap-3">
                              {helpdeskForm.photo_url ? (
                                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/20 shadow-md group">
                                  <img src={helpdeskForm.photo_url} alt="Helpdesk Preview" className="w-full h-full object-cover" />
                                  <button 
                                    type="button"
                                    onClick={() => setHelpdeskForm({ ...helpdeskForm, photo_url: '' })}
                                    className="absolute top-1 right-1 p-1 rounded-full bg-black/80 hover:bg-black text-gray-400 hover:text-white transition-colors"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : (
                                <div className="grid grid-cols-2 gap-3 w-full">
                                  <label className="flex flex-col items-center justify-center py-5 px-3 border border-dashed border-white/15 rounded-xl cursor-pointer hover:bg-white/[0.02] hover:border-[var(--warning)]/30 transition-all text-center">
                                    {uploading ? (
                                      <Loader2 size={18} className="animate-spin text-[var(--warning)]" />
                                    ) : (
                                      <>
                                        <Camera size={18} className="text-[var(--warning)] mb-1" />
                                        <span className="text-[9px] text-white font-bold uppercase tracking-wider">{t('KAMERA')}</span>
                                        <span className="text-[7px] text-gray-500 mt-0.5">{t('Ambil foto')}</span>
                                      </>
                                    )}
                                    <input 
                                      type="file" 
                                      accept="image/*" 
                                      capture="environment"
                                      onChange={e => handlePhotoUpload(e, 'helpdesk')} 
                                      className="hidden" 
                                      disabled={uploading}
                                    />
                                  </label>

                                  <label className="flex flex-col items-center justify-center py-5 px-3 border border-dashed border-white/15 rounded-xl cursor-pointer hover:bg-white/[0.02] hover:border-[var(--warning)]/30 transition-all text-center">
                                    {uploading ? (
                                      <Loader2 size={18} className="animate-spin text-[var(--warning)]" />
                                    ) : (
                                      <>
                                        <Plus size={18} className="text-gray-500 mb-1" />
                                        <span className="text-[9px] text-white font-bold uppercase tracking-wider">{t('GALERI')}</span>
                                        <span className="text-[7px] text-gray-500 mt-0.5">{t('Pilih dari album')}</span>
                                      </>
                                    )}
                                    <input 
                                      type="file" 
                                      accept="image/*" 
                                      onChange={e => handlePhotoUpload(e, 'helpdesk')} 
                                      className="hidden" 
                                      disabled={uploading}
                                    />
                                  </label>
                                </div>
                              )}
                            </div>
                          </div>

                          <motion.button
                            onClick={submitHelpdesk}
                            disabled={submitting}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[var(--warning)] to-yellow-600 hover:from-yellow-500 text-black font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_12px_24px_rgba(241,196,15,0.25)] transition-all disabled:opacity-50"
                          >
                            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={12} />}
                            {t('KIRIM TIKET BANTUAN')}
                          </motion.button>
                        </div>
                      )}

                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* PORTAL TAB 2: TRACK PROGRESS */}
              {activePortalTab === 'progress' && (
                <motion.div
                  key="progress-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="glass-panel p-6 border border-white/10 bg-[#14151A]/85 backdrop-blur-xl rounded-[32px] shadow-2xl space-y-6">
                    <div className="text-center py-2">
                      <h2 className="text-lg font-black text-white tracking-wide">{t('Lacak Progres Laporan')}</h2>
                      <p className="text-xs text-gray-500 mt-1">{t('Masukkan nomor WhatsApp atau Kode Referensi Tiket Anda')}</p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold ml-1 block mb-1.5">{t('WhatsApp / Kode Tiket')}</label>
                        <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 w-4 h-4" />
                          <input 
                            value={progressInput}
                            onChange={e => setProgressInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCheckProgress()}
                            type="text"
                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-sm text-white outline-none focus:border-[var(--aurora-3)] focus:shadow-[0_0_15px_rgba(0,201,255,0.15)] transition-all placeholder:text-gray-700" 
                            placeholder={t("Contoh: 0812... / INC-123456")} 
                          />
                        </div>
                      </div>

                      <motion.button
                        onClick={handleCheckProgress}
                        disabled={loadingProgress}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_12px_24px_rgba(142,45,226,0.25)] transition-all"
                      >
                        {loadingProgress ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={12} />
                        )}
                        {t('CEK STATUS LAYANAN')}
                      </motion.button>
                    </div>
                  </div>

                  {/* Results list */}
                  {progressResults.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black ml-1">
                        {t('DITEMUKAN')} {progressResults.length} {t('LAPORAN AKTIF UNTUK')} "{searchedQuery}"
                      </p>

                      <div className="space-y-3">
                        {progressResults.map((result, idx) => (
                          <motion.div
                            key={result.id + '-' + idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="p-5 bg-[#14151A]/80 border border-white/5 hover:border-white/10 rounded-2xl shadow-lg space-y-3"
                          >
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 bg-white/5 border border-white/5 px-2 py-1 rounded">
                                  {result.type}
                                </span>
                                <span className="text-[10px] text-gray-600 font-mono">{result.date}</span>
                              </div>
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${result.colorClass}`}>
                                {result.status}
                              </span>
                            </div>

                            <div>
                              <h4 className="text-sm font-bold text-white tracking-wide">{result.title}</h4>
                              <p className="text-xs text-gray-400 mt-1 leading-relaxed opacity-75">{result.details}</p>
                            </div>

                            {/* Corrective Action / Resolutions details */}
                            {(result.correctiveAction || result.actionPic) && (
                              <div className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-1.5">
                                <div className="flex items-center gap-1.5 text-[8px] text-[var(--aurora-3)] font-black uppercase tracking-widest">
                                  <Info size={10} />
                                  <span>{t('TINDAK LANJUT PETUGAS')}</span>
                                </div>
                                {result.correctiveAction && (
                                  <p className="text-xs text-gray-300 font-medium leading-relaxed">
                                    "{result.correctiveAction}"
                                  </p>
                                )}
                                {result.actionPic && (
                                  <p className="text-[9px] text-gray-500">
                                    {t('Petugas Penanggung Jawab:')} <span className="text-white font-bold">{result.actionPic}</span>
                                  </p>
                                )}
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
