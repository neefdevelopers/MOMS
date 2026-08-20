import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role, ClientDecision } from '../../common/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('approvalType') approvalType?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.approvalsService.findAll(status, approvalType, projectId);
  }

  @Get('queue')
  getApprovalQueue() {
    return this.approvalsService.getApprovalQueue();
  }

  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER)
  @Post('tech-review')
  submitTechnicalReview(
    @Body() data: { projectId: string; status: 'APPROVED' | 'REJECTED'; remarks?: string },
    @CurrentUser('id') reviewerId: string,
  ) {
    return this.approvalsService.submitTechnicalReview(data, reviewerId);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Post('media-review')
  submitMediaReview(
    @Body() data: { projectId: string; status: 'APPROVED' | 'REJECTED'; remarks?: string },
    @CurrentUser('id') reviewerId: string,
  ) {
    return this.approvalsService.submitMediaReview(data, reviewerId);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Post('client-confirmation')
  recordClientConfirmation(
    @Body()
    data: {
      projectId: string;
      decision: ClientDecision;
      communicationMethod: string;
      remarks?: string;
    },
    @CurrentUser('id') recordedById: string,
  ) {
    return this.approvalsService.recordClientConfirmation(data, recordedById);
  }
}
