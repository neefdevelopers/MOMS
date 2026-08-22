import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AttendanceStatus } from '../../common/enums';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async findAll(dateStr?: string, currentUser?: any) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 86400000);

    if (currentUser?.role === 'TECHNICAL_MANAGER') {
      throw new ForbiddenException('Technical Manager does not have access to attendance records.');
    }

    const userWhere: any = { isArchived: false };
    // Rule: Staff members shall not view other employees' attendance records
    if (currentUser?.role === 'STAFF') {
      userWhere.id = currentUser.id;
    }

    const users = await this.prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        role: true,
        employeeProfile: { include: { department: true } },
        attendanceRecords: {
          where: {
            date: { gte: startOfDay, lt: endOfDay },
          },
          include: {
            recordedBy: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return users.map((u) => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.employeeProfile?.department?.name || 'General',
      attendance: u.attendanceRecords[0]
        ? {
            id: u.attendanceRecords[0].id,
            date: u.attendanceRecords[0].date,
            status: u.attendanceRecords[0].status,
            remarks: u.attendanceRecords[0].remarks,
            recordedById: u.attendanceRecords[0].recordedById,
            recordedBy: u.attendanceRecords[0].recordedBy
              ? {
                  id: u.attendanceRecords[0].recordedBy.id,
                  name: u.attendanceRecords[0].recordedBy.name,
                  role: u.attendanceRecords[0].recordedBy.role,
                }
              : null,
            createdAt: u.attendanceRecords[0].createdAt,
            updatedAt: u.attendanceRecords[0].updatedAt,
          }
        : null,
    }));
  }

  // Dashboard endpoint displaying Today's Attendance, Absent, Late, Half Day, Attendance %, and Monthly Summary
  async getDashboardSummary(monthStr?: string, currentUser?: any) {
    if (currentUser?.role === 'TECHNICAL_MANAGER') {
      throw new ForbiddenException('Technical Manager does not have access to attendance records.');
    }

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 86400000);

    const isStaff = currentUser?.role === 'STAFF';

    const totalEmployees = isStaff
      ? 1
      : await this.prisma.user.count({
          where: { status: 'ACTIVE', isArchived: false },
        });

    const todayWhere: any = {
      date: { gte: startOfDay, lt: endOfDay },
    };
    if (isStaff) {
      todayWhere.userId = currentUser.id;
    }

    const todayRecords = await this.prisma.attendance.findMany({
      where: todayWhere,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            employeeProfile: { include: { department: true } },
          },
        },
        recordedBy: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    const presentList = todayRecords.filter((r) => r.status === 'PRESENT');
    const lateList = todayRecords.filter((r) => r.status === 'LATE');
    const halfDayList = todayRecords.filter((r) => r.status === 'HALF_DAY');
    const absentList = todayRecords.filter((r) => r.status === 'ABSENT');

    const totalMarked = todayRecords.length;
    const presentCount = presentList.length;
    const lateCount = lateList.length;
    const halfDayCount = halfDayList.length;
    const absentCount = absentList.length;

    const weightedPresentCount = presentCount + lateCount + halfDayCount * 0.5;
    const attendancePercentage = totalEmployees > 0
      ? Math.min(100, Math.round((weightedPresentCount / totalEmployees) * 100))
      : 0;

    const targetMonth = monthStr ? new Date(monthStr) : new Date();
    const monthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
    const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 23, 59, 59);

    const monthlyWhere: any = {
      date: { gte: monthStart, lte: monthEnd },
    };
    if (isStaff) {
      monthlyWhere.userId = currentUser.id;
    }

    const monthlyRecords = await this.prisma.attendance.findMany({
      where: monthlyWhere,
      include: {
        user: { select: { id: true, name: true, employeeProfile: { include: { department: true } } } },
      },
    });

    const monthlySummary = {
      month: targetMonth.toLocaleString('default', { month: 'long', year: 'numeric' }),
      totalRecords: monthlyRecords.length,
      presentDays: monthlyRecords.filter((r) => r.status === 'PRESENT').length,
      lateDays: monthlyRecords.filter((r) => r.status === 'LATE').length,
      halfDays: monthlyRecords.filter((r) => r.status === 'HALF_DAY').length,
      absentDays: monthlyRecords.filter((r) => r.status === 'ABSENT').length,
      monthlyAveragePercentage: monthlyRecords.length > 0
        ? Math.round(
            ((monthlyRecords.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length +
              monthlyRecords.filter((r) => r.status === 'HALF_DAY').length * 0.5) /
              monthlyRecords.length) *
              100,
          )
        : 0,
    };

    return {
      today: {
        date: startOfDay.toISOString().split('T')[0],
        totalEmployees,
        totalMarked,
        presentCount,
        lateCount,
        halfDayCount,
        absentCount,
        attendancePercentage,
        presentList: presentList.map((r) => ({ id: r.user.id, name: r.user.name, department: r.user.employeeProfile?.department?.name || 'General', remarks: r.remarks })),
        lateList: lateList.map((r) => ({ id: r.user.id, name: r.user.name, department: r.user.employeeProfile?.department?.name || 'General', remarks: r.remarks })),
        halfDayList: halfDayList.map((r) => ({ id: r.user.id, name: r.user.name, department: r.user.employeeProfile?.department?.name || 'General', remarks: r.remarks })),
        absentList: absentList.map((r) => ({ id: r.user.id, name: r.user.name, department: r.user.employeeProfile?.department?.name || 'General', remarks: r.remarks })),
      },
      monthlySummary,
    };
  }

  // Business Rule: Attendance shall be recorded manually by the Media Manager. Employees shall not mark their own attendance.
  // Attendance history shall remain permanent.
  async markAttendance(
    data: { userId: string; date: string; status: AttendanceStatus; remarks?: string },
    operatorUser: { id: string; role: string },
  ) {
    if (operatorUser.role !== 'MEDIA_MANAGER') {
      throw new ForbiddenException(
        'Attendance shall be recorded manually by the Media Manager. Employees shall not mark their own attendance.',
      );
    }

    const targetDate = new Date(data.date);
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

    const existing = await this.prisma.attendance.findFirst({
      where: {
        userId: data.userId,
        date: startOfDay,
      },
    });

    let record;
    if (existing) {
      record = await this.prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status: data.status,
          remarks: data.remarks || null,
          recordedById: operatorUser.id,
        },
        include: {
          recordedBy: {
            select: { id: true, name: true, role: true },
          },
        },
      });
    } else {
      record = await this.prisma.attendance.create({
        data: {
          userId: data.userId,
          date: startOfDay,
          status: data.status,
          remarks: data.remarks || null,
          recordedById: operatorUser.id,
        },
        include: {
          recordedBy: {
            select: { id: true, name: true, role: true },
          },
        },
      });
    }

    // Operational Event Notification referencing originating ATTENDANCE entity
    if (data.status === 'LATE' || data.status === 'ABSENT' || data.status === 'HALF_DAY') {
      await this.prisma.notification.create({
        data: {
          userId: data.userId,
          title: `Attendance Status: ${data.status}`,
          message: `Your attendance for ${data.date} has been marked as ${data.status.replace('_', ' ')}${data.remarks ? ` (${data.remarks})` : ''}`,
          type: data.status === 'ABSENT' ? 'WARNING' : 'INFO',
          linkUrl: '/attendance',
          eventType: data.status === 'LATE' ? 'ATTENDANCE_LATE_FLAGGED' : 'ATTENDANCE_MARKED',
          entityType: 'ATTENDANCE',
          entityId: record.id,
          attendanceId: record.id,
        },
      });
    }

    // Permission-sensitive action: Attendance Update permanent audit record
    await this.prisma.activityLog.create({
      data: {
        userId: operatorUser.id,
        action: 'ATTENDANCE_UPDATE',
        entity: 'Attendance',
        entityId: record.id,
        description: `Attendance marked as ${data.status} for user ${data.userId} on ${data.date}.`,
        metadata: JSON.stringify({ targetUserId: data.userId, status: data.status, date: data.date, remarks: data.remarks }),
      },
    });

    return record;
  }
}
