import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/permissions/permissions.decorator';
import { Role, ModuleType, PermissionType } from '../../common/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @RequirePermission(ModuleType.PRODUCTS, PermissionType.VIEW)
  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('brandId') brandId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.productsService.findAll(brandId, status, search, user);
  }

  @RequirePermission(ModuleType.PRODUCTS, PermissionType.VIEW)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.productsService.findOne(id, user);
  }

  @Roles(Role.MARKETING_MANAGER, Role.ADMINISTRATOR, Role.MEDIA_MANAGER)
  @RequirePermission(ModuleType.PRODUCTS, PermissionType.CREATE)
  @Post()
  create(@Body() data: any, @CurrentUser() user: any) {
    return this.productsService.create(data, user);
  }

  @Roles(Role.MARKETING_MANAGER, Role.ADMINISTRATOR, Role.MEDIA_MANAGER)
  @RequirePermission(ModuleType.PRODUCTS, PermissionType.EDIT)
  @Put(':id')
  update(@Param('id') id: string, @Body() data: any, @CurrentUser() user: any) {
    return this.productsService.update(id, data, user);
  }

  @Roles(Role.MARKETING_MANAGER, Role.ADMINISTRATOR, Role.MEDIA_MANAGER)
  @RequirePermission(ModuleType.PRODUCTS, PermissionType.EDIT)
  @Patch(':id')
  patchUpdate(@Param('id') id: string, @Body() data: any, @CurrentUser() user: any) {
    return this.productsService.update(id, data, user);
  }
}
