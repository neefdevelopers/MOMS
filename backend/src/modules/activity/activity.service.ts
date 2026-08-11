import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  async findAll(entity?: string, userId?: string) {
    const where: any = {};
    if (entity) where.entity = entity;
    if (userId) where.userId = userId;

    return this.prisma.activityLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
  }
}
