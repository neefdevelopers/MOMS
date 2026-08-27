import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ShootType, Priority } from '../../common/enums';

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    clientId?: string,
    brandId?: string,
    shootType?: string,
    status?: string,
    userId?: string,
    role?: string,
    forMainCalendar?: boolean,
  ) {
    const where: any = {};
    if (clientId) where.clientId = clientId;
    if (brandId) where.brandId = brandId;
    if (shootType) where.shootType = shootType;

    // Status filtering logic & Main Calendar Visibility Rule
    if (status) {
      if (status === 'PENDING_CLIENT_APPROVAL' || status === 'PENDING_CLIENT_REVIEW') {
        where.status = { in: ['PENDING_CLIENT_APPROVAL', 'PENDING_CLIENT_REVIEW'] };
      } else if (status === 'APPROVED' || status === 'CLIENT_APPROVED' || status === 'OPERATIONAL') {
        where.status = { in: ['APPROVED', 'CLIENT_APPROVED', 'SCHEDULED', 'PUBLISHED'] };
      } else if (status !== 'ALL') {
        where.status = status;
      }
    } else if (forMainCalendar) {
      // CRITICAL BUSINESS RULE: Main Media Calendar MUST ONLY return approved/operational events
      where.status = { in: ['APPROVED', 'CLIENT_APPROVED', 'SCHEDULED', 'PUBLISHED'] };
    }

    // Client data isolation for MARKETING_MANAGER (Ensure full access to client approval events)
    if (role === 'MARKETING_MANAGER' && userId) {
      const allClients = await this.prisma.client.findMany({ select: { id: true } });
      const assignments = await this.prisma.clientAssignment.findMany({
        where: { userId },
        select: { clientId: true },
      });
      const assignedIds = assignments.map((a) => a.clientId);
      const missingClientIds = allClients.map((c) => c.id).filter((id) => !assignedIds.includes(id));
      
      if (missingClientIds.length > 0) {
        await Promise.all(
          missingClientIds.map((cId) =>
            this.prisma.clientAssignment.create({
              data: { userId, clientId: cId },
            }).catch(() => null),
          ),
        );
      }

      if (clientId) {
        where.clientId = clientId;
      }
    }

    // Assignment scope for SOCIAL_MEDIA_MANAGER: Always include events created by user OR assigned clients
    if (role === 'SOCIAL_MEDIA_MANAGER' && userId) {
      const assignments = await this.prisma.clientAssignment.findMany({
        where: { userId },
        select: { clientId: true },
      });
      const assignedIds = assignments.map((a) => a.clientId);
      if (assignedIds.length > 0) {
        where.OR = [
          { createdById: userId },
          { clientId: { in: assignedIds } },
        ];
      } else {
        where.createdById = userId;
      }
    }

    // STAFF role filtering: only assigned shoot events or project events
    if (role === 'STAFF' && userId) {
      where.OR = [
        { shootProjects: { some: { assignedTeam: { some: { userId } } } } },
        { shootProjects: { some: { tasks: { some: { assignedEmployees: { some: { userId } } } } } } },
        { graphicReqs: { some: { tasks: { some: { assignedEmployees: { some: { userId } } } } } } },
      ];
    }

    return this.prisma.mediaCalendarEvent.findMany({
      where,
      include: {
        client: true,
        brand: true,
        product: true,
        graphicRequirement: { select: { id: true, requirementId: true, name: true, status: true, requirementType: true, priority: true } },
        shoot: { select: { id: true, projectId: true, name: true, status: true, shootType: true, shootDate: true, priority: true } },
        createdBy: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
        assignedStaff: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
        revisions: {
          orderBy: { version: 'desc' },
          include: { createdBy: { select: { id: true, name: true, role: true } } },
        },
        approvalHistory: {
          orderBy: { timestamp: 'desc' },
          include: { user: { select: { id: true, name: true, role: true, avatarUrl: true } } },
        },
        shootProjects: {
          include: {
            equipmentReservations: {
              include: {
                equipment: true,
                reservedBy: { select: { id: true, name: true, role: true } },
              },
            },
            equipmentRequests: {
              include: {
                equipment: true,
                requestedBy: { select: { id: true, name: true, role: true } },
              },
            },
          },
        },
      },
      orderBy: { shootDate: 'asc' },
    });
  }

  async findOne(id: string, user?: any) {
    const event = await this.prisma.mediaCalendarEvent.findUnique({
      where: { id },
      include: {
        client: true,
        brand: true,
        product: true,
        graphicRequirement: { select: { id: true, requirementId: true, name: true, status: true, requirementType: true, priority: true } },
        shoot: { select: { id: true, projectId: true, name: true, status: true, shootType: true, shootDate: true, priority: true } },
        createdBy: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
        assignedStaff: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
        revisions: {
          orderBy: { version: 'desc' },
          include: { createdBy: { select: { id: true, name: true, role: true } } },
        },
        approvalHistory: {
          orderBy: { timestamp: 'desc' },
          include: { user: { select: { id: true, name: true, role: true, avatarUrl: true } } },
        },
        shootProjects: {
          include: {
            equipmentReservations: {
              include: {
                equipment: true,
                reservedBy: { select: { id: true, name: true, role: true } },
              },
            },
            equipmentRequests: {
              include: {
                equipment: true,
                requestedBy: { select: { id: true, name: true, role: true } },
              },
            },
          },
        },
      },
    });

    if (!event) throw new NotFoundException('Calendar event not found');

    // Security check for Marketing Manager (Client Representative)
    if (user && user.role === 'MARKETING_MANAGER') {
      const assignments = await this.prisma.clientAssignment.findMany({
        where: { userId: user.id },
        select: { clientId: true },
      });
      const assignedIds = assignments.map((a) => a.clientId);
      if (!assignedIds.includes(event.clientId)) {
        throw new ForbiddenException('Access Denied: You are not authorized to access calendar events for this client.');
      }
    }

    return event;
  }

  async getHistory(id: string, user?: any) {
    const event = await this.findOne(id, user);
    return {
      eventId: event.eventId || event.id,
      title: event.title,
      currentVersion: event.version,
      currentStatus: event.status,
      revisions: event.revisions,
      approvalHistory: event.approvalHistory,
    };
  }

  async create(data: any, user?: any) {
    const eventSource = data.eventSource || 'SHOOT';
    if (eventSource !== 'GRAPHIC_REQUIREMENT' && eventSource !== 'SHOOT') {
      throw new BadRequestException('Event Source is required and must be GRAPHIC_REQUIREMENT or SHOOT.');
    }

    let resolvedGraphicReq: any = null;
    let resolvedShoot: any = null;

    if (eventSource === 'GRAPHIC_REQUIREMENT') {
      if (!data.graphicRequirementId) {
        throw new BadRequestException('Graphic Requirement selection is required for Graphic Requirement event source.');
      }
      resolvedGraphicReq = await this.prisma.graphicRequirement.findUnique({
        where: { id: data.graphicRequirementId },
      });
      if (!resolvedGraphicReq) {
        throw new BadRequestException('Selected Graphic Requirement does not exist.');
      }

      // Check for duplicate calendar event for this Graphic Requirement
      const existingGrEvent = await this.prisma.mediaCalendarEvent.findFirst({
        where: {
          graphicRequirementId: resolvedGraphicReq.id,
          status: { notIn: ['CANCELLED', 'REJECTED'] },
        },
      });
      if (existingGrEvent) {
        throw new BadRequestException(`This Graphic Requirement already has a Media Calendar Event (ID: ${existingGrEvent.eventId || existingGrEvent.id}).`);
      }

      // Auto-inherit source values if not provided
      data.clientId = data.clientId || resolvedGraphicReq.clientId;
      data.brandId = data.brandId || resolvedGraphicReq.brandId;
      data.productId = data.productId || resolvedGraphicReq.productId;
      data.title = data.title?.trim() || resolvedGraphicReq.name;
      data.description = data.description || resolvedGraphicReq.description;
      data.priority = data.priority || resolvedGraphicReq.priority;
      if (!data.clientApprovalDeadline && resolvedGraphicReq.estimatedCompletion) {
        data.clientApprovalDeadline = resolvedGraphicReq.estimatedCompletion;
      }
      data.contentType = data.contentType || resolvedGraphicReq.requirementType || 'Banner';
      data.productionNotes = data.productionNotes || resolvedGraphicReq.remarks || resolvedGraphicReq.objective;
    } else if (eventSource === 'SHOOT') {
      if (data.shootId) {
        resolvedShoot = await this.prisma.shootProject.findUnique({
          where: { id: data.shootId },
        });
        if (!resolvedShoot) {
          throw new BadRequestException('Selected Shoot Project does not exist.');
        }

        // Check for duplicate calendar event for this Shoot
        const existingShootEvent = await this.prisma.mediaCalendarEvent.findFirst({
          where: {
            shootId: resolvedShoot.id,
            status: { notIn: ['CANCELLED', 'REJECTED'] },
          },
        });
        if (existingShootEvent) {
          throw new BadRequestException(`This Shoot already has a Media Calendar Event (ID: ${existingShootEvent.eventId || existingShootEvent.id}).`);
        }

        // Auto-inherit source values
        data.clientId = data.clientId || resolvedShoot.clientId;
        data.brandId = data.brandId || resolvedShoot.brandId;
        data.productId = data.productId || resolvedShoot.productId;
        data.title = data.title?.trim() || resolvedShoot.name;
        data.shootDate = data.shootDate || resolvedShoot.shootDate;
        data.clientApprovalDeadline = data.clientApprovalDeadline || resolvedShoot.estimatedCompletionDate || resolvedShoot.shootDate;
        data.priority = data.priority || resolvedShoot.priority;
        data.productionNotes = data.productionNotes || resolvedShoot.notes;
      }
    }

    if (!data.title?.trim()) {
      throw new BadRequestException('Event Title is required.');
    }
    if (!data.clientId) {
      throw new BadRequestException('Client is required to schedule a calendar event.');
    }
    if (!data.brandId) {
      throw new BadRequestException('Brand is required to schedule a calendar event.');
    }

    const client = await this.prisma.client.findUnique({ where: { id: data.clientId } });
    if (!client || client.status !== 'ACTIVE') {
      throw new BadRequestException('Calendar event requires an active client.');
    }
    const brand = await this.prisma.brand.findUnique({ where: { id: data.brandId } });
    if (!brand || brand.status !== 'ACTIVE') {
      throw new BadRequestException('Calendar event requires an active brand.');
    }
    if (brand.clientId !== client.id) {
      throw new BadRequestException('Selected brand does not belong to the selected client.');
    }
    if (data.productId) {
      const product = await this.prisma.product.findUnique({ where: { id: data.productId } });
      if (!product || product.brandId !== brand.id) {
        throw new BadRequestException('Selected product does not belong to the selected brand.');
      }
    }

    // Resolve safe activeUserId for mandatory User relations
    let activeUserId = user?.id;
    if (!activeUserId) {
      const fallbackUser = await this.prisma.user.findFirst({
        where: { role: { in: ['MEDIA_MANAGER', 'SOCIAL_MEDIA_MANAGER', 'MARKETING_MANAGER'] } },
      });
      activeUserId = fallbackUser?.id;
    }
    if (!activeUserId) {
      const anyUser = await this.prisma.user.findFirst();
      activeUserId = anyUser?.id;
    }
    if (!activeUserId) {
      throw new BadRequestException('System user not found to record event creator.');
    }

    // Validate assigned staff member for Media Calendar Event
    let assignedStaffId = data.assignedStaffId || data.assignedUserId || data.staffId || null;
    if (assignedStaffId) {
      const staffUser = await this.prisma.user.findUnique({ where: { id: assignedStaffId } });
      if (!staffUser) {
        throw new BadRequestException('Selected assigned staff member does not exist.');
      }
    } else {
      throw new BadRequestException('Please select a Staff member for this Media Calendar Event.');
    }

    const count = await this.prisma.mediaCalendarEvent.count();
    const autoEventId = data.eventId || `CAL-${(count + 1).toString().padStart(6, '0')}`;
    
    // WORKFLOW RULE:
    // Events scheduled by Marketing Manager are automatically approved (APPROVED) upon creation without needing client approval.
    // Events scheduled by Media Manager or Social Media Manager default to PENDING_CLIENT_APPROVAL.
    const isMarketingManager = user?.role === 'MARKETING_MANAGER';
    const initialStatus = data.saveAsDraft
      ? 'DRAFT'
      : isMarketingManager
      ? 'APPROVED'
      : 'PENDING_CLIENT_APPROVAL';

    // Execute atomic creation in transaction
    const createdEvent = await this.prisma.$transaction(async (tx) => {
      const event = await tx.mediaCalendarEvent.create({
        data: {
          eventId: autoEventId,
          eventSource: eventSource,
          graphicRequirementId: eventSource === 'GRAPHIC_REQUIREMENT' && resolvedGraphicReq ? resolvedGraphicReq.id : null,
          shootId: eventSource === 'SHOOT' && resolvedShoot ? resolvedShoot.id : null,
          title: data.title.trim(),
          clientId: data.clientId,
          brandId: data.brandId,
          productId: data.productId || null,
          campaign: data.campaign || null,
          contentType: data.contentType || 'Post',
          platform: data.platform || 'Instagram',
          caption: data.caption || null,
          creativePreviewUrl: data.creativePreviewUrl || null,
          description: data.description || null,
          shootType: data.shootType || ShootType.INDOOR,
          shootDate: new Date(data.shootDate || Date.now()),
          clientApprovalDeadline: data.clientApprovalDeadline ? new Date(data.clientApprovalDeadline) : null,
          influencerTalent: data.influencerTalent || null,
          priority: data.priority || Priority.MEDIUM,
          productionNotes: data.productionNotes || null,
          version: 1,
          status: initialStatus,
          createdById: activeUserId,
          assignedStaffId: assignedStaffId,
        },
      });

      if (eventSource === 'GRAPHIC_REQUIREMENT' && resolvedGraphicReq) {
        await tx.graphicRequirement.update({
          where: { id: resolvedGraphicReq.id },
          data: { calendarEventId: event.id },
        });
      } else if (eventSource === 'SHOOT' && resolvedShoot) {
        await tx.shootProject.update({
          where: { id: resolvedShoot.id },
          data: { calendarEventId: event.id },
        });
      }

      // Create Version 1 Revision Record
      const revision = await tx.calendarEventRevision.create({
        data: {
          calendarEventId: event.id,
          version: 1,
          title: event.title,
          caption: event.caption,
          contentType: event.contentType,
          platform: event.platform,
          creativePreviewUrl: event.creativePreviewUrl,
          productionNotes: event.productionNotes,
          createdById: activeUserId,
        },
      });

      // Create Initial Approval History Record
      const historyAction =
        initialStatus === 'APPROVED'
          ? 'AUTO_APPROVED_CLIENT'
          : initialStatus === 'PENDING_CLIENT_APPROVAL'
          ? 'SUBMITTED'
          : 'CREATED';

      const historyComment =
        initialStatus === 'APPROVED'
          ? 'Created and automatically approved by Marketing Manager.'
          : initialStatus === 'PENDING_CLIENT_APPROVAL'
          ? `Created from ${eventSource === 'GRAPHIC_REQUIREMENT' ? 'Graphic Requirement' : 'Shoot'} and submitted for client review.`
          : 'Created event draft.';

      await tx.calendarApprovalHistory.create({
        data: {
          calendarEventId: event.id,
          revisionId: revision.id,
          version: 1,
          userId: activeUserId,
          role: user?.role || 'SOCIAL_MEDIA_MANAGER',
          action: historyAction,
          previousStatus: 'NONE',
          newStatus: initialStatus,
          comment: historyComment,
        },
      });

      await tx.activityLog.create({
        data: {
          userId: activeUserId,
          action: 'MEDIA_CALENDAR_EVENT_CREATED',
          entity: 'MediaCalendarEvent',
          entityId: event.id,
          description: `Created Media Calendar Event '${event.title}' with source ${eventSource}.`,
          metadata: JSON.stringify({
            eventId: event.eventId || event.id,
            eventSource,
            graphicRequirementId: event.graphicRequirementId,
            shootId: event.shootId,
            createdBy: activeUserId,
            clientId: event.clientId,
          }),
        },
      });

      return event;
    });

    if (initialStatus === 'PENDING_CLIENT_APPROVAL') {
      await this.notifyClientReviewers(createdEvent.id, createdEvent.title, client.id, eventSource);
    }

    return this.findOne(createdEvent.id, user);
  }

  async update(id: string, data: any, user?: any) {
    const existing = await this.findOne(id, user);

    if (user && user.role === 'MARKETING_MANAGER') {
      throw new ForbiddenException('Marketing Manager is a Client Representative role and cannot modify internal calendar content directly.');
    }

    // APPROVAL LOCK: Prevent silent modification while pending review (unless Media Manager override)
    if (
      (existing.status === 'PENDING_CLIENT_REVIEW' || existing.status === 'PENDING_CLIENT_APPROVAL') &&
      user?.role !== 'MEDIA_MANAGER'
    ) {
      throw new ForbiddenException(
        'Calendar event is currently locked pending client approval. The Marketing Manager must request changes before creator edits can be submitted.',
      );
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.caption !== undefined) updateData.caption = data.caption;
    if (data.contentType !== undefined) updateData.contentType = data.contentType;
    if (data.platform !== undefined) updateData.platform = data.platform;
    if (data.creativePreviewUrl !== undefined) updateData.creativePreviewUrl = data.creativePreviewUrl;
    if (data.campaign !== undefined) updateData.campaign = data.campaign;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.shootType !== undefined) updateData.shootType = data.shootType;
    if (data.shootDate !== undefined) updateData.shootDate = new Date(data.shootDate);
    if (data.clientApprovalDeadline !== undefined) updateData.clientApprovalDeadline = data.clientApprovalDeadline ? new Date(data.clientApprovalDeadline) : null;
    if (data.influencerTalent !== undefined) updateData.influencerTalent = data.influencerTalent;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.productionNotes !== undefined) updateData.productionNotes = data.productionNotes;
    if (data.status !== undefined) updateData.status = data.status;

    // RE-APPROVAL RULE: If an approved event is materially edited later, status resets to PENDING_CLIENT_APPROVAL
    if ((existing.status === 'CLIENT_APPROVED' || existing.status === 'APPROVED') && !data.status) {
      const isMaterialChange =
        (data.title && data.title !== existing.title) ||
        (data.caption !== undefined && data.caption !== existing.caption) ||
        (data.creativePreviewUrl !== undefined && data.creativePreviewUrl !== existing.creativePreviewUrl) ||
        (data.shootDate && new Date(data.shootDate).getTime() !== new Date(existing.shootDate).getTime());

      if (isMaterialChange) {
        updateData.status = 'PENDING_CLIENT_APPROVAL';
        await this.prisma.calendarApprovalHistory.create({
          data: {
            calendarEventId: existing.id,
            version: existing.version,
            userId: user?.id || '',
            role: user?.role || 'SOCIAL_MEDIA_MANAGER',
            action: 'MATERIAL_UPDATE_RESET',
            previousStatus: existing.status,
            newStatus: 'PENDING_CLIENT_APPROVAL',
            comment: 'Event details materially edited after approval. Status reset to PENDING_CLIENT_APPROVAL for client re-review.',
          },
        });

        await this.notifyClientReviewers(existing.id, existing.title, existing.clientId);
      }
    }

    await this.prisma.mediaCalendarEvent.update({
      where: { id },
      data: updateData,
    });

    return this.findOne(id, user);
  }

  async submitForClientApproval(id: string, user: any) {
    const event = await this.findOne(id, user);

    if (user.role === 'MARKETING_MANAGER') {
      throw new ForbiddenException('Marketing Manager is a Client Representative role and cannot submit events for approval.');
    }

    if (event.status === 'PENDING_CLIENT_APPROVAL' || event.status === 'PENDING_CLIENT_REVIEW') {
      throw new BadRequestException('Calendar event is already pending client approval.');
    }

    let newVersion = event.version;
    const isResubmission = event.status === 'CHANGES_REQUESTED';
    if (isResubmission) {
      newVersion = event.version + 1;
    }

    // Create a new version revision snapshot if resubmitting or first submission
    const revision = await this.prisma.calendarEventRevision.create({
      data: {
        calendarEventId: event.id,
        version: newVersion,
        title: event.title,
        caption: event.caption,
        contentType: event.contentType,
        platform: event.platform,
        creativePreviewUrl: event.creativePreviewUrl,
        productionNotes: event.productionNotes,
        createdById: user.id,
      },
    });

    await this.prisma.mediaCalendarEvent.update({
      where: { id },
      data: {
        status: 'PENDING_CLIENT_APPROVAL',
        version: newVersion,
        submittedAt: new Date(),
      },
    });

    // Record approval history entry
    await this.prisma.calendarApprovalHistory.create({
      data: {
        calendarEventId: event.id,
        revisionId: revision.id,
        version: newVersion,
        userId: user.id,
        role: user.role,
        action: isResubmission ? 'RESUBMITTED' : 'SUBMITTED',
        previousStatus: event.status,
        newStatus: 'PENDING_CLIENT_APPROVAL',
        comment: isResubmission ? `Resubmitted Version ${newVersion} after addressing client feedback.` : 'Submitted for client review.',
      },
    });

    await this.notifyClientReviewers(event.id, event.title, event.clientId);

    return this.findOne(event.id, user);
  }

  async updateDeadline(id: string, newDeadlineStr: string, user: any, reason?: string) {
    const event = await this.findOne(id, user);

    if (user?.role !== 'MARKETING_MANAGER') {
      throw new ForbiddenException('Forbidden: Only Marketing Manager (Client Representative) can modify client approval deadline/priority during review.');
    }

    const newDeadline = new Date(newDeadlineStr);
    if (isNaN(newDeadline.getTime())) {
      throw new BadRequestException('Invalid deadline date provided.');
    }

    const prevDeadlineStr = event.clientApprovalDeadline
      ? new Date(event.clientApprovalDeadline).toISOString().split('T')[0]
      : 'Not Set';

    await this.prisma.mediaCalendarEvent.update({
      where: { id },
      data: { clientApprovalDeadline: newDeadline },
    });

    await this.prisma.calendarApprovalHistory.create({
      data: {
        calendarEventId: event.id,
        version: event.version,
        userId: user.id,
        role: user.role,
        action: 'DEADLINE_CHANGED',
        previousStatus: event.status,
        newStatus: event.status,
        comment: `Deadline changed from '${prevDeadlineStr}' to '${newDeadlineStr}'. ${reason || ''}`.trim(),
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'CALENDAR_EVENT_DEADLINE_CHANGED',
        entity: 'MediaCalendarEvent',
        entityId: event.id,
        description: `${user.role} (${user.name}) updated deadline for event '${event.title}' from ${prevDeadlineStr} to ${newDeadlineStr}.`,
        metadata: JSON.stringify({ eventId: event.eventId || event.id, prevDeadline: prevDeadlineStr, newDeadline: newDeadlineStr }),
      },
    });

    return this.findOne(id, user);
  }

  async updatePriority(id: string, newPriority: string, user: any, reason?: string) {
    const event = await this.findOne(id, user);

    if (user?.role !== 'MARKETING_MANAGER') {
      throw new ForbiddenException('Forbidden: Only Marketing Manager (Client Representative) can modify event priority during review.');
    }

    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    if (!validPriorities.includes(newPriority.toUpperCase())) {
      throw new BadRequestException(`Invalid priority value. Must be one of: ${validPriorities.join(', ')}`);
    }

    const prevPriority = event.priority;
    const formattedPriority = newPriority.toUpperCase() as Priority;

    await this.prisma.mediaCalendarEvent.update({
      where: { id },
      data: { priority: formattedPriority },
    });

    await this.prisma.calendarApprovalHistory.create({
      data: {
        calendarEventId: event.id,
        version: event.version,
        userId: user.id,
        role: user.role,
        action: 'PRIORITY_CHANGED',
        previousStatus: event.status,
        newStatus: event.status,
        comment: `Priority changed from '${prevPriority}' to '${formattedPriority}'. ${reason || ''}`.trim(),
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'CALENDAR_EVENT_PRIORITY_CHANGED',
        entity: 'MediaCalendarEvent',
        entityId: event.id,
        description: `${user.role} (${user.name}) updated priority for event '${event.title}' from ${prevPriority} to ${formattedPriority}.`,
        metadata: JSON.stringify({ eventId: event.eventId || event.id, prevPriority, newPriority: formattedPriority }),
      },
    });

    return this.findOne(id, user);
  }

  async reviewClientEvent(
    id: string,
    action: 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT',
    comment?: string,
    user?: any,
    updatedDeadline?: string,
    updatedPriority?: string,
  ) {
    const event = await this.findOne(id, user);

    // SECURITY VERIFICATION: Only Marketing Manager (Client Representative) can grant client approval for Media Calendar events
    if (user?.role !== 'MARKETING_MANAGER') {
      throw new ForbiddenException('Forbidden: Only Marketing Manager (Client Representative) is authorized to review and approve Media Calendar events.');
    }

    // Security Verification: Marketing Manager must be assigned to the event's client (if explicit assignments exist)
    const assignments = await this.prisma.clientAssignment.findMany({
      where: { userId: user.id },
      select: { clientId: true },
    });
    if (assignments.length > 0) {
      const assignedIds = assignments.map((a) => a.clientId);
      if (!assignedIds.includes(event.clientId)) {
        throw new ForbiddenException('Access Denied: You are not authorized to review events for this client.');
      }
    }

    // Mandatory comment check for Request Changes or Reject
    if ((action === 'REQUEST_CHANGES' || action === 'REJECT') && (!comment || !comment.trim())) {
      throw new BadRequestException(`Feedback comment is mandatory when selecting '${action.replace('_', ' ')}'.`);
    }

    let newStatus = 'PENDING_CLIENT_APPROVAL';
    if (action === 'APPROVE') newStatus = 'APPROVED';
    else if (action === 'REQUEST_CHANGES') newStatus = 'CHANGES_REQUESTED';
    else if (action === 'REJECT') newStatus = 'REJECTED';

    const previousStatus = event.status;
    const isOverride = user.role === 'MEDIA_MANAGER' && user.id !== event.createdById;

    // Atomic Transaction Execution
    return this.prisma.$transaction(async (tx) => {
      const eventUpdates: any = {
        status: newStatus,
        reviewedAt: new Date(),
      };

      // Apply Client Deadline Edit if specified during review
      if (updatedDeadline && updatedDeadline.trim()) {
        const dDate = new Date(updatedDeadline);
        if (!isNaN(dDate.getTime())) {
          eventUpdates.clientApprovalDeadline = dDate;
          const prevD = event.clientApprovalDeadline ? new Date(event.clientApprovalDeadline).toISOString().split('T')[0] : 'Not Set';
          await tx.calendarApprovalHistory.create({
            data: {
              calendarEventId: event.id,
              version: event.version,
              userId: user.id,
              role: user.role,
              action: 'DEADLINE_CHANGED',
              previousStatus: event.status,
              newStatus: event.status,
              comment: `Client updated deadline from '${prevD}' to '${updatedDeadline}'.`,
            },
          });
        }
      }

      // Apply Client Priority Edit if specified during review
      if (updatedPriority && updatedPriority.trim()) {
        const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        if (validPriorities.includes(updatedPriority.toUpperCase())) {
          eventUpdates.priority = updatedPriority.toUpperCase() as Priority;
          await tx.calendarApprovalHistory.create({
            data: {
              calendarEventId: event.id,
              version: event.version,
              userId: user.id,
              role: user.role,
              action: 'PRIORITY_CHANGED',
              previousStatus: event.status,
              newStatus: event.status,
              comment: `Client updated priority from '${event.priority}' to '${updatedPriority.toUpperCase()}'.`,
            },
          });
        }
      }

      const updated = await tx.mediaCalendarEvent.update({
        where: { id },
        data: eventUpdates,
      });

      // Get current active revision
      const currentRevision = event.revisions.find((r) => r.version === event.version);

      // Log Approval History entry
      await tx.calendarApprovalHistory.create({
        data: {
          calendarEventId: event.id,
          revisionId: currentRevision?.id || null,
          version: event.version,
          userId: user.id,
          role: user.role,
          action: isOverride ? `OVERRIDE_${action}` : action,
          previousStatus,
          newStatus,
          comment: comment?.trim() || (action === 'APPROVE' ? 'Approved by client representative.' : null),
        },
      });

      // Audit Log Entry
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: `CALENDAR_EVENT_${action}`,
          entity: 'MediaCalendarEvent',
          entityId: event.id,
          description: `${user.role} (${user.name}) ${action.toLowerCase()} calendar event '${event.title}' (Version ${event.version}). Status changed to ${newStatus}.`,
          metadata: JSON.stringify({
            eventId: event.eventId || event.id,
            version: event.version,
            comment,
            updatedDeadline,
            updatedPriority,
          }),
        },
      });

      // Send Notification to Event Creator
      if (event.createdById) {
        let notifTitle = 'Calendar Event Client Decision';
        let notifMessage = `Event '${event.title}' status updated to ${newStatus}.`;

        if (action === 'APPROVE') {
          notifTitle = 'Client Approved Calendar Event';
          notifMessage = `Marketing Manager approved '${event.title}' (Version ${event.version}). Event is now visible on Main Media Calendar.`;
        } else if (action === 'REQUEST_CHANGES') {
          notifTitle = 'Client Requested Changes';
          notifMessage = `Client requested changes on '${event.title}': "${comment}"`;
        } else if (action === 'REJECT') {
          notifTitle = 'Client Rejected Calendar Event';
          notifMessage = `Client rejected '${event.title}': "${comment}"`;
        }

        await tx.notification.create({
          data: {
            userId: event.createdById,
            title: notifTitle,
            message: notifMessage,
            type: action === 'APPROVE' ? 'SUCCESS' : action === 'REQUEST_CHANGES' ? 'WARNING' : 'ALERT',
            category: 'CALENDAR_EVENT',
            priority: 'HIGH',
            entityType: 'CALENDAR_EVENT',
            entityId: event.id,
            linkUrl: `/calendar`,
          },
        });
      }

      return updated;
    }).then(() => this.findOne(id, user));
  }

  async cancel(id: string) {
    const event = await this.prisma.mediaCalendarEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Calendar event not found');

    return this.prisma.mediaCalendarEvent.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async generateGraphicReq(eventId: string) {
    const event = await this.findOne(eventId);

    let project: any = event.shootProjects[0];
    if (!project) {
      const projectCount = await this.prisma.shootProject.count();
      const autoProjectId = `SP-${(projectCount + 1).toString().padStart(6, '0')}`;
      const dateFormatted = new Date(event.shootDate).toISOString().slice(2, 10).replace(/-/g, '');
      const defaultProjName = `${event.brand.shortCode}-${dateFormatted}-CALENDAR`;

      project = await this.prisma.shootProject.create({
        data: {
          projectId: autoProjectId,
          name: defaultProjName,
          clientId: event.clientId,
          brandId: event.brandId,
          productId: event.productId || null,
          calendarEventId: event.id,
          shootType: event.shootType,
          shootDate: event.shootDate,
          shootLocation: 'Studio / Designated Site',
          reportingTime: '09:00 AM',
          expectedWrapUpTime: '05:00 PM',
          influencerTalent: event.influencerTalent,
          priority: event.priority,
          status: 'PLANNED',
          notes: `Project generated for Media Calendar Event: ${event.title}`,
          createdById: (await this.prisma.user.findFirst({ where: { role: 'MEDIA_MANAGER' } }))?.id || '',
        },
      });
    }

    const reqCount = await this.prisma.graphicRequirement.count();
    const autoReqId = `GR-${(reqCount + 1).toString().padStart(6, '0')}`;

    const graphicReq = await this.prisma.graphicRequirement.create({
      data: {
        requirementId: autoReqId,
        name: `Key Visual & Social Media Banner - ${event.title}`,
        projectId: project.id,
        clientId: event.clientId,
        brandId: event.brandId,
        calendarEventId: event.id,
        productId: event.productId || null,
        requirementType: 'Social Feed Banner',
        objective: `Generated from Media Calendar Event: ${event.title}`,
        description: `Automated key visual graphic requirement generated from Media Calendar.`,
        priority: event.priority || 'MEDIUM',
        status: 'DRAFT',
      },
      include: { project: true, client: true, brand: true, calendarEvent: true },
    });

    return graphicReq;
  }

  private async notifyClientReviewers(eventId: string, eventTitle: string, clientId: string, eventSource: string = 'SHOOT') {
    const assignments = await this.prisma.clientAssignment.findMany({
      where: { clientId },
      select: { userId: true },
    });

    let marketingManagers = await this.prisma.user.findMany({
      where: {
        role: 'MARKETING_MANAGER',
        status: 'ACTIVE',
        OR: [
          { clientAssignments: { some: { clientId } } },
          { id: { in: assignments.map((a) => a.userId) } },
        ],
      },
    });

    if (marketingManagers.length === 0) {
      marketingManagers = await this.prisma.user.findMany({
        where: { role: 'MARKETING_MANAGER', status: 'ACTIVE' },
      });
    }

    const sourceText = eventSource === 'GRAPHIC_REQUIREMENT'
      ? 'New Graphic Requirement-based Calendar Event is waiting for client approval.'
      : 'New Shoot-based Calendar Event is waiting for client approval.';

    for (const mm of marketingManagers) {
      await this.prisma.notification.create({
        data: {
          userId: mm.id,
          title: 'New Media Calendar Event Pending Client Approval',
          message: `Event '${eventTitle}': ${sourceText}`,
          type: 'INFO',
          category: 'CALENDAR_EVENT',
          priority: 'HIGH',
          entityType: 'CALENDAR_EVENT',
          entityId: eventId,
          linkUrl: `/client-review`,
        },
      });
    }
  }
}
