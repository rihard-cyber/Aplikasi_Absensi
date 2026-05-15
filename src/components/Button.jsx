import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2 } from 'lucide-react';

const variants = {
  primary: 'bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white shadow-lg shadow-purple-500/20',
  danger: 'bg-gradient-to-r from-[var(--danger)] to-red-600 text-white shadow-lg shadow-red-500/20',
  success: 'bg-gradient-to-r from-[var(--success)] to-emerald-500 text-black shadow-lg shadow-green-500/20',
  warning: 'bg-gradient-to-r from-[var(--warning)] to-amber-500 text-black shadow-lg shadow-yellow-500/20',
  ghost: 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 hover:text-white',
  outline: 'border border-[var(--aurora-3)]/30 text-[var(--aurora-3)] hover:bg-[var(--aurora-3)]/10',
};

const sizes = {
  sm: 'px-3 py-1.5 text-[9px] rounded-lg',
  md: 'px-4 py-2.5 text-[10px] rounded-xl',
  lg: 'px-6 py-3.5 text-xs rounded-2xl',
  xl: 'px-8 py-4 text-sm rounded-2xl',
};

const Button = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  success = false,
  icon,
  className = '',
  type = 'button',
  fullWidth = false,
  noGlow = false,
}) => {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={!disabled && !loading ? { scale: 1.03 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.96 } : {}}
      className={`
        inline-flex items-center justify-center gap-2 font-bold uppercase tracking-widest
        transition-all duration-300
        disabled:opacity-45 disabled:cursor-not-allowed disabled:transform-none
        ${noGlow ? '' : 'hover:shadow-lg'}
        ${fullWidth ? 'w-full' : ''}
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${className}
      `}
    >
      {loading ? (
        <Loader2 size={size === 'sm' ? 12 : 16} className="animate-spin" />
      ) : success ? (
        <CheckCircle2 size={size === 'sm' ? 12 : 16} />
      ) : icon ? (
        icon
      ) : null}
      {children}
    </motion.button>
  );
};

export default Button;
