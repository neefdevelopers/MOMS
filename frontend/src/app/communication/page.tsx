'use client';

import React, { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  MessageSquare,
  Plus,
  Search,
  SlidersHorizontal,
  RotateCcw,
  Film,
  FileText,
  Image as ImageIcon,
  CheckSquare,
  Wrench,
  CheckCircle,
  CheckCircle2,
  Eye,
  Send,
  X,
  ExternalLink,
  Layers,
  Calendar,
  User,
  Users,
  Clock,
  Tag,
  Settings,
  ShieldCheck,
  Bell,
  HelpCircle,
  AlertCircle,
  CornerDownRight,
  Bookmark,
  AtSign,
  Paperclip,
  Video,
  Music,
  File,
  Download,
  AlertTriangle,
  UserCheck,
  UploadCloud,
  Loader2,
  Trash2,
  Link as LinkIcon,
} from 'lucide-react';
import Link from 'next/link';

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

const DEFAULT_COMMUNICATION_TYPES = [
  { key: 'GENERAL_NOTE', label: 'General Note' },
  { key: 'APPROVAL_REQUEST', label: 'Approval Request' },
  { key: 'QUESTION', label: 'Question' },
  { key: 'CLARIFICATION', label: 'Clarification' },
  { key: 'REQUIREMENT', label: 'Requirement' },
  { key: 'REVIEW_COMMENT', label: 'Review Comment' },
  { key: 'ISSUE_REPORT', label: 'Issue Report' },
  { key: 'BLOCKER', label: 'Blocker' },
  { key: 'INFORMATION', label: 'Information' },
  { key: 'ANNOUNCEMENT', label: 'Announcement' },
];

