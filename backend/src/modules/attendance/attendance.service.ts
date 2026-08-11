import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AttendanceStatus } from '../../common/enums';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async findAll(dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 86400000);

    const users = await this.prisma.user.findMany({
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
        },
      },
    });

    return users.map((u) => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.employeeProfile?.department?.name || 'General',
      attendance: u.attendanceRecords[0] || null,
    }));
  }

  async markAttendance(data: { userId: string; date: string; status: AttendanceStatus; remarks?: string }, managerUserId: string) {
    const targetDate = new Date(data.date);
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

    // Prevent duplicate attendance record for same employee and date
    const existing = await this.prisma.attendance.findFirst({
      where: {
        userId: data.userId,
        date: startOfDay,
      },
    });

    if (existing) {
      return this.prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status: data.status,
          remarks: data.remarks,
        },
      });
    }

    return this.prisma.attendance.create({
      data: {
        userId: data.userId,
        date: startOfDay,
        status: data.status,
        remarks: data.remarks,
      },
    });
  }
}
