'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
}

interface SlideTabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  tabClassName?: string;
  indicatorClassName?: string;
  layoutId?: string;
}

export const SlideTabs: React.FC<SlideTabsProps> = ({
  tabs,
  activeId,
  onChange,
  className = '',
  tabClassName = '',
  indicatorClassName = 'bg-gradient-to-r from-blue-600 to-cyan-500 shadow-glow-cyan/40',
  layoutId = 'slide-tab-indicator'
}) => {
  return (
    <div
      className={`relative inline-flex items-center p-1 rounded-xl bg-background/80 border border-white/[0.08] backdrop-blur-md ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeId === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`relative z-10 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer select-none ${
              isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            } ${tabClassName}`}
          >
            {/* Sliding Background Pill */}
            {isActive && (
              <motion.div
                layoutId={layoutId}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className={`absolute inset-0 rounded-lg -z-10 ${indicatorClassName}`}
              />
            )}

            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded-full bg-black/40 text-cyan-300 border border-white/10">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
