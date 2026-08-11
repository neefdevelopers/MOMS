import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ShootType, ProjectStatus, Priority, PermissionStatus, WeatherStatus, StudioBookingStatus } from '../../common/enums';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    search?: string;
    clientId?: string;
    brandId?: string;
    shootType?: ShootType;
    status?: ProjectStatus;
    archived?: boolean;
    userId?: string;
    role?: string;
  }) {
    const where: any = {};
    if (params.clientId) where.clientId = params.clientId;
    if (params.brandId) where.brandId = params.brandId;
    if (params.shootType) where.shootType = params.shootType;

    if (params.archived) {
      where.status = ProjectStatus.ARCHIVED;
    } else if (params.status) {
      where.status = params.status;
    } else {
      where.status = { not: ProjectStatus.ARCHIVED };
    }

    if (params.search) {
      where.OR = [
        { name: { contains: params.search } },
        { projectId: { contains: params.search } },
        { shootLocation: { contains: params.search } },
        { influencerTalent: { contains: params.search } },
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
    return project;
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

    // 2. Generate Next Project ID (SP-00000X)
    const count = await this.prisma.shootProject.count();
    const nextSeq = (count + 1).toString().padStart(6, '0');
    const autoProjectId = `SP-${nextSeq}`;

    // 3. Automated Naming Rule
    const dateFormatted = new Date(data.shootDate).toISOString().slice(2, 10).replace(/-/g, '');
    const influencerTag = data.influencerTalent ? data.influencerTalent.split(' ')[0].toUpperCase() : 'SHOOT';
    const defaultName = `${brand.shortCode}-${dateFormatted}-${influencerTag}`;

    const projectData: any = {
      projectId: autoProjectId,
      name: data.name || defaultName,
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
      status: ProjectStatus.PLANNED,
      estimatedCompletionDate: data.estimatedCompletionDate ? new Date(data.estimatedCompletionDate) : null,
      notes: data.notes,
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
          studioBookingRef: data.indoorDetails.studioBookingRef || `STU-${Date.now().toString().slice(-4)}`,
          reportingTime: data.reportingTime || '09:00 AM',
          wrapUpTime: data.expectedWrapUpTime || '06:00 PM',
          indoorEquipmentReqs: data.indoorDetails.indoorEquipmentReqs,
          lightingRequirements: data.indoorDetails.lightingRequirements,
          indoorChecklist: data.indoorDetails.indoorChecklist || 'Props ready, Product polished',
        },
      };
    } else {
      if (!data.outdoorDetails?.outdoorLocation) {
        throw new BadRequestException('Outdoor Shoot requires Outdoor Location Details');
      }
      projectData.outdoorDetails = {
        create: {
          outdoorLocation: data.outdoorDetails.outdoorLocation,
          locationAddress: data.outdoorDetails.locationAddress || data.shootLocation,
          locationCategory: data.outdoorDetails.locationCategory || 'Outdoor Site',
          locationContactPerson: data.outdoorDetails.locationContactPerson,
          permissionStatus: data.outdoorDetails.permissionStatus || PermissionStatus.PENDING,
          weatherStatus: data.outdoorDetails.weatherStatus || WeatherStatus.FAVORABLE,
          transportationReq: data.outdoorDetails.transportationReq ?? true,
          driver: data.outdoorDetails.driver,
          logisticsCoordinator: data.outdoorDetails.logisticsCoordinator,
          travelNotes: data.outdoorDetails.travelNotes,
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

    // 6. Record Permanent Activity Audit Log
    await this.prisma.activityLog.create({
      data: {
        userId,
        action: 'CREATE_PROJECT',
        entity: 'ShootProject',
        entityId: project.id,
        description: `Created ${project.shootType} shoot project ${project.projectId} (${project.name})`,
      },
    });

    return project;
  }

  async update(id: string, data: any, userId: string) {
    const existing = await this.findOne(id);

    const updateData: any = { ...data };

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
      delete updateData.outdoorDetails;
    }

    const updated = await this.prisma.shootProject.update({
      where: { id },
      data: updateData,
    });

    await this.prisma.activityLog.create({
      data: {
        userId,
        action: 'UPDATE_PROJECT',
        entity: 'ShootProject',
        entityId: id,
        description: `Updated project ${existing.projectId} details / status`,
      },
    });

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
        action: 'ARCHIVE_PROJECT',
        entity: 'ShootProject',
        entityId: id,
        description: `Archived project ${project.projectId} (${project.name})`,
      },
    });

    return updated;
  }
}
