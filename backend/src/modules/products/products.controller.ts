import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('brandId') brandId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.productsService.findAll(brandId, status, search, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.productsService.findOne(id, user);
  }

  @Roles(Role.MARKETING_MANAGER, Role.ADMINISTRATOR)
  @Post()
  create(@Body() data: any) {
    return this.productsService.create(data);
  }

  @Roles(Role.MARKETING_MANAGER, Role.ADMINISTRATOR)
  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.productsService.update(id, data);
  }
}
