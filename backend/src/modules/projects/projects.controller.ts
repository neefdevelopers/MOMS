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
}
