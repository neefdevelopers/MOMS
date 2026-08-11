import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(role?: string) {
    const where: any = {};
    if (role) where.role = role;

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        employeeProfile: {
          include: {
            department: true,
            skills: { include: { skill: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        employeeProfile: { include: { department: true, skills: { include: { skill: true } } } },
        projectAssignments: { include: { project: true } },
        tasks: { include: { task: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
