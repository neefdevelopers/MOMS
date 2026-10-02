'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import ConvertEventToTaskModal from '@/components/tasks/ConvertEventToTaskModal';
import { ProjectEquipmentTab } from '@/components/projects/ProjectEquipmentTab';
import { VideoEditingPanel } from '@/components/projects/VideoEditingPanel';
import { useAuth } from '@/lib/auth-context';
import ActivityCommunicationThread from '@/components/communications/ActivityCommunicationThread';
import { useBreadcrumbs } from '@/lib/breadcrumbs-context';
import { FavoriteButton } from '@/components/common/FavoriteButton';
import { recordRecentAccess } from '@/lib/recent-access';
import RevisionsTab from '@/components/revisions/RevisionsTab';
import RequestRevisionModal from '@/components/revisions/RequestRevisionModal';
import {
  Film,
  FileUp,
  Download,
  Loader2,
  Calendar,
  FileText,
  Palette,
  CheckSquare,
  Users,
  Camera,
  Upload,
  CheckCircle,
  CheckCircle2,
  Clock,
  ClipboardList,
  ShieldAlert,
  CloudRain,
  Truck,
  ArrowLeft,
  Plus,
  Check,
  X,
  RotateCcw,
  ShieldCheck,
  ArrowRight,
  Play,
  Video,
  Link as LinkIcon,
  ExternalLink,
  Copy,
  FileVideo,
  UploadCloud,
  Eye,
  Send,
  Sparkles,
  AlertTriangle,
  Building2,
  Compass,
  Tag,
  Layers,
  Scissors,
  Edit,
  PlusCircle,
  User,
} from 'lucide-react';
import {
  ProjectScript,
  extractEventScripts,
  serializeProjectScripts,
} from '@/lib/project-scripts';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [project, setProject] = useState<any>(null);
  const [filesTree, setFilesTree] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allEquipment, setAllEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDeniedError, setAccessDeniedError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('Overview');

  // Interactive Form States
  const [commentText, setCommentText] = useState('');
  const [newFileName, setNewFileName] = useState('');

  // Multi-Script Management State
  const [activeScriptIndex, setActiveScriptIndex] = useState(0);
  const [showEditScriptModal, setShowEditScriptModal] = useState(false);
  const [editingScript, setEditingScript] = useState<ProjectScript>({
    id: '',
    title: '',
    scriptText: '',
    hook: '',
    duration: '',
    targetPlatform: '',
    contentType: '',
    notes: '',
  });
  const [isSavingScript, setIsSavingScript] = useState(false);

  // Script Document Upload State
  const [uploadingScriptDoc, setUploadingScriptDoc] = useState(false);
  const [selectedScriptFile, setSelectedScriptFile] = useState<File | null>(null);
  const [scriptDocNotes, setScriptDocNotes] = useState('');

  // Graphic Requirements Creation State
  const [newGraphicTitle, setNewGraphicTitle] = useState('');
  const [newGraphicType, setNewGraphicType] = useState('Poster');
  const [newGraphicObjective, setNewGraphicObjective] = useState('Campaign Brand Promotion');
  const [newGraphicDescription, setNewGraphicDescription] = useState('');
  const [newGraphicPriority, setNewGraphicPriority] = useState('MEDIUM');
  const [newGraphicRemarks, setNewGraphicRemarks] = useState('');
  const [isCreatingGraphic, setIsCreatingGraphic] = useState(false);

  const [showManageTeamModal, setShowManageTeamModal] = useState(false);
  const [showManageEquipmentModal, setShowManageEquipmentModal] = useState(false);
  const [showConvertTaskModal, setShowConvertTaskModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [teamFilter, setTeamFilter] = useState<'ALL' | 'ACCEPTED' | 'PENDING'>('ALL');
  const [taskFilter, setTaskFilter] = useState<'ALL' | 'SHOOT' | 'GRAPHIC' | 'ACTIVE' | 'COMPLETED'>('ALL');

  // Deliverables State
  const [deliverableName, setDeliverableName] = useState('');
  const [deliverableType, setDeliverableType] = useState('Video');
  const [deliverableVideoUrl, setDeliverableVideoUrl] = useState('');
  const [isSubmittingDeliverable, setIsSubmittingDeliverable] = useState(false);
  const [copiedDeliverableId, setCopiedDeliverableId] = useState<string | null>(null);
  const [linkedGraphicReqId, setLinkedGraphicReqId] = useState('');
  const [showCreateDeliverableModal, setShowCreateDeliverableModal] = useState(false);

  // Closure Modal State
  const [showClosureModal, setShowClosureModal] = useState(false);
  // Convert-to-Video-Editing modal state
  const [showConvertModal, setShowConvertModal] = useState(false);
  // Eligible video editors for this project, fetched from the backend endpoint that
  // filters by designation/skills. We avoid listing every active user in the dropdown.
  const [eligibleVideoEditors, setEligibleVideoEditors] = useState<any[]>([]);
  // Per-script Video Editor selections inside the Convert-to-Video-Editing modal.
  // Keyed by script.id so the modal can render every script with its own selector
  // without relying on DOM lookups (which break when ids contain special characters).
  const [convertStaffByScript, setConvertStaffByScript] = useState<Record<string, string>>({});
  const [isCompletingProject, setIsCompletingProject] = useState(false);
  const [pendingStatus, setPendingStatus] = useState('CLOSED');
  const [closureReasonPreset, setClosureReasonPreset] = useState('Client cancelled remaining deliverables');
  const [customClosureReason, setCustomClosureReason] = useState('');

  // Script documents (FileMetadata) — the single source of truth for scripts.
  // Both the Scripts tab and the Convert modal read from this same list so they
  // always show identical records.
  const scriptFiles = (filesTree?.allFiles || project?.files || []).filter((f: any) =>
    f.attachmentCategory === 'SCRIPT_DOCUMENT' ||
    f.folderCategory === 'Script Documents' ||
    f.storagePath?.toLowerCase().includes('script') ||
    (f.fileName?.toLowerCase().endsWith('.pdf') && !f.deliverableType) ||
    f.fileName?.toLowerCase().endsWith('.doc') ||
    f.fileName?.toLowerCase().endsWith('.docx')
  );
  const scriptDocuments = useMemo(() => scriptFiles, [scriptFiles]);

  // Parse scripts from project notes (JSON serialized by serializeProjectScripts)
  const parsedScripts = useMemo(() => {
    if (!project?.notes) return [];
    try {
      return extractEventScripts(project.notes);
    } catch {
      return [];
    }
  }, [project?.notes]);

  // Clip codes may only be added or removed by staff assigned to this project.
  // Every other role (including admins) is strictly read-only - no bypass.
  const isAssignedToProject = useMemo(
    () => !!user && (project?.assignedTeam || []).some((t: any) => t.userId === user.id),
    [user, project?.assignedTeam]
  );
  const canManageClipCodes = isAssignedToProject;

  // Number code being typed for a given uploaded document.
  const [clipCodeInputs, setClipCodeInputs] = useState<Record<string, string>>({});
  const [isSavingClipCode, setIsSavingClipCode] = useState<string | null>(null);

  const setClipInput = (fileId: string, code: string) => {
    setClipCodeInputs((prev) => ({ ...prev, [fileId]: code }));
  };

  /** Parses the clipCodes JSON column returned on a file record. */
  const readFileClipCodes = (raw: any): { code: string; description?: string; addedBy?: string; addedAt?: string }[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  /** Adds or removes one clip code on an uploaded document (assigned staff only). */
  const persistClipCode = async (
    fileId: string,
    action: 'add' | 'remove',
    payload: { code: string; description?: string }
  ): Promise<boolean> => {
    if (!project || !canManageClipCodes) return false;
    try {
      setIsSavingClipCode(fileId);
      const res: any = await fetchApi(`/files/${fileId}/clip-codes`, {
        method: 'POST',
        body: JSON.stringify({ action, ...payload }),
      });

      const normalized = readFileClipCodes(res?.clipCodes);
      setProject((prev: any) => {
        if (!prev) return prev;
        const files = prev.files || [];
        return {
          ...prev,
          files: files.map((f: any) => (f.id === fileId ? { ...f, clipCodes: normalized } : f)),
        };
      });
      setFilesTree((prev: any) => {
        if (!prev?.allFiles) return prev;
        return {
          ...prev,
          allFiles: prev.allFiles.map((f: any) =>
            f.id === fileId ? { ...f, clipCodes: normalized } : f
          ),
        };
      });

      if (action === 'add') setClipInput(fileId, '');
      return true;
    } catch (err: any) {
      alert(err.message || 'Failed to save clip code');
      return false;
    } finally {
      setIsSavingClipCode(null);
    }
  };

  const handleAddClipCode = async (fileId: string) => {
    if (!canManageClipCodes) return;
    const code = (clipCodeInputs[fileId] || '').trim();
    if (!code) {
      alert('Enter a clip code first.');
      return;
    }
    await persistClipCode(fileId, 'add', { code });
  };

  const handleRemoveClipCode = async (fileId: string, code: string) => {
    if (!canManageClipCodes) return;
    await persistClipCode(fileId, 'remove', { code });
  };

  // Video editor assignment has been moved to the Complete Project flow.
  // The underlying data and reusable assignment logic is preserved for that workflow.
  const [isFinishingEditor, setIsFinishingEditor] = useState<string | null>(null);

  /**
   * The assigned video editor marks the edit as finished. The backend moves the linked task
   * into the existing technical -> media review chain and flags the document as finished.
   */
  const handleFinishVideoEditing = async (fileId: string) => {
    if (!project) return;
    setIsFinishingEditor(fileId);
    try {
      const updated: any = await fetchApi(`/projects/${project.id}/script-video-editing/finish`, {
        method: 'POST',
        body: JSON.stringify({ fileId }),
      });
      if (updated && Array.isArray(updated.files)) {
        setProject((prev: any) => (prev ? { ...prev, files: updated.files } : prev));
        setFilesTree((prev: any) => {
          if (!prev?.allFiles) return prev;
          return {
            ...prev,
            allFiles: prev.allFiles.map((f: any) => {
              const match = updated.files.find((uf: any) => uf.id === f.id);
              return match ? { ...f, scriptEditorAssignments: match.scriptEditorAssignments || [] } : f;
            }),
          };
        });
      }
    } catch (e: any) {
      console.error('Failed to mark video editing as finished:', e);
    } finally {
      setIsFinishingEditor(null);
    }
  };

  const openCreateScriptModal = () => {
    const nextNum = parsedScripts.length + 1;
    setEditingScript({
      id: `script-${Date.now()}`,
      title: `Script #${nextNum}`,
      scriptText: '',
      hook: '',
      sceneNumber: nextNum,
      duration: '30s',
      targetPlatform: project?.calendarEvent?.platform || 'Instagram Reel',
      contentType: project?.calendarEvent?.contentType || 'Reel',
      notes: '',
    });
    setShowEditScriptModal(true);
  };

  const openEditSpecificScriptModal = (script: ProjectScript) => {
    setEditingScript({ ...script });
    setShowEditScriptModal(true);
  };

  const handleSaveScriptItem = async () => {
    if (!project) return;
    if (!editingScript.title.trim()) {
      alert('Please provide a script title.');
      return;
    }
    try {
      setIsSavingScript(true);
      const currentList = [...parsedScripts];
      const existingIdx = currentList.findIndex((s) => s.id === editingScript.id);

      let updatedList: ProjectScript[];
      if (existingIdx >= 0) {
        // Carry existing clip codes through: the server also preserves them, but keeping
        // local state consistent avoids the chip list flickering back after a save.
        updatedList = currentList.map((s, idx) =>
          idx === existingIdx
            ? { ...editingScript, clipCodes: s.clipCodes ?? [], updatedAt: new Date().toISOString() }
            : s
        );
      } else {
        updatedList = [...currentList, { ...editingScript, clipCodes: [], createdAt: new Date().toISOString() }];
      }

      const serialized = serializeProjectScripts(updatedList);

      await fetchApi(`/projects/${project.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          notes: serialized,
          bypassReviewLock: true,
        }),
      });

      setProject((prev: any) => ({
        ...prev,
        notes: serialized,
      }));

      setShowEditScriptModal(false);
      if (existingIdx < 0) {
        setActiveScriptIndex(updatedList.length - 1);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save script');
    } finally {
      setIsSavingScript(false);
    }
  };

  const loadProject = async () => {
    setLoading(true);
    setAccessDeniedError(null);
    try {
      const projRes = await fetchApi(`/projects/${id}`);
      setProject(projRes);

      if (projRes) {
        recordRecentAccess({
          entityType: 'PROJECT',
          entityId: projRes.id,
          title: projRes.name,
          code: projRes.projectId,
          url: `/projects/${projRes.id}`,
          metadata: { client: projRes.client?.name, brand: projRes.brand?.name, status: projRes.status },
        });
      }

      const [treeRes, usersRes, eqpRes] = await Promise.all([
        fetchApi(`/files/project/${id}`).catch(() => null),
        fetchApi('/users').catch(() => []),
        fetchApi('/equipment').catch(() => []),
      ]);
      setFilesTree(treeRes);
      setAllUsers(Array.isArray(usersRes) ? usersRes : []);
      setAllEquipment(Array.isArray(eqpRes) ? eqpRes : []);
    } catch (err: any) {
      console.error('Failed to load project details:', err);
      if (err?.isNetworkError) {
        setAccessDeniedError(err.message || 'Cannot reach the backend server.');
      } else {
        setAccessDeniedError(err.message || 'Access Denied: Project shoot waiting for Marketing Approval is hidden from Technical Manager.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadProject();
  }, [id]);

  // Synchronize dynamic hierarchical breadcrumbs (Dashboard -> Projects -> ProjectID -> Tab -> Record)
  useEffect(() => {
    if (!project) return;

    const projectDisplay = project.projectId || project.name;
    const crumbs: any[] = [
      { label: 'Dashboard', href: '/' },
      { label: 'Projects', href: '/projects' },
      {
        label: projectDisplay,
        href: activeTab === 'Overview' ? undefined : `/projects/${project.id}`,
        onClick:
          activeTab === 'Overview'
            ? undefined
            : () => {
                setActiveTab('Overview');
                },
        isCurrent: activeTab === 'Overview',
      },
    ];

    if (activeTab !== 'Overview') {
      crumbs.push({
        label: activeTab,
        
        
        isCurrent: true,
      });
    }

    
    setBreadcrumbs(crumbs);
  }, [project, activeTab, setBreadcrumbs]);

  
  const handleUploadScriptDoc = async (fileToUpload?: File) => {
    const file = fileToUpload || selectedScriptFile;
    if (!file) {
      alert('Please select a PDF or Document file to upload.');
      return;
    }
    setUploadingScriptDoc(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', project.id);
      formData.append('folderCategory', 'Script Documents');
      formData.append('attachmentCategory', 'SCRIPT_DOCUMENT');

      const token = localStorage.getItem('moms_token') || localStorage.getItem('token');
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const res = await fetch(`${apiBase}/files/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to upload script document');
      }

      alert(`Script Document "${file.name}" uploaded successfully!`);
      setSelectedScriptFile(null);
      setScriptDocNotes('');
      await loadProject();
    } catch (err: any) {
      alert(err.message || 'Failed to upload script document');
    } finally {
      setUploadingScriptDoc(false);
    }
  };

  const handleToggleTeamUser = async (targetUserId: string) => {
    const currentTeamUserIds = (project.assignedTeam || []).map((t: any) => t.userId);
    const updatedTeamUserIds = currentTeamUserIds.includes(targetUserId)
      ? currentTeamUserIds.filter((uid: string) => uid !== targetUserId)
      : [...currentTeamUserIds, targetUserId];

    try {
      await fetchApi(`/projects/${project.id}`, {
        method: 'PUT',
        body: JSON.stringify({ teamUserIds: updatedTeamUserIds }),
      });
      loadProject();
    } catch (err: any) {
      alert(err.message || 'Failed to update team assignment');
    }
  };

  const handleToggleEquipment = async (targetEqId: string) => {
    const currentEqIds = (project.equipmentReservations || []).map((r: any) => r.equipmentId);
    const updatedEqIds = currentEqIds.includes(targetEqId)
      ? currentEqIds.filter((eqId: string) => eqId !== targetEqId)
      : [...currentEqIds, targetEqId];

    try {
      await fetchApi(`/projects/${project.id}`, {
        method: 'PUT',
        body: JSON.stringify({ equipmentIds: updatedEqIds }),
      });
      loadProject();
    } catch (err: any) {
      alert(err.message || 'Failed to update reserved equipment');
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      await fetchApi('/communications', {
        method: 'POST',
        body: JSON.stringify({
          entityType: 'PROJECT',
          entityId: project.id,
          projectId: project.id,
          content: commentText,
          type: 'GENERAL_NOTE',
        }),
      });
      setCommentText('');
      loadProject();
    } catch (err: any) {
      alert(err.message || 'Failed to post comment');
    }
  };

  const handleCreateDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliverableName.trim()) return;

    const isProjectUnderReview = [
      'WAITING_FOR_TECHNICAL_REVIEW',
      'TECHNICAL_REVIEW',
      'WAITING_FOR_MEDIA_REVIEW',
      'MEDIA_MANAGER_REVIEW',
      'WAITING_FOR_MARKETING_APPROVAL',
      'PENDING_MARKETING_APPROVAL',
      'PENDING_CLIENT_APPROVAL',
      'PENDING_CLIENT_REVIEW',
      'WAITING_FOR_CLIENT_CONFIRMATION',
      'COMPLETED',
    ].includes(project?.status);

    if (isProjectUnderReview) {
      alert(`Project is currently under review (${project?.status}) and in read-only mode. Deliverable additions are locked during review.`);
      return;
    }

    if (!deliverableVideoUrl.trim()) {
      alert('Please enter a valid video link or cloud storage URL.');
      return;
    }

    setIsSubmittingDeliverable(true);
    try {
      await fetchApi('/files', {
        method: 'POST',
        body: JSON.stringify({
          projectId: project.id,
          fileName: deliverableName.trim(),
          deliverableType,
          graphicRequirementId: linkedGraphicReqId || undefined,
          storagePath: deliverableVideoUrl.trim(),
        }),
      });

      setDeliverableName('');
      setDeliverableVideoUrl('');
      setLinkedGraphicReqId('');
      setShowCreateDeliverableModal(false);
      loadProject();
    } catch (err: any) {
      alert(err.message || 'Failed to register deliverable');
    } finally {
      setIsSubmittingDeliverable(false);
    }
  };

  const getDeliverableLinkInfo = (url?: string) => {
    if (!url) return null;
    const lower = url.toLowerCase();
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) return { label: 'YouTube Video', color: 'bg-red-50 text-red-700 border-red-200' };
    if (lower.includes('vimeo.com')) return { label: 'Vimeo Stream', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
    if (lower.includes('drive.google.com')) return { label: 'Google Drive', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    if (lower.includes('frame.io')) return { label: 'Frame.io Review', color: 'bg-purple-50 text-purple-700 border-purple-200' };
    if (lower.includes('dropbox.com')) return { label: 'Dropbox', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.webm') || lower.includes('/video/')) return { label: 'Direct Video Stream', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (lower.startsWith('http')) return { label: 'Cloud Deliverable Link', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    return { label: 'Stored File Asset', color: 'bg-slate-100 text-slate-700 border-slate-200' };
  };

  const copyDeliverableLink = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedDeliverableId(id);
    setTimeout(() => setCopiedDeliverableId(null), 2000);
  };

  const handleUploadFileMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    try {
      await fetchApi('/files', {
        method: 'POST',
        body: JSON.stringify({
          projectId: project.id,
          fileName: newFileName,
          fileSize: 450000000,
          fileType: 'video/mp4',
          storagePath: `/projects/${project.projectId}/Final Deliverables/${newFileName}`,
        }),
      });
      setNewFileName('');
      loadProject();
    } catch (err: any) {
      alert(err.message || 'Failed to upload deliverable metadata');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === 'CLOSED' || newStatus === 'CANCELLED') {
      setPendingStatus(newStatus);
      setShowClosureModal(true);
      return;
    }

    try {
      await fetchApi(`/projects/${project.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      loadProject();
    } catch (err: any) {
      alert(err.message || 'Failed to update project status');
    }
  };

  const handleConfirmClosure = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason =
      closureReasonPreset === 'Other'
        ? customClosureReason.trim()
        : `${closureReasonPreset}${customClosureReason.trim() ? `: ${customClosureReason.trim()}` : ''}`;

    if (!finalReason) {
      alert('A mandatory closure reason must be provided.');
      return;
    }

    try {
      await fetchApi(`/projects/${project.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: pendingStatus,
          closureReason: finalReason,
        }),
      });
      setShowClosureModal(false);
      setCustomClosureReason('');
      loadProject();
    } catch (err: any) {
      alert(err.message || 'Failed to close project');
    }
  };

  // ══════════════════════════════════════════════════════
  // APPROVAL ENGINE ACTION HANDLERS (EXACT SCRIPT WORKFLOW)
  // ══════════════════════════════════════════════════════
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);

  const handleUpdateStatusToInProgress = async () => {
    if (!project) return;
    setIsProcessingApproval(true);
    try {
      await fetchApi(`/projects/${project.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      });
      alert('Project status updated to IN PROGRESS!');
      loadProject();
    } catch (err: any) {
      alert(err.message || 'Failed to update project status to IN PROGRESS');
    } finally {
      setIsProcessingApproval(false);
    }
  };

  const handleSubmitTechnicalReview = async () => {
    if (!project) return;
    setIsProcessingApproval(true);
    try {
      await fetchApi(`/projects/${project.id}/submit-technical`, { method: 'POST' });
      alert('Shoot Project submitted for Technical Manager Review!');
      loadProject();
    } catch (err: any) {
      alert(err.message || 'Failed to submit project for technical review');
    } finally {
      setIsProcessingApproval(false);
    }
  };

  const handleReviewTechnical = async (action: 'APPROVE' | 'REJECT', comment?: string) => {
    if (!project) return;
    setIsProcessingApproval(true);
    try {
      await fetchApi(`/projects/${project.id}/review-technical`, {
        method: 'POST',
        body: JSON.stringify({ action, comment: comment || (action === 'REJECT' ? 'Technical revisions required' : undefined) }),
      });
      alert(action === 'APPROVE' ? 'Technical Review Approved! Automatically forwarded for Media Manager Review.' : 'Technical Review returned for revisions.');
      loadProject();
    } catch (err: any) {
      alert(err.message || 'Technical review action failed');
    } finally {
      setIsProcessingApproval(false);
    }
  };

  const handleReviewMedia = async (action: 'APPROVE' | 'REJECT', comment?: string) => {
    if (!project) return;
    setIsProcessingApproval(true);
    try {
      await fetchApi(`/projects/${project.id}/review-media`, {
        method: 'POST',
        body: JSON.stringify({ action, comment: comment || (action === 'REJECT' ? 'Media Manager revisions required' : undefined) }),
      });
      alert(action === 'APPROVE' ? 'Media Review Approved! Forwarded for Marketing Manager Approval.' : 'Media Review returned for revisions.');
      loadProject();
    } catch (err: any) {
      alert(err.message || 'Media review action failed');
    } finally {
      setIsProcessingApproval(false);
    }
  };

  const handleReviewMarketing = async (action: 'APPROVE' | 'REJECT', comment?: string) => {
    if (!project) return;
    setIsProcessingApproval(true);
    try {
      await fetchApi(`/projects/${project.id}/review-marketing`, {
        method: 'POST',
        body: JSON.stringify({ action, comment: comment || (action === 'REJECT' ? 'Marketing revisions required' : undefined) }),
      });
      alert(action === 'APPROVE' ? 'Marketing Approval Granted! Ready for Client Sign-off.' : 'Marketing Approval returned for revisions.');
      loadProject();
    } catch (err: any) {
      alert(err.message || 'Marketing review action failed');
    } finally {
      setIsProcessingApproval(false);
    }
  };

  const handleConfirmClient = async (action: 'CONFIRM' | 'REQUEST_CHANGES', comment?: string) => {
    if (!project) return;
    setIsProcessingApproval(true);
    try {
      await fetchApi(`/projects/${project.id}/confirm-client`, {
        method: 'POST',
        body: JSON.stringify({ action, comment }),
      });
      alert(action === 'CONFIRM' ? 'Client Sign-off Confirmed! Project is now Completed.' : 'Client revision request recorded.');
      loadProject();
    } catch (err: any) {
      alert(err.message || 'Client confirmation action failed');
    } finally {
      setIsProcessingApproval(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading Project Workspace...</div>;

  if (accessDeniedError) {
    const isConnectivity = /timed out|Cannot reach|Backend URL/i.test(accessDeniedError);
    return (
      <div className="p-12 text-center bg-white border border-rose-200 rounded-2xl max-w-xl mx-auto my-12 space-y-4 shadow-2xl">
        <div className="w-16 h-16 bg-rose-50 border border-rose-200 text-rose-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
          !
        </div>
        <h2 className="text-xl font-bold text-slate-900">{isConnectivity ? 'Could not load project' : 'Project Access Restricted'}</h2>
        <p className="text-xs text-slate-700 leading-relaxed">{accessDeniedError}</p>
        {isConnectivity && (
          <button
            onClick={() => loadProject()}
            className="inline-block mt-2 mr-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-all"
          >
            Retry
          </button>
        )}
        <Link href="/projects" className="inline-block mt-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-blue-600/30">
          Return to Projects List
        </Link>
      </div>
    );
  }

  if (!project) return <div className="p-8 text-center text-rose-600 font-semibold">Project Not Found</div>;

  const isIndoor = project.shootType === 'INDOOR';
  const outdoor = project.outdoorDetails;

  const tabs = [
    'Overview',
    'Revisions',
    'Scripts',
    'Graphic Requirements',
    'Tasks',
    'Team',
    'Equipment',
    'Deliverables',

  ];

  if (accessDeniedError || !project) {
    return (
      <div className="p-8 max-w-2xl mx-auto my-12 text-center bg-white border border-rose-200 rounded-2xl space-y-4 shadow-2xl">
        <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted — Marketing Approval Gate</h2>
        <p className="text-xs text-slate-700 leading-relaxed">
          {accessDeniedError || 'This project shoot is waiting for Marketing Approval and is not accessible.'}
        </p>
        <div className="pt-2">
          <Link
            href="/projects"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl inline-block shadow-lg shadow-blue-600/30"
          >
            Return to Projects Directory
          </Link>
        </div>
      </div>
    );
  }

  const userPendingTask = user?.role === 'STAFF'
    ? project?.tasks?.find((t: any) =>
        t.assignedEmployees?.some((e: any) => (e.userId === user.id || e.user?.id === user.id) && e.acceptanceStatus !== 'ACCEPTED')
      )
    : null;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push('/projects')}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-semibold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Projects List
      </button>

      {/* Pending Task Acceptance Alert Banner */}
      {userPendingTask && (
        <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border-2 border-purple-300 p-4 rounded-xl space-y-2 text-xs shadow-md flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-purple-100 text-purple-700 rounded-lg">
              <Sparkles className="w-4 h-4 text-purple-600" />
            </span>
            <div>
              <h4 className="text-purple-950 font-bold text-xs">
                Task Assignment Acceptance Required
              </h4>
              <p className="text-slate-700 text-[11px]">
                You are assigned to task <strong className="text-purple-950">{userPendingTask.taskId} ({userPendingTask.title})</strong> for this project. Please accept the task assignment to unlock full project work progress.
              </p>
            </div>
          </div>
          <Link
            href={`/tasks?taskId=${userPendingTask.id}`}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg shadow-md transition-all text-xs flex items-center gap-1.5 shrink-0"
          >
            <Check className="w-3.5 h-3.5" /> Accept Task Assignment
          </Link>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FavoriteButton
                entityType="PROJECT"
                entityId={project.id}
                title={project.name}
                code={project.projectId}
                url={`/projects/${project.id}`}
                metadata={{ client: project.client?.name, brand: project.brand?.name, status: project.status }}
                size="md"
              />
              <span className="font-mono text-xs font-bold text-blue-600 px-2.5 py-0.5 bg-blue-50 border border-blue-200 rounded">
                {project.projectId}
              </span>

              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                  isIndoor
                    ? 'bg-blue-50 text-blue-600 border-blue-200'
                    : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                }`}
              >
                {project.shootType} SHOOT
              </span>

              {/* Current Status Tag */}
              <span
                className={`text-[10px] font-bold px-3 py-0.5 rounded-full uppercase border font-mono tracking-wider ${
                  project.status === 'IN_PROGRESS'
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : project.status === 'WAITING_FOR_TECHNICAL_REVIEW'
                    ? 'bg-purple-50 text-purple-700 border-purple-300'
                    : project.status === 'WAITING_FOR_MEDIA_REVIEW'
                    ? 'bg-cyan-50 text-cyan-700 border-cyan-300'
                    : project.status === 'WAITING_FOR_MARKETING_APPROVAL'
                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                    : project.status === 'WAITING_FOR_CLIENT_CONFIRMATION'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : project.status === 'COMPLETED'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-400 font-extrabold'
                    : project.status === 'REVISION_REQUESTED' || project.status === 'CLIENT_REVISION_REQUESTED'
                    ? 'bg-rose-50 text-rose-700 border-rose-300'
                    : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                {project.status.replace(/_/g, ' ')}
              </span>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 leading-tight">{project.name}</h1>
            <p className="text-xs text-slate-500">
              Client: <span className="text-slate-800 font-semibold">{project.client?.name}</span> • Brand:{' '}
              <span className="text-purple-600 font-semibold">{project.brand?.name}</span> • Product:{' '}
              <span className="text-emerald-600 font-semibold">{project.product?.name || 'N/A'}</span>
            </p>
          </div>

          <div className="text-right space-y-1">
            <div className="text-xs text-slate-500">
              Shoot Date: <span className="text-slate-900 font-bold">{new Date(project.shootDate).toLocaleDateString()}</span>
            </div>
            <div className="text-xs text-slate-500">
              Location: <span className="text-slate-800 font-semibold">{project.shootLocation}</span>
            </div>
            {/* Complete Project — Media Manager declares the shoot done and starts the editing phase. Visible in any post-shoot status. */}
            {user?.role === 'MEDIA_MANAGER' && !project.videoEditingConverted && !['CANCELLED', 'ARCHIVED', 'CLOSED'].includes(project.status) && (
              <button
                onClick={async () => {
                  // Reset per-script selections, then pre-fill from any previously saved
                  // Video Editor assignments so reopening the modal shows the saved values.
                  const prior: Record<string, string> = {};
                  const tasksForEditors = (project.tasks || []).filter(
                    (t: any) => t.taskType === 'VIDEO_EDITING' && t.scriptId
                  );
                  for (const t of tasksForEditors) {
                    const assigned = (t.assignedEmployees || []).find(
                      (a: any) => a.acceptanceStatus !== 'REJECTED'
                    );
                    if (assigned?.userId) {
                      prior[t.scriptId] = assigned.userId;
                    }
                  }
                  setConvertStaffByScript(prior);

                  // Fetch the eligible Video Editor list once when the modal opens so the
                  // dropdown only shows users flagged as editors by their designation/skills.
                  try {
                    const candidates: any = await fetchApi(
                      `/projects/${project.id}/video-editor-candidates`
                    );
                    setEligibleVideoEditors(
                      Array.isArray(candidates?.candidates) ? candidates.candidates : []
                    );
                  } catch {
                    setEligibleVideoEditors([]);
                  }

                  setShowConvertModal(true);
                }}
                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow transition-all flex items-center gap-1.5 text-xs"
              >
                <CheckCircle className="w-4 h-4" /> Complete Project
              </button>
            )}
            {/* Read-only badge after conversion */}
            {project.videoEditingConverted && (
              <div className="mt-2 px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                Read-Only
              </div>
            )}
          </div>
        </div>

        {/* Marketing Manager Approval Warning Banner */}
        {['PENDING_MARKETING_APPROVAL', 'PLANNED', 'PENDING_CLIENT_APPROVAL'].includes(project.status) && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center justify-between font-medium">
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Waiting for Marketing Manager Approval</strong> — Task assignment and production are locked until approved.
              </span>
            </span>
            {user?.role === 'MARKETING_MANAGER' && (
              <button
                onClick={() => handleStatusChange('APPROVED')}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors shadow-md shadow-emerald-950"
              >
                Approve Project Now
              </button>
            )}
          </div>
        )}

        {['APPROVED', 'READY_FOR_PRODUCTION'].includes(project.status) && (user?.role === 'MEDIA_MANAGER' || (user?.role as string) === 'ADMIN') && (!project.tasks || project.tasks.length === 0) && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-900 text-xs flex items-center justify-between font-medium">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Marketing Manager Approved</strong> — Convert to Task &amp; Assign Staff now.
              </span>
            </span>
            <button
              onClick={() => setShowConvertTaskModal(true)}
              className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs transition-colors shadow-md shadow-purple-950 flex items-center gap-1"
            >
              Convert to Task
            </button>
          </div>
        )}

        {(project.status === 'REVISION_REQUESTED' || project.status === 'CLIENT_REVISION_REQUESTED') && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2 shadow-lg animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-amber-800 font-extrabold flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-600 animate-spin" /> Active Workflow Status: REVISION REQUESTED
              </span>
              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded font-mono font-bold text-[10px]">
                Revision #{project.revisionCount || 1}
              </span>
            </div>
            <p className="text-slate-800">
              Reviewer requested changes. The assigned team is actively revising production deliverables.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setShowRevisionModal(true)}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1 shadow"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Request Another Revision
              </button>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="space-y-1 pt-2">
          <div className="flex justify-between text-xs font-semibold text-slate-700">
            <span>Production Progress: {project.progressPercentage}%</span>
            <span>Revisions: {project.revisionCount}</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${project.progressPercentage}%` }}></div>
          </div>
        </div>
      </div>

      {/* 12 Workspace Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-1 text-xs font-semibold">
        {tabs.map((tab) => {
          let countBadge: number | null = null;
          if (tab === 'Scripts') countBadge = scriptFiles.length;
          if (tab === 'Graphic Requirements') countBadge = project.graphicRequirements?.length || 0;
          if (tab === 'Tasks') countBadge = project.tasks?.length || 0;
          if (tab === 'Deliverables') countBadge = project.files?.length || 0;
          if (tab === 'Equipment') countBadge = project.equipmentReservations?.length || 0;
          if (tab === 'Revisions') countBadge = project.revisionCount || 0;

          const isRevisionsUndergoing =
            tab === 'Revisions' &&
            (project.status === 'REVISION_REQUESTED' || project.status === 'CLIENT_REVISION_REQUESTED');

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-2.5 rounded-t-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === tab
                  ? 'bg-white text-blue-600 border-t-2 border-blue-500 font-bold border-x border-slate-200'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/50'
              }`}
            >
              {isRevisionsUndergoing && <RotateCcw className="w-3.5 h-3.5 text-amber-600 animate-spin" />}
              <span>{tab}</span>
              {isRevisionsUndergoing ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                  Undergoing Revision (Rev #{project.revisionCount || 1})
                </span>
              ) : countBadge !== null && countBadge > 0 ? (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  activeTab === tab ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {countBadge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Tab Content Display */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl min-h-[400px]">
        {/* Tab 1: Overview */}
        {activeTab === 'Revisions' && (
          <RevisionsTab
            entityType="PROJECT"
            entityId={project.id}
            entityTitle={project.name}
            originalAssigneeId={project.assignedTeam?.[0]?.userId}
            originalAssigneeName={project.assignedTeam?.[0]?.user?.name}
            userRole={user?.role}
            userId={user?.id}
            currentStatus={project.status}
            onRefresh={loadProject}
          />
        )}

        {activeTab === 'Overview' && (
          <div className="space-y-6 text-xs">
            {/* Active Revision Banner if Project is Undergoing Revision */}
            {(project.status === 'REVISION_REQUESTED' || project.status === 'CLIENT_REVISION_REQUESTED') && (
              <div className="p-4 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-300 rounded-xl text-xs flex items-center justify-between flex-wrap gap-3 shadow-md">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs shrink-0">
                    <RotateCcw className="w-5 h-5 animate-spin" />
                  </span>
                  <div>
                    <h4 className="font-extrabold text-amber-950 text-sm flex items-center gap-2">
                      ⚠️ Project Undergoing Revision — Active Revision Session
                    </h4>
                    <p className="text-amber-800 text-xs mt-0.5">
                      This shoot project is currently in <strong>Revision #{project.revisionCount || 1}</strong>. The production team is actively revising the deliverables based on reviewer feedback.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('Revisions')}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> View Revision Session &rarr;
                </button>
              </div>
            )}

            {/* Core Shoot Project Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Project Identity & Client Details */}
              <div className="bg-slate-50/70 p-5 rounded-xl border border-slate-200 space-y-3.5">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Film className="w-4 h-4 text-blue-600" /> Project Identity & Client Info
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Project ID</span>
                    <span className="font-mono text-blue-600 font-bold text-xs">{project.projectId}</span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Project Name</span>
                    <span className="text-slate-900 font-bold text-xs">{project.name}</span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Client</span>
                    <span className="text-slate-800 font-semibold">{project.client?.name || 'N/A'}</span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Brand</span>
                    <span className="text-purple-700 font-semibold">[{project.brand?.shortCode || 'N/A'}] {project.brand?.name}</span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Product (Optional)</span>
                    <span className="text-emerald-700 font-semibold">{project.product?.name || 'None (General Shoot)'}</span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Campaign (Optional)</span>
                    <span className="text-slate-800">{project.campaign?.name || project.campaignId || 'None (General Shoot)'}</span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Calendar Event</span>
                    <span className="font-mono text-slate-800 font-semibold">{project.calendarEventId || project.sourceForCalendarEvents?.[0]?.eventId || 'None (Direct Project)'}</span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Estimated Completion Date</span>
                    <span className="text-slate-800 font-semibold">
                      {project.estimatedCompletionDate ? new Date(project.estimatedCompletionDate).toLocaleDateString() : 'Not Specified'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Schedule, Status & Priority Logistics */}
              <div className="bg-slate-50/70 p-5 rounded-xl border border-slate-200 space-y-3.5">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" /> Schedule, Status & Location
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Current Status</span>
                    <span className={`font-bold ${
                      project.status === 'REVISION_REQUESTED' || project.status === 'CLIENT_REVISION_REQUESTED'
                        ? 'text-rose-700 flex items-center gap-1 font-extrabold'
                        : 'text-blue-700'
                    }`}>
                      {(project.status === 'REVISION_REQUESTED' || project.status === 'CLIENT_REVISION_REQUESTED') && (
                        <RotateCcw className="w-3.5 h-3.5 text-rose-600 animate-spin" />
                      )}
                      {project.status === 'REVISION_REQUESTED' || project.status === 'CLIENT_REVISION_REQUESTED'
                        ? `UNDERGOING REVISION (REV #${project.revisionCount || 1})`
                        : project.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Project Priority</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] inline-block ${
                      project.priority === 'CRITICAL' ? 'bg-rose-100 text-rose-800' :
                      project.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                      project.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>{project.priority}</span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Shoot Date</span>
                    <span className="text-slate-900 font-bold">{new Date(project.shootDate).toLocaleDateString()}</span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Shoot Location</span>
                    <span className="text-slate-900 font-semibold">{project.shootLocation}</span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Influencer / Talent</span>
                    <span className="text-slate-800 font-semibold">{project.influencerTalent || 'None / Not Specified'}</span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Reporting & Wrap-up Time</span>
                    <span className="text-slate-800">{project.reportingTime || '09:00 AM'} — {project.expectedWrapUpTime || '06:00 PM'}</span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg sm:col-span-2">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Location Address & Category</span>
                    <span className="text-slate-800">{project.locationAddress || project.shootLocation} ({project.locationCategory || 'Studio Bay'})</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" /> Project Notes
              </h4>
              <p className="text-slate-700 text-xs italic bg-white p-3 rounded-lg border border-slate-200">
                {project.notes ? `"${project.notes}"` : 'No operational notes or special remarks recorded for this project.'}
              </p>
            </div>

            {/* Assigned Team & Required Equipment Quick Preview Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Assigned Team Summary Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" /> Assigned Team ({project.assignedTeam?.length || 0})
                  </h4>
                  <button
                    onClick={() => setActiveTab('Team')}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                  >
                    Manage Team <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                {(!project.assignedTeam || project.assignedTeam.length === 0) ? (
                  <p className="text-slate-500 text-xs py-2 italic text-center bg-white rounded-lg border border-slate-200">
                    No team members assigned to this shoot project yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {project.assignedTeam.map((item: any) => (
                      <div key={item.id || item.userId} className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{item.user?.name || 'Staff Member'}</div>
                          <div className="text-[10px] text-slate-500">{item.user?.email}</div>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {item.roleInProject || item.user?.role || 'Team Member'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Required Equipment Summary Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                    <Camera className="w-4 h-4 text-purple-600" /> Required Equipment ({project.equipmentReservations?.length || 0})
                  </h4>
                  <button
                    onClick={() => setActiveTab('Equipment')}
                    className="text-[11px] text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-1"
                  >
                    View Gear <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                {(!project.equipmentReservations || project.equipmentReservations.length === 0) ? (
                  <p className="text-slate-500 text-xs py-2 italic text-center bg-white rounded-lg border border-slate-200">
                    No equipment reserved for this shoot project yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {project.equipmentReservations.map((res: any) => (
                      <div key={res.id} className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                        <div className="truncate">
                          <div className="font-bold text-slate-900 text-xs truncate">{res.equipment?.name || 'Equipment Gear'}</div>
                          <div className="text-[10px] text-slate-500 truncate font-mono">[{res.equipment?.category}] {res.equipment?.brand} {res.equipment?.model}</div>
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ml-1 shrink-0 ${
                          res.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {res.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Project Requirements & Scope Session (Scripts & Graphic Requirements) */}
            <div className="p-5 bg-gradient-to-br from-purple-50/70 via-indigo-50/30 to-blue-50/70 border border-purple-200 rounded-xl space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-200/80 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" /> Project Requirements &amp; Creative Scope Session
                  </h3>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Scripts, Narration Storylines, and Graphic Requirements linked with this Shoot Project.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('Scripts')}
                    className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5 text-purple-600" />
                    Script Docs ({scriptFiles.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('Graphic Requirements')}
                    className="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1"
                  >
                    <Palette className="w-3.5 h-3.5 text-blue-600" />
                    Graphics ({project.graphicRequirements?.length || 0})
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Linked Script Documents Column */}
                <div className="p-3.5 bg-white border border-purple-200/90 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                    <span className="font-bold text-xs text-purple-950 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-purple-600" />
                      Project Script Documents ({scriptFiles.length})
                    </span>
                    <button
                      onClick={() => setActiveTab('Scripts')}
                      className="text-[10px] text-purple-600 hover:text-purple-800 font-bold flex items-center gap-0.5"
                    >
                      View Script Docs <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {scriptFiles.length === 0 ? (
                    <div className="py-4 text-center">
                      <p className="text-slate-400 italic text-[11px]">No script documents attached to this shoot project.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {scriptFiles.map((sf: any) => {
                        const isPdf = sf.fileName?.toLowerCase().endsWith('.pdf') || sf.fileType?.includes('pdf');
                        const isDoc = sf.fileName?.toLowerCase().endsWith('.doc') || sf.fileName?.toLowerCase().endsWith('.docx');
                        const fileUrl = sf.storagePath?.startsWith('http')
                          ? sf.storagePath
                          : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/${sf.storagePath?.replace(/^\/?/, '')}`;

                        return (
                          <div
                            key={sf.id}
                            className="p-2.5 bg-slate-50/80 border border-slate-200 rounded-lg flex items-center justify-between gap-2 hover:bg-purple-50/40 transition-colors"
                          >
                            <div className="truncate flex items-center gap-2">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono uppercase ${
                                isPdf ? 'bg-rose-100 text-rose-800' : isDoc ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                              }`}>
                                {isPdf ? 'PDF' : isDoc ? 'DOC' : 'FILE'}
                              </span>
                              <span className="font-bold text-slate-900 text-xs truncate">{sf.fileName}</span>
                            </div>
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded font-bold text-[10px] shrink-0 flex items-center gap-1 transition-colors"
                            >
                              <Eye className="w-3 h-3" /> Open Script
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Linked Graphic Requirements Column */}
                <div className="p-3.5 bg-white border border-blue-200/90 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                    <span className="font-bold text-xs text-blue-950 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-blue-600" />
                      Graphic Requirements ({project.graphicRequirements?.length || 0})
                    </span>
                    <button
                      onClick={() => setActiveTab('Graphic Requirements')}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5"
                    >
                      View All <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {(!project.graphicRequirements || project.graphicRequirements.length === 0) ? (
                    <div className="py-4 text-center text-slate-400 italic text-[11px]">
                      No graphic requirements linked to this shoot project yet.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {project.graphicRequirements.map((gr: any) => (
                        <div
                          key={gr.id}
                          className="p-2 bg-slate-50/80 border border-slate-200 rounded-lg flex items-center justify-between gap-2 hover:bg-blue-50/40 transition-colors"
                        >
                          <div className="truncate">
                            <span className="font-mono text-[10px] text-blue-700 font-bold mr-1.5">[{gr.requirementId}]</span>
                            <span className="font-bold text-slate-900 text-xs truncate">{gr.name}</span>
                            <div className="text-[10px] text-slate-500">{gr.requirementType || 'Graphic Item'} • {gr.priority || 'MEDIUM'}</div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase shrink-0 border ${
                            gr.status === 'APPROVED' || gr.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : gr.status === 'IN_PROGRESS'
                              ? 'bg-blue-50 text-blue-700 border-blue-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}>
                            {gr.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actual Completion Statistics Widget */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-blue-600" /> Actual Completion Statistics
                </h3>
                <span className="font-mono text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-bold uppercase">
                  Status: {project.status}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-slate-100/50 rounded-lg border border-slate-200">
                  <div className="text-slate-500 font-semibold text-[11px] mb-1">Scripts</div>
                  <div className="font-bold text-slate-900 text-sm font-mono">{project.completionStatistics?.scripts?.text || '0 / 0 Completed'}</div>
                </div>

                <div className="p-3 bg-slate-100/50 rounded-lg border border-slate-200">
                  <div className="text-slate-500 font-semibold text-[11px] mb-1">Graphics</div>
                  <div className="font-bold text-slate-900 text-sm font-mono">{project.completionStatistics?.graphics?.text || '0 / 0 Completed'}</div>
                </div>

                <div className="p-3 bg-slate-100/50 rounded-lg border border-slate-200">
                  <div className="text-slate-500 font-semibold text-[11px] mb-1">Production Tasks</div>
                  <div className="font-bold text-slate-900 text-sm font-mono">{project.completionStatistics?.tasks?.text || '0 / 0 Completed'}</div>
                </div>

                <div className="p-3 bg-slate-100/50 rounded-lg border border-slate-200">
                  <div className="text-slate-500 font-semibold text-[11px] mb-1">Deliverables</div>
                  <div className="font-bold text-slate-900 text-sm font-mono">{project.completionStatistics?.deliverables?.text || '0 / 0 Completed'}</div>
                </div>
              </div>
            </div>

            {/* Permanent Manual Closure Record Banner */}
            {project.closureReason && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                <div className="flex items-center gap-2 font-bold text-rose-700 text-xs">
                  <ShieldAlert className="w-4 h-4 text-rose-600" /> Permanent Project Closure Record
                </div>
                <div className="text-slate-800 text-xs font-medium pt-0.5">
                  Reason: <strong className="text-slate-900">"{project.closureReason}"</strong>
                </div>
                <div className="text-[10px] text-rose-600 font-mono">
                  Manually closed by Media Manager • Permanent Audit History Recorded
                </div>
              </div>
            )}

            {/* Completion Criteria Status Widget */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-600" /> Official Project Completion Criteria (4 Points)
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                  project.completionChecklist?.isReadyForCompletion
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  {project.completionChecklist?.isReadyForCompletion ? 'Ready for Completion' : `${project.completionChecklist?.pendingCount || 0} Pending Criteria`}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className={`p-3 rounded-lg border flex items-center justify-between ${
                  project.completionChecklist?.allTasksCompleted ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-100/40 border-slate-200 text-slate-500'
                }`}>
                  <div>
                    <div className="font-bold text-xs">1. Production Tasks</div>
                    <div className="text-[10px] opacity-80">All tasks completed</div>
                  </div>
                  {project.completionChecklist?.allTasksCompleted ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <span className="text-[10px] text-amber-600 font-mono font-bold">Pending</span>
                  )}
                </div>

                <div className={`p-3 rounded-lg border flex items-center justify-between ${
                  project.completionChecklist?.techReviewApproved ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-100/40 border-slate-200 text-slate-500'
                }`}>
                  <div>
                    <div className="font-bold text-xs">2. Technical Review</div>
                    <div className="text-[10px] opacity-80">Technical approval</div>
                  </div>
                  {project.completionChecklist?.techReviewApproved ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <span className="text-[10px] text-amber-600 font-mono font-bold">Pending</span>
                  )}
                </div>

                <div className={`p-3 rounded-lg border flex items-center justify-between ${
                  project.completionChecklist?.mediaReviewApproved ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-100/40 border-slate-200 text-slate-500'
                }`}>
                  <div>
                    <div className="font-bold text-xs">3. Media Review</div>
                    <div className="text-[10px] opacity-80">Media Manager approval</div>
                  </div>
                  {project.completionChecklist?.mediaReviewApproved ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <span className="text-[10px] text-amber-600 font-mono font-bold">Pending</span>
                  )}
                </div>

                <div className={`p-3 rounded-lg border flex items-center justify-between ${
                  project.completionChecklist?.clientConfirmationRecorded ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-100/40 border-slate-200 text-slate-500'
                }`}>
                  <div>
                    <div className="font-bold text-xs">4. Client Sign-off</div>
                    <div className="text-[10px] opacity-80">Client confirmation</div>
                  </div>
                  {project.completionChecklist?.clientConfirmationRecorded ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <span className="text-[10px] text-amber-600 font-mono font-bold">Pending</span>
                  )}
                </div>
              </div>
            </div>

            {isIndoor ? (
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 space-y-3">
                <h3 className="font-bold text-blue-700 text-sm">Indoor Studio Operational Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-700">
                  <div><span className="text-slate-400">Studio Name:</span> {project.indoorDetails?.studioName}</div>
                  <div><span className="text-slate-400">Address:</span> {project.indoorDetails?.studioAddress}</div>
                  <div><span className="text-slate-400">Booking Status:</span> {project.indoorDetails?.studioBookingStatus}</div>
                  <div><span className="text-slate-400">Booking Ref:</span> {project.indoorDetails?.studioBookingRef}</div>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 space-y-3">
                <h3 className="font-bold text-emerald-700 text-sm">Outdoor Shoot Operational Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-700">
                  <div><span className="text-slate-400">Location:</span> {outdoor?.outdoorLocation}</div>
                  <div><span className="text-slate-400">Permission:</span> {outdoor?.permissionStatus}</div>
                  <div><span className="text-slate-400">Weather Risk:</span> {outdoor?.weatherStatus}</div>
                  <div><span className="text-slate-400">Driver Assigned:</span> {outdoor?.driver || 'None (Warning)'}</div>
                  <div><span className="text-slate-400">Logistics Coordinator:</span> {outdoor?.logisticsCoordinator || 'N/A'}</div>
                  <div><span className="text-slate-400">Travel Notes:</span> {outdoor?.travelNotes || 'N/A'}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Scripts (Attached Script & Storyboard Documents) */}
        {activeTab === 'Scripts' && (
          <div className="space-y-6 text-xs">
            {/* Scripts Reference List (read-only) with Clip Codes */}
            {/* Header for Uploaded Docs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" /> Attached Script Documents &amp; Storyboard Files ({scriptFiles.length})
                </h3>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  View and download shooting script PDFs, DOCs, and narration briefs attached to this shoot project.
                </p>
              </div>
            </div>

            {/* Script Documents List / Grid */}
            {scriptFiles.length === 0 ? (
              <div className="p-8 bg-slate-50/60 border border-dashed border-slate-300 rounded-2xl text-center space-y-2">
                <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="font-bold text-slate-700 text-sm">No Script Document Files Attached</h4>
                <p className="text-slate-500 text-xs max-w-md mx-auto">
                  No PDF or Word script files attached to this shoot project yet. Script files can be uploaded or attached anytime.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {scriptFiles.map((sf: any) => {
                  const isPdf = sf.fileName?.toLowerCase().endsWith('.pdf') || sf.fileType?.includes('pdf');
                  const isDoc = sf.fileName?.toLowerCase().endsWith('.doc') || sf.fileName?.toLowerCase().endsWith('.docx') || sf.fileType?.includes('word');
                  const fileUrl = sf.storagePath?.startsWith('http')
                    ? sf.storagePath
                    : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/${sf.storagePath?.replace(/^\/?/, '')}`;

                  const docClips = readFileClipCodes(sf.clipCodes);
                  const docClipValue = clipCodeInputs[sf.id] || '';
                  const docSaving = isSavingClipCode === sf.id;
                  // Video editor is keyed on this document's own file id, matching the
                  // per-document clip codes above.
                  const docEditor = (sf.scriptEditorAssignments || [])[0] || null;
                  const docEditorUser = docEditor?.user;
                  // Only the editor the document is assigned to may finish the edit.
                  const isAssignedEditorOfDoc = !!docEditor && docEditor.userId === user?.id;

                  return (
                    <div
                      key={sf.id}
                      className="p-4 bg-white border border-slate-200 hover:border-purple-300 rounded-2xl space-y-3.5 flex flex-col justify-between shadow-xs transition-all group"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase flex items-center gap-1 border ${
                            isPdf
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : isDoc
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}>
                            <FileText className="w-3 h-3" />
                            {isPdf ? 'PDF SCRIPT' : isDoc ? 'WORD DOC' : 'SCRIPT DOC'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {sf.fileSize ? `${(sf.fileSize / 1024 / 1024).toFixed(2)} MB` : 'Doc'}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-slate-900 text-xs leading-snug break-words group-hover:text-purple-700 transition-colors">
                            {sf.fileName}
                          </h4>
                          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-2">
                            <span>Uploaded {sf.createdAt ? new Date(sf.createdAt).toLocaleDateString() : 'Recently'}</span>
                            {sf.uploadedBy?.name && (
                              <span>• By {sf.uploadedBy.name}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Clip Codes for this document */}
                      <div className="p-2.5 bg-emerald-50/60 border border-emerald-200/80 rounded-lg space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wide flex items-center gap-1.5">
                            <Scissors className="w-3.5 h-3.5" /> Clip Codes ({docClips.length})
                          </span>
                          {!canManageClipCodes && (
                            <span className="text-[10px] text-slate-500 italic font-medium">
                              Read-only
                            </span>
                          )}
                        </div>

                        {docClips.length === 0 ? (
                          <p className="text-[10px] text-emerald-800/70 italic">
                            No clip codes recorded for this document yet.
                          </p>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            {docClips.map((c, cIdx) => (
                              <div
                                key={`${c.code}-${c.addedAt || cIdx}`}
                                className="flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg bg-white border border-emerald-300 shadow-xs"
                                title={
                                  c.addedAt
                                    ? `Added by ${c.addedBy || 'unknown'} on ${new Date(c.addedAt).toLocaleString()}`
                                    : c.addedBy
                                    ? `Added by ${c.addedBy}`
                                    : undefined
                                }
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="font-mono font-bold text-emerald-900 text-[10px] shrink-0">
                                      {c.code}
                                    </span>
                                    {c.description && (
                                      <span className="font-normal text-emerald-700/80 truncate text-[10px]">
                                        {c.description}
                                      </span>
                                    )}
                                  </div>
                                  <span className="flex items-center gap-1 text-[9px] text-slate-500 mt-0.5">
                                    <User className="w-2.5 h-2.5 shrink-0" />
                                    <span className="truncate">
                                      {c.addedBy || 'Unknown'}
                                      {c.addedAt ? ` · ${new Date(c.addedAt).toLocaleDateString()}` : ''}
                                    </span>
                                  </span>
                                </div>
                                {canManageClipCodes && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveClipCode(sf.id, c.code)}
                                    disabled={docSaving}
                                    title={`Remove ${c.code}`}
                                    className="ml-0.5 shrink-0 text-emerald-500 hover:text-rose-600 transition-colors disabled:opacity-40"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {canManageClipCodes && (
                          <div className="flex gap-1.5 pt-0.5">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={docClipValue}
                              onChange={(e) => setClipInput(sf.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddClipCode(sf.id);
                                }
                              }}
                              placeholder="Clip code"
                              className="px-2 py-1.5 rounded-lg border border-emerald-300 bg-white text-[11px] font-mono font-bold text-emerald-900 placeholder:text-emerald-400/70 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 w-full min-w-0"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddClipCode(sf.id)}
                              disabled={docSaving || !docClipValue.trim()}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-[11px] transition-all flex items-center justify-center gap-1 whitespace-nowrap"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              {docSaving ? 'Saving…' : 'Add'}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Video Editor for THIS script document (Media Manager) */}
                      <div className="p-2.5 bg-indigo-50/60 border border-indigo-200/80 rounded-lg space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wide flex items-center gap-1.5">
                            <Video className="w-3.5 h-3.5" /> Video Editor
                          </span>
                          <span className="text-[10px] text-slate-500 italic font-medium">Read-only</span>
                        </div>

                        {/* Read-only display of assigned video editor */}
                        {docEditorUser && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-600">
                            <User className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">
                              {docEditorUser.name}
                              {docEditor?.assignedBy?.name ? ` · by ${docEditor.assignedBy.name}` : ''}
                            </span>
                          </div>
                        )}

                        {/* Editing workflow state + the editor's own finish action */}
                        {docEditor && (
                          <div className="pt-1.5 border-t border-indigo-200/70 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  docEditor.editingStatus === 'COMPLETED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : docEditor.editingStatus === 'IN_REVIEW'
                                    ? 'bg-amber-100 text-amber-800'
                                    : docEditor.editingStatus === 'ACCEPTED'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {docEditor.editingStatus === 'COMPLETED'
                                  ? 'Editing approved'
                                  : docEditor.editingStatus === 'IN_REVIEW'
                                  ? 'In review'
                                  : docEditor.editingStatus === 'ACCEPTED'
                                  ? 'Accepted · editing'
                                  : 'Awaiting acceptance'}
                              </span>
                              {docEditor.taskId && (
                                <a
                                  href="/tasks"
                                  className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-0.5"
                                >
                                  Open task <ArrowRight className="w-3 h-3" />
                                </a>
                              )}
                            </div>

                            {docEditor.videoEditingFinished && docEditor.editingFinishedAt && (
                              <p className="text-[9px] text-slate-500">
                                Marked finished {new Date(docEditor.editingFinishedAt).toLocaleDateString()}
                              </p>
                            )}

                            {isAssignedEditorOfDoc && !docEditor.videoEditingFinished && (
                              docEditor.taskAccepted ? (
                                <button
                                  type="button"
                                  onClick={() => handleFinishVideoEditing(sf.id)}
                                  disabled={isFinishingEditor === sf.id}
                                  title="Mark video editing as finished and send it for technical review"
                                  className="w-full px-2 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-[10px] transition-colors flex items-center justify-center gap-1"
                                >
                                  {isFinishingEditor === sf.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <CheckCircle className="w-3 h-3" />
                                  )}
                                  Finish video editing
                                </button>
                              ) : (
                                <p className="text-[9px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 leading-snug">
                                  Accept the video editing task in your Tasks list to unlock finishing this edit.
                                </p>
                              )
                            )}
                          </div>
                        )}
                      </div>

                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-1.5 px-2.5 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg font-bold text-[11px] text-center flex items-center justify-center gap-1 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-purple-600" />
                          <span>View Script</span>
                        </a>
                        <a
                          href={fileUrl}
                          download={sf.fileName}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors"
                          title="Download Script File"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Graphic Requirements */}
        {activeTab === 'Graphic Requirements' && (
          <div className="space-y-6 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Palette className="w-4 h-4 text-blue-600" /> Linked Graphic Requirements ({project.graphicRequirements?.length || 0})
                </h3>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Graphic design requirements, posters, thumbnails, and social creatives bound to this shoot project.
                </p>
              </div>
              <Link
                href="/graphic-reqs"
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg transition-colors flex items-center gap-1.5 text-xs self-start sm:self-auto"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Graphic Requirements Directory
              </Link>
            </div>

            {/* Graphic Requirement Creation Form */}
            {Boolean(user && ['SOCIAL_MEDIA_MANAGER', 'MEDIA_MANAGER', 'MARKETING_MANAGER', 'ADMINISTRATOR', 'ADMIN'].includes(user.role as string)) && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newGraphicTitle.trim()) {
                    alert('Graphic requirement title is required.');
                    return;
                  }
                  setIsCreatingGraphic(true);
                  try {
                    await fetchApi('/graphic-reqs', {
                      method: 'POST',
                      body: JSON.stringify({
                        projectId: project.id,
                        name: newGraphicTitle.trim(),
                        requirementType: newGraphicType || 'Poster',
                        objective: newGraphicObjective.trim() || undefined,
                        description: newGraphicDescription.trim() || undefined,
                        priority: newGraphicPriority || 'MEDIUM',
                        remarks: newGraphicRemarks.trim() || undefined,
                        status: 'APPROVED',
                      }),
                    });
                    setNewGraphicTitle('');
                    setNewGraphicDescription('');
                    setNewGraphicRemarks('');
                    loadProject();
                  } catch (err: any) {
                    alert(err.message || 'Failed to create Graphic Requirement');
                  } finally {
                    setIsCreatingGraphic(false);
                  }
                }}
                className="p-5 bg-gradient-to-r from-blue-50/60 via-slate-50 to-blue-50/60 border border-blue-200 rounded-xl space-y-4 shadow-sm text-xs"
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="font-bold text-blue-900 text-xs flex items-center gap-2">
                    <Plus className="w-4 h-4 text-blue-600" /> Add Graphic Requirement to Project
                  </h4>
                  <span className="font-mono text-[10px] bg-blue-100 text-blue-800 border border-blue-300 px-2 py-0.5 rounded font-bold">
                    Parent: {project.projectId}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Requirement Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Campaign Banner & Instagram Poster"
                      value={newGraphicTitle}
                      onChange={(e) => setNewGraphicTitle(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-lg font-semibold focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Requirement Type *</label>
                    <select
                      value={newGraphicType}
                      onChange={(e) => setNewGraphicType(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-lg font-semibold focus:border-blue-500 focus:outline-none"
                    >
                      <option value="Poster">Poster</option>
                      <option value="Instagram Post">Instagram Post</option>
                      <option value="Thumbnail">Video Thumbnail</option>
                      <option value="Story Graphic">Story Graphic</option>
                      <option value="Banner">Web / Display Banner</option>
                      <option value="Product Mockup">Product Mockup</option>
                      <option value="Packaging Design">Packaging Design</option>
                      <option value="Custom Graphic">Custom Graphic</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Priority</label>
                    <select
                      value={newGraphicPriority}
                      onChange={(e) => setNewGraphicPriority(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-lg font-semibold focus:border-blue-500 focus:outline-none"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Objective / Goal</label>
                    <input
                      type="text"
                      placeholder="e.g. Highlight promotional discount & brand logo"
                      value={newGraphicObjective}
                      onChange={(e) => setNewGraphicObjective(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Description / Dimensions</label>
                    <input
                      type="text"
                      placeholder="e.g. 1080x1350 vertical aspect ratio, high resolution export"
                      value={newGraphicDescription}
                      onChange={(e) => setNewGraphicDescription(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isCreatingGraphic}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-md transition-all flex items-center gap-1.5 text-xs disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    {isCreatingGraphic ? 'Creating...' : 'Create Graphic Requirement'}
                  </button>
                </div>
              </form>
            )}

            {/* List of Graphic Requirements */}
            {(!project.graphicRequirements || project.graphicRequirements.length === 0) ? (
              <div className="p-12 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <Palette className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="font-bold text-slate-700">No Graphic Requirements linked to this shoot project.</p>
                <p className="text-slate-400 text-[11px]">Use the form above to add graphic creative requirements.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.graphicRequirements.map((g: any) => (
                  <div
                    key={g.id}
                    className="p-4 bg-white border border-slate-200 hover:border-blue-300 rounded-xl space-y-3 shadow-2xs transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-xs">
                            {g.requirementId}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {g.requirementType}
                          </span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono border ${
                          g.status === 'APPROVED' || g.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : g.status === 'IN_PROGRESS'
                            ? 'bg-blue-50 text-blue-700 border-blue-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}>
                          {g.status}
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm">{g.name}</h4>

                      {g.objective && (
                        <p className="text-slate-600 text-xs">
                          <strong className="text-slate-800">Objective:</strong> {g.objective}
                        </p>
                      )}

                      {g.description && (
                        <p className="text-slate-500 text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {g.description}
                        </p>
                      )}

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Priority: <strong className="text-slate-800">{g.priority || 'MEDIUM'}</strong></span>
                        <span>Tasks: <strong className="text-blue-600">{g.tasks?.length || 0}</strong></span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <Link
                        href={`/graphic-reqs?inspectId=${g.id}`}
                        className="text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center gap-1"
                      >
                        Inspect Requirement <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                      <Link
                        href={`/tasks`}
                        className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded text-[11px] font-bold transition-colors"
                      >
                        View Tasks
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Tasks & Production Execution Sessions */}
        {activeTab === 'Tasks' && (() => {
          const allTasks: any[] = Array.isArray(project.tasks) ? project.tasks : [];

          const shootTasks = allTasks.filter(
            (t: any) =>
              t.sourceType === 'SHOOT_PROJECT' ||
              (t.taskType === 'PROJECT' && !t.graphicRequirementId) ||
              (!t.graphicRequirementId && t.sourceType !== 'GRAPHIC_REQUIREMENT')
          );          const graphicTasks = allTasks.filter(
            (t: any) => t.graphicRequirementId || t.sourceType === 'GRAPHIC_REQUIREMENT' || t.taskType === 'GRAPHIC_REQUIREMENT'
          );

          const activeTasks = allTasks.filter((t: any) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
          const completedTasks = allTasks.filter((t: any) => t.status === 'COMPLETED');

          const filteredTasks = allTasks.filter((t: any) => {
            if (taskFilter === 'SHOOT') {
              return (
                t.sourceType === 'SHOOT_PROJECT' ||
                (t.taskType === 'PROJECT' && !t.graphicRequirementId) ||
                (!t.graphicRequirementId && t.sourceType !== 'GRAPHIC_REQUIREMENT' && t.sourceType !== 'SCRIPT')
              );
            }
            if (taskFilter === 'GRAPHIC') return t.graphicRequirementId || t.sourceType === 'GRAPHIC_REQUIREMENT' || t.taskType === 'GRAPHIC_REQUIREMENT';
            if (taskFilter === 'ACTIVE') return t.status !== 'COMPLETED' && t.status !== 'CANCELLED';
            if (taskFilter === 'COMPLETED') return t.status === 'COMPLETED';
            return true;
          });

          return (
            <div className="space-y-6 text-xs">
              {/* Header Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-blue-600" /> Project Tasks &amp; Production Execution Sessions ({allTasks.length})
                  </h3>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    All shoot execution tasks, outdoor on-location sessions and graphic deliverables linked to this project.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/tasks`}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg transition-colors flex items-center gap-1.5 text-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Tasks Operations Hub
                  </Link>
                  {(user?.role === 'MEDIA_MANAGER' || (user?.role as string) === 'ADMIN') && (
                    <Link
                      href={`/tasks`}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all shadow-md shadow-blue-600/20 flex items-center gap-1.5 text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Create Task
                    </Link>
                  )}
                </div>
              </div>

              {/* Quick Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setTaskFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    taskFilter === 'ALL'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>All Tasks</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{allTasks.length}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTaskFilter('SHOOT')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    taskFilter === 'SHOOT'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Shoot Sessions</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-200/40">{shootTasks.length}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTaskFilter('GRAPHIC')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    taskFilter === 'GRAPHIC'
                      ? 'bg-pink-600 text-white shadow-sm'
                      : 'bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>Graphic Creatives</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-pink-200/40">{graphicTasks.length}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTaskFilter('ACTIVE')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    taskFilter === 'ACTIVE'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Active ({activeTasks.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTaskFilter('COMPLETED')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    taskFilter === 'COMPLETED'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Completed ({completedTasks.length})</span>
                </button>
              </div>

              {/* Task Grid */}
              {filteredTasks.length === 0 ? (
                <div className="p-12 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <CheckSquare className="w-10 h-10 text-slate-300 mx-auto" />
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800 text-sm">No tasks match the selected filter.</p>
                    <p className="text-slate-500 text-xs">
                      {allTasks.length === 0
                        ? 'No production tasks created yet under this shoot project.'
                        : 'Try switching to "All Tasks" to view all project tasks.'}
                    </p>
                  </div>
                  {allTasks.length === 0 && (
                    <Link
                      href="/tasks"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs shadow-md transition-all mt-2"
                    >
                      <Plus className="w-3.5 h-3.5" /> Create Task Now
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTasks.map((t: any) => {
                    const isShootTask =
                      t.sourceType === 'SHOOT_PROJECT' ||
                      (t.taskType === 'PROJECT' && !t.graphicRequirementId) ||
                      (!t.graphicRequirementId && t.sourceType !== 'GRAPHIC_REQUIREMENT' && t.sourceType !== 'SCRIPT');
                    const isGraphicTask = Boolean(t.graphicRequirementId || t.sourceType === 'GRAPHIC_REQUIREMENT' || t.taskType === 'GRAPHIC_REQUIREMENT');

                    const isOutdoorTask = isShootTask && (t.title?.toLowerCase().includes('outdoor') || t.description?.toLowerCase().includes('outdoor') || t.project?.shootType === 'OUTDOOR');

                    const assignedStaff = t.assignedEmployees || [];
                    const isUserAssigned = user?.id && assignedStaff.some((a: any) => (a.userId === user.id || a.user?.id === user.id));
                    const isUserPendingAcceptance =
                      isUserAssigned &&
                      assignedStaff.some(
                        (a: any) => (a.userId === user.id || a.user?.id === user.id) && a.acceptanceStatus !== 'ACCEPTED'
                      );

                    return (
                      <div
                        key={t.id}
                        className="bg-white border border-slate-200 hover:border-blue-300 rounded-xl p-4.5 space-y-3 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div className="space-y-2.5">
                          {/* Top Badges */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-blue-700 font-extrabold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-xs">
                                {t.taskId}
                              </span>

                              {/* Type Badge */}
                              {isOutdoorTask ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1">
                                  <Compass className="w-3 h-3 text-purple-600" /> Outdoor Shoot Session
                                </span>
                              ) : isShootTask ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1">
                                  <Building2 className="w-3 h-3 text-blue-600" /> Shoot Task
                                </span>
                              ) : isGraphicTask ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-pink-800 border border-pink-300 flex items-center gap-1">
                                  <Palette className="w-3 h-3 text-pink-600" /> Graphic Task
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  Production Task
                                </span>
                              )}

                              {/* Priority */}
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase border ${
                                  t.priority === 'CRITICAL'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : t.priority === 'HIGH'
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-slate-50 text-slate-600 border-slate-200'
                                }`}
                              >
                                {t.priority || 'MEDIUM'}
                              </span>
                            </div>

                            {/* Status */}
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono border ${
                                t.status === 'COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : t.status === 'IN_PROGRESS'
                                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                                  : t.status === 'ACCEPTED'
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                                  : t.status?.includes('REVIEW') || t.status?.includes('WAITING')
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : 'bg-slate-100 text-slate-700 border-slate-300'
                              }`}
                            >
                              {(t.status || 'PENDING').replace(/_/g, ' ')}
                            </span>
                          </div>

                          {/* Task Title */}
                          <h4 className="font-bold text-slate-900 text-sm leading-snug">{t.title}</h4>

                          {/* Description */}
                          {t.description && (
                            <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed bg-slate-50/60 p-2 rounded-lg border border-slate-100">
                              {t.description}
                            </p>
                          )}

                          {/* Due Date & Hours */}
                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Due: <strong className="text-slate-800">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'Not Set'}</strong>
                            </span>
                            <span className="font-mono text-slate-700">
                              Est: <strong>{t.estimatedHours || 2}h</strong>
                            </span>
                          </div>

                          {/* Assigned Employees */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned Crew:</span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {assignedStaff.length === 0 ? (
                                <span className="text-[11px] text-slate-400 italic">No staff assigned</span>
                              ) : (
                                assignedStaff.map((ae: any) => (
                                  <span
                                    key={ae.id || ae.userId}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                                      ae.acceptanceStatus === 'ACCEPTED'
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        : 'bg-amber-50 text-amber-800 border-amber-200'
                                    }`}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                    <span>{ae.user?.name || 'Staff'}</span>
                                    {ae.acceptanceStatus === 'ACCEPTED' && <Check className="w-2.5 h-2.5 text-emerald-600" />}
                                  </span>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-1 pt-1">
                            <div className="flex justify-between text-[10px] text-slate-600 font-bold">
                              <span>Progress</span>
                              <span>{t.completionPercentage || 0}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full transition-all"
                                style={{ width: `${t.completionPercentage || 0}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Action Footer */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <Link
                            href={`/tasks?taskId=${t.id}`}
                            className="text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center gap-1"
                          >
                            Inspect Task Details <ArrowRight className="w-3.5 h-3.5" />
                          </Link>

                          {isUserPendingAcceptance && (
                            <Link
                              href={`/tasks?taskId=${t.id}`}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-[11px] flex items-center gap-1 shadow transition-colors"
                            >
                              <Check className="w-3 h-3" /> Accept Task
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* Tab 5: Team */}
        {activeTab === 'Team' && (() => {
          const assignedStaffMap = new Map<string, any>();

          (project?.assignedTeam || []).forEach((item: any) => {
            if (item.user) {
              assignedStaffMap.set(item.user.id, {
                user: item.user,
                roleInProject: item.roleInProject,
                assignedAt: item.assignedAt,
                source: 'PROJECT_TEAM',
              });
            }
          });

          (project?.tasks || []).forEach((t: any) => {
            (t.assignedEmployees || []).forEach((a: any) => {
              if (a.user && !assignedStaffMap.has(a.user.id)) {
                assignedStaffMap.set(a.user.id, {
                  user: a.user,
                  roleInProject: 'Task Assignee',
                  assignedAt: a.assignedAt || t.createdAt,
                  source: 'TASK_ASSIGNEE',
                });
              }
            });
          });

          const allAssignedStaffList = Array.from(assignedStaffMap.values()).map((staffItem) => {
            const uId = staffItem.user.id;
            const userTasks = (project?.tasks || []).filter((t: any) =>
              t.assignedEmployees?.some((a: any) => a.userId === uId)
            );
            const userAssignments = (project?.tasks || []).flatMap((t: any) =>
              (t.assignedEmployees || []).filter((a: any) => a.userId === uId)
            );
            const hasAccepted =
              userAssignments.some((a: any) => a.acceptanceStatus === 'ACCEPTED') ||
              userTasks.some((t: any) => t.status === 'ACCEPTED' || t.status === 'IN_PROGRESS' || t.status === 'COMPLETED');

            const acceptedAt = userAssignments.find((a: any) => a.acceptedAt)?.acceptedAt;

            return {
              ...staffItem,
              tasks: userTasks,
              isAccepted: hasAccepted,
              acceptedAt,
              status: hasAccepted ? 'ACCEPTED' : 'PENDING',
            };
          });

          const totalAssignedStaffCount = allAssignedStaffList.length;
          const acceptedStaffCount = allAssignedStaffList.filter((s) => s.isAccepted).length;
          const pendingStaffCount = allAssignedStaffList.filter((s) => !s.isAccepted).length;

          const filteredStaffList = allAssignedStaffList.filter((s) => {
            if (teamFilter === 'ACCEPTED') return s.isAccepted;
            if (teamFilter === 'PENDING') return !s.isAccepted;
            return true;
          });

          return (
            <div className="space-y-6 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" /> Project Assigned Staff &amp; Acceptance Status
                  </h3>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    View staff assigned to this project, including who has accepted the assignment and whose acceptance is pending.
                  </p>
                </div>

                {['PENDING_MARKETING_APPROVAL', 'PLANNED', 'PENDING_CLIENT_APPROVAL'].includes(project.status) ? (
                  <span className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 font-semibold text-xs flex items-center gap-1">
                    Waiting for Marketing Approval — Staff assignment locked until approved.
                  </span>
                ) : (user?.role === 'MEDIA_MANAGER' || (user?.role as string) === 'ADMIN') ? (
                  <button
                    onClick={() => setShowManageTeamModal(!showManageTeamModal)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center gap-1.5 text-xs shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> Manage Assigned Staff
                  </button>
                ) : null}
              </div>

              {/* Quick Manage Team Panel */}
              {showManageTeamModal && (
                <div className="p-4 bg-slate-50 border border-blue-200 rounded-xl space-y-3">
                  <h4 className="font-bold text-blue-700">Click staff members to assign or remove from this project:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {allUsers.map((u) => {
                      const isAssigned = project.assignedTeam?.some((t: any) => t.userId === u.id);
                      return (
                        <button
                          key={u.id}
                          onClick={() => handleToggleTeamUser(u.id)}
                          className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                            isAssigned
                              ? 'bg-blue-50 border-blue-500 text-blue-800 font-semibold'
                              : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                              isAssigned ? 'bg-blue-600' : 'bg-slate-200'
                            }`}>
                              {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="truncate">
                              <div className="text-xs text-slate-800 truncate">{u.name}</div>
                              <div className="text-[10px] text-slate-500 truncate">{u.employeeProfile?.designation || u.role}</div>
                            </div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            isAssigned ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {isAssigned ? 'Assigned' : 'Add'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Status Counters & Filter Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setTeamFilter('ALL')}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                    teamFilter === 'ALL'
                      ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400/20'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Assigned Staff</span>
                    <span className="text-xl font-extrabold text-slate-900">{totalAssignedStaffCount}</span>
                  </div>
                  <Users className="w-5 h-5 text-blue-600" />
                </button>

                <button
                  type="button"
                  onClick={() => setTeamFilter('ACCEPTED')}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                    teamFilter === 'ACCEPTED'
                      ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/20'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Accepted</span>
                    <span className="text-xl font-extrabold text-emerald-700">{acceptedStaffCount}</span>
                  </div>
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </button>

                <button
                  type="button"
                  onClick={() => setTeamFilter('PENDING')}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                    teamFilter === 'PENDING'
                      ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/20'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Pending Acceptance</span>
                    <span className="text-xl font-extrabold text-amber-700">{pendingStaffCount}</span>
                  </div>
                  <Clock className="w-5 h-5 text-amber-600" />
                </button>
              </div>

              {/* Assigned Project Staff & Acceptance Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    Assigned Project Staff List ({filteredStaffList.length})
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Filter: {teamFilter === 'ALL' ? 'All Staff' : teamFilter === 'ACCEPTED' ? 'Accepted Only' : 'Pending Only'}
                  </span>
                </div>

                {filteredStaffList.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50/50 border border-slate-200 rounded-2xl text-slate-500 space-y-2">
                    <Users className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="font-bold text-slate-700 text-xs">
                      {totalAssignedStaffCount === 0
                        ? 'No staff members currently assigned to this project.'
                        : `No staff matching the "${teamFilter}" filter.`}
                    </p>
                    {totalAssignedStaffCount === 0 && (
                      <p className="text-[11px] text-slate-400">Click "Manage Assigned Staff" above to assign shoot staff.</p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredStaffList.map((staffItem: any) => {
                      const teamUser = staffItem.user;
                      const profile = teamUser?.employeeProfile;
                      const isAcc = staffItem.isAccepted;

                      return (
                        <div
                          key={teamUser.id}
                          className={`p-4 bg-white border rounded-2xl space-y-3 flex flex-col justify-between shadow-xs transition-all ${
                            isAcc ? 'border-emerald-200 hover:border-emerald-300' : 'border-amber-200 hover:border-amber-300'
                          }`}
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                    isAcc
                                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                                      : 'bg-amber-50 border border-amber-200 text-amber-700'
                                  }`}
                                >
                                  {teamUser?.name ? teamUser.name.charAt(0).toUpperCase() : 'S'}
                                </div>
                                <div className="overflow-hidden">
                                  <h4 className="font-bold text-slate-900 text-xs truncate">{teamUser?.name}</h4>
                                  <p className="text-slate-500 text-[10px] truncate">{teamUser?.email}</p>
                                </div>
                              </div>

                              {/* Acceptance Status Badge */}
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase font-mono shrink-0 flex items-center gap-1 border ${
                                  isAcc
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                    : 'bg-amber-50 text-amber-800 border-amber-300'
                                }`}
                              >
                                {isAcc ? (
                                  <>
                                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                                    <span>Accepted</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    <span>Pending</span>
                                  </>
                                )}
                              </span>
                            </div>

                            <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-500">
                              <div className="flex items-center justify-between">
                                <span>Role / Position:</span>
                                <strong className="text-slate-800">{profile?.designation || teamUser?.role || 'Staff'}</strong>
                              </div>
                              {profile?.department && (
                                <div className="flex items-center justify-between">
                                  <span>Department:</span>
                                  <strong className="text-slate-700">{profile.department.name}</strong>
                                </div>
                              )}
                              <div className="flex items-center justify-between">
                                <span>Acceptance State:</span>
                                <strong className={isAcc ? 'text-emerald-700' : 'text-amber-700'}>
                                  {isAcc
                                    ? staffItem.acceptedAt
                                      ? `Accepted (${new Date(staffItem.acceptedAt).toLocaleDateString()})`
                                      : 'Accepted & Active'
                                    : 'Pending Review & Acceptance'}
                                </strong>
                              </div>
                            </div>

                            {/* Assigned Tasks Summary for this Staff */}
                            {staffItem.tasks?.length > 0 && (
                              <div className="pt-2 border-t border-slate-100 space-y-1">
                                <span className="text-[10px] text-slate-400 font-bold uppercase block">
                                  Assigned Shoot Tasks ({staffItem.tasks.length}):
                                </span>
                                <div className="space-y-1">
                                  {staffItem.tasks.map((tsk: any) => (
                                    <div key={tsk.id} className="p-1.5 bg-slate-50 rounded border border-slate-200 text-[10px] flex items-center justify-between">
                                      <span className="font-mono text-blue-600 font-semibold truncate max-w-[140px]">
                                        [{tsk.taskId}] {tsk.title}
                                      </span>
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                          tsk.status === 'COMPLETED'
                                            ? 'bg-emerald-50 text-emerald-700'
                                            : tsk.status === 'IN_PROGRESS' || tsk.status === 'ACCEPTED'
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'bg-amber-50 text-amber-700'
                                        }`}
                                      >
                                        {tsk.status}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                            <span className="text-slate-500">
                              {staffItem.assignedAt ? `Assigned ${new Date(staffItem.assignedAt).toLocaleDateString()}` : 'Assigned to Project'}
                            </span>
                            <span className={isAcc ? 'text-emerald-700 font-bold' : 'text-amber-700 font-semibold'}>
                              {isAcc ? '✓ Access Active' : '⏳ Pending Acceptance'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Tab 6: Equipment */}
        {activeTab === 'Equipment' && (
          <ProjectEquipmentTab project={project} onRefresh={loadProject} />
        )}

        {/* Tab 7: Deliverables */}
        {(activeTab === 'Deliverables' || activeTab === 'Deliverables & Drive') && (
          <div className="space-y-6 text-xs">
            {['WAITING_FOR_TECHNICAL_REVIEW', 'TECHNICAL_REVIEW', 'WAITING_FOR_MEDIA_REVIEW', 'MEDIA_MANAGER_REVIEW', 'WAITING_FOR_MARKETING_APPROVAL', 'PENDING_MARKETING_APPROVAL', 'PENDING_CLIENT_APPROVAL', 'PENDING_CLIENT_REVIEW', 'WAITING_FOR_CLIENT_CONFIRMATION', 'COMPLETED'].includes(project?.status) && (
              <div className="bg-amber-50 border-2 border-amber-300 p-3.5 rounded-xl space-y-1 text-xs text-amber-950 shadow-xs flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-amber-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                    Project Under Review — Read-Only Mode
                  </h4>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    This project is currently undergoing formal review (Status: <strong className="font-mono font-bold text-amber-900">{project?.status}</strong>). Adding new deliverables, media assets, and file modifications are locked in read-only mode until review decision is completed.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Film className="w-4 h-4 text-emerald-600" /> Project Deliverables &amp; Media Assets
                </h3>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Each deliverable is linked to its corresponding Graphic Requirement.
                </p>
              </div>

              {!['WAITING_FOR_TECHNICAL_REVIEW', 'TECHNICAL_REVIEW', 'WAITING_FOR_MEDIA_REVIEW', 'MEDIA_MANAGER_REVIEW', 'WAITING_FOR_MARKETING_APPROVAL', 'PENDING_MARKETING_APPROVAL', 'PENDING_CLIENT_APPROVAL', 'PENDING_CLIENT_REVIEW', 'WAITING_FOR_CLIENT_CONFIRMATION', 'COMPLETED'].includes(project?.status) ? (
                <button
                  onClick={() => setShowCreateDeliverableModal(!showCreateDeliverableModal)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Register Deliverable
                </button>
              ) : (
                <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded font-mono text-[10px] font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> Deliverables Locked (Under Review)
                </span>
              )}
            </div>

            {/* Create Deliverable Modal Form */}
            {showCreateDeliverableModal && (
              <form onSubmit={handleCreateDeliverable} className="p-5 bg-slate-50 border border-emerald-300 rounded-2xl space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h4 className="font-bold text-emerald-800 text-sm flex items-center gap-2">
                      <Film className="w-4 h-4 text-emerald-600" /> Register New Deliverable / Video Asset
                    </h4>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Enter direct video links (YouTube, Google Drive, Vimeo, Frame.io, Dropbox, CDN streaming link).
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Deliverable Type *</label>
                    <select
                      value={deliverableType}
                      onChange={(e) => setDeliverableType(e.target.value)}
                      className="w-full bg-slate-100 border border-slate-200 text-slate-800 px-3 py-2 rounded-lg font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none"
                    >
                      <option value="Video">Video (Main Cut)</option>
                      <option value="Reel">Reel / Short</option>
                      <option value="Motion Graphic">Motion Graphic</option>
                      <option value="Poster">Poster</option>
                      <option value="Carousel">Carousel</option>
                      <option value="Story">Story</option>
                      <option value="Banner">Banner</option>
                      <option value="Raw Footage">Raw Footage</option>
                      <option value="Audio Track">Audio Track</option>
                      <option value="Other">Other Deliverable</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Deliverable Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Hero Brand Commercial 4K Master Cut"
                      value={deliverableName}
                      onChange={(e) => setDeliverableName(e.target.value)}
                      className="w-full bg-slate-100 border border-slate-200 text-slate-800 px-3 py-2 rounded-lg font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Link to Graphic Req</label>
                    <select
                      value={linkedGraphicReqId}
                      onChange={(e) => setLinkedGraphicReqId(e.target.value)}
                      className="w-full bg-slate-100 border border-slate-200 text-slate-800 px-3 py-2 rounded-lg font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none"
                    >
                      <option value="">None (Unlinked)</option>
                      {project.graphicRequirements?.map((g: any) => (
                        <option key={g.id} value={g.id}>
                          [{g.requirementId}] {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Video URL / Cloud Storage Link Input */}
                <div className="space-y-1.5 p-3.5 bg-white border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <label className="block text-slate-800 font-bold text-xs flex items-center gap-1.5">
                      <Video className="w-4 h-4 text-emerald-600" /> Video URL / Cloud Storage Link *
                    </label>
                    {deliverableVideoUrl.trim() && getDeliverableLinkInfo(deliverableVideoUrl) && (
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getDeliverableLinkInfo(deliverableVideoUrl)?.color}`}>
                        {getDeliverableLinkInfo(deliverableVideoUrl)?.label}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="url"
                      required
                      placeholder="https://youtube.com/watch?v=... or https://drive.google.com/file/... or https://vimeo.com/... or https://cdn.moms.com/video.mp4"
                      value={deliverableVideoUrl}
                      onChange={(e) => setDeliverableVideoUrl(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3.5 py-2.5 rounded-lg font-mono text-xs focus:border-emerald-500 focus:bg-white focus:outline-none pr-10"
                    />
                    <LinkIcon className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Paste YouTube, Vimeo, Google Drive, Frame.io, Dropbox, S3, or direct video streaming / download link.
                  </p>
                </div>

                <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowCreateDeliverableModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingDeliverable}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-bold shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5"
                  >
                    {isSubmittingDeliverable ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" /> Save Deliverable
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Deliverables Grid List */}
            {project.files?.length === 0 ? (
              <div className="p-8 text-center bg-slate-50/50 border border-slate-200 rounded-2xl text-slate-500 space-y-2">
                <FileVideo className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="font-semibold text-slate-700">No deliverables or video links uploaded yet for this project.</p>
                <p className="text-xs text-slate-400">Click "Register Deliverable" above to upload a video link or media asset.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {project.files?.map((f: any) => {
                  const linkedGraphic = project.graphicRequirements?.find((g: any) => g.id === f.graphicRequirementId);
                  const isUrl = f.storagePath && (f.storagePath.startsWith('http://') || f.storagePath.startsWith('https://'));
                  const linkInfo = getDeliverableLinkInfo(f.storagePath);
                  const isVideo = f.fileType?.includes('video') || linkInfo?.label?.includes('Video') || linkInfo?.label?.includes('Stream') || linkInfo?.label?.includes('YouTube') || linkInfo?.label?.includes('Vimeo');

                  return (
                    <div key={f.id} className="p-4 bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl space-y-3.5 flex flex-col justify-between shadow-xs transition-all">
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold uppercase">
                              {f.fileName.startsWith('[') ? f.fileName.split(']')[0].replace('[', '') : 'DELIVERABLE'}
                            </span>
                            {linkInfo && (
                              <span className={`px-2 py-0.5 text-[9px] font-bold rounded border ${linkInfo.color}`}>
                                {linkInfo.label}
                              </span>
                            )}
                          </div>

                          <span className="text-[10px] text-slate-500 font-mono shrink-0">
                            {isUrl ? 'Cloud / URL' : `${(f.fileSize / (1024 * 1024)).toFixed(1)} MB`}
                          </span>
                        </div>

                        <h4 className="font-bold text-slate-900 text-sm leading-snug">
                          {f.fileName.includes(']') ? f.fileName.split(']').slice(1).join(']').trim() : f.fileName}
                        </h4>

                        {/* Storage Path & Video Link Display */}
                        {f.storagePath && (
                          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-bold text-slate-600 flex items-center gap-1">
                                <LinkIcon className="w-3 h-3 text-slate-400" /> Deliverable Resource Link:
                              </span>
                              {isUrl && (
                                <button
                                  type="button"
                                  onClick={() => copyDeliverableLink(f.id, f.storagePath)}
                                  className="text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1 transition-colors"
                                  title="Copy video link"
                                >
                                  {copiedDeliverableId === f.id ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-600" />
                                      <span className="text-emerald-600">Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>

                            <div className="font-mono text-[10px] text-slate-700 bg-white p-1.5 rounded border border-slate-200 truncate">
                              {f.storagePath}
                            </div>

                            {/* Watch Video / Open Link Action Button */}
                            {isUrl ? (
                              <a
                                href={f.storagePath}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full mt-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                              >
                                {isVideo ? <Play className="w-3.5 h-3.5 fill-blue-600 text-blue-600" /> : <ExternalLink className="w-3.5 h-3.5 text-blue-600" />}
                                <span>{isVideo ? 'Watch Video / Open Stream' : 'Open Deliverable Link'}</span>
                                <ExternalLink className="w-3 h-3 text-blue-400 ml-0.5" />
                              </a>
                            ) : (
                              <a
                                href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${f.storagePath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full mt-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                              >
                                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                                <span>View / Download File Asset</span>
                              </a>
                            )}
                          </div>
                        )}

                        <div className="space-y-1 text-[11px] pt-1">
                          

                          {linkedGraphic && (
                            <div className="p-2 bg-indigo-50/70 border border-indigo-200 rounded-lg text-indigo-800 font-semibold flex items-center justify-between">
                              <span>Linked Graphic Req:</span>
                              <span className="font-mono text-slate-900">[{linkedGraphic.requirementId}] {linkedGraphic.name}</span>
                            </div>
                          )}

                          {!linkedGraphic && (
                            <div className="text-slate-400 italic text-[10px]">General Project Deliverable</div>
                          )}
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                        <span>Uploaded by: <strong className="text-slate-700">{f.uploadedBy?.name || 'Manager'}</strong></span>
                        <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">Active Ver.</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 12: Shoot Checklist */}
        {(activeTab === 'Shoot Checklist' || activeTab === 'Checklist') && (
          <div className="space-y-6 text-xs">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-600" /> Operational Shoot Checklist
                </h3>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Standard pre-shoot verification tasks for equipment, permits, and crew readiness.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="font-bold text-blue-700 border-b border-slate-200 pb-2">1. Pre-Shoot Logistics & Location Readiness</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-slate-800 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded border-slate-200 text-blue-600 focus:ring-blue-500" />
                    <span>Location Address & Access Confirmed ({project.shootLocation})</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-800 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded border-slate-200 text-blue-600 focus:ring-blue-500" />
                    <span>Location Access & Site Readiness Confirmed</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-800 cursor-pointer">
                    <input type="checkbox" defaultChecked={Boolean(project.outdoorDetails?.driver)} className="rounded border-slate-200 text-blue-600 focus:ring-blue-500" />
                    <span>Transportation Driver & Route Confirmed</span>
                  </label>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="font-bold text-purple-700 border-b border-slate-200 pb-2">2. Production Gear & Crew Check</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-slate-800 cursor-pointer">
                    <input type="checkbox" defaultChecked={project.equipmentReservations?.length > 0} className="rounded border-slate-200 text-purple-600 focus:ring-purple-500" />
                    <span>Reserved Cameras & Lenses Charged ({project.equipmentReservations?.length || 0} items reserved)</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-800 cursor-pointer">
                    <input type="checkbox" defaultChecked={project.assignedTeam?.length > 0} className="rounded border-slate-200 text-purple-600 focus:ring-purple-500" />
                    <span>Crew Members Briefed ({project.assignedTeam?.length || 0} staff assigned)</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-800 cursor-pointer">
                    <input type="checkbox" defaultChecked={Boolean(project.influencerTalent)} className="rounded border-slate-200 text-purple-600 focus:ring-purple-500" />
                    <span>Talent & Call Time Notified ({project.reportingTime || '09:00 AM'})</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Default fallback for other tabs */}
      {/* Mandatory Project Closure Reason Modal */}
      {showClosureModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-rose-200 rounded-xl w-full max-w-md p-5 space-y-4 text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" /> Mandatory Project Closure Reason
              </h3>
              <button type="button" onClick={() => setShowClosureModal(false)} className="text-slate-500 hover:text-slate-900">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-700">
              Media Manager manual closure requires a mandatory reason that becomes a permanent part of the project history.
            </p>

            <form onSubmit={handleConfirmClosure} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Select Reason *</label>
                <select
                  value={closureReasonPreset}
                  onChange={(e) => setClosureReasonPreset(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2 rounded-lg font-semibold focus:border-red-500 focus:outline-none"
                >
                  <option value="Client cancelled remaining deliverables">Client cancelled remaining deliverables</option>
                  <option value="Scope reduced">Scope reduced</option>
                  <option value="Duplicate project">Duplicate project</option>
                  <option value="Production discontinued">Production discontinued</option>
                  <option value="Other">Other (Custom Reason)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {closureReasonPreset === 'Other' ? 'Custom Closure Explanation *' : 'Additional Notes (Optional)'}
                </label>
                <textarea
                  rows={3}
                  required={closureReasonPreset === 'Other'}
                  placeholder={closureReasonPreset === 'Other' ? 'Explain reason for manual project closure...' : 'Add operational details...'}
                  value={customClosureReason}
                  onChange={(e) => setCustomClosureReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2 rounded-lg focus:border-red-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowClosureModal(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:text-slate-900 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg shadow-md shadow-red-600/30"
                >
                  Confirm & Log Permanent Closure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

            {/* ══════════════════════════════════════════════════════
           VIDEO EDITING CONVERSION MODAL
           Media Manager enters Clip Code + Staff for each script, then confirms.
      ══════════════════════════════════════════════════════ */}
      {/* ══════════════════════════════════════════════════════
           VIDEO EDITING CONVERSION MODAL
           Rendered at the top level so it works regardless of which tab is active.
           The Complete Project button in the header opens this modal even from the Overview tab.
      ══════════════════════════════════════════════════════ */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  Complete Project
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assign a Video Editor to every Script below, then complete the Project. Existing Clip Codes are shown read-only.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowConvertModal(false);
                  setConvertStaffByScript({});
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3">
              {scriptDocuments.map((script, idx) => {
                const missing = !convertStaffByScript[script.id];
                const docClips = readFileClipCodes(script.clipCodes);
                return (
                  <div key={script.id} className={`p-4 border rounded-xl space-y-3 ${missing ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Script {idx + 1}</span>
                      <span className="text-sm font-bold text-slate-900">{script.fileName || script.title}</span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Clip Code</label>
                        {docClips.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No clip codes recorded for this script.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {docClips.map((clip, clipIdx) => (
                              <span
                                key={`${clip.code}-${clipIdx}`}
                                className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-semibold"
                              >
                                {clip.code}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Video Editor *</label>
                        <select
                          className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm"
                          value={convertStaffByScript[script.id] || ''}
                          onChange={(e) =>
                            setConvertStaffByScript((prev) => ({ ...prev, [script.id]: e.target.value }))
                          }
                        >
                          <option value="">-- Select Video Editor --</option>
                          {eligibleVideoEditors.map((u: any) => (
                            <option key={u.id} value={u.id}>
                              {u.name}{u.designation ? ` (${u.designation})` : ''}
                            </option>
                          ))}
                        </select>
                        {missing && (
                          <p className="text-xs text-amber-600 font-medium mt-1">A Video Editor is required for this Script.</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                onClick={() => {
                  setShowConvertModal(false);
                  setConvertStaffByScript({});
                }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const scripts = scriptDocuments.map((script) => ({
                    scriptId: script.id,
                    clipCode: readFileClipCodes(script.clipCodes).map((c: any) => c.code).join(', ') || '',
                    staffId: convertStaffByScript[script.id] || '',
                  }));
                  const missing = scripts.filter((s) => !s.staffId);
                  if (missing.length > 0) {
                    alert(`Cannot complete Project:\n${missing.map((_, i) => `Script ${scripts.indexOf(missing[i]) + 1} requires a Video Editor assignment`).join('\n')}`);
                    return;
                  }
                  setIsCompletingProject(true);
                  try {
                    await fetchApi(`/projects/${project.id}/convert-to-video-editing`, {
                      method: 'POST',
                      body: JSON.stringify({ scripts }),
                    });
                    setShowConvertModal(false);
                    setConvertStaffByScript({});
                    loadProject();
                  } catch (e: any) {
                    alert(e.message || 'Failed to complete Project.');
                  } finally {
                    setIsCompletingProject(false);
                  }
                }}
                disabled={isCompletingProject}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow transition-all text-sm"
              >
                {isCompletingProject ? 'Completing...' : 'Complete Project'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Task Conversion Modal Popup */}
      <ConvertEventToTaskModal
        isOpen={showConvertTaskModal}
        onClose={() => setShowConvertTaskModal(false)}
        onSuccess={() => {
          loadProject();
        }}
        eventData={
          project
            ? {
                title: project.name,
                parentType: 'PROJECT',
                parentId: project.id,
                parentCode: project.projectId,
                clientId: project.clientId,
                brandId: project.brandId,
                productId: project.productId,
                priority: project.priority,
                dueDate: project.shootDate,
                notes: project.productionNotes,
              }
            : null
        }
      />
      {/* Script & Screenplay Editor Modal */}
      {showEditScriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-amber-500/10 via-purple-500/5 to-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center font-black">
                  <FileText className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    {editingScript.id && parsedScripts.some((s) => s.id === editingScript.id)
                      ? `Edit Script: ${editingScript.title}`
                      : 'Add New Shooting Script'}
                  </h3>
                  <p className="text-slate-500 text-xs">
                    Create or update script dialogue, hooks, duration, and creative copy for this shoot project.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditScriptModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors text-base"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Row 1: Title & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Script Title / Scene Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingScript.title}
                    onChange={(e) => setEditingScript((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Script #1: Main 15s Hook Reel"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Duration
                  </label>
                  <input
                    type="text"
                    value={editingScript.duration || ''}
                    onChange={(e) => setEditingScript((prev) => ({ ...prev, duration: e.target.value }))}
                    placeholder="e.g., 15s, 30s, 60s"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                </div>
              </div>

              {/* Row 2: Platform & Content Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Platform
                  </label>
                  <select
                    value={editingScript.targetPlatform || ''}
                    onChange={(e) => setEditingScript((prev) => ({ ...prev, targetPlatform: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all bg-white"
                  >
                    <option value="">Select Platform</option>
                    <option value="Instagram Reel">Instagram Reel</option>
                    <option value="Instagram Story">Instagram Story</option>
                    <option value="Instagram Post">Instagram Post</option>
                    <option value="YouTube Shorts">YouTube Shorts</option>
                    <option value="YouTube Longform">YouTube Longform</option>
                    <option value="TikTok">TikTok</option>
                    <option value="Facebook">Facebook</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="TVC / Commercial">TVC / Commercial</option>
                    <option value="Internal / Brand">Internal / Brand</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Content Type / Format
                  </label>
                  <select
                    value={editingScript.contentType || ''}
                    onChange={(e) => setEditingScript((prev) => ({ ...prev, contentType: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all bg-white"
                  >
                    <option value="">Select Format</option>
                    <option value="Reel">Reel / Short Video</option>
                    <option value="Video">Standard Video</option>
                    <option value="Story">Story</option>
                    <option value="Carousel">Carousel Narrative</option>
                    <option value="Voiceover">Voiceover Only</option>
                    <option value="Interview">Interview / Testimonial</option>
                    <option value="Commercial">Brand Commercial</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Opening Hook */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  🎣 Opening Hook / Attention Grabber (First 3 Seconds)
                </label>
                <input
                  type="text"
                  value={editingScript.hook || ''}
                  onChange={(e) => setEditingScript((prev) => ({ ...prev, hook: e.target.value }))}
                  placeholder="e.g., Stop scrolling if you want to double your workout results in 14 days..."
                  className="w-full px-3 py-2 border border-amber-300 bg-amber-50/40 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                />
              </div>

              {/* Row 4: Master Script Dialogue / Screenplay */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Master Screenplay Dialogue &amp; Script Lines <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {(editingScript.scriptText || '').length} characters • {(editingScript.scriptText || '').trim() ? (editingScript.scriptText || '').trim().split(/\s+/).length : 0} words
                  </span>
                </div>
                <textarea
                  rows={9}
                  value={editingScript.scriptText || ''}
                  onChange={(e) => setEditingScript((prev) => ({ ...prev, scriptText: e.target.value }))}
                  placeholder="[SCENE 1 - INT. STUDIO]\nTALENT: (Facing camera with energy) 'Hey guys! Today we are testing...'\n\n[SCENE 2 - B-ROLL]\nVoiceover narration over product closeups..."
                  className="w-full p-3.5 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all leading-relaxed placeholder:font-sans"
                />
              </div>

              {/* Row 5: Directing / Operational Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  📝 Scene &amp; Directing Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={editingScript.notes || ''}
                  onChange={(e) => setEditingScript((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g., Shoot in 4K 60fps for slow-mo montage. Keep lighting high-key."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowEditScriptModal(false)}
                disabled={isSavingScript}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveScriptItem}
                disabled={isSavingScript}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl text-xs shadow-sm transition-all flex items-center gap-1.5"
              >
                {isSavingScript ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
                    Saving Script...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Script
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Revision Form Modal */}
      {showRevisionModal && project && (
        <RequestRevisionModal
          isOpen={showRevisionModal}
          onClose={() => setShowRevisionModal(false)}
          onSuccess={() => {
            loadProject();
          }}
          entityType="PROJECT"
          entityId={project.id}
          entityTitle={project.name}
          originalAssigneeId={project.assignedTeam?.[0]?.userId}
          originalAssigneeName={project.assignedTeam?.[0]?.user?.name}
          userRole={user?.role}
        />
      )}
      </div>
    </div>
  );
}
