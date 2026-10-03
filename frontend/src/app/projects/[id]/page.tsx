'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi, resolveFileUrl } from '@/lib/api';
import { ProjectEquipmentTab } from '@/components/projects/ProjectEquipmentTab';
import { VideoEditingPanel } from '@/components/projects/VideoEditingPanel';
import { useAuth } from '@/lib/auth-context';
import ActivityCommunicationThread from '@/components/communications/ActivityCommunicationThread';
import { useBreadcrumbs } from '@/lib/breadcrumbs-context';
import { FavoriteButton } from '@/components/common/FavoriteButton';
import { recordRecentAccess } from '@/lib/recent-access';
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
  LayoutDashboard,
  Trash2,
} from 'lucide-react';
import {
  ProjectScript,
  extractEventScripts,
  serializeProjectScripts,
} from '@/lib/project-scripts';
import { ScriptDocumentViewerModal } from '@/components/common/ScriptDocumentViewerModal';

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
  const [previewScriptDoc, setPreviewScriptDoc] = useState<any | null>(null);

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
  const [teamFilter, setTeamFilter] = useState<'ALL' | 'ACCEPTED' | 'PENDING'>('ALL');
  const [taskFilter, setTaskFilter] = useState<'ALL' | 'VIDEO_EDITING' | 'GRAPHIC' | 'ACTIVE' | 'COMPLETED'>('ALL');

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
  const [projectScriptsList, setProjectScriptsList] = useState<any[]>([]);
  const [isCompletingProject, setIsCompletingProject] = useState(false);
  const [pendingStatus, setPendingStatus] = useState('CLOSED');
  const [closureReasonPreset, setClosureReasonPreset] = useState('Client cancelled remaining deliverables');
  const [customClosureReason, setCustomClosureReason] = useState('');

  // Script documents — strictly SCRIPT_DOCUMENT files.
  const scriptFiles = (filesTree?.allFiles || project?.files || []).filter((f: any) =>
    (f.attachmentCategory === 'SCRIPT_DOCUMENT' ||
     f.folderCategory === 'Script Documents' ||
     f.storagePath?.includes('Script Documents')) &&
    f.attachmentCategory !== 'REFERENCE_FILE'
  );

  // Attached Reference documents & assets — strictly non-script reference files.
  const referenceFiles = (filesTree?.allFiles || project?.files || []).filter((f: any) =>
    f.attachmentCategory === 'REFERENCE_FILE' ||
    f.folderCategory === 'Reference Documents' ||
    f.folderCategory === 'Creative Assets' ||
    f.folderCategory === 'Attachments' ||
    (f.attachmentCategory !== 'SCRIPT_DOCUMENT' &&
     f.folderCategory !== 'Script Documents' &&
     !f.storagePath?.includes('Script Documents'))
  );

  const [uploadingRefDoc, setUploadingRefDoc] = useState(false);
  const [selectedRefFile, setSelectedRefFile] = useState<File | null>(null);

  // Parse scripts from project notes (JSON serialized by serializeProjectScripts)
  const parsedScripts = useMemo(() => {
    if (!project?.notes) return [];
    try {
      return extractEventScripts(project.notes);
    } catch {
      return [];
    }
  }, [project?.notes]);

  const scriptDocuments = useMemo(() => {
    if (projectScriptsList && projectScriptsList.length > 0) return projectScriptsList;
    if (parsedScripts && parsedScripts.length > 0) return parsedScripts;
    if (scriptFiles && scriptFiles.length > 0) return scriptFiles;
    if (project?.projectScripts && project.projectScripts.length > 0) return project.projectScripts;
    return [];
  }, [projectScriptsList, parsedScripts, scriptFiles, project?.projectScripts]);

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

  /** Parses the clipCodes JSON column returned on a file/script record. */
  const readFileClipCodes = (raw: any): { code: string; description?: string; addedBy?: string; addedAt?: string }[] => {
    if (!raw) return [];
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.filter((c: any) => c && (typeof c === 'string' || c.code)).map((c: any) => typeof c === 'string' ? { code: c.trim() } : c);
      } catch {
        return raw.split(',').map((c: string) => ({ code: c.trim() })).filter((c: any) => c.code);
      }
    }
    if (Array.isArray(raw)) {
      return raw
        .filter((c: any) => c && (typeof c === 'string' || (c.code && typeof c.code === 'string')))
        .map((c: any) => (typeof c === 'string' ? { code: c.trim() } : c));
    }
    return [];
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

      const [treeRes, usersRes, eqpRes, scriptDocsRes] = await Promise.all([
        fetchApi(`/files/project/${id}`).catch(() => null),
        fetchApi('/users').catch(() => []),
        fetchApi('/equipment').catch(() => []),
        fetchApi(`/projects/${id}/script-documents`).catch(() => ({ scripts: [] })),
      ]);
      setFilesTree(treeRes);
      setAllUsers(Array.isArray(usersRes) ? usersRes : []);
      setAllEquipment(Array.isArray(eqpRes) ? eqpRes : []);
      if (scriptDocsRes && Array.isArray(scriptDocsRes.scripts)) {
        setProjectScriptsList(scriptDocsRes.scripts);
      }
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

  const handleUploadRefDoc = async (fileToUpload?: File) => {
    const file = fileToUpload || selectedRefFile;
    if (!file) {
      alert('Please select a file to upload.');
      return;
    }
    setUploadingRefDoc(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', project.id);
      formData.append('folderCategory', 'Reference Documents');
      formData.append('attachmentCategory', 'REFERENCE_FILE');

      const token = localStorage.getItem('moms_token') || localStorage.getItem('token');
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const res = await fetch(`${apiBase}/files/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to upload attached document');
      }

      alert(`Attached Document "${file.name}" uploaded successfully!`);
      setSelectedRefFile(null);
      await loadProject();
    } catch (err: any) {
      alert(err.message || 'Failed to upload attached document');
    } finally {
      setUploadingRefDoc(false);
    }
  };

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return;
    try {
      await fetchApi(`/files/${fileId}`, {
        method: 'DELETE',
      });
      alert(`Deleted "${fileName}" successfully.`);
      await loadProject();
    } catch (err: any) {
      alert(err.message || 'Failed to delete file');
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

  const isShootProjectPlaceholder = (t: any) =>
    (t.taskType === 'PROJECT' && !t.graphicRequirementId && !t.scriptId) ||
    (t.sourceType === 'SHOOT_PROJECT' && !t.scriptId && !t.graphicRequirementId && (
      t.title?.toLowerCase() === project?.name?.toLowerCase() ||
      t.title?.toLowerCase().includes('shoot session') ||
      t.title?.toLowerCase().includes('project shoot')
    ));

  const realProjectTasks = (project.tasks || []).filter((t: any) => !isShootProjectPlaceholder(t));

  const tabs = [
    { name: 'Overview', icon: LayoutDashboard },
    { name: 'Scripts', icon: FileText, count: scriptFiles.length },
    { name: 'Attached Documents', icon: UploadCloud, count: referenceFiles.length },
    { name: 'Graphic Requirements', icon: Palette, count: project.graphicRequirements?.length || 0 },
    { name: 'Tasks', icon: CheckSquare, count: realProjectTasks.length },
    { name: 'Team', icon: Users, count: project.assignedTeam?.length || 0 },
    { name: 'Equipment', icon: Camera, count: project.equipmentReservations?.length || 0 },
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
    <div className="space-y-4">
      {/* Compact Navigation */}
      <div className="flex items-center justify-between gap-3 text-xs">
        <button
          onClick={() => router.push('/projects')}
          className="inline-flex items-center gap-1.5 font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Projects
        </button>
      </div>

      {/* Pending Task Acceptance Alert Banner */}
      {userPendingTask && (
        <div className="bg-amber-50/90 border border-amber-200 p-3 rounded-xl text-xs flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="text-amber-950 font-bold">Task Assignment Acceptance Required: </span>
              <span className="text-amber-900 text-[11px]">
                You are assigned to task <strong>{userPendingTask.taskId} ({userPendingTask.title})</strong>. Please accept the task to begin work.
              </span>
            </div>
          </div>
          <Link
            href={`/tasks?taskId=${userPendingTask.id}`}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors text-xs flex items-center gap-1 shrink-0"
          >
            <Check className="w-3.5 h-3.5" /> Accept Task
          </Link>
        </div>
      )}

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
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors shadow-xs"
            >
              Approve Project Now
            </button>
          )}
        </div>
      )}


      {/* Compact Professional Project Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3.5 shadow-xs">
        {/* Row 1: Header Badges, Title & Primary Action */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <FavoriteButton
                entityType="PROJECT"
                entityId={project.id}
                title={project.name}
                code={project.projectId}
                url={`/projects/${project.id}`}
                metadata={{ client: project.client?.name, brand: project.brand?.name, status: project.status }}
                size="sm"
              />
              <span className="font-mono text-[11px] font-bold text-blue-700 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-md">
                {project.projectId}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border ${
                  isIndoor
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {project.shootType} SHOOT
              </span>
              {/* Compact Status Badge */}
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase border font-mono tracking-wide ${
                  project.status === 'COMPLETED'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : project.status === 'CONVERTED_TO_VIDEO_EDITING' || (project.videoEditingConverted && project.status !== 'COMPLETED')
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : project.status === 'IN_PROGRESS'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : project.status === 'WAITING_FOR_TECHNICAL_REVIEW'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : project.status === 'WAITING_FOR_MEDIA_REVIEW'
                    ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                    : project.status === 'WAITING_FOR_MARKETING_APPROVAL'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : project.status === 'WAITING_FOR_CLIENT_CONFIRMATION'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {project.status === 'COMPLETED'
                  ? '✓ COMPLETED · READ ONLY'
                  : project.status === 'CONVERTED_TO_VIDEO_EDITING' || (project.videoEditingConverted && project.status !== 'COMPLETED')
                  ? 'CONVERTED TO VIDEO EDITING'
                  : project.status.replace(/_/g, ' ')}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug tracking-tight">{project.name}</h1>
          </div>

          {/* Right Action Buttons / Badges */}
          <div className="flex items-center gap-2 shrink-0">
            {user?.role === 'MEDIA_MANAGER' && !project.videoEditingConverted && !['CANCELLED', 'ARCHIVED', 'CLOSED', 'COMPLETED'].includes(project.status) && (
              <button
                onClick={async () => {
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

                  try {
                    const [candidates, scriptDocsRes]: any = await Promise.all([
                      fetchApi(`/projects/${project.id}/video-editor-candidates`).catch(() => ({ candidates: [] })),
                      fetchApi(`/projects/${project.id}/script-documents`).catch(() => ({ scripts: [] })),
                    ]);
                    const candidateList =
                      Array.isArray(candidates?.candidates) && candidates.candidates.length > 0
                        ? candidates.candidates
                        : Array.isArray(allUsers) && allUsers.length > 0
                        ? allUsers.filter((u: any) => u.status === 'ACTIVE' || !u.status)
                        : [];
                    setEligibleVideoEditors(candidateList);
                    if (scriptDocsRes && Array.isArray(scriptDocsRes.scripts) && scriptDocsRes.scripts.length > 0) {
                      setProjectScriptsList(scriptDocsRes.scripts);
                    }
                  } catch {
                    const fallback = Array.isArray(allUsers) ? allUsers.filter((u: any) => u.status === 'ACTIVE' || !u.status) : [];
                    setEligibleVideoEditors(fallback);
                  }

                  setShowConvertModal(true);
                }}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-xs transition-all flex items-center gap-1.5 text-xs"
              >
                <Scissors className="w-3.5 h-3.5" /> Convert to Video Editing
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2.5 border-t border-slate-100 text-xs">
          <div className="p-2 rounded-lg bg-slate-50/80 border border-slate-100">
            <span className="text-slate-400 block text-[10px] font-medium uppercase tracking-wider">Client</span>
            <span className="text-slate-800 font-semibold truncate block">{project.client?.name || 'N/A'}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-50/80 border border-slate-100">
            <span className="text-slate-400 block text-[10px] font-medium uppercase tracking-wider">Brand</span>
            <span className="text-purple-700 font-semibold truncate block">{project.brand?.name || 'N/A'}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-50/80 border border-slate-100">
            <span className="text-slate-400 block text-[10px] font-medium uppercase tracking-wider">Product</span>
            <span className="text-emerald-700 font-semibold truncate block">{project.product?.name || 'General Shoot'}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-50/80 border border-slate-100">
            <span className="text-slate-400 block text-[10px] font-medium uppercase tracking-wider">Shoot Date</span>
            <span className="text-slate-900 font-semibold truncate block">{new Date(project.shootDate).toLocaleDateString()}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-50/80 border border-slate-100">
            <span className="text-slate-400 block text-[10px] font-medium uppercase tracking-wider">Location</span>
            <span className="text-slate-800 font-semibold truncate block">{project.shootLocation}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-50/80 border border-slate-100">
            <span className="text-slate-400 block text-[10px] font-medium uppercase tracking-wider">Priority</span>
            <span className={`font-bold text-[10px] uppercase px-1.5 py-0.2 rounded inline-block ${
              project.priority === 'CRITICAL' ? 'bg-rose-100 text-rose-800' :
              project.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' :
              project.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-800' :
              'bg-slate-100 text-slate-800'
            }`}>{project.priority}</span>
          </div>
        </div>

        {/* Row 3: Inline Thin Progress Bar */}
        <div className="space-y-1 pt-2 border-t border-slate-100">
          <div className="flex justify-between text-xs text-slate-600 font-medium">
            <span>Production Progress: <strong className="text-slate-900">{project.progressPercentage}%</strong></span>
            <span className="text-slate-500 font-mono text-[11px]">
              {realProjectTasks.filter((t: any) => t.status === 'COMPLETED').length} / {realProjectTasks.length} tasks completed
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${project.progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Horizontal Tab Navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-1 text-xs">
        {tabs.map((t) => {
          const tabName = t.name;
          const TabIcon = t.icon;
          const countBadge = t.count;
          const isActive = activeTab === tabName;

          return (
            <button
              key={tabName}
              onClick={() => setActiveTab(tabName)}
              className={`px-3.5 py-2 font-medium border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
                isActive
                  ? 'border-blue-600 text-blue-600 font-bold bg-blue-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <TabIcon className="w-3.5 h-3.5 shrink-0" />
              <span>{tabName}</span>
              {countBadge !== null && countBadge !== undefined && countBadge > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {countBadge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Display */}
      <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-xl min-h-[350px] shadow-xs">
        {activeTab === 'Overview' && (
          <div className="space-y-4 text-xs">
            {/* Core Project Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Project Identity & Client Info */}
              <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/80 space-y-3">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                  <Film className="w-3.5 h-3.5 text-blue-600" /> Project Identity &amp; Client Info
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div className="p-2 bg-white border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Project ID</span>
                    <span className="font-mono text-blue-700 font-bold text-xs">{project.projectId}</span>
                  </div>
                  <div className="p-2 bg-white border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Client</span>
                    <span className="text-slate-900 font-semibold text-xs truncate block">{project.client?.name || 'N/A'}</span>
                  </div>
                  <div className="p-2 bg-white border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Brand</span>
                    <span className="text-purple-700 font-semibold text-xs truncate block">{project.brand?.name || 'N/A'}</span>
                  </div>
                  <div className="p-2 bg-white border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Product</span>
                    <span className="text-emerald-700 font-semibold text-xs truncate block">{project.product?.name || 'General Shoot'}</span>
                  </div>
                  <div className="p-2 bg-white border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Campaign</span>
                    <span className="text-slate-800 font-medium text-xs truncate block">{project.campaign?.name || project.campaignId || 'None'}</span>
                  </div>
                  <div className="p-2 bg-white border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Target Date</span>
                    <span className="text-slate-800 font-medium text-xs">
                      {project.estimatedCompletionDate ? new Date(project.estimatedCompletionDate).toLocaleDateString() : 'Not Specified'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Schedule, Status & Logistics */}
              <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/80 space-y-3">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Schedule, Status &amp; Location
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div className="p-2 bg-white border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Shoot Date</span>
                    <span className="text-slate-900 font-bold text-xs">{new Date(project.shootDate).toLocaleDateString()}</span>
                  </div>
                  <div className="p-2 bg-white border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Location</span>
                    <span className="text-slate-900 font-semibold text-xs truncate block">{project.shootLocation}</span>
                  </div>
                  <div className="p-2 bg-white border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Timings</span>
                    <span className="text-slate-800 font-medium text-xs">{project.reportingTime || '09:00 AM'} - {project.expectedWrapUpTime || '06:00 PM'}</span>
                  </div>
                  <div className="p-2 bg-white border border-slate-200 rounded-lg sm:col-span-2">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Address &amp; Category</span>
                    <span className="text-slate-800 font-medium text-xs truncate block">{project.locationAddress || project.shootLocation} ({project.locationCategory || 'Studio Bay'})</span>
                  </div>
                  <div className="p-2 bg-white border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Talent</span>
                    <span className="text-slate-800 font-medium text-xs truncate block">{project.influencerTalent || 'None'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scope Summary Row (Scripts, Reference Docs & Graphics) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3.5 bg-slate-50/60 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-purple-600" />
                    Attached Scripts ({scriptFiles.length})
                  </span>
                  <button
                    onClick={() => setActiveTab('Scripts')}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5"
                  >
                    View All <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                {scriptFiles.length === 0 ? (
                  <p className="text-slate-400 italic text-[11px] py-1">No script documents attached yet.</p>
                ) : (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {scriptFiles.slice(0, 3).map((sf: any) => (
                      <div key={sf.id} className="p-1.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-[11px]">
                        <span className="truncate font-medium text-slate-800 max-w-[200px]">{sf.fileName}</span>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {sf.fileSize ? `${(sf.fileSize / 1024 / 1024).toFixed(1)}MB` : 'Doc'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3.5 bg-slate-50/60 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <UploadCloud className="w-3.5 h-3.5 text-indigo-600" />
                    Attached Documents ({referenceFiles.length})
                  </span>
                  <button
                    onClick={() => setActiveTab('Attached Documents')}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5"
                  >
                    View All <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                {referenceFiles.length === 0 ? (
                  <p className="text-slate-400 italic text-[11px] py-1">No reference documents attached yet.</p>
                ) : (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {referenceFiles.slice(0, 3).map((rf: any) => (
                      <div key={rf.id} className="p-1.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-[11px]">
                        <span className="truncate font-medium text-slate-800 max-w-[200px]">{rf.fileName}</span>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {rf.fileSize ? `${(rf.fileSize / 1024 / 1024).toFixed(1)}MB` : 'Doc'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3.5 bg-slate-50/60 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-blue-600" />
                    Graphic Requirements ({project.graphicRequirements?.length || 0})
                  </span>
                  <button
                    onClick={() => setActiveTab('Graphic Requirements')}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5"
                  >
                    View All <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                {(!project.graphicRequirements || project.graphicRequirements.length === 0) ? (
                  <p className="text-slate-400 italic text-[11px] py-1">No graphic requirements linked yet.</p>
                ) : (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {project.graphicRequirements.slice(0, 3).map((gr: any) => (
                      <div key={gr.id} className="p-1.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-[11px]">
                        <span className="truncate font-medium text-slate-800 max-w-[200px]">[{gr.requirementId}] {gr.name}</span>
                        <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">{gr.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actual Completion Statistics Widget */}
            <div className="p-3.5 bg-slate-50/60 border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                  <ClipboardList className="w-3.5 h-3.5 text-blue-600" /> Completion Statistics &amp; Metrics
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <div className="text-slate-400 font-medium text-[10px] uppercase tracking-wider mb-0.5">Scripts</div>
                  <div className="font-bold text-slate-900 text-xs font-mono">{project.completionStatistics?.scripts?.text || `${scriptFiles.length} Attached`}</div>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <div className="text-slate-400 font-medium text-[10px] uppercase tracking-wider mb-0.5">Graphics</div>
                  <div className="font-bold text-slate-900 text-xs font-mono">{project.completionStatistics?.graphics?.text || `${project.graphicRequirements?.length || 0} Items`}</div>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <div className="text-slate-400 font-medium text-[10px] uppercase tracking-wider mb-0.5">Tasks</div>
                  <div className="font-bold text-slate-900 text-xs font-mono">{project.completionStatistics?.tasks?.text || `${project.tasks?.length || 0} Tasks`}</div>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <div className="text-slate-400 font-medium text-[10px] uppercase tracking-wider mb-0.5">Team &amp; Gear</div>
                  <div className="font-bold text-slate-900 text-xs font-mono">{project.assignedTeam?.length || 0} Crew • {project.equipmentReservations?.length || 0} Gear</div>
                </div>
              </div>
            </div>

            {/* Official 4-Point Criteria */}
            <div className="p-3.5 bg-slate-50/60 border border-slate-200 rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600" /> Completion Criteria (4 Points)
                </h3>
                <span className={`px-2 py-0.2 rounded-md text-[10px] font-bold uppercase border ${
                  project.completionChecklist?.isReadyForCompletion
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  {project.completionChecklist?.isReadyForCompletion ? 'Ready for Completion' : `${project.completionChecklist?.pendingCount || 0} Pending`}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className={`p-2 rounded-lg border flex items-center justify-between text-xs ${
                  project.completionChecklist?.allTasksCompleted ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800' : 'bg-white border-slate-200 text-slate-500'
                }`}>
                  <div>
                    <div className="font-bold text-[11px]">1. Tasks</div>
                    <div className="text-[10px] opacity-70">All completed</div>
                  </div>
                  {project.completionChecklist?.allTasksCompleted ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <span className="text-[10px] text-amber-600 font-mono">Pending</span>}
                </div>

                <div className={`p-2 rounded-lg border flex items-center justify-between text-xs ${
                  project.completionChecklist?.techReviewApproved ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800' : 'bg-white border-slate-200 text-slate-500'
                }`}>
                  <div>
                    <div className="font-bold text-[11px]">2. Tech Review</div>
                    <div className="text-[10px] opacity-70">Approved</div>
                  </div>
                  {project.completionChecklist?.techReviewApproved ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <span className="text-[10px] text-amber-600 font-mono">Pending</span>}
                </div>

                <div className={`p-2 rounded-lg border flex items-center justify-between text-xs ${
                  project.completionChecklist?.mediaReviewApproved ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800' : 'bg-white border-slate-200 text-slate-500'
                }`}>
                  <div>
                    <div className="font-bold text-[11px]">3. Media Review</div>
                    <div className="text-[10px] opacity-70">Approved</div>
                  </div>
                  {project.completionChecklist?.mediaReviewApproved ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <span className="text-[10px] text-amber-600 font-mono">Pending</span>}
                </div>

                <div className={`p-2 rounded-lg border flex items-center justify-between text-xs ${
                  project.completionChecklist?.clientConfirmationRecorded ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800' : 'bg-white border-slate-200 text-slate-500'
                }`}>
                  <div>
                    <div className="font-bold text-[11px]">4. Client Sign-off</div>
                    <div className="text-[10px] opacity-70">Confirmed</div>
                  </div>
                  {project.completionChecklist?.clientConfirmationRecorded ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <span className="text-[10px] text-amber-600 font-mono">Pending</span>}
                </div>
              </div>
            </div>

            {/* Operational Shoot Details (Indoor / Outdoor) */}
            {isIndoor ? (
              <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">Indoor Studio Details</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700">
                  <div className="p-2 bg-white rounded-lg border border-slate-200"><span className="text-slate-400 block text-[10px]">Studio Name:</span> <strong className="text-slate-800">{project.indoorDetails?.studioName || 'Main Studio'}</strong></div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200"><span className="text-slate-400 block text-[10px]">Address:</span> <strong className="text-slate-800 truncate block">{project.indoorDetails?.studioAddress || 'Floor 1'}</strong></div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200"><span className="text-slate-400 block text-[10px]">Booking Status:</span> <strong className="text-slate-800">{project.indoorDetails?.studioBookingStatus || 'Confirmed'}</strong></div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200"><span className="text-slate-400 block text-[10px]">Booking Ref:</span> <strong className="text-slate-800 font-mono">{project.indoorDetails?.studioBookingRef || 'N/A'}</strong></div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">Outdoor Shoot Details</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-700">
                  <div className="p-2 bg-white rounded-lg border border-slate-200"><span className="text-slate-400 block text-[10px]">Location:</span> <strong className="text-slate-800">{outdoor?.outdoorLocation || project.shootLocation}</strong></div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200"><span className="text-slate-400 block text-[10px]">Permission:</span> <strong className="text-slate-800">{outdoor?.permissionStatus || 'Granted'}</strong></div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200"><span className="text-slate-400 block text-[10px]">Weather:</span> <strong className="text-slate-800">{outdoor?.weatherStatus || 'Clear'}</strong></div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200"><span className="text-slate-400 block text-[10px]">Driver:</span> <strong className="text-slate-800">{outdoor?.driver || 'None'}</strong></div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200"><span className="text-slate-400 block text-[10px]">Coordinator:</span> <strong className="text-slate-800">{outdoor?.logisticsCoordinator || 'N/A'}</strong></div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200"><span className="text-slate-400 block text-[10px]">Travel Notes:</span> <strong className="text-slate-800 truncate block">{outdoor?.travelNotes || 'N/A'}</strong></div>
                </div>
              </div>
            )}

            {/* Notes Section */}
            {project.notes && (
              <div className="p-3 bg-slate-50/60 border border-slate-200 rounded-xl space-y-1">
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" /> Project Remarks &amp; Notes
                </h4>
                <p className="text-slate-700 text-xs bg-white p-2.5 rounded-lg border border-slate-200">
                  {project.notes}
                </p>
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

                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewScriptDoc(sf)}
                          className="flex-1 py-1.5 px-2.5 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg font-bold text-[11px] text-center flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-purple-600" />
                          <span>View Script</span>
                        </button>
                        <a
                          href={resolveFileUrl(sf.storagePath || sf.fileUrl)}
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

        {/* Tab: Attached Documents & Reference Files */}
        {activeTab === 'Attached Documents' && (
          <div className="space-y-6 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-indigo-600" /> Attached Reference Documents &amp; Project Assets ({referenceFiles.length})
                </h3>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  General project briefs, brand visual guidelines, reference imagery, moodboards, and attachments.
                </p>
              </div>

              {/* Upload Action */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <label className={`px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-all shadow-xs ${uploadingRefDoc ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Plus className="w-3.5 h-3.5" />
                  <span>{uploadingRefDoc ? 'Uploading...' : '+ Upload Document'}</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadRefDoc(file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Reference Documents List / Grid */}
            {referenceFiles.length === 0 ? (
              <div className="p-8 bg-slate-50/60 border border-dashed border-slate-300 rounded-2xl text-center space-y-2">
                <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="font-bold text-slate-700 text-sm">No Attached Documents Yet</h4>
                <p className="text-slate-500 text-xs max-w-md mx-auto">
                  No reference files, PDFs, images, or documents attached to this shoot project yet. Click <strong>"+ Upload Document"</strong> above to attach files.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {referenceFiles.map((rf: any) => {
                  const ext = rf.fileName?.split('.').pop()?.toUpperCase() || 'FILE';
                  const fileUrl = rf.storagePath?.startsWith('http')
                    ? rf.storagePath
                    : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/${rf.storagePath?.replace(/^\/?/, '')}`;

                  return (
                    <div
                      key={rf.id}
                      className="p-4 bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl space-y-3.5 flex flex-col justify-between shadow-xs transition-all group"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase flex items-center gap-1 border bg-indigo-50 text-indigo-700 border-indigo-200">
                            <UploadCloud className="w-3 h-3" />
                            {ext} DOCUMENT
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {rf.fileSize ? `${(rf.fileSize / 1024 / 1024).toFixed(2)} MB` : 'Doc'}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-slate-900 text-xs leading-snug break-words group-hover:text-indigo-700 transition-colors">
                            {rf.fileName}
                          </h4>
                          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-2">
                            <span>Uploaded {rf.createdAt ? new Date(rf.createdAt).toLocaleDateString() : 'Recently'}</span>
                            {rf.uploadedBy?.name && (
                              <span>• By {rf.uploadedBy.name}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-1.5 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-lg font-bold text-[11px] text-center flex items-center justify-center gap-1 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-600" />
                          <span>View File</span>
                        </a>
                        <a
                          href={fileUrl}
                          download={rf.fileName}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors"
                          title="Download File"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        {user?.role !== 'STAFF' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteFile(rf.id, rf.fileName)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs transition-colors"
                            title="Delete attached file"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          </button>
                        )}
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
          const allTasks: any[] = realProjectTasks;

          const videoEditingTasks = allTasks.filter(
            (t: any) => t.taskType === 'VIDEO_EDITING' || t.sourceType === 'SCRIPT' || t.scriptId
          );
          const graphicTasks = allTasks.filter(
            (t: any) => t.graphicRequirementId || t.sourceType === 'GRAPHIC_REQUIREMENT' || t.taskType === 'GRAPHIC_REQUIREMENT'
          );

          const activeTasks = allTasks.filter((t: any) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
          const completedTasks = allTasks.filter((t: any) => t.status === 'COMPLETED');

          const filteredTasks = allTasks.filter((t: any) => {
            if (taskFilter === 'VIDEO_EDITING') {
              return t.taskType === 'VIDEO_EDITING' || t.sourceType === 'SCRIPT' || t.scriptId;
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
                    <CheckSquare className="w-4 h-4 text-blue-600" /> Project Tasks &amp; Production Execution ({allTasks.length})
                  </h3>
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
                  onClick={() => setTaskFilter('VIDEO_EDITING')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    taskFilter === 'VIDEO_EDITING'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                  }`}
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Video Editing</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-200/40">{videoEditingTasks.length}</span>
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
                    const isVideoEditingTask = Boolean(t.taskType === 'VIDEO_EDITING' || t.scriptId || t.sourceType === 'SCRIPT');
                    const isGraphicTask = Boolean(t.graphicRequirementId || t.sourceType === 'GRAPHIC_REQUIREMENT' || t.taskType === 'GRAPHIC_REQUIREMENT');

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
                        className="bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div className="space-y-3.5">
                          {/* Top Badges */}
                          <div className="flex items-center justify-between gap-2.5 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-blue-700 font-extrabold bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md text-xs">
                                {t.taskId}
                              </span>

                              {/* Type Badge */}
                              {isVideoEditingTask ? (
                                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1.5">
                                  <Scissors className="w-3.5 h-3.5 text-purple-600" /> Video Editing
                                </span>
                              ) : isGraphicTask ? (
                                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-pink-100 text-pink-800 border border-pink-300 flex items-center gap-1.5">
                                  <Palette className="w-3.5 h-3.5 text-pink-600" /> Graphic Creative
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1.5">
                                  <CheckSquare className="w-3.5 h-3.5 text-blue-600" /> Production Task
                                </span>
                              )}

                              {/* Priority */}
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
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
                              className={`px-3 py-1 rounded-full text-xs font-bold uppercase font-mono border ${
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
                          <h4 className="font-bold text-slate-900 text-base leading-snug tracking-tight">{t.title}</h4>

                          {/* Description */}
                          {t.description && (
                            <p className="text-slate-600 text-xs leading-relaxed bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                              {t.description}
                            </p>
                          )}

                          {/* Due Date & Hours */}
                          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                            <span className="flex items-center gap-1.5 font-medium">
                              <Calendar className="w-4 h-4 text-slate-400" /> Due Date: <strong className="text-slate-800 ml-0.5">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'Not Set'}</strong>
                            </span>
                            <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs font-semibold">
                              Est: {t.estimatedHours || 2} hrs
                            </span>
                          </div>

                          {/* Assigned Employees */}
                          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Crew:</span>
                            <div className="flex items-center gap-2 flex-wrap">
                              {assignedStaff.length === 0 ? (
                                <span className="text-xs text-slate-400 italic">No crew assigned</span>
                              ) : (
                                assignedStaff.map((ae: any) => (
                                  <span
                                    key={ae.id || ae.userId}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                                      ae.acceptanceStatus === 'ACCEPTED'
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        : 'bg-amber-50 text-amber-800 border-amber-200'
                                    }`}
                                  >
                                    <span className="w-2 h-2 rounded-full bg-current" />
                                    <span>{ae.user?.name || 'Staff'}</span>
                                    {ae.acceptanceStatus === 'ACCEPTED' && <Check className="w-3.5 h-3.5 text-emerald-600 ml-0.5" />}
                                  </span>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-1.5 pt-1.5">
                            <div className="flex justify-between text-xs text-slate-600 font-bold">
                              <span>Task Completion</span>
                              <span className="font-mono">{t.completionPercentage || 0}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                                style={{ width: `${t.completionPercentage || 0}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Action Footer */}
                        <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
                          <Link
                            href={`/tasks?taskId=${t.id}`}
                            className="text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center gap-1.5 transition-colors"
                          >
                            Inspect Task Details <ArrowRight className="w-3.5 h-3.5" />
                          </Link>

                          {isUserPendingAcceptance && (
                            <Link
                              href={`/tasks?taskId=${t.id}`}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" /> Accept Task
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
            <div className="space-y-4 text-xs">
              {/* Compact Section Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">TEAM</h3>
                </div>

                {['PENDING_MARKETING_APPROVAL', 'PLANNED', 'PENDING_CLIENT_APPROVAL'].includes(project.status) ? (
                  <span className="text-amber-800 text-xs font-semibold">
                    Waiting for Marketing Approval — Staff assignment locked.
                  </span>
                ) : (user?.role === 'MEDIA_MANAGER' || (user?.role as string) === 'ADMIN') ? (
                  <button
                    onClick={() => setShowManageTeamModal(!showManageTeamModal)}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors flex items-center gap-1.5 text-xs shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> Manage Staff
                  </button>
                ) : null}
              </div>

              {/* Quick Manage Team Panel */}
              {showManageTeamModal && (
                <div className="p-3 bg-slate-50 border border-blue-200 rounded-xl space-y-2.5">
                  <h4 className="font-bold text-blue-700 text-xs">Click staff members to assign or remove from this project:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {allUsers.map((u) => {
                      const isAssigned = project.assignedTeam?.some((t: any) => t.userId === u.id);
                      return (
                        <button
                          key={u.id}
                          onClick={() => handleToggleTeamUser(u.id)}
                          className={`flex items-center justify-between p-2 rounded-lg border text-left transition-all ${
                            isAssigned
                              ? 'bg-blue-50 border-blue-400 text-blue-800 font-semibold'
                              : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
                              isAssigned ? 'bg-blue-600' : 'bg-slate-300'
                            }`}>
                              {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="truncate">
                              <div className="text-xs text-slate-800 truncate">{u.name}</div>
                              <div className="text-[10px] text-slate-400 truncate">{u.employeeProfile?.designation || u.role}</div>
                            </div>
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
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

              {/* Compact Metrics Strip */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setTeamFilter('ALL')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    teamFilter === 'ALL'
                      ? 'bg-blue-50/80 border-blue-400 ring-1 ring-blue-400'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block">Assigned Staff</span>
                  <span className="text-base font-bold text-slate-900">{totalAssignedStaffCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTeamFilter('ACCEPTED')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    teamFilter === 'ACCEPTED'
                      ? 'bg-emerald-50/80 border-emerald-400 ring-1 ring-emerald-400'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-[10px] font-medium text-emerald-700 uppercase tracking-wider block">Accepted</span>
                  <span className="text-base font-bold text-emerald-700">{acceptedStaffCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTeamFilter('PENDING')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    teamFilter === 'PENDING'
                      ? 'bg-amber-50/80 border-amber-400 ring-1 ring-amber-400'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-[10px] font-medium text-amber-800 uppercase tracking-wider block">Pending</span>
                  <span className="text-base font-bold text-amber-700">{pendingStaffCount}</span>
                </button>
              </div>

              {/* Assigned Project Staff List */}
              <div className="space-y-2">
                {filteredStaffList.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50/50 border border-slate-200 rounded-xl text-slate-500 space-y-1">
                    <Users className="w-6 h-6 text-slate-400 mx-auto" />
                    <p className="font-semibold text-slate-700 text-xs">
                      {totalAssignedStaffCount === 0
                        ? 'No staff members currently assigned to this project.'
                        : `No staff matching the "${teamFilter}" filter.`}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredStaffList.map((staffItem: any) => {
                      const teamUser = staffItem.user;
                      const profile = teamUser?.employeeProfile;
                      const isAcc = staffItem.isAccepted;

                      return (
                        <div
                          key={teamUser.id}
                          className={`p-3 bg-white border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                            isAcc ? 'border-slate-200 hover:border-emerald-300' : 'border-amber-200 hover:border-amber-300'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                isAcc
                                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                                  : 'bg-amber-50 border border-amber-200 text-amber-700'
                              }`}
                            >
                              {teamUser?.name ? teamUser.name.charAt(0).toUpperCase() : 'S'}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-slate-900 text-xs truncate">{teamUser?.name}</span>
                                <span
                                  className={`px-2 py-0.2 rounded text-[10px] font-medium border ${
                                    isAcc
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-amber-50 text-amber-800 border-amber-200'
                                  }`}
                                >
                                  {isAcc ? '✓ Accepted' : '⏳ Pending'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 truncate">
                                {profile?.designation || teamUser?.role || 'Staff Member'}
                                {profile?.department?.name ? ` · ${profile.department.name}` : ''}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 sm:justify-end shrink-0 text-[11px] text-slate-500">
                            {staffItem.tasks?.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap">
                                {staffItem.tasks.map((tsk: any) => (
                                  <span
                                    key={tsk.id}
                                    className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-mono text-slate-700"
                                    title={tsk.title}
                                  >
                                    [{tsk.taskId}]
                                  </span>
                                ))}
                              </div>
                            )}
                            <span className="text-[10px] text-slate-400 font-mono">
                              {staffItem.assignedAt ? new Date(staffItem.assignedAt).toLocaleDateString() : 'Assigned'}
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
      </div>

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
                  <Scissors className="w-5 h-5 text-blue-600" />
                  Convert to Video Editing
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assign a Video Editor to every Script below, then convert the Project to Video Editing. Existing Clip Codes are shown read-only.
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
              {scriptDocuments.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Main Video Edit</span>
                    <span className="text-sm font-bold text-slate-900">{project.name || 'Shoot Project'} - Main Cut</span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Assign Video Editor *</label>
                    <select
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm"
                      value={convertStaffByScript['default'] || ''}
                      onChange={(e) =>
                        setConvertStaffByScript((prev) => ({ ...prev, default: e.target.value }))
                      }
                    >
                      <option value="">-- Select Video Editor --</option>
                      {eligibleVideoEditors.map((u: any) => (
                        <option key={u.id} value={u.id}>
                          {u.name}{u.designation ? ` (${u.designation})` : ''}
                        </option>
                      ))}
                    </select>
                    {!convertStaffByScript['default'] && (
                      <p className="text-xs text-amber-600 font-medium mt-1">A Video Editor is required to complete and convert this project.</p>
                    )}
                  </div>
                </div>
              ) : (
                scriptDocuments.map((script, idx) => {
                  const missing = !convertStaffByScript[script.id];
                  const docClips = readFileClipCodes(script.clipCodes || (script.clipCode ? [{ code: script.clipCode }] : []));
                  return (
                    <div key={script.id || `script-${idx}`} className={`p-4 border rounded-xl space-y-3 ${missing ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Script {idx + 1}</span>
                        <span className="text-sm font-bold text-slate-900">{script.fileName || script.title || script.name || `Script ${idx + 1}`}</span>
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
                })
              )}
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
                  let payload: any = {};
                  if (scriptDocuments.length === 0) {
                    const defaultStaffId = convertStaffByScript['default'];
                    if (!defaultStaffId) {
                      alert('Please select a Video Editor to complete the project.');
                      return;
                    }
                    payload = { staffId: defaultStaffId };
                  } else {
                    const scripts = scriptDocuments.map((script) => ({
                      scriptId: script.id,
                      clipCode: (script.clipCode || readFileClipCodes(script.clipCodes).map((c: any) => c.code).join(', ') || '').trim(),
                      staffId: convertStaffByScript[script.id] || '',
                    }));
                    const missing = scripts.filter((s) => !s.staffId);
                    if (missing.length > 0) {
                      alert(`Cannot complete Project:\n${missing.map((m) => `Script "${scriptDocuments.find((s) => s.id === m.scriptId)?.title || scriptDocuments.find((s) => s.id === m.scriptId)?.name || 'Untitled'}" requires a Video Editor assignment`).join('\n')}`);
                      return;
                    }
                    payload = { scripts };
                  }

                  setIsCompletingProject(true);
                  try {
                    await fetchApi(`/projects/${project.id}/convert-to-video-editing`, {
                      method: 'POST',
                      body: JSON.stringify(payload),
                    });
                    setShowConvertModal(false);
                    setConvertStaffByScript({});
                    await loadProject();
                    alert('Project completed and converted to Video Editing successfully!');
                  } catch (e: any) {
                    alert(e.message || 'Failed to complete Project.');
                  } finally {
                    setIsCompletingProject(false);
                  }
                }}
                disabled={isCompletingProject}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow transition-all text-sm flex items-center gap-1.5"
              >
                <Scissors className="w-4 h-4" />
                {isCompletingProject ? 'Converting...' : 'Convert to Video Editing'}
              </button>
            </div>
          </div>
        </div>
      )}


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

      {/* In-app Script Document Viewer Modal */}
      <ScriptDocumentViewerModal
        doc={previewScriptDoc}
        onClose={() => setPreviewScriptDoc(null)}
      />
    </div>
  );
}
