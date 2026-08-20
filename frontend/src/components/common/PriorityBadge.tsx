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
        bg: 'bg-zinc-800/80',
        text: 'text-zinc-300',
        border: 'border-zinc-700',
        label: 'Low',
        icon: '⚪',
        pulse: false,
      };
    case 'MEDIUM':
    case 'NORMAL':
      return {
        bg: 'bg-blue-500/15',
        text: 'text-blue-300',
        border: 'border-blue-500/30',
        label: 'Medium',
        icon: '🔷',
        pulse: false,
      };
    case 'HIGH':
    case 'HIGH_PRIORITY':
    case 'URGENT':
      return {
        bg: 'bg-amber-500/20',
        text: 'text-amber-300',
        border: 'border-amber-500/40',
        label: 'High',
        icon: '⚡',
        pulse: false,
      };
    case 'CRITICAL':
    case 'EMERGENCY':
    case 'BLOCKER':
      return {
        bg: 'bg-red-600/30',
        text: 'text-red-200',
        border: 'border-red-500/60',
        label: 'Critical',
        icon: '🚨',
        pulse: true,
      };
    default:
      return {
        bg: 'bg-zinc-800',
        text: 'text-zinc-300',
        border: 'border-zinc-700',
        label: priority ? priority.replace(/_/g, ' ') : 'Normal',
        icon: '⚪',
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
