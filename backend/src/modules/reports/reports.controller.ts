import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  getDashboardSummary() {
    return this.reportsService.getDashboardSummary();
  }

  @Get('search')
  getGlobalSearch(@Query('q') q: string) {
    return this.reportsService.getGlobalSearch(q);
  }

  @Get('production')
  getProductionReports() {
    return this.reportsService.getProductionReports();
  }

  @Get('script-analytics')
  getScriptAnalytics() {
    return this.reportsService.getScriptAnalytics();
  }
}
