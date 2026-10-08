'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface AnimatedButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost' | 'cyber' | 'success';
  glow?: boolean;
  shimmer?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  variant = 'primary',
  glow = true,
  shimmer = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 text-white shadow-glow-cyan hover:shadow-cyan-500/40 border border-cyan-400/30';
      case 'cyber':
        return 'bg-gradient-to-r from-[#B4532A] via-amber-500 to-[#9A4524] text-white shadow-lg shadow-amber-950/40 border border-amber-400/40';
      case 'success':
        return 'bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 text-white shadow-lg shadow-emerald-950/40 border border-emerald-400/40';
      case 'secondary':
        return 'bg-surface/80 hover:bg-surface-hover text-slate-200 border border-border hover:border-slate-500 backdrop-blur-md';
      case 'accent':
        return 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/30 border border-purple-400/30';
      case 'danger':
        return 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg shadow-rose-950/40 border border-rose-400/30';
      case 'ghost':
        return 'bg-transparent hover:bg-white/5 text-slate-300 hover:text-white border border-transparent';
      default:
        return 'bg-primary text-white';
    }
  };

  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.02, y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.97, y: 1 }}
      transition={{ type: 'spring', stiffness: 450, damping: 20 }}
      disabled={disabled}
      className={`relative inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs transition-all overflow-hidden cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${getVariantStyles()} ${className}`}
      {...props}
    >
      {/* Animated Rotating Border Beam / Shimmer */}
      {shimmer && !disabled && (
        <span
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2.5s infinite linear'
          }}
        />
      )}

      {/* Button Content */}
      <span className="relative z-10 flex items-center gap-2">
        {icon && <span className="shrink-0">{icon}</span>}
        <span>{children}</span>
      </span>
    </motion.button>
  );
};
