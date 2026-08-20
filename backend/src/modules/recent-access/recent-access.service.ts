import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface RecordRecentAccessDto {
  entityType: 'PROJECT' | 'SCRIPT' | 'REPORT' | 'EQUIPMENT' | 'GRAPHIC_REQUIREMENT' | 'TASK';
  entityId: string;
  title: string;
  code?: string;
  url: string;
  metadata?: Record<string, any> | string;
}

@Injectable()
export class RecentAccessService {
  constructor(private prisma: PrismaService) {}

  async getUserRecentAccess(userId: string, limit = 15, entityType?: string) {
    const where: any = { userId };
    if (entityType && entityType !== 'ALL') {
      where.entityType = entityType;
    }

    return this.prisma.recentAccess.findMany({
      where,
      orderBy: { accessedAt: 'desc' },
      take: limit,
    });
  }

  async recordAccess(userId: string, dto: RecordRecentAccessDto) {
    const metadataStr =
      typeof dto.metadata === 'object' ? JSON.stringify(dto.metadata) : dto.metadata || null;

    return this.prisma.recentAccess.upsert({
      where: {
        userId_entityType_entityId: {
          userId,
          entityType: dto.entityType,
          entityId: dto.entityId,
        },
      },
      update: {
        title: dto.title,
        code: dto.code || null,
        url: dto.url,
        metadata: metadataStr,
        accessedAt: new Date(),
      },
      create: {
        userId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        title: dto.title,
        code: dto.code || null,
        url: dto.url,
        metadata: metadataStr,
        accessedAt: new Date(),
      },
    });
  }

  async clearUserHistory(userId: string, entityType?: string) {
    const where: any = { userId };
    if (entityType && entityType !== 'ALL') {
      where.entityType = entityType;
    }

    return this.prisma.recentAccess.deleteMany({
      where,
    });
  }
}
