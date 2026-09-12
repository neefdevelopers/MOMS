import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TaskStatus, Priority, Role } from '../../common/enums';
import { canUserViewTask } from '../../common/utils/event-auth';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    search?: string;
    status?: string;
    priority?: string;
    projectId?: string;
    scriptId?: string;
    clientId?: string;
    brandId?: string;
    productId?: string;
    employeeId?: string;
    departmentId?: string;
    date?: string;
    dateFrom?: string;
    dateTo?: string;
    createdById?: string;
    userId?: string;
    role?: Role;
  }) {
    const where: any = {};

    if (params.projectId) where.projectId = params.projectId;
    if (params.scriptId) where.scriptId = params.scriptId;
    if (params.clientId) where.clientId = params.clientId;
    if (params.brandId) where.brandId = params.brandId;
    if (params.productId) where.productId = params.productId;
    if (params.status && params.status !== 'ALL') where.status = params.status;
    if (params.priority && params.priority !== 'ALL') where.priority = params.priority;

    if (params.departmentId && params.departmentId !== 'ALL') {
      where.assignedEmployees = {
        some: { user: { employeeProfile: { departmentId: params.departmentId } } },
      };
    }

    if (params.date) {
      const d = new Date(params.date);
      const nextD = new Date(d);
      nextD.setDate(d.getDate() + 1);
      where.dueDate = { gte: d, lt: nextD };
    } else if (params.dateFrom || params.dateTo) {
      where.dueDate = {};
      if (params.dateFrom) where.dueDate.gte = new Date(params.dateFrom);
      if (params.dateTo) where.dueDate.lte = new Date(params.dateTo);
    }

    // RBAC: STAFF and SOCIAL_MEDIA_MANAGER users MUST ONLY see tasks strictly assigned to their user ID
    const isRestrictedRole =
      params.role === Role.STAFF ||
      params.role === Role.SOCIAL_MEDIA_MANAGER ||
      (params.role as string) === 'STAFF' ||
      (params.role as string) === 'SOCIAL_MEDIA_MANAGER';

    if (isRestrictedRole) {
      where.assignedEmployees = {
        some: { userId: params.userId },
      };
    } else if (params.employeeId) {
      where.assignedEmployees = {
        some: { userId: params.employeeId },
      };
    }

    // 9-Attribute Search Query: Task ID, Task Name, Employee, Client, Brand, Product, Project, Script, Status
    if (params.search && params.search.trim()) {
      const query = params.search.trim();
      where.OR = [
        { taskId: { contains: query } },
        { title: { contains: query } },
        { description: { contains: query } },
        { status: { contains: query } },
        { client: { name: { contains: query } } },
        { brand: { name: { contains: query } } },
        { brand: { shortCode: { contains: query } } },
        { product: { name: { contains: query } } },
        { product: { productCode: { contains: query } } },
        { project: { name: { contains: query } } },
        { project: { projectId: { contains: query } } },
        { script: { name: { contains: query } } },
        { script: { scriptId: { contains: query } } },
        { assignedEmployees: { some: { user: { name: { contains: query } } } } },
      ];
    }

    const tasks = await this.prisma.task.findMany({
      where,
      include: {
        project: {
          include: {
            client: true,
            brand: true,
            product: true,
            createdBy: { select: { id: true, name: true, role: true } },
            calendarEvent: {
              include: {
                createdBy: { select: { id: true, name: true, role: true } },
                assignedStaff: { select: { id: true, name: true, role: true } },
              },
            },
            assignedTeam: {
              include: {
                user: { select: { id: true, name: true, role: true, avatarUrl: true } },
              },
            },
            equipmentReservations: {
              include: { equipment: true },
            },
            indoorDetails: true,
            outdoorDetails: true,
            files: {
              include: { uploadedBy: { select: { id: true, name: true, role: true } } },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        script: {
          include: {
            client: true,
            brand: true,
            product: true,
            createdBy: { select: { id: true, name: true, role: true } },
            files: {
              include: { uploadedBy: { select: { id: true, name: true, role: true } } },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        graphicRequirement: {
          include: {
            client: true,
            brand: true,
            product: true,
            calendarEvent: {
              include: {
                createdBy: { select: { id: true, name: true, role: true } },
                assignedStaff: { select: { id: true, name: true, role: true } },
              },
            },
            deliverables: true,
            files: {
              include: { uploadedBy: { select: { id: true, name: true, role: true } } },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        client: { select: { id: true, name: true, companyName: true, contactPerson: true } },
        brand: { select: { id: true, name: true, shortCode: true } },
        product: { select: { id: true, name: true, productCode: true } },
        assignedEmployees: { include: { user: { include: { employeeProfile: true } } } },
        remarksHistory: { include: { user: { select: { id: true, name: true, role: true, avatarUrl: true } } }, orderBy: { createdAt: 'desc' } },
        deliverableHistory: { include: { user: { select: { id: true, name: true, role: true } } }, orderBy: { version: 'desc' } },
        timeline: { include: { user: { select: { id: true, name: true, role: true, avatarUrl: true } } }, orderBy: { createdAt: 'desc' } },
        revisions: {
          include: {
            requestedBy: { select: { id: true, name: true, role: true } },
            assignedTo: { select: { id: true, name: true, role: true } },
            originalAssignee: { select: { id: true, name: true, role: true } },
          },
          orderBy: { revisionNumber: 'desc' },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    const syncedTasks = await this.syncTaskSourceTypes(tasks);

    // Consolidated Task Deduplication: Only merge duplicate revision tasks, never drop distinct project/graphic/script tasks
    const consolidatedTasks: any[] = [];
    const seenRevisionKeys = new Map<string, any>();

    for (const t of syncedTasks) {
      const isRevisionTask =
        t.sourceType === 'REVISION' ||
        t.taskType === 'REVISION' ||
        (t.revisionId && typeof t.revisionId === 'string' && t.revisionId.trim() !== '');

      if (!isRevisionTask) {
        consolidatedTasks.push(t);
        continue;
      }

      const revKey = t.revisionId ? `REV_${t.revisionId}` : `REV_TASK_${t.id}`;
      if (!seenRevisionKeys.has(revKey)) {
        seenRevisionKeys.set(revKey, t);
        consolidatedTasks.push(t);
      } else {
        const existing = seenRevisionKeys.get(revKey);
        // Merge revisions into existing primary task
        if (Array.isArray(t.revisions) && t.revisions.length > 0) {
          const existingRevIds = new Set((existing.revisions || []).map((r: any) => r.id));
          for (const r of t.revisions) {
            if (!existingRevIds.has(r.id)) {
              existing.revisions = [...(existing.revisions || []), r];
              existingRevIds.add(r.id);
            }
          }
        }
        if (t.revisionCount && (!existing.revisionCount || t.revisionCount > existing.revisionCount)) {
          existing.revisionCount = t.revisionCount;
        }
        // If this duplicate was an active revision task, reflect its active status on the primary task
        if (t.status === TaskStatus.ASSIGNED || (t.status as any) === 'REVISION_REQUESTED') {
          existing.status = t.status;
          existing.completionPercentage = t.completionPercentage;
        }

        // Clean up redundant duplicate revision task from DB asynchronously
        this.prisma.taskAssignment.deleteMany({ where: { taskId: t.id } })
          .then(() => this.prisma.task.delete({ where: { id: t.id } }))
          .catch(() => null);
      }
    }

    if (params.userId && params.role) {
      return consolidatedTasks.filter((t: any) =>
        canUserViewTask({ id: params.userId, role: params.role }, t),
      );
    }
    return consolidatedTasks;
  }

  private async syncTaskSourceTypes(tasks: any[]) {
    if (!tasks || !tasks.length) return tasks;
    for (const t of tasks) {
      let computed = t.sourceType || 'DIRECT_TASK';
      if (t.taskType === 'OTHER' || t.sourceType === 'DIRECT_TASK' || t.sourceType === 'OTHER') {
        computed = 'DIRECT_TASK';
      } else if (t.sourceType === 'SHOOT_PROJECT' || (t.taskType === 'PROJECT' && !t.scriptId && !t.graphicRequirementId) || (t.projectId && !t.scriptId && !t.graphicRequirementId && t.sourceType !== 'GRAPHIC_REQUIREMENT' && t.sourceType !== 'DIRECT_TASK' && t.sourceType !== 'OTHER' && t.taskType !== 'OTHER')) {
        computed = 'SHOOT_PROJECT';
      } else if (t.sourceType === 'SCRIPT' || t.scriptId || t.script || t.taskType === 'SCRIPT') {
        computed = 'SCRIPT';
      } else if (t.sourceType === 'GRAPHIC_REQUIREMENT' || t.graphicRequirementId || t.graphicRequirement || t.taskType === 'GRAPHIC_REQUIREMENT' || t.taskType === 'GRAPHIC') {
        computed = 'GRAPHIC_REQUIREMENT';
      } else if (t.sourceType === 'CALENDAR_EVENT') {
        computed = 'CALENDAR_EVENT';
      } else {
        computed = t.sourceType || 'DIRECT_TASK';
      }

      // Automatic Task Status & Completion Percentage Synchronization with Linked Script
      if (t.script || computed === 'SCRIPT') {
        let mappedTaskStatus = t.status;
        let mappedProgress = t.completionPercentage || 0;
        const norm = (t.script.status || '').toUpperCase().replace(/\s+/g, '_');
        if (norm === 'WAITING_FOR_TECHNICAL_REVIEW') {
          mappedTaskStatus = TaskStatus.WAITING_FOR_TECHNICAL_REVIEW;
          mappedProgress = mappedProgress >= 100 || mappedProgress < 50 ? 50 : Math.min(mappedProgress, 60);
        } else if (norm === 'WAITING_FOR_MEDIA_REVIEW') {
          mappedTaskStatus = TaskStatus.WAITING_FOR_MEDIA_REVIEW;
          mappedProgress = mappedProgress >= 100 || mappedProgress < 75 ? 75 : Math.min(mappedProgress, 80);
        } else if (norm === 'PENDING_MARKETING_APPROVAL' || norm === 'WAITING_FOR_MARKETING_APPROVAL') {
          mappedTaskStatus = TaskStatus.PENDING_MARKETING_APPROVAL;
          mappedProgress = mappedProgress >= 100 || mappedProgress < 85 ? 85 : Math.min(mappedProgress, 90);
        } else if (norm === 'APPROVED') {
          mappedTaskStatus = TaskStatus.APPROVED;
          mappedProgress = 90;
        } else if (norm === 'COMPLETED') {
          mappedTaskStatus = TaskStatus.COMPLETED;
          mappedProgress = 100;
        } else if (norm === 'ASSIGNED' || norm.includes('REVISION') || norm.includes('CHANGES') || norm.includes('REJECTED')) {
          mappedTaskStatus = TaskStatus.ASSIGNED;
          mappedProgress = 0;
        } else if (norm === 'IN_PRODUCTION' || norm === 'DRAFT' || norm === 'ACCEPTED' || norm === 'IN_PROGRESS') {
          if (t.status === TaskStatus.ASSIGNED || (t.status as any) === 'REVISION_REQUESTED') {
            mappedTaskStatus = TaskStatus.ASSIGNED;
            mappedProgress = 0;
          } else if (t.status === TaskStatus.ACCEPTED) {
            mappedTaskStatus = TaskStatus.ACCEPTED;
            mappedProgress = mappedProgress >= 100 || !mappedProgress ? 15 : Math.min(mappedProgress, 25);
          } else if (t.status !== TaskStatus.PENDING) {
            mappedTaskStatus = TaskStatus.IN_PROGRESS;
            mappedProgress = mappedProgress >= 100 || !mappedProgress ? 25 : Math.min(mappedProgress, 45);
          }
        }

        // Ensure ASSIGNED / REVISION_REQUESTED always has 0%
        if ((mappedTaskStatus === TaskStatus.ASSIGNED || (mappedTaskStatus as any) === 'REVISION_REQUESTED') && mappedProgress > 0) {
          mappedProgress = 0;
        } else if (mappedTaskStatus === TaskStatus.IN_PROGRESS && mappedProgress >= 100) {
          mappedProgress = 25;
        } else if (mappedTaskStatus === TaskStatus.ACCEPTED && mappedProgress >= 100) {
          mappedProgress = 15;
        }

        if (mappedTaskStatus !== t.status || mappedProgress !== t.completionPercentage) {
          await this.prisma.task.update({
            where: { id: t.id },
            data: { status: mappedTaskStatus, completionPercentage: mappedProgress },
          }).catch(() => null);
          t.status = mappedTaskStatus;
          t.completionPercentage = mappedProgress;
        }
      } else {
        // For non-script tasks (Shoot Project / Graphic Req / Direct), ensure status & progress consistency
        let mappedProgress = t.completionPercentage || 0;
        if ((t.status === TaskStatus.ASSIGNED || (t.status as any) === 'REVISION_REQUESTED') && mappedProgress > 0) {
          mappedProgress = 0;
          await this.prisma.task.update({
            where: { id: t.id },
            data: { completionPercentage: 0 },
          }).catch(() => null);
          t.completionPercentage = 0;
        } else if (t.status === TaskStatus.IN_PROGRESS && mappedProgress >= 100) {
          mappedProgress = 25;
          await this.prisma.task.update({
            where: { id: t.id },
            data: { completionPercentage: 25 },
          }).catch(() => null);
          t.completionPercentage = 25;
        }
      }

      if (computed !== t.sourceType) {
        await this.prisma.task.update({
          where: { id: t.id },
          data: { sourceType: computed },
        }).catch(() => null);
        t.sourceType = computed;
      }

      // Attach approvalHistory containing reviewer validations and remarks
      const approvalHistory = await this.prisma.approval.findMany({
        where: { entityType: 'TASK', entityId: t.id },
        include: {
          reviewer: { select: { id: true, name: true, role: true, avatarUrl: true } },
          requestedBy: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
      }).catch(() => []);
      t.approvalHistory = approvalHistory;
    }
    return tasks;
  }

  async findOne(id: string, user?: any) {
    const taskInclude = {
      project: {
        include: {
          client: true,
          brand: true,
          product: true,
          createdBy: { select: { id: true, name: true, role: true, email: true } },
          calendarEvent: {
            include: {
              createdBy: { select: { id: true, name: true, role: true } },
              assignedStaff: { select: { id: true, name: true, role: true } },
            },
          },
          assignedTeam: {
            include: {
              user: { select: { id: true, name: true, role: true, avatarUrl: true } },
            },
          },
          equipmentReservations: {
            include: { equipment: true },
          },
          indoorDetails: true,
          outdoorDetails: true,
          files: {
            include: { uploadedBy: { select: { id: true, name: true, role: true } } },
            orderBy: { createdAt: 'desc' as const },
          },
        },
      },
      script: {
        include: {
          client: true,
          brand: true,
          product: true,
          createdBy: { select: { id: true, name: true, role: true } },
          scriptAssignments: { include: { user: true } },
          deliverables: true,
          files: {
            include: { uploadedBy: { select: { id: true, name: true, role: true } } },
            orderBy: { createdAt: 'desc' as const },
          },
        },
      },
      graphicRequirement: {
        include: {
          client: true,
          brand: true,
          product: true,
          calendarEvent: {
            include: {
              createdBy: { select: { id: true, name: true, role: true } },
              assignedStaff: { select: { id: true, name: true, role: true } },
            },
          },
          deliverables: true,
          files: {
            include: { uploadedBy: { select: { id: true, name: true, role: true } } },
            orderBy: { createdAt: 'desc' as const },
          },
        },
      },
      client: { select: { id: true, name: true, companyName: true, contactPerson: true, email: true, mobile: true } },
      brand: { select: { id: true, name: true, shortCode: true } },
      product: { select: { id: true, name: true, productCode: true } },
      assignedEmployees: { include: { user: { include: { employeeProfile: true } } } },
      remarksHistory: { include: { user: { select: { id: true, name: true, role: true, avatarUrl: true } } }, orderBy: { createdAt: 'desc' as const } },
      deliverableHistory: { include: { user: { select: { id: true, name: true, role: true } } }, orderBy: { version: 'desc' as const } },
      timeline: { include: { user: { select: { id: true, name: true, role: true, avatarUrl: true } } }, orderBy: { createdAt: 'desc' as const } },
      revisions: {
        include: {
          requestedBy: { select: { id: true, name: true, role: true } },
          assignedTo: { select: { id: true, name: true, role: true } },
          originalAssignee: { select: { id: true, name: true, role: true } },
        },
        orderBy: { revisionNumber: 'desc' as const },
      },
    };

    let task = await this.prisma.task.findUnique({
      where: { id },
      include: taskInclude,
    });
    if (!task) {
      task = await this.prisma.task.findFirst({
        where: { OR: [{ id }, { taskId: id }] },
        include: taskInclude,
      });
    }
    if (!task) throw new NotFoundException('Task not found');
    if (user && !canUserViewTask(user, task)) {
      throw new ForbiddenException('You are not authorized to view this task.');
    }
    const [synced] = await this.syncTaskSourceTypes([task]);
    return synced;
  }

  private async logTimelineEvent(
    taskId: string,
    event: 'TASK_CREATED' | 'TASK_ASSIGNED' | 'EMPLOYEE_ACCEPTED' | 'STATUS_CHANGED' | 'PROGRESS_UPDATED' | 'FILE_UPLOADED' | 'REMARK_ADDED' | 'COMPLETED',
    description: string,
    userId?: string,
  ) {
    try {
      await this.prisma.taskTimeline.create({
        data: {
          taskId,
          event,
          description,
          userId: userId || null,
        },
      });

      if (userId) {
        await this.prisma.activityLog.create({
          data: {
            userId,
            action: event,
            entity: 'Task',
            entityId: taskId,
            description,
          },
        });
      }
    } catch (err) {
      console.error('Failed to log timeline event:', err);
    }
  }

  private async sendTaskNotifications(
    taskId: string,
    title: string,
    message: string,
    type: string,
    targetUserIds?: string[],
  ) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { assignedEmployees: true },
    });
    if (!task) return;

    let recipientIds = targetUserIds;
    if (!recipientIds || recipientIds.length === 0) {
      recipientIds = task.assignedEmployees.map((a) => a.userId) || [];
    }

    const uniqueIds = Array.from(new Set(recipientIds.filter(Boolean)));

    for (const uId of uniqueIds) {
      await this.prisma.notification.create({
        data: {
          userId: uId,
          title,
          message,
          type: type || 'INFO',
          linkUrl: `/tasks`,
          eventType: type || 'TASK_STATUS_CHANGED',
          entityType: 'TASK',
          entityId: task.id,
          entityCode: task.taskId,
          taskId: task.id,
          projectId: task.projectId,
        },
      });
    }
  }

  private async notifyManagersByRole(
    task: any,
    roles: string[],
    title: string,
    message: string,
    eventType: string,
    linkUrl = '/tasks',
  ) {
    try {
      const managers = await this.prisma.user.findMany({
        where: { role: { in: roles as any }, status: 'ACTIVE' },
        select: { id: true },
      });
      if (managers.length > 0) {
        await this.prisma.notification.createMany({
          data: managers.map((m) => ({
            userId: m.id,
            title,
            message,
            type: 'ALERT',
            category: 'APPROVAL',
            priority: 'HIGH',
            linkUrl,
            eventType,
            entityType: 'TASK',
            entityId: task.id,
            entityCode: task.taskId,
            taskId: task.id,
            projectId: task.projectId || undefined,
          })),
        });
      }
    } catch (e) {
      console.error('Error sending manager notification:', e);
    }
  }

  async getCapacityOverview() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Fetch all active staff members with their profiles, assigned projects, and assigned tasks
    const users = await this.prisma.user.findMany({
      where: { role: { in: [Role.STAFF, Role.TECHNICAL_MANAGER, Role.SOCIAL_MEDIA_MANAGER] } },
      include: {
        employeeProfile: { include: { department: true } },
        projectAssignments: {
          include: {
            project: { select: { id: true, name: true, status: true } },
          },
        },
        tasks: {
          include: {
            task: {
              include: {
                project: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    const now = Date.now();

    const result = users.map((user) => {
      const allTasks = user.tasks.map((t) => t.task).filter(Boolean);
      const activeTasks = allTasks.filter((t) => t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.CANCELLED);

      // Completed outputs today
      const completedTasksToday = allTasks.filter((t) => {
        if (t.status !== TaskStatus.COMPLETED) return false;
        return new Date(t.updatedAt) >= todayStart;
      }).length;

      // Unique active projects assigned to employee
      const activeProjectNamesSet = new Set<string>();
      user.projectAssignments?.forEach((pa) => {
        if (pa.project && pa.project.status !== 'ARCHIVED') {
          activeProjectNamesSet.add(pa.project.name);
        }
      });
      activeTasks.forEach((t) => {
        if (t.project) activeProjectNamesSet.add(t.project.name);
      });
      const currentProjectNames = Array.from(activeProjectNamesSet);

      let totalRawRemainingHours = 0;
      let totalWeightedWorkloadHours = 0;
      let urgentTaskCount = 0;

      activeTasks.forEach((t) => {
        const remainingFraction = Math.max(0, 1 - (t.completionPercentage || 0) / 100);
        const rawHours = (t.estimatedHours || 2.0) * remainingFraction;
        totalRawRemainingHours += rawHours;

        // 1. Task Priority Multiplier (CRITICAL=1.4x, HIGH=1.2x, MEDIUM=1.0x, LOW=0.8x)
        let priorityMultiplier = 1.0;
        if (t.priority === Priority.CRITICAL) priorityMultiplier = 1.4;
        else if (t.priority === Priority.HIGH) priorityMultiplier = 1.2;
        else if (t.priority === Priority.LOW) priorityMultiplier = 0.8;

        // 2. Due Date Urgency Multiplier (Overdue/Due Today=1.5x, Due <=3d=1.25x)
        let urgencyMultiplier = 1.0;
        const daysUntilDue = (new Date(t.dueDate).getTime() - now) / 86400000;
        if (daysUntilDue <= 1) {
          urgencyMultiplier = 1.5;
          urgentTaskCount++;
        } else if (daysUntilDue <= 3) {
          urgencyMultiplier = 1.25;
        }

        totalWeightedWorkloadHours += rawHours * priorityMultiplier * urgencyMultiplier;
      });

      const capacityHours = user.employeeProfile?.dailyCapacityHours || 8.0;
      const dailyTarget = user.employeeProfile?.dailyTarget || 5.0;
      const outputProgressPercentage = Math.round((completedTasksToday / dailyTarget) * 100);
      const workloadPercentage = Math.round((totalWeightedWorkloadHours / capacityHours) * 100);
      const assignedHours = Math.round(totalRawRemainingHours * 10) / 10;
      const remainingCapacity = Math.max(0, Math.round((capacityHours - totalRawRemainingHours) * 10) / 10);
      const isOverloaded = assignedHours > capacityHours || workloadPercentage > 100;

      let status = 'Available';
      if (isOverloaded) {
        status = 'Overloaded';
      } else if (workloadPercentage >= 75) {
        status = 'Normal';
      }

      return {
        userId: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
        designation: user.employeeProfile?.designation || user.role?.replace(/_/g, ' ') || 'Staff Member',
        department: user.employeeProfile?.department?.name || 'General',
        additionalDepartments: user.employeeProfile?.additionalDepartments || null,
        capacityHours,
        assignedHours,
        weightedWorkloadHours: Math.round(totalWeightedWorkloadHours * 10) / 10,
        remainingCapacity,
        remainingHours: remainingCapacity,
        workloadPercentage,
        status,
        isOverloaded,
        activeTaskCount: activeTasks.length,
        taskCount: activeTasks.length,
        currentProjectsCount: currentProjectNames.length,
        currentProjects: currentProjectNames,
        dailyTarget,
        actualOutputToday: completedTasksToday,
        outputProgressPercentage,
        urgentTaskCount,
      };
    });

    return result;
  }
  private async validateActiveEmployees(assignedUserIds: string[]) {
    if (!assignedUserIds || assignedUserIds.length === 0) return;

    const users = await this.prisma.user.findMany({
      where: { id: { in: assignedUserIds } },
      include: { employeeProfile: true },
    });

    for (const u of users) {
      const empStatus = u.employeeProfile?.employmentStatus || u.status || 'ACTIVE';
      if (empStatus !== 'ACTIVE' || u.status !== 'ACTIVE' || u.isArchived) {
        throw new BadRequestException(
          `Business Rule Violation: Only Active employees may receive task assignments. Employee "${u.name}" is currently ${empStatus}.`
        );
      }
    }
  }

  async create(data: any, managerUserId: string) {
    if (data.assignedUserIds && Array.isArray(data.assignedUserIds)) {
      await this.validateActiveEmployees(data.assignedUserIds);
    }

    const sanitizeId = (id: any) =>
      typeof id === 'string' && id.trim() !== '' && id !== 'null' && id !== 'undefined'
        ? id.trim()
        : null;

    const inputProjectId = sanitizeId(data.projectId);
    const inputScriptId = sanitizeId(data.scriptId);
    const inputGraphicReqId = sanitizeId(data.graphicRequirementId) || (data.parentEntityType === 'GRAPHIC_REQ' ? sanitizeId(data.parentId) : null);
    const rawCalendarEventId = sanitizeId(data.calendarEventId);

    let project: any = null;
    let scriptId: string | null = null;
    let graphicReqId: string | null = null;
    let calendarEvent: any = null;

    // 1. Check if calendarEventId or input IDs refer to a MediaCalendarEvent
    if (rawCalendarEventId) {
      calendarEvent = await this.prisma.mediaCalendarEvent.findFirst({
        where: { OR: [{ id: rawCalendarEventId }, { eventId: rawCalendarEventId }] },
        include: {
          client: true,
          brand: true,
          product: true,
          shootProjects: true,
          graphicReqs: true,
        },
      });
    }

    // Determine and strictly verify Client, Brand, and Product IDs upfront
    const candidateClientId = sanitizeId(data.clientId) || sanitizeId(data.taskClientId);
    const candidateBrandId = sanitizeId(data.brandId) || sanitizeId(data.taskBrandId);
    const candidateProductId = sanitizeId(data.productId) || sanitizeId(data.taskProductId);

    let verifiedClientId: string | null = null;
    if (candidateClientId) {
      const c = await this.prisma.client.findUnique({ where: { id: candidateClientId } }).catch(() => null);
      if (c) verifiedClientId = c.id;
    }

    let verifiedBrandId: string | null = null;
    if (candidateBrandId) {
      const b = await this.prisma.brand.findUnique({ where: { id: candidateBrandId } }).catch(() => null);
      if (b) verifiedBrandId = b.id;
    }

    let verifiedProductId: string | null = null;
    if (candidateProductId) {
      const p = await this.prisma.product.findUnique({ where: { id: candidateProductId } }).catch(() => null);
      if (p) verifiedProductId = p.id;
    }

    const isOtherType =
      data.parentEntityType === 'NONE' ||
      data.parentEntityType === 'OTHER' ||
      data.taskType === 'OTHER' ||
      data.sourceType === 'DIRECT_TASK';

    // Determine target entity classification with strict Shoot priority
    const isExplicitShoot =
      !isOtherType &&
      (data.parentEntityType === 'PROJECT' ||
      (calendarEvent &&
        (calendarEvent.eventSource === 'SHOOT' || calendarEvent.eventSource === 'PROJECT_SHOOT') &&
        data.parentEntityType !== 'GRAPHIC_REQ' &&
        data.parentEntityType !== 'SCRIPT'));

    const isExplicitScript =
      !isOtherType &&
      !isExplicitShoot &&
      (data.parentEntityType === 'SCRIPT' ||
        (inputScriptId && data.parentEntityType !== 'PROJECT' && data.parentEntityType !== 'GRAPHIC_REQ'));

    const isExplicitGraphicReq =
      !isOtherType &&
      !isExplicitShoot &&
      !isExplicitScript &&
      (data.parentEntityType === 'GRAPHIC_REQ' ||
        (inputGraphicReqId && data.parentEntityType !== 'PROJECT') ||
        (calendarEvent && calendarEvent.eventSource === 'GRAPHIC_REQUIREMENT'));

    // 2. Resolve Shoot Project
    if (isExplicitShoot) {
      let parentProj: any = null;
      if (inputProjectId) {
        parentProj = await this.prisma.shootProject.findFirst({
          where: {
            OR: [
              { id: inputProjectId },
              { projectId: inputProjectId },
            ],
          },
          include: { client: true, brand: true, product: true, calendarEvent: true, indoorDetails: true, outdoorDetails: true },
        });
      }

      if (parentProj) {
        project = parentProj;
      } else if (calendarEvent?.shootId) {
        project = await this.prisma.shootProject.findUnique({
          where: { id: calendarEvent.shootId },
          include: { client: true, brand: true, product: true, calendarEvent: true, indoorDetails: true, outdoorDetails: true },
        }).catch(() => null);
      } else if (calendarEvent?.shootProjects && calendarEvent.shootProjects.length > 0) {
        project = calendarEvent.shootProjects[0];
      }

      // If no parent project exists and parentEntityType is PROJECT (creating a brand new independent Shoot Project directly as a task container)
      if (!project && data.parentEntityType === 'PROJECT') {
        let pClientId = verifiedClientId || data.clientId || calendarEvent?.clientId;
        let pBrandId = verifiedBrandId || data.brandId || calendarEvent?.brandId;
        let pProductId = verifiedProductId || data.productId || calendarEvent?.productId || null;

        if (pClientId) {
          const c = await this.prisma.client.findUnique({ where: { id: pClientId } }).catch(() => null);
          if (!c) pClientId = verifiedClientId || undefined;
        }
        if (pBrandId) {
          const b = await this.prisma.brand.findUnique({ where: { id: pBrandId } }).catch(() => null);
          if (!b) pBrandId = verifiedBrandId || undefined;
        }

        let validProductId: string | null = null;
        if (pProductId) {
          const p = await this.prisma.product.findUnique({ where: { id: pProductId } }).catch(() => null);
          if (p) validProductId = p.id;
        }

        let validCampaignId: string | null = null;
        const rawCamp = data.campaignId || data.campaign;
        if (rawCamp) {
          const camp = await this.prisma.campaign.findUnique({ where: { id: rawCamp } }).catch(() => null);
          if (camp) validCampaignId = camp.id;
        }

        if (pClientId && pBrandId) {
          const count = await this.prisma.shootProject.count();
          const autoProjId = `SP-${(count + 1).toString().padStart(6, '0')}`;
          const isOutdoor = data.shootType === 'OUTDOOR' || data.shootType === 'Outdoor Shoot';

          const createdProj = await this.prisma.shootProject.create({
            data: {
              projectId: autoProjId,
              name: data.title,
              shootType: isOutdoor ? 'OUTDOOR' : 'INDOOR',
              shootDate: new Date(data.shootDate || Date.now()),
              estimatedCompletionDate: new Date(data.deadline || data.dueDate || Date.now() + 7 * 86400000),
              shootLocation: data.location || (isOutdoor ? 'Outdoor Location' : 'Main Studio Floor'),
              locationCategory: data.locationCategory || (isOutdoor ? 'Outdoor Landmark' : 'Studio Bay'),
              reportingTime: data.callTime || data.startTime || '09:00 AM',
              expectedWrapUpTime: data.expectedWrapTime || data.endTime || '05:00 PM',
              influencerTalent: data.influencerTalent || null,
              priority: data.priority || 'MEDIUM',
              notes: data.productionNotes || data.notes || data.description || null,
              clientId: pClientId,
              brandId: pBrandId,
              productId: validProductId,
              campaignId: validCampaignId,
              status: 'TASK_ASSIGNED',
              createdById: managerUserId,
              ...(isOutdoor
                ? {
                    outdoorDetails: {
                      create: {
                        outdoorLocation: data.location || 'Outdoor Location',
                        locationAddress: data.exactLocationAddress || data.location || 'Outdoor Location',
                        locationCategory: data.locationCategory || 'Outdoor Landmark',
                        locationContactPerson: data.locationContact || null,
                        permitRequired: data.permitRequired || 'NO',
                        permitStatus: data.permitStatus || 'Not Applied',
                        backupLocation: data.backupLocation || null,
                        specialOutdoorRequirements: data.specialOutdoorRequirements || null,
                      },
                    },
                  }
                : {
                    indoorDetails: {
                      create: {
                        studioName: data.location || 'Main Studio Floor',
                        studioAddress: data.location || 'Main Studio Floor',
                        reportingTime: data.callTime || data.startTime || '09:00 AM',
                        wrapUpTime: data.expectedWrapTime || data.endTime || '05:00 PM',
                      },
                    },
                  }),
            },
            include: { client: true, brand: true, product: true, indoorDetails: true, outdoorDetails: true },
          });

          project = createdProj;
        }
      }

      // Reserve equipment for project if equipmentIds provided
      if (project && data.equipmentIds && Array.isArray(data.equipmentIds) && data.equipmentIds.length > 0) {
        for (const eqId of data.equipmentIds) {
          await this.prisma.equipmentReservation.create({
            data: {
              projectId: project.id,
              equipmentId: eqId,
              startDate: new Date(data.shootDate || Date.now()),
              endDate: new Date(data.shootDate || Date.now()),
              status: 'RESERVED',
            },
          }).catch(() => null);
          await this.prisma.equipment.update({
            where: { id: eqId },
            data: { availability: 'RESERVED' },
          }).catch(() => null);
        }
      }

      scriptId = null;
      graphicReqId = null;
    }

    // 3. Resolve Script if provided
    if (isExplicitScript) {
      let script: any = inputScriptId
        ? await this.prisma.script.findFirst({
            where: {
              OR: [
                { id: inputScriptId },
                { scriptId: inputScriptId },
              ],
            },
            include: { project: true },
          })
        : null;

      if (!script && inputProjectId) {
        script = await this.prisma.script.findFirst({
          where: { projectId: inputProjectId },
          include: { project: true },
        });
      }

      // If no script exists yet for this project and parentEntityType is SCRIPT, automatically create one
      if (!script && data.parentEntityType === 'SCRIPT' && inputProjectId) {
        const proj = await this.prisma.shootProject.findFirst({
          where: {
            OR: [
              { id: inputProjectId },
              { projectId: inputProjectId },
            ],
          },
        });

        if (proj) {
          const count = await this.prisma.script.count();
          const autoScriptId = `SCR-${(count + 1).toString().padStart(6, '0')}`;

          script = await this.prisma.script.create({
            data: {
              scriptId: autoScriptId,
              name: data.title || `Script - ${proj.name}`,
              description: data.description || '',
              status: 'ASSIGNED',
              priority: data.priority || 'MEDIUM',
              projectId: proj.id,
              clientId: proj.clientId || verifiedClientId || data.clientId,
              brandId: proj.brandId || verifiedBrandId || data.brandId,
              productId: proj.productId || verifiedProductId || data.productId || null,
              createdById: managerUserId,
            },
            include: { project: true },
          });
        }
      }

      if (script) {
        scriptId = script.id;
        if (!project && script.project) project = script.project;
      }
      graphicReqId = null;
    }

    // 4. Resolve Graphic Requirement if provided
    if (isExplicitGraphicReq) {
      const gReq = inputGraphicReqId
        ? await this.prisma.graphicRequirement.findFirst({
            where: {
              OR: [
                { id: inputGraphicReqId },
                { requirementId: inputGraphicReqId },
              ],
            },
            include: { project: true, calendarEvent: true },
          })
        : null;
      if (gReq) {
        graphicReqId = gReq.id;
        if (!project) project = gReq.project;
      }
      if (!graphicReqId && calendarEvent?.graphicRequirementId) {
        const g = await this.prisma.graphicRequirement.findUnique({
          where: { id: calendarEvent.graphicRequirementId },
          include: { project: true },
        }).catch(() => null);
        if (g) {
          graphicReqId = g.id;
          if (!project) project = g.project;
        }
      }
      if (!graphicReqId && calendarEvent?.graphicReqs && calendarEvent.graphicReqs.length > 0) {
        graphicReqId = calendarEvent.graphicReqs[0].id;
        if (!project) project = calendarEvent.graphicReqs[0].project;
      }

      // If no graphic requirement exists yet for this project/event and parentEntityType is GRAPHIC_REQ, automatically create one with all structured fields
      if (!graphicReqId) {
        if (!project && inputProjectId) {
          project = await this.prisma.shootProject.findFirst({
            where: {
              OR: [
                { id: inputProjectId },
                { projectId: inputProjectId },
              ],
            },
            include: { client: true, brand: true, product: true, calendarEvent: true },
          });
        }
        if (!project && calendarEvent?.shootId) {
          project = await this.prisma.shootProject.findUnique({
            where: { id: calendarEvent.shootId },
            include: { client: true, brand: true, product: true, calendarEvent: true },
          }).catch(() => null);
        }
        if (!project && calendarEvent?.shootProjects && calendarEvent.shootProjects.length > 0) {
          project = calendarEvent.shootProjects[0];
        }
        if (!project && verifiedClientId) {
          project = await this.prisma.shootProject.findFirst({
            where: { clientId: verifiedClientId },
            include: { client: true, brand: true, product: true, calendarEvent: true },
          }).catch(() => null);
        }

        // If still no project exists and creating Graphic Requirement as a Task, auto-create a container Shoot Project
        if (!project && verifiedClientId && verifiedBrandId) {
          const count = await this.prisma.shootProject.count();
          const autoProjId = `SP-${(count + 1).toString().padStart(6, '0')}`;
          project = await this.prisma.shootProject.create({
            data: {
              projectId: autoProjId,
              name: data.title || 'Graphic Requirement Project',
              shootType: 'INDOOR',
              shootDate: new Date(),
              shootLocation: 'Studio / Digital',
              clientId: verifiedClientId,
              brandId: verifiedBrandId,
              productId: verifiedProductId || null,
              status: 'TASK_ASSIGNED',
              createdById: managerUserId,
            },
            include: { client: true, brand: true, product: true },
          });
        }

        if (project) {
          const count = await this.prisma.graphicRequirement.count();
          const prefixSetting = await this.prisma.systemSetting.findUnique({
            where: { key: 'GRAPHIC_REQ_ID_PREFIX' },
          });
          const idPrefix = prefixSetting?.value?.trim() || 'GR-';
          const autoReqId = `${idPrefix}${(count + 1).toString().padStart(6, '0')}`;

          let validGrProductId: string | null = null;
          const rawGrProd = project.productId || verifiedProductId || data.productId;
          if (rawGrProd) {
            const p = await this.prisma.product.findUnique({ where: { id: rawGrProd } }).catch(() => null);
            if (p) validGrProductId = p.id;
          }

          let validGrCampaignId: string | null = null;
          const rawGrCamp = project.campaignId || data.campaignId || data.campaign;
          if (rawGrCamp) {
            const c = await this.prisma.campaign.findUnique({ where: { id: rawGrCamp } }).catch(() => null);
            if (c) validGrCampaignId = c.id;
          }

          const newGr = await this.prisma.graphicRequirement.create({
            data: {
              requirementId: autoReqId,
              name: data.title || `Graphic Requirement - ${project.name}`,
              description: data.description || '',
              objective: data.caption || data.objective || null,
              remarks: data.remarks || null,
              projectId: project.id,
              clientId: project.clientId || verifiedClientId || data.clientId,
              brandId: project.brandId || verifiedBrandId || data.brandId,
              productId: validGrProductId,
              campaignId: validGrCampaignId,
              calendarEventId: calendarEvent?.id || null,
              requirementType: data.contentType || data.requirementType || 'Poster',
              priority: data.priority || 'MEDIUM',
              estimatedCompletion: data.clientApprovalDeadline || data.dueDate ? new Date(data.clientApprovalDeadline || data.dueDate) : null,
              status: 'TASK_ASSIGNED',
              mediaManagerApproved: true,
              createdById: managerUserId,
            },
            include: { project: true },
          });



          graphicReqId = newGr.id;
          if (calendarEvent && !calendarEvent.graphicRequirementId) {
            await this.prisma.mediaCalendarEvent.update({
              where: { id: calendarEvent.id },
              data: { graphicRequirementId: newGr.id },
            }).catch(() => null);
          }
        }
      }

      scriptId = null;
    }

    // 5. Fallback Calendar Event resolution if not explicit
    if (!isExplicitShoot && !isExplicitScript && !isExplicitGraphicReq) {
      if (!project && inputProjectId) {
        project = await this.prisma.shootProject.findUnique({
          where: { id: inputProjectId },
          include: { client: true, brand: true, product: true },
        });
      }
      if (!calendarEvent && inputProjectId && !project) {
        calendarEvent = await this.prisma.mediaCalendarEvent.findFirst({
          where: { OR: [{ id: inputProjectId }, { eventId: inputProjectId }] },
          include: { client: true, brand: true, product: true, shootProjects: true, graphicReqs: true },
        });
      }
      if (calendarEvent) {
        if (!project && calendarEvent.shootId) {
          project = await this.prisma.shootProject.findUnique({
            where: { id: calendarEvent.shootId },
            include: { client: true, brand: true, product: true },
          }).catch(() => null);
        }
        if (!project && calendarEvent.shootProjects && calendarEvent.shootProjects.length > 0) {
          project = calendarEvent.shootProjects[0];
        }
      }
    }

    // Determine Source Type (DIRECT_TASK, CALENDAR_EVENT, GRAPHIC_REQUIREMENT, SHOOT_PROJECT, SCRIPT)
    let sourceType = 'DIRECT_TASK';
    let isMarketingApproved = true;

    if (isOtherType) {
      sourceType = 'DIRECT_TASK';
    } else if (isExplicitShoot || data.parentEntityType === 'PROJECT') {
      sourceType = 'SHOOT_PROJECT';
    } else if (isExplicitScript || scriptId || data.scriptId || data.parentEntityType === 'SCRIPT') {
      sourceType = 'SCRIPT';
    } else if (isExplicitGraphicReq || graphicReqId || data.graphicRequirementId || data.parentEntityType === 'GRAPHIC_REQ') {
      sourceType = 'GRAPHIC_REQUIREMENT';
    } else if (calendarEvent || rawCalendarEventId) {
      if (calendarEvent?.eventSource === 'SHOOT') {
        sourceType = 'SHOOT_PROJECT';
      } else if (calendarEvent?.eventSource === 'GRAPHIC_REQUIREMENT') {
        sourceType = 'GRAPHIC_REQUIREMENT';
      } else {
        sourceType = 'CALENDAR_EVENT';
      }
    } else if (project && !isOtherType) {
      sourceType = 'SHOOT_PROJECT';
    } else {
      sourceType = 'DIRECT_TASK';
    }

    // Business Rule Validation: Marketing Manager Approval ONLY applies to events originated from Event Creation (Media Calendar)
    const isEventCreationOrigin = Boolean(calendarEvent || rawCalendarEventId);
    if (isEventCreationOrigin && calendarEvent) {
      isMarketingApproved =
        ['APPROVED', 'CLIENT_APPROVED', 'SCHEDULED', 'PUBLISHED', 'READY', 'IN_PROGRESS', 'COMPLETED', 'TASK_ASSIGNED'].includes(calendarEvent.status) ||
        calendarEvent.approvalStatus === 'APPROVED';

      if (!isMarketingApproved && (calendarEvent.status === 'PENDING_MARKETING_APPROVAL' || calendarEvent.approvalStatus === 'PENDING_MARKETING_APPROVAL' || calendarEvent.status === 'REJECTED' || calendarEvent.status === 'CANCELLED')) {
        throw new BadRequestException(
          'Media Calendar Event must be approved by Marketing Manager before task assignment.'
        );
      }
    } else {
      // Direct Task Creation does NOT require Marketing Manager approval
      isMarketingApproved = true;
    }

    // Determine initial status based on sourceType and Marketing Approval
    let initialTaskStatus = data.assignedUserIds?.length ? TaskStatus.ASSIGNED : TaskStatus.PENDING;
    if (sourceType !== 'DIRECT_TASK' && isEventCreationOrigin && !isMarketingApproved) {
      initialTaskStatus = TaskStatus.PENDING_MARKETING_APPROVAL;
      if (data.assignedUserIds?.length) {
        throw new BadRequestException(
          'Marketing Manager approval is required before assigning staff to Event work.'
        );
      }
    } else {
      initialTaskStatus = data.assignedUserIds?.length ? TaskStatus.ASSIGNED : TaskStatus.APPROVED;
    }

    // Prevent duplicate task creation for the same source entity
    if (scriptId) {
      const existingScriptTask = await this.prisma.task.findFirst({
        where: {
          scriptId: scriptId,
          status: { notIn: [TaskStatus.COMPLETED, TaskStatus.CANCELLED] },
        },
      });
      if (existingScriptTask) {
        throw new BadRequestException(
          `This Script is already converted to task (${existingScriptTask.taskId}: "${existingScriptTask.title}"). Duplicate task creation is prevented.`
        );
      }
    }

    if (graphicReqId) {
      const existingGrTask = await this.prisma.task.findFirst({
        where: {
          graphicRequirementId: graphicReqId,
          status: { notIn: [TaskStatus.COMPLETED, TaskStatus.CANCELLED] },
        },
      });
      if (existingGrTask) {
        throw new BadRequestException(
          `This Graphic Requirement is already converted to task (${existingGrTask.taskId}: "${existingGrTask.title}"). Duplicate task creation is prevented.`
        );
      }
    }

    if (project?.id && !scriptId && !graphicReqId && data.isConvertFromProject && !data.title) {
      const existingProjTask = await this.prisma.task.findFirst({
        where: {
          projectId: project.id,
          scriptId: null,
          graphicRequirementId: null,
          sourceType: 'SHOOT_PROJECT',
          status: { notIn: [TaskStatus.COMPLETED, TaskStatus.CANCELLED] },
        },
      });
      if (existingProjTask) {
        throw new BadRequestException(
          `This Shoot Project is already converted to task (${existingProjTask.taskId}: "${existingProjTask.title}"). Duplicate task creation is prevented.`
        );
      }
    }

    // Final fallback verification if client/brand not yet set from input
    if (!verifiedClientId && project?.clientId) verifiedClientId = project.clientId;
    if (!verifiedBrandId && project?.brandId) verifiedBrandId = project.brandId;
    if (!verifiedProductId && project?.productId) verifiedProductId = project.productId;

    // Generate Task ID TSK-00000X safely with collision loop
    let taskCount = await this.prisma.task.count();
    let autoTaskId = `TSK-${(taskCount + 1).toString().padStart(6, '0')}`;
    let existingTask = await this.prisma.task.findUnique({ where: { taskId: autoTaskId } });
    while (existingTask) {
      taskCount++;
      autoTaskId = `TSK-${(taskCount + 1).toString().padStart(6, '0')}`;
      existingTask = await this.prisma.task.findUnique({ where: { taskId: autoTaskId } });
    }

    const task = await this.prisma.task.create({
      data: {
        taskId: autoTaskId,
        title: data.title,
        description: data.description || null,
        projectId: project?.id || null,
        scriptId: scriptId || null,
        graphicRequirementId: graphicReqId || null,
        clientId: verifiedClientId,
        brandId: verifiedBrandId,
        productId: verifiedProductId,
        priority: data.priority || Priority.MEDIUM,
        dueDate: new Date(data.dueDate || Date.now() + 86400000),
        estimatedHours: parseFloat(data.estimatedHours) || 2.0,
        status: initialTaskStatus,
        sourceType: isOtherType ? 'DIRECT_TASK' : sourceType,
        taskType: isOtherType ? 'OTHER' : (data.taskType || (sourceType === 'SHOOT_PROJECT' ? 'PROJECT' : 'PRODUCTION_TASK')),
        remarks: data.remarks || null,
      },
    });

    if (data.assignedUserIds && Array.isArray(data.assignedUserIds)) {
      for (const uId of data.assignedUserIds) {
        await this.prisma.taskAssignment.create({
          data: { taskId: task.id, userId: uId },
        }).catch(() => null);

        // Send notification to assigned staff referencing originating TASK entity
        await this.prisma.notification.create({
          data: {
            userId: uId,
            title: 'New Task Assigned',
            message: `You were assigned task ${task.taskId}: ${task.title}`,
            type: 'TASK_ASSIGNED',
            linkUrl: `/tasks`,
            eventType: 'TASK_ASSIGNED',
            entityType: 'TASK',
            entityId: task.id,
            entityCode: task.taskId,
            taskId: task.id,
            projectId: task.projectId,
          },
        }).catch(() => null);
      }
    }

    // 0. Process Equipment Reservations if equipmentIds passed
    if (data.equipmentIds && Array.isArray(data.equipmentIds) && data.equipmentIds.length > 0) {
      for (const eqId of data.equipmentIds) {
        if (task.projectId) {
          await this.prisma.equipmentReservation.create({
            data: {
              projectId: task.projectId,
              equipmentId: eqId,
              startDate: new Date(data.shootDate || data.dueDate || Date.now()),
              endDate: new Date(data.shootDate || data.dueDate || Date.now()),
              status: 'RESERVED',
            },
          }).catch(() => null);
        }
        await this.prisma.equipment.update({
          where: { id: eqId },
          data: { availability: 'RESERVED' },
        }).catch(() => null);
      }

      // Notify Technical Managers & Media Managers about equipment reservation on task creation
      try {
        const mgrs = await this.prisma.user.findMany({
          where: { role: { in: ['TECHNICAL_MANAGER', 'MEDIA_MANAGER', 'ADMINISTRATOR'] }, status: 'ACTIVE' },
          select: { id: true },
        });
        for (const mgr of mgrs) {
          await this.prisma.notification.create({
            data: {
              userId: mgr.id,
              title: 'Equipment Allocated for Task',
              message: `${data.equipmentIds.length} equipment item(s) allocated for task ${task.taskId}: "${task.title}".`,
              type: 'ALERT',
              category: 'EQUIPMENT',
              priority: 'HIGH',
              eventType: 'EQUIPMENT_ALLOCATED_FOR_TASK',
              entityType: 'TASK',
              linkUrl: '/equipment/monitoring',
              entityId: task.id,
              entityCode: task.taskId,
              taskId: task.id,
              projectId: task.projectId || undefined,
            },
          }).catch(() => null);
        }
      } catch (e) {
        console.error('Failed to notify Technical/Media Managers on equipment task allocation:', e);
      }
    }

    // 1. Log TASK_CREATED
    await this.logTimelineEvent(task.id, 'TASK_CREATED', `Task ${task.taskId} ('${task.title}') created`, managerUserId);

    // 2. Sync Shoot Project status to TASK_ASSIGNED
    if (task.projectId) {
      await this.prisma.shootProject.update({
        where: { id: task.projectId },
        data: { status: 'TASK_ASSIGNED' },
      }).catch(() => null);

      // Update associated MediaCalendarEvent
      await this.prisma.mediaCalendarEvent.updateMany({
        where: {
          OR: [
            { shootId: task.projectId },
            { id: task.projectId },
          ],
        },
        data: {
          status: 'TASK_ASSIGNED',
          approvalStatus: 'APPROVED',
        },
      }).catch(() => null);
    }

    // 3. Sync Graphic Requirement status to TASK_ASSIGNED or IN_PROGRESS
    const targetGrId = task.graphicRequirementId || graphicReqId;
    if (targetGrId) {
      let gId = targetGrId;
      const gReq = await this.prisma.graphicRequirement.findUnique({ where: { id: targetGrId } }).catch(() => null);
      if (!gReq) {
        const calEv = await this.prisma.mediaCalendarEvent.findUnique({ where: { id: targetGrId } }).catch(() => null);
        if (calEv?.graphicRequirementId) gId = calEv.graphicRequirementId;
      }
      if (gId) {
        await this.prisma.graphicRequirement.updateMany({
          where: { id: gId },
          data: {
            status: data.assignedUserIds?.length ? 'TASK_ASSIGNED' : 'IN_PROGRESS',
            mediaManagerApproved: true,
          },
        }).catch(() => null);

        // Update associated MediaCalendarEvent
        await this.prisma.mediaCalendarEvent.updateMany({
          where: {
            OR: [
              { graphicRequirementId: gId },
              { id: gId },
              { id: targetGrId },
            ],
          },
          data: {
            status: 'TASK_ASSIGNED',
            approvalStatus: 'APPROVED',
          },
        }).catch(() => null);
      }
    }

    // 4. If explicit calendarEventId passed or resolved, sync its status to TASK_ASSIGNED
    const explicitCalId = rawCalendarEventId || calendarEvent?.id || (sourceType === 'CALENDAR_EVENT' ? sanitizeId(data.parentId) : null);
    if (explicitCalId) {
      await this.prisma.mediaCalendarEvent.updateMany({
        where: {
          OR: [
            { id: explicitCalId },
            { eventId: explicitCalId },
          ],
        },
        data: {
          status: 'TASK_ASSIGNED',
          approvalStatus: 'APPROVED',
        },
      }).catch(() => null);
    }

    return task;
  }

  async reassign(taskId: string, assignedUserIds: string[], managerUserId: string, reason?: string) {
    if (assignedUserIds && Array.isArray(assignedUserIds)) {
      await this.validateActiveEmployees(assignedUserIds);
    }

    const task = await this.findOne(taskId);

    const prevNames = task.assignedEmployees.map((a) => a.user?.name || 'Staff Member');

    // Clear ALL existing assignments for this task (matching both task.id UUID and task.taskId code)
    await this.prisma.taskAssignment.deleteMany({
      where: {
        OR: [
          { taskId: task.id },
          { taskId: task.taskId },
        ],
      },
    });

    // Assign new employees exclusively with NOT_YET_ACCEPTED status
    for (const uId of assignedUserIds) {
      await this.prisma.taskAssignment.create({
        data: { taskId: task.id, userId: uId, acceptanceStatus: 'NOT_YET_ACCEPTED' },
      });

      await this.prisma.notification.create({
        data: {
          userId: uId,
          title: 'Task Reassigned to You',
          message: `Task ${task.taskId}: ${task.title} has been reassigned to you. Task acceptance required.`,
          type: 'TASK_REASSIGNED',
          linkUrl: `/tasks`,
          eventType: 'TASK_REASSIGNED',
          entityType: 'TASK',
          entityId: task.id,
          entityCode: task.taskId,
          taskId: task.id,
          projectId: task.projectId,
        },
      });
    }

    // Reset task status to ASSIGNED and progress to 0% so new assignee starts fresh working cycle
    await this.prisma.task.update({
      where: { id: task.id },
      data: {
        status: TaskStatus.ASSIGNED,
        completionPercentage: 0,
        technicalReviewApproved: false,
        mediaManagerApproved: false,
      },
    });

    const newUsers = await this.prisma.user.findMany({
      where: { id: { in: assignedUserIds } },
      select: { name: true },
    });
    const newNames = newUsers.map((u) => u.name).join(', ') || 'Staff Member';

    const defaultReason = prevNames.length > 0 ? `${prevNames.join(', ')} exceeded daily capacity.` : 'Reassigned by Media Manager.';
    const finalReason = reason && reason.trim() ? reason.trim() : defaultReason;

    const timelineDescription = prevNames.length > 0
      ? `Assigned to ${prevNames.join(', ')} → Reassigned to ${newNames}. Reason: ${finalReason}`
      : `Reassigned to ${newNames}. Reason: ${finalReason}`;

    // Log permanent timeline entry preserving complete activity history
    await this.logTimelineEvent(task.id, 'TASK_ASSIGNED', timelineDescription, managerUserId);

    return this.findOne(taskId);
  }

  private async verifyTaskAcceptance(task: any, user: any) {
    if (!user || user.role === Role.ADMINISTRATOR || (user.role as string) === 'ADMIN') {
      return;
    }

    const isAssigned =
      task.assignedToId === user.id ||
      (Array.isArray(task.assignedEmployees) &&
        task.assignedEmployees.some(
          (e: any) => e.userId === user.id || e.employeeId === user.id || e.user?.id === user.id,
        ));

    if (isAssigned) {
      const assignment = (task.assignedEmployees || []).find(
        (e: any) => e.userId === user.id || e.employeeId === user.id || e.user?.id === user.id,
      );

      const isAssignmentAccepted =
        (assignment &&
          (assignment.acceptanceStatus === 'ACCEPTED' || assignment.acceptanceStatus === 'Accepted')) ||
        (!assignment && task.status === TaskStatus.ACCEPTED);

      if (!isAssignmentAccepted) {
        throw new ForbiddenException(
          'Task acceptance is required before you can perform this action. The task is currently in read-only mode.',
        );
      }
    }
  }

  async updateProgress(
    taskId: string,
    data: { status?: TaskStatus; completionPercentage?: number; remarks?: string; dueDate?: string },
    user: any,
  ) {
    const task = await this.findOne(taskId);

    // Global Enforced Task Acceptance Gate
    await this.verifyTaskAcceptance(task, user);

    // Employees can only update tasks assigned to them, and cannot update while under review
    if (user.role === Role.STAFF || user.role === Role.SOCIAL_MEDIA_MANAGER) {
      const isAssigned = task.assignedEmployees.some((a: any) => a.userId === user.id);
      if (!isAssigned && user.role === Role.STAFF) {
        throw new ForbiddenException("Staff cannot update tasks assigned to other employees.");
      }

      const reviewStatuses = [
        TaskStatus.WAITING_FOR_TECHNICAL_REVIEW,
        TaskStatus.WAITING_FOR_MEDIA_REVIEW,
        TaskStatus.WAITING_FOR_REVIEW,
        TaskStatus.PENDING_MARKETING_APPROVAL,
        TaskStatus.COMPLETED,
      ];
      if (reviewStatuses.includes(task.status as any)) {
        throw new ForbiddenException("Task is currently undergoing review and in read-only mode. Updates are locked during review.");
      }
    }

    if (data.status === TaskStatus.WAITING_FOR_MEDIA_REVIEW) {
      if (!task.technicalReviewApproved && user.role !== Role.TECHNICAL_MANAGER && user.role !== Role.ADMINISTRATOR) {
        throw new BadRequestException('Task must pass Technical Manager review before moving to Media Manager Review.');
      }
    }

    if (data.status === TaskStatus.COMPLETED) {
      if (user.role === Role.STAFF && task.taskType !== 'REVISION' && task.sourceType !== 'REVISION') {
        throw new ForbiddenException('Staff members cannot directly mark tasks as Completed. Tasks must undergo Technical and Media Manager review.');
      }
      if (task.taskType !== 'REVISION' && task.sourceType !== 'REVISION' && !task.mediaManagerApproved && user.role !== Role.MEDIA_MANAGER && user.role !== Role.ADMINISTRATOR) {
        throw new BadRequestException('Task must pass Media Manager review before being marked as Completed.');
      }
    }

    const newDueDate = data.dueDate ? new Date(data.dueDate) : undefined;
    const isDeadlineChanged = newDueDate && newDueDate.getTime() !== new Date(task.dueDate).getTime();

    let finalCompletionPercentage = data.completionPercentage !== undefined ? data.completionPercentage : undefined;
    if (data.status === TaskStatus.ASSIGNED || (data.status as any) === 'REVISION_REQUESTED' || (data.status as any) === 'CHANGES_REQUESTED') {
      if (finalCompletionPercentage === undefined) {
        finalCompletionPercentage = 0;
      }
    } else if (data.status === TaskStatus.COMPLETED) {
      if (finalCompletionPercentage === undefined) {
        finalCompletionPercentage = 100;
      }
    }

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        status: data.status || undefined,
        completionPercentage: finalCompletionPercentage,
        remarks: data.remarks || undefined,
        dueDate: newDueDate || undefined,
      },
    });

    // 1. Notification & Log: Deadline Changed
    if (isDeadlineChanged) {
      await this.logTimelineEvent(task.id, 'PROGRESS_UPDATED', `Task deadline updated to ${newDueDate.toLocaleDateString()}`, user.id);
      await this.sendTaskNotifications(
        task.id,
        'Task Deadline Changed',
        `Deadline for Task ${task.taskId} ('${task.title}') changed to ${newDueDate.toLocaleDateString()}`,
        'TASK_DEADLINE_CHANGED',
      );
    }

    // 2. Log STATUS_CHANGED & Send Targeted Notifications
    if (data.status && data.status !== task.status) {
      await this.logTimelineEvent(task.id, 'STATUS_CHANGED', `Status changed from ${task.status} to ${data.status}`, user.id);

      // Notification: General Review Requested
      if (data.status === TaskStatus.WAITING_FOR_REVIEW) {
        await this.sendTaskNotifications(
          task.id,
          'Task Review Requested',
          `Task ${task.taskId} ('${task.title}') is ready for review (Status: Waiting for Review)`,
          'TASK_REVIEW_REQUESTED',
        );
      } else if (data.status === TaskStatus.WAITING_FOR_TECHNICAL_REVIEW) {
        await this.notifyManagersByRole(
          task,
          ['TECHNICAL_MANAGER', 'ADMINISTRATOR', 'ADMIN'],
          'Technical Review Requested ⚡',
          `Task ${task.taskId} ('${task.title}') is waiting for Technical Manager Review.`,
          'TECHNICAL_REVIEW_REQUESTED',
          '/approvals',
        );
      } else if (data.status === TaskStatus.WAITING_FOR_MEDIA_REVIEW) {
        await this.notifyManagersByRole(
          task,
          ['MEDIA_MANAGER', 'ADMINISTRATOR', 'ADMIN'],
          'Media Manager Approval Requested 🎬',
          `Task ${task.taskId} ('${task.title}') is waiting for Media Manager Approval.`,
          'MEDIA_REVIEW_REQUESTED',
          '/tasks',
        );
      } else if (data.status === TaskStatus.PENDING_MARKETING_APPROVAL) {
        await this.notifyManagersByRole(
          task,
          ['MARKETING_MANAGER', 'ADMINISTRATOR', 'ADMIN'],
          'Marketing Manager Approval Requested 📢',
          `Task ${task.taskId} ('${task.title}') is waiting for Marketing Manager Approval.`,
          'MARKETING_REVIEW_REQUESTED',
          '/tasks',
        );
      }
    }

    // 3. Log PROGRESS_UPDATED
    if (data.completionPercentage !== undefined && data.completionPercentage !== task.completionPercentage) {
      await this.logTimelineEvent(task.id, 'PROGRESS_UPDATED', `Progress updated from ${task.completionPercentage}% to ${data.completionPercentage}%`, user.id);
    }

    // 4. Notification & Log: Task Completed
    if (data.status === TaskStatus.COMPLETED) {
      await this.logTimelineEvent(task.id, 'COMPLETED', `Task completed (100% completion achieved)`, user.id);
      await this.sendTaskNotifications(
        task.id,
        'Task Completed',
        `Task ${task.taskId} ('${task.title}') has been marked as COMPLETED 🎉`,
        'TASK_COMPLETED',
      );

      // Automatically sync completion to linked Revision record if applicable
      if (task.revisionId) {
        await this.prisma.revision.update({
          where: { id: task.revisionId },
          data: {
            status: 'COMPLETED',
            resolvedAt: new Date(),
          },
        }).catch(() => null);
      } else {
        await this.prisma.revision.updateMany({
          where: { taskId: task.id },
          data: {
            status: 'COMPLETED',
            resolvedAt: new Date(),
          },
        }).catch(() => null);
      }
    }

    // Update parent project progress percentage (Only if task is linked to a parent project)
    if (task.projectId) {
      const allProjectTasks = await this.prisma.task.findMany({ where: { projectId: task.projectId } });
      if (allProjectTasks.length > 0) {
        const avgProgress = Math.round(
          allProjectTasks.reduce((acc, t) => acc + t.completionPercentage, 0) / allProjectTasks.length,
        );
        await this.prisma.shootProject.update({
          where: { id: task.projectId },
          data: { progressPercentage: avgProgress },
        });
      }
    }

    return updated;
  }

  async acknowledgeTaskAcceptance(taskId: string, user: any) {
    const task = await this.findOne(taskId);

    await this.prisma.taskAssignment.upsert({
      where: { taskId_userId: { taskId: task.id, userId: user.id } },
      create: {
        taskId: task.id,
        userId: user.id,
        acceptanceStatus: 'ACCEPTED',
        acceptedAt: new Date(),
      },
      update: {
        acceptanceStatus: 'ACCEPTED',
        acceptedAt: new Date(),
      },
    });

    // Update main task status to IN_PROGRESS upon acceptance
    await this.prisma.task.update({
      where: { id: task.id },
      data: {
        status: TaskStatus.IN_PROGRESS,
        completionPercentage: task.completionPercentage >= 100 || !task.completionPercentage ? 25 : Math.min(task.completionPercentage, 45),
      },
    });

    // Update any active revision in REVISION_REQUESTED state for this task to IN_PROGRESS
    await this.prisma.revision.updateMany({
      where: { taskId: task.id, status: 'REVISION_REQUESTED' },
      data: { status: 'IN_PROGRESS' },
    }).catch(() => null);

    // Log EMPLOYEE_ACCEPTED
    await this.logTimelineEvent(task.id, 'EMPLOYEE_ACCEPTED', `Task accepted and in progress by ${user.name}`, user.id);

    // Sync status and team assignment with parent shoot project
    if (task.projectId) {
      await this.prisma.projectAssignment.upsert({
        where: { projectId_userId: { projectId: task.projectId, userId: user.id } },
        create: { projectId: task.projectId, userId: user.id },
        update: {},
      }).catch(() => null);

      await this.prisma.shootProject.update({
        where: { id: task.projectId },
        data: { status: 'IN_PRODUCTION' },
      }).catch(() => null);
    }

    // Sync status with parent graphic requirement
    if (task.graphicRequirementId) {
      await this.prisma.graphicRequirement.update({
        where: { id: task.graphicRequirementId },
        data: { status: 'IN_PROGRESS' },
      }).catch(() => null);

      await this.prisma.graphicRequirementTimeline.create({
        data: {
          graphicRequirementId: task.graphicRequirementId,
          userId: user.id,
          event: 'ASSIGNED',
          description: `Assigned task ${task.taskId} acknowledged & ACCEPTED by ${user.name || user.email}. Requirement status updated to IN_PROGRESS.`,
        },
      }).catch(() => null);
    } else if (task.sourceType === 'GRAPHIC_REQUIREMENT' || task.taskType === 'GRAPHIC_REQUIREMENT' || task.taskType === 'GRAPHIC') {
      let targetGr = task.projectId
        ? await this.prisma.graphicRequirement.findFirst({ where: { projectId: task.projectId } })
        : null;

      if (!targetGr) {
        let projId = task.projectId;
        let projClientId = task.clientId;
        let projBrandId = task.brandId;
        let projProductId = task.productId;

        if (!projId || !projClientId || !projBrandId) {
          const fallbackProj = await this.prisma.shootProject.findFirst({
            where: task.clientId ? { clientId: task.clientId } : {},
          }).catch(() => null);
          if (fallbackProj) {
            projId = fallbackProj.id;
            if (!projClientId) projClientId = fallbackProj.clientId;
            if (!projBrandId) projBrandId = fallbackProj.brandId;
            if (!projProductId) projProductId = fallbackProj.productId;
          }
        }

        if (projId && projClientId && projBrandId) {
          const count = await this.prisma.graphicRequirement.count();
          const autoReqId = `GR-${(count + 1).toString().padStart(6, '0')}`;
          targetGr = await this.prisma.graphicRequirement.create({
            data: {
              requirementId: autoReqId,
              name: task.title,
              description: task.description || '',
              projectId: projId,
              clientId: projClientId,
              brandId: projBrandId,
              productId: projProductId || null,
              priority: task.priority || 'MEDIUM',
              status: 'IN_PROGRESS',
              createdById: user.id,
            },
          }).catch(() => null);
        }
      }

      if (targetGr) {
        await this.prisma.task.update({
          where: { id: task.id },
          data: { graphicRequirementId: targetGr.id },
        }).catch(() => null);
        await this.prisma.graphicRequirement.update({
          where: { id: targetGr.id },
          data: { status: 'IN_PROGRESS' },
        }).catch(() => null);
      }
    }

    // If this is a real script task, sync script status
    if (task.scriptId && task.sourceType === 'SCRIPT' && !task.projectId && !task.graphicRequirementId) {
      try {
        await this.prisma.script.update({
          where: { id: task.scriptId },
          data: {
            status: 'IN_PROGRESS',
            preTechnicalReviewStatus: 'IN_PROGRESS',
          },
        }).catch(() => null);

        await this.prisma.scriptAssignment.upsert({
          where: { scriptId_userId_responsibility: { scriptId: task.scriptId, userId: user.id, responsibility: 'SCRIPTWRITER' } },
          create: { scriptId: task.scriptId, userId: user.id, responsibility: 'SCRIPTWRITER' },
          update: { assignedAt: new Date() },
        }).catch(() => null);

        await this.prisma.scriptTimeline.create({
          data: {
            scriptId: task.scriptId,
            triggeredById: user.id,
            event: 'TASK_ACCEPTED',
            description: `Assigned task ${task.taskId} acknowledged & ACCEPTED by ${user.name || user.email}. Script status updated to IN_PROGRESS.`,
          },
        }).catch(() => null);
      } catch (scriptErr) {
        console.error('Non-blocking script update error during task acceptance:', scriptErr);
      }
    }

    return this.findOne(task.id);
  }

  async startProduction(taskId: string, user: any) {
    const task = await this.findOne(taskId);
    
    // Check Marketing Approval gating for event-bound work
    if (task.sourceType !== 'DIRECT_TASK' && task.status === TaskStatus.PENDING_MARKETING_APPROVAL) {
      throw new BadRequestException('Marketing Manager approval is required before starting production.');
    }

    const assignment = task.assignedEmployees?.find((a: any) => a.userId === user.id);
    const isAssigned = Boolean(assignment);
    const isAccepted = assignment?.acceptanceStatus === 'ACCEPTED' || task.status === TaskStatus.ACCEPTED;

    if (user.role === Role.STAFF && !isAssigned) {
      throw new ForbiddenException('Staff members can only start production on tasks assigned to them.');
    }

    if (!isAccepted && task.status !== TaskStatus.IN_PROGRESS) {
      throw new BadRequestException('Task must be explicitly accepted by assigned employee before production can start.');
    }

    const updated = await this.prisma.task.update({
      where: { id: task.id },
      data: {
        status: TaskStatus.IN_PROGRESS,
        completionPercentage: task.completionPercentage >= 100 || !task.completionPercentage ? 35 : Math.min(task.completionPercentage, 45),
      },
    });

    if (task.graphicRequirementId) {
      await this.prisma.graphicRequirement.updateMany({
        where: { id: task.graphicRequirementId },
        data: { status: 'IN_PROGRESS' },
      }).catch(() => null);
    }

    if (task.scriptId) {
      await this.prisma.script.updateMany({
        where: {
          id: task.scriptId,
          status: { in: ['DRAFT', 'READY', 'ASSIGNED', 'IN_PRODUCTION'] },
        },
        data: {
          status: 'IN_PROGRESS',
          preTechnicalReviewStatus: 'IN_PROGRESS',
        },
      }).catch(() => null);
    }

    await this.logTimelineEvent(task.id, 'PROGRESS_UPDATED', `Production started by ${user.name} (Progress: 45%)`, user.id);
    return updated;
  }

  async addRemark(taskId: string, message: string, user: any) {
    if (!message || !message.trim()) {
      throw new BadRequestException('Remark message cannot be empty');
    }

    const task = await this.findOne(taskId);
    await this.verifyTaskAcceptance(task, user);

    if (user.role === Role.STAFF) {
      const isAssigned = task.assignedEmployees.some((a) => a.userId === user.id);
      if (!isAssigned) {
        throw new ForbiddenException("Staff cannot add remarks to tasks assigned to others.");
      }

      const reviewStatuses = [
        TaskStatus.WAITING_FOR_TECHNICAL_REVIEW,
        TaskStatus.WAITING_FOR_MEDIA_REVIEW,
        TaskStatus.WAITING_FOR_REVIEW,
        TaskStatus.PENDING_MARKETING_APPROVAL,
        TaskStatus.COMPLETED,
      ];
      if (reviewStatuses.includes(task.status as any)) {
        throw new ForbiddenException("Task is currently undergoing review and in read-only mode. Remarks are locked for staff during review.");
      }
    }

    const remark = await this.prisma.taskRemark.create({
      data: {
        taskId: task.id,
        userId: user.id,
        message: message.trim(),
      },
      include: {
        user: { select: { id: true, name: true, role: true, avatarUrl: true } },
      },
    });

    // Update main task summary remarks
    await this.prisma.task.update({
      where: { id: task.id },
      data: { remarks: message.trim() },
    });

    // 7. Log REMARK_ADDED
    await this.logTimelineEvent(task.id, 'REMARK_ADDED', `Remark recorded by ${user.name}: "${message.trim()}"`, user.id);

    return remark;
  }

  async uploadDeliverable(taskId: string, data: { fileUrl: string; fileName?: string }, user: any) {
    if (!data.fileUrl || !data.fileUrl.trim()) {
      throw new BadRequestException('Deliverable file URL is required');
    }

    const task = await this.findOne(taskId);
    await this.verifyTaskAcceptance(task, user);

    // Employees can only upload deliverables after task has been moved to IN_PROGRESS
    const allowedStatusesForUpload = [
      TaskStatus.IN_PROGRESS,
      TaskStatus.ON_HOLD,
      TaskStatus.WAITING_FOR_TECHNICAL_REVIEW,
      TaskStatus.WAITING_FOR_MEDIA_REVIEW,
      TaskStatus.WAITING_FOR_REVIEW,
      TaskStatus.COMPLETED,
    ];

    if (!allowedStatusesForUpload.includes(task.status as any)) {
      throw new BadRequestException(
        'Deliverables can only be uploaded after the task has been accepted and moved to IN PROGRESS status.'
      );
    }

    // Employees cannot upload deliverables while under review
    if (user.role === Role.STAFF) {
      const isAssigned = task.assignedEmployees.some((a) => a.userId === user.id);
      if (!isAssigned) {
        throw new ForbiddenException("Staff cannot upload deliverables to tasks assigned to others.");
      }

      const reviewStatuses = [
        TaskStatus.WAITING_FOR_TECHNICAL_REVIEW,
        TaskStatus.WAITING_FOR_MEDIA_REVIEW,
        TaskStatus.WAITING_FOR_REVIEW,
        TaskStatus.PENDING_MARKETING_APPROVAL,
        TaskStatus.COMPLETED,
      ];
      if (reviewStatuses.includes(task.status as any)) {
        throw new ForbiddenException("Task is currently undergoing review and in read-only mode. Deliverable uploads are locked for staff during review.");
      }
    }

    const newVersion = (task.activeDeliverableVersion || 0) + 1;
    const fileName = data.fileName || `deliverable_v${newVersion}`;

    // 1. Record in permanent deliverable history
    const historyEntry = await this.prisma.taskDeliverableHistory.create({
      data: {
        taskId: task.id,
        userId: user.id,
        fileUrl: data.fileUrl.trim(),
        fileName,
        version: newVersion,
      },
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
    });

    // 2. Overwrite / replace active deliverable slot on Task
    const updatedTask = await this.prisma.task.update({
      where: { id: task.id },
      data: {
        activeDeliverableUrl: data.fileUrl.trim(),
        activeDeliverableFileName: fileName,
        activeDeliverableVersion: newVersion,
      },
    });

    // 3. Log FILE_UPLOADED
    await this.logTimelineEvent(task.id, 'FILE_UPLOADED', `Work deliverable Version v${newVersion} (${fileName}) uploaded by ${user.name}`, user.id);

    return {
      task: updatedTask,
      historyEntry,
    };
  }

  async requestTechnicalReview(taskId: string, user: any) {
    const task = await this.findOne(taskId);
    await this.verifyTaskAcceptance(task, user);

    if (user.role === Role.STAFF) {
      const isAssigned = task.assignedEmployees.some((a) => a.userId === user.id);
      if (!isAssigned) {
        throw new ForbiddenException("Staff cannot request technical review for tasks assigned to others.");
      }
    }

    if (!task.activeDeliverableUrl && !task.scriptId) {
      throw new BadRequestException('Please upload a work deliverable output before requesting Technical Review.');
    }

    if (task.status === TaskStatus.WAITING_FOR_TECHNICAL_REVIEW) {
      throw new BadRequestException('Task is already submitted for Technical Review.');
    }

    // 1. Advance status to WAITING_FOR_TECHNICAL_REVIEW and progress to 50%
    const updatedTask = await this.prisma.task.update({
      where: { id: task.id },
      data: {
        status: TaskStatus.WAITING_FOR_TECHNICAL_REVIEW,
        completionPercentage: 50,
      },
    });

    // 2. Log timeline event
    await this.logTimelineEvent(
      task.id,
      'STATUS_CHANGED',
      `Technical Review requested by ${user.name} (Deliverable: ${task.activeDeliverableFileName || 'v' + task.activeDeliverableVersion})`,
      user.id,
    );

    // 3. Create formal Approval record for Technical Manager review
    await this.prisma.approval.create({
      data: {
        entityType: 'TASK',
        entityId: task.id,
        approvalType: 'TECHNICAL_REVIEW',
        targetRole: 'TECHNICAL_MANAGER',
        requestedById: user.id,
        projectId: task.projectId || null,
        status: 'PENDING',
        remarks: `Work deliverable (${task.activeDeliverableFileName || 'v' + task.activeDeliverableVersion}) submitted for Technical Review by ${user.name}. Approval required.`,
      },
    }).catch(() => null);

    // 4. Send Notification specifically to Technical Managers
    const technicalManagers = await this.prisma.user.findMany({
      where: { role: 'TECHNICAL_MANAGER', status: 'ACTIVE' },
      select: { id: true },
    });
    for (const tm of technicalManagers) {
      await this.prisma.notification.create({
        data: {
          userId: tm.id,
          title: 'Technical Review & Approval Requested ⚡',
          message: `Staff member ${user.name} requested Technical Review for Task ${task.taskId} ('${task.title}'). Technical approval required.`,
          type: 'ALERT',
          category: 'APPROVAL',
          priority: 'HIGH',
          linkUrl: `/approvals`,
          eventType: 'TECHNICAL_REVIEW_REQUESTED',
          entityType: 'TASK',
          entityId: task.id,
          entityCode: task.taskId,
          taskId: task.id,
          projectId: task.projectId || undefined,
        },
      }).catch(() => null);
    }

    await this.sendTaskNotifications(
      task.id,
      'Technical Review Requested',
      `Technical Review requested for Task ${task.taskId} ('${task.title}'). Status moved to Technical Review.`,
      'TECHNICAL_REVIEW_REQUESTED',
    );

    if (task.scriptId) {
      await this.prisma.script.updateMany({
        where: { id: task.scriptId },
        data: { status: 'WAITING_FOR_TECHNICAL_REVIEW', technicalReviewApproved: false },
      }).catch(() => null);
    }

    if (task.graphicRequirementId) {
      await this.prisma.graphicRequirement.updateMany({
        where: { id: task.graphicRequirementId },
        data: { status: 'WAITING_FOR_TECHNICAL_REVIEW', technicalReviewApproved: false },
      }).catch(() => null);
    }

    if (task.projectId) {
      await this.prisma.shootProject.updateMany({
        where: { id: task.projectId },
        data: { status: 'WAITING_FOR_TECHNICAL_REVIEW' },
      }).catch(() => null);
    }

    return updatedTask;
  }

  async updateEmployeeCapacity(userId: string, dailyCapacityHours: number, managerUserId: string) {
    if (!dailyCapacityHours || dailyCapacityHours <= 0) {
      throw new BadRequestException('Daily capacity hours must be greater than 0');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employeeProfile: true },
    });
    if (!user) throw new NotFoundException('User not found');

    if (user.employeeProfile) {
      await this.prisma.employeeProfile.update({
        where: { id: user.employeeProfile.id },
        data: { dailyCapacityHours: parseFloat(dailyCapacityHours.toString()) },
      });
    } else {
      await this.prisma.employeeProfile.create({
        data: {
          userId: user.id,
          designation: 'Staff Member',
          dailyCapacityHours: parseFloat(dailyCapacityHours.toString()),
        },
      });
    }

    await this.prisma.activityLog.create({
      data: {
        userId: managerUserId,
        action: 'UPDATE_EMPLOYEE_CAPACITY',
        entity: 'User',
        entityId: userId,
        description: `Updated ${user.name}'s configurable daily capacity to ${dailyCapacityHours} Hours/day`,
      },
    });

    return this.getCapacityOverview();
  }

  async getReassignmentRecommendations(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            assignedTeam: true,
          },
        },
        assignedEmployees: {
          include: {
            user: {
              include: { employeeProfile: { include: { department: true } } },
            },
          },
        },
      },
    });

    if (!task) throw new NotFoundException('Task not found');

    const currentlyAssignedUserIds = new Set(task.assignedEmployees.map((a) => a.userId));
    const capacityOverview = await this.getCapacityOverview();

    // Fetch all active staff users with employee profiles & departments
    const allUsers = await this.prisma.user.findMany({
      where: { isArchived: false, role: { in: ['STAFF', 'TECHNICAL_MANAGER', 'SOCIAL_MEDIA_MANAGER', 'MEDIA_MANAGER'] } },
      include: {
        employeeProfile: { include: { department: true } },
        projectAssignments: true,
      },
    });

    const recommendations = allUsers
      .filter((u) => !currentlyAssignedUserIds.has(u.id))
      .map((user) => {
        const userCap = capacityOverview.find((c) => c.userId === user.id) || {
          assignedHours: 0,
          capacityHours: user.employeeProfile?.dailyCapacityHours || 8.0,
          remainingCapacity: user.employeeProfile?.dailyCapacityHours || 8.0,
          workloadPercentage: 0,
          status: 'Available',
          isOverloaded: false,
        };

        const matchReasons: string[] = [];
        let score = 0;

        // 1. Available Capacity (Max 30 pts)
        const taskEst = task.estimatedHours || 2.0;
        if (userCap.remainingCapacity >= taskEst) {
          score += 30;
          matchReasons.push(`Sufficient Free Capacity: ${userCap.remainingCapacity}h free (Needs ${taskEst}h)`);
        } else if (userCap.remainingCapacity > 0) {
          const capScore = Math.round((userCap.remainingCapacity / taskEst) * 30);
          score += capScore;
          matchReasons.push(`Partial Free Capacity: ${userCap.remainingCapacity}h free`);
        } else {
          matchReasons.push(`No Remaining Daily Capacity`);
        }

        // 2. Current Workload Status (Max 20 pts)
        if (userCap.status === 'Available') {
          score += 20;
          matchReasons.push(`Light Workload (${userCap.workloadPercentage}% Utilized)`);
        } else if (userCap.status === 'Normal') {
          score += 10;
          matchReasons.push(`Normal Workload (${userCap.workloadPercentage}% Utilized)`);
        } else if (userCap.isOverloaded) {
          score -= 20;
          matchReasons.push(`Currently Overloaded (${userCap.workloadPercentage}%)`);
        }

        // 3. Department Matching (Max 25 pts)
        const primaryDept = user.employeeProfile?.department?.name;
        const assignedDeptNames = task.assignedEmployees.map((a) => a.user?.employeeProfile?.department?.name).filter(Boolean);
        if (primaryDept && assignedDeptNames.includes(primaryDept)) {
          score += 25;
          matchReasons.push(`Same Department (${primaryDept})`);
        } else if (primaryDept) {
          matchReasons.push(`Department: ${primaryDept}`);
        }

        // 4. Existing Project Assignment (Max 15 pts)
        const isProjectMember = user.projectAssignments.some((pa) => pa.projectId === task.projectId);
        if (isProjectMember) {
          score += 15;
          matchReasons.push(`Already Assigned to Project (${task.project?.name || 'Shoot Project'})`);
        }

        // 5. Priority & Deadline Alignment (Max 10 pts)
        const taskPriority = task.priority || 'MEDIUM';
        if ((taskPriority === 'CRITICAL' || taskPriority === 'HIGH') && userCap.status === 'Available') {
          score += 10;
          matchReasons.push(`High Availability for ${taskPriority} Priority Task`);
        }

        const matchScorePercentage = Math.min(100, Math.max(0, score));

        return {
          userId: user.id,
          name: user.name,
          avatarUrl: user.avatarUrl,
          designation: user.employeeProfile?.designation || 'Staff Member',
          department: user.employeeProfile?.department?.name || 'General',
          skills: (user.employeeProfile as any)?.skills || [],
          capacityHours: userCap.capacityHours,
          assignedHours: userCap.assignedHours,
          remainingCapacity: userCap.remainingCapacity,
          workloadPercentage: userCap.workloadPercentage,
          workloadStatus: userCap.status,
          isOverloaded: userCap.isOverloaded,
          isProjectMember,
          matchScorePercentage,
          matchReasons,
        };
      })
      .sort((a, b) => b.matchScorePercentage - a.matchScorePercentage);

    return {
      task: {
        id: task.id,
        taskId: task.taskId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueDate: task.dueDate,
        estimatedHours: task.estimatedHours,
        status: task.status,
        projectName: task.project?.name,
        assignedEmployees: task.assignedEmployees.map((a) => ({
          userId: a.userId,
          name: a.user?.name,
          designation: a.user?.employeeProfile?.designation,
        })),
      },
      recommendations,
    };
  }

  async getOverloadedEmployeeAlternatives(overloadedUserId: string) {
    let user = await this.prisma.user.findUnique({
      where: { id: overloadedUserId },
      include: {
        employeeProfile: { include: { department: true } },
        projectAssignments: {
          include: {
            project: { select: { id: true, name: true, status: true, clientId: true, brandId: true, productId: true } },
          },
        },
      },
    });

    if (!user) {
      user = await this.prisma.user.findFirst({
        where: { role: Role.STAFF },
        include: {
          employeeProfile: { include: { department: true } },
          projectAssignments: {
            include: {
              project: { select: { id: true, name: true, status: true, clientId: true, brandId: true, productId: true } },
            },
          },
        },
      });
    }

    if (!user) {
      user = await this.prisma.user.findFirst({
        include: {
          employeeProfile: { include: { department: true } },
          projectAssignments: {
            include: {
              project: { select: { id: true, name: true, status: true, clientId: true, brandId: true, productId: true } },
            },
          },
        },
      });
    }

    if (!user) {
      return {
        overloadedEmployee: {
          userId: overloadedUserId,
          name: 'Staff Member',
          designation: 'Media Producer',
          department: 'Production',
          capacityHours: 8.0,
          assignedHours: 12.0,
          workloadPercentage: 150,
          activeTaskCount: 1,
        },
        taskAlternatives: [],
      };
    }

    // 1. Fetch tasks directly assigned to this user via TaskAssignment
    let activeTasks = await this.prisma.task.findMany({
      where: {
        assignedEmployees: { some: { userId: overloadedUserId } },
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
      include: {
        project: { select: { id: true, name: true } },
        assignedEmployees: { include: { user: true } },
      },
    });

    // 2. Fallback: If no direct TaskAssignment records exist for this user, check tasks for projects assigned to this user
    if (activeTasks.length === 0 && user.projectAssignments.length > 0) {
      const userProjectIds = user.projectAssignments.map((pa) => pa.projectId).filter(Boolean);
      activeTasks = await this.prisma.task.findMany({
        where: {
          projectId: { in: userProjectIds },
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
          assignedEmployees: { some: { userId: overloadedUserId } },
        },
        include: {
          project: { select: { id: true, name: true } },
          assignedEmployees: { include: { user: true } },
        },
      });
    }

    // If the user has no active assigned tasks (all reassigned or completed), return clean response
    if (activeTasks.length === 0) {
      const capacityOverview = await this.getCapacityOverview();
      const userCap = capacityOverview.find((c) => c.userId === overloadedUserId);
      return {
        overloadedEmployee: {
          userId: user.id,
          name: user.name,
          designation: user.employeeProfile?.designation || 'Staff Member',
          department: user.employeeProfile?.department?.name || 'General',
          assignedHours: userCap?.assignedHours || 0,
          capacityHours: userCap?.capacityHours || 8.0,
          workloadPercentage: userCap?.workloadPercentage || 0,
          workloadStatus: userCap?.status || 'Available',
          activeTaskCount: 0,
        },
        taskAlternatives: [],
      };
    }

    // Get recommendations for each active task of the overloaded employee
    const taskAlternatives = await Promise.all(
      activeTasks.map(async (t) => {
        const rec = await this.getReassignmentRecommendations(t.id);
        return rec;
      })
    );

    const capacityOverview = await this.getCapacityOverview();
    const userCap = capacityOverview.find((c) => c.userId === overloadedUserId);

    return {
      overloadedEmployee: {
        userId: user.id,
        name: user.name,
        designation: user.employeeProfile?.designation || 'Staff Member',
        department: user.employeeProfile?.department?.name || 'General',
        assignedHours: userCap?.assignedHours || 0,
        capacityHours: userCap?.capacityHours || 8.0,
        workloadPercentage: userCap?.workloadPercentage || 100,
        workloadStatus: userCap?.status || 'Overloaded',
        activeTaskCount: activeTasks.length,
      },
      taskAlternatives,
    };
  }
}
