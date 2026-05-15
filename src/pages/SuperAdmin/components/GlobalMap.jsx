import React from 'react';

const GlobalMap = () => {
  return (
    <div className="w-full h-full bg-[#0B0C10] flex items-center justify-center relative overflow-hidden">
      {/* Dynamic Grid Background */}
      <div className="absolute inset-0 opacity-10" 
           style={{ 
             backgroundImage: 'linear-gradient(#1E90FF 1px, transparent 1px), linear-gradient(90deg, #1E90FF 1px, transparent 1px)', 
             backgroundSize: '40px 40px' 
           }}>
      </div>
      
      {/* Radar Circles */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <div className="w-[300px] h-[300px] border border-blue-500 rounded-full animate-pulse"></div>
        <div className="absolute w-[500px] h-[500px] border border-blue-500/50 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="text-center z-10">
        <GlobeIcon />
        <p className="text-xs text-blue-400 mt-3 font-mono tracking-widest animate-pulse uppercase">Scanning Global Assets...</p>
      </div>
      
      {/* Active Points */}
      <div className="absolute top-1/4 left-1/3 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_15px_red] animate-ping"></div>
      <div className="absolute bottom-1/3 right-1/4 w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_15px_#10b981] animate-ping" style={{ animationDelay: '1.5s' }}></div>
      <div className="absolute top-1/2 right-1/3 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_15px_#3b82f6] animate-ping" style={{ animationDelay: '0.8s' }}></div>
    </div>
  );
};

const GlobeIcon = () => (
  <svg className="w-12 h-12 mx-auto text-blue-500 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default GlobalMap;
