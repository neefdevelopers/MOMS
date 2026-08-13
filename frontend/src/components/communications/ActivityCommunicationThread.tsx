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
} from 'lucide-react';

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

  // Reply State for Communications
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<any[]>([]);
  const [submittingReply, setSubmittingReply] = useState(false);

  // Blocker Resolution Modal State
  const [resolvingBlockerId, setResolvingBlockerId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submittingResolution, setSubmittingResolution] = useState(false);

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
          subject: subject.trim() || (isRemark ? 'Operational Remark' : isAnnounce ? (priority === 'HIGH_PRIORITY' ? '🚨 Company Announcement (High Priority)' : 'Company Announcement') : isBlockerReq ? `[BLOCKER] ${blockerReason.replace(/_/g, ' ')}` : undefined),
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
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'QUESTION':
      case 'CLARIFICATION':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'REQUIREMENT':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'APPROVAL_REQUEST':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'REVIEW_COMMENT':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'ISSUE_REPORT':
      case 'BLOCKER':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      default:
        return 'bg-zinc-700/30 text-zinc-300 border-zinc-600/30';
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'DELIVERED':
        return 'bg-purple-950/80 text-purple-300 border-purple-800/80';
      case 'READ':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80';
      case 'CLOSED':
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
      default:
        return 'bg-blue-950/80 text-blue-300 border-blue-800/80';
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
            className="bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold px-1.5 py-0.5 rounded text-[11px] inline-flex items-center gap-0.5"
          >
            <AtSign className="w-3 h-3 text-blue-400" />
            {part.substring(1)}
          </span>
        );
      }
      return part;
    });
  };

  const renderAttachmentItem = (att: any) => {
    const isImg = att.fileType === 'IMAGE' || (att.fileUrl && att.fileUrl.match(/\.(jpeg|jpg|png|webp|gif)$/i));
    const isVid = att.fileType === 'VIDEO' || (att.fileUrl && att.fileUrl.match(/\.(mp4|webm|mov)$/i));
    const isAud = att.fileType === 'AUDIO' || (att.fileUrl && att.fileUrl.match(/\.(mp3|wav|ogg)$/i));

    if (isImg) {
      return (
        <div key={att.id || att.fileUrl} className="group relative bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden p-1 space-y-1">
          <img src={att.fileUrl} alt={att.fileName} className="w-full h-24 object-cover rounded" />
          <div className="flex items-center justify-between text-[10px] text-gray-300 px-1 truncate">
            <span className="truncate flex items-center gap-1 font-medium"><ImageIcon className="w-3 h-3 text-purple-400 shrink-0" />{att.fileName}</span>
            <a href={att.fileUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-white shrink-0"><Download className="w-3 h-3" /></a>
          </div>
        </div>
      );
    }

    if (isVid) {
      return (
        <div key={att.id || att.fileUrl} className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-zinc-200 font-semibold">
            <Video className="w-3.5 h-3.5 text-red-400 shrink-0" /> {att.fileName}
          </div>
          <video src={att.fileUrl} controls className="w-full h-28 object-cover rounded bg-black" />
        </div>
      );
    }

    if (isAud) {
      return (
        <div key={att.id || att.fileUrl} className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-zinc-200 font-semibold">
            <Music className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> {att.fileName}
          </div>
          <audio src={att.fileUrl} controls className="w-full h-8" />
        </div>
      );
    }

    return (
      <div key={att.id || att.fileUrl} className="flex items-center justify-between bg-zinc-950 border border-zinc-800 p-2 rounded-lg text-xs">
        <div className="flex items-center gap-2 truncate">
          <File className="w-4 h-4 text-blue-400 shrink-0" />
          <div className="truncate">
            <p className="font-semibold text-zinc-200 truncate">{att.fileName}</p>
            <span className="text-[10px] text-gray-500 font-mono">{att.fileType || 'REFERENCE'}</span>
          </div>
        </div>
        <a href={att.fileUrl} target="_blank" rel="noreferrer" className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded text-[10px] font-semibold flex items-center gap-1 shrink-0">
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
            ? 'ml-5 pl-3 border-l-2 border-blue-500/30 bg-zinc-950/40'
            : isBlockerOpen
            ? 'bg-red-950/20 border-2 border-red-600/60 shadow-lg shadow-red-950/30'
            : isBlocker
            ? 'bg-zinc-900/60 border border-emerald-800/40'
            : isRemark
            ? 'bg-amber-950/10 border border-amber-800/40'
            : isApprovalReq
            ? 'bg-emerald-950/10 border border-emerald-800/40'
            : 'bg-zinc-900/60 border border-border/70'
        } p-3.5 rounded-lg hover:border-zinc-700 transition-colors space-y-2.5`}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2">
          <div className="flex items-center gap-2 flex-wrap">
            {isReply && <CornerDownRight className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
            
            {isBlockerOpen ? (
              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-red-600 text-white border border-red-500 flex items-center gap-1 font-mono uppercase animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" /> BLOCKER - OPEN
              </span>
            ) : isBlocker ? (
              <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-mono uppercase">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> BLOCKER - RESOLVED (PERMANENT HISTORY)
              </span>
            ) : isRemark ? (
              <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-mono uppercase">
                <Bookmark className="w-3 h-3 text-amber-400" /> Operational Remark
              </span>
            ) : (
              <span className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${getBadgeColor(comm.type)}`}>
                {comm.type?.replace('_', ' ')}
              </span>
            )}

            {comm.blockerReason && (
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-red-950/70 text-red-200 border border-red-800/60">
                Reason: {comm.blockerReason.replace(/_/g, ' ')}
              </span>
            )}

            {isApprovalReq && (
              <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Automated Pending Review Item Created
              </span>
            )}

            <h4 className="font-bold text-white text-xs">{comm.subject || (isRemark ? 'Operational Remark' : 'Operational Communication')}</h4>
          </div>

          <div className="flex items-center gap-2">
            {isBlockerOpen && (
              <button
                onClick={() => setResolvingBlockerId(comm.id)}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px] flex items-center gap-1 transition-colors shadow-md"
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
                  className="px-2 py-0.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-[10px] font-medium flex items-center gap-1 transition-colors"
                >
                  <CornerDownRight className="w-3 h-3" /> Reply
                </button>
              </>
            ) : (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-zinc-800 text-zinc-400 border-zinc-700">
                Standalone Remark
              </span>
            )}
          </div>
        </div>

        {/* Structured Blocker Metadata Panel (Reported By, Assigned To, Resolution, Resolution Date) */}
        {isBlocker ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800 text-[11px]">
            <div className="space-y-1">
              <span className="flex items-center gap-1 text-zinc-300">
                <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <strong className="text-zinc-400">Reported By:</strong>{' '}
                <span className="text-white font-semibold">{comm.sender?.name || 'Staff Member'}</span> ({comm.sender?.role || 'STAFF'})
              </span>
              <span className="flex items-center gap-1 text-zinc-300">
                <UserCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <strong className="text-zinc-400">Assigned To:</strong>{' '}
                <span className="text-purple-300 font-semibold">{comm.assignedTo?.name || comm.recipients || 'All Team Members'}</span> {comm.assignedTo?.role ? `(${comm.assignedTo.role})` : ''}
              </span>
            </div>

            <div className="space-y-1">
              {comm.blockerStatus === 'RESOLVED' ? (
                <>
                  <span className="flex items-center gap-1 text-emerald-300">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <strong className="text-zinc-400">Resolution:</strong>{' '}
                    <span className="text-emerald-200 font-medium">{comm.resolutionNotes || 'Operational Blocker resolved.'}</span>
                  </span>
                  <span className="flex items-center gap-1 text-zinc-300">
                    <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <strong className="text-zinc-400">Resolution Date:</strong>{' '}
                    <span className="text-white font-mono text-[10px]">
                      {comm.resolvedAt ? `${new Date(comm.resolvedAt).toLocaleDateString()} ${new Date(comm.resolvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'N/A'}
                    </span>
                  </span>
                </>
              ) : (
                <span className="flex items-center gap-1 text-red-400">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <strong className="text-zinc-400">Resolution Status:</strong> <span className="text-red-300 font-bold">Unresolved (Active Open Blocker)</span>
                </span>
              )}
            </div>
          </div>
        ) : (
          /* Standard Structured Meta Line */
          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-gray-400 bg-zinc-950/50 p-2 rounded border border-zinc-800/50">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1 text-zinc-300">
                <User className="w-3 h-3 text-blue-400" />
                <strong className="text-white">{comm.sender?.name || 'Staff Member'}</strong> ({comm.sender?.role || 'STAFF'})
              </span>
              {!isRemark && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="flex items-center gap-1 text-zinc-400">
                    <Users className="w-3 h-3 text-purple-400" />
                    Recipients: <span className="text-zinc-200 font-medium">{comm.recipients || 'All Assigned Team Members'}</span>
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-gray-400" /> {dateStr}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-gray-400" /> {timeStr}
              </span>
            </div>
          </div>
        )}

        {/* Permanent Operational Timeline Stepper (5 Milestones: Created, Delivered, Read, Replied, Closed) */}
        <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/80 space-y-1.5 text-[10px] font-mono">
          <div className="flex items-center justify-between text-zinc-400 font-semibold border-b border-zinc-800/60 pb-1">
            <span className="flex items-center gap-1 text-blue-400">
              <Clock className="w-3 h-3" /> Permanent Operational Timeline (Preserved Indefinitely)
            </span>
            <span className="text-zinc-500 uppercase">Status: {comm.status || 'SENT'}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-0.5">
            {/* 1. Created */}
            <div className="space-y-0.5 bg-zinc-900/60 p-1.5 rounded border border-blue-500/30">
              <span className="text-blue-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-blue-400" /> 1. Created
              </span>
              <p className="text-zinc-300 text-[9px] truncate">{dateStr} {timeStr}</p>
            </div>

            {/* 2. Delivered */}
            <div className={`space-y-0.5 bg-zinc-900/60 p-1.5 rounded border ${comm.deliveredAt ? 'border-purple-500/40' : 'border-zinc-800 opacity-60'}`}>
              <span className={`font-bold flex items-center gap-1 ${comm.deliveredAt ? 'text-purple-300' : 'text-zinc-500'}`}>
                <CheckCircle2 className="w-3 h-3" /> 2. Delivered
              </span>
              <p className="text-zinc-300 text-[9px] truncate">
                {comm.deliveredAt ? `${new Date(comm.deliveredAt).toLocaleDateString()} ${new Date(comm.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Pending'}
              </p>
            </div>

            {/* 3. Read */}
            <div className={`space-y-0.5 bg-zinc-900/60 p-1.5 rounded border ${comm.readAt ? 'border-emerald-500/40' : 'border-zinc-800 opacity-60'}`}>
              <span className={`font-bold flex items-center gap-1 ${comm.readAt ? 'text-emerald-300' : 'text-zinc-500'}`}>
                <Eye className="w-3 h-3" /> 3. Read
              </span>
              <p className="text-zinc-300 text-[9px] truncate">
                {comm.readAt ? `${new Date(comm.readAt).toLocaleDateString()} ${new Date(comm.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Unread'}
              </p>
            </div>

            {/* 4. Replied */}
            <div className={`space-y-0.5 bg-zinc-900/60 p-1.5 rounded border ${comm.replies && comm.replies.length > 0 ? 'border-cyan-500/40' : 'border-zinc-800 opacity-60'}`}>
              <span className={`font-bold flex items-center gap-1 ${comm.replies && comm.replies.length > 0 ? 'text-cyan-300' : 'text-zinc-500'}`}>
                <CornerDownRight className="w-3 h-3" /> 4. Replied
              </span>
              <p className="text-zinc-300 text-[9px] truncate">
                {comm.replies && comm.replies.length > 0 ? `${comm.replies.length} Reply Note(s)` : 'No replies yet'}
              </p>
            </div>

            {/* 5. Closed */}
            <div className={`space-y-0.5 bg-zinc-900/60 p-1.5 rounded border ${comm.closedAt || comm.status === 'CLOSED' ? 'border-amber-500/40' : 'border-zinc-800 opacity-60'}`}>
              <span className={`font-bold flex items-center gap-1 ${comm.closedAt || comm.status === 'CLOSED' ? 'text-amber-300' : 'text-zinc-500'}`}>
                <CheckCircle className="w-3 h-3" /> 5. Closed
              </span>
              <p className="text-zinc-300 text-[9px] truncate">
                {comm.closedAt ? `${new Date(comm.closedAt).toLocaleDateString()} ${new Date(comm.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : comm.status === 'CLOSED' ? 'Closed' : 'Active Thread'}
              </p>
            </div>
          </div>
        </div>

        {/* Message Content Body */}
        <div className="text-zinc-200 leading-relaxed text-xs pl-0.5 whitespace-pre-wrap pt-0.5">
          {renderContentWithMentions(comm.content)}
        </div>

        {/* Render Multi-Format Attachments */}
        {commAtts.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-zinc-800/60">
            <div className="text-[10px] text-gray-400 font-semibold flex items-center gap-1">
              <Paperclip className="w-3 h-3 text-purple-400" /> Attached Record Files ({commAtts.length}):
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {commAtts.map((att: any) => renderAttachmentItem(att))}
            </div>
          </div>
        )}

        {/* Inline Reply Input Box */}
        {!isRemark && isReplying && (
          <div className="pt-2 border-t border-zinc-800 space-y-2 bg-zinc-950 p-2.5 rounded-lg border border-blue-500/30">
            <div className="flex items-center justify-between text-[11px] text-blue-400 font-medium">
              <span className="flex items-center gap-1">
                <CornerDownRight className="w-3 h-3" /> Replying to {comm.sender?.name || 'Author'}
              </span>
              <button
                type="button"
                onClick={() => setReplyingToId(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Attached Reply Files */}
            {replyAttachments.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap text-[10px] bg-zinc-900 p-1.5 rounded border border-zinc-800">
                <span className="text-purple-400 font-semibold">Reply Attachments:</span>
                {replyAttachments.map((att, i) => (
                  <span key={i} className="bg-zinc-800 text-zinc-200 px-2 py-0.5 rounded flex items-center gap-1">
                    <Paperclip className="w-3 h-3" /> {att.fileName}
                    <X className="w-3 h-3 cursor-pointer hover:text-red-400" onClick={() => setReplyAttachments((prev) => prev.filter((_, idx) => idx !== i))} />
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
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-blue-500 placeholder-zinc-500"
              />

              <button
                type="button"
                onClick={() => setShowAttachModal(true)}
                className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-purple-300 border border-purple-500/30 rounded text-xs flex items-center gap-1"
              >
                <Paperclip className="w-3.5 h-3.5" /> Attach
              </button>

              <button
                type="button"
                onClick={() => handlePostReply(comm.id, comm.subject)}
                disabled={!replyContent.trim() || submittingReply}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded flex items-center gap-1 text-xs transition-colors"
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
    <div className="bg-card border border-border rounded-xl p-5 space-y-4 text-xs">
      {/* Top Banner & Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-400" />
          <h3 className="font-semibold text-white">{title}</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium uppercase font-mono">
            {entityType.replace('_', ' ')}
          </span>
          {entityRef && (
            <span className="text-[10px] font-mono bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-700">
              {entityRef}
            </span>
          )}
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg text-[11px]">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'ALL' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-zinc-200'
            }`}
          >
            All Activity
          </button>
          <button
            onClick={() => setActiveTab('COMMUNICATION')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'COMMUNICATION' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-zinc-200'
            }`}
          >
            Communications
          </button>
          <button
            onClick={() => setActiveTab('OPEN_BLOCKER')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'OPEN_BLOCKER' ? 'bg-red-600 text-white shadow' : 'text-gray-400 hover:text-zinc-200'
            }`}
          >
            Open Blockers
          </button>
          <button
            onClick={() => setActiveTab('REMARK')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'REMARK' ? 'bg-amber-600 text-white shadow' : 'text-gray-400 hover:text-zinc-200'
            }`}
          >
            Remarks
          </button>
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className={`space-y-3 ${compact ? 'max-h-64' : 'max-h-96'} overflow-y-auto pr-1 custom-scrollbar`}>
        {loading ? (
          <div className="text-center py-6 text-gray-400 text-xs flex items-center justify-center gap-2">
            <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            Loading activity log...
          </div>
        ) : communications.length === 0 ? (
          <div className="text-center py-6 text-gray-400 bg-zinc-900/40 border border-border/50 rounded-lg p-4">
            <Info className="w-5 h-5 mx-auto mb-1 text-gray-500" />
            <p>No operational entries recorded yet for this {entityType.toLowerCase().replace('_', ' ')}.</p>
            <p className="text-[11px] text-gray-500 mt-1">Post a communication or report a blocker below.</p>
          </div>
        ) : (
          communications.map((comm) => renderSingleCommunication(comm, false))
        )}
      </div>

      {/* Entry Creation Form with Target Manager & Blocker Selector */}
      <form onSubmit={handleSubmitRoot} className="border-t border-border pt-3 space-y-2.5">
        <div className="flex items-center justify-between bg-zinc-900/80 border border-zinc-800 p-1.5 rounded-lg">
          <span className="text-[11px] text-gray-300 font-semibold px-1">Entry Type:</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setEntryMode('COMMUNICATION')}
              className={`px-3 py-1 rounded text-[11px] font-semibold transition-all ${
                entryMode === 'COMMUNICATION'
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-zinc-800 text-gray-400 hover:text-zinc-200'
              }`}
            >
              Communication (Requires Recipients & Replies)
            </button>
            <button
              type="button"
              onClick={() => setEntryMode('REMARK')}
              className={`px-3 py-1 rounded text-[11px] font-semibold transition-all ${
                entryMode === 'REMARK'
                  ? 'bg-amber-600 text-white shadow'
                  : 'bg-zinc-800 text-gray-400 hover:text-zinc-200'
              }`}
            >
              Operational Remark (Standalone Note)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] text-gray-400 font-semibold uppercase">
              {entryMode === 'REMARK' ? 'Remark Subject / Title:' : 'Communication Subject:'}
            </label>
            <input
              type="text"
              placeholder={entryMode === 'REMARK' ? 'Operational remark title...' : 'Communication update title...'}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded p-1.5 text-zinc-200 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          {entryMode === 'COMMUNICATION' ? (
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 font-semibold uppercase">Category:</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded p-1.5 focus:outline-none focus:border-blue-500 font-semibold"
              >
                {categories.map((cat) => (
                  <option key={cat.key} value={cat.key}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-1 opacity-60">
              <label className="text-[10px] text-gray-500 font-semibold uppercase">Responses / Replies:</label>
              <input
                type="text"
                disabled
                value="Disabled for Remarks"
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-500 rounded p-1.5 text-xs cursor-not-allowed"
              />
            </div>
          )}

          {entryMode === 'COMMUNICATION' && type === 'ANNOUNCEMENT' ? (
            <div className="space-y-1">
              <label className="text-[10px] text-purple-400 font-semibold uppercase flex items-center gap-1">
                <Bell className="w-3 h-3 text-purple-400" /> Announcement Priority:
              </label>
              <select
                value={priority}
                onChange={(e: any) => setPriority(e.target.value)}
                className="w-full bg-purple-950/60 border border-purple-700 text-purple-200 text-xs font-semibold rounded p-1.5 focus:outline-none"
              >
                <option value="HIGH_PRIORITY">🚨 High Priority (Alert Banner on Dashboards)</option>
                <option value="NORMAL_PRIORITY">📢 Normal Priority</option>
              </select>
            </div>
          ) : entryMode === 'COMMUNICATION' && (type === 'BLOCKER' || type === 'ISSUE_REPORT') ? (
            <div className="space-y-1">
              <label className="text-[10px] text-red-400 font-semibold uppercase flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Blocker Reason Category:
              </label>
              <select
                value={blockerReason}
                onChange={(e) => setBlockerReason(e.target.value)}
                className="w-full bg-red-950/60 border border-red-700 text-red-200 text-xs font-semibold rounded p-1.5 focus:outline-none"
              >
                <option value="WAITING_FOR_FILES">Waiting for files</option>
                <option value="EQUIPMENT_UNAVAILABLE">Equipment unavailable</option>
                <option value="CLIENT_CLARIFICATION_REQUIRED">Client clarification required</option>
                <option value="MISSING_ASSETS">Missing assets</option>
                <option value="TECHNICAL_ISSUE">Technical issue</option>
                <option value="OTHER">Other Operational Blocker</option>
              </select>
            </div>
          ) : entryMode === 'COMMUNICATION' && type === 'APPROVAL_REQUEST' ? (
            <div className="space-y-1">
              <label className="text-[10px] text-emerald-400 font-semibold uppercase flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Target Review Manager:
              </label>
              <select
                value={targetRole}
                onChange={(e: any) => setTargetRole(e.target.value)}
                className="w-full bg-emerald-950/60 border border-emerald-700 text-emerald-200 text-xs font-semibold rounded p-1.5 focus:outline-none"
              >
                <option value="TECHNICAL_MANAGER">Technical Manager</option>
                <option value="MEDIA_MANAGER">Media Manager</option>
              </select>
            </div>
          ) : entryMode === 'COMMUNICATION' ? (
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 font-semibold uppercase">Recipient(s) (Mandatory):</label>
              <input
                type="text"
                placeholder="e.g. All Team Members, Media Manager..."
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded p-1.5 text-zinc-200 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          ) : (
            <div className="space-y-1 opacity-60">
              <label className="text-[10px] text-gray-500 font-semibold uppercase">Recipient(s):</label>
              <input
                type="text"
                disabled
                value="N/A (Operational Remark)"
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-500 rounded p-1.5 text-xs cursor-not-allowed"
              />
            </div>
          )}
        </div>

        {/* Assigned To Employee Picker for Blockers */}
        {entryMode === 'COMMUNICATION' && (type === 'BLOCKER' || type === 'ISSUE_REPORT') && (
          <div className="space-y-1 bg-red-950/20 p-2 rounded-lg border border-red-900/40">
            <label className="text-[10px] text-purple-300 font-semibold uppercase flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-purple-400" /> Assigned To Employee (Mandatory Blocker Field):
            </label>
            <select
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded p-1.5 focus:outline-none focus:border-purple-500"
            >
              <option value="">-- Select Assigned Staff Member --</option>
              {staffList.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name} ({staff.role})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Quick Staff Mention Bar */}
        {staffList.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
            <span className="text-gray-400 font-semibold flex items-center gap-0.5">
              <AtSign className="w-3 h-3 text-blue-400" /> Mention Employee:
            </span>
            {staffList.map((staff) => (
              <button
                key={staff.id}
                type="button"
                onClick={() => handleAppendMention(staff.name, false)}
                className="px-2 py-0.5 bg-zinc-900 hover:bg-blue-600/20 hover:text-blue-300 border border-zinc-700 rounded text-gray-300 transition-colors whitespace-nowrap font-medium"
              >
                @{staff.name.split(' ')[0]}
              </button>
            ))}
          </div>
        )}

        {/* Attached Files List */}
        {attachments.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap bg-zinc-900 p-2 rounded-lg border border-zinc-800 text-[11px]">
            <span className="text-purple-400 font-semibold flex items-center gap-1">
              <Paperclip className="w-3.5 h-3.5" /> Attachments ({attachments.length}):
            </span>
            {attachments.map((att, idx) => (
              <span key={idx} className="bg-zinc-800 text-zinc-200 px-2 py-0.5 rounded flex items-center gap-1 border border-zinc-700">
                <span className="text-purple-300 font-mono text-[10px]">[{att.fileType}]</span> {att.fileName}
                <X className="w-3 h-3 cursor-pointer hover:text-red-400 ml-1" onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))} />
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2">
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
            rows={2}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-blue-500 placeholder-zinc-500 resize-none"
          />

          <button
            type="button"
            onClick={() => setShowAttachModal(true)}
            className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5 self-end transition-colors"
          >
            <Paperclip className="w-3.5 h-3.5 text-purple-400" /> Attach File
          </button>

          <button
            type="submit"
            disabled={!content.trim() || submitting}
            className={`px-4 py-2 ${
              entryMode === 'REMARK'
                ? 'bg-amber-600 hover:bg-amber-500'
                : type === 'BLOCKER' || type === 'ISSUE_REPORT'
                ? 'bg-red-600 hover:bg-red-500 font-bold'
                : type === 'APPROVAL_REQUEST'
                ? 'bg-emerald-600 hover:bg-emerald-500'
                : 'bg-blue-600 hover:bg-blue-500'
            } disabled:opacity-50 text-white font-medium rounded-lg flex items-center gap-1.5 self-end text-xs transition-colors shadow-md`}
          >
            <Send className="w-3.5 h-3.5" />
            {submitting ? 'Posting...' : entryMode === 'REMARK' ? 'Log Remark' : type === 'BLOCKER' || type === 'ISSUE_REPORT' ? 'Report Blocker' : type === 'APPROVAL_REQUEST' ? 'Request Approval' : 'Post Communication'}
          </button>
        </div>
      </form>

      {/* Blocker Resolution Modal */}
      {resolvingBlockerId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" /> Resolve Operational Blocker
              </h3>
              <button onClick={() => setResolvingBlockerId(null)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-gray-300">
                Provide resolution details to close this blocker. The reporting employee will be automatically notified.
              </p>

              <div className="space-y-1">
                <label className="text-[11px] text-gray-300 font-semibold">Resolution Summary / Action Taken:</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Files received from client, replaced faulty HDMI cable, camera equipment re-assigned..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-zinc-200 text-xs focus:outline-none focus:border-emerald-500 placeholder-zinc-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setResolvingBlockerId(null)}
                className="px-3.5 py-1.5 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleResolveBlocker(resolvingBlockerId)}
                disabled={submittingResolution}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Mark as Resolved
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attach Media File Modal */}
      {showAttachModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-purple-400" /> Attach Media / Reference File
              </h3>
              <button onClick={() => setShowAttachModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] text-gray-300 font-semibold">File Format / Category:</label>
                <select
                  value={attachType}
                  onChange={(e) => setAttachType(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-purple-500"
                >
                  <option value="DOCUMENT">Document (PDF, DOCX, TXT)</option>
                  <option value="IMAGE">Image (PNG, JPG, WEBP)</option>
                  <option value="VIDEO">Video (MP4, MOV)</option>
                  <option value="AUDIO">Audio (MP3, WAV)</option>
                  <option value="REFERENCE">Reference File (ZIP, PSD, RAW, CSV)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-gray-300 font-semibold">File Title / Display Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Export_Settings_v2.pdf, Location_Photo.jpg"
                  value={attachName}
                  onChange={(e) => setAttachName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-zinc-200 text-xs focus:outline-none focus:border-purple-500 placeholder-zinc-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-gray-300 font-semibold">File URL / Storage Link:</label>
                <input
                  type="url"
                  placeholder="https://... or /uploads/..."
                  value={attachUrl}
                  onChange={(e) => setAttachUrl(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-zinc-200 text-xs focus:outline-none focus:border-purple-500 placeholder-zinc-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowAttachModal(false)}
                className="px-3.5 py-1.5 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleAddAttachment(Boolean(replyingToId))}
                disabled={!attachName.trim() || !attachUrl.trim()}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5"
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
