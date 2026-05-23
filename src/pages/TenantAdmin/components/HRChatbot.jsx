/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, X, RefreshCw, User, Sparkles, BookOpen, Clock, ChevronDown, Loader2 } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';

/**
 * HRChatbot — AI Asisten HR
 * 
 * Chatbot berbasis rule-based + LLM (opsional) untuk menjawab
 * pertanyaan umum karyawan seputar kebijakan HR perusahaan.
 * 
 * ARSITEKTUR:
 * 1. Rule-based FAQ (instant, offline) — untuk pertanyaan umum
 * 2. Context injection dari company_policies di Supabase
 * 3. Opsional: Google Gemini / OpenAI API untuk jawaban dinamis
 *
 * SETUP LLM (opsional):
 * Tambahkan VITE_GEMINI_API_KEY ke .env untuk mengaktifkan mode AI penuh.
 */

// ─── FAQ RULES (Built-in Knowledge) ─────────────────────────────────────────
const FAQ_RULES = [
  {
    patterns: [/cuti|libur|leave|izin/i],
    answer: `**Kebijakan Cuti** 📅\n\n- Cuti tahunan: **12 hari per tahun** (accrued per bulan)\n- Cuti sakit: Tidak terbatas dengan surat dokter\n- Cuti melahirkan: **90 hari** (PP No. 78/2015)\n- Pengajuan cuti minimal **3 hari kerja** sebelumnya\n- Cuti darurat: Maks 2 hari, diajukan via sistem\n\nUntuk mengajukan cuti, gunakan menu **Absensi Saya → Pengajuan Cuti**.`,
  },
  {
    patterns: [/gaji|salary|upah|payroll|slip/i],
    answer: `**Informasi Penggajian** 💰\n\n- Gaji dibayarkan setiap **tanggal 25** setiap bulan\n- Slip gaji tersedia di menu **Profil → Slip Gaji** mulai tanggal 24\n- Komponen: Gaji Pokok + Tunjangan - Potongan (BPJS + PPh 21)\n- Revisi gaji diajukan melalui atasan langsung ke HRD\n\nPertanyaan lebih lanjut? Hubungi tim payroll di ext. **1001**.`,
  },
  {
    patterns: [/lembur|overtime|kerja lebih/i],
    answer: `**Kebijakan Lembur** ⏱️\n\n- Lembur harus mendapat persetujuan atasan SEBELUM dilakukan\n- Tarif lembur mengacu **UU Ketenagakerjaan No. 13/2003**:\n  - Jam pertama: 1,5× upah/jam\n  - Jam berikutnya: 2× upah/jam\n- Lembur dihari libur: 2× (hari kerja biasa) atau 3× (hari raya)\n- Klaim lembur diajukan paling lambat **H+3**.`,
  },
  {
    patterns: [/bpjs|asuransi|kesehatan|ketenagakerjaan/i],
    answer: `**BPJS & Asuransi** 🛡️\n\n**BPJS Ketenagakerjaan:**\n- JHT: Karyawan 2% + Perusahaan 3.7%\n- JP: Karyawan 1% + Perusahaan 2%\n- JKK: Perusahaan 0.24% - 1.74%\n- JKM: Perusahaan 0.3%\n\n**BPJS Kesehatan:**\n- Karyawan: 1% dari gaji\n- Perusahaan: 4% dari gaji (max Rp 12 juta)\n\nKartu BPJS dapat diambil di bagian HRD.`,
  },
  {
    patterns: [/pph|pajak|npwp|1721/i],
    answer: `**Informasi Pajak PPh 21** 📋\n\n- PPh 21 dihitung dari penghasilan bruto dikurangi PTKP dan biaya jabatan\n- PTKP 2024: TK/0 = Rp 54 juta/tahun, K/0 = Rp 58,5 juta/tahun\n- Tarif progresif: 5% → 15% → 25% → 30% → 35%\n- Form 1721-A1 (Bukti Potong) tersedia di akhir tahun via HRD\n- Tanpa NPWP dikenakan tarif +20%\n\nGunakan menu **Form 1721-A1** untuk melihat kalkulasi pajak Anda.`,
  },
  {
    patterns: [/absen|presensi|check.?in|hadir|masuk/i],
    answer: `**Panduan Absensi** 📍\n\n- Jam masuk: Sesuai shift yang ditentukan atasan\n- Metode: QR Code / GPS Check-in / Face Verification\n- Toleransi keterlambatan: 15 menit (setelah itu dihitung terlambat)\n- Absen dari luar area: Wajib menggunakan lokasi GPS yang valid\n- Lupa absen: Laporkan ke HRD pada hari yang sama via sistem\n\nUntuk absen, akses menu **Absensi Saya** di halaman utama.`,
  },
  {
    patterns: [/reimburs|klaim|expense|tagihan/i],
    answer: `**Kebijakan Reimbursement** 📄\n\n- Pengajuan paling lambat **14 hari kerja** setelah pengeluaran\n- Wajib melampirkan bukti (nota/invoice/kuitansi)\n- Limit: Sesuai kategori (Transportasi, Makan, Akomodasi, dll)\n- Proses persetujuan: Max 5 hari kerja\n- Pembayaran: Bersama dengan gaji bulan berikutnya\n\nAjukan di menu **Reimbursemen** pada aplikasi.`,
  },
  {
    patterns: [/pinjam|loan|kasbon|advance/i],
    answer: `**Kebijakan Pinjaman Karyawan** 💳\n\n- Eligible setelah bekerja minimal **6 bulan**\n- Maksimal pinjaman: 2× gaji bulanan\n- Cicilan: Max 10 bulan, dipotong langsung dari gaji\n- Bunga: **0%** (fasilitas internal perusahaan)\n- Satu pinjaman aktif per karyawan\n\nAjukan melalui menu **Pinjaman** di aplikasi atau langsung ke HRD.`,
  },
  {
    patterns: [/training|pelatihan|workshop|kursus/i],
    answer: `**Program Pelatihan & Pengembangan** 📚\n\n- Pelatihan internal: Jadwal diumumkan melalui Pengumuman\n- Pelatihan eksternal: Diajukan via atasan → HRD → Manajemen\n- Budget pelatihan: Tersedia untuk semua karyawan (sesuai posisi)\n- e-Learning: Tersedia di platform internal perusahaan\n\nLihat jadwal pelatihan di menu **Acara Perusahaan**.`,
  },
  {
    patterns: [/kontak|hrd|hr|telepon|email|hubungi/i],
    answer: `**Kontak Tim HR** 📞\n\n- 📧 Email: hrd@perusahaan.com\n- ☎️ Ext: 1001 (Payroll), 1002 (Rekrutmen), 1003 (Umum)\n- 🕐 Jam Layanan: Senin-Jumat 08:00-17:00 WIB\n- 📍 Lokasi: Lantai 2, Gedung A\n- 💬 Whatsapp HRD: Lihat papan pengumuman\n\nUntuk kebutuhan mendesak, hubungi langsung via telepon.`,
  },
];

