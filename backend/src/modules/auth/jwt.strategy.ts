import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'moms_super_secret_jwt_key_v1_2026',
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { employeeProfile: { include: { department: true } } },
    });

    if (!user) {
      throw new UnauthorizedException('Account not found. Access denied.');
    }

    if (user.isArchived || user.status === 'ARCHIVED' || user.status === 'SUSPENDED' || user.status === 'INACTIVE') {
      throw new UnauthorizedException(`Account is ${user.status?.toLowerCase() ?? 'archived'}. Contact the Media Manager.`);
    }

    const { password, ...result } = user;
    return result;
  }
}
