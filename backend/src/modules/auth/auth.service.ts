import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email.toLowerCase() },
      include: { employeeProfile: { include: { department: true } } },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'INACTIVE' || user.status === 'SUSPENDED' || user.status === 'ARCHIVED' || user.isArchived) {
      throw new UnauthorizedException(`Your employee account is ${user.status.toLowerCase()}. Please contact the Media Manager.`);
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    // Permission-sensitive action: Login audit record
    await this.prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
        description: `User ${user.name} (${user.role}) logged in successfully.`,
        metadata: JSON.stringify({ email: user.email, role: user.role }),
      },
    });

    const { password, ...userWithoutPassword } = user;
    return {
      accessToken,
      user: userWithoutPassword,
    };
  }

  async logout(userId: string) {
    // Audit record for logout — token invalidation is handled client-side (stateless JWT)
    await this.prisma.activityLog.create({
      data: {
        userId,
        action: 'LOGOUT',
        entity: 'User',
        entityId: userId,
        description: `User ${userId} logged out.`,
        metadata: JSON.stringify({ loggedOutAt: new Date().toISOString() }),
      },
    });
    return { message: 'Logged out successfully.' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        employeeProfile: {
          include: {
            department: true,
            skills: { include: { skill: true } },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { password, ...result } = user;
    return result;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isCurrentValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isCurrentValid) {
      throw new BadRequestException('Current password is incorrect.');
    }

    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException('New password must differ from the current password.');
    }

    const hashedNew = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNew },
    });

    // Permission-sensitive action: Password change audit record
    await this.prisma.activityLog.create({
      data: {
        userId,
        action: 'PASSWORD_CHANGE',
        entity: 'User',
        entityId: userId,
        description: `User ${user.name} changed their password.`,
        metadata: JSON.stringify({ changedAt: new Date().toISOString() }),
      },
    });

    return { message: 'Password changed successfully.' };
  }
}

