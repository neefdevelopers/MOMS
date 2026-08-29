import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RevisionsService } from './revisions.service';
import {
  RequestRevisionDto,
  SubmitRevisionDto,
  ReviewRevisionDecisionDto,
  ReassignRevisionDto,
} from './dto/revisions.dto';

@Controller('revisions')
@UseGuards(JwtAuthGuard)
export class RevisionsController {
  constructor(private readonly revisionsService: RevisionsService) {}

  @Post('request')
  requestRevision(@Body() dto: RequestRevisionDto, @Request() req: any) {
    return this.revisionsService.requestRevision(dto, req.user);
  }

  @Get()
  getRevisions(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
  ) {
    return this.revisionsService.getRevisions(req.user, status, priority);
  }

  @Get('metrics')
  getRevisionMetrics(@Request() req: any) {
    return this.revisionsService.getRevisionMetrics(req.user);
  }

  @Get('entity/:entityType/:entityId')
  getRevisionsByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.revisionsService.getRevisionsByEntity(entityType, entityId);
  }

  @Patch(':id/accept')
  acceptRevision(@Param('id') id: string, @Request() req: any) {
    return this.revisionsService.acceptRevision(id, req.user);
  }

  @Patch(':id/start')
  startRevision(@Param('id') id: string, @Request() req: any) {
    return this.revisionsService.startRevision(id, req.user);
  }

  @Patch(':id/submit')
  submitRevision(
    @Param('id') id: string,
    @Body() dto: SubmitRevisionDto,
    @Request() req: any,
  ) {
    return this.revisionsService.submitRevision(id, dto, req.user);
  }

  @Patch(':id/reassign')
  reassignRevision(
    @Param('id') id: string,
    @Body() dto: ReassignRevisionDto,
    @Request() req: any,
  ) {
    return this.revisionsService.reassignRevision(id, dto, req.user);
  }

  @Patch(':id/review')
  reviewRevision(
    @Param('id') id: string,
    @Body() dto: ReviewRevisionDecisionDto,
    @Request() req: any,
  ) {
    return this.revisionsService.reviewRevision(id, dto, req.user);
  }
}
