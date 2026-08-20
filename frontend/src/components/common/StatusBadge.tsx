import React from 'react';

export type OperationalStatus =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'COMPLETED'
  | 'CLOSED'
  | 'CANCELLED'
  | 'PLANNED'
  | 'REJECTED'
  | 'ARCHIVED'
  | 'ACTIVE'
  | 'INACTIVE'
  | string;

interface StatusBadgeProps {
  status: OperationalStatus;
  className?: string;
  size?: 'sm' | 'md';
}

export function getStatusBadgeStyles(status: string): { bg: string; text: string; border: string; label: string } {
  const norm = (status || '').toUpperCase().replace(/\s+/g, '_');

  switch (norm) {
    case 'DRAFT':
      return {
        bg: 'bg-slate-500/15',
        text: 'text-slate-300',
        border: 'border-slate-500/30',
        label: 'Draft',
      };
    case 'IN_PROGRESS':
    case 'INPROGRESS':
    case 'SHOOTING':
    case 'EDITING':
      return {
        bg: 'bg-blue-500/15',
        text: 'text-blue-300',
        border: 'border-blue-500/30',
        label: 'In Progress',
      };
    case 'PENDING_REVIEW':
    case 'PENDING':
    case 'UNDER_REVIEW':
    case 'PENDING_APPROVAL':
      return {
        bg: 'bg-amber-500/15',
        text: 'text-amber-300',
        border: 'border-amber-500/30',
        label: 'Pending Review',
      };
    case 'APPROVED':
    case 'READY_FOR_SHOOT':
    case 'ACTIVE':
      return {
        bg: 'bg-emerald-500/15',
        text: 'text-emerald-300',
        border: 'border-emerald-500/30',
        label: 'Approved',
      };
    case 'COMPLETED':
    case 'DELIVERED':
    case 'PASSED':
      return {
        bg: 'bg-green-500/15',
        text: 'text-green-300',
        border: 'border-green-500/30',
        label: 'Completed',
      };
    case 'CLOSED':
    case 'RESOLVED':
      return {
        bg: 'bg-cyan-500/15',
        text: 'text-cyan-300',
        border: 'border-cyan-500/30',
        label: 'Closed',
      };
    case 'CANCELLED':
    case 'REJECTED':
    case 'FAILED':
    case 'DAMAGED':
      return {
        bg: 'bg-red-500/15',
        text: 'text-red-300',
        border: 'border-red-500/30',
        label: 'Cancelled',
      };
    case 'PLANNED':
      return {
        bg: 'bg-indigo-500/15',
        text: 'text-indigo-300',
        border: 'border-indigo-500/30',
        label: 'Planned',
      };
    case 'ARCHIVED':
    case 'INACTIVE':
      return {
        bg: 'bg-zinc-800',
        text: 'text-zinc-400',
        border: 'border-zinc-700',
        label: 'Archived',
      };
    default:
      return {
        bg: 'bg-gray-500/15',
        text: 'text-gray-300',
        border: 'border-gray-500/30',
        label: status ? status.replace(/_/g, ' ') : 'Unknown',
      };
  }
}

export function StatusBadge({ status, className = '', size = 'sm' }: StatusBadgeProps) {
  const { bg, text, border, label } = getStatusBadgeStyles(status);
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-bold uppercase tracking-wider rounded-md border ${bg} ${text} ${border} ${sizeClasses} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
      <span>{label}</span>
    </span>
  );
}
