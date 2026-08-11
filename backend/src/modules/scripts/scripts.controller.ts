import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ScriptsService } from './scripts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
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
  findAll(@Query('projectId') projectId?: string, @Query('search') search?: string) {
    return this.scriptsService.findAll(projectId, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.scriptsService.findOne(id);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Post()
  create(@Body() data: any) {
    return this.scriptsService.create(data);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.scriptsService.update(id, data);
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
