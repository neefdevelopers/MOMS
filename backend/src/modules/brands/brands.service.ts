import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BrandStatus } from '../../common/enums';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  async findAll(clientId?: string, status?: string, search?: string, user?: any) {
    const where: any = {};
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { shortCode: { contains: search } },
        { industry: { contains: search } },
        { description: { contains: search } },
        { client: { name: { contains: search } } },
      ];
    }

    if (user && user.role === 'MARKETING_MANAGER') {
      const assignments = await this.prisma.clientAssignment.findMany({
        where: { userId: user.id },
        select: { clientId: true },
      });
      const assignedIds = assignments.map((a) => a.clientId);
      if (clientId && !assignedIds.includes(clientId)) {
        return [];
      }
      where.clientId = { in: assignedIds };
    }

    return this.prisma.brand.findMany({
      where,
      include: {
        client: true,
        products: true,
        _count: { select: { projects: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, user?: any) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: { client: true, products: true, projects: true },
    });
    if (!brand) throw new NotFoundException('Brand not found');

    if (user && user.role === 'MARKETING_MANAGER') {
      const assignments = await this.prisma.clientAssignment.findMany({
        where: { userId: user.id },
        select: { clientId: true },
      });
      const assignedIds = assignments.map((a) => a.clientId);
      if (!assignedIds.includes(brand.clientId)) {
        throw new ForbiddenException('Access Denied: You are not authorized to view this brand.');
      }
    }

    return brand;
  }

  async create(data: any) {
    // 1. Verify Client exists and is ACTIVE
    const client = await this.prisma.client.findUnique({ where: { id: data.clientId } });
    if (!client) throw new NotFoundException('Parent client not found');
    if (client.status !== 'ACTIVE') {
      throw new BadRequestException('Cannot create a brand for a non-active client.');
    }

    const codeUpper = data.shortCode.toUpperCase();
    const existingCode = await this.prisma.brand.findUnique({
      where: { shortCode: codeUpper },
    });
    if (existingCode) {
      throw new BadRequestException(`Brand short code '${codeUpper}' already exists. Brand code must be unique.`);
    }

    return this.prisma.brand.create({
      data: {
        clientId: data.clientId,
        name: data.name,
        shortCode: codeUpper,
        logoUrl: data.logoUrl,
        description: data.description,
        industry: data.industry,
        primaryColor: data.primaryColor || '#3B82F6',
        status: data.status || BrandStatus.ACTIVE,
      },
    });
  }

  async update(id: string, data: any) {
    const existing = await this.findOne(id);
    const updateData: any = {};

    if (data.name) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.industry !== undefined) updateData.industry = data.industry;
    if (data.primaryColor !== undefined) updateData.primaryColor = data.primaryColor;
    if (data.status) updateData.status = data.status;

    if (data.shortCode) {
      const codeUpper = data.shortCode.toUpperCase();
      if (codeUpper !== existing.shortCode) {
        const check = await this.prisma.brand.findUnique({ where: { shortCode: codeUpper } });
        if (check) {
          throw new BadRequestException(`Brand short code '${codeUpper}' is already taken by another brand.`);
        }
        updateData.shortCode = codeUpper;
      }
    }

    return this.prisma.brand.update({
      where: { id },
      data: updateData,
    });
  }
}
