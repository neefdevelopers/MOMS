import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ScriptsService {
  constructor(private prisma: PrismaService) {}

  async findAll(projectId?: string) {
    const where: any = {};
    if (projectId) where.projectId = projectId;

    return this.prisma.script.findMany({
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
    const script = await this.prisma.script.findUnique({
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
    if (!script) throw new NotFoundException('Script not found');
    return script;
  }

  async create(data: any) {
    const project = await this.prisma.shootProject.findUnique({ where: { id: data.projectId } });
    if (!project) throw new NotFoundException('Parent project not found');

    const count = await this.prisma.script.count();
    const autoScriptId = `SCR-${(count + 1).toString().padStart(6, '0')}`;

    return this.prisma.script.create({
      data: {
        scriptId: autoScriptId,
        name: data.name,
        projectId: project.id,
        clientId: project.clientId,
        brandId: project.brandId,
        productId: project.productId || null,
        campaignId: project.campaignId || null,
        language: data.language || 'English',
        category: data.category || 'Social Media',
        objective: data.objective,
        description: data.description,
        estimatedDuration: data.estimatedDuration || '30s',
        status: data.status || 'DRAFT',
        priority: data.priority || 'MEDIUM',
        remarks: data.remarks,
      },
    });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.script.update({
      where: { id },
      data: {
        name: data.name,
        language: data.language,
        category: data.category,
        objective: data.objective,
        description: data.description,
        estimatedDuration: data.estimatedDuration,
        status: data.status,
        priority: data.priority,
        remarks: data.remarks,
      },
    });
  }
}
