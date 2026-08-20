import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    entity?: string,
    userId?: string,
    action?: string,
    startDate?: string,
    endDate?: string,
    search?: string,
    limit: number = 200,
  ) {
    const where: any = {};
    if (entity && entity !== 'ALL') where.entity = entity;
    if (userId && userId !== 'ALL') where.userId = userId;
    if (action && action !== 'ALL') where.action = action;

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    if (search && search.trim()) {
      where.OR = [
        { action: { contains: search } },
        { entity: { contains: search } },
        { metadata: { contains: search } },
      ];
    }

    return this.prisma.activityLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }
}
