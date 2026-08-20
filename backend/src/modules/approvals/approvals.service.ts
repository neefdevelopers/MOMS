import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalType, ApprovalStatus, ProjectStatus, ClientDecision } from '../../common/enums';

@Injectable()
export class ApprovalsService {
  constructor(private prisma: PrismaService) {}

  async getApprovalQueue() {
    const techQueue = await this.prisma.shootProject.findMany({
      where: { status: ProjectStatus.WAITING_FOR_TECHNICAL_REVIEW },
      include: { client: true, brand: true, files: true, assignedTeam: { include: { user: true } } },
    });

    const mediaQueue = await this.prisma.shootProject.findMany({
      where: { status: ProjectStatus.WAITING_FOR_MEDIA_REVIEW },
      include: { client: true, brand: true, files: true, assignedTeam: { include: { user: true } } },
    });

    const clientQueue = await this.prisma.shootProject.findMany({
      where: { status: ProjectStatus.WAITING_FOR_CLIENT_CONFIRMATION },
      include: { client: true, brand: true, files: true },
    });

    const revisionQueue = await this.prisma.shootProject.findMany({
      where: { status: ProjectStatus.CLIENT_REVISION_REQUESTED },
      include: { client: true, brand: true, revisions: true },
    });

    return {
      technicalReviewQueue: techQueue,
      mediaReviewQueue: mediaQueue,
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
    const project = await this.prisma.shootProject.findUnique({ where: { id: data.projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const approval = await this.prisma.approval.create({
      data: {
        projectId: data.projectId,
        approvalType: ApprovalType.TECHNICAL_REVIEW,
        reviewerId,
        status: data.status === 'APPROVED' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
        remarks: data.remarks || (data.status === 'APPROVED' ? 'Technical standards passed.' : 'Technical revisions required.'),
      },
    });

    const newProjectStatus: ProjectStatus = data.status === 'APPROVED' 
      ? ProjectStatus.WAITING_FOR_MEDIA_REVIEW 
      : ProjectStatus.IN_PROGRESS;

    await this.prisma.shootProject.update({
      where: { id: data.projectId },
      data: { status: newProjectStatus },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: reviewerId,
        action: 'TECHNICAL_REVIEW',
        entity: 'ShootProject',
        entityId: data.projectId,
        description: `Technical Review ${data.status} for project ${project.projectId}. ${data.remarks || ''}`,
      },
    });

    return approval;
  }

  async submitMediaReview(data: { projectId: string; status: 'APPROVED' | 'REJECTED'; remarks?: string }, reviewerId: string) {
    const project = await this.prisma.shootProject.findUnique({ where: { id: data.projectId } });
    if (!project) throw new NotFoundException('Project not found');

    // Rule: Technical review must come before Media approval
    if (project.status !== ProjectStatus.WAITING_FOR_MEDIA_REVIEW) {
      throw new BadRequestException("Media Approval cannot occur before Technical Approval!");
    }

    const approval = await this.prisma.approval.create({
      data: {
        projectId: data.projectId,
        approvalType: ApprovalType.MEDIA_REVIEW,
        reviewerId,
        status: data.status === 'APPROVED' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
        remarks: data.remarks || (data.status === 'APPROVED' ? 'Media creative quality approved.' : 'Creative quality rejected.'),
      },
    });

    const newProjectStatus: ProjectStatus = data.status === 'APPROVED' 
      ? ProjectStatus.WAITING_FOR_CLIENT_CONFIRMATION 
      : ProjectStatus.IN_PROGRESS;

    await this.prisma.shootProject.update({
      where: { id: data.projectId },
      data: { status: newProjectStatus },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: reviewerId,
        action: 'MEDIA_REVIEW',
        entity: 'ShootProject',
        entityId: data.projectId,
        description: `Media Manager Review ${data.status} for project ${project.projectId}. ${data.remarks || ''}`,
      },
    });

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
          projectId: data.projectId,
          revisionNumber: newRevisionCount,
          reason: data.remarks || 'Client requested revision',
          requestedBy: `Client via ${data.communicationMethod}`,
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
