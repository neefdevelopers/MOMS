import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { EquipmentService } from './equipment.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role, EquipmentAvailability, MaintenanceStatus, EquipmentMovementAction } from '../../common/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Get()
  findAll(@Query('category') category?: string, @Query('availability') availability?: EquipmentAvailability) {
    return this.equipmentService.findAll(category, availability);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.equipmentService.findOne(id);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Post()
  create(@Body() data: any) {
    return this.equipmentService.create(data);
  }

  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER)
  @Post(':id/reserve')
  reserve(@Param('id') id: string, @Body() data: { projectId: string; startDate: Date; endDate: Date }) {
    return this.equipmentService.reserve({ equipmentId: id, ...data });
  }

  @Post(':id/movement')
  logMovement(
    @Param('id') id: string,
    @Body() data: { projectId?: string; action: EquipmentMovementAction; notes?: string; currentHolder?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.equipmentService.logMovement({ equipmentId: id, ...data }, userId);
  }

  @Roles(Role.TECHNICAL_MANAGER, Role.MEDIA_MANAGER)
  @Patch(':id/maintenance')
  updateMaintenanceStatus(
    @Param('id') id: string,
    @Body('maintenanceStatus') maintenanceStatus: MaintenanceStatus,
    @Body('notes') notes?: string,
  ) {
    return this.equipmentService.updateMaintenanceStatus(id, maintenanceStatus, notes);
  }
}
