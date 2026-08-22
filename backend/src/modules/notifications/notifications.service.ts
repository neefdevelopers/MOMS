import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type OperationalEntityType =
  | 'PROJECT'
  | 'TASK'
  | 'SCRIPT'
  | 'GRAPHIC_REQUIREMENT'
  | 'EQUIPMENT'
  | 'ATTENDANCE'
  | 'CALENDAR_EVENT'
  | 'APPROVAL'
  | 'COMMUNICATION'
  | 'SYSTEM';

export type OperationalEventType =
  // Project Events
  | 'PROJECT_CREATED'
  | 'PROJECT_STATUS_CHANGED'
  | 'PROJECT_TEAM_ASSIGNED'
  | 'PROJECT_ARCHIVED'
  // Task Events
  | 'TASK_ASSIGNED'
  | 'TASK_REASSIGNED'
  | 'TASK_STATUS_CHANGED'
  | 'TASK_DEADLINE_APPROACHING'
  | 'TASK_OVERDUE'
  // Script Events
  | 'SCRIPT_ASSIGNED'
  | 'SCRIPT_SUBMITTED'
  | 'SCRIPT_APPROVED'
  | 'SCRIPT_REJECTED'
  // Graphic Requirement Events
  | 'GRAPHIC_REQ_CREATED'
  | 'GRAPHIC_REQ_SUBMITTED'
  | 'GRAPHIC_REQ_APPROVED'
  | 'GRAPHIC_REQ_REVISED'
  // Equipment Events
  | 'EQUIPMENT_REQUESTED'
  | 'EQUIPMENT_APPROVED'
  | 'EQUIPMENT_RESERVED'
  | 'EQUIPMENT_CHECKED_OUT'
  | 'EQUIPMENT_RETURNED'
  | 'EQUIPMENT_RETURN_REMINDER'
  | 'EQUIPMENT_OVERDUE'
  | 'EQUIPMENT_MAINTENANCE_FLAGGED'
  // Attendance Events
  | 'ATTENDANCE_MARKED'
  | 'ATTENDANCE_LATE_FLAGGED'
  | 'ATTENDANCE_ABSENT_LOGGED'
  | 'ATTENDANCE_CUTOFF_REMINDER'
  // Calendar Events
  | 'CALENDAR_SHOOT_SCHEDULED'
  | 'CALENDAR_EVENT_UPDATED'
  | 'CALENDAR_EVENT_CANCELLED'
  // Approval Events
  | 'APPROVAL_REQUESTED'
  | 'APPROVAL_ACCEPTED'
  | 'APPROVAL_REJECTED'
  // Communication Events
  | 'COMMUNICATION_MESSAGE_RECEIVED'
  | 'COMMUNICATION_BLOCKER_RAISED'
  | 'COMMUNICATION_BLOCKER_RESOLVED'
  | 'COMMUNICATION_ANNOUNCEMENT_PUBLISHED';

/**
 * 14 Standard Notification Categories
 */
export type NotificationCategory =
  | 'INFORMATION'
  | 'TASK_ASSIGNMENT'
  | 'REMINDER'
  | 'APPROVAL_REQUEST'
  | 'APPROVAL_COMPLETED'
  | 'REVISION_REQUEST'
  | 'DEADLINE_REMINDER'
  | 'EQUIPMENT_REQUEST'
  | 'EQUIPMENT_APPROVAL'
  | 'EQUIPMENT_RETURN_REMINDER'
  | 'ATTENDANCE_REMINDER'
  | 'ANNOUNCEMENT'
  | 'WARNING'
  | 'SYSTEM_NOTIFICATION';

/**
 * 4 Priority Levels
 */
export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export function deriveNotificationPriority(
  priority?: string,
  category?: string,
  eventType?: string,
  type?: string
): NotificationPriority {
  if (priority && ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(priority.toUpperCase())) {
    return priority.toUpperCase() as NotificationPriority;
  }
  const event = (eventType || '').toUpperCase();
  const cat = (category || '').toUpperCase();

  if (event.includes('OVERDUE') || event.includes('BLOCKER') || type === 'ALERT' || type === 'ERROR') {
    return 'CRITICAL';
  }
  if (
    cat === 'DEADLINE_REMINDER' ||
    cat === 'REVISION_REQUEST' ||
    cat === 'WARNING' ||
    event.includes('DEADLINE') ||
    event.includes('REVIEW_REQUIRED') ||
    type === 'WARNING'
  ) {
    return 'HIGH';
  }
  if (
    cat === 'TASK_ASSIGNMENT' ||
    cat === 'APPROVAL_REQUEST' ||
    cat === 'APPROVAL_COMPLETED' ||
    cat === 'EQUIPMENT_REQUEST' ||
    cat === 'EQUIPMENT_APPROVAL' ||
    cat === 'ANNOUNCEMENT' ||
    cat === 'REMINDER'
  ) {
    return 'MEDIUM';
  }
  return 'LOW';
}

export function deriveNotificationCategory(
  category?: string,
  eventType?: string,
  entityType?: string,
  type?: string
): NotificationCategory {
  if (category) return category as NotificationCategory;
  const event = (eventType || '').toUpperCase();
  const entity = (entityType || '').toUpperCase();

  if (event.includes('ANNOUNCEMENT')) return 'ANNOUNCEMENT';
  if (event.includes('TASK_ASSIGNED') || event.includes('TASK_REASSIGNED') || event.includes('SCRIPT_ASSIGNED') || event.includes('PROJECT_TEAM_ASSIGNED')) return 'TASK_ASSIGNMENT';
  if (event.includes('APPROVAL_REQUEST')) return 'APPROVAL_REQUEST';
  if (event.includes('APPROVAL_ACCEPTED') || event.includes('APPROVAL_REJECTED') || event.includes('APPROVED')) return 'APPROVAL_COMPLETED';
  if (event.includes('REVISION')) return 'REVISION_REQUEST';
  if (event.includes('DEADLINE') || event.includes('OVERDUE')) return 'DEADLINE_REMINDER';
  if (event.includes('EQUIPMENT_REQUEST')) return 'EQUIPMENT_REQUEST';
  if (event.includes('EQUIPMENT_APPROVAL') || event.includes('EQUIPMENT_APPROVED')) return 'EQUIPMENT_APPROVAL';
  if (event.includes('EQUIPMENT_RETURN') || (entity === 'EQUIPMENT' && event.includes('OVERDUE'))) return 'EQUIPMENT_RETURN_REMINDER';
  if (entity === 'ATTENDANCE' || event.includes('ATTENDANCE')) return 'ATTENDANCE_REMINDER';
  if (event.includes('REMINDER')) return 'REMINDER';
  if (event.includes('BLOCKER') || event.includes('MAINTENANCE') || type === 'WARNING' || type === 'ALERT' || type === 'ERROR') return 'WARNING';
  if (entity === 'SYSTEM' || event.includes('SETTING') || event.includes('MAINTENANCE_MODE')) return 'SYSTEM_NOTIFICATION';
  return 'INFORMATION';
}

export interface CreateOperationalNotificationDto {
  userId: string;
  title: string;
  message: string;
  type?: 'INFO' | 'WARNING' | 'SUCCESS' | 'ALERT' | 'ERROR';
  category?: NotificationCategory;
  priority?: NotificationPriority;
  linkUrl?: string;

  // Mandatory Operational Event & Originating Entity (Business Rules)
  eventType: OperationalEventType | string;
  entityType: OperationalEntityType;
  entityId: string;
  entityCode?: string;
  metadata?: Record<string, any>;

