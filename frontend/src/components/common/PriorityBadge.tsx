import React from 'react';

export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'HIGH_PRIORITY' | string;

interface PriorityBadgeProps {
  priority: PriorityLevel;
  className?: string;
  size?: 'sm' | 'md';
}

export function getPriorityBadgeStyles(priority: string): {
  bg: string;
  text: string;
  border: string;
  label: string;
  icon: string;
  pulse: boolean;
} {
  const norm = (priority || '').toUpperCase().replace(/\s+/g, '_');

  switch (norm) {
    case 'LOW':
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-200',
        label: 'Low',
        icon: null,
        pulse: false,
      };
    case 'MEDIUM':
    case 'NORMAL':
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        label: 'Medium',
        icon: null,
        pulse: false,
      };
    case 'HIGH':
    case 'HIGH_PRIORITY':
    case 'URGENT':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-300',
        label: 'High',
        icon: null,
        pulse: false,
      };
    case 'CRITICAL':
    case 'EMERGENCY':
    case 'BLOCKER':
      return {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-300',
        label: 'Critical',
        icon: null,
        pulse: true,
      };
    default:
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-200',
        label: priority ? priority.replace(/_/g, ' ') : 'Normal',
        icon: null,
        pulse: false,
      };
  }
}

export function PriorityBadge({ priority, className = '', size = 'sm' }: PriorityBadgeProps) {
  const { bg, text, border, label, icon, pulse } = getPriorityBadgeStyles(priority);
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-extrabold uppercase tracking-wider rounded-md border shadow-sm ${bg} ${text} ${border} ${sizeClasses} ${
        pulse ? 'animate-pulse ring-1 ring-red-500/50' : ''
      } ${className}`}
    >
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </span>
  );
}
