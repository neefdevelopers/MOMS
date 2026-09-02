import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalType, ApprovalStatus, ProjectStatus, ClientDecision } from '../../common/enums';

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
      where: { status: 'WAITING_FOR_TECHNICAL_REVIEW' },
      include: {
        client: true,
        brand: true,
        files: true,
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
      where: { status: 'WAITING_FOR_MEDIA_REVIEW' },
      include: {
        client: true,
        brand: true,
        files: true,
        tasks: taskIncludes,
      },
    });

    const taskTechQueue = await this.prisma.task.findMany({
      where: { status: 'WAITING_FOR_TECHNICAL_REVIEW' },
      include: {
        client: true,
        brand: true,
        project: true,
        graphicRequirement: true,
        assignedEmployees: { include: { user: { select: { id: true, name: true, role: true } } } },
        deliverableHistory: { include: { user: { select: { id: true, name: true, role: true } } }, orderBy: { version: 'desc' as const } },
      },
    });

    const taskMediaQueue = await this.prisma.task.findMany({
      where: { status: 'WAITING_FOR_MEDIA_REVIEW' },
      include: {
        client: true,
        brand: true,
        project: true,
        graphicRequirement: true,
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
      tasks: gr.tasks,
      isGraphicRequirement: true,
    }));

    // Map Standalone Tasks as queue items
    const mappedTaskTech = taskTechQueue.map((t) => ({
      id: t.id,
      projectId: t.taskId,
      name: t.title,
      client: t.client,
      brand: t.brand,
      status: t.status,
      tasks: [t],
      activeDeliverableUrl: t.activeDeliverableUrl,
      activeDeliverableFileName: t.activeDeliverableFileName,
      activeDeliverableVersion: t.activeDeliverableVersion,
      deliverableHistory: t.deliverableHistory,
      isStandaloneTask: true,
    }));

    const mappedTaskMedia = taskMediaQueue.map((t) => ({
      id: t.id,
      projectId: t.taskId,
      name: t.title,
      client: t.client,
      brand: t.brand,
      status: t.status,
      tasks: [t],
      activeDeliverableUrl: t.activeDeliverableUrl,
      activeDeliverableFileName: t.activeDeliverableFileName,
      activeDeliverableVersion: t.activeDeliverableVersion,
      deliverableHistory: t.deliverableHistory,
      isStandaloneTask: true,
    }));

    return {
      technicalReviewQueue: [...techQueue, ...mappedGrTech, ...mappedTaskTech],
      mediaReviewQueue: [...mediaQueue, ...mappedGrMedia, ...mappedTaskMedia],
      clientConfirmationQueue: clientQueue,
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
        entityType: targetEntity,
        entityId: targetId,
        approvalType: ApprovalType.TECHNICAL_REVIEW,
        status: 'PENDING',
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
        },
      });
    } else {
      approval = await this.prisma.approval.create({
        data: {
          entityType: targetEntity,
          entityId: targetId,
          projectId: project ? project.id : task?.projectId || null,
          approvalType: ApprovalType.TECHNICAL_REVIEW,
          reviewerId,
          status: data.status === 'APPROVED' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
          remarks: data.remarks || (data.status === 'APPROVED' ? 'Technical standards passed.' : 'Technical revisions required.'),
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
        },
      });
    }

    if (task) {
      const newTaskStatus = data.status === 'APPROVED' ? 'WAITING_FOR_MEDIA_REVIEW' : 'IN_PROGRESS';
      await this.prisma.task.update({
        where: { id: task.id },
        data: {
          status: newTaskStatus,
          technicalReviewApproved: data.status === 'APPROVED',
        },
      });
    }

    if (data.status === 'REJECTED' && targetId) {
      await this.prisma.task.updateMany({
        where: { OR: [{ id: targetId }, { projectId: targetId }, { graphicRequirementId: targetId }] },
        data: { status: 'IN_PROGRESS', technicalReviewApproved: false },
      }).catch(() => null);
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
        projectId: project ? project.id : null,
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
      const newTaskStatus = data.status === 'APPROVED' ? 'COMPLETED' : 'IN_PROGRESS';
      await this.prisma.task.update({
        where: { id: task.id },
        data: {
          status: newTaskStatus,
          mediaManagerApproved: data.status === 'APPROVED',
          completionPercentage: data.status === 'APPROVED' ? 100 : task.completionPercentage,
        },
      });
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
