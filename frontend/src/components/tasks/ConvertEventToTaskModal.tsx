'use client';

import React, { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import {
  X,
  CheckSquare,
  Clock,
  AlertCircle,
  Plus,
  Users,
  Calendar as CalendarIcon,
  Camera,
  User,
  FileText,
  Link as LinkIcon,
  ExternalLink,
  Film,
  Video,
  FileVideo,
  Sparkles,
  Eye,
} from 'lucide-react';

interface ConvertEventToTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  eventData: {
    title: string;
    parentType: 'PROJECT' | 'GRAPHIC_REQ';
    parentId: string;
    parentCode?: string;
    calendarEventId?: string;
    clientId?: string;
    brandId?: string;
    productId?: string;
    priority?: string;
    dueDate?: string;
    notes?: string;
    createdBy?: {
      id?: string;
      name?: string;
      role?: string;
    };
  } | null;
}

export default function ConvertEventToTaskModal({
  isOpen,
  onClose,
  onSuccess,
  eventData,
}: ConvertEventToTaskModalProps) {
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState('MEDIUM');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskEstimatedHours, setTaskEstimatedHours] = useState('3.0');
  const [assignedStaffIds, setAssignedStaffIds] = useState<string[]>([]);
  const [staffUsersList, setStaffUsersList] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen && eventData) {
      setTaskTitle(`[Task] ${eventData.title || ''}`);
      setTaskDescription(eventData.notes || '');
      setTaskPriority(eventData.priority || 'MEDIUM');
      const dStr = eventData.dueDate
        ? new Date(eventData.dueDate).toISOString().split('T')[0]
        : new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
      setTaskDueDate(dStr);
      setTaskEstimatedHours('3.0');
      setAssignedStaffIds([]);
      setErrorMsg('');

      // Fetch active staff list
      setLoadingStaff(true);
      fetchApi('/users')
        .then((resUsers) => {
          setStaffUsersList(Array.isArray(resUsers) ? resUsers : []);
        })
        .catch(() => {
          setStaffUsersList([]);
        })
        .finally(() => {
          setLoadingStaff(false);
        });
    }
  }, [isOpen, eventData]);

  if (!isOpen || !eventData) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      setErrorMsg('Task Title is required.');
      return;
    }
    if (assignedStaffIds.length === 0) {
      setErrorMsg('Please select at least one staff member to assign.');
      return;
    }

    setCreating(true);
    setErrorMsg('');

    try {
      const validParentId = eventData.parentId && eventData.parentId.trim() !== '' ? eventData.parentId.trim() : undefined;
      const validClientId = eventData.clientId && eventData.clientId.trim() !== '' ? eventData.clientId.trim() : undefined;
      const validBrandId = eventData.brandId && eventData.brandId.trim() !== '' ? eventData.brandId.trim() : undefined;
      const validProductId = eventData.productId && eventData.productId.trim() !== '' ? eventData.productId.trim() : undefined;

      const payload: any = {
        title: taskTitle.trim(),
        description: taskDescription.trim() || undefined,
        priority: taskPriority,
        dueDate: taskDueDate ? new Date(taskDueDate).toISOString() : undefined,
        estimatedHours: parseFloat(taskEstimatedHours) || 3.0,
        assignedUserIds: assignedStaffIds,
        clientId: validClientId,
        brandId: validBrandId,
        productId: validProductId,
        calendarEventId: eventData.calendarEventId || undefined,
        parentEntityType: eventData.parentType,
      };

      if (eventData.parentType === 'PROJECT' && validParentId) {
        payload.projectId = validParentId;
      } else if (eventData.parentType === 'GRAPHIC_REQ' && validParentId) {
        payload.graphicRequirementId = validParentId;
      }

      await fetchApi('/tasks', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      alert('Task successfully created and assigned!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create task.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl p-6 space-y-4 text-xs max-h-[90vh] overflow-y-auto shadow-xl relative text-left"
      >
        {/* Modal Header */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-purple-50 text-purple-700 border border-purple-200">
                TASK CONVERSION MODAL
              </span>
              <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 border border-slate-200 text-slate-700">
                {eventData.parentType === 'PROJECT'
                  ? 'Shoot Project'
                  : 'Graphic Requirement'}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              Create &amp; Assign Task for &quot;{eventData.title}&quot;
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center font-bold text-sm transition-colors"
          >
            ×
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}



        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Parent Entity Read-Only Box */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Bound Parent Entity</span>
            <div className="text-slate-900 font-bold text-xs">
              {eventData.parentCode ? `[${eventData.parentCode}] ` : ''}{eventData.title}
            </div>
            {eventData.parentType !== 'GRAPHIC_REQ' && eventData.createdBy && (
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1.5 border-t border-slate-200">
                <User className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>Created by: <strong className="text-slate-800">{eventData.createdBy.name || (eventData.createdBy.role ? eventData.createdBy.role.replace(/_/g, ' ') : 'Creator')}</strong></span>
                {eventData.createdBy.role && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200 uppercase">
                    {eventData.createdBy.role.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Task Title */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">Task Title *</label>
            <input
              type="text"
              required
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="e.g. Graphic Banner Design / Video Production"
              className="w-full bg-slate-50 border border-purple-200 rounded-xl p-2.5 text-slate-900 font-semibold focus:outline-none focus:border-purple-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Priority & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Priority *</label>
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-semibold focus:outline-none focus:bg-white"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">URGENT</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Due Date *</label>
              <input
                type="date"
                required
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-semibold focus:outline-none focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Estimated Hours *</label>
              <input
                type="number"
                step="0.5"
                required
                value={taskEstimatedHours}
                onChange={(e) => setTaskEstimatedHours(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-mono font-bold focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          {/* Assign Staff Members */}
          <div>
            <label className="block text-slate-700 font-bold mb-1 flex items-center justify-between">
              <span>Assign Staff Member(s) *</span>
              <span className="text-[10px] text-purple-700 font-mono font-semibold">
                {assignedStaffIds.length} Selected
              </span>
            </label>

            {loadingStaff ? (
              <div className="p-3 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                Loading active staff members…
              </div>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                {staffUsersList.filter((u) => ['STAFF', 'TECHNICAL_MANAGER', 'SOCIAL_MEDIA_MANAGER', 'MEDIA_MANAGER'].includes(u.role)).length === 0 ? (
                  <div className="text-slate-400 italic text-center py-2 text-[11px]">No active staff members found.</div>
                ) : (
                  staffUsersList
                    .filter((u) => ['STAFF', 'TECHNICAL_MANAGER', 'SOCIAL_MEDIA_MANAGER', 'MEDIA_MANAGER'].includes(u.role))
                    .map((u) => {
                    const isActive = (u.status === 'ACTIVE' || !u.status) && !u.isArchived;

                    return (
                      <label
                        key={u.id}
                        className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                          assignedStaffIds.includes(u.id)
                            ? 'bg-purple-50 border-purple-300 text-purple-900 font-bold'
                            : isActive
                            ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer'
                            : 'bg-slate-100 border-slate-200 text-slate-400 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            disabled={!isActive}
                            checked={assignedStaffIds.includes(u.id)}
                            onChange={(e) => {
                              if (e.target.checked) setAssignedStaffIds([...assignedStaffIds, u.id]);
                              else setAssignedStaffIds(assignedStaffIds.filter((id) => id !== u.id));
                            }}
                            className="w-4 h-4 accent-purple-600 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <span>{u.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          ({u.employeeProfile?.designation || u.role})
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Task Brief / Instructions */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Task Brief &amp; Instructions (Optional)</label>
            <textarea
              rows={3}
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="Enter specific instructions, reference links, dimensions..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-purple-500 focus:bg-white transition-colors"
            ></textarea>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || assignedStaffIds.length === 0}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {creating ? 'Creating Task…' : 'Create & Assign Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
