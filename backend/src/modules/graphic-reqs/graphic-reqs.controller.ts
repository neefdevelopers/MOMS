import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { GraphicReqsService } from './graphic-reqs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('graphic-reqs')
export class GraphicReqsController {
  constructor(private readonly graphicReqsService: GraphicReqsService) {}

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
    @Query('date') date?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('all') all?: string,
  ) {
    return this.graphicReqsService.findAll({
      projectId,
      search,
      status,
      priority,
      clientId,
      brandId,
      productId,
      employeeId,
      date,
      dateFrom,
      dateTo,
      all,
      userId: user?.id,
      role: user?.role,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.graphicReqsService.findOne(id, user);
  }

  @Roles(Role.MEDIA_MANAGER, Role.ADMINISTRATOR)
  @Post()
  create(@Body() data: any) {
    return this.graphicReqsService.create(data);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    if (data.status === 'APPROVED' && user?.role !== 'MARKETING_MANAGER' && user?.role !== 'ADMIN' && user?.role !== 'ADMINISTRATOR') {
      throw new ForbiddenException('Only Marketing Manager can grant initial approval for Graphic Requirements');
    }
    return this.graphicReqsService.update(id, data);
  }

  @Post(':id/remarks')
  addRemark(
    @Param('id') id: string,
    @Body('message') message: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.graphicReqsService.addRemark(id, message, userId);
  }

  @Get(':id/deliverables')
  getDeliverables(@Param('id') id: string, @CurrentUser() user: any) {
    return this.graphicReqsService.getDeliverables(id, user);
  }

  @Post(':id/deliverables')
  addDeliverable(@Param('id') id: string, @Body() data: any, @CurrentUser() user: any) {
    return this.graphicReqsService.addDeliverable(id, data, user);
  }

  @Put('deliverables/:deliverableId')
  updateDeliverable(@Param('deliverableId') deliverableId: string, @Body() data: any, @CurrentUser() user: any) {
    return this.graphicReqsService.updateDeliverable(deliverableId, data, user);
  }

  @Patch('deliverables/:deliverableId/status')
  updateDeliverableStatus(@Param('deliverableId') deliverableId: string, @Body('status') status: string, @CurrentUser() user: any) {
    return this.graphicReqsService.updateDeliverableStatus(deliverableId, status, user);
  }

  @Delete('deliverables/:deliverableId')
  deleteDeliverable(@Param('deliverableId') deliverableId: string, @CurrentUser() user: any) {
    return this.graphicReqsService.deleteDeliverable(deliverableId, user);
  }
}
