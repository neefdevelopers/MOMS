import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EquipmentAvailability, MaintenanceStatus, EquipmentMovementAction } from '../../common/enums';

@Injectable()
export class EquipmentService {
  constructor(private prisma: PrismaService) {}

  // ─── Business Rule 1: All equipment belongs to COMPANY ─────────────────────
  // ownedBy is always stamped as 'COMPANY' on every record; never personal.

  async findAll(
    category?: string,
    availability?: EquipmentAvailability,
    includeArchived = false,
    userId?: string,
    role?: string,
  ) {
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
    const autoEqpId = data.equipmentId || `EQ-${(count + 1).toString().padStart(6, '0')}`;

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
        availability: data.status || EquipmentAvailability.AVAILABLE,
        maintenanceStatus: data.maintenanceStatus || MaintenanceStatus.OPERATIONAL,
        storageLocation: data.storageLocation || null,
        internalNotes: data.internalNotes || data.notes || null,

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

    const project = await this.prisma.shootProject.findUnique({ where: { id: data.projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
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

    // Permission-sensitive action: Equipment Issue / Return permanent audit record
    await this.prisma.activityLog.create({
      data: {
        userId,
        action: data.action === EquipmentMovementAction.RETURNED ? 'EQUIPMENT_RETURN' : 'EQUIPMENT_ISSUE',
        entity: 'Equipment',
        entityId: data.equipmentId,
        description: `Equipment ${data.equipmentId} movement: ${data.action}${data.notes ? ` (${data.notes})` : ''}`,
        metadata: JSON.stringify({ equipmentId: data.equipmentId, projectId: data.projectId, action: data.action, currentHolder: data.currentHolder }),
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
    if (!data.equipmentId || !data.projectId || !data.purpose) {
      throw new BadRequestException('Equipment, project, and purpose are required.');
    }

    const reqDate = new Date(data.requiredDate);
    const retDate = new Date(data.expectedReturnDate);
    if (isNaN(reqDate.getTime()) || isNaN(retDate.getTime())) {
      throw new BadRequestException('Invalid required or expected return dates.');
    }

    if (retDate < reqDate) {
      throw new BadRequestException('Expected return date cannot be earlier than required date.');
    }

    const eqp = await this.findOne(data.equipmentId);
    if (!eqp) throw new NotFoundException('Equipment not found');

    if (eqp.isArchived) {
      throw new BadRequestException('Cannot request retired/archived equipment.');
    }

    if (eqp.availability !== EquipmentAvailability.AVAILABLE) {
      throw new BadRequestException(`Equipment "${eqp.name}" is currently ${eqp.availability} and cannot be requested.`);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    const project = await this.prisma.shootProject.findUnique({
      where: { id: data.projectId },
      include: {
        assignedTeam: true,
        tasks: { include: { assignedEmployees: true } },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Project Relationship Validation: Staff can only request equipment for projects they are assigned to
    if (user.role === 'STAFF') {
      const proj = project as any;
      const isCreator = proj.createdById === userId;
      const isTeamMember = Array.isArray(proj.assignedTeam) && proj.assignedTeam.some((t: any) => t.userId === userId);
      const isTaskAssigned = Array.isArray(proj.tasks) && proj.tasks.some((t: any) =>
        Array.isArray(t.assignedEmployees) && t.assignedEmployees.some((e: any) => e.employeeId === userId)
      );

      if (!isCreator && !isTeamMember && !isTaskAssigned && (proj.assignedTeam?.length > 0 || proj.tasks?.length > 0)) {
        throw new ForbiddenException('You can only request equipment for projects you are assigned to.');
      }
    }

    const request = await this.prisma.equipmentRequest.create({
      data: {
        equipmentId: data.equipmentId,
        projectId: data.projectId,
        requestedById: userId,
        purpose: data.purpose,
        requiredDate: reqDate,
        expectedReturnDate: retDate,
        remarks: data.remarks,
        status: 'PENDING',
      },
      include: {
        equipment: true,
        project: true,
        requestedBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    // Immediately update equipment availability to RESERVED so it is held during approval
    await this.prisma.equipment.update({
      where: { id: data.equipmentId },
      data: {
        availability: EquipmentAvailability.RESERVED,
        status: 'RESERVED',
        currentHolder: project.name,
      },
    });

    // Send notification to Media Managers about new Equipment Request
    try {
      const mediaManagers = await this.prisma.user.findMany({
        where: { role: { in: ['MEDIA_MANAGER', 'ADMINISTRATOR', 'ADMIN'] } },
      });
      for (const mm of mediaManagers) {
        await this.prisma.notification.create({
          data: {
            userId: mm.id,
            title: 'Equipment Request Submitted',
            message: `${user.name} requested "${eqp.name}" for project "${project.name}".`,
            type: 'SYSTEM',
            linkUrl: `/equipment?requestId=${request.id}`,
            entityId: request.id,
            equipmentId: eqp.id,
          },
        }).catch(() => null);
      }
    } catch (e) {
      console.error('Failed to notify Media Manager of equipment request:', e);
    }

    return request;
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

    const req = await this.prisma.equipmentRequest.findUnique({
      where: { id },
      include: { equipment: true, project: true },
    });
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
        data: {
          availability: EquipmentAvailability.RESERVED,
          status: 'RESERVED',
        },
      });

      // Send notification to Staff user: Request Approved
      await this.prisma.notification.create({
        data: {
          userId: req.requestedById,
          title: 'Equipment Request Approved',
          message: `Your equipment request for "${req.equipment?.name}" was approved by Media Manager.`,
          type: 'SYSTEM',
          linkUrl: '/equipment/my',
          entityId: req.id,
          equipmentId: req.equipmentId,
        },
      }).catch(() => null);
    } else if (status === 'REJECTED') {
      await this.prisma.equipment.update({
        where: { id: req.equipmentId },
        data: {
          availability: EquipmentAvailability.AVAILABLE,
          status: 'AVAILABLE',
          currentHolder: null,
        },
      });

      // Send notification to Staff user: Request Rejected
      await this.prisma.notification.create({
        data: {
          userId: req.requestedById,
          title: 'Equipment Request Rejected',
          message: `Your equipment request for "${req.equipment?.name}" was rejected.${reviewNotes ? ` Reason: ${reviewNotes}` : ''}`,
          type: 'SYSTEM',
          linkUrl: '/equipment/my',
          entityId: req.id,
          equipmentId: req.equipmentId,
        },
      }).catch(() => null);
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

  // ─── Direct Equipment Allocation / Issue (No Request Approval Required) ───
  async allocateDirectly(
    data: {
      equipmentId: string;
      employeeId: string;
      projectId?: string;
      startDate?: Date | string;
      expectedReturnDate: Date | string;
      purpose?: string;
      remarks?: string;
      accessoriesIncluded?: string;
      condition?: string;
    },
    allocatorId: string,
  ) {
    const eqp = await this.findOne(data.equipmentId);
    if (!eqp) throw new NotFoundException('Equipment not found');

    if (eqp.isArchived) {
      throw new BadRequestException('Cannot allocate retired/archived equipment.');
    }

    if (eqp.availability !== EquipmentAvailability.AVAILABLE && eqp.availability !== EquipmentAvailability.RESERVED) {
      if (eqp.availability === EquipmentAvailability.CHECKED_OUT || eqp.availability === EquipmentAvailability.IN_USE) {
        throw new BadRequestException('Equipment is currently checked out.');
      }
      if (eqp.availability === EquipmentAvailability.UNDER_MAINTENANCE) {
        throw new BadRequestException('Equipment is under maintenance.');
      }
      if (eqp.availability === EquipmentAvailability.DAMAGED) {
        throw new BadRequestException('Equipment is damaged and cannot be allocated.');
      }
      throw new BadRequestException(`Equipment is currently ${eqp.availability} and cannot be allocated.`);
    }

    const employee = await this.prisma.user.findUnique({ where: { id: data.employeeId } });
    if (!employee) {
      throw new NotFoundException('Employee recipient not found.');
    }

    let project: any = null;
    if (data.projectId) {
      project = await this.prisma.shootProject.findUnique({ where: { id: data.projectId } });
    }

    const returnDate = new Date(data.expectedReturnDate);
    const startDate = data.startDate ? new Date(data.startDate) : new Date();

    // 1. Immediately update equipment status to CHECKED_OUT
    await this.prisma.equipment.update({
      where: { id: data.equipmentId },
      data: {
        availability: EquipmentAvailability.CHECKED_OUT,
        status: 'CHECKED_OUT',
        currentHolder: employee.name,
      },
    });

    // 2. Create Handover Movement record
    const movement = await this.prisma.equipmentMovement.create({
      data: {
        equipmentId: data.equipmentId,
        projectId: data.projectId || null,
        userId: allocatorId,
        employeeId: data.employeeId,
        approvedById: allocatorId,
        expectedReturnDate: returnDate,
        action: EquipmentMovementAction.ISSUED,
        notes: `Direct Allocation: Issued by allocator ${allocatorId} to ${employee.name}${project ? ` for project "${project.name}"` : ''}. Purpose: ${data.purpose || 'Production allocation'}. Remarks: ${data.remarks || 'None'}. Condition: ${data.condition || 'Good'}. Accessories: ${data.accessoriesIncluded || 'Standard'}.`,
      },
      include: {
        equipment: true,
        project: true,
        user: { select: { id: true, name: true, email: true } },
        employee: { select: { id: true, name: true, email: true } },
      },
    });

    // 3. Create active EquipmentReservation record so it is tracked on project
    if (data.projectId) {
      await this.prisma.equipmentReservation.create({
        data: {
          projectId: data.projectId,
          equipmentId: data.equipmentId,
          startDate: startDate,
          endDate: returnDate,
          status: 'CHECKED_OUT',
        },
      }).catch(() => null);
    }

    return {
      message: 'Equipment allocated and handover generated successfully.',
      movement,
      equipment: await this.findOne(data.equipmentId),
    };
  }
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
    const lost = await this.prisma.equipment.count({
      where: { ...activeWhere, availability: 'LOST' },
    });

    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 7);
    const recentlyReturned = await this.prisma.equipmentMovement.count({
      where: {
        action: EquipmentMovementAction.RETURNED,
        timestamp: { gte: recentDate },
      },
    });

    const pendingRequests = await this.prisma.equipmentRequest.count({
      where: { status: 'PENDING' },
    });

    const pendingApprovals = await this.prisma.equipmentRequest.count({
      where: { status: 'PENDING' },
    });

    const now = new Date();
    const overdueReturns = await this.prisma.equipmentRequest.count({
      where: {
        status: { in: ['CHECKED_OUT', 'IN_USE'] },
        expectedReturnDate: { lt: now },
      },
    });

    const upcomingReservations = await this.prisma.equipmentReservation.count({
      where: {
        startDate: { gte: now },
        status: 'RESERVED',
      },
    });

    return {
      total,
      available,
      reserved,
      checkedOut,
      underMaintenance,
      damaged,
      lost,
      recentlyReturned,
      pendingRequests,
      pendingApprovals,
      overdueReturns,
      upcomingReservations,
    };
  }

  // ─── Availability & Conflict Check ─────────────────────────────────────
  async checkAvailability(dto: {
    equipmentIds: string[];
    startDate: string | Date;
    endDate: string | Date;
    projectId?: string;
  }) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    const conflicts: any[] = [];
    const availableItems: any[] = [];

    for (const eqId of dto.equipmentIds) {
      const eq = await this.prisma.equipment.findUnique({
        where: { id: eqId },
      });

      if (!eq) {
        conflicts.push({ equipmentId: eqId, reason: 'Equipment not found' });
        continue;
      }

      if (eq.isArchived) {
        conflicts.push({ equipmentId: eqId, equipmentName: eq.name, reason: 'Equipment is retired/archived' });
        continue;
      }

      if (eq.availability === EquipmentAvailability.DAMAGED) {
        conflicts.push({ equipmentId: eqId, equipmentName: eq.name, reason: 'Equipment is currently DAMAGED and unserviceable' });
        continue;
      }

      if (eq.availability === EquipmentAvailability.UNDER_MAINTENANCE || eq.availability === 'MAINTENANCE') {
        conflicts.push({ equipmentId: eqId, equipmentName: eq.name, reason: 'Equipment is UNDER MAINTENANCE' });
        continue;
      }

      if (eq.availability === 'LOST') {
        conflicts.push({ equipmentId: eqId, equipmentName: eq.name, reason: 'Equipment is marked as LOST' });
        continue;
      }

      // Check conflicting reservations
      const reservationConflict = await this.prisma.equipmentReservation.findFirst({
        where: {
          equipmentId: eqId,
          status: 'RESERVED',
          projectId: dto.projectId ? { not: dto.projectId } : undefined,
          OR: [
            { startDate: { lte: end }, endDate: { gte: start } },
          ],
        },
        include: { project: { select: { id: true, name: true, projectId: true } } },
      });

      if (reservationConflict) {
        conflicts.push({
          equipmentId: eqId,
          equipmentName: eq.name,
          reason: `Reserved for Project ${reservationConflict.project?.name || reservationConflict.projectId}`,
          conflictingProject: reservationConflict.project,
          startDate: reservationConflict.startDate,
          endDate: reservationConflict.endDate,
        });
        continue;
      }

      // Check active checkouts / requests
      const activeRequestConflict = await this.prisma.equipmentRequest.findFirst({
        where: {
          equipmentId: eqId,
          status: { in: ['CHECKED_OUT', 'IN_USE', 'APPROVED'] },
          projectId: dto.projectId ? { not: dto.projectId } : undefined,
          OR: [
            { requiredDate: { lte: end }, expectedReturnDate: { gte: start } },
          ],
        },
        include: { project: { select: { id: true, name: true, projectId: true } } },
      });

      if (activeRequestConflict) {
        conflicts.push({
          equipmentId: eqId,
          equipmentName: eq.name,
          reason: `Currently Checked Out / Approved for Project ${activeRequestConflict.project?.name || activeRequestConflict.projectId}`,
          conflictingProject: activeRequestConflict.project,
          requiredDate: activeRequestConflict.requiredDate,
          expectedReturnDate: activeRequestConflict.expectedReturnDate,
        });
        continue;
      }

      availableItems.push(eq);
    }

    // Find suggested alternatives if conflicts exist
    let alternatives: any[] = [];
    if (conflicts.length > 0) {
      const conflictCategories = conflicts.map((c) => c.equipmentName).filter(Boolean);
      alternatives = await this.prisma.equipment.findMany({
        where: {
          isArchived: false,
          availability: EquipmentAvailability.AVAILABLE,
          id: { notIn: dto.equipmentIds },
        },
        take: 5,
      });
    }

    return {
      isAvailable: conflicts.length === 0,
      availableCount: availableItems.length,
      conflictCount: conflicts.length,
      conflicts,
      availableItems,
      alternatives,
    };
  }

  // ─── Equipment Preparation Stage ─────────────────────────────────────────
  async prepareEquipment(
    requestId: string,
    dto: { accessoriesChecked?: string; preparationNotes?: string },
    preparedById: string,
  ) {
    const req = await this.prisma.equipmentRequest.findUnique({
      where: { id: requestId },
      include: { equipment: true, project: true },
    });

    if (!req) throw new NotFoundException('Equipment request not found');
    if (req.status !== 'APPROVED') {
      throw new BadRequestException('Only approved equipment requests can be prepared for checkout.');
    }

    const updated = await this.prisma.equipmentRequest.update({
      where: { id: requestId },
      data: {
        isPrepared: true,
        preparedAt: new Date(),
        preparedById,
        preparationNotes: dto.preparationNotes || 'Accessories & condition verified.',
        accessoriesChecked: dto.accessoriesChecked || 'Body, Lens, Battery, Charger, Case verified.',
      },
      include: { equipment: true, project: true },
    });

    // Log preparation movement
    await this.prisma.equipmentMovement.create({
      data: {
        equipmentId: req.equipmentId,
        projectId: req.projectId,
        userId: preparedById,
        action: 'PREPARED',
        notes: `Prepared for checkout. Accessories: ${dto.accessoriesChecked || 'Verified'}. Notes: ${dto.preparationNotes || 'Ready'}`,
      },
    });

    return updated;
  }

  // ─── Equipment Issue / Checkout & Handover Authorization ─────────────────
  async issueEquipmentWithHandover(
    requestId: string,
    issuerId: string,
    dto?: { condition?: string; accessoriesIncluded?: string; remarks?: string },
  ) {
    const req = await this.prisma.equipmentRequest.findUnique({
      where: { id: requestId },
      include: { equipment: true, project: true, requestedBy: true },
    });

    if (!req) throw new NotFoundException('Equipment request not found');
    if (req.status !== 'APPROVED' && req.status !== 'CHECKED_OUT') {
      throw new BadRequestException('Request must be APPROVED before equipment can be issued.');
    }

    const count = await this.prisma.equipmentHandoverAuthorization.count();
    const autoAuthCode = `HND-${(count + 1).toString().padStart(6, '0')}`;

    // 1. Create permanent Handover Authorization Record
    const handover = await this.prisma.equipmentHandoverAuthorization.create({
      data: {
        authorizationId: autoAuthCode,
        requestId: req.id,
        equipmentId: req.equipmentId,
        employeeId: req.requestedById,
        issuedById: issuerId,
        projectId: req.projectId,
        condition: dto?.condition || req.equipment.condition || 'Good',
        accessoriesIncluded: dto?.accessoriesIncluded || req.accessoriesChecked || 'Body, Battery, Charger, Case',
        remarks: dto?.remarks || req.remarks || 'Authorized for physical shoot.',
      },
      include: {
        equipment: true,
        employee: { select: { id: true, name: true, email: true, role: true } },
        issuedBy: { select: { id: true, name: true, email: true, role: true } },
        project: true,
      },
    });

    // 2. Update Request & Equipment status to CHECKED_OUT
    await this.prisma.equipmentRequest.update({
      where: { id: requestId },
      data: {
        status: 'CHECKED_OUT',
        handoverAuthorizationId: handover.id,
      },
    });

    await this.prisma.equipment.update({
      where: { id: req.equipmentId },
      data: {
        availability: EquipmentAvailability.CHECKED_OUT,
        status: EquipmentAvailability.CHECKED_OUT,
        currentHolder: req.requestedBy?.name || 'Staff',
      },
    });

    // 3. Log movement
    await this.prisma.equipmentMovement.create({
      data: {
        equipmentId: req.equipmentId,
        projectId: req.projectId,
        userId: issuerId,
        employeeId: req.requestedById,
        approvedById: issuerId,
        expectedReturnDate: req.expectedReturnDate,
        action: EquipmentMovementAction.ISSUED,
        notes: `Issued to ${req.requestedBy?.name}. Handover Auth: ${autoAuthCode}`,
      },
    });

    // 4. Send notification for employee acknowledgement
    await this.prisma.notification.create({
      data: {
        userId: req.requestedById,
        title: 'Equipment Issued — Acknowledgement Required',
        message: `Equipment ${req.equipment.name} (${req.equipment.equipmentId}) has been issued to you. Please acknowledge receipt.`,
        type: 'SYSTEM',
        linkUrl: `/equipment`,
        entityId: req.id,
        entityCode: autoAuthCode,
        equipmentId: req.equipmentId,
      },
    });

    return {
      message: 'Equipment issued successfully and Handover Authorization generated.',
      handoverAuthorization: handover,
    };
  }

  // ─── Lost Equipment Reporting ───────────────────────────────────────────
  async reportLostEquipment(
    equipmentId: string,
    dto: {
      lastResponsibleEmployeeId?: string;
      lastKnownLocation?: string;
      lastKnownDate?: Date | string;
      description: string;
    },
    reporterId: string,
  ) {
    const eqp = await this.findOne(equipmentId);
    if (eqp.isArchived) {
      throw new BadRequestException('Cannot report lost for retired/archived equipment.');
    }

    const updated = await this.prisma.equipment.update({
      where: { id: equipmentId },
      data: {
        availability: 'LOST',
        status: 'LOST',
        lastResponsibleEmployeeId: dto.lastResponsibleEmployeeId || null,
        lastKnownLocation: dto.lastKnownLocation || null,
        lastKnownDate: dto.lastKnownDate ? new Date(dto.lastKnownDate) : new Date(),
        lostNotes: dto.description,
      },
    });

    // Log permanent movement timeline event
    await this.prisma.equipmentMovement.create({
      data: {
        equipmentId,
        userId: reporterId,
        employeeId: dto.lastResponsibleEmployeeId,
        action: 'LOST',
        notes: `Marked as LOST. Location: ${dto.lastKnownLocation || 'Unknown'}. Notes: ${dto.description}`,
      },
    });

    return updated;
  }

  // ─── Maintenance Record Management ─────────────────────────────────────
  async createMaintenanceRecord(
    dto: {
      equipmentId: string;
      maintenanceType: string;
      performedBy: string;
      cost?: number;
      notes?: string;
      scheduledDate?: Date | string;
    },
    userId: string,
  ) {
    const eqp = await this.findOne(dto.equipmentId);
    if (eqp.isArchived) throw new BadRequestException('Cannot add maintenance for retired equipment.');

    const count = await this.prisma.equipmentMaintenanceRecord.count();
    const autoMntCode = `MNT-${(count + 1).toString().padStart(6, '0')}`;

    const record = await this.prisma.equipmentMaintenanceRecord.create({
      data: {
        maintenanceId: autoMntCode,
        equipmentId: dto.equipmentId,
        maintenanceType: dto.maintenanceType.toUpperCase(),
        performedBy: dto.performedBy,
        cost: dto.cost ? parseFloat(dto.cost.toString()) : null,
        notes: dto.notes,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : new Date(),
        status: 'IN_PROGRESS',
      },
      include: { equipment: true },
    });

    // Mark equipment as UNDER_MAINTENANCE
    await this.prisma.equipment.update({
      where: { id: dto.equipmentId },
      data: {
        availability: EquipmentAvailability.UNDER_MAINTENANCE,
        status: EquipmentAvailability.UNDER_MAINTENANCE,
        maintenanceStatus: MaintenanceStatus.UNDER_REPAIR,
      },
    });

    // Log movement
    await this.prisma.equipmentMovement.create({
      data: {
        equipmentId: dto.equipmentId,
        userId,
        action: 'MAINTENANCE',
        notes: `Maintenance ${autoMntCode} started: ${dto.maintenanceType}. Vendor/Tech: ${dto.performedBy}`,
      },
    });

    return record;
  }

  async clearMaintenanceRecord(
    recordId: string,
    notes: string | undefined,
    clearedById: string,
  ) {
    const record = await this.prisma.equipmentMaintenanceRecord.findUnique({
      where: { id: recordId },
      include: { equipment: true },
    });

    if (!record) throw new NotFoundException('Maintenance record not found');

    const updated = await this.prisma.equipmentMaintenanceRecord.update({
      where: { id: recordId },
      data: {
        status: 'COMPLETED',
        completedDate: new Date(),
        clearedById,
        clearedAt: new Date(),
        notes: notes ? `${record.notes || ''}\n[Clearance]: ${notes}` : record.notes,
      },
      include: { equipment: true, clearedBy: { select: { id: true, name: true, email: true, role: true } } },
    });

    // Check if equipment has any other active maintenance records
    const otherActiveMnt = await this.prisma.equipmentMaintenanceRecord.findFirst({
      where: {
        equipmentId: record.equipmentId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        id: { not: recordId },
      },
    });

    if (!otherActiveMnt) {
      await this.prisma.equipment.update({
        where: { id: record.equipmentId },
        data: {
          availability: EquipmentAvailability.AVAILABLE,
          status: EquipmentAvailability.AVAILABLE,
          maintenanceStatus: MaintenanceStatus.OPERATIONAL,
        },
      });
    }

    // Log movement clearance
    await this.prisma.equipmentMovement.create({
      data: {
        equipmentId: record.equipmentId,
        userId: clearedById,
        action: 'INSPECTED',
        notes: `Maintenance ${record.maintenanceId} completed & cleared for operational deployment.`,
      },
    });

    return updated;
  }

  async getMaintenanceRecords(equipmentId?: string) {
    const where: any = {};
    if (equipmentId) where.equipmentId = equipmentId;

    return this.prisma.equipmentMaintenanceRecord.findMany({
      where,
      include: {
        equipment: true,
        clearedBy: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Permanent Audit Movement Timeline ────────────────────────────────────
  async getEquipmentTimeline(equipmentId: string) {
    return this.prisma.equipmentMovement.findMany({
      where: { equipmentId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        employee: { select: { id: true, name: true, email: true, role: true } },
        approvedBy: { select: { id: true, name: true, email: true, role: true } },
        returnedBy: { select: { id: true, name: true, email: true, role: true } },
        project: { select: { id: true, name: true, projectId: true } },
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  // ─── Equipment Reports ────────────────────────────────────────────────────
  async getEquipmentReports() {
    const totalCount = await this.prisma.equipment.count({ where: { isArchived: false } });
    const availableCount = await this.prisma.equipment.count({ where: { isArchived: false, availability: EquipmentAvailability.AVAILABLE } });
    const checkedOutCount = await this.prisma.equipment.count({ where: { isArchived: false, availability: { in: [EquipmentAvailability.CHECKED_OUT, EquipmentAvailability.IN_USE] } } });
    const maintenanceCount = await this.prisma.equipment.count({ where: { isArchived: false, availability: EquipmentAvailability.UNDER_MAINTENANCE } });
    const damagedCount = await this.prisma.equipment.count({ where: { isArchived: false, availability: EquipmentAvailability.DAMAGED } });
    const lostCount = await this.prisma.equipment.count({ where: { isArchived: false, availability: 'LOST' } });

    const utilizationRate = totalCount > 0 ? Math.round((checkedOutCount / totalCount) * 100) : 0;
    const availabilityRate = totalCount > 0 ? Math.round((availableCount / totalCount) * 100) : 0;

    const recentMovements = await this.prisma.equipmentMovement.findMany({
      take: 20,
      include: {
        equipment: true,
        user: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, projectId: true } },
      },
      orderBy: { timestamp: 'desc' },
    });

    const activeCheckouts = await this.prisma.equipmentRequest.findMany({
      where: { status: { in: ['CHECKED_OUT', 'IN_USE'] } },
      include: {
        equipment: true,
        requestedBy: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true, projectId: true } },
      },
      orderBy: { expectedReturnDate: 'asc' },
    });

    return {
      summary: {
        totalCount,
        availableCount,
        checkedOutCount,
        maintenanceCount,
        damagedCount,
        lostCount,
        utilizationRate,
        availabilityRate,
      },
      recentMovements,
      activeCheckouts,
    };
  }

  // ─── Technical Manager Global Monitoring ──────────────────────────────────
  async getMonitoringData() {
    const items = await this.prisma.equipment.findMany({
      include: {
        reservations: {
          where: { status: 'RESERVED' },
          include: {
            project: { select: { id: true, name: true, projectId: true } },
            reservedBy: { select: { id: true, name: true } },
          },
          take: 1,
        },
        requests: {
          where: { status: { in: ['CHECKED_OUT', 'IN_USE', 'APPROVED'] } },
          include: {
            project: { select: { id: true, name: true, projectId: true } },
            requestedBy: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        movements: {
          take: 1,
          orderBy: { timestamp: 'desc' },
          include: {
            user: { select: { id: true, name: true } },
            employee: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { equipmentId: 'asc' },
    });

    return items.map((eq) => {
      const activeReq = eq.requests[0];
      const activeRes = eq.reservations[0];
      const lastMovement = eq.movements[0];

      return {
        id: eq.id,
        equipmentId: eq.equipmentId,
        name: eq.name,
        category: eq.category,
        brand: eq.brand,
        model: eq.model,
        serialNumber: eq.serialNumber,
        currentStatus: eq.availability,
        storageLocation: eq.storageLocation || 'Studio Storage Bay',
        currentEmployee: activeReq?.requestedBy?.name || lastMovement?.employee?.name || eq.currentHolder || 'Unassigned',
        assignedProject: activeReq?.project?.name || activeRes?.project?.name || 'N/A',
        checkoutDate: activeReq?.requiredDate || lastMovement?.timestamp || null,
        expectedReturnDate: activeReq?.expectedReturnDate || activeRes?.endDate || null,
        condition: eq.condition,
        maintenanceStatus: eq.maintenanceStatus,
        lastInspection: lastMovement?.timestamp || eq.updatedAt,
        lastUpdated: eq.updatedAt,
        isArchived: eq.isArchived,
      };
    });
  }

  // ─── Staff Personal Equipment ─────────────────────────────────────────────
  async getMyEquipment(userId: string) {
    const myRequests = await this.prisma.equipmentRequest.findMany({
      where: { requestedById: userId },
      include: {
        equipment: true,
        project: { select: { id: true, name: true, projectId: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const myHandovers = await this.prisma.equipmentHandoverAuthorization.findMany({
      where: { employeeId: userId },
      include: {
        equipment: true,
        project: { select: { id: true, name: true } },
        issuedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const myMovements = await this.prisma.equipmentMovement.findMany({
      where: { employeeId: userId },
      include: {
        equipment: true,
        project: { select: { id: true, name: true } },
      },
      orderBy: { timestamp: 'desc' },
    });

    return {
      requests: myRequests,
      handovers: myHandovers,
      movements: myMovements,
    };
  }

  // ─── Update Master Equipment Record — Media Manager & Admin ───────────────
  async update(id: string, data: any) {
    const existing = await this.findOne(id);
    const updated = await this.prisma.equipment.update({
      where: { id: existing.id },
      data: {
        name: data.name !== undefined ? data.name : existing.name,
        category: data.category !== undefined ? data.category : existing.category,
        brand: data.brand !== undefined ? data.brand : existing.brand,
        model: data.model !== undefined ? data.model : existing.model,
        serialNumber: data.serialNumber !== undefined ? data.serialNumber : existing.serialNumber,
        condition: data.condition !== undefined ? data.condition : existing.condition,
        storageLocation: data.storageLocation !== undefined ? data.storageLocation : existing.storageLocation,
        internalNotes: data.internalNotes !== undefined ? data.internalNotes : (data.notes !== undefined ? data.notes : existing.internalNotes),
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : existing.purchaseDate,
        purchaseCost: data.purchaseCost !== undefined ? parseFloat(data.purchaseCost) : existing.purchaseCost,
        purchaseRef: data.purchaseRef !== undefined ? data.purchaseRef : existing.purchaseRef,
      },
    });

    return updated;
  }
}
