import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ShootType, Priority } from '../../common/enums';

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  async findAll(clientId?: string, brandId?: string, shootType?: string, status?: string) {
    const where: any = {};
    if (clientId) where.clientId = clientId;
    if (brandId) where.brandId = brandId;
    if (shootType) where.shootType = shootType;
    if (status) where.status = status;

    return this.prisma.mediaCalendarEvent.findMany({
      where,
      include: {
        client: true,
        brand: true,
        product: true,
        shootProjects: true,
      },
      orderBy: { shootDate: 'asc' },
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.mediaCalendarEvent.findUnique({
      where: { id },
      include: { client: true, brand: true, product: true, shootProjects: true },
    });
    if (!event) throw new NotFoundException('Calendar event not found');
    return event;
  }

  async create(data: any) {
    const client = await this.prisma.client.findUnique({ where: { id: data.clientId } });
    if (!client || client.status !== 'ACTIVE') {
      throw new BadRequestException('Calendar event requires an active client.');
    }
    const brand = await this.prisma.brand.findUnique({ where: { id: data.brandId } });
    if (!brand || brand.status !== 'ACTIVE') {
      throw new BadRequestException('Calendar event requires an active brand.');
    }

    return this.prisma.mediaCalendarEvent.create({
      data: {
        title: data.title,
        clientId: data.clientId,
        brandId: data.brandId,
        productId: data.productId || null,
        shootType: data.shootType || ShootType.INDOOR,
        shootDate: new Date(data.shootDate),
        influencerTalent: data.influencerTalent,
        priority: data.priority || Priority.MEDIUM,
        productionNotes: data.productionNotes,
        status: 'SCHEDULED',
      },
      include: { client: true, brand: true, product: true },
    });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.mediaCalendarEvent.update({
      where: { id },
      data: {
        title: data.title,
        shootType: data.shootType,
        shootDate: data.shootDate ? new Date(data.shootDate) : undefined,
        influencerTalent: data.influencerTalent,
        priority: data.priority,
        productionNotes: data.productionNotes,
        status: data.status,
      },
      include: { client: true, brand: true, product: true },
    });
  }

  async cancel(id: string) {
    await this.findOne(id);
    return this.prisma.mediaCalendarEvent.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}
