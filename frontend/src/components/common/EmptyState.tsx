import React from 'react';
import Link from 'next/link';
import {
  FolderOpen,
  Film,
  Camera,
  Bell,
  CheckSquare,
  FileText,
  Palette,
  Users,
  Search,
  Plus,
  RotateCcw,
  LucideIcon,
} from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onActionClick?: () => void;
  secondaryActionLabel?: string;
  onSecondaryActionClick?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = FolderOpen,
  title,
  description,
  actionLabel,
  actionHref,
  onActionClick,
  secondaryActionLabel,
  onSecondaryActionClick,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`bg-white border border-dashed border-slate-300 rounded-xl p-10 text-center space-y-4 shadow-xs flex flex-col items-center justify-center my-4 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
        <Icon className="w-7 h-7 text-blue-600" />
      </div>

      <div className="space-y-1 max-w-md">
        <h3 className="text-sm font-bold text-slate-900 tracking-wide">{title}</h3>
        <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
      </div>

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex items-center gap-3 pt-2 flex-wrap justify-center">
          {actionHref ? (
            <Link
              href={actionHref}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-500/20 inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{actionLabel}</span>
            </Link>
          ) : actionLabel && onActionClick ? (
            <button
              type="button"
              onClick={onActionClick}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-500/20 inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{actionLabel}</span>
            </button>
          ) : null}

          {secondaryActionLabel && onSecondaryActionClick && (
            <button
              type="button"
              onClick={onSecondaryActionClick}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{secondaryActionLabel}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Pre-configured Empty States for Major Modules */
export const ModuleEmptyStates = {
  Projects: ({ onResetFilters }: { onResetFilters?: () => void }) => (
    <EmptyState
      icon={Film}
      title="No Projects Found"
      description="No shoot projects match your active filter parameters or search query. Create a new production project or reset your search filters."
      actionLabel="Create Project"
      actionHref="/projects"
      secondaryActionLabel={onResetFilters ? 'Reset Filters' : undefined}
      onSecondaryActionClick={onResetFilters}
    />
  ),
  Equipment: ({ onResetFilters }: { onResetFilters?: () => void }) => (
    <EmptyState
      icon={Camera}
      title="No Equipment Available"
      description="No camera, lighting, audio, or grip equipment items are currently matching this category filter. Reserve gear or check maintenance status."
      actionLabel="Equipment Inventory"
      actionHref="/equipment"
      secondaryActionLabel={onResetFilters ? 'Reset Filters' : undefined}
      onSecondaryActionClick={onResetFilters}
    />
  ),
  Notifications: () => (
    <EmptyState
      icon={Bell}
      title="No Notifications"
      description="You're all caught up! There are no unread system notifications, approval alerts, or task assignment updates at this time."
    />
  ),
  Tasks: ({ onResetFilters }: { onResetFilters?: () => void }) => (
    <EmptyState
      icon={CheckSquare}
      title="No Tasks Assigned"
      description="No operational tasks are assigned under your current filter selection. Check your personalized dashboard or create a new task."
      actionLabel="Create Task"
      actionHref="/tasks"
      secondaryActionLabel={onResetFilters ? 'Reset Filters' : undefined}
      onSecondaryActionClick={onResetFilters}
    />
  ),
};
