import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ShootType, Priority, Role } from '../../common/enums';
import { canUserViewEvent } from '../../common/utils/event-auth';

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

    // Status filtering logic
    if (status) {
      if (status === 'PENDING_CLIENT_APPROVAL' || status === 'PENDING_CLIENT_REVIEW' || status === 'PENDING') {
        where.status = { in: ['PENDING_CLIENT_APPROVAL', 'PENDING_CLIENT_REVIEW', 'PENDING_MARKETING_APPROVAL', 'DRAFT', 'CHANGES_REQUESTED', 'REVISION_REQUESTED'] };
      } else if (status === 'APPROVED' || status === 'CLIENT_APPROVED' || status === 'OPERATIONAL') {
        where.status = { in: ['APPROVED', 'CLIENT_APPROVED', 'SCHEDULED', 'PUBLISHED', 'READY', 'OPERATIONAL', 'TASK_ASSIGNED', 'IN_PRODUCTION'] };
      } else if (status !== 'ALL') {
        where.status = status;
      }
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

    const rawEvents = await this.prisma.mediaCalendarEvent.findMany({
      where,
      include: {
        client: true,
        brand: true,
        product: true,
        graphicRequirement: { select: { id: true, requirementId: true, name: true, status: true, requirementType: true, priority: true } },
        shoot: { select: { id: true, projectId: true, name: true, status: true, shootType: true, shootDate: true, priority: true } },
        createdBy: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
        assignedStaff: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
        approvalAssignedTo: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
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
            indoorDetails: true,
            outdoorDetails: true,
          },
        },
        lastModifiedBy: { select: { id: true, name: true, role: true, email: true } },
        editRequestedBy: { select: { id: true, name: true, role: true, email: true } },
        editApprovedBy: { select: { id: true, name: true, role: true, email: true } },
      },
      orderBy: { shootDate: 'asc' },
    });

    if (userId && role) {
      return rawEvents.filter((evt) => canUserViewEvent({ id: userId, role }, evt));
    }
    return rawEvents;
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
        approvalAssignedTo: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
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
            indoorDetails: true,
            outdoorDetails: true,
          },
        },
        editRequests: {
          include: {
            requestedBy: { select: { id: true, name: true, role: true, email: true, avatarUrl: true } },
            reviewedBy: { select: { id: true, name: true, role: true, email: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        editHistories: {
          include: {
            requestedBy: { select: { id: true, name: true, role: true, email: true, avatarUrl: true } },
            approvedBy: { select: { id: true, name: true, role: true, email: true, avatarUrl: true } },
          },
          orderBy: { approvedAt: 'desc' },
        },
        lastModifiedBy: { select: { id: true, name: true, role: true, email: true } },
        editRequestedBy: { select: { id: true, name: true, role: true, email: true } },
        editApprovedBy: { select: { id: true, name: true, role: true, email: true } },
      },
    });

    if (!event) throw new NotFoundException('Calendar event not found');

    if (user && !canUserViewEvent(user, event)) {
      throw new ForbiddenException('403 Forbidden: You do not have permission to view this event.');
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
      editRequests: event.editRequests || [],
      editHistories: event.editHistories || [],
      createdBy: event.createdBy,
      lastModifiedBy: event.lastModifiedBy,
      editRequestedBy: event.editRequestedBy,
      editApprovedBy: event.editApprovedBy,
      editApprovedAt: event.editApprovedAt,
    };
  }

  async create(data: any, user?: any) {
    if (user && user.role !== Role.MEDIA_MANAGER && user.role !== Role.MARKETING_MANAGER && user.role !== Role.ADMINISTRATOR && user.role !== 'ADMIN') {
      throw new ForbiddenException('403 Forbidden: Only Media Managers and Marketing Managers can create calendar events.');
    }

    const eventSource = data.eventSource || 'SHOOT';
    if (eventSource !== 'GRAPHIC_REQUIREMENT' && eventSource !== 'SHOOT') {
      throw new BadRequestException('Event Source is required and must be GRAPHIC_REQUIREMENT or SHOOT.');
    }

    let resolvedGraphicReq: any = null;
    let resolvedShoot: any = null;

    if (eventSource === 'GRAPHIC_REQUIREMENT') {
      if (data.graphicRequirementId) {
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
      }
    } else if (eventSource === 'SHOOT' || eventSource === 'PROJECT_SHOOT') {
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

    // Validate assigned staff member for Media Calendar Event if provided (Optional)
    let assignedStaffId = data.assignedStaffId || data.assignedUserId || data.staffId || null;
    if (assignedStaffId) {
      const staffUser = await this.prisma.user.findUnique({ where: { id: assignedStaffId } });
      if (!staffUser) {
        throw new BadRequestException('Selected assigned staff member does not exist.');
      }
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
          createdByRole: user?.role || 'MEDIA_MANAGER',
          approvalRequired: true,
          approvalStatus: initialStatus === 'APPROVED' ? 'APPROVED' : 'PENDING_MARKETING_APPROVAL',
          assignedStaffId: assignedStaffId,
        },
      });

      if (eventSource === 'GRAPHIC_REQUIREMENT') {
        if (resolvedGraphicReq) {
          await tx.graphicRequirement.update({
            where: { id: resolvedGraphicReq.id },
            data: { calendarEventId: event.id },
          });
        } else {
          // Auto-create corresponding GraphicRequirement
          let parentProjectId = data.projectId;
          if (!parentProjectId) {
            let existingProj = await tx.shootProject.findFirst({
              where: { clientId: data.clientId, brandId: data.brandId },
            });
            if (!existingProj) {
              const projCount = await tx.shootProject.count();
              existingProj = await tx.shootProject.create({
                data: {
                  projectId: `SP-${(projCount + 1).toString().padStart(6, '0')}`,
                  name: `[GR-CONTAINER] Graphic Requirements Project`,
                  clientId: data.clientId,
                  brandId: data.brandId,
                  productId: data.productId || null,
                  shootType: 'INDOOR',
                  shootDate: new Date(data.shootDate || Date.now()),
                  shootLocation: 'Media Ops Studio Bay',
                  priority: data.priority || Priority.MEDIUM,
                  status: 'PLANNED',
                  createdById: activeUserId,
                },
              });
            }
            parentProjectId = existingProj.id;
          }

          const grCount = await tx.graphicRequirement.count();
          const newGr = await tx.graphicRequirement.create({
            data: {
              requirementId: `GR-${(grCount + 1).toString().padStart(6, '0')}`,
              name: data.title.trim(),
              projectId: parentProjectId,
              clientId: data.clientId,
              brandId: data.brandId,
              productId: data.productId || null,
              calendarEventId: event.id,
              requirementType: data.contentType || data.requirementType || 'Poster',
              objective: data.caption || data.objective || data.description || null,
              description: data.description || data.productionNotes || null,
              priority: data.priority || Priority.MEDIUM,
              estimatedCompletion: data.clientApprovalDeadline ? new Date(data.clientApprovalDeadline) : null,
              status: initialStatus === 'APPROVED' ? 'APPROVED' : 'PENDING_MARKETING_APPROVAL',
              remarks: data.remarks || data.productionNotes || null,
            },
          });

          await tx.mediaCalendarEvent.update({
            where: { id: event.id },
            data: { graphicRequirementId: newGr.id },
          });
        }
      } else if (eventSource === 'SHOOT' || eventSource === 'PROJECT_SHOOT') {
        if (resolvedShoot) {
          await tx.shootProject.update({
            where: { id: resolvedShoot.id },
            data: { calendarEventId: event.id },
          });
        } else {
          // Auto-create corresponding ShootProject
          const spCount = await tx.shootProject.count();
          const newShoot = await tx.shootProject.create({
            data: {
              projectId: `SP-${(spCount + 1).toString().padStart(6, '0')}`,
              name: data.title.trim(),
              clientId: data.clientId,
              brandId: data.brandId,
              productId: data.productId || null,
              calendarEventId: event.id,
              shootType: data.shootType || ShootType.INDOOR,
              shootDate: new Date(data.shootDate || Date.now()),
              shootLocation: data.location || 'Main Studio Floor',
              locationCategory: data.locationCategory || 'Studio Bay',
              influencerTalent: data.influencerTalent || null,
              priority: data.priority || Priority.MEDIUM,
              status: initialStatus === 'APPROVED' ? 'APPROVED' : 'PENDING_MARKETING_APPROVAL',
              estimatedCompletionDate: data.clientApprovalDeadline ? new Date(data.clientApprovalDeadline) : null,
              notes: data.remarks || data.productionNotes || null,
              createdById: activeUserId,
            },
          });

          const isOutdoor = data.shootType === 'OUTDOOR' || data.shootType === 'Outdoor Shoot';
          if (isOutdoor) {
            await tx.outdoorShootDetails.create({
              data: {
                projectId: newShoot.id,
                outdoorLocation: data.location || 'Outdoor Location',
                locationAddress: data.exactLocationAddress || data.locationAddress || data.location || 'Outdoor Location Address',
                exactLocationAddress: data.exactLocationAddress || data.locationAddress || data.location || null,
                locationAccessDetails: data.locationAccessDetails || null,
                locationContact: data.locationContact || data.locationContactPerson || null,
                permitRequired: data.permitRequired || 'NO',
                permitStatus: data.permitStatus || (data.permitRequired === 'YES' ? 'Pending' : 'NOT_REQUIRED'),
                expectedWeatherConditions: data.expectedWeatherConditions || null,
                backupLocation: data.backupLocation || null,
                callTime: data.callTime || data.startTime || '07:00 AM',
                expectedWrapTime: data.expectedWrapTime || data.endTime || '05:00 PM',
                specialOutdoorRequirements: data.specialOutdoorRequirements || null,
                permissionStatus: data.permitStatus || 'NOT_REQUIRED',
                weatherStatus: data.expectedWeatherConditions || 'FAVORABLE',
              },
            });
          } else {
            await tx.indoorShootDetails.create({
              data: {
                projectId: newShoot.id,
                studioName: data.location || 'Main Studio Floor',
                studioAddress: data.exactLocationAddress || data.locationAddress || data.location || 'Main Studio Floor',
                reportingTime: data.callTime || data.startTime || '09:00 AM',
                wrapUpTime: data.expectedWrapTime || data.endTime || '06:00 PM',
              },
            });
          }

          await tx.mediaCalendarEvent.update({
            where: { id: event.id },
            data: { shootId: newShoot.id },
          });
        }
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

    const APPROVED_CALENDAR_STATUSES = [
      'APPROVED',
      'CLIENT_APPROVED',
      'SCHEDULED',
      'PUBLISHED',
      'READY',
      'OPERATIONAL',
      'TASK_ASSIGNED',
      'IN_PRODUCTION',
    ];
    const isApprovedEvent = APPROVED_CALENDAR_STATUSES.includes(existing.status);

    // SECURITY RULE #15 & #16: Block direct updates on approved events by Media Manager / SMM / non-admin
    if (
      isApprovedEvent &&
      user?.role !== 'MARKETING_MANAGER' &&
      user?.role !== 'ADMIN' &&
      user?.role !== 'ADMINISTRATOR'
    ) {
      throw new ForbiddenException(
        'Direct update of an approved Media Calendar Event is not allowed. Please submit an Edit Request for Marketing Manager approval.',
      );
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

    const activeUserId = await this.resolveUserId(user);
    updateData.lastModifiedById = activeUserId;
    updateData.lastModifiedAt = new Date();

    await this.prisma.mediaCalendarEvent.update({
      where: { id },
      data: updateData,
    });

    return this.findOne(id, user);
  }

  // ==========================================
  // EDIT REQUEST WORKFLOW METHODS
  // ==========================================

  private async resolveUserId(user?: any): Promise<string> {
    let candidate = user?.id || user?.userId || user?.sub;
    if (candidate) {
      const dbUser = await this.prisma.user.findUnique({ where: { id: candidate } });
      if (dbUser) return dbUser.id;
    }
    const fallbackUser = await this.prisma.user.findFirst({
      where: { role: { in: ['MEDIA_MANAGER', 'SOCIAL_MEDIA_MANAGER', 'MARKETING_MANAGER', 'ADMINISTRATOR', 'ADMIN'] } },
    });
    if (fallbackUser) return fallbackUser.id;
    const anyUser = await this.prisma.user.findFirst();
    if (anyUser) return anyUser.id;
    throw new BadRequestException('Valid user record not found in database for relational audit.');
  }

  private async sendNotification(userIds: string[], role?: string, title?: string, message?: string, calendarEventId?: string) {
    try {
      let targetUserIds = userIds;
      if ((!targetUserIds || targetUserIds.length === 0) && role) {
        const users = await this.prisma.user.findMany({ where: { role }, select: { id: true } });
        targetUserIds = users.map((u) => u.id);
      }
      for (const uId of targetUserIds) {
        await this.prisma.notification.create({
          data: {
            userId: uId,
            title: title || 'Calendar Event Update',
            message: message || 'Media Calendar Event updated.',
            type: 'INFO',
            category: 'WORKFLOW_STATUS',
            priority: 'MEDIUM',
            eventType: 'CALENDAR_EVENT_UPDATED',
            entityType: 'CALENDAR_EVENT',
            entityId: calendarEventId || 'SYSTEM',
            calendarEventId: calendarEventId || null,
          },
        }).catch(() => null);
      }
    } catch (err) {
      console.error('Failed to dispatch notification:', err);
    }
  }

  async createEditRequest(id: string, data: any, user: any) {
    const existing = await this.findOne(id, user);

    const APPROVED_CALENDAR_STATUSES = [
      'APPROVED',
      'CLIENT_APPROVED',
      'SCHEDULED',
      'PUBLISHED',
      'READY',
      'OPERATIONAL',
      'TASK_ASSIGNED',
      'IN_PRODUCTION',
    ];

    if (!APPROVED_CALENDAR_STATUSES.includes(existing.status)) {
      throw new BadRequestException(
        'Edit requests can only be submitted for approved Media Calendar Events. Unapproved events can be updated directly.',
      );
    }

    // Check for existing pending edit request
    const existingPending = await (this.prisma as any).calendarEditRequest.findFirst({
      where: {
        calendarEventId: existing.id,
        status: 'PENDING_MARKETING_APPROVAL',
      },
    });

    if (existingPending) {
      throw new BadRequestException(
        'A pending Edit Request already exists for this event and is awaiting Marketing Manager approval.',
      );
    }

    const payload = data.requestedValues || data;

    const originalValues = {
      title: existing.title,
      caption: existing.caption,
      contentType: existing.contentType,
      platform: existing.platform,
      creativePreviewUrl: existing.creativePreviewUrl,
      campaign: existing.campaign,
      description: existing.description,
      shootType: existing.shootType,
      shootDate: existing.shootDate,
      clientApprovalDeadline: existing.clientApprovalDeadline,
      influencerTalent: existing.influencerTalent,
      priority: existing.priority,
      productionNotes: existing.productionNotes,
      clientId: existing.clientId,
      brandId: existing.brandId,
      productId: existing.productId,
    };

    const requestedValues: any = {};
    if (payload.title !== undefined) requestedValues.title = payload.title;
    if (payload.caption !== undefined) requestedValues.caption = payload.caption;
    if (payload.contentType !== undefined) requestedValues.contentType = payload.contentType;
    if (payload.platform !== undefined) requestedValues.platform = payload.platform;
    if (payload.creativePreviewUrl !== undefined) requestedValues.creativePreviewUrl = payload.creativePreviewUrl;
    if (payload.campaign !== undefined) requestedValues.campaign = payload.campaign;
    if (payload.description !== undefined) requestedValues.description = payload.description;
    if (payload.shootType !== undefined) requestedValues.shootType = payload.shootType;
    if (payload.shootDate !== undefined) requestedValues.shootDate = payload.shootDate;
    if (payload.clientApprovalDeadline !== undefined) requestedValues.clientApprovalDeadline = payload.clientApprovalDeadline;
    if (payload.influencerTalent !== undefined) requestedValues.influencerTalent = payload.influencerTalent;
    if (payload.priority !== undefined) requestedValues.priority = payload.priority;
    if (payload.productionNotes !== undefined) requestedValues.productionNotes = payload.productionNotes;
    if (payload.clientId !== undefined) requestedValues.clientId = payload.clientId;
    if (payload.brandId !== undefined) requestedValues.brandId = payload.brandId;
    if (payload.productId !== undefined) requestedValues.productId = payload.productId;

    const activeUserId = await this.resolveUserId(user);

    const editReq = await (this.prisma as any).calendarEditRequest.create({
      data: {
        calendarEventId: existing.id,
        status: 'PENDING_MARKETING_APPROVAL',
        requestedById: activeUserId,
        reason: data.reason || payload.reason || null,
        originalValues: JSON.stringify(originalValues),
        requestedValues: JSON.stringify(requestedValues),
      },
      include: {
        calendarEvent: { include: { client: true, brand: true, product: true } },
        requestedBy: { select: { id: true, name: true, role: true, email: true } },
      },
    });

    await this.prisma.mediaCalendarEvent.update({
      where: { id: existing.id },
      data: { editRequestedById: activeUserId },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: activeUserId,
        action: 'EVENT_EDIT_REQUESTED',
        entity: 'MediaCalendarEvent',
        entityId: existing.id,
        description: `Media Manager requested edits for approved Media Calendar Event '${existing.title}'.`,
        metadata: JSON.stringify({
          requestId: editReq.id,
          eventId: existing.eventId || existing.id,
          requestedBy: user?.name,
          reason: data.reason || payload.reason,
        }),
      },
    });

    await this.sendNotification(
      [],
      'MARKETING_MANAGER',
      'Edit Request Submitted',
      `${user?.name || 'Media Manager'} has requested changes to Media Calendar Event ${existing.eventId || existing.title}.`,
      existing.id,
    );

    return editReq;
  }

  async getEditRequests(status?: string, user?: any) {
    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    return (this.prisma as any).calendarEditRequest.findMany({
      where,
      include: {
        calendarEvent: {
          include: {
            client: true,
            brand: true,
            product: true,
            createdBy: { select: { id: true, name: true, role: true } },
          },
        },
        requestedBy: { select: { id: true, name: true, role: true, email: true } },
        reviewedBy: { select: { id: true, name: true, role: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getEditRequestsForEvent(calendarEventId: string) {
    return (this.prisma as any).calendarEditRequest.findMany({
      where: { calendarEventId },
      include: {
        requestedBy: { select: { id: true, name: true, role: true, email: true } },
        reviewedBy: { select: { id: true, name: true, role: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveEditRequest(requestId: string, body: any, user: any) {
    const editReq = await (this.prisma as any).calendarEditRequest.findUnique({
      where: { id: requestId },
      include: {
        calendarEvent: { include: { client: true, brand: true, product: true } },
        requestedBy: { select: { id: true, name: true, role: true } },
      },
    });

    if (!editReq) {
      throw new NotFoundException('Edit Request not found');
    }

    if (editReq.status === 'APPROVED') {
      throw new BadRequestException('This Edit Request has already been approved.');
    }

    const original = JSON.parse(editReq.originalValues || '{}');
    const requested = JSON.parse(editReq.requestedValues || '{}');

    // Support Marketing Manager overriding/modifying permitted fields during approval
    const finalRequested = body.modifiedValues ? { ...requested, ...body.modifiedValues } : requested;

    const changes: Record<string, { from: any; to: any }> = {};
    Object.keys(finalRequested).forEach((key) => {
      const fromVal = original[key];
      const toVal = finalRequested[key];
      if (JSON.stringify(fromVal) !== JSON.stringify(toVal)) {
        changes[key] = { from: fromVal, to: toVal };
      }
    });

    const updateData: any = {};
    if (finalRequested.title !== undefined) updateData.title = finalRequested.title;
    if (finalRequested.caption !== undefined) updateData.caption = finalRequested.caption;
    if (finalRequested.contentType !== undefined) updateData.contentType = finalRequested.contentType;
    if (finalRequested.platform !== undefined) updateData.platform = finalRequested.platform;
    if (finalRequested.creativePreviewUrl !== undefined) updateData.creativePreviewUrl = finalRequested.creativePreviewUrl;
    if (finalRequested.campaign !== undefined) updateData.campaign = finalRequested.campaign;
    if (finalRequested.description !== undefined) updateData.description = finalRequested.description;
    if (finalRequested.shootType !== undefined) updateData.shootType = finalRequested.shootType;
    if (finalRequested.shootDate !== undefined) updateData.shootDate = new Date(finalRequested.shootDate);
    if (finalRequested.clientApprovalDeadline !== undefined) {
      updateData.clientApprovalDeadline = finalRequested.clientApprovalDeadline ? new Date(finalRequested.clientApprovalDeadline) : null;
    }
    if (finalRequested.influencerTalent !== undefined) updateData.influencerTalent = finalRequested.influencerTalent;
    if (finalRequested.priority !== undefined) updateData.priority = finalRequested.priority;
    if (finalRequested.productionNotes !== undefined) updateData.productionNotes = finalRequested.productionNotes;
    const activeUserId = await this.resolveUserId(user);

    if (finalRequested.clientId !== undefined && finalRequested.clientId) updateData.clientId = finalRequested.clientId;
    if (finalRequested.brandId !== undefined && finalRequested.brandId) updateData.brandId = finalRequested.brandId;
    if (finalRequested.productId !== undefined) {
      const pId = finalRequested.productId ? String(finalRequested.productId).trim() : null;
      updateData.productId = pId && pId !== '' ? pId : null;
    }

    updateData.lastModifiedById = editReq.requestedById || activeUserId;
    updateData.lastModifiedAt = new Date();
    updateData.editRequestedById = editReq.requestedById || activeUserId;
    updateData.editApprovedById = activeUserId;
    updateData.editApprovedAt = new Date();

    const updatedEvent = await this.prisma.$transaction(async (tx) => {
      // 1. Update Edit Request status
      await (tx as any).calendarEditRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          reviewedById: activeUserId,
          reviewedAt: new Date(),
          reviewComment: body.reviewComment || body.comment || 'Approved by Marketing Manager.',
        },
      });

      // 2. Update Original MediaCalendarEvent in-place (same ID & eventId)
      const ev = await tx.mediaCalendarEvent.update({
        where: { id: editReq.calendarEventId },
        data: updateData,
      });

      // 3. Create permanent CalendarEditHistory
      await (tx as any).calendarEditHistory.create({
        data: {
          calendarEventId: editReq.calendarEventId,
          requestId: editReq.id,
          requestedById: editReq.requestedById || activeUserId,
          requestedAt: editReq.requestedAt || new Date(),
          approvedById: activeUserId,
          approvedAt: new Date(),
          changes: JSON.stringify(changes),
        },
      });

      // 4. Record Activity Log
      await tx.activityLog.create({
        data: {
          userId: activeUserId,
          action: 'EVENT_EDIT_APPROVED',
          entity: 'MediaCalendarEvent',
          entityId: editReq.calendarEventId,
          description: `Marketing Manager approved edit request for Media Calendar Event '${ev.title}'.`,
          metadata: JSON.stringify({
            requestId: editReq.id,
            eventId: ev.eventId || ev.id,
            approvedBy: activeUserId,
            requestedBy: editReq.requestedById,
            changes,
          }),
        },
      });

      return ev;
    });

    await this.sendNotification(
      [editReq.requestedById],
      undefined,
      'Edit Request Approved',
      `Your edit request for Media Calendar Event ${editReq.calendarEvent.eventId || editReq.calendarEvent.title} has been approved by Marketing Manager.`,
      editReq.calendarEventId,
    );

    return this.findOne(editReq.calendarEventId, user);
  }

  async rejectEditRequest(requestId: string, body: any, user: any) {
    const editReq = await (this.prisma as any).calendarEditRequest.findUnique({
      where: { id: requestId },
      include: {
        calendarEvent: true,
        requestedBy: { select: { id: true, name: true, role: true } },
      },
    });

    if (!editReq) {
      throw new NotFoundException('Edit Request not found');
    }

    const activeUserId = await this.resolveUserId(user);

    const updatedReq = await (this.prisma as any).calendarEditRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        reviewedById: activeUserId,
        reviewedAt: new Date(),
        reviewComment: body.reason || body.comment || 'Rejected by Marketing Manager.',
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: activeUserId,
        action: 'EVENT_EDIT_REJECTED',
        entity: 'MediaCalendarEvent',
        entityId: editReq.calendarEventId,
        description: `Marketing Manager rejected edit request for Media Calendar Event '${editReq.calendarEvent.title}'.`,
        metadata: JSON.stringify({
          requestId: editReq.id,
          eventId: editReq.calendarEvent.eventId || editReq.calendarEvent.id,
          rejectedBy: activeUserId,
          reason: body.reason || body.comment,
        }),
      },
    });

    await this.sendNotification(
      [editReq.requestedById],
      undefined,
      'Edit Request Rejected',
      `Your edit request for Media Calendar Event ${editReq.calendarEvent.eventId || editReq.calendarEvent.title} was rejected. Reason: ${body.reason || body.comment || 'No reason provided.'}`,
      editReq.calendarEventId,
    );

    return updatedReq;
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

      // Synchronize linked GraphicRequirement status and approval flags
      const targetGrStatus = action === 'APPROVE' ? 'APPROVED' : action === 'REQUEST_CHANGES' ? 'CHANGES_REQUESTED' : 'REJECTED';
      const gReqId = event.graphicRequirementId;
      const gReqWhere = gReqId
        ? { OR: [{ id: gReqId }, { calendarEventId: event.id }] }
        : { calendarEventId: event.id };

      await tx.graphicRequirement.updateMany({
        where: gReqWhere,
        data: {
          status: targetGrStatus,
          clientConfirmed: action === 'APPROVE',
          mediaManagerApproved: action === 'APPROVE',
        },
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
