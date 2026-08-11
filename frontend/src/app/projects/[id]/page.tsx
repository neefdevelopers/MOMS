'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
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
} from 'lucide-react';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [filesTree, setFilesTree] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');

  // Interactive Form States
  const [commentText, setCommentText] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [newScriptTitle, setNewScriptTitle] = useState('');
  const [newGraphicTitle, setNewGraphicTitle] = useState('');

  const loadProject = async () => {
    try {
      const [projRes, treeRes] = await Promise.all([
        fetchApi(`/projects/${id}`),
        fetchApi(`/files/project/${id}`),
      ]);
      setProject(projRes);
      setFilesTree(treeRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProject();
  }, [id]);

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

  if (loading) return <div className="p-8 text-center text-gray-400">Loading Project Workspace...</div>;
  if (!project) return <div className="p-8 text-center text-red-400">Project Not Found</div>;

  const isIndoor = project.shootType === 'INDOOR';
  const outdoor = project.outdoorDetails;

  const tabs = [
    'Overview',
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
    'Shoot Checklist',
  ];

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

              <span className="text-[10px] font-bold px-2.5 py-0.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full">
                {project.status.replace(/_/g, ' ')}
              </span>
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
        {activeTab === 'Overview' && (
          <div className="space-y-6 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-800 space-y-3">
                <h3 className="font-bold text-white text-sm">Operational Information</h3>
                <div className="space-y-2 text-gray-300">
                  <div><span className="text-gray-500">Project ID:</span> {project.projectId}</div>
                  <div><span className="text-gray-500">Shoot Location:</span> {project.shootLocation}</div>
                  <div><span className="text-gray-500">Reporting Time:</span> {project.reportingTime || '09:00 AM'}</div>
                  <div><span className="text-gray-500">Wrap-up Time:</span> {project.expectedWrapUpTime || '05:00 PM'}</div>
                  <div><span className="text-gray-500">Talent / Influencer:</span> {project.influencerTalent || 'N/A'}</div>
                </div>
              </div>

              {isIndoor ? (
                <div className="bg-blue-950/20 p-4 rounded-xl border border-blue-800/40 space-y-3">
                  <h3 className="font-bold text-blue-300 text-sm">Indoor Studio Details</h3>
                  <div className="space-y-2 text-gray-300">
                    <div><span className="text-gray-500">Studio Name:</span> {project.indoorDetails?.studioName}</div>
                    <div><span className="text-gray-500">Address:</span> {project.indoorDetails?.studioAddress}</div>
                    <div><span className="text-gray-500">Booking Status:</span> {project.indoorDetails?.studioBookingStatus}</div>
                    <div><span className="text-gray-500">Booking Ref:</span> {project.indoorDetails?.studioBookingRef}</div>
                    <div><span className="text-gray-500">Lighting Setup:</span> {project.indoorDetails?.lightingRequirements}</div>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-950/20 p-4 rounded-xl border border-emerald-800/40 space-y-3">
                  <h3 className="font-bold text-emerald-300 text-sm">Outdoor Shoot Details</h3>
                  <div className="space-y-2 text-gray-300">
                    <div><span className="text-gray-500">Location:</span> {outdoor?.outdoorLocation}</div>
                    <div><span className="text-gray-500">Permission:</span> {outdoor?.permissionStatus}</div>
                    <div><span className="text-gray-500">Weather Risk:</span> {outdoor?.weatherStatus}</div>
                    <div><span className="text-gray-500">Driver Assigned:</span> {outdoor?.driver || 'None (Warning)'}</div>
                    <div><span className="text-gray-500">Drone Requirement:</span> {outdoor?.droneRequirement ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Scripts */}
        {activeTab === 'Scripts' && (
          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-sm">Project Scripts</h3>
            </div>
            {project.scripts?.length === 0 ? (
              <p className="text-gray-500">No scripts created yet for this project.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.scripts?.map((s: any) => (
                  <div key={s.id} className="p-4 bg-gray-900 border border-gray-800 rounded-xl space-y-2">
                    <div className="flex justify-between font-mono font-bold text-blue-400">
                      <span>{s.scriptId}</span>
                      <span className="text-gray-400 text-xs">{s.category}</span>
                    </div>
                    <h4 className="font-bold text-white">{s.name}</h4>
                    <p className="text-gray-400">{s.objective}</p>
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

        {/* Tab 10: Communication */}
        {activeTab === 'Communication' && (
          <div className="space-y-4 text-xs">
            <h3 className="font-bold text-white text-sm">Project Communication Thread</h3>
            <form onSubmit={handlePostComment} className="flex gap-2">
              <input
                type="text"
                required
                placeholder="Post operational remark..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg"
              />
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg">
                Post
              </button>
            </form>

            <div className="space-y-2 pt-2">
              {project.communications?.map((c: any) => (
                <div key={c.id} className="p-3 bg-gray-900 border border-gray-800 rounded-lg">
                  <div className="flex justify-between text-gray-400 font-semibold mb-1">
                    <span>{c.sender?.name}</span>
                    <span>{new Date(c.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-gray-200">{c.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 11: Timeline */}
        {activeTab === 'Timeline' && (
          <div className="space-y-4 text-xs">
            <h3 className="font-bold text-white text-sm">Permanent Activity Timeline (Immutable)</h3>
            <div className="space-y-3 border-l-2 border-gray-800 pl-4">
              <div className="relative">
                <div className="font-bold text-white">Project Created</div>
                <div className="text-gray-500 text-[10px]">{new Date(project.createdAt).toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}

        {/* Default fallback for other tabs */}
        {!['Overview', 'Scripts', 'Graphic Requirements', 'Tasks', 'Approvals', 'Files', 'Communication', 'Timeline'].includes(activeTab) && (
          <div className="text-gray-400 text-xs">
            Showing records for tab: <span className="font-bold text-white">{activeTab}</span>
          </div>
        )}
      </div>
    </div>
  );
}
