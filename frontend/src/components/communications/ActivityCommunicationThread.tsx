'use client';

import React, { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import {
  MessageSquare,
  Send,
  FileText,
  CheckCircle2,
  Info,
  ShieldAlert,
  Bell,
  FileQuestion,
  User,
  Users,
  Clock,
  Calendar,
  CornerDownRight,
  X,
  Bookmark,
  AtSign,
  Paperclip,
  Image as ImageIcon,
  Video,
  Music,
  File,
  Download,
  Plus,
  ShieldCheck,
  Wrench,
  AlertTriangle,
  CheckCircle,
  UserCheck,
  Eye,
  UploadCloud,
  Loader2,
  Link as LinkIcon,
  Search,
} from 'lucide-react';

const resolveFileUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  return `${apiBase.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
};

const detectFileType = (file: globalThis.File): string => {
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (mime.startsWith('image/') || name.match(/\.(jpeg|jpg|png|webp|gif|svg)$/i)) {
    return 'IMAGE';
  }
  if (mime.startsWith('video/') || name.match(/\.(mp4|webm|mov|mkv|avi)$/i)) {
    return 'VIDEO';
  }
  if (mime.startsWith('audio/') || name.match(/\.(mp3|wav|ogg|m4a|aac)$/i)) {
    return 'AUDIO';
  }
  if (name.match(/\.(pdf|doc|docx|txt|rtf|csv|xlsx|xls|ppt|pptx)$/i)) {
    return 'DOCUMENT';
  }
  return 'REFERENCE';
};

interface ActivityCommunicationThreadProps {
  entityType: 'PROJECT' | 'SCRIPT' | 'GRAPHIC_REQ' | 'TASK' | 'EQUIPMENT' | 'APPROVAL' | 'REVIEW';
  entityId: string;
  entityName?: string;
  entityRef?: string;
  projectId?: string;
  title?: string;
  compact?: boolean;
}

export default function ActivityCommunicationThread({
  entityType,
  entityId,
  entityName,
  entityRef,
  projectId,
  title = 'Operational Activity Log',
  compact = false,
}: ActivityCommunicationThreadProps) {
  const [activeTab, setActiveTab] = useState<'ALL' | 'COMMUNICATION' | 'REMARK' | 'OPEN_BLOCKER'>('ALL');
  const [communications, setCommunications] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Mode State
  const [entryMode, setEntryMode] = useState<'COMMUNICATION' | 'REMARK'>('COMMUNICATION');
  const [subject, setSubject] = useState('');
  const [recipients, setRecipients] = useState('All Assigned Team Members');
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [blockerStaffSearch, setBlockerStaffSearch] = useState('');
  const [mentionSearch, setMentionSearch] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('GENERAL_NOTE');
  const [status, setStatus] = useState('SENT');
  const [targetRole, setTargetRole] = useState<'TECHNICAL_MANAGER' | 'MEDIA_MANAGER'>('TECHNICAL_MANAGER');
  const [blockerReason, setBlockerReason] = useState<string>('WAITING_FOR_FILES');
  const [assignedToId, setAssignedToId] = useState<string>('');
  const [priority, setPriority] = useState<'HIGH_PRIORITY' | 'NORMAL_PRIORITY'>('NORMAL_PRIORITY');
  const [submitting, setSubmitting] = useState(false);

  // Attachment Modal / Draft State
  const [attachments, setAttachments] = useState<any[]>([]);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [attachName, setAttachName] = useState('');
  const [attachUrl, setAttachUrl] = useState('');
  const [attachType, setAttachType] = useState<string>('DOCUMENT');
  const [attachFileSize, setAttachFileSize] = useState<number | null>(null);
  const [uploadingAttach, setUploadingAttach] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showManualLinkInput, setShowManualLinkInput] = useState(false);

  // Reply State for Communications
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<any[]>([]);
  const [submittingReply, setSubmittingReply] = useState(false);

  // Blocker Resolution Modal State
  const [resolvingBlockerId, setResolvingBlockerId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submittingResolution, setSubmittingResolution] = useState(false);

  const handleFileUpload = async (file: globalThis.File) => {
    if (!file) return;
    setUploadingAttach(true);
    setUploadError(null);
    try {
      const detected = detectFileType(file);
      setAttachType(detected);
      setAttachName(file.name);
      setAttachFileSize(file.size);

      const formData = new FormData();
      formData.append('file', file);
      if (projectId) {
        formData.append('projectId', projectId);
      } else if (entityType === 'PROJECT' && entityId && entityId !== 'GENERAL') {
        formData.append('projectId', entityId);
      }
      formData.append('folderCategory', 'Communications');
      formData.append('attachmentCategory', 'ATTACHMENTS');

      const res = await fetchApi('/files/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadedUrl = res.storagePath || res.fileUrl || res.url || '';
      setAttachUrl(uploadedUrl);
      if (res.fileName) setAttachName(res.fileName);
    } catch (err: any) {
      console.error('File upload failed:', err);
      setUploadError(err.message || 'Failed to upload file. Please try again.');
    } finally {
      setUploadingAttach(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      let queryParam = `/communications?entityType=${entityType}&entityId=${entityId}`;
      if (activeTab === 'REMARK') queryParam += '&isRemark=true';
      if (activeTab === 'COMMUNICATION') queryParam += '&isRemark=false';
      if (activeTab === 'OPEN_BLOCKER') queryParam += '&blockerStatus=OPEN';

      const [dataComms, dataCategories, dataUsers] = await Promise.all([
        fetchApi(queryParam),
        fetchApi('/communications/types'),
        fetchApi('/users'),
      ]);
      setCommunications(Array.isArray(dataComms) ? dataComms : []);
      if (Array.isArray(dataUsers)) setStaffList(dataUsers);

      if (Array.isArray(dataCategories) && dataCategories.length > 0) {
        setCategories(dataCategories);
      } else {
        setCategories([
          { key: 'INFORMATION', label: 'Information' },
          { key: 'QUESTION', label: 'Question' },
          { key: 'CLARIFICATION', label: 'Clarification' },
          { key: 'REQUIREMENT', label: 'Requirement' },
          { key: 'APPROVAL_REQUEST', label: 'Approval Request' },
          { key: 'REVIEW_COMMENT', label: 'Review Comment' },
          { key: 'ISSUE_REPORT', label: 'Issue Report' },
          { key: 'BLOCKER', label: 'Blocker' },
          { key: 'ANNOUNCEMENT', label: 'Announcement' },
          { key: 'GENERAL_NOTE', label: 'General Note' },
        ]);
      }
    } catch (err) {
      console.error('Failed to load activity communications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (entityId) {
      loadData();
    }
  }, [entityType, entityId, activeTab]);

  const handleAppendMention = (staffName: string, isReply = false) => {
    const mentionTag = `@${staffName.split(' ')[0]} `;
    if (isReply) {
      setReplyContent((prev) => prev + mentionTag);
    } else {
      setContent((prev) => prev + mentionTag);
    }
  };

  const handleAddAttachment = (isReply = false) => {
    if (!attachName.trim() || !attachUrl.trim()) return;
    const newAtt = {
      fileName: attachName.trim(),
      fileUrl: attachUrl.trim(),
      fileType: attachType,
    };
    if (isReply) {
      setReplyAttachments((prev) => [...prev, newAtt]);
    } else {
      setAttachments((prev) => [...prev, newAtt]);
    }
    setAttachName('');
    setAttachUrl('');
    setAttachFileSize(null);
    setUploadError(null);
    setShowManualLinkInput(false);
    setShowAttachModal(false);
  };

  const handleSubmitRoot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;

    const isRemark = entryMode === 'REMARK';
    const isApprovalReq = type === 'APPROVAL_REQUEST';
    const isBlockerReq = type === 'BLOCKER' || type === 'ISSUE_REPORT';
    const isAnnounce = type === 'ANNOUNCEMENT';

    try {
      setSubmitting(true);
      await fetchApi('/communications', {
        method: 'POST',
        body: JSON.stringify({
          entityType,
          entityId,
          projectId,
          isRemark,
          type: isRemark ? 'GENERAL_NOTE' : type,
          isAnnouncement: isAnnounce,
          priority: isAnnounce ? priority : undefined,
          subject: subject.trim() || (isRemark ? 'Operational Remark' : isAnnounce ? (priority === 'HIGH_PRIORITY' ? 'Company Announcement (High Priority)' : 'Company Announcement') : isBlockerReq ? `[BLOCKER] ${blockerReason.replace(/_/g, ' ')}` : undefined),
          recipients: isRemark
            ? 'N/A (Operational Remark)'
            : isAnnounce
            ? 'All Company Employees'
            : isApprovalReq
            ? targetRole === 'MEDIA_MANAGER'
              ? 'Media Manager (Approval Request)'
              : 'Technical Manager (Approval Request)'
            : (recipients.trim() || undefined),
          status: isRemark ? 'CLOSED' : status,
          targetRole: isApprovalReq ? targetRole : undefined,
          blockerReason: isBlockerReq ? blockerReason : undefined,
          assignedToId: isBlockerReq && assignedToId ? assignedToId : undefined,
          content: content.trim(),
          attachments: attachments.length > 0 ? attachments : undefined,
        }),
      });
      setContent('');
      setSubject('');
      setAttachments([]);
      setAssignedToId('');
      await loadData();
    } catch (err) {
      console.error('Failed to post operational note:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostReply = async (parentId: string, parentSubject?: string) => {
    if (!replyContent.trim() || submittingReply) return;

    try {
      setSubmittingReply(true);
      await fetchApi('/communications', {
        method: 'POST',
        body: JSON.stringify({
          entityType,
          entityId,
          parentId,
          projectId,
          isRemark: false,
          type: 'GENERAL_NOTE',
          subject: parentSubject ? `Re: ${parentSubject}` : 'Reply Note',
          recipients: recipients.trim() || 'All Assigned Team Members',
          status: 'SENT',
          content: replyContent.trim(),
          attachments: replyAttachments.length > 0 ? replyAttachments : undefined,
        }),
      });
      setReplyContent('');
      setReplyAttachments([]);
      setReplyingToId(null);
      await loadData();
    } catch (err) {
      console.error('Failed to post reply:', err);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleResolveBlocker = async (id: string) => {
    if (submittingResolution) return;
    try {
      setSubmittingResolution(true);
      await fetchApi(`/communications/${id}/resolve-blocker`, {
        method: 'PATCH',
        body: JSON.stringify({ resolutionNotes: resolutionNotes.trim() || 'Blocker marked as resolved.' }),
      });
      setResolvingBlockerId(null);
      setResolutionNotes('');
      await loadData();
    } catch (err) {
      console.error('Failed to resolve blocker:', err);
    } finally {
      setSubmittingResolution(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await fetchApi(`/communications/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      await loadData();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const getBadgeColor = (noteType: string) => {
    switch (noteType) {
      case 'INFORMATION':
      case 'ANNOUNCEMENT':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'QUESTION':
      case 'CLARIFICATION':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'REQUIREMENT':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'APPROVAL_REQUEST':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'REVIEW_COMMENT':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'ISSUE_REPORT':
      case 'BLOCKER':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'DELIVERED':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'READ':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CLOSED':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const renderContentWithMentions = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(@[A-Za-z0-9_.-]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span
            key={index}
            className="bg-blue-100 text-blue-800 border border-blue-300 font-semibold px-1.5 py-0.5 rounded text-[11px] inline-flex items-center gap-0.5 mx-0.5 font-medium"
          >
            <AtSign className="w-3 h-3 text-blue-600" />
            {part.substring(1)}
          </span>
        );
      }
      return (
        <span key={index} className="text-slate-900">
          {part}
        </span>
      );
    });
  };

  const renderAttachmentItem = (att: any) => {
    const isImg = att.fileType === 'IMAGE' || (att.fileUrl && att.fileUrl.match(/\.(jpeg|jpg|png|webp|gif|svg)$/i));
    const isVid = att.fileType === 'VIDEO' || (att.fileUrl && att.fileUrl.match(/\.(mp4|webm|mov)$/i));
    const isAud = att.fileType === 'AUDIO' || (att.fileUrl && att.fileUrl.match(/\.(mp3|wav|ogg|m4a)$/i));
    const resolvedUrl = resolveFileUrl(att.fileUrl);

    if (isImg) {
      return (
        <div key={att.id || att.fileUrl} className="group relative bg-white border border-slate-200 rounded-lg overflow-hidden p-1 space-y-1 shadow-xs">
          <img src={resolvedUrl} alt={att.fileName} className="w-full h-24 object-cover rounded" />
          <div className="flex items-center justify-between text-[10px] text-slate-700 px-1 truncate">
            <span className="truncate flex items-center gap-1 font-medium"><ImageIcon className="w-3 h-3 text-purple-600 shrink-0" />{att.fileName}</span>
            <a href={resolvedUrl} target="_blank" rel="noreferrer" download className="text-blue-600 hover:text-blue-800 shrink-0"><Download className="w-3 h-3" /></a>
          </div>
        </div>
      );
    }

    if (isVid) {
      return (
        <div key={att.id || att.fileUrl} className="bg-white border border-slate-200 rounded-lg p-2 space-y-1 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-slate-800 font-semibold">
            <Video className="w-3.5 h-3.5 text-rose-600 shrink-0" /> {att.fileName}
          </div>
          <video src={resolvedUrl} controls className="w-full h-28 object-cover rounded bg-slate-900" />
        </div>
      );
    }

    if (isAud) {
      return (
        <div key={att.id || att.fileUrl} className="bg-white border border-slate-200 rounded-lg p-2 space-y-1 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-slate-800 font-semibold">
            <Music className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> {att.fileName}
          </div>
          <audio src={resolvedUrl} controls className="w-full h-8" />
        </div>
      );
    }

    return (
      <div key={att.id || att.fileUrl} className="flex items-center justify-between bg-white border border-slate-200 p-2 rounded-lg text-xs shadow-xs">
        <div className="flex items-center gap-2 truncate">
          <File className="w-4 h-4 text-blue-600 shrink-0" />
          <div className="truncate">
            <p className="font-semibold text-slate-800 truncate">{att.fileName}</p>
            <span className="text-[10px] text-slate-500 font-mono">{att.fileType || 'REFERENCE'}</span>
          </div>
        </div>
        <a href={resolvedUrl} target="_blank" rel="noreferrer" download className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[10px] font-semibold flex items-center gap-1 shrink-0">
          <Download className="w-3 h-3" /> Download
        </a>
      </div>
    );
  };

  const renderSingleCommunication = (comm: any, isReply = false) => {
    const dt = new Date(comm.createdAt);
    const dateStr = dt.toLocaleDateString();
    const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isReplying = replyingToId === comm.id;
    const isRemark = Boolean(comm.isRemark);
    const commAtts = comm.attachments || [];
    const isApprovalReq = comm.type === 'APPROVAL_REQUEST';
    const isBlocker = Boolean(comm.isBlocker) || comm.type === 'BLOCKER';
    const isBlockerOpen = isBlocker && comm.blockerStatus !== 'RESOLVED';

    return (
      <div
        key={comm.id}
        className={`${
          isReply
            ? 'ml-5 pl-3 border-l-2 border-blue-400 bg-slate-50'
            : isBlockerOpen
            ? 'bg-rose-50/70 border-2 border-rose-300 shadow-xs'
            : isBlocker
            ? 'bg-white border border-emerald-200 shadow-xs'
            : isRemark
            ? 'bg-amber-50/50 border border-amber-200 shadow-xs'
            : isApprovalReq
            ? 'bg-emerald-50/50 border border-emerald-200 shadow-xs'
            : 'bg-white border border-slate-200 shadow-xs'
        } p-3.5 rounded-xl hover:border-slate-300 transition-colors space-y-2.5`}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2 flex-wrap">
            {isReply && <CornerDownRight className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
            
            {isBlockerOpen ? (
              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-rose-600 text-white border border-rose-700 flex items-center gap-1 font-mono uppercase animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" /> BLOCKER - OPEN
              </span>
            ) : isBlocker ? (
              <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 font-mono uppercase">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> BLOCKER - RESOLVED
              </span>
            ) : isRemark ? (
              <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 font-mono uppercase">
                <Bookmark className="w-3 h-3 text-amber-600" /> Operational Remark
              </span>
            ) : (
              <span className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${getBadgeColor(comm.type)}`}>
                {comm.type?.replace('_', ' ')}
              </span>
            )}

            {comm.blockerReason && (
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                Reason: {comm.blockerReason.replace(/_/g, ' ')}
              </span>
            )}

            {isApprovalReq && (
              <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Automated Pending Review Item Created
              </span>
            )}

            <h4 className="font-bold text-slate-900 text-xs">{comm.subject || (isRemark ? 'Operational Remark' : 'Operational Communication')}</h4>
          </div>

          <div className="flex items-center gap-2">
            {isBlockerOpen && (
              <button
                onClick={() => setResolvingBlockerId(comm.id)}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[11px] flex items-center gap-1 transition-colors shadow-xs"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Resolve Blocker
              </button>
            )}

            {!isRemark ? (
              <>
                <select
                  value={comm.status || 'SENT'}
                  onChange={(e) => handleUpdateStatus(comm.id, e.target.value)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold focus:outline-none cursor-pointer ${getStatusBadge(
                    comm.status
                  )}`}
                >
                  <option value="SENT">Status: Sent</option>
                  <option value="DELIVERED">Status: Delivered</option>
                  <option value="READ">Status: Read</option>
                  <option value="CLOSED">Status: Closed</option>
                </select>

                <button
                  onClick={() => setReplyingToId(isReplying ? null : comm.id)}
                  className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[10px] font-semibold flex items-center gap-1 transition-colors shadow-xs"
                >
                  <CornerDownRight className="w-3 h-3" /> Reply
                </button>
              </>
            ) : (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-slate-100 text-slate-600 border-slate-200">
                Standalone Remark
              </span>
            )}
          </div>
        </div>

        {/* Structured Blocker Metadata Panel (Reported By, Assigned To, Resolution, Resolution Date) */}
        {isBlocker ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px]">
            <div className="space-y-1">
              <span className="flex items-center gap-1 text-slate-700">
                <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <strong className="text-slate-500">Reported By:</strong>{' '}
                <span className="text-slate-900 font-semibold">{comm.sender?.name || 'Staff Member'}</span> ({comm.sender?.role || 'STAFF'})
              </span>
              <span className="flex items-center gap-1 text-slate-700">
                <UserCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <strong className="text-slate-500">Assigned To:</strong>{' '}
                <span className="text-purple-700 font-semibold">{comm.assignedTo?.name || comm.recipients || 'All Team Members'}</span> {comm.assignedTo?.role ? `(${comm.assignedTo.role})` : ''}
              </span>
            </div>

            <div className="space-y-1">
              {comm.blockerStatus === 'RESOLVED' ? (
                <>
                  <span className="flex items-center gap-1 text-emerald-800">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <strong className="text-slate-500">Resolution:</strong>{' '}
                    <span className="text-emerald-900 font-medium">{comm.resolutionNotes || 'Operational Blocker resolved.'}</span>
                  </span>
                  <span className="flex items-center gap-1 text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <strong className="text-slate-500">Resolution Date:</strong>{' '}
                    <span className="text-slate-900 font-mono text-[10px]">
                      {comm.resolvedAt ? `${new Date(comm.resolvedAt).toLocaleDateString()} ${new Date(comm.resolvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'N/A'}
                    </span>
                  </span>
                </>
              ) : (
                <span className="flex items-center gap-1 text-rose-700">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <strong className="text-slate-500">Resolution Status:</strong> <span className="text-rose-800 font-bold">Unresolved (Active Open Blocker)</span>
                </span>
              )}
            </div>
          </div>
        ) : (
          /* Standard Structured Meta Line */
          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1 text-slate-700">
                <User className="w-3 h-3 text-blue-600" />
                <strong className="text-slate-900">{comm.sender?.name || 'Staff Member'}</strong> ({comm.sender?.role || 'STAFF'})
              </span>
              {!isRemark && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <Users className="w-3 h-3 text-purple-600" />
                    Recipients: <span className="text-slate-800 font-medium">{comm.recipients || 'All Assigned Team Members'}</span>
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" /> {dateStr}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" /> {timeStr}
              </span>
            </div>
          </div>
        )}

        {/* Permanent Operational Timeline Stepper (5 Milestones: Created, Delivered, Read, Replied, Closed) */}
        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1.5 text-[10px] font-mono">
          <div className="flex items-center justify-between text-slate-600 font-semibold border-b border-slate-200 pb-1">
            <span className="flex items-center gap-1 text-blue-700">
              <Clock className="w-3 h-3" /> Permanent Operational Timeline (Preserved Indefinitely)
            </span>
            <span className="text-slate-500 uppercase">Status: {comm.status || 'SENT'}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-0.5">
            {/* 1. Created */}
            <div className="space-y-0.5 bg-white p-1.5 rounded border border-blue-200 shadow-xs">
              <span className="text-blue-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-blue-600" /> 1. Created
              </span>
              <p className="text-slate-700 text-[9px] truncate">{dateStr} {timeStr}</p>
            </div>

            {/* 2. Delivered */}
            <div className={`space-y-0.5 bg-white p-1.5 rounded border shadow-xs ${comm.deliveredAt ? 'border-purple-300' : 'border-slate-200 opacity-60'}`}>
              <span className={`font-bold flex items-center gap-1 ${comm.deliveredAt ? 'text-purple-700' : 'text-slate-400'}`}>
                <CheckCircle2 className="w-3 h-3" /> 2. Delivered
              </span>
              <p className="text-slate-700 text-[9px] truncate">
                {comm.deliveredAt ? `${new Date(comm.deliveredAt).toLocaleDateString()} ${new Date(comm.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Pending'}
              </p>
            </div>

            {/* 3. Read */}
            <div className={`space-y-0.5 bg-white p-1.5 rounded border shadow-xs ${comm.readAt ? 'border-emerald-300' : 'border-slate-200 opacity-60'}`}>
              <span className={`font-bold flex items-center gap-1 ${comm.readAt ? 'text-emerald-700' : 'text-slate-400'}`}>
                <Eye className="w-3 h-3" /> 3. Read
              </span>
              <p className="text-slate-700 text-[9px] truncate">
                {comm.readAt ? `${new Date(comm.readAt).toLocaleDateString()} ${new Date(comm.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Unread'}
              </p>
            </div>

            {/* 4. Replied */}
            <div className={`space-y-0.5 bg-white p-1.5 rounded border shadow-xs ${comm.replies && comm.replies.length > 0 ? 'border-cyan-300' : 'border-slate-200 opacity-60'}`}>
              <span className={`font-bold flex items-center gap-1 ${comm.replies && comm.replies.length > 0 ? 'text-cyan-700' : 'text-slate-400'}`}>
                <CornerDownRight className="w-3 h-3" /> 4. Replied
              </span>
              <p className="text-slate-700 text-[9px] truncate">
                {comm.replies && comm.replies.length > 0 ? `${comm.replies.length} Reply Note(s)` : 'No replies yet'}
              </p>
            </div>

            {/* 5. Closed */}
            <div className={`space-y-0.5 bg-white p-1.5 rounded border shadow-xs ${comm.closedAt || comm.status === 'CLOSED' ? 'border-amber-300' : 'border-slate-200 opacity-60'}`}>
              <span className={`font-bold flex items-center gap-1 ${comm.closedAt || comm.status === 'CLOSED' ? 'text-amber-800' : 'text-slate-400'}`}>
                <CheckCircle className="w-3 h-3" /> 5. Closed
              </span>
              <p className="text-slate-700 text-[9px] truncate">
                {comm.closedAt ? `${new Date(comm.closedAt).toLocaleDateString()} ${new Date(comm.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : comm.status === 'CLOSED' ? 'Closed' : 'Active Thread'}
              </p>
            </div>
          </div>
        </div>

        {/* Message Content Body */}
        <div className="text-slate-800 leading-relaxed text-xs pl-0.5 whitespace-pre-wrap pt-0.5 font-normal">
          {renderContentWithMentions(comm.content)}
        </div>

        {/* Render Multi-Format Attachments */}
        {commAtts.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-slate-200">
            <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
              <Paperclip className="w-3 h-3 text-purple-600" /> Attached Record Files ({commAtts.length}):
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {commAtts.map((att: any) => renderAttachmentItem(att))}
            </div>
          </div>
        )}

        {/* Inline Reply Input Box */}
        {!isRemark && isReplying && (
          <div className="pt-2 border-t border-slate-200 space-y-2 bg-slate-50 p-2.5 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between text-[11px] text-blue-700 font-medium">
              <span className="flex items-center gap-1">
                <CornerDownRight className="w-3 h-3" /> Replying to {comm.sender?.name || 'Author'}
              </span>
              <button
                type="button"
                onClick={() => setReplyingToId(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Attached Reply Files */}
            {replyAttachments.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap text-[10px] bg-white p-1.5 rounded border border-slate-200">
                <span className="text-purple-700 font-semibold">Reply Attachments:</span>
                {replyAttachments.map((att, i) => (
                  <span key={i} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded flex items-center gap-1">
                    <Paperclip className="w-3 h-3" /> {att.fileName}
                    <X className="w-3 h-3 cursor-pointer hover:text-rose-600" onClick={() => setReplyAttachments((prev) => prev.filter((_, idx) => idx !== i))} />
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handlePostReply(comm.id, comm.subject);
                  }
                }}
                placeholder="Type your reply note (use @name to tag employees)..."
                className="flex-1 bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 text-xs focus:outline-none focus:border-blue-500 placeholder-slate-400"
              />

              <button
                type="button"
                onClick={() => setShowAttachModal(true)}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-purple-700 border border-purple-200 rounded text-xs flex items-center gap-1 shadow-xs"
              >
                <Paperclip className="w-3.5 h-3.5" /> Attach
              </button>

              <button
                type="button"
                onClick={() => handlePostReply(comm.id, comm.subject)}
                disabled={!replyContent.trim() || submittingReply}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded flex items-center gap-1 text-xs transition-colors shadow-xs"
              >
                <Send className="w-3 h-3" /> Post Reply
              </button>
            </div>
          </div>
        )}

        {/* Nested Child Replies */}
        {!isRemark && comm.replies && comm.replies.length > 0 && (
          <div className="space-y-2 pt-2">
            {comm.replies.map((reply: any) => renderSingleCommunication(reply, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 text-xs shadow-xs">
      {/* Top Banner & Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          <h3 className="font-bold text-slate-900">{title}</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold uppercase font-mono">
            {entityType.replace('_', ' ')}
          </span>
          {entityRef && (
            <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
              {entityRef}
            </span>
          )}
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-slate-100 border border-slate-200 p-0.5 rounded-lg text-[11px]">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
              activeTab === 'ALL' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Activity
          </button>
          <button
            onClick={() => setActiveTab('COMMUNICATION')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
              activeTab === 'COMMUNICATION' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Communications
          </button>
          <button
            onClick={() => setActiveTab('OPEN_BLOCKER')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
              activeTab === 'OPEN_BLOCKER' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Open Blockers
          </button>
          <button
            onClick={() => setActiveTab('REMARK')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
              activeTab === 'REMARK' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Remarks
          </button>
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className={`space-y-3 ${compact ? 'max-h-64' : 'max-h-96'} overflow-y-auto pr-1 custom-scrollbar`}>
        {loading ? (
          <div className="text-center py-6 text-slate-500 text-xs flex items-center justify-center gap-2">
            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            Loading activity log...
          </div>
        ) : communications.length === 0 ? (
          <div className="text-center py-6 text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <Info className="w-5 h-5 mx-auto mb-1 text-slate-400" />
            <p className="font-medium">No operational entries recorded yet for this {entityType.toLowerCase().replace('_', ' ')}.</p>
            <p className="text-[11px] text-slate-400 mt-1">Post a communication or report a blocker below.</p>
          </div>
        ) : (
          communications.map((comm) => renderSingleCommunication(comm, false))
        )}
      </div>

      {/* Entry Creation Form with 4-Segmented Classification, Grouped Context & Clean Composer */}
      <form onSubmit={handleSubmitRoot} className="border-t border-slate-200 pt-4 space-y-3.5">
        {/* 4-Segmented Mode Switcher */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => {
              setEntryMode('COMMUNICATION');
              if (type === 'BLOCKER' || type === 'ISSUE_REPORT' || type === 'APPROVAL_REQUEST') {
                setType('GENERAL_NOTE');
              }
            }}
            className={`py-2 px-2.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
              entryMode === 'COMMUNICATION' && type !== 'BLOCKER' && type !== 'ISSUE_REPORT' && type !== 'APPROVAL_REQUEST'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> Discussion
          </button>
          <button
            type="button"
            onClick={() => {
              setEntryMode('COMMUNICATION');
              setType('BLOCKER');
            }}
            className={`py-2 px-2.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
              entryMode === 'COMMUNICATION' && (type === 'BLOCKER' || type === 'ISSUE_REPORT')
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Blocker / Issue
          </button>
          <button
            type="button"
            onClick={() => {
              setEntryMode('COMMUNICATION');
              setType('APPROVAL_REQUEST');
            }}
            className={`py-2 px-2.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
              entryMode === 'COMMUNICATION' && type === 'APPROVAL_REQUEST'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Approval Request
          </button>
          <button
            type="button"
            onClick={() => setEntryMode('REMARK')}
            className={`py-2 px-2.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
              entryMode === 'REMARK'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" /> Quick Remark
          </button>
        </div>

        {/* Classification Specifics & Details */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {/* Subject / Headline */}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-700 font-semibold">
                {entryMode === 'REMARK' ? 'Remark Headline:' : 'Subject / Headline:'}
              </label>
              <input
                type="text"
                placeholder={
                  entryMode === 'REMARK'
                    ? 'Operational remark title...'
                    : type === 'BLOCKER' || type === 'ISSUE_REPORT'
                    ? 'e.g. Missing raw assets for delivery...'
                    : type === 'APPROVAL_REQUEST'
                    ? 'e.g. Requesting technical sign-off...'
                    : 'Communication update headline...'
                }
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 text-xs focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>

            {/* Context Dropdowns */}
            {entryMode === 'COMMUNICATION' && (type === 'BLOCKER' || type === 'ISSUE_REPORT') ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-rose-700 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-600" /> Blocker Category:
                  </label>
                  <select
                    value={blockerReason}
                    onChange={(e) => setBlockerReason(e.target.value)}
                    className="w-full bg-rose-50/50 border border-rose-200 text-rose-900 text-xs font-semibold rounded-lg p-2 focus:outline-none"
                  >
                    <option value="WAITING_FOR_FILES">Waiting for files</option>
                    <option value="EQUIPMENT_UNAVAILABLE">Equipment unavailable</option>
                    <option value="CLIENT_CLARIFICATION_REQUIRED">Client clarification required</option>
                    <option value="MISSING_ASSETS">Missing assets</option>
                    <option value="TECHNICAL_ISSUE">Technical issue</option>
                    <option value="OTHER">Other Blocker</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-purple-700 font-semibold flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-purple-600" /> Assignee:
                    </label>
                    {blockerStaffSearch && (
                      <button
                        type="button"
                        onClick={() => setBlockerStaffSearch('')}
                        className="text-[10px] text-purple-600 hover:text-purple-800 font-bold"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search staff to assign..."
                      value={blockerStaffSearch}
                      onChange={(e) => setBlockerStaffSearch(e.target.value)}
                      className="w-full bg-purple-50/50 border border-purple-200 text-purple-900 text-xs rounded-lg p-1.5 pl-6 mb-1 focus:outline-none focus:border-purple-400 font-medium placeholder-purple-300"
                    />
                    <Search className="w-3 h-3 text-purple-400 absolute left-1.5 top-2.5" />
                  </div>
                  <select
                    value={assignedToId}
                    onChange={(e) => setAssignedToId(e.target.value)}
                    className="w-full bg-purple-50/50 border border-purple-200 text-purple-900 text-xs font-semibold rounded-lg p-1.5 focus:outline-none"
                  >
                    <option value="">-- Assign Staff --</option>
                    {staffList
                      .filter((s) => {
                        if (!blockerStaffSearch.trim()) return true;
                        const q = blockerStaffSearch.toLowerCase();
                        return s.name?.toLowerCase().includes(q) || s.role?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q);
                      })
                      .map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.name} ({staff.role})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            ) : entryMode === 'COMMUNICATION' && type === 'APPROVAL_REQUEST' ? (
              <div className="space-y-1">
                <label className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Target Review Manager:
                </label>
                <select
                  value={targetRole}
                  onChange={(e: any) => setTargetRole(e.target.value)}
                  className="w-full bg-emerald-50/50 border border-emerald-200 text-emerald-900 text-xs font-semibold rounded-lg p-2 focus:outline-none"
                >
                  <option value="TECHNICAL_MANAGER">Technical Manager</option>
                  <option value="MEDIA_MANAGER">Media Manager</option>
                </select>
              </div>
            ) : entryMode === 'COMMUNICATION' ? (
              <div className="space-y-1">
                <label className="text-[11px] text-slate-700 font-semibold">Communication Category:</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 text-xs rounded-lg p-2 focus:outline-none font-semibold"
                >
                  {categories.map((cat) => (
                    <option key={cat.key} value={cat.key}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg font-medium">
                <Bookmark className="w-3.5 h-3.5 text-amber-600 mr-1.5 shrink-0" />
                Logged as a standalone operational note attached to this record.
              </div>
            )}
          </div>

          {/* Recipients Row with Search Option (Only for Communication Mode) */}
          {entryMode === 'COMMUNICATION' && (
            <div className="pt-2 border-t border-slate-200 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-700 font-semibold flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-purple-600" /> Recipients:
                  </span>
                  <button
                    type="button"
                    onClick={() => setRecipients('All Assigned Team Members')}
                    className={`px-2 py-0.5 text-[10px] rounded font-semibold border transition-all ${
                      recipients === 'All Assigned Team Members'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    All Assigned Team
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRecipients((prev) =>
                        !prev || prev === 'All Assigned Team Members' ? 'Media Manager' : prev.includes('Media Manager') ? prev : `${prev}, Media Manager`
                      );
                    }}
                    className="px-2 py-0.5 text-[10px] rounded font-semibold bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                  >
                    Media Manager
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRecipients((prev) =>
                        !prev || prev === 'All Assigned Team Members' ? 'Technical Manager' : prev.includes('Technical Manager') ? prev : `${prev}, Technical Manager`
                      );
                    }}
                    className="px-2 py-0.5 text-[10px] rounded font-semibold bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                  >
                    Technical Manager
                  </button>
                </div>
                {recipients && recipients !== 'All Assigned Team Members' && (
                  <button
                    type="button"
                    onClick={() => setRecipients('')}
                    className="text-[10px] text-rose-600 hover:text-rose-800 font-bold"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Selected Recipients Chips */}
              {recipients && recipients !== 'All Assigned Team Members' && (
                <div className="flex flex-wrap gap-1 bg-purple-50/60 p-1.5 rounded-lg border border-purple-200">
                  {recipients
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean)
                    .map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white text-purple-900 border border-purple-300 text-[11px] font-medium"
                      >
                        <span>{item}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const parts = recipients
                              .split(',')
                              .map((s) => s.trim())
                              .filter((s) => s && s !== item);
                            setRecipients(parts.length > 0 ? parts.join(', ') : '');
                          }}
                          className="text-slate-400 hover:text-rose-600 rounded-full"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                </div>
              )}

              {/* Staff Search Input + Filterable Results List */}
              <div className="space-y-1.5">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search staff to add as recipients (e.g. name, editor, camera)..."
                    value={staffSearchQuery}
                    onChange={(e) => setStaffSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1.5 pl-7 pr-7 text-slate-900 text-xs focus:outline-none focus:border-purple-500 font-medium placeholder-slate-400 shadow-2xs"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                  {staffSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setStaffSearchQuery('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Filterable Staff List / Grid */}
                <div className="max-h-36 overflow-y-auto custom-scrollbar border border-slate-200 rounded-lg bg-white divide-y divide-slate-100">
                  {staffList
                    .filter((staff) => {
                      if (!staffSearchQuery.trim()) return true;
                      const q = staffSearchQuery.toLowerCase();
                      return (
                        staff.name?.toLowerCase().includes(q) ||
                        staff.role?.toLowerCase().includes(q) ||
                        staff.email?.toLowerCase().includes(q)
                      );
                    })
                    .map((staff) => {
                      const staffLabel = `${staff.name} (${staff.role})`;
                      const isSelected =
                        recipients === 'All Assigned Team Members'
                          ? false
                          : recipients.toLowerCase().includes(staff.name.toLowerCase());

                      return (
                        <div
                          key={staff.id}
                          onClick={() => {
                            setRecipients((prev) => {
                              if (!prev || prev === 'All Assigned Team Members') return staffLabel;
                              const parts = prev
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean);
                              const exists = parts.some((p) => p.toLowerCase().includes(staff.name.toLowerCase()));
                              if (exists) {
                                const updated = parts.filter((p) => !p.toLowerCase().includes(staff.name.toLowerCase()));
                                return updated.length > 0 ? updated.join(', ') : '';
                              } else {
                                return [...parts, staffLabel].join(', ');
                              }
                            });
                          }}
                          className={`p-1.5 px-2 flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected ? 'bg-purple-50 hover:bg-purple-100/70' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                isSelected ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {staff.name ? staff.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-slate-900 truncate">{staff.name}</div>
                              <div className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                                <span className="font-mono text-purple-700">{staff.role}</span>
                                {staff.email && <span className="text-slate-400">• {staff.email}</span>}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-all shrink-0 ml-2 ${
                              isSelected
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200'
                            }`}
                          >
                            {isSelected ? '✓ Added' : '+ Add'}
                          </button>
                        </div>
                      );
                    })}
                  {staffList.filter((s) => {
                    if (!staffSearchQuery.trim()) return true;
                    const q = staffSearchQuery.toLowerCase();
                    return s.name?.toLowerCase().includes(q) || s.role?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q);
                  }).length === 0 && (
                    <div className="p-3 text-center text-xs text-slate-400">
                      No staff members found matching "{staffSearchQuery}".
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Message Composer & File Attachments */}
        <div className="space-y-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              entryMode === 'REMARK'
                ? `Log an operational remark strictly attached to this ${entityType.toLowerCase().replace('_', ' ')} record...`
                : type === 'BLOCKER' || type === 'ISSUE_REPORT'
                ? `Report operational blocker details (remains open until resolved)...`
                : type === 'APPROVAL_REQUEST'
                ? `Type approval request message to ${targetRole === 'MEDIA_MANAGER' ? 'Media Manager' : 'Technical Manager'}...`
                : `Type communication message linked to this ${entityType.toLowerCase().replace('_', ' ')} record...`
            }
            rows={3}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 text-xs focus:outline-none focus:border-blue-500 focus:bg-white placeholder-slate-400 resize-y transition-colors"
          />

          {/* Attached Files Chips */}
          {attachments.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap bg-purple-50/50 p-2 rounded-lg border border-purple-200 text-xs">
              <span className="text-purple-700 font-bold text-[11px] flex items-center gap-1 mr-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" /> Attached ({attachments.length}):
              </span>
              {attachments.map((att, idx) => (
                <span key={idx} className="bg-white text-purple-950 px-2 py-0.5 rounded-md flex items-center gap-1.5 border border-purple-200 text-[11px] shadow-xs">
                  <span className="text-purple-700 font-mono text-[9px] font-bold">[{att.fileType}]</span>
                  <span className="truncate max-w-[140px] font-medium">{att.fileName}</span>
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-rose-600 ml-0.5"
                    onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                  />
                </span>
              ))}
            </div>
          )}

          {/* Bottom Toolbar with Filterable Mentions */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {/* Quick Mentions */}
            {staffList.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] py-0.5 custom-scrollbar">
                <span className="text-slate-400 font-semibold uppercase flex items-center gap-0.5 shrink-0">
                  <AtSign className="w-3 h-3 text-blue-600" /> Mention:
                </span>
                <div className="relative inline-flex items-center shrink-0">
                  <input
                    type="text"
                    placeholder="Filter staff..."
                    value={mentionSearch}
                    onChange={(e) => setMentionSearch(e.target.value)}
                    className="w-20 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:border-blue-400"
                  />
                  {mentionSearch && (
                    <button
                      type="button"
                      onClick={() => setMentionSearch('')}
                      className="absolute right-1 text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
                {staffList
                  .filter((staff) => {
                    if (!mentionSearch.trim()) return true;
                    const q = mentionSearch.toLowerCase();
                    return staff.name?.toLowerCase().includes(q) || staff.role?.toLowerCase().includes(q);
                  })
                  .slice(0, 8)
                  .map((staff) => (
                    <button
                      key={staff.id}
                      type="button"
                      onClick={() => handleAppendMention(staff.name)}
                      className="px-1.5 py-0.5 bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded text-slate-700 transition-colors whitespace-nowrap font-medium shrink-0"
                    >
                      @{staff.name.split(' ')[0]}
                    </button>
                  ))}
              </div>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setShowAttachModal(true)}
                className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Paperclip className="w-3.5 h-3.5 text-purple-600" />
                Upload & Attach
                {attachments.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">
                    {attachments.length}
                  </span>
                )}
              </button>

              <button
                type="submit"
                disabled={!content.trim() || submitting}
                className={`px-4 py-1.5 ${
                  entryMode === 'REMARK'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : type === 'BLOCKER' || type === 'ISSUE_REPORT'
                    ? 'bg-rose-600 hover:bg-rose-700 font-bold'
                    : type === 'APPROVAL_REQUEST'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                } disabled:opacity-50 text-white font-semibold rounded-xl flex items-center gap-1.5 text-xs transition-colors shadow-xs`}
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : entryMode === 'REMARK' ? (
                  <Bookmark className="w-3.5 h-3.5" />
                ) : type === 'BLOCKER' || type === 'ISSUE_REPORT' ? (
                  <AlertTriangle className="w-3.5 h-3.5" />
                ) : type === 'APPROVAL_REQUEST' ? (
                  <ShieldCheck className="w-3.5 h-3.5" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                {submitting
                  ? 'Posting...'
                  : entryMode === 'REMARK'
                  ? 'Log Remark'
                  : type === 'BLOCKER' || type === 'ISSUE_REPORT'
                  ? 'Report Blocker'
                  : type === 'APPROVAL_REQUEST'
                  ? 'Request Approval'
                  : 'Post Communication'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Blocker Resolution Modal */}
      {resolvingBlockerId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" /> Resolve Operational Blocker
              </h3>
              <button onClick={() => setResolvingBlockerId(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Provide resolution details to close this blocker. The reporting employee will be automatically notified.
              </p>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-700 font-semibold">Resolution Summary / Action Taken:</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Files received from client, replaced faulty HDMI cable, camera equipment re-assigned..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white placeholder-slate-400 transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResolvingBlockerId(null)}
                className="px-3.5 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleResolveBlocker(resolvingBlockerId)}
                disabled={submittingResolution}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Mark as Resolved
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attach Media File Modal */}
      {showAttachModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-purple-600" /> Upload & Attach File
              </h3>
              <button
                onClick={() => {
                  setShowAttachModal(false);
                  setUploadError(null);
                }}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="flex-1">{uploadError}</span>
              </div>
            )}

            <div className="space-y-3">
              {/* Upload Dropzone / State */}
              {uploadingAttach ? (
                <div className="border-2 border-dashed border-purple-300 bg-purple-50/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-2">
                  <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                  <p className="text-xs font-semibold text-purple-900">Uploading file to server storage...</p>
                  <p className="text-[11px] text-purple-700 truncate max-w-[280px]">{attachName || 'Please wait'}</p>
                </div>
              ) : attachUrl ? (
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-900">File Uploaded & Ready</span>
                    </div>
                    {attachFileSize && (
                      <span className="text-[10px] text-emerald-700 font-mono font-medium">
                        {(attachFileSize / 1024 / 1024).toFixed(2)} MB
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between bg-white border border-emerald-200 rounded-xl p-2 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <File className="w-4 h-4 text-purple-600 shrink-0" />
                      <span className="truncate font-medium text-slate-800">{attachName}</span>
                    </div>
                    <label className="cursor-pointer text-[11px] font-semibold text-purple-700 hover:text-purple-900 shrink-0 ml-2">
                      Change
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileUpload(f);
                        }}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <label className="border-2 border-dashed border-slate-300 hover:border-purple-400 bg-slate-50/60 hover:bg-purple-50/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all group">
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f);
                    }}
                  />
                  <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-800">Click to browse or drag and drop file</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Documents (PDF, DOCX), Images (PNG, JPG), Videos (MP4, MOV), Audio, or ZIP
                  </p>
                </label>
              )}

              {/* Metadata Details */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-700 font-semibold">File Format / Category:</label>
                <select
                  value={attachType}
                  onChange={(e) => setAttachType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 text-xs focus:outline-none focus:border-purple-500 focus:bg-white font-medium"
                >
                  <option value="DOCUMENT">Document (PDF, DOCX, TXT)</option>
                  <option value="IMAGE">Image (PNG, JPG, WEBP)</option>
                  <option value="VIDEO">Video (MP4, MOV)</option>
                  <option value="AUDIO">Audio (MP3, WAV)</option>
                  <option value="REFERENCE">Reference File (ZIP, PSD, RAW, CSV)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-700 font-semibold">File Title / Display Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Export_Settings_v2.pdf, Location_Photo.jpg"
                  value={attachName}
                  onChange={(e) => setAttachName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 text-xs focus:outline-none focus:border-purple-500 focus:bg-white placeholder-slate-400 transition-colors"
                />
              </div>

              {/* Optional Manual Link Fallback */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowManualLinkInput((prev) => !prev)}
                  className="text-[11px] text-slate-500 hover:text-purple-600 flex items-center gap-1 font-medium"
                >
                  <LinkIcon className="w-3 h-3" />
                  {showManualLinkInput ? 'Hide link input' : 'Or attach via direct URL / storage link'}
                </button>

                {showManualLinkInput && (
                  <div className="mt-1.5 space-y-1">
                    <input
                      type="url"
                      placeholder="https://... or /uploads/..."
                      value={attachUrl}
                      onChange={(e) => setAttachUrl(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 text-xs focus:outline-none focus:border-purple-500 focus:bg-white placeholder-slate-400 transition-colors"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowAttachModal(false);
                  setUploadError(null);
                }}
                className="px-3.5 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleAddAttachment(Boolean(replyingToId))}
                disabled={!attachName.trim() || !attachUrl.trim() || uploadingAttach}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Attach File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
