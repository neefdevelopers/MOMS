import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Role, ModuleType, PermissionType } from '../../common/enums';

@UseGuards(JwtAuthGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('overview')
  getPermissionsOverview(@Request() req: any) {
    const userRole = req.user?.role as Role;
    return this.permissionsService.getPermissionsOverview(userRole);
  }

  @Get('check')
  checkPermission(
    @Request() req: any,
    @Query('module') module: ModuleType,
    @Query('permission') permission: PermissionType,
  ) {
    const userRole = req.user?.role as Role;
    const allowed = this.permissionsService.hasPermission(userRole, module, permission);
    return {
      allowed,
      role: userRole,
      module,
      permission,
    };
  }
}
