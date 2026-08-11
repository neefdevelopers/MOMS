import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EquipmentAvailability, MaintenanceStatus, EquipmentMovementAction } from '../../common/enums';

@Injectable()
export class EquipmentService {
  constructor(private prisma: PrismaService) {}

  async findAll(category?: string, availability?: EquipmentAvailability) {
    const where: any = {};
    if (category) where.category = category;
    if (availability) where.availability = availability;

    return this.prisma.equipment.findMany({
      where,
      include: {
        reservations: { include: { project: true } },
        movements: { include: { user: true, project: true }, orderBy: { timestamp: 'desc' } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.equipment.findUnique({
      where: { id },
      include: {
        reservations: { include: { project: true } },
        movements: { include: { user: true, project: true }, orderBy: { timestamp: 'desc' } },
      },
    });
    if (!item) throw new NotFoundException('Equipment not found');
    return item;
  }

  async create(data: any) {
    const count = await this.prisma.equipment.count();
    const autoEqpId = `EQP-${(count + 1).toString().padStart(6, '0')}`;

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
        notes: data.notes,
      },
    });
  }

  async reserve(data: { equipmentId: string; projectId: string; startDate: Date; endDate: Date }) {
    const eqp = await this.findOne(data.equipmentId);
    if (eqp.availability === EquipmentAvailability.MAINTENANCE) {
      throw new BadRequestException('Equipment is currently under maintenance and cannot be reserved.');
    }

    const res = await this.prisma.equipmentReservation.create({
      data: {
        equipmentId: data.equipmentId,
        projectId: data.projectId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        status: 'RESERVED',
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
  ) {
    await this.findOne(data.equipmentId);

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
      newAvailability = EquipmentAvailability.ISSUED;
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

  async updateMaintenanceStatus(id: string, maintenanceStatus: MaintenanceStatus, notes?: string) {
    const eqp = await this.findOne(id);

    let availability: EquipmentAvailability = eqp.availability as EquipmentAvailability;
    if (maintenanceStatus === MaintenanceStatus.UNDER_REPAIR || maintenanceStatus === MaintenanceStatus.NEEDS_SERVICE) {
      availability = EquipmentAvailability.MAINTENANCE;
    } else if (maintenanceStatus === MaintenanceStatus.OPERATIONAL) {
      availability = EquipmentAvailability.AVAILABLE;
    }

    return this.prisma.equipment.update({
      where: { id },
      data: {
        maintenanceStatus,
        availability,
        notes: notes ? `${eqp.notes || ''}\n[Maintenance]: ${notes}` : eqp.notes,
      },
    });
  }
}
