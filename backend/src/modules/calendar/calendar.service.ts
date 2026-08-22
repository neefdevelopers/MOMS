import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
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
  ) {
    const where: any = {};
    if (clientId) where.clientId = clientId;
    if (brandId) where.brandId = brandId;
    if (shootType) where.shootType = shootType;
    if (status) where.status = status;

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

  async findOne(id: string) {
    const event = await this.prisma.mediaCalendarEvent.findUnique({
      where: { id },
      include: {
        client: true,
        brand: true,
        product: true,
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
    return event;
  }

  async create(data: any) {
    if (!data.title?.trim()) {
      throw new BadRequestException('Event / Project Name is required.');
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

    // Equipment Availability & Conflict Check
    if (data.equipmentIds && Array.isArray(data.equipmentIds) && data.equipmentIds.length > 0) {
      const busyEquipment = await this.prisma.equipment.findMany({
        where: {
          id: { in: data.equipmentIds },
          OR: [
            { availability: { in: ['UNDER_MAINTENANCE', 'DAMAGED', 'LOST', 'RETIRED'] } },
            { isArchived: true },
          ],
        },
      });
      if (busyEquipment.length > 0) {
        throw new BadRequestException(
          `Equipment "${busyEquipment[0].name}" is currently ${busyEquipment[0].availability} and cannot be scheduled.`
        );
      }
    }

    // Team Schedule Conflict Check for the same Shoot Date
    if (data.teamUserIds && Array.isArray(data.teamUserIds) && data.teamUserIds.length > 0) {
      const targetDate = new Date(data.shootDate);
      const startOfDay = new Date(new Date(targetDate).setHours(0, 0, 0, 0));
      const endOfDay = new Date(new Date(targetDate).setHours(23, 59, 59, 999));

      const conflictingProject = await this.prisma.shootProject.findFirst({
        where: {
          assignedTeam: {
            some: { userId: { in: data.teamUserIds } },
          },
          shootDate: { gte: startOfDay, lte: endOfDay },
          status: { notIn: ['CANCELLED', 'CLOSED'] },
        },
        include: { assignedTeam: { include: { user: true } } },
      });
      if (conflictingProject) {
        const busyUser = conflictingProject.assignedTeam.find((tm) => data.teamUserIds.includes(tm.userId))?.user;
        throw new BadRequestException(
          `Scheduling Conflict: Team member "${busyUser?.name || 'Staff Member'}" is already assigned to project "${conflictingProject.name}" on ${targetDate.toLocaleDateString()}.`
        );
      }
    }

    const event = await this.prisma.mediaCalendarEvent.create({
      data: {
        title: data.title,
        clientId: data.clientId,
        brandId: data.brandId,
        productId: data.productId || null,
        shootType: data.shootType || ShootType.INDOOR,
        shootDate: new Date(data.shootDate),
        influencerTalent: data.influencerTalent,
        priority: data.priority || Priority.MEDIUM,
        productionNotes: data.productionNotes,
        status: 'SCHEDULED',
      },
      include: { client: true, brand: true, product: true },
    });

    // Automated Generation Trigger 1: Automatically generate Shoot Project and Graphic Requirement from Media Calendar
    const projectCount = await this.prisma.shootProject.count();
    const autoProjectId = `SP-${(projectCount + 1).toString().padStart(6, '0')}`;
    const dateFormatted = new Date(event.shootDate).toISOString().slice(2, 10).replace(/-/g, '');
    const defaultProjName = `${brand.shortCode}-${dateFormatted}-CALENDAR`;

    const project = await this.prisma.shootProject.create({
      data: {
        projectId: autoProjectId,
        name: defaultProjName,
        clientId: event.clientId,
        brandId: event.brandId,
        productId: event.productId || null,
        calendarEventId: event.id,
        shootType: event.shootType,
        shootDate: event.shootDate,
        estimatedCompletionDate: data.deadline ? new Date(data.deadline) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        shootLocation: data.location || 'Studio / Designated Site',
        reportingTime: '09:00 AM',
        expectedWrapUpTime: '05:00 PM',
        influencerTalent: event.influencerTalent,
        priority: event.priority,
        status: 'PLANNED',
        notes: `Automatically generated project from Media Calendar Event: ${event.title}`,
        createdById: data.createdById || (await this.prisma.user.findFirst({ where: { role: 'MEDIA_MANAGER' } }))?.id || '',
        indoorDetails: {
          create: {
            studioName: 'Main Studio',
            studioAddress: 'Studio Floor, Media Ops HQ',
            reportingTime: '09:00 AM',
            wrapUpTime: '05:00 PM',
          },
        },
      },
    });

    // Automatically generate Graphic Requirement from Media Calendar Event
    const reqCount = await this.prisma.graphicRequirement.count();
    const autoReqId = `GR-${(reqCount + 1).toString().padStart(6, '0')}`;

    const graphicReq = await this.prisma.graphicRequirement.create({
      data: {
        requirementId: autoReqId,
        name: `Key Visual Banner - ${event.title}`,
        projectId: project.id,
        clientId: event.clientId,
        brandId: event.brandId,
        calendarEventId: event.id,
        productId: event.productId || null,
        requirementType: 'Poster',
        objective: `Automated key visual graphic generated from Media Calendar Event (${event.title})`,
        description: `Automated graphic requirement created from Media Calendar scheduling.`,
        priority: event.priority || 'MEDIUM',
        status: 'DRAFT',
      },
    });

    // Automatically create graphic tasks for the generated Graphic Requirement
    const taskCount = await this.prisma.task.count();
    const autoTaskId1 = `TSK-${(taskCount + 1).toString().padStart(6, '0')}`;
    const autoTaskId2 = `TSK-${(taskCount + 2).toString().padStart(6, '0')}`;

    await this.prisma.task.createMany({
      data: [
        {
          taskId: autoTaskId1,
          title: `Key Visual Graphic Composition - ${graphicReq.name}`,
          description: `Automated task created from Media Calendar Graphic Requirement ${graphicReq.requirementId}`,
          projectId: project.id,
          graphicRequirementId: graphicReq.id,
          clientId: event.clientId,
          brandId: event.brandId,
          productId: event.productId || null,
          priority: graphicReq.priority,
          dueDate: new Date(event.shootDate),
          estimatedHours: 3.0,
          status: 'PENDING',
        },
        {
          taskId: autoTaskId2,
          title: `Final Poster Export & Format Review - ${graphicReq.name}`,
          description: `Automated task created from Media Calendar Graphic Requirement ${graphicReq.requirementId}`,
          projectId: project.id,
          graphicRequirementId: graphicReq.id,
          clientId: event.clientId,
          brandId: event.brandId,
          productId: event.productId || null,
          priority: graphicReq.priority,
          dueDate: new Date(event.shootDate),
          estimatedHours: 2.0,
          status: 'PENDING',
        },
      ],
    });

    return this.findOne(event.id);
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

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.mediaCalendarEvent.update({
      where: { id },
      data: {
        title: data.title,
        shootType: data.shootType,
        shootDate: data.shootDate ? new Date(data.shootDate) : undefined,
        influencerTalent: data.influencerTalent,
        priority: data.priority,
        productionNotes: data.productionNotes,
        status: data.status,
      },
      include: { client: true, brand: true, product: true },
    });
  }

  async cancel(id: string) {
    await this.findOne(id);
    return this.prisma.mediaCalendarEvent.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}
