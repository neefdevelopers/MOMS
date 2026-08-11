import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardSummary() {
    const totalProjects = await this.prisma.shootProject.count({ where: { status: { not: 'ARCHIVED' } } });
    const indoorProjects = await this.prisma.shootProject.count({ where: { shootType: 'INDOOR', status: { not: 'ARCHIVED' } } });
    const outdoorProjects = await this.prisma.shootProject.count({ where: { shootType: 'OUTDOOR', status: { not: 'ARCHIVED' } } });

    const techReviewQueue = await this.prisma.shootProject.count({ where: { status: 'WAITING_FOR_TECHNICAL_REVIEW' } });
    const mediaReviewQueue = await this.prisma.shootProject.count({ where: { status: 'WAITING_FOR_MEDIA_REVIEW' } });
    const clientQueue = await this.prisma.shootProject.count({ where: { status: 'WAITING_FOR_CLIENT_CONFIRMATION' } });
    const revisionQueue = await this.prisma.shootProject.count({ where: { status: 'CLIENT_REVISION_REQUESTED' } });

    const recentActivity = await this.prisma.activityLog.findMany({
      take: 8,
      orderBy: { timestamp: 'desc' },
      include: { user: { select: { name: true, role: true } } },
    });

    return {
      totalProjects,
      indoorProjects,
      outdoorProjects,
      techReviewQueue,
      mediaReviewQueue,
      clientQueue,
      revisionQueue,
      recentActivity,
    };
  }

  async getGlobalSearch(query: string) {
    if (!query || query.trim().length === 0) return { results: [] };
    const q = query.trim();

    const [clients, brands, products, projects, scripts, graphicReqs, tasks, equipment, staff, files] = await Promise.all([
      this.prisma.client.findMany({ where: { OR: [{ name: { contains: q } }, { companyName: { contains: q } }] }, take: 5 }),
      this.prisma.brand.findMany({ where: { OR: [{ name: { contains: q } }, { shortCode: { contains: q } }] }, take: 5 }),
      this.prisma.product.findMany({ where: { OR: [{ name: { contains: q } }, { productCode: { contains: q } }] }, take: 5 }),
      this.prisma.shootProject.findMany({ where: { OR: [{ name: { contains: q } }, { projectId: { contains: q } }, { shootLocation: { contains: q } }] }, take: 5 }),
      this.prisma.script.findMany({ where: { OR: [{ name: { contains: q } }, { scriptId: { contains: q } }] }, take: 5 }),
      this.prisma.graphicRequirement.findMany({ where: { OR: [{ name: { contains: q } }, { requirementId: { contains: q } }] }, take: 5 }),
      this.prisma.task.findMany({ where: { OR: [{ title: { contains: q } }, { taskId: { contains: q } }] }, take: 5 }),
      this.prisma.equipment.findMany({ where: { OR: [{ name: { contains: q } }, { equipmentId: { contains: q } }, { serialNumber: { contains: q } }] }, take: 5 }),
      this.prisma.user.findMany({ where: { OR: [{ name: { contains: q } }, { email: { contains: q } }] }, select: { id: true, name: true, email: true, role: true }, take: 5 }),
      this.prisma.fileMetadata.findMany({ where: { fileName: { contains: q } }, take: 5 }),
    ]);

    return {
      clients: clients.map((c) => ({ type: 'Client', id: c.id, title: c.name, subtitle: c.companyName, url: `/clients` })),
      brands: brands.map((b) => ({ type: 'Brand', id: b.id, title: b.name, subtitle: `[${b.shortCode}]`, url: `/brands` })),
      products: products.map((p) => ({ type: 'Product', id: p.id, title: p.name, subtitle: `Code: ${p.productCode}`, url: `/products` })),
      projects: projects.map((pr) => ({ type: 'Project', id: pr.id, title: pr.name, subtitle: pr.projectId, url: `/projects/${pr.id}` })),
      scripts: scripts.map((s) => ({ type: 'Script', id: s.id, title: s.name, subtitle: s.scriptId, url: `/scripts` })),
      graphicReqs: graphicReqs.map((g) => ({ type: 'Graphic Requirement', id: g.id, title: g.name, subtitle: g.requirementId, url: `/graphic-reqs` })),
      tasks: tasks.map((t) => ({ type: 'Task', id: t.id, title: t.title, subtitle: t.taskId, url: `/tasks` })),
      equipment: equipment.map((e) => ({ type: 'Equipment', id: e.id, title: e.name, subtitle: e.equipmentId, url: `/equipment` })),
      staff: staff.map((u) => ({ type: 'Staff', id: u.id, title: u.name, subtitle: u.role, url: `/staff` })),
      files: files.map((f) => ({ type: 'File', id: f.id, title: f.fileName, subtitle: `${(f.fileSize / 1024).toFixed(0)} KB`, url: `/projects/${f.projectId}` })),
    };
  }

  async getProductionReports() {
    const projects = await this.prisma.shootProject.findMany({
      include: { client: true, brand: true, product: true, revisions: true },
    });

    const totalProjects = projects.length;
    const completedProjects = projects.filter((p) => p.status === 'COMPLETED').length;
    const totalRevisions = projects.reduce((acc, p) => acc + p.revisionCount, 0);

    const formulas = await this.prisma.outputFormula.findMany();

    return {
      totalProjects,
      completedProjects,
      totalRevisions,
      formulas,
      projects,
    };
  }
}
