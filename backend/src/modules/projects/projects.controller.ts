import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role, ShootType, ProjectStatus } from '../../common/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('search') search?: string,
    @Query('clientId') clientId?: string,
    @Query('brandId') brandId?: string,
    @Query('productId') productId?: string,
    @Query('shootType') shootType?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('date') date?: string,
    @Query('mediaManagerId') mediaManagerId?: string,
    @Query('technicalManagerId') technicalManagerId?: string,
    @Query('assignedUserId') assignedUserId?: string,
    @Query('location') location?: string,
    @Query('archived') archived?: string,
    @Query('all') all?: string,
  ) {
    return this.projectsService.findAll({
      search,
      clientId,
      brandId,
      productId,
      shootType,
      status,
      priority,
      date,
      mediaManagerId,
      technicalManagerId,
      assignedUserId,
      location,
      archived: archived === 'true',
      all: all === 'true',
      userId: user.id,
      role: user.role,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.projectsService.findOne(id, user);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Post()
  create(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.projectsService.create(data, userId);
  }

  @Roles(Role.STAFF, Role.SOCIAL_MEDIA_MANAGER, Role.MEDIA_MANAGER, Role.MARKETING_MANAGER, Role.TECHNICAL_MANAGER, Role.ADMINISTRATOR)
  @Put(':id')
  update(@Param('id') id: string, @Body() data: any, @CurrentUser('id') userId: string) {
    return this.projectsService.update(id, data, userId);
  }

  @Roles(Role.STAFF, Role.SOCIAL_MEDIA_MANAGER, Role.MEDIA_MANAGER, Role.MARKETING_MANAGER, Role.TECHNICAL_MANAGER, Role.ADMINISTRATOR)
  @Patch(':id')
  patchUpdate(@Param('id') id: string, @Body() data: any, @CurrentUser('id') userId: string) {
    return this.projectsService.update(id, data, userId);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Post(':id/archive')
  archive(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.projectsService.archive(id, userId);
  }

  @Post(':id/submit-technical')
  submitTechnicalReview(@Param('id') id: string, @CurrentUser() user: any) {
    return this.projectsService.submitTechnicalReview(id, user);
  }

  @Post(':id/review-technical')
  reviewTechnical(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { action: 'APPROVE' | 'REJECT'; comment?: string },
  ) {
    return this.projectsService.reviewTechnical(id, user, body);
  }

  @Post(':id/review-media')
  reviewMedia(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { action: 'APPROVE' | 'REJECT'; comment?: string },
  ) {
    return this.projectsService.reviewMedia(id, user, body);
  }

  @Post(':id/review-marketing')
  reviewMarketing(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { action: 'APPROVE' | 'REJECT'; comment?: string },
  ) {
    return this.projectsService.reviewMarketing(id, user, body);
  }

  @Post(':id/confirm-client')
  confirmClient(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { action: 'CONFIRM' | 'REQUEST_CHANGES'; comment?: string },
  ) {
    return this.projectsService.confirmClient(id, user, body);
  }

  /**
   * Candidate video editors for a shoot project (designation or video-editing skill).
   * Media Manager only, matching the assign endpoint: the result is an org-wide staff list and
   * project visibility alone is not authorization to browse it.
   */
  @Roles(Role.MEDIA_MANAGER, Role.ADMINISTRATOR)
  @Get(':id/video-editor-candidates')
  getScriptEditorCandidates(@Param('id') id: string, @CurrentUser() user: any) {
    return this.projectsService.getScriptEditorCandidates(id, user);
  }

  /**
   * Assign or clear the video editor on one uploaded script document. Restricted to the Media
   * Manager. Sends editorId: null to unassign.
   */
  @Roles(Role.MEDIA_MANAGER, Role.ADMINISTRATOR)
  @Post(':id/script-video-editor')
  setScriptVideoEditor(
    @Param('id') id: string,
    @Body() body: { fileId: string; editorId?: string | null },
    @CurrentUser() user: any,
  ) {
    return this.projectsService.setScriptVideoEditor(id, body?.fileId, body?.editorId ?? null, user);
  }

  /**
   * The assigned video editor marks editing as finished, which moves the linked task into
   * the existing technical -> media review chain.
   */
  @Post(':id/script-video-editing/finish')
  finishScriptVideoEditing(@Param('id') id: string, @Body() body: { fileId: string }, @CurrentUser() user: any) {
    return this.projectsService.finishScriptVideoEditing(id, body?.fileId, user);
  }

  /**
   * Returns every Script Document (FileMetadata with attachmentCategory='SCRIPT_DOCUMENT')
   * attached to a project. This is the same source the Scripts tab renders, so the
   * Convert-to-Video Editing Task panel and Script Session always show identical records.
   */
  @Get(':id/script-documents')
  getScriptDocuments(@Param('id') id: string, @CurrentUser() user: any) {
    return this.projectsService.getScriptDocuments(id, user);
  }

  /**
   * Returns every Script belonging to a project, parsed from ShootProject.notes.
   * Used by the Convert-to-Video Editing Task workflow so the UI can confirm it sees
   * ALL scripts (not just one) before creating per-script editing tasks.
   */
  @Get(':id/video-editing-task-scripts')
  getVideoEditingTaskScripts(@Param('id') id: string, @CurrentUser() user: any) {
    return this.projectsService.getVideoEditingTaskScripts(id, user);
  }

  /**
   * Media Manager converts a completed Shoot Project into Video Editing.
   *
   * For every Script on the project, creates exactly one Video Editing Task (idempotent:
   * a second call will not create duplicates). Each task is linked to the project, client,
   * brand, product/campaign and the script itself.
   */
  @Roles(Role.MEDIA_MANAGER, Role.ADMINISTRATOR)
  @Post(':id/convert-to-video-editing')
  convertToVideoEditing(
    @Param('id') id: string,
    @Body() body: { scripts?: Array<{ scriptId: string; clipCode: string; staffId: string }> },
    @CurrentUser() user: any,
  ) {
    return this.projectsService.convertToVideoEditing(id, user, body);
  }

  /**
   * Media Manager approves or rejects a completed Video Editing Task.
   * Approve -> WAITING_FOR_MARKETING_MANAGER_REVIEW. Reject -> back to IN_PROGRESS.
   */
  @Roles(Role.MEDIA_MANAGER, Role.ADMINISTRATOR)
  @Post(':id/video-editing-task/:taskId/media-review')
  reviewVideoEditingMedia(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @Body() body: { action: 'APPROVE' | 'REJECT'; comment?: string },
    @CurrentUser() user: any,
  ) {
    return this.projectsService.reviewVideoEditingMedia(id, taskId, body, user);
  }

  /**
   * Marketing Manager approves or rejects a Media-Manager-approved Video Editing Task.
   * Approve -> MARKETING_MANAGER_APPROVED. Reject -> back to IN_PROGRESS (staff re-edits).
   */
  @Roles(Role.MARKETING_MANAGER, Role.ADMINISTRATOR)
  @Post(':id/video-editing-task/:taskId/marketing-review')
  reviewVideoEditingMarketing(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @Body() body: { action: 'APPROVE' | 'REJECT'; comment?: string },
    @CurrentUser() user: any,
  ) {
    return this.projectsService.reviewVideoEditingMarketing(id, taskId, body, user);
  }

  /**
   * Video Editor submits a VIDEO_EDITING task directly for Technical Review.
   * No Media Manager or Marketing Manager approval required.
   */
  @Post(':id/video-editing-task/:taskId/submit-technical-review')
  submitVideoEditingForTechnicalReview(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @Body() body: { deliverableUrl?: string; deliverableFileName?: string; comment?: string },
    @CurrentUser() user: any,
  ) {
    return this.projectsService.submitVideoEditingForTechnicalReview(id, taskId, body, user);
  }
}
