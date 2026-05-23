/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#0B0C10] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-3)] p-[3px] mx-auto mb-8 shadow-[0_0_40px_rgba(142,45,226,0.3)]">
          <div className="w-full h-full bg-[#0B0C10] rounded-[21px] flex items-center justify-center">
            <span className="text-4xl font-serif font-bold text-white">?</span>
          </div>
        </div>
        <h1 className="text-4xl font-serif font-bold text-white mb-3">404</h1>
        <p className="text-sm text-gray-400 mb-8">Halaman yang Anda cari tidak ditemukan.</p>
        <button onClick={() => navigate('/')} className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2 mx-auto shadow-lg hover:shadow-purple-500/30 transition-all">
          <Home size={16} /> Kembali ke Beranda
        </button>
      </div>
    </div>
  );
};

export default NotFound;
