import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ShootType, ProjectStatus, Priority, PermissionStatus, WeatherStatus, StudioBookingStatus, EquipmentAvailability, TaskStatus } from '../../common/enums';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    search?: string;
    clientId?: string;
    brandId?: string;
    productId?: string;
    shootType?: string;
    status?: string;
    priority?: string;
    date?: string;
    mediaManagerId?: string;
    technicalManagerId?: string;
    assignedUserId?: string;
    location?: string;
    archived?: boolean;
    userId?: string;
    role?: string;
  }) {
    const where: any = {};
    if (params.clientId) where.clientId = params.clientId;
    if (params.brandId) where.brandId = params.brandId;
    if (params.productId) where.productId = params.productId;
    if (params.shootType) where.shootType = params.shootType;
    if (params.priority) where.priority = params.priority;

    if (params.archived) {
      where.status = ProjectStatus.ARCHIVED;
    } else if (params.status && params.status !== 'ALL') {
      where.status = params.status;
    } else {
      where.status = { not: ProjectStatus.ARCHIVED };
    }

    if (params.date) {
      const targetDate = new Date(params.date);
      if (!isNaN(targetDate.getTime())) {
        const startOfDay = new Date(new Date(params.date).setHours(0, 0, 0, 0));
        const endOfDay = new Date(new Date(params.date).setHours(23, 59, 59, 999));
        where.shootDate = { gte: startOfDay, lte: endOfDay };
      }
    }

    if (params.mediaManagerId) {
      where.createdById = params.mediaManagerId;
    }

    if (params.technicalManagerId) {
      where.assignedTeam = {
        some: { user: { id: params.technicalManagerId } },
      };
    }

    if (params.assignedUserId) {
      where.assignedTeam = {
        some: { userId: params.assignedUserId },
      };
    }

    if (params.location?.trim()) {
      where.shootLocation = { contains: params.location.trim() };
    }

    if (params.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { name: { contains: q } },
        { projectId: { contains: q } },
        { shootLocation: { contains: q } },
        { locationAddress: { contains: q } },
        { influencerTalent: { contains: q } },
        { shootType: { contains: q } },
        { client: { name: { contains: q } } },
        { brand: { name: { contains: q } } },
        { brand: { shortCode: { contains: q } } },
        { product: { name: { contains: q } } },
        { campaign: { name: { contains: q } } },
        { assignedTeam: { some: { user: { name: { contains: q } } } } },
      ];
    }

    // Role filtering for STAFF: only projects they are assigned to
    if (params.role === 'STAFF' && params.userId) {
      where.assignedTeam = {
        some: { userId: params.userId },
      };
    }

    return this.prisma.shootProject.findMany({
      where,
      include: {
        client: true,
        brand: true,
        product: true,
        indoorDetails: true,
        outdoorDetails: true,
        assignedTeam: { include: { user: true } },
        _count: {
          select: {
            tasks: true,
            scripts: true,
            graphicRequirements: true,
            files: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.shootProject.findUnique({
      where: { id },
      include: {
        client: true,
        brand: true,
        product: true,
        campaign: true,
        createdBy: true,
        indoorDetails: true,
        outdoorDetails: true,
        assignedTeam: { include: { user: { include: { employeeProfile: { include: { department: true } } } } } },
        scripts: { include: { tasks: true, files: true } },
        graphicRequirements: { include: { tasks: true, files: true } },
        tasks: { include: { assignedEmployees: { include: { user: true } } } },
        approvals: { include: { reviewer: true }, orderBy: { reviewedAt: 'desc' } },
        clientConfirmations: { orderBy: { createdAt: 'desc' } },
        revisions: { orderBy: { requestedAt: 'desc' } },
        equipmentReservations: { include: { equipment: true } },
        equipmentMovements: { include: { equipment: true, user: true }, orderBy: { timestamp: 'desc' } },
        files: { include: { uploadedBy: true }, orderBy: { createdAt: 'desc' } },
        communications: { include: { sender: true }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');

    const activityLogs = await this.prisma.activityLog.findMany({
      where: {
        OR: [
          { entity: 'ShootProject', entityId: id },
          { metadata: { contains: id } },
        ],
      },
      include: { user: true },
      orderBy: { timestamp: 'desc' },
    });

    const allTasksCompleted =
      project.tasks.length > 0
        ? project.tasks.every((t: any) => t.status === 'COMPLETED' || t.completionPercentage === 100)
        : true;
    const techReviewApproved = project.approvals.some(
      (a: any) => a.approvalType === 'TECHNICAL_REVIEW' && a.status === 'APPROVED',
    );
    const mediaReviewApproved = project.approvals.some(
      (a: any) => a.approvalType === 'MEDIA_REVIEW' && a.status === 'APPROVED',
    );
    const clientConfirmationRecorded =
      project.clientConfirmations.length > 0 ||
      project.approvals.some((a: any) => a.approvalType === 'CLIENT_CONFIRMATION' && a.status === 'APPROVED');

    const isReadyForCompletion =
      allTasksCompleted && techReviewApproved && mediaReviewApproved && clientConfirmationRecorded;

    const scriptsTotal = project.scripts.length;
    const scriptsCompleted = project.scripts.filter(
      (s: any) => s.status === 'APPROVED' || s.status === 'COMPLETED' || s.status === 'READY_FOR_PRODUCTION',
    ).length;

    const graphicsTotal = project.graphicRequirements.length;
    const graphicsCompleted = project.graphicRequirements.filter(
      (g: any) => g.status === 'APPROVED' || g.status === 'COMPLETED' || g.status === 'READY_FOR_PRODUCTION',
    ).length;

    const tasksTotal = project.tasks.length;
    const tasksCompleted = project.tasks.filter(
      (t: any) => t.status === 'COMPLETED' || t.completionPercentage === 100,
    ).length;

    const deliverablesTotal = project.files.length;
    const deliverablesCompleted = project.files.filter((f: any) => f.activeVersion).length;

    const completionChecklist = {
      allTasksCompleted,
      techReviewApproved,
      mediaReviewApproved,
      clientConfirmationRecorded,
      isReadyForCompletion,
      pendingCount:
        (!allTasksCompleted ? 1 : 0) +
        (!techReviewApproved ? 1 : 0) +
        (!mediaReviewApproved ? 1 : 0) +
        (!clientConfirmationRecorded ? 1 : 0),
    };

    const completionStatistics = {
      scripts: { completed: scriptsCompleted, total: scriptsTotal, text: `${scriptsCompleted} / ${scriptsTotal} Completed` },
      graphics: { completed: graphicsCompleted, total: graphicsTotal, text: `${graphicsCompleted} / ${graphicsTotal} Completed` },
      tasks: { completed: tasksCompleted, total: tasksTotal, text: `${tasksCompleted} / ${tasksTotal} Completed` },
      deliverables: { completed: deliverablesCompleted, total: deliverablesTotal, text: `${deliverablesCompleted} / ${deliverablesTotal} Completed` },
    };

    return { ...project, activityLogs, completionChecklist, completionStatistics };
  }

  async create(data: any, userId: string) {
    // 1. Validate active client & brand
    const client = await this.prisma.client.findUnique({ where: { id: data.clientId } });
    if (!client || client.status !== 'ACTIVE') {
      throw new BadRequestException('Active client is required to create a shoot project');
    }
    const brand = await this.prisma.brand.findUnique({ where: { id: data.brandId } });
    if (!brand || brand.status !== 'ACTIVE') {
      throw new BadRequestException('Active brand is required to create a shoot project');
    }

    // 2. Generate Next Project ID (SP-00000X if not manually specified)
    let finalProjectId = data.projectId?.trim();
    if (!finalProjectId) {
      const count = await this.prisma.shootProject.count();
      const nextSeq = (count + 1).toString().padStart(6, '0');
      finalProjectId = `SP-${nextSeq}`;
    }

    // 3. Automated Naming Rule
    const dateFormatted = new Date(data.shootDate).toISOString().slice(2, 10).replace(/-/g, '');
    const influencerTag = data.influencerTalent ? data.influencerTalent.split(' ')[0].toUpperCase() : 'SHOOT';
    const defaultName = `${brand.shortCode}-${dateFormatted}-${influencerTag}`;

    const projectData: any = {
      projectId: finalProjectId,
      name: data.name?.trim() || defaultName,
      clientId: data.clientId,
      brandId: data.brandId,
      productId: data.productId || null,
      campaignId: data.campaignId || null,
      calendarEventId: data.calendarEventId || null,
      shootType: data.shootType,
      shootDate: new Date(data.shootDate),
      shootLocation: data.shootLocation || (data.shootType === ShootType.INDOOR ? 'Studio Bay' : 'Outdoor Site'),
      locationCategory: data.locationCategory,
      locationAddress: data.locationAddress,
      locationContactPerson: data.locationContactPerson,
      reportingTime: data.reportingTime || '09:00 AM',
      expectedWrapUpTime: data.expectedWrapUpTime || '06:00 PM',
      influencerTalent: data.influencerTalent,
      priority: data.priority || Priority.MEDIUM,
      status: data.status || ProjectStatus.PLANNED,
      estimatedCompletionDate: data.estimatedCompletionDate ? new Date(data.estimatedCompletionDate) : null,
      notes: data.remarks?.trim() || data.notes?.trim() || null,
      createdById: userId,
    };

    // 4. Handle Indoor vs Outdoor Details
    if (data.shootType === ShootType.INDOOR) {
      if (!data.indoorDetails?.studioName) {
        throw new BadRequestException('Indoor Shoot requires Studio / Location Name');
      }
      projectData.indoorDetails = {
        create: {
          studioName: data.indoorDetails.studioName,
          studioAddress: data.indoorDetails.studioAddress || data.shootLocation,
          studioBookingStatus: data.indoorDetails.studioBookingStatus || StudioBookingStatus.CONFIRMED,
          studioBookingRef: data.indoorDetails.studioBookingRef || `REF-${Math.floor(1000 + Math.random() * 9000)}`,
          lightingRequirements: data.indoorDetails.lightingRequirements || 'Standard 3-Point Studio Softboxes',
        },
      };
    } else {
      if (!data.outdoorDetails?.outdoorLocation) {
        throw new BadRequestException('Outdoor Shoot requires Outdoor Location Name');
      }
      projectData.outdoorDetails = {
        create: {
          outdoorLocation: data.outdoorDetails.outdoorLocation,
          locationAddress: data.outdoorDetails.locationAddress || data.outdoorDetails.outdoorLocation,
          permissionStatus: data.outdoorDetails.permissionStatus || PermissionStatus.PENDING,
          weatherStatus: data.outdoorDetails.weatherStatus || WeatherStatus.FAVORABLE,
          transportationReq: data.outdoorDetails.transportationReq ?? true,
          driver: data.outdoorDetails.driver || null,
          logisticsCoordinator: data.outdoorDetails.logisticsCoordinator || null,
          travelNotes: data.outdoorDetails.travelNotes || null,
          outdoorEquipmentReqs: data.outdoorDetails.outdoorEquipmentReqs,
          droneRequirement: data.outdoorDetails.droneRequirement ?? false,
          outdoorChecklist: data.outdoorDetails.outdoorChecklist || 'Permits, Weather check, Battery charge',
        },
      };
    }

    const project = await this.prisma.shootProject.create({
      data: projectData,
      include: { client: true, brand: true, indoorDetails: true, outdoorDetails: true },
    });

    // 5. Assign Team Members if provided
    if (data.teamUserIds && Array.isArray(data.teamUserIds)) {
      for (const tUserId of data.teamUserIds) {
        await this.prisma.projectAssignment.create({
          data: { projectId: project.id, userId: tUserId },
        });
      }
    }

    // 6. Reserve / Assign Equipment if provided
    if (data.equipmentIds && Array.isArray(data.equipmentIds)) {
      for (const eqId of data.equipmentIds) {
        await this.prisma.equipmentReservation.create({
          data: {
            projectId: project.id,
            equipmentId: eqId,
            startDate: new Date(data.shootDate),
            endDate: new Date(data.shootDate),
            status: 'RESERVED',
          },
        });
        await this.prisma.equipment.update({
          where: { id: eqId },
          data: { availability: EquipmentAvailability.RESERVED },
        });
      }
    }

    // 7. Log Initial Remark in Communication Thread for Permanent History
    const initialRemark = data.remarks?.trim() || data.notes?.trim();
    if (initialRemark) {
      await this.prisma.communication.create({
        data: {
          entityType: 'PROJECT',
          entityId: project.id,
          projectId: project.id,
          senderId: userId,
          type: 'INITIAL_REMARK',
          content: initialRemark,
        },
      });
    }

    // 8. Record Permanent Activity Timeline Entries
    await this.prisma.activityLog.create({
      data: {
        userId,
        action: 'PROJECT_CREATED',
        entity: 'ShootProject',
        entityId: project.id,
        description: `Project ${project.projectId} (${project.name}) created`,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId,
        action: 'SHOOT_TYPE_SELECTED',
        entity: 'ShootProject',
        entityId: project.id,
        description: `Shoot Type set to ${project.shootType}`,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId,
        action: 'LOCATION_CONFIRMED',
        entity: 'ShootProject',
        entityId: project.id,
        description: `Location confirmed: ${project.shootLocation}`,
      },
    });

    if (data.shootType === ShootType.INDOOR && project.indoorDetails) {
      await this.prisma.activityLog.create({
        data: {
          userId,
          action: 'INDOOR_STUDIO_RESERVED',
          entity: 'ShootProject',
          entityId: project.id,
          description: `Indoor Studio reserved: ${project.indoorDetails.studioName} (Ref: ${project.indoorDetails.studioBookingRef})`,
        },
      });
    }

    if (data.shootType === ShootType.OUTDOOR && project.outdoorDetails) {
      await this.prisma.activityLog.create({
        data: {
          userId,
          action: 'OUTDOOR_PERMISSION_APPROVED',
          entity: 'ShootProject',
          entityId: project.id,
          description: `Outdoor location permission status: ${project.outdoorDetails.permissionStatus}`,
        },
      });

      if (project.outdoorDetails.driver) {
        await this.prisma.activityLog.create({
          data: {
            userId,
            action: 'TRANSPORTATION_ASSIGNED',
            entity: 'ShootProject',
            entityId: project.id,
            description: `Transportation driver assigned: ${project.outdoorDetails.driver}`,
          },
        });
      }
    }

    if (data.teamUserIds && data.teamUserIds.length > 0) {
      await this.prisma.activityLog.create({
        data: {
          userId,
          action: 'TEAM_ASSIGNED',
          entity: 'ShootProject',
          entityId: project.id,
          description: `Assigned ${data.teamUserIds.length} team members to project`,
        },
      });
    }

    // Automated Task Creation Trigger 2: Automatically created during project creation
    const taskCount = await this.prisma.task.count();
    const autoTaskId1 = `TSK-${(taskCount + 1).toString().padStart(6, '0')}`;
    const autoTaskId2 = `TSK-${(taskCount + 2).toString().padStart(6, '0')}`;

    await this.prisma.task.createMany({
      data: [
        {
          taskId: autoTaskId1,
          title: `Initial Production Setup & Pre-shoot Coordination - ${project.name}`,
          description: `Automated production task created during Project ${project.projectId} creation`,
          projectId: project.id,
          clientId: project.clientId,
          brandId: project.brandId,
          productId: project.productId || null,
          priority: project.priority || Priority.MEDIUM,
          dueDate: new Date(project.shootDate.getTime() - 86400000),
          estimatedHours: 3.0,
          status: TaskStatus.PENDING,
        },
        {
          taskId: autoTaskId2,
          title: `Location & Equipment Scouting / Reservation - ${project.name}`,
          description: `Automated logistics task created during Project ${project.projectId} creation`,
          projectId: project.id,
          clientId: project.clientId,
          brandId: project.brandId,
          productId: project.productId || null,
          priority: Priority.HIGH,
          dueDate: new Date(project.shootDate),
          estimatedHours: 4.0,
          status: TaskStatus.PENDING,
        },
      ],
    });

    const createdTasks = await this.prisma.task.findMany({
      where: { taskId: { in: [autoTaskId1, autoTaskId2] } },
    });

    for (const t of createdTasks) {
      await this.prisma.taskTimeline.create({
        data: {
          taskId: t.id,
          event: 'TASK_CREATED',
          description: `Task ${t.taskId} ('${t.title}') automatically created during Project ${project.projectId} creation`,
          userId,
        },
      });
    }

    return project;
  }

  async update(id: string, data: any, userId: string) {
    const existing = await this.findOne(id);

    const updateData: any = { ...data };

    if (data.teamUserIds && Array.isArray(data.teamUserIds)) {
      await this.prisma.projectAssignment.deleteMany({ where: { projectId: id } });
      for (const tUserId of data.teamUserIds) {
        await this.prisma.projectAssignment.create({
          data: { projectId: id, userId: tUserId },
        });
      }
      delete updateData.teamUserIds;

      await this.prisma.activityLog.create({
        data: {
          userId,
          action: 'TEAM_ASSIGNED',
          entity: 'ShootProject',
          entityId: id,
          description: `Updated project team assignments (${data.teamUserIds.length} members)`,
        },
      });
    }

    if (data.equipmentIds && Array.isArray(data.equipmentIds)) {
      const existingReservations = await this.prisma.equipmentReservation.findMany({
        where: { projectId: id },
      });
      const existingEqIds = existingReservations.map((r) => r.equipmentId);

      await this.prisma.equipmentReservation.deleteMany({ where: { projectId: id } });

      for (const oldEqId of existingEqIds) {
        if (!data.equipmentIds.includes(oldEqId)) {
          await this.prisma.equipment.update({
            where: { id: oldEqId },
            data: { availability: EquipmentAvailability.AVAILABLE },
          });
        }
      }

      for (const eqId of data.equipmentIds) {
        await this.prisma.equipmentReservation.create({
          data: {
            projectId: id,
            equipmentId: eqId,
            startDate: existing.shootDate,
            endDate: existing.shootDate,
            status: 'RESERVED',
          },
        });
        await this.prisma.equipment.update({
          where: { id: eqId },
          data: { availability: EquipmentAvailability.RESERVED },
        });
      }
      delete updateData.equipmentIds;

      await this.prisma.activityLog.create({
        data: {
          userId,
          action: 'EQUIPMENT_RESERVED',
          entity: 'ShootProject',
          entityId: id,
          description: `Updated project equipment reservations (${data.equipmentIds.length} items)`,
        },
      });
    }

    // Update nested indoor or outdoor details if passed
    if (existing.shootType === ShootType.INDOOR && data.indoorDetails) {
      await this.prisma.indoorShootDetails.update({
        where: { projectId: id },
        data: data.indoorDetails,
      });
      delete updateData.indoorDetails;
    } else if (existing.shootType === ShootType.OUTDOOR && data.outdoorDetails) {
      await this.prisma.outdoorShootDetails.update({
        where: { projectId: id },
        data: data.outdoorDetails,
      });

      if (data.outdoorDetails.driver) {
        await this.prisma.activityLog.create({
          data: {
            userId,
            action: 'TRANSPORTATION_ASSIGNED',
            entity: 'ShootProject',
            entityId: id,
            description: `Assigned transportation driver: ${data.outdoorDetails.driver}`,
          },
        });
      }
      delete updateData.outdoorDetails;
    }

    if (data.status === 'COMPLETED' && !data.forceComplete) {
      const checklist = existing.completionChecklist;
      if (checklist && !checklist.isReadyForCompletion) {
        const pendingItems: string[] = [];
        if (!checklist.allTasksCompleted) pendingItems.push('All production tasks completed');
        if (!checklist.techReviewApproved) pendingItems.push('Technical approval completed');
        if (!checklist.mediaReviewApproved) pendingItems.push('Media Manager approval completed');
        if (!checklist.clientConfirmationRecorded) pendingItems.push('Client confirmation recorded');

        throw new BadRequestException(
          `Cannot mark project as COMPLETED until all 4 criteria are met: ${pendingItems.join(', ')}`,
        );
      }
    }

    if ((data.status === 'CLOSED' || data.status === 'CANCELLED') && !data.closureReason?.trim() && !existing.closureReason) {
      throw new BadRequestException(
        'A mandatory closure reason is required to manually close a project (e.g. Client cancelled remaining deliverables, Scope reduced, Duplicate project, Production discontinued, or Other).',
      );
    }

    if (data.closureReason?.trim()) {
      const formattedReason = data.closureReason.trim();
      updateData.closureReason = formattedReason;

      await this.prisma.communication.create({
        data: {
          entityType: 'PROJECT',
          entityId: id,
          projectId: id,
          senderId: userId,
          type: 'PROJECT_CLOSURE',
          content: `Project Closure Reason Logged: "${formattedReason}"`,
        },
      });

      await this.prisma.activityLog.create({
        data: {
          userId,
          action: 'PROJECT_CLOSED',
          entity: 'ShootProject',
          entityId: id,
          description: `Mandatory project closure reason logged: "${formattedReason}"`,
        },
      });
    }

    if (data.status) {
      if (data.status === 'CLOSED' || data.status === 'CANCELLED') {
        updateData.lifecycle = 'CLOSED';
      } else if (data.status === 'ARCHIVED') {
        updateData.lifecycle = 'ARCHIVED';
      } else {
        updateData.lifecycle = 'ACTIVE';
      }
    }

    const updated = await this.prisma.shootProject.update({
      where: { id },
      data: updateData,
    });

    if (data.status && data.status !== existing.status) {
      let statusAction = 'STATUS_UPDATED';
      if (data.status === 'IN_PROGRESS') statusAction = 'PRODUCTION_STARTED';
      if (data.status === 'COMPLETED') statusAction = 'PRODUCTION_COMPLETED';
      if (data.status === 'CLOSED' || data.status === 'CANCELLED') statusAction = 'PROJECT_CLOSED';

      await this.prisma.activityLog.create({
        data: {
          userId,
          action: statusAction,
          entity: 'ShootProject',
          entityId: id,
          description: `Status changed from ${existing.status} to ${data.status}`,
        },
      });
    }

    return updated;
  }

  async archive(id: string, userId: string) {
    const project = await this.findOne(id);
    const updated = await this.prisma.shootProject.update({
      where: { id },
      data: { status: ProjectStatus.ARCHIVED },
    });

    await this.prisma.activityLog.create({
      data: {
        userId,
        action: 'PROJECT_CLOSED',
        entity: 'ShootProject',
        entityId: id,
        description: `Archived and closed project ${project.projectId} (${project.name})`,
      },
    });

    return updated;
  }
}
