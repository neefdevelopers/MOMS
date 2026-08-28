'use client';

import React, { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { X, CheckSquare, Clock, AlertCircle, Plus, Users, Calendar as CalendarIcon, Camera } from 'lucide-react';

interface ConvertEventToTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  eventData: {
    title: string;
    parentType: 'PROJECT' | 'GRAPHIC_REQ';
    parentId: string;
    parentCode?: string;
    clientId?: string;
    brandId?: string;
    productId?: string;
    priority?: string;
    dueDate?: string;
    notes?: string;
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

  // Equipment selection for Shoot Projects
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);
  const [loadingEquipment, setLoadingEquipment] = useState(false);

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
      setSelectedEquipmentIds([]);
      setErrorMsg('');

      // Fetch active staff list & equipment list
      setLoadingStaff(true);
      setLoadingEquipment(true);
      Promise.all([
        fetchApi('/users').catch(() => []),
        fetchApi('/equipment').catch(() => []),
      ])
        .then(([resUsers, resEq]) => {
          setStaffUsersList(Array.isArray(resUsers) ? resUsers : []);
          setEquipmentList(Array.isArray(resEq) ? resEq : []);
        })
        .finally(() => {
          setLoadingStaff(false);
          setLoadingEquipment(false);
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

      // Submit equipment requests if equipment selected for Shoot Project
      if (selectedEquipmentIds.length > 0 && eventData.parentType === 'PROJECT' && validParentId) {
        for (const eqId of selectedEquipmentIds) {
          try {
            await fetchApi('/equipment/requests', {
              method: 'POST',
              body: JSON.stringify({
                equipmentId: eqId,
                projectId: validParentId,
                purpose: `Task Conversion: ${taskTitle.trim()}`,
                requiredDate: new Date().toISOString().split('T')[0],
                expectedReturnDate: taskDueDate || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
              }),
            });
          } catch (err) {
            console.error('Failed to submit equipment request for converting event:', err);
          }
        }
      }

      alert('⚡ Task successfully created and assigned!');
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
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-xl w-full max-w-xl p-6 space-y-4 text-xs max-h-[90vh] overflow-y-auto shadow-2xl relative text-left"
      >
        {/* Modal Header */}
        <div className="flex justify-between items-start border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40">
                ⚡ TASK CONVERSION MODAL
              </span>
              <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-gray-900 border border-gray-700 text-gray-300">
                {eventData.parentType === 'PROJECT' ? 'Shoot Project' : 'Graphic Requirement'}
              </span>
            </div>
            <h3 className="text-base font-bold text-white mt-1">
              Create &amp; Assign Task for "{eventData.title}"
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white flex items-center justify-center font-bold text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-lg text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Parent Entity Read-Only Box */}
          <div className="p-3 bg-gray-950 border border-gray-800 rounded-xl space-y-1">
            <span className="text-[10px] text-gray-400 font-bold uppercase block">Bound Parent Entity</span>
            <div className="text-white font-bold text-xs">
              {eventData.parentCode ? `[${eventData.parentCode}] ` : ''}{eventData.title}
            </div>
          </div>

          {/* Task Title */}
          <div>
            <label className="block text-gray-300 font-bold mb-1">Task Title *</label>
            <input
              type="text"
              required
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="e.g. Key Visual Design & Typography Layout"
              className="w-full bg-gray-900 border border-purple-500/60 rounded-lg p-2.5 text-white font-semibold focus:outline-none focus:border-purple-400"
            />
          </div>

          {/* Priority & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-gray-300 font-semibold mb-1">Priority *</label>
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white font-semibold"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">URGENT</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">Due Date *</label>
              <input
                type="date"
                required
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white font-semibold"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">Estimated Hours *</label>
              <input
                type="number"
                step="0.5"
                required
                value={taskEstimatedHours}
                onChange={(e) => setTaskEstimatedHours(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white font-mono font-bold"
              />
            </div>
          </div>

          {/* Assign Staff Members */}
          <div>
            <label className="block text-gray-300 font-bold mb-1 flex items-center justify-between">
              <span>Assign Staff Member(s) *</span>
              <span className="text-[10px] text-purple-400 font-mono">
                {assignedStaffIds.length} Selected
              </span>
            </label>

            {loadingStaff ? (
              <div className="p-3 text-center text-gray-400 bg-gray-950 rounded-lg border border-gray-800">
                Loading active staff members…
              </div>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto bg-gray-950 border border-gray-800 rounded-xl p-2.5 scrollbar-thin">
                {staffUsersList.length === 0 ? (
                  <div className="text-gray-500 italic text-center py-2 text-[11px]">No active staff members found.</div>
                ) : (
                  staffUsersList.map((u) => {
                    const isActive = (u.status === 'ACTIVE' || !u.status) && !u.isArchived;

                    return (
                      <label
                        key={u.id}
                        className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                          assignedStaffIds.includes(u.id)
                            ? 'bg-purple-950/40 border-purple-500/60 text-purple-200 font-bold'
                            : isActive
                            ? 'bg-gray-900/50 border-gray-800 text-gray-300 hover:bg-gray-800/60 cursor-pointer'
                            : 'bg-gray-950 border-gray-900 text-gray-600 opacity-50 cursor-not-allowed'
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
                            className="w-4 h-4 accent-purple-500 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <span>{u.name}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono">
                          ({u.employeeProfile?.designation || u.role})
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Equipment Requirements for Shoot Projects */}
          {eventData.parentType === 'PROJECT' && (
            <div>
              <label className="block text-gray-300 font-bold mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-cyan-400" />
                  <span>Equipment Requirements (Optional)</span>
                </span>
                <span className="text-[10px] text-cyan-400 font-mono">
                  {selectedEquipmentIds.length} Selected
                </span>
              </label>

              {loadingEquipment ? (
                <div className="p-3 text-center text-gray-400 bg-gray-950 rounded-lg border border-gray-800">
                  Loading equipment inventory…
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto bg-gray-950 border border-gray-800 rounded-xl p-2.5 scrollbar-thin">
                  {equipmentList.length === 0 ? (
                    <div className="text-gray-500 italic text-center py-2 text-[11px]">No equipment items found in inventory.</div>
                  ) : (
                    equipmentList.map((eq) => {
                      const isAvailable = eq.availability === 'AVAILABLE';
                      const isChecked = selectedEquipmentIds.includes(eq.id);

                      return (
                        <label
                          key={eq.id}
                          className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                            isChecked
                              ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-200 font-bold'
                              : isAvailable
                              ? 'bg-gray-900/50 border-gray-800 text-gray-300 hover:bg-gray-800/60 cursor-pointer'
                              : 'bg-gray-950/60 border-gray-900 text-gray-500 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <input
                              type="checkbox"
                              disabled={!isAvailable}
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedEquipmentIds([...selectedEquipmentIds, eq.id]);
                                else setSelectedEquipmentIds(selectedEquipmentIds.filter((id) => id !== eq.id));
                              }}
                              className="w-4 h-4 accent-cyan-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <span className="truncate font-medium">📷 {eq.name} <span className="font-mono text-[10px] text-gray-400">({eq.equipmentId})</span></span>
                          </div>

                          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase border ${
                            isAvailable ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'
                          }`}>
                            {isAvailable ? 'AVAILABLE' : `${eq.availability} - UNAVAILABLE`}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* Task Brief / Instructions */}
          <div>
            <label className="block text-gray-300 font-semibold mb-1">Task Brief &amp; Instructions (Optional)</label>
            <textarea
              rows={3}
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="Enter specific instructions, reference links, dimensions..."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white"
            ></textarea>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-border flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || assignedStaffIds.length === 0}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-xs transition-all shadow-lg shadow-purple-600/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {creating ? 'Creating Task…' : '⚡ Create & Assign Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
