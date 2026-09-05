import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { canUserViewScript } from '../../common/utils/event-auth';

export function isValidProductionStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  const s = status.trim().toUpperCase();
  if (!s) return false;
  if (
    s.startsWith('WAITING_FOR_') ||
    s.startsWith('PENDING_') ||
    s === 'APPROVED' ||
    s === 'COMPLETED'
  ) {
    return false;
  }
  return true;
}

@Injectable()
export class ScriptsService {
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
    language?: string;
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
    if (p.language && p.language !== 'ALL') where.language = { contains: p.language };

    if (p.employeeId) {
      where.scriptAssignments = {
        some: { userId: p.employeeId },
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

    // Role-based query filtering for STAFF and SOCIAL_MEDIA_MANAGER:
    // Only see scripts created by them or assigned to them via accepted tasks/assignments
    if ((p.role === 'STAFF' || p.role === 'SOCIAL_MEDIA_MANAGER') && p.userId) {
      where.OR = [
        { createdById: p.userId },
        { scriptAssignments: { some: { userId: p.userId } } },
        { tasks: { some: { assignedEmployees: { some: { userId: p.userId, acceptanceStatus: 'ACCEPTED' } } } } },
        { project: { createdById: p.userId } },
      ];
    }

    if (p.search && p.search.trim()) {
      const q = p.search.trim();
      const searchConditions = [
        { name: { contains: q } },
        { scriptId: { contains: q } },
        { language: { contains: q } },
        { category: { contains: q } },
        { project: { name: { contains: q } } },
        { project: { projectId: { contains: q } } },
        { brand: { name: { contains: q } } },
        { brand: { shortCode: { contains: q } } },
        { product: { name: { contains: q } } },
        { scriptAssignments: { some: { user: { name: { contains: q } } } } },
      ];

      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const scripts = await this.prisma.script.findMany({
      where,
      include: {
        project: true,
        client: true,
        brand: true,
        product: true,
        campaign: true,
        createdBy: { select: { id: true, name: true, role: true, email: true } },
        approvedBy: { select: { id: true, name: true, role: true, email: true } },
        tasks: { include: { assignedEmployees: { include: { user: true } } } },
        files: true,
        scriptAssignments: { include: { user: { select: { id: true, name: true, role: true, avatarUrl: true } } } },
        timeline: {
          include: { triggeredBy: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
        scriptRemarks: {
          include: { user: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
        deliverables: { orderBy: { createdAt: 'asc' } },
        attachmentLinks: { orderBy: { createdAt: 'desc' } },
        approvals: {
          include: {
            reviewer: { select: { id: true, name: true, role: true, email: true, avatarUrl: true } },
            requestedBy: { select: { id: true, name: true, role: true, email: true, avatarUrl: true } },
          },
          orderBy: [{ round: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (p.userId && p.role) {
      return scripts.filter((s) => canUserViewScript({ id: p.userId, role: p.role }, s));
    }
    return scripts;
  }

  async findOne(id: string, user?: any) {
    const script = await this.prisma.script.findUnique({
      where: { id },
      include: {
        project: true,
        client: true,
        brand: true,
        product: true,
        campaign: true,
        createdBy: { select: { id: true, name: true, role: true, email: true } },
        approvedBy: { select: { id: true, name: true, role: true, email: true } },
        tasks: { include: { assignedEmployees: { include: { user: true } } } },
        files: true,
        scriptAssignments: { include: { user: { select: { id: true, name: true, role: true, avatarUrl: true } } } },
        timeline: {
          include: { triggeredBy: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
        scriptRemarks: {
          include: { user: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
        deliverables: { orderBy: { createdAt: 'asc' } },
        attachmentLinks: { orderBy: { createdAt: 'desc' } },
        approvals: {
          include: {
            reviewer: { select: { id: true, name: true, role: true, email: true, avatarUrl: true } },
            requestedBy: { select: { id: true, name: true, role: true, email: true, avatarUrl: true } },
          },
          orderBy: [{ round: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
    if (!script) throw new NotFoundException('Script not found');

    if (user && !canUserViewScript(user, script)) {
      throw new ForbiddenException('You are not authorized to view this script.');
    }

    return script;
  }

  async assignEmployee(scriptId: string, userId: string, responsibility: string) {
    const script = await this.findOne(scriptId);
    const result = await this.prisma.scriptAssignment.upsert({
      where: { scriptId_userId_responsibility: { scriptId, userId, responsibility } },
      create: { scriptId, userId, responsibility },
      update: { assignedAt: new Date() },
      include: { user: { select: { id: true, name: true, role: true } } },
    });
    await this.logTimeline(scriptId, 'ASSIGNED', `Assigned as ${responsibility}: ${result.user?.name}`, userId);

    // Operational Event Notification referencing originating SCRIPT entity
    await this.prisma.notification.create({
      data: {
        userId,
        title: 'Assigned to Script',
        message: `You were assigned as ${responsibility} on script ${script.scriptId}: ${script.name}`,
        type: 'INFO',
        linkUrl: `/scripts`,
        eventType: 'SCRIPT_ASSIGNED',
        entityType: 'SCRIPT',
        entityId: script.id,
        entityCode: script.scriptId,
        scriptId: script.id,
        projectId: script.projectId || null,
      },
    });

    return result;
  }

  async removeAssignment(scriptId: string, userId: string, responsibility: string) {
    return this.prisma.scriptAssignment.deleteMany({
      where: { scriptId, userId, responsibility },
    });
  }

  async getAssignments(scriptId: string) {
    return this.prisma.scriptAssignment.findMany({
      where: { scriptId },
      include: { user: { select: { id: true, name: true, role: true, avatarUrl: true } } },
      orderBy: { assignedAt: 'asc' },
    });
  }

  // --- Timeline Methods ---

  private readonly STATUS_TO_EVENT: Record<string, string> = {
    DRAFT: 'SCRIPT_CREATED',
    READY: 'PRODUCTION_STARTED',
    ASSIGNED: 'ASSIGNED',
    IN_PRODUCTION: 'PRODUCTION_STARTED',
    WAITING_FOR_TECHNICAL_REVIEW: 'TECHNICAL_REVIEW_REQUESTED',
    WAITING_FOR_MEDIA_REVIEW: 'MEDIA_REVIEW_APPROVED',
    WAITING_FOR_MARKETING_APPROVAL: 'MEDIA_REVIEW_APPROVED',
    PENDING_MARKETING_APPROVAL: 'MEDIA_REVIEW_APPROVED',
    WAITING_FOR_CLIENT_CONFIRMATION: 'CLIENT_CONFIRMATION',
    CLIENT_REVISION_REQUESTED: 'REVISION_REQUESTED',
    COMPLETED: 'COMPLETED',
    CLOSED: 'CLOSED',
    CANCELLED: 'CLOSED',
  };

  private readonly EVENT_LABELS: Record<string, string> = {
    SCRIPT_CREATED: 'Script Created',
    SCRIPT_UPDATED: 'Script Updated',
    ASSIGNED: 'Assigned',
    PRODUCTION_STARTED: 'Production Started',
    PRODUCTION_UPDATED: 'Production Updated',
    TECHNICAL_REVIEW_REQUESTED: 'Technical Review Requested',
    TECHNICAL_REVIEW_APPROVED: 'Technical Review Approved',
    TECHNICAL_REVIEW_REJECTED: 'Technical Review Rejected',
    MEDIA_REVIEW_APPROVED: 'Media Manager Review Approved',
    MEDIA_REVIEW_REJECTED: 'Media Manager Review Rejected',
    MARKETING_REVIEW_APPROVED: 'Marketing Manager Approval Approved',
    MARKETING_REVIEW_REJECTED: 'Marketing Manager Review Rejected',
    SCRIPT_RETURNED_TO_PRODUCTION: 'Script Returned to Production',
    CLIENT_CONFIRMATION: 'Client Confirmation',
    REVISION_REQUESTED: 'Revision Requested',
    COMPLETED: 'Script Completed',
    CLOSED: 'Closed',
  };

  async logTimeline(scriptId: string, event: string, description?: string, triggeredById?: string) {
    const descText = description || this.EVENT_LABELS[event] || event;
    const timelineItem = await this.prisma.scriptTimeline.create({
      data: { scriptId, event, description: descText, triggeredById: triggeredById || null },
      include: { triggeredBy: { select: { id: true, name: true, role: true } } },
    });

    // Also sync timeline log event to all linked Task Timelines & Task Remarks
    const linkedTasks = await this.prisma.task.findMany({ where: { scriptId }, select: { id: true } });
    for (const t of linkedTasks) {
      await this.prisma.taskTimeline.create({
        data: {
          taskId: t.id,
          event: 'STATUS_CHANGED',
          description: `[Script Workflow] ${descText}`,
          userId: triggeredById || null,
        },
      }).catch(() => null);

      if (event.includes('REJECTED') || event.includes('APPROVED')) {
        let fallbackUserId = triggeredById;
        if (!fallbackUserId) {
          const u = await this.prisma.user.findFirst({ select: { id: true } });
          fallbackUserId = u?.id;
        }
        if (fallbackUserId) {
          await this.prisma.taskRemark.create({
            data: {
              taskId: t.id,
              userId: fallbackUserId,
              message: `[Operational Timeline Log] ${descText}`,
            },
          }).catch(() => null);
        }
      }
    }

    return timelineItem;
  }

  async getTimeline(scriptId: string) {
    return this.prisma.scriptTimeline.findMany({
      where: { scriptId },
      include: { triggeredBy: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  // --- Remarks Methods (permanent, never deleted) ---

  async addRemark(scriptId: string, userId: string, message: string) {
    await this.findOne(scriptId);
    return this.prisma.scriptRemark.create({
      data: { scriptId, userId, message },
      include: { user: { select: { id: true, name: true, role: true } } },
    });
  }

  async getRemarks(scriptId: string) {
    return this.prisma.scriptRemark.findMany({
      where: { scriptId },
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  // --- Deliverable Methods ---

  async addDeliverable(scriptId: string, data: { type: string; title?: string; description?: string; duration?: string }) {
    await this.findOne(scriptId);
    return this.prisma.scriptDeliverable.create({
      data: { scriptId, type: data.type, title: data.title, description: data.description, duration: data.duration },
    });
  }

  async getDeliverables(scriptId: string) {
    return this.prisma.scriptDeliverable.findMany({
      where: { scriptId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateDeliverable(deliverableId: string, data: { type?: string; title?: string; description?: string; duration?: string; status?: string }) {
    return this.prisma.scriptDeliverable.update({
      where: { id: deliverableId },
      data,
    });
  }

  async deleteDeliverable(deliverableId: string) {
    return this.prisma.scriptDeliverable.delete({ where: { id: deliverableId } });
  }

  async getCategories() {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'SCRIPT_CATEGORIES' },
    });
    const defaultCategories = [
      'Advertisement',
      'Awareness',
      'Educational',
      'Promotional',
      'Testimonial',
      'Product Demo',
      'Festival Campaign',
      'Social Media',
      'Branding',
      'Other',
    ];
    if (!setting) return defaultCategories;
    try {
      return JSON.parse(setting.value);
    } catch {
      return defaultCategories;
    }
  }

  async updateCategories(categories: string[]) {
    return this.prisma.systemSetting.upsert({
      where: { key: 'SCRIPT_CATEGORIES' },
      update: { value: JSON.stringify(categories) },
      create: {
        key: 'SCRIPT_CATEGORIES',
        value: JSON.stringify(categories),
        description: 'Configurable Script Categories / Purpose',
      },
    });
  }

  async getNamingFormat() {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'SCRIPT_NAMING_FORMAT' },
    });
    return {
      format: setting?.value || '{BrandCode}-{Date}-{ProductCode}-{LanguageCode}-{Seq}',
      example: 'DW-130726-OJ-KL-001',
    };
  }

  async updateNamingFormat(format: string) {
    return this.prisma.systemSetting.upsert({
      where: { key: 'SCRIPT_NAMING_FORMAT' },
      update: { value: format.trim() },
      create: { key: 'SCRIPT_NAMING_FORMAT', value: format.trim(), description: 'Configurable script naming convention' },
    });
  }

  async generateFormattedScriptName(projectId: string, language?: string) {
    const project = await this.prisma.shootProject.findUnique({
      where: { id: projectId },
      include: { brand: true, product: true },
    });
    if (!project) throw new NotFoundException('Parent project not found');

    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'SCRIPT_NAMING_FORMAT' },
    });
    const formatPattern = setting?.value || '{BrandCode}-{Date}-{ProductCode}-{LanguageCode}-{Seq}';

    // 1. Brand Code (DW / shortCode)
    const brandCode = project.brand?.shortCode?.toUpperCase() || project.brand?.name?.slice(0, 2).toUpperCase() || 'DW';

    // 2. Date (DDMMYY format, e.g. 130726)
    const d = new Date(project.shootDate);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear().toString().slice(2);
    const dateFormatted = `${day}${month}${year}`;

    // 3. Product Code (OJ / productCode)
    const productCode = project.product?.productCode?.toUpperCase() || project.product?.name?.slice(0, 2).toUpperCase() || 'OJ';

    // 4. Language Code (KL / EN / HI / etc.)
    const langStr = (language || 'English').toLowerCase();
    let languageCode = 'EN';
    if (langStr.includes('malayalam') || langStr.includes('kl')) languageCode = 'KL';
    else if (langStr.includes('hindi') || langStr.includes('hi')) languageCode = 'HI';
    else if (langStr.includes('tamil') || langStr.includes('tn')) languageCode = 'TN';
    else if (langStr.includes('kannada') || langStr.includes('ka')) languageCode = 'KA';
    else if (langStr.includes('telugu') || langStr.includes('te')) languageCode = 'TE';
    else if (langStr.includes('arabic') || langStr.includes('ar')) languageCode = 'AR';

    // 5. Sequence Number (001, 002...)
    const scriptCount = await this.prisma.script.count({ where: { projectId } });
    const seq = (scriptCount + 1).toString().padStart(3, '0');

    const formattedName = formatPattern
      .replace('{BrandCode}', brandCode)
      .replace('{Date}', dateFormatted)
      .replace('{ProductCode}', productCode)
      .replace('{LanguageCode}', languageCode)
      .replace('{Seq}', seq);

    return { formattedName, brandCode, dateFormatted, productCode, languageCode, seq, formatPattern };
  }

  async create(data: any) {
    const project = await this.prisma.shootProject.findUnique({ where: { id: data.projectId } });
    if (!project) throw new NotFoundException('Parent project not found');

    const { formattedName } = await this.generateFormattedScriptName(data.projectId, data.language);
    const finalScriptName = data.name?.trim() ? data.name.trim() : formattedName;

    const count = await this.prisma.script.count();
    const autoScriptId = `SCR-${(count + 1).toString().padStart(6, '0')}`;

    // Default status for created scripts is PENDING_MARKETING_APPROVAL unless explicitly set to DRAFT
    const initialStatus = data.status === 'DRAFT' ? 'DRAFT' : 'PENDING_MARKETING_APPROVAL';

    const script = await this.prisma.script.create({
      data: {
        scriptId: autoScriptId,
        name: finalScriptName,
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
        status: initialStatus,
        priority: data.priority || 'MEDIUM',
        remarks: data.remarks,
        createdById: data.createdById || null,
      },
    });

    await this.logTimeline(
      script.id,
      'SCRIPT_CREATED',
      `Script '${script.name}' created for project ${project.projectId} by ${data.createdByName || 'user'}`,
      data.createdById,
    );

    if (initialStatus === 'PENDING_MARKETING_APPROVAL') {
      await this.logTimeline(
        script.id,
        'SUBMITTED_FOR_APPROVAL',
        `Script submitted for Marketing Manager approval`,
        data.createdById,
      );

      // Create notification for Marketing Managers
      const marketingManagers = await this.prisma.user.findMany({
        where: { role: 'MARKETING_MANAGER' },
      });

      if (marketingManagers.length > 0) {
        await this.prisma.notification.createMany({
          data: marketingManagers.map((mm) => ({
            userId: mm.id,
            title: 'New Script Pending Approval',
            message: `New Script "${script.scriptId}: ${script.name}" created by ${data.createdByName || 'team member'} requires Marketing Manager approval.`,
            type: 'INFO',
            linkUrl: '/scripts',
            eventType: 'SCRIPT_APPROVAL_REQUEST',
            entityType: 'SCRIPT',
            entityId: script.id,
            entityCode: script.scriptId,
            scriptId: script.id,
            projectId: script.projectId || null,
          })),
        });
      }
    }

    // Automated Task Creation Trigger 3: Automatically created from scripts (collision-proof)
    let tCount = await this.prisma.task.count();
    let autoTaskId1 = `TSK-${(tCount + 1).toString().padStart(6, '0')}`;
    while (await this.prisma.task.findUnique({ where: { taskId: autoTaskId1 } })) {
      tCount++;
      autoTaskId1 = `TSK-${(tCount + 1).toString().padStart(6, '0')}`;
    }
    tCount++;
    let autoTaskId2 = `TSK-${(tCount + 1).toString().padStart(6, '0')}`;
    while (await this.prisma.task.findUnique({ where: { taskId: autoTaskId2 } })) {
      tCount++;
      autoTaskId2 = `TSK-${(tCount + 1).toString().padStart(6, '0')}`;
    }

    await this.prisma.task.createMany({
      data: [
        {
          taskId: autoTaskId1,
          title: `Script Review & Storyboarding - ${script.name}`,
          description: `Automated production task generated for Script ${script.scriptId}`,
          projectId: script.projectId,
          scriptId: script.id,
          clientId: script.clientId,
          brandId: script.brandId,
          productId: script.productId || null,
          priority: script.priority || 'MEDIUM',
          dueDate: new Date(Date.now() + 2 * 86400000),
          estimatedHours: 2.5,
          status: 'PENDING',
        },
        {
          taskId: autoTaskId2,
          title: `Video Shooting & Motion Graphics Editing - ${script.name}`,
          description: `Automated production task generated for Script ${script.scriptId}`,
          projectId: script.projectId,
          scriptId: script.id,
          clientId: script.clientId,
          brandId: script.brandId,
          productId: script.productId || null,
          priority: script.priority || 'MEDIUM',
          dueDate: new Date(Date.now() + 4 * 86400000),
          estimatedHours: 5.0,
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
          description: `Task ${t.taskId} ('${t.title}') automatically created during Script ${script.scriptId} creation`,
          userId: data.createdById || null,
        },
      });
    }

    return script;
  }

  async update(id: string, data: any) {
    const existing = await this.findOne(id);

    // Lock editing for staff/writers when script is under review or completed
    const isUnderReview = [
      'WAITING_FOR_TECHNICAL_REVIEW',
      'WAITING_FOR_MEDIA_REVIEW',
      'WAITING_FOR_MARKETING_APPROVAL',
      'PENDING_MARKETING_APPROVAL',
      'COMPLETED',
    ].includes(existing.status);

    const isUpdatingContent =
      data.description !== undefined ||
      data.name !== undefined ||
      data.language !== undefined ||
      data.category !== undefined ||
      data.objective !== undefined ||
      data.estimatedDuration !== undefined;

    if (isUnderReview && isUpdatingContent && (data.userRole === 'STAFF' || data.userRole === 'SOCIAL_MEDIA_MANAGER')) {
      throw new ForbiddenException(
        'Script is currently under review or completed. Editing script content is locked for assigned staff until review completes or is returned to production.'
      );
    }

    const prodComp = data.productionCompleted !== undefined ? data.productionCompleted : existing.productionCompleted;
    const techAppr = data.technicalReviewApproved !== undefined ? data.technicalReviewApproved : existing.technicalReviewApproved;
    const mediaAppr = data.mediaManagerReviewApproved !== undefined ? data.mediaManagerReviewApproved : existing.mediaManagerReviewApproved;
    const clientConf = data.clientConfirmationRecorded !== undefined ? data.clientConfirmationRecorded : existing.clientConfirmationRecorded;

    const allCriteriaMet = prodComp && techAppr && mediaAppr && clientConf;

    // Check completion criteria when user explicitly requests COMPLETED status
    const isCompleting = data.status === 'COMPLETED' || data.status === 'Completed';
    if (isCompleting) {
      const missing: string[] = [];
      if (!prodComp) missing.push('1. Production is complete');
      if (!techAppr) missing.push('2. Technical review is approved');
      if (!mediaAppr) missing.push('3. Media Manager review is approved');
      if (!clientConf) missing.push('4. Client confirmation has been recorded');

      if (missing.length > 0) {
        throw new BadRequestException(
          `Script cannot be completed until all 4 criteria are met. Missing prerequisites: ${missing.join(' | ')}`
        );
      }
    }

    let finalStatus = data.status || existing.status;

    if (allCriteriaMet && finalStatus !== 'COMPLETED' && finalStatus !== 'Completed') {
      finalStatus = 'COMPLETED';
    }

    const isRevisionReq =
      finalStatus &&
      (finalStatus === 'CLIENT_REVISION_REQUESTED' ||
       finalStatus === 'Client Revision Requested' ||
       finalStatus === 'REVISION_REQUESTED') &&
      existing.status !== finalStatus;

    const updated = await this.prisma.script.update({
      where: { id },
      data: {
        name: data.name,
        language: data.language,
        category: data.category,
        objective: data.objective,
        description: data.description,
        estimatedDuration: data.estimatedDuration,
        status: finalStatus,
        priority: data.priority,
        remarks: data.remarks,
        productionCompleted: prodComp,
        technicalReviewApproved: finalStatus === 'WAITING_FOR_TECHNICAL_REVIEW' ? false : techAppr,
        mediaManagerReviewApproved: mediaAppr,
        clientConfirmationRecorded: clientConf,
        revisionCount: isRevisionReq ? { increment: 1 } : undefined,
      },
    });

    // Log timeline event if status changed or script data saved
    if (finalStatus && finalStatus !== existing.status) {
      const normalizedStatus = finalStatus.toUpperCase().replace(/\s+/g, '_');
      const event = this.STATUS_TO_EVENT[finalStatus] || this.STATUS_TO_EVENT[normalizedStatus] || 'PRODUCTION_UPDATED';
      let stepLabel = `Status changed to: ${finalStatus}`;
      if (normalizedStatus.includes('TECHNICAL')) {
        stepLabel = `Technical Review Requested`;
      } else if (normalizedStatus.includes('MEDIA')) {
        stepLabel = `Media Manager Review Approved`;
      } else if (normalizedStatus.includes('COMPLETED')) {
        stepLabel = `Script Completed`;
      }
      await this.logTimeline(id, event, stepLabel, data.updatedById);
    } else {
      // Record explicit "Script Updated" timeline entry for saving script changes
      await this.logTimeline(id, 'SCRIPT_UPDATED', 'Script Updated', data.updatedById);
    }

    await this.syncLinkedTasks(id, updated);
    return updated;
  }

  private async syncLinkedTasks(scriptId: string, statusOrScript?: string | any) {
    if (!scriptId) return;

    let script: any = null;
    let statusStr = typeof statusOrScript === 'string' ? statusOrScript : '';

    if (typeof statusOrScript === 'object' && statusOrScript !== null) {
      script = statusOrScript;
      statusStr = script.status;
    } else {
      script = await this.prisma.script.findUnique({ where: { id: scriptId } });
    }

    if (!script) return;

    const linkedTasks = await this.prisma.task.findMany({ where: { scriptId } });
    if (!linkedTasks || linkedTasks.length === 0) return;

    const norm = (statusStr || script.status || '').toUpperCase().replace(/\s+/g, '_');
    let taskStatus: string | null = null;
    let progressBonus = 25;

    if (norm.includes('REVISION') || norm.includes('CHANGES') || norm.includes('REJECTED')) {
      taskStatus = 'ASSIGNED';
      progressBonus = 0;
    } else if (norm === 'COMPLETED') {
      taskStatus = 'COMPLETED';
      progressBonus = 100;
    } else if (norm === 'WAITING_FOR_TECHNICAL_REVIEW') {
      taskStatus = 'WAITING_FOR_TECHNICAL_REVIEW';
      progressBonus = 50;
    } else if (norm === 'WAITING_FOR_MEDIA_REVIEW') {
      taskStatus = 'WAITING_FOR_MEDIA_REVIEW';
      progressBonus = 75;
    } else if (norm === 'PENDING_MARKETING_APPROVAL' || norm === 'WAITING_FOR_MARKETING_APPROVAL') {
      taskStatus = 'WAITING_FOR_MARKETING_APPROVAL';
      progressBonus = 85;
    } else if (norm === 'APPROVED') {
      taskStatus = 'APPROVED';
      progressBonus = 90;
    } else if (norm === 'ASSIGNED') {
      taskStatus = 'ASSIGNED';
      progressBonus = 0;
    } else if (norm === 'IN_PRODUCTION' || norm === 'IN_PROGRESS' || norm === 'DRAFT' || norm === 'READY') {
      taskStatus = 'IN_PROGRESS';
      progressBonus = 25;
    }

    for (const t of linkedTasks) {
      const updateData: any = {};

      if (taskStatus) {
        if (norm.includes('REVISION') || norm.includes('CHANGES') || norm.includes('REJECTED') || norm === 'ASSIGNED' || taskStatus === 'ASSIGNED' || taskStatus === 'REVISION_REQUESTED') {
          updateData.status = 'ASSIGNED';
          updateData.completionPercentage = 0;
        } else if (t.status === 'ASSIGNED' && (norm === 'IN_PRODUCTION' || norm === 'IN_PROGRESS' || norm === 'DRAFT' || norm === 'READY')) {
          updateData.status = 'ASSIGNED';
          updateData.completionPercentage = 0;
        } else {
          updateData.status = taskStatus;
          if (taskStatus === 'COMPLETED') {
            updateData.completionPercentage = 100;
          } else if (taskStatus === 'ASSIGNED' || taskStatus === 'REVISION_REQUESTED') {
            updateData.completionPercentage = 0;
          } else {
            updateData.completionPercentage = (t.completionPercentage >= 100 || !t.completionPercentage) ? progressBonus : Math.max(t.completionPercentage, progressBonus);
          }
        }
      }

      if (script.name && t.title !== script.name) {
        updateData.title = script.name;
      }
      if (script.priority && t.priority !== script.priority) {
        updateData.priority = script.priority;
      }
      if (script.remarks !== undefined && script.remarks !== null && t.remarks !== script.remarks) {
        updateData.remarks = script.remarks;
      }

      if (Object.keys(updateData).length > 0) {
        await this.prisma.task.update({
          where: { id: t.id },
          data: updateData,
        }).catch(() => null);
      }
    }
  }

  async submitTechnicalReview(scriptId: string, user: { id: string; name?: string; role: string }) {
    const script = await this.findOne(scriptId);

    // Prevent duplicate submission if already waiting for technical review
    if (script.status === 'WAITING_FOR_TECHNICAL_REVIEW') {
      return script;
    }

    // Capture exact status immediately before entering Technical Review
    const previousStatus = script.status;
    let preTechStatus = 'IN_PROGRESS';

    if (isValidProductionStatus(previousStatus)) {
      preTechStatus = previousStatus;
    } else if (isValidProductionStatus(script.preTechnicalReviewStatus)) {
      preTechStatus = script.preTechnicalReviewStatus;
    }

    const nextRound = (script.technicalReviewRound || 0) + 1;
    const versionStr = `v${nextRound}`;

    const updated = await this.prisma.script.update({
      where: { id: scriptId },
      data: {
        status: 'WAITING_FOR_TECHNICAL_REVIEW',
        preTechnicalReviewStatus: preTechStatus,
        technicalReviewRound: nextRound,
        technicalReviewApproved: false,
        mediaManagerReviewApproved: false,
        marketingManagerApproved: false,
        remarks: script.remarks,
      },
    });

    // Create Approval record for review history
    await this.prisma.approval.create({
      data: {
        scriptId: script.id,
        entityType: 'SCRIPT',
        entityId: script.id,
        approvalType: 'TECHNICAL_REVIEW',
        stage: 'TECHNICAL_REVIEW',
        round: nextRound,
        version: versionStr,
        targetRole: 'TECHNICAL_MANAGER',
        requestedById: user.id,
        status: 'PENDING',
        returnedStatus: preTechStatus,
      },
    });

    await this.prisma.scriptRemark.create({
      data: {
        scriptId: scriptId,
        userId: user.id,
        message: `🔄 Technical Review Requested – Round ${nextRound} by ${user.name || user.role} (Previous Status: ${preTechStatus}).`,
      },
    }).catch(() => null);

    await this.logTimeline(
      scriptId,
      'TECHNICAL_REVIEW_REQUESTED',
      `Technical Review Requested – Round ${nextRound} (Previous Status: ${preTechStatus})`,
      user.id,
    );

    // Notify Technical Managers
    const techManagers = await this.prisma.user.findMany({
      where: { role: { in: ['TECHNICAL_MANAGER', 'ADMINISTRATOR', 'ADMIN'] } },
    });

    if (techManagers.length > 0) {
      await this.prisma.notification.createMany({
        data: techManagers.map((tm) => ({
          userId: tm.id,
          title: `Technical Review Requested – Round ${nextRound}`,
          message: `Script "${script.scriptId}: ${script.name}" was submitted for Technical Review (Round ${nextRound}).`,
          type: 'INFO',
          linkUrl: '/scripts',
          eventType: 'TECHNICAL_REVIEW_REQUESTED',
          entityType: 'SCRIPT',
          entityId: script.id,
          entityCode: script.scriptId,
          scriptId: script.id,
        })),
      }).catch(() => null);
    }

    await this.syncLinkedTasks(scriptId, updated);
    return this.findOne(scriptId);
  }

  async reviewTechnical(
    scriptId: string,
    user: { id: string; name?: string; role: string },
    body: { action: 'APPROVE' | 'REJECT'; comment?: string },
  ) {
    if (user.role !== 'TECHNICAL_MANAGER' && user.role !== 'ADMINISTRATOR' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Only Technical Manager can review and decide on technical approvals.');
    }

    const { action, comment } = body;
    const script = await this.findOne(scriptId);

    if (script.status !== 'WAITING_FOR_TECHNICAL_REVIEW') {
      throw new BadRequestException('Script is not currently waiting for Technical Review.');
    }

    const currentRound = script.technicalReviewRound || 1;

    if (action === 'APPROVE') {
      const updated = await this.prisma.script.update({
        where: { id: scriptId },
        data: {
          status: 'WAITING_FOR_MEDIA_REVIEW',
          technicalReviewApproved: true,
        },
      });

      const activeApproval = await this.prisma.approval.findFirst({
        where: { scriptId, stage: 'TECHNICAL_REVIEW', round: currentRound, status: 'PENDING' },
      });

      if (activeApproval) {
        await this.prisma.approval.update({
          where: { id: activeApproval.id },
          data: {
            status: 'APPROVED',
            reviewerId: user.id,
            remarks: comment || 'Technical Review Approved',
            reviewedAt: new Date(),
          },
        });
      } else {
        await this.prisma.approval.create({
          data: {
            scriptId: script.id,
            entityType: 'SCRIPT',
            entityId: script.id,
            approvalType: 'TECHNICAL_REVIEW',
            stage: 'TECHNICAL_REVIEW',
            round: currentRound,
            version: `v${currentRound}`,
            targetRole: 'TECHNICAL_MANAGER',
            requestedById: script.createdById,
            reviewerId: user.id,
            status: 'APPROVED',
            remarks: comment || 'Technical Review Approved',
            reviewedAt: new Date(),
          },
        });
      }

      await this.prisma.scriptRemark.create({
        data: {
          scriptId: scriptId,
          userId: user.id,
          message: `✅ Technical Review APPROVED by Technical Manager ${user.name || ''}. Automatically forwarded for Level 2: Media Manager Review.`,
        },
      }).catch(() => null);

      await this.logTimeline(
        scriptId,
        'TECHNICAL_REVIEW_APPROVED',
        `Technical Review Approved by Technical Manager ${user.name || ''}`,
        user.id,
      );

      // Notify Media Managers
      const mediaManagers = await this.prisma.user.findMany({
        where: { role: { in: ['MEDIA_MANAGER', 'ADMINISTRATOR', 'ADMIN'] } },
      });

      if (mediaManagers.length > 0) {
        await this.prisma.notification.createMany({
          data: mediaManagers.map((mm) => ({
            userId: mm.id,
            title: 'Script Pending Media Manager Review',
            message: `Script "${script.scriptId}: ${script.name}" was approved by Technical Manager and is waiting for Media Manager Review.`,
            type: 'INFO',
            linkUrl: '/scripts',
            eventType: 'MEDIA_REVIEW_REQUESTED',
            entityType: 'SCRIPT',
            entityId: script.id,
            entityCode: script.scriptId,
            scriptId: script.id,
          })),
        }).catch(() => null);
      }

      await this.syncLinkedTasks(scriptId, updated);
      return this.findOne(scriptId);
    } else {
      // REJECT by Technical Manager -> Must have non-empty rejection reason
      if (!comment || !comment.trim()) {
        throw new BadRequestException('Rejection reason is mandatory for rejecting Technical Review.');
      }

      const returnStatus = 'IN_PROGRESS';

      const updated = await this.prisma.script.update({
        where: { id: scriptId },
        data: {
          status: returnStatus,
          preTechnicalReviewStatus: 'IN_PROGRESS',
          technicalReviewApproved: false,
          mediaManagerReviewApproved: false,
          marketingManagerApproved: false,
          rejectionReason: comment.trim(),
          rejectedAt: new Date(),
          remarks: `Technical Review Rejection Reason: ${comment.trim()}`,
        },
      });

      const activeApproval = await this.prisma.approval.findFirst({
        where: { scriptId, stage: 'TECHNICAL_REVIEW', round: currentRound, status: 'PENDING' },
      });

      if (activeApproval) {
        await this.prisma.approval.update({
          where: { id: activeApproval.id },
          data: {
            status: 'REJECTED',
            reviewerId: user.id,
            remarks: comment.trim(),
            reviewedAt: new Date(),
            returnedStatus: returnStatus,
          },
        });
      } else {
        await this.prisma.approval.create({
          data: {
            scriptId: script.id,
            entityType: 'SCRIPT',
            entityId: script.id,
            approvalType: 'TECHNICAL_REVIEW',
            stage: 'TECHNICAL_REVIEW',
            round: currentRound,
            version: `v${currentRound}`,
            targetRole: 'TECHNICAL_MANAGER',
            requestedById: script.createdById,
            reviewerId: user.id,
            status: 'REJECTED',
            remarks: comment.trim(),
            returnedStatus: returnStatus,
            reviewedAt: new Date(),
          },
        });
      }

      await this.prisma.scriptRemark.create({
        data: {
          scriptId: scriptId,
          userId: user.id,
          message: `❌ Technical Review REJECTED by Technical Manager ${user.name || ''}: ${comment.trim()}. Returned to status: ${returnStatus}`,
        },
      }).catch(() => null);

      await this.logTimeline(
        scriptId,
        'TECHNICAL_REVIEW_REJECTED',
        `Technical Review REJECTED by Technical Manager ${user.name || ''}: ${comment.trim()}. Returned to ${returnStatus}`,
        user.id,
      );

      if (script.createdById) {
        await this.prisma.notification.create({
          data: {
            userId: script.createdById,
            title: 'Technical Review Rejected',
            message: `Script "${script.scriptId}: ${script.name}" Technical Review was rejected by Technical Manager: ${comment.trim()}. Returned to ${returnStatus}.`,
            type: 'WARNING',
            linkUrl: '/scripts',
            eventType: 'TECHNICAL_REVIEW_REJECTED',
            entityType: 'SCRIPT',
            entityId: script.id,
            entityCode: script.scriptId,
            scriptId: script.id,
          },
        }).catch(() => null);
      }

      await this.syncLinkedTasks(scriptId, updated);
      return this.findOne(scriptId);
    }
  }

  async reviewMedia(
    scriptId: string,
    user: { id: string; name?: string; role: string },
    body: { action: 'APPROVE' | 'REJECT'; comment?: string },
  ) {
    const { action, comment } = body;
    const script = await this.findOne(scriptId);

    if (script.status !== 'WAITING_FOR_MEDIA_REVIEW') {
      throw new BadRequestException('Script is not currently waiting for Media Manager Review.');
    }

    const currentRound = script.technicalReviewRound || 1;

    if (action === 'APPROVE') {
      const updated = await this.prisma.script.update({
        where: { id: scriptId },
        data: {
          status: 'WAITING_FOR_MARKETING_APPROVAL',
          mediaManagerReviewApproved: true,
        },
      });

      await this.prisma.approval.create({
        data: {
          scriptId: script.id,
          entityType: 'SCRIPT',
          entityId: script.id,
          approvalType: 'MEDIA_MANAGER_REVIEW',
          stage: 'MEDIA_REVIEW',
          round: currentRound,
          version: `v${currentRound}`,
          targetRole: 'MEDIA_MANAGER',
          requestedById: script.createdById,
          reviewerId: user.id,
          status: 'APPROVED',
          remarks: comment || 'Media Manager Review Approved',
          reviewedAt: new Date(),
        },
      });

      await this.prisma.scriptRemark.create({
        data: {
          scriptId: scriptId,
          userId: user.id,
          message: `✅ Media Manager Review APPROVED by Media Manager ${user.name || ''}. Automatically forwarded for Level 3: Marketing Manager Approval.`,
        },
      }).catch(() => null);

      await this.logTimeline(
        scriptId,
        'MEDIA_REVIEW_APPROVED',
        `Media Manager Review Approved by Media Manager ${user.name || ''}`,
        user.id,
      );

      // Notify Marketing Managers
      const marketingManagers = await this.prisma.user.findMany({
        where: { role: { in: ['MARKETING_MANAGER', 'ADMINISTRATOR', 'ADMIN'] } },
      });

      if (marketingManagers.length > 0) {
        await this.prisma.notification.createMany({
          data: marketingManagers.map((mm) => ({
            userId: mm.id,
            title: 'Script Pending Marketing Manager Approval',
            message: `Script "${script.scriptId}: ${script.name}" was approved by Media Manager and is waiting for Marketing Manager Approval.`,
            type: 'INFO',
            linkUrl: '/scripts',
            eventType: 'MARKETING_REVIEW_REQUESTED',
            entityType: 'SCRIPT',
            entityId: script.id,
            entityCode: script.scriptId,
            scriptId: script.id,
          })),
        }).catch(() => null);
      }

      await this.syncLinkedTasks(scriptId, updated);
      return this.findOne(scriptId);
    } else {
      if (!comment || !comment.trim()) {
        throw new BadRequestException('Rejection reason is mandatory for rejecting Media Manager Review.');
      }

      const returnStatus = isValidProductionStatus(script.preTechnicalReviewStatus)
        ? script.preTechnicalReviewStatus!
        : 'IN_PROGRESS';

      const updated = await this.prisma.script.update({
        where: { id: scriptId },
        data: {
          status: returnStatus,
          technicalReviewApproved: false,
          mediaManagerReviewApproved: false,
          marketingManagerApproved: false,
          rejectionReason: comment.trim(),
          rejectedAt: new Date(),
          remarks: `Media Manager Review Rejection Reason: ${comment.trim()}`,
        },
      });

      await this.prisma.approval.create({
        data: {
          scriptId: script.id,
          entityType: 'SCRIPT',
          entityId: script.id,
          approvalType: 'MEDIA_MANAGER_REVIEW',
          stage: 'MEDIA_REVIEW',
          round: currentRound,
          version: `v${currentRound}`,
          targetRole: 'MEDIA_MANAGER',
          requestedById: script.createdById,
          reviewerId: user.id,
          status: 'REJECTED',
          remarks: comment.trim(),
          returnedStatus: returnStatus,
          reviewedAt: new Date(),
        },
      });

      await this.prisma.scriptRemark.create({
        data: {
          scriptId: scriptId,
          userId: user.id,
          message: `❌ Media Manager Review REJECTED by Media Manager ${user.name || ''}: ${comment.trim()}. Returned to status: ${returnStatus}`,
        },
      }).catch(() => null);

      await this.logTimeline(
        scriptId,
        'MEDIA_REVIEW_REJECTED',
        `Media Manager Review REJECTED by Media Manager ${user.name || ''}: ${comment.trim()}. Returned to ${returnStatus}`,
        user.id,
      );

      if (script.createdById) {
        await this.prisma.notification.create({
          data: {
            userId: script.createdById,
            title: 'Media Manager Review Rejected',
            message: `Script "${script.scriptId}: ${script.name}" Media Review was rejected: ${comment.trim()}. Returned to ${returnStatus}.`,
            type: 'WARNING',
            linkUrl: '/scripts',
            eventType: 'MEDIA_REVIEW_REJECTED',
            entityType: 'SCRIPT',
            entityId: script.id,
            entityCode: script.scriptId,
            scriptId: script.id,
          },
        }).catch(() => null);
      }

      await this.syncLinkedTasks(scriptId, updated);
      return this.findOne(scriptId);
    }
  }

  async approveScript(
    scriptId: string,
    user: { id: string; name?: string; role: string },
    body: { action: 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT'; comment?: string; rejectionReason?: string },
  ) {
    const script = await this.findOne(scriptId);

    // Self-approval check
    if (script.createdById && script.createdById === user.id && user.role !== 'ADMINISTRATOR' && user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Business Rule Violation: Self-approval is strictly prohibited. You cannot approve a script that you created.',
      );
    }

    if (user.role !== 'MARKETING_MANAGER' && user.role !== 'ADMINISTRATOR' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Only Marketing Manager can approve or review scripts.');
    }

    const { action, comment, rejectionReason } = body;
    const currentRound = script.technicalReviewRound || 1;

    if (action === 'APPROVE') {
      const updated = await this.prisma.script.update({
        where: { id: scriptId },
        data: {
          status: 'COMPLETED',
          approvedById: user.id,
          approvedAt: new Date(),
          mediaManagerReviewApproved: true,
          technicalReviewApproved: true,
          marketingManagerApproved: true,
        },
      });

      await this.prisma.approval.create({
        data: {
          scriptId: script.id,
          entityType: 'SCRIPT',
          entityId: script.id,
          approvalType: 'MARKETING_MANAGER_REVIEW',
          stage: 'MARKETING_REVIEW',
          round: currentRound,
          version: `v${currentRound}`,
          targetRole: 'MARKETING_MANAGER',
          requestedById: script.createdById,
          reviewerId: user.id,
          status: 'APPROVED',
          remarks: comment || 'Marketing Manager Approval Approved',
          reviewedAt: new Date(),
        },
      });

      await this.prisma.scriptRemark.create({
        data: {
          scriptId: scriptId,
          userId: user.id,
          message: `✅ Marketing Manager Approval APPROVED by ${user.name || ''}. Script status marked as COMPLETED.`,
        },
      }).catch(() => null);

      await this.logTimeline(
        scriptId,
        'MARKETING_REVIEW_APPROVED',
        `Marketing Manager Approval Approved by Marketing Manager ${user.name || ''}`,
        user.id,
      );

      await this.logTimeline(
        scriptId,
        'COMPLETED',
        `Script Completed — All 3 Approval Levels (Technical, Media, Marketing) Approved`,
        user.id,
      );

      if (script.createdById) {
        await this.prisma.notification.create({
          data: {
            userId: script.createdById,
            title: 'Script Completed & Approved',
            message: `Script "${script.scriptId}: ${script.name}" received final Marketing Manager approval and is COMPLETED.`,
            type: 'SUCCESS',
            linkUrl: '/scripts',
            eventType: 'SCRIPT_COMPLETED',
            entityType: 'SCRIPT',
            entityId: script.id,
            entityCode: script.scriptId,
            scriptId: script.id,
          },
        }).catch(() => null);
      }

      await this.syncLinkedTasks(scriptId, updated);
      return this.findOne(scriptId);
    } else {
      const reason = (rejectionReason || comment || '').trim();
      if (!reason) {
        throw new BadRequestException('Rejection reason is mandatory for rejecting Marketing Manager Review.');
      }

      const returnStatus = isValidProductionStatus(script.preTechnicalReviewStatus)
        ? script.preTechnicalReviewStatus!
        : 'IN_PROGRESS';

      const updated = await this.prisma.script.update({
        where: { id: scriptId },
        data: {
          status: returnStatus,
          technicalReviewApproved: false,
          mediaManagerReviewApproved: false,
          marketingManagerApproved: false,
          rejectionReason: reason,
          rejectedAt: new Date(),
          remarks: `Marketing Manager Review Rejection Reason: ${reason}`,
        },
      });

      await this.prisma.approval.create({
        data: {
          scriptId: script.id,
          entityType: 'SCRIPT',
          entityId: script.id,
          approvalType: 'MARKETING_MANAGER_REVIEW',
          stage: 'MARKETING_REVIEW',
          round: currentRound,
          version: `v${currentRound}`,
          targetRole: 'MARKETING_MANAGER',
          requestedById: script.createdById,
          reviewerId: user.id,
          status: 'REJECTED',
          remarks: reason,
          returnedStatus: returnStatus,
          reviewedAt: new Date(),
        },
      });

      await this.prisma.scriptRemark.create({
        data: {
          scriptId: scriptId,
          userId: user.id,
          message: `❌ Marketing Manager Review REJECTED by Marketing Manager ${user.name || ''}: ${reason}. Returned to status: ${returnStatus}`,
        },
      }).catch(() => null);

      await this.logTimeline(
        scriptId,
        'MARKETING_REVIEW_REJECTED',
        `Marketing Manager Review REJECTED by ${user.name || ''}: ${reason}. Returned to ${returnStatus}`,
        user.id,
      );

      if (script.createdById) {
        await this.prisma.notification.create({
          data: {
            userId: script.createdById,
            title: 'Marketing Review Rejected',
            message: `Script "${script.scriptId}: ${script.name}" Marketing Review was rejected: ${reason}. Returned to ${returnStatus}.`,
            type: 'WARNING',
            linkUrl: '/scripts',
            eventType: 'MARKETING_REVIEW_REJECTED',
            entityType: 'SCRIPT',
            entityId: script.id,
            entityCode: script.scriptId,
            scriptId: script.id,
          },
        }).catch(() => null);
      }

      await this.syncLinkedTasks(scriptId, updated);
      return this.findOne(scriptId);
    }
  }

  async resubmitScript(scriptId: string, user: { id: string; name?: string; role: string }) {
    return this.submitTechnicalReview(scriptId, user);
  }

  // ── Attachment Links (link + name, replacing file uploads) ──

  async addAttachmentLink(
    scriptId: string,
    data: { name: string; url: string; attachmentCategory: string },
    userId?: string,
  ) {
    const script = await this.prisma.script.findUnique({ where: { id: scriptId } });
    if (!script) throw new NotFoundException('Script not found');

    const link = await this.prisma.scriptAttachmentLink.create({
      data: {
        scriptId,
        name: data.name.trim(),
        url: data.url.trim(),
        attachmentCategory: data.attachmentCategory || 'SCRIPT_DOCUMENT',
        addedById: userId || null,
      },
    });

    await this.logTimeline(
      scriptId,
      'PRODUCTION_UPDATED',
      `Attachment link added [${data.attachmentCategory}]: "${data.name}" → ${data.url}`,
      userId,
    );

    return this.findOne(scriptId);
  }

  async deleteAttachmentLink(linkId: string, userId?: string) {
    const link = await this.prisma.scriptAttachmentLink.findUnique({ where: { id: linkId } });
    if (!link) throw new NotFoundException('Attachment link not found');

    await this.prisma.scriptAttachmentLink.delete({ where: { id: linkId } });

    await this.logTimeline(
      link.scriptId,
      'PRODUCTION_UPDATED',
      `Attachment link removed [${link.attachmentCategory}]: "${link.name}"`,
      userId,
    );

    return this.findOne(link.scriptId);
  }
}
