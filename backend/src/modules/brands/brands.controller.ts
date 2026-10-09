import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/permissions/permissions.decorator';
import { Role, ModuleType, PermissionType } from '../../common/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @RequirePermission(ModuleType.BRANDS, PermissionType.VIEW)
  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('clientId') clientId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.brandsService.findAll(clientId, status, search, user);
  }

  @RequirePermission(ModuleType.BRANDS, PermissionType.VIEW)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.brandsService.findOne(id, user);
  }

  @Roles(Role.MARKETING_MANAGER, Role.ADMINISTRATOR, Role.MEDIA_MANAGER)
  @RequirePermission(ModuleType.BRANDS, PermissionType.CREATE)
  @Post()
  create(@Body() data: any, @CurrentUser() user: any) {
    return this.brandsService.create(data, user);
  }

  @Roles(Role.MARKETING_MANAGER, Role.ADMINISTRATOR, Role.MEDIA_MANAGER)
  @RequirePermission(ModuleType.BRANDS, PermissionType.EDIT)
  @Put(':id')
  update(@Param('id') id: string, @Body() data: any, @CurrentUser() user: any) {
    return this.brandsService.update(id, data, user);
  }

  @Roles(Role.MARKETING_MANAGER, Role.ADMINISTRATOR, Role.MEDIA_MANAGER)
  @RequirePermission(ModuleType.BRANDS, PermissionType.EDIT)
  @Patch(':id')
  patchUpdate(@Param('id') id: string, @Body() data: any, @CurrentUser() user: any) {
    return this.brandsService.update(id, data, user);
  }
}
