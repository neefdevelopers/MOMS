import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ScriptsService } from './scripts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MARKETING_MANAGER, Role.MEDIA_MANAGER, Role.SOCIAL_MEDIA_MANAGER, Role.ADMINISTRATOR)
@Controller('scripts')
export class ScriptsController {
  constructor(private readonly scriptsService: ScriptsService) {}

  @Get('categories')
  getCategories() {
    return this.scriptsService.getCategories();
  }

  @Roles(Role.MEDIA_MANAGER)
  @Put('categories')
  updateCategories(@Body('categories') categories: string[]) {
    return this.scriptsService.updateCategories(categories);
  }

  @Get('naming-format')
  getNamingFormat() {
    return this.scriptsService.getNamingFormat();
  }

  @Roles(Role.MEDIA_MANAGER)
  @Put('naming-format')
  updateNamingFormat(@Body('format') format: string) {
    return this.scriptsService.updateNamingFormat(format);
  }

  @Post('preview-name')
  previewName(@Body() data: { projectId: string; language?: string }) {
    return this.scriptsService.generateFormattedScriptName(data.projectId, data.language);
  }

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('projectId') projectId?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('clientId') clientId?: string,
    @Query('brandId') brandId?: string,
    @Query('productId') productId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('language') language?: string,
    @Query('date') date?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.scriptsService.findAll({
      projectId,
      search,
      status,
      priority,
      clientId,
      brandId,
      productId,
      employeeId,
      language,
      date,
      dateFrom,
      dateTo,
      userId: user?.id,
      role: user?.role,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.scriptsService.findOne(id, user);
  }

  @Roles(Role.SOCIAL_MEDIA_MANAGER, Role.MEDIA_MANAGER, Role.MARKETING_MANAGER, Role.ADMINISTRATOR)
  @Post()
  create(@Body() data: any, @CurrentUser() user: any) {
    return this.scriptsService.create({
      ...data,
      createdById: user?.id,
      createdByName: user?.name,
      createdByRole: user?.role,
    });
  }

  @Roles(Role.SOCIAL_MEDIA_MANAGER, Role.MEDIA_MANAGER, Role.MARKETING_MANAGER, Role.ADMINISTRATOR)
  @Put(':id')
  update(@Param('id') id: string, @Body() data: any, @CurrentUser() user: any) {
    return this.scriptsService.update(id, { ...data, updatedById: user?.id });
  }

  @Roles(Role.MARKETING_MANAGER, Role.ADMINISTRATOR)
  @Post(':id/approve')
  approveScript(
    @Param('id') id: string,
    @Body() body: { action: 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT'; comment?: string; rejectionReason?: string },
    @CurrentUser() user: any,
  ) {
    return this.scriptsService.approveScript(id, user, body);
  }

  @Roles(Role.SOCIAL_MEDIA_MANAGER, Role.MEDIA_MANAGER, Role.MARKETING_MANAGER, Role.ADMINISTRATOR)
  @Post(':id/resubmit')
  resubmitScript(@Param('id') id: string, @CurrentUser() user: any) {
    return this.scriptsService.resubmitScript(id, user);
  }

  // --- Script Assignment Endpoints ---

  @Get(':id/assignments')
  getAssignments(@Param('id') id: string) {
    return this.scriptsService.getAssignments(id);
  }

  @Get(':id/timeline')
  getTimeline(@Param('id') id: string) {
    return this.scriptsService.getTimeline(id);
  }

  @Get(':id/remarks')
  getRemarks(@Param('id') id: string) {
    return this.scriptsService.getRemarks(id);
  }

  @Post(':id/remarks')
  addRemark(
    @Param('id') scriptId: string,
    @Body() body: { message: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.scriptsService.addRemark(scriptId, userId, body.message);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Post(':id/assignments')
  assignEmployee(
    @Param('id') scriptId: string,
    @Body() body: { userId: string; responsibility: string },
  ) {
    return this.scriptsService.assignEmployee(scriptId, body.userId, body.responsibility);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Delete(':id/assignments')
  removeAssignment(
    @Param('id') scriptId: string,
    @Body() body: { userId: string; responsibility: string },
  ) {
    return this.scriptsService.removeAssignment(scriptId, body.userId, body.responsibility);
  }

  // --- Deliverable Endpoints ---

  @Get(':id/deliverables')
  getDeliverables(@Param('id') id: string) {
    return this.scriptsService.getDeliverables(id);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Post(':id/deliverables')
  addDeliverable(
    @Param('id') scriptId: string,
    @Body() body: { type: string; title?: string; description?: string; duration?: string },
  ) {
    return this.scriptsService.addDeliverable(scriptId, body);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Put('deliverables/:deliverableId')
  updateDeliverable(
    @Param('deliverableId') deliverableId: string,
    @Body() body: { type?: string; title?: string; description?: string; duration?: string; status?: string },
  ) {
    return this.scriptsService.updateDeliverable(deliverableId, body);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Delete('deliverables/:deliverableId')
  deleteDeliverable(@Param('deliverableId') deliverableId: string) {
    return this.scriptsService.deleteDeliverable(deliverableId);
  }
}
