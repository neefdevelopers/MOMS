import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EquipmentAvailability, MaintenanceStatus, EquipmentMovementAction } from '../../common/enums';

@Injectable()
export class EquipmentService {
  constructor(private prisma: PrismaService) {}

  // ─── Business Rule 1: All equipment belongs to COMPANY ─────────────────────
  // ownedBy is always stamped as 'COMPANY' on every record; never personal.

  async findAll(category?: string, availability?: EquipmentAvailability, includeArchived = false) {
    const where: any = {};
    if (category) where.category = category;
    if (availability) where.availability = availability;

    // Business Rule 4: Retired/archived equipment is hidden by default but never deleted
    if (!includeArchived) {
      where.isArchived = false;
    }

    return this.prisma.equipment.findMany({
      where,
      include: {
        reservations: { include: { project: true, reservedBy: { select: { id: true, name: true, email: true, role: true } } } },
        movements: { include: { user: true, project: true }, orderBy: { timestamp: 'desc' } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findArchived() {
    // Business Rule 4: Archived equipment remains in history, accessible separately
    return this.prisma.equipment.findMany({
      where: { isArchived: true },
      include: {
        reservations: { include: { project: true, reservedBy: { select: { id: true, name: true, email: true, role: true } } } },
        movements: { include: { user: true, project: true }, orderBy: { timestamp: 'desc' } },
      },
      orderBy: { archivedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.equipment.findUnique({
      where: { id },
      include: {
        reservations: { include: { project: true, reservedBy: { select: { id: true, name: true, email: true, role: true } } } },
        movements: { include: { user: true, project: true }, orderBy: { timestamp: 'desc' } },
      },
    });
    if (!item) throw new NotFoundException('Equipment not found');
    return item;
  }

  async create(data: any) {
    const count = await this.prisma.equipment.count();
    const autoEqpId = `EQP-${(count + 1).toString().padStart(6, '0')}`;

    // Business Rule 1: ownedBy always forced to 'COMPANY'
    // Business Rule 2: Permanent inventory record created with acquisition details
    return this.prisma.equipment.create({
      data: {
        equipmentId: autoEqpId,
        name: data.name,
        category: data.category,
        brand: data.brand,
        model: data.model,
        serialNumber: data.serialNumber || `SN-${Date.now()}`,
        condition: data.condition || 'Good',
        availability: EquipmentAvailability.AVAILABLE,
        maintenanceStatus: MaintenanceStatus.OPERATIONAL,
        internalNotes: data.notes,

        // Business Rule 1 — Company ownership, always enforced
        ownedBy: 'COMPANY',

        // Business Rule 2 — Permanent inventory record fields
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        purchaseCost: data.purchaseCost ? parseFloat(data.purchaseCost) : null,
        purchaseRef: data.purchaseRef || null,

        // Business Rule 3 — isArchived starts false; can never be deleted
        isArchived: false,
      },
    });
  }

  // ─── Business Rule 3: Equipment records shall never be deleted ──────────────
  // This method is intentionally provided so the controller can throw a 403.
  // No actual deletion logic exists anywhere in this service.
  async deleteNotAllowed(): Promise<never> {
    throw new ForbiddenException(
      'Business Rule Violation (Rule 3): Equipment inventory records are permanent and cannot be deleted. Use the Retire endpoint to archive equipment that is no longer in service.'
    );
  }

  // ─── Business Rule 4: Retired equipment is archived (soft-retirement) ───────
  async retire(id: string, retirementReason: string, userId: string) {
    const eqp = await this.findOne(id);

    if (eqp.isArchived) {
      throw new BadRequestException('This equipment has already been archived. No further action is required.');
    }

    if (eqp.availability === EquipmentAvailability.CHECKED_OUT || eqp.availability === EquipmentAvailability.RESERVED) {
      throw new BadRequestException(
        `Cannot retire equipment that is currently ${eqp.availability.toLowerCase()}. Return or cancel the active assignment first.`
      );
    }

    if (!retirementReason?.trim()) {
      throw new BadRequestException('A retirement reason is required to archive equipment.');
    }

    const now = new Date();

    // Log the RETIRED movement — this becomes part of the permanent movement history
    await this.prisma.equipmentMovement.create({
      data: {
        equipmentId: id,
        userId,
        action: EquipmentMovementAction.RETIRED,
        notes: `Equipment retired and archived. Reason: ${retirementReason.trim()}`,
        timestamp: now,
      },
    });

    // Archive the equipment record — availability set to RETIRED, isArchived = true
    return this.prisma.equipment.update({
      where: { id },
      data: {
        availability: EquipmentAvailability.RETIRED,
        maintenanceStatus: MaintenanceStatus.DECOMMISSIONED,
        isArchived: true,
        archivedAt: now,
        retirementReason: retirementReason.trim(),
        currentHolder: null,
      },
    });
  }

  async reserve(data: { equipmentId: string; projectId: string; startDate: Date | string; endDate: Date | string; reservedById: string; expectedCheckoutDate?: Date | string }) {
    const eqp = await this.findOne(data.equipmentId);

    if (eqp.isArchived) {
      throw new BadRequestException('Cannot reserve retired/archived equipment.');
    }
    // Ensure equipment is free (available) before reserving
    if (eqp.availability !== EquipmentAvailability.AVAILABLE) {
      throw new BadRequestException(`Cannot reserve equipment that is currently ${eqp.availability.toLowerCase()}.`);
    }

    // Disallow any other active reservation for this equipment
    const activeReservation = await this.prisma.equipmentReservation.findFirst({
      where: {
        equipmentId: data.equipmentId,
        status: 'RESERVED',
      },
    });
    if (activeReservation) {
      throw new BadRequestException('Equipment already has an active reservation and cannot be reserved again.');
    }

    const res = await this.prisma.equipmentReservation.create({
      data: {
        equipmentId: data.equipmentId,
        projectId: data.projectId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        reservedById: data.reservedById,
        expectedCheckout: data.expectedCheckoutDate ? new Date(data.expectedCheckoutDate) : undefined,
        status: 'RESERVED',
      },
      include: {
        project: true,
        equipment: true,
        reservedBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    await this.prisma.equipment.update({
      where: { id: data.equipmentId },
      data: { availability: EquipmentAvailability.RESERVED },
    });

    return res;
  }

  async logMovement(
    data: {
      equipmentId: string;
      projectId?: string;
      action: EquipmentMovementAction;
      notes?: string;
      currentHolder?: string;
    },
    userId: string,
    userRole?: string,
  ) {
    const eqp = await this.findOne(data.equipmentId);

    // Business Rule 4: archived equipment cannot receive new movements
    if (eqp.isArchived) {
      throw new BadRequestException('Cannot log movements for retired/archived equipment.');
    }

    if (data.action === EquipmentMovementAction.RETIRED) {
      throw new BadRequestException(
        'Use the dedicated Retire endpoint (POST /equipment/:id/retire) to retire equipment.'
      );
    }

    // Business Rule 11: Only the Media Manager may issue or approve equipment checkout
    if (data.action === EquipmentMovementAction.ISSUED || data.action === EquipmentMovementAction.USED) {
      if (userRole !== 'MEDIA_MANAGER') {
        throw new ForbiddenException(
          'Business Rule Violation (Rule 11): Only the Media Manager may issue or approve equipment checkout.'
        );
      }
    }

    const movement = await this.prisma.equipmentMovement.create({
      data: {
        equipmentId: data.equipmentId,
        projectId: data.projectId || null,
        userId,
        action: data.action,
        notes: data.notes,
      },
    });

    let newAvailability: EquipmentAvailability = EquipmentAvailability.AVAILABLE;
    if (data.action === EquipmentMovementAction.ISSUED || data.action === EquipmentMovementAction.USED) {
      newAvailability = EquipmentAvailability.CHECKED_OUT;
    } else if (data.action === EquipmentMovementAction.RETURNED) {
      newAvailability = EquipmentAvailability.AVAILABLE;
    }

    await this.prisma.equipment.update({
      where: { id: data.equipmentId },
      data: {
        availability: newAvailability,
        currentHolder: data.action === EquipmentMovementAction.RETURNED ? null : data.currentHolder,
      },
    });

    return movement;
  }

  // ─── Equipment Requests Workflow ──────────────────────────────────────────
  async createRequest(data: {
    equipmentId: string;
    projectId: string;
    purpose: string;
    requiredDate: Date | string;
    expectedReturnDate: Date | string;
    remarks?: string;
  }, userId: string) {
    const eqp = await this.findOne(data.equipmentId);
    if (eqp.isArchived) {
      throw new BadRequestException('Cannot request retired/archived equipment.');
    }

    // Damaged equipment shall not be assigned until repaired
    if (eqp.availability === EquipmentAvailability.DAMAGED) {
      throw new BadRequestException('Damaged equipment shall not be assigned until repaired.');
    }

    const project = await this.prisma.shootProject.findUnique({ where: { id: data.projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.prisma.equipmentRequest.create({
      data: {
        equipmentId: data.equipmentId,
        projectId: data.projectId,
        requestedById: userId,
        purpose: data.purpose,
        requiredDate: new Date(data.requiredDate),
        expectedReturnDate: new Date(data.expectedReturnDate),
        remarks: data.remarks,
        status: 'PENDING',
      },
      include: {
        equipment: true,
        project: true,
        requestedBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  }

  async findRequests(userId?: string, isManager = false) {
    const where: any = {};
    if (!isManager && userId) {
      where.requestedById = userId;
    }

    return this.prisma.equipmentRequest.findMany({
      where,
      include: {
        equipment: true,
        project: true,
        requestedBy: { select: { id: true, name: true, email: true, role: true } },
        reviewedBy: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async reviewRequest(id: string, status: 'APPROVED' | 'REJECTED', reviewNotes: string | undefined, reviewerId: string) {
    if (status !== 'APPROVED' && status !== 'REJECTED') {
      throw new BadRequestException('Approval options are strictly APPROVED or REJECTED.');
    }

    const req = await this.prisma.equipmentRequest.findUnique({ where: { id } });
    if (!req) {
      throw new NotFoundException('Equipment request not found');
    }
    if (req.status !== 'PENDING') {
      throw new BadRequestException(`Request has already been ${req.status.toLowerCase()}.`);
    }

    const updated = await this.prisma.equipmentRequest.update({
      where: { id },
      data: {
        status,
        reviewedById: reviewerId,
        reviewNotes,
      },
      include: {
        equipment: true,
        project: true,
        requestedBy: { select: { id: true, name: true, email: true, role: true } },
        reviewedBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (status === 'APPROVED') {
      await this.prisma.equipment.update({
        where: { id: req.equipmentId },
        data: { availability: EquipmentAvailability.RESERVED },
      });
    }

    return updated;
  }

  // Media Manager Issue Equipment after Approval
  async issueEquipment(requestId: string, issuerId: string) {
    const req = await this.prisma.equipmentRequest.findUnique({
      where: { id: requestId },
      include: {
        equipment: true,
        project: true,
        requestedBy: { select: { id: true, name: true, email: true, role: true } },
        reviewedBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (!req) {
      throw new NotFoundException('Equipment request not found');
    }

    if (req.status !== 'APPROVED') {
      throw new BadRequestException(`Cannot issue equipment. Equipment request status is ${req.status}, must be APPROVED by Media Manager first.`);
    }

    if (req.equipment.availability === EquipmentAvailability.DAMAGED) {
      throw new BadRequestException('Damaged equipment shall not be assigned until repaired.');
    }

    const approvedById = req.reviewedById || issuerId;
    const now = new Date();

    // Create Issue Record containing Equipment, Employee, Project, Date, Time, Approved By, Expected Return Date
    const movement = await this.prisma.equipmentMovement.create({
      data: {
        equipmentId: req.equipmentId,
        projectId: req.projectId,
        userId: issuerId,
        employeeId: req.requestedById,
        approvedById: approvedById,
        expectedReturnDate: req.expectedReturnDate,
        action: EquipmentMovementAction.ISSUED,
        notes: `Issued by Media Manager to ${req.requestedBy.name} for project "${req.project.name}". Approved by Media Manager. Expected return: ${req.expectedReturnDate.toISOString().split('T')[0]}.`,
        timestamp: now,
      },
      include: {
        equipment: true,
        project: true,
        user: { select: { id: true, name: true, email: true, role: true } },
        employee: { select: { id: true, name: true, email: true, role: true } },
        approvedBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    // Update request status to CHECKED_OUT
    await this.prisma.equipmentRequest.update({
      where: { id: requestId },
      data: { status: 'CHECKED_OUT' },
    });

    // Update equipment availability to CHECKED_OUT and record current holder
    await this.prisma.equipment.update({
      where: { id: req.equipmentId },
      data: {
        availability: EquipmentAvailability.CHECKED_OUT,
        currentHolder: req.requestedBy.name,
      },
    });

    return {
      message: 'Equipment issued successfully',
      issueRecord: {
        id: movement.id,
        equipment: movement.equipment,
        employee: movement.employee,
        project: movement.project,
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().split(' ')[0],
        approvedBy: movement.approvedBy,
        expectedReturnDate: req.expectedReturnDate,
        timestamp: movement.timestamp,
        notes: movement.notes,
      },
    };
  }

  // Employee Receipt Acknowledgement (Replaces Physical Signature)
  async acknowledgeReceipt(requestId: string, userId: string) {
    const req = await this.prisma.equipmentRequest.findUnique({
      where: { id: requestId },
      include: {
        equipment: true,
        project: true,
        requestedBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (!req) {
      throw new NotFoundException('Equipment request not found');
    }

    if (req.status !== 'CHECKED_OUT') {
      throw new BadRequestException('Equipment receipt can only be acknowledged after equipment has been issued.');
    }

    if (req.isAcknowledged) {
      throw new BadRequestException('Receipt for this equipment has already been acknowledged.');
    }

    const now = new Date();
    const statement = `Digitally acknowledged receipt by ${req.requestedBy.name} on ${now.toISOString().split('T')[0]} at ${now.toTimeString().split(' ')[0]} in lieu of physical signature.`;

    const updated = await this.prisma.equipmentRequest.update({
      where: { id: requestId },
      data: {
        isAcknowledged: true,
        acknowledgedAt: now,
        acknowledgedByName: req.requestedBy.name,
        acknowledgementStatement: statement,
      },
      include: {
        equipment: true,
        project: true,
        requestedBy: { select: { id: true, name: true, email: true, role: true } },
        reviewedBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    return {
      message: 'Equipment receipt acknowledged successfully',
      acknowledgement: {
        employeeName: updated.acknowledgedByName,
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().split(' ')[0],
        statement: updated.acknowledgementStatement,
        request: updated,
      },
    };
  }

  // Equipment Return Inspection Process (Records Return Date, Return Time, Returned By, Condition, Physical Damage, Missing Accessories, Functional Condition, Cleaning Status, Remarks in history)
  async returnInspection(
    equipmentId: string,
    dto: {
      returnedById?: string;
      returnedByName?: string;
      condition: string;
      hasPhysicalDamage?: boolean;
      physicalDamageNotes?: string;
      hasMissingAccessories?: boolean;
      missingAccessoriesNotes?: string;
      functionalCondition?: string;
      cleaningStatus?: string;
      remarks?: string;
    },
    inspectorId: string,
  ) {
    const eqp = await this.findOne(equipmentId);
    if (eqp.isArchived) {
      throw new BadRequestException('Cannot inspect or return retired/archived equipment.');
    }

    const now = new Date();
    const returnDate = now.toISOString().split('T')[0];
    const returnTime = now.toTimeString().split(' ')[0];
    const returnedByName = dto.returnedByName || eqp.currentHolder || 'Employee';

    const hasPhysicalDamage = Boolean(dto.hasPhysicalDamage);
    const hasMissingAccessories = Boolean(dto.hasMissingAccessories);
    const functionalCondition = dto.functionalCondition || 'FULLY_FUNCTIONAL';
    const cleaningStatus = dto.cleaningStatus || 'CLEAN';

    // 1. Create Return Inspection Movement History Record containing: Physical Damage, Missing Accessories, Functional Condition, Cleaning Status
    const movement = await this.prisma.equipmentMovement.create({
      data: {
        equipmentId,
        userId: inspectorId,
        returnedById: dto.returnedById,
        returnedByName: returnedByName,
        condition: dto.condition,
        hasPhysicalDamage,
        physicalDamageNotes: dto.physicalDamageNotes,
        hasMissingAccessories,
        missingAccessoriesNotes: dto.missingAccessoriesNotes,
        functionalCondition,
        cleaningStatus,
        notes: dto.remarks || `Inspected upon return. Condition: ${dto.condition}. Functional: ${functionalCondition}. Cleaning: ${cleaningStatus}.`,
        action: EquipmentMovementAction.RETURNED,
        timestamp: now,
      },
      include: {
        equipment: true,
        user: { select: { id: true, name: true, email: true, role: true } },
        returnedBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    // 2. Determine equipment availability & maintenance status based on 4 inspection checklist items
    let newAvailability = EquipmentAvailability.AVAILABLE;
    let newMaintenanceStatus = eqp.maintenanceStatus;

    if (hasPhysicalDamage || functionalCondition === 'NON_FUNCTIONAL' || dto.condition.toLowerCase().includes('damage')) {
      newAvailability = EquipmentAvailability.DAMAGED;
    } else if (
      cleaningStatus === 'REQUIRES_DEEP_CLEAN' ||
      cleaningStatus === 'NEEDS_CLEANING' ||
      functionalCondition === 'PARTIALLY_FUNCTIONAL' ||
      hasMissingAccessories ||
      dto.condition.toLowerCase().includes('service') ||
      dto.condition.toLowerCase().includes('repair')
    ) {
      newAvailability = EquipmentAvailability.UNDER_MAINTENANCE;
      newMaintenanceStatus = MaintenanceStatus.NEEDS_SERVICE;
    }

    // 3. Update equipment status, condition, and clear current holder
    await this.prisma.equipment.update({
      where: { id: equipmentId },
      data: {
        availability: newAvailability,
        maintenanceStatus: newMaintenanceStatus,
        condition: dto.condition,
        currentHolder: null,
      },
    });

    // 4. Update associated EquipmentRequest to completed status
    await this.prisma.equipmentRequest.updateMany({
      where: { equipmentId, status: 'CHECKED_OUT' },
      data: { status: 'RETURNED' },
    });

    return {
      message: 'Equipment return inspection completed successfully and recorded in history',
      returnRecord: {
        id: movement.id,
        equipment: movement.equipment,
        returnDate,
        returnTime,
        returnedBy: returnedByName,
        condition: dto.condition,
        inspectionChecklist: {
          physicalDamage: {
            hasDamage: hasPhysicalDamage,
            notes: dto.physicalDamageNotes || 'None',
          },
          missingAccessories: {
            hasMissing: hasMissingAccessories,
            notes: dto.missingAccessoriesNotes || 'None',
          },
          functionalCondition,
          cleaningStatus,
        },
        remarks: dto.remarks || '',
        timestamp: movement.timestamp,
        newAvailability,
      },
    };
  }

  // ─── Damage Reports & Repair Tracking ─────────────────────────────────
  async createDamageReport(
    data: {
      equipmentId: string;
      description: string;
      severity: string;
      repairNotes?: string;
    },
    reporterId: string,
  ) {
    const eqp = await this.findOne(data.equipmentId);
    if (eqp.isArchived) {
      throw new BadRequestException('Cannot report damage for retired/archived equipment.');
    }

    const report = await this.prisma.equipmentDamageReport.create({
      data: {
        equipmentId: data.equipmentId,
        reportedById: reporterId,
        description: data.description,
        severity: data.severity.toUpperCase(),
        repairStatus: 'PENDING',
        repairNotes: data.repairNotes,
        date: new Date(),
      },
      include: {
        equipment: true,
        reportedBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    // Damaged equipment shall not be assigned until repaired -> mark availability as DAMAGED
    await this.prisma.equipment.update({
      where: { id: data.equipmentId },
      data: {
        availability: EquipmentAvailability.DAMAGED,
      },
    });

    return report;
  }

  async findDamageReports(equipmentId?: string) {
    const where: any = {};
    if (equipmentId) where.equipmentId = equipmentId;

    return this.prisma.equipmentDamageReport.findMany({
      where,
      include: {
        equipment: true,
        reportedBy: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateRepairStatus(
    reportId: string,
    repairStatus: string,
    repairNotes?: string,
  ) {
    const report = await this.prisma.equipmentDamageReport.findUnique({
      where: { id: reportId },
      include: { equipment: true },
    });

    if (!report) {
      throw new NotFoundException('Damage report not found');
    }

    const upperStatus = repairStatus.toUpperCase();
    const isRepaired = upperStatus === 'REPAIRED';

    const updatedReport = await this.prisma.equipmentDamageReport.update({
      where: { id: reportId },
      data: {
        repairStatus: upperStatus,
        repairNotes: repairNotes || report.repairNotes,
        repairedAt: isRepaired ? new Date() : report.repairedAt,
      },
      include: {
        equipment: true,
        reportedBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    // When repaired, check if all damage reports for this equipment are resolved
    if (isRepaired) {
      const remainingUnrepaired = await this.prisma.equipmentDamageReport.findFirst({
        where: {
          equipmentId: report.equipmentId,
          repairStatus: { not: 'REPAIRED' },
          id: { not: reportId },
        },
      });

      // If no remaining damage reports, restore equipment availability to AVAILABLE
      if (!remainingUnrepaired) {
        await this.prisma.equipment.update({
          where: { id: report.equipmentId },
          data: {
            availability: EquipmentAvailability.AVAILABLE,
          },
        });
      }
    } else if (upperStatus === 'IN_REPAIR' || upperStatus === 'PENDING') {
      await this.prisma.equipment.update({
        where: { id: report.equipmentId },
        data: {
          availability: EquipmentAvailability.DAMAGED,
        },
      });
    }

    return updatedReport;
  }

  async updateMaintenanceStatus(id: string, maintenanceStatus: MaintenanceStatus, notes?: string) {
    const eqp = await this.findOne(id);

    if (eqp.isArchived) {
      throw new BadRequestException('Cannot update maintenance status for retired/archived equipment.');
    }

    let availability: EquipmentAvailability = eqp.availability as EquipmentAvailability;
    if (maintenanceStatus === MaintenanceStatus.UNDER_REPAIR || maintenanceStatus === MaintenanceStatus.NEEDS_SERVICE) {
      availability = EquipmentAvailability.UNDER_MAINTENANCE;
    } else if (maintenanceStatus === MaintenanceStatus.OPERATIONAL) {
      availability = EquipmentAvailability.AVAILABLE;
    }

    return this.prisma.equipment.update({
      where: { id },
      data: {
        maintenanceStatus,
        availability,
        internalNotes: notes ? `${eqp.internalNotes || ''}\n[Maintenance]: ${notes}` : eqp.internalNotes,
      },
    });
  }

  async updateStatus(id: string, availability: EquipmentAvailability, notes?: string) {
    const eqp = await this.findOne(id);
    if (!Object.values(EquipmentAvailability).includes(availability)) {
      throw new BadRequestException(`Invalid equipment status: ${availability}`);
    }

    const updateData: any = {
      availability,
      status: availability,
    };

    if (notes) {
      updateData.internalNotes = eqp.internalNotes ? `${eqp.internalNotes}\n[Status Update]: ${notes}` : notes;
    }

    if (availability === EquipmentAvailability.RETIRED) {
      updateData.isArchived = true;
      updateData.archivedAt = new Date();
      updateData.maintenanceStatus = MaintenanceStatus.DECOMMISSIONED;
    } else if (eqp.isArchived) {
      updateData.isArchived = false;
      updateData.archivedAt = null;
    }

    return this.prisma.equipment.update({
      where: { id },
      data: updateData,
    });
  }
  // ─── Equipment Categories ────────────────────────
  async getCategories() {
    return this.prisma.equipmentCategory.findMany({
      include: { equipments: true },
    });
  }

  async createCategory(name: string, userId: string) {
    // Unique name enforced by DB constraint
    return this.prisma.equipmentCategory.create({
      data: {
        name,
        createdById: userId,
      },
    });
  }

  async getDashboardStats() {
    const activeWhere = { isArchived: false };

    const total = await this.prisma.equipment.count({ where: activeWhere });
    const available = await this.prisma.equipment.count({
      where: { ...activeWhere, availability: EquipmentAvailability.AVAILABLE },
    });
    const reserved = await this.prisma.equipment.count({
      where: { ...activeWhere, availability: EquipmentAvailability.RESERVED },
    });
    const checkedOut = await this.prisma.equipment.count({
      where: {
        ...activeWhere,
        availability: { in: [EquipmentAvailability.CHECKED_OUT, EquipmentAvailability.IN_USE, 'ISSUED'] },
      },
    });
    const underMaintenance = await this.prisma.equipment.count({
      where: {
        ...activeWhere,
        OR: [
          { availability: EquipmentAvailability.UNDER_MAINTENANCE },
          { maintenanceStatus: { in: [MaintenanceStatus.NEEDS_SERVICE, MaintenanceStatus.UNDER_REPAIR] } },
        ],
      },
    });
    const damaged = await this.prisma.equipment.count({
      where: { ...activeWhere, availability: EquipmentAvailability.DAMAGED },
    });

    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 7);
    const recentlyReturned = await this.prisma.equipmentMovement.count({
      where: {
        action: EquipmentMovementAction.RETURNED,
        timestamp: { gte: recentDate },
      },
    });

    return {
      total,
      available,
      reserved,
      checkedOut,
      underMaintenance,
      damaged,
      recentlyReturned,
    };
  }
}