export default function CommunicationPage() {
  const { user } = useAuth();
  const [communications, setCommunications] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>(DEFAULT_COMMUNICATION_TYPES);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntityType, setSelectedEntityType] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedProject, setSelectedProject] = useState('ALL');
  const [selectedSender, setSelectedSender] = useState('ALL');
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState('');
  const [filterEntryType, setFilterEntryType] = useState<'ALL' | 'COMMUNICATION' | 'REMARK' | 'OPEN_BLOCKERS'>('ALL');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Requirement 6 View Tabs: All, Inbox, Sent, Requests
  const [activeViewTab, setActiveViewTab] = useState<'ALL' | 'INBOX' | 'SENT' | 'REQUESTS'>('ALL');

  // Note Creation Modal State
  const [modalPriority, setModalPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [entities, setEntities] = useState<any>({});
  const [modalEntryMode, setModalEntryMode] = useState<'COMMUNICATION' | 'REMARK'>('COMMUNICATION');
  const [modalType, setModalType] = useState<string>('PROJECT');
  const [modalEntityId, setModalEntityId] = useState<string>('');
  const [modalSubject, setModalSubject] = useState<string>('');
  const [modalRecipients, setModalRecipients] = useState<string>('All Assigned Team Members');
  const [modalStaffSearch, setModalStaffSearch] = useState<string>('');
  const [blockerStaffSearch, setBlockerStaffSearch] = useState<string>('');
  const [mentionSearch, setMentionSearch] = useState<string>('');
  const [modalCategory, setModalCategory] = useState<string>('GENERAL_NOTE');
  const [modalTargetRole, setModalTargetRole] = useState<'TECHNICAL_MANAGER' | 'MEDIA_MANAGER'>('TECHNICAL_MANAGER');
  const [modalBlockerReason, setModalBlockerReason] = useState<string>('WAITING_FOR_FILES');
  const [modalAssignedToId, setModalAssignedToId] = useState<string>('');
  const [modalStatus, setModalStatus] = useState<string>('SENT');
  const [modalContent, setModalContent] = useState<string>('');
  const [modalAttachments, setModalAttachments] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Attachment Modal inside Hub Modal
  const [showAttachSubModal, setShowAttachSubModal] = useState(false);
  const [attachName, setAttachName] = useState('');
  const [attachUrl, setAttachUrl] = useState('');
  const [attachType, setAttachType] = useState<string>('DOCUMENT');
  const [attachFileSize, setAttachFileSize] = useState<number | null>(null);
  const [uploadingAttach, setUploadingAttach] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showManualLinkInput, setShowManualLinkInput] = useState(false);

  // Reply State for Hub Feed
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // Blocker Resolution Modal State
  const [resolvingBlockerId, setResolvingBlockerId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submittingResolution, setSubmittingResolution] = useState(false);

  // Permanent Audit Timeline State
  const [timelineComm, setTimelineComm] = useState<any | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Chatbot Two-Panel Selection State
  const [selectedCommId, setSelectedCommId] = useState<string | null>(null);

  // Media Manager Custom Category Creation Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

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
      if (modalType === 'PROJECT' && modalEntityId && modalEntityId !== 'GENERAL') {
        formData.append('projectId', modalEntityId);
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

  const loadCommunications = async () => {
    try {
      setLoading(true);
      let queryParams: string[] = [];
      if (selectedEntityType && selectedEntityType !== 'ALL') {
        queryParams.push(`entityType=${selectedEntityType}`);
      }
      if (selectedCategory && selectedCategory !== 'ALL') {
        queryParams.push(`type=${selectedCategory}`);
      }
      if (selectedStatus && selectedStatus !== 'ALL') {
        queryParams.push(`status=${selectedStatus}`);
      }
      if (selectedSender && selectedSender !== 'ALL') {
        queryParams.push(`senderId=${selectedSender}`);
      }
      if (selectedRecipient.trim()) {
        queryParams.push(`recipient=${encodeURIComponent(selectedRecipient.trim())}`);
      }
      if (selectedProject && selectedProject !== 'ALL') {
        queryParams.push(`projectId=${selectedProject}`);
      }
      if (selectedDate) {
        queryParams.push(`date=${selectedDate}`);
      }
      if (filterEntryType === 'REMARK') queryParams.push('isRemark=true');
      if (filterEntryType === 'COMMUNICATION') queryParams.push('isRemark=false');
      if (filterEntryType === 'OPEN_BLOCKERS') queryParams.push('blockerStatus=OPEN');

      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
      const data = await fetchApi(`/communications${queryString}`);

      setCommunications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load operational communications:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadInitialData = async () => {
    try {
      const [dataEntities, dataProjects, dataUsers, dataCategories] = await Promise.all([
        fetchApi('/communications/entities'),
        fetchApi('/projects'),
        fetchApi('/users'),
        fetchApi('/communications/types'),
      ]);
      setEntities(dataEntities || {});
      setProjectsList(Array.isArray(dataProjects) ? dataProjects : []);
      setUsersList(Array.isArray(dataUsers) ? dataUsers : []);

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

      if (dataEntities && dataEntities['PROJECT'] && dataEntities['PROJECT'].length > 0) {
        setModalEntityId(dataEntities['PROJECT'][0].id);
      }
    } catch (err) {
      console.error('Failed to load initial metadata:', err);
    }
  };

  useEffect(() => {
    loadCommunications();
  }, [selectedEntityType, searchQuery, selectedCategory, selectedProject, selectedSender, selectedDate, filterEntryType]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleAddModalAttachment = () => {
    if (!attachName.trim() || !attachUrl.trim()) return;
    setModalAttachments((prev) => [
      ...prev,
      { fileName: attachName.trim(), fileUrl: attachUrl.trim(), fileType: attachType },
    ]);
    setAttachName('');
    setAttachUrl('');
    setAttachFileSize(null);
    setUploadError(null);
    setShowManualLinkInput(false);
    setShowAttachSubModal(false);
  };

  const handleAppendModalMention = (staffName: string) => {
    const tag = `@${staffName.split(' ')[0]} `;
    setModalContent((prev) => prev + tag);
  };

  const handleAppendReplyMention = (staffName: string) => {
    const tag = `@${staffName.split(' ')[0]} `;
    setReplyText((prev) => prev + tag);
  };

  const handleModalTypeChange = (type: string) => {
    setModalType(type);
    if (entities && entities[type] && entities[type].length > 0) {
      setModalEntityId(entities[type][0].id);
    } else {
      setModalEntityId('GENERAL');
    }
  };

  const handlePostNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const isRemark = modalEntryMode === 'REMARK';
    const isAnnouncementType = modalCategory === 'ANNOUNCEMENT';
    const isApprovalReq = modalCategory === 'APPROVAL_REQUEST';
    const isBlockerReq = modalCategory === 'BLOCKER' || modalCategory === 'ISSUE_REPORT';
    const effectiveEntityId = modalEntityId || 'GENERAL';

    // ─── BUSINESS RULE 5: Content required for communications (not remarks) ──
    if (!modalContent.trim()) {
      alert('Policy Violation (Rule 5): Communication content cannot be empty.');
      return;
    }

    // ─── BUSINESS RULE 8: Announcements restricted to Media Manager ──────────
    const userRole = user?.role as string;
    if (isAnnouncementType && userRole !== 'MEDIA_MANAGER' && userRole !== 'ADMIN') {
      alert('Policy Violation (Rule 8): Company-wide announcements may only be published by the Media Manager.');
      return;
    }

    try {
      setSubmitting(true);
      await fetchApi('/communications', {
        method: 'POST',
        body: JSON.stringify({
          entityType: modalType,
          entityId: effectiveEntityId,
          isRemark,
          type: isRemark ? 'GENERAL_NOTE' : modalCategory,
          subject: modalSubject.trim() || (isRemark ? 'Operational Remark' : isBlockerReq ? `[BLOCKER] ${modalBlockerReason.replace(/_/g, ' ')}` : 'Operational Communication'),
          recipients: isRemark
            ? 'N/A (Operational Remark)'
            : isApprovalReq
            ? modalTargetRole === 'MEDIA_MANAGER'
              ? 'Media Manager (Approval Request)'
              : 'Technical Manager (Approval Request)'
            : (modalRecipients.trim() || 'All Assigned Team Members'),
          status: isRemark ? 'CLOSED' : modalStatus,
          priority: modalPriority,
          targetRole: isApprovalReq ? modalTargetRole : undefined,
          blockerReason: isBlockerReq ? modalBlockerReason : undefined,
          assignedToId: isBlockerReq && modalAssignedToId ? modalAssignedToId : undefined,
          content: modalContent.trim(),
          attachments: modalAttachments.length > 0 ? modalAttachments : undefined,
        }),
      });
      setModalContent('');
      setModalSubject('');
      setModalAttachments([]);
      setModalAssignedToId('');
      setIsModalOpen(false);
      await loadCommunications();
    } catch (err: any) {
      const msg = err?.message || err?.error || 'Failed to post operational entry.';
      alert(`Submission Error: ${msg}`);
      console.error('Failed to post operational entry:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostReply = async (parentComm: any) => {
    if (!replyText.trim() || submittingReply) return;

    try {
      setSubmittingReply(true);
      await fetchApi('/communications', {
        method: 'POST',
        body: JSON.stringify({
          entityType: parentComm.entityType,
          entityId: parentComm.entityId,
          parentId: parentComm.id,
          projectId: parentComm.projectId,
          isRemark: false,
          type: 'GENERAL_NOTE',
          subject: parentComm.subject ? `Re: ${parentComm.subject}` : 'Reply Note',
          recipients: parentComm.recipients || 'All Assigned Team Members',
          status: 'SENT',
          content: replyText.trim(),
        }),
      });
      setReplyText('');
      setReplyingToId(null);
      await loadCommunications();
    } catch (err) {
      console.error('Failed to post reply:', err);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleMarkThreadAsRead = async (commId: string) => {
    try {
      await fetchApi(`/communications/${commId}/mark-as-read`, { method: 'PATCH' });
      setCommunications((prevComms) =>
        prevComms.map((c) => {
          if (c.id === commId || c.parentId === commId) {
            return {
              ...c,
              status: 'READ',
              readAt: new Date().toISOString(),
              replies: c.replies?.map((r: any) => ({ ...r, status: 'READ', readAt: new Date().toISOString() })),
            };
          }
          return c;
        })
      );
    } catch (e) {
      console.error('Failed to mark thread as read:', e);
    }
  };

  const handleResolveBlocker = async (id: string) => {
    if (submittingResolution) return;
    try {
      setSubmittingResolution(true);
      await fetchApi(`/communications/${id}/resolve-blocker`, {
        method: 'PATCH',
        body: JSON.stringify({ resolutionNotes: resolutionNotes.trim() || 'Operational Blocker resolved.' }),
      });
      setResolvingBlockerId(null);
      setResolutionNotes('');
      await loadCommunications();
    } catch (err) {
      console.error('Failed to resolve blocker:', err);
    } finally {
      setSubmittingResolution(false);
    }
  };

  const handleOpenTimeline = async (comm: any) => {
    try {
      setTimelineLoading(true);
      setTimelineComm({ ...comm, events: [] });
      const events = await fetchApi(`/communications/${comm.id}/timeline`);
      setTimelineComm({ ...comm, events: Array.isArray(events) ? events : [] });
    } catch (err) {
      console.error('Failed to load timeline:', err);
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleAddCustomCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryLabel.trim() || creatingCategory) return;

    try {
      setCreatingCategory(true);
      const updatedTypes = await fetchApi('/communications/types', {
        method: 'POST',
        body: JSON.stringify({ label: newCategoryLabel.trim() }),
      });
      if (Array.isArray(updatedTypes)) {
        setCategories(updatedTypes);
      }
      setNewCategoryLabel('');
      setIsCategoryModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to introduce new communication type');
    } finally {
      setCreatingCategory(false);
    }
  };

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedEntityType('ALL');
    setSelectedCategory('ALL');
    setSelectedProject('ALL');
    setSelectedSender('ALL');
    setSelectedRecipient('');
    setSelectedStatus('ALL');
    setSelectedDate('');
    setFilterEntryType('ALL');
  };

  const activeFiltersCount = [
    selectedEntityType !== 'ALL',
    selectedCategory !== 'ALL',
    selectedProject !== 'ALL',
    selectedSender !== 'ALL',
    selectedStatus !== 'ALL',
    Boolean(selectedRecipient),
    Boolean(selectedDate),
    filterEntryType !== 'ALL',
  ].filter(Boolean).length;

  const entityPresets = [
    { id: 'ALL', label: 'All Activities', icon: Layers },
    { id: 'PROJECT', label: 'Projects', icon: Film },
    { id: 'GRAPHIC_REQ', label: 'Graphic Reqs', icon: ImageIcon },
    { id: 'TASK', label: 'Tasks', icon: CheckSquare },
    { id: 'EQUIPMENT', label: 'Equipment', icon: Wrench },
    { id: 'APPROVAL', label: 'Approvals', icon: CheckCircle },
    { id: 'REVIEW', label: 'Reviews', icon: Eye },
  ];

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'PROJECT':
        return <Film className="w-3.5 h-3.5 text-blue-600" />;
      case 'SCRIPT':
        return <FileText className="w-3.5 h-3.5 text-amber-600" />;
      case 'GRAPHIC_REQ':
        return <ImageIcon className="w-3.5 h-3.5 text-purple-600" />;
      case 'TASK':
        return <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />;
      case 'EQUIPMENT':
        return <Wrench className="w-3.5 h-3.5 text-cyan-600" />;
      case 'APPROVAL':
        return <CheckCircle className="w-3.5 h-3.5 text-green-400" />;
      case 'REVIEW':
        return <Eye className="w-3.5 h-3.5 text-pink-400" />;
      default:
        return <MessageSquare className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getEntityBadgeColor = (type: string) => {
    switch (type) {
      case 'PROJECT':
        return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'SCRIPT':
        return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'GRAPHIC_REQ':
        return 'bg-purple-50 text-purple-600 border-purple-200';
      case 'TASK':
        return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'EQUIPMENT':
        return 'bg-cyan-50 text-cyan-600 border-cyan-200';
      case 'APPROVAL':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'REVIEW':
        return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      default:
        return 'bg-gray-500/10 text-slate-500 border-gray-500/20';
    }
  };

  const getCategoryPill = (cat: string) => {
    switch (cat) {
      case 'INFORMATION':
      case 'ANNOUNCEMENT':
        return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'QUESTION':
      case 'CLARIFICATION':
        return 'bg-cyan-50 text-cyan-600 border-cyan-200';
      case 'REQUIREMENT':
        return 'bg-purple-50 text-purple-600 border-purple-200';
      case 'APPROVAL_REQUEST':
        return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'REVIEW_COMMENT':
        return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'ISSUE_REPORT':
      case 'BLOCKER':
        return 'bg-rose-50 text-rose-600 border-rose-200';
      default:
        return 'bg-slate-200/30 text-slate-700 border-slate-300';
    }
  };

  const getStatusBadgeClass = (st: string) => {
    switch (st) {
      case 'DELIVERED':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'READ':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CLOSED':
        return 'bg-slate-100 text-slate-500 border-slate-200';
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
        <div key={att.id || att.fileUrl} className="group relative bg-slate-50 border border-slate-200 rounded-lg overflow-hidden p-1 space-y-1">
          <img src={resolvedUrl} alt={att.fileName} className="w-full h-24 object-cover rounded" />
          <div className="flex items-center justify-between text-[10px] text-slate-700 px-1 truncate">
            <span className="truncate flex items-center gap-1 font-medium"><ImageIcon className="w-3 h-3 text-purple-600 shrink-0" />{att.fileName}</span>
            <a href={resolvedUrl} target="_blank" rel="noreferrer" download className="text-blue-600 hover:text-slate-900 shrink-0"><Download className="w-3 h-3" /></a>
          </div>
        </div>
      );
    }

    if (isVid) {
      return (
        <div key={att.id || att.fileUrl} className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-800 font-semibold">
            <Video className="w-3.5 h-3.5 text-rose-600 shrink-0" /> {att.fileName}
          </div>
          <video src={resolvedUrl} controls className="w-full h-28 object-cover rounded bg-black" />
        </div>
      );
    }

    if (isAud) {
      return (
        <div key={att.id || att.fileUrl} className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-800 font-semibold">
            <Music className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> {att.fileName}
          </div>
          <audio src={resolvedUrl} controls className="w-full h-8" />
        </div>
      );
    }

    return (
      <div key={att.id || att.fileUrl} className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs">
        <div className="flex items-center gap-2 truncate">
          <File className="w-4 h-4 text-blue-600 shrink-0" />
          <div className="truncate">
            <p className="font-semibold text-slate-800 truncate">{att.fileName}</p>
            <span className="text-[10px] text-slate-400 font-mono">{att.fileType || 'REFERENCE'}</span>
          </div>
        </div>
        <a href={resolvedUrl} target="_blank" rel="noreferrer" download className="px-2 py-1 bg-blue-50 hover:bg-blue-600/30 text-blue-700 border border-blue-200 rounded text-[10px] font-semibold flex items-center gap-1 shrink-0">
          <Download className="w-3 h-3" /> Download
        </a>
      </div>
    );
  };

  const getEntityLink = (comm: any) => {
    const targetId = comm.realEntityId || comm.projectId || comm.entityId;
    switch (comm.entityType) {
      case 'PROJECT':
        return `/projects/${targetId}`;
      case 'SCRIPT':
        return `/scripts?inspect=${targetId}`;
      case 'GRAPHIC_REQ':
        return `/graphic-reqs?inspect=${targetId}`;
      case 'TASK':
        return `/tasks?inspect=${targetId}`;
      case 'EQUIPMENT':
        return `/equipment?inspect=${targetId}`;
      case 'CALENDAR_EVENT':
      case 'CALENDAR':
        return `/calendar?inspect=${targetId}`;
      case 'APPROVAL':
      case 'REVIEW':
        return `/approvals?inspect=${targetId}`;
      default:
        return comm.projectId ? `/projects/${comm.projectId}` : '#';
    }
  };

  const renderCardThread = (comm: any, isChild = false) => {
    const dt = new Date(comm.createdAt);
    const dateStr = dt.toLocaleDateString();
    const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isReplying = replyingToId === comm.id;
    const isRemark = Boolean(comm.isRemark);
    const commAtts = comm.attachments || [];
    const isApprovalReq = comm.type === 'APPROVAL_REQUEST';
    const isBlocker = Boolean(comm.isBlocker) || comm.type === 'BLOCKER';
    const isBlockerOpen = isBlocker && comm.blockerStatus !== 'RESOLVED';

    const isUnreadMessage = comm.senderId !== user?.id && (!comm.readAt || comm.status !== 'READ');
    const hasUnreadReplies = comm.replies?.some((r: any) => r.senderId !== user?.id && (!r.readAt || r.status !== 'READ'));
    const isThreadUnread = isUnreadMessage || hasUnreadReplies;

    return (
      <div
        key={comm.id}
        onClick={() => {
          if (isThreadUnread) {
            handleMarkThreadAsRead(comm.id);
          }
        }}
        onMouseEnter={() => {
          if (isThreadUnread) {
            handleMarkThreadAsRead(comm.id);
          }
        }}
        className={`${
          isChild
            ? 'ml-6 pl-3 border-l-2 border-blue-200 bg-slate-50/40'
            : isBlockerOpen
            ? 'bg-rose-50 border-2 border-red-600/60 shadow-lg shadow-red-950/30'
            : isThreadUnread
            ? 'bg-blue-50 border-2 border-blue-200 shadow-lg shadow-blue-950/40'
            : isBlocker
            ? 'bg-slate-50/60 border border-emerald-200'
            : isRemark
            ? 'bg-amber-50 border border-amber-200'
            : isApprovalReq
            ? 'bg-emerald-50 border border-emerald-200'
            : 'bg-white border border-slate-200 shadow-sm'
        } hover:border-slate-200 rounded-xl p-4 transition-colors space-y-3 cursor-pointer`}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            {isChild && <CornerDownRight className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md font-semibold border ${getEntityBadgeColor(
                comm.entityType
              )}`}
            >
              {getEntityIcon(comm.entityType)}
              {comm.entityType?.replace('_', ' ')}
            </span>
            <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
              {comm.entityRef}
            </span>

            {isBlockerOpen ? (
              <span className="text-[10px] px-2.5 py-0.5 rounded font-bold bg-red-600 text-white border border-red-500 flex items-center gap-1 font-mono uppercase animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" /> BLOCKER - OPEN
              </span>
            ) : isBlocker ? (
              <span className="text-[10px] px-2.5 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 font-mono uppercase">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> BLOCKER - RESOLVED (PERMANENT HISTORY)
              </span>
            ) : isRemark ? (
              <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 font-mono uppercase">
                <Bookmark className="w-3 h-3 text-amber-600" /> Operational Remark
              </span>
            ) : null}

            {comm.blockerReason && (
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                Reason: {comm.blockerReason.replace(/_/g, ' ')}
              </span>
            )}

            {isApprovalReq && (
              <span className="text-[10px] px-2.5 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Automated Pending Review Item Created
              </span>
            )}

            {isThreadUnread && (
              <span className="text-[10px] px-2.5 py-0.5 rounded font-bold bg-blue-600 text-white border border-blue-400 flex items-center gap-1 font-mono uppercase shadow animate-pulse">
                <Bell className="w-3 h-3 text-white" /> UNREAD REPLY / MESSAGE
              </span>
            )}

            <h3 className="font-bold text-slate-900 text-sm">{comm.subject || (isRemark ? 'Operational Remark' : 'Operational Communication')}</h3>
          </div>

          <div className="flex items-center gap-3">
            {isBlockerOpen && (
              <button
                onClick={() => setResolvingBlockerId(comm.id)}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs flex items-center gap-1 transition-colors shadow-md"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Resolve Blocker
              </button>
            )}

            {!isRemark ? (
              <>
                <span className={`text-[10px] px-2.5 py-0.5 rounded border font-semibold ${getCategoryPill(comm.type)}`}>
                  {categories.find((cat) => cat.key === comm.type)?.label || comm.type?.replace('_', ' ')}
                </span>

                {/* System-Controlled Automated Read Receipt Badge (No manual status selection) */}
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold inline-flex items-center gap-1 ${getStatusBadgeClass(comm.status)}`}>
                  {comm.status === 'READ' ? (
                    <>Read {comm.readAt ? `· ${new Date(comm.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</>
                  ) : comm.status === 'DELIVERED' ? (
                    <>Delivered {comm.deliveredAt ? `· ${new Date(comm.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</>
                  ) : comm.status === 'CLOSED' ? (
                    <>Closed</>
                  ) : (
                    <>Sent</>
                  )}
                </span>

                {/* Permanent Audit Timeline Action */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenTimeline(comm);
                  }}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded text-[10px] font-semibold flex items-center gap-1 transition-colors"
                  title="View Immutable Communication Audit Timeline"
                >
                  <Clock className="w-3 h-3 text-purple-600" /> Timeline
                </button>

                {/* View Parent Record Link */}
                {comm.isEntityAvailable !== false ? (
                  <Link
                    href={getEntityLink(comm)}
                    onClick={(e) => e.stopPropagation()}
                    className="px-2 py-1 bg-purple-50 hover:bg-purple-600/30 text-purple-700 border border-purple-200 rounded text-[10px] font-bold flex items-center gap-1 transition-colors"
                    title="Open Operational Record Context"
                  >
                    <ExternalLink className="w-3 h-3 text-purple-600" /> View Record
                  </Link>
                ) : (
                  <span
                    className="px-2 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[10px] font-bold flex items-center gap-1"
                    title="Parent operational entity is no longer available"
                  >
                    <AlertCircle className="w-3 h-3 text-rose-600" /> Related Record Unavailable
                  </span>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setReplyingToId(isReplying ? null : comm.id);
                  }}
                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-50 text-blue-600 border border-blue-200 rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
                >
                  <CornerDownRight className="w-3 h-3" /> Reply
                </button>
              </>
            ) : (
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded border bg-slate-100 text-slate-500 border-slate-200">
                Standalone Remark
              </span>
            )}

            {!isChild && (
              <Link
                href={getEntityLink(comm)}
                className="text-[11px] text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium bg-blue-50 hover:bg-blue-50 px-2 py-0.5 rounded border border-blue-200 transition-colors"
              >
                View Record <ExternalLink className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>

        {/* Structured Blocker Metadata Panel (Reported By, Assigned To, Resolution, Resolution Date) */}
        {isBlocker ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-slate-50/80 p-3 rounded-lg border border-slate-200 text-[11px]">
            <div className="space-y-1">
              <span className="flex items-center gap-1.5 text-slate-700">
                <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <strong className="text-slate-500">Reported By:</strong>{' '}
                <span className="text-slate-900 font-semibold">{comm.sender?.name || 'Staff Member'}</span> ({comm.sender?.role || 'STAFF'})
              </span>
              <span className="flex items-center gap-1.5 text-slate-700">
                <UserCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <strong className="text-slate-500">Assigned To:</strong>{' '}
                <span className="text-purple-700 font-semibold">{comm.assignedTo?.name || comm.recipients || 'All Team Members'}</span> {comm.assignedTo?.role ? `(${comm.assignedTo.role})` : ''}
              </span>
            </div>

            <div className="space-y-1">
              {comm.blockerStatus === 'RESOLVED' ? (
                <>
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <strong className="text-slate-500">Resolution:</strong>{' '}
                    <span className="text-emerald-800 font-medium">{comm.resolutionNotes || 'Operational Blocker resolved.'}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <strong className="text-slate-500">Resolution Date:</strong>{' '}
                    <span className="text-slate-800 font-mono text-[10px]">
                      {comm.resolvedAt ? `${new Date(comm.resolvedAt).toLocaleDateString()} ${new Date(comm.resolvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'N/A'}
                    </span>
                  </span>
                </>
              ) : (
                <span className="flex items-center gap-1.5 text-rose-600">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <strong className="text-slate-500">Resolution Status:</strong> <span className="text-rose-700 font-bold">Unresolved (Active Open Blocker)</span>
                </span>
              )}
            </div>
          </div>
        ) : (
          /* Standard Structured Meta Line */
          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 bg-slate-50/50 p-2.5 rounded-lg border border-slate-200">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5 text-slate-800">
                <User className="w-3.5 h-3.5 text-blue-600" />
                Author: <strong className="text-slate-900">{comm.sender?.name || 'Staff Member'}</strong> ({comm.sender?.role || 'STAFF'})
              </span>
              {!isRemark && (
                <>
                  <span className="text-zinc-700">•</span>
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <Users className="w-3.5 h-3.5 text-purple-600" />
                    Recipient(s): <span className="text-slate-800 font-medium">{comm.recipients || 'All Assigned Team Members'}</span>
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500" /> {dateStr}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" /> {timeStr}
              </span>
            </div>
          </div>
        )}

        {/* Permanent Operational Timeline Stepper (5 Milestones: Created, Delivered, Read, Replied, Closed) */}
        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1.5 text-[10px] font-mono">
          <div className="flex items-center justify-between text-slate-500 font-semibold border-b border-slate-200 pb-1">
            <span className="flex items-center gap-1 text-blue-600">
              <Clock className="w-3 h-3" /> Permanent Operational Timeline (Preserved Indefinitely)
            </span>
            <span className="text-slate-400 uppercase">Status: {comm.status || 'SENT'}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-0.5">
            {/* 1. Created */}
            <div className="space-y-0.5 bg-slate-50/60 p-1.5 rounded border border-blue-200">
              <span className="text-blue-600 font-bold flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-blue-600" /> 1. Created
              </span>
              <p className="text-slate-700 text-[9px] truncate">{dateStr} {timeStr}</p>
            </div>

            {/* 2. Delivered */}
            <div className={`space-y-0.5 bg-slate-50/60 p-1.5 rounded border ${comm.deliveredAt ? 'border-purple-200' : 'border-slate-200 opacity-60'}`}>
              <span className={`font-bold flex items-center gap-1 ${comm.deliveredAt ? 'text-purple-700' : 'text-slate-400'}`}>
                <CheckCircle className="w-3 h-3" /> 2. Delivered
              </span>
              <p className="text-slate-700 text-[9px] truncate">
                {comm.deliveredAt ? `${new Date(comm.deliveredAt).toLocaleDateString()} ${new Date(comm.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Pending'}
              </p>
            </div>

            {/* 3. Read */}
            <div className={`space-y-0.5 bg-slate-50/60 p-1.5 rounded border ${comm.readAt ? 'border-emerald-200' : 'border-slate-200 opacity-60'}`}>
              <span className={`font-bold flex items-center gap-1 ${comm.readAt ? 'text-emerald-700' : 'text-slate-400'}`}>
                <Eye className="w-3 h-3" /> 3. Read
              </span>
              <p className="text-slate-700 text-[9px] truncate">
                {comm.readAt ? `${new Date(comm.readAt).toLocaleDateString()} ${new Date(comm.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Unread'}
              </p>
            </div>

            {/* 4. Replied */}
            <div className={`space-y-0.5 bg-slate-50/60 p-1.5 rounded border ${comm.replies && comm.replies.length > 0 ? 'border-cyan-200' : 'border-slate-200 opacity-60'}`}>
              <span className={`font-bold flex items-center gap-1 ${comm.replies && comm.replies.length > 0 ? 'text-cyan-700' : 'text-slate-400'}`}>
                <CornerDownRight className="w-3 h-3" /> 4. Replied
              </span>
              <p className="text-slate-700 text-[9px] truncate">
                {comm.replies && comm.replies.length > 0 ? `${comm.replies.length} Reply Note(s)` : 'No replies yet'}
              </p>
            </div>

            {/* 5. Closed */}
            <div className={`space-y-0.5 bg-slate-50/60 p-1.5 rounded border ${comm.closedAt || comm.status === 'CLOSED' ? 'border-amber-200' : 'border-slate-200 opacity-60'}`}>
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
        <div className="text-slate-800 text-xs leading-relaxed whitespace-pre-wrap pl-1 pt-0.5">
          {renderContentWithMentions(comm.content)}
        </div>

        {/* Multi-Format Media Attachments */}
        {commAtts.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-slate-200">
            <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
              <Paperclip className="w-3.5 h-3.5 text-purple-600" /> Multi-Format Attachments ({commAtts.length}):
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {commAtts.map((att: any) => renderAttachmentItem(att))}
            </div>
          </div>
        )}

        {/* Inline Reply Form */}
        {!isRemark && isReplying && (
          <div className="pt-2 border-t border-slate-200 space-y-2 bg-slate-50 p-3 rounded-lg border border-blue-200 mt-2">
            <div className="flex items-center justify-between text-[11px] text-blue-600 font-medium">
              <span className="flex items-center gap-1">
                <CornerDownRight className="w-3.5 h-3.5" /> Replying to {comm.sender?.name || 'Author'}
              </span>
              <button
                type="button"
                onClick={() => setReplyingToId(null)}
                className="text-slate-500 hover:text-slate-900"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Staff Mention Bar */}
            {usersList.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
                <span className="text-slate-400 font-semibold flex items-center gap-0.5">
                  <AtSign className="w-3 h-3 text-blue-600" /> Mention:
                </span>
                {usersList.slice(0, 8).map((staff) => (
                  <button
                    key={staff.id}
                    type="button"
                    onClick={() => handleAppendReplyMention(staff.name)}
                    className="px-1.5 py-0.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded text-slate-700 transition-colors whitespace-nowrap"
                  >
                    @{staff.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handlePostReply(comm);
                  }
                }}
                placeholder="Type your reply note (use @name to tag employees)..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 text-xs focus:outline-none focus:border-blue-500 focus:bg-white placeholder-slate-400"
              />
              <button
                type="button"
                onClick={() => handlePostReply(comm)}
                disabled={!replyText.trim() || submittingReply}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded flex items-center gap-1.5 text-xs transition-colors shadow-md"
              >
                <Send className="w-3.5 h-3.5" /> Post Reply
              </button>
            </div>
          </div>
        )}

        {/* Nested Child Replies */}
        {!isRemark && comm.replies && comm.replies.length > 0 && (
          <div className="space-y-2.5 pt-2">
            {comm.replies.map((reply: any) => renderCardThread(reply, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 text-xs max-w-7xl mx-auto">
      {/* Header Banner & Operational Summary KPI Grid */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 tracking-tight">
              <div className="p-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-600 shadow-inner">
                <MessageSquare className="w-5 h-5" />
              </div>
              Internal Operational Communication &amp; Remarks Repository
            </h1>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {(user?.role === 'MEDIA_MANAGER' || (user?.role as string) === 'ADMINISTRATOR' || (user?.role as string) === 'ADMIN') && (
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(true)}
                className="px-3.5 py-2.5 bg-purple-50 hover:bg-purple-600/30 text-purple-700 border border-purple-200 font-semibold rounded-xl flex items-center gap-1.5 text-xs transition-all shadow-sm hover:shadow-purple-950/40"
              >
                <Settings className="w-4 h-4 text-purple-600" /> Custom Category
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-2 text-xs transition-all shadow-lg shadow-blue-600/30 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" /> Log Operational Entry
            </button>
          </div>
        </div>

        {/* Quick KPI Operational Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
          <div className="bg-slate-50/60 border border-slate-200 p-3 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Activities</span>
            <div className="flex items-center justify-between">
              <strong className="text-lg text-slate-900 font-bold">{communications.length}</strong>
              <Layers className="w-4 h-4 text-blue-600 opacity-80" />
            </div>
          </div>

          <div className="bg-slate-50/60 border border-slate-200 p-3 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Open Blockers</span>
            <div className="flex items-center justify-between">
              <strong className="text-lg text-rose-600 font-bold">
                {communications.filter((c) => (c.isBlocker || c.type === 'BLOCKER') && c.blockerStatus !== 'RESOLVED').length}
              </strong>
              <AlertTriangle className="w-4 h-4 text-rose-600 opacity-80 animate-pulse" />
            </div>
          </div>

          <div className="bg-slate-50/60 border border-slate-200 p-3 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Unread Items</span>
            <div className="flex items-center justify-between">
              <strong className="text-lg text-blue-700 font-bold">
                {communications.filter((c) => c.senderId !== user?.id && (!c.readAt || c.status !== 'READ')).length}
              </strong>
              <Bell className="w-4 h-4 text-blue-600 opacity-80" />
            </div>
          </div>

          <div className="bg-slate-50/60 border border-slate-200 p-3 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Pending Requests</span>
            <div className="flex items-center justify-between">
              <strong className="text-lg text-emerald-600 font-bold">
                {communications.filter((c) => c.type === 'APPROVAL_REQUEST').length}
              </strong>
              <ShieldCheck className="w-4 h-4 text-emerald-600 opacity-80" />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation View Tabs: All, Inbox, Sent, Requests */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveViewTab('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
            activeViewTab === 'ALL'
              ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-md'
              : 'bg-slate-50/60 text-slate-500 hover:text-slate-900 border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4 text-blue-600" />
          <span>All Communications ({communications.length})</span>
        </button>

        <button
          onClick={() => setActiveViewTab('INBOX')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
            activeViewTab === 'INBOX'
              ? 'bg-emerald-600/20 text-emerald-700 border-emerald-200 shadow-md'
              : 'bg-slate-50/60 text-slate-500 hover:text-slate-900 border-slate-200'
          }`}
        >
          <Bell className="w-4 h-4 text-emerald-600" />
          <span>Inbox (Received)</span>
        </button>

        <button
          onClick={() => setActiveViewTab('SENT')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
            activeViewTab === 'SENT'
              ? 'bg-purple-50 text-purple-700 border-purple-200 shadow-md'
              : 'bg-slate-50/60 text-slate-500 hover:text-slate-900 border-slate-200'
          }`}
        >
          <Send className="w-4 h-4 text-purple-600" />
          <span>Sent</span>
        </button>

        <button
          onClick={() => setActiveViewTab('REQUESTS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
            activeViewTab === 'REQUESTS'
              ? 'bg-amber-50 text-amber-800 border-amber-200 shadow-md'
              : 'bg-slate-50/60 text-slate-500 hover:text-slate-900 border-slate-200'
          }`}
        >
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <span>Requests &amp; Blockers</span>
        </button>
      </div>

      {/* MOMS 11-Parameter Filtration Control Panel */}
      <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-4 text-xs shadow-md">
        {/* Search Bar & Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search notes by subject, message, @mention, entity code, recipient, or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl pl-9 pr-8 py-2.5 text-slate-900 font-medium focus:outline-none transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-900"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Classification Filter Switcher */}
            <div className="flex items-center bg-slate-50 border border-slate-200 p-0.5 rounded-lg">
              <button
                onClick={() => setFilterEntryType('ALL')}
                className={`px-3 py-1.5 rounded-md font-semibold text-xs transition-all ${
                  filterEntryType === 'ALL'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All Activity
              </button>
              <button
                onClick={() => setFilterEntryType('COMMUNICATION')}
                className={`px-3 py-1.5 rounded-md font-semibold text-xs transition-all ${
                  filterEntryType === 'COMMUNICATION'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Communications Only
              </button>
              <button
                onClick={() => setFilterEntryType('OPEN_BLOCKERS')}
                className={`px-3 py-1.5 rounded-md font-semibold text-xs transition-all ${
                  filterEntryType === 'OPEN_BLOCKERS'
                    ? 'bg-red-600 text-white shadow'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Open Blockers
              </button>
              <button
                onClick={() => setFilterEntryType('REMARK')}
                className={`px-3 py-1.5 rounded-md font-semibold text-xs transition-all ${
                  filterEntryType === 'REMARK'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Remarks Only
              </button>
            </div>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-3.5 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-colors border ${
                showAdvancedFilters || activeFiltersCount > 0
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600" />
              <span>Advanced Filters</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-purple-500 text-white font-bold text-[10px] flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {(searchQuery || activeFiltersCount > 0) && (
              <button
                onClick={resetAllFilters}
                className="px-3 py-2 bg-rose-50 hover:bg-red-900/60 border border-rose-200 text-rose-700 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Entity Presets Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-slate-200 pt-3 custom-scrollbar">
          {entityPresets.map((preset) => {
            const Icon = preset.icon;
            const active = selectedEntityType === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => setSelectedEntityType(preset.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap text-xs border ${
                  active
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20 font-semibold'
                    : 'bg-slate-50/80 text-slate-500 hover:bg-slate-100 hover:text-slate-800 border-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Expandable Advanced Filters Drawer */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/60 border border-slate-200 p-4 rounded-xl pt-3">
            <div className="space-y-1">
              <label className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                <Tag className="w-3 h-3 text-purple-600" /> Operational Entity Type
              </label>
              <select
                value={selectedEntityType}
                onChange={(e) => setSelectedEntityType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg focus:border-blue-500 focus:bg-white focus:outline-none"
              >
                <option value="ALL">All Entity Types</option>
                <option value="PROJECT">Shoot Project</option>
                <option value="GRAPHIC_REQ">Graphic Requirement</option>
                <option value="TASK">Task Assignment</option>
                <option value="EQUIPMENT">Equipment Item</option>
                <option value="APPROVAL">Approval Record</option>
                <option value="REVIEW">Review Item</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                <MessageSquare className="w-3 h-3 text-amber-600" /> Structured Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg focus:border-blue-500 focus:bg-white focus:outline-none"
              >
                <option value="ALL">All Structured Categories</option>
                {categories.map((cat) => (
                  <option key={cat.key} value={cat.key}>
                    {cat.label} {cat.custom ? '(Custom)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                <Film className="w-3.5 h-3.5 text-blue-600" /> Linked Project
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg focus:border-blue-500 focus:bg-white focus:outline-none"
              >
                <option value="ALL">All Shoot Projects</option>
                {projectsList.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.projectId}] {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                <User className="w-3 h-3 text-cyan-600" /> Sender / Author
              </label>
              <select
                value={selectedSender}
                onChange={(e) => setSelectedSender(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg focus:border-blue-500 focus:bg-white focus:outline-none"
              >
                <option value="ALL">All Senders</option>
                {usersList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                <Users className="w-3 h-3 text-purple-600" /> Recipient Filter (Search / Select Staff)
              </label>
              <select
                value={selectedRecipient}
                onChange={(e) => setSelectedRecipient(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg focus:border-blue-500 focus:bg-white focus:outline-none"
              >
                <option value="">All Recipients</option>
                <option value="Media Manager">Media Manager</option>
                <option value="Technical Manager">Technical Manager</option>
                <option value="All Assigned Team Members">All Assigned Team Members</option>
                <optgroup label="All Staff Members">
                  {usersList.map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.name} — {u.role.replace(/_/g, ' ')}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                <CheckSquare className="w-3 h-3 text-emerald-600" /> Delivery Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg focus:border-blue-500 focus:bg-white focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="SENT">Sent</option>
                <option value="DELIVERED">Delivered</option>
                <option value="READ">Read</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-600" /> Creation Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg focus:border-blue-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Two-Panel Chatbot Layout Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Activity List & Search/Filter Feed (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          {/* MOMS Filtration Control Panel */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-3 text-xs shadow-md">
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search communications, @mentions, code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl pl-9 pr-8 py-2 text-slate-900 font-medium focus:outline-none transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-900"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Entry Classification Switcher */}
            <div className="grid grid-cols-4 gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl text-[10px] font-semibold text-center">
              <button
                onClick={() => setFilterEntryType('ALL')}
                className={`py-1 rounded-lg transition-all ${filterEntryType === 'ALL' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-900'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilterEntryType('COMMUNICATION')}
                className={`py-1 rounded-lg transition-all ${filterEntryType === 'COMMUNICATION' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Comms
              </button>
              <button
                onClick={() => setFilterEntryType('OPEN_BLOCKERS')}
                className={`py-1 rounded-lg transition-all ${filterEntryType === 'OPEN_BLOCKERS' ? 'bg-red-600 text-white shadow' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Blockers
              </button>
              <button
                onClick={() => setFilterEntryType('REMARK')}
                className={`py-1 rounded-lg transition-all ${filterEntryType === 'REMARK' ? 'bg-amber-600 text-white shadow' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Remarks
              </button>
            </div>

            {/* Entity Type Preset Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              {entityPresets.map((preset) => {
                const Icon = preset.icon;
                const active = selectedEntityType === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => setSelectedEntityType(preset.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap text-[11px] border ${
                      active
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md font-semibold'
                        : 'bg-slate-50/80 text-slate-500 hover:bg-slate-100 hover:text-slate-800 border-slate-200'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Activity List Feed Items */}
          <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1 custom-scrollbar">
            {(() => {
              const displayed = communications.filter((comm) => {
                if (activeViewTab === 'SENT') {
                  return comm.senderId === user?.id;
                }
                if (activeViewTab === 'INBOX') {
                  const isNotSender = comm.senderId !== user?.id;
                  const hasExternalReply = comm.replies && comm.replies.some((r: any) => r.senderId !== user?.id);
                  const isAssigned = comm.assignedToId === user?.id;
                  const cleanName = user?.name ? user.name.replace(/\s*\([^)]*\)/g, '').trim() : '';
                  const firstName = cleanName.split(' ')[0] || '';
                  const isMentioned = Boolean(
                    (user?.name && comm.recipients?.includes(user.name)) ||
                    (cleanName && comm.recipients?.includes(cleanName)) ||
                    (firstName && comm.recipients?.includes(firstName)) ||
                    (firstName && comm.content?.includes(`@${firstName}`)) ||
                    (user?.role === 'MEDIA_MANAGER' && (comm.recipients?.includes('Media Manager') || comm.recipients?.includes('MEDIA_MANAGER'))) ||
                    (user?.role === 'TECHNICAL_MANAGER' && (comm.recipients?.includes('Technical Manager') || comm.recipients?.includes('TECHNICAL_MANAGER')))
                  );
                  return isNotSender || hasExternalReply || isAssigned || isMentioned;
                }
                if (activeViewTab === 'REQUESTS') {
                  return (
                    ['APPROVAL_REQUEST', 'CLARIFICATION', 'REQUIREMENT', 'ISSUE_REPORT', 'BLOCKER'].includes(comm.type) ||
                    Boolean(comm.isBlocker)
                  );
                }
                return true;
              });

              if (loading) {
                return (
                  <div className="p-8 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    Loading communications...
                  </div>
                );
              }

              if (displayed.length === 0) {
                return (
                  <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl text-slate-500 space-y-2">
                    <MessageSquare className="w-8 h-8 text-gray-600 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700">No operational entries found</p>
                    <p className="text-[11px] text-slate-400">Try adjusting filters or view tabs.</p>
                  </div>
                );
              }

              // Auto-select first thread if none selected
              const activeComm = displayed.find((c) => c.id === selectedCommId) || displayed[0];
              if (activeComm && activeComm.id !== selectedCommId) {
                setSelectedCommId(activeComm.id);
              }

              return displayed.map((comm) => {
                const isSelected = comm.id === (selectedCommId || activeComm?.id);
                const isUnreadMessage = comm.senderId !== user?.id && (!comm.readAt || comm.status !== 'READ');
                const hasUnreadReplies = comm.replies?.some((r: any) => r.senderId !== user?.id && (!r.readAt || r.status !== 'READ'));
                const isUnread = isUnreadMessage || hasUnreadReplies;
                const isBlockerOpen = (comm.isBlocker || comm.type === 'BLOCKER') && comm.blockerStatus !== 'RESOLVED';

                return (
                  <div
                    key={comm.id}
                    onClick={() => {
                      setSelectedCommId(comm.id);
                      if (isUnread) handleMarkThreadAsRead(comm.id);
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 relative ${
                      isSelected
                        ? 'bg-blue-50 border-2 border-blue-500 shadow-xl shadow-blue-950/40'
                        : isBlockerOpen
                        ? 'bg-rose-50 border border-rose-300 hover:border-red-500'
                        : isUnread
                        ? 'bg-blue-50 border border-blue-200 hover:border-blue-400'
                        : 'bg-white border-slate-200 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${getEntityBadgeColor(comm.entityType)}`}>
                          {getEntityIcon(comm.entityType)} {comm.entityType?.replace('_', ' ')}
                        </span>
                        <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                          {comm.entityRef}
                        </span>
                      </div>

                      {isUnread && (
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></span>
                      )}
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 text-xs line-clamp-1">{comm.subject || 'Operational Communication'}</h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">{comm.content}</p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-200">
                      <span className="truncate">From: {comm.sender?.name || 'Staff'}</span>
                      <span className="shrink-0">{new Date(comm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Right Column: Modern Chatbot Conversation & Thread View (lg:col-span-7) */}
        <div className="lg:col-span-7">
          {(() => {
            const displayed = communications.filter((comm) => {
              if (activeViewTab === 'SENT') return comm.senderId === user?.id;
              if (activeViewTab === 'INBOX') {
                const isNotSender = comm.senderId !== user?.id;
                const hasExternalReply = comm.replies && comm.replies.some((r: any) => r.senderId !== user?.id);
                const isAssigned = comm.assignedToId === user?.id;
                const cleanName = user?.name ? user.name.replace(/\s*\([^)]*\)/g, '').trim() : '';
                const firstName = cleanName.split(' ')[0] || '';
                const isMentioned = Boolean(
                  (user?.name && comm.recipients?.includes(user.name)) ||
                  (cleanName && comm.recipients?.includes(cleanName)) ||
                  (firstName && comm.recipients?.includes(firstName)) ||
                  (firstName && comm.content?.includes(`@${firstName}`)) ||
                  (user?.role === 'MEDIA_MANAGER' && (comm.recipients?.includes('Media Manager') || comm.recipients?.includes('MEDIA_MANAGER'))) ||
                  (user?.role === 'TECHNICAL_MANAGER' && (comm.recipients?.includes('Technical Manager') || comm.recipients?.includes('TECHNICAL_MANAGER')))
                );
                return isNotSender || hasExternalReply || isAssigned || isMentioned;
              }
              if (activeViewTab === 'REQUESTS') {
                return (
                  ['APPROVAL_REQUEST', 'CLARIFICATION', 'REQUIREMENT', 'ISSUE_REPORT', 'BLOCKER'].includes(comm.type) ||
                  Boolean(comm.isBlocker)
                );
              }
              return true;
            });
            const activeComm = communications.find((c) => c.id === selectedCommId) || displayed[0];

            if (!activeComm) {
              return (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 space-y-3 min-h-[500px] flex flex-col items-center justify-center">
                  <MessageSquare className="w-12 h-12 text-zinc-700" />
                  <p className="text-sm font-semibold text-slate-700">No communication thread selected</p>
                  <p className="text-xs text-slate-400">Select an item from the left activity feed to view conversation details.</p>
                </div>
              );
            }

            const isBlocker = Boolean(activeComm.isBlocker) || activeComm.type === 'BLOCKER';
            const isBlockerOpen = isBlocker && activeComm.blockerStatus !== 'RESOLVED';
            const isRemark = Boolean(activeComm.isRemark);
            const commAtts = activeComm.attachments || [];

            return (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col min-h-[700px]">
                {/* Chatbot Header */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] px-2.5 py-1 rounded-md font-semibold border ${getEntityBadgeColor(activeComm.entityType)}`}>
                        {getEntityIcon(activeComm.entityType)} {activeComm.entityType?.replace('_', ' ')}
                      </span>
                      <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                        {activeComm.entityRef}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${getCategoryPill(activeComm.type)}`}>
                        {categories.find((cat) => cat.key === activeComm.type)?.label || activeComm.type?.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Timeline Modal Action */}
                      <button
                        type="button"
                        onClick={() => handleOpenTimeline(activeComm)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Clock className="w-3.5 h-3.5 text-purple-600" /> Timeline
                      </button>

                      {/* View Record Button */}
                      {activeComm.isEntityAvailable !== false ? (
                        <Link
                          href={getEntityLink(activeComm)}
                          className="px-3 py-1 bg-purple-50 hover:bg-purple-600/30 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-purple-600" /> View Record
                        </Link>
                      ) : (
                        <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Unavailable
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-base font-bold text-slate-900">{activeComm.subject || 'Operational Communication'}</h2>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                      <span>From: <strong className="text-slate-900">{activeComm.sender?.name || 'Staff'}</strong> ({activeComm.sender?.role || 'STAFF'})</span>
                      {!isRemark && <span>To: <strong className="text-slate-800">{activeComm.recipients || 'All Team'}</strong></span>}
                    </div>
                  </div>
                </div>

                {/* Structured Blocker Panel if active blocker */}
                {isBlocker && (
                  <div className="p-3 bg-rose-50 border-b border-rose-200 text-xs grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500 block">Reported By: <strong className="text-slate-900">{activeComm.sender?.name}</strong></span>
                      <span className="text-slate-500 block">Assigned To: <strong className="text-purple-700">{activeComm.assignedTo?.name || activeComm.recipients}</strong></span>
                    </div>
                    <div>
                      {isBlockerOpen ? (
                        <div className="flex items-center justify-between">
                          <span className="text-rose-600 font-bold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> OPEN BLOCKER</span>
                          <button
                            onClick={() => setResolvingBlockerId(activeComm.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs"
                          >
                            Resolve
                          </button>
                        </div>
                      ) : (
                        <span className="text-emerald-700 font-semibold block">Resolution: {activeComm.resolutionNotes}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Chat Messages Stream (Bubbles) */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[500px] custom-scrollbar bg-slate-50/40">
                  {/* Lead Message Bubble */}
                  <div className="flex justify-start">
                    <div className="max-w-[85%] bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-4 space-y-2 text-slate-900 shadow-sm">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono border-b border-slate-200 pb-1.5">
                        <span className="font-bold text-blue-700">{activeComm.sender?.name || 'Author'} ({activeComm.sender?.role || 'STAFF'})</span>
                        <span>{new Date(activeComm.createdAt).toLocaleDateString()} {new Date(activeComm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div className="text-xs text-slate-900 whitespace-pre-wrap leading-relaxed font-normal">
                        {renderContentWithMentions(activeComm.content)}
                      </div>

                      {commAtts.length > 0 && (
                        <div className="pt-2 border-t border-slate-200 space-y-1.5">
                          <span className="text-[10px] text-purple-700 font-bold uppercase block">Attachments ({commAtts.length}):</span>
                          <div className="grid grid-cols-1 gap-1.5">
                            {commAtts.map((att: any) => renderAttachmentItem(att))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Threaded Replies (Incoming on LEFT, Outgoing on RIGHT) */}
                  {activeComm.replies && activeComm.replies.map((reply: any) => {
                    const isOutgoing = reply.senderId === user?.id;
                    const replyAtts = reply.attachments || [];

                    return (
                      <div key={reply.id} className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[85%] p-3.5 rounded-2xl space-y-1.5 shadow-sm text-xs ${
                            isOutgoing
                              ? 'bg-blue-50/90 border border-blue-200 text-slate-900 rounded-tr-xs'
                              : 'bg-white border border-slate-200 text-slate-900 rounded-tl-xs'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 border-b border-slate-200/80 pb-1">
                            <span className={isOutgoing ? 'text-blue-700 font-bold' : 'text-purple-700 font-bold'}>
                              {isOutgoing ? 'You' : reply.sender?.name || 'Team Member'}
                            </span>
                            <span>{new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          <div className="text-slate-900 whitespace-pre-wrap leading-relaxed font-normal">{renderContentWithMentions(reply.content)}</div>

                          {replyAtts.length > 0 && (
                            <div className="pt-1.5 border-t border-slate-200 space-y-1">
                              {replyAtts.map((att: any) => renderAttachmentItem(att))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Chatbot Reply Input Bar */}
                {!isRemark && (
                  <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2">
                    {/* Employee Mention Pills */}
                    {usersList.length > 0 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] pb-1 font-mono">
                        <span className="text-slate-400 font-bold">@Mention:</span>
                        {usersList.slice(0, 8).map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => handleAppendReplyMention(u.name)}
                            className="px-2 py-0.5 bg-slate-50 hover:bg-blue-600/30 text-slate-700 border border-slate-200 rounded-full transition-colors"
                          >
                            @{u.name.split(' ')[0]}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handlePostReply(activeComm);
                          }
                        }}
                        placeholder={`Reply to ${activeComm.sender?.name || 'this thread'}... (use @name to tag)`}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-xs focus:outline-none focus:border-blue-500 focus:bg-white placeholder-slate-400 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAttachSubModal(true)}
                        className="p-2.5 bg-slate-50 hover:bg-slate-100 text-purple-600 border border-slate-200 rounded-xl transition-colors"
                        title="Attach File"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePostReply(activeComm)}
                        disabled={!replyText.trim() || submittingReply}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-1.5 text-xs transition-all shadow-lg shadow-blue-600/30"
                      >
                        <Send className="w-4 h-4" /> Send
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Log Operational Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto custom-scrollbar">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Log Operational Activity Entry</h2>
                  <p className="text-[11px] text-slate-500">Record team discussions, flag blockers, request manager sign-offs, or log audit remarks</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePostNote} className="space-y-4">
              {/* 4-Segmented Entry Mode Switcher */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setModalEntryMode('COMMUNICATION');
                    if (modalCategory === 'BLOCKER' || modalCategory === 'ISSUE_REPORT' || modalCategory === 'APPROVAL_REQUEST') {
                      setModalCategory('GENERAL_NOTE');
                    }
                  }}
                  className={`py-2 px-2.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    modalEntryMode === 'COMMUNICATION' && modalCategory !== 'BLOCKER' && modalCategory !== 'ISSUE_REPORT' && modalCategory !== 'APPROVAL_REQUEST'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Discussion
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalEntryMode('COMMUNICATION');
                    setModalCategory('BLOCKER');
                  }}
                  className={`py-2 px-2.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    modalEntryMode === 'COMMUNICATION' && (modalCategory === 'BLOCKER' || modalCategory === 'ISSUE_REPORT')
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Blocker / Issue
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalEntryMode('COMMUNICATION');
                    setModalCategory('APPROVAL_REQUEST');
                  }}
                  className={`py-2 px-2.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    modalEntryMode === 'COMMUNICATION' && modalCategory === 'APPROVAL_REQUEST'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> Approval Request
                </button>
                <button
                  type="button"
                  onClick={() => setModalEntryMode('REMARK')}
                  className={`py-2 px-2.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    modalEntryMode === 'REMARK'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" /> Quick Remark
                </button>
              </div>

              {/* Step 1: Linked Module & Record Context */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-3">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" /> Operational Record Linkage
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-600 font-semibold">Related Module:</label>
                    <select
                      value={modalType}
                      onChange={(e) => handleModalTypeChange(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 text-xs focus:outline-none focus:border-blue-500 font-medium"
                    >
                      <option value="PROJECT">Shoot Project</option>
                      <option value="GRAPHIC_REQ">Graphic Requirement</option>
                      <option value="TASK">Task Assignment</option>
                      <option value="EQUIPMENT">Equipment Item</option>
                      <option value="APPROVAL">Approval Record</option>
                      <option value="REVIEW">Review Item</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-600 font-semibold">Linked Record Entity:</label>
                    <select
                      value={modalEntityId}
                      onChange={(e) => setModalEntityId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 text-xs focus:outline-none focus:border-blue-500 font-medium"
                    >
                      {entities[modalType] && entities[modalType].length > 0 ? (
                        entities[modalType].map((item: any) => (
                          <option key={item.id} value={item.id}>
                            [{item.code || item.id.substring(0, 8)}] {item.name || item.title || item.code}
                          </option>
                        ))
                      ) : (
                        <option value="GENERAL">GENERAL — General Operational Context</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Conditional Classification Row */}
                {modalEntryMode === 'COMMUNICATION' && (modalCategory === 'BLOCKER' || modalCategory === 'ISSUE_REPORT') ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                    <div className="space-y-1">
                      <label className="text-[11px] text-rose-700 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600" /> Blocker Reason Category:
                      </label>
                      <select
                        value={modalBlockerReason}
                        onChange={(e) => setModalBlockerReason(e.target.value)}
                        className="w-full bg-rose-50/50 border border-rose-200 text-rose-900 text-xs font-semibold rounded-lg p-2 focus:outline-none"
                      >
                        <option value="WAITING_FOR_FILES">Waiting for files</option>
                        <option value="EQUIPMENT_UNAVAILABLE">Equipment unavailable</option>
                        <option value="CLIENT_CLARIFICATION_REQUIRED">Client clarification required</option>
                        <option value="MISSING_ASSETS">Missing assets</option>
                        <option value="TECHNICAL_ISSUE">Technical issue</option>
                        <option value="OTHER">Other Operational Blocker</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] text-purple-700 font-semibold flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-purple-600" /> Assignee for Resolution:
                        </label>
                        {blockerStaffSearch && (
                          <button
                            type="button"
                            onClick={() => setBlockerStaffSearch('')}
                            className="text-[10px] text-purple-600 hover:text-purple-800 font-bold"
                          >
                            Clear search
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search staff to assign..."
                          value={blockerStaffSearch}
                          onChange={(e) => setBlockerStaffSearch(e.target.value)}
                          className="w-full bg-purple-50/50 border border-purple-200 text-purple-900 text-xs rounded-lg p-2 pl-7 mb-1.5 focus:outline-none focus:border-purple-400 font-medium placeholder-purple-300"
                        />
                        <Search className="w-3.5 h-3.5 text-purple-400 absolute left-2 top-2.5" />
                      </div>
                      <select
                        value={modalAssignedToId}
                        onChange={(e) => setModalAssignedToId(e.target.value)}
                        className="w-full bg-purple-50/50 border border-purple-200 text-purple-900 text-xs font-semibold rounded-lg p-2 focus:outline-none"
                      >
                        <option value="">-- Select Staff to Resolve Blocker --</option>
                        {usersList
                          .filter((u) => {
                            if (!blockerStaffSearch.trim()) return true;
                            const q = blockerStaffSearch.toLowerCase();
                            return u.name?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
                          })
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} — {u.role.replace(/_/g, ' ')}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                ) : modalEntryMode === 'COMMUNICATION' && modalCategory === 'APPROVAL_REQUEST' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                    <div className="space-y-1">
                      <label className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Target Review Manager:
                      </label>
                      <select
                        value={modalTargetRole}
                        onChange={(e: any) => setModalTargetRole(e.target.value)}
                        className="w-full bg-emerald-50/50 border border-emerald-200 text-emerald-900 text-xs font-semibold rounded-lg p-2 focus:outline-none"
                      >
                        <option value="TECHNICAL_MANAGER">Technical Manager</option>
                        <option value="MEDIA_MANAGER">Media Manager</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-600 font-semibold">Priority Level:</label>
                      <select
                        value={modalPriority}
                        onChange={(e: any) => setModalPriority(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-slate-900 text-xs font-semibold rounded-lg p-2 focus:outline-none"
                      >
                        <option value="LOW">Low Priority</option>
                        <option value="MEDIUM">Medium Priority</option>
                        <option value="HIGH">High Priority</option>
                        <option value="CRITICAL">Critical Priority</option>
                      </select>
                    </div>
                  </div>
                ) : modalEntryMode === 'COMMUNICATION' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-600 font-semibold">Communication Category:</label>
                      <select
                        value={modalCategory}
                        onChange={(e) => setModalCategory(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-slate-900 text-xs rounded-lg p-2 focus:outline-none font-semibold"
                      >
                        {categories.map((cat) => (
                          <option key={cat.key} value={cat.key}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-600 font-semibold">Priority Level:</label>
                      <select
                        value={modalPriority}
                        onChange={(e: any) => setModalPriority(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-slate-900 text-xs font-semibold rounded-lg p-2 focus:outline-none"
                      >
                        <option value="LOW">Low Priority</option>
                        <option value="MEDIUM">Medium Priority</option>
                        <option value="HIGH">High Priority</option>
                        <option value="CRITICAL">Critical Priority</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-200 text-[11px] text-amber-800 bg-amber-50/50 p-2 rounded-lg flex items-center gap-1.5 font-medium">
                    <Bookmark className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    Operational remarks are standalone notes stored directly on the record's immutable audit history.
                  </div>
                )}
              </div>

              {/* Step 2: Target Audience / Recipients with Live Staff Search (Hidden for Remarks) */}
              {modalEntryMode === 'COMMUNICATION' && (
                <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-purple-600" /> Target Audience & Recipients
                    </div>
                    <span className="text-[10px] text-purple-700 font-mono font-bold bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                      {usersList.length} Staff Available
                    </span>
                  </div>

                  {/* Preset Group Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setModalRecipients('All Assigned Team Members')}
                      className={`px-2.5 py-1 text-xs rounded-lg font-semibold border transition-all ${
                        modalRecipients === 'All Assigned Team Members'
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      👥 All Assigned Team
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalRecipients((prev) =>
                          !prev || prev === 'All Assigned Team Members'
                            ? 'Media Manager'
                            : prev.includes('Media Manager')
                            ? prev
                            : `${prev}, Media Manager`
                        );
                      }}
                      className="px-2.5 py-1 text-xs rounded-lg font-semibold bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                    >
                      🎬 Media Manager
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalRecipients((prev) =>
                          !prev || prev === 'All Assigned Team Members'
                            ? 'Technical Manager'
                            : prev.includes('Technical Manager')
                            ? prev
                            : `${prev}, Technical Manager`
                        );
                      }}
                      className="px-2.5 py-1 text-xs rounded-lg font-semibold bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                    >
                      ⚙️ Technical Manager
                    </button>
                    {modalRecipients && modalRecipients !== 'All Assigned Team Members' && (
                      <button
                        type="button"
                        onClick={() => setModalRecipients('')}
                        className="px-2.5 py-1 text-xs rounded-lg font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 ml-auto flex items-center gap-1"
                      >
                        <X className="w-3 h-3" /> Clear Selected
                      </button>
                    )}
                  </div>

                  {/* Selected Recipients Summary Chips */}
                  {modalRecipients && modalRecipients !== 'All Assigned Team Members' && (
                    <div className="bg-purple-50/60 border border-purple-200 rounded-lg p-2 space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-purple-600" /> Active Selected Staff ({modalRecipients.split(',').filter(Boolean).length}):
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {modalRecipients
                          .split(',')
                          .map((item) => item.trim())
                          .filter(Boolean)
                          .map((item, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white text-purple-900 border border-purple-300 text-xs font-medium shadow-2xs"
                            >
                              <span>{item}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const parts = modalRecipients
                                    .split(',')
                                    .map((s) => s.trim())
                                    .filter((s) => s && s !== item);
                                  setModalRecipients(parts.length > 0 ? parts.join(', ') : '');
                                }}
                                className="text-slate-400 hover:text-rose-600 rounded-full p-0.5 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Live Staff Search Box */}
                  <div className="space-y-1.5">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search staff by name, role (e.g. video editor, camera), or email..."
                        value={modalStaffSearch}
                        onChange={(e) => setModalStaffSearch(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-8 pr-8 text-slate-900 text-xs focus:outline-none focus:border-purple-500 font-medium placeholder-slate-400 shadow-2xs"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                      {modalStaffSearch && (
                        <button
                          type="button"
                          onClick={() => setModalStaffSearch('')}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Search Results / Staff Selection Grid */}
                    <div className="max-h-40 overflow-y-auto custom-scrollbar border border-slate-200 rounded-lg bg-white divide-y divide-slate-100">
                      {usersList
                        .filter((u) => {
                          if (!modalStaffSearch.trim()) return true;
                          const q = modalStaffSearch.toLowerCase();
                          return (
                            u.name?.toLowerCase().includes(q) ||
                            u.role?.toLowerCase().includes(q) ||
                            u.email?.toLowerCase().includes(q)
                          );
                        })
                        .map((staff) => {
                          const staffLabel = `${staff.name} (${staff.role.replace(/_/g, ' ')})`;
                          const isSelected =
                            modalRecipients === 'All Assigned Team Members'
                              ? false
                              : modalRecipients.toLowerCase().includes(staff.name.toLowerCase());

                          return (
                            <div
                              key={staff.id}
                              onClick={() => {
                                setModalRecipients((prev) => {
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
                              className={`p-2 flex items-center justify-between cursor-pointer transition-colors ${
                                isSelected ? 'bg-purple-50 hover:bg-purple-100/70' : 'hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                                    isSelected ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
                                  }`}
                                >
                                  {staff.name ? staff.name.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-slate-900 truncate">{staff.name}</div>
                                  <div className="text-[10px] text-slate-500 truncate flex items-center gap-1.5">
                                    <span className="font-mono text-purple-700">{staff.role.replace(/_/g, ' ')}</span>
                                    {staff.email && <span className="text-slate-400">• {staff.email}</span>}
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                className={`text-[11px] px-2 py-0.5 rounded font-semibold transition-all shrink-0 ml-2 ${
                                  isSelected
                                    ? 'bg-purple-600 text-white shadow-2xs'
                                    : 'bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200'
                                }`}
                              >
                                {isSelected ? '✓ Added' : '+ Add Staff'}
                              </button>
                            </div>
                          );
                        })}
                      {usersList.filter((u) => {
                        if (!modalStaffSearch.trim()) return true;
                        const q = modalStaffSearch.toLowerCase();
                        return (
                          u.name?.toLowerCase().includes(q) ||
                          u.role?.toLowerCase().includes(q) ||
                          u.email?.toLowerCase().includes(q)
                        );
                      }).length === 0 && (
                        <div className="p-4 text-center text-xs text-slate-400">
                          No staff members found matching "{modalStaffSearch}".
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Message & Assets Composer */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-3">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" /> Message & Attachments
                </div>

                {/* Subject Line */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-700 font-semibold">
                    {modalEntryMode === 'REMARK' ? 'Remark Subject / Title:' : 'Subject / Headline:'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      modalEntryMode === 'REMARK'
                        ? 'Operational remark headline...'
                        : modalCategory === 'BLOCKER' || modalCategory === 'ISSUE_REPORT'
                        ? 'e.g. Missing raw footage files for Scene 3...'
                        : modalCategory === 'APPROVAL_REQUEST'
                        ? 'e.g. Requesting technical sign-off for v2 color grading...'
                        : 'e.g. Update regarding camera equipment and timeline...'
                    }
                    value={modalSubject}
                    onChange={(e) => setModalSubject(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 text-xs focus:outline-none focus:border-blue-500 placeholder-slate-400 font-medium"
                  />
                </div>

                {/* Message Body */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-700 font-semibold">Message Body:</label>
                  <textarea
                    rows={4}
                    required
                    value={modalContent}
                    onChange={(e) => setModalContent(e.target.value)}
                    placeholder={
                      modalEntryMode === 'REMARK'
                        ? 'Type operational remark (e.g. @Rahul please verify)...'
                        : modalCategory === 'BLOCKER' || modalCategory === 'ISSUE_REPORT'
                        ? 'Provide detailed description of the blocker, what is missing, and impact...'
                        : modalCategory === 'APPROVAL_REQUEST'
                        ? `Describe the items requiring approval from the ${modalTargetRole === 'MEDIA_MANAGER' ? 'Media Manager' : 'Technical Manager'}...`
                        : 'Type operational message content (use @name to mention staff)...'
                    }
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 text-xs focus:outline-none focus:border-blue-500 placeholder-slate-400 resize-y"
                  />
                </div>

                {/* Composer Toolbar (Searchable Quick @ Mentions + Upload & Attach Button) */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200">
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
                        className="w-24 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:border-blue-400"
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
                    {usersList
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
                          onClick={() => handleAppendModalMention(staff.name)}
                          className="px-1.5 py-0.5 bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded text-slate-700 transition-colors whitespace-nowrap font-medium shrink-0"
                        >
                          @{staff.name.split(' ')[0]}
                        </button>
                      ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAttachSubModal(true)}
                    className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-purple-600" />
                    Upload & Attach File
                    {modalAttachments.length > 0 && (
                      <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">
                        {modalAttachments.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Attached Files Chips */}
                {modalAttachments.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap bg-white p-2 rounded-lg border border-purple-200 text-xs">
                    <span className="text-purple-700 font-bold text-[11px] flex items-center gap-1 mr-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" /> Attached ({modalAttachments.length}):
                    </span>
                    {modalAttachments.map((att, idx) => (
                      <span key={idx} className="bg-purple-50 text-purple-900 px-2 py-0.5 rounded-md flex items-center gap-1.5 border border-purple-200 text-[11px]">
                        <span className="text-purple-700 font-mono text-[9px] font-bold">[{att.fileType}]</span>
                        <span className="truncate max-w-[140px] font-medium">{att.fileName}</span>
                        <X
                          className="w-3 h-3 cursor-pointer hover:text-rose-600 ml-0.5"
                          onClick={() => setModalAttachments((prev) => prev.filter((_, i) => i !== idx))}
                        />
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!modalContent.trim() || submitting}
                  className={`px-5 py-2 ${
                    modalEntryMode === 'REMARK'
                      ? 'bg-amber-600 hover:bg-amber-500'
                      : modalCategory === 'BLOCKER' || modalCategory === 'ISSUE_REPORT'
                      ? 'bg-rose-600 hover:bg-rose-500 font-bold'
                      : modalCategory === 'APPROVAL_REQUEST'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-blue-600 hover:bg-blue-500'
                  } disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md`}
                >
                  {submitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : modalEntryMode === 'REMARK' ? (
                    <Bookmark className="w-3.5 h-3.5" />
                  ) : modalCategory === 'BLOCKER' || modalCategory === 'ISSUE_REPORT' ? (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  ) : modalCategory === 'APPROVAL_REQUEST' ? (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  {submitting
                    ? 'Processing...'
                    : modalEntryMode === 'REMARK'
                    ? 'Log Remark'
                    : modalCategory === 'BLOCKER' || modalCategory === 'ISSUE_REPORT'
                    ? 'Report Blocker'
                    : modalCategory === 'APPROVAL_REQUEST'
                    ? 'Submit Approval Request'
                    : 'Post Communication'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Blocker Resolution Modal */}
      {resolvingBlockerId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" /> Resolve Operational Blocker
              </h3>
              <button onClick={() => setResolvingBlockerId(null)} className="text-slate-500 hover:text-slate-900">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-700">
                Provide resolution details to close this blocker. The reporting employee will be automatically notified.
              </p>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-700 font-semibold">Resolution Summary / Action Taken:</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Files received from client, replaced faulty HDMI cable, camera equipment re-assigned..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white placeholder-slate-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setResolvingBlockerId(null)}
                className="px-3.5 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs"
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

      {/* Attach Sub-Modal in Hub Modal */}
      {showAttachSubModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-purple-600" /> Upload & Attach File
              </h3>
              <button
                onClick={() => {
                  setShowAttachSubModal(false);
                  setUploadError(null);
                }}
                className="text-slate-500 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="flex-1">{uploadError}</span>
              </div>
            )}

            <div className="space-y-3">
              {/* Upload Dropzone / State */}
              {uploadingAttach ? (
                <div className="border-2 border-dashed border-purple-300 bg-purple-50/50 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-2">
                  <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                  <p className="text-xs font-semibold text-purple-900">Uploading file to server storage...</p>
                  <p className="text-[11px] text-purple-700 truncate max-w-[280px]">{attachName || 'Please wait'}</p>
                </div>
              ) : attachUrl ? (
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 space-y-2">
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

                  <div className="flex items-center justify-between bg-white border border-emerald-200 rounded-lg p-2 text-xs">
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
                <label className="border-2 border-dashed border-slate-300 hover:border-purple-400 bg-slate-50/60 hover:bg-purple-50/30 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all group">
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

              {/* Metadata Details (Category & Display Title) */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-700 font-semibold">File Category:</label>
                <select
                  value={attachType}
                  onChange={(e) => setAttachType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 text-xs focus:outline-none focus:border-purple-500 focus:bg-white"
                >
                  <option value="DOCUMENT">Document (PDF, DOCX, TXT)</option>
                  <option value="IMAGE">Image (PNG, JPG, WEBP)</option>
                  <option value="VIDEO">Video (MP4, MOV)</option>
                  <option value="AUDIO">Audio (MP3, WAV)</option>
                  <option value="REFERENCE">Reference File (ZIP, PSD, RAW, CSV)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-700 font-semibold">Display Name / Title:</label>
                <input
                  type="text"
                  placeholder="e.g. Script_Revision_v2.pdf, Location_Photo.jpg"
                  value={attachName}
                  onChange={(e) => setAttachName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 text-xs focus:outline-none focus:border-purple-500 focus:bg-white placeholder-slate-400"
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 text-xs focus:outline-none focus:border-purple-500 focus:bg-white placeholder-slate-400"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setShowAttachSubModal(false);
                  setUploadError(null);
                }}
                className="px-3.5 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddModalAttachment}
                disabled={!attachName.trim() || !attachUrl.trim() || uploadingAttach}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Attach File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Manager Custom Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Settings className="w-4 h-4 text-purple-600" /> Introduce Custom Communication Type
              </h2>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-slate-500 hover:text-slate-900 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomCategory} className="space-y-4">
              <p className="text-xs text-slate-500">
                As Media Manager, you can introduce additional custom communication types into the workspace system.
              </p>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-700 font-semibold">Category Display Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Legal Clearance, Budget Approval..."
                  value={newCategoryLabel}
                  onChange={(e) => setNewCategoryLabel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 text-xs focus:outline-none focus:border-purple-500 focus:bg-white placeholder-slate-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newCategoryLabel.trim() || creatingCategory}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {creatingCategory ? 'Adding Category...' : 'Add Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permanent Audit Timeline Modal */}
      {timelineComm && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-600" /> Permanent Audit Timeline
                </h2>
                <span className="text-xs text-slate-500">{timelineComm.subject || 'Operational Communication'}</span>
              </div>
              <button onClick={() => setTimelineComm(null)} className="text-slate-500 hover:text-slate-900">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1 font-sans">
              {timelineLoading ? (
                <p className="text-xs text-slate-500 italic">Loading audit timeline...</p>
              ) : (timelineComm.events || []).length === 0 ? (
                <p className="text-xs text-slate-500 italic">No timeline events recorded.</p>
              ) : (
                timelineComm.events.map((evt: any, idx: number) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <span className="font-bold text-purple-700 block">{evt.action}</span>
                      <span className="text-[11px] text-slate-500">User: {evt.user} {evt.role ? `(${evt.role.replace(/_/g, ' ')})` : ''}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-3">
                      {new Date(evt.timestamp).toLocaleDateString()} {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button onClick={() => setTimelineComm(null)} className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold">
                Close Timeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
