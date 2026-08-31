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

  // ─── Master Equipment Inventory List (Read-only list for all authenticated users) ─
  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('category') category?: string,
    @Query('availability') availability?: EquipmentAvailability,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.equipmentService.findAll(category, availability, includeArchived === 'true', user?.id, user?.role);
  }

  // ─── Equipment Monitoring ──────────────────────────────────────────────────
  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER, Role.ADMINISTRATOR)
  @Get('monitoring')
  getMonitoringData() {
    return this.equipmentService.getMonitoringData();
  }

  // ─── Equipment Dashboard ───────────────────────────────────────────────────
  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER, Role.ADMINISTRATOR)
  @Get('dashboard')
  getDashboardStats() {
    return this.equipmentService.getDashboardStats();
  }

  // ─── Archived / Retired Inventory ──────────────────────────────────────────
  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER, Role.ADMINISTRATOR)
  @Get('archived')
  findArchived() {
    return this.equipmentService.findArchived();
  }

  // ─── Create Equipment Master Record — Media Manager & Administrator Only ───
  @Roles(Role.MEDIA_MANAGER, Role.ADMINISTRATOR)
  @Post()
  create(@Body() data: any) {
    return this.equipmentService.create(data);
  }

  // ─── Update Equipment Master Record — Media Manager & Administrator Only ───
  @Roles(Role.MEDIA_MANAGER, Role.ADMINISTRATOR)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.equipmentService.update(id, data);
  }

  // ─── Retire (Archive) Equipment — Media Manager & Administrator Only ───────
  @Roles(Role.MEDIA_MANAGER, Role.ADMINISTRATOR)
  @Post(':id/retire')
  retire(
    @Param('id') id: string,
    @Body('retirementReason') retirementReason: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.equipmentService.retire(id, retirementReason, userId);
  }

  // ─── Staff Personal Equipment & Handover Records ────────────────────────────
  @Get('my')
  getMyEquipment(@CurrentUser('id') userId: string) {
    return this.equipmentService.getMyEquipment(userId);
  }

  // ─── Equipment Reservation — Media Manager, Technical Manager & Administrator ───────
  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER, Role.ADMINISTRATOR)
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

  // ─── Direct Equipment Allocation — Media Manager, Technical Manager & Administrator ───
  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER, Role.ADMINISTRATOR)
  @Post('allocate')
  directAllocate(
    @Body() dto: {
      equipmentId: string;
      employeeId: string;
      projectId?: string;
      startDate?: string;
      expectedReturnDate: string;
      purpose?: string;
      remarks?: string;
      accessoriesIncluded?: string;
      condition?: string;
    },
    @CurrentUser('id') allocatorId: string,
  ) {
    return this.equipmentService.allocateDirectly(dto, allocatorId);
  }

  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER, Role.ADMINISTRATOR)
  @Post(':id/allocate')
  allocateItem(
    @Param('id') id: string,
    @Body() dto: {
      employeeId: string;
      projectId?: string;
      startDate?: string;
      expectedReturnDate: string;
      purpose?: string;
      remarks?: string;
      accessoriesIncluded?: string;
      condition?: string;
    },
    @CurrentUser('id') allocatorId: string,
  ) {
    return this.equipmentService.allocateDirectly({ ...dto, equipmentId: id }, allocatorId);
  }

  @Post(':id/movement')
  logMovement(
    @Param('id') id: string,
    @Body() data: { projectId?: string; action: EquipmentMovementAction; notes?: string; currentHolder?: string },
    @CurrentUser() user: any,
  ) {
    return this.equipmentService.logMovement({ equipmentId: id, ...data }, user.id, user.role);
  }

  // ─── Equipment Requests Workflow ────────────────────────────────────────────
  @Post('requests')
  createRequest(
    @Body() dto: CreateEquipmentRequestDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.equipmentService.createRequest(dto, userId);
  }

  @Get('requests')
  findRequests(@CurrentUser() user: any) {
    const isManager = user.role === Role.MEDIA_MANAGER || user.role === Role.TECHNICAL_MANAGER || user.role === Role.ADMINISTRATOR;
    return this.equipmentService.findRequests(user.id, isManager);
  }

  // ─── Request Review, Preparation, Issuing — Media Manager & Administrator Only ─
  @Roles(Role.MEDIA_MANAGER, Role.ADMINISTRATOR)
  @Patch('requests/:id/review')
  reviewRequest(
    @Param('id') id: string,
    @Body() dto: ReviewEquipmentRequestDto,
    @CurrentUser('id') reviewerId: string,
  ) {
    return this.equipmentService.reviewRequest(id, dto.status, dto.reviewNotes, reviewerId);
  }

  @Roles(Role.MEDIA_MANAGER, Role.ADMINISTRATOR)
  @Post('requests/:id/prepare')
  prepareEquipment(
    @Param('id') id: string,
    @Body() dto: { accessoriesChecked?: string; preparationNotes?: string },
    @CurrentUser('id') preparedById: string,
  ) {
    return this.equipmentService.prepareEquipment(id, dto, preparedById);
  }

  @Roles(Role.MEDIA_MANAGER, Role.ADMINISTRATOR)
  @Post('requests/:id/issue-handover')
  issueEquipmentWithHandover(
    @Param('id') id: string,
    @Body() dto: { condition?: string; accessoriesIncluded?: string; remarks?: string },
    @CurrentUser('id') issuerId: string,
  ) {
    return this.equipmentService.issueEquipmentWithHandover(id, issuerId, dto);
  }

  @Roles(Role.MEDIA_MANAGER, Role.ADMINISTRATOR)
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

  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER, Role.ADMINISTRATOR)
  @Post('lost')
  reportLostEquipment(
    @Body() dto: { equipmentId: string; lastResponsibleEmployeeId?: string; lastKnownLocation?: string; lastKnownDate?: string; description: string },
    @CurrentUser('id') reporterId: string,
  ) {
    return this.equipmentService.reportLostEquipment(dto.equipmentId, dto, reporterId);
  }

  // ─── Maintenance Records — Media Manager, Technical Manager & Administrator ─
  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER, Role.ADMINISTRATOR)
  @Post('maintenance-records')
  createMaintenanceRecord(
    @Body() dto: { equipmentId: string; maintenanceType: string; performedBy: string; cost?: number; notes?: string; scheduledDate?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.equipmentService.createMaintenanceRecord(dto, userId);
  }

  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER, Role.ADMINISTRATOR)
  @Post('maintenance-records/:id/clear')
  clearMaintenanceRecord(
    @Param('id') id: string,
    @Body('notes') notes: string | undefined,
    @CurrentUser('id') clearedById: string,
  ) {
    return this.equipmentService.clearMaintenanceRecord(id, notes, clearedById);
  }

  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER, Role.ADMINISTRATOR)
  @Get('maintenance-records')
  getMaintenanceRecords(@Query('equipmentId') equipmentId?: string) {
    return this.equipmentService.getMaintenanceRecords(equipmentId);
  }

  // ─── Equipment Reports ─────────────────────────────────────────────────────
  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER, Role.ADMINISTRATOR)
  @Get('reports/summary')
  getEquipmentReports() {
    return this.equipmentService.getEquipmentReports();
  }

  @Get(':id/timeline')
  getEquipmentTimeline(@Param('id') id: string) {
    return this.equipmentService.getEquipmentTimeline(id);
  }

  // ─── Return Inspection ─────────────────────────────────────────────────────
  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER, Role.ADMINISTRATOR)
  @Post(':id/return-inspection')
  returnInspection(
    @Param('id') id: string,
    @Body() dto: ReturnInspectionDto,
    @CurrentUser('id') inspectorId: string,
  ) {
    return this.equipmentService.returnInspection(id, dto, inspectorId);
  }

  // ─── Damage Reports & Repair Tracking ──────────────────────────────────────
  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER, Role.ADMINISTRATOR)
  @Post('damage-reports')
  createDamageReport(
    @Body() dto: CreateDamageReportDto,
    @CurrentUser('id') reporterId: string,
  ) {
    return this.equipmentService.createDamageReport(dto, reporterId);
  }

  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER, Role.ADMINISTRATOR)
  @Get('damage-reports')
  findDamageReports(@Query('equipmentId') equipmentId?: string) {
    return this.equipmentService.findDamageReports(equipmentId);
  }

  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER, Role.ADMINISTRATOR)
  @Patch('damage-reports/:id/repair')
  updateRepairStatus(
    @Param('id') id: string,
    @Body() dto: UpdateRepairStatusDto,
  ) {
    return this.equipmentService.updateRepairStatus(id, dto.repairStatus, dto.repairNotes);
  }

  // ─── Equipment Categories — Media Manager & Administrator Only ────────────
  @Get('categories')
  getCategories() {
    return this.equipmentService.getCategories();
  }

  @Roles(Role.MEDIA_MANAGER, Role.ADMINISTRATOR)
  @Post('categories')
  createCategory(@Body('name') name: string, @CurrentUser('id') userId: string) {
    return this.equipmentService.createCategory(name, userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.equipmentService.findOne(id);
  }

  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER, Role.ADMINISTRATOR)
  @Patch(':id/maintenance')
  updateMaintenanceStatus(
    @Param('id') id: string,
    @Body('maintenanceStatus') maintenanceStatus: MaintenanceStatus,
    @Body('notes') notes?: string,
  ) {
    return this.equipmentService.updateMaintenanceStatus(id, maintenanceStatus, notes);
  }

  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER, Role.ADMINISTRATOR)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('availability') availability: EquipmentAvailability,
    @Body('notes') notes?: string,
  ) {
    return this.equipmentService.updateStatus(id, availability, notes);
  }

  // ─── Business Rule 3: Equipment records shall never be deleted ──────────────
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
