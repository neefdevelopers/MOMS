import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ToggleFavoriteDto {
  entityType: 'PROJECT' | 'SCRIPT' | 'GRAPHIC_REQUIREMENT' | 'TASK' | 'REPORT';
  entityId: string;
  title: string;
  code?: string;
  url: string;
  metadata?: Record<string, any> | string;
}

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async getUserFavorites(userId: string, entityType?: string) {
    const where: any = { userId };
    if (entityType && entityType !== 'ALL') {
      where.entityType = entityType;
    }

    return this.prisma.favorite.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async isFavorite(userId: string, entityType: string, entityId: string): Promise<boolean> {
    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_entityType_entityId: {
          userId,
          entityType,
          entityId,
        },
      },
    });
    return !!existing;
  }

  async toggleFavorite(userId: string, dto: ToggleFavoriteDto) {
    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_entityType_entityId: {
          userId,
          entityType: dto.entityType,
          entityId: dto.entityId,
        },
      },
    });

    if (existing) {
      await this.prisma.favorite.delete({
        where: { id: existing.id },
      });
      return { favorited: false, favorite: null, message: 'Removed from favorites' };
    }

    const metadataStr =
      typeof dto.metadata === 'object' ? JSON.stringify(dto.metadata) : dto.metadata || null;

    const created = await this.prisma.favorite.create({
      data: {
        userId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        title: dto.title,
        code: dto.code || null,
        url: dto.url,
        metadata: metadataStr,
      },
    });

    return { favorited: true, favorite: created, message: 'Added to favorites' };
  }

  async removeFavorite(userId: string, id: string) {
    const existing = await this.prisma.favorite.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundException('Favorite not found');
    }

    await this.prisma.favorite.delete({
      where: { id },
    });
    return { success: true, message: 'Favorite deleted' };
  }
}
