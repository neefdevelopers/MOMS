import { Injectable } from '@nestjs/common';
import { Role, PermissionType, ModuleType } from '../../common/enums';
import {
  MODULE_SUPPORTED_PERMISSIONS,
  ROLE_PERMISSION_MATRIX,
} from '../../common/permissions/permissions.constants';

@Injectable()
export class PermissionsService {
  /**
   * Returns all 9 supported permission types, all modules, module capability matrix, and current role matrix.
   */
  getPermissionsOverview(userRole?: Role) {
    const allPermissionTypes = Object.values(PermissionType);
    const allModules = Object.values(ModuleType);

    const userPermissions = userRole ? ROLE_PERMISSION_MATRIX[userRole] : null;

    return {
      permissionTypes: allPermissionTypes,
      modules: allModules,
      moduleCapabilities: MODULE_SUPPORTED_PERMISSIONS,
      roleMatrix: ROLE_PERMISSION_MATRIX,
      userRole,
      userPermissions,
    };
  }

  /**
   * Check if a specific role has permission on a module.
   */
  hasPermission(role: Role, module: ModuleType, permission: PermissionType): boolean {
    const permissions = ROLE_PERMISSION_MATRIX[role]?.[module] || [];
    return permissions.includes(permission);
  }
}
