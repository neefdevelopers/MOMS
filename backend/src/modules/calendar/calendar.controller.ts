import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums';

import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('clientId') clientId?: string,
    @Query('brandId') brandId?: string,
    @Query('shootType') shootType?: string,
    @Query('status') status?: string,
    @Query('forMainCalendar') forMainCalendar?: string,
  ) {
    return this.calendarService.findAll(clientId, brandId, shootType, status, user?.id, user?.role, forMainCalendar === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.calendarService.findOne(id, user);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string, @CurrentUser() user: any) {
    return this.calendarService.getHistory(id, user);
  }

  @Roles(Role.MEDIA_MANAGER, Role.SOCIAL_MEDIA_MANAGER, Role.MARKETING_MANAGER)
  @Post()
  create(@Body() data: any, @CurrentUser() user: any) {
    return this.calendarService.create(data, user);
  }

  @Roles(Role.MEDIA_MANAGER, Role.SOCIAL_MEDIA_MANAGER, Role.MARKETING_MANAGER)
  @Put(':id')
  update(@Param('id') id: string, @Body() data: any, @CurrentUser() user: any) {
    return this.calendarService.update(id, data, user);
  }

  @Roles(Role.MEDIA_MANAGER, Role.SOCIAL_MEDIA_MANAGER)
  @Post(':id/submit')
  submitForClientApproval(@Param('id') id: string, @CurrentUser() user: any) {
    return this.calendarService.submitForClientApproval(id, user);
  }

  @Roles(Role.MARKETING_MANAGER)
  @Post(':id/client-review')
  reviewClientEvent(
    @Param('id') id: string,
    @Body() body: { action: 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT'; comment?: string; deadline?: string; priority?: string },
    @CurrentUser() user: any,
  ) {
    return this.calendarService.reviewClientEvent(id, body.action, body.comment, user, body.deadline, body.priority);
  }

  @Roles(Role.MARKETING_MANAGER)
  @Post(':id/approve')
  approveEvent(
    @Param('id') id: string,
    @Body() body: { comment?: string; deadline?: string; priority?: string },
    @CurrentUser() user: any,
  ) {
    return this.calendarService.reviewClientEvent(id, 'APPROVE', body?.comment, user, body?.deadline, body?.priority);
  }

  @Roles(Role.MARKETING_MANAGER)
  @Put(':id/deadline')
  updateDeadline(
    @Param('id') id: string,
    @Body() body: { deadline: string; reason?: string },
    @CurrentUser() user: any,
  ) {
    return this.calendarService.updateDeadline(id, body.deadline, user, body.reason);
  }

  @Roles(Role.MARKETING_MANAGER)
  @Put(':id/priority')
  updatePriority(
    @Param('id') id: string,
    @Body() body: { priority: string; reason?: string },
    @CurrentUser() user: any,
  ) {
    return this.calendarService.updatePriority(id, body.priority, user, body.reason);
  }

  // EDIT REQUEST WORKFLOW ENDPOINTS
  @Get('edit-requests/all')
  getAllEditRequests(@Query('status') status: string, @CurrentUser() user: any) {
    return this.calendarService.getEditRequests(status, user);
  }

  @Get(':id/edit-requests')
  getEditRequestsForEvent(@Param('id') id: string) {
    return this.calendarService.getEditRequestsForEvent(id);
  }

  @Roles(Role.MEDIA_MANAGER, Role.SOCIAL_MEDIA_MANAGER)
  @Post(':id/edit-request')
  createEditRequest(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.calendarService.createEditRequest(id, body, user);
  }

  @Roles(Role.MARKETING_MANAGER)
  @Post('edit-requests/:requestId/approve')
  approveEditRequest(@Param('requestId') requestId: string, @Body() body: any, @CurrentUser() user: any) {
    return this.calendarService.approveEditRequest(requestId, body, user);
  }

  @Roles(Role.MARKETING_MANAGER)
  @Post('edit-requests/:requestId/reject')
  rejectEditRequest(@Param('requestId') requestId: string, @Body() body: any, @CurrentUser() user: any) {
    return this.calendarService.rejectEditRequest(requestId, body, user);
  }
}
