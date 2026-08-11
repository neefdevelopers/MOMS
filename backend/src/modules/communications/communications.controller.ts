import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { CommunicationsService } from './communications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CommunicationType } from '../../common/enums';

@UseGuards(JwtAuthGuard)
@Controller('communications')
export class CommunicationsController {
  constructor(private readonly communicationsService: CommunicationsService) {}

  @Get()
  findByEntity(@Query('entityType') entityType: string, @Query('entityId') entityId: string) {
    return this.communicationsService.findByEntity(entityType, entityId);
  }

  @Post()
  create(
    @Body() data: { entityType: string; entityId: string; projectId?: string; type: CommunicationType; content: string },
    @CurrentUser('id') senderId: string,
  ) {
    return this.communicationsService.create(data, senderId);
  }
}
