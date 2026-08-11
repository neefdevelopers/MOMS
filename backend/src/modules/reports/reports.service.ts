import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardSummary() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const activeProjects = await this.prisma.shootProject.findMany({
      where: { status: { not: 'ARCHIVED' } },
      include: {
        client: true,
        brand: true,
        product: true,
        indoorDetails: true,
        outdoorDetails: true,
        assignedTeam: { include: { user: true } },
      },
    });

    const totalProjects = activeProjects.length;
    const indoorProjects = activeProjects.filter((p) => p.shootType === 'INDOOR').length;
    const outdoorProjects = activeProjects.filter((p) => p.shootType === 'OUTDOOR').length;

    // 1. Current Progress
    const totalProgressSum = activeProjects.reduce((sum, p) => sum + (p.progressPercentage || 0), 0);
    const currentProgress = totalProjects > 0 ? Math.round(totalProgressSum / totalProjects) : 0;

    // 2. Pending Tasks
    const pendingTasks = await this.prisma.task.count({
      where: { status: { not: 'COMPLETED' } },
    });

    // 3. Pending Scripts
    const pendingScripts = await this.prisma.script.count({
      where: { status: { notIn: ['COMPLETED', 'APPROVED'] } },
    });

    // 4. Pending Requirements
    const pendingRequirements = await this.prisma.graphicRequirement.count({
      where: { status: { notIn: ['COMPLETED', 'APPROVED'] } },
    });

    // 5. Pending Reviews
    const techReviewQueue = activeProjects.filter((p) => p.status === 'WAITING_FOR_TECHNICAL_REVIEW').length;
    const mediaReviewQueue = activeProjects.filter((p) => p.status === 'WAITING_FOR_MEDIA_REVIEW').length;
    const clientQueue = activeProjects.filter((p) => p.status === 'WAITING_FOR_CLIENT_CONFIRMATION').length;
    const revisionQueue = activeProjects.filter((p) => p.status === 'CLIENT_REVISION_REQUESTED').length;
    const pendingReviews = techReviewQueue + mediaReviewQueue + clientQueue;

    // 6. Equipment Status
    const totalEquipment = await this.prisma.equipment.count();
    const availableEquipment = await this.prisma.equipment.count({ where: { availability: 'AVAILABLE' } });
    const reservedEquipment = await this.prisma.equipment.count({ where: { availability: 'RESERVED' } });
    const issuedEquipment = await this.prisma.equipment.count({ where: { availability: 'ISSUED' } });
    const maintenanceEquipment = await this.prisma.equipment.count({ where: { availability: 'MAINTENANCE' } });

    // 7. Assigned Employees Count
    const assignedEmployeesCount = await this.prisma.projectAssignment.groupBy({
      by: ['userId'],
    }).then((res) => res.length);

    // 8 & 9. Recent Activity / Timeline
    const recentActivity = await this.prisma.activityLog.findMany({
      take: 10,
      orderBy: { timestamp: 'desc' },
      include: { user: { select: { name: true, role: true } } },
    });

    // 10. Today's Indoor Shoots
    const todayIndoorShoots = activeProjects.filter(
      (p) => p.shootType === 'INDOOR' && new Date(p.shootDate) >= todayStart && new Date(p.shootDate) <= todayEnd,
    );

    // 11. Today's Outdoor Shoots
    const todayOutdoorShoots = activeProjects.filter(
      (p) => p.shootType === 'OUTDOOR' && new Date(p.shootDate) >= todayStart && new Date(p.shootDate) <= todayEnd,
    );

    // 12. Outdoor Shoots Awaiting Permission
    const outdoorAwaitingPermission = await this.prisma.outdoorShootDetails.count({
      where: { permissionStatus: 'PENDING' },
    });

    // 13. Outdoor Shoots Affected by Weather
    const outdoorAffectedByWeather = await this.prisma.outdoorShootDetails.count({
      where: { weatherStatus: { in: ['RISK_RAIN', 'EXTREME_HEAT', 'POOR_LIGHT'] } },
    });

    // 14. Studio Booking Status (Indoor)
    const studioBookingConfirmed = await this.prisma.indoorShootDetails.count({
      where: { studioBookingStatus: 'CONFIRMED' },
    });
    const studioBookingPending = await this.prisma.indoorShootDetails.count({
      where: { studioBookingStatus: 'PENDING' },
    });
    const studioBookingCancelled = await this.prisma.indoorShootDetails.count({
      where: { studioBookingStatus: 'CANCELLED' },
    });

    return {
      totalProjects,
      indoorProjects,
      outdoorProjects,
      currentProgress,
      pendingTasks,
      pendingScripts,
      pendingRequirements,
      pendingReviews,
      techReviewQueue,
      mediaReviewQueue,
      clientQueue,
      revisionQueue,
      equipmentStatus: {
        total: totalEquipment,
        available: availableEquipment,
        reserved: reservedEquipment,
        issued: issuedEquipment,
        maintenance: maintenanceEquipment,
      },
      assignedEmployeesCount,
      todayIndoorShootsCount: todayIndoorShoots.length,
      todayIndoorShoots,
      todayOutdoorShootsCount: todayOutdoorShoots.length,
      todayOutdoorShoots,
      outdoorAwaitingPermission,
      outdoorAffectedByWeather,
      studioBookingStatus: {
        confirmed: studioBookingConfirmed,
        pending: studioBookingPending,
        cancelled: studioBookingCancelled,
      },
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
    const [projects, scripts] = await Promise.all([
      this.prisma.shootProject.findMany({
        include: { client: true, brand: true, product: true, revisions: true },
      }),
      this.prisma.script.findMany({
        select: { id: true, objective: true, category: true, status: true },
      }),
    ]);

    const totalProjects = projects.length;
    const completedProjects = projects.filter((p) => p.status === 'COMPLETED').length;
    const totalRevisions = projects.reduce((acc, p) => acc + p.revisionCount, 0);

    const formulas = await this.prisma.outputFormula.findMany();

    // Objective Breakdown for Reporting
    const objectiveCounts: Record<string, number> = {
      'Generate Sales': 0,
      'Increase Awareness': 0,
      'Launch Product': 0,
      'Customer Education': 0,
      'Engagement': 0,
      'Retargeting': 0,
      'Other': 0,
    };

    scripts.forEach((s) => {
      const obj = s.objective?.trim() || 'Other';
      if (objectiveCounts[obj] !== undefined) {
        objectiveCounts[obj]++;
      } else {
        objectiveCounts['Other']++;
      }
    });

    return {
      totalProjects,
      completedProjects,
      totalRevisions,
      totalScriptsCount: scripts.length,
      objectiveBreakdown: objectiveCounts,
      formulas,
      projects,
    };
  }

  // --- Script Contribution Analytics (8 Specific Reports) ---
  async getScriptAnalytics() {
    const scripts = await this.prisma.script.findMany({
      include: {
        brand: true,
        product: true,
        client: true,
        project: true,
        scriptAssignments: { include: { user: { select: { id: true, name: true, role: true } } } },
        deliverables: true,
        timeline: true,
      },
    });

    // 1. Employee Productivity Reports
    const empMap: Record<string, { userId: string; name: string; role: string; assignedCount: number; completedCount: number; revisionCount: number }> = {};
    scripts.forEach((s) => {
      s.scriptAssignments.forEach((sa) => {
        if (!sa.user) return;
        const uid = sa.userId;
        if (!empMap[uid]) {
          empMap[uid] = { userId: uid, name: sa.user.name, role: sa.responsibility || sa.user.role, assignedCount: 0, completedCount: 0, revisionCount: 0 };
        }
        empMap[uid].assignedCount++;
        if (s.status === 'COMPLETED' || s.status === 'Completed') empMap[uid].completedCount++;
        empMap[uid].revisionCount += s.revisionCount || 0;
      });
    });
    const employeeProductivity = Object.values(empMap);

    // 2. Brand Performance Reports
    const brandMap: Record<string, { brandId: string; name: string; shortCode: string; scriptCount: number; completedCount: number; totalRevisions: number; deliverableCount: number }> = {};
    scripts.forEach((s) => {
      const bKey = s.brandId || 'UNBRANDED';
      const bName = s.brand?.name || 'Unassigned Brand';
      const bCode = s.brand?.shortCode || 'N/A';
      if (!brandMap[bKey]) {
        brandMap[bKey] = { brandId: bKey, name: bName, shortCode: bCode, scriptCount: 0, completedCount: 0, totalRevisions: 0, deliverableCount: 0 };
      }
      brandMap[bKey].scriptCount++;
      if (s.status === 'COMPLETED' || s.status === 'Completed') brandMap[bKey].completedCount++;
      brandMap[bKey].totalRevisions += s.revisionCount || 0;
      brandMap[bKey].deliverableCount += (s.deliverables || []).length;
    });
    const brandPerformance = Object.values(brandMap);

    // 3. Product Performance Reports
    const prodMap: Record<string, { productId: string; name: string; productCode: string; scriptCount: number; completedCount: number; deliverables: Record<string, number> }> = {};
    scripts.forEach((s) => {
      if (!s.product) return;
      const pKey = s.productId!;
      if (!prodMap[pKey]) {
        prodMap[pKey] = { productId: pKey, name: s.product.name, productCode: s.product.productCode, scriptCount: 0, completedCount: 0, deliverables: {} };
      }
      prodMap[pKey].scriptCount++;
      if (s.status === 'COMPLETED' || s.status === 'Completed') prodMap[pKey].completedCount++;
      (s.deliverables || []).forEach((d) => {
        prodMap[pKey].deliverables[d.type] = (prodMap[pKey].deliverables[d.type] || 0) + 1;
      });
    });
    const productPerformance = Object.values(prodMap);

    // 4. Language-wise Reports
    const langMap: Record<string, { language: string; totalScripts: number; completedScripts: number; inProductionScripts: number; draftScripts: number }> = {};
    scripts.forEach((s) => {
      const lang = s.language || 'English';
      if (!langMap[lang]) {
        langMap[lang] = { language: lang, totalScripts: 0, completedScripts: 0, inProductionScripts: 0, draftScripts: 0 };
      }
      langMap[lang].totalScripts++;
      if (s.status === 'COMPLETED' || s.status === 'Completed') langMap[lang].completedScripts++;
      else if (s.status === 'IN_PRODUCTION' || s.status === 'In Production') langMap[lang].inProductionScripts++;
      else if (s.status === 'DRAFT' || s.status === 'Draft') langMap[lang].draftScripts++;
    });
    const languageWiseReports = Object.values(langMap);

    // 5. Category-wise Reports
    const catMap: Record<string, { category: string; totalScripts: number; completedScripts: number; totalRevisions: number }> = {};
    scripts.forEach((s) => {
      const cat = s.category || 'Social Media';
      if (!catMap[cat]) {
        catMap[cat] = { category: cat, totalScripts: 0, completedScripts: 0, totalRevisions: 0 };
      }
      catMap[cat].totalScripts++;
      if (s.status === 'COMPLETED' || s.status === 'Completed') catMap[cat].completedScripts++;
      catMap[cat].totalRevisions += s.revisionCount || 0;
    });
    const categoryWiseReports = Object.values(catMap);

    // 6. Production Capacity Reports
    const deliverablesByType: Record<string, number> = {};
    scripts.forEach((s) => {
      (s.deliverables || []).forEach((d) => {
        deliverablesByType[d.type] = (deliverablesByType[d.type] || 0) + 1;
      });
    });
    const productionCapacity = {
      totalPipelineScripts: scripts.length,
      inProductionCount: scripts.filter((s) => s.status === 'IN_PRODUCTION' || s.status === 'In Production').length,
      readyCount: scripts.filter((s) => s.status === 'READY' || s.status === 'Ready').length,
      draftCount: scripts.filter((s) => s.status === 'DRAFT' || s.status === 'Draft').length,
      completedCount: scripts.filter((s) => s.status === 'COMPLETED' || s.status === 'Completed').length,
      totalDeliverablesPlanned: Object.values(deliverablesByType).reduce((a, b) => a + b, 0),
      deliverablesByType,
    };

    // 7. Revision Reports
    const totalRevisions = scripts.reduce((acc, s) => acc + (s.revisionCount || 0), 0);
    const zeroRevisions = scripts.filter((s) => (s.revisionCount || 0) === 0).length;
    const oneToTwoRevisions = scripts.filter((s) => (s.revisionCount || 0) >= 1 && (s.revisionCount || 0) <= 2).length;
    const threePlusRevisions = scripts.filter((s) => (s.revisionCount || 0) >= 3).length;
    const pendingRevisionRequestCount = scripts.filter((s) => s.status?.includes('REVISION')).length;

    const revisionReports = {
      totalRevisions,
      avgRevisionsPerScript: scripts.length > 0 ? (totalRevisions / scripts.length).toFixed(2) : '0',
      pendingRevisionRequestCount,
      distribution: { zeroRevisions, oneToTwoRevisions, threePlusRevisions },
    };

    // 8. Approval Reports
    const approvalReports = {
      waitingTechnicalReview: scripts.filter((s) => s.status === 'WAITING_FOR_TECHNICAL_REVIEW').length,
      waitingMediaReview: scripts.filter((s) => s.status === 'WAITING_FOR_MEDIA_REVIEW').length,
      waitingClientConfirmation: scripts.filter((s) => s.status === 'WAITING_FOR_CLIENT_CONFIRMATION').length,
      productionCompletedCount: scripts.filter((s) => s.productionCompleted).length,
      technicalApprovedCount: scripts.filter((s) => s.technicalReviewApproved).length,
      mediaApprovedCount: scripts.filter((s) => s.mediaManagerReviewApproved).length,
      clientConfirmedCount: scripts.filter((s) => s.clientConfirmationRecorded).length,
      fullyApprovedCount: scripts.filter((s) => s.productionCompleted && s.technicalReviewApproved && s.mediaManagerReviewApproved && s.clientConfirmationRecorded).length,
    };

    return {
      employeeProductivity,
      brandPerformance,
      productPerformance,
      languageWiseReports,
      categoryWiseReports,
      productionCapacity,
      revisionReports,
      approvalReports,
    };
  }
}
