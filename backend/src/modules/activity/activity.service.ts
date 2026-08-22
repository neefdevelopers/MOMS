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
        { description: { contains: search } },
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

  /**
   * Fetches formatted recent operational activity feed for the main dashboard widget.
   */
  async getDashboardFeed(category?: string, search?: string, limit: number = 50) {
    const where: any = {};

    if (category && category !== 'ALL') {
      switch (category.toUpperCase()) {
        case 'PROJECTS':
          where.OR = [{ entity: 'PROJECT' }, { action: { contains: 'PROJECT' } }];
          break;
        case 'TASKS':
          where.OR = [{ entity: 'TASK' }, { action: { contains: 'TASK' } }];
          break;
        case 'REVIEWS':
          where.OR = [
            { entity: 'SCRIPT' },
            { entity: 'GRAPHIC_REQ' },
            { entity: 'REVIEW' },
            { action: { contains: 'REVIEW' } },
            { action: { contains: 'SCRIPT' } },
          ];
          break;
        case 'EQUIPMENT':
          where.OR = [{ entity: 'EQUIPMENT' }, { action: { contains: 'EQUIPMENT' } }];
          break;
        case 'ATTENDANCE':
          where.OR = [{ entity: 'ATTENDANCE' }, { action: { contains: 'ATTENDANCE' } }];
          break;
        case 'COMMUNICATION':
          where.OR = [{ entity: 'COMMUNICATION' }, { action: { contains: 'COMMUNICATION' } }];
          break;
        case 'APPROVALS':
          where.OR = [{ entity: 'APPROVAL' }, { action: { contains: 'APPROVAL' } }];
          break;
      }
    }

    if (search && search.trim()) {
      const searchWhere = [
        { action: { contains: search } },
        { entity: { contains: search } },
        { description: { contains: search } },
        { metadata: { contains: search } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchWhere }];
        delete where.OR;
      } else {
        where.OR = searchWhere;
      }
    }

    const logs = await this.prisma.activityLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    const enrichedLogs = logs.map((log) => {
      let targetUrl = '/';
      let formattedCategory = log.entity || 'SYSTEM';

      if (log.entity === 'PROJECT' || log.action?.includes('PROJECT')) {
        targetUrl = `/projects/${log.entityId}`;
        formattedCategory = 'PROJECTS';
      } else if (log.entity === 'TASK' || log.action?.includes('TASK')) {
        targetUrl = `/tasks?taskId=${log.entityId}`;
        formattedCategory = 'TASKS';
      } else if (log.entity === 'EQUIPMENT' || log.action?.includes('EQUIPMENT')) {
        targetUrl = `/equipment?equipmentId=${log.entityId}`;
        formattedCategory = 'EQUIPMENT';
      } else if (log.entity === 'ATTENDANCE' || log.action?.includes('ATTENDANCE')) {
        targetUrl = `/attendance`;
        formattedCategory = 'ATTENDANCE';
      } else if (log.entity === 'COMMUNICATION' || log.action?.includes('COMMUNICATION')) {
        targetUrl = `/communication`;
        formattedCategory = 'COMMUNICATION';
      } else if (log.entity === 'APPROVAL' || log.action?.includes('APPROVAL')) {
        targetUrl = `/approvals`;
        formattedCategory = 'APPROVALS';
      } else if (log.entity === 'SCRIPT' || log.entity === 'GRAPHIC_REQ') {
        targetUrl = `/scripts`;
        formattedCategory = 'REVIEWS';
      }

      return {
        id: log.id,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        category: formattedCategory,
        description: log.description,
        timestamp: log.timestamp,
        user: log.user,
        targetUrl,
        metadata: log.metadata ? (() => { try { return JSON.parse(log.metadata); } catch { return null; } })() : null,
      };
    });

    return {
      status: 'SUCCESS',
      totalCount: enrichedLogs.length,
      category: category || 'ALL',
      activities: enrichedLogs,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Fetches summary statistics for operational activity history.
   */
  async getActivityStats() {
    const totalLogs = await this.prisma.activityLog.count();
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 3600 * 1000);

    const logs24h = await this.prisma.activityLog.count({
      where: { timestamp: { gte: last24h } },
    });

    const byEntityRaw = await this.prisma.activityLog.groupBy({
      by: ['entity'],
      _count: { id: true },
    });

    const entityCounts = byEntityRaw.reduce((acc, item) => {
      acc[item.entity] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalLogs,
      logs24h,
      entityCounts,
    };
  }
}