  // Foreign keys
  projectId?: string;
  taskId?: string;
  scriptId?: string;
  graphicRequirementId?: string;
  equipmentId?: string;
  attendanceId?: string;
  calendarEventId?: string;
  approvalId?: string;
  communicationId?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Business Rule Enforcement:
   * 1. Every notification must belong to one operational event (eventType).
   * 2. Notifications shall never exist independently without referencing their originating entity (entityType & entityId).
   * 3. Categorized into one of the 14 standard notification categories.
   * 4. Each notification has one priority level (LOW, MEDIUM, HIGH, CRITICAL).
   */
  async notifyOperationalEvent(dto: CreateOperationalNotificationDto) {
    if (!dto.eventType || !dto.eventType.trim()) {
      throw new BadRequestException('Notification must belong to a valid operational event (eventType is required).');
    }
    if (!dto.entityType || !dto.entityId || !dto.entityId.trim()) {
      throw new BadRequestException('Notifications shall never exist independently. An originating entity (entityType & entityId) is strictly required.');
    }

    const category = deriveNotificationCategory(dto.category, dto.eventType, dto.entityType, dto.type);
    const priority = deriveNotificationPriority(dto.priority, category, dto.eventType, dto.type);

    // Auto-derive foreign keys based on entityType if not explicitly passed
    const projectId = dto.projectId || (dto.entityType === 'PROJECT' ? dto.entityId : undefined);
    const taskId = dto.taskId || (dto.entityType === 'TASK' ? dto.entityId : undefined);
    const scriptId = dto.scriptId || (dto.entityType === 'SCRIPT' ? dto.entityId : undefined);
    const graphicRequirementId = dto.graphicRequirementId || (dto.entityType === 'GRAPHIC_REQUIREMENT' ? dto.entityId : undefined);
    const equipmentId = dto.equipmentId || (dto.entityType === 'EQUIPMENT' ? dto.entityId : undefined);
    const attendanceId = dto.attendanceId || (dto.entityType === 'ATTENDANCE' ? dto.entityId : undefined);
    const calendarEventId = dto.calendarEventId || (dto.entityType === 'CALENDAR_EVENT' ? dto.entityId : undefined);
    const approvalId = dto.approvalId || (dto.entityType === 'APPROVAL' ? dto.entityId : undefined);
    const communicationId = dto.communicationId || (dto.entityType === 'COMMUNICATION' ? dto.entityId : undefined);

    // Auto-derive linkUrl directly navigating to the operational record
    let linkUrl = dto.linkUrl;
    if (!linkUrl) {
      switch (dto.entityType) {
        case 'PROJECT':
          linkUrl = `/projects?projectId=${encodeURIComponent(dto.entityId)}`;
          break;
        case 'TASK':
          linkUrl = `/tasks?taskId=${encodeURIComponent(dto.entityId)}`;
          break;
        case 'SCRIPT':
          linkUrl = `/scripts?scriptId=${encodeURIComponent(dto.entityId)}`;
          break;
        case 'GRAPHIC_REQUIREMENT':
          linkUrl = `/graphic-reqs?id=${encodeURIComponent(dto.entityId)}`;
          break;
        case 'EQUIPMENT':
          linkUrl = `/equipment?equipmentId=${encodeURIComponent(dto.entityId)}`;
          break;
        case 'ATTENDANCE':
          linkUrl = `/attendance`;
          break;
        case 'CALENDAR_EVENT':
          linkUrl = `/calendar?eventId=${encodeURIComponent(dto.entityId)}`;
          break;
        case 'APPROVAL':
          linkUrl = `/approvals?approvalId=${encodeURIComponent(dto.entityId)}`;
          break;
        case 'COMMUNICATION':
          linkUrl = `/communication?id=${encodeURIComponent(dto.entityId)}`;
          break;
      }
    }

    const notif = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        title: dto.title,
        message: dto.message,
        type: dto.type || 'INFO',
        category,
        priority,
        linkUrl,
        eventType: dto.eventType,
        entityType: dto.entityType,
        entityId: dto.entityId,
        entityCode: dto.entityCode || null,
        metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
        projectId,
        taskId,
        scriptId,
        graphicRequirementId,
        equipmentId,
        attendanceId,
        calendarEventId,
        approvalId,
        communicationId,
      },
    });

    // ── Permanent Activity History Link (Business Rule Enforcement) ──
    await this.prisma.activityLog.create({
      data: {
        userId: dto.userId,
        action: `NOTIFICATION_${dto.eventType || 'DISPATCHED'}`,
        entity: dto.entityType || 'SYSTEM',
        entityId: dto.entityId || notif.id,
        description: `[Permanent Activity Record] Notification '${dto.title}' dispatched to recipient ${dto.userId} (Related: ${dto.entityType} ${dto.entityCode || dto.entityId}).`,
        metadata: JSON.stringify({
          notificationId: notif.id,
          title: notif.title,
          category: notif.category,
          priority: notif.priority,
          creationTime: notif.createdAt,
          deliveryTime: notif.deliveredAt,
          readTime: notif.readAt,
          recipientId: dto.userId,
          relatedEntity: {
            type: dto.entityType,
            id: dto.entityId,
            code: dto.entityCode || null,
          },
        }),
      },
    }).catch((err) => console.warn('ActivityLog permanent write fallback:', err));

    return notif;
  }

  /**
   * Delivery Scope 1: Individual Employee
   */
  async notifyIndividual(userId: string, dto: Omit<CreateOperationalNotificationDto, 'userId'>) {
    return this.notifyOperationalEvent({ ...dto, userId });
  }

  /**
   * Delivery Scope 2: Multiple Employees
   */
  async notifyMultipleEmployees(userIds: string[], dto: Omit<CreateOperationalNotificationDto, 'userId'>) {
    const uniqueIds = Array.from(new Set(userIds)).filter(Boolean);
    return Promise.all(
      uniqueIds.map((userId) =>
        this.notifyOperationalEvent({
          ...dto,
          userId,
        })
      )
    );
  }

  /**
   * Delivery Scope 3: Technical Manager(s)
   */
  async notifyTechnicalManagers(dto: Omit<CreateOperationalNotificationDto, 'userId'>) {
    const techManagers = await this.prisma.user.findMany({
      where: { role: 'TECHNICAL_MANAGER', isArchived: false, status: 'ACTIVE' },
      select: { id: true },
    });
    return this.notifyMultipleEmployees(
      techManagers.map((m) => m.id),
      dto
    );
  }

  /**
   * Delivery Scope 4: Media Manager(s)
   */
  async notifyMediaManagers(dto: Omit<CreateOperationalNotificationDto, 'userId'>) {
    const mediaManagers = await this.prisma.user.findMany({
      where: { role: 'MEDIA_MANAGER', isArchived: false, status: 'ACTIVE' },
      select: { id: true },
    });
    return this.notifyMultipleEmployees(
      mediaManagers.map((m) => m.id),
      dto
    );
  }

  /**
   * Delivery Scope 5: Entire Organization
   */
  async notifyEntireOrganization(dto: Omit<CreateOperationalNotificationDto, 'userId'>) {
    const allUsers = await this.prisma.user.findMany({
      where: { isArchived: false, status: 'ACTIVE' },
      select: { id: true },
    });
    return this.notifyMultipleEmployees(
      allUsers.map((u) => u.id),
      dto
    );
  }

  /**
   * Universal Dispatcher supporting all 5 delivery scopes
   */
  async dispatchByScope(
    scope: 'INDIVIDUAL' | 'MULTIPLE_EMPLOYEES' | 'TECHNICAL_MANAGER' | 'MEDIA_MANAGER' | 'ENTIRE_ORGANIZATION',
    targetUserIds: string[] | undefined,
    dto: Omit<CreateOperationalNotificationDto, 'userId'>
  ) {
    switch (scope) {
      case 'INDIVIDUAL':
        if (!targetUserIds || targetUserIds.length === 0) {
          throw new BadRequestException('Recipient userId is required for INDIVIDUAL notification scope.');
        }
        return [await this.notifyIndividual(targetUserIds[0], dto)];
      case 'MULTIPLE_EMPLOYEES':
        if (!targetUserIds || targetUserIds.length === 0) {
          throw new BadRequestException('Recipient userIds list is required for MULTIPLE_EMPLOYEES notification scope.');
        }
        return this.notifyMultipleEmployees(targetUserIds, dto);
      case 'TECHNICAL_MANAGER':
        return this.notifyTechnicalManagers(dto);
      case 'MEDIA_MANAGER':
        return this.notifyMediaManagers(dto);
      case 'ENTIRE_ORGANIZATION':
        return this.notifyEntireOrganization(dto);
      default:
        throw new BadRequestException(`Unsupported notification delivery scope: ${scope}`);
    }
  }

  async notifyTeamMembers(userIds: string[], dto: Omit<CreateOperationalNotificationDto, 'userId'>) {
    return this.notifyMultipleEmployees(userIds, dto);
  }

  async findForUser(
    userId: string,
    options?: {
      status?: string;
      category?: string;
      type?: string;
      priority?: string;
      entityType?: string;
      entityId?: string;
      date?: string;
      dateFrom?: string;
      dateTo?: string;
      unreadOnly?: boolean;
      take?: number;
    }
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

    const where: any = { userId };

    // Strict Role-Based Notification Filtering: Non-Media Managers cannot view administrative workload rebalancing alerts
    if (user?.role === 'TECHNICAL_MANAGER' || user?.role === 'STAFF') {
      where.eventType = { notIn: ['ALERT_EMPLOYEE_OVER_CAPACITY', 'STAFF_CAPACITY'] };
      where.entityType = { notIn: ['ATTENDANCE'] };
    }

    // 1. Status Filter (Unread / Read / Archived / All)
    if (options?.status && options.status !== 'ALL') {
      where.status = options.status;
    } else if (options?.unreadOnly) {
      where.status = 'UNREAD';
    } else if (!options?.status || options.status !== 'ALL') {
      // By default, show active notifications (UNREAD and READ)
      where.status = { in: ['UNREAD', 'READ'] };
    }

    // 2. Notification Type / Category Filter
    if (options?.category && options.category !== 'ALL') {
      where.category = options.category;
    }
    if (options?.type && options.type !== 'ALL') {
      where.type = options.type;
    }

    // 3. Priority Filter
    if (options?.priority && options.priority !== 'ALL') {
      where.priority = options.priority;
    }

    // 4. Related Module (EntityType) Filter
    if (options?.entityType && options.entityType !== 'ALL') {
      where.entityType = options.entityType;
    }
    if (options?.entityId) {
      where.entityId = options.entityId;
    }

    // 5. Date Filter
    if (options?.date) {
      const targetDate = new Date(options.date);
      if (!isNaN(targetDate.getTime())) {
        const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
        const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);
        where.createdAt = { gte: startOfDay, lte: endOfDay };
      }
    } else if (options?.dateFrom || options?.dateTo) {
      where.createdAt = {};
      if (options.dateFrom) {
        const dFrom = new Date(options.dateFrom);
        if (!isNaN(dFrom.getTime())) where.createdAt.gte = dFrom;
      }
      if (options.dateTo) {
        const dTo = new Date(options.dateTo);
        if (!isNaN(dTo.getTime())) {
          dTo.setHours(23, 59, 59, 999);
          where.createdAt.lte = dTo;
        }
      }
    }

    const list = await this.prisma.notification.findMany({
      where,
      include: {
        readBy: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: options?.take || 100,
    });

    const PRIORITY_ORDER: Record<string, number> = {
      CRITICAL: 1,
      HIGH: 2,
      MEDIUM: 3,
      LOW: 4,
    };

    // Sort by priority weight (CRITICAL first, then HIGH, MEDIUM, LOW), unread first, then by timestamp desc
    return list.sort((a, b) => {
      // Unread first
      if (a.status !== b.status) {
        if (a.status === 'UNREAD') return -1;
        if (b.status === 'UNREAD') return 1;
      }
      const weightA = PRIORITY_ORDER[a.priority?.toUpperCase() || 'MEDIUM'] || 3;
      const weightB = PRIORITY_ORDER[b.priority?.toUpperCase() || 'MEDIUM'] || 3;
      if (weightA !== weightB) {
        return weightA - weightB;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  async findByEntity(entityType: string, entityId: string) {
    return this.prisma.notification.findMany({
      where: { entityType, entityId },
      include: {
        user: { select: { id: true, name: true, role: true } },
        readBy: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Status Transition: UNREAD -> READ with Audit Timestamp and Reader ID
   */
  async markAsRead(id: string, userId: string) {
    const now = new Date();
    const result = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: {
        status: 'READ',
        isRead: true,
        readAt: now,
        readById: userId,
      },
    });

    const notif = await this.prisma.notification.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true } } },
    });

    if (notif) {
      await this.prisma.activityLog.create({
        data: {
          userId,
          action: 'NOTIFICATION_READ',
          entity: notif.entityType || 'SYSTEM',
          entityId: notif.entityId || notif.id,
          description: `[Permanent Activity Record] Notification '${notif.title}' read by ${notif.user?.name || userId} at ${now.toISOString()}.`,
          metadata: JSON.stringify({
            notificationId: notif.id,
            title: notif.title,
            creationTime: notif.createdAt,
            deliveryTime: notif.deliveredAt,
            readTime: now,
            readById: userId,
            recipientId: notif.userId,
            relatedEntity: {
              type: notif.entityType,
              id: notif.entityId,
              code: notif.entityCode,
            },
          }),
        },
      }).catch((err) => console.warn('ActivityLog permanent read logging fallback:', err));
    }

    return result;
  }

  /**
   * Bulk Status Transition: Mark All Unread -> READ with Audit Timestamp and Reader ID
   */
  async markAllAsRead(userId: string) {
    const now = new Date();
    return this.prisma.notification.updateMany({
      where: { userId, status: 'UNREAD' },
      data: {
        status: 'READ',
        isRead: true,
        readAt: now,
        readById: userId,
      },
    });
  }

  /**
   * Status Transition: READ/UNREAD -> ARCHIVED
   */
  async archiveNotification(id: string, userId: string) {
    const now = new Date();
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: {
        status: 'ARCHIVED',
        archivedAt: now,
      },
    });
  }

  /**
   * ── Automated Archiving Engine ──
   * Business Rule Enforcement:
   * "Notifications shall remain available for historical reference.
   * Old notifications may be archived automatically based on system configuration.
   * Archived notifications shall remain searchable."
   * 
   * Configurable Settings:
   * - AUTO_ARCHIVE_NOTIFICATIONS_ENABLED (default: true)
   * - AUTO_ARCHIVE_AFTER_DAYS (default: 30 days)
   * - AUTO_ARCHIVE_ONLY_READ (default: true)
   */
  async autoArchiveOldNotifications() {
    const isEnabled = await this.getSettingBoolean('AUTO_ARCHIVE_NOTIFICATIONS_ENABLED', true);
    if (!isEnabled) {
      return {
        status: 'SKIPPED',
        message: 'Automated notification archiving is disabled in system configuration.',
        archivedCount: 0,
      };
    }

    const archiveDays = await this.getSettingNumber('AUTO_ARCHIVE_AFTER_DAYS', 30);
    const onlyRead = await this.getSettingBoolean('AUTO_ARCHIVE_ONLY_READ', true);

    const now = new Date();
    const cutoffDate = new Date(now.getTime() - archiveDays * 24 * 60 * 60 * 1000);

    const where: any = {
      createdAt: { lte: cutoffDate },
      status: onlyRead ? 'READ' : { in: ['UNREAD', 'READ'] },
    };

    const eligibleCount = await this.prisma.notification.count({ where });
    if (eligibleCount === 0) {
      return {
        status: 'SUCCESS',
        message: `No notifications older than ${archiveDays} days found eligible for archiving.`,
        archivedCount: 0,
        archiveDays,
        cutoffDate: cutoffDate.toISOString(),
      };
    }

    const updateResult = await this.prisma.notification.updateMany({
      where,
      data: {
        status: 'ARCHIVED',
        archivedAt: now,
      },
    });

    // Permanent Audit Record for Automated Archival
    await this.prisma.activityLog.create({
      data: {
        userId: 'SYSTEM',
        action: 'NOTIFICATIONS_AUTO_ARCHIVED',
        entity: 'SYSTEM',
        entityId: 'AUTO_ARCHIVE_JOB',
        description: `Automated Archiving Engine archived ${updateResult.count} notifications older than ${archiveDays} days (cutoff: ${cutoffDate.toLocaleDateString()}). Records remain permanently searchable.`,
        metadata: JSON.stringify({
          archivedCount: updateResult.count,
          archiveDays,
          cutoffDate,
          archivedAt: now,
          retentionPolicy: 'PERMANENT_SEARCHABLE_ARCHIVE',
        }),
      },
    }).catch((err) => console.warn('Activity log write fallback:', err));

    return {
      status: 'SUCCESS',
      message: `Successfully archived ${updateResult.count} notifications older than ${archiveDays} days. All archived notifications remain permanently searchable.`,
      archivedCount: updateResult.count,
      archiveDays,
      cutoffDate: cutoffDate.toISOString(),
    };
  }

  /**
   * Bulk Status Transition: Archive All Read
   */
  async archiveAll(userId: string) {
    const now = new Date();
    return this.prisma.notification.updateMany({
      where: { userId, status: 'READ' },
      data: {
        status: 'ARCHIVED',
        archivedAt: now,
      },
    });
  }

  /**
   * ── Permanent Activity & Notification History ──
   * Business Rule Enforcement:
   * Every notification shall become part of the permanent activity history.
   * The Activity Center shall support searching by:
   * ● Notification Title
   * ● Notification Type
   * ● Related Project
   * ● Employee
   * ● Date
   * Activity history shall never be deleted.
   */
  async getNotificationActivityHistory(options?: {
    search?: string;
    title?: string;
    type?: string;
    category?: string;
    priority?: string;
    status?: string;
    projectId?: string;
    employeeId?: string;
    employeeName?: string;
    recipientId?: string;
    date?: string;
    dateFrom?: string;
    dateTo?: string;
    entityType?: string;
    entityId?: string;
    take?: number;
    skip?: number;
  }) {
    const where: any = {};

    // 1. Search by Notification Title
    if (options?.title && options.title.trim()) {
      where.title = { contains: options.title.trim() };
    } else if (options?.search && options.search.trim()) {
      const q = options.search.trim();
      where.OR = [
        { title: { contains: q } },
        { message: { contains: q } },
        { entityCode: { contains: q } },
      ];
    }

    // 2. Search by Notification Type / Category
    if (options?.type && options.type !== 'ALL') {
      where.OR = where.OR || [];
      where.type = options.type;
    }
    if (options?.category && options.category !== 'ALL') {
      where.category = options.category;
    }

    // 3. Search by Related Project
    if (options?.projectId && options.projectId !== 'ALL') {
      where.OR = [
        { projectId: options.projectId },
        { entityType: 'PROJECT', entityId: options.projectId },
      ];
    }

    // 4. Search by Employee (Recipient or Reader)
    const empId = options?.employeeId || options?.recipientId;
    if (empId && empId !== 'ALL') {
      where.OR = [
        { userId: empId },
        { readById: empId },
      ];
    } else if (options?.employeeName && options.employeeName.trim()) {
      where.user = {
        name: { contains: options.employeeName.trim() },
      };
    }

    // 5. Search by Date
    if (options?.date) {
      const targetDate = new Date(options.date);
      if (!isNaN(targetDate.getTime())) {
        const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
        const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);
        where.createdAt = { gte: startOfDay, lte: endOfDay };
      }
    } else if (options?.dateFrom || options?.dateTo) {
      where.createdAt = {};
      if (options.dateFrom) {
        const dFrom = new Date(options.dateFrom);
        if (!isNaN(dFrom.getTime())) where.createdAt.gte = dFrom;
      }
      if (options.dateTo) {
        const dTo = new Date(options.dateTo);
        if (!isNaN(dTo.getTime())) {
          dTo.setHours(23, 59, 59, 999);
          where.createdAt.lte = dTo;
        }
      }
    }

    // Additional query filters
    if (options?.priority && options.priority !== 'ALL') where.priority = options.priority;
    if (options?.status && options.status !== 'ALL') where.status = options.status;
    if (options?.entityType && options.entityType !== 'ALL') where.entityType = options.entityType;
    if (options?.entityId) where.entityId = options.entityId;

    const [total, records] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, role: true, email: true } },
          readBy: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: options?.take || 50,
        skip: options?.skip || 0,
      }),
    ]);

    const formattedHistory = records.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      category: n.category,
      priority: n.priority,
      status: n.status,
      eventType: n.eventType,
      linkUrl: n.linkUrl,

      // ── Mandatory Audit Log Attributes ──
      creationTime: n.createdAt,
      deliveryTime: n.deliveredAt,
      readTime: n.readAt,
      readBy: n.readBy ? { id: n.readBy.id, name: n.readBy.name, role: n.readBy.role } : null,
      relatedEntity: {
        type: n.entityType,
        id: n.entityId,
        code: n.entityCode || `ID-${n.entityId.substring(0, 6)}`,
      },
      projectId: n.projectId,
      recipient: {
        id: n.user?.id || n.userId,
        name: n.user?.name || 'Unknown User',
        role: n.user?.role || 'STAFF',
        email: n.user?.email || null,
      },
    }));

    return {
      total,
      history: formattedHistory,
      auditPolicy: 'PERMANENT_RETENTION_IMMUTABLE',
      retentionStatus: 'NEVER_DELETED',
    };
  }

  /**
   * Business Rule Enforcement:
   * Notifications shall never be permanently deleted by users.
   */
  async deleteNotification(): Promise<never> {
    throw new ForbiddenException(
      'Business Rule Violation: Notifications and activity history are permanent operational audit records and shall never be permanently deleted by users. Use the Archive function instead.'
    );
  }

  /**
   * Dashboard Notification Summaries:
   * Provides real-time categorized breakdown for dashboard widgets:
   * 1. New Tasks
   * 2. Pending Reviews
   * 3. Overdue Work
   * 4. Upcoming Deadlines
   * 5. Equipment Alerts
   * 6. Unread Communications
   * 7. New Announcements
   */
  async getDashboardNotificationSummaries(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const whereClause: any = { userId, status: { in: ['UNREAD', 'READ'] } };
    if (user?.role === 'TECHNICAL_MANAGER' || user?.role === 'STAFF') {
      whereClause.eventType = { notIn: ['ALERT_EMPLOYEE_OVER_CAPACITY', 'STAFF_CAPACITY'] };
      whereClause.entityType = { notIn: ['ATTENDANCE'] };
    }

    const unreadNotifications = await this.prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const newTasks = unreadNotifications.filter((n) => n.category === 'TASK_ASSIGNMENT' && n.status === 'UNREAD');
    const pendingReviews = unreadNotifications.filter((n) => n.category === 'APPROVAL_REQUEST' && n.status === 'UNREAD');
    const overdueWork = unreadNotifications.filter(
      (n) => (n.eventType?.includes('OVERDUE') || (n.category === 'DEADLINE_REMINDER' && n.priority === 'CRITICAL')) && n.status === 'UNREAD'
    );
    const upcomingDeadlines = unreadNotifications.filter(
      (n) => n.category === 'DEADLINE_REMINDER' && !n.eventType?.includes('OVERDUE') && n.status === 'UNREAD'
    );
    const equipmentAlerts = unreadNotifications.filter(
      (n) => (n.category === 'EQUIPMENT_REQUEST' || n.category === 'EQUIPMENT_APPROVAL' || n.category === 'EQUIPMENT_RETURN_REMINDER') && n.status === 'UNREAD'
    );
    const unreadCommunications = unreadNotifications.filter(
      (n) => n.entityType === 'COMMUNICATION' && n.category !== 'ANNOUNCEMENT' && n.status === 'UNREAD'
    );
    const newAnnouncements = unreadNotifications.filter((n) => n.category === 'ANNOUNCEMENT' && n.status === 'UNREAD');

    return {
      newTasks: { count: newTasks.length, items: newTasks.slice(0, 5) },
      pendingReviews: { count: pendingReviews.length, items: pendingReviews.slice(0, 5) },
      overdueWork: { count: overdueWork.length, items: overdueWork.slice(0, 5) },
      upcomingDeadlines: { count: upcomingDeadlines.length, items: upcomingDeadlines.slice(0, 5) },
      equipmentAlerts: { count: equipmentAlerts.length, items: equipmentAlerts.slice(0, 5) },
      unreadCommunications: { count: unreadCommunications.length, items: unreadCommunications.slice(0, 5) },
      newAnnouncements: { count: newAnnouncements.length, items: newAnnouncements.slice(0, 5) },
      totalUnread: unreadNotifications.filter((n) => n.status === 'UNREAD').length,
    };
  }

  /**
   * Helper: Read configurable system setting with default fallback
   */
  private async getSettingNumber(key: string, defaultValue: number): Promise<number> {
    try {
      const s = await this.prisma.systemSetting.findUnique({ where: { key } });
      if (s && s.value) {
        const val = parseFloat(s.value);
        if (!isNaN(val)) return val;
      }
    } catch {
      // fallback
    }
    return defaultValue;
  }

  private async getSettingBoolean(key: string, defaultValue: boolean): Promise<boolean> {
    try {
      const s = await this.prisma.systemSetting.findUnique({ where: { key } });
      if (s && s.value !== undefined) {
        return s.value === 'true' || s.value === '1';
      }
    } catch {
      // fallback
    }
    return defaultValue;
  }

  /**
   * ── Automated Reminder Engine ──
   * Generates reminder notifications for:
   * 1. Upcoming Deadlines
   * 2. Overdue Tasks
   * 3. Pending Reviews
   * 4. Pending Client Confirmation
   * 5. Equipment Return Due
   * 6. Pending Equipment Approval
   * 
   * Configurable Frequency: checks if a reminder was already sent within REMINDER_FREQUENCY_HOURS
   */
  async checkAndDispatchReminders() {
    const isEngineEnabled = await this.getSettingBoolean('REMINDER_NOTIFICATIONS_ENABLED', true);
    if (!isEngineEnabled) {
      return { status: 'DISABLED', dispatchedCount: 0, message: 'Automated Reminders Engine is disabled in system settings.' };
    }

    const frequencyHours = await this.getSettingNumber('REMINDER_FREQUENCY_HOURS', 4);
    const deadlineAdvanceHours = await this.getSettingNumber('DEADLINE_ALERT_HOURS', 24);
    const overdueEnabled = await this.getSettingBoolean('OVERDUE_TASK_REMINDER_ENABLED', true);
    const pendingReviewHours = await this.getSettingNumber('PENDING_REVIEW_REMINDER_HOURS', 12);
    const pendingClientHours = await this.getSettingNumber('PENDING_CLIENT_CONFIRMATION_HOURS', 24);
    const equipReturnHours = await this.getSettingNumber('EQUIPMENT_RETURN_REMINDER_HOURS', 6);
    const pendingEquipApprovalHours = await this.getSettingNumber('PENDING_EQUIPMENT_APPROVAL_HOURS', 8);

    const now = new Date();
    const frequencyCutoff = new Date(now.getTime() - frequencyHours * 3600 * 1000);
    let dispatchedCount = 0;

    // Helper to avoid duplicate reminders within frequency window
    const hasRecentReminder = async (entityType: string, entityId: string, eventType: string, userId?: string) => {
      const where: any = {
        entityType,
        entityId,
        eventType,
        createdAt: { gte: frequencyCutoff },
      };
      if (userId) where.userId = userId;
      const count = await this.prisma.notification.count({ where });
      return count > 0;
    };

    // ── 1. Upcoming Deadlines ──
    const deadlineHorizon = new Date(now.getTime() + deadlineAdvanceHours * 3600 * 1000);
    const upcomingTasks = await this.prisma.task.findMany({
      where: {
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
        dueDate: { gt: now, lte: deadlineHorizon },
      },
      include: {
        assignedEmployees: { select: { userId: true } },
        project: { select: { id: true, projectId: true, name: true } },
      },
    });

    for (const task of upcomingTasks) {
      const userIds = task.assignedEmployees.map((a) => a.userId);
      for (const uid of userIds) {
        if (!(await hasRecentReminder('TASK', task.id, 'TASK_DEADLINE_APPROACHING', uid))) {
          await this.notifyIndividual(uid, {
            title: `⏰ Upcoming Deadline: ${task.taskId}`,
            message: `Task '${task.title}' is due in less than ${deadlineAdvanceHours}h (${new Date(task.dueDate).toLocaleDateString()}).`,
            type: 'WARNING',
            category: 'DEADLINE_REMINDER',
            eventType: 'TASK_DEADLINE_APPROACHING',
            entityType: 'TASK',
            entityId: task.id,
            entityCode: task.taskId,
            taskId: task.id,
            projectId: task.projectId,
          });
          dispatchedCount++;
        }
      }
    }

    // ── 2. Overdue Tasks ──
    if (overdueEnabled) {
      const overdueTasks = await this.prisma.task.findMany({
        where: {
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
          dueDate: { lt: now },
        },
        include: {
          assignedEmployees: { select: { userId: true } },
          project: { select: { id: true, projectId: true, name: true } },
        },
      });

      for (const task of overdueTasks) {
        const userIds = task.assignedEmployees.map((a) => a.userId);
        for (const uid of userIds) {
          if (!(await hasRecentReminder('TASK', task.id, 'TASK_OVERDUE', uid))) {
            await this.notifyIndividual(uid, {
              title: `🚨 Overdue Task Alert: ${task.taskId}`,
              message: `Task '${task.title}' was due on ${new Date(task.dueDate).toLocaleDateString()} and is now overdue. Please complete or update status.`,
              type: 'ALERT',
              category: 'DEADLINE_REMINDER',
              eventType: 'TASK_OVERDUE',
              entityType: 'TASK',
              entityId: task.id,
              entityCode: task.taskId,
              taskId: task.id,
              projectId: task.projectId,
            });
            dispatchedCount++;
          }
        }
      }
    }

    // ── 3. Pending Reviews ──
    // 3a. Technical Review
    const pendingTechScripts = await this.prisma.script.findMany({
      where: { status: 'WAITING_FOR_TECHNICAL_REVIEW' },
      include: { project: { select: { id: true, projectId: true } } },
    });
    for (const sc of pendingTechScripts) {
      if (!(await hasRecentReminder('SCRIPT', sc.id, 'TECHNICAL_REVIEW_REQUIRED'))) {
        await this.notifyTechnicalManagers({
          title: `Pending Technical Review: ${sc.scriptId}`,
          message: `Script '${sc.name}' is waiting for technical review and sign-off.`,
          type: 'INFO',
          category: 'APPROVAL_REQUEST',
          eventType: 'TECHNICAL_REVIEW_REQUIRED',
          entityType: 'SCRIPT',
          entityId: sc.id,
          entityCode: sc.scriptId,
          scriptId: sc.id,
          projectId: sc.projectId || undefined,
        });
        dispatchedCount++;
      }
    }

    // 3b. Media Manager Review
    const pendingMediaScripts = await this.prisma.script.findMany({
      where: { status: 'WAITING_FOR_MEDIA_REVIEW' },
      include: { project: { select: { id: true, projectId: true } } },
    });
    for (const sc of pendingMediaScripts) {
      if (!(await hasRecentReminder('SCRIPT', sc.id, 'MEDIA_REVIEW_REQUIRED'))) {
        await this.notifyMediaManagers({
          title: `Pending Media Manager Review: ${sc.scriptId}`,
          message: `Script '${sc.name}' is awaiting Media Manager final review.`,
          type: 'INFO',
          category: 'APPROVAL_REQUEST',
          eventType: 'MEDIA_REVIEW_REQUIRED',
          entityType: 'SCRIPT',
          entityId: sc.id,
          entityCode: sc.scriptId,
          scriptId: sc.id,
          projectId: sc.projectId || undefined,
        });
        dispatchedCount++;
      }
    }

    // ── 4. Pending Client Confirmation ──
    const pendingClientScripts = await this.prisma.script.findMany({
      where: { status: 'WAITING_FOR_CLIENT_CONFIRMATION' },
      include: { project: { select: { id: true, projectId: true } }, client: { select: { name: true } } },
    });
    for (const sc of pendingClientScripts) {
      if (!(await hasRecentReminder('SCRIPT', sc.id, 'CLIENT_CONFIRMATION_PENDING'))) {
        await this.notifyMediaManagers({
          title: `Pending Client Confirmation: ${sc.scriptId}`,
          message: `Script '${sc.name}' for client '${sc.client?.name || 'Client'}' is pending client confirmation.`,
          type: 'INFO',
          category: 'REMINDER',
          eventType: 'CLIENT_CONFIRMATION_PENDING',
          entityType: 'SCRIPT',
          entityId: sc.id,
          entityCode: sc.scriptId,
          scriptId: sc.id,
          projectId: sc.projectId || undefined,
        });
        dispatchedCount++;
      }
    }

    // ── 5. Equipment Return Due ──
    const returnHorizon = new Date(now.getTime() + equipReturnHours * 3600 * 1000);
    const dueEquipment = await this.prisma.equipmentReservation.findMany({
      where: {
        status: 'RESERVED',
        endDate: { lte: returnHorizon },
      },
      include: {
        equipment: { select: { id: true, equipmentId: true, name: true } },
        project: { select: { id: true, projectId: true } },
      },
    });
    for (const res of dueEquipment) {
      if (!(await hasRecentReminder('EQUIPMENT', res.equipmentId, 'EQUIPMENT_RETURN_REMINDER', res.reservedById))) {
        await this.notifyIndividual(res.reservedById, {
          title: `📷 Equipment Return Due: ${res.equipment.equipmentId}`,
          message: `Equipment '${res.equipment.name}' is due for return by ${new Date(res.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
          type: 'WARNING',
          category: 'EQUIPMENT_RETURN_REMINDER',
          eventType: 'EQUIPMENT_RETURN_REMINDER',
          entityType: 'EQUIPMENT',
          entityId: res.equipment.id,
          entityCode: res.equipment.equipmentId,
          equipmentId: res.equipment.id,
          projectId: res.projectId,
        });
        dispatchedCount++;
      }
    }

    // ── 6. Pending Equipment Approval ──
    const pendingEquipRequests = await this.prisma.equipmentRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        equipment: { select: { id: true, equipmentId: true, name: true } },
        project: { select: { id: true, projectId: true } },
        requestedBy: { select: { name: true } },
      },
    });
    for (const req of pendingEquipRequests) {
      if (!(await hasRecentReminder('EQUIPMENT', req.equipmentId, 'EQUIPMENT_REQUEST_SUBMITTED'))) {
        await this.notifyMediaManagers({
          title: `Pending Equipment Request: ${req.equipment.equipmentId}`,
          message: `Equipment request for '${req.equipment.name}' requested by ${req.requestedBy?.name || 'Staff'} is pending approval.`,
          type: 'INFO',
          category: 'EQUIPMENT_APPROVAL',
          eventType: 'EQUIPMENT_REQUEST_SUBMITTED',
          entityType: 'EQUIPMENT',
          entityId: req.equipment.id,
          entityCode: req.equipment.equipmentId,
          equipmentId: req.equipment.id,
          projectId: req.projectId,
        });
        dispatchedCount++;
      }
    }

    return {
      status: 'SUCCESS',
      dispatchedCount,
      evaluatedAt: now.toISOString(),
      frequencyHours,
      deadlineAdvanceHours,
      equipReturnHours,
    };
  }

  /**
   * ── Exceptional Operational Conditions Alert Engine ──
   * Evaluates operational state and generates high-priority administrative alerts for:
   * 1. Employee Over Capacity
   * 2. Equipment Conflict
   * 3. Calendar Conflict
   * 4. Storage Capacity Warning
   * 5. Backup Failure
   * 6. Server Connectivity Issue
   * 
   * System alerts require administrative attention.
   */
  async checkOperationalAlerts(targetUserId?: string) {
    const now = new Date();
    const frequencyHours = 4;
    const frequencyCutoff = new Date(now.getTime() - frequencyHours * 3600 * 1000);
    const activeAlerts: any[] = [];
    let alertsCreated = 0;

    const hasRecentAlert = async (entityType: string, entityId: string, eventType: string) => {
      const count = await this.prisma.notification.count({
        where: {
          entityType,
          entityId,
          eventType,
          createdAt: { gte: frequencyCutoff },
        },
      });
      return count > 0;
    };

    // Helper to check if an alert has been manually resolved by an admin
    const getAlertResolution = async (alertId: string) => {
      const resSetting = await this.prisma.systemSetting.findUnique({
        where: { key: `RESOLVED_ALERT_${alertId}` },
      });
      if (resSetting && resSetting.value) {
        try {
          return JSON.parse(resSetting.value);
        } catch {
          return { resolved: true, resolvedAt: resSetting.updatedAt };
        }
      }
      return null;
    };

    // Helper to check if an alert has been acknowledged by an admin
    const getAlertAck = async (alertId: string) => {
      const ackSetting = await this.prisma.systemSetting.findUnique({
        where: { key: `ACK_ALERT_${alertId}` },
      });
      if (ackSetting && ackSetting.value) {
        try {
          return JSON.parse(ackSetting.value);
        } catch {
          return { acknowledged: true, ackAt: ackSetting.updatedAt };
        }
      }
      return null;
    };

    // ── 1. Employee Over Capacity ──
    const employees = await this.prisma.user.findMany({
      where: { isArchived: false, status: 'ACTIVE' },
      include: {
        employeeProfile: true,
        tasks: {
          include: { task: true },
        },
      },
    });

    for (const emp of employees) {
      const activeTasks = emp.tasks.filter((t) => !['COMPLETED', 'CANCELLED'].includes(t.task.status));
      const taskCount = activeTasks.length;
      if (taskCount >= 5) {
        const alertId = `OVER_CAPACITY_${emp.id}`;
        const resolution = await getAlertResolution(alertId);
        const ack = await getAlertAck(alertId);

        activeAlerts.push({
          id: alertId,
          type: 'EMPLOYEE_OVER_CAPACITY',
          category: 'STAFF_CAPACITY',
          severity: taskCount >= 7 ? 'CRITICAL' : 'HIGH',
          title: `⚠️ Employee Over Capacity: ${emp.name}`,
          description: `${emp.name} is currently assigned to ${taskCount} concurrent active tasks, exceeding the standard workload capacity threshold (max 5).`,
          entityType: 'TASK',
          entityId: emp.id,
          entityCode: `EMP-${emp.name.replace(/\s+/g, '').substring(0, 4).toUpperCase()}`,
          actionUrl: `/tasks`,
          actionLabel: 'Rebalance Workload',
          requiresAdminAttention: true,
          metrics: {
            employeeId: emp.id,
            employeeName: emp.name,
            activeTaskCount: taskCount,
            threshold: 5,
            taskTitles: activeTasks.slice(0, 3).map((t) => t.task?.title).filter(Boolean),
          },
          acknowledged: !!ack,
          acknowledgedInfo: ack,
          resolved: !!resolution,
          resolutionInfo: resolution,
        });

        if (!(await hasRecentAlert('TASK', emp.id, 'ALERT_EMPLOYEE_OVER_CAPACITY'))) {
          await this.notifyMediaManagers({
            title: `⚠️ Employee Over Capacity: ${emp.name}`,
            message: `${emp.name} is handling ${taskCount} active operational tasks. Administrative workload rebalancing required.`,
            type: 'WARNING',
            category: 'WARNING',
            priority: taskCount >= 7 ? 'CRITICAL' : 'HIGH',
            eventType: 'ALERT_EMPLOYEE_OVER_CAPACITY',
            entityType: 'TASK',
            entityId: emp.id,
            entityCode: `EMP-${emp.name.replace(/\s+/g, '').substring(0, 4).toUpperCase()}`,
            linkUrl: `/tasks`,
          });
          alertsCreated++;
        }
      }
    }

    // ── 2. Equipment Conflict ──
    const activeReservations = await this.prisma.equipmentReservation.findMany({
      where: {
        endDate: { gte: now },
      },
      include: { equipment: true, project: true },
    });

    const reservationsByEquipment: Record<string, typeof activeReservations> = {};
    for (const res of activeReservations) {
      if (!reservationsByEquipment[res.equipmentId]) {
        reservationsByEquipment[res.equipmentId] = [];
      }
      reservationsByEquipment[res.equipmentId].push(res);
    }

    for (const [equipId, resList] of Object.entries(reservationsByEquipment)) {
      if (resList.length > 1) {
        for (let i = 0; i < resList.length; i++) {
          for (let j = i + 1; j < resList.length; j++) {
            const startA = new Date(resList[i].startDate).getTime();
            const endA = new Date(resList[i].endDate).getTime();
            const startB = new Date(resList[j].startDate).getTime();
            const endB = new Date(resList[j].endDate).getTime();

            if (startA < endB && startB < endA) {
              const equip = resList[i].equipment;
              const alertId = `EQUIP_CONFLICT_${equipId}_${resList[i].id}`;
              const resolution = await getAlertResolution(alertId);
              const ack = await getAlertAck(alertId);

              activeAlerts.push({
                id: alertId,
                type: 'EQUIPMENT_CONFLICT',
                category: 'EQUIPMENT_CONFLICT',
                severity: 'CRITICAL',
                title: `🚨 Equipment Reservation Conflict: ${equip.name}`,
                description: `Overlapping reservation conflict detected between Project '${resList[i].project?.name || 'Project A'}' and '${resList[j].project?.name || 'Project B'}' for gear item ${equip.equipmentId}.`,
                entityType: 'EQUIPMENT',
                entityId: equip.id,
                entityCode: equip.equipmentId,
                actionUrl: `/equipment?equipmentId=${equip.id}`,
                actionLabel: 'Resolve Gear Conflict',
                requiresAdminAttention: true,
                metrics: {
                  equipmentId: equip.id,
                  equipmentName: equip.name,
                  equipmentCode: equip.equipmentId,
                  conflictingProjects: [
                    { id: resList[i].projectId, name: resList[i].project?.name },
                    { id: resList[j].projectId, name: resList[j].project?.name },
                  ],
                },
                acknowledged: !!ack,
                acknowledgedInfo: ack,
                resolved: !!resolution,
                resolutionInfo: resolution,
              });

              if (!(await hasRecentAlert('EQUIPMENT', equip.id, 'ALERT_EQUIPMENT_CONFLICT'))) {
                await this.notifyTechnicalManagers({
                  title: `🚨 Equipment Conflict: ${equip.equipmentId}`,
                  message: `Overlapping reservation detected for '${equip.name}'. Administrative schedule reallocation required.`,
                  type: 'ALERT',
                  category: 'EQUIPMENT_REQUEST',
                  priority: 'CRITICAL',
                  eventType: 'ALERT_EQUIPMENT_CONFLICT',
                  entityType: 'EQUIPMENT',
                  entityId: equip.id,
                  entityCode: equip.equipmentId,
                  equipmentId: equip.id,
                  linkUrl: `/equipment?equipmentId=${equip.id}`,
                });
                alertsCreated++;
              }
            }
          }
        }
      }
    }

    // ── 3. Calendar Conflict ──
    const upcomingShoots = await this.prisma.shootProject.findMany({
      where: {
        lifecycle: { not: 'ARCHIVED' },
        shootDate: { gte: now },
      },
      select: { id: true, projectId: true, name: true, shootDate: true, shootLocation: true },
    });

    for (let i = 0; i < upcomingShoots.length; i++) {
      for (let j = i + 1; j < upcomingShoots.length; j++) {
        const p1 = upcomingShoots[i];
        const p2 = upcomingShoots[j];
        if (p1.shootDate && p2.shootDate && p1.shootLocation && p2.shootLocation && p1.shootLocation.trim().toLowerCase() === p2.shootLocation.trim().toLowerCase()) {
          const d1 = new Date(p1.shootDate).toDateString();
          const d2 = new Date(p2.shootDate).toDateString();

          if (d1 === d2) {
            const alertId = `CALENDAR_CONFLICT_${p1.id}_${p2.id}`;
            const resolution = await getAlertResolution(alertId);
            const ack = await getAlertAck(alertId);

            activeAlerts.push({
              id: alertId,
              type: 'CALENDAR_CONFLICT',
              category: 'CALENDAR_CONFLICT',
              severity: 'HIGH',
              title: `📅 Studio Location Booking Conflict: ${p1.shootLocation}`,
              description: `Simultaneous shoot scheduled at studio location '${p1.shootLocation}' on ${d1} for Project '${p1.name}' and '${p2.name}'.`,
              entityType: 'CALENDAR_EVENT',
              entityId: p1.id,
              entityCode: p1.projectId,
              actionUrl: `/calendar`,
              actionLabel: 'Adjust Shoot Calendar',
              requiresAdminAttention: true,
              metrics: {
                location: p1.shootLocation,
                shootDate: d1,
                project1: { id: p1.id, name: p1.name },
                project2: { id: p2.id, name: p2.name },
              },
              acknowledged: !!ack,
              acknowledgedInfo: ack,
              resolved: !!resolution,
              resolutionInfo: resolution,
            });

            if (!(await hasRecentAlert('CALENDAR_EVENT', p1.id, 'ALERT_CALENDAR_CONFLICT'))) {
              await this.notifyMediaManagers({
                title: `📅 Calendar Conflict: ${p1.shootLocation}`,
                message: `Double-booked location '${p1.shootLocation}' detected on ${d1}. Administrative adjustment required.`,
                type: 'WARNING',
                category: 'REMINDER',
                priority: 'HIGH',
                eventType: 'ALERT_CALENDAR_CONFLICT',
                entityType: 'CALENDAR_EVENT',
                entityId: p1.id,
                entityCode: p1.projectId,
                projectId: p1.id,
                linkUrl: `/calendar`,
              });
              alertsCreated++;
            }
          }
        }
      }
    }

    // ── 4. Storage Capacity Warning ──
    const fileCount = await this.prisma.fileMetadata.count();
    const files = await this.prisma.fileMetadata.findMany({ select: { fileSize: true } });
    const totalBytes = files.reduce((acc, f) => acc + (f.fileSize || 1024 * 100), 0);
    const totalGB = totalBytes / (1024 * 1024 * 1024);
    const storageLimitGB = await this.getSettingNumber('STORAGE_LIMIT_GB', 100);
    const storageUsagePercent = (totalGB / storageLimitGB) * 100;

    if (storageUsagePercent > 80 || fileCount > 150) {
      const alertId = 'STORAGE_CAPACITY_WARNING';
      const resolution = await getAlertResolution(alertId);
      const ack = await getAlertAck(alertId);

      activeAlerts.push({
        id: alertId,
        type: 'STORAGE_CAPACITY_WARNING',
        category: 'STORAGE_WARNING',
        severity: storageUsagePercent > 90 ? 'CRITICAL' : 'HIGH',
        title: `💾 Storage Capacity Warning (${storageUsagePercent.toFixed(1)}% Used)`,
        description: `Operational media repository has reached ${totalGB.toFixed(2)} GB of ${storageLimitGB} GB quota (${fileCount} total files stored).`,
        entityType: 'SYSTEM',
        entityId: 'STORAGE_SUBSYSTEM',
        entityCode: 'SYS-STORAGE',
        actionUrl: `/settings`,
        actionLabel: 'Manage Storage Quota',
        requiresAdminAttention: true,
        metrics: {
          totalGB: parseFloat(totalGB.toFixed(2)),
          quotaGB: storageLimitGB,
          usagePercentage: parseFloat(storageUsagePercent.toFixed(1)),
          totalFileCount: fileCount,
        },
        acknowledged: !!ack,
        acknowledgedInfo: ack,
        resolved: !!resolution,
        resolutionInfo: resolution,
      });

      if (!(await hasRecentAlert('SYSTEM', 'STORAGE_SUBSYSTEM', 'ALERT_STORAGE_CAPACITY_WARNING'))) {
        await this.notifyMediaManagers({
          title: `💾 Storage Capacity Warning: ${storageUsagePercent.toFixed(1)}% Used`,
          message: `Storage subsystem approaching threshold (${totalGB.toFixed(2)} GB / ${storageLimitGB} GB). Administrative cleanup or quota expansion advised.`,
          type: 'WARNING',
          category: 'SYSTEM_NOTIFICATION',
          priority: storageUsagePercent > 90 ? 'CRITICAL' : 'HIGH',
          eventType: 'ALERT_STORAGE_CAPACITY_WARNING',
          entityType: 'SYSTEM',
          entityId: 'STORAGE_SUBSYSTEM',
          entityCode: 'SYS-STORAGE',
          linkUrl: `/settings`,
        });
        alertsCreated++;
      }
    }

    // ── 5. Backup Failure Diagnostic ──
    const backupHealthy = await this.getSettingBoolean('LAST_BACKUP_STATUS_HEALTHY', true);
    if (!backupHealthy) {
      const alertId = 'BACKUP_FAILURE_ALERT';
      const resolution = await getAlertResolution(alertId);
      const ack = await getAlertAck(alertId);

      activeAlerts.push({
        id: alertId,
        type: 'BACKUP_FAILURE',
        category: 'BACKUP_FAILURE',
        severity: 'CRITICAL',
        title: '🚨 Automated Backup Failure',
        description: 'The automated snapshot and database backup pipeline reported a verification failure. Data redundancy is currently degraded.',
        entityType: 'SYSTEM',
        entityId: 'BACKUP_PIPELINE',
        entityCode: 'SYS-BACKUP',
        actionUrl: `/settings`,
        actionLabel: 'Inspect Backup Logs',
        requiresAdminAttention: true,
        metrics: {
          lastAttempt: new Date().toISOString(),
          status: 'VERIFICATION_FAILED',
          pipeline: 'PostgreSQL Automated Nightly Snapshot',
        },
        acknowledged: !!ack,
        acknowledgedInfo: ack,
        resolved: !!resolution,
        resolutionInfo: resolution,
      });

      if (!(await hasRecentAlert('SYSTEM', 'BACKUP_PIPELINE', 'ALERT_BACKUP_FAILURE'))) {
        await this.notifyTechnicalManagers({
          title: '🚨 Automated Backup Failure Detected',
          message: 'The database automated backup verification failed. Immediate administrative attention required.',
          type: 'ALERT',
          category: 'SYSTEM_NOTIFICATION',
          priority: 'CRITICAL',
          eventType: 'ALERT_BACKUP_FAILURE',
          entityType: 'SYSTEM',
          entityId: 'BACKUP_PIPELINE',
          entityCode: 'SYS-BACKUP',
          linkUrl: `/settings`,
        });
        alertsCreated++;
      }
    }

    // ── 6. Server Connectivity & Latency Issue ──
    const serverLatency = await this.getSettingNumber('SIMULATED_SERVER_LATENCY_MS', 15);
    if (serverLatency > 500) {
      const alertId = 'SERVER_CONNECTIVITY_ISSUE';
      const resolution = await getAlertResolution(alertId);
      const ack = await getAlertAck(alertId);

      activeAlerts.push({
        id: alertId,
        type: 'SERVER_CONNECTIVITY_ISSUE',
        category: 'CONNECTIVITY_ISSUE',
        severity: 'CRITICAL',
        title: '🌐 Server Connectivity / Latency Degradation',
        description: `Operational API response latency is elevated at ${serverLatency}ms. Cloud services communication is degraded.`,
        entityType: 'SYSTEM',
        entityId: 'SERVER_GATEWAY',
        entityCode: 'SYS-SERVER',
        actionUrl: `/settings`,
        actionLabel: 'System Diagnostics',
        requiresAdminAttention: true,
        metrics: {
          latencyMs: serverLatency,
          thresholdMs: 500,
          gatewayStatus: 'DEGRADED',
        },
        acknowledged: !!ack,
        acknowledgedInfo: ack,
        resolved: !!resolution,
        resolutionInfo: resolution,
      });
    }

    // Role-Based Operational Alert Filtering: Non-Media Managers cannot manage employee capacity rebalancing
    let filteredAlerts = activeAlerts;
    if (targetUserId) {
      const user = await this.prisma.user.findUnique({ where: { id: targetUserId }, select: { role: true } });
      if (user?.role === 'TECHNICAL_MANAGER' || user?.role === 'STAFF') {
        filteredAlerts = activeAlerts.filter(
          (a) => a.type !== 'EMPLOYEE_OVER_CAPACITY' && a.category !== 'STAFF_CAPACITY'
        );
      }
    }

    // Separate active unresolved alerts from total alerts
    const unresolvedAlerts = filteredAlerts.filter((a) => !a.resolved);
    const criticalCount = unresolvedAlerts.filter((a) => a.severity === 'CRITICAL').length;
    const highCount = unresolvedAlerts.filter((a) => a.severity === 'HIGH').length;

    return {
      status: 'SUCCESS',
      alertsCreated,
      totalActiveAlerts: unresolvedAlerts.length,
      totalAllAlerts: filteredAlerts.length,
      criticalCount,
      highCount,
      alerts: filteredAlerts,
      evaluatedAt: now.toISOString(),
    };
  }

  async getSystemAlerts(userId?: string) {
    return this.checkOperationalAlerts(userId);
  }

  /**
   * Allows Media Managers / Admins to acknowledge an operational alert.
   */
  async acknowledgeOperationalAlert(alertId: string, userId: string, notes?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, role: true },
    });

    const ackPayload = {
      acknowledged: true,
      acknowledgedAt: new Date().toISOString(),
      acknowledgedBy: user?.name || userId,
      acknowledgedByRole: user?.role || 'MEDIA_MANAGER',
      notes: notes || 'Acknowledged by Media Manager',
    };

    await this.prisma.systemSetting.upsert({
      where: { key: `ACK_ALERT_${alertId}` },
      update: { value: JSON.stringify(ackPayload) },
      create: {
        key: `ACK_ALERT_${alertId}`,
        value: JSON.stringify(ackPayload),
        description: `Alert Acknowledgment ${alertId}`,
      },
    });

    return {
      status: 'SUCCESS',
      alertId,
      ackPayload,
    };
  }

  /**
   * Allows Media Managers / Admins to resolve an operational condition with administrative action notes.
   */
  async resolveOperationalAlert(alertId: string, userId: string, actionNotes?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, role: true },
    });

    const resPayload = {
      resolved: true,
      resolvedAt: new Date().toISOString(),
      resolvedBy: user?.name || userId,
      resolvedByRole: user?.role || 'MEDIA_MANAGER',
      actionNotes: actionNotes || 'Resolved by administrative action',
    };

    await this.prisma.systemSetting.upsert({
      where: { key: `RESOLVED_ALERT_${alertId}` },
      update: { value: JSON.stringify(resPayload) },
      create: {
        key: `RESOLVED_ALERT_${alertId}`,
        value: JSON.stringify(resPayload),
        description: `Alert Resolution ${alertId}`,
      },
    });

    // Auto-reset simulated condition triggers if applicable
    if (alertId === 'BACKUP_FAILURE_ALERT') {
      await this.prisma.systemSetting.upsert({
        where: { key: 'LAST_BACKUP_STATUS_HEALTHY' },
        update: { value: 'true' },
        create: { key: 'LAST_BACKUP_STATUS_HEALTHY', value: 'true', description: 'Backup Health Status' },
      });
    } else if (alertId === 'SERVER_CONNECTIVITY_ISSUE') {
      await this.prisma.systemSetting.upsert({
        where: { key: 'SIMULATED_SERVER_LATENCY_MS' },
        update: { value: '15' },
        create: { key: 'SIMULATED_SERVER_LATENCY_MS', value: '15', description: 'Server Latency (ms)' },
      });
    }

    return {
      status: 'SUCCESS',
      alertId,
      resPayload,
    };
  }

  /**
   * Test endpoint to toggle simulated conditions for administrative testing.
   */
  async triggerOperationalDiagnosticTest(type: string, trigger: boolean) {
    if (type === 'BACKUP_FAILURE') {
      await this.prisma.systemSetting.upsert({
        where: { key: 'LAST_BACKUP_STATUS_HEALTHY' },
        update: { value: trigger ? 'false' : 'true' },
        create: { key: 'LAST_BACKUP_STATUS_HEALTHY', value: trigger ? 'false' : 'true', description: 'Backup Health Status' },
      });
    } else if (type === 'SERVER_CONNECTIVITY') {
      await this.prisma.systemSetting.upsert({
        where: { key: 'SIMULATED_SERVER_LATENCY_MS' },
        update: { value: trigger ? '850' : '15' },
        create: { key: 'SIMULATED_SERVER_LATENCY_MS', value: trigger ? '850' : '15', description: 'Server Latency (ms)' },
      });
    }

    return this.checkOperationalAlerts();
  }
}

