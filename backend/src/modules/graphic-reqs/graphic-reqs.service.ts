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

    // Role-based query filtering for STAFF: only assigned tasks or projects
    if (p.role === 'STAFF' && p.userId) {
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

  async create(data: any, user?: any) {
    return this.prisma.$transaction(async (tx) => {
      let project: any = null;
      if (data.projectId) {
        project = await tx.shootProject.findUnique({
          where: { id: data.projectId },
          include: { client: true, brand: true, calendarEvent: true },
        });
      }

      // Fallback: If no projectId provided or not found, find latest active project or auto-create one
      if (!project && data.clientId && data.brandId) {
        project = await tx.shootProject.findFirst({
          where: { clientId: data.clientId, brandId: data.brandId },
          include: { client: true, brand: true, calendarEvent: true },
          orderBy: { createdAt: 'desc' },
        });
      }

      if (!project) {
        if (!data.clientId || !data.brandId) {
          throw new BadRequestException(
            'Client and Brand are required to create a Graphic Requirement.',
          );
        }

        const projectCount = await tx.shootProject.count();
        const autoProjectId = `SP-${(projectCount + 1).toString().padStart(6, '0')}`;
        const brandObj = await tx.brand.findUnique({ where: { id: data.brandId } });
        const brandCode = brandObj?.shortCode || 'PROJECT';
        const projName = `${data.name || 'Graphic Project'} (${brandCode})`;

        project = await tx.shootProject.create({
          data: {
            projectId: autoProjectId,
            name: projName,
            clientId: data.clientId,
            brandId: data.brandId,
            productId: data.productId || null,
            campaignId: data.campaignId || null,
            shootType: 'INDOOR',
            shootDate: data.estimatedCompletion ? new Date(data.estimatedCompletion) : new Date(),
            shootLocation: 'Studio / Designated Site',
            priority: data.priority || 'MEDIUM',
            status: 'PLANNED',
            createdById: user?.id || '',
          },
          include: { client: true, brand: true, calendarEvent: true },
        });
      }

      const count = await tx.graphicRequirement.count();
      const prefixSetting = await tx.systemSetting.findUnique({
        where: { key: 'GRAPHIC_REQ_ID_PREFIX' },
      });
      const idPrefix = prefixSetting?.value?.trim() || 'GR-';
      const autoReqId = `${idPrefix}${(count + 1).toString().padStart(6, '0')}`;

      // Create Graphic Requirement Record
      const req = await tx.graphicRequirement.create({
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
        },
      });

      // Log Requirement Created Timeline Event
      await tx.graphicRequirementTimeline.create({
        data: {
          graphicRequirementId: req.id,
          userId: user?.id || null,
          event: 'REQUIREMENT_CREATED',
          description: `Graphic Requirement ${req.requirementId} ('${req.name}') created and bound to project ${project.projectId}`,
        },
      });

      if (data.assignedUserIds?.length > 0 || data.employeeAssignments?.length > 0) {
        await tx.graphicRequirementTimeline.create({
          data: {
            graphicRequirementId: req.id,
            userId: user?.id || null,
            event: 'ASSIGNED',
            description: `Staff assigned to Graphic Requirement ${req.requirementId}`,
          },
        });
      }

      // Automated Tasks Creation
      const taskCount = await tx.task.count();
      const autoTaskId1 = `TSK-${(taskCount + 1).toString().padStart(6, '0')}`;
      const autoTaskId2 = `TSK-${(taskCount + 2).toString().padStart(6, '0')}`;

      await tx.task.createMany({
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

      const createdTasks = await tx.task.findMany({
        where: { taskId: { in: [autoTaskId1, autoTaskId2] } },
      });

      for (const t of createdTasks) {
        if (data.assignedUserIds && Array.isArray(data.assignedUserIds) && data.assignedUserIds.length > 0) {
          await tx.taskAssignment.createMany({
            data: data.assignedUserIds.map((userId: string) => ({
              taskId: t.id,
              userId,
            })),
          });
        }

        await tx.taskTimeline.create({
          data: {
            taskId: t.id,
            event: 'TASK_CREATED',
            description: `Task ${t.taskId} ('${t.title}') automatically created during Graphic Requirement ${req.requirementId} creation`,
          },
        });
      }

      // AUTOMATIC MEDIA CALENDAR EVENT CREATION & MARKETING MANAGER APPROVAL WORKFLOW
      // 1. Generate unique Calendar Event ID
      const calCount = await tx.mediaCalendarEvent.count();
      const calPrefixSetting = await tx.systemSetting.findUnique({
        where: { key: 'CALENDAR_EVENT_PREFIX' },
      });
      const calPrefix = calPrefixSetting?.value?.trim() || 'CAL-';
      const autoCalEventId = `${calPrefix}${(calCount + 1).toString().padStart(6, '0')}`;

      // 2. Create Media Calendar Event in PENDING_CLIENT_APPROVAL status
      const calendarEvent = await tx.mediaCalendarEvent.create({
        data: {
          eventId: autoCalEventId,
          title: req.name,
          clientId: req.clientId,
          brandId: req.brandId,
          productId: req.productId || null,
          contentType: req.requirementType || 'Poster',
          platform: data.platform || 'Instagram',
          caption: req.objective || req.description || null,
          description: req.description || req.objective || null,
          shootDate: req.estimatedCompletion ? new Date(req.estimatedCompletion) : new Date(),
          clientApprovalDeadline: req.estimatedCompletion ? new Date(req.estimatedCompletion) : new Date(Date.now() + 5 * 86400000),
          priority: req.priority || 'MEDIUM',
          productionNotes: req.remarks || null,
          version: 1,
          createdById: user?.id || null,
          status: 'PENDING_CLIENT_APPROVAL', // MANDATORY RULE: NEVER auto-approve
          submittedAt: new Date(),
        },
      });

      // 3. Link Graphic Requirement to Media Calendar Event
      await tx.graphicRequirement.update({
        where: { id: req.id },
        data: { calendarEventId: calendarEvent.id },
      });

      // 4. Find Marketing Manager assigned to Client
      const clientAssign = await tx.clientAssignment.findFirst({
        where: {
          clientId: req.clientId,
          user: { role: 'MARKETING_MANAGER', status: 'ACTIVE' },
        },
        include: { user: true },
      });

      let approver = clientAssign?.user;
      if (!approver) {
        approver = await tx.user.findFirst({
          where: { role: 'MARKETING_MANAGER', status: 'ACTIVE' },
        });
      }

      // 5. Create Client Approval Request
      const approvalReq = await tx.approval.create({
        data: {
          entityType: 'MEDIA_CALENDAR_EVENT',
          entityId: calendarEvent.id,
          approvalType: 'CLIENT_APPROVAL',
          targetRole: 'MARKETING_MANAGER',
          requestedById: user?.id || null,
          reviewerId: approver?.id || null,
          status: 'PENDING',
          remarks: `Automatic approval request for Media Calendar Event '${calendarEvent.title}' generated from Graphic Requirement ${req.requirementId}.`,
        },
      });

      // 6. Create Calendar Revision Snapshot & Approval History Log
      const revision = await tx.calendarEventRevision.create({
        data: {
          calendarEventId: calendarEvent.id,
          version: 1,
          title: calendarEvent.title,
          caption: calendarEvent.caption,
          contentType: calendarEvent.contentType,
          platform: calendarEvent.platform,
          creativePreviewUrl: calendarEvent.creativePreviewUrl,
          productionNotes: calendarEvent.productionNotes,
          createdById: user?.id || approver?.id || '',
        },
      });

      await tx.calendarApprovalHistory.create({
        data: {
          calendarEventId: calendarEvent.id,
          revisionId: revision.id,
          version: 1,
          userId: user?.id || approver?.id || '',
          role: user?.role || 'MEDIA_MANAGER',
          action: 'SUBMITTED',
          previousStatus: 'DRAFT',
          newStatus: 'PENDING_CLIENT_APPROVAL',
          comment: `Automatically created from Graphic Requirement ${req.requirementId} and submitted for Marketing Manager approval.`,
        },
      });

      // 7. Send Notification to Assigned Marketing Manager
      if (approver) {
        const clientObj = await tx.client.findUnique({ where: { id: req.clientId } });
        await tx.notification.create({
          data: {
            userId: approver.id,
            title: 'New Media Calendar Event Pending Client Approval',
            message: `Graphic Requirement ${req.requirementId} ("${req.name}") automatically created Media Calendar Event (${calendarEvent.eventId || calendarEvent.id}) for ${clientObj?.name || 'Client'}. Pending client approval.`,
            type: 'INFO',
            category: 'CALENDAR_EVENT',
            priority: 'HIGH',
            entityType: 'CALENDAR_EVENT',
            entityId: calendarEvent.id,
            graphicRequirementId: req.id,
            linkUrl: '/client-review',
          },
        });
      }

      // 8. Log Audit Entries
      if (user?.id) {
        await tx.activityLog.createMany({
          data: [
            {
              userId: user.id,
              action: 'GRAPHIC_REQUIREMENT_CREATED',
              entity: 'GraphicRequirement',
              entityId: req.id,
              description: `${user.role} (${user.name}) created Graphic Requirement ${req.requirementId} ('${req.name}').`,
              metadata: JSON.stringify({ requirementId: req.requirementId, projectId: req.projectId }),
            },
            {
              userId: user.id,
              action: 'MEDIA_CALENDAR_EVENT_AUTO_CREATED',
              entity: 'MediaCalendarEvent',
              entityId: calendarEvent.id,
              description: `System automatically generated Media Calendar Event ${calendarEvent.eventId || calendarEvent.id} from Graphic Requirement ${req.requirementId}.`,
              metadata: JSON.stringify({ eventId: calendarEvent.eventId || calendarEvent.id, graphicRequirementId: req.id }),
            },
            {
              userId: user.id,
              action: 'CLIENT_APPROVAL_REQUEST_CREATED',
              entity: 'Approval',
              entityId: approvalReq.id,
              description: `Client approval request created and assigned to Marketing Manager (${approver?.name || 'Unassigned'}) for event '${calendarEvent.title}'.`,
              metadata: JSON.stringify({ approverId: approver?.id, calendarEventId: calendarEvent.id }),
            },
          ],
        });
      }

      // Return fully populated Graphic Requirement
      return tx.graphicRequirement.findUnique({
        where: { id: req.id },
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
    });
  }

  async update(id: string, data: any, user?: any) {
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

    // Idempotent Update of Linked Media Calendar Event (Do NOT create duplicate calendar events!)
    if (existing.calendarEventId) {
      const calData: any = {};
      if (data.name) calData.title = data.name;
      if (data.requirementType) calData.contentType = data.requirementType;
      if (data.priority) calData.priority = data.priority;
      if (data.objective || data.description) {
        calData.caption = data.objective || data.description;
        calData.description = data.description || data.objective;
      }
      if (data.estimatedCompletion) {
        calData.shootDate = new Date(data.estimatedCompletion);
        calData.clientApprovalDeadline = new Date(data.estimatedCompletion);
      }

      // If updating requirement resubmits for client approval
      if (data.resubmitForClientApproval || isRevision) {
        calData.status = 'PENDING_CLIENT_APPROVAL';
        calData.submittedAt = new Date();
      }

      if (Object.keys(calData).length > 0) {
        await this.prisma.mediaCalendarEvent.update({
          where: { id: existing.calendarEventId },
          data: calData,
        });

        if (calData.status === 'PENDING_CLIENT_APPROVAL') {
          // Find assigned Marketing Manager and send resubmission notification
          const clientAssign = await this.prisma.clientAssignment.findFirst({
            where: {
              clientId: existing.clientId,
              user: { role: 'MARKETING_MANAGER', status: 'ACTIVE' },
            },
            include: { user: true },
          });

          const approver = clientAssign?.user || (await this.prisma.user.findFirst({ where: { role: 'MARKETING_MANAGER', status: 'ACTIVE' } }));
          if (approver) {
            await this.prisma.notification.create({
              data: {
                userId: approver.id,
                title: 'Media Calendar Event Resubmitted for Client Approval',
                message: `Graphic Requirement ${existing.requirementId} ("${existing.name}") has been updated and resubmitted for client approval.`,
                type: 'INFO',
                category: 'CALENDAR_EVENT',
                priority: 'HIGH',
                entityType: 'CALENDAR_EVENT',
                entityId: existing.calendarEventId,
                graphicRequirementId: existing.id,
                linkUrl: '/client-review',
              },
            });
          }
        }
      }
    }

    // Log timeline event for revision request & status transitions
    if (isRevision) {
      await this.prisma.graphicRequirementTimeline.create({
        data: {
          graphicRequirementId: id,
          userId: user?.id || null,
          event: 'REVISION_REQUESTED',
          description: `Revision #${nextRevisionCount} requested. Workflow restarted from Production phase. Previous file scheduled for replacement.`,
        },
      });
    } else if (finalStatus === 'COMPLETED' && existing.status !== 'COMPLETED') {
      await this.prisma.graphicRequirementTimeline.create({
        data: {
          graphicRequirementId: id,
          userId: user?.id || null,
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
          userId: user?.id || null,
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

