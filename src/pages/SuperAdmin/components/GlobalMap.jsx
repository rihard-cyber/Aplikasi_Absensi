import React from 'react';

const GlobalMap = () => {
  return (
    <div className="w-full h-full bg-[#1a2333] flex items-center justify-center relative overflow-hidden">
      {/* Fallback visualization before React-Leaflet is installed */}
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, #1E90FF 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
      <div className="text-center z-10">
        <GlobeIcon />
        <p className="text-sm text-blue-400 mt-2 font-mono animate-pulse">Initializing Live Heatmap...</p>
      </div>
      
      {/* Simulated Heatmap blips */}
      <div className="absolute top-1/3 left-1/4 w-4 h-4 bg-red-500 rounded-full blur-md animate-pulse"></div>
      <div className="absolute top-1/2 left-2/3 w-6 h-6 bg-purple-500 rounded-full blur-md animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute bottom-1/4 right-1/4 w-3 h-3 bg-blue-500 rounded-full blur-md animate-pulse" style={{ animationDelay: '0.5s' }}></div>
    </div>
  );
};

const GlobeIcon = () => (
  <svg className="w-12 h-12 mx-auto text-blue-500 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default GlobalMap;
