import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { GraphicReqsService } from './graphic-reqs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('graphic-reqs')
export class GraphicReqsController {
  constructor(private readonly graphicReqsService: GraphicReqsService) {}

  @Get()
  findAll(@Query('projectId') projectId?: string) {
    return this.graphicReqsService.findAll(projectId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.graphicReqsService.findOne(id);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Post()
  create(@Body() data: any) {
    return this.graphicReqsService.create(data);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.graphicReqsService.update(id, data);
  }

  @Post(':id/remarks')
  addRemark(
    @Param('id') id: string,
    @Body('message') message: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.graphicReqsService.addRemark(id, message, userId);
  }
}
