import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductStatus } from '../../common/enums';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(brandId?: string, status?: string, search?: string) {
    const where: any = {};
    if (brandId) where.brandId = brandId;
    if (status) where.status = status;
    if (search) {
      const cleanSearch = search.trim();
      const parts = cleanSearch.split(/[\s\-\/]+/);

      const searchConditions: any[] = [
        { name: { contains: cleanSearch } },
        { productCode: { contains: cleanSearch } },
        { category: { contains: cleanSearch } },
        { internalNotes: { contains: cleanSearch } },
        { brand: { name: { contains: cleanSearch } } },
        { brand: { shortCode: { contains: cleanSearch } } },
        { brand: { client: { name: { contains: cleanSearch } } } },
      ];

      // Support searching combined brand short code and product code like "DW-OJ" or "DW OJ"
      if (parts.length > 1 && parts[0] && parts[1]) {
        searchConditions.push({
          AND: [
            { brand: { shortCode: { contains: parts[0] } } },
            { productCode: { contains: parts[1] } },
          ],
        });
        searchConditions.push({
          AND: [
            { brand: { shortCode: { contains: parts[1] } } },
            { productCode: { contains: parts[0] } },
          ],
        });
      }

      where.OR = searchConditions;
    }

    return this.prisma.product.findMany({
      where,
      include: {
        brand: { include: { client: true } },
        _count: { select: { projects: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { brand: { include: { client: true } }, projects: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(data: any) {
    const brand = await this.prisma.brand.findUnique({ where: { id: data.brandId } });
    if (!brand) throw new NotFoundException('Parent brand not found');
    if (brand.status !== 'ACTIVE') {
      throw new BadRequestException('Cannot create a product for an inactive brand.');
    }

    const codeUpper = data.productCode.toUpperCase();
    const existing = await this.prisma.product.findUnique({
      where: {
        brandId_productCode: {
          brandId: data.brandId,
          productCode: codeUpper,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(`Product code '${codeUpper}' already exists under brand '${brand.name}'.`);
    }

    return this.prisma.product.create({
      data: {
        brandId: data.brandId,
        name: data.name,
        productCode: codeUpper,
        category: data.category,
        status: data.status || ProductStatus.ACTIVE,
        internalNotes: data.internalNotes,
      },
    });
  }

  async update(id: string, data: any) {
    const existing = await this.findOne(id);
    const updateData: any = {};

    if (data.name) updateData.name = data.name;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.internalNotes !== undefined) updateData.internalNotes = data.internalNotes;
    if (data.status) updateData.status = data.status;

    if (data.productCode) {
      const codeUpper = data.productCode.toUpperCase();
      if (codeUpper !== existing.productCode) {
        const check = await this.prisma.product.findUnique({
          where: {
            brandId_productCode: {
              brandId: existing.brandId,
              productCode: codeUpper,
            },
          },
        });
        if (check) {
          throw new BadRequestException(`Product code '${codeUpper}' is already taken under this brand.`);
        }
        updateData.productCode = codeUpper;
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: updateData,
    });
  }
}
