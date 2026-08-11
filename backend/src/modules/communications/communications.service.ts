import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CommunicationType } from '../../common/enums';

@Injectable()
export class CommunicationsService {
  constructor(private prisma: PrismaService) {}

  async findByEntity(entityType: string, entityId: string) {
    return this.prisma.communication.findMany({
      where: { entityType, entityId },
      include: { sender: { select: { id: true, name: true, role: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(data: { entityType: string; entityId: string; projectId?: string; type: CommunicationType; content: string }, senderId: string) {
    return this.prisma.communication.create({
      data: {
        entityType: data.entityType,
        entityId: data.entityId,
        projectId: data.projectId || null,
        type: data.type || 'GENERAL_NOTE',
        content: data.content,
        senderId,
      },
      include: { sender: { select: { id: true, name: true, role: true, avatarUrl: true } } },
    });
  }
}
