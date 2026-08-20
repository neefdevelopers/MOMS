import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role, AttendanceStatus } from '../../common/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('dashboard')
  getDashboardSummary(@Query('month') month?: string, @CurrentUser() user?: any) {
    return this.attendanceService.getDashboardSummary(month, user);
  }

  @Get()
  findAll(@Query('date') date?: string, @CurrentUser() user?: any) {
    return this.attendanceService.findAll(date, user);
  }

  // Business Rule: Attendance shall be recorded manually by the Media Manager. Employees shall not mark their own attendance.
  @Roles(Role.MEDIA_MANAGER)
  @Post()
  markAttendance(
    @Body() data: { userId: string; date: string; status: AttendanceStatus; remarks?: string },
    @CurrentUser() user: any,
  ) {
    return this.attendanceService.markAttendance(data, user);
  }
}
