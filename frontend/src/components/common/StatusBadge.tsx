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
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-300',
        label: 'Draft',
      };
    case 'IN_PROGRESS':
    case 'INPROGRESS':
    case 'SHOOTING':
    case 'EDITING':
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        label: 'In Progress',
      };
    case 'PENDING_REVIEW':
    case 'PENDING':
    case 'UNDER_REVIEW':
    case 'PENDING_APPROVAL':
    case 'PENDING_MARKETING_APPROVAL':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-300',
        label: 'Pending Review',
      };
    case 'APPROVED':
    case 'READY_FOR_SHOOT':
    case 'ACTIVE':
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        label: 'Approved',
      };
    case 'COMPLETED':
    case 'DELIVERED':
    case 'PASSED':
      return {
        bg: 'bg-green-50',
        text: 'text-green-700',
        border: 'border-green-200',
        label: 'Completed',
      };
    case 'CLOSED':
    case 'RESOLVED':
      return {
        bg: 'bg-cyan-50',
        text: 'text-cyan-800',
        border: 'border-cyan-200',
        label: 'Closed',
      };
    case 'CANCELLED':
    case 'REJECTED':
    case 'FAILED':
    case 'DAMAGED':
    case 'REVISION_REQUESTED':
    case 'CHANGES_REQUESTED':
      return {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
        label: norm === 'REVISION_REQUESTED' ? 'Revision Requested' : norm === 'CHANGES_REQUESTED' ? 'Changes Requested' : 'Rejected',
      };
    case 'PLANNED':
      return {
        bg: 'bg-indigo-50',
        text: 'text-indigo-700',
        border: 'border-indigo-200',
        label: 'Planned',
      };
    case 'ARCHIVED':
    case 'INACTIVE':
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-600',
        border: 'border-slate-200',
        label: 'Archived',
      };
    default:
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-200',
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
