import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, RefreshCw, User, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../utils/supabaseClient';

/**
 * HRChatbot — AI Asisten HR
 * 
 * Chatbot berbasis rule-based + LLM (opsional) untuk menjawab
 * pertanyaan umum karyawan seputar kebijakan HR perusahaan.
 */

// ─── FAQ RULES (Built-in Knowledge Keys) ─────────────────────────────────────────
const FAQ_RULES = [
  {
    patterns: [/cuti|libur|leave|izin/i],
    answerKey: 'chatbot.faqCuti',
  },
  {
    patterns: [/gaji|salary|upah|payroll|slip/i],
    answerKey: 'chatbot.faqGaji',
  },
  {
    patterns: [/lembur|overtime|kerja lebih/i],
    answerKey: 'chatbot.faqLembur',
  },
  {
    patterns: [/bpjs|asuransi|kesehatan|ketenagakerjaan/i],
    answerKey: 'chatbot.faqBpjs',
  },
  {
    patterns: [/pph|pajak|npwp|1721/i],
    answerKey: 'chatbot.faqPph',
  },
  {
    patterns: [/absen|presensi|check.?in|hadir|masuk/i],
    answerKey: 'chatbot.faqAbsen',
  },
  {
    patterns: [/reimburs|klaim|expense|tagihan/i],
    answerKey: 'chatbot.faqReimburs',
  },
  {
    patterns: [/pinjam|loan|kasbon|advance/i],
    answerKey: 'chatbot.faqPinjam',
  },
  {
    patterns: [/training|pelatihan|workshop|kursus/i],
    answerKey: 'chatbot.faqTraining',
  },
  {
    patterns: [/kontak|hrd|hr|telepon|email|hubungi/i],
    answerKey: 'chatbot.faqKontak',
  },
];

const findAnswer = (question) => {
  const q = question.toLowerCase();
  for (const rule of FAQ_RULES) {
    if (rule.patterns.some(p => p.test(q))) return rule.answerKey;
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

const escapeHTML = (text) => {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Markdown renderer (basic & secured against XSS)
const renderMarkdown = (text) => {
  const escaped = escapeHTML(text);
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-white/10 px-1 rounded text-[var(--aurora-3)]">$1</code>')
    .replace(/\n/g, '<br/>');
};

const QUICK_QUESTIONS_KEYS = [
  'chatbot.q1',
  'chatbot.q2',
  'chatbot.q3',
  'chatbot.q4',
  'chatbot.q5',
];

const HRChatbot = () => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'bot',
      text: 'chatbot.welcome',
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
      answer = geminiAnswer || 'chatbot.fallback';
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

  const getMessageText = (msg) => {
    if (msg.role === 'bot' && msg.text.startsWith('chatbot.')) {
      return t(msg.text);
    }
    return msg.text;
  };

  return (
    <div className="flex flex-col max-w-3xl animate-fade-in" style={{ height: 'calc(100vh - 160px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-serif font-bold text-white">{t('chatbot.title')}</h2>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
              <p className="text-[10px] text-gray-400">
                {hasGemini ? t('chatbot.aiMode') : t('chatbot.ruleMode')} • {FAQ_RULES.length} {t('chatbot.topicsAvailable')}
              </p>
            </div>
          </div>
        </div>
        <button onClick={() => setMessages(prev => [{ ...prev[0], id: Date.now() }])}
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
              ) : msg.role === 'user' ? (
                <div className="max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed bg-[var(--aurora-3)]/20 border border-[var(--aurora-3)]/30 text-white rounded-tr-none">
                  {msg.text}
                </div>
              ) : (
                /* eslint-disable-next-line react/no-danger */
                <div className="max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed glass-panel border border-white/5 text-gray-200 rounded-tl-none"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(getMessageText(msg)) }}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEnd} />
      </div>

      {/* Quick Questions */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {QUICK_QUESTIONS_KEYS.map(qKey => (
          <button key={qKey} onClick={() => sendMessage(t(qKey))}
            className="flex-shrink-0 px-3 py-1.5 text-[10px] font-medium bg-white/5 border border-white/10 hover:border-white/20 text-gray-400 hover:text-white rounded-full transition-all whitespace-nowrap">
            {t(qKey)}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="mt-3 flex gap-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder={t('chatbot.placeholder')}
          disabled={loading}
          className="flex-1 bg-[#0B0C10] border border-white/20 rounded-2xl px-4 py-3 text-sm text-white outline-none transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
        <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
          className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] flex items-center justify-center text-white disabled:opacity-40 hover:opacity-90 transition-all flex-shrink-0">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
};

export default HRChatbot;
