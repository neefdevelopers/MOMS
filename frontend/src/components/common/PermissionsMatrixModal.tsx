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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-card border border-border rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-xs">
        {/* Header */}
        <div className="p-5 bg-gray-900/90 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/15 border border-purple-500/30 rounded-xl text-purple-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Operational Permission Types & RBAC Matrix
              </h2>
              <p className="text-xs text-gray-400">
                Supported permissions (View, Create, Edit, Delete, Approve, Assign, Configure, Export, Archive) across operational modules
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 9 Standard Permission Types Legend */}
        <div className="p-4 bg-gray-950/70 border-b border-border/80 space-y-2">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Info className="w-3 h-3 text-blue-400" />
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
                  className={`p-2 rounded-lg border text-center transition-all cursor-default ${
                    meta.badgeBg
                  } ${meta.badgeBorder} ${
                    isHovered ? 'scale-105 ring-1 ring-white/20' : ''
                  }`}
                  title={meta.description}
                >
                  <Icon className={`w-3.5 h-3.5 mx-auto mb-1 ${meta.badgeText}`} />
                  <span className={`font-bold text-[10px] block ${meta.badgeText}`}>
                    {meta.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Role Switcher Tabs */}
        <div className="px-5 py-3 bg-gray-900/50 border-b border-border space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-gray-300 mr-1">Role Matrix:</span>
              {(
                [
                  'MEDIA_MANAGER',
                  'TECHNICAL_MANAGER',
                  'STAFF',
                  'HR_MANAGER',
                  'FINANCE_MANAGER',
                  'MARKETING_MANAGER',
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
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  <Shield className="w-3 h-3" />
                  {r.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            <div className="text-[11px] font-mono">
              {selectedRole === 'MEDIA_MANAGER' && (
                <span className="text-blue-300">👑 Media Manager: Unrestricted administrative authority across all modules.</span>
              )}
              {selectedRole === 'TECHNICAL_MANAGER' && (
                <span className="text-purple-300">🔧 Technical Manager: Technical reviews, equipment lifecycle & remarks.</span>
              )}
              {selectedRole === 'STAFF' && (
                <span className="text-emerald-300">🎨 Production Staff: Work strictly scoped to assigned records & tasks.</span>
              )}
              {selectedRole === 'HR_MANAGER' && (
                <span className="text-amber-300">👥 HR Manager: Staff directory, shift scheduling, and employee attendance.</span>
              )}
              {selectedRole === 'FINANCE_MANAGER' && (
                <span className="text-emerald-300">💰 Finance Manager: Billing formulas, commercial settings & cost analytics.</span>
              )}
              {selectedRole === 'MARKETING_MANAGER' && (
                <span className="text-pink-300">🚀 Marketing Manager: Brands, products, campaigns & creative briefs.</span>
              )}
              {selectedRole === 'SALES_MANAGER' && (
                <span className="text-cyan-300">🤝 Sales Manager: Enterprise clients, commercial proposals & contracts.</span>
              )}
              {selectedRole === 'CLIENT_COORDINATOR' && (
                <span className="text-indigo-300">💬 Client Coordinator: Client liaison, approvals & communications.</span>
              )}
              {selectedRole === 'ADMINISTRATOR' && (
                <span className="text-red-300">⚡ Administrator: Super-user with full system configuration & access.</span>
              )}
            </div>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="p-5 overflow-y-auto max-h-[480px]">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-800 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                <th className="p-2.5 bg-gray-900/80 sticky top-0 rounded-l-lg">Operational Module</th>
                {ALL_PERMISSION_TYPES.map((type) => {
                  const Icon = PERMISSION_ICONS[type];
                  return (
                    <th
                      key={type}
                      className="p-2.5 text-center bg-gray-900/80 sticky top-0"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Icon className="w-3.5 h-3.5 text-gray-400" />
                        <span>{type}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 font-mono">
              {ALL_MODULES.map((mod) => {
                const supportedList = MODULE_SUPPORTED_PERMISSIONS[mod.id] || [];
                const roleAllowedList = currentRoleMatrix[mod.id] || [];

                return (
                  <tr key={mod.id} className="hover:bg-gray-900/50 transition-colors">
                    <td className="p-2.5 font-sans">
                      <div className="font-bold text-white text-xs">{mod.label}</div>
                      <div className="text-[10px] text-gray-500 font-normal">{mod.description}</div>
                    </td>

                    {ALL_PERMISSION_TYPES.map((type) => {
                      const isSupportedByModule = supportedList.includes(type);
                      const isGrantedToRole = roleAllowedList.includes(type);

                      return (
                        <td key={type} className="p-2 text-center align-middle">
                          {!isSupportedByModule ? (
                            <span
                              className="text-gray-700 font-bold text-[10px]"
                              title="Permission type not implemented by this module"
                            >
                              —
                            </span>
                          ) : isGrantedToRole ? (
                            <span
                              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm"
                              title={`Granted: ${selectedRole} has ${type} permission on ${mod.label}`}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-900 text-gray-600 border border-gray-800"
                              title={`Restricted: ${selectedRole} lacks ${type} permission on ${mod.label}`}
                            >
                              <Lock className="w-3 h-3 text-gray-600" />
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
        <div className="p-4 bg-gray-950 border-t border-border flex items-center justify-between text-[11px] text-gray-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Granted
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-700 inline-block" /> Restricted
            </span>
            <span className="flex items-center gap-1.5 text-gray-600">
              <span>—</span> Not Implemented by Module
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg font-semibold transition-colors"
          >
            Close Matrix
          </button>
        </div>
      </div>
    </div>
  );
}
