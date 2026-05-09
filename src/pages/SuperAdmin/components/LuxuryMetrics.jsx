import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Jan', tenants: 10, users: 400 },
  { name: 'Feb', tenants: 15, users: 800 },
  { name: 'Mar', tenants: 25, users: 1500 },
  { name: 'Apr', tenants: 45, users: 3200 },
  { name: 'Mei', tenants: 70, users: 6500 },
];

const LuxuryMetrics = () => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8E2DE2" stopOpacity={0.6}/>
            <stop offset="95%" stopColor="#00C9FF" stopOpacity={0}/>
          </linearGradient>
          <filter id="neonGlow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="name" stroke="#94A3B8" tick={{ fill: '#94A3B8', fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis stroke="#94A3B8" tick={{ fill: '#94A3B8', fontSize: 12 }} tickLine={false} axisLine={false} />
        <Tooltip 
          contentStyle={{ backgroundColor: 'rgba(11, 12, 16, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(10px)', color: '#fff' }}
          itemStyle={{ color: '#00C9FF', fontWeight: 'bold' }}
        />
        <Area 
          type="monotone" 
          dataKey="users" 
          stroke="#00C9FF" 
          strokeWidth={4}
          fillOpacity={1} 
          fill="url(#colorUsers)" 
          style={{ filter: 'url(#neonGlow)' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default LuxuryMetrics;
