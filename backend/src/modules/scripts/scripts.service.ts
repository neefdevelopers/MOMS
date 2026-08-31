import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { canUserViewScript } from '../../common/utils/event-auth';

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

    // Role-based query filtering for STAFF: only assigned scripts, tasks, or projects
    if (p.role === 'STAFF' && p.userId) {
      where.OR = [
        { scriptAssignments: { some: { userId: p.userId } } },
        { tasks: { some: { assignedEmployees: { some: { userId: p.userId } } } } },
        { project: { assignedTeam: { some: { userId: p.userId } } } },
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

    return this.prisma.script.findMany({
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
      },
      orderBy: { createdAt: 'desc' },
    });
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
    WAITING_FOR_TECHNICAL_REVIEW: 'TECHNICAL_REVIEW',
    WAITING_FOR_MEDIA_REVIEW: 'MEDIA_REVIEW',
    WAITING_FOR_CLIENT_CONFIRMATION: 'CLIENT_CONFIRMATION',
    CLIENT_REVISION_REQUESTED: 'REVISION_REQUESTED',
    COMPLETED: 'COMPLETED',
    CLOSED: 'CLOSED',
    CANCELLED: 'CLOSED',
  };

  private readonly EVENT_LABELS: Record<string, string> = {
    SCRIPT_CREATED: 'Script Created',
    ASSIGNED: 'Assigned',
    PRODUCTION_STARTED: 'Production Started',
    PRODUCTION_UPDATED: 'Production Updated',
    TECHNICAL_REVIEW: 'Technical Review',
    MEDIA_REVIEW: 'Media Review',
    CLIENT_CONFIRMATION: 'Client Confirmation',
    REVISION_REQUESTED: 'Revision Requested',
    COMPLETED: 'Completed',
    CLOSED: 'Closed',
  };

  async logTimeline(scriptId: string, event: string, description?: string, triggeredById?: string) {
    return this.prisma.scriptTimeline.create({
      data: { scriptId, event, description: description || this.EVENT_LABELS[event] || event, triggeredById: triggeredById || null },
      include: { triggeredBy: { select: { id: true, name: true, role: true } } },
    });
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

    // Auto-set status to COMPLETED if all 4 criteria are fulfilled
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

    const newRevisionCount = isRevisionReq ? existing.revisionCount + 1 : existing.revisionCount;

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
        technicalReviewApproved: techAppr,
        mediaManagerReviewApproved: mediaAppr,
        clientConfirmationRecorded: clientConf,
        revisionCount: isRevisionReq ? { increment: 1 } : undefined,
      },
    });

    // Log timeline event if status changed
    if (finalStatus && finalStatus !== existing.status) {
      const normalizedStatus = finalStatus.toUpperCase().replace(/\s+/g, '_');
      const event = this.STATUS_TO_EVENT[finalStatus] || this.STATUS_TO_EVENT[normalizedStatus] || 'PRODUCTION_UPDATED';
      
      let stepLabel = `Status changed to: ${finalStatus}`;
      if (isRevisionReq) {
        stepLabel = `Revision #${newRevisionCount} Requested (Step 1/7: Revision Requested)`;
      } else if (normalizedStatus.includes('IN_PRODUCTION') || normalizedStatus.includes('ASSIGNED')) {
        stepLabel = `Assigned Employee Updates Work (Step 2/7: Production Update)`;
      } else if (normalizedStatus.includes('TECHNICAL')) {
        stepLabel = `Technical Review Approved (Step 4/7: Technical Review)`;
      } else if (normalizedStatus.includes('MEDIA')) {
        stepLabel = `Media Manager Review Approved (Step 5/7: Media Manager Review)`;
      } else if (normalizedStatus.includes('CLIENT_CONFIRMATION')) {
        stepLabel = `Client Confirmation Recorded (Step 6/7: Client Confirmation)`;
      } else if (normalizedStatus.includes('COMPLETED')) {
        stepLabel = `Script Completed — All 4 Completion Criteria Approved (Step 7/7: Script Completed)`;
      }

      await this.logTimeline(id, event, stepLabel, data.updatedById);
    } else if (data.description || data.remarks) {
      await this.logTimeline(id, 'PRODUCTION_UPDATED', 'Script production details updated', data.updatedById);
    }

    return updated;
  }

  async approveScript(
    scriptId: string,
    user: { id: string; name?: string; role: string },
    body: { action: 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT'; comment?: string; rejectionReason?: string },
  ) {
    const script = await this.findOne(scriptId);

    // Self-approval check (Section 11)
    if (script.createdById && script.createdById === user.id && user.role !== 'ADMINISTRATOR' && user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Business Rule Violation: Self-approval is strictly prohibited. You cannot approve a script that you created.',
      );
    }

    // Ensure user is Marketing Manager or Admin
    if (user.role !== 'MARKETING_MANAGER' && user.role !== 'ADMINISTRATOR' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Only Marketing Manager can approve or review scripts.');
    }

    const { action, comment, rejectionReason } = body;

    if (action === 'APPROVE') {
      await this.prisma.script.update({
        where: { id: scriptId },
        data: {
          status: 'APPROVED',
          approvedById: user.id,
          approvedAt: new Date(),
          mediaManagerReviewApproved: true,
        },
      });
      await this.logTimeline(
        scriptId,
        'SCRIPT_APPROVED',
        `Script approved by Marketing Manager ${user.name || ''}`,
        user.id,
      );

      if (script.createdById) {
        await this.prisma.notification.create({
          data: {
            userId: script.createdById,
            title: 'Script Approved',
            message: `Your Script "${script.scriptId}: ${script.name}" has been APPROVED by Marketing Manager.`,
            type: 'SUCCESS',
            linkUrl: '/scripts',
            eventType: 'SCRIPT_APPROVED',
            entityType: 'SCRIPT',
            entityId: script.id,
            entityCode: script.scriptId,
            scriptId: script.id,
          },
        });
      }
    } else if (action === 'REQUEST_CHANGES') {
      await this.prisma.script.update({
        where: { id: scriptId },
        data: {
          status: 'CHANGES_REQUESTED',
          remarks: comment || 'Marketing Manager requested revisions',
        },
      });
      await this.logTimeline(
        scriptId,
        'REVISION_REQUESTED',
        `Marketing Manager requested changes: ${comment || 'Revisions required'}`,
        user.id,
      );

      if (script.createdById) {
        await this.prisma.notification.create({
          data: {
            userId: script.createdById,
            title: 'Script Revisions Requested',
            message: `Marketing Manager requested changes on Script "${script.scriptId}: ${script.name}": ${comment || 'Revisions required'}`,
            type: 'WARNING',
            linkUrl: '/scripts',
            eventType: 'SCRIPT_REVISION_REQUESTED',
            entityType: 'SCRIPT',
            entityId: script.id,
            entityCode: script.scriptId,
            scriptId: script.id,
          },
        });
      }
    } else if (action === 'REJECT') {
      const reason = rejectionReason || comment || 'Script rejected by Marketing Manager';
      await this.prisma.script.update({
        where: { id: scriptId },
        data: {
          status: 'REJECTED',
          rejectedAt: new Date(),
          rejectionReason: reason,
          remarks: reason,
        },
      });
      await this.logTimeline(
        scriptId,
        'SCRIPT_REJECTED',
        `Script rejected by Marketing Manager: ${reason}`,
        user.id,
      );

      if (script.createdById) {
        await this.prisma.notification.create({
          data: {
            userId: script.createdById,
            title: 'Script Rejected',
            message: `Your Script "${script.scriptId}: ${script.name}" was REJECTED: ${reason}`,
            type: 'ERROR',
            linkUrl: '/scripts',
            eventType: 'SCRIPT_REJECTED',
            entityType: 'SCRIPT',
            entityId: script.id,
            entityCode: script.scriptId,
            scriptId: script.id,
          },
        });
      }
    }

    return this.findOne(scriptId);
  }

  async resubmitScript(scriptId: string, user: { id: string; name?: string }) {
    const script = await this.findOne(scriptId);
    await this.prisma.script.update({
      where: { id: scriptId },
      data: {
        status: 'PENDING_MARKETING_APPROVAL',
      },
    });

    await this.logTimeline(
      scriptId,
      'SCRIPT_SUBMITTED',
      `Script resubmitted for Marketing Manager approval by ${user.name || ''}`,
      user.id,
    );

    const marketingManagers = await this.prisma.user.findMany({
      where: { role: 'MARKETING_MANAGER' },
    });

    if (marketingManagers.length > 0) {
      await this.prisma.notification.createMany({
        data: marketingManagers.map((mm) => ({
          userId: mm.id,
          title: 'Resubmitted Script Pending Approval',
          message: `Script "${script.scriptId}: ${script.name}" was resubmitted for Marketing Manager approval.`,
          type: 'INFO',
          linkUrl: '/scripts',
          eventType: 'SCRIPT_RESUBMITTED',
          entityType: 'SCRIPT',
          entityId: script.id,
          entityCode: script.scriptId,
          scriptId: script.id,
        })),
      });
    }

    return this.findOne(scriptId);
  }
}