const findAnswer = (question) => {
  const q = question.toLowerCase();
  for (const rule of FAQ_RULES) {
    if (rule.patterns.some(p => p.test(q))) return rule.answer;
  }
  return null;
};

// LLM Integration (opsional via Gemini)
const askGemini = async (question, context) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Kamu adalah asisten HR profesional perusahaan Indonesia. Jawab pertanyaan karyawan dengan ramah, singkat, dan akurat dalam Bahasa Indonesia.

KONTEKS KEBIJAKAN PERUSAHAAN:
${context || 'Tidak ada informasi tambahan.'}

PERTANYAAN KARYAWAN:
${question}

Berikan jawaban yang helpful, praktis, dan sesuai regulasi ketenagakerjaan Indonesia. Jika tidak tahu, arahkan ke tim HRD.`
        }]
      }],
      generationConfig: { maxOutputTokens: 500, temperature: 0.4 }
    })
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
};

// Markdown renderer (basic)
const renderMarkdown = (text) => {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-white/10 px-1 rounded text-[var(--aurora-3)]">$1</code>')
    .replace(/\n/g, '<br/>');
};

const QUICK_QUESTIONS = [
  'Bagaimana cara mengajukan cuti?',
  'Kapan gaji dibayarkan?',
  'Berapa iuran BPJS saya?',
  'Cara klaim reimbursement?',
  'Kebijakan lembur?',
];

const HRChatbot = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'bot',
      text: 'Halo! 👋 Saya **Asisten HR** yang siap membantu Anda.\n\nSaya dapat menjawab pertanyaan seputar:\n- **Cuti & izin** | **Gaji & payroll** | **BPJS & asuransi**\n- **Absensi** | **Lembur** | **Reimbursement** | dan lainnya\n\nSilakan ketik pertanyaan Anda di bawah! 😊',
      ts: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [companyContext, setCompanyContext] = useState('');
  const messagesEnd = useRef(null);

  useEffect(() => {
    // Load company policies as context
    const loadContext = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_id', session.user.id).maybeSingle();
        if (!profile?.tenant_id) return;
        const { data: policies } = await supabase.from('company_policies')
          .select('title, content').eq('tenant_id', profile.tenant_id).eq('is_active', true).limit(5);
        if (policies?.length) {
          const ctx = policies.map(p => `== ${p.title} ==\n${p.content}`).join('\n\n');
          setCompanyContext(ctx);
        }
      } catch {}
    };
    loadContext();
  }, []);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text = input) => {
    const q = text.trim();
    if (!q || loading) return;
    setInput('');
    setLoading(true);

    const userMsg = { id: Date.now(), role: 'user', text: q, ts: new Date() };
    setMessages(prev => [...prev, userMsg]);

    // Typing indicator
    const typingId = Date.now() + 1;
    setMessages(prev => [...prev, { id: typingId, role: 'typing', ts: new Date() }]);

    let answer = findAnswer(q);

    if (!answer) {
      // Try Gemini if key exists
      const geminiAnswer = await askGemini(q, companyContext).catch(() => null);
      answer = geminiAnswer || '❓ Maaf, saya belum menemukan jawaban untuk pertanyaan ini dalam basis data kebijakan saya.\n\nSilakan hubungi tim HRD langsung:\n- 📧 hrd@perusahaan.com\n- ☎️ Ext. 1001-1003\n- 🕐 Senin-Jumat, 08:00-17:00 WIB';
    }

    // Remove typing, add answer
    setTimeout(() => {
      setMessages(prev => prev.filter(m => m.id !== typingId).concat([
        { id: Date.now(), role: 'bot', text: answer, ts: new Date() }
      ]));
      setLoading(false);
    }, 600);
  };

  const hasGemini = !!import.meta.env.VITE_GEMINI_API_KEY;

  return (
    <div className="flex flex-col max-w-3xl animate-fade-in" style={{ height: 'calc(100vh - 160px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-serif font-bold text-white">AI Asisten HR</h2>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
              <p className="text-[10px] text-gray-400">{hasGemini ? 'Gemini AI + Rule-based' : 'Rule-based FAQ'} • {FAQ_RULES.length} topik tersedia</p>
            </div>
          </div>
        </div>
        <button onClick={() => setMessages(prev => [prev[0]])}
          className="p-2 bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white rounded-xl transition-all">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${msg.role === 'bot' || msg.role === 'typing'
                ? 'bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)]'
                : 'bg-white/10'}`}>
                {msg.role === 'bot' || msg.role === 'typing' ? <Bot size={14} className="text-white" /> : <User size={14} className="text-gray-300" />}
              </div>

              {/* Bubble */}
              {msg.role === 'typing' ? (
                <div className="glass-panel px-4 py-3 rounded-2xl rounded-tl-none border border-white/5">
                  <div className="flex gap-1 items-center h-4">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                  ? 'bg-[var(--aurora-3)]/20 border border-[var(--aurora-3)]/30 text-white rounded-tr-none'
                  : 'glass-panel border border-white/5 text-gray-200 rounded-tl-none'}`}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEnd} />
      </div>

      {/* Quick Questions */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {QUICK_QUESTIONS.map(q => (
          <button key={q} onClick={() => sendMessage(q)}
            className="flex-shrink-0 px-3 py-1.5 text-[10px] font-medium bg-white/5 border border-white/10 hover:border-white/20 text-gray-400 hover:text-white rounded-full transition-all whitespace-nowrap">
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="mt-3 flex gap-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Tanyakan kebijakan HR, gaji, cuti, BPJS..."
          className="flex-1 bg-[#0B0C10] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-[var(--aurora-3)] placeholder-gray-600"
          disabled={loading}
        />
        <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
          className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center text-white disabled:opacity-40 hover:opacity-90 transition-all flex-shrink-0">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
};

export default HRChatbot;
