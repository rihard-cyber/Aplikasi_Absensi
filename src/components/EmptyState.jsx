import React from 'react';
import { Inbox } from 'lucide-react';

const EmptyState = ({ icon, title, description, action, actionLabel, onAction }) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4 border border-white/10">
      {icon || <Inbox size={28} className="text-gray-500" />}
    </div>
    <h3 className="text-sm font-bold text-gray-400 mb-1">{title || 'Tidak ada data'}</h3>
    <p className="text-xs text-gray-600 max-w-xs mb-6">{description || 'Belum ada data yang tersedia untuk ditampilkan.'}</p>
    {action && (
      <button onClick={onAction} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-[10px] font-bold uppercase tracking-widest hover:shadow-lg transition-all">
        {actionLabel || 'Tambah Data'}
      </button>
    )}
  </div>
);

export default EmptyState;
