import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalType, ApprovalStatus, ProjectStatus, ClientDecision, TaskStatus } from '../../common/enums';
import { isTaskWithBrand } from '../tasks/tasks.service';

@Injectable()
export class ApprovalsService {
  constructor(private prisma: PrismaService) {}

  async getApprovalQueue() {
    const taskIncludes = {
      include: {
        assignedEmployees: { include: { user: { select: { id: true, name: true, role: true } } } },
        deliverableHistory: { include: { user: { select: { id: true, name: true, role: true } } }, orderBy: { version: 'desc' as const } },
      },
    };

    const techQueue = await this.prisma.shootProject.findMany({
      where: { status: ProjectStatus.WAITING_FOR_TECHNICAL_REVIEW },
      include: {
        client: true,
        brand: true,
        files: true,
        tasks: taskIncludes,
        assignedTeam: { include: { user: true } },
      },
    });

    const grTechQueue = await this.prisma.graphicRequirement.findMany({
      where: {
        OR: [
          { status: 'WAITING_FOR_TECHNICAL_REVIEW' },
          { status: 'TECHNICAL_REVIEW' },
          { preTechnicalReviewStatus: 'WAITING_FOR_TECHNICAL_REVIEW' },
          { tasks: { some: { status: 'WAITING_FOR_TECHNICAL_REVIEW' } } },
        ],
      },
      include: {
        client: true,
        brand: true,
        files: {
          include: { uploadedBy: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
        deliverables: {
          include: {
            createdBy: { select: { id: true, name: true, role: true } },
            assignedStaff: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        calendarEvent: {
          include: { createdBy: { select: { id: true, name: true, role: true } } },
        },
        tasks: taskIncludes,
      },
    });

    const mediaQueue = await this.prisma.shootProject.findMany({
      where: { status: ProjectStatus.WAITING_FOR_MEDIA_REVIEW },
      include: {
        client: true,
        brand: true,
        files: true,
        tasks: taskIncludes,
        assignedTeam: { include: { user: true } },
      },
    });

    const grMediaQueue = await this.prisma.graphicRequirement.findMany({
      where: {
        OR: [
          { status: 'WAITING_FOR_MEDIA_REVIEW' },
          { status: 'MEDIA_MANAGER_REVIEW' },
          { tasks: { some: { status: 'WAITING_FOR_MEDIA_REVIEW' } } },
        ],
      },
      include: {
        client: true,
        brand: true,
        files: {
          include: { uploadedBy: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
        deliverables: {
          include: {
            createdBy: { select: { id: true, name: true, role: true } },
            assignedStaff: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        calendarEvent: {
          include: { createdBy: { select: { id: true, name: true, role: true } } },
        },
        tasks: taskIncludes,
      },
    });

    const taskTechQueue = await this.prisma.task.findMany({
      where: { status: 'WAITING_FOR_TECHNICAL_REVIEW' },
      include: {
        client: true,
        brand: true,
        project: {
          include: {
            files: true,
            scripts: {
              include: {
                clips: { orderBy: { order: 'asc' } },
              },
            },
          },
        },
        graphicRequirement: true,
        projectScript: {
          include: {
            clips: { orderBy: { order: 'asc' } },
          },
        },
        assignedEmployees: { include: { user: { select: { id: true, name: true, role: true } } } },
        deliverableHistory: { include: { user: { select: { id: true, name: true, role: true } } }, orderBy: { version: 'desc' as const } },
      },
    });

    const taskMediaQueue = await this.prisma.task.findMany({
      where: { status: 'WAITING_FOR_MEDIA_REVIEW' },
      include: {
        client: true,
        brand: true,
        project: {
          include: {
            files: true,
            scripts: {
              include: {
                clips: { orderBy: { order: 'asc' } },
              },
            },
          },
        },
        graphicRequirement: true,
        projectScript: {
          include: {
            clips: { orderBy: { order: 'asc' } },
          },
        },
        assignedEmployees: { include: { user: { select: { id: true, name: true, role: true } } } },
        deliverableHistory: { include: { user: { select: { id: true, name: true, role: true } } }, orderBy: { version: 'desc' as const } },
      },
    });

    const taskMarketingQueue = await this.prisma.task.findMany({
      where: {
        OR: [
          {
            status: {
              in: [
                'WAITING_FOR_MARKETING_APPROVAL',
                'WAITING_FOR_MARKETING_MANAGER_REVIEW',
                'PENDING_MARKETING_APPROVAL',
              ],
            },
          },
          {
            taskType: 'VIDEO_EDITING',
            mediaManagerApproved: true,
            marketingManagerApproved: false,
            status: { notIn: ['CANCELLED'] },
          },
        ],
      },
      include: {
        client: true,
        brand: true,
        project: {
          include: {
            files: true,
            scripts: {
              include: {
                clips: { orderBy: { order: 'asc' } },
              },
            },
          },
        },
        graphicRequirement: true,
        projectScript: {
          include: {
            clips: { orderBy: { order: 'asc' } },
          },
        },
        assignedEmployees: { include: { user: { select: { id: true, name: true, role: true } } } },
        deliverableHistory: { include: { user: { select: { id: true, name: true, role: true } } }, orderBy: { version: 'desc' as const } },
      },
    });

    const clientQueue = await this.prisma.shootProject.findMany({
      where: { status: ProjectStatus.WAITING_FOR_CLIENT_CONFIRMATION },
      include: { client: true, brand: true, files: true, tasks: taskIncludes },
    });

    const revisionQueue = await this.prisma.shootProject.findMany({
      where: { status: ProjectStatus.CLIENT_REVISION_REQUESTED },
      include: { client: true, brand: true, revisions: true, tasks: taskIncludes },
    });

    // Map GraphicRequirements as queue items
    const mappedGrTech = grTechQueue.map((gr) => ({
      id: gr.id,
      projectId: gr.requirementId,
      name: gr.name,
      client: gr.client,
      brand: gr.brand,
      status: gr.status,
      files: gr.files,
      deliverables: gr.deliverables,
      calendarEvent: gr.calendarEvent,
      creativePreviewUrl: gr.calendarEvent?.creativePreviewUrl,
      creativeAssetName: gr.calendarEvent?.title || gr.files?.[0]?.fileName || 'Creative Visual Asset',
      tasks: gr.tasks,
      isGraphicRequirement: true,
    }));

    const mappedGrMedia = grMediaQueue.map((gr) => ({
      id: gr.id,
      projectId: gr.requirementId,
      name: gr.name,
      client: gr.client,
      brand: gr.brand,
      status: gr.status,
      files: gr.files,
      deliverables: gr.deliverables,
      calendarEvent: gr.calendarEvent,
      creativePreviewUrl: gr.calendarEvent?.creativePreviewUrl,
      creativeAssetName: gr.calendarEvent?.title || gr.files?.[0]?.fileName || 'Creative Visual Asset',
      tasks: gr.tasks,
      isGraphicRequirement: true,
    }));

    // Helper to resolve script details from project or notes if task.projectScript is null
    const resolveTaskScriptData = (t: any) => {
      let resolvedScript = t.projectScript || null;
      let resolvedClips = t.projectScript?.clips || [];
      let resolvedClipCode = t.clipCode || t.projectScript?.clipCode || '';

      const projectScriptList = t.project?.scripts || t.project?.projectScripts || [];
      if (!resolvedScript && Array.isArray(projectScriptList) && projectScriptList.length > 0) {
        const matched = projectScriptList.find((ps: any) =>
          (t.projectScriptId && ps.id === t.projectScriptId) ||
          (t.scriptId && ps.id === t.scriptId) ||
          (t.clipCode && ps.clipCode === t.clipCode) ||
          (ps.name && t.title && t.title.toLowerCase().includes(ps.name.toLowerCase()))
        ) || (projectScriptList.length === 1 ? projectScriptList[0] : null);

        if (matched) {
          resolvedScript = matched;
          resolvedClips = matched.clips || [];
          resolvedClipCode = resolvedClipCode || matched.clipCode || '';
        }
      }

      if (!resolvedScript && t.project?.notes) {
        try {
          const parsedNotes = typeof t.project.notes === 'string' ? JSON.parse(t.project.notes) : t.project.notes;
          const scriptList = Array.isArray(parsedNotes) ? parsedNotes : parsedNotes?.scripts || [];
          const matchedFromNotes = scriptList.find((s: any) =>
            (t.projectScriptId && s.id === t.projectScriptId) ||
            (t.scriptId && s.id === t.scriptId) ||
            (t.clipCode && (s.clipCode === t.clipCode || s.clipCodes?.includes(t.clipCode))) ||
            (s.title && t.title && t.title.toLowerCase().includes(s.title.toLowerCase()))
          ) || (scriptList.length === 1 ? scriptList[0] : null);

          if (matchedFromNotes) {
            resolvedScript = {
              id: matchedFromNotes.id,
              name: matchedFromNotes.title || matchedFromNotes.name || t.title,
              title: matchedFromNotes.title || matchedFromNotes.name || t.title,
              description: matchedFromNotes.description || matchedFromNotes.scriptText || matchedFromNotes.body || '',
              body: matchedFromNotes.description || matchedFromNotes.scriptText || matchedFromNotes.body || '',
              clipCode: matchedFromNotes.clipCode || t.clipCode || '',
              clips: matchedFromNotes.clips || [],
            };
            resolvedClips = matchedFromNotes.clips || [];
            resolvedClipCode = resolvedClipCode || matchedFromNotes.clipCode || '';
          }
        } catch {
          // ignore
        }
      }

      return {
        projectScript: resolvedScript,
        clips: resolvedClips,
        clipCode: resolvedClipCode,
      };
    };

    // Map Standalone Tasks as queue items
    const mappedTaskTech = taskTechQueue.map((t: any) => {
      const { projectScript, clips, clipCode } = resolveTaskScriptData(t);
      return {
        id: t.id,
        projectId: t.taskId,
        taskId: t.taskId,
        name: t.title,
        title: t.title,
        description: t.description,
        taskType: t.taskType,
        client: t.client,
        brand: t.brand,
        project: t.project,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        scriptId: t.scriptId,
        projectScriptId: t.projectScriptId,
        projectScript,
        clipCode,
        clips,
        assignedEmployees: t.assignedEmployees,
        tasks: [t],
        activeDeliverableUrl: t.activeDeliverableUrl,
        activeDeliverableFileName: t.activeDeliverableFileName,
        activeDeliverableVersion: t.activeDeliverableVersion,
        deliverableHistory: t.deliverableHistory,
        isStandaloneTask: true,
      };
    });

    const mappedTaskMedia = taskMediaQueue.map((t: any) => {
      const { projectScript, clips, clipCode } = resolveTaskScriptData(t);
      return {
        id: t.id,
        projectId: t.taskId,
        taskId: t.taskId,
        name: t.title,
        title: t.title,
        description: t.description,
        taskType: t.taskType,
        client: t.client,
        brand: t.brand,
        project: t.project,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        scriptId: t.scriptId,
        projectScriptId: t.projectScriptId,
        projectScript,
        clipCode,
        clips,
        assignedEmployees: t.assignedEmployees,
        tasks: [t],
        activeDeliverableUrl: t.activeDeliverableUrl,
        activeDeliverableFileName: t.activeDeliverableFileName,
        activeDeliverableVersion: t.activeDeliverableVersion,
        deliverableHistory: t.deliverableHistory,
        isStandaloneTask: true,
      };
    });

    const mappedTaskMarketing = taskMarketingQueue
      .filter((t: any) => isTaskWithBrand(t))
      .map((t: any) => {
        const { projectScript, clips, clipCode } = resolveTaskScriptData(t);
        return {
          id: t.id,
          projectId: t.taskId,
          taskId: t.taskId,
          name: t.title,
          title: t.title,
          description: t.description,
          taskType: t.taskType,
          client: t.client,
          brand: t.brand,
          project: t.project,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
          scriptId: t.scriptId,
          projectScriptId: t.projectScriptId,
          projectScript,
          clipCode,
          clips,
          assignedEmployees: t.assignedEmployees,
          tasks: [t],
          activeDeliverableUrl: t.activeDeliverableUrl,
          activeDeliverableFileName: t.activeDeliverableFileName,
          activeDeliverableVersion: t.activeDeliverableVersion,
          deliverableHistory: t.deliverableHistory,
          isStandaloneTask: true,
        };
      });

    return {
      technicalReviewQueue: [...techQueue, ...mappedGrTech, ...mappedTaskTech],
      mediaReviewQueue: [...mediaQueue, ...mappedGrMedia, ...mappedTaskMedia],
      marketingReviewQueue: [...mappedTaskMarketing],
      clientConfirmationQueue: [...clientQueue, ...mappedTaskMarketing],
      revisionQueue: revisionQueue,
    };
  }

  async findAll(status?: string, approvalType?: string, projectId?: string) {
    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (approvalType && approvalType !== 'ALL') {
      where.approvalType = approvalType;
    }
    if (projectId && projectId !== 'ALL') {
      where.projectId = projectId;
    }

    return this.prisma.approval.findMany({
      where,
      include: {
        project: { include: { client: true, brand: true } },
        reviewer: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { reviewedAt: 'desc' },
    });
  }

  async submitTechnicalReview(data: { projectId: string; status: 'APPROVED' | 'REJECTED'; remarks?: string }, reviewerId: string) {
    let project = await this.prisma.shootProject.findUnique({ where: { id: data.projectId } });
    let gReq = null;
    let task = null;

    if (!project) {
      gReq = await this.prisma.graphicRequirement.findUnique({ where: { id: data.projectId } });
    }
    if (!project && !gReq) {
      task = await this.prisma.task.findUnique({ where: { id: data.projectId } });
    }

    const targetId = project?.id || gReq?.id || task?.id;
    const targetEntity = task ? 'TASK' : gReq ? 'GRAPHIC_REQ' : 'PROJECT';
    const pendingApproval = await this.prisma.approval.findFirst({
      where: {
        OR: [
          { entityType: targetEntity, entityId: targetId, approvalType: ApprovalType.TECHNICAL_REVIEW, status: 'PENDING' },
          ...(gReq ? [{ graphicRequirementId: gReq.id, stage: 'TECHNICAL_REVIEW', status: 'PENDING' }] : []),
        ],
      },
    });

    let approval;
    if (pendingApproval) {
      approval = await this.prisma.approval.update({
        where: { id: pendingApproval.id },
        data: {
          reviewerId,
          status: data.status === 'APPROVED' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
          remarks: data.remarks || (data.status === 'APPROVED' ? 'Technical standards passed.' : 'Technical revisions required.'),
          reviewedAt: new Date(),
          graphicRequirementId: gReq ? gReq.id : pendingApproval.graphicRequirementId,
          returnedStatus: data.status === 'APPROVED' ? 'WAITING_FOR_MEDIA_REVIEW' : 'IN_PROGRESS',
        },
      });
    } else {
      approval = await this.prisma.approval.create({
        data: {
          entityType: targetEntity,
          entityId: targetId,
          graphicRequirementId: gReq ? gReq.id : null,
          projectId: project ? project.id : task?.projectId || gReq?.projectId || null,
          approvalType: ApprovalType.TECHNICAL_REVIEW,
          stage: 'TECHNICAL_REVIEW',
          round: gReq ? (gReq.technicalReviewRound || 1) : 1,
          version: gReq ? `v${gReq.technicalReviewRound || 1}` : 'v1',
          targetRole: 'TECHNICAL_MANAGER',
          requestedById: gReq?.createdById || null,
          reviewerId,
          status: data.status === 'APPROVED' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
          remarks: data.remarks || (data.status === 'APPROVED' ? 'Technical standards passed.' : 'Technical revisions required.'),
          returnedStatus: data.status === 'APPROVED' ? 'WAITING_FOR_MEDIA_REVIEW' : 'IN_PROGRESS',
          reviewedAt: new Date(),
        },
      });
    }

    if (project) {
      const newProjectStatus: ProjectStatus = data.status === 'APPROVED' 
        ? ProjectStatus.WAITING_FOR_MEDIA_REVIEW 
        : ProjectStatus.IN_PROGRESS;

      await this.prisma.shootProject.update({
        where: { id: project.id },
        data: { status: newProjectStatus },
      });
    }

    if (gReq) {
      const newGrStatus = data.status === 'APPROVED' ? 'WAITING_FOR_MEDIA_REVIEW' : 'IN_PROGRESS';
      await this.prisma.graphicRequirement.update({
        where: { id: gReq.id },
        data: {
          status: newGrStatus,
          technicalReviewApproved: data.status === 'APPROVED',
          preTechnicalReviewStatus: 'IN_PROGRESS',
          rejectionReason: data.status === 'REJECTED' ? (data.remarks || 'Technical revisions required.').trim() : null,
          rejectedAt: data.status === 'REJECTED' ? new Date() : null,
          remarks: data.status === 'REJECTED'
            ? `Technical Review Rejection Reason: ${(data.remarks || 'Technical revisions required.').trim()}`
            : gReq.remarks,
        },
      });

      // Log timeline and remark on gReq
      try {
        const reviewerUser = await this.prisma.user.findUnique({ where: { id: reviewerId }, select: { name: true } });
        const reviewerName = reviewerUser?.name || 'Technical Manager';

        await this.prisma.graphicRequirementTimeline.create({
          data: {
            graphicRequirementId: gReq.id,
            userId: reviewerId,
            event: data.status === 'APPROVED' ? 'TECHNICAL_REVIEW_APPROVED' : 'TECHNICAL_REVIEW_REJECTED',
            description: data.status === 'APPROVED'
              ? `Technical Review APPROVED by ${reviewerName}.${data.remarks ? ' Remarks: ' + data.remarks : ''}`
              : `Technical Review REJECTED by ${reviewerName}. Reason: ${data.remarks || 'Technical revisions required.'}`,
          },
        }).catch(() => null);

        await this.prisma.graphicRequirementRemark.create({
          data: {
            graphicRequirementId: gReq.id,
            userId: reviewerId,
            message: data.status === 'APPROVED'
              ? `✅ Technical Review APPROVED by ${reviewerName}. Forwarded for Level 2: Media Manager Review.`
              : `❌ Technical Review REJECTED by ${reviewerName}: ${data.remarks || 'Technical revisions required.'}. Returned to status: ${newGrStatus}`,
          },
        }).catch(() => null);
      } catch (err) {
        console.error('Failed to log gReq timeline/remark during tech review:', err);
      }
    }

    if (task) {
      const newTaskStatus = data.status === 'APPROVED' ? 'WAITING_FOR_MEDIA_REVIEW' : 'REVISION_REQUESTED';
      await this.prisma.task.update({
        where: { id: task.id },
        data: {
          status: newTaskStatus,
          technicalReviewApproved: data.status === 'APPROVED',
          mediaRevisionReason: data.status === 'REJECTED' ? (data.remarks || 'Technical revisions required.').trim() : null,
        },
      });

      if (data.status === 'REJECTED' && data.remarks) {
        await this.prisma.taskRemark.create({
          data: {
            taskId: task.id,
            userId: reviewerId,
            message: `Technical Review Rejection: ${data.remarks}`,
          },
        }).catch(() => null);

        // Notify assigned staff
        const assignments = await this.prisma.taskAssignment.findMany({
          where: { taskId: task.id },
          select: { userId: true },
        });
        for (const a of assignments) {
          await this.prisma.notification.create({
            data: {
              userId: a.userId,
              title: 'Technical Review Revision Requested',
              message: `Technical Manager requested revisions on task ${task.taskId}: "${data.remarks}"`,
              type: 'ALERT',
              category: 'APPROVAL',
              priority: 'HIGH',
              linkUrl: '/tasks',
              eventType: 'VIDEO_EDITING_REVISION_REQUESTED',
              entityType: 'TASK',
              entityId: task.id,
              entityCode: task.taskId,
              taskId: task.id,
              projectId: task.projectId,
            },
          }).catch(() => null);
        }
      }
    }

    if (data.status === 'REJECTED' && targetId && !task) {
      await this.prisma.task.updateMany({
        where: { OR: [{ id: targetId }, { projectId: targetId }, { graphicRequirementId: targetId }] },
        data: { status: 'IN_PROGRESS', technicalReviewApproved: false },
      }).catch(() => null);
    }

    // Log timeline event to all affected tasks
    try {
      const reviewerUser = await this.prisma.user.findUnique({ where: { id: reviewerId }, select: { name: true } });
      const reviewerName = reviewerUser?.name || 'Technical Manager';
      const desc = data.status === 'APPROVED'
        ? `Technical Review APPROVED by ${reviewerName}.${data.remarks ? ' Remarks: ' + data.remarks : ''}`
        : `Technical Review REJECTED by ${reviewerName}. Reason: ${data.remarks || 'Changes requested'}`;

      const affectedTaskIds: string[] = [];
      if (task) affectedTaskIds.push(task.id);
      if (gReq) {
        const gTasks = await this.prisma.task.findMany({ where: { graphicRequirementId: gReq.id }, select: { id: true } });
        affectedTaskIds.push(...gTasks.map((t) => t.id));
      }
      if (project) {
        const pTasks = await this.prisma.task.findMany({ where: { projectId: project.id }, select: { id: true } });
        affectedTaskIds.push(...pTasks.map((t) => t.id));
      }

      for (const tId of [...new Set(affectedTaskIds)]) {
        await this.prisma.taskTimeline.create({
          data: {
            taskId: tId,
            userId: reviewerId,
            event: data.status === 'APPROVED' ? 'STATUS_CHANGED' : 'REVISION_REQUESTED',
            description: desc,
          },
        }).catch(() => null);
      }
    } catch (e) {
      console.error('Failed to log technical review task timeline:', e);
    }

    if (data.status === 'APPROVED') {
      // Notify Media Managers that item passed Technical Review and is waiting for Media Manager Approval
      const mediaManagers = await this.prisma.user.findMany({
        where: { role: { in: ['MEDIA_MANAGER', 'ADMINISTRATOR', 'ADMIN'] }, status: 'ACTIVE' },
        select: { id: true },
      });
      if (mediaManagers.length > 0) {
        const entityLabel = task ? `Task ${task.taskId} ('${task.title}')` : project ? `Project "${project.name}"` : gReq ? `Graphic Requirement "${gReq.name}"` : 'Production item';
        const targetLink = task ? '/tasks' : gReq ? '/graphic-reqs' : project ? `/projects/${project.id}` : '/approvals';
        await this.prisma.notification.createMany({
          data: mediaManagers.map((mm) => ({
            userId: mm.id,
            title: 'Media Manager Review Requested 🎬',
            message: `${entityLabel} passed Technical Review and is waiting for Media Manager Approval.`,
            type: 'ALERT',
            category: 'APPROVAL',
            priority: 'HIGH',
            linkUrl: targetLink,
            eventType: 'MEDIA_REVIEW_REQUESTED',
            entityType: task ? 'TASK' : project ? 'PROJECT' : 'GRAPHIC_REQ',
            entityId: (task?.id || project?.id || gReq?.id) as string,
            entityCode: task?.taskId || project?.projectId || gReq?.requirementId || undefined,
            taskId: task?.id || undefined,
            projectId: project?.id || task?.projectId || undefined,
            graphicRequirementId: gReq?.id || undefined,
          })),
        }).catch(() => null);
      }
    }

    return approval;
  }

  async submitMediaReview(data: { projectId: string; status: 'APPROVED' | 'REJECTED'; remarks?: string }, reviewerId: string) {
    let project = await this.prisma.shootProject.findUnique({ where: { id: data.projectId } });
    let gReq = null;
    let task = null;

    if (!project) {
      gReq = await this.prisma.graphicRequirement.findUnique({ where: { id: data.projectId } });
    }
    if (!project && !gReq) {
      task = await this.prisma.task.findUnique({ where: { id: data.projectId } });
    }

    if (!project && !gReq && !task) throw new NotFoundException('Project, Graphic Requirement, or Task not found');

    const approval = await this.prisma.approval.create({
      data: {
        entityType: task ? 'TASK' : gReq ? 'GRAPHIC_REQ' : 'PROJECT',
        entityId: task ? task.id : gReq ? gReq.id : project ? project.id : null,
        projectId: project ? project.id : task?.projectId || null,
        approvalType: ApprovalType.MEDIA_REVIEW,
        reviewerId,
        status: data.status === 'APPROVED' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
        remarks: data.remarks || (data.status === 'APPROVED' ? 'Media creative quality approved.' : 'Creative quality rejected.'),
      },
    });

    if (project) {
      const newProjectStatus: ProjectStatus = data.status === 'APPROVED' 
        ? ProjectStatus.WAITING_FOR_CLIENT_CONFIRMATION 
        : ProjectStatus.IN_PROGRESS;

      await this.prisma.shootProject.update({
        where: { id: project.id },
        data: { status: newProjectStatus },
      });

      if (data.status === 'APPROVED') {
        const projectHasBrand = Boolean(project.brandId && typeof project.brandId === 'string' && project.brandId.trim() !== '' && project.brandId.trim().toLowerCase() !== 'null');

        if (projectHasBrand) {
          await this.prisma.task.updateMany({
            where: {
              projectId: project.id,
              taskType: 'VIDEO_EDITING',
              status: { notIn: ['CANCELLED'] },
              marketingManagerApproved: false,
            },
            data: {
              status: 'WAITING_FOR_MARKETING_APPROVAL',
              mediaManagerApproved: true,
              completionPercentage: 75,
            },
          }).catch(() => null);
        } else {
          // Project WITHOUT a Brand: Marketing Manager approval is NOT required. Complete directly!
          await this.prisma.task.updateMany({
            where: {
              projectId: project.id,
              taskType: 'VIDEO_EDITING',
              status: { notIn: ['CANCELLED'] },
            },
            data: {
              status: TaskStatus.COMPLETED,
              mediaManagerApproved: true,
              completionPercentage: 100,
            },
          }).catch(() => null);
        }
      }
    }

    if (gReq) {
      const newGrStatus = data.status === 'APPROVED' ? 'WAITING_FOR_CLIENT_CONFIRMATION' : 'IN_PROGRESS';
      await this.prisma.graphicRequirement.update({
        where: { id: gReq.id },
        data: {
          status: newGrStatus,
          mediaManagerApproved: data.status === 'APPROVED',
        },
      });
    }

    if (task) {
      const isVideoEditing = task.taskType === 'VIDEO_EDITING' || task.sourceType === 'VIDEO_EDITING';
      
      let taskWithRelations = task;
      if (!task.project && !task.graphicRequirement && !task.brand && (task.projectId || task.graphicRequirementId || task.brandId)) {
        taskWithRelations = (await this.prisma.task.findUnique({
          where: { id: task.id },
          include: { brand: true, project: true, graphicRequirement: true },
        })) || task;
      }
      const hasBrand = isTaskWithBrand(taskWithRelations);

      const newTaskStatus = data.status === 'APPROVED' 
        ? (isVideoEditing && hasBrand ? 'WAITING_FOR_MARKETING_APPROVAL' : TaskStatus.COMPLETED) 
        : 'REVISION_REQUESTED';
      await this.prisma.task.update({
        where: { id: task.id },
        data: {
          status: newTaskStatus,
          mediaManagerApproved: data.status === 'APPROVED',
          completionPercentage: data.status === 'APPROVED' ? (isVideoEditing && hasBrand ? 75 : 100) : 50,
          mediaRevisionReason: data.status === 'REJECTED' ? (data.remarks || 'Creative revisions required.').trim() : null,
        },
      });

      if (data.status === 'REJECTED' && data.remarks) {
        await this.prisma.taskRemark.create({
          data: {
            taskId: task.id,
            userId: reviewerId,
            message: `Media Review Rejection: ${data.remarks}`,
          },
        }).catch(() => null);
      }
    }

    // Log timeline event to all affected tasks
    try {
      const reviewerUser = await this.prisma.user.findUnique({ where: { id: reviewerId }, select: { name: true } });
      const reviewerName = reviewerUser?.name || 'Media Manager';
      const desc = data.status === 'APPROVED'
        ? `Media Review APPROVED by ${reviewerName}.${data.remarks ? ' Remarks: ' + data.remarks : ''}`
        : `Media Review REJECTED by ${reviewerName}. Reason: ${data.remarks || 'Creative revisions requested'}`;

      const affectedTaskIds: string[] = [];
      if (task) affectedTaskIds.push(task.id);
      if (gReq) {
        const gTasks = await this.prisma.task.findMany({ where: { graphicRequirementId: gReq.id }, select: { id: true } });
        affectedTaskIds.push(...gTasks.map((t) => t.id));
      }
      if (project) {
        const pTasks = await this.prisma.task.findMany({ where: { projectId: project.id }, select: { id: true } });
        affectedTaskIds.push(...pTasks.map((t) => t.id));
      }

      for (const tId of [...new Set(affectedTaskIds)]) {
        await this.prisma.taskTimeline.create({
          data: {
            taskId: tId,
            userId: reviewerId,
            event: data.status === 'APPROVED' ? 'STATUS_CHANGED' : 'REVISION_REQUESTED',
            description: desc,
          },
        }).catch(() => null);
      }
    } catch (e) {
      console.error('Failed to log media review task timeline:', e);
    }

    if (data.status === 'APPROVED') {
      const entityHasBrand = task 
        ? isTaskWithBrand(task) 
        : project 
        ? Boolean(project.brandId && typeof project.brandId === 'string' && project.brandId.trim() !== '') 
        : gReq 
        ? Boolean(gReq.brandId && typeof gReq.brandId === 'string' && gReq.brandId.trim() !== '') 
        : false;

      // Only notify Marketing Managers if the item has an assigned Brand
      if (entityHasBrand) {
        const marketingManagers = await this.prisma.user.findMany({
          where: { role: { in: ['MARKETING_MANAGER', 'ADMINISTRATOR', 'ADMIN'] }, status: 'ACTIVE' },
          select: { id: true },
        });
        if (marketingManagers.length > 0) {
          const entityLabel = task ? `Task ${task.taskId} ('${task.title}')` : project ? `Project "${project.name}"` : gReq ? `Graphic Requirement "${gReq.name}"` : 'Production item';
          await this.prisma.notification.createMany({
            data: marketingManagers.map((mm) => ({
              userId: mm.id,
              title: 'Marketing Manager Approval Requested 📢',
              message: `${entityLabel} was approved by Media Manager and is ready for Marketing Manager Approval.`,
              type: 'ALERT',
              category: 'APPROVAL',
              priority: 'HIGH',
              linkUrl: task ? '/tasks' : '/approvals',
              eventType: 'MARKETING_REVIEW_REQUESTED',
              entityType: task ? 'TASK' : project ? 'PROJECT' : 'GRAPHIC_REQ',
              entityId: (task?.id || project?.id || gReq?.id) as string,
              entityCode: task?.taskId || project?.projectId || gReq?.requirementId || undefined,
              taskId: task?.id || undefined,
              projectId: project?.id || task?.projectId || undefined,
              graphicRequirementId: gReq?.id || undefined,
            })),
          }).catch(() => null);
        }
      }
    }

    return approval;
  }

  async submitMarketingReview(data: { projectId: string; status: 'APPROVED' | 'REJECTED'; remarks?: string }, reviewerId: string) {
    let project = await this.prisma.shootProject.findUnique({ where: { id: data.projectId } });
    let gReq = null;
    let task = null;

    if (!project) {
      gReq = await this.prisma.graphicRequirement.findUnique({ where: { id: data.projectId } });
    }
    if (!project && !gReq) {
      task = await this.prisma.task.findUnique({ where: { id: data.projectId } });
    }

    if (!project && !gReq && !task) throw new NotFoundException('Project, Graphic Requirement, or Task not found');

    const approval = await this.prisma.approval.create({
      data: {
        projectId: project ? project.id : task?.projectId || null,
        approvalType: 'MARKETING_APPROVAL',
        reviewerId,
        status: data.status === 'APPROVED' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
        remarks: data.remarks || (data.status === 'APPROVED' ? 'Marketing quality & client alignment approved.' : 'Marketing approval rejected.'),
      },
    });

    if (task) {
      const newTaskStatus = data.status === 'APPROVED' ? 'COMPLETED' : 'REVISION_REQUESTED';
      await this.prisma.task.update({
        where: { id: task.id },
        data: {
          status: newTaskStatus,
          marketingManagerApproved: data.status === 'APPROVED',
          completionPercentage: data.status === 'APPROVED' ? 100 : 50,
          marketingRevisionReason: data.status === 'REJECTED' ? (data.remarks || 'Marketing revisions requested.').trim() : null,
        },
      });

      if (data.status === 'REJECTED' && data.remarks) {
        await this.prisma.taskRemark.create({
          data: {
            taskId: task.id,
            userId: reviewerId,
            message: `Marketing Review Rejection: ${data.remarks}`,
          },
        }).catch(() => null);
      }

      // Check if project should auto-complete if all video editing tasks are completed
      if (task.projectId && data.status === 'APPROVED') {
        const remainingIncomplete = await this.prisma.task.count({
          where: {
            projectId: task.projectId,
            id: { not: task.id },
            taskType: 'VIDEO_EDITING',
            OR: [
              { marketingManagerApproved: false },
              { status: { notIn: ['COMPLETED', 'APPROVED', 'MARKETING_MANAGER_APPROVED'] } },
            ],
          },
        });
        if (remainingIncomplete === 0) {
          await this.prisma.shootProject.update({
            where: { id: task.projectId },
            data: { status: ProjectStatus.COMPLETED, progressPercentage: 100 },
          }).catch(() => null);
        }
      }
    }

    if (project) {
      const newProjectStatus: ProjectStatus = data.status === 'APPROVED' 
        ? ProjectStatus.COMPLETED 
        : ProjectStatus.IN_PROGRESS;

      await this.prisma.shootProject.update({
        where: { id: project.id },
        data: { status: newProjectStatus, progressPercentage: data.status === 'APPROVED' ? 100 : project.progressPercentage },
      });
    }

    if (gReq) {
      const newGrStatus = data.status === 'APPROVED' ? 'COMPLETED' : 'IN_PROGRESS';
      await this.prisma.graphicRequirement.update({
        where: { id: gReq.id },
        data: {
          status: newGrStatus,
          clientConfirmed: data.status === 'APPROVED',
        },
      });
    }

    // Log timeline
    try {
      const reviewerUser = await this.prisma.user.findUnique({ where: { id: reviewerId }, select: { name: true } });
      const reviewerName = reviewerUser?.name || 'Marketing Manager';
      const desc = data.status === 'APPROVED'
        ? `Marketing Review APPROVED by ${reviewerName}.${data.remarks ? ' Remarks: ' + data.remarks : ''}`
        : `Marketing Review REJECTED by ${reviewerName}. Reason: ${data.remarks || 'Marketing revisions requested'}`;

      if (task) {
        await this.prisma.taskTimeline.create({
          data: {
            taskId: task.id,
            userId: reviewerId,
            event: data.status === 'APPROVED' ? 'COMPLETED' : 'REVISION_REQUESTED',
            description: desc,
          },
        }).catch(() => null);
      }
    } catch (e) {
      console.error('Failed to log marketing review timeline:', e);
    }

    return approval;
  }

  async recordClientConfirmation(
    data: {
      projectId: string;
      decision: ClientDecision;
      communicationMethod: string;
      remarks?: string;
    },
    recordedById: string,
  ) {
    const project = await this.prisma.shootProject.findUnique({ where: { id: data.projectId } });
    if (!project) throw new NotFoundException('Project not found');

    // Rule: Client confirmation cannot occur before Media approval
    if (project.status !== ProjectStatus.WAITING_FOR_CLIENT_CONFIRMATION) {
      throw new BadRequestException("Client Confirmation cannot occur before Media Approval!");
    }

    const confirmation = await this.prisma.clientConfirmation.create({
      data: {
        projectId: data.projectId,
        decision: data.decision,
        communicationMethod: data.communicationMethod || 'WhatsApp',
        remarks: data.remarks,
        recordedBy: recordedById,
      },
    });

    let newStatus: ProjectStatus = project.status as ProjectStatus;
    let newRevisionCount = project.revisionCount;

    if (data.decision === ClientDecision.APPROVED) {
      newStatus = ProjectStatus.COMPLETED;
    } else if (data.decision === ClientDecision.REVISION_REQUESTED) {
      newRevisionCount += 1;
      newStatus = ProjectStatus.CLIENT_REVISION_REQUESTED;

      // Create permanent revision log
      await this.prisma.revision.create({
        data: {
          entityType: 'PROJECT',
          entityId: data.projectId,
          projectId: data.projectId,
          revisionNumber: newRevisionCount,
          reason: data.remarks || 'Client requested revision',
          detailedRequest: `Client revision request received via ${data.communicationMethod || 'WhatsApp'}. Remarks: ${data.remarks || 'None'}`,
          reviewStage: 'CLIENT_REVIEW',
          requestedById: recordedById,
          originalAssigneeId: recordedById,
          assignedToId: recordedById,
          status: 'REVISION_REQUESTED',
        },
      });
    } else if (data.decision === ClientDecision.REJECTED) {
      newStatus = ProjectStatus.CANCELLED;
    }

    await this.prisma.shootProject.update({
      where: { id: data.projectId },
      data: {
        status: newStatus,
        revisionCount: newRevisionCount,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: recordedById,
        action: 'CLIENT_CONFIRMATION',
        entity: 'ShootProject',
        entityId: data.projectId,
        description: `Recorded Client Decision '${data.decision}' via ${data.communicationMethod} for project ${project.projectId}`,
      },
    });

    return confirmation;
  }
}
