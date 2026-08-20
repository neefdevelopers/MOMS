import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  private readonly logger = new Logger(RolesGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const req = context.switchToHttp().getRequest();
    const { user, url, method } = req;
    if (!user) {
      throw new ForbiddenException('User context missing');
    }
    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      this.logger.warn(
        `UNAUTHORIZED ACCESS ATTEMPT: User '${user.name}' (${user.email || user.id}) with role '${user.role}' attempted '${method} ${url}' requiring roles [${requiredRoles.join(', ')}]`,
      );
      throw new ForbiddenException(
        `User role '${user.role}' does not have permission for this action. Required role: ${requiredRoles.join(' or ')}.`,
      );
    }
    return true;
  }
}
