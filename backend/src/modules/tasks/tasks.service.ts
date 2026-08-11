import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TaskStatus, Priority, Role } from '../../common/enums';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: { projectId?: string; employeeId?: string; userId?: string; role?: Role }) {
    const where: any = {};
    if (params.projectId) where.projectId = params.projectId;

    // RBAC: Staff only see their assigned tasks
    if (params.role === Role.STAFF || params.employeeId) {
      const targetUserId = params.employeeId || params.userId;
      where.assignedEmployees = {
        some: { userId: targetUserId },
      };
    }

    return this.prisma.task.findMany({
      where,
      include: {
        project: { select: { id: true, projectId: true, name: true } },
        script: { select: { id: true, scriptId: true, name: true } },
        graphicRequirement: { select: { id: true, requirementId: true, name: true } },
        client: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true, shortCode: true } },
        assignedEmployees: { include: { user: { include: { employeeProfile: true } } } },
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
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async getCapacityOverview() {
    // Fetch all active staff members with their profiles
    const users = await this.prisma.user.findMany({
      where: { role: Role.STAFF },
      include: {
        employeeProfile: { include: { department: true } },
        tasks: {
          include: {
            task: true,
          },
        },
      },
    });

    const result = users.map((user) => {
      const activeTasks = user.tasks
        .map((t) => t.task)
        .filter((t) => t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.CANCELLED);

      const assignedHours = activeTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
      const capacityHours = user.employeeProfile?.dailyCapacityHours || 8.0;
      const workloadPercentage = Math.round((assignedHours / capacityHours) * 100);

      let status = 'Available';
      if (workloadPercentage > 100) {
        status = 'Overloaded';
      } else if (workloadPercentage >= 75) {
        status = 'Normal';
      }

      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        designation: user.employeeProfile?.designation || 'Staff Member',
        department: user.employeeProfile?.department?.name || 'General',
        capacityHours,
        assignedHours,
        remainingHours: Math.max(0, capacityHours - assignedHours),
        workloadPercentage,
        status,
        activeTaskCount: activeTasks.length,
      };
    });

    return result;
  }

  async getReassignmentRecommendations(taskId: string) {
    const task = await this.findOne(taskId);
    const capacityOverview = await this.getCapacityOverview();

    // Recommend available staff sorted by remaining capacity
    const currentAssignedUserIds = task.assignedEmployees.map((a) => a.userId);

    const recommendations = capacityOverview
      .filter((emp) => !currentAssignedUserIds.includes(emp.userId))
      .map((emp) => ({
        ...emp,
        recommendationScore: emp.remainingHours >= task.estimatedHours ? 100 : Math.round((emp.remainingHours / task.estimatedHours) * 100),
        reason: emp.status === 'Overloaded' 
          ? 'Currently overloaded' 
          : `Has ${emp.remainingHours}h available capacity (Task requires ${task.estimatedHours}h)`,
      }))
      .sort((a, b) => b.remainingHours - a.remainingHours);

    return {
      task: { id: task.id, taskId: task.taskId, title: task.title, estimatedHours: task.estimatedHours },
      currentAssigned: task.assignedEmployees.map((a) => a.user.name),
      recommendations,
    };
  }

  async create(data: any, managerUserId: string) {
    // 1. Must belong to Project, Script, or Graphic Req
    if (!data.projectId && !data.scriptId && !data.graphicRequirementId) {
      throw new BadRequestException('Task must belong to a Parent Project, Script, or Graphic Requirement.');
    }

    let project = null;
    if (data.projectId) {
      project = await this.prisma.shootProject.findUnique({
        where: { id: data.projectId },
        include: { client: true, brand: true, product: true },
      });
    } else if (data.scriptId) {
      const script = await this.prisma.script.findUnique({
        where: { id: data.scriptId },
        include: { project: true },
      });
      if (script) project = script.project;
    }

    if (!project) throw new NotFoundException('Parent Entity / Project not found');

    // 2. Generate Task ID TSK-00000X
    const count = await this.prisma.task.count();
    const autoTaskId = `TSK-${(count + 1).toString().padStart(6, '0')}`;

    const task = await this.prisma.task.create({
      data: {
        taskId: autoTaskId,
        title: data.title,
        description: data.description,
        projectId: project.id,
        scriptId: data.scriptId || null,
        graphicRequirementId: data.graphicRequirementId || null,
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

        // Send notification to assigned staff
        await this.prisma.notification.create({
          data: {
            userId: uId,
            title: 'New Task Assigned',
            message: `You were assigned task ${task.taskId}: ${task.title}`,
            type: 'TASK_ASSIGNED',
            linkUrl: `/tasks`,
          },
        });
      }
    }

    await this.prisma.activityLog.create({
      data: {
        userId: managerUserId,
        action: 'CREATE_TASK',
        entity: 'Task',
        entityId: task.id,
        description: `Created Task ${task.taskId} (${task.title})`,
      },
    });

    return task;
  }

  async reassign(taskId: string, assignedUserIds: string[], managerUserId: string) {
    const task = await this.findOne(taskId);

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
        },
      });
    }

    await this.prisma.activityLog.create({
      data: {
        userId: managerUserId,
        action: 'REASSIGN_TASK',
        entity: 'Task',
        entityId: taskId,
        description: `Reassigned task ${task.taskId} to ${assignedUserIds.length} staff member(s)`,
      },
    });

    return this.findOne(taskId);
  }

  async updateProgress(
    taskId: string,
    data: { status?: TaskStatus; completionPercentage?: number; remarks?: string },
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

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        status: data.status || undefined,
        completionPercentage: data.completionPercentage !== undefined ? data.completionPercentage : undefined,
        remarks: data.remarks || undefined,
      },
    });

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
}
