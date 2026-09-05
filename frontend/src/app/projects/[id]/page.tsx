'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import ConvertEventToTaskModal from '@/components/tasks/ConvertEventToTaskModal';
import { ProjectEquipmentTab } from '@/components/projects/ProjectEquipmentTab';
import { useAuth } from '@/lib/auth-context';
import ActivityCommunicationThread from '@/components/communications/ActivityCommunicationThread';
import { useBreadcrumbs } from '@/lib/breadcrumbs-context';
import { FavoriteButton } from '@/components/common/FavoriteButton';
import { recordRecentAccess } from '@/lib/recent-access';
import RevisionsTab from '@/components/revisions/RevisionsTab';
import RequestRevisionModal from '@/components/revisions/RequestRevisionModal';
import {
  Film,
  FileText,
  Palette,
  CheckSquare,
  Users,
  Camera,
  Upload,
  CheckCircle2,
  FolderTree,
  MessageSquare,
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
} from 'lucide-react';

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
  const [selectedScriptRecord, setSelectedScriptRecord] = useState<any>(null);

  // Interactive Form States
  const [commentText, setCommentText] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [newScriptTitle, setNewScriptTitle] = useState('');
  const [newScriptLanguage, setNewScriptLanguage] = useState('Malayalam (KL)');
  const [newScriptCategory, setNewScriptCategory] = useState('Advertisement');
  const [newScriptObjective, setNewScriptObjective] = useState('Generate Sales');
  const [newScriptDescription, setNewScriptDescription] = useState('');
  const [newScriptDuration, setNewScriptDuration] = useState('30s');
  const [newScriptPriority, setNewScriptPriority] = useState('MEDIUM');
  const [newScriptRemarks, setNewScriptRemarks] = useState('');
  const [newGraphicTitle, setNewGraphicTitle] = useState('');
  const [showManageTeamModal, setShowManageTeamModal] = useState(false);
  const [showManageEquipmentModal, setShowManageEquipmentModal] = useState(false);
  const [showConvertTaskModal, setShowConvertTaskModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);

  // Deliverables State
  const [deliverableName, setDeliverableName] = useState('');
  const [deliverableType, setDeliverableType] = useState('Video');
  const [linkedScriptId, setLinkedScriptId] = useState('');
  const [linkedGraphicReqId, setLinkedGraphicReqId] = useState('');
  const [showCreateDeliverableModal, setShowCreateDeliverableModal] = useState(false);

  // Closure Modal State
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState('CLOSED');
  const [closureReasonPreset, setClosureReasonPreset] = useState('Client cancelled remaining deliverables');
  const [customClosureReason, setCustomClosureReason] = useState('');

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
      setAccessDeniedError(err.message || 'Access Denied: Project shoot waiting for Marketing Approval is hidden from Technical Manager.');
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
        href: activeTab === 'Overview' && !selectedScriptRecord ? undefined : `/projects/${project.id}`,
        onClick:
          activeTab === 'Overview' && !selectedScriptRecord
            ? undefined
            : () => {
                setActiveTab('Overview');
                setSelectedScriptRecord(null);
              },
        isCurrent: activeTab === 'Overview' && !selectedScriptRecord,
      },
    ];

    if (activeTab !== 'Overview') {
      crumbs.push({
        label: activeTab,
        href: selectedScriptRecord ? `/projects/${project.id}` : undefined,
        onClick: selectedScriptRecord ? () => setSelectedScriptRecord(null) : undefined,
        isCurrent: !selectedScriptRecord,
      });
    }

    if (selectedScriptRecord) {
      crumbs.push({
        label: selectedScriptRecord.scriptId || selectedScriptRecord.name,
        isCurrent: true,
      });
    }

    setBreadcrumbs(crumbs);
  }, [project, activeTab, selectedScriptRecord, setBreadcrumbs]);

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
    try {
      await fetchApi('/files', {
        method: 'POST',
        body: JSON.stringify({
          projectId: project.id,
          fileName: deliverableName.trim(),
          deliverableType,
          scriptId: linkedScriptId || undefined,
          graphicRequirementId: linkedGraphicReqId || undefined,
        }),
      });
      setDeliverableName('');
      setLinkedScriptId('');
      setLinkedGraphicReqId('');
      setShowCreateDeliverableModal(false);
      loadProject();
    } catch (err: any) {
      alert(err.message || 'Failed to create deliverable');
    }
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

  if (loading) return <div className="p-8 text-center text-gray-400">Loading Project Workspace...</div>;

  if (accessDeniedError) {
    return (
      <div className="p-12 text-center bg-card border border-red-800/40 rounded-2xl max-w-xl mx-auto my-12 space-y-4 shadow-2xl">
        <div className="w-16 h-16 bg-red-950/60 border border-red-800 text-red-400 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
          !
        </div>
        <h2 className="text-xl font-bold text-white">Project Access Restricted</h2>
        <p className="text-xs text-gray-300 leading-relaxed">{accessDeniedError}</p>
        <Link href="/projects" className="inline-block mt-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-blue-600/30">
          Return to Projects List
        </Link>
      </div>
    );
  }

  if (!project) return <div className="p-8 text-center text-red-400 font-semibold">Project Not Found</div>;

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
    'Approvals',
    'Files',
    'Communication',
    'Timeline',
  ];

  if (accessDeniedError || !project) {
    return (
      <div className="p-8 max-w-2xl mx-auto my-12 text-center bg-card border border-red-800/40 rounded-2xl space-y-4 shadow-2xl">
        <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-800/60 flex items-center justify-center text-red-400 mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Access Restricted — Marketing Approval Gate</h2>
        <p className="text-xs text-gray-300 leading-relaxed">
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

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push('/projects')}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white font-semibold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Projects List
      </button>

      {/* Top Header Card */}
      <div className="bg-card border border-border p-6 rounded-xl space-y-4">
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
              <span className="font-mono text-xs font-bold text-blue-400 px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/30 rounded">
                {project.projectId}
              </span>

              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                  isIndoor
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {project.shootType} SHOOT
              </span>

              {/* Project Lifecycle Badge */}
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border font-mono ${
                  project.lifecycle === 'CLOSED'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    : project.lifecycle === 'ARCHIVED'
                    ? 'bg-slate-700/40 text-slate-300 border-slate-600/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}
              >
                LIFECYCLE: {project.lifecycle || 'ACTIVE'}
              </span>

              {/* Interactive Operational Progress Status Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-400 font-semibold uppercase">Operational Status:</span>
                <select
                  value={project.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={user?.role === 'MARKETING_MANAGER' && !['DRAFT', 'PLANNED'].includes(project.status)}
                  className="text-[11px] font-bold px-2.5 py-1 bg-purple-950/60 text-purple-300 border border-purple-700/50 rounded-lg focus:outline-none focus:border-purple-500 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PLANNED">Planned</option>
                  <option value="READY_FOR_PRODUCTION">Ready for Production</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="WAITING_FOR_TECHNICAL_REVIEW">Waiting for Technical Review</option>
                  <option value="WAITING_FOR_MEDIA_REVIEW">Waiting for Media Review</option>
                  <option value="REVISION_REQUESTED">Revision Requested</option>
                  <option value="WAITING_FOR_CLIENT_CONFIRMATION">Waiting for Client Confirmation</option>
                  <option value="CLIENT_REVISION_REQUESTED">Client Revision Requested</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CLOSED">Closed</option>
                  <option value="ARCHIVED">Archived</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                <button
                  type="button"
                  onClick={() => setShowRevisionModal(true)}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 shadow transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Request Revision
                </button>
                {user?.role === 'TECHNICAL_MANAGER' && (
                  <Link
                    href="/approvals"
                    className="px-3 py-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold rounded-lg text-[11px] flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all border border-cyan-400/40"
                    title="Open Technical Manager Approval Session"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-200" />
                    <span>Go to Technical Manager Approval Session</span>
                    <ArrowRight className="w-3.5 h-3.5 text-cyan-200" />
                  </Link>
                )}
              </div>
            </div>

            <h1 className="text-2xl font-bold text-white leading-tight">{project.name}</h1>
            <p className="text-xs text-gray-400">
              Client: <span className="text-gray-200 font-semibold">{project.client?.name}</span> • Brand:{' '}
              <span className="text-purple-400 font-semibold">{project.brand?.name}</span> • Product:{' '}
              <span className="text-emerald-400 font-semibold">{project.product?.name || 'N/A'}</span>
            </p>
          </div>

          <div className="text-right space-y-1">
            <div className="text-xs text-gray-400">
              Shoot Date: <span className="text-white font-bold">{new Date(project.shootDate).toLocaleDateString()}</span>
            </div>
            <div className="text-xs text-gray-400">
              Location: <span className="text-gray-200 font-semibold">{project.shootLocation}</span>
            </div>
          </div>
        </div>

        {/* Marketing Manager Approval Warning Banner */}
        {['PENDING_MARKETING_APPROVAL', 'PLANNED', 'PENDING_CLIENT_APPROVAL'].includes(project.status) && (
          <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl text-amber-300 text-xs flex items-center justify-between font-medium">
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Waiting for Marketing Manager Approval</strong> — Task assignment and production are locked until approved.
              </span>
            </span>
            {user?.role === 'MARKETING_MANAGER' && (
              <button
                onClick={() => handleStatusChange('APPROVED')}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors shadow-md shadow-emerald-950"
              >
                ✓ Approve Project Now
              </button>
            )}
          </div>
        )}

        {['APPROVED', 'READY_FOR_PRODUCTION'].includes(project.status) && (user?.role === 'MEDIA_MANAGER' || (user?.role as string) === 'ADMIN') && (
          <div className="p-3 bg-purple-950/40 border border-purple-500/40 rounded-xl text-purple-200 text-xs flex items-center justify-between font-medium">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Marketing Manager Approved</strong> — Convert to Task &amp; Assign Staff now.
              </span>
            </span>
            <button
              onClick={() => setShowConvertTaskModal(true)}
              className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs transition-colors shadow-md shadow-purple-950 flex items-center gap-1"
            >
              ⚡ Convert to Task ➔
            </button>
          </div>
        )}

        {(project.status === 'REVISION_REQUESTED' || project.status === 'CLIENT_REVISION_REQUESTED') && (
          <div className="p-4 bg-amber-950/60 border border-amber-500/80 rounded-xl text-xs space-y-2 shadow-lg animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-amber-300 font-extrabold flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-400 animate-spin" /> Active Workflow Status: REVISION REQUESTED
              </span>
              <span className="px-2.5 py-0.5 bg-amber-600/30 text-amber-200 border border-amber-500/50 rounded font-mono font-bold text-[10px]">
                Revision #{project.revisionCount || 1}
              </span>
            </div>
            <p className="text-zinc-200">
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
          <div className="flex justify-between text-xs font-semibold text-gray-300">
            <span>Production Progress: {project.progressPercentage}%</span>
            <span>Revisions: {project.revisionCount}</span>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${project.progressPercentage}%` }}></div>
          </div>
        </div>
      </div>

      {/* 12 Workspace Tabs */}
      <div className="flex border-b border-border overflow-x-auto gap-1 text-xs font-semibold">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3.5 py-2.5 rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'bg-card text-blue-400 border-t-2 border-blue-500 font-bold border-x border-border'
                : 'text-gray-400 hover:text-white hover:bg-gray-900/50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content Display */}
      <div className="bg-card border border-border p-6 rounded-xl min-h-[400px]">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-800 space-y-3">
                <h3 className="font-bold text-white text-sm">Operational Information</h3>
                <div className="space-y-2 text-gray-300">
                  <div><span className="text-gray-500">Project ID:</span> <span className="font-mono text-blue-400 font-bold">{project.projectId}</span></div>
                  <div><span className="text-gray-500">Project Name:</span> <span className="text-white font-bold">{project.name}</span></div>
                  <div><span className="text-gray-500">Client:</span> <span className="text-white font-semibold">{project.client?.name}</span></div>
                  <div><span className="text-gray-500">Brand:</span> <span className="text-purple-400 font-semibold">[{project.brand?.shortCode}] {project.brand?.name}</span></div>
                  <div><span className="text-gray-500">Product:</span> <span className="text-emerald-400 font-semibold">{project.product?.name || 'N/A (General Shoot)'}</span></div>
                  <div><span className="text-gray-500">Campaign:</span> {project.campaign?.name || project.campaignId || 'N/A'}</div>
                  <div><span className="text-gray-500">Calendar Event:</span> {project.calendarEventId || 'N/A'}</div>
                  <div><span className="text-gray-500">Priority:</span> <span className="font-bold text-amber-400">{project.priority}</span></div>
                  <div><span className="text-gray-500">Project Lifecycle:</span> <span className="font-mono font-bold text-emerald-400">{project.lifecycle || 'ACTIVE'}</span></div>
                  <div><span className="text-gray-500">Operational Progress Status:</span> <span className="font-bold text-blue-400">{project.status}</span></div>
                  <div><span className="text-gray-500">Estimated Completion:</span> {project.estimatedCompletionDate ? new Date(project.estimatedCompletionDate).toLocaleDateString() : 'N/A'}</div>
                  {project.notes && <div><span className="text-gray-500">Notes / Remarks:</span> <span className="italic text-gray-300">"{project.notes}"</span></div>}
                </div>
              </div>

              <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-800 space-y-3">
                <h3 className="font-bold text-white text-sm">Schedule & Location Logistics</h3>
                <div className="space-y-2 text-gray-300">
                  <div><span className="text-gray-500">Shoot Type:</span> <span className="font-bold text-white">{project.shootType}</span></div>
                  <div><span className="text-gray-500">Shoot Date:</span> <span className="text-white font-bold">{new Date(project.shootDate).toLocaleDateString()}</span></div>
                  <div><span className="text-gray-500">Shoot Location:</span> {project.shootLocation}</div>
                  <div><span className="text-gray-500">Location Category:</span> {project.locationCategory || 'Studio Bay'}</div>
                  <div><span className="text-gray-500">Location Address:</span> {project.locationAddress || project.shootLocation}</div>
                  <div><span className="text-gray-500">Location Contact:</span> {project.locationContactPerson || 'N/A'}</div>
                  <div><span className="text-gray-500">Reporting Time:</span> {project.reportingTime || '09:00 AM'}</div>
                  <div><span className="text-gray-500">Expected Wrap-up Time:</span> {project.expectedWrapUpTime || '06:00 PM'}</div>
                  <div><span className="text-gray-500">Talent / Influencer:</span> {project.influencerTalent || 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* Actual Completion Statistics Widget */}
            <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl space-y-3">
              <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-blue-400" /> Actual Completion Statistics
                </h3>
                <span className="font-mono text-[10px] bg-blue-950/50 text-blue-300 border border-blue-800/40 px-2 py-0.5 rounded font-bold uppercase">
                  Status: {project.status}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                  <div className="text-gray-400 font-semibold text-[11px] mb-1">Scripts</div>
                  <div className="font-bold text-white text-sm font-mono">{project.completionStatistics?.scripts?.text || '0 / 0 Completed'}</div>
                </div>

                <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                  <div className="text-gray-400 font-semibold text-[11px] mb-1">Graphics</div>
                  <div className="font-bold text-white text-sm font-mono">{project.completionStatistics?.graphics?.text || '0 / 0 Completed'}</div>
                </div>

                <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                  <div className="text-gray-400 font-semibold text-[11px] mb-1">Production Tasks</div>
                  <div className="font-bold text-white text-sm font-mono">{project.completionStatistics?.tasks?.text || '0 / 0 Completed'}</div>
                </div>

                <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                  <div className="text-gray-400 font-semibold text-[11px] mb-1">Deliverables</div>
                  <div className="font-bold text-white text-sm font-mono">{project.completionStatistics?.deliverables?.text || '0 / 0 Completed'}</div>
                </div>
              </div>
            </div>

            {/* Permanent Manual Closure Record Banner */}
            {project.closureReason && (
              <div className="p-4 bg-red-950/30 border border-red-800/60 rounded-xl space-y-1">
                <div className="flex items-center gap-2 font-bold text-red-300 text-xs">
                  <ShieldAlert className="w-4 h-4 text-red-400" /> Permanent Project Closure Record
                </div>
                <div className="text-gray-200 text-xs font-medium pt-0.5">
                  Reason: <strong className="text-white">"{project.closureReason}"</strong>
                </div>
                <div className="text-[10px] text-red-400 font-mono">
                  Manually closed by Media Manager • Permanent Audit History Recorded
                </div>
              </div>
            )}

            {/* Completion Criteria Status Widget */}
            <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl space-y-3">
              <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-400" /> Official Project Completion Criteria (4 Points)
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                  project.completionChecklist?.isReadyForCompletion
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {project.completionChecklist?.isReadyForCompletion ? 'Ready for Completion' : `${project.completionChecklist?.pendingCount || 0} Pending Criteria`}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className={`p-3 rounded-lg border flex items-center justify-between ${
                  project.completionChecklist?.allTasksCompleted ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300' : 'bg-gray-800/40 border-gray-700/60 text-gray-400'
                }`}>
                  <div>
                    <div className="font-bold text-xs">1. Production Tasks</div>
                    <div className="text-[10px] opacity-80">All tasks completed</div>
                  </div>
                  {project.completionChecklist?.allTasksCompleted ? (
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <span className="text-[10px] text-amber-400 font-mono font-bold">Pending</span>
                  )}
                </div>

                <div className={`p-3 rounded-lg border flex items-center justify-between ${
                  project.completionChecklist?.techReviewApproved ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300' : 'bg-gray-800/40 border-gray-700/60 text-gray-400'
                }`}>
                  <div>
                    <div className="font-bold text-xs">2. Technical Review</div>
                    <div className="text-[10px] opacity-80">Technical approval</div>
                  </div>
                  {project.completionChecklist?.techReviewApproved ? (
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <span className="text-[10px] text-amber-400 font-mono font-bold">Pending</span>
                  )}
                </div>

                <div className={`p-3 rounded-lg border flex items-center justify-between ${
                  project.completionChecklist?.mediaReviewApproved ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300' : 'bg-gray-800/40 border-gray-700/60 text-gray-400'
                }`}>
                  <div>
                    <div className="font-bold text-xs">3. Media Review</div>
                    <div className="text-[10px] opacity-80">Media Manager approval</div>
                  </div>
                  {project.completionChecklist?.mediaReviewApproved ? (
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <span className="text-[10px] text-amber-400 font-mono font-bold">Pending</span>
                  )}
                </div>

                <div className={`p-3 rounded-lg border flex items-center justify-between ${
                  project.completionChecklist?.clientConfirmationRecorded ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300' : 'bg-gray-800/40 border-gray-700/60 text-gray-400'
                }`}>
                  <div>
                    <div className="font-bold text-xs">4. Client Sign-off</div>
                    <div className="text-[10px] opacity-80">Client confirmation</div>
                  </div>
                  {project.completionChecklist?.clientConfirmationRecorded ? (
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <span className="text-[10px] text-amber-400 font-mono font-bold">Pending</span>
                  )}
                </div>
              </div>
            </div>

            {isIndoor ? (
              <div className="bg-blue-950/20 p-4 rounded-xl border border-blue-800/40 space-y-3">
                <h3 className="font-bold text-blue-300 text-sm">Indoor Studio Operational Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-gray-300">
                  <div><span className="text-gray-500">Studio Name:</span> {project.indoorDetails?.studioName}</div>
                  <div><span className="text-gray-500">Address:</span> {project.indoorDetails?.studioAddress}</div>
                  <div><span className="text-gray-500">Booking Status:</span> {project.indoorDetails?.studioBookingStatus}</div>
                  <div><span className="text-gray-500">Booking Ref:</span> {project.indoorDetails?.studioBookingRef}</div>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-950/20 p-4 rounded-xl border border-emerald-800/40 space-y-3">
                <h3 className="font-bold text-emerald-300 text-sm">Outdoor Shoot Operational Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-gray-300">
                  <div><span className="text-gray-500">Location:</span> {outdoor?.outdoorLocation}</div>
                  <div><span className="text-gray-500">Permission:</span> {outdoor?.permissionStatus}</div>
                  <div><span className="text-gray-500">Weather Risk:</span> {outdoor?.weatherStatus}</div>
                  <div><span className="text-gray-500">Driver Assigned:</span> {outdoor?.driver || 'None (Warning)'}</div>
                  <div><span className="text-gray-500">Logistics Coordinator:</span> {outdoor?.logisticsCoordinator || 'N/A'}</div>
                  <div><span className="text-gray-500">Travel Notes:</span> {outdoor?.travelNotes || 'N/A'}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Scripts */}
        {activeTab === 'Scripts' && (
          <div className="space-y-6 text-xs">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" /> Multiple Project Scripts
                </h3>
                <p className="text-gray-400 text-[11px] mt-0.5">
                  Default Naming Convention: <strong className="text-purple-300 font-mono">BrandCode-Date-ProductCode-LanguageCode-Sequence</strong> (e.g. <span className="text-emerald-300 font-mono">DW-130726-OJ-KL-001</span>)
                </p>
              </div>
            </div>

            {/* Full Script Creation Panel (All Fields Available) */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await fetchApi('/scripts', {
                    method: 'POST',
                    body: JSON.stringify({
                      projectId: project.id,
                      name: newScriptTitle.trim(), // blank uses auto formula
                      language: newScriptLanguage || 'Malayalam (KL)',
                      category: newScriptCategory || 'Advertisement',
                      objective: newScriptObjective || 'Generate Sales',
                      description: newScriptDescription,
                      estimatedDuration: newScriptDuration || '30s',
                      priority: newScriptPriority || 'MEDIUM',
                      remarks: newScriptRemarks,
                    }),
                  });
                  setNewScriptTitle('');
                  setNewScriptDescription('');
                  setNewScriptRemarks('');
                  loadProject();
                } catch (err: any) {
                  alert(err.message || 'Failed to create script');
                }
              }}
              className="p-5 bg-gray-900 border border-purple-800/40 rounded-xl space-y-4 shadow-md text-xs"
            >
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <h4 className="font-bold text-purple-300 text-xs flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" /> Create New Production Script (All Fields)
                </h4>
                <span className="font-mono text-[10px] bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded">
                  Format: BrandCode-Date-ProductCode-LanguageCode-Seq
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* Purpose / Category */}
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Purpose / Category *</label>
                  <select
                    value={newScriptCategory}
                    onChange={(e) => setNewScriptCategory(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg font-semibold focus:border-purple-500 focus:outline-none"
                  >
                    <option value="Advertisement">Advertisement</option>
                    <option value="Awareness">Awareness</option>
                    <option value="Educational">Educational</option>
                    <option value="Promotional">Promotional</option>
                    <option value="Testimonial">Testimonial</option>
                    <option value="Product Demo">Product Demo</option>
                    <option value="Festival Campaign">Festival Campaign</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Branding">Branding</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Target Language */}
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Target Language *</label>
                  <select
                    value={newScriptLanguage}
                    onChange={(e) => setNewScriptLanguage(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg font-semibold focus:border-purple-500 focus:outline-none"
                  >
                    <option value="Malayalam (KL)">Malayalam (KL)</option>
                    <option value="English (EN)">English (EN)</option>
                    <option value="Hindi (HI)">Hindi (HI)</option>
                    <option value="Tamil (TN)">Tamil (TN)</option>
                    <option value="Kannada (KA)">Kannada (KA)</option>
                    <option value="Telugu (TE)">Telugu (TE)</option>
                    <option value="Arabic (AR)">Arabic (AR)</option>
                  </select>
                </div>

                {/* Strategic Objective */}
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Strategic Objective *</label>
                  <select
                    value={newScriptObjective}
                    onChange={(e) => setNewScriptObjective(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg font-semibold focus:border-purple-500 focus:outline-none"
                  >
                    <option value="Generate Sales">Generate Sales</option>
                    <option value="Increase Awareness">Increase Awareness</option>
                    <option value="Launch Product">Launch Product</option>
                    <option value="Customer Education">Customer Education</option>
                    <option value="Engagement">Engagement</option>
                    <option value="Retargeting">Retargeting</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Duration & Priority */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Duration</label>
                    <input
                      type="text"
                      placeholder="e.g. 30s"
                      value={newScriptDuration}
                      onChange={(e) => setNewScriptDuration(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 text-gray-200 px-2.5 py-2 rounded-lg font-semibold focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Priority</label>
                    <select
                      value={newScriptPriority}
                      onChange={(e) => setNewScriptPriority(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 text-gray-200 px-2 py-2 rounded-lg font-semibold focus:border-purple-500 focus:outline-none"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Description & Storyline */}
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Script Storyline / Scenes Description</label>
                  <textarea
                    rows={2}
                    placeholder="Enter narration dialogues, scene shots, visual requirements..."
                    value={newScriptDescription}
                    onChange={(e) => setNewScriptDescription(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-gray-200 p-2.5 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                </div>

                {/* Custom Title & Remarks */}
                <div className="space-y-2">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Custom Title / Code (Optional)</label>
                    <input
                      type="text"
                      placeholder="Leave blank for auto formula: DW-130726-OJ-KL-001"
                      value={newScriptTitle}
                      onChange={(e) => setNewScriptTitle(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg font-semibold focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Operational Remarks</label>
                    <input
                      type="text"
                      placeholder="Enter props needed, location hints, actor notes..."
                      value={newScriptRemarks}
                      onChange={(e) => setNewScriptRemarks(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg font-semibold focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg shadow-md shadow-purple-600/30 transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Generate & Save Complete Script
                </button>
              </div>
            </form>

            {project.scripts?.length === 0 ? (
              <p className="text-gray-500 italic text-[11px] p-4 bg-gray-900/40 rounded-lg text-center">
                No scripts created yet for this project.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.scripts?.map((s: any) => (
                  <div
                    key={s.id}
                    onClick={() =>
                      setSelectedScriptRecord(
                        selectedScriptRecord?.id === s.id ? null : s
                      )
                    }
                    className={`p-4 bg-gray-900 border rounded-xl space-y-2 cursor-pointer transition-all ${
                      selectedScriptRecord?.id === s.id
                        ? 'border-purple-500 ring-1 ring-purple-500/50 bg-purple-950/20 shadow-lg'
                        : 'border-gray-800 hover:border-purple-500/40'
                    }`}
                  >
                    <div className="flex justify-between font-mono font-bold text-blue-400">
                      <span className="flex items-center gap-1.5">
                        {selectedScriptRecord?.id === s.id && (
                          <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                        )}
                        {s.scriptId}
                      </span>
                      <span className="text-purple-300 text-[10px] bg-purple-950/50 px-2 py-0.5 rounded border border-purple-800/40">
                        {s.language || 'English'}
                      </span>
                    </div>
                    <h4 className="font-bold text-white text-sm font-mono">{s.name}</h4>
                    <p className="text-gray-400 text-xs">{s.objective || s.description || 'No detailed objective provided'}</p>
                    <div className="text-[10px] text-gray-500 pt-1 border-t border-gray-800 flex justify-between items-center">
                      <span>Status: <strong className="text-amber-400">{s.status}</strong></span>
                      <span className="text-gray-500 font-mono text-[9px]">
                        {selectedScriptRecord?.id === s.id ? 'Active in Breadcrumbs' : 'Click to inspect'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Graphic Requirements */}
        {activeTab === 'Graphic Requirements' && (
          <div className="space-y-4 text-xs">
            <h3 className="font-bold text-white text-sm">Graphic Requirements</h3>
            {project.graphicRequirements?.length === 0 ? (
              <p className="text-gray-500">No graphic requirements logged yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.graphicRequirements?.map((g: any) => (
                  <div key={g.id} className="p-4 bg-gray-900 border border-gray-800 rounded-xl space-y-2">
                    <div className="flex justify-between font-mono font-bold text-purple-400">
                      <span>{g.requirementId}</span>
                      <span className="text-gray-400 text-xs">{g.requirementType}</span>
                    </div>
                    <h4 className="font-bold text-white">{g.name}</h4>
                    <p className="text-gray-400">{g.objective}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Tasks */}
        {activeTab === 'Tasks' && (
          <div className="space-y-4 text-xs">
            <h3 className="font-bold text-white text-sm">Project Tasks</h3>
            <div className="space-y-2">
              {project.tasks?.map((t: any) => (
                <div key={t.id} className="p-3 bg-gray-900 border border-gray-800 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-mono text-blue-400 font-bold mr-2">{t.taskId}</span>
                    <span className="font-bold text-white">{t.title}</span>
                  </div>
                  <span className="text-gray-400 font-semibold">{t.completionPercentage}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Team */}
        {activeTab === 'Team' && (
          <div className="space-y-6 text-xs">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" /> Assigned Team & Crew Members
                </h3>
                <p className="text-gray-400 text-[11px] mt-0.5">
                  Staff assigned to this shoot project are granted workspace access.
                </p>
              </div>

              {['PENDING_MARKETING_APPROVAL', 'PLANNED', 'PENDING_CLIENT_APPROVAL'].includes(project.status) ? (
                <span className="p-2 bg-amber-950/40 border border-amber-500/40 rounded text-amber-300 font-semibold text-xs flex items-center gap-1">
                  ⏳ Waiting for Marketing Manager Approval — Staff assignment locked until approved.
                </span>
              ) : (user?.role === 'MEDIA_MANAGER' || (user?.role as string) === 'ADMIN') ? (
                <button
                  onClick={() => setShowManageTeamModal(!showManageTeamModal)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Manage Team Members
                </button>
              ) : null}
            </div>

            {/* Quick Manage Team Panel */}
            {showManageTeamModal && (
              <div className="p-4 bg-gray-900 border border-blue-900/50 rounded-xl space-y-3">
                <h4 className="font-bold text-blue-300">Click staff members to assign or remove from this project:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {allUsers.map((u) => {
                    const isAssigned = project.assignedTeam?.some((t: any) => t.userId === u.id);
                    return (
                      <button
                        key={u.id}
                        onClick={() => handleToggleTeamUser(u.id)}
                        className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                          isAssigned
                            ? 'bg-blue-600/20 border-blue-500 text-blue-200 font-semibold'
                            : 'bg-card border-gray-800 text-gray-400 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                            isAssigned ? 'bg-blue-600' : 'bg-gray-700'
                          }`}>
                            {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div className="truncate">
                            <div className="text-xs text-white truncate">{u.name}</div>
                            <div className="text-[10px] text-gray-400 truncate">{u.employeeProfile?.designation || u.role}</div>
                          </div>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          isAssigned ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400'
                        }`}>
                          {isAssigned ? 'Assigned' : 'Add'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Team List Grid */}
            {project.assignedTeam?.length === 0 ? (
              <div className="p-6 text-center bg-gray-900/50 border border-gray-800 rounded-xl text-gray-400">
                No team members currently assigned to this project. Click "Manage Team Members" above to assign staff.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {project.assignedTeam?.map((assignment: any) => {
                  const teamUser = assignment.user;
                  const profile = teamUser?.employeeProfile;
                  return (
                    <div key={assignment.id} className="p-4 bg-gray-900 border border-gray-800 rounded-xl space-y-3 flex flex-col justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600/30 border border-blue-500/40 text-blue-300 flex items-center justify-center font-bold text-sm shrink-0">
                          {teamUser?.name ? teamUser.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="space-y-0.5 overflow-hidden">
                          <h4 className="font-bold text-white text-sm truncate">{teamUser?.name}</h4>
                          <p className="text-blue-400 text-xs font-semibold">{profile?.designation || teamUser?.role}</p>
                          <p className="text-gray-400 text-[10px] font-mono bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded w-max">System Comm Only</p>
                        </div>
                      </div>

                      {profile?.department && (
                        <div className="pt-2 border-t border-gray-800/60 flex items-center justify-between text-[11px] text-gray-400">
                          <span>Department:</span>
                          <span className="font-semibold text-gray-200">{profile.department.name}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 6: Equipment */}
        {activeTab === 'Equipment' && (
          <ProjectEquipmentTab project={project} onRefresh={loadProject} />
        )}

        {/* Tab 7: Deliverables */}
        {(activeTab === 'Deliverables' || activeTab === 'Deliverables & Drive') && (
          <div className="space-y-6 text-xs">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Film className="w-4 h-4 text-emerald-400" /> Project Deliverables & Media Assets
                </h3>
                <p className="text-gray-400 text-[11px] mt-0.5">
                  Each deliverable is linked to its corresponding Script or Graphic Requirement.
                </p>
              </div>

              <button
                onClick={() => setShowCreateDeliverableModal(!showCreateDeliverableModal)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Register Deliverable
              </button>
            </div>

            {/* Create Deliverable Modal Form */}
            {showCreateDeliverableModal && (
              <form onSubmit={handleCreateDeliverable} className="p-4 bg-gray-900 border border-emerald-800/50 rounded-xl space-y-4">
                <h4 className="font-bold text-emerald-300">Register New Deliverable File</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Deliverable Type *</label>
                    <select
                      value={deliverableType}
                      onChange={(e) => setDeliverableType(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg font-semibold focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="Video">Video</option>
                      <option value="Reel">Reel</option>
                      <option value="Poster">Poster</option>
                      <option value="Carousel">Carousel</option>
                      <option value="Story">Story</option>
                      <option value="Motion Graphic">Motion Graphic</option>
                      <option value="Banner">Banner</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Deliverable Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Hero Product Intro Reel 4K"
                      value={deliverableName}
                      onChange={(e) => setDeliverableName(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg font-semibold focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Link to Script</label>
                    <select
                      value={linkedScriptId}
                      onChange={(e) => {
                        setLinkedScriptId(e.target.value);
                        if (e.target.value) setLinkedGraphicReqId('');
                      }}
                      className="w-full bg-gray-800 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg font-semibold focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="">None (Unlinked)</option>
                      {project.scripts?.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          [{s.scriptId}] {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Link to Graphic Req</label>
                    <select
                      value={linkedGraphicReqId}
                      onChange={(e) => {
                        setLinkedGraphicReqId(e.target.value);
                        if (e.target.value) setLinkedScriptId('');
                      }}
                      className="w-full bg-gray-800 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg font-semibold focus:border-emerald-500 focus:outline-none"
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

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateDeliverableModal(false)}
                    className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg font-semibold hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold shadow-md shadow-emerald-600/30"
                  >
                    Save Deliverable
                  </button>
                </div>
              </form>
            )}

            {/* Deliverables Grid List */}
            {project.files?.length === 0 ? (
              <div className="p-6 text-center bg-gray-900/50 border border-gray-800 rounded-xl text-gray-400">
                No deliverables uploaded or registered yet for this project. Click "Register Deliverable" above.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {project.files?.map((f: any) => {
                  const linkedScript = project.scripts?.find((s: any) => s.id === f.scriptId);
                  const linkedGraphic = project.graphicRequirements?.find((g: any) => g.id === f.graphicRequirementId);

                  return (
                    <div key={f.id} className="p-4 bg-gray-900 border border-gray-800 rounded-xl space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-bold uppercase">
                            {f.fileName.startsWith('[') ? f.fileName.split(']')[0].replace('[', '') : 'DELIVERABLE'}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {(f.fileSize / (1024 * 1024)).toFixed(1)} MB
                          </span>
                        </div>

                        <h4 className="font-bold text-white text-sm leading-snug">
                          {f.fileName.includes(']') ? f.fileName.split(']').slice(1).join(']').trim() : f.fileName}
                        </h4>

                        <div className="space-y-1 text-[11px] pt-1">
                          {linkedScript && (
                            <div className="p-2 bg-blue-950/40 border border-blue-800/40 rounded text-blue-300 font-semibold flex items-center justify-between">
                              <span>📜 Linked Script:</span>
                              <span className="font-mono text-white">[{linkedScript.scriptId}] {linkedScript.name}</span>
                            </div>
                          )}

                          {linkedGraphic && (
                            <div className="p-2 bg-purple-950/40 border border-purple-800/40 rounded text-purple-300 font-semibold flex items-center justify-between">
                              <span>🎨 Linked Graphic Req:</span>
                              <span className="font-mono text-white">[{linkedGraphic.requirementId}] {linkedGraphic.name}</span>
                            </div>
                          )}

                          {!linkedScript && !linkedGraphic && (
                            <div className="text-gray-500 italic text-[10px]">General Project Deliverable</div>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-800/60 flex items-center justify-between text-[10px] text-gray-400">
                        <span>Uploaded by: <strong className="text-gray-300">{f.uploadedBy?.name || 'Manager'}</strong></span>
                        <span className="text-emerald-400 font-bold">Active Ver.</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 8: Approvals */}
        {activeTab === 'Approvals' && (
          <div className="space-y-6 text-xs">
            <h3 className="font-bold text-white text-sm">3-Stage Approval Engine Audit</h3>
            <div className="space-y-4">
              {project.approvals?.map((app: any) => (
                <div key={app.id} className="p-4 bg-gray-900 border border-gray-800 rounded-xl space-y-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-blue-400">{app.approvalType}</span>
                    <span className={app.status === 'APPROVED' ? 'text-emerald-400' : 'text-red-400'}>{app.status}</span>
                  </div>
                  <p className="text-gray-400">Reviewer: {app.reviewer?.name} ({new Date(app.reviewedAt).toLocaleString()})</p>
                  {app.remarks && <p className="text-gray-300 italic">"{app.remarks}"</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 9: Files Directory Tree */}
        {activeTab === 'Files' && (
          <div className="space-y-4 text-xs">
            <h3 className="font-bold text-white text-sm">Structured File Storage Tree</h3>
            <div className="space-y-3">
              {filesTree?.folders?.map((folder: any) => (
                <div key={folder.name} className="p-3 bg-gray-900 border border-gray-800 rounded-lg">
                  <div className="font-bold text-gray-200 flex items-center gap-2 mb-2">
                    <FolderTree className="w-4 h-4 text-blue-400" /> {folder.name} ({folder.files?.length})
                  </div>
                  {folder.files?.map((f: any) => (
                    <div key={f.id} className="ml-6 text-gray-400 font-mono py-1 border-b border-gray-800/40">
                      📄 {f.fileName} ({(f.fileSize / 1048576).toFixed(1)}MB)
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 10: Communication & Operational Remarks */}
        {activeTab === 'Communication' && (
          <ActivityCommunicationThread
            entityType="PROJECT"
            entityId={project.id}
            entityName={project.name}
            entityRef={project.projectId}
            projectId={project.id}
            title="Project Activity Communications"
          />
        )}

        {/* Tab 11: Timeline */}
        {activeTab === 'Timeline' && (
          <div className="space-y-6 text-xs">
            <div>
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" /> Permanent Operational Timeline (Immutable)
              </h3>
              <p className="text-gray-400 text-[11px] mt-0.5">
                Audit log of all project lifecycle events, assignments, status transitions, and milestone confirmations. Timeline records cannot be deleted.
              </p>
            </div>

            <div className="space-y-4 border-l-2 border-blue-600/40 pl-4 py-1">
              {project.activityLogs && project.activityLogs.length > 0 ? (
                project.activityLogs.map((log: any) => (
                  <div key={log.id} className="relative space-y-1 bg-gray-900/60 p-3 rounded-lg border border-gray-800">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 absolute -left-[21px] top-4 border-2 border-card"></div>
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded uppercase">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-white font-semibold text-xs pt-1">{log.description}</p>
                    {log.user && (
                      <p className="text-[10px] text-gray-400">Performed by: <strong className="text-gray-300">{log.user.name}</strong></p>
                    )}
                  </div>
                ))
              ) : (
                <div className="relative space-y-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 absolute -left-[21px] top-1 border-2 border-card"></div>
                  <div className="font-bold text-white text-xs">Project Created</div>
                  <div className="text-gray-400 text-[11px]">{new Date(project.createdAt).toLocaleString()}</div>
                  <div className="text-gray-500 text-[10px]">Initial project setup & database initialization</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 12: Shoot Checklist */}
        {(activeTab === 'Shoot Checklist' || activeTab === 'Checklist') && (
          <div className="space-y-6 text-xs">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-400" /> Operational Shoot Checklist
                </h3>
                <p className="text-gray-400 text-[11px] mt-0.5">
                  Standard pre-shoot verification tasks for equipment, permits, and crew readiness.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl space-y-3">
                <h4 className="font-bold text-blue-300 border-b border-gray-800 pb-2">1. Pre-Shoot Logistics & Permits</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-gray-200 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded border-gray-700 text-blue-600 focus:ring-blue-500" />
                    <span>Location Address & Access Confirmed ({project.shootLocation})</span>
                  </label>
                  <label className="flex items-center gap-2 text-gray-200 cursor-pointer">
                    <input type="checkbox" defaultChecked={project.outdoorDetails?.permissionStatus === 'APPROVED'} className="rounded border-gray-700 text-blue-600 focus:ring-blue-500" />
                    <span>Site Permission & Permits Verified</span>
                  </label>
                  <label className="flex items-center gap-2 text-gray-200 cursor-pointer">
                    <input type="checkbox" defaultChecked={Boolean(project.outdoorDetails?.driver)} className="rounded border-gray-700 text-blue-600 focus:ring-blue-500" />
                    <span>Transportation Driver & Route Confirmed</span>
                  </label>
                </div>
              </div>

              <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl space-y-3">
                <h4 className="font-bold text-purple-300 border-b border-gray-800 pb-2">2. Production Gear & Crew Check</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-gray-200 cursor-pointer">
                    <input type="checkbox" defaultChecked={project.equipmentReservations?.length > 0} className="rounded border-gray-700 text-purple-600 focus:ring-purple-500" />
                    <span>Reserved Cameras & Lenses Charged ({project.equipmentReservations?.length || 0} items reserved)</span>
                  </label>
                  <label className="flex items-center gap-2 text-gray-200 cursor-pointer">
                    <input type="checkbox" defaultChecked={project.assignedTeam?.length > 0} className="rounded border-gray-700 text-purple-600 focus:ring-purple-500" />
                    <span>Crew Members Briefed ({project.assignedTeam?.length || 0} staff assigned)</span>
                  </label>
                  <label className="flex items-center gap-2 text-gray-200 cursor-pointer">
                    <input type="checkbox" defaultChecked={Boolean(project.influencerTalent)} className="rounded border-gray-700 text-purple-600 focus:ring-purple-500" />
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-red-500/40 rounded-xl w-full max-w-md p-5 space-y-4 text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400" /> Mandatory Project Closure Reason
              </h3>
              <button type="button" onClick={() => setShowClosureModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-gray-300">
              Media Manager manual closure requires a mandatory reason that becomes a permanent part of the project history.
            </p>

            <form onSubmit={handleConfirmClosure} className="space-y-3">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Select Reason *</label>
                <select
                  value={closureReasonPreset}
                  onChange={(e) => setClosureReasonPreset(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg font-semibold focus:border-red-500 focus:outline-none"
                >
                  <option value="Client cancelled remaining deliverables">Client cancelled remaining deliverables</option>
                  <option value="Scope reduced">Scope reduced</option>
                  <option value="Duplicate project">Duplicate project</option>
                  <option value="Production discontinued">Production discontinued</option>
                  <option value="Other">Other (Custom Reason)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  {closureReasonPreset === 'Other' ? 'Custom Closure Explanation *' : 'Additional Notes (Optional)'}
                </label>
                <textarea
                  rows={3}
                  required={closureReasonPreset === 'Other'}
                  placeholder={closureReasonPreset === 'Other' ? 'Explain reason for manual project closure...' : 'Add operational details...'}
                  value={customClosureReason}
                  onChange={(e) => setCustomClosureReason(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg focus:border-red-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowClosureModal(false)}
                  className="px-3 py-1.5 bg-gray-800 text-gray-300 hover:text-white rounded-lg font-semibold"
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
