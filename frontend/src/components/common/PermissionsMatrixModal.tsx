'use client';

import React, { useState } from 'react';
import {
  Shield,
  X,
  Check,
  Minus,
  Eye,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  UserCheck,
  Sliders,
  Download,
  Archive,
  RotateCcw,
  Lock,
  Layers,
  Info,
} from 'lucide-react';
import {
  Role,
  ModuleType,
  PermissionType,
  PERMISSION_TYPES_CONFIG,
  MODULE_SUPPORTED_PERMISSIONS,
  ROLE_PERMISSION_MATRIX,
} from '@/lib/permissions';

const PERMISSION_ICONS: Record<PermissionType, React.ElementType> = {
  VIEW: Eye,
  CREATE: Plus,
  EDIT: Pencil,
  DELETE: Trash2,
  APPROVE: CheckCircle2,
  ASSIGN: UserCheck,
  CONFIGURE: Sliders,
  EXPORT: Download,
  ARCHIVE: Archive,
  RESTORE: RotateCcw,
};

const ALL_PERMISSION_TYPES: PermissionType[] = [
  'VIEW',
  'CREATE',
  'EDIT',
  'DELETE',
  'APPROVE',
  'ASSIGN',
  'CONFIGURE',
  'EXPORT',
  'ARCHIVE',
  'RESTORE',
];

const ALL_MODULES: { id: ModuleType; label: string; description: string }[] = [
  { id: 'DASHBOARD', label: 'Dashboard', description: 'Main operational overview & widgets' },
  { id: 'PROJECTS', label: 'Projects', description: 'Indoor & outdoor shoot projects' },
  { id: 'SCRIPTS', label: 'Scripts', description: 'Multi-lingual script repository & revisions' },
  { id: 'GRAPHIC_REQUIREMENTS', label: 'Graphic Reqs', description: 'Design briefs & deliverables' },
  { id: 'TASKS', label: 'Tasks', description: 'Daily production assignments & capacity' },
  { id: 'EQUIPMENT', label: 'Equipment', description: 'Hardware inventory & maintenance' },
  { id: 'CLIENTS', label: 'Clients', description: 'Enterprise client relationships' },
  { id: 'BRANDS', label: 'Brands', description: 'Brand assets & project scoping' },
  { id: 'PRODUCTS', label: 'Products', description: 'SKU catalogue & product briefs' },
  { id: 'STAFF', label: 'Staff', description: 'Team directory & shift attendance' },
  { id: 'REPORTS', label: 'Reports', description: 'Analytics, timelines & data exports' },
  { id: 'CALENDAR', label: 'Media Calendar', description: 'Production timeline scheduling' },
  { id: 'COMMUNICATIONS', label: 'Communication', description: 'Announcements & activity threads' },
  { id: 'ACTIVITY_LOGS', label: 'Activity Logs', description: 'System audit trails' },
  { id: 'SETTINGS', label: 'Settings', description: 'System formulas & configurations' },
];

