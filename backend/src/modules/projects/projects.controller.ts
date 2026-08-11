import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
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
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Post()
  create(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.projectsService.create(data, userId);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Put(':id')
  update(@Param('id') id: string, @Body() data: any, @CurrentUser('id') userId: string) {
    return this.projectsService.update(id, data, userId);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Post(':id/archive')
  archive(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.projectsService.archive(id, userId);
  }
}
