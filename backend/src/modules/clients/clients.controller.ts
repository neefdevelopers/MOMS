import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/permissions/permissions.decorator';
import { Role, ClientStatus, ModuleType, PermissionType } from '../../common/enums';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  /**
   * GET /api/v1/clients
   * Returns all clients, optionally filtered by search string and status.
   */
  @RequirePermission(ModuleType.CLIENTS, PermissionType.VIEW)
  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: ClientStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.clientsService.findAll(search, status, page, limit);
  }

  /**
   * GET /api/v1/clients/:id
   * Returns a single client with brands, products, and project history.
   */
  @RequirePermission(ModuleType.CLIENTS, PermissionType.VIEW)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  /**
   * POST /api/v1/clients
   * Creates a new client record. Restricted to Media Manager.
   */
  @Roles(Role.MEDIA_MANAGER)
  @RequirePermission(ModuleType.CLIENTS, PermissionType.CREATE)
  @Post()
  create(@Body() data: any) {
    return this.clientsService.create(data);
  }

  /**
   * PATCH /api/v1/clients/:id
   * Partially updates a client record. Restricted to Media Manager.
   */
  @Roles(Role.MEDIA_MANAGER)
  @RequirePermission(ModuleType.CLIENTS, PermissionType.EDIT)
  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.clientsService.update(id, data);
  }

  /**
   * DELETE /api/v1/clients/:id
   * Soft-deletes a client (sets status=INACTIVE, isArchived=true).
   * Blocked if the client has active projects. Restricted to Media Manager.
   */
  @Roles(Role.MEDIA_MANAGER)
  @RequirePermission(ModuleType.CLIENTS, PermissionType.DELETE)
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clientsService.remove(id);
  }
}

