import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { CommunicationsService } from './communications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('communications')
export class CommunicationsController {
  constructor(private readonly communicationsService: CommunicationsService) {}

  @Get()
  findByEntity(
    @CurrentUser() user: any,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('search') search?: string,
    @Query('isRemark') isRemark?: string,
    @Query('blockerStatus') blockerStatus?: string,
    @Query('senderId') senderId?: string,
    @Query('recipient') recipient?: string,
    @Query('projectId') projectId?: string,
    @Query('date') date?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.communicationsService.findByEntity(
      entityType,
      entityId,
      search,
      isRemark,
      blockerStatus,
      senderId,
      recipient,
      projectId,
      date,
      type,
      status,
      user?.id,
      user?.role,
    );
  }

  @Get('announcements')
  getAnnouncements(@Query('includeExpired') includeExpired?: string) {
    return this.communicationsService.getAnnouncements(includeExpired === 'true');
  }

  @Post('announcements')
  publishAnnouncement(
    @Body()
    dto: {
      title: string;
      description: string;
      priority?: string;
      publishDate?: string;
      expiryDate?: string | null;
      attachments?: any[];
    },
    @CurrentUser() user: any
  ) {
    return this.communicationsService.publishAnnouncement(dto, user);
  }

  @Get('entities')
  getOperationalEntities() {
    return this.communicationsService.getOperationalEntities();
  }

  @Get('types')
  getCommunicationTypes() {
    return this.communicationsService.getCommunicationTypes();
  }

  @Post('types')
  addCustomType(
    @Body('label') label: string,
    @CurrentUser('role') role: string,
  ) {
    return this.communicationsService.addCustomCommunicationType(label, role);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.communicationsService.updateStatus(id, status);
  }

  @Patch(':id/mark-as-read')
  markAsRead(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.communicationsService.markAsRead(id, userId);
  }

  @Patch(':id/resolve-blocker')
  resolveBlocker(
    @Param('id') id: string,
    @Body('resolutionNotes') resolutionNotes: string,
    @CurrentUser('id') resolverId: string,
  ) {
    return this.communicationsService.resolveBlocker(id, resolutionNotes, resolverId);
  }

  @Get(':id/timeline')
  getTimeline(@Param('id') id: string) {
    return this.communicationsService.getTimeline(id);
  }

  @Post()
  create(
    @Body() data: {
      entityType: string;
      entityId: string;
      parentId?: string;
      projectId?: string;
      type?: string;
      subject?: string;
      recipients?: string;
      status?: string;
      isRemark?: boolean;
      isAnnouncement?: boolean;
      priority?: string;
      targetRole?: string;
      blockerReason?: string;
      assignedToId?: string;
      content: string;
      attachments?: { fileName: string; fileUrl: string; fileType: string; fileSize?: number }[];
    },
    @CurrentUser('id') senderId: string,
  ) {
    return this.communicationsService.create(data, senderId);
  }

  // ─── BUSINESS RULES 4 & 10: Communications may never be deleted ──────────
  // Communication history is permanent. Attempting deletion returns HTTP 403.
  // All communications are part of the permanent operational audit trail.
  @Delete(':id')
  deleteBlockedByPolicy() {
    throw new ForbiddenException(
      'Business Rule Violation (Rules 4 & 10): Communication history is permanent and cannot be deleted. All records are part of the permanent operational audit trail.'
    );
  }

  @Delete()
  deleteAllBlockedByPolicy() {
    throw new ForbiddenException(
      'Business Rule Violation (Rules 4 & 10): Bulk deletion of communications is strictly prohibited by operational policy.'
    );
  }
}


