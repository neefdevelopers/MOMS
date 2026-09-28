'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchApi, resolveFileUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { RoleGuard } from '@/components/common/RoleGuard';
import { extractEventScripts, ProjectScript, formatScriptsAsSummaryText } from '@/lib/project-scripts';
import {
  Camera,
  Calendar,
  Clock,
  User,
  Users,
  MapPin,
  Building2,
  BookmarkCheck,
  Package,
  FileText,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Layers,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Download,
  Eye,
  Plus,
  Trash2,
  RefreshCw,
  SunMedium,
  CloudRain,
  ShieldCheck,
  X,
  ChevronRight,
  Info,
  Film,
  Check,
  RotateCcw,
  SlidersHorizontal,
  CheckSquare,
  Copy,
} from 'lucide-react';

interface AttachedScriptDoc {
  id: string;
  name: string;
  url?: string;
  scriptText?: string;
  fileType: string;
  fileSize?: number;
  uploadedBy?: { name?: string; role?: string; email?: string };
  createdAt?: string;
}

export default function ProjectEquipmentAssignmentsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INDOOR' | 'OUTDOOR'>('ALL');
  const [allocationFilter, setAllocationFilter] = useState<'ALL' | 'PENDING' | 'ALLOCATED'>('ALL');

  // Active reviewing project modal
  const [reviewingProject, setReviewingProject] = useState<any | null>(null);
  const [reviewingProjectFiles, setReviewingProjectFiles] = useState<AttachedScriptDoc[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Quick allocation form state (inside modal)
  const [showAllocForm, setShowAllocForm] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [allocStartDate, setAllocStartDate] = useState('');
  const [allocEndDate, setAllocEndDate] = useState('');
  const [allocPurpose, setAllocPurpose] = useState('');
  const [allocRemarks, setAllocRemarks] = useState('');
  const [allocAccessories, setAllocAccessories] = useState('');
  const [submittingAlloc, setSubmittingAlloc] = useState(false);
  const [equipmentCategoryFilter, setEquipmentCategoryFilter] = useState('ALL');

  // Script preview modal
  const [previewScriptDoc, setPreviewScriptDoc] = useState<AttachedScriptDoc | null>(null);

  const loadData = async () => {
    try {
      setRefreshing(true);
      const [projectsRes, eqRes, usersRes] = await Promise.all([
        fetchApi('/projects').catch(() => []),
        fetchApi('/equipment').catch(() => []),
        fetchApi('/users').catch(() => []),
      ]);

      const validProjects = Array.isArray(projectsRes) ? projectsRes : [];
      setProjects(validProjects);

      if (Array.isArray(eqRes)) {
        setEquipmentList(eqRes);
      }
      if (Array.isArray(usersRes)) {
        setStaffList(usersRes);
      }

      // If a project is currently being reviewed, refresh its instance
      if (reviewingProject) {
        const updated = validProjects.find((p) => p.id === reviewingProject.id);
        if (updated) {
          setReviewingProject(updated);
          loadProjectFiles(updated);
        }
      }
    } catch (err) {
      console.error('Failed to load project allocation data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Helper to format a single structured ProjectScript into readable script document text
  const formatSingleScript = (script: ProjectScript, index: number, total: number): string => {
    const lines: string[] = [];
    lines.push(`================================================================================`);
    lines.push(`🎬 SCRIPT ${total > 1 ? `#${index + 1}: ` : ''}${script.title?.toUpperCase() || 'SHOOTING SCRIPT'}`);
    lines.push(`================================================================================\n`);

    const meta: string[] = [];
    if (script.targetPlatform) meta.push(`📱 Target Platform: ${script.targetPlatform}`);
    if (script.contentType) meta.push(`🎞️ Content Type: ${script.contentType}`);
    if (script.duration) meta.push(`⏱️ Duration: ${script.duration}`);
    if (script.status) meta.push(`📌 Status: ${script.status}`);
    if (meta.length > 0) {
      lines.push(meta.join('   |   '));
      lines.push('--------------------------------------------------------------------------------\n');
    }

    if (script.hook && script.hook.trim()) {
      lines.push(`🎣 HOOK / OPENING SCENE:`);
      lines.push(script.hook.trim());
      lines.push('\n--------------------------------------------------------------------------------\n');
    }

    lines.push(`📝 SCREENPLAY & DIALOGUE:`);
    lines.push(script.scriptText ? script.scriptText.trim() : '(No dialogue content specified)');

    if (script.notes && script.notes.trim()) {
      lines.push('\n--------------------------------------------------------------------------------\n');
      lines.push(`💡 DIRECTOR / PRODUCTION NOTES:`);
      lines.push(script.notes.trim());
    }

    lines.push(`\n================================================================================`);
    return lines.join('\n');
  };

  // Helper to extract ALL script documents from project, files, and calendar event
  const extractScriptDocs = (project: any, extraFiles: any[] = []): AttachedScriptDoc[] => {
    if (!project) return [];
    const scriptDocs: AttachedScriptDoc[] = [];
    const seenKeys = new Set<string>();

    const checkAndAddFile = (file: any) => {
      if (!file) return;
      const fName = file.fileName || file.name || 'Script Document';
      const rawUrl = file.storagePath || file.fileUrl || file.url || (file.id ? `/uploads/${file.fileName}` : '');
      const uniqueKey = file.id || rawUrl || fName;
      if (seenKeys.has(uniqueKey)) return;

      const fType = file.fileType || file.category || file.attachmentCategory || file.folderCategory || 'SCRIPT_DOCUMENT';
      const isScript =
        fType.toLowerCase().includes('script') ||
        fName.toLowerCase().includes('script') ||
        fName.toLowerCase().includes('screenplay') ||
        file.attachmentCategory === 'SCRIPT_DOCUMENT' ||
        file.folderCategory === 'Script Documents' ||
        file.storagePath?.includes('Script Documents') ||
        fName.toLowerCase().endsWith('.pdf') ||
        fName.toLowerCase().endsWith('.docx') ||
        fName.toLowerCase().endsWith('.doc') ||
        fName.toLowerCase().endsWith('.txt') ||
        fName.toLowerCase().endsWith('.rtf') ||
        fName.toLowerCase().endsWith('.md');

      if (isScript || fType === 'SCRIPT_DOCUMENT' || fType === 'Script Documents') {
        seenKeys.add(uniqueKey);
        scriptDocs.push({
          id: file.id || Math.random().toString(),
          name: fName,
          url: rawUrl,
          fileType: fType,
          fileSize: file.fileSize || file.size,
          uploadedBy: file.uploadedBy,
          createdAt: file.createdAt,
        });
      }
    };

    // 1. Files from project.files
    if (Array.isArray(project.files)) {
      project.files.forEach(checkAndAddFile);
    }
    // 2. Files from linked calendarEvent.files
    if (project.calendarEvent && Array.isArray(project.calendarEvent.files)) {
      project.calendarEvent.files.forEach(checkAndAddFile);
    }
    // 3. Extra fetched files from backend vault
    if (Array.isArray(extraFiles)) {
      extraFiles.forEach(checkAndAddFile);
    }

    // 4. Structured Scripts & Screenplay from notes, caption, productionNotes, or scripts array
    const extractedScripts = extractEventScripts(project, project.name || 'Shooting Script');
    if (extractedScripts && extractedScripts.length > 0) {
      extractedScripts.forEach((sc, idx) => {
        const cleanTitle = sc.title ? sc.title.replace(/[/\\?%*:|"<>]/g, '_') : `Script_${idx + 1}`;
        const scName = cleanTitle.toLowerCase().endsWith('.txt') ? cleanTitle : `${cleanTitle}.txt`;
        const uniqueKey = `text-script-${project.id || 'proj'}-${sc.id || idx}`;
        if (!seenKeys.has(uniqueKey)) {
          seenKeys.add(uniqueKey);
          scriptDocs.push({
            id: uniqueKey,
            name: scName,
            fileType: 'text/plain',
            scriptText: formatSingleScript(sc, idx, extractedScripts.length),
            uploadedBy: project.createdBy || project.calendarEvent?.createdBy || { name: 'Marketing / Media Lead', role: 'MANAGER' },
            createdAt: sc.createdAt || project.createdAt || new Date().toISOString(),
          });
        }
      });
    }

    return scriptDocs;
  };

  // Load files when opening a project review
  const loadProjectFiles = async (project: any) => {
    if (!project?.id) return;
    try {
      setLoadingFiles(true);
      const res = await fetchApi(`/files/project/${project.id}`).catch(() => null);
      const allFiles = [
        ...(res?.allFiles || []),
        ...(project.files || []),
        ...(project.calendarEvent?.files || []),
      ];
      const extracted = extractScriptDocs(project, allFiles);
      setReviewingProjectFiles(extracted);
    } catch {
      setReviewingProjectFiles(extractScriptDocs(project));
    } finally {
      setLoadingFiles(false);
    }
  };

  // Filtered shoot projects queue (Only converted to tasks)
  const convertedProjects = projects.filter((p) => {
    const isConverted =
      (Array.isArray(p.tasks) && p.tasks.length > 0) ||
      (typeof p._count?.tasks === 'number' && p._count.tasks > 0) ||
      p.status === 'TASK_ASSIGNED' ||
      p.status === 'IN_PRODUCTION' ||
      p.status === 'OPERATIONAL' ||
      p.calendarEvent?.status === 'TASK_ASSIGNED' ||
      p.calendarEvent?.status === 'IN_PRODUCTION' ||
      p.calendarEvent?.status === 'OPERATIONAL';

    return Boolean(isConverted);
  });

  const filteredProjects = convertedProjects.filter((p) => {
    // Search match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = p.name?.toLowerCase().includes(q);
      const matchCode = p.projectId?.toLowerCase().includes(q);
      const matchClient = p.client?.name?.toLowerCase().includes(q);
      const matchBrand = p.brand?.name?.toLowerCase().includes(q);
      const matchProduct = p.product?.name?.toLowerCase().includes(q);
      const matchLocation = p.shootLocation?.toLowerCase().includes(q);
      const matchTaskTitle = Array.isArray(p.tasks) && p.tasks.some((t: any) => t.title?.toLowerCase().includes(q));

      if (!matchName && !matchCode && !matchClient && !matchBrand && !matchProduct && !matchLocation && !matchTaskTitle) {
        return false;
      }
    }

    // Type match
    if (typeFilter !== 'ALL' && p.shootType !== typeFilter) {
      return false;
    }

    // Allocation status filter
    const hasAllocations =
      (Array.isArray(p.equipmentReservations) && p.equipmentReservations.length > 0) ||
      (Array.isArray(p.equipmentRequests) && p.equipmentRequests.some((r: any) => r.status === 'APPROVED' || r.status === 'ISSUED'));

    if (allocationFilter === 'PENDING' && hasAllocations) return false;
    if (allocationFilter === 'ALLOCATED' && !hasAllocations) return false;

    return true;
  });

  // Open project review modal
  const handleOpenReview = (project: any) => {
    setReviewingProject(project);
    setShowAllocForm(false);
    loadProjectFiles(project);

    // Also fetch fresh project instance with full relations
    fetchApi(`/projects/${project.id}`)
      .then((fullProj) => {
        if (fullProj && fullProj.id) {
          setReviewingProject(fullProj);
          loadProjectFiles(fullProj);
        }
      })
      .catch(() => {});

    const shootDateStr = project.shootDate
      ? new Date(project.shootDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    const returnDateStr = project.shootDate
      ? new Date(new Date(project.shootDate).getTime() + 86400000).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    setAllocStartDate(shootDateStr);
    setAllocEndDate(returnDateStr);
    setSelectedEquipmentId('');
    setSelectedStaffId(project.assignedTeam?.[0]?.userId || '');
    setAllocPurpose(`Equipment for ${project.name}`);
    setAllocRemarks('');
    setAllocAccessories('');
  };

  // Submit direct allocation
  const handleSubmitAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipmentId || !reviewingProject) {
      alert('Please select an equipment item to allocate.');
      return;
    }
    if (!allocEndDate) {
      alert('Please specify an expected return date.');
      return;
    }

    setSubmittingAlloc(true);
    try {
      await fetchApi('/equipment/allocate', {
        method: 'POST',
        body: JSON.stringify({
          equipmentId: selectedEquipmentId,
          projectId: reviewingProject.id,
          employeeId: selectedStaffId || user?.id,
          startDate: allocStartDate,
          expectedReturnDate: allocEndDate,
          purpose: allocPurpose,
          remarks: allocRemarks,
          accessoriesIncluded: allocAccessories,
        }),
      });

      alert('Equipment allocated successfully to the project!');
      setShowAllocForm(false);
      setSelectedEquipmentId('');
      await loadData();
    } catch (err: any) {
      // Fallback to reserve
      try {
        await fetchApi(`/equipment/${selectedEquipmentId}/reserve`, {
          method: 'POST',
          body: JSON.stringify({
            projectId: reviewingProject.id,
            startDate: allocStartDate,
            endDate: allocEndDate,
          }),
        });
        alert('Equipment reserved successfully for project!');
        setShowAllocForm(false);
        setSelectedEquipmentId('');
        await loadData();
      } catch (reserveErr: any) {
        alert(reserveErr.message || err.message || 'Failed to allocate equipment.');
      }
    } finally {
      setSubmittingAlloc(false);
    }
  };

  // Cancel / Delete Reservation
  const handleCancelReservation = async (resId: string) => {
    if (!confirm('Are you sure you want to remove this equipment allocation?')) return;
    try {
      await fetchApi(`/equipment/reservations/${resId}`, { method: 'DELETE' });
      alert('Equipment allocation removed.');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to remove allocation.');
    }
  };

  // Review pending request
  const handleReviewRequest = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await fetchApi(`/equipment/requests/${requestId}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reviewNotes: `Reviewed by Technical Manager ${user?.name || ''}` }),
      });
      alert(`Equipment request ${status.toLowerCase()} successfully.`);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to review request.');
    }
  };

  // Available equipment filtered by category
  const availableEquipment = equipmentList.filter((eq) => {
    if (equipmentCategoryFilter !== 'ALL' && eq.category !== equipmentCategoryFilter) {
      return false;
    }
    return true;
  });

  const equipmentCategories = Array.from(new Set(equipmentList.map((e) => e.category).filter(Boolean)));

  // Reviewing project data bindings
  const scriptDocs = extractScriptDocs(reviewingProject, reviewingProjectFiles);
  const allocatedReservations = reviewingProject && Array.isArray(reviewingProject.equipmentReservations)
    ? reviewingProject.equipmentReservations
    : [];
  const equipmentRequests = reviewingProject && Array.isArray(reviewingProject.equipmentRequests)
    ? reviewingProject.equipmentRequests
    : [];
  const linkedTasks = reviewingProject && Array.isArray(reviewingProject.tasks) ? reviewingProject.tasks : [];

  return (
    <RoleGuard>
      <div className="space-y-6 text-xs p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Top Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-xl text-cyan-600">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Projects to Assign Equipment
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadData}
              disabled={refreshing}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 shadow-xs transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh Queue
            </button>
            <Link
              href="/equipment"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-300 transition"
            >
              Master Inventory
            </Link>
          </div>
        </div>

        {/* Minimal Search & Quick Filter Bar */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by task title, project code, client, brand, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Allocation Status Filter */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setAllocationFilter('ALL')}
                className={`px-3 py-1 rounded-lg transition ${
                  allocationFilter === 'ALL'
                    ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All Converted ({convertedProjects.length})
              </button>
              <button
                onClick={() => setAllocationFilter('PENDING')}
                className={`px-3 py-1 rounded-lg transition ${
                  allocationFilter === 'PENDING'
                    ? 'bg-amber-100 text-amber-800 font-bold shadow-xs border border-amber-300'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                ⏳ Needs Gear ({convertedProjects.filter((p) => !p.equipmentReservations || p.equipmentReservations.length === 0).length})
              </button>
              <button
                onClick={() => setAllocationFilter('ALLOCATED')}
                className={`px-3 py-1 rounded-lg transition ${
                  allocationFilter === 'ALLOCATED'
                    ? 'bg-emerald-100 text-emerald-800 font-bold shadow-xs border border-emerald-300'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                ✅ Allocated ({convertedProjects.filter((p) => p.equipmentReservations && p.equipmentReservations.length > 0).length})
              </button>
            </div>

            {/* Shoot Type Filter */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
              {(['ALL', 'INDOOR', 'OUTDOOR'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1 rounded-lg transition ${
                    typeFilter === t
                      ? 'bg-white text-cyan-700 font-bold shadow-xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t === 'ALL' ? 'All Types' : t === 'INDOOR' ? '🏢 Indoor' : '🌲 Outdoor'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Minimalist Projects Queue Grid */}
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-cyan-600 mb-3" />
            <p className="text-sm font-semibold text-slate-700">Loading converted projects queue...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-500 shadow-sm">
            <CheckSquare className="w-12 h-12 mx-auto text-slate-400 mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Converted Projects Found</h3>
            <p className="text-xs text-slate-500 mt-1">
              Shoot projects will appear in this queue as soon as they are converted into tasks by managers.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((proj) => {
              const docs = extractScriptDocs(proj);
              const totalScripts = docs.length;
              const allocatedCount = proj.equipmentReservations?.length || 0;
              const pendingRequestsCount = proj.equipmentRequests?.filter((r: any) => r.status === 'PENDING').length || 0;
              const tasks = Array.isArray(proj.tasks) ? proj.tasks : [];

              return (
                <div
                  key={proj.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-cyan-400 transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Header Chips */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {proj.projectId || 'PROJECT'}
                        </span>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            proj.shootType === 'INDOOR'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {proj.shootType === 'INDOOR' ? '🏢 Indoor' : '🌲 Outdoor'}
                        </span>
                      </div>

                      {allocatedCount > 0 ? (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" /> {allocatedCount} Gear Assigned
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          ⏳ Needs Equipment
                        </span>
                      )}
                    </div>

                    {/* Project Title */}
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-cyan-700 transition line-clamp-1">
                      {proj.name}
                    </h3>

                    {/* Client & Brand Info */}
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5">
                      {proj.client?.name && (
                        <span className="flex items-center gap-1 truncate max-w-[140px]">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          {proj.client.name}
                        </span>
                      )}
                      {proj.brand?.name && (
                        <span className="flex items-center gap-1 truncate max-w-[140px]">
                          <BookmarkCheck className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          {proj.brand.name}
                        </span>
                      )}
                    </div>

                    {/* Converted Task Info Banner */}
                    {tasks.length > 0 && (
                      <div className="mt-3 p-2 bg-cyan-50/70 border border-cyan-200/80 rounded-xl text-[11px] text-cyan-900 flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5 text-cyan-600 flex-shrink-0" />
                        <span className="font-bold truncate">
                          Task: {tasks[0].title}
                        </span>
                        {tasks.length > 1 && (
                          <span className="text-[10px] font-semibold text-cyan-700 bg-white px-1 rounded border border-cyan-200 flex-shrink-0">
                            +{tasks.length - 1} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Logistics metadata */}
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-600">
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">Shoot Date</span>
                        <div className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-cyan-600" />
                          {proj.shootDate
                            ? new Date(proj.shootDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'Not set'}
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">Call / Wrap</span>
                        <div className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          {proj.reportingTime || '09:00 AM'} - {proj.wrapTime || '06:00 PM'}
                        </div>
                      </div>
                    </div>

                    {/* Scripts & Requests Badges */}
                    <div className="flex items-center gap-2 mt-3 text-[11px]">
                      {totalScripts > 0 ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-bold">
                          <FileText className="w-3 h-3 text-purple-600" /> {totalScripts} Script Document{totalScripts > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">No scripts attached</span>
                      )}

                      {pendingRequestsCount > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                          <AlertCircle className="w-3 h-3 text-amber-600" /> {pendingRequestsCount} Request
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Primary Review Action */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium">
                      Location: <strong className="text-slate-700">{proj.shootLocation || proj.indoorDetails?.studioName || 'Studio Floor'}</strong>
                    </span>

                    <button
                      onClick={() => handleOpenReview(proj)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-sm transition group-hover:scale-105"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Review & Assign
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* COMPREHENSIVE PROJECT REVIEW & EQUIPMENT ALLOCATION MODAL DIALOG */}
        {reviewingProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl my-8 overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
              {/* Modal Top Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-cyan-100 text-cyan-700 rounded-xl">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                        {reviewingProject.projectId || 'PROJECT CODE'}
                      </span>
                      <h2 className="font-bold text-slate-900 text-lg">
                        {reviewingProject.name}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Technical Review & Equipment Allocation Workspace
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/projects/${reviewingProject.id}`}
                    target="_blank"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 transition shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Full Project
                  </Link>
                  <button
                    onClick={() => setReviewingProject(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body Scrollable Content */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                {/* 1. Converted Task Overview Banner */}
                {linkedTasks.length > 0 && (
                  <div className="bg-cyan-50/70 border border-cyan-200 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-900 flex items-center gap-1.5">
                        <CheckSquare className="w-4 h-4 text-cyan-600" />
                        Converted Shoot Tasks ({linkedTasks.length})
                      </h4>
                      <span className="text-[11px] font-bold text-cyan-800 bg-white px-2 py-0.5 rounded border border-cyan-200">
                        Ready for Equipment Assignment
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {linkedTasks.map((t: any) => (
                        <div key={t.id} className="p-3 bg-white border border-cyan-200/80 rounded-xl space-y-1 shadow-xs">
                          <div className="font-bold text-slate-900 text-xs">{t.title}</div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>Status: <strong className="text-slate-700">{t.status || 'IN_PROGRESS'}</strong></span>
                            <span>Due: <strong className="text-slate-700">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'}</strong></span>
                          </div>
                          {t.assignedEmployees && t.assignedEmployees.length > 0 && (
                            <div className="text-[10px] text-slate-500 truncate">
                              Assigned Staff: {t.assignedEmployees.map((e: any) => e.user?.name || e.userId).join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Complete Project Logistics Details */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-cyan-600" />
                      Complete Project Logistics & Info
                    </h4>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          reviewingProject.shootType === 'INDOOR'
                            ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {reviewingProject.shootType === 'INDOOR' ? '🏢 Indoor Studio' : '🌲 Outdoor Location'}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        {reviewingProject.status || 'ACTIVE'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Client & Brand</span>
                      <strong className="text-slate-900 block truncate">{reviewingProject.client?.name || 'N/A'}</strong>
                      <span className="text-slate-500 text-[11px]">{reviewingProject.brand?.name || 'N/A'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Shoot Date & Timing</span>
                      <strong className="text-slate-900 block">
                        {reviewingProject.shootDate
                          ? new Date(reviewingProject.shootDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'Not set'}
                      </strong>
                      <span className="text-slate-500 text-[11px]">
                        Call: {reviewingProject.reportingTime || '09:00 AM'} | Wrap: {reviewingProject.wrapTime || '06:00 PM'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Location</span>
                      <strong className="text-slate-900 block truncate">
                        {reviewingProject.shootLocation || reviewingProject.indoorDetails?.studioName || 'Main Studio'}
                      </strong>
                      <span className="text-slate-500 text-[11px] truncate block">
                        {reviewingProject.locationAddress || 'Studio Floor'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Assigned Crew</span>
                      <strong className="text-slate-900 block">
                        {reviewingProject.assignedTeam?.length || 0} Members
                      </strong>
                      <span className="text-slate-500 text-[11px] truncate block">
                        {reviewingProject.assignedTeam?.map((t: any) => t.user?.name).filter(Boolean).join(', ') || 'No crew'}
                      </span>
                    </div>
                  </div>

                  {/* Indoor/Outdoor specifics */}
                  {reviewingProject.shootType === 'INDOOR' && reviewingProject.indoorDetails && (
                    <div className="mt-2 p-2.5 bg-indigo-50/80 border border-indigo-200 rounded-lg text-xs text-indigo-900 flex flex-wrap gap-4">
                      <span><strong>Floor:</strong> {reviewingProject.indoorDetails.floorNumber || 'Ground'}</span>
                      <span><strong>Room / Stage:</strong> {reviewingProject.indoorDetails.roomNumber || 'Main Stage'}</span>
                      <span><strong>Studio Booking:</strong> {reviewingProject.indoorDetails.bookingStatus || 'CONFIRMED'}</span>
                    </div>
                  )}

                  {reviewingProject.shootType === 'OUTDOOR' && reviewingProject.outdoorDetails && (
                    <div className="mt-2 p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex flex-wrap gap-4">
                      <span><strong>Weather Forecast:</strong> {reviewingProject.outdoorDetails.weatherForecast || 'Sunny / Clear'}</span>
                      <span><strong>Rain Backup:</strong> {reviewingProject.outdoorDetails.rainContingencyPlan || 'Covered area available'}</span>
                      <span><strong>Permit:</strong> {reviewingProject.outdoorDetails.permitRequired ? 'Permit Acquired' : 'Not required'}</span>
                    </div>
                  )}
                </div>

                {/* 3. Attached Script Documents Section */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-purple-50 text-purple-700 rounded-lg border border-purple-200">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">
                          Attached Script Documents & Materials ({scriptDocs.length})
                        </h4>
                        <p className="text-xs text-slate-500">
                          Review script documents exactly as uploaded by Marketing / Media Managers.
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                      {scriptDocs.length} Document{scriptDocs.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {/* Script Files Document List */}
                  {loadingFiles ? (
                    <div className="py-6 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-purple-600 mb-1" />
                      <p className="text-xs">Loading script documents...</p>
                    </div>
                  ) : scriptDocs.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {scriptDocs.map((doc) => {
                        const isPdf = doc.name.toLowerCase().endsWith('.pdf');
                        const isDoc = doc.name.toLowerCase().endsWith('.doc') || doc.name.toLowerCase().endsWith('.docx');
                        const isTxt = doc.name.toLowerCase().endsWith('.txt') || doc.name.toLowerCase().endsWith('.rtf') || Boolean(doc.scriptText);

                        return (
                          <div
                            key={doc.id}
                            className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 hover:border-purple-300 transition"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2.5 rounded-lg bg-purple-100 text-purple-700 flex-shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <h5 className="text-xs font-bold text-slate-900 truncate">{doc.name}</h5>
                                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                  {doc.uploadedBy?.name
                                    ? `Uploaded by ${doc.uploadedBy.name} (${doc.uploadedBy.role || 'Manager'})`
                                    : 'Attached Script'}
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                                  <span className="uppercase px-1.5 py-0.5 bg-slate-200 rounded text-slate-700 font-mono font-bold text-[9px]">
                                    {isPdf ? 'PDF' : isDoc ? 'DOCX' : isTxt ? 'TXT' : 'DOCUMENT'}
                                  </span>
                                  {doc.fileSize && (
                                    <span>{(doc.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                                  )}
                                  {doc.createdAt && (
                                    <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                onClick={() => setPreviewScriptDoc(doc)}
                                className="px-3 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-bold transition flex items-center gap-1 shadow-xs"
                              >
                                <Eye className="w-3.5 h-3.5" /> View
                              </button>
                              {doc.url ? (
                                <a
                                  href={resolveFileUrl(doc.url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download
                                  className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition shadow-xs"
                                  title="Download Document"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              ) : doc.scriptText ? (
                                <button
                                  onClick={() => {
                                    const blob = new Blob([doc.scriptText || ''], { type: 'text/plain' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = doc.name;
                                    a.click();
                                  }}
                                  className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition shadow-xs"
                                  title="Download Text File"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                      <FileText className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                      <p className="text-xs font-bold text-slate-600">No script document uploaded for this project.</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Marketing or Media Managers can upload script documents from the event or project session.</p>
                    </div>
                  )}
                </div>

                {/* 4. Equipment Allocation & Assignment Workspace */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-cyan-50 text-cyan-700 rounded-lg border border-cyan-200">
                        <Camera className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">
                          Assigned Equipment & Gear ({allocatedReservations.length})
                        </h4>
                        <p className="text-xs text-slate-500">
                          Equipment allocated and reserved for this shoot project.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowAllocForm(!showAllocForm)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-sm transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {showAllocForm ? 'Hide Form' : 'Assign Gear'}
                    </button>
                  </div>

                  {/* Inline Direct Equipment Assignment Form */}
                  {showAllocForm && (
                    <form onSubmit={handleSubmitAllocation} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1">
                          <Plus className="w-3.5 h-3.5 text-cyan-600" />
                          Allocate Equipment Item to Project
                        </h5>
                        <button
                          type="button"
                          onClick={() => setShowAllocForm(false)}
                          className="text-xs text-slate-400 hover:text-slate-700"
                        >
                          Cancel
                        </button>
                      </div>

                      {/* Category Filter */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                          Filter by Gear Category
                        </label>
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => setEquipmentCategoryFilter('ALL')}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                              equipmentCategoryFilter === 'ALL'
                                ? 'bg-cyan-600 text-white'
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            }`}
                          >
                            All
                          </button>
                          {equipmentCategories.map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setEquipmentCategoryFilter(cat)}
                              className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                                equipmentCategoryFilter === cat
                                  ? 'bg-cyan-600 text-white'
                                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Equipment Item Picker */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                          Select Equipment Item *
                        </label>
                        <select
                          value={selectedEquipmentId}
                          onChange={(e) => setSelectedEquipmentId(e.target.value)}
                          required
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                        >
                          <option value="">-- Choose Gear from Inventory --</option>
                          {availableEquipment.map((eq) => (
                            <option key={eq.id} value={eq.id}>
                              [{eq.category || 'GEAR'}] {eq.name} - Model: {eq.model || 'N/A'} (S/N: {eq.serialNumber || 'N/A'})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Assign to crew & dates */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                            Assign To Crew Member
                          </label>
                          <select
                            value={selectedStaffId}
                            onChange={(e) => setSelectedStaffId(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                          >
                            <option value="">Project General Allocation</option>
                            {reviewingProject.assignedTeam?.map((tm: any) => (
                              <option key={tm.user?.id || tm.userId} value={tm.user?.id || tm.userId}>
                                {tm.user?.name} ({tm.role || 'Crew'})
                              </option>
                            ))}
                            {staffList.map((st) => (
                              <option key={st.id} value={st.id}>
                                {st.name} ({st.role})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                            Checkout Date *
                          </label>
                          <input
                            type="date"
                            value={allocStartDate}
                            onChange={(e) => setAllocStartDate(e.target.value)}
                            required
                            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                            Return Date *
                          </label>
                          <input
                            type="date"
                            value={allocEndDate}
                            onChange={(e) => setAllocEndDate(e.target.value)}
                            required
                            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Accessories / Notes */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                          Accessories Included / Remarks
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 2x V-Mount Batteries, 128GB SD Card, Lens Hood"
                          value={allocAccessories}
                          onChange={(e) => setAllocAccessories(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                        />
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={submittingAlloc}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-sm transition disabled:opacity-50"
                        >
                          {submittingAlloc ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              Allocating...
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Confirm Equipment Allocation
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Pending Crew Requests */}
                  {equipmentRequests.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Pending Equipment Requests ({equipmentRequests.length})
                      </div>
                      <div className="space-y-1.5">
                        {equipmentRequests.map((req: any) => (
                          <div key={req.id} className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
                            <div>
                              <strong className="text-slate-900">{req.equipment?.name}</strong> - Req by: {req.requestedBy?.name}
                              <div className="text-[11px] text-slate-500">Status: {req.status} | Date: {new Date(req.requiredDate).toLocaleDateString()}</div>
                            </div>
                            {req.status === 'PENDING' && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleReviewRequest(req.id, 'APPROVED')}
                                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px]"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReviewRequest(req.id, 'REJECTED')}
                                  className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px]"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Allocated Gear Cards */}
                  {allocatedReservations.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-xs font-bold text-slate-600">No equipment assigned yet for this project.</p>
                      <button
                        onClick={() => setShowAllocForm(true)}
                        className="mt-2 text-xs font-bold text-cyan-600 hover:underline inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Click here to assign gear
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {allocatedReservations.map((res: any) => {
                        const eq = res.equipment;
                        if (!eq) return null;

                        return (
                          <div
                            key={res.id}
                            className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-3 hover:border-cyan-300 transition"
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <div className="p-2 rounded-lg bg-cyan-100 text-cyan-700 flex-shrink-0">
                                <Camera className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <h5 className="text-xs font-bold text-slate-900 truncate">{eq.name}</h5>
                                <div className="text-[11px] text-slate-500">
                                  Model: {eq.model || 'Standard'} | S/N: {eq.serialNumber || 'N/A'}
                                </div>
                                <div className="flex items-center gap-1.5 mt-1 text-[10px]">
                                  <span className="px-1.5 py-0.5 rounded bg-slate-200 font-bold text-slate-700">
                                    {eq.category || 'GEAR'}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                                    RESERVED
                                  </span>
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => handleCancelReservation(res.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-white transition"
                              title="Remove Allocation"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
                <div className="text-xs text-slate-500">
                  Total Gear Assigned: <strong className="text-slate-800">{allocatedReservations.length} items</strong>
                </div>

                <button
                  onClick={() => setReviewingProject(null)}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
                >
                  Done & Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Script Document Viewer Preview */}
        {previewScriptDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm md:text-base truncate max-w-md">
                      {previewScriptDoc.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {previewScriptDoc.uploadedBy?.name ? `Uploaded by ${previewScriptDoc.uploadedBy.name}` : 'Project Script Material'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {previewScriptDoc.url ? (
                    <a
                      href={resolveFileUrl(previewScriptDoc.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Original
                    </a>
                  ) : previewScriptDoc.scriptText ? (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(previewScriptDoc.scriptText || '');
                        setCopiedText(true);
                        setTimeout(() => setCopiedText(false), 2000);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-xs"
                    >
                      {copiedText ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedText ? 'Copied' : 'Copy Text'}
                    </button>
                  ) : null}
                  <button
                    onClick={() => setPreviewScriptDoc(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-slate-100 p-2 overflow-hidden flex items-center justify-center">
                {previewScriptDoc.scriptText ? (
                  <div className="w-full h-full p-4 bg-white rounded-lg border border-slate-300 overflow-y-auto font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {previewScriptDoc.scriptText}
                  </div>
                ) : previewScriptDoc.name.toLowerCase().endsWith('.pdf') ? (
                  <iframe
                    src={resolveFileUrl(previewScriptDoc.url)}
                    className="w-full h-full rounded-lg border border-slate-300 bg-white"
                    title="PDF Script Viewer"
                  />
                ) : (
                  <div className="text-center p-8 max-w-md text-slate-600">
                    <FileText className="w-16 h-16 mx-auto text-purple-600 mb-3" />
                    <h4 className="text-base font-bold text-slate-900">{previewScriptDoc.name}</h4>
                    <p className="text-xs text-slate-500 mt-2">
                      Document preview ready. Click below to download or view the full document in your native viewer.
                    </p>
                    {previewScriptDoc.url && (
                      <a
                        href={resolveFileUrl(previewScriptDoc.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow-sm"
                      >
                        <Download className="w-4 h-4" />
                        Download Document ({previewScriptDoc.fileSize ? `${(previewScriptDoc.fileSize / 1024 / 1024).toFixed(2)} MB` : 'File'})
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
