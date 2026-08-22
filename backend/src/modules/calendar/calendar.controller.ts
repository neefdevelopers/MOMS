import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums';

import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('clientId') clientId?: string,
    @Query('brandId') brandId?: string,
    @Query('shootType') shootType?: string,
    @Query('status') status?: string,
  ) {
    return this.calendarService.findAll(clientId, brandId, shootType, status, user?.id, user?.role);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.calendarService.findOne(id);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Post()
  create(@Body() data: any) {
    return this.calendarService.create(data);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.calendarService.update(id, data);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.calendarService.cancel(id);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Post(':id/generate-graphic-req')
  generateGraphicReq(@Param('id') id: string) {
    return this.calendarService.generateGraphicReq(id);
  }
}
