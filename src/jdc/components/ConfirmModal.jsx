import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({ show, title, message, confirmLabel = 'Hapus', cancelLabel = 'Batal', variant = 'danger', onConfirm, onCancel }) {
  if (!show) return null;

  const colors = {
    danger: { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)', btnBg: '#dc2626', btnHover: '#b91c1c' },
    warning: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)', btnBg: '#d97706', btnHover: '#b45309' },
    info: { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.4)', btnBg: '#2563eb', btnHover: '#1d4ed8' },
  };

  const c = colors[variant] || colors.danger;

  return (
    <>
      <div
        onClick={onCancel}
        style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.15s ease',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
            borderRadius: '16px', padding: '1.5rem', maxWidth: '400px', width: '90%',
            boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
            animation: 'scaleIn 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: c.bg, border: `1px solid ${c.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <AlertTriangle size={20} style={{ color: c.btnBg }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>{title}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{message}</div>
            </div>
            <button
              onClick={onCancel}
              style={{
                background: 'none', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', padding: '0.25rem', borderRadius: '6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              onClick={onCancel}
              style={{
                padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-glass)',
                background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer',
                fontWeight: 600, fontSize: '0.82rem',
              }}
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              style={{
                padding: '0.5rem 1rem', borderRadius: '8px', border: 'none',
                background: c.btnBg, color: 'white', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.82rem', minWidth: '80px',
              }}
              onMouseEnter={e => e.target.style.background = c.btnHover}
              onMouseLeave={e => e.target.style.background = c.btnBg}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </>
  );
}
