import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('includeArchived') includeArchived?: string,
    @Query('search') search?: string,
    @CurrentUser() currentUser?: any,
  ) {
    return this.usersService.findAll(role, status, includeArchived === 'true', currentUser, search);
  }

  @Get('departments')
  getDepartments() {
    return this.usersService.getDepartments();
  }

  @Get('capabilities')
  getCapabilities() {
    return this.usersService.getCapabilities();
  }

  @Roles(Role.MEDIA_MANAGER)
  @Post('capabilities')
  createCapability(@Body() body: { name: string; category?: string }, @CurrentUser() user: any) {
    return this.usersService.createCapability(body, user.role);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  // Business Rule: Only the Media Manager may create employee records
  @Roles(Role.MEDIA_MANAGER)
  @Post()
  create(@Body() data: any, @CurrentUser() user: any) {
    return this.usersService.createEmployee(data, user.role);
  }

  // Business Rule: Only Media Manager may modify employee records, employees shall not modify profile info
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.usersService.updateEmployee(id, data, user);
  }

  // Business Rule: Only the Media Manager may activate employee records
  @Roles(Role.MEDIA_MANAGER)
  @Post(':id/activate')
  activate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.activateEmployee(id, user.role);
  }

  // Business Rule: Only the Media Manager may deactivate employee records
  @Roles(Role.MEDIA_MANAGER)
  @Post(':id/deactivate')
  deactivate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.deactivateEmployee(id, user.role);
  }

  // Business Rule: Only the Media Manager may suspend employee records
  @Roles(Role.MEDIA_MANAGER)
  @Post(':id/suspend')
  suspend(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.suspendEmployee(id, user.role);
  }

  // Business Rule: Only the Media Manager may archive employee records
  @Roles(Role.MEDIA_MANAGER)
  @Post(':id/archive')
  archive(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.archiveEmployee(id, user.role);
  }
}
