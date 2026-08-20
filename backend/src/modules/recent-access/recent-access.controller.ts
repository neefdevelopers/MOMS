import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { RecentAccessService, RecordRecentAccessDto } from './recent-access.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('recent-access')
export class RecentAccessController {
  constructor(private readonly recentAccessService: RecentAccessService) {}

  @Get()
  getUserRecentAccess(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('entityType') entityType?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) || 15 : 15;
    return this.recentAccessService.getUserRecentAccess(req.user.id, parsedLimit, entityType);
  }

  @Post()
  recordAccess(@Request() req: any, @Body() dto: RecordRecentAccessDto) {
    return this.recentAccessService.recordAccess(req.user.id, dto);
  }

  @Delete()
  clearUserHistory(@Request() req: any, @Query('entityType') entityType?: string) {
    return this.recentAccessService.clearUserHistory(req.user.id, entityType);
  }
}
