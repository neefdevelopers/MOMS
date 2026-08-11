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

  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER)
  @Get()
  findAll(@Query('date') date?: string) {
    return this.attendanceService.findAll(date);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Post()
  markAttendance(
    @Body() data: { userId: string; date: string; status: AttendanceStatus; remarks?: string },
    @CurrentUser('id') managerUserId: string,
  ) {
    return this.attendanceService.markAttendance(data, managerUserId);
  }
}
