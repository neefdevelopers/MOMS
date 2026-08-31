import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role, TaskStatus } from '../../common/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('projectId') projectId?: string,
    @Query('scriptId') scriptId?: string,
    @Query('clientId') clientId?: string,
    @Query('brandId') brandId?: string,
    @Query('productId') productId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('priority') priority?: string,
    @Query('departmentId') departmentId?: string,
    @Query('date') date?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.tasksService.findAll({
      search,
      status,
      priority,
      projectId,
      scriptId,
      clientId,
      brandId,
      productId,
      employeeId,
      departmentId,
      date,
      dateFrom,
      dateTo,
      userId: user.id,
      role: user.role,
    });
  }

  @Get('capacity/overview')
  getCapacityOverview() {
    return this.tasksService.getCapacityOverview();
  }

  @Get('capacity/alternatives/:userId')
  getOverloadedEmployeeAlternatives(@Param('userId') userId: string) {
    return this.tasksService.getOverloadedEmployeeAlternatives(userId);
  }

  @Get(':id/reassign-recommendations')
  getReassignmentRecommendations(@Param('id') id: string) {
    return this.tasksService.getReassignmentRecommendations(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tasksService.findOne(id, user);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Post()
  create(@Body() data: any, @CurrentUser('id') managerUserId: string) {
    return this.tasksService.create(data, managerUserId);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Put(':id/reassign')
  reassign(
    @Param('id') id: string,
    @Body() body: { assignedUserIds: string[]; reason?: string },
    @CurrentUser('id') managerUserId: string,
  ) {
    return this.tasksService.reassign(id, body.assignedUserIds, managerUserId, body.reason);
  }

  @Patch(':id/progress')
  updateProgress(
    @Param('id') id: string,
    @Body() data: { status?: TaskStatus; completionPercentage?: number; remarks?: string },
    @CurrentUser() user: any,
  ) {
    return this.tasksService.updateProgress(id, data, user);
  }

  @Post(':id/accept')
  acknowledgeAcceptance(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tasksService.acknowledgeTaskAcceptance(id, user);
  }

  @Post(':id/start-production')
  startProduction(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tasksService.startProduction(id, user);
  }

  @Post(':id/remarks')
  addRemark(
    @Param('id') id: string,
    @Body('message') message: string,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.addRemark(id, message, user);
  }

  @Post(':id/upload-deliverable')
  uploadDeliverable(
    @Param('id') id: string,
    @Body() data: { fileUrl: string; fileName?: string },
    @CurrentUser() user: any,
  ) {
    return this.tasksService.uploadDeliverable(id, data, user);
  }

  @Put('capacity/:userId')
  @Roles(Role.MEDIA_MANAGER)
  updateEmployeeCapacity(
    @Param('userId') userId: string,
    @Body('dailyCapacityHours') dailyCapacityHours: number,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.updateEmployeeCapacity(userId, dailyCapacityHours, user.id);
  }
}
