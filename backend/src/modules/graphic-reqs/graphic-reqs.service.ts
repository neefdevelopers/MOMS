import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GraphicReqsService {
  constructor(private prisma: PrismaService) {}

  async findAll(projectId?: string) {
    const where: any = {};
    if (projectId) where.projectId = projectId;

    return this.prisma.graphicRequirement.findMany({
      where,
      include: {
        project: true,
        client: true,
        brand: true,
        product: true,
        tasks: { include: { assignedEmployees: { include: { user: true } } } },
        files: true,
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
        product: true,
        tasks: true,
        files: true,
      },
    });
    if (!req) throw new NotFoundException('Graphic Requirement not found');
    return req;
  }

  async create(data: any) {
    const project = await this.prisma.shootProject.findUnique({ where: { id: data.projectId } });
    if (!project) throw new NotFoundException('Parent project not found');

    const count = await this.prisma.graphicRequirement.count();
    const autoReqId = `GR-${(count + 1).toString().padStart(6, '0')}`;

    const req = await this.prisma.graphicRequirement.create({
      data: {
        requirementId: autoReqId,
        name: data.name,
        projectId: project.id,
        clientId: project.clientId,
        brandId: project.brandId,
        productId: project.productId || null,
        campaignId: project.campaignId || null,
        requirementType: data.requirementType || 'Poster',
        objective: data.objective,
        description: data.description,
        priority: data.priority || 'MEDIUM',
        status: data.status || 'DRAFT',
        remarks: data.remarks,
      },
    });

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
          dueDate: new Date(Date.now() + 2 * 86400000),
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
          dueDate: new Date(Date.now() + 3 * 86400000),
          estimatedHours: 2.0,
          status: 'PENDING',
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
          description: `Task ${t.taskId} ('${t.title}') automatically created during Graphic Requirement ${req.requirementId} creation`,
        },
      });
    }

    return req;
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.graphicRequirement.update({
      where: { id },
      data: {
        name: data.name,
        requirementType: data.requirementType,
        objective: data.objective,
        description: data.description,
        priority: data.priority,
        status: data.status,
        remarks: data.remarks,
      },
    });
  }
}
