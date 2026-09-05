import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CommunicationType } from '../../common/enums';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CommunicationsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async findByEntity(
    entityType?: string,
    entityId?: string,
    search?: string,
    isRemark?: string,
    blockerStatus?: string,
    senderId?: string,
    recipient?: string,
    projectId?: string,
    date?: string,
    type?: string,
    status?: string,
    userId?: string,
    role?: string,
  ) {
    let userName = '';
    let cleanUserName = '';
    let firstName = '';
    if (userId) {
      try {
        const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
        if (u && u.name) {
          userName = u.name;
          cleanUserName = u.name.replace(/\s*\([^)]*\)/g, '').trim();
          firstName = cleanUserName.split(' ')[0].trim();
        }
      } catch (e) {}
    }

    const where: any = {};

    // Privacy & Access Control:
    // Only give access to:
    // 1. The creator / sender of the communication (senderId === userId)
    // 2. The assigned / receiving person (assignedToId === userId)
    // 3. User explicitly addressed in recipients (recipients contains user name or user role)
    // 4. User mentioned in content (@userName or userName)
    // 5. User participation in thread replies (replies sent by / addressed to user)
    // 6. System Announcements (isAnnouncement === true or type === 'ANNOUNCEMENT')
    // 7. Global Admins (ADMIN, ADMINISTRATOR)
    const isGlobalAdmin = role === 'ADMIN' || role === 'ADMINISTRATOR';
    if (!isGlobalAdmin && userId) {
      const userConditions: any[] = [
        { senderId: userId },
        { assignedToId: userId },
        { isAnnouncement: true },
        { type: 'ANNOUNCEMENT' },
        { replies: { some: { senderId: userId } } },
        { replies: { some: { assignedToId: userId } } },
      ];
      if (userName) {
        userConditions.push(
          { recipients: { contains: userName } },
          { content: { contains: userName } },
          { replies: { some: { recipients: { contains: userName } } } }
        );
      }
      if (cleanUserName && cleanUserName !== userName) {
        userConditions.push(
          { recipients: { contains: cleanUserName } },
          { content: { contains: cleanUserName } },
          { replies: { some: { recipients: { contains: cleanUserName } } } }
        );
      }
      if (firstName) {
        userConditions.push(
          { recipients: { contains: firstName } },
          { content: { contains: `@${firstName}` } },
          { replies: { some: { recipients: { contains: firstName } } } },
          { replies: { some: { content: { contains: `@${firstName}` } } } }
        );
      }
      if (role === 'MEDIA_MANAGER') {
        userConditions.push(
          { recipients: { contains: 'Media Manager' } },
          { recipients: { contains: 'MEDIA_MANAGER' } },
          { replies: { some: { recipients: { contains: 'Media Manager' } } } },
          { replies: { some: { recipients: { contains: 'MEDIA_MANAGER' } } } }
        );
      } else if (role === 'TECHNICAL_MANAGER') {
        userConditions.push(
          { recipients: { contains: 'Technical Manager' } },
          { recipients: { contains: 'TECHNICAL_MANAGER' } },
          { replies: { some: { recipients: { contains: 'Technical Manager' } } } },
          { replies: { some: { recipients: { contains: 'TECHNICAL_MANAGER' } } } }
        );
      }
      where.OR = userConditions;
    }
    if (entityType && entityType !== 'ALL') {
      where.entityType = entityType;
    }
    if (entityId) {
      where.entityId = entityId;
    }
    if (search) {
      const searchOR = [
        { subject: { contains: search } },
        { content: { contains: search } },
        { recipients: { contains: search } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchOR }];
        delete where.OR;
      } else {
        where.OR = searchOR;
      }
    }
    if (isRemark === 'true') {
      where.isRemark = true;
    } else if (isRemark === 'false') {
      where.isRemark = false;
    }
    if (blockerStatus === 'OPEN') {
      where.isBlocker = true;
      where.blockerStatus = 'OPEN';
    } else if (blockerStatus === 'RESOLVED') {
      where.isBlocker = true;
      where.blockerStatus = 'RESOLVED';
    }
    if (senderId && senderId !== 'ALL') {
      where.senderId = senderId;
    }
    if (recipient && recipient.trim()) {
      where.recipients = { contains: recipient.trim() };
    }
    if (projectId && projectId !== 'ALL') {
      where.projectId = projectId;
    }
    if (type && type !== 'ALL') {
      where.type = type;
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (date) {
      const startDate = new Date(date + 'T00:00:00.000Z');
      const endDate = new Date(date + 'T23:59:59.999Z');
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const communications = await (this.prisma.communication as any).findMany({
      where,
      include: {
        sender: { select: { id: true, name: true, role: true, avatarUrl: true } },
        assignedTo: { select: { id: true, name: true, role: true, avatarUrl: true } },
        resolvedBy: { select: { id: true, name: true, role: true, avatarUrl: true } },
        project: { select: { id: true, projectId: true, name: true } },
        attachments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // ─── ENSURE FULL THREAD CONVERSATIONS (PARENTS + ALL REPLIES) ARE LOADED ───
    const matchedIds = new Set(communications.map((c: any) => c.id));
    const parentIdsToFetch = Array.from(
      new Set(
        communications
          .filter((c: any) => c.parentId && !matchedIds.has(c.parentId))
          .map((c: any) => c.parentId)
      )
    );

    if (parentIdsToFetch.length > 0) {
      const parentComms = await (this.prisma.communication as any).findMany({
        where: { id: { in: parentIdsToFetch } },
        include: {
          sender: { select: { id: true, name: true, role: true, avatarUrl: true } },
          assignedTo: { select: { id: true, name: true, role: true, avatarUrl: true } },
          resolvedBy: { select: { id: true, name: true, role: true, avatarUrl: true } },
          project: { select: { id: true, projectId: true, name: true } },
          attachments: true,
        },
      });
      parentComms.forEach((p: any) => {
        if (!matchedIds.has(p.id)) {
          communications.push(p);
          matchedIds.add(p.id);
        }
      });
    }

    const allParentIds = communications.map((c: any) => c.id);
    if (allParentIds.length > 0) {
      const childReplies = await (this.prisma.communication as any).findMany({
        where: { parentId: { in: allParentIds } },
        include: {
          sender: { select: { id: true, name: true, role: true, avatarUrl: true } },
          assignedTo: { select: { id: true, name: true, role: true, avatarUrl: true } },
          resolvedBy: { select: { id: true, name: true, role: true, avatarUrl: true } },
          project: { select: { id: true, projectId: true, name: true } },
          attachments: true,
        },
      });
      childReplies.forEach((r: any) => {
        if (!matchedIds.has(r.id)) {
          communications.push(r);
          matchedIds.add(r.id);
        }
      });
    }

    // Enrich with operational entity details if not already loaded via project
    const enriched = await Promise.all(
      communications.map(async (comm: any) => {
        let entityName = comm.project?.name || 'Operational Record';
        let entityRef = comm.project?.projectId || (comm.entityId ? comm.entityId.substring(0, 8) : 'RECORD');
        let realEntityId = comm.projectId || comm.entityId;
        let isEntityAvailable = true;

        try {
          if (comm.entityType === 'SCRIPT') {
            const script = await this.prisma.script.findFirst({
              where: { OR: [{ id: comm.entityId }, { scriptId: comm.entityId }] },
              select: { id: true, scriptId: true, name: true },
            });
            if (script) {
              entityName = script.name;
              entityRef = script.scriptId;
              realEntityId = script.id;
            } else {
              isEntityAvailable = false;
              entityName = 'Related Record Unavailable';
            }
          } else if (comm.entityType === 'GRAPHIC_REQ') {
            const graphic = await this.prisma.graphicRequirement.findFirst({
              where: { OR: [{ id: comm.entityId }, { requirementId: comm.entityId }] },
              select: { id: true, requirementId: true, name: true },
            });
            if (graphic) {
              entityName = graphic.name;
              entityRef = graphic.requirementId;
              realEntityId = graphic.id;
            } else {
              isEntityAvailable = false;
              entityName = 'Related Record Unavailable';
            }
          } else if (comm.entityType === 'TASK') {
            const task = await this.prisma.task.findFirst({
              where: { OR: [{ id: comm.entityId }, { taskId: comm.entityId }] },
              select: { id: true, taskId: true, title: true },
            });
            if (task) {
              entityName = task.title;
              entityRef = task.taskId;
              realEntityId = task.id;
            } else {
              isEntityAvailable = false;
              entityName = 'Related Record Unavailable';
            }
          } else if (comm.entityType === 'EQUIPMENT') {
            const eq = await this.prisma.equipment.findFirst({
              where: { OR: [{ id: comm.entityId }, { equipmentId: comm.entityId }] },
              select: { id: true, equipmentId: true, name: true },
            });
            if (eq) {
              entityName = eq.name;
              entityRef = eq.equipmentId;
              realEntityId = eq.id;
            } else {
              isEntityAvailable = false;
              entityName = 'Related Record Unavailable';
            }
          } else if (comm.entityType === 'CALENDAR_EVENT' || comm.entityType === 'CALENDAR') {
            const calEvent = await (this.prisma as any).mediaCalendarEvent.findUnique({
              where: { id: comm.entityId },
              select: { id: true, title: true },
            }).catch(() => null);
            if (calEvent) {
              entityName = calEvent.title;
              entityRef = `CAL-${calEvent.id.substring(0, 6)}`;
              realEntityId = calEvent.id;
            } else {
              isEntityAvailable = false;
              entityName = 'Related Record Unavailable';
            }
          } else if (comm.entityType === 'APPROVAL' || comm.entityType === 'REVIEW') {
            const approval = await this.prisma.approval.findUnique({
              where: { id: comm.entityId },
              select: { id: true, approvalType: true, project: { select: { name: true, projectId: true } } },
            });
            if (approval) {
              entityName = `${approval.approvalType} Review`;
              entityRef = approval.project?.projectId || approval.id.substring(0, 8);
              realEntityId = approval.id;
            } else {
              isEntityAvailable = false;
              entityName = 'Related Record Unavailable';
            }
          } else if (comm.entityType === 'PROJECT') {
            const prj = await this.prisma.shootProject.findFirst({
              where: { OR: [{ id: comm.entityId }, { projectId: comm.entityId }, { id: comm.projectId || '' }] },
              select: { id: true, projectId: true, name: true },
            });
            if (prj) {
              entityName = prj.name;
              entityRef = prj.projectId;
              realEntityId = prj.id;
            } else {
              isEntityAvailable = false;
              entityName = 'Related Record Unavailable';
            }
          }
        } catch (e) {
          isEntityAvailable = false;
          entityName = 'Related Record Unavailable';
        }

        return {
          ...comm,
          entityName,
          entityRef,
          realEntityId,
          isEntityAvailable,
        };
      })
    );

    // Build hierarchical tree: separate root messages (parentId is null) and nest replies
    const commMap = new Map();
    enriched.forEach((c) => commMap.set(c.id, { ...c, replies: [] }));

    const roots: any[] = [];
    enriched.forEach((c) => {
      if (c.parentId && commMap.has(c.parentId)) {
        commMap.get(c.parentId).replies.push(commMap.get(c.id));
      } else {
        roots.push(commMap.get(c.id));
      }
    });

    // Ensure replies are ordered chronologically ascending
    roots.forEach((root) => {
      if (root.replies && root.replies.length > 0) {
        root.replies.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }
    });

    return roots;
  }

  async getOperationalEntities() {
    const [projects, scripts, graphicReqs, tasks, equipment, approvals] = await Promise.all([
      this.prisma.shootProject.findMany({ select: { id: true, projectId: true, name: true } }),
      this.prisma.script.findMany({ select: { id: true, scriptId: true, name: true } }),
      this.prisma.graphicRequirement.findMany({ select: { id: true, requirementId: true, name: true } }),
      this.prisma.task.findMany({ select: { id: true, taskId: true, title: true } }),
      this.prisma.equipment.findMany({ select: { id: true, equipmentId: true, name: true } }),
      this.prisma.approval.findMany({ select: { id: true, approvalType: true, project: { select: { name: true } } } }),
    ]);

    return {
      PROJECT: projects.map((p) => ({ id: p.id, code: p.projectId, name: p.name })),
      SCRIPT: scripts.map((s) => ({ id: s.id, code: s.scriptId, name: s.name })),
      GRAPHIC_REQ: graphicReqs.map((g) => ({ id: g.id, code: g.requirementId, name: g.name })),
      TASK: tasks.map((t) => ({ id: t.id, code: t.taskId, name: t.title })),
      EQUIPMENT: equipment.map((e) => ({ id: e.id, code: e.equipmentId, name: e.name })),
      APPROVAL: approvals.map((a) => ({ id: a.id, code: a.id.substring(0, 8), name: `${a.approvalType} (${a.project?.name})` })),
      REVIEW: approvals.map((a) => ({ id: a.id, code: a.id.substring(0, 8), name: `${a.approvalType} Review` })),
    };
  }

  async getCommunicationTypes() {
    const builtinTypes = [
      { key: 'INFORMATION', label: 'Information' },
      { key: 'QUESTION', label: 'Question' },
      { key: 'CLARIFICATION', label: 'Clarification' },
      { key: 'REQUIREMENT', label: 'Requirement' },
      { key: 'APPROVAL_REQUEST', label: 'Approval Request' },
      { key: 'REVIEW_COMMENT', label: 'Review Comment' },
      { key: 'ISSUE_REPORT', label: 'Issue Report' },
      { key: 'BLOCKER', label: 'Blocker' },
      { key: 'ANNOUNCEMENT', label: 'Announcement' },
      { key: 'GENERAL_NOTE', label: 'General Note' },
    ];

    let customTypes: any[] = [];
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: 'CUSTOM_COMMUNICATION_TYPES' },
      });
      if (setting && setting.value) {
        customTypes = JSON.parse(setting.value);
      }
    } catch (e) {
      customTypes = [];
    }

    return [...builtinTypes, ...customTypes];
  }

  async addCustomCommunicationType(label: string, userRole: string) {
    if (userRole !== 'MEDIA_MANAGER') {
      throw new ForbiddenException('Only Media Managers can introduce new communication types.');
    }

    const cleanLabel = label.trim();
    if (!cleanLabel) {
      throw new BadRequestException('Communication type label cannot be empty.');
    }

    const key = cleanLabel.toUpperCase().replace(/[^A_Z0-9]/g, '_');

    let currentCustom: any[] = [];
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'CUSTOM_COMMUNICATION_TYPES' },
    });
    if (setting && setting.value) {
      currentCustom = JSON.parse(setting.value);
    }

    if (!currentCustom.some((c) => c.key === key)) {
      currentCustom.push({ key, label: cleanLabel, custom: true });
      await this.prisma.systemSetting.upsert({
        where: { key: 'CUSTOM_COMMUNICATION_TYPES' },
        update: { value: JSON.stringify(currentCustom) },
        create: {
          key: 'CUSTOM_COMMUNICATION_TYPES',
          value: JSON.stringify(currentCustom),
          description: 'Custom communication categories introduced by Media Manager',
        },
      });
    }

    return this.getCommunicationTypes();
  }

  async getAnnouncements(includeExpired = false) {
    const now = new Date();
    const where: any = {
      OR: [
        { type: 'ANNOUNCEMENT' },
        { isAnnouncement: true },
      ],
    };

    if (!includeExpired) {
      where.AND = [
        {
          OR: [
            { expiryDate: null },
            { expiryDate: { gte: now } },
          ],
        },
      ];
    }

    return (this.prisma.communication as any).findMany({
      where,
      include: {
        sender: { select: { id: true, name: true, role: true, avatarUrl: true } },
        attachments: true,
      },
      orderBy: [
        { priority: 'desc' },
        { publishDate: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Business Rule Enforcement:
   * "The Media Manager may publish organization-wide announcements.
   * Each announcement shall include:
   * ● Title
   * ● Description
   * ● Priority
   * ● Publish Date
   * ● Expiry Date (Optional)
   * Announcements shall appear in every employee dashboard."
   */
  async publishAnnouncement(
    dto: {
      title: string;
      description: string;
      priority?: string;
      publishDate?: string | Date;
      expiryDate?: string | Date | null;
      attachments?: { fileName: string; fileUrl: string; fileType: string; fileSize?: number }[];
    },
    user: { id: string; role: string; name: string }
  ) {
    if (user.role !== 'MEDIA_MANAGER') {
      throw new ForbiddenException(
        'Business Rule Violation: Only the Media Manager may publish organization-wide announcements.'
      );
    }

    if (!dto.title || !dto.title.trim()) {
      throw new BadRequestException('Announcement title is required.');
    }
    if (!dto.description || !dto.description.trim()) {
      throw new BadRequestException('Announcement description is required.');
    }

    const priority = dto.priority && ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'HIGH_PRIORITY', 'NORMAL_PRIORITY'].includes(dto.priority.toUpperCase())
      ? dto.priority.toUpperCase()
      : 'NORMAL_PRIORITY';

    const publishDate = dto.publishDate ? new Date(dto.publishDate) : new Date();
    const expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : null;

    if (expiryDate && expiryDate < publishDate) {
      throw new BadRequestException('Announcement expiry date cannot be earlier than the publish date.');
    }

    // 1. Create Organization-Wide Communication Announcement
    const announcement = await (this.prisma.communication as any).create({
      data: {
        entityType: 'ORGANIZATION',
        entityId: 'ORG-WIDE',
        senderId: user.id,
        isAnnouncement: true,
        type: 'ANNOUNCEMENT',
        subject: dto.title.trim(),
        content: dto.description.trim(),
        priority,
        publishDate,
        expiryDate,
        recipients: 'Entire Organization',
        status: 'SENT',
        attachments: dto.attachments && dto.attachments.length > 0
          ? {
              create: dto.attachments.map((att) => ({
                fileName: att.fileName,
                fileUrl: att.fileUrl,
                fileType: att.fileType || 'DOCUMENT',
                fileSize: att.fileSize,
              })),
            }
          : undefined,
      },
      include: {
        sender: { select: { id: true, name: true, role: true, avatarUrl: true } },
        attachments: true,
      },
    });

    // 2. Broadcast Operational Notification to Every Employee in the Entire Organization
    const notifPriority = priority === 'CRITICAL' || priority === 'HIGH_PRIORITY'
      ? 'HIGH'
      : priority === 'LOW'
      ? 'LOW'
      : 'MEDIUM';

    await this.notificationsService.notifyEntireOrganization({
      title: `📢 Announcement: ${dto.title.trim()}`,
      message: dto.description.trim().substring(0, 180),
      category: 'ANNOUNCEMENT',
      priority: notifPriority,
      eventType: 'ANNOUNCEMENT_PUBLISHED',
      entityType: 'COMMUNICATION',
      entityId: announcement.id,
      entityCode: `ANN-${announcement.id.substring(0, 6).toUpperCase()}`,
      linkUrl: `/`,
    }).catch((err) => {
      console.warn('Failed to broadcast announcement notifications:', err);
    });

    return announcement;
  }

  async create(
    data: {
      entityType: string;
      entityId: string;
      parentId?: string;
      projectId?: string;
      type?: CommunicationType | string;
      subject?: string;
      recipients?: string;
      status?: string;
      isRemark?: boolean;
      isAnnouncement?: boolean;
      priority?: string;
      targetRole?: string;
      blockerReason?: string;
      assignedToId?: string;
      content: string;
      attachments?: { fileName: string; fileUrl: string; fileType: string; fileSize?: number }[];
    },
    senderId: string,
  ) {
    const validSender = await this.prisma.user.findUnique({ where: { id: senderId }, select: { id: true } }).catch(() => null);
    if (!validSender) {
      throw new BadRequestException('Authenticated user record not found in system database.');
    }

    let resolvedProjectId = data.projectId || null;
    const isAnnouncement = data.type === 'ANNOUNCEMENT' || Boolean(data.isAnnouncement);
    const isRemark = Boolean(data.isRemark);

    // ─── BUSINESS RULE 1: Communication system is NOT a messaging app ───────
    // Personal direct messaging is disallowed. Every communication MUST belong
    // to an operational entity (Project, Task, Script, Equipment, etc.).
    if (!isAnnouncement && !data.entityType) {
      throw new BadRequestException(
        'Business Rule Violation: Every communication must belong to an operational entity (Project, Task, Script, Equipment, etc.). This system is not a direct messaging application.'
      );
    }
    if (!isAnnouncement && !data.entityId && !data.parentId) {
      throw new BadRequestException(
        'Business Rule Violation: Communication must reference an operational entity ID. Personal direct messages are not permitted.'
      );
    }

    // ─── BUSINESS RULE 3: One entity per communication ──────────────────────
    const validEntityTypes = ['PROJECT', 'TASK', 'SCRIPT', 'EQUIPMENT', 'GRAPHIC_REQ', 'APPROVAL', 'REVIEW', 'SYSTEM'];
    if (!isAnnouncement && data.entityType && !validEntityTypes.includes(data.entityType.toUpperCase())) {
      throw new BadRequestException(
        `Business Rule Violation: Entity type '${data.entityType}' is not a recognized operational module. Must be one of: ${validEntityTypes.join(', ')}.`
      );
    }

    // ─── BUSINESS RULE 8: Only Media Manager may publish announcements ───────
    if (isAnnouncement) {
      const senderUser = await this.prisma.user.findUnique({ where: { id: senderId }, select: { role: true } });
      if (!senderUser || (senderUser.role !== 'MEDIA_MANAGER' && senderUser.role !== 'ADMIN')) {
        throw new ForbiddenException(
          'Business Rule Violation: Company-wide announcements may only be published by the Media Manager.'
        );
      }
    }

    // ─── BUSINESS RULE 5: Remarks and Communications are separate entities ──
    // Remarks have no recipients. Communications require recipients.
    if (!isRemark && !isAnnouncement && !data.parentId) {
      if (!data.content?.trim()) {
        throw new BadRequestException('Business Rule Violation: Communication content cannot be empty.');
      }
    }

    if (!resolvedProjectId && !isAnnouncement) {
      if (data.entityType === 'PROJECT') {
        resolvedProjectId = data.entityId;
      } else if (data.entityType === 'SCRIPT') {
        const script = await this.prisma.script.findUnique({ where: { id: data.entityId }, select: { projectId: true } }).catch(() => null);
        if (script) resolvedProjectId = script.projectId;
      } else if (data.entityType === 'GRAPHIC_REQ') {
        const req = await this.prisma.graphicRequirement.findUnique({ where: { id: data.entityId }, select: { projectId: true } }).catch(() => null);
        if (req) resolvedProjectId = req.projectId;
      } else if (data.entityType === 'TASK') {
        const task = await this.prisma.task.findUnique({ where: { id: data.entityId }, select: { projectId: true } }).catch(() => null);
        if (task) resolvedProjectId = task.projectId;
      } else if (data.entityType === 'APPROVAL' || data.entityType === 'REVIEW') {
        const app = await this.prisma.approval.findUnique({ where: { id: data.entityId }, select: { projectId: true } }).catch(() => null);
        if (app) resolvedProjectId = app.projectId;
      }
    }

    // Safely validate that resolvedProjectId actually exists in ShootProject table to prevent FK P2003 error
    if (resolvedProjectId) {
      const validProject = await this.prisma.shootProject.findUnique({
        where: { id: resolvedProjectId },
        select: { id: true },
      }).catch(() => null);
      if (!validProject) {
        resolvedProjectId = null;
      }
    }

    // Safely validate assignedToId
    let validAssignedToId = data.assignedToId || null;
    if (validAssignedToId) {
      const validUser = await this.prisma.user.findUnique({
        where: { id: validAssignedToId },
        select: { id: true },
      }).catch(() => null);
      if (!validUser) {
        validAssignedToId = null;
      }
    }

    // Safely validate parentId
    let validParentId = isRemark ? null : (data.parentId || null);
    if (validParentId) {
      const validParent = await (this.prisma.communication as any).findUnique({
        where: { id: validParentId },
        select: { id: true },
      }).catch(() => null);
      if (!validParent) {
        validParentId = null;
      }
    }

    // isRemark already validated above; reassign from data for create payload
    const isBlocker = data.type === 'BLOCKER' || data.type === 'ISSUE_REPORT' || Boolean(data.blockerReason);
    const blockerReason = isBlocker ? (data.blockerReason || 'OTHER') : null;
    const priority = data.priority ? data.priority.toUpperCase() : 'NORMAL_PRIORITY';

    // ─── BUSINESS RULE 6: Blockers remain OPEN until explicitly resolved ─────
    // blockerStatus is always initialized as OPEN; it cannot be set to RESOLVED
    // through the create endpoint — only via resolveBlocker().

    const attachmentsData =
      data.attachments && data.attachments.length > 0
        ? {
            create: data.attachments.map((att) => ({
              fileName: att.fileName,
              fileUrl: att.fileUrl,
              fileType: att.fileType,
              fileSize: att.fileSize || null,
            })),
          }
        : undefined;

    const createdComm = await (this.prisma.communication as any).create({
      data: {
        entityType: isAnnouncement ? 'SYSTEM' : (data.entityType || 'PROJECT'),
        entityId: isAnnouncement ? 'COMPANY' : (data.entityId || 'SYS'),
        parentId: validParentId,
        projectId: resolvedProjectId,
        isRemark,
        isBlocker,
        isAnnouncement,
        priority: isAnnouncement ? priority : 'NORMAL_PRIORITY',
        blockerReason,
        blockerStatus: isBlocker ? 'OPEN' : null, // BUSINESS RULE 6: always OPEN on creation
        assignedToId: validAssignedToId,
        subject: data.subject || (isRemark ? 'Operational Remark' : isAnnouncement ? (priority === 'HIGH_PRIORITY' ? '🚨 Company Announcement (High Priority)' : 'Company Announcement') : isBlocker ? `[BLOCKER] ${blockerReason?.replace(/_/g, ' ')}` : 'Operational Communication'),
        recipients: isRemark ? 'N/A (Operational Remark)' : isAnnouncement ? 'All Company Employees' : (data.recipients || 'All Assigned Team Members'),
        type: isAnnouncement ? 'ANNOUNCEMENT' : (data.type || ('GENERAL_NOTE' as any)),
        content: data.content,
        status: isRemark ? 'CLOSED' : (data.status || 'SENT'),
        senderId,
        attachments: attachmentsData,
      },
      include: {
        sender: { select: { id: true, name: true, role: true, avatarUrl: true } },
        assignedTo: { select: { id: true, name: true, role: true, avatarUrl: true } },
        resolvedBy: { select: { id: true, name: true, role: true, avatarUrl: true } },
        attachments: true,
      },
    });

    const senderName = createdComm.sender?.name || 'A staff member';

    // TRIGGER 1: Announcement Published (Role Broadcast to All Employees)
    try {
      if (isAnnouncement) {
        const users = await this.prisma.user.findMany({ select: { id: true } });
        if (users.length > 0) {
          const isHigh = priority === 'HIGH_PRIORITY';
          for (const u of users) {
            await this.prisma.notification.create({
              data: {
                userId: u.id,
                title: isHigh
                  ? `🚨 HIGH PRIORITY ANNOUNCEMENT: ${createdComm.subject}`
                  : `📢 Company Announcement: ${createdComm.subject}`,
                message: isHigh
                  ? `URGENT: ${data.content.substring(0, 150)}`
                  : `New company-wide announcement published by ${senderName}`,
                type: isHigh ? 'WARNING' : 'INFO',
                linkUrl: '/dashboard',
                eventType: 'COMMUNICATION_ANNOUNCEMENT_PUBLISHED',
                entityType: 'COMMUNICATION',
                entityId: createdComm.id,
                communicationId: createdComm.id,
                projectId: resolvedProjectId || null,
              },
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to trigger announcement notifications:', err);
    }

    // TRIGGER 2: Employee Mentioned (@Name Tag)
    try {
      const mentionMatches = data.content.match(/@([A-Za-z0-9_.-]+)/g);
      if (mentionMatches && mentionMatches.length > 0) {
        const rawHandles = Array.from(new Set(mentionMatches.map((m) => m.substring(1))));
        const users = await this.prisma.user.findMany({
          select: { id: true, name: true, role: true },
        });

        for (const handle of rawHandles) {
          const matchedUser = users.find(
            (u) =>
              u.id !== senderId &&
              (u.name.toLowerCase().includes(handle.toLowerCase()) ||
                handle.toLowerCase().includes(u.name.toLowerCase().split(' ')[0]))
          );

          if (matchedUser) {
            await this.prisma.notification.create({
              data: {
                userId: matchedUser.id,
                title: `Mentioned in ${data.entityType?.replace('_', ' ') || 'Operational'} Note`,
                message: `${senderName} mentioned you: "${data.content.substring(0, 100)}${
                  data.content.length > 100 ? '...' : ''
                }"`,
                type: 'MENTION',
                linkUrl: resolvedProjectId ? `/projects/${resolvedProjectId}` : '/communication',
                eventType: 'COMMUNICATION_MESSAGE_RECEIVED',
                entityType: 'COMMUNICATION',
                entityId: createdComm.id,
                communicationId: createdComm.id,
                projectId: resolvedProjectId || null,
              },
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to trigger mention notifications:', err);
    }

    // TRIGGER 3: Approval Requested (Role-Based Routing to Target Managers)
    try {
      const isApprovalType = data.type === 'APPROVAL_REQUEST' || Boolean(data.targetRole);
      if (isApprovalType) {
        const targetRole = data.targetRole || 'TECHNICAL_MANAGER';
        const approvalType = targetRole === 'MEDIA_MANAGER' ? 'MEDIA_MANAGER_REVIEW' : 'TECHNICAL_REVIEW';

        const approvalRecord = await this.prisma.approval.create({
          data: {
            projectId: resolvedProjectId || null,
            entityType: data.entityType,
            entityId: data.entityId,
            targetRole,
            approvalType,
            requestedById: senderId,
            status: 'PENDING',
            remarks: `${data.subject || 'Approval Request'}: ${data.content}`,
          },
        });

        const managers = await this.prisma.user.findMany({
          where: { role: targetRole },
          select: { id: true },
        });

        for (const mgr of managers) {
          await this.prisma.notification.create({
            data: {
              userId: mgr.id,
              title: `Pending ${targetRole === 'MEDIA_MANAGER' ? 'Media Manager' : 'Technical Manager'} Approval Request`,
              message: `${senderName} submitted an approval request: "${data.subject || data.content.substring(0, 80)}"`,
              type: 'APPROVAL_REQUEST',
              linkUrl: resolvedProjectId ? `/projects/${resolvedProjectId}` : '/communication',
              eventType: 'APPROVAL_REQUESTED',
              entityType: 'APPROVAL',
              entityId: approvalRecord.id,
              approvalId: approvalRecord.id,
              projectId: resolvedProjectId || null,
            },
          });
        }
      }
    } catch (err) {
      console.error('Failed to create pending approval item:', err);
    }

    // TRIGGER 4: Comment Received (Reply to Parent Communication Author)
    try {
      if (data.parentId) {
        const parentComm = await (this.prisma.communication as any).findUnique({
          where: { id: data.parentId },
          select: { senderId: true, subject: true },
        });

        if (parentComm && parentComm.senderId && parentComm.senderId !== senderId) {
          await this.prisma.notification.create({
            data: {
              userId: parentComm.senderId,
              title: `New Comment on "${parentComm.subject || 'Operational Note'}"`,
              message: `${senderName} commented: "${data.content.substring(0, 100)}${
                data.content.length > 100 ? '...' : ''
              }"`,
              type: 'INFO',
              linkUrl: resolvedProjectId ? `/projects/${resolvedProjectId}` : '/communication',
              eventType: 'COMMUNICATION_MESSAGE_RECEIVED',
              entityType: 'COMMUNICATION',
              entityId: createdComm.id,
              communicationId: createdComm.id,
              projectId: resolvedProjectId || null,
            },
          });
        }
      }
    } catch (err) {
      console.error('Failed to trigger comment notifications:', err);
    }

    // TRIGGER 5: Blocker Assigned (Assigned User & Manager Role Alerts)
    try {
      if (isBlocker) {
        if (data.assignedToId && data.assignedToId !== senderId) {
          await this.prisma.notification.create({
            data: {
              userId: data.assignedToId,
              title: `⚠️ Operational Blocker Assigned`,
              message: `${senderName} assigned an operational blocker to you (${blockerReason?.replace(/_/g, ' ')}): "${createdComm.subject}"`,
              type: 'WARNING',
              linkUrl: resolvedProjectId ? `/projects/${resolvedProjectId}` : '/communication',
              eventType: 'COMMUNICATION_BLOCKER_RAISED',
              entityType: 'COMMUNICATION',
              entityId: createdComm.id,
              communicationId: createdComm.id,
              projectId: resolvedProjectId || null,
            },
          });
        }

        // Also notify Technical and Media Managers of unresolved blocker
        const managers = await this.prisma.user.findMany({
          where: {
            role: { in: ['TECHNICAL_MANAGER', 'MEDIA_MANAGER'] },
            id: { not: senderId },
          },
          select: { id: true },
        });

        for (const mgr of managers) {
          if (mgr.id !== data.assignedToId) {
            await this.prisma.notification.create({
              data: {
                userId: mgr.id,
                title: `🚨 Operational Blocker Reported`,
                message: `${senderName} reported a blocker (${blockerReason?.replace(/_/g, ' ')}): "${createdComm.subject}"`,
                type: 'WARNING',
                linkUrl: resolvedProjectId ? `/projects/${resolvedProjectId}` : '/communication',
                eventType: 'COMMUNICATION_BLOCKER_RAISED',
                entityType: 'COMMUNICATION',
                entityId: createdComm.id,
                communicationId: createdComm.id,
                projectId: resolvedProjectId || null,
              },
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to trigger blocker notifications:', err);
    }

    // ── Log Permanent Activity History Record ──
    try {
      await this.prisma.activityLog.create({
        data: {
          userId: senderId,
          action: isAnnouncement
            ? 'ANNOUNCEMENT_PUBLISHED'
            : isRemark
            ? 'COMMUNICATION_REMARK_ADDED'
            : 'COMMUNICATION_ADDED',
          entity: data.entityType || 'COMMUNICATION',
          entityId: createdComm.id,
          description: `Communication '${createdComm.subject || 'Operational Note'}' added for ${data.entityType || 'SYSTEM'} record.`,
          metadata: JSON.stringify({
            subject: createdComm.subject,
            entityType: data.entityType,
            entityId: data.entityId,
            type: data.type,
            isRemark,
            isAnnouncement,
          }),
        },
      });
    } catch (err) {
      console.warn('Failed to log permanent activity for communication:', err);
    }

    return createdComm;
  }

  async updateStatus(id: string, status: string) {
    const validStatuses = ['SENT', 'DELIVERED', 'READ', 'CLOSED'];
    const cleanStatus = status?.toUpperCase();
    if (!validStatuses.includes(cleanStatus)) {
      throw new BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const comm = await (this.prisma.communication as any).findUnique({ where: { id } });
    if (!comm) throw new BadRequestException('Communication record not found');

    // ─── BUSINESS RULE 6: Blockers remain open until resolved ────────────────
    // Open blockers cannot be manually closed via status update.
    // Use the resolveBlocker() endpoint to close a blocker with resolution notes.
    if (cleanStatus === 'CLOSED' && comm.isBlocker && comm.blockerStatus === 'OPEN') {
      throw new ForbiddenException(
        'Business Rule Violation (Rule 6): An open operational blocker cannot be manually closed. Please use the Resolve Blocker action and provide resolution details.'
      );
    }

    const updateData: any = { status: cleanStatus };
    const now = new Date();

    if (cleanStatus === 'DELIVERED' && !comm.deliveredAt) {
      updateData.deliveredAt = now;
    } else if (cleanStatus === 'READ') {
      if (!comm.deliveredAt) updateData.deliveredAt = now;
      if (!comm.readAt) updateData.readAt = now;
    } else if (cleanStatus === 'CLOSED') {
      if (!comm.deliveredAt) updateData.deliveredAt = now;
      if (!comm.readAt) updateData.readAt = now;
      if (!comm.closedAt) updateData.closedAt = now;
    }

    return (this.prisma.communication as any).update({
      where: { id },
      data: updateData,
      include: {
        sender: { select: { id: true, name: true, role: true, avatarUrl: true } },
        assignedTo: { select: { id: true, name: true, role: true, avatarUrl: true } },
        resolvedBy: { select: { id: true, name: true, role: true, avatarUrl: true } },
        attachments: true,
      },
    });
  }

  async markAsRead(id: string, userId: string) {
    const now = new Date();
    const comm = await (this.prisma.communication as any).findUnique({ where: { id } });
    if (!comm) return { success: false };

    const targetIds = [comm.id];
    if (comm.parentId) {
      targetIds.push(comm.parentId);
    }
    const children = await (this.prisma.communication as any).findMany({
      where: { OR: [{ parentId: comm.id }, { id: comm.parentId || comm.id }] },
      select: { id: true },
    }).catch(() => []);
    children.forEach((c: any) => targetIds.push(c.id));

    // Update unread communications where current user is NOT the sender
    await (this.prisma.communication as any).updateMany({
      where: {
        id: { in: targetIds },
        senderId: { not: userId },
        readAt: null,
      },
      data: {
        status: 'READ',
        readAt: now,
        deliveredAt: now,
      },
    }).catch(() => null);

    // Update linked unread notifications for this user
    await this.prisma.notification.updateMany({
      where: {
        userId,
        OR: [
          { communicationId: { in: targetIds } },
          { entityId: { in: targetIds } },
        ],
        status: 'UNREAD',
      },
      data: {
        status: 'READ',
        readAt: now,
      },
    }).catch(() => null);

    return { success: true };
  }

  async resolveBlocker(id: string, resolutionNotes: string, resolverId: string) {
    const comm = await (this.prisma.communication as any).findUnique({
      where: { id },
      include: { sender: true },
    });
    if (!comm) throw new BadRequestException('Communication record not found');

    const updated = await (this.prisma.communication as any).update({
      where: { id },
      data: {
        blockerStatus: 'RESOLVED',
        status: 'CLOSED',
        resolvedAt: new Date(),
        closedAt: new Date(),
        resolvedById: resolverId,
        resolutionNotes: resolutionNotes || 'Operational Blocker marked as resolved.',
      },
      include: {
        sender: { select: { id: true, name: true, role: true, avatarUrl: true } },
        assignedTo: { select: { id: true, name: true, role: true, avatarUrl: true } },
        resolvedBy: { select: { id: true, name: true, role: true, avatarUrl: true } },
        attachments: true,
      },
    });

    if (comm.senderId && comm.senderId !== resolverId) {
      await this.prisma.notification.create({
        data: {
          userId: comm.senderId,
          title: 'Blocker Resolved',
          message: `Your reported blocker "${comm.subject}" has been resolved: "${resolutionNotes || 'Resolved'}"`,
          type: 'INFO',
          linkUrl: comm.projectId ? `/projects/${comm.projectId}` : '/communication',
          eventType: 'COMMUNICATION_BLOCKER_RESOLVED',
          entityType: 'COMMUNICATION',
          entityId: comm.id,
          communicationId: comm.id,
          projectId: comm.projectId || null,
        },
      });
    }

    return updated;
  }

  async getTimeline(id: string) {
    const comm = await (this.prisma.communication as any).findUnique({
      where: { id },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        replies: {
          include: { sender: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!comm) throw new BadRequestException('Communication record not found');

    const timeline: any[] = [];

    // 1. Created
    timeline.push({
      action: 'Communication Created',
      user: comm.sender?.name || 'Staff Member',
      role: comm.sender?.role || 'STAFF',
      timestamp: comm.createdAt,
    });

    // 2. Delivered
    if (comm.deliveredAt) {
      timeline.push({
        action: 'Delivered to Recipient',
        user: comm.recipients || 'Recipient',
        timestamp: comm.deliveredAt,
      });
    }

    // 3. Read
    if (comm.readAt) {
      timeline.push({
        action: 'Read by Recipient',
        user: comm.recipients || 'Recipient',
        timestamp: comm.readAt,
      });
    }

    // 4. Replied
    if (comm.replies && comm.replies.length > 0) {
      comm.replies.forEach((r: any) => {
        timeline.push({
          action: 'Replied to Thread',
          user: r.sender?.name || 'Team Member',
          role: r.sender?.role || 'STAFF',
          timestamp: r.createdAt,
        });
      });
    }

    // 5. Closed / Blocker Resolved
    if (comm.closedAt || comm.resolvedAt) {
      timeline.push({
        action: comm.isBlocker ? 'Blocker Resolved' : 'Communication Closed',
        user: comm.resolvedById ? 'Manager' : 'System',
        timestamp: comm.closedAt || comm.resolvedAt,
      });
    }

    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return timeline;
  }
}