export function PermissionsMatrixModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [selectedRole, setSelectedRole] = useState<Role>('MEDIA_MANAGER');
  const [hoveredPerm, setHoveredPerm] = useState<PermissionType | null>(null);

  if (!isOpen) return null;

  const currentRoleMatrix = ROLE_PERMISSION_MATRIX[selectedRole];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-xs">
        {/* Header */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl text-purple-700">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Operational Permission Types & RBAC Matrix
              </h2>
              <p className="text-xs text-slate-500">
                Supported permissions (View, Create, Edit, Delete, Approve, Assign, Configure, Export, Archive) across operational modules
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 9 Standard Permission Types Legend */}
        <div className="p-4 bg-slate-100/70 border-b border-slate-200 space-y-2">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Info className="w-3 h-3 text-blue-600" />
            <span>Operational Permission Types (Unrestricted for Media Manager / Admin)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-1.5">
            {ALL_PERMISSION_TYPES.map((type) => {
              const meta = PERMISSION_TYPES_CONFIG[type];
              const Icon = PERMISSION_ICONS[type];
              const isHovered = hoveredPerm === type;

              return (
                <div
                  key={type}
                  onMouseEnter={() => setHoveredPerm(type)}
                  onMouseLeave={() => setHoveredPerm(null)}
                  className={`p-2 rounded-lg border text-center transition-all cursor-default bg-white border-slate-200 ${
                    isHovered ? 'scale-105 ring-1 ring-blue-400 shadow-xs' : ''
                  }`}
                  title={meta.description}
                >
                  <Icon className="w-3.5 h-3.5 mx-auto mb-1 text-blue-600" />
                  <span className="font-bold text-[10px] block text-slate-800">
                    {meta.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Role Switcher Tabs */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-700 mr-1">Role Matrix:</span>
              {(
                [
                  'MEDIA_MANAGER',
                  'TECHNICAL_MANAGER',
                  'STAFF',
                  'SOCIAL_MEDIA_MANAGER',
                  'MARKETING_MANAGER',
                  'HR_MANAGER',
                  'FINANCE_MANAGER',
                  'SALES_MANAGER',
                  'CLIENT_COORDINATOR',
                  'ADMINISTRATOR',
                ] as Role[]
              ).map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRole(r)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1.5 ${
                    selectedRole === r
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Shield className="w-3 h-3" />
                  {r.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            <div className="text-[11px] font-mono">
              {selectedRole === 'MEDIA_MANAGER' && (
                <span className="text-blue-700 font-semibold">Media Manager: Highest operational authority across all system modules.</span>
              )}
              {selectedRole === 'TECHNICAL_MANAGER' && (
                <span className="text-purple-700 font-semibold">Technical Manager: Technical reviews, equipment lifecycle & remarks.</span>
              )}
              {selectedRole === 'STAFF' && (
                <span className="text-emerald-700 font-semibold">Production Staff: Work strictly scoped to assigned records & tasks.</span>
              )}
              {selectedRole === 'SOCIAL_MEDIA_MANAGER' && (
                <span className="text-blue-700 font-semibold">Social Media Manager: Creates calendar events, drafts, and submits for client approval.</span>
              )}
              {selectedRole === 'MARKETING_MANAGER' && (
                <span className="text-amber-800 font-semibold">Marketing Manager (Client): Client representative for calendar review, feedback & sign-offs.</span>
              )}
              {selectedRole === 'HR_MANAGER' && (
                <span className="text-amber-800 font-semibold">HR Manager: Staff directory, shift scheduling, and employee attendance.</span>
              )}
              {selectedRole === 'FINANCE_MANAGER' && (
                <span className="text-emerald-700 font-semibold">Finance Manager: Billing formulas, commercial settings & cost analytics.</span>
              )}
              {selectedRole === 'SALES_MANAGER' && (
                <span className="text-cyan-800 font-semibold">Sales Manager: Enterprise clients, commercial proposals & contracts.</span>
              )}
              {selectedRole === 'CLIENT_COORDINATOR' && (
                <span className="text-indigo-700 font-semibold">Client Coordinator: Client liaison, approvals & communications.</span>
              )}
              {selectedRole === 'ADMINISTRATOR' && (
                <span className="text-rose-700 font-semibold">Administrator: Super-user with full system configuration & access.</span>
              )}
            </div>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="p-5 overflow-y-auto max-h-[480px]">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-2.5 bg-slate-50 sticky top-0 rounded-l-lg border-b border-slate-200">Operational Module</th>
                {ALL_PERMISSION_TYPES.map((type) => {
                  const Icon = PERMISSION_ICONS[type];
                  return (
                    <th
                      key={type}
                      className="p-2.5 text-center bg-slate-50 sticky top-0 border-b border-slate-200"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Icon className="w-3.5 h-3.5 text-slate-500" />
                        <span>{type}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {ALL_MODULES.map((mod) => {
                const supportedList = MODULE_SUPPORTED_PERMISSIONS[mod.id] || [];
                const roleAllowedList = currentRoleMatrix[mod.id] || [];

                return (
                  <tr key={mod.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-2.5 font-sans">
                      <div className="font-bold text-slate-900 text-xs">{mod.label}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{mod.description}</div>
                    </td>

                    {ALL_PERMISSION_TYPES.map((type) => {
                      const isSupportedByModule = supportedList.includes(type);
                      const isGrantedToRole = roleAllowedList.includes(type);

                      return (
                        <td key={type} className="p-2 text-center align-middle">
                          {!isSupportedByModule ? (
                            <span
                              className="text-slate-300 font-bold text-[10px]"
                              title="Permission type not implemented by this module"
                            >
                              —
                            </span>
                          ) : isGrantedToRole ? (
                            <span
                              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs"
                              title={`Granted: ${selectedRole} has ${type} permission on ${mod.label}`}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-400 border border-slate-200"
                              title={`Restricted: ${selectedRole} lacks ${type} permission on ${mod.label}`}
                            >
                              <Lock className="w-3 h-3 text-slate-400" />
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Granted
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" /> Restricted
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span>—</span> Not Implemented by Module
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg font-semibold transition-colors"
          >
            Close Matrix
          </button>
        </div>
      </div>
    </div>
  );
}
