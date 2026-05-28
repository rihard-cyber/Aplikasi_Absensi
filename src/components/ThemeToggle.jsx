import React from 'react';
import { Sun, Moon, Zap, Activity } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();

  const getIcon = () => {
    switch (theme) {
      case 'light': return <Sun size={16} className="text-orange-500" />;
      case 'aurora': return <Zap size={16} className="text-purple-400" />;
      case 'neon': return <Activity size={16} className="text-cyan-400" />;
      default: return <Moon size={16} className="text-blue-400" />;
    }
  };

  const getLabel = () => {
    switch (theme) {
      case 'light': return 'Mode Terang';
      case 'aurora': return 'Mode Aurora';
      case 'neon': return 'Mode Neon';
      default: return 'Mode Gelap';
    }
  };

  return (
    <button onClick={toggleTheme}
      className={`p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center ${className}`}
      title={getLabel()}
    >
      {getIcon()}
    </button>
  );
};

export default ThemeToggle;
