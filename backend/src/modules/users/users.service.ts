import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    role?: string,
    status?: string,
    includeArchived = false,
    currentUser?: { id: string; role: string },
    search?: string,
  ) {
    const where: any = {};
    if (role) where.role = role;
    if (status && status !== 'ALL') where.status = status;
    if (!includeArchived) where.isArchived = false;

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q } },
        { id: { contains: q } },
        { email: { contains: q } },
        { employeeProfile: { employeeCode: { contains: q } } },
        { employeeProfile: { designation: { contains: q } } },
        { employeeProfile: { additionalDepartments: { contains: q } } },
        { employeeProfile: { department: { name: { contains: q } } } },
        { employeeProfile: { skills: { some: { skill: { name: { contains: q } } } } } },
      ];
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        isArchived: true,
        archivedAt: true,
        avatarUrl: true,
        createdAt: true,
        employeeProfile: {
          select: {
            id: true,
            employeeCode: true,
            designation: true,
            phone: true,
            departmentId: true,
            department: true,
            additionalDepartments: true,
            joiningDate: true,
            employmentStatus: true,
            dailyCapacityHours: true,
            dailyTarget: true,
            weeklyTarget: true,
            monthlyTarget: true,
            internalNotes: true,
            skills: { include: { skill: true } },
          },
        },
        attendanceRecords: {
          where: { date: { gte: todayStart, lte: todayEnd } },
          select: { status: true },
        },
        tasks: {
          where: {
            task: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
          },
          include: {
            task: { select: { estimatedHours: true, priority: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const isMediaManager = currentUser?.role === 'MEDIA_MANAGER';

    return users.map((u) => {
      // Calculate real-time Automatic Availability using Workload, Attendance, and Task Assignments
      const pendingTaskItems = u.tasks.map((at) => at.task).filter(Boolean);
      const activeTaskCount = pendingTaskItems.length;
      const capacityHours = u.employeeProfile?.dailyCapacityHours || 8.0;
      const rawWorkloadHours = pendingTaskItems.reduce((sum, t) => sum + (t.estimatedHours || 2.0), 0);
      const weightedWorkloadHours = pendingTaskItems.reduce((sum, t) => {
        let mult = 1.0;
        if (t.priority === 'CRITICAL') mult = 1.4;
        else if (t.priority === 'HIGH') mult = 1.2;
        return sum + (t.estimatedHours || 2.0) * mult;
      }, 0);

      const workloadPercentage = Math.round((weightedWorkloadHours / capacityHours) * 100);
      const todayAttendance = u.attendanceRecords[0]?.status;

      let currentAvailability = 'Available';
      if (u.status !== 'ACTIVE' || u.isArchived || todayAttendance === 'ABSENT') {
        currentAvailability = 'Offline';
      } else if (workloadPercentage > 100) {
        currentAvailability = 'Overloaded';
      } else if (workloadPercentage >= 75 || activeTaskCount >= 3) {
        currentAvailability = 'Busy';
      } else {
        currentAvailability = 'Available';
      }

      // Privacy boundary: Personal mobile number and personal email shall not be visible to other employees.
      const isSelf = currentUser && currentUser.id === u.id;
      const canViewPrivateContact = isMediaManager || isSelf;

      return {
        id: u.id,
        name: u.name,
        email: canViewPrivateContact ? u.email : '[CONFIDENTIAL]',
        role: u.role,
        status: u.status,
        isArchived: u.isArchived,
        archivedAt: u.archivedAt,
        avatarUrl: u.avatarUrl,
        createdAt: u.createdAt,
        currentAvailability,
        workloadPercentage,
        activeTaskCount,
        todayAttendance: todayAttendance || 'NOT_MARKED',
        remainingCapacityHours: Math.max(0, capacityHours - rawWorkloadHours),
        employeeProfile: u.employeeProfile
          ? {
              ...u.employeeProfile,
              phone: canViewPrivateContact ? u.employeeProfile.phone : null,
            }
          : null,
      };
    });
  }

  async getDepartments() {
    const standardDepts = [
      { name: 'Video Production', description: 'Video Shooting, Editing & Production' },
      { name: 'Graphic Design', description: 'Posters, Thumbnails & Social Media Graphics' },
      { name: 'Photography', description: 'Indoor & Outdoor Product/Model Photography' },
      { name: 'Motion Graphics', description: 'Animation, VFX & Kinetic Typography' },
      { name: 'Administration', description: 'Media Management, Operations & Resource Planning' },
    ];

    for (const d of standardDepts) {
      await this.prisma.department.upsert({
        where: { name: d.name },
        update: {},
        create: d,
      });
    }

    return this.prisma.department.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createDepartment(name: string, description?: string) {
    return this.prisma.department.create({
      data: { name, description: description || null },
    });
  }

  async updateDepartment(id: string, name: string, description?: string) {
    return this.prisma.department.update({
      where: { id },
      data: { name, description: description || null },
    });
  }

  async deleteDepartment(id: string) {
    return this.prisma.department.delete({
      where: { id },
    });
  }

  async getCapabilities() {
    const standardCapabilities = [
      { name: 'Video Editing', category: 'Post-Production' },
      { name: 'Photography', category: 'Production' },
      { name: 'Videography', category: 'Production' },
      { name: 'Motion Graphics', category: 'Post-Production' },
      { name: 'Color Grading', category: 'Post-Production' },
      { name: 'Drone Operation', category: 'Production' },
      { name: 'Graphic Design', category: 'Creative' },
      { name: 'Illustration', category: 'Creative' },
      { name: 'Copywriting', category: 'Creative' },
    ];

    for (const c of standardCapabilities) {
      await this.prisma.skill.upsert({
        where: { name: c.name },
        update: {},
        create: c,
      });
    }

    return this.prisma.skill.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createCapability(data: { name: string; category?: string }, operatorRole: string) {
    if (operatorRole !== 'MEDIA_MANAGER') {
      throw new ForbiddenException('Only the Media Manager may configure capabilities.');
    }

    if (!data.name || !data.name.trim()) {
      throw new BadRequestException('Capability name is required.');
    }

    const name = data.name.trim();
    return this.prisma.skill.upsert({
      where: { name },
      update: { category: data.category || 'Custom' },
      create: { name, category: data.category || 'Custom' },
    });
  }

  async getUserAssignedClientIds(userId: string): Promise<string[]> {
    const assignments = await this.prisma.clientAssignment.findMany({
      where: { userId },
      select: { clientId: true },
    });
    return assignments.map((a) => a.clientId);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        isArchived: true,
        archivedAt: true,
        avatarUrl: true,
        clientAssignments: { include: { client: true } },
        employeeProfile: {
          select: {
            id: true,
            employeeCode: true,
            designation: true,
            phone: true,
            departmentId: true,
            department: true,
            additionalDepartments: true,
            joiningDate: true,
            employmentStatus: true,
            dailyCapacityHours: true,
            dailyTarget: true,
            weeklyTarget: true,
            monthlyTarget: true,
            internalNotes: true,
            skills: { include: { skill: true } },
          },
        },
        projectAssignments: { include: { project: true } },
        tasks: { include: { task: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // Business Rule: Only the Media Manager may create employee records
  async createEmployee(data: any, operatorRole: string) {
    if (operatorRole !== 'MEDIA_MANAGER' && operatorRole !== 'ADMINISTRATOR' && operatorRole !== 'ADMIN') {
      throw new ForbiddenException('Only management users may create employee records.');
    }

    if (!data.name || !data.email || !data.password) {
      throw new BadRequestException('Name, email, and password are required.');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });
    if (existing) {
      throw new BadRequestException('An employee with this email address already exists.');
    }

    const count = await this.prisma.employeeProfile.count();
    const autoCode = data.employeeCode || `EMP-${(count + 1).toString().padStart(6, '0')}`;

    const hashedPassword = await bcrypt.hash(data.password, 10);

    let primaryDepartmentId = data.departmentId;
    if (!primaryDepartmentId) {
      const depts = await this.getDepartments();
      if (depts.length > 0) {
        primaryDepartmentId = depts[0].id;
      }
    }

    const user = await this.prisma.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        password: hashedPassword,
        role: data.role || 'STAFF',
        status: data.employmentStatus || 'ACTIVE',
        isArchived: false,
        avatarUrl: data.avatarUrl || null,
        employeeProfile: {
          create: {
            employeeCode: autoCode,
            designation: data.designation || 'Operations Staff',
            phone: data.phone || null,
            departmentId: primaryDepartmentId,
            additionalDepartments: data.additionalDepartments || null,
            joiningDate: data.joiningDate ? new Date(data.joiningDate) : new Date(),
            employmentStatus: data.employmentStatus || 'ACTIVE',
            dailyCapacityHours: data.dailyCapacityHours ? parseFloat(data.dailyCapacityHours) : 8.0,
            dailyTarget: data.dailyTarget ? parseFloat(data.dailyTarget) : 1.0,
            weeklyTarget: data.weeklyTarget ? parseFloat(data.weeklyTarget) : 5.0,
            monthlyTarget: data.monthlyTarget ? parseFloat(data.monthlyTarget) : 20.0,
            internalNotes: data.internalNotes || null,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        isArchived: true,
        employeeProfile: true,
      },
    });

    if (data.skills && Array.isArray(data.skills) && user.employeeProfile) {
      for (const sName of data.skills) {
        const skill = await this.prisma.skill.upsert({
          where: { name: sName.trim() },
          update: {},
          create: { name: sName.trim(), category: 'Custom' },
        });

        await this.prisma.employeeSkill.create({
          data: {
            employeeId: user.employeeProfile.id,
            skillId: skill.id,
          },
        });
      }
    }

    if (data.assignedClientIds && Array.isArray(data.assignedClientIds)) {
      for (const cId of data.assignedClientIds) {
        await this.prisma.clientAssignment.create({
          data: { userId: user.id, clientId: cId },
        });
      }
    }

    return this.findOne(user.id);
  }

  // Business Rule: Only Media Manager may modify employee records, employees shall not modify profile info
  async updateEmployee(id: string, data: any, currentUser: { id: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { employeeProfile: true },
    });
    if (!user) throw new NotFoundException('Employee record not found');

    const restrictedFields = [
      'employeeCode',
      'designation',
      'departmentId',
      'additionalDepartments',
      'joiningDate',
      'employmentStatus',
      'role',
      'status',
      'isArchived',
      'dailyCapacityHours',
      'dailyTarget',
      'weeklyTarget',
      'monthlyTarget',
      'internalNotes',
      'email',
      'name',
      'skills',
      'assignedClientIds',
    ];

    const isManager = currentUser.role === 'MEDIA_MANAGER' || currentUser.role === 'ADMINISTRATOR' || currentUser.role === 'ADMIN';

    // Non-Manager restriction
    if (!isManager) {
      if (currentUser.id !== id) {
        throw new ForbiddenException('Only management users may modify employee records.');
      }

      // If employee is editing their own profile, verify no restricted employee profile field is present
      const attemptedRestrictedFields = Object.keys(data).filter((k) => restrictedFields.includes(k));
      if (attemptedRestrictedFields.length > 0) {
        throw new ForbiddenException(
          'Employees shall not be able to modify their own profile information except where explicitly permitted.'
        );
      }
    }

    // Media Manager or permitted self-update (e.g. avatarUrl)
    const userUpdateData: any = {};
    if (data.name && isManager) userUpdateData.name = data.name;
    if (data.email && isManager) userUpdateData.email = data.email.toLowerCase().trim();
    if (data.role && isManager) userUpdateData.role = data.role;
    if (data.status && isManager) userUpdateData.status = data.status;
    if (data.avatarUrl !== undefined) userUpdateData.avatarUrl = data.avatarUrl;

    if (Object.keys(userUpdateData).length > 0) {
      await this.prisma.user.update({
        where: { id },
        data: userUpdateData,
      });
    }

    const profileUpdateData: any = {};
    if (currentUser.role === 'MEDIA_MANAGER') {
      if (data.employeeCode !== undefined) profileUpdateData.employeeCode = data.employeeCode;
      if (data.designation !== undefined) profileUpdateData.designation = data.designation;
      if (data.phone !== undefined) profileUpdateData.phone = data.phone;
      if (data.departmentId !== undefined) profileUpdateData.departmentId = data.departmentId;
      if (data.additionalDepartments !== undefined) profileUpdateData.additionalDepartments = data.additionalDepartments;
      if (data.joiningDate !== undefined) profileUpdateData.joiningDate = new Date(data.joiningDate);
      if (data.employmentStatus !== undefined) profileUpdateData.employmentStatus = data.employmentStatus;
      if (data.dailyCapacityHours !== undefined) profileUpdateData.dailyCapacityHours = parseFloat(data.dailyCapacityHours);
      if (data.dailyTarget !== undefined) profileUpdateData.dailyTarget = parseFloat(data.dailyTarget);
      if (data.weeklyTarget !== undefined) profileUpdateData.weeklyTarget = parseFloat(data.weeklyTarget);
      if (data.monthlyTarget !== undefined) profileUpdateData.monthlyTarget = parseFloat(data.monthlyTarget);
      if (data.internalNotes !== undefined) profileUpdateData.internalNotes = data.internalNotes;
    }

    let targetProfileId = user.employeeProfile?.id;
    if (user.employeeProfile && Object.keys(profileUpdateData).length > 0) {
      const updatedProfile = await this.prisma.employeeProfile.update({
        where: { userId: id },
        data: profileUpdateData,
      });
      targetProfileId = updatedProfile.id;
    } else if (!user.employeeProfile && Object.keys(profileUpdateData).length > 0) {
      const createdProfile = await this.prisma.employeeProfile.create({
        data: {
          userId: id,
          designation: data.designation || 'Operations Staff',
          ...profileUpdateData,
        },
      });
      targetProfileId = createdProfile.id;
    }

    if (data.skills && Array.isArray(data.skills) && targetProfileId && currentUser.role === 'MEDIA_MANAGER') {
      await this.prisma.employeeSkill.deleteMany({ where: { employeeId: targetProfileId } });

      for (const sName of data.skills) {
        const skill = await this.prisma.skill.upsert({
          where: { name: sName.trim() },
          update: {},
          create: { name: sName.trim(), category: 'Custom' },
        });

        await this.prisma.employeeSkill.create({
          data: {
            employeeId: targetProfileId,
            skillId: skill.id,
          },
        });
      }
    }

    if (data.assignedClientIds && Array.isArray(data.assignedClientIds) && currentUser.role === 'MEDIA_MANAGER') {
      await this.prisma.clientAssignment.deleteMany({ where: { userId: id } });
      for (const cId of data.assignedClientIds) {
        await this.prisma.clientAssignment.create({
          data: { userId: id, clientId: cId },
        });
      }
    }

    return this.findOne(id);
  }

  // Business Rule: Only the Media Manager may activate employee records
  async activateEmployee(id: string, operatorRole: string) {
    if (operatorRole !== 'MEDIA_MANAGER') {
      throw new ForbiddenException('Only the Media Manager may activate employee records.');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Employee record not found');

    await this.prisma.employeeProfile.updateMany({
      where: { userId: id },
      data: { employmentStatus: 'ACTIVE' },
    });

    return this.prisma.user.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        isArchived: false,
        archivedAt: null,
      },
    });
  }

  // Business Rule: Only the Media Manager may deactivate employee records
  async deactivateEmployee(id: string, operatorRole: string) {
    if (operatorRole !== 'MEDIA_MANAGER') {
      throw new ForbiddenException('Only the Media Manager may deactivate employee records.');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Employee record not found');

    await this.prisma.employeeProfile.updateMany({
      where: { userId: id },
      data: { employmentStatus: 'INACTIVE' },
    });

    return this.prisma.user.update({
      where: { id },
      data: {
        status: 'INACTIVE',
      },
    });
  }

  // Business Rule: Only the Media Manager may suspend employee records
  async suspendEmployee(id: string, operatorRole: string) {
    if (operatorRole !== 'MEDIA_MANAGER') {
      throw new ForbiddenException('Only the Media Manager may suspend employee records.');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Employee record not found');

    await this.prisma.employeeProfile.updateMany({
      where: { userId: id },
      data: { employmentStatus: 'SUSPENDED' },
    });

    return this.prisma.user.update({
      where: { id },
      data: {
        status: 'SUSPENDED',
      },
    });
  }

  // Business Rule: Only the Media Manager may archive employee records
  async archiveEmployee(id: string, operatorRole: string) {
    if (operatorRole !== 'MEDIA_MANAGER') {
      throw new ForbiddenException('Only the Media Manager may archive employee records.');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Employee record not found');

    await this.prisma.employeeProfile.updateMany({
      where: { userId: id },
      data: { employmentStatus: 'ARCHIVED' },
    });

    return this.prisma.user.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        isArchived: true,
        archivedAt: new Date(),
      },
    });
  }
}
