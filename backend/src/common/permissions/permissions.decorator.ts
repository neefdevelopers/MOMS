import { SetMetadata } from '@nestjs/common';
import { PermissionType, ModuleType } from '../enums';

export const PERMISSION_METADATA_KEY = 'required_permission';

export interface RequiredPermissionMetadata {
  module: ModuleType;
  permission: PermissionType;
}

export const RequirePermission = (module: ModuleType, permission: PermissionType) =>
  SetMetadata(PERMISSION_METADATA_KEY, { module, permission } as RequiredPermissionMetadata);
