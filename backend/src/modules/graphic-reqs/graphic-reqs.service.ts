import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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
    if (p.status && p.status !== 'ALL') where.status = p.status;
    if (p.priority && p.priority !== 'ALL') where.priority = p.priority;

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

    // Role-based query filtering for STAFF: only assigned tasks or projects (unless all=true requested)
    if (p.role === 'STAFF' && p.userId && p.all !== 'true' && p.all !== '1') {
      where.OR = [
        { tasks: { some: { assignedEmployees: { some: { userId: p.userId } } } } },
        { project: { assignedTeam: { some: { userId: p.userId } } } },
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

    return this.prisma.graphicRequirement.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const req = await this.prisma.graphicRequirement.findUnique({
      where: { id },
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
    if (!req) throw new NotFoundException('Graphic Requirement not found');
    return req;
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
        status: data.status || 'DRAFT',
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

    // Automated Task Creation Trigger 4: Automatically created from graphic requirements
    const taskCount = await this.prisma.task.count();
    const autoTaskId1 = `TSK-${(taskCount + 1).toString().padStart(6, '0')}`;
    const autoTaskId2 = `TSK-${(taskCount + 2).toString().padStart(6, '0')}`;

    await this.prisma.task.createMany({
      data: [
        {
          taskId: autoTaskId1,
          title: `Graphic Asset Design & Key Visual Composition - ${req.name}`,
          description: `Automated graphic task generated for Requirement ${req.requirementId}`,
          projectId: req.projectId,
          graphicRequirementId: req.id,
          clientId: req.clientId,
          brandId: req.brandId,
          productId: req.productId || null,
          priority: req.priority || 'MEDIUM',
          dueDate: req.estimatedCompletion || new Date(Date.now() + 2 * 86400000),
          estimatedHours: 3.0,
          status: 'PENDING',
        },
        {
          taskId: autoTaskId2,
          title: `Final Graphic Export & Review Preparation - ${req.name}`,
          description: `Automated graphic task generated for Requirement ${req.requirementId}`,
          projectId: req.projectId,
          graphicRequirementId: req.id,
          clientId: req.clientId,
          brandId: req.brandId,
          productId: req.productId || null,
          priority: req.priority || 'MEDIUM',
          dueDate: req.estimatedCompletion || new Date(Date.now() + 3 * 86400000),
          estimatedHours: 2.0,
          status: 'PENDING',
        },
      ],
    });

    const createdTasks = await this.prisma.task.findMany({
      where: { taskId: { in: [autoTaskId1, autoTaskId2] } },
    });

    for (const t of createdTasks) {
      if (data.assignedUserIds && Array.isArray(data.assignedUserIds) && data.assignedUserIds.length > 0) {
        await this.prisma.taskAssignment.createMany({
          data: data.assignedUserIds.map((userId: string) => ({
            taskId: t.id,
            userId,
          })),
        });
      }

      await this.prisma.taskTimeline.create({
        data: {
          taskId: t.id,
          event: 'TASK_CREATED',
          description: `Task ${t.taskId} ('${t.title}') automatically created during Graphic Requirement ${req.requirementId} creation`,
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
}

