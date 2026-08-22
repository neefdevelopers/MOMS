import { Controller, Get, Patch, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationChannelManagerService } from './channels/notification-channel-manager.service';
import { NotificationDeliveryChannel } from './channels/notification-channels.types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly channelManager: NotificationChannelManagerService,
  ) {}

  @Get()
  findForUser(
    @CurrentUser('id') userId: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('type') type?: string,
    @Query('priority') priority?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('date') date?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('take') take?: string
  ) {
    return this.notificationsService.findForUser(userId, {
      status,
      category,
      type,
      priority,
      entityType,
      entityId,
      date,
      dateFrom,
      dateTo,
      unreadOnly: unreadOnly === 'true',
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get('summaries')
  getSummaries(@CurrentUser('id') userId: string) {
    return this.notificationsService.getDashboardNotificationSummaries(userId);
  }

  @Get('activity-history')
  getActivityHistory(
    @Query('title') title?: string,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('category') category?: string,
    @Query('projectId') projectId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('employeeName') employeeName?: string,
    @Query('recipientId') recipientId?: string,
    @Query('date') date?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('priority') priority?: string,
    @Query('status') status?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string
  ) {
    return this.notificationsService.getNotificationActivityHistory({
      title,
      search,
      type,
      category,
      projectId,
      employeeId,
      employeeName,
      recipientId,
      date,
      dateFrom,
      dateTo,
      entityType,
      entityId,
      priority,
      status,
      take: take ? parseInt(take, 10) : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
    });
  }

  @Get('system-alerts')
  getSystemAlerts(@CurrentUser('id') userId: string) {
    return this.notificationsService.getSystemAlerts(userId);
  }

  @Post('system-alerts/scan')
  scanOperationalAlerts() {
    return this.notificationsService.checkOperationalAlerts();
  }

  @Post('system-alerts/acknowledge')
  acknowledgeAlert(
    @CurrentUser('id') userId: string,
    @Body('alertId') alertId: string,
    @Body('notes') notes?: string
  ) {
    return this.notificationsService.acknowledgeOperationalAlert(alertId, userId, notes);
  }

  @Post('system-alerts/resolve')
  resolveAlert(
    @CurrentUser('id') userId: string,
    @Body('alertId') alertId: string,
    @Body('actionNotes') actionNotes?: string
  ) {
    return this.notificationsService.resolveOperationalAlert(alertId, userId, actionNotes);
  }

  @Post('system-alerts/test-trigger')
  triggerDiagnosticTest(
    @Body('type') type: string,
    @Body('trigger') trigger: boolean
  ) {
    return this.notificationsService.triggerOperationalDiagnosticTest(type, trigger);
  }

  @Post('auto-archive')
  autoArchiveOldNotifications() {
    return this.notificationsService.autoArchiveOldNotifications();
  }

  @Get('channels')
  getChannelsOverview() {
    return this.channelManager.getChannelStatusOverview();
  }

  @Post('channels/test')
  testChannelDelivery(
    @Body('channel') channel: NotificationDeliveryChannel,
    @Body('recipient') recipient?: { name?: string; email?: string; phone?: string }
  ) {
    return this.channelManager.testChannelDelivery(channel, recipient);
  }

  @Get('entity/:entityType/:entityId')
  findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string
  ) {
    return this.notificationsService.findByEntity(entityType, entityId);
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Patch('archive-all')
  archiveAll(@CurrentUser('id') userId: string) {
    return this.notificationsService.archiveAll(userId);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.notificationsService.markAsRead(id, userId);
  }

  @Patch(':id/archive')
  archiveNotification(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.notificationsService.archiveNotification(id, userId);
  }

  @Delete(':id')
  deleteById() {
    return this.notificationsService.deleteNotification();
  }

  @Delete()
  deleteAll() {
    return this.notificationsService.deleteNotification();
  }

  @Post('dispatch')
  dispatch(
    @Body('scope') scope: 'INDIVIDUAL' | 'MULTIPLE_EMPLOYEES' | 'TECHNICAL_MANAGER' | 'MEDIA_MANAGER' | 'ENTIRE_ORGANIZATION',
    @Body('targetUserIds') targetUserIds: string[],
    @Body('notification') notificationDto: any,
  ) {
    return this.notificationsService.dispatchByScope(scope, targetUserIds, notificationDto);
  }

  @Post('trigger-reminders')
  triggerReminders() {
    return this.notificationsService.checkAndDispatchReminders();
  }
}
