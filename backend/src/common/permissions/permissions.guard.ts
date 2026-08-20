import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums';
import { PERMISSION_METADATA_KEY, RequiredPermissionMetadata } from './permissions.decorator';
import { ROLE_PERMISSION_MATRIX } from './permissions.constants';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<RequiredPermissionMetadata>(
      PERMISSION_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermission) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('User context missing');
    }

    const userRole = user.role as Role;
    const rolePermissions = ROLE_PERMISSION_MATRIX[userRole]?.[requiredPermission.module] || [];

    const hasPermission = rolePermissions.includes(requiredPermission.permission);
    if (!hasPermission) {
      throw new ForbiddenException(
        `User with role '${userRole}' lacks '${requiredPermission.permission}' permission for module '${requiredPermission.module}'.`,
      );
    }

    return true;
  }
}
