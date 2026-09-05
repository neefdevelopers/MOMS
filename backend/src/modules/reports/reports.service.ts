import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async logDataExport(userId: string, reportType: string, format: string, recordCount?: number, filters?: any) {
    return this.prisma.activityLog.create({
      data: {
        userId,
        action: 'DATA_EXPORT',
        entity: 'Report',
        entityId: reportType || 'OperationalReport',
        description: `Exported ${reportType || 'Report'} in ${format} format (${recordCount || 0} records).`,
        metadata: JSON.stringify({ reportType, format, recordCount, filters }),
      },
    });
  }

  public getDateRangeHelper(period?: string, startDate?: string, endDate?: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    if (period === 'yesterday') {
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
    } else if (period === 'this_week') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
    } else if (period === 'last_week') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1) - 7;
      start.setDate(diff);
      end.setDate(diff + 6);
    } else if (period === 'this_month') {
      start.setDate(1);
    } else if (period === 'last_month') {
      start.setMonth(start.getMonth() - 1);
      start.setDate(1);
      end.setDate(0);
    } else if (period === 'custom' && startDate) {
      const customStart = new Date(startDate);
      customStart.setHours(0, 0, 0, 0);
      return { start: customStart, end: endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : end };
    }
    return { start, end };
  }

  public inMemoryFilter(data: any[], type: 'projects' | 'tasks' | 'users' | 'scripts' | 'graphics' | 'equipments', filters: any): any[] {
    const { clientId, brandId, productId, departmentId, employeeId, projectId, status, search } = filters;
    const q = search ? search.toLowerCase() : '';
    return data.filter(item => {
      if (type === 'projects') {
        if (clientId && item.clientId !== clientId) return false;
        if (brandId && item.brandId !== brandId) return false;
        if (productId && item.productId !== productId) return false;
        if (status && item.status !== status) return false;
        if (q) {
          const match = item.name?.toLowerCase().includes(q) || 
                        item.client?.name?.toLowerCase().includes(q) || 
                        item.brand?.name?.toLowerCase().includes(q) || 
                        item.product?.name?.toLowerCase().includes(q);
          if (!match) return false;
        }
      } else if (type === 'tasks') {
        if (projectId && item.projectId !== projectId) return false;
        if (status && item.status !== status) return false;
        if (employeeId && !item.assignedEmployees?.some((e: any) => e.userId === employeeId)) return false;
        if (clientId && item.project?.clientId !== clientId) return false;
        if (brandId && item.project?.brandId !== brandId) return false;
        if (productId && item.project?.productId !== productId) return false;
        if (departmentId && !item.assignedEmployees?.some((e: any) => e.user?.employeeProfile?.departmentId === departmentId)) return false;
        if (q) {
          const match = item.project?.name?.toLowerCase().includes(q) ||
                        item.project?.client?.name?.toLowerCase().includes(q) ||
                        item.project?.brand?.name?.toLowerCase().includes(q) ||
                        item.project?.product?.name?.toLowerCase().includes(q) ||
                        item.assignedEmployees?.some((e: any) => e.user?.name?.toLowerCase().includes(q));
          if (!match) return false;
        }
      } else if (type === 'users') {
        if (employeeId && item.id !== employeeId) return false;
        if (departmentId && item.employeeProfile?.departmentId !== departmentId) return false;
        if (q && !item.name?.toLowerCase().includes(q)) return false;
      } else if (type === 'scripts' || type === 'graphics') {
        if (projectId && item.projectId !== projectId) return false;
        if (status && item.status !== status) return false;
        if (clientId && item.project?.clientId !== clientId) return false;
        if (brandId && item.project?.brandId !== brandId) return false;
        if (productId && item.project?.productId !== productId) return false;
        if (q) {
          const match = item.project?.name?.toLowerCase().includes(q) ||
                        item.project?.client?.name?.toLowerCase().includes(q) ||
                        item.project?.brand?.name?.toLowerCase().includes(q) ||
                        item.project?.product?.name?.toLowerCase().includes(q);
          if (!match) return false;
        }
      } else if (type === 'equipments') {
        if (status && item.status !== status) return false;
        if (q) {
          const match = item.name?.toLowerCase().includes(q) ||
                        item.model?.toLowerCase().includes(q) ||
                        item.serialNumber?.toLowerCase().includes(q) ||
                        item.categoryRef?.name?.toLowerCase().includes(q);
          if (!match) return false;
        }
      }
      return true;
    });
  }


  async getPersonalizedDashboard(userId: string, period?: string, startDate?: string, endDate?: string, clientId?: string, brandId?: string, productId?: string, departmentId?: string, employeeId?: string, projectId?: string, status?: string, search?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employeeProfile: true },
    });
    if (!user) throw new BadRequestException('User profile not found');

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    // 1. All Tasks assigned to user
    const assignedTaskRecords = await this.prisma.taskAssignment.findMany({
      where: { userId },
      include: {
        task: {
          include: {
            project: { select: { id: true, name: true, projectId: true } },
            script: { select: { id: true, name: true, scriptId: true } },
            graphicRequirement: { select: { id: true, name: true, requirementId: true } },
            assignedEmployees: true,
          },
        },
      },
    });

    const myTasks = assignedTaskRecords.map((at) => ({
      ...at.task,
      userAssignment: {
        acceptanceStatus: at.acceptanceStatus,
        acceptedAt: at.acceptedAt,
      },
      assignedEmployees: at.task?.assignedEmployees || [at],
    })).filter((t) => Boolean(t.id));

    // Tasks accepted by assigned person
    const acceptedTasks = assignedTaskRecords
      .filter((at) => at.acceptanceStatus === 'ACCEPTED')
      .map((at) => at.task)
      .filter(Boolean);

    // Today's Tasks
    const todaysTasks = myTasks.filter((t) => {
      const d = new Date(t.dueDate);
      return d >= todayStart && d <= todayEnd;
    });

    // Pending Tasks
    const pendingTasks = myTasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');

    // 2. Assigned Scripts (Direct script assignment or Accepted task linkage)
    const acceptedScriptIds = acceptedTasks.map((t) => t.scriptId).filter(Boolean) as string[];
    const scriptAssignments = await this.prisma.scriptAssignment.findMany({
      where: { userId },
      include: {
        script: {
          include: {
            project: { select: { id: true, name: true, projectId: true } },
            brand: { select: { name: true } },
          },
        },
      },
    });
    const directScripts = scriptAssignments.map((sa) => sa.script).filter(Boolean);
    const taskScripts = acceptedScriptIds.length > 0
      ? await this.prisma.script.findMany({
          where: { id: { in: acceptedScriptIds } },
          include: {
            project: { select: { id: true, name: true, projectId: true } },
            brand: { select: { name: true } },
          },
        })
      : [];
    const myScriptsMap = new Map();
    [...directScripts, ...taskScripts].forEach((s) => {
      if (s && s.id) myScriptsMap.set(s.id, s);
    });
    const myScripts = Array.from(myScriptsMap.values());

    // 3. Assigned Graphic Requirements (ONLY after task is ACCEPTED by the assigned person)
    const acceptedGraphicReqIds = acceptedTasks.map((t) => t.graphicRequirementId).filter(Boolean) as string[];
    const myGraphicRequirements = await this.prisma.graphicRequirement.findMany({
      where: {
        OR: [
          { id: { in: acceptedGraphicReqIds } },
          { tasks: { some: { assignedEmployees: { some: { userId, acceptanceStatus: 'ACCEPTED' } } } } },
          { project: { createdById: userId } },
        ],
      },
      include: {
        project: { select: { id: true, name: true, projectId: true } },
        brand: { select: { name: true } },
      },
    });

    // 4. Current Projects (ONLY after task is ACCEPTED by the assigned person or created by user)
    const acceptedProjectIdsFromTasks = acceptedTasks.map((t) => t.projectId).filter(Boolean) as string[];
    const myProjects = await this.prisma.shootProject.findMany({
      where: {
        status: { not: 'ARCHIVED' },
        OR: [
          { createdById: userId },
          { id: { in: acceptedProjectIdsFromTasks } },
          { tasks: { some: { assignedEmployees: { some: { userId, acceptanceStatus: 'ACCEPTED' } } } } },
          { scripts: { some: { scriptAssignments: { some: { userId } } } } },
        ],
      },
      include: {
        client: { select: { name: true } },
        brand: { select: { name: true } },
      },
    });

    // 4b. Assigned Equipment (Active & Requested)
    const myEquipmentRequests = await this.prisma.equipmentRequest.findMany({
      where: { requestedById: userId },
      include: { equipment: true, project: { select: { name: true } } },
    });
    const myEquipmentMovements = await this.prisma.equipmentMovement.findMany({
      where: { employeeId: userId },
      include: { equipment: true, project: { select: { name: true } } },
    });

    // 5. Upcoming Deadlines (within 7 days)
    const upcomingTaskDeadlines = pendingTasks
      .filter((t) => new Date(t.dueDate) <= sevenDaysLater)
      .map((t) => ({ type: 'TASK', id: t.id, title: t.title, code: t.taskId, dueDate: t.dueDate, priority: t.priority }));

    const upcomingScriptDeadlines = myScripts
      .filter((s) => s.status !== 'COMPLETED')
      .map((s) => ({ type: 'SCRIPT', id: s.id, title: s.name, code: s.scriptId, dueDate: s.updatedAt, priority: s.priority }));

    const upcomingGraphicDeadlines = myGraphicRequirements
      .filter((g) => g.status !== 'COMPLETED')
      .map((g) => ({ type: 'GRAPHIC_REQ', id: g.id, title: g.name, code: g.requirementId, dueDate: g.estimatedCompletion || g.updatedAt, priority: g.priority }));

    const upcomingDeadlines = [...upcomingTaskDeadlines, ...upcomingScriptDeadlines, ...upcomingGraphicDeadlines].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    );

    // 6. Recent Communications
    const recentCommunications = await this.prisma.communication.findMany({
      where: {
        OR: [
          { senderId: userId },
          { assignedToId: userId },
        ],
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        project: { select: { name: true } },
      },
    });

    // 7. Notifications
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      take: 15,
      orderBy: { createdAt: 'desc' },
    });

    // 8. Personal Calendar Events
    const myProjectIds = myProjects.map((p) => p.id);
    const personalCalendar = await this.prisma.mediaCalendarEvent.findMany({
      where: {
        OR: [
          { shootProjects: { some: { id: { in: myProjectIds } } } },
          { graphicReqs: { some: { id: { in: myGraphicRequirements.map((g) => g.id) } } } },
        ],
      },
      take: 10,
      orderBy: { shootDate: 'asc' },
    });

    // 9. Current Workload Calculation
    const dailyCapacity = user.employeeProfile?.dailyCapacityHours || 8.0;
    const rawWorkloadHours = pendingTasks.reduce((acc, t) => acc + (t.estimatedHours || 2.0), 0);
    const weightedWorkloadHours = pendingTasks.reduce((acc, t) => {
      let multiplier = 1.0;
      if (t.priority === 'CRITICAL') multiplier = 1.4;
      else if (t.priority === 'HIGH') multiplier = 1.2;
      return acc + (t.estimatedHours || 2.0) * multiplier;
    }, 0);

    const workloadPercentage = Math.min(200, Math.round((weightedWorkloadHours / dailyCapacity) * 100));
    let workloadStatus = 'Normal';
    if (workloadPercentage > 100) workloadStatus = 'Overloaded';
    else if (workloadPercentage < 75) workloadStatus = 'Available';

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        designation: user.employeeProfile?.designation || 'Staff Member',
        dailyCapacityHours: dailyCapacity,
      },
      todaysTasks,
      pendingTasks,
      upcomingDeadlines,
      currentProjects: myProjects,
      assignedScripts: myScripts,
      assignedGraphicRequirements: myGraphicRequirements,
      myEquipment: [...myEquipmentRequests, ...myEquipmentMovements],
      summaryCounts: {
        assignedTasksCount: myTasks.length,
        assignedGraphicRequirementsCount: myGraphicRequirements.length,
        assignedProjectsCount: myProjects.length,
        assignedScriptsCount: myScripts.length,
        activeEquipmentCount: myEquipmentRequests.length + myEquipmentMovements.length,
      },
      recentCommunications,
      notifications,
      personalCalendar: personalCalendar.map((ev) => ({
        id: ev.id,
        title: ev.title,
        startDate: ev.shootDate,
        eventType: ev.shootType,
        description: ev.productionNotes,
      })),
      currentWorkload: {
        dailyCapacityHours: dailyCapacity,
        rawWorkloadHours,
        weightedWorkloadHours,
        workloadPercentage,
        workloadStatus,
        remainingCapacityHours: Math.max(0, dailyCapacity - rawWorkloadHours),
      },
    };
  }

  async getDashboardSummary(period?: string, startDate?: string, endDate?: string, clientId?: string, brandId?: string, productId?: string, departmentId?: string, employeeId?: string, projectId?: string, status?: string, search?: string) {
    const { start: todayStart, end: todayEnd } = this.getDateRangeHelper(period, startDate, endDate);
    const filtersObj = { clientId, brandId, productId, departmentId, employeeId, projectId, status, search };

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

    const totalProgressSum = activeProjects.reduce((sum, p) => sum + (p.progressPercentage || 0), 0);
    const currentProgress = totalProjects > 0 ? Math.round(totalProgressSum / totalProjects) : 0;

    const pendingTasks = await this.prisma.task.count({
      where: { status: { not: 'COMPLETED' } },
    });

    const pendingScripts = await this.prisma.script.count({
      where: { status: { notIn: ['COMPLETED', 'APPROVED'] } },
    });

    const pendingRequirements = await this.prisma.graphicRequirement.count({
      where: { status: { notIn: ['COMPLETED', 'APPROVED'] } },
    });

    const techReviewQueue = activeProjects.filter((p) => p.status === 'WAITING_FOR_TECHNICAL_REVIEW').length;
    const mediaReviewQueue = activeProjects.filter((p) => p.status === 'WAITING_FOR_MEDIA_REVIEW').length;
    const clientQueue = activeProjects.filter((p) => p.status === 'WAITING_FOR_CLIENT_CONFIRMATION').length;
    const revisionQueue = activeProjects.filter((p) => p.status === 'CLIENT_REVISION_REQUESTED').length;
    const pendingReviews = techReviewQueue + mediaReviewQueue + clientQueue;

    const totalEquipment = await this.prisma.equipment.count();
    const availableEquipment = await this.prisma.equipment.count({ where: { availability: 'AVAILABLE' } });
    const reservedEquipment = await this.prisma.equipment.count({ where: { availability: 'RESERVED' } });
    const checkedOutEquipment = await this.prisma.equipment.count({ where: { availability: 'CHECKED_OUT' } });
    const underMaintenanceEquipment = await this.prisma.equipment.count({ where: { availability: 'UNDER_MAINTENANCE' } });
    const damagedEquipment = await this.prisma.equipment.count({ where: { availability: 'DAMAGED' } });
    const recentReturnedDate = new Date();
    recentReturnedDate.setDate(recentReturnedDate.getDate() - 7);
    const recentReturnedEquipment = await this.prisma.equipmentMovement.count({
      where: { action: 'RETURNED', timestamp: { gte: recentReturnedDate } },
    });

    const assignedEmployeesCount = await this.prisma.projectAssignment.groupBy({
      by: ['userId'],
    }).then((res) => res.length);

    const recentActivity = await this.prisma.activityLog.findMany({
      take: 10,
      orderBy: { timestamp: 'desc' },
      include: { user: { select: { name: true, role: true } } },
    });

    const todayIndoorShoots = activeProjects.filter(
      (p) => p.shootType === 'INDOOR' && new Date(p.shootDate) >= todayStart && new Date(p.shootDate) <= todayEnd,
    );

    const todayOutdoorShoots = activeProjects.filter(
      (p) => p.shootType === 'OUTDOOR' && new Date(p.shootDate) >= todayStart && new Date(p.shootDate) <= todayEnd,
    );

    const outdoorAwaitingPermission = await this.prisma.outdoorShootDetails.count({
      where: { permissionStatus: 'PENDING' },
    });

    const outdoorAffectedByWeather = await this.prisma.outdoorShootDetails.count({
      where: { weatherStatus: { in: ['RISK_RAIN', 'EXTREME_HEAT', 'POOR_LIGHT'] } },
    });

    const studioBookingConfirmed = await this.prisma.indoorShootDetails.count({
      where: { studioBookingStatus: 'CONFIRMED' },
    });
    const studioBookingPending = await this.prisma.indoorShootDetails.count({
      where: { studioBookingStatus: 'PENDING' },
    });
    const studioBookingCancelled = await this.prisma.indoorShootDetails.count({
      where: { studioBookingStatus: 'CANCELLED' },
    });

    // Calculate Attendance Metrics
    const activeUsers = await this.prisma.user.findMany({
      where: { isArchived: false },
      include: {
        attendanceRecords: {
          where: { date: { gte: todayStart, lte: todayEnd } },
        },
        employeeProfile: true,
        tasks: { include: { task: true } },
        deliverableUploads: { where: { createdAt: { gte: todayStart, lte: todayEnd } } },
      },
    });

    const totalEmployees = activeUsers.length;
    let presentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;
    let absentCount = 0;
    let totalAssignedHours = 0;
    let totalCapacityHours = 0;
    let totalDailyOutputsToday = 0;
    let totalDailyTargetsToday = 0;

    activeUsers.forEach((u) => {
      const att = u.attendanceRecords[0];
      if (att) {
        if (att.status === 'PRESENT') presentCount++;
        else if (att.status === 'LATE') lateCount++;
        else if (att.status === 'HALF_DAY') halfDayCount++;
        else if (att.status === 'ABSENT') absentCount++;
      }

      const activeTasks = u.tasks.map((t) => t.task).filter((t) => t && t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
      const taskHours = activeTasks.reduce((sum, t) => sum + (t.estimatedHours || 2.0), 0);
      totalAssignedHours += taskHours;

      const capHours = u.employeeProfile?.dailyCapacityHours || 8.0;
      totalCapacityHours += capHours;

      const completedToday = u.tasks.map((t) => t.task).filter((t) => t && t.status === 'COMPLETED' && new Date(t.updatedAt) >= todayStart).length;
      const uploadsToday = u.deliverableUploads.length;
      totalDailyOutputsToday += Math.max(completedToday, uploadsToday);
      totalDailyTargetsToday += u.employeeProfile?.dailyTarget || 1.0;
    });

    const attendancePercentage = totalEmployees > 0 ? Math.round(((presentCount + lateCount + halfDayCount * 0.5) / totalEmployees) * 100) : 0;
    const capacityUtilizationPercentage = totalCapacityHours > 0 ? Math.round((totalAssignedHours / totalCapacityHours) * 100) : 0;
    const overallProductivityPercentage = totalDailyTargetsToday > 0 ? Math.round((totalDailyOutputsToday / totalDailyTargetsToday) * 100) : 0;
    const totalCompletedProjects = await this.prisma.shootProject.count({ where: { status: 'COMPLETED' } });

    const inProgressProjects = activeProjects.filter((p) => p.status === 'IN_PROGRESS').length;
    const upcomingProjects = activeProjects.filter((p) => p.status === 'PLANNED' || new Date(p.shootDate) > todayEnd).length;
    const overdueProjectsCount = activeProjects.filter((p) => p.status !== 'COMPLETED' && p.status !== 'CANCELLED' && new Date(p.estimatedCompletionDate || p.shootDate) < todayStart).length;
    const overdueTasksCount = await this.prisma.task.count({
      where: { status: { not: 'COMPLETED' }, dueDate: { lt: todayStart } },
    });

    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    const upcomingProjectDeadlines = activeProjects
      .filter((p) => p.status !== 'COMPLETED' && new Date(p.estimatedCompletionDate || p.shootDate) <= sevenDaysLater)
      .map((p) => ({ id: p.id, title: p.name, code: p.projectId, type: 'PROJECT', dueDate: p.estimatedCompletionDate || p.shootDate, status: p.status, clientName: p.client?.name }));

    return {
      // 10 Mandatory Media Manager Dashboard Display Metrics
      totalActiveProjects: activeProjects.filter((p) => p.status !== 'COMPLETED' && p.status !== 'CANCELLED').length,
      inProgressProjects,
      upcomingProjects,
      overdueProjectsCount,
      overdueTasksCount,
      totalCompletedProjects,
      pendingApprovals: pendingScripts + pendingRequirements + techReviewQueue + mediaReviewQueue,
      pendingClientConfirmations: clientQueue + revisionQueue,
      upcomingDeadlines: upcomingProjectDeadlines,
      employeeWorkload: capacityUtilizationPercentage,
      todaysProduction: {
        actualOutput: totalDailyOutputsToday,
        targetOutput: totalDailyTargetsToday,
        achievementPercentage: overallProductivityPercentage,
      },
      employeeAttendance: {
        totalEmployees,
        presentCount,
        lateCount,
        halfDayCount,
        absentCount,
        attendancePercentage,
      },
      overallProductivity: overallProductivityPercentage,
      equipmentAvailability: {
        total: totalEquipment,
        available: availableEquipment,
        checkedOut: checkedOutEquipment,
        underMaintenance: underMaintenanceEquipment,
        damaged: damagedEquipment,
        availabilityPercentage: totalEquipment > 0 ? Math.round((availableEquipment / totalEquipment) * 100) : 100,
      },
      capacityUtilization: {
        totalCapacityHours,
        assignedHours: totalAssignedHours,
        utilizationPercentage: capacityUtilizationPercentage,
      },
      recentActivity,

      // Supporting Breakdowns
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
    };
  }

  /**
   * Dedicated Role Dashboard for Technical Managers
   * Gives Technical Managers a quick, focused workspace view of work requiring technical attention.
   */
  async getTechnicalManagerDashboard(userId: string) {
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 3600 * 1000);

    const [
      pendingApprovals,
      scriptsAwaiting,
      graphicReqsAwaiting,
      activeProjects,
      technicalTasks,
      notifications,
      recentActivity,
      equipmentAlerts,
      approvedGraphics,
      approvedScripts,
      approvedTasks,
      approvedProjects,
    ] = await Promise.all([
      // 1. Pending Technical Reviews / Approvals
      this.prisma.approval.findMany({
        where: {
          status: 'PENDING',
          OR: [
            { targetRole: 'TECHNICAL_MANAGER' },
            { approvalType: 'TECHNICAL_REVIEW' },
          ],
        },
        include: {
          project: { select: { id: true, projectId: true, name: true, shootDate: true, status: true } },
          requestedBy: { select: { id: true, name: true, role: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // 2. Scripts Awaiting Technical Review
      this.prisma.script.findMany({
        where: {
          status: { in: ['WAITING_FOR_TECHNICAL_REVIEW', 'TECHNICAL_REVIEW', 'TECHNICAL_REVIEW_PENDING', 'SUBMITTED_FOR_REVIEW'] },
        },
        include: {
          project: { select: { id: true, projectId: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),

      // 3. Graphic Requirements Awaiting Technical Review
      this.prisma.graphicRequirement.findMany({
        where: {
          status: { in: ['WAITING_FOR_TECHNICAL_REVIEW', 'TECHNICAL_REVIEW'] },
        },
        include: {
          project: { select: { id: true, projectId: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),

      // 4. Projects Requiring Technical Attention (Read-only Technical Status & Progress)
      this.prisma.shootProject.findMany({
        where: {
          lifecycle: { not: 'ARCHIVED' },
          OR: [
            { status: { in: ['WAITING_FOR_TECHNICAL_REVIEW', 'TECHNICAL_REVIEW', 'WAITING_FOR_MEDIA_REVIEW', 'POST_PRODUCTION', 'COMPLETED'] } },
            { approvals: { some: { approvalType: 'TECHNICAL_REVIEW', status: 'PENDING' } } },
          ],
        },
        include: {
          client: { select: { name: true } },
          tasks: {
            select: {
              id: true,
              title: true,
              status: true,
              dueDate: true,
              assignedEmployees: { select: { user: { select: { name: true, role: true } } } },
            },
          },
          approvals: { select: { id: true, approvalType: true, status: true } },
          scripts: { select: { id: true, name: true, status: true } },
          graphicRequirements: { select: { id: true, name: true, status: true } },
        },
        orderBy: { shootDate: 'asc' },
        take: 20,
      }),

      // 5. Technical-Related Tasks
      this.prisma.task.findMany({
        where: {
          status: { in: ['WAITING_FOR_TECHNICAL_REVIEW', 'TECHNICAL_REVIEW', 'WAITING_FOR_REVIEW', 'WAITING_FOR_MEDIA_REVIEW', 'COMPLETED'] },
        },
        include: {
          assignedEmployees: {
            include: {
              user: { select: { id: true, name: true, role: true, avatarUrl: true } },
            },
          },
          project: { select: { id: true, projectId: true, name: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 25,
      }),

      // 6. Relevant Notifications (Strictly Technical Notifications only; exclude administrative workload/capacity alerts)
      this.prisma.notification.findMany({
        where: {
          userId,
          status: { not: 'ARCHIVED' },
          eventType: { notIn: ['ALERT_EMPLOYEE_OVER_CAPACITY', 'STAFF_CAPACITY'] },
          entityType: { notIn: ['ATTENDANCE'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // 7. Recent Technical Activity
      this.prisma.activityLog.findMany({
        where: {
          OR: [
            { entity: { in: ['SCRIPT', 'GRAPHIC_REQ', 'EQUIPMENT', 'APPROVAL', 'REVIEW'] } },
            { action: { contains: 'TECHNICAL' } },
            { action: { contains: 'REVIEW' } },
            { action: { contains: 'EQUIPMENT' } },
          ],
        },
        include: {
          user: { select: { id: true, name: true, role: true } },
        },
        orderBy: { timestamp: 'desc' },
        take: 15,
      }),

      // 8. Equipment items needing technical service
      this.prisma.equipment.findMany({
        where: {
          isArchived: false,
          OR: [
            { availability: 'MAINTENANCE' },
            { availability: 'DAMAGED' },
            { maintenanceStatus: { in: ['NEEDS_SERVICE', 'UNDER_REPAIR'] } },
          ],
        },
        select: { id: true, equipmentId: true, name: true, availability: true, maintenanceStatus: true },
      }),

      // 9. Approved Graphic Requirements (Post-Technical Approval with live downstream updates)
      this.prisma.graphicRequirement.findMany({
        where: {
          OR: [
            { technicalReviewApproved: true },
            { status: { in: ['WAITING_FOR_MEDIA_REVIEW', 'MEDIA_MANAGER_REVIEW', 'WAITING_FOR_CLIENT_CONFIRMATION', 'COMPLETED', 'CLOSED'] } },
          ],
        },
        include: {
          project: { select: { id: true, projectId: true, name: true } },
          tasks: { select: { id: true, title: true, status: true, completionPercentage: true } },
          deliverables: { select: { id: true, name: true, status: true, fileUrl: true } },
          remarksHistory: {
            include: { user: { select: { id: true, name: true, role: true } } },
            orderBy: { createdAt: 'desc' },
            take: 2,
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 25,
      }),

      // 10. Approved Scripts (Post-Technical Approval with live downstream updates)
      this.prisma.script.findMany({
        where: {
          OR: [
            { technicalReviewApproved: true },
            { status: { in: ['WAITING_FOR_MEDIA_REVIEW', 'MEDIA_MANAGER_REVIEW', 'WAITING_FOR_MARKETING_APPROVAL', 'APPROVED', 'COMPLETED', 'CLOSED'] } },
          ],
        },
        include: {
          project: { select: { id: true, projectId: true, name: true } },
          scriptRemarks: {
            include: { user: { select: { id: true, name: true, role: true } } },
            orderBy: { createdAt: 'desc' },
            take: 2,
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 25,
      }),

      // 11. Approved Tasks (Post-Technical Approval with live downstream updates)
      this.prisma.task.findMany({
        where: {
          OR: [
            { technicalReviewApproved: true },
            { status: { in: ['WAITING_FOR_MEDIA_REVIEW', 'APPROVED', 'COMPLETED'] } },
          ],
        },
        include: {
          project: { select: { id: true, projectId: true, name: true } },
          script: { select: { id: true, scriptId: true, name: true } },
          graphicRequirement: { select: { id: true, requirementId: true, name: true } },
          remarksHistory: {
            include: { user: { select: { id: true, name: true, role: true } } },
            orderBy: { createdAt: 'desc' },
            take: 2,
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 25,
      }),

      // 12. Approved Projects / Events (Post-Technical Approval with live downstream updates)
      this.prisma.shootProject.findMany({
        where: {
          lifecycle: { not: 'ARCHIVED' },
          OR: [
            { status: { in: ['WAITING_FOR_MEDIA_REVIEW', 'POST_PRODUCTION', 'COMPLETED', 'CLOSED'] } },
            { approvals: { some: { approvalType: 'TECHNICAL_REVIEW', status: 'APPROVED' } } },
          ],
        },
        include: {
          client: { select: { name: true } },
          tasks: { select: { id: true, title: true, status: true } },
          approvals: { select: { id: true, approvalType: true, status: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
    ]);

    // Filter upcoming technical deadlines (due in <= 7 days)
    const upcomingTechnicalDeadlines = activeProjects
      .filter((p) => p.shootDate && new Date(p.shootDate) <= sevenDaysLater)
      .map((p) => ({
        id: p.id,
        code: p.projectId,
        title: p.name,
        type: 'PROJECT_SHOOT_DATE',
        dueDate: p.shootDate,
        clientName: p.client?.name,
        status: p.status,
      }));

    // Filter & Map projects specifically needing technical attention with full read-only technical metrics
    const projectsRequiringAttention = activeProjects.map((p: any) => {
      const totalTasks = p.tasks?.length || 0;
      const completedTasks = p.tasks?.filter((t: any) => t.status === 'COMPLETED').length || 0;
      const progressPercentage =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : p.status === 'COMPLETED' ? 100 : 35;

      const activeTechnicalTasks = (p.tasks || [])
        .filter((t: any) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED')
        .map((t: any) => t.title);

      const hasPendingTechApproval = p.approvals?.some(
        (a: any) => a.approvalType === 'TECHNICAL_REVIEW' && a.status === 'PENDING',
      );

      const technicalReviewStatus = hasPendingTechApproval
        ? 'WAITING_FOR_TECHNICAL_REVIEW'
        : p.status === 'TECHNICAL_REVIEW' || p.status === 'WAITING_FOR_TECHNICAL_REVIEW'
        ? 'TECHNICAL_REVIEW_IN_PROGRESS'
        : 'TECHNICAL_READINESS_OK';

      return {
        id: p.id,
        projectId: p.projectId,
        name: p.name,
        clientName: p.client?.name || 'Internal',
        status: p.status,
        shootDate: p.shootDate,
        estimatedCompletionDate: p.estimatedCompletionDate,
        progressPercentage,
        activeTechnicalTasksCount: activeTechnicalTasks.length,
        assignedTechnicalWork: activeTechnicalTasks.slice(0, 4),
        technicalReviewStatus,
        hasPendingTechApproval,
      };
    });

    // Map Graphic Requirements with explicit 5-stage workflow metadata
    const enrichedGraphicReqs = graphicReqsAwaiting.map((gr: any) => ({
      ...gr,
      currentStageIndex: 2,
      currentStageName: 'Technical Review',
      workflowStages: [
        { index: 1, name: 'Production', status: 'COMPLETED' },
        { index: 2, name: 'Technical Review', status: 'ACTIVE' },
        { index: 3, name: 'Media Manager Review', status: 'PENDING' },
        { index: 4, name: 'Client Confirmation', status: 'PENDING' },
        { index: 5, name: 'Completed', status: 'PENDING' },
      ],
    }));

    const totalWaitingForTechnicalReviewCount =
      pendingApprovals.length + scriptsAwaiting.length + graphicReqsAwaiting.length;

    const totalApprovedCount =
      approvedGraphics.length + approvedScripts.length + approvedTasks.length + approvedProjects.length;

    return {
      status: 'SUCCESS',
      roleScope: 'TECHNICAL_MANAGER',
      evaluatedAt: now.toISOString(),

      // Metrics Bar
      metricsSummary: {
        totalWaitingForTechnicalReviewCount,
        pendingReviewsCount: pendingApprovals.length,
        scriptsAwaitingCount: scriptsAwaiting.length,
        graphicsAwaitingCount: graphicReqsAwaiting.length,
        projectsAttentionCount: projectsRequiringAttention.length,
        upcomingDeadlinesCount: upcomingTechnicalDeadlines.length,
        activeTechnicalTasksCount: technicalTasks.length,
        equipmentMaintenanceCount: equipmentAlerts.length,
        totalApprovedCount,
      },

      // Section Data Arrays
      waitingForTechnicalReviewHub: {
        totalCount: totalWaitingForTechnicalReviewCount,
        pendingApprovals,
        scriptsAwaiting,
        graphicRequirementsAwaiting: enrichedGraphicReqs,
      },
      pendingTechnicalReviews: pendingApprovals,
      scriptsAwaitingTechnicalReview: scriptsAwaiting,
      graphicRequirementsAwaitingTechnicalReview: enrichedGraphicReqs,
      projectsRequiringTechnicalAttention: projectsRequiringAttention,
      upcomingTechnicalDeadlines,
      technicalTasks,
      relevantNotifications: notifications,
      recentTechnicalActivity: recentActivity,
      equipmentMaintenanceAlerts: equipmentAlerts,

      // Approved Technical Work with Live Downstream Updates
      approvedTechnicalItems: {
        totalCount: totalApprovedCount,
        graphics: approvedGraphics,
        scripts: approvedScripts,
        tasks: approvedTasks,
        projects: approvedProjects,
      },
      approvedGraphics,
      approvedScripts,
      approvedTasks,
      approvedProjects,
    };
  }

  async getGlobalSearch(query: string, user?: any) {
    if (!query || query.trim().length === 0) return { results: [] };
    const q = query.trim();
    const role = user?.role;

    const isStaff = role === 'STAFF';
    const isTechManager = role === 'TECHNICAL_MANAGER';

    const [clients, brands, products, projects, scripts, graphicReqs, tasks, equipment, staff, files] = await Promise.all([
      !isStaff && !isTechManager ? this.prisma.client.findMany({ where: { OR: [{ name: { contains: q } }, { companyName: { contains: q } }] }, take: 5 }) : Promise.resolve([]),
      !isStaff && !isTechManager ? this.prisma.brand.findMany({ where: { OR: [{ name: { contains: q } }, { shortCode: { contains: q } }] }, take: 5 }) : Promise.resolve([]),
      !isStaff && !isTechManager ? this.prisma.product.findMany({ where: { OR: [{ name: { contains: q } }, { productCode: { contains: q } }] }, take: 5 }) : Promise.resolve([]),
      this.prisma.shootProject.findMany({ where: { OR: [{ name: { contains: q } }, { projectId: { contains: q } }, { shootLocation: { contains: q } }] }, take: 5 }),
      !isStaff ? this.prisma.script.findMany({ where: { OR: [{ name: { contains: q } }, { scriptId: { contains: q } }] }, take: 5 }) : Promise.resolve([]),
      this.prisma.graphicRequirement.findMany({ where: { OR: [{ name: { contains: q } }, { requirementId: { contains: q } }] }, take: 5 }),
      isStaff
        ? this.prisma.task.findMany({
            where: {
              AND: [
                { OR: [{ title: { contains: q } }, { taskId: { contains: q } }] },
                { assignedEmployees: { some: { userId: user.id } } },
              ],
            },
            take: 5,
          })
        : this.prisma.task.findMany({ where: { OR: [{ title: { contains: q } }, { taskId: { contains: q } }] }, take: 5 }),
      this.prisma.equipment.findMany({ where: { OR: [{ name: { contains: q } }, { equipmentId: { contains: q } }, { serialNumber: { contains: q } }] }, take: 5 }),
      !isStaff && !isTechManager ? this.prisma.user.findMany({ where: { name: { contains: q } }, select: { id: true, name: true, role: true }, take: 5 }) : Promise.resolve([]),
      !isStaff ? this.prisma.fileMetadata.findMany({ where: { fileName: { contains: q } }, take: 5 }) : Promise.resolve([]),
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

  async getProductionReports(period?: string, startDate?: string, endDate?: string, clientId?: string, brandId?: string, productId?: string, departmentId?: string, employeeId?: string, projectId?: string, status?: string, search?: string) {
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

  async getEmployeeProductivityReport(period?: string, startDate?: string, endDate?: string, clientId?: string, brandId?: string, productId?: string, departmentId?: string, employeeId?: string, projectId?: string, status?: string, search?: string) {
    const { start: todayStart, end: todayEnd } = this.getDateRangeHelper(period, startDate, endDate);
    const filtersObj = { clientId, brandId, productId, departmentId, employeeId, projectId, status, search };

    // Load configurable output formulas from DB
    const formulas = await this.prisma.outputFormula.findMany();
    const formulaMap = new Map<string, number>();
    formulas.forEach((f) => {
      formulaMap.set(f.deliverableType.toUpperCase(), f.outputValue);
    });

    // Query users including historical contributors
    const usersRaw = await this.prisma.user.findMany({
      include: {
        employeeProfile: { include: { department: true } },
        tasks: {
          include: {
            task: true,
          },
        },
        attendanceRecords: {
          where: { date: { gte: todayStart, lte: todayEnd } },
          orderBy: { date: 'desc' },
        },
        deliverableUploads: {
          where: { createdAt: { gte: todayStart, lte: todayEnd } }
        },
      },
      orderBy: { name: 'asc' },
    });
    const users = this.inMemoryFilter(usersRaw, 'users', filtersObj);

    return users.map((u) => {
      const dailyTarget = u.employeeProfile?.dailyTarget || 1.0;
      const dailyCapacityHours = u.employeeProfile?.dailyCapacityHours || 8.0;

      const assignedTasksCount = u.tasks.length;
      const completedTasksCount = u.tasks.filter((t) => t.task && t.task.status === 'COMPLETED').length;
      const pendingTasksCount = u.tasks.filter((t) => t.task && t.task.status !== 'COMPLETED' && t.task.status !== 'CANCELLED').length;

      const completedTasksToday = u.tasks.filter((t) => {
        if (!t.task || t.task.status !== 'COMPLETED') return false;
        const compDate = new Date(t.task.updatedAt);
        return compDate >= todayStart && compDate <= todayEnd;
      }).length;

      // Calculate configurable formula weighted output
      let weightedUploads = 0;
      u.deliverableUploads.forEach((d: any) => {
        const fileType = (d.fileType || d.type || 'DEFAULT').toUpperCase();
        const weight = formulaMap.get(fileType) ?? formulaMap.get('DEFAULT') ?? 1.0;
        weightedUploads += weight;
      });

      const weightedTasks = completedTasksToday * (formulaMap.get('TASK') ?? 1.0);
      const actualDailyOutput = Math.round(Math.max(weightedTasks, weightedUploads, completedTasksToday) * 10) / 10;
      const targetAchievementPercentage = Math.round((actualDailyOutput / dailyTarget) * 100);

      let targetStatus = 'Met Target';
      if (targetAchievementPercentage > 100) targetStatus = 'Exceeded Target';
      else if (targetAchievementPercentage < 100) targetStatus = 'Below Target';

      // Completion Rate
      const completionRatePercentage = assignedTasksCount > 0 ? Math.round((completedTasksCount / assignedTasksCount) * 100) : (actualDailyOutput > 0 ? 100 : 0);

      // Average Completion Time Calculation
      const completedTaskObjs = u.tasks.filter((t) => t.task && t.task.status === 'COMPLETED').map((t) => t.task);
      let avgCompletionTimeHours = 0;
      let avgCompletionTimeFormatted = 'N/A';

      if (completedTaskObjs.length > 0) {
        const totalDurationMs = completedTaskObjs.reduce((sum, t) => {
          const created = new Date(t.createdAt).getTime();
          const updated = new Date(t.updatedAt).getTime();
          return sum + Math.max(0, updated - created);
        }, 0);
        avgCompletionTimeHours = Math.round((totalDurationMs / (1000 * 60 * 60 * completedTaskObjs.length)) * 10) / 10;
        if (avgCompletionTimeHours >= 24) {
          avgCompletionTimeFormatted = `${(avgCompletionTimeHours / 24).toFixed(1)} days`;
        } else {
          avgCompletionTimeFormatted = `${avgCompletionTimeHours} hrs`;
        }
      }

      // Attendance & Revisions Mapping
      const todayAttRecord = u.attendanceRecords[0];
      let attendance = todayAttRecord ? todayAttRecord.status : 'NOT_MARKED';
      if (!todayAttRecord && period === 'today') {
        attendance = 'NOT_MARKED';
      }

      const revisionCount = u.deliverableUploads.filter((d) => (d as any).version > 1).length;

      // Overall Score Calculation (Configurable equivalent)
      let attScore = 0;
      if (attendance === 'PRESENT') attScore = 100;
      else if (attendance === 'LATE') attScore = 75;
      else if (attendance === 'HALF_DAY') attScore = 50;

      const achievementScore = Math.min(targetAchievementPercentage, 100);
      const revPenalty = Math.min(revisionCount * 5, 20); // Max 20% penalty
      const pendingPenalty = Math.min(pendingTasksCount * 2, 10); // Max 10% penalty

      let overallProductivityScore = Math.round((attScore * 0.2) + (achievementScore * 0.3) + (completionRatePercentage * 0.5) - revPenalty - pendingPenalty);
      if (overallProductivityScore < 0) overallProductivityScore = 0;
      if (overallProductivityScore > 100) overallProductivityScore = 100;

      return {
        userId: u.id,
        // 1. Employee Name
        employeeName: u.name,
        name: u.name,
        email: u.email,
        designation: u.employeeProfile?.designation || 'Staff Member',
        department: u.employeeProfile?.department?.name || 'General Operations',
        // 2. Attendance
        attendance,
        attendanceStatus: attendance,
        // 3. Assigned Tasks
        assignedTasks: assignedTasksCount,
        assignedTasksCount,
        // 4. Completed Tasks
        completedTasks: completedTasksCount,
        completedTasksCount,
        // 5. Daily Target
        dailyTarget,
        weeklyTarget: u.employeeProfile?.weeklyTarget || dailyTarget * 5,
        monthlyTarget: u.employeeProfile?.monthlyTarget || dailyTarget * 20,
        // 6. Actual Output
        actualOutput: actualDailyOutput,
        actualDailyOutput,
        // 7. Target Achievement Percentage
        targetAchievementPercentage,
        achievementPercentage: targetAchievementPercentage,
        // 8. Revision Count
        revisionCount,
        // 9. Pending Tasks
        pendingTasks: pendingTasksCount,
        pendingTasksCount,
        // 10. Completion Rate
        completionRatePercentage,
        completionRate: completionRatePercentage,
        // 11. Overall Score
        overallProductivityScore,
        // 12. Average Completion Time
        avgCompletionTimeHours,
        avgCompletionTimeFormatted,
        averageCompletionTime: avgCompletionTimeFormatted,

        status: targetStatus,
        dailyCapacityHours,
      };
    });
  }

  async getScriptAnalytics(period?: string, startDate?: string, endDate?: string, clientId?: string, brandId?: string, productId?: string, departmentId?: string, employeeId?: string, projectId?: string, status?: string, search?: string) {
    const { start, end } = this.getDateRangeHelper(period, startDate, endDate);
    const filtersObj = { clientId, brandId, productId, departmentId, employeeId, projectId, status, search };

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

    const deliverablesByType: Record<string, number> = {};
    scripts.forEach((s) => {
      (s.deliverables || []).forEach((d) => {
        deliverablesByType[d.type] = (deliverablesByType[d.type] || 0) + 1;
      });
    });

    const bottleneckScripts = scripts
      .filter((s) => (s.revisionCount || 0) > 1 || s.status === 'CLIENT_REVISION_REQUESTED')
      .map((s) => ({
        id: s.id,
        scriptId: s.scriptId,
        name: s.name,
        revisionCount: s.revisionCount,
        status: s.status,
      }));

    return {
      employeeProductivity,
      brandPerformance,
      productPerformance,
      languageWiseReports,
      categoryWiseReports,
      productionCapacity: deliverablesByType,
      bottleneckScripts,
      scriptSummary: {
        total: scripts.length,
        completed: scripts.filter((s) => s.status === 'COMPLETED').length,
        inProduction: scripts.filter((s) => s.status === 'IN_PRODUCTION').length,
        inRevision: scripts.filter((s) => s.status === 'CLIENT_REVISION_REQUESTED').length,
      },
    };
  }

  async getGraphicAnalytics(period?: string, startDate?: string, endDate?: string, clientId?: string, brandId?: string, productId?: string, departmentId?: string, employeeId?: string, projectId?: string, status?: string, search?: string) {
    const { start, end } = this.getDateRangeHelper(period, startDate, endDate);
    const filtersObj = { clientId, brandId, productId, departmentId, employeeId, projectId, status, search };

    const graphicReqs = await this.prisma.graphicRequirement.findMany({
      include: {
        brand: true,
        product: true,
        client: true,
        project: { include: { assignedTeam: { include: { user: { select: { id: true, name: true, role: true } } } } } },
        files: true,
        timeline: true,
        remarksHistory: true,
      },
    });

    const reqStatusMap: Record<string, number> = {};
    graphicReqs.forEach((g) => {
      reqStatusMap[g.status] = (reqStatusMap[g.status] || 0) + 1;
    });

    const delivTypeMap: Record<string, number> = {};
    graphicReqs.forEach((g) => {
      delivTypeMap[g.requirementType] = (delivTypeMap[g.requirementType] || 0) + 1;
    });

    const revMap: Record<string, { requirementId: string; name: string; revisionCount: number }> = {};
    graphicReqs.forEach((g) => {
      if (g.revisionCount > 0) {
        revMap[g.id] = { requirementId: g.requirementId, name: g.name, revisionCount: g.revisionCount };
      }
    });

    const bottleneckList = graphicReqs
      .filter((g) => g.revisionCount > 1 || g.status === 'CLIENT_REVISION_REQUESTED')
      .map((g) => ({
        id: g.id,
        requirementId: g.requirementId,
        name: g.name,
        revisionCount: g.revisionCount,
        status: g.status,
      }));

    const teamMap: Record<string, { userId: string; name: string; role: string; assignedReqsCount: number; completedCount: number; revisionCount: number }> = {};
    graphicReqs.forEach((g) => {
      (g.project?.assignedTeam || []).forEach((at) => {
        if (!at.user) return;
        const uid = at.userId;
        if (!teamMap[uid]) {
          teamMap[uid] = { userId: uid, name: at.user.name, role: at.user.role, assignedReqsCount: 0, completedCount: 0, revisionCount: 0 };
        }
        teamMap[uid].assignedReqsCount++;
        if (g.status === 'COMPLETED') teamMap[uid].completedCount++;
        teamMap[uid].revisionCount += g.revisionCount || 0;
      });
    });

    const turnaroundMap: Record<string, { requirementId: string; name: string; daysToComplete: number }> = {};
    graphicReqs.forEach((g) => {
      if (g.status === 'COMPLETED') {
        const created = new Date(g.createdAt).getTime();
        const updated = new Date(g.updatedAt).getTime();
        const diffDays = Math.max(1, Math.round((updated - created) / (1000 * 60 * 60 * 24)));
        turnaroundMap[g.id] = { requirementId: g.requirementId, name: g.name, daysToComplete: diffDays };
      }
    });

    return {
      graphicRequirementStatus: reqStatusMap,
      deliverableTypeBreakdown: delivTypeMap,
      revisionsPerRequirement: revMap,
      bottleneckAnalysis: bottleneckList,
      teamContribution: Object.values(teamMap),
      turnaroundTimeByDesigner: Object.values(turnaroundMap),
    };
  }

  async getEmployeeAnalyticsReport(period?: string, startDate?: string, endDate?: string, clientId?: string, brandId?: string, productId?: string, departmentId?: string, employeeId?: string, projectId?: string, status?: string, search?: string) {
    const { start, end } = this.getDateRangeHelper(period, startDate, endDate);
    const filtersObj = { clientId, brandId, productId, departmentId, employeeId, projectId, status, search };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const usersRaw = await this.prisma.user.findMany({
      where: { isArchived: false },
      include: {
        employeeProfile: { include: { department: true } },
        tasks: {
          include: {
            task: true,
          },
        },
        attendanceRecords: true,
        deliverableUploads: true,
      },
      orderBy: { name: 'asc' },
    });
    const users = this.inMemoryFilter(usersRaw, 'users', filtersObj);

    const formulas = await this.prisma.outputFormula.findMany();
    const formulaMap = new Map<string, number>();
    formulas.forEach((f) => {
      formulaMap.set(f.deliverableType.toUpperCase(), f.outputValue);
    });

    // 1. Employee Productivity Report
    const employeeProductivityReport = users.map((u) => {
      const activeTasks = u.tasks.map((t) => t.task).filter((t) => t && t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
      const completedTasks = u.tasks.map((t) => t.task).filter((t) => t && t.status === 'COMPLETED');
      const completedTasksToday = completedTasks.filter((t) => new Date(t.updatedAt) >= todayStart).length;
      
      let weightedUploads = 0;
      u.deliverableUploads.filter((d) => new Date(d.createdAt) >= todayStart).forEach((d: any) => {
        const fileType = (d.fileType || d.type || 'DEFAULT').toUpperCase();
        const weight = formulaMap.get(fileType) ?? formulaMap.get('DEFAULT') ?? 1.0;
        weightedUploads += weight;
      });

      const weightedTasks = completedTasksToday * (formulaMap.get('TASK') ?? 1.0);
      const actualDailyOutput = Math.round(Math.max(weightedTasks, weightedUploads, completedTasksToday) * 10) / 10;
      const dailyTarget = u.employeeProfile?.dailyTarget || 1.0;
      const productivityPercentage = Math.round((actualDailyOutput / dailyTarget) * 100);

      return {
        userId: u.id,
        name: u.name,
        designation: u.employeeProfile?.designation || 'Staff Member',
        department: u.employeeProfile?.department?.name || 'General Operations',
        activeTasksCount: activeTasks.length,
        completedTasksCount: completedTasks.length,
        actualDailyOutput,
        dailyTarget,
        productivityPercentage,
      };
    });

    // 2. Attendance Report
    const attendanceReport = users.map((u) => {
      const records = u.attendanceRecords;
      const totalRecordedDays = records.length;
      const presentCount = records.filter((r) => r.status === 'PRESENT').length;
      const lateCount = records.filter((r) => r.status === 'LATE').length;
      const halfDayCount = records.filter((r) => r.status === 'HALF_DAY').length;
      const absentCount = records.filter((r) => r.status === 'ABSENT').length;
      const attendancePercentage = totalRecordedDays > 0 ? Math.round(((presentCount + lateCount + halfDayCount * 0.5) / totalRecordedDays) * 100) : 0;

      return {
        userId: u.id,
        name: u.name,
        department: u.employeeProfile?.department?.name || 'General Operations',
        totalRecordedDays,
        presentCount,
        lateCount,
        halfDayCount,
        absentCount,
        attendancePercentage,
      };
    });

    // 3. Target Achievement Report
    const targetAchievementReport = users.map((u) => {
      const dailyTarget = u.employeeProfile?.dailyTarget || 1.0;
      const weeklyTarget = u.employeeProfile?.weeklyTarget || dailyTarget * 5;
      const monthlyTarget = u.employeeProfile?.monthlyTarget || dailyTarget * 20;

      const completedTasksToday = u.tasks.map((t) => t.task).filter((t) => t && t.status === 'COMPLETED' && new Date(t.updatedAt) >= todayStart).length;
      const completedUploadsToday = u.deliverableUploads.filter((d) => new Date(d.createdAt) >= todayStart).length;
      const actualDailyOutput = Math.max(completedTasksToday, completedUploadsToday);
      const achievementPercentage = Math.round((actualDailyOutput / dailyTarget) * 100);

      let targetStatus = 'Met Target';
      if (achievementPercentage > 100) targetStatus = 'Exceeded Target';
      else if (achievementPercentage < 100) targetStatus = 'Below Target';

      return {
        userId: u.id,
        name: u.name,
        designation: u.employeeProfile?.designation || 'Staff Member',
        department: u.employeeProfile?.department?.name || 'General Operations',
        dailyTarget,
        weeklyTarget,
        monthlyTarget,
        actualDailyOutput,
        achievementPercentage,
        targetStatus,
      };
    });

    // 4. Capacity Utilization Report
    const capacityUtilizationReport = users.map((u) => {
      const activeTasks = u.tasks.map((t) => t.task).filter((t) => t && t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
      const dailyCapacityHours = u.employeeProfile?.dailyCapacityHours || 8.0;
      const assignedHours = activeTasks.reduce((sum, t) => sum + (t.estimatedHours || 2.0), 0);
      const remainingCapacityHours = Math.max(0, dailyCapacityHours - assignedHours);
      const capacityUtilizationPercentage = Math.round((assignedHours / dailyCapacityHours) * 100);

      return {
        userId: u.id,
        name: u.name,
        dailyCapacityHours,
        assignedHours,
        remainingCapacityHours,
        capacityUtilizationPercentage,
        isOverloaded: assignedHours > dailyCapacityHours,
      };
    });

    // 5. Department Performance Report
    const deptMap: Record<string, { department: string; headcount: number; totalProductivity: number; totalAttendancePct: number; totalCapacityUtilization: number }> = {};
    users.forEach((u) => {
      const dName = u.employeeProfile?.department?.name || 'General Operations';
      if (!deptMap[dName]) {
        deptMap[dName] = { department: dName, headcount: 0, totalProductivity: 0, totalAttendancePct: 0, totalCapacityUtilization: 0 };
      }
      deptMap[dName].headcount++;

      const completedTasksToday = u.tasks.map((t) => t.task).filter((t) => t && t.status === 'COMPLETED' && new Date(t.updatedAt) >= todayStart).length;
      const dailyTarget = u.employeeProfile?.dailyTarget || 1.0;
      const prodPct = Math.round((completedTasksToday / dailyTarget) * 100);
      deptMap[dName].totalProductivity += prodPct;

      const records = u.attendanceRecords;
      const presentCount = records.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
      const attPct = records.length > 0 ? Math.round((presentCount / records.length) * 100) : 0;
      deptMap[dName].totalAttendancePct += attPct;

      const activeTasks = u.tasks.map((t) => t.task).filter((t) => t && t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
      const assignedHours = activeTasks.reduce((sum, t) => sum + (t.estimatedHours || 2.0), 0);
      const capPct = Math.round((assignedHours / (u.employeeProfile?.dailyCapacityHours || 8.0)) * 100);
      deptMap[dName].totalCapacityUtilization += capPct;
    });

    const departmentPerformanceReport = Object.values(deptMap).map((d) => ({
      department: d.department,
      headcount: d.headcount,
      avgProductivityPercentage: Math.round(d.totalProductivity / d.headcount),
      avgAttendancePercentage: Math.round(d.totalAttendancePct / d.headcount),
      avgCapacityUtilizationPercentage: Math.round(d.totalCapacityUtilization / d.headcount),
    }));

    // 6. Employee Workload Report
    const employeeWorkloadReport = users.map((u) => {
      const activeTasks = u.tasks.map((t) => t.task).filter((t) => t && t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
      const dailyCapacityHours = u.employeeProfile?.dailyCapacityHours || 8.0;
      const assignedHours = activeTasks.reduce((sum, t) => sum + (t.estimatedHours || 2.0), 0);
      const weightedWorkloadHours = activeTasks.reduce((sum, t) => {
        let mult = 1.0;
        if (t.priority === 'CRITICAL') mult = 1.4;
        else if (t.priority === 'HIGH') mult = 1.2;
        return sum + (t.estimatedHours || 2.0) * mult;
      }, 0);

      const workloadPercentage = Math.round((weightedWorkloadHours / dailyCapacityHours) * 100);
      let workloadStatus = 'Available';
      if (u.status !== 'ACTIVE') workloadStatus = 'Offline';
      else if (workloadPercentage > 100) workloadStatus = 'Overloaded';
      else if (workloadPercentage >= 75 || activeTasks.length >= 3) workloadStatus = 'Busy';

      return {
        userId: u.id,
        name: u.name,
        designation: u.employeeProfile?.designation || 'Staff Member',
        activeTaskCount: activeTasks.length,
        assignedHours,
        weightedWorkloadHours: Math.round(weightedWorkloadHours * 10) / 10,
        workloadPercentage,
        workloadStatus,
      };
    });

    // 7. Output Performance Report
    const totalDailyOutputs = users.reduce((sum, u) => {
      const completedTasksToday = u.tasks.map((t) => t.task).filter((t) => t && t.status === 'COMPLETED' && new Date(t.updatedAt) >= todayStart).length;
      return sum + completedTasksToday;
    }, 0);
    const totalDailyTargets = users.reduce((sum, u) => sum + (u.employeeProfile?.dailyTarget || 1.0), 0);

    const outputPerformanceReport = {
      totalEmployees: users.length,
      totalDailyTargets,
      totalDailyOutputs,
      overallAchievementPercentage: totalDailyTargets > 0 ? Math.round((totalDailyOutputs / totalDailyTargets) * 100) : 0,
      formulas,
    };

    // Actionable Insights Engine for Media Manager Decision-Making
    const overloadedEmployees = capacityUtilizationReport.filter((c) => c.isOverloaded);
    const underutilizedEmployees = capacityUtilizationReport.filter((c) => c.capacityUtilizationPercentage < 50 && !c.isOverloaded);
    const belowTargetEmployees = targetAchievementReport.filter((t) => t.targetStatus === 'Below Target');
    const highPerformers = targetAchievementReport.filter((t) => t.targetStatus === 'Exceeded Target');

    const actionableInsights = {
      executiveSummary: `${overloadedEmployees.length} employee(s) exceed capacity, ${underutilizedEmployees.length} employee(s) have available bandwidth (<50% utilization), and ${belowTargetEmployees.length} employee(s) are below daily target.`,
      recommendedActions: [
        overloadedEmployees.length > 0
          ? `Workload Redistribution: Reassign tasks from overloaded staff (${overloadedEmployees.map((e) => e.name).join(', ')}) to available staff (${underutilizedEmployees.map((e) => e.name).join(', ') || 'Available Pool'}).`
          : 'Workload Balance: Operational capacity is currently balanced across all active staff.',
        belowTargetEmployees.length > 0
          ? `Target Support: Review resource allocation and daily targets for ${belowTargetEmployees.map((e) => e.name).join(', ')}.`
          : 'Target Achievement: All active staff are meeting or exceeding daily production targets.',
        highPerformers.length > 0
          ? `High Performer Recognition: ${highPerformers.map((e) => e.name).join(', ')} exceeded production targets today.`
          : 'Performance Baseline: Maintain current output velocity across teams.',
      ],
      overloadedCount: overloadedEmployees.length,
      underutilizedCount: underutilizedEmployees.length,
      belowTargetCount: belowTargetEmployees.length,
      highPerformerCount: highPerformers.length,
    };

    return {
      actionableInsights,
      employeeProductivityReport,
      attendanceReport,
      targetAchievementReport,
      capacityUtilizationReport,
      departmentPerformanceReport,
      employeeWorkloadReport,
      outputPerformanceReport,
    };
  }

  async getBrandPerformanceReports(period?: string, startDate?: string, endDate?: string, clientId?: string, brandId?: string, productId?: string, departmentId?: string, employeeId?: string, projectId?: string, status?: string, search?: string) {
    const { start, end } = this.getDateRangeHelper(period, startDate, endDate);
    const filtersObj = { clientId, brandId, productId, departmentId, employeeId, projectId, status, search };

    const [brands, clients, allProjects, allScripts, allGraphicReqs] = await Promise.all([
      this.prisma.brand.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.client.findMany(),
      this.prisma.shootProject.findMany({ include: { revisions: true } }),
      this.prisma.script.findMany(),
      this.prisma.graphicRequirement.findMany(),
    ]);

    const clientMap = new Map(clients.map((c) => [c.id, c]));

    return brands.map((b) => {
      const bProjects = allProjects.filter((p) => p.brandId === b.id);
      const bScripts = allScripts.filter((s) => s.brandId === b.id);
      const bGraphicReqs = allGraphicReqs.filter((g) => g.brandId === b.id);
      const client = clientMap.get(b.clientId);

      // 1. Total Projects
      const totalProjects = bProjects.length;

      // 2. Total Deliverables (Scripts + Graphic Requirements)
      const totalScripts = bScripts.length;
      const totalGraphicReqs = bGraphicReqs.length;
      const totalDeliverables = totalScripts + totalGraphicReqs;

      // 3. Total Outputs (Completed deliverables / files)
      const completedScripts = bScripts.filter((s) => s.status === 'COMPLETED' || s.status === 'APPROVED').length;
      const completedGraphicReqs = bGraphicReqs.filter((g) => g.status === 'COMPLETED' || g.status === 'APPROVED').length;
      const completedProjects = bProjects.filter((p) => p.status === 'COMPLETED').length;
      const totalOutputs = completedScripts + completedGraphicReqs + completedProjects;

      // 4. Production Status Breakdown
      const statusCounts: Record<string, number> = {
        PLANNING: 0,
        IN_PROGRESS: 0,
        WAITING_FOR_REVIEW: 0,
        COMPLETED: 0,
      };
      bProjects.forEach((p) => {
        const st = p.status || 'PLANNING';
        if (st.includes('WAITING') || st.includes('REVISION')) statusCounts.WAITING_FOR_REVIEW++;
        else if (st === 'COMPLETED') statusCounts.COMPLETED++;
        else if (st === 'IN_PROGRESS' || st.includes('SHOOT')) statusCounts.IN_PROGRESS++;
        else statusCounts.PLANNING++;
      });

      // 5. Pending Deliverables
      const pendingScripts = bScripts.filter((s) => s.status !== 'COMPLETED' && s.status !== 'APPROVED').length;
      const pendingGraphicReqs = bGraphicReqs.filter((g) => g.status !== 'COMPLETED' && g.status !== 'APPROVED').length;
      const pendingProjects = bProjects.filter((p) => p.status !== 'COMPLETED' && p.status !== 'CANCELLED').length;
      const pendingDeliverables = pendingScripts + pendingGraphicReqs + pendingProjects;

      // 6. Completion Rate Percentage
      const grandTotalItems = totalProjects + totalDeliverables;
      const completionRatePercentage = grandTotalItems > 0 ? Math.round((totalOutputs / grandTotalItems) * 100) : 100;

      // 7. Revision Count
      const projectRevisions = bProjects.reduce((sum, p) => sum + (p.revisionCount || p.revisions.length || 0), 0);
      const graphicRevisions = bGraphicReqs.reduce((sum, g) => sum + (g.revisionCount || 0), 0);
      const revisionCount = projectRevisions + graphicRevisions;

      // 8. Average Delivery Time
      const completedItems = [
        ...bProjects.filter((p) => p.status === 'COMPLETED'),
        ...bGraphicReqs.filter((g) => g.status === 'COMPLETED'),
      ];

      let avgDeliveryTimeHours = 0;
      let avgDeliveryTimeFormatted = 'N/A';

      if (completedItems.length > 0) {
        const totalDurationMs = completedItems.reduce((sum, item) => {
          const created = new Date(item.createdAt).getTime();
          const updated = new Date(item.updatedAt).getTime();
          return sum + Math.max(0, updated - created);
        }, 0);
        avgDeliveryTimeHours = Math.round((totalDurationMs / (1000 * 60 * 60 * completedItems.length)) * 10) / 10;
        if (avgDeliveryTimeHours >= 24) {
          avgDeliveryTimeFormatted = `${(avgDeliveryTimeHours / 24).toFixed(1)} days`;
        } else {
          avgDeliveryTimeFormatted = `${avgDeliveryTimeHours} hrs`;
        }
      }

      return {
        brandId: b.id,
        brandName: b.name,
        shortCode: b.shortCode,
        clientName: client?.name || client?.companyName || 'N/A',
        // 8 Mandatory Metrics:
        totalProjects,
        totalDeliverables,
        totalOutputs,
        productionStatus: statusCounts,
        pendingDeliverables,
        completionRatePercentage,
        revisionCount,
        avgDeliveryTimeFormatted,
        avgDeliveryTimeHours,
      };
    });
  }

  async getClientPerformanceReports(period?: string, startDate?: string, endDate?: string, clientId?: string, brandId?: string, productId?: string, departmentId?: string, employeeId?: string, projectId?: string, status?: string, search?: string) {
    const { start, end } = this.getDateRangeHelper(period, startDate, endDate);
    const filtersObj = { clientId, brandId, productId, departmentId, employeeId, projectId, status, search };

    const [clients, allProjects, allScripts, allGraphicReqs] = await Promise.all([
      this.prisma.client.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.shootProject.findMany({ include: { revisions: true } }),
      this.prisma.script.findMany(),
      this.prisma.graphicRequirement.findMany(),
    ]);

    return clients.map((c) => {
      const cProjects = allProjects.filter((p) => p.clientId === c.id);
      const cScripts = allScripts.filter((s) => s.clientId === c.id);
      const cGraphicReqs = allGraphicReqs.filter((g) => g.clientId === c.id);

      // 1. Total Projects
      const totalProjects = cProjects.length;

      // 2. Total Deliverables (Scripts + Graphic Requirements)
      const totalScripts = cScripts.length;
      const totalGraphicReqs = cGraphicReqs.length;
      const totalDeliverables = totalScripts + totalGraphicReqs;

      // 3. Pending Approvals (Deliverables/Projects waiting for tech, media, or client review)
      const pendingProjectsReview = cProjects.filter((p) => p.status?.includes('WAITING') || p.status?.includes('REVISION')).length;
      const pendingScriptsReview = cScripts.filter((s) => s.status === 'PENDING' || s.status === 'IN_REVIEW').length;
      const pendingGraphicReqsReview = cGraphicReqs.filter((g) => g.status === 'PENDING' || g.status === 'IN_REVIEW').length;
      const pendingApprovals = pendingProjectsReview + pendingScriptsReview + pendingGraphicReqsReview;

      // 4. Completed Projects
      const completedProjects = cProjects.filter((p) => p.status === 'COMPLETED').length;

      // 5. Average Project Duration
      const finishedProjects = cProjects.filter((p) => p.status === 'COMPLETED');
      let avgProjectDurationHours = 0;
      let avgProjectDurationFormatted = 'N/A';

      if (finishedProjects.length > 0) {
        const totalDurationMs = finishedProjects.reduce((sum, p) => {
          const created = new Date(p.createdAt).getTime();
          const updated = new Date(p.updatedAt).getTime();
          return sum + Math.max(0, updated - created);
        }, 0);
        avgProjectDurationHours = Math.round((totalDurationMs / (1000 * 60 * 60 * finishedProjects.length)) * 10) / 10;
        if (avgProjectDurationHours >= 24) {
          avgProjectDurationFormatted = `${(avgProjectDurationHours / 24).toFixed(1)} days`;
        } else {
          avgProjectDurationFormatted = `${avgProjectDurationHours} hrs`;
        }
      }

      // 6. Revision Requests
      const projectRevisions = cProjects.reduce((sum, p) => sum + (p.revisionCount || p.revisions?.length || 0), 0);
      const graphicRevisions = cGraphicReqs.reduce((sum, g) => sum + (g.revisionCount || 0), 0);
      const revisionRequests = projectRevisions + graphicRevisions;

      // 7. Production Summary
      const productionSummary: Record<string, number> = {
        PLANNING: 0,
        IN_PROGRESS: 0,
        WAITING_FOR_REVIEW: 0,
        COMPLETED: 0,
      };
      cProjects.forEach((p) => {
        const st = p.status || 'PLANNING';
        if (st.includes('WAITING') || st.includes('REVISION')) productionSummary.WAITING_FOR_REVIEW++;
        else if (st === 'COMPLETED') productionSummary.COMPLETED++;
        else if (st === 'IN_PROGRESS' || st.includes('SHOOT')) productionSummary.IN_PROGRESS++;
        else productionSummary.PLANNING++;
      });

      return {
        clientId: c.id,
        clientName: c.name,
        companyName: c.companyName,
        email: c.email,
        mobile: c.mobile,
        status: c.status,
        // 7 Mandatory Metrics:
        totalProjects,
        totalDeliverables,
        pendingApprovals,
        completedProjects,
        avgProjectDurationFormatted,
        avgProjectDurationHours,
        revisionRequests,
        productionSummary,
      };
    });
  }

  async getProductPerformanceReports(period?: string, startDate?: string, endDate?: string, clientId?: string, brandId?: string, productId?: string, departmentId?: string, employeeId?: string, projectId?: string, status?: string, search?: string) {
    const { start, end } = this.getDateRangeHelper(period, startDate, endDate);
    const filtersObj = { clientId, brandId, productId, departmentId, employeeId, projectId, status, search };

    const [products, brands, allProjects, allScripts, allGraphicReqs] = await Promise.all([
      this.prisma.product.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.brand.findMany(),
      this.prisma.shootProject.findMany(),
      this.prisma.script.findMany(),
      this.prisma.graphicRequirement.findMany(),
    ]);

    const brandMap = new Map(brands.map((b) => [b.id, b]));

    return products.map((p) => {
      const pProjects = allProjects.filter((proj) => proj.productId === p.id);
      const pScripts = allScripts.filter((s) => s.productId === p.id);
      const pGraphicReqs = allGraphicReqs.filter((g) => g.productId === p.id);
      const brand = brandMap.get(p.brandId);

      // 1. Total Productions
      const totalProductions = pProjects.length + pScripts.length + pGraphicReqs.length;

      // 2. Videos
      const videoGraphicReqs = pGraphicReqs.filter(
        (g) => (g.requirementType || '').toUpperCase().includes('VIDEO') || (g.name || '').toUpperCase().includes('VIDEO')
      ).length;
      const videos = pProjects.length + pScripts.length + videoGraphicReqs;

      // 3. Posters
      const posters = pGraphicReqs.filter(
        (g) => (g.requirementType || '').toUpperCase().includes('POSTER') || (g.name || '').toUpperCase().includes('POSTER')
      ).length;

      // 4. Carousels
      const carousels = pGraphicReqs.filter(
        (g) => (g.requirementType || '').toUpperCase().includes('CAROUSEL') || (g.name || '').toUpperCase().includes('CAROUSEL')
      ).length;

      // 5. Awareness Campaigns
      const awarenessProjects = pProjects.filter((proj) => (proj.name || '').toUpperCase().includes('AWARENESS')).length;
      const awarenessGraphics = pGraphicReqs.filter(
        (g) => (g.objective || '').toUpperCase().includes('AWARENESS') || (g.name || '').toUpperCase().includes('AWARENESS')
      ).length;
      const awarenessCampaigns = awarenessProjects + awarenessGraphics;

      // 6. Advertisement Campaigns
      const adProjects = pProjects.filter(
        (proj) => (proj.name || '').toUpperCase().includes('AD') || (proj.name || '').toUpperCase().includes('CAMPAIGN')
      ).length;
      const adGraphics = pGraphicReqs.filter(
        (g) =>
          (g.objective || '').toUpperCase().includes('AD') ||
          (g.objective || '').toUpperCase().includes('PROMOTION') ||
          (g.name || '').toUpperCase().includes('AD')
      ).length;
      const advertisementCampaigns = adProjects + adGraphics;

      // 7. Pending Deliverables
      const pendingProjects = pProjects.filter((proj) => proj.status !== 'COMPLETED').length;
      const pendingScripts = pScripts.filter((s) => s.status !== 'COMPLETED' && s.status !== 'APPROVED').length;
      const pendingGraphics = pGraphicReqs.filter((g) => g.status !== 'COMPLETED' && g.status !== 'APPROVED').length;
      const pendingDeliverables = pendingProjects + pendingScripts + pendingGraphics;

      // 8. Completed Deliverables
      const completedProjects = pProjects.filter((proj) => proj.status === 'COMPLETED').length;
      const completedScripts = pScripts.filter((s) => s.status === 'COMPLETED' || s.status === 'APPROVED').length;
      const completedGraphics = pGraphicReqs.filter((g) => g.status === 'COMPLETED' || g.status === 'APPROVED').length;
      const completedDeliverables = completedProjects + completedScripts + completedGraphics;

      return {
        productId: p.id,
        productName: p.name,
        productCode: p.productCode,
        category: p.category || 'General',
        status: p.status,
        brandName: brand?.name || 'N/A',
        // 8 Mandatory Metrics:
        totalProductions,
        videos,
        posters,
        carousels,
        awarenessCampaigns,
        advertisementCampaigns,
        pendingDeliverables,
        completedDeliverables,
      };
    });
  }

  async getDepartmentPerformanceReports(period?: string, startDate?: string, endDate?: string, clientId?: string, brandId?: string, productId?: string, departmentId?: string, employeeId?: string, projectId?: string, status?: string, search?: string) {
    const { start, end } = this.getDateRangeHelper(period, startDate, endDate);
    const filtersObj = { clientId, brandId, productId, departmentId, employeeId, projectId, status, search };

    const [departments, employeeProfiles, tasks, deliverableUploads] = await Promise.all([
      this.prisma.department.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.employeeProfile.findMany({ include: { user: true } }),
      this.prisma.task.findMany({ include: { assignedEmployees: true } }),
      this.prisma.taskDeliverableHistory.findMany(),
    ]);

    return departments.map((dept) => {
      // Employees in department
      const deptEmployees = employeeProfiles.filter((ep) => {
        if (ep.departmentId === dept.id) return true;
        if (ep.additionalDepartments) {
          return ep.additionalDepartments.toLowerCase().includes(dept.name.toLowerCase());
        }
        return false;
      });

      const deptUserIds = new Set(deptEmployees.map((ep) => ep.userId));

      // 1. Total Employees
      const totalEmployees = deptEmployees.length;

      // Tasks for department users
      const deptTasks = tasks.filter((t) =>
        t.assignedEmployees.some((a) => deptUserIds.has(a.userId))
      );

      // 2. Active Tasks
      const activeTasks = deptTasks.filter(
        (t) => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED' || t.status === 'IN_REVIEW'
      ).length;

      // 3. Completed Tasks
      const completedTasks = deptTasks.filter((t) => t.status === 'COMPLETED').length;

      // Deliverable Uploads by dept users
      const deptUploads = deliverableUploads.filter((d) => deptUserIds.has(d.userId));

      // 4. Total Outputs
      const totalOutputs = Math.max(completedTasks, deptUploads.length);

      // 5. Capacity Utilization
      const totalDailyCapacityHours = deptEmployees.reduce((sum, ep) => sum + (ep.dailyCapacityHours || 8.0), 0);
      const totalActiveTaskEstimatedHours = deptTasks
        .filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED')
        .reduce((sum, t) => sum + (t.estimatedHours || 2.0), 0);

      const capacityUtilizationPercentage = totalDailyCapacityHours > 0
        ? Math.round((totalActiveTaskEstimatedHours / totalDailyCapacityHours) * 100)
        : 0;

      // 6. Productivity %
      const totalDailyTarget = deptEmployees.reduce((sum, ep) => sum + (ep.dailyTarget || 1.0), 0);
      const productivityPercentage = totalDailyTarget > 0
        ? Math.round((totalOutputs / totalDailyTarget) * 100)
        : 100;

      // 7. Pending Work
      const pendingWork = deptTasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length;

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        description: dept.description,
        // 7 Mandatory Metrics:
        totalEmployees,
        activeTasks,
        completedTasks,
        totalOutputs,
        capacityUtilizationPercentage,
        productivityPercentage,
        pendingWork,
      };
    });
  }

  async getProjectPerformanceReports(period?: string, startDate?: string, endDate?: string, clientId?: string, brandId?: string, productId?: string, departmentId?: string, employeeId?: string, projectId?: string, status?: string, search?: string) {
    const { start, end } = this.getDateRangeHelper(period, startDate, endDate);
    const filtersObj = { clientId, brandId, productId, departmentId, employeeId, projectId, status, search };

    const projects = await this.prisma.shootProject.findMany({
      include: {
        client: true,
        brand: true,
        scripts: true,
        graphicRequirements: true,
        assignedTeam: { include: { user: { select: { id: true, name: true, role: true } } } },
        equipmentReservations: { include: { equipment: true } },
        equipmentMovements: { include: { equipment: true } },
        approvals: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return projects.map((p) => {
      // 1. Project Status
      const projectStatus = p.status || 'PLANNED';

      // 2. Completion Percentage
      const completionPercentage = p.progressPercentage || 0;

      // 3. Pending Scripts
      const pendingScripts = p.scripts.filter(
        (s) => s.status !== 'COMPLETED' && s.status !== 'APPROVED'
      ).length;

      // 4. Pending Graphics
      const pendingGraphics = p.graphicRequirements.filter(
        (g) => g.status !== 'COMPLETED' && g.status !== 'APPROVED'
      ).length;

      // 5. Pending Reviews
      const pendingApprovalsCount = p.approvals.filter((a) => a.status === 'PENDING').length;
      const pendingScriptReviews = p.scripts.filter(
        (s) => s.status === 'PENDING' || s.status === 'IN_REVIEW'
      ).length;
      const pendingGraphicReviews = p.graphicRequirements.filter(
        (g) => g.status === 'PENDING' || g.status === 'IN_REVIEW'
      ).length;
      const pendingReviews = pendingApprovalsCount + pendingScriptReviews + pendingGraphicReviews;

      // 6. Equipment Used
      const reservedNames = p.equipmentReservations.map((er) => er.equipment?.name).filter(Boolean);
      const movementNames = p.equipmentMovements.map((em) => em.equipment?.name).filter(Boolean);
      const uniqueEquipment = Array.from(new Set([...reservedNames, ...movementNames]));
      const equipmentUsedCount = uniqueEquipment.length;
      const equipmentUsedSummary = uniqueEquipment.length > 0 ? uniqueEquipment.slice(0, 3).join(', ') : 'None Reserved';

      // 7. Assigned Employees
      const assignedStaff = p.assignedTeam.map((at) => ({
        id: at.user.id,
        name: at.user.name,
        role: at.user.role,
        roleInProject: at.roleInProject,
      }));
      const assignedEmployeeNames = assignedStaff.map((s) => s.name).join(', ') || 'Unassigned';

      // 8. Timeline Summary
      const shootDateStr = p.shootDate ? new Date(p.shootDate).toLocaleDateString() : 'N/A';
      const estimatedCompStr = p.estimatedCompletionDate ? new Date(p.estimatedCompletionDate).toLocaleDateString() : 'N/A';
      const timelineSummary = `Shoot Date: ${shootDateStr} | Est. Completion: ${estimatedCompStr}`;

      return {
        projectId: p.id,
        projectCode: p.projectId,
        projectName: p.name,
        brandName: p.brand?.name || 'N/A',
        clientName: p.client?.name || 'N/A',
        shootLocation: p.shootLocation,
        shootType: p.shootType,

        // 8 Mandatory Metrics:
        projectStatus,
        status: projectStatus,
        completionPercentage,
        progressPercentage: completionPercentage,
        pendingScripts,
        pendingGraphics,
        pendingReviews,
        equipmentUsedCount,
        equipmentUsedSummary,
        uniqueEquipment,
        assignedEmployeesCount: assignedStaff.length,
        assignedEmployeeNames,
        assignedStaff,
        timelineSummary,
        shootDateStr,
        estimatedCompStr,
      };
    });
  }

  async getAttendanceAnalyticsReport(period = 'monthly', startDateStr?: string, endDateStr?: string) {
    const now = new Date();
    let fromDate: Date;
    let toDate: Date = new Date();

    if (period === 'daily') {
      fromDate = new Date(now);
      fromDate.setHours(0, 0, 0, 0);
    } else if (period === 'weekly') {
      fromDate = new Date(now);
      const day = fromDate.getDay();
      const diff = fromDate.getDate() - day + (day === 0 ? -6 : 1);
      fromDate.setDate(diff);
      fromDate.setHours(0, 0, 0, 0);
    } else if (period === 'custom' && startDateStr) {
      fromDate = new Date(startDateStr);
      if (endDateStr) toDate = new Date(endDateStr);
      toDate.setHours(23, 59, 59, 999);
    } else {
      // monthly (default)
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const [users, attendanceRecords] = await Promise.all([
      this.prisma.user.findMany({
        where: { isArchived: false },
        include: {
          employeeProfile: { include: { department: true } },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.attendance.findMany({
        where: {
          date: {
            gte: fromDate,
            lte: toDate,
          },
        },
      }),
    ]);

    const report = users.map((u) => {
      const userRecords = attendanceRecords.filter((a) => a.userId === u.id);

      // 1. Present Days
      const presentDays = userRecords.filter((a) => a.status === 'PRESENT').length;

      // 2. Absent Days
      const absentDays = userRecords.filter((a) => a.status === 'ABSENT').length;

      // 3. Half Days
      const halfDays = userRecords.filter((a) => a.status === 'HALF_DAY').length;

      // 4. Late Entries
      const lateEntries = userRecords.filter((a) => a.status === 'LATE').length;

      // 5. Attendance Percentage
      const totalTrackedDays = presentDays + absentDays + halfDays + lateEntries;
      const attendancePercentage = totalTrackedDays > 0
        ? Math.round(((presentDays + lateEntries + halfDays * 0.5) / totalTrackedDays) * 100)
          : 0;

      return {
        userId: u.id,
        employeeName: u.name,
        email: u.email,
        designation: u.employeeProfile?.designation || 'Staff Member',
        department: u.employeeProfile?.department?.name || 'General Operations',

        // 5 Mandatory Attendance Metrics:
        presentDays,
        absentDays,
        halfDays,
        lateEntries,
        attendancePercentage,
        totalTrackedDays,
      };
    });

    return {
      period,
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
      report,
    };
  }

  async getEquipmentPerformanceReports(period?: string, startDate?: string, endDate?: string, clientId?: string, brandId?: string, productId?: string, departmentId?: string, employeeId?: string, projectId?: string, status?: string, search?: string) {
    const { start, end } = this.getDateRangeHelper(period, startDate, endDate);
    const filtersObj = { clientId, brandId, productId, departmentId, employeeId, projectId, status, search };

    const equipmentsRaw = await this.prisma.equipment.findMany({
      include: {
        categoryRef: true,
        movements: {
          include: {
            
            project: { select: { id: true, name: true, projectId: true } },
          },
          orderBy: { timestamp: 'desc' },
        },
        damageReports: {
          include: {
            reportedBy: { select: { id: true, name: true } },
          },
          orderBy: { date: 'desc' },
        },
        reservations: {
          include: {
            project: { select: { id: true, name: true } },
          },
          orderBy: { startDate: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });
    const equipments = this.inMemoryFilter(equipmentsRaw, 'equipments', filtersObj);

    return equipments.map((eq) => {
      // 1. Equipment Availability
      const equipmentAvailabilityStatus = eq.availability || eq.status || 'AVAILABLE';

      // 2. Equipment Utilization
      const totalMovements = eq.movements.length;
      const totalReservations = eq.reservations.length;
      const utilizationFactor = totalMovements + totalReservations;
      const equipmentUtilizationPercentage = Math.min(100, Math.round((utilizationFactor / 15) * 100));

      // 3. Equipment Downtime
      const openDamageReports = eq.damageReports.filter(
        (d) => d.repairStatus === 'PENDING' || d.repairStatus === 'IN_REPAIR'
      );
      let equipmentDowntimeHours = openDamageReports.length * 24;
      openDamageReports.forEach((d) => {
        const daysInRepair = Math.max(1, Math.round((Date.now() - new Date(d.date).getTime()) / (1000 * 60 * 60 * 24)));
        equipmentDowntimeHours += daysInRepair * 24;
      });
      const equipmentDowntimeFormatted = equipmentDowntimeHours > 0 ? `${equipmentDowntimeHours} hrs` : '0 hrs (Operational)';

      // 4. Checkout History
      const checkoutHistory = eq.movements
        .filter((m) => m.action === 'ISSUED' || m.action === 'USED' || m.action === 'CHECKOUT')
        .map((m) => ({
          movementId: m.id,
          action: m.action,
          timestamp: m.timestamp.toISOString(),
          userName: m.user?.name || 'Staff Member',
          projectName: m.project?.name || 'Internal Shoot',
          condition: m.condition || 'Good',
          expectedReturnDate: m.expectedReturnDate ? m.expectedReturnDate.toISOString() : null,
        }));

      // 5. Maintenance History
      const maintenanceHistory = eq.damageReports
        .filter((d) => d.repairStatus === 'REPAIRED' || d.repairNotes || eq.maintenanceStatus !== 'OPERATIONAL')
        .map((d) => ({
          reportId: d.id,
          date: d.date.toISOString(),
          repairedAt: d.repairedAt ? d.repairedAt.toISOString() : null,
          repairStatus: d.repairStatus,
          repairNotes: d.repairNotes || 'Routine inspection / repair completed',
          reportedByName: d.reportedBy?.name || 'Technical Manager',
        }));

      // 6. Damage History
      const damageHistory = eq.damageReports.map((d) => ({
        reportId: d.id,
        date: d.date.toISOString(),
        description: d.description,
        severity: d.severity,
        repairStatus: d.repairStatus,
        repairNotes: d.repairNotes,
        reportedByName: d.reportedBy?.name || 'Staff Member',
      }));

      return {
        equipmentId: eq.id,
        name: eq.name,
        brand: eq.brand,
        model: eq.model,
        serialNumber: eq.serialNumber,
        category: eq.categoryRef?.name || eq.category || 'General Equipment',
        condition: eq.condition,
        maintenanceStatus: eq.maintenanceStatus,
        storageLocation: eq.storageLocation || 'Main Studio Store',

        // 6 Mandatory Metrics / Sections:
        equipmentAvailabilityStatus,
        availability: equipmentAvailabilityStatus,
        equipmentUtilizationPercentage,
        equipmentDowntimeHours,
        equipmentDowntimeFormatted,
        checkoutHistoryCount: checkoutHistory.length,
        checkoutHistory,
        maintenanceHistoryCount: maintenanceHistory.length,
        maintenanceHistory,
        damageHistoryCount: damageHistory.length,
        damageHistory,
      };
    });
  }

  async getApprovalPerformanceReports(period?: string, startDate?: string, endDate?: string, clientId?: string, brandId?: string, productId?: string, departmentId?: string, employeeId?: string, projectId?: string, status?: string, search?: string) {
    const { start, end } = this.getDateRangeHelper(period, startDate, endDate);
    const filtersObj = { clientId, brandId, productId, departmentId, employeeId, projectId, status, search };

    const [approvals, clientConfirmations, revisions, scripts, graphicReqs, projects] = await Promise.all([
      this.prisma.approval.findMany({
        include: {
          requestedBy: { select: { id: true, name: true } },
          reviewer: { select: { id: true, name: true } },
          project: { select: { id: true, name: true, projectId: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.clientConfirmation.findMany({
        include: {
          project: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.revision.findMany({
        include: {
          project: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.script.findMany(),
      this.prisma.graphicRequirement.findMany(),
      this.prisma.shootProject.findMany(),
    ]);

    // 1. Pending Technical Reviews
    const pendingTechApprovals = approvals.filter(
      (a) => a.approvalType === 'TECHNICAL_REVIEW' && a.status === 'PENDING'
    ).length;
    const pendingTechScripts = scripts.filter(
      (s) => !s.technicalReviewApproved && s.status !== 'COMPLETED'
    ).length;
    const pendingTechGraphics = graphicReqs.filter(
      (g) => !g.technicalReviewApproved && g.status !== 'COMPLETED'
    ).length;
    const pendingTechnicalReviews = pendingTechApprovals + pendingTechScripts + pendingTechGraphics;

    // 2. Pending Media Reviews
    const pendingMediaApprovals = approvals.filter(
      (a) => a.approvalType === 'MEDIA_MANAGER_REVIEW' && a.status === 'PENDING'
    ).length;
    const pendingMediaScripts = scripts.filter(
      (s) => s.technicalReviewApproved && !s.mediaManagerReviewApproved && s.status !== 'COMPLETED'
    ).length;
    const pendingMediaGraphics = graphicReqs.filter(
      (g) => g.technicalReviewApproved && !g.mediaManagerApproved && g.status !== 'COMPLETED'
    ).length;
    const pendingMediaReviews = pendingMediaApprovals + pendingMediaScripts + pendingMediaGraphics;

    // 3. Pending Client Confirmations
    const pendingClientProjects = projects.filter(
      (p) => p.status === 'POST_PRODUCTION' || p.status === 'WAITING_FOR_REVIEW'
    ).length;
    const pendingClientScripts = scripts.filter(
      (s) => s.mediaManagerReviewApproved && !s.clientConfirmationRecorded && s.status !== 'COMPLETED'
    ).length;
    const pendingClientGraphics = graphicReqs.filter(
      (g) => g.mediaManagerApproved && !g.clientConfirmed && g.status !== 'COMPLETED'
    ).length;
    const pendingClientConfirmations = pendingClientProjects + pendingClientScripts + pendingClientGraphics;

    // 4. Average Approval Time
    const reviewedApprovals = approvals.filter((a) => a.reviewedAt && a.createdAt);
    let avgApprovalTimeHours = 0;
    let avgApprovalTimeFormatted = 'N/A';

    if (reviewedApprovals.length > 0) {
      const totalDurationMs = reviewedApprovals.reduce((sum, a) => {
        const created = new Date(a.createdAt).getTime();
        const reviewed = new Date(a.reviewedAt!).getTime();
        return sum + Math.max(0, reviewed - created);
      }, 0);
      avgApprovalTimeHours = Math.round((totalDurationMs / (1000 * 60 * 60 * reviewedApprovals.length)) * 10) / 10;
      if (avgApprovalTimeHours >= 24) {
        avgApprovalTimeFormatted = `${(avgApprovalTimeHours / 24).toFixed(1)} days`;
      } else {
        avgApprovalTimeFormatted = `${avgApprovalTimeHours} hrs`;
      }
    }

    // 5. Approval Success Rate
    const totalDecided = approvals.filter((a) => a.status !== 'PENDING').length;
    const approvedCount = approvals.filter((a) => a.status === 'APPROVED').length;
    const approvalSuccessRatePercentage = totalDecided > 0
      ? Math.round((approvedCount / totalDecided) * 100)
      : 100;

    // 6. Revision Requests
    const changesRequestedCount = approvals.filter(
      (a) => a.status === 'CHANGES_REQUESTED' || a.status === 'REJECTED'
    ).length;
    const clientRevisionRequests = clientConfirmations.filter(
      (c) => c.decision === 'REVISION_REQUESTED'
    ).length;
    const revisionRequests = revisions.length + changesRequestedCount + clientRevisionRequests;

    return {
      // 6 Mandatory Metrics:
      pendingTechnicalReviews,
      pendingMediaReviews,
      pendingClientConfirmations,
      avgApprovalTimeHours,
      avgApprovalTimeFormatted,
      approvalSuccessRatePercentage,
      revisionRequests,

      // Detail lists for UI drill-down:
      recentApprovals: approvals.slice(0, 10),
      recentClientConfirmations: clientConfirmations.slice(0, 10),
      recentRevisions: revisions.slice(0, 10),
    };
  }

  async getCapacityPerformanceReports(period?: string, startDate?: string, endDate?: string, clientId?: string, brandId?: string, productId?: string, departmentId?: string, employeeId?: string, projectId?: string, status?: string, search?: string) {
    const { start, end } = this.getDateRangeHelper(period, startDate, endDate);
    const filtersObj = { clientId, brandId, productId, departmentId, employeeId, projectId, status, search };

    const usersRaw = await this.prisma.user.findMany({
      where: { isArchived: false },
      include: {
        employeeProfile: { include: { department: true } },
        tasks: {
          include: {
            task: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    const users = this.inMemoryFilter(usersRaw, 'users', filtersObj);

    let totalDailyCapacity = 0;
    let totalAssignedCapacity = 0;
    const overloadedEmployeesList: any[] = [];
    const underutilizedEmployeesList: any[] = [];

    const employeeCapacityDetails = users.map((u) => {
      const dailyCapacity = u.employeeProfile?.dailyTarget || 5; // Default 5 outputs/day
      const activeTasks = u.tasks.filter(
        (t) => t.task.status !== 'COMPLETED' && t.task.status !== 'CANCELLED'
      );
      const assignedCapacity = activeTasks.length;
      const remainingCapacity = Math.max(0, dailyCapacity - assignedCapacity);
      const utilizationRate = dailyCapacity > 0 ? Math.round((assignedCapacity / dailyCapacity) * 100) : 0;

      const empData = {
        userId: u.id,
        employeeName: u.name,
        email: u.email,
        designation: u.employeeProfile?.designation || 'Staff Member',
        department: u.employeeProfile?.department?.name || 'General Operations',
        dailyCapacity,
        assignedCapacity,
        remainingCapacity,
        utilizationRate,
        isOverloaded: assignedCapacity > dailyCapacity,
        isUnderutilized: utilizationRate < 60,
      };

      totalDailyCapacity += dailyCapacity;
      totalAssignedCapacity += assignedCapacity;

      if (empData.isOverloaded) {
        overloadedEmployeesList.push(empData);
      } else if (empData.isUnderutilized) {
        underutilizedEmployeesList.push(empData);
      }

      return empData;
    });

    const totalRemainingCapacity = Math.max(0, totalDailyCapacity - totalAssignedCapacity);

    return {
      // 5 Mandatory Indicators:
      dailyCapacity: totalDailyCapacity,
      assignedCapacity: totalAssignedCapacity,
      remainingCapacity: totalRemainingCapacity,
      overloadedEmployeesCount: overloadedEmployeesList.length,
      overloadedEmployees: overloadedEmployeesList,
      underutilizedEmployeesCount: underutilizedEmployeesList.length,
      underutilizedEmployees: underutilizedEmployeesList,

      // Employee breakdown table:
      employeeDetails: employeeCapacityDetails,
    };
  }

  async getRevisionPerformanceReports(period?: string, startDate?: string, endDate?: string, clientId?: string, brandId?: string, productId?: string, departmentId?: string, employeeId?: string, projectId?: string, status?: string, search?: string) {
    const { start, end } = this.getDateRangeHelper(period, startDate, endDate);
    const filtersObj = { clientId, brandId, productId, departmentId, employeeId, projectId, status, search };

    const [revisions, projects, brands, users, scripts, graphicReqs] = await Promise.all([
      this.prisma.revision.findMany({
        include: {
          project: {
            include: {
              brand: true,
              assignedTeam: { include: { user: true } },
            },
          },
        },
      }),
      this.prisma.shootProject.findMany({
        include: {
          brand: true,
          assignedTeam: { include: { user: true } },
          scripts: true,
          graphicRequirements: true,
        },
      }),
      this.prisma.brand.findMany(),
      this.prisma.user.findMany({ where: { isArchived: false } }),
      this.prisma.script.findMany({ include: { brand: true, project: true } }),
      this.prisma.graphicRequirement.findMany({ include: { brand: true, project: true } }),
    ]);

    // 1. Total Revision Requests
    const projectRevisionsCount = revisions.length;
    const scriptRevisionsCount = scripts.reduce((sum, s) => sum + (s.revisionCount || 0), 0);
    const graphicRevisionsCount = graphicReqs.reduce((sum, g) => sum + (g.revisionCount || 0), 0);
    const totalRevisionRequests = projectRevisionsCount + scriptRevisionsCount + graphicRevisionsCount;

    // 5. Average Revisions per Project
    const totalProjects = Math.max(1, projects.length);
    const avgRevisionsPerProject = Math.round((totalRevisionRequests / totalProjects) * 10) / 10;

    // 3. Project Revision Count Breakdown
    const projectRevisionBreakdown = projects.map((p) => {
      const pRevs = revisions.filter((r) => r.projectId === p.id).length;
      const sRevs = (p.scripts || []).reduce((sum, s) => sum + (s.revisionCount || 0), 0);
      const gRevs = (p.graphicRequirements || []).reduce((sum, g) => sum + (g.revisionCount || 0), 0);
      const totalProjectRevisions = pRevs + sRevs + gRevs;

      return {
        projectId: p.id,
        projectCode: p.projectId,
        projectName: p.name,
        brandName: p.brand?.name || 'General Brand',
        totalRevisions: totalProjectRevisions,
        revisionDetails: { projectRevisions: pRevs, scriptRevisions: sRevs, graphicRevisions: gRevs },
      };
    }).sort((a, b) => b.totalRevisions - a.totalRevisions);

    // 4. Brand Revision Count Breakdown
    const brandRevisionBreakdown = brands.map((b) => {
      const bProjects = projects.filter((p) => p.brandId === b.id);
      const bProjectIds = new Set(bProjects.map((p) => p.id));
      const bRevs = revisions.filter((r) => bProjectIds.has(r.projectId)).length;
      const bScriptRevs = scripts.filter((s) => s.brandId === b.id).reduce((sum, s) => sum + (s.revisionCount || 0), 0);
      const bGraphicRevs = graphicReqs.filter((g) => g.brandId === b.id).reduce((sum, g) => sum + (g.revisionCount || 0), 0);
      const totalBrandRevisions = bRevs + bScriptRevs + bGraphicRevs;

      return {
        brandId: b.id,
        brandName: b.name,
        shortCode: b.shortCode,
        totalProjects: bProjects.length,
        totalRevisions: totalBrandRevisions,
      };
    }).sort((a, b) => b.totalRevisions - a.totalRevisions);

    // 2. Employee Revision Count Breakdown
    const employeeRevisionBreakdown = users.map((u) => {
      const userRevisionsRequested = revisions.filter((r) => r.requestedById === u.id).length;

      // Assign employee revisions based on project team assignments
      let userAssignedProjectRevisions = 0;
      projects.forEach((p) => {
        const isAssigned = (p.assignedTeam || []).some((t) => t.userId === u.id);
        if (isAssigned) {
          const pRevs = revisions.filter((r) => r.projectId === p.id).length;
          const sRevs = (p.scripts || []).reduce((sum, s) => sum + (s.revisionCount || 0), 0);
          const gRevs = (p.graphicRequirements || []).reduce((sum, g) => sum + (g.revisionCount || 0), 0);
          userAssignedProjectRevisions += pRevs + sRevs + gRevs;
        }
      });

      return {
        userId: u.id,
        employeeName: u.name,
        userRevisionsRequested,
        totalAssignedRevisions: userAssignedProjectRevisions,
      };
    }).sort((a, b) => b.totalAssignedRevisions - a.totalAssignedRevisions);

    return {
      // 5 Mandatory Indicators:
      totalRevisionRequests,
      employeeRevisionBreakdown,
      projectRevisionBreakdown,
      brandRevisionBreakdown,
      avgRevisionsPerProject,

      // Summary counts for UI badges:
      totalProjects,
      totalBrands: brands.length,
      totalEmployees: users.length,
    };
  }

  async getTimelinePerformanceReports(period?: string, startDate?: string, endDate?: string, clientId?: string, brandId?: string, productId?: string, departmentId?: string, employeeId?: string, projectId?: string, status?: string, search?: string) {
    const { start, end } = this.getDateRangeHelper(period, startDate, endDate);
    const filtersObj = { clientId, brandId, productId, departmentId, employeeId, projectId, status, search };

    const [projects, approvals, equipmentMovements, activityLogs, taskTimelines, scriptTimelines] = await Promise.all([
      this.prisma.shootProject.findMany({
        include: {
          client: true,
          brand: true,
          
          assignedTeam: { include: { user: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.approval.findMany({
        include: {
          requestedBy: { select: { id: true, name: true } },
          reviewer: { select: { id: true, name: true } },
          project: { select: { id: true, name: true, projectId: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.equipmentMovement.findMany({
        include: {
          equipment: { select: { id: true, name: true, serialNumber: true } },
          
          project: { select: { id: true, name: true } },
        },
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.activityLog.findMany({
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { timestamp: 'desc' },
        take: 50,
      }),
      this.prisma.taskTimeline.findMany({
        include: {
          
          task: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      this.prisma.scriptTimeline.findMany({
        include: {
          
          script: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);

    // 1. Project History
    const projectHistory = projects.map((p: any) => ({
      projectId: p.id,
      projectCode: p.projectId,
      projectName: p.name,
      clientName: p.client?.name || 'General Client',
      brandName: p.brand?.name || 'General Brand',
      creatorName: p.creator?.name || 'Media Manager',
      status: p.status,
      shootDate: p.shootDate ? p.shootDate.toISOString() : null,
      shootLocation: p.shootLocation,
      shootType: p.shootType,
      estimatedCompletionDate: p.estimatedCompletionDate ? p.estimatedCompletionDate.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
    }));

    // 2. Status Changes
    const statusChanges = [
      ...taskTimelines.map((tt: any) => ({
        id: tt.id,
        type: 'TASK_STATUS_CHANGE',
        title: `Task Status Update: ${tt.task?.title || 'Task'}`,
        previousStatus: tt.previousStatus,
        newStatus: tt.newStatus,
        changedByName: tt.user?.name || 'Staff Member',
        remarks: tt.remarks,
        timestamp: tt.createdAt.toISOString(),
      })),
      ...scriptTimelines.map((st: any) => ({
        id: st.id,
        type: 'SCRIPT_STATUS_CHANGE',
        title: `Script Status Update: ${st.script?.name || 'Script'}`,
        previousStatus: st.previousStatus,
        newStatus: st.newStatus,
        changedByName: st.user?.name || 'Script Writer',
        remarks: st.remarks,
        timestamp: st.createdAt.toISOString(),
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // 3. Approval History
    const approvalHistory = approvals.map((a) => ({
      approvalId: a.id,
      approvalType: a.approvalType,
      entityType: a.entityType,
      projectName: a.project?.name || 'General Project',
      projectCode: a.project?.projectId || '',
      requestedByName: a.requestedBy?.name || 'System User',
      reviewerName: a.reviewer?.name || 'Pending Reviewer',
      status: a.status,
      remarks: a.remarks,
      requestedAt: a.createdAt.toISOString(),
      reviewedAt: a.reviewedAt ? a.reviewedAt.toISOString() : null,
    }));

    // 4. Equipment History
    const equipmentHistory = equipmentMovements.map((m) => ({
      movementId: m.id,
      equipmentName: m.equipment?.name || 'Equipment Asset',
      serialNumber: m.equipment?.serialNumber || '',
      action: m.action,
      handlerName: (m as any).user?.name || 'Staff Member',
      projectName: m.project?.name || 'Internal Production',
      condition: m.condition || 'Good',
      notes: m.notes,
      timestamp: m.timestamp.toISOString(),
    }));

    // 5. Employee Activities
    const employeeActivities = activityLogs.map((log) => ({
      logId: log.id,
      userName: log.user?.name || 'System User',
      action: log.action,
      entity: log.entity,
      description: log.description,
      metadata: log.metadata,
      timestamp: log.timestamp.toISOString(),
    }));

    return {
      // 5 Mandatory Summaries:
      projectHistory,
      statusChanges,
      approvalHistory,
      equipmentHistory,
      employeeActivities,

      // Summary counts for UI indicators:
      totalProjectsLogged: projectHistory.length,
      totalStatusChangesLogged: statusChanges.length,
      totalApprovalsLogged: approvalHistory.length,
      totalEquipmentMovementsLogged: equipmentHistory.length,
      totalActivitiesLogged: employeeActivities.length,
    };
  }
}
