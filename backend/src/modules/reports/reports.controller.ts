import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('my-dashboard')
  getPersonalizedDashboard(@CurrentUser() user: any) {
    return this.reportsService.getPersonalizedDashboard(user.id);
  }

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

  @Get('graphic-analytics')
  getGraphicAnalytics() {
    return this.reportsService.getGraphicAnalytics();
  }

  @Get('productivity')
  getEmployeeProductivityReport() {
    return this.reportsService.getEmployeeProductivityReport();
  }

  @Get('employee-analytics')
  getEmployeeAnalyticsReport() {
    return this.reportsService.getEmployeeAnalyticsReport();
  }

  @Get('brands')
  getBrandPerformanceReports() {
    return this.reportsService.getBrandPerformanceReports();
  }

  @Get('clients')
  getClientPerformanceReports() {
    return this.reportsService.getClientPerformanceReports();
  }

  @Get('products')
  getProductPerformanceReports() {
    return this.reportsService.getProductPerformanceReports();
  }

  @Get('departments')
  getDepartmentPerformanceReports() {
    return this.reportsService.getDepartmentPerformanceReports();
  }

  @Get('projects')
  getProjectPerformanceReports() {
    return this.reportsService.getProjectPerformanceReports();
  }

  @Get('attendance-analytics')
  getAttendanceAnalyticsReport(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getAttendanceAnalyticsReport(period, startDate, endDate);
  }

  @Get('equipment')
  getEquipmentPerformanceReports() {
    return this.reportsService.getEquipmentPerformanceReports();
  }

  @Get('approvals')
  getApprovalPerformanceReports() {
    return this.reportsService.getApprovalPerformanceReports();
  }

  @Get('capacity')
  getCapacityPerformanceReports() {
    return this.reportsService.getCapacityPerformanceReports();
  }

  @Get('revisions')
  getRevisionPerformanceReports() {
    return this.reportsService.getRevisionPerformanceReports();
  }

  @Get('timelines')
  getTimelinePerformanceReports() {
    return this.reportsService.getTimelinePerformanceReports();
  }
}
