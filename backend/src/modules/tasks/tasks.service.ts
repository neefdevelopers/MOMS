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
        project: { select: { id: true, projectId: true, name: true } },
        script: { select: { id: true, scriptId: true, name: true } },
        graphicRequirement: { select: { id: true, requirementId: true, name: true } },
        client: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true, shortCode: true } },
        product: { select: { id: true, name: true, productCode: true } },
        assignedEmployees: { include: { user: { include: { employeeProfile: true } } } },
        remarksHistory: { include: { user: true }, orderBy: { createdAt: 'desc' } },
        deliverableHistory: { include: { user: true }, orderBy: { version: 'desc' } },
        timeline: { include: { user: true }, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { dueDate: 'asc' },
    });

    return this.syncTaskSourceTypes(tasks);
  }

  private async syncTaskSourceTypes(tasks: any[]) {
    if (!tasks || !tasks.length) return tasks;
    for (const t of tasks) {
      let computed = t.sourceType || 'DIRECT_TASK';
      if (t.graphicRequirementId || t.graphicRequirement) {
        computed = 'GRAPHIC_REQUIREMENT';
      } else if (t.projectId || t.scriptId) {
        computed = 'CALENDAR_EVENT';
      } else {
        computed = 'DIRECT_TASK';
      }

      // Automatic Task Status & Completion Percentage Synchronization with Linked Script
      if (t.script) {
        let mappedTaskStatus = t.status;
        let mappedProgress = t.completionPercentage;
        const norm = (t.script.status || '').toUpperCase().replace(/\s+/g, '_');

        if (norm.includes('REVISION') || norm.includes('CHANGES') || norm.includes('REJECTED')) {
          mappedTaskStatus = TaskStatus.REVISION_REQUESTED;
        } else if (norm === 'COMPLETED') {
          mappedTaskStatus = TaskStatus.COMPLETED;
          mappedProgress = 100;
        } else if (norm === 'WAITING_FOR_TECHNICAL_REVIEW') {
          mappedTaskStatus = TaskStatus.WAITING_FOR_TECHNICAL_REVIEW;
          mappedProgress = Math.max(mappedProgress, 50);
        } else if (norm === 'WAITING_FOR_MEDIA_REVIEW') {
          mappedTaskStatus = TaskStatus.WAITING_FOR_MEDIA_REVIEW;
          mappedProgress = Math.max(mappedProgress, 75);
        } else if (norm === 'PENDING_MARKETING_APPROVAL' || norm === 'WAITING_FOR_MARKETING_APPROVAL') {
          mappedTaskStatus = TaskStatus.WAITING_FOR_MEDIA_REVIEW;
          mappedProgress = Math.max(mappedProgress, 80);
        } else if (norm === 'APPROVED') {
          mappedTaskStatus = TaskStatus.APPROVED;
          mappedProgress = Math.max(mappedProgress, 85);
        } else if (norm === 'IN_PRODUCTION' || norm === 'DRAFT' || norm === 'ACCEPTED') {
          if (t.status === TaskStatus.ACCEPTED) {
            mappedTaskStatus = TaskStatus.ACCEPTED;
          } else if (t.status !== TaskStatus.PENDING && t.status !== TaskStatus.ASSIGNED) {
            mappedTaskStatus = TaskStatus.IN_PROGRESS;
          }
        }

        if (mappedTaskStatus !== t.status || mappedProgress !== t.completionPercentage) {
          await this.prisma.task.update({
            where: { id: t.id },
            data: { status: mappedTaskStatus, completionPercentage: mappedProgress },
          }).catch(() => null);
          t.status = mappedTaskStatus;
          t.completionPercentage = mappedProgress;
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
    let task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        project: true,
        script: true,
        graphicRequirement: true,
        client: true,
        brand: true,
        product: true,
        assignedEmployees: { include: { user: true } },
        remarksHistory: { include: { user: true }, orderBy: { createdAt: 'desc' } },
        deliverableHistory: { include: { user: true }, orderBy: { version: 'desc' } },
        timeline: { include: { user: true }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!task) {
      task = await this.prisma.task.findFirst({
        where: { OR: [{ id }, { taskId: id }] },
        include: {
          project: true,
          script: true,
          graphicRequirement: true,
          client: true,
          brand: true,
          product: true,
          assignedEmployees: { include: { user: true } },
          remarksHistory: { include: { user: true }, orderBy: { createdAt: 'desc' } },
          deliverableHistory: { include: { user: true }, orderBy: { version: 'desc' } },
          timeline: { include: { user: true }, orderBy: { createdAt: 'desc' } },
        },
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

    const sanitizeId = (id: any) => (typeof id === 'string' && id.trim() !== '' && id !== 'null' && id !== 'undefined' ? id.trim() : null);

    const inputProjectId = sanitizeId(data.projectId);
    const inputScriptId = sanitizeId(data.scriptId);
    const inputGraphicReqId = sanitizeId(data.graphicRequirementId);

    let project: any = null;
    let scriptId: string | null = null;
    let graphicReqId: string | null = null;

    if (data.parentEntityType === 'SCRIPT' || (inputScriptId && data.parentEntityType !== 'PROJECT')) {
      const script = inputScriptId
        ? await this.prisma.script.findUnique({
            where: { id: inputScriptId },
            include: { project: true },
          })
        : null;
      if (script) {
        scriptId = script.id;
        project = script.project;
      }
    } else if (data.parentEntityType === 'GRAPHIC_REQ' || (inputGraphicReqId && data.parentEntityType !== 'PROJECT')) {
      const graphicReq = inputGraphicReqId
        ? await this.prisma.graphicRequirement.findUnique({
            where: { id: inputGraphicReqId },
            include: { project: true },
          })
        : null;
      if (graphicReq) {
        graphicReqId = graphicReq.id;
        project = graphicReq.project;
      }
    } else if (inputProjectId) {
      project = await this.prisma.shootProject.findUnique({
        where: { id: inputProjectId },
        include: { client: true, brand: true, product: true },
      });
    }

    // Enforce Business Rule: Shoot Projects must be APPROVED by Marketing Manager before task assignment (if bound to a project)
    if (project && !graphicReqId && !scriptId) {
      const allowedStatuses = ['APPROVED', 'TASK_ASSIGNED', 'IN_PRODUCTION', 'TECHNICAL_REVIEW', 'MEDIA_MANAGER_REVIEW', 'CLIENT_CONFIRMATION', 'COMPLETED'];
      if (!allowedStatuses.includes(project.status)) {
        throw new BadRequestException(
          'Project Shoot must be approved by Marketing Manager before task assignment.'
        );
      }
    }

    if (graphicReqId) {
      const gReq = await this.prisma.graphicRequirement.findUnique({
        where: { id: graphicReqId },
        include: { calendarEvent: true },
      });
      if (gReq) {
        const isApproved =
          ['APPROVED', 'CLIENT_APPROVED', 'SCHEDULED', 'PUBLISHED', 'READY', 'IN_PROGRESS', 'COMPLETED', 'TASK_ASSIGNED'].includes(gReq.status) ||
          (gReq.calendarEvent && ['APPROVED', 'CLIENT_APPROVED', 'SCHEDULED', 'PUBLISHED', 'READY', 'IN_PROGRESS', 'COMPLETED', 'TASK_ASSIGNED'].includes(gReq.calendarEvent.status));

        if (!isApproved && (gReq.status === 'PENDING_MARKETING_APPROVAL' || gReq.status === 'REJECTED' || gReq.status === 'CANCELLED')) {
          throw new BadRequestException(
            'Graphic Requirement must be approved by Marketing Manager before task assignment.'
          );
        }
      } else {
        const calEvent = await this.prisma.mediaCalendarEvent.findUnique({
          where: { id: graphicReqId },
        });
        if (calEvent) {
          const isCalApproved = ['APPROVED', 'CLIENT_APPROVED', 'SCHEDULED', 'PUBLISHED', 'READY', 'IN_PROGRESS', 'COMPLETED', 'TASK_ASSIGNED'].includes(calEvent.status);
          if (!isCalApproved && (calEvent.status === 'PENDING_MARKETING_APPROVAL' || calEvent.status === 'REJECTED' || calEvent.status === 'CANCELLED')) {
            throw new BadRequestException(
              'Graphic Requirement must be approved by Marketing Manager before task assignment.'
            );
          }
        }
      }
    }

    // Determine Source Type (DIRECT_TASK, CALENDAR_EVENT, GRAPHIC_REQUIREMENT)
    let sourceType = 'DIRECT_TASK';
    let isMarketingApproved = true;

    if (data.calendarEventId || (graphicReqId && !data.graphicRequirementId)) {
      const isCal = await this.prisma.mediaCalendarEvent.findFirst({
        where: { OR: [{ id: graphicReqId || '' }, { id: data.calendarEventId || '' }] },
      });
      if (isCal) {
        sourceType = 'CALENDAR_EVENT';
        isMarketingApproved = ['APPROVED', 'CLIENT_APPROVED', 'SCHEDULED', 'PUBLISHED', 'READY', 'IN_PROGRESS', 'COMPLETED', 'TASK_ASSIGNED'].includes(isCal.status);
      }
    }

    if (sourceType === 'DIRECT_TASK' && (graphicReqId || data.graphicRequirementId)) {
      const targetGr = graphicReqId || data.graphicRequirementId;
      const gReq = await this.prisma.graphicRequirement.findUnique({
        where: { id: targetGr },
        include: { calendarEvent: true },
      });
      if (gReq) {
        sourceType = 'GRAPHIC_REQUIREMENT';
        isMarketingApproved =
          ['APPROVED', 'CLIENT_APPROVED', 'SCHEDULED', 'PUBLISHED', 'READY', 'IN_PROGRESS', 'COMPLETED', 'TASK_ASSIGNED'].includes(gReq.status) ||
          (gReq.calendarEvent && ['APPROVED', 'CLIENT_APPROVED', 'SCHEDULED', 'PUBLISHED', 'READY', 'IN_PROGRESS', 'COMPLETED'].includes(gReq.calendarEvent.status));
      }
    }

    // Determine initial status based on sourceType and Marketing Approval
    let initialTaskStatus = data.assignedUserIds?.length ? TaskStatus.ASSIGNED : TaskStatus.PENDING;
    if (sourceType !== 'DIRECT_TASK') {
      if (!isMarketingApproved) {
        initialTaskStatus = TaskStatus.PENDING_MARKETING_APPROVAL;
        if (data.assignedUserIds?.length) {
          throw new BadRequestException(
            'Marketing Manager approval is required before assigning staff to Event or Graphic Requirement work.'
          );
        }
      } else {
        initialTaskStatus = data.assignedUserIds?.length ? TaskStatus.ASSIGNED : TaskStatus.APPROVED;
      }
    }

    // Determine Client, Brand, and Product IDs (All Optional)
    let clientId = project?.clientId || data.clientId || null;
    let brandId = project?.brandId || data.brandId || null;
    let productId = project?.productId || data.productId || null;

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
        description: data.description,
        projectId: project?.id || (data.projectId ? data.projectId : null),
        scriptId: scriptId || (data.scriptId ? data.scriptId : null),
        graphicRequirementId: graphicReqId || (data.graphicRequirementId ? data.graphicRequirementId : null),
        clientId: clientId,
        brandId: brandId,
        productId: productId,
        priority: data.priority || Priority.MEDIUM,
        dueDate: new Date(data.dueDate || Date.now() + 86400000),
        estimatedHours: parseFloat(data.estimatedHours) || 2.0,
        status: initialTaskStatus,
        sourceType: sourceType,
        remarks: data.remarks,
      },
    });

    if (data.assignedUserIds && Array.isArray(data.assignedUserIds)) {
      for (const uId of data.assignedUserIds) {
        await this.prisma.taskAssignment.create({
          data: { taskId: task.id, userId: uId },
        });

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
        });
      }
    }

    // 1. Log TASK_CREATED
    await this.logTimelineEvent(task.id, 'TASK_CREATED', `Task ${task.taskId} ('${task.title}') created`, managerUserId);

    // 2. Log TASK_ASSIGNED if employees assigned
    // Update linked Graphic Requirement status to TASK_ASSIGNED or IN_PROGRESS
    const targetGrId = task.graphicRequirementId || graphicReqId;
    if (targetGrId) {
      let gId = targetGrId;
      const gReq = await this.prisma.graphicRequirement.findUnique({ where: { id: targetGrId } });
      if (!gReq) {
        const calEv = await this.prisma.mediaCalendarEvent.findUnique({ where: { id: targetGrId } });
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
      }
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

    // Assign new employees exclusively
    for (const uId of assignedUserIds) {
      await this.prisma.taskAssignment.create({
        data: { taskId: task.id, userId: uId },
      });

      await this.prisma.notification.create({
        data: {
          userId: uId,
          title: 'Task Reassigned to You',
          message: `Task ${task.taskId}: ${task.title} has been reassigned to you.`,
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
        assignment &&
        (assignment.acceptanceStatus === 'ACCEPTED' || assignment.acceptanceStatus === 'Accepted');

      const isTaskAccepted = task.status === TaskStatus.ACCEPTED;

      if (!isAssignmentAccepted && !isTaskAccepted) {
        throw new ForbiddenException('Task must be accepted before you can perform this action.');
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
        TaskStatus.COMPLETED,
      ];
      if (reviewStatuses.includes(task.status as any)) {
        throw new ForbiddenException("Task is currently undergoing review. Updates are locked during review.");
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

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        status: data.status || undefined,
        completionPercentage: data.completionPercentage !== undefined ? data.completionPercentage : undefined,
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

    // 2. Log STATUS_CHANGED
    if (data.status && data.status !== task.status) {
      await this.logTimelineEvent(task.id, 'STATUS_CHANGED', `Status changed from ${task.status} to ${data.status}`, user.id);

      // Notification: Review Requested
      if (data.status === TaskStatus.WAITING_FOR_REVIEW) {
        await this.sendTaskNotifications(
          task.id,
          'Task Review Requested',
          `Task ${task.taskId} ('${task.title}') is ready for review (Status: Waiting for Review)`,
          'TASK_REVIEW_REQUESTED',
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

    // Update main task status to ACCEPTED and progress to 25% if currently PENDING or ASSIGNED
    if (task.status === TaskStatus.PENDING || task.status === TaskStatus.ASSIGNED) {
      await this.prisma.task.update({
        where: { id: task.id },
        data: {
          status: TaskStatus.ACCEPTED,
          completionPercentage: Math.max(task.completionPercentage, 25),
        },
      });
    }

    // Log EMPLOYEE_ACCEPTED
    await this.logTimelineEvent(task.id, 'EMPLOYEE_ACCEPTED', `Task receipt acknowledged & ACCEPTED by ${user.name} (Progress: 25%)`, user.id);

    // Ensure corresponding Script exists under user's Script session upon Task acceptance
    let targetScriptId = task.scriptId;
    const isScriptTaskType = true;

    if (isScriptTaskType) {
      try {
        if (!targetScriptId) {
          let clientId = task.clientId;
          let brandId = task.brandId;
          let projId = task.projectId;

          if (!clientId) {
            let c = await this.prisma.client.findFirst();
            if (!c) {
              c = await this.prisma.client.create({
                data: { name: 'General Client', companyName: 'General Organization', contactPerson: 'System', mobile: '0000000000', email: 'client@moms.com' },
              });
            }
            clientId = c.id;
          }

          if (!brandId) {
            let b = await this.prisma.brand.findFirst();
            if (!b) {
              b = await this.prisma.brand.create({
                data: { shortCode: 'GEN', name: 'General Brand', clientId: clientId },
              });
            }
            brandId = b.id;
          }

          if (!projId) {
            let p = await this.prisma.shootProject.findFirst();
            if (!p) {
              let projCount = await this.prisma.shootProject.count();
              p = await this.prisma.shootProject.create({
                data: {
                  projectId: `PROJ-${(projCount + 1).toString().padStart(6, '0')}`,
                  name: 'General Production Project',
                  clientId: clientId,
                  brandId: brandId,
                  shootType: 'INDOOR',
                  shootDate: new Date(Date.now() + 7 * 86400000),
                  shootLocation: 'Studio',
                  status: 'PLANNED',
                  createdById: user.id,
                },
              });
            }
            projId = p.id;
          }

          let existingScript = await this.prisma.script.findFirst({
            where: {
              name: task.title,
              projectId: projId,
            },
          });

          if (!existingScript) {
            let scriptCount = await this.prisma.script.count();
            let autoScriptId = `SCR-${(scriptCount + 1).toString().padStart(6, '0')}`;
            let duplicateCheck = await this.prisma.script.findUnique({ where: { scriptId: autoScriptId } });
            while (duplicateCheck) {
              scriptCount++;
              autoScriptId = `SCR-${(scriptCount + 1).toString().padStart(6, '0')}`;
              duplicateCheck = await this.prisma.script.findUnique({ where: { scriptId: autoScriptId } });
            }

            existingScript = await this.prisma.script.create({
              data: {
                scriptId: autoScriptId,
                name: task.title,
                description: task.description,
                projectId: projId,
                clientId: clientId,
                brandId: brandId,
                productId: task.productId || undefined,
                priority: task.priority || 'MEDIUM',
                status: 'DRAFT',
                createdById: user.id,
              },
            });
          }

          if (existingScript) {
            targetScriptId = existingScript.id;
            await this.prisma.task.update({
              where: { id: task.id },
              data: { scriptId: existingScript.id },
            });
          }
        }

        if (targetScriptId && user.id) {
          await this.prisma.scriptAssignment.upsert({
            where: { scriptId_userId_responsibility: { scriptId: targetScriptId, userId: user.id, responsibility: 'SCRIPTWRITER' } },
            create: { scriptId: targetScriptId, userId: user.id, responsibility: 'SCRIPTWRITER' },
            update: { assignedAt: new Date() },
          }).catch(() => null);

          await this.prisma.scriptTimeline.create({
            data: {
              scriptId: targetScriptId,
              triggeredById: user.id,
              event: 'TASK_ACCEPTED',
              description: `Assigned task ${task.taskId} acknowledged & ACCEPTED by ${user.name || user.email}`,
            },
          }).catch(() => null);
        }
      } catch (scriptErr) {
        console.error('Non-blocking script auto-creation error during task acceptance:', scriptErr);
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
        completionPercentage: Math.max(task.completionPercentage, 45),
      },
    });

    if (task.graphicRequirementId) {
      await this.prisma.graphicRequirement.updateMany({
        where: { id: task.graphicRequirementId },
        data: { status: 'IN_PROGRESS' },
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
        TaskStatus.COMPLETED,
      ];
      if (reviewStatuses.includes(task.status as any)) {
        throw new ForbiddenException("Task is currently undergoing Technical Review. Remarks are locked for staff during review.");
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
        TaskStatus.COMPLETED,
      ];
      if (reviewStatuses.includes(task.status as any)) {
        throw new ForbiddenException("Task is currently undergoing Technical Review. Deliverable uploads are locked for staff during review.");
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

    // 1. Advance status to WAITING_FOR_TECHNICAL_REVIEW and progress to at least 75%
    const updatedTask = await this.prisma.task.update({
      where: { id: task.id },
      data: {
        status: TaskStatus.WAITING_FOR_TECHNICAL_REVIEW,
        completionPercentage: Math.max(task.completionPercentage, 75),
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
