import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { canUserViewEvent, canUserViewRequirement } from '../../common/utils/event-auth';

@Injectable()
export class GraphicReqsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: {
    projectId?: string;
    search?: string;
    status?: string;
    priority?: string;
    clientId?: string;
    brandId?: string;
    productId?: string;
    employeeId?: string;
    date?: string;
    dateFrom?: string;
    dateTo?: string;
    all?: string;
    userId?: string;
    role?: string;
  } | string) {
    const where: any = {};
    const p: any = typeof params === 'string' ? { projectId: params } : params || {};

    if (p.projectId) where.projectId = p.projectId;
    if (p.clientId) where.clientId = p.clientId;
    if (p.brandId) where.brandId = p.brandId;
    if (p.productId) where.productId = p.productId;
    if (p.priority && p.priority !== 'ALL') where.priority = p.priority;

    if (p.createdBy) {
      where.OR = [
        { calendarEvent: { createdById: p.createdBy } },
        { project: { createdById: p.createdBy } },
      ];
    }

    if (p.status === 'PENDING_APPROVAL' || p.status === 'PENDING') {
      const UNAPPROVED_STATUSES = ['PENDING_CLIENT_APPROVAL', 'PENDING_CLIENT_REVIEW', 'DRAFT', 'CHANGES_REQUESTED', 'PENDING_MARKETING_APPROVAL'];
      where.OR = [
        { status: 'WAITING_FOR_MEDIA_REVIEW' },
        { status: 'PENDING_CLIENT_APPROVAL' },
        { status: 'PENDING_MARKETING_APPROVAL' },
        { status: 'DRAFT' },
        { calendarEvent: { status: { in: UNAPPROVED_STATUSES } } },
        { sourceForCalendarEvents: { some: { status: { in: UNAPPROVED_STATUSES } } } },
        { project: { calendarEvent: { status: { in: UNAPPROVED_STATUSES } } } },
      ];
    } else if (p.status && p.status !== 'ALL') {
      where.status = p.status;
    }

    if (p.employeeId) {
      where.tasks = {
        some: { assignedEmployees: { some: { userId: p.employeeId } } },
      };
    }

    if (p.date) {
      const d = new Date(p.date);
      const nextD = new Date(d);
      nextD.setDate(d.getDate() + 1);
      where.createdAt = { gte: d, lt: nextD };
    } else if (p.dateFrom || p.dateTo) {
      where.createdAt = {};
      if (p.dateFrom) where.createdAt.gte = new Date(p.dateFrom);
      if (p.dateTo) where.createdAt.lte = new Date(p.dateTo);
    }

    // Role-based query filtering for STAFF: only accepted assigned tasks or created projects (unless all=true requested)
    if (p.role === 'STAFF' && p.userId && p.all !== 'true' && p.all !== '1') {
      where.OR = [
        { tasks: { some: { assignedEmployees: { some: { userId: p.userId, acceptanceStatus: 'ACCEPTED' } } } } },
        { project: { createdById: p.userId } },
      ];
    }

    if (p.search && p.search.trim()) {
      const q = p.search.trim();
      const searchConditions = [
        { name: { contains: q } },
        { requirementId: { contains: q } },
        { requirementType: { contains: q } },
        { description: { contains: q } },
        { objective: { contains: q } },
        { project: { name: { contains: q } } },
        { project: { projectId: { contains: q } } },
        { client: { name: { contains: q } } },
        { brand: { name: { contains: q } } },
      ];

      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    // Execution roles (STAFF, etc.) can ONLY view graphic requirements once approved by Marketing Manager (or if assigned/created by themselves).
    const APPROVED_CALENDAR_STATUSES = ['APPROVED', 'CLIENT_APPROVED', 'SCHEDULED', 'PUBLISHED', 'READY', 'OPERATIONAL', 'TASK_ASSIGNED', 'IN_PRODUCTION'];
    const CREATOR_AND_APPROVER_ROLES = ['SOCIAL_MEDIA_MANAGER', 'MEDIA_MANAGER', 'MARKETING_MANAGER', 'TECHNICAL_MANAGER', 'ADMIN', 'ADMINISTRATOR', 'STAFF'];

    if (p.role && !CREATOR_AND_APPROVER_ROLES.includes(p.role) && p.userId) {
      const eventVisibilityFilter = {
        OR: [
          { calendarEventId: null },
          { calendarEvent: { status: { in: APPROVED_CALENDAR_STATUSES } } },
          { calendarEvent: { createdById: p.userId } },
          { sourceForCalendarEvents: { some: { status: { in: APPROVED_CALENDAR_STATUSES } } } },
          { sourceForCalendarEvents: { some: { createdById: p.userId } } },
          { project: { calendarEvent: { status: { in: APPROVED_CALENDAR_STATUSES } } } },
          { project: { calendarEvent: { createdById: p.userId } } },
          { tasks: { some: { assignedEmployees: { some: { userId: p.userId } } } } },
          { project: { assignedTeam: { some: { userId: p.userId } } } },
        ],
      };

      if (where.AND) {
        where.AND = Array.isArray(where.AND) ? [...where.AND, eventVisibilityFilter] : [where.AND, eventVisibilityFilter];
      } else {
        where.AND = [eventVisibilityFilter];
      }
    }

    const items = await this.prisma.graphicRequirement.findMany({
      where,
      include: {
        project: { include: { calendarEvent: true } },
        client: true,
        brand: true,
        calendarEvent: true,
        sourceForCalendarEvents: { include: { createdBy: { select: { id: true, name: true, role: true } } } },
        product: true,
        campaign: true,
        tasks: { include: { assignedEmployees: { include: { user: true } } } },
        files: true,
        deliverables: {
          include: {
            createdBy: { select: { id: true, name: true, role: true } },
            assignedStaff: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        timeline: {
          include: { user: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
        remarksHistory: {
          include: { user: { select: { id: true, name: true, role: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const syncedItems = await this.syncGraphicRequirementStatuses(items);
    if (p.userId && p.role) {
      return syncedItems.filter((item: any) =>
        canUserViewRequirement({ id: p.userId, role: p.role }, item),
      );
    }
    return syncedItems;
  }

  private async syncGraphicRequirementStatuses(items: any[]) {
    if (!items || !items.length) return items;

    const REVIEW_AND_LOCKED_STATUSES = [
      'WAITING_FOR_TECHNICAL_REVIEW',
      'TECHNICAL_REVIEW',
      'WAITING_FOR_MEDIA_REVIEW',
      'MEDIA_MANAGER_REVIEW',
      'WAITING_FOR_CLIENT_CONFIRMATION',
      'CLIENT_CONFIRMATION',
      'CLIENT_REVISION_REQUESTED',
      'COMPLETED',
      'CLOSED',
      'CANCELLED',
    ];

    for (const item of items) {
      let computedStatus = item.status;
      const calStatus = item.calendarEvent?.status;
      const isCalApproved = calStatus && ['APPROVED', 'CLIENT_APPROVED', 'SCHEDULED', 'PUBLISHED', 'TASK_ASSIGNED', 'IN_PRODUCTION'].includes(calStatus);

      const deliverables = item.deliverables || [];
      const tasks = item.tasks || [];

      const hasProducedDeliverables = deliverables.length > 0 || tasks.some((t: any) => Boolean(t.activeDeliverableUrl));
      const allDeliverablesCompletedOrSubmitted = deliverables.length > 0 && deliverables.every((d: any) => d.status === 'COMPLETED' || d.status === 'SUBMITTED');
      const isTaskInProgress = tasks.some((t: any) => t.status === 'IN_PROGRESS' || t.status === 'ACCEPTED');
      const isTaskAccepted = tasks.some((t: any) => t.status === 'ACCEPTED' || (t.assignedEmployees || []).some((e: any) => e.acceptanceStatus === 'ACCEPTED'));
      const hasTasks = tasks.length > 0;

      // 100% Automatic Status Progression based on actual staff work & deliverables
      if (allDeliverablesCompletedOrSubmitted || item.status === 'COMPLETED' || (item.mediaManagerApproved && item.technicalReviewApproved)) {
        computedStatus = item.clientConfirmed ? 'COMPLETED' : (item.status === 'COMPLETED' ? 'COMPLETED' : 'WAITING_FOR_CLIENT_CONFIRMATION');
      } else if (hasProducedDeliverables) {
        if (item.technicalReviewApproved) {
          computedStatus = 'WAITING_FOR_MEDIA_REVIEW';
        } else {
          computedStatus = 'WAITING_FOR_TECHNICAL_REVIEW';
        }
      } else if (!REVIEW_AND_LOCKED_STATUSES.includes(item.status)) {
        if (isTaskInProgress) {
          computedStatus = 'IN_PROGRESS';
        } else if (isTaskAccepted || hasTasks) {
          computedStatus = 'TASK_ASSIGNED';
        } else if (isCalApproved && (item.status === 'PENDING_MARKETING_APPROVAL' || item.status === 'DRAFT' || item.status === 'READY')) {
          computedStatus = 'APPROVED';
        }
      }

      // Calculate automatic progress percentage
      let computedProgress = 10;
      if (computedStatus === 'COMPLETED' || computedStatus === 'APPROVED') {
        computedProgress = 100;
      } else if (computedStatus === 'WAITING_FOR_CLIENT_CONFIRMATION') {
        computedProgress = 95;
      } else if (computedStatus === 'WAITING_FOR_MEDIA_REVIEW') {
        computedProgress = 90;
      } else if (computedStatus === 'WAITING_FOR_TECHNICAL_REVIEW') {
        computedProgress = 75;
      } else if (computedStatus === 'IN_PROGRESS') {
        computedProgress = 45;
      } else if (computedStatus === 'TASK_ASSIGNED') {
        computedProgress = 25;
      }

      if (computedStatus !== item.status) {
        await this.prisma.graphicRequirement.update({
          where: { id: item.id },
          data: {
            status: computedStatus,
          },
        }).catch(() => null);
        item.status = computedStatus;
      }

      // Automatically update task completion percentages for associated tasks
      if (hasTasks) {
        for (const task of tasks) {
          if (task.completionPercentage !== computedProgress && task.status !== 'COMPLETED') {
            await this.prisma.task.update({
              where: { id: task.id },
              data: {
                completionPercentage: computedProgress,
                ...(computedStatus === 'IN_PROGRESS' && { status: 'IN_PROGRESS' }),
                ...(computedStatus === 'WAITING_FOR_TECHNICAL_REVIEW' && { status: 'WAITING_FOR_REVIEW' }),
                ...(computedStatus === 'COMPLETED' && { status: 'COMPLETED', completionPercentage: 100 }),
              },
            }).catch(() => null);
            task.completionPercentage = computedProgress;
          }
        }
      }
    }

    return items;
  }

  async findOne(id: string, user?: any) {
    const req = await this.prisma.graphicRequirement.findUnique({
      where: { id },
      include: {
        project: { include: { calendarEvent: true } },
        client: true,
        brand: true,
        calendarEvent: true,
        sourceForCalendarEvents: { include: { createdBy: { select: { id: true, name: true, role: true } } } },
        product: true,
        campaign: true,
        tasks: { include: { assignedEmployees: { include: { user: true } } } },
        files: true,
        deliverables: {
          include: {
            createdBy: { select: { id: true, name: true, role: true } },
            assignedStaff: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        timeline: {
          include: { user: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
        remarksHistory: {
          include: { user: { select: { id: true, name: true, role: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!req) throw new NotFoundException('Graphic Requirement not found');
    const [synced] = await this.syncGraphicRequirementStatuses([req]);
    if (user && user.id && user.role) {
      if (!canUserViewRequirement({ id: user.id, role: user.role }, synced)) {
        throw new ForbiddenException('Access Denied: Requirement is not in Technical Review or later stage.');
      }
    }
    return synced;
  }

  async create(data: any) {
    if (!data.projectId) {
      throw new BadRequestException(
        'Every Graphic Requirement must belong to a parent Shoot Project. A Graphic Requirement cannot exist independently.',
      );
    }

    const project = await this.prisma.shootProject.findUnique({
      where: { id: data.projectId },
      include: { client: true, brand: true, calendarEvent: true },
    });
    if (!project) throw new NotFoundException('Parent project not found');

    const count = await this.prisma.graphicRequirement.count();

    // Configurable naming convention: read prefix from SystemSetting (defaults to 'GR-')
    const prefixSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'GRAPHIC_REQ_ID_PREFIX' },
    });
    const idPrefix = prefixSetting?.value?.trim() || 'GR-';
    const autoReqId = `${idPrefix}${(count + 1).toString().padStart(6, '0')}`;

    const req = await this.prisma.graphicRequirement.create({
      data: {
        requirementId: autoReqId,
        name: data.name,
        projectId: project.id,
        clientId: project.clientId,
        brandId: project.brandId,
        calendarEventId: project.calendarEventId || data.calendarEventId || null,
        productId: data.productId || project.productId || null,
        campaignId: data.campaignId || project.campaignId || null,
        requirementType: data.requirementType || 'Poster',
        objective: data.objective,
        description: data.description,
        priority: data.priority || 'MEDIUM',
        estimatedCompletion: data.estimatedCompletion ? new Date(data.estimatedCompletion) : null,
        status: data.status || 'APPROVED',
        remarks: data.remarks,
      },
      include: {
        project: true,
        client: true,
        brand: true,
        calendarEvent: true,
        product: true,
        campaign: true,
        tasks: { include: { assignedEmployees: { include: { user: true } } } },
        files: true,
        timeline: {
          include: { user: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Log Requirement Created Timeline Event
    await this.prisma.graphicRequirementTimeline.create({
      data: {
        graphicRequirementId: req.id,
        event: 'REQUIREMENT_CREATED',
        description: `Graphic Requirement ${req.requirementId} ('${req.name}') created and bound to project ${project.projectId}`,
      },
    });

    if (data.assignedUserIds?.length > 0 || data.employeeAssignments?.length > 0) {
      await this.prisma.graphicRequirementTimeline.create({
        data: {
          graphicRequirementId: req.id,
          event: 'ASSIGNED',
          description: `Staff assigned to Graphic Requirement ${req.requirementId}`,
        },
      });
    }

    return req;
  }

  async update(id: string, data: any) {
    const existing = await this.findOne(id);
    const isRevision = data.status === 'CLIENT_REVISION_REQUESTED' || data.status === 'REVISION_REQUESTED';
    const nextRevisionCount = isRevision ? (existing.revisionCount || 0) + 1 : existing.revisionCount;
    const targetStatus = isRevision ? 'IN_PROGRESS' : (data.status || existing.status);

    const technicalReviewApproved = data.technicalReviewApproved !== undefined
      ? Boolean(data.technicalReviewApproved)
      : existing.technicalReviewApproved;
    const mediaManagerApproved = data.mediaManagerApproved !== undefined
      ? Boolean(data.mediaManagerApproved)
      : existing.mediaManagerApproved;
    const clientConfirmed = data.clientConfirmed !== undefined
      ? Boolean(data.clientConfirmed)
      : existing.clientConfirmed;

    const hasDeliverables = (existing.files && existing.files.length > 0) || Boolean(data.hasProductionDeliverables);

    let finalStatus = targetStatus;
    if (hasDeliverables && technicalReviewApproved && mediaManagerApproved && clientConfirmed && targetStatus !== 'CANCELLED') {
      finalStatus = 'COMPLETED';
    }

    const updated = await this.prisma.graphicRequirement.update({
      where: { id },
      data: {
        name: data.name,
        requirementType: data.requirementType,
        objective: data.objective,
        description: data.description,
        priority: data.priority,
        status: finalStatus,
        revisionCount: nextRevisionCount,
        technicalReviewApproved,
        mediaManagerApproved,
        clientConfirmed,
        remarks: data.remarks,
        productId: data.productId,
        campaignId: data.campaignId,
        estimatedCompletion: data.estimatedCompletion ? new Date(data.estimatedCompletion) : undefined,
      },
      include: {
        project: true,
        client: true,
        brand: true,
        calendarEvent: true,
        product: true,
        campaign: true,
        tasks: { include: { assignedEmployees: { include: { user: true } } } },
        files: true,
        timeline: {
          include: { user: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
        remarksHistory: {
          include: { user: { select: { id: true, name: true, role: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (data.assignedUserIds && Array.isArray(data.assignedUserIds) && data.assignedUserIds.length > 0) {
      for (const t of updated.tasks) {
        await this.prisma.taskAssignment.deleteMany({ where: { taskId: t.id } });
        await this.prisma.taskAssignment.createMany({
          data: data.assignedUserIds.map((userId: string) => ({
            taskId: t.id,
            userId,
          })),
        });
      }
      await this.prisma.graphicRequirementTimeline.create({
        data: {
          graphicRequirementId: id,
          event: 'ASSIGNED',
          description: `Staff assigned to Graphic Requirement ${existing.requirementId}`,
        },
      });
    }

    // Log timeline event for revision request & status transitions
    if (isRevision) {
      await this.prisma.graphicRequirementTimeline.create({
        data: {
          graphicRequirementId: id,
          event: 'REVISION_REQUESTED',
          description: `Revision #${nextRevisionCount} requested. Workflow restarted from Production phase. Previous file scheduled for replacement.`,
        },
      });
    } else if (finalStatus === 'COMPLETED' && existing.status !== 'COMPLETED') {
      await this.prisma.graphicRequirementTimeline.create({
        data: {
          graphicRequirementId: id,
          event: 'COMPLETED',
          description: `Graphic Requirement ${existing.requirementId} COMPLETED! All 4 criteria satisfied: Production Complete, Technical Review Approved, Media Manager Approved, Client Confirmed.`,
        },
      });
    } else if (data.status && data.status !== existing.status) {
      let eventType = 'STATUS_UPDATED';
      if (data.status === 'ASSIGNED') eventType = 'ASSIGNED';
      else if (data.status === 'IN_PROGRESS') eventType = 'PRODUCTION_STARTED';
      else if (data.status === 'WAITING_FOR_TECHNICAL_REVIEW') eventType = 'TECHNICAL_REVIEW';
      else if (data.status === 'WAITING_FOR_MEDIA_REVIEW') eventType = 'MEDIA_REVIEW';
      else if (data.status === 'WAITING_FOR_CLIENT_CONFIRMATION') eventType = 'CLIENT_CONFIRMATION';

      await this.prisma.graphicRequirementTimeline.create({
        data: {
          graphicRequirementId: id,
          event: eventType,
          description: `Requirement status updated from ${existing.status} to ${data.status}`,
        },
      });
    }

    return updated;
  }

  async addRemark(id: string, message: string, userId: string) {
    const graphicReq = await this.findOne(id);
    if (!message || !message.trim()) {
      throw new BadRequestException('Remark message cannot be empty');
    }

    const remark = await this.prisma.graphicRequirementRemark.create({
      data: {
        graphicRequirementId: id,
        userId,
        message: message.trim(),
      },
      include: {
        user: { select: { id: true, name: true, role: true, avatarUrl: true } },
      },
    });

    await this.prisma.graphicRequirementTimeline.create({
      data: {
        graphicRequirementId: id,
        userId,
        event: 'REMARK_ADDED',
        description: `Added permanent remark: "${message.trim()}"`,
      },
    });

    return remark;
  }

  private isStaffAssignedToReq(req: any, userId: string): boolean {
    if (!req || !userId) return false;
    const isTaskAssigned =
      Array.isArray(req.tasks) &&
      req.tasks.some(
        (t: any) =>
          t.assignedToId === userId ||
          (Array.isArray(t.assignedEmployees) &&
            t.assignedEmployees.some((e: any) => e.userId === userId || e.employeeId === userId || e.user?.id === userId)),
      );
    if (isTaskAssigned) return true;

    if (req.createdById === userId) return true;

    return false;
  }

  async getDeliverables(id: string, user?: any) {
    const req = await this.findOne(id, user);
    const deliverables = await this.prisma.graphicRequirementDeliverable.findMany({
      where: { graphicRequirementId: id },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        assignedStaff: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return deliverables;
  }

  async addDeliverable(id: string, data: any, user: any) {
    const req = await this.prisma.graphicRequirement.findUnique({
      where: { id },
      include: {
        project: { include: { assignedTeam: true } },
        tasks: { include: { assignedEmployees: true } },
      },
    });
    if (!req) throw new NotFoundException('Graphic Requirement not found');

    const isAssigned = this.isStaffAssignedToReq(req, user?.id);
    if (!isAssigned && user?.role !== 'ADMIN' && user?.role !== 'ADMINISTRATOR') {
      throw new ForbiddenException(
        'Only the assigned staff member to whom this Graphic Requirement is assigned can add produced deliverable outputs.',
      );
    }

    const deliverable = await this.prisma.graphicRequirementDeliverable.create({
      data: {
        graphicRequirementId: id,
        name: data.name || data.title || 'Produced Deliverable',
        type: data.type || 'Graphic Asset',
        description: data.description || '',
        fileUrl: data.fileUrl || null,
        fileName: data.fileName || null,
        fileSize: data.fileSize ? Number(data.fileSize) : null,
        status: data.status || 'DRAFT',
        remarks: data.remarks || '',
        submissionDate: data.status === 'SUBMITTED' ? new Date() : (data.submissionDate ? new Date(data.submissionDate) : null),
        createdById: user?.id,
        assignedStaffId: user?.id,
      },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        assignedStaff: { select: { id: true, name: true, role: true } },
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: user?.id,
        action: 'GRAPHIC_REQUIREMENT_DELIVERABLE_CREATED',
        entity: 'GRAPHIC_REQUIREMENT',
        entityId: id,
        description: `Created produced deliverable "${deliverable.name}" for Graphic Requirement ${req.requirementId}`,
      },
    }).catch(() => null);

    await this.prisma.graphicRequirementTimeline.create({
      data: {
        graphicRequirementId: id,
        userId: user?.id,
        event: 'DELIVERABLE_ADDED',
        description: `Added produced deliverable: ${deliverable.name} (${deliverable.type})`,
      },
    });

    // Advance associated tasks progress percentage to 75%
    await this.prisma.task.updateMany({
      where: { graphicRequirementId: id },
      data: {
        completionPercentage: 75,
        status: 'WAITING_FOR_REVIEW',
      },
    }).catch(() => null);

    return deliverable;
  }

  async updateDeliverable(deliverableId: string, data: any, user: any) {
    const deliverable = await this.prisma.graphicRequirementDeliverable.findUnique({
      where: { id: deliverableId },
      include: {
        graphicRequirement: {
          include: {
            project: { include: { assignedTeam: true } },
            tasks: { include: { assignedEmployees: true } },
          },
        },
      },
    });
    if (!deliverable) throw new NotFoundException('Deliverable output not found');

    const isAssigned = this.isStaffAssignedToReq(deliverable.graphicRequirement, user?.id);
    if (!isAssigned && deliverable.createdById !== user?.id && deliverable.assignedStaffId !== user?.id && user?.role !== 'ADMIN' && user?.role !== 'ADMINISTRATOR') {
      throw new ForbiddenException(
        'Only the assigned staff member to whom this Graphic Requirement is assigned can modify this produced deliverable output.',
      );
    }

    const updated = await this.prisma.graphicRequirementDeliverable.update({
      where: { id: deliverableId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.type && { type: data.type }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.fileUrl !== undefined && { fileUrl: data.fileUrl }),
        ...(data.fileName !== undefined && { fileName: data.fileName }),
        ...(data.fileSize !== undefined && { fileSize: Number(data.fileSize) }),
        ...(data.status && { status: data.status }),
        ...(data.remarks !== undefined && { remarks: data.remarks }),
        ...(data.submissionDate !== undefined && { submissionDate: data.submissionDate ? new Date(data.submissionDate) : null }),
      },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        assignedStaff: { select: { id: true, name: true, role: true } },
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: user?.id,
        action: 'GRAPHIC_REQUIREMENT_DELIVERABLE_UPDATED',
        entity: 'GRAPHIC_REQUIREMENT',
        entityId: deliverable.graphicRequirementId,
        description: `Updated produced deliverable "${updated.name}" for Graphic Requirement ${deliverable.graphicRequirement?.requirementId}`,
      },
    }).catch(() => null);

    return updated;
  }

  async updateDeliverableStatus(deliverableId: string, status: string, user: any) {
    const deliverable = await this.prisma.graphicRequirementDeliverable.findUnique({
      where: { id: deliverableId },
      include: {
        graphicRequirement: {
          include: {
            project: { include: { assignedTeam: true } },
            tasks: { include: { assignedEmployees: true } },
          },
        },
      },
    });
    if (!deliverable) throw new NotFoundException('Deliverable output not found');

    const isAssigned = this.isStaffAssignedToReq(deliverable.graphicRequirement, user?.id);
    if (!isAssigned && deliverable.createdById !== user?.id && deliverable.assignedStaffId !== user?.id && user?.role !== 'ADMIN' && user?.role !== 'ADMINISTRATOR') {
      throw new ForbiddenException(
        'Only the assigned staff member to whom this Graphic Requirement is assigned can update deliverable status.',
      );
    }

    const updated = await this.prisma.graphicRequirementDeliverable.update({
      where: { id: deliverableId },
      data: {
        status,
        ...(status === 'SUBMITTED' && { submissionDate: new Date() }),
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: user?.id,
        action: 'GRAPHIC_REQUIREMENT_DELIVERABLE_STATUS_CHANGED',
        entity: 'GRAPHIC_REQUIREMENT',
        entityId: deliverable.graphicRequirementId,
        description: `Updated deliverable "${deliverable.name}" status to ${status}`,
      },
    }).catch(() => null);

    return updated;
  }

  async deleteDeliverable(deliverableId: string, user: any) {
    const deliverable = await this.prisma.graphicRequirementDeliverable.findUnique({
      where: { id: deliverableId },
      include: {
        graphicRequirement: {
          include: {
            project: { include: { assignedTeam: true } },
            tasks: { include: { assignedEmployees: true } },
          },
        },
      },
    });
    if (!deliverable) throw new NotFoundException('Deliverable output not found');

    const isAssigned = this.isStaffAssignedToReq(deliverable.graphicRequirement, user?.id);
    if (!isAssigned && deliverable.createdById !== user?.id && deliverable.assignedStaffId !== user?.id && user?.role !== 'ADMIN' && user?.role !== 'ADMINISTRATOR') {
      throw new ForbiddenException(
        'Only the assigned staff member to whom this Graphic Requirement is assigned can delete this deliverable.',
      );
    }

    await this.prisma.graphicRequirementDeliverable.delete({ where: { id: deliverableId } });

    await this.prisma.activityLog.create({
      data: {
        userId: user?.id,
        action: 'GRAPHIC_REQUIREMENT_DELIVERABLE_DELETED',
        entity: 'GRAPHIC_REQUIREMENT',
        entityId: deliverable.graphicRequirementId,
        description: `Deleted produced deliverable "${deliverable.name}" from Graphic Requirement ${deliverable.graphicRequirement?.requirementId}`,
      },
    }).catch(() => null);

    return { success: true };
  }
}

