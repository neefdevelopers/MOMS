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
    @Query('projectId') projectId?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.tasksService.findAll({
      projectId,
      employeeId,
      userId: user.id,
      role: user.role,
    });
  }

  @Get('capacity/overview')
  getCapacityOverview() {
    return this.tasksService.getCapacityOverview();
  }

  @Get(':id/reassign-recommendations')
  getReassignmentRecommendations(@Param('id') id: string) {
    return this.tasksService.getReassignmentRecommendations(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
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
    @Body('assignedUserIds') assignedUserIds: string[],
    @CurrentUser('id') managerUserId: string,
  ) {
    return this.tasksService.reassign(id, assignedUserIds, managerUserId);
  }

  @Patch(':id/progress')
  updateProgress(
    @Param('id') id: string,
    @Body() data: { status?: TaskStatus; completionPercentage?: number; remarks?: string },
    @CurrentUser() user: any,
  ) {
    return this.tasksService.updateProgress(id, data, user);
  }
}
