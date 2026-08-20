import React from 'react';
import { AlertTriangle, Archive, XCircle, Camera, CheckCircle2, Lock, X } from 'lucide-react';

export type ConfirmationType =
  | 'ARCHIVE_PROJECT'
  | 'CANCEL_EVENT'
  | 'EQUIPMENT_CHECKOUT'
  | 'PROJECT_CLOSURE'
  | 'DELETE_RECORD'
  | 'GENERIC_DANGER';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  type?: ConfirmationType;
  title?: string;
  description?: string;
  consequences?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
}

export function getConfirmationDetails(
  type?: ConfirmationType,
  customTitle?: string,
  customDesc?: string,
  customConsequences?: string
) {
  switch (type) {
    case 'ARCHIVE_PROJECT':
      return {
        title: customTitle || 'Archive Shoot Project?',
        description:
          customDesc ||
          'Are you sure you want to archive this production project? The project status will be set to ARCHIVED.',
        consequences:
          customConsequences ||
          'Consequence: The project will become read-only. Active task updates, script changes, and new deliverable uploads will be disabled for assigned crew.',
        confirmLabel: 'Archive Project',
        icon: Archive,
        variant: 'warning' as const,
      };

    case 'CANCEL_EVENT':
      return {
        title: customTitle || 'Cancel Scheduled Media Calendar Event?',
        description:
          customDesc ||
          'Are you sure you want to cancel this scheduled shoot or publication event on the Media Calendar?',
        consequences:
          customConsequences ||
          'Consequence: Associated studio bookings and outdoor logistics will be released. Assigned staff will receive a cancellation alert.',
        confirmLabel: 'Cancel Event',
        icon: XCircle,
        variant: 'danger' as const,
      };

    case 'EQUIPMENT_CHECKOUT':
      return {
        title: customTitle || 'Confirm Equipment Checkout & Reservation?',
        description:
          customDesc ||
          'Are you sure you want to confirm checkout and issue the selected gear items for this shoot?',
        consequences:
          customConsequences ||
          'Consequence: The equipment status will change to IN FIELD. The requesting employee becomes responsible for returning gear undamaged by the scheduled return time.',
        confirmLabel: 'Confirm Checkout',
        icon: Camera,
        variant: 'info' as const,
      };

    case 'PROJECT_CLOSURE':
      return {
        title: customTitle || 'Close & Conclude Production Project?',
        description:
          customDesc ||
          'Are you sure you want to mark this project as CLOSED? Confirm that all final video/graphic deliverables have been signed off by the client.',
        consequences:
          customConsequences ||
          'Consequence: Project completion metrics will be locked and logged in productivity reports. Final output files will be moved to Office Server Archive storage.',
        confirmLabel: 'Close Project',
        icon: Lock,
        variant: 'warning' as const,
      };

    case 'DELETE_RECORD':
    default:
      return {
        title: customTitle || 'Confirm Destructive Action?',
        description: customDesc || 'Are you sure you want to proceed with this operation?',
        consequences:
          customConsequences ||
          'Consequence: This action will alter operational records and write a permanent audit entry.',
        confirmLabel: 'Confirm Action',
        icon: AlertTriangle,
        variant: 'danger' as const,
      };
  }
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  type = 'GENERIC_DANGER',
  title,
  description,
  consequences,
  confirmLabel,
  cancelLabel = 'Cancel',
  loading = false,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const details = getConfirmationDetails(type, title, description, consequences);
  const IconComponent = details.icon;

  const isDanger = details.variant === 'danger';
  const isWarning = details.variant === 'warning';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 text-gray-400 hover:text-white p-1 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border shadow-md ${
              isDanger
                ? 'bg-red-500/15 text-red-400 border-red-500/30'
                : isWarning
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
            }`}
          >
            <IconComponent className="w-6 h-6" />
          </div>

          <div className="space-y-1 min-w-0 pr-6">
            <h3 className="text-base font-bold text-white leading-snug">{details.title}</h3>
            <p className="text-xs text-gray-300 leading-relaxed">{details.description}</p>
          </div>
        </div>

        {/* Consequences Box */}
        <div
          className={`p-3 rounded-xl border text-xs leading-relaxed ${
            isDanger
              ? 'bg-red-950/40 border-red-800/60 text-red-300'
              : isWarning
              ? 'bg-amber-950/30 border-amber-800/50 text-amber-300'
              : 'bg-blue-950/30 border-blue-800/50 text-blue-300'
          }`}
        >
          <p className="font-medium">{details.consequences}</p>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={async () => {
              await onConfirm();
            }}
            disabled={loading}
            className={`px-4 py-2 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50 ${
              isDanger
                ? 'bg-red-600 hover:bg-red-500 shadow-red-600/30'
                : isWarning
                ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
            }`}
          >
            {loading ? 'Processing...' : confirmLabel || details.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
