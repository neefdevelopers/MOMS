import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TaskStatus, Priority, Role } from '../../common/enums';

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

    // RBAC: Staff only see their assigned tasks
    if (params.role === Role.STAFF || params.employeeId) {
      const targetUserId = params.employeeId || params.userId;
      where.assignedEmployees = {
        some: { userId: targetUserId },
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

    return this.prisma.task.findMany({
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
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({
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
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  private async logTimelineEvent(
    taskId: string,
    event: 'TASK_CREATED' | 'TASK_ASSIGNED' | 'EMPLOYEE_ACCEPTED' | 'STATUS_CHANGED' | 'PROGRESS_UPDATED' | 'FILE_UPLOADED' | 'REMARK_ADDED' | 'COMPLETED',
    description: string,
    userId?: string,
  ) {
    await this.prisma.taskTimeline.create({
      data: {
        taskId,
        event,
        description,
        userId: userId || null,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: userId || null,
        action: event,
        entity: 'Task',
        entityId: taskId,
        description,
      },
    });
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
      where: { role: Role.STAFF },
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
        designation: user.employeeProfile?.designation || 'Staff Member',
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

  async getReassignmentRecommendations(taskId: string) {
    const task = await this.findOne(taskId);

    // Fetch candidate staff with complete employee profiles and skills
    const candidateUsers = await this.prisma.user.findMany({
      where: {
        role: Role.STAFF,
        status: 'ACTIVE',
        isArchived: false,
      },
      include: {
        employeeProfile: {
          include: {
            department: true,
            skills: true,
          },
        },
        tasks: {
          include: {
            task: true,
          },
        },
      },
    });

    const capacityOverview = await this.getCapacityOverview();
    const capacityMap = new Map(capacityOverview.map((c) => [c.userId, c]));
    const currentAssignedUserIds = task.assignedEmployees.map((a) => a.userId);

    const taskDueDateStr = new Date(task.dueDate).toISOString().split('T')[0];

    const recommendations = candidateUsers
      .filter((emp) => !currentAssignedUserIds.includes(emp.id))
      .map((user) => {
        const capacityInfo = capacityMap.get(user.id) || {
          capacityHours: 8.0,
          assignedHours: 0,
          remainingHours: 8.0,
          workloadPercentage: 0,
          status: 'Available',
          activeTaskCount: 0,
          urgentTaskCount: 0,
        };

        let score = 50; // Base recommendation score
        const factors: string[] = [];

        // 1. Available Capacity
        if (capacityInfo.remainingHours >= task.estimatedHours) {
          score += 25;
          factors.push(`Sufficient capacity (${capacityInfo.remainingHours}h remaining)`);
        } else {
          const capRatio = capacityInfo.capacityHours > 0 ? capacityInfo.remainingHours / capacityInfo.capacityHours : 0;
          score += Math.round(capRatio * 15);
          factors.push(`Partial capacity (${capacityInfo.remainingHours}h remaining)`);
        }

        // 2. Existing Project Assignment
        const projectTasks = user.tasks.filter((t) => t.task && t.task.projectId === task.projectId);
        if (projectTasks.length > 0) {
          score += 25;
          factors.push(`Assigned to ${projectTasks.length} other task(s) in this project`);
        }

        // 3. Department Match
        if (user.employeeProfile?.department) {
          score += 15;
          factors.push(`Dept: ${user.employeeProfile.department.name}`);
        }

        // 4. Skills Match
        const skillsList = user.employeeProfile?.skills || [];
        if (skillsList.length > 0) {
          score += 15;
          factors.push(`Skills: ${skillsList.map((s: any) => s.skillName || s.name || 'Specialist').join(', ')}`);
        }

        // 5. Current Workload Penalty
        if (capacityInfo.status === 'Overloaded') {
          score -= 40;
          factors.push(`Overloaded (${capacityInfo.workloadPercentage}% workload)`);
        } else if (capacityInfo.status === 'Normal') {
          score -= 10;
        }

        // 6. Deadline Concurrency Check
        const sameDayDeadlineTasks = user.tasks.filter((t) => {
          if (!t.task || t.task.status === TaskStatus.COMPLETED || t.task.status === TaskStatus.CANCELLED) return false;
          const dStr = new Date(t.task.dueDate).toISOString().split('T')[0];
          return dStr === taskDueDateStr;
        });

        if (sameDayDeadlineTasks.length > 0) {
          score -= 15;
          factors.push(`Has ${sameDayDeadlineTasks.length} task(s) due on same date`);
        }

        // 7. Task Priority Match
        if (task.priority === Priority.CRITICAL || task.priority === Priority.HIGH) {
          if (capacityInfo.status === 'Available') {
            score += 15;
            factors.push(`High availability for ${task.priority} priority task`);
          }
        }

        const finalScore = Math.min(100, Math.max(0, score));

        return {
          userId: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          designation: user.employeeProfile?.designation || 'Staff Member',
          department: user.employeeProfile?.department?.name || 'General',
          capacityHours: capacityInfo.capacityHours,
          assignedHours: capacityInfo.assignedHours,
          remainingHours: capacityInfo.remainingHours,
          workloadPercentage: capacityInfo.workloadPercentage,
          status: capacityInfo.status,
          recommendationScore: finalScore,
          availablePercentage: Math.max(0, Math.round((capacityInfo.remainingHours / (capacityInfo.capacityHours || 8.0)) * 100)),
          isAlreadyOnProject: projectTasks.length > 0,
          reason: factors.join(' • '),
        };
      })
      .sort((a, b) => b.recommendationScore - a.recommendationScore);

    return {
      task: {
        id: task.id,
        taskId: task.taskId,
        title: task.title,
        estimatedHours: task.estimatedHours,
        priority: task.priority,
        dueDate: task.dueDate,
        project: task.project?.name,
      },
      currentAssigned: task.assignedEmployees.map((a) => a.user.name),
      recommendations,
    };
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

    // 1. Must belong to exactly one Parent Entity: Shoot Project, Script, or Graphic Requirement
    if (!data.projectId && !data.scriptId && !data.graphicRequirementId) {
      throw new BadRequestException(
        'Every task must belong to one parent entity (Shoot Project, Script, or Graphic Requirement). Tasks cannot exist independently.',
      );
    }

    let project = null;
    let scriptId: string | null = null;
    let graphicReqId: string | null = null;

    if (data.parentEntityType === 'SCRIPT' || (data.scriptId && data.parentEntityType !== 'PROJECT')) {
      const script = await this.prisma.script.findUnique({
        where: { id: data.scriptId },
        include: { project: true },
      });
      if (!script) throw new NotFoundException('Parent Script entity not found');
      scriptId = script.id;
      project = script.project;
    } else if (data.parentEntityType === 'GRAPHIC_REQ' || (data.graphicRequirementId && data.parentEntityType !== 'PROJECT')) {
      const graphicReq = await this.prisma.graphicRequirement.findUnique({
        where: { id: data.graphicRequirementId },
        include: { project: true },
      });
      if (!graphicReq) throw new NotFoundException('Parent Graphic Requirement entity not found');
      graphicReqId = graphicReq.id;
      project = graphicReq.project;
    } else if (data.projectId) {
      project = await this.prisma.shootProject.findUnique({
        where: { id: data.projectId },
        include: { client: true, brand: true, product: true },
      });
      if (!project) throw new NotFoundException('Parent Shoot Project entity not found');
    }

    if (!project) {
      throw new BadRequestException(
        'Every task must belong to one parent entity (Shoot Project, Script, or Graphic Requirement). Tasks cannot exist independently.',
      );
    }

    // 2. Generate Task ID TSK-00000X
    const count = await this.prisma.task.count();
    const autoTaskId = `TSK-${(count + 1).toString().padStart(6, '0')}`;

    const task = await this.prisma.task.create({
      data: {
        taskId: autoTaskId,
        title: data.title,
        description: data.description,
        projectId: project.id,
        scriptId: scriptId,
        graphicRequirementId: graphicReqId,
        clientId: project.clientId,
        brandId: project.brandId,
        productId: project.productId || null,
        priority: data.priority || Priority.MEDIUM,
        dueDate: new Date(data.dueDate || Date.now() + 86400000),
        estimatedHours: parseFloat(data.estimatedHours) || 2.0,
        status: data.assignedUserIds?.length ? TaskStatus.ASSIGNED : TaskStatus.PENDING,
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
    if (data.assignedUserIds?.length) {
      await this.logTimelineEvent(task.id, 'TASK_ASSIGNED', `Task assigned to ${data.assignedUserIds.length} employee(s)`, managerUserId);
    }

    return task;
  }

  async reassign(taskId: string, assignedUserIds: string[], managerUserId: string, reason?: string) {
    if (assignedUserIds && Array.isArray(assignedUserIds)) {
      await this.validateActiveEmployees(assignedUserIds);
    }

    const task = await this.findOne(taskId);

    const prevNames = task.assignedEmployees.map((a) => a.user?.name || 'Staff Member');

    // Clear existing assignments
    await this.prisma.taskAssignment.deleteMany({ where: { taskId } });

    // Assign new employees
    for (const uId of assignedUserIds) {
      await this.prisma.taskAssignment.create({
        data: { taskId, userId: uId },
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

  async updateProgress(
    taskId: string,
    data: { status?: TaskStatus; completionPercentage?: number; remarks?: string; dueDate?: string },
    user: any,
  ) {
    const task = await this.findOne(taskId);

    // Employees can only update tasks assigned to them
    if (user.role === Role.STAFF) {
      const isAssigned = task.assignedEmployees.some((a) => a.userId === user.id);
      if (!isAssigned) {
        throw new ForbiddenException("Staff cannot update tasks assigned to other employees.");
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
    if (data.status === TaskStatus.COMPLETED || data.completionPercentage === 100) {
      await this.logTimelineEvent(task.id, 'COMPLETED', `Task completed (100% completion achieved)`, user.id);
      await this.sendTaskNotifications(
        task.id,
        'Task Completed',
        `Task ${task.taskId} ('${task.title}') has been marked as COMPLETED 🎉`,
        'TASK_COMPLETED',
      );
    }

    // Update parent project progress percentage
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

    return updated;
  }

  async acknowledgeTaskAcceptance(taskId: string, user: any) {
    const task = await this.findOne(taskId);

    const assignment = await this.prisma.taskAssignment.findFirst({
      where: { taskId: task.id, userId: user.id },
    });

    if (!assignment && user.role === Role.STAFF) {
      throw new NotFoundException('You are not assigned to this task.');
    }

    if (assignment) {
      await this.prisma.taskAssignment.update({
        where: { id: assignment.id },
        data: {
          acceptanceStatus: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      });
    }

    // Update main task status to ACCEPTED if currently PENDING or ASSIGNED
    if (task.status === TaskStatus.PENDING || task.status === TaskStatus.ASSIGNED) {
      await this.prisma.task.update({
        where: { id: task.id },
        data: { status: TaskStatus.ACCEPTED },
      });
    }

    // 3. Log EMPLOYEE_ACCEPTED
    await this.logTimelineEvent(task.id, 'EMPLOYEE_ACCEPTED', `Task receipt acknowledged & ACCEPTED by ${user.name}`, user.id);

    if (task.scriptId) {
      await this.prisma.scriptTimeline.create({
        data: {
          scriptId: task.scriptId,
          triggeredById: user.id,
          event: 'TASK_ACCEPTED',
          description: `Assigned task ${task.taskId} acknowledged & ACCEPTED by ${user.name || user.email}`,
        },
      });
    }

    return this.findOne(task.id);
  }

  async addRemark(taskId: string, message: string, user: any) {
    if (!message || !message.trim()) {
      throw new BadRequestException('Remark message cannot be empty');
    }

    const task = await this.findOne(taskId);

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

    // Employees can only upload to tasks assigned to them
    if (user.role === Role.STAFF) {
      const isAssigned = task.assignedEmployees.some((a) => a.userId === user.id);
      if (!isAssigned) {
        throw new ForbiddenException("Staff cannot upload deliverables to tasks assigned to others.");
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
        status: task.status === TaskStatus.PENDING ? TaskStatus.IN_PROGRESS : task.status,
      },
    });

    // 6. Log FILE_UPLOADED
    await this.logTimelineEvent(task.id, 'FILE_UPLOADED', `Work deliverable Version v${newVersion} (${fileName}) uploaded by ${user.name}`, user.id);

    return {
      task: updatedTask,
      historyEntry,
    };
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
}
