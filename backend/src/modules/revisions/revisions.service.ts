import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  RequestRevisionDto,
  SubmitRevisionDto,
  ReviewRevisionDecisionDto,
  ReassignRevisionDto,
} from './dto/revisions.dto';

@Injectable()
export class RevisionsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * 1. Request Revision (Reviewer Sends Work Back for Changes)
   * Enforces Role & Review Stage Validation
   */
  async requestRevision(
    dto: RequestRevisionDto,
    user: { id: string; role: string; name: string },
  ) {
    // SECURITY RULE 1: Staff CANNOT request revision or approve their own work
    if (user.role === 'STAFF') {
      throw new ForbiddenException(
        'Business Rule Violation: Staff members cannot request revisions or approve their own work.',
      );
    }

    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException('Revision Reason is mandatory and cannot be empty.');
    }

    if (!dto.detailedRequest || !dto.detailedRequest.trim()) {
      throw new BadRequestException(
        'Detailed Change Request is mandatory. Reviewer must explain required changes.',
      );
    }

    const reviewStage = dto.reviewStage || 'TECHNICAL_REVIEW';

    // SECURITY RULE 2: Reviewer Stage Check
    if (user.role === 'TECHNICAL_MANAGER' && reviewStage === 'MEDIA_REVIEW') {
      throw new ForbiddenException(
        'Technical Manager cannot override or request revisions during Media Manager Review stage.',
      );
    }

    // Resolve original assigned employee for the entity
    let originalAssigneeId = dto.originalAssigneeId || null;
    let resolvedProjectId = dto.projectId || null;
    let entityTitle = 'Production Item';

    try {
      if (dto.entityType === 'PROJECT') {
        const project = await this.prisma.shootProject.findUnique({
          where: { id: dto.entityId },
          include: { assignedTeam: true },
        });
        if (project) {
          resolvedProjectId = project.id;
          entityTitle = project.name;
          if (!originalAssigneeId && project.assignedTeam.length > 0) {
            originalAssigneeId = project.assignedTeam[0].userId;
          }
        }
      } else if (dto.entityType === 'SCRIPT') {
        const script = await this.prisma.script.findUnique({
          where: { id: dto.entityId },
          include: { scriptAssignments: true },
        });
        if (script) {
          resolvedProjectId = script.projectId;
          entityTitle = `${script.scriptId}: ${script.name}`;
          if (!originalAssigneeId && script.scriptAssignments.length > 0) {
            originalAssigneeId = script.scriptAssignments[0].userId;
          }
        }
      } else if (dto.entityType === 'GRAPHIC_REQ') {
        const graphic = await this.prisma.graphicRequirement.findUnique({
          where: { id: dto.entityId },
        });
        if (graphic) {
          resolvedProjectId = graphic.projectId;
          entityTitle = `${graphic.requirementId}: ${graphic.name}`;
        }
      } else if (dto.entityType === 'TASK') {
        const task = await this.prisma.task.findUnique({
          where: { id: dto.entityId },
          include: { assignedEmployees: true },
        });
        if (task) {
          resolvedProjectId = task.projectId || null;
          entityTitle = `${task.taskId}: ${task.title}`;
          if (!originalAssigneeId && task.assignedEmployees.length > 0) {
            originalAssigneeId = task.assignedEmployees[0].userId;
          }
        }
      }
    } catch (e) {}

    // Fallback if originalAssigneeId still null
    if (!originalAssigneeId) {
      originalAssigneeId = user.id;
    }

    // Determine target assignee:
    // Only Media Manager can reassign to another employee. Technical Manager cannot freely reassign.
    let assignedToId = originalAssigneeId;
    if (user.role === 'MEDIA_MANAGER' && dto.assignedToId) {
      assignedToId = dto.assignedToId;
    }

    // Count existing revisions for this entity to set revisionNumber
    const existingCount = await this.prisma.revision.count({
      where: { entityType: dto.entityType, entityId: dto.entityId },
    });
    const revisionNumber = existingCount + 1;

    const dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    const priority = dto.priority ? dto.priority.toUpperCase() : 'MEDIUM';

    // 1. Create Revision record
    const revision = await this.prisma.revision.create({
      data: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        projectId: resolvedProjectId,
        revisionNumber,
        reason: dto.reason.trim(),
        detailedRequest: dto.detailedRequest.trim(),
        priority,
        dueDate,
        specificArea: dto.specificArea?.trim() || null,
        reviewerComments: dto.reviewerComments?.trim() || null,
        reviewStage,
        requestedById: user.id,
        originalAssigneeId,
        assignedToId,
        status: 'REVISION_REQUESTED',
        previousVersionUrl: dto.previousVersionUrl || null,
        referenceAttachmentUrl: dto.referenceAttachmentUrl || null,
      },
      include: {
        requestedBy: { select: { id: true, name: true, role: true, avatarUrl: true } },
        originalAssignee: { select: { id: true, name: true, role: true, avatarUrl: true } },
        assignedTo: { select: { id: true, name: true, role: true, avatarUrl: true } },
      },
    });

    // 2. Update Production Item Status to 'REVISION_REQUESTED'
    try {
      if (dto.entityType === 'PROJECT' && resolvedProjectId) {
        await this.prisma.shootProject.update({
          where: { id: resolvedProjectId },
          data: {
            status: 'REVISION_REQUESTED',
            revisionCount: { increment: 1 },
          },
        });
      } else if (dto.entityType === 'SCRIPT') {
        await this.prisma.script.update({
          where: { id: dto.entityId },
          data: {
            status: 'REVISION_REQUESTED',
            revisionCount: { increment: 1 },
          },
        });
      } else if (dto.entityType === 'GRAPHIC_REQ') {
        await this.prisma.graphicRequirement.update({
          where: { id: dto.entityId },
          data: {
            status: 'REVISION_REQUESTED',
            revisionCount: { increment: 1 },
          },
        });
      } else if (dto.entityType === 'TASK') {
        await this.prisma.task.update({
          where: { id: dto.entityId },
          data: {
            status: 'REVISION_REQUESTED',
          },
        });
      }
    } catch (e) {}

    // 3. Create linked Internal Communication entry (REVIEW_COMMENT / BLOCKER)
    try {
      const assigneeUser = await this.prisma.user.findUnique({
        where: { id: assignedToId },
        select: { name: true, role: true },
      });

      await (this.prisma.communication as any).create({
        data: {
          entityType: dto.entityType,
          entityId: dto.entityId,
          projectId: resolvedProjectId,
          senderId: user.id,
          type: 'REVIEW_COMMENT',
          subject: `[REVISION #${revisionNumber}] ${dto.reason}`,
          content: `Revision #${revisionNumber} requested by ${user.name} (${user.role.replace(/_/g, ' ')}).\n\nReason: ${dto.reason}\nDetailed Request: ${dto.detailedRequest}\nSpecific Area: ${dto.specificArea || 'N/A'}\nDue Date: ${dueDate ? dueDate.toLocaleDateString() : 'N/A'}`,
          recipients: assigneeUser ? `${assigneeUser.name} (${assigneeUser.role})` : 'Assigned Employee',
          assignedToId,
          status: 'SENT',
          priority,
        },
      });
    } catch (e) {}

    // 4. Send Notification to Assigned Employee
    try {
      await this.prisma.notification.create({
        data: {
          userId: assignedToId,
          title: `Revision Requested: ${entityTitle} (Revision #${revisionNumber})`,
          message: `Revision #${revisionNumber} requested by ${user.name} (${user.role.replace(/_/g, ' ')}). Reason: ${dto.reason}. Due: ${dueDate ? dueDate.toLocaleDateString() : 'Immediate'}`,
          type: 'WARNING',
          linkUrl: resolvedProjectId ? `/projects/${resolvedProjectId}` : '/revisions',
          eventType: 'REVISION_REQUESTED',
          entityType: 'REVISION',
          entityId: revision.id,
          projectId: resolvedProjectId || null,
        },
      });

      // Also notify Media Manager if requested by Technical Manager
      if (user.role === 'TECHNICAL_MANAGER') {
        const mediaManagers = await this.prisma.user.findMany({
          where: { role: 'MEDIA_MANAGER', id: { not: user.id } },
          select: { id: true },
        });
        for (const mm of mediaManagers) {
          await this.prisma.notification.create({
            data: {
              userId: mm.id,
              title: `Technical Revision Requested: ${entityTitle}`,
              message: `${user.name} requested Revision #${revisionNumber} for ${entityTitle}. Assigned to employee.`,
              type: 'INFO',
              linkUrl: resolvedProjectId ? `/projects/${resolvedProjectId}` : '/revisions',
              eventType: 'REVISION_REQUESTED',
              entityType: 'REVISION',
              entityId: revision.id,
              projectId: resolvedProjectId || null,
            },
          });
        }
      }
    } catch (e) {}

    return revision;
  }

  /**
   * 2. Accept Revision Task (Assigned Employee Accepts)
   */
  async acceptRevision(id: string, user: { id: string; role: string; name: string }) {
    const revision = await this.prisma.revision.findUnique({ where: { id } });
    if (!revision) throw new NotFoundException('Revision record not found.');

    if (user.role === 'STAFF' && revision.assignedToId !== user.id) {
      throw new ForbiddenException('You can only accept revision tasks assigned to you.');
    }

    return this.prisma.revision.update({
      where: { id },
      data: { status: 'ACCEPTED' },
    });
  }

  /**
   * 3. Start Revision (In Progress)
   */
  async startRevision(id: string, user: { id: string; role: string; name: string }) {
    const revision = await this.prisma.revision.findUnique({ where: { id } });
    if (!revision) throw new NotFoundException('Revision record not found.');

    if (user.role === 'STAFF' && revision.assignedToId !== user.id) {
      throw new ForbiddenException('You can only start revision work assigned to you.');
    }

    const updated = await this.prisma.revision.update({
      where: { id },
      data: { status: 'IN_PROGRESS' },
    });

    // Update entity status to IN_PROGRESS
    try {
      if (revision.entityType === 'PROJECT' && revision.projectId) {
        await this.prisma.shootProject.update({
          where: { id: revision.projectId },
          data: { status: 'IN_PROGRESS' },
        });
      } else if (revision.entityType === 'SCRIPT') {
        await this.prisma.script.update({
          where: { id: revision.entityId },
          data: { status: 'IN_PROGRESS' },
        });
      } else if (revision.entityType === 'GRAPHIC_REQ') {
        await this.prisma.graphicRequirement.update({
          where: { id: revision.entityId },
          data: { status: 'IN_PROGRESS' },
        });
      } else if (revision.entityType === 'TASK') {
        await this.prisma.task.update({
          where: { id: revision.entityId },
          data: { status: 'IN_PROGRESS' },
        });
      }
    } catch (e) {}

    return updated;
  }

  /**
   * 4. Submit Revised Deliverable (In Progress -> Waiting for Technical Review)
   */
  async submitRevision(
    id: string,
    dto: SubmitRevisionDto,
    user: { id: string; role: string; name: string },
  ) {
    const revision = await this.prisma.revision.findUnique({ where: { id } });
    if (!revision) throw new NotFoundException('Revision record not found.');

    if (user.role === 'STAFF' && revision.assignedToId !== user.id) {
      throw new ForbiddenException('You can only submit deliverables for revisions assigned to you.');
    }

    if (!dto.revisedVersionUrl || !dto.revisedVersionUrl.trim()) {
      throw new BadRequestException('Revised deliverable URL or file attachment is required.');
    }

    const updated = await this.prisma.revision.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        revisedVersionUrl: dto.revisedVersionUrl.trim(),
        submittedAt: new Date(),
      },
    });

    // Transition Entity Status -> WAITING_FOR_TECHNICAL_REVIEW
    try {
      if (revision.entityType === 'PROJECT' && revision.projectId) {
        await this.prisma.shootProject.update({
          where: { id: revision.projectId },
          data: { status: 'WAITING_FOR_TECHNICAL_REVIEW' },
        });
      } else if (revision.entityType === 'SCRIPT') {
        await this.prisma.script.update({
          where: { id: revision.entityId },
          data: { status: 'WAITING_FOR_TECHNICAL_REVIEW' },
        });
      } else if (revision.entityType === 'GRAPHIC_REQ') {
        await this.prisma.graphicRequirement.update({
          where: { id: revision.entityId },
          data: { status: 'WAITING_FOR_TECHNICAL_REVIEW' },
        });
      } else if (revision.entityType === 'TASK') {
        await this.prisma.task.update({
          where: { id: revision.entityId },
          data: { status: 'WAITING_FOR_TECHNICAL_REVIEW' },
        });
      }
    } catch (e) {}

    // Notify Technical Managers that revised deliverable has been submitted
    try {
      const techManagers = await this.prisma.user.findMany({
        where: { role: 'TECHNICAL_MANAGER' },
        select: { id: true },
      });
      for (const tm of techManagers) {
        await this.prisma.notification.create({
          data: {
            userId: tm.id,
            title: `Revised Deliverable Submitted (Revision #${revision.revisionNumber})`,
            message: `${user.name} submitted revised deliverable for Revision #${revision.revisionNumber}. Ready for Technical Review.`,
            type: 'INFO',
            linkUrl: revision.projectId ? `/projects/${revision.projectId}` : '/revisions',
            eventType: 'REVISION_SUBMITTED',
            entityType: 'REVISION',
            entityId: revision.id,
            projectId: revision.projectId || null,
          },
        });
      }
    } catch (e) {}

    return updated;
  }

  /**
   * 5. Media Manager Reassigns Revision
   */
  async reassignRevision(
    id: string,
    dto: ReassignRevisionDto,
    user: { id: string; role: string; name: string },
  ) {
    if (user.role !== 'MEDIA_MANAGER' && user.role !== 'ADMIN' && user.role !== 'ADMINISTRATOR') {
      throw new ForbiddenException(
        'Business Rule Violation: Only the Media Manager can reassign revision ownership to another employee.',
      );
    }

    const revision = await this.prisma.revision.findUnique({ where: { id } });
    if (!revision) throw new NotFoundException('Revision record not found.');

    const newAssignee = await this.prisma.user.findUnique({
      where: { id: dto.newAssigneeId },
      select: { id: true, name: true, role: true },
    });
    if (!newAssignee) throw new NotFoundException('Target new assignee staff user not found.');

    const updated = await this.prisma.revision.update({
      where: { id },
      data: { assignedToId: dto.newAssigneeId },
      include: {
        assignedTo: { select: { id: true, name: true, role: true, avatarUrl: true } },
      },
    });

    // Notify new assignee
    try {
      await this.prisma.notification.create({
        data: {
          userId: dto.newAssigneeId,
          title: `Revision Task Reassigned to You (Revision #${revision.revisionNumber})`,
          message: `${user.name} reassigned Revision #${revision.revisionNumber} to you. Reason: ${dto.reassignmentReason || 'Reassigned by Media Manager'}`,
          type: 'WARNING',
          linkUrl: revision.projectId ? `/projects/${revision.projectId}` : '/revisions',
          eventType: 'REVISION_REASSIGNED',
          entityType: 'REVISION',
          entityId: revision.id,
          projectId: revision.projectId || null,
        },
      });
    } catch (e) {}

    return updated;
  }

  /**
   * 6. Reviewer Final Decision on Revision (Approve vs Request Another Revision)
   */
  async reviewRevision(
    id: string,
    dto: ReviewRevisionDecisionDto,
    user: { id: string; role: string; name: string },
  ) {
    if (user.role === 'STAFF') {
      throw new ForbiddenException('Staff members cannot review or approve revisions.');
    }

    const revision = await this.prisma.revision.findUnique({ where: { id } });
    if (!revision) throw new NotFoundException('Revision record not found.');

    if (dto.decision === 'APPROVE') {
      const updated = await this.prisma.revision.update({
        where: { id },
        data: {
          status: 'APPROVED',
          resolvedAt: new Date(),
          reviewerComments: dto.comments || 'Revision approved by reviewer.',
        },
      });

      // Workflow Transition:
      // Technical Manager Approve -> WAITING_FOR_MEDIA_REVIEW
      // Media Manager Approve -> COMPLETED
      let nextStatus = 'WAITING_FOR_MEDIA_REVIEW';
      if (user.role === 'MEDIA_MANAGER' || user.role === 'ADMIN' || user.role === 'ADMINISTRATOR') {
        nextStatus = 'COMPLETED';
      }

      try {
        if (revision.entityType === 'PROJECT' && revision.projectId) {
          await this.prisma.shootProject.update({
            where: { id: revision.projectId },
            data: { status: nextStatus },
          });
        } else if (revision.entityType === 'SCRIPT') {
          await this.prisma.script.update({
            where: { id: revision.entityId },
            data: { status: nextStatus },
          });
        } else if (revision.entityType === 'GRAPHIC_REQ') {
          await this.prisma.graphicRequirement.update({
            where: { id: revision.entityId },
            data: { status: nextStatus },
          });
        } else if (revision.entityType === 'TASK') {
          await this.prisma.task.update({
            where: { id: revision.entityId },
            data: { status: nextStatus },
          });
        }
      } catch (e) {}

      // Notify assigned staff member
      try {
        await this.prisma.notification.create({
          data: {
            userId: revision.assignedToId,
            title: `Revision #${revision.revisionNumber} Approved!`,
            message: `Your revised work for Revision #${revision.revisionNumber} was approved by ${user.name}. Status updated to ${nextStatus.replace(/_/g, ' ')}.`,
            type: 'SUCCESS',
            linkUrl: revision.projectId ? `/projects/${revision.projectId}` : '/revisions',
            eventType: 'REVISION_APPROVED',
            entityType: 'REVISION',
            entityId: revision.id,
            projectId: revision.projectId || null,
          },
        });
      } catch (e) {}

      return updated;
    }

    return revision;
  }

  /**
   * 7. Get Revisions History by Entity
   */
  async getRevisionsByEntity(entityType: string, entityId: string) {
    return this.prisma.revision.findMany({
      where: { entityType, entityId },
      include: {
        requestedBy: { select: { id: true, name: true, role: true, avatarUrl: true } },
        originalAssignee: { select: { id: true, name: true, role: true, avatarUrl: true } },
        assignedTo: { select: { id: true, name: true, role: true, avatarUrl: true } },
      },
      orderBy: { revisionNumber: 'asc' },
    });
  }

  /**
   * 8. Get All Revisions (RBAC Scoped)
   */
  async getRevisions(
    user: { id: string; role: string; name: string },
    status?: string,
    priority?: string,
  ) {
    const where: any = {};
    if (status && status !== 'ALL') where.status = status;
    if (priority && priority !== 'ALL') where.priority = priority;

    if (user.role === 'STAFF') {
      where.OR = [{ assignedToId: user.id }, { originalAssigneeId: user.id }];
    } else if (user.role === 'TECHNICAL_MANAGER') {
      where.OR = [
        { reviewStage: 'TECHNICAL_REVIEW' },
        { requestedById: user.id },
        { assignedToId: user.id },
      ];
    }

    return this.prisma.revision.findMany({
      where,
      include: {
        project: { select: { id: true, projectId: true, name: true } },
        requestedBy: { select: { id: true, name: true, role: true, avatarUrl: true } },
        originalAssignee: { select: { id: true, name: true, role: true, avatarUrl: true } },
        assignedTo: { select: { id: true, name: true, role: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 9. Revision Metrics & Analytics for Reports
   */
  async getRevisionMetrics(user: { id: string; role: string; name: string }) {
    const allRevisions = await this.prisma.revision.findMany({
      include: {
        assignedTo: { select: { id: true, name: true, role: true } },
        requestedBy: { select: { id: true, name: true, role: true } },
      },
    });

    const now = new Date();
    const openRevisions = allRevisions.filter((r) => r.status !== 'APPROVED');
    const overdueRevisions = openRevisions.filter((r) => r.dueDate && new Date(r.dueDate) < now);

    // Count by entity
    const countByEntity: Record<string, number> = {};
    const countByEmployee: Record<string, { name: string; count: number }> = {};

    allRevisions.forEach((r) => {
      countByEntity[r.entityType] = (countByEntity[r.entityType] || 0) + 1;
      const empId = r.assignedToId;
      if (!countByEmployee[empId]) {
        countByEmployee[empId] = { name: r.assignedTo.name, count: 0 };
      }
      countByEmployee[empId].count += 1;
    });

    return {
      totalRevisions: allRevisions.length,
      openRevisions: openRevisions.length,
      overdueRevisions: overdueRevisions.length,
      completedRevisions: allRevisions.filter((r) => r.status === 'APPROVED').length,
      countByEntity,
      countByEmployee: Object.values(countByEmployee),
    };
  }
}
