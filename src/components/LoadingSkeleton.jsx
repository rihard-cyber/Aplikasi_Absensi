/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React from 'react';

const LoadingSkeleton = ({ type = 'page' }) => {
  if (type === 'card') {
    return (
      <div className="w-full glass-panel p-6 border border-white/5 animate-pulse space-y-4">
        <div className="h-4 bg-white/10 rounded w-1/3" />
        <div className="h-3 bg-white/5 rounded w-2/3" />
        <div className="h-3 bg-white/5 rounded w-1/2" />
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="w-full glass-panel p-6 border border-white/5 space-y-4">
        <div className="flex gap-4">
          <div className="h-4 bg-white/10 rounded w-1/4" />
          <div className="h-4 bg-white/10 rounded w-1/4" />
          <div className="h-4 bg-white/10 rounded w-1/4" />
          <div className="h-4 bg-white/10 rounded w-1/4" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="h-3 bg-white/5 rounded w-1/4" />
            <div className="h-3 bg-white/5 rounded w-1/4" />
            <div className="h-3 bg-white/5 rounded w-1/4" />
            <div className="h-3 bg-white/5 rounded w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'profile') {
    return (
      <div className="flex flex-col items-center gap-6 animate-pulse">
        <div className="w-28 h-28 rounded-full bg-white/10" />
        <div className="h-5 bg-white/10 rounded w-48" />
        <div className="h-3 bg-white/5 rounded w-32" />
      </div>
    );
  }

  if (type === 'stats') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-panel p-5 space-y-3">
            <div className="h-3 bg-white/10 rounded w-20" />
            <div className="h-6 bg-white/10 rounded w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="glass-panel p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-white/10 rounded w-1/3" />
              <div className="h-3 bg-white/5 rounded w-1/2" />
            </div>
            <div className="h-6 bg-white/10 rounded w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'form') {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-white/10 rounded-xl w-full" />
        <div className="h-10 bg-white/10 rounded-xl w-full" />
        <div className="h-10 bg-white/10 rounded-xl w-1/2" />
        <div className="h-24 bg-white/5 rounded-xl w-full" />
        <div className="h-12 bg-white/10 rounded-xl w-40" />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center justify-center py-16 gap-6 animate-pulse">
      <div className="w-16 h-16 rounded-full bg-white/5" />
      <div className="h-4 bg-white/10 rounded w-48" />
      <div className="h-3 bg-white/5 rounded w-64" />
    </div>
  );
};

export default LoadingSkeleton;
