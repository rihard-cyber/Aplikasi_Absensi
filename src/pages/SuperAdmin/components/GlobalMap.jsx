import React from 'react';

const GlobalMap = () => {
  return (
    <div className="w-full h-full bg-[#050505] flex items-center justify-center relative overflow-hidden">
      {/* 1. Global Grid - Full Coverage */}
      <div className="absolute inset-0 opacity-20" 
           style={{ 
             backgroundImage: 'linear-gradient(#1E90FF 1px, transparent 1px), linear-gradient(90deg, #1E90FF 1px, transparent 1px)', 
             backgroundSize: '30px 30px' 
           }}>
      </div>
      
      {/* 2. World Map Silhouette - To fill the 'empty' space */}
      <div className="absolute inset-0 opacity-10 flex items-center justify-center p-10">
        <svg viewBox="0 0 1000 500" className="w-full h-full text-blue-500 fill-current">
          <path d="M150,150 L180,140 L220,160 L250,150 L280,180 L250,220 L200,210 L150,190 Z M400,100 L450,90 L500,110 L550,100 L580,130 L550,180 L480,200 L420,180 Z M700,200 L750,190 L800,220 L820,280 L780,320 L720,310 L680,260 Z M200,350 L250,340 L300,370 L320,420 L280,450 L220,440 L180,400 Z" />
          {/* Simplified world map shapes */}
          <circle cx="500" cy="250" r="200" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="5,5" />
        </svg>
      </div>

      {/* 3. Radar Scanning Effect */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[80%] h-[80%] border border-blue-500/20 rounded-full animate-[ping_3s_linear_infinite]"></div>
        <div className="w-[60%] h-[60%] border border-blue-500/10 rounded-full animate-[ping_4s_linear_infinite]"></div>
        {/* Scanning Line */}
        <div className="absolute top-0 left-1/2 w-[1px] h-full bg-gradient-to-b from-transparent via-blue-500 to-transparent opacity-20 animate-[spin_10s_linear_infinite] origin-center"></div>
      </div>

      <div className="text-center z-10">
        <GlobeIcon />
        <div className="mt-4">
          <p className="text-[10px] text-blue-400 font-mono tracking-[0.5em] animate-pulse uppercase">Satellite Uplink Active</p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="w-1 h-1 bg-red-500 rounded-full animate-ping"></span>
            <p className="text-[9px] text-gray-500 font-mono uppercase">Scanning Global Assets...</p>
          </div>
        </div>
      </div>
      
      {/* 4. Real-time Nodes (Animated Blips) */}
      <div className="absolute top-[20%] left-[30%] group">
        <div className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_15px_red] animate-pulse"></div>
        <div className="absolute -top-6 -left-4 hidden group-hover:block bg-black/80 text-[8px] px-2 py-1 border border-red-500/50 rounded text-red-400 whitespace-nowrap">Threat Detected</div>
      </div>
      <div className="absolute bottom-[30%] right-[20%]">
        <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_15px_#10b981] animate-pulse" style={{ animationDelay: '1.2s' }}></div>
      </div>
      <div className="absolute top-[40%] right-[35%]">
        <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_15px_#3b82f6] animate-pulse" style={{ animationDelay: '0.7s' }}></div>
      </div>
    </div>
  );
};

const GlobeIcon = () => (
  <svg className="w-12 h-12 mx-auto text-blue-500 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default GlobalMap;
