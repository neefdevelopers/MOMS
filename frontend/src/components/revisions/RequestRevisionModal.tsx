'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  RotateCcw,
  AlertTriangle,
  Calendar,
  User,
  Paperclip,
  CheckCircle2,
  FileText,
  Clock,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface RequestRevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  entityType: string; // PROJECT, TASK, SCRIPT, GRAPHIC_REQ
  entityId: string;
  entityTitle: string;
  originalAssigneeId?: string;
  originalAssigneeName?: string;
  reviewStage?: 'TECHNICAL_REVIEW' | 'MEDIA_REVIEW' | 'CLIENT_REVIEW';
  previousVersionUrl?: string;
  userRole?: string;
  isRevision?: boolean;
}

export default function RequestRevisionModal({
  isOpen,
  onClose,
  onSuccess,
  entityType,
  entityId,
  entityTitle,
  originalAssigneeId,
  originalAssigneeName,
  reviewStage = 'TECHNICAL_REVIEW',
  previousVersionUrl,
  userRole,
  isRevision = false,
}: RequestRevisionModalProps) {
  const [reason, setReason] = useState('');
  const [detailedRequest, setDetailedRequest] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [specificArea, setSpecificArea] = useState('');
  const [reviewerComments, setReviewerComments] = useState('');
  const [assignedToId, setAssignedToId] = useState(originalAssigneeId || '');
  const [referenceAttachmentUrl, setReferenceAttachmentUrl] = useState('');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAssignedToId(originalAssigneeId || '');
      loadUsers();
    }
  }, [isOpen, originalAssigneeId]);

  const loadUsers = async () => {
    try {
      const data = await fetchApi('/users');
      setUsersList(Array.isArray(data) ? data : []);
    } catch (e) {}
  };

  if (!isOpen) return null;

  const isMediaManager = userRole === 'MEDIA_MANAGER' || userRole === 'ADMIN' || userRole === 'ADMINISTRATOR';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Revision Reason is required.');
      return;
    }
    if (!detailedRequest.trim()) {
      alert('Detailed Change Request is required.');
      return;
    }

    try {
      setSubmitting(true);
      await fetchApi('/revisions/request', {
        method: 'POST',
        body: JSON.stringify({
          entityType,
          entityId,
          reason: reason.trim(),
          detailedRequest: detailedRequest.trim(),
          priority,
          dueDate: dueDate || undefined,
          specificArea: specificArea.trim() || undefined,
          reviewerComments: reviewerComments.trim() || undefined,
          reviewStage,
          originalAssigneeId,
          assignedToId: isMediaManager ? assignedToId || originalAssigneeId : originalAssigneeId,
          previousVersionUrl,
          referenceAttachmentUrl: referenceAttachmentUrl.trim() || undefined,
        }),
      });

      alert(`Revision requested successfully for "${entityTitle}". Notification sent to assigned employee.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to request revision.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-amber-600" /> Request Revision — {entityTitle}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Review Stage Badge */}
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="text-slate-600 font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" /> Review Stage:
            </span>
            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200 uppercase text-[10px]">
              {reviewStage.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Revision Reason * */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-700 font-semibold flex items-center gap-1">
              1. Revision Reason <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Logo placement correction, Color grading sync, Audio level fix..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white placeholder-slate-400 font-medium transition-colors"
            />
          </div>

          {/* Detailed Change Request * */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-700 font-semibold flex items-center gap-1">
              2. Detailed Change Request <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="Provide explicit instructions for the employee explaining what needs to be changed..."
              value={detailedRequest}
              onChange={(e) => setDetailedRequest(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white placeholder-slate-400 transition-colors"
            />
          </div>

          {/* Priority & Due Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] text-slate-700 font-semibold">Priority Level:</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white font-semibold"
              >
                <option value="LOW">Low Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="HIGH">High Priority</option>
                <option value="CRITICAL">Critical Priority</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-700 font-semibold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Revision Due Date:
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white font-mono"
              />
            </div>
          </div>

          {/* Specific Area & Reference Attachment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] text-slate-700 font-semibold">Specific Area Requiring Change:</label>
              <input
                type="text"
                placeholder="e.g. 01:15 - 01:45 Audio, Lower Third Graphic..."
                value={specificArea}
                onChange={(e) => setSpecificArea(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white placeholder-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-700 font-semibold flex items-center gap-1">
                <Paperclip className="w-3.5 h-3.5 text-purple-600" /> Reference File / Image URL:
              </label>
              <input
                type="text"
                placeholder="e.g. https://... or screenshot attachment link"
                value={referenceAttachmentUrl}
                onChange={(e) => setReferenceAttachmentUrl(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white font-mono placeholder-slate-400"
              />
            </div>
          </div>

          {/* Revision Assignment UI (Original Assignee vs Revision Assignee) */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-semibold flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-blue-600" /> Original Employee:
              </span>
              <span className="text-slate-900 font-bold font-mono">
                {originalAssigneeName || 'Original Assigned Staff'}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] text-purple-700 font-semibold">Revision Assignee:</label>
                {!isMediaManager && (
                  <span className="text-[10px] text-slate-400 italic">
                    (Defaulted to Original Employee — Only Media Manager can reassign)
                  </span>
                )}
              </div>
              <select
                disabled={!isMediaManager}
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                className={`w-full bg-white border ${
                  isMediaManager ? 'border-purple-300 cursor-pointer' : 'border-slate-200 cursor-not-allowed opacity-75'
                } rounded-xl p-2 text-slate-900 text-xs focus:outline-none font-semibold`}
              >
                {usersList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role.replace(/_/g, ' ')}) {u.id === originalAssigneeId ? '(Original Assignee)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {submitting ? 'Requesting Revision...' : 'Confirm & Send Revision'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
