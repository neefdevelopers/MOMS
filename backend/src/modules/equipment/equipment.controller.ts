import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { EquipmentService } from './equipment.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role, EquipmentAvailability, MaintenanceStatus, EquipmentMovementAction } from '../../common/enums';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { CreateEquipmentRequestDto } from './dto/create-equipment-request.dto';
import { ReviewEquipmentRequestDto } from './dto/review-equipment-request.dto';
import { ReturnInspectionDto } from './dto/return-inspection.dto';
import { CreateDamageReportDto } from './dto/create-damage-report.dto';
import { UpdateRepairStatusDto } from './dto/update-repair-status.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  // ─── List active equipment (archived excluded by default) ──────────────────
  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('category') category?: string,
    @Query('availability') availability?: EquipmentAvailability,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.equipmentService.findAll(category, availability, includeArchived === 'true', user?.id, user?.role);
  }

  // ─── Business Rule 4: Separate endpoint for archived/retired inventory ─────
  @Get('archived')
  findArchived() {
    return this.equipmentService.findArchived();
  }

  @Get('dashboard')
  getDashboardStats() {
    return this.equipmentService.getDashboardStats();
  }

  // ─── Business Rule 1 & 2: Create master equipment record — Technical Manager Only ─
  @Roles(Role.TECHNICAL_MANAGER, Role.ADMINISTRATOR)
  @Post()
  create(@Body() data: any) {
    return this.equipmentService.create(data);
  }

  // ─── Business Rule 4: Retire (archive) equipment — Technical Manager Only ─
  @Roles(Role.TECHNICAL_MANAGER, Role.ADMINISTRATOR)
  @Post(':id/retire')
  retire(
    @Param('id') id: string,
    @Body('retirementReason') retirementReason: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.equipmentService.retire(id, retirementReason, userId);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Post(':id/reserve')
  reserve(
    @Param('id') id: string,
    @Body() dto: CreateReservationDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.equipmentService.reserve({
      equipmentId: id,
      projectId: dto.projectId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      reservedById: userId,
      expectedCheckoutDate: dto.expectedCheckoutDate,
    });
  }

  @Post(':id/movement')
  logMovement(
    @Param('id') id: string,
    @Body() data: { projectId?: string; action: EquipmentMovementAction; notes?: string; currentHolder?: string },
    @CurrentUser() user: any,
  ) {
    return this.equipmentService.logMovement({ equipmentId: id, ...data }, user.id, user.role);
  }

  // ─── Equipment Requests Workflow ─────────────────
  @Post('requests')
  createRequest(
    @Body() dto: CreateEquipmentRequestDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.equipmentService.createRequest(dto, userId);
  }

  @Get('requests')
  findRequests(@CurrentUser() user: any) {
    const isManager = user.role === Role.MEDIA_MANAGER || user.role === Role.TECHNICAL_MANAGER;
    return this.equipmentService.findRequests(user.id, isManager);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Patch('requests/:id/review')
  reviewRequest(
    @Param('id') id: string,
    @Body() dto: ReviewEquipmentRequestDto,
    @CurrentUser('id') reviewerId: string,
  ) {
    return this.equipmentService.reviewRequest(id, dto.status, dto.reviewNotes, reviewerId);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Post('requests/:id/prepare')
  prepareEquipment(
    @Param('id') id: string,
    @Body() dto: { accessoriesChecked?: string; preparationNotes?: string },
    @CurrentUser('id') preparedById: string,
  ) {
    return this.equipmentService.prepareEquipment(id, dto, preparedById);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Post('requests/:id/issue-handover')
  issueEquipmentWithHandover(
    @Param('id') id: string,
    @Body() dto: { condition?: string; accessoriesIncluded?: string; remarks?: string },
    @CurrentUser('id') issuerId: string,
  ) {
    return this.equipmentService.issueEquipmentWithHandover(id, issuerId, dto);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Post('requests/:id/issue')
  issueEquipment(
    @Param('id') id: string,
    @CurrentUser('id') issuerId: string,
  ) {
    return this.equipmentService.issueEquipment(id, issuerId);
  }

  @Post('requests/:id/acknowledge')
  acknowledgeReceipt(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.equipmentService.acknowledgeReceipt(id, userId);
  }

  @Post('check-availability')
  checkAvailability(
    @Body() dto: { equipmentIds: string[]; startDate: string; endDate: string; projectId?: string },
  ) {
    return this.equipmentService.checkAvailability(dto);
  }

  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER)
  @Post('lost')
  reportLostEquipment(
    @Body() dto: { equipmentId: string; lastResponsibleEmployeeId?: string; lastKnownLocation?: string; lastKnownDate?: string; description: string },
    @CurrentUser('id') reporterId: string,
  ) {
    return this.equipmentService.reportLostEquipment(dto.equipmentId, dto, reporterId);
  }

  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER)
  @Post('maintenance-records')
  createMaintenanceRecord(
    @Body() dto: { equipmentId: string; maintenanceType: string; performedBy: string; cost?: number; notes?: string; scheduledDate?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.equipmentService.createMaintenanceRecord(dto, userId);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Post('maintenance-records/:id/clear')
  clearMaintenanceRecord(
    @Param('id') id: string,
    @Body('notes') notes: string | undefined,
    @CurrentUser('id') clearedById: string,
  ) {
    return this.equipmentService.clearMaintenanceRecord(id, notes, clearedById);
  }

  @Get('maintenance-records')
  getMaintenanceRecords(@Query('equipmentId') equipmentId?: string) {
    return this.equipmentService.getMaintenanceRecords(equipmentId);
  }

  @Get('reports/summary')
  getEquipmentReports() {
    return this.equipmentService.getEquipmentReports();
  }

  @Get(':id/timeline')
  getEquipmentTimeline(@Param('id') id: string) {
    return this.equipmentService.getEquipmentTimeline(id);
  }

  @Post(':id/return-inspection')
  returnInspection(
    @Param('id') id: string,
    @Body() dto: ReturnInspectionDto,
    @CurrentUser('id') inspectorId: string,
  ) {
    return this.equipmentService.returnInspection(id, dto, inspectorId);
  }

  // ─── Damage Reports & Repair Tracking ─────────────────
  @Post('damage-reports')
  createDamageReport(
    @Body() dto: CreateDamageReportDto,
    @CurrentUser('id') reporterId: string,
  ) {
    return this.equipmentService.createDamageReport(dto, reporterId);
  }

  @Get('damage-reports')
  findDamageReports(@Query('equipmentId') equipmentId?: string) {
    return this.equipmentService.findDamageReports(equipmentId);
  }

  @Patch('damage-reports/:id/repair')
  updateRepairStatus(
    @Param('id') id: string,
    @Body() dto: UpdateRepairStatusDto,
  ) {
    return this.equipmentService.updateRepairStatus(id, dto.repairStatus, dto.repairNotes);
  }
  // ─── Equipment Categories ────────────────────────
  @Get('categories')
  getCategories() {
    return this.equipmentService.getCategories();
  }

  @Roles(Role.TECHNICAL_MANAGER, Role.ADMINISTRATOR)
  @Post('categories')
  createCategory(@Body('name') name: string, @CurrentUser('id') userId: string) {
    return this.equipmentService.createCategory(name, userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.equipmentService.findOne(id);
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

  @Roles(Role.TECHNICAL_MANAGER, Role.MEDIA_MANAGER)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('availability') availability: EquipmentAvailability,
    @Body('notes') notes?: string,
  ) {
    return this.equipmentService.updateStatus(id, availability, notes);
  }

  // ─── Business Rule 3: Equipment records shall never be deleted ──────────────
  // Any DELETE call is permanently blocked at the API layer.
  @Delete(':id')
  deleteById() {
    throw new ForbiddenException(
      'Business Rule Violation (Rule 3): Equipment inventory records are permanent and cannot be deleted. Use POST /equipment/:id/retire to archive retired equipment.'
    );
  }

  @Delete()
  deleteAll() {
    throw new ForbiddenException(
      'Business Rule Violation (Rule 3): Bulk deletion of equipment records is strictly prohibited by operational policy.'
    );
  }
}
