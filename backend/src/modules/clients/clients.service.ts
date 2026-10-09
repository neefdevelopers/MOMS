import { Injectable, BadRequestException, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClientStatus } from '../../common/enums';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async findAll(search?: string, status?: string, page?: number, limit?: number, user?: any, brandId?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { companyName: { contains: search } },
        { contactPerson: { contains: search } },
        { email: { contains: search } },
        { mobile: { contains: search } },
      ];
    }

    if (brandId && brandId !== 'ALL' && brandId.trim() !== '') {
      where.brands = { some: { id: brandId.trim() } };
    }

    if (user && user.role === 'MARKETING_MANAGER') {
      const assignments = await this.prisma.clientAssignment.findMany({
        where: { userId: user.id },
        select: { clientId: true },
      });
      const assignedIds = assignments.map((a) => a.clientId);
      where.id = { in: assignedIds };
    }

    const take = limit ? Number(limit) : undefined;
    const skip = page && limit ? (Number(page) - 1) * Number(limit) : undefined;

    const [data, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        take,
        skip,
        include: {
          brands: {
            include: {
              products: true,
            },
          },
          _count: {
            select: { projects: true, calendarEvents: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.client.count({ where }),
    ]);

    if (page || limit) {
      return {
        data,
        meta: {
          total,
          page: Number(page) || 1,
          limit: Number(limit) || total,
          totalPages: limit ? Math.ceil(total / Number(limit)) : 1,
        },
      };
    }

    return data;
  }

  async findOne(id: string, user?: any, brandId?: string) {
    if (user && user.role === 'MARKETING_MANAGER') {
      const assignments = await this.prisma.clientAssignment.findMany({
        where: { userId: user.id },
        select: { clientId: true },
      });
      const assignedIds = assignments.map((a) => a.clientId);
      if (!assignedIds.includes(id)) {
        throw new ForbiddenException('Access Denied: You are not authorized to view this client.');
      }
    }

    const activeBrandFilter = brandId && brandId !== 'ALL' && brandId.trim() !== '' ? brandId.trim() : undefined;

    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        brands: activeBrandFilter
          ? { where: { id: activeBrandFilter }, include: { products: true } }
          : { include: { products: true } },
        projects: {
          where: activeBrandFilter ? { brandId: activeBrandFilter } : undefined,
          select: { id: true, projectId: true, name: true, status: true, shootType: true, shootDate: true, brandId: true },
          orderBy: { createdAt: 'desc' },
        },
        calendarEvents: {
          where: activeBrandFilter ? { brandId: activeBrandFilter } : undefined,
        },
        graphicReqs: {
          where: activeBrandFilter ? { brandId: activeBrandFilter } : undefined,
        },
        tasks: {
          where: activeBrandFilter
            ? {
                OR: [
                  { brandId: activeBrandFilter },
                  { project: { brandId: activeBrandFilter } },
                  { graphicRequirement: { brandId: activeBrandFilter } },
                ],
              }
            : undefined,
        },
      },
    });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async create(data: any, user?: any) {
    if (!data.name || !data.companyName || !data.contactPerson || !data.mobile || !data.email) {
      throw new BadRequestException('Client Name, Company Name, Contact Person, Mobile, and Email are required.');
    }

    // Mobile Number Numeric Validation
    const cleanMobile = data.mobile.replace(/[^\d+]/g, '');
    if (!cleanMobile || !/^\+?\d{7,15}$/.test(cleanMobile)) {
      throw new BadRequestException('Mobile number must contain valid digits (7 to 15 numbers).');
    }

    const trimmedName = data.name.trim();
    const trimmedCompany = data.companyName.trim();
    const trimmedEmail = data.email.trim().toLowerCase();

    // Check Duplicate Client Name
    const existingName = await this.prisma.client.findFirst({
      where: { name: { equals: trimmedName } },
    });
    if (existingName) {
      throw new ConflictException(`A client with the name '${trimmedName}' already exists.`);
    }

    // Check Duplicate Company Name
    const existingCompany = await this.prisma.client.findFirst({
      where: { companyName: { equals: trimmedCompany } },
    });
    if (existingCompany) {
      throw new ConflictException(`A client with company name '${trimmedCompany}' already exists.`);
    }

    // Check Duplicate Email
    const existingEmail = await this.prisma.client.findFirst({
      where: { email: { equals: trimmedEmail } },
    });
    if (existingEmail) {
      throw new ConflictException(`A client with email address '${trimmedEmail}' already exists.`);
    }

    const client = await this.prisma.client.create({
      data: {
        name: trimmedName,
        companyName: trimmedCompany,
        contactPerson: data.contactPerson.trim(),
        mobile: cleanMobile,
        email: trimmedEmail,
        address: data.address,
        gstNumber: data.gstNumber,
        website: data.website,
        status: data.status || ClientStatus.ACTIVE,
        internalNotes: data.internalNotes,
      },
    });

    if (user && user.role === 'MARKETING_MANAGER') {
      await this.prisma.clientAssignment.create({
        data: {
          userId: user.id,
          clientId: client.id,
        },
      });
    }

    return client;
  }

  async update(id: string, data: any, user?: any) {
    const existingClient = await this.findOne(id, user);

    if (data.mobile) {
      const cleanMobile = data.mobile.replace(/[^\d+]/g, '');
      if (!cleanMobile || !/^\+?\d{7,15}$/.test(cleanMobile)) {
        throw new BadRequestException('Mobile number must contain valid digits (7 to 15 numbers).');
      }
      data.mobile = cleanMobile;
    }

    if (data.name) {
      const trimmedName = data.name.trim();
      if (trimmedName !== existingClient.name) {
        const check = await this.prisma.client.findFirst({ where: { name: { equals: trimmedName } } });
        if (check) throw new ConflictException(`Client name '${trimmedName}' is already taken.`);
      }
      data.name = trimmedName;
    }

    if (data.companyName) {
      const trimmedCompany = data.companyName.trim();
      if (trimmedCompany !== existingClient.companyName) {
        const check = await this.prisma.client.findFirst({ where: { companyName: { equals: trimmedCompany } } });
        if (check) throw new ConflictException(`Company name '${trimmedCompany}' is already taken.`);
      }
      data.companyName = trimmedCompany;
    }

    if (data.email) {
      const trimmedEmail = data.email.trim().toLowerCase();
      if (trimmedEmail !== existingClient.email) {
        const check = await this.prisma.client.findFirst({ where: { email: { equals: trimmedEmail } } });
        if (check) throw new ConflictException(`Email address '${trimmedEmail}' is already registered to another client.`);
      }
      data.email = trimmedEmail;
    }

    return this.prisma.client.update({
      where: { id },
      data: {
        name: data.name,
        companyName: data.companyName,
        contactPerson: data.contactPerson ? data.contactPerson.trim() : undefined,
        mobile: data.mobile,
        email: data.email,
        address: data.address,
        gstNumber: data.gstNumber,
        website: data.website,
        status: data.status,
        internalNotes: data.internalNotes,
      },
    });
  }

  async remove(id: string, user?: any) {
    // Guard: ensure the client exists and is accessible
    await this.findOne(id, user);

    // Cascade protection: block deletion if there are active (non-ARCHIVED) projects
    const activeProjects = await this.prisma.shootProject.count({
      where: { clientId: id, NOT: { status: 'ARCHIVED' } },
    });
    if (activeProjects > 0) {
      throw new BadRequestException(
        `Cannot delete client with ${activeProjects} active project(s). Archive or reassign projects first.`,
      );
    }

    // Soft-delete: set status to ARCHIVED instead of a hard delete
    return this.prisma.client.update({
      where: { id },
      data: { status: ClientStatus.ARCHIVED },
    });
  }
}

