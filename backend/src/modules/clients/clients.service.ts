import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClientStatus } from '../../common/enums';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async findAll(search?: string, status?: string) {
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
    return this.prisma.client.findMany({
      where,
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
    });
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        brands: { include: { products: true } },
        projects: {
          select: { id: true, projectId: true, name: true, status: true, shootType: true, shootDate: true },
          orderBy: { createdAt: 'desc' },
        },
        calendarEvents: true,
      },
    });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async create(data: any) {
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

    return this.prisma.client.create({
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
  }

  async update(id: string, data: any) {
    const existingClient = await this.findOne(id);

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
}
