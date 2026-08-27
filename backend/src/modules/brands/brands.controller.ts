import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('clientId') clientId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.brandsService.findAll(clientId, status, search, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.brandsService.findOne(id, user);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Post()
  create(@Body() data: any) {
    return this.brandsService.create(data);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.brandsService.update(id, data);
  }
}
