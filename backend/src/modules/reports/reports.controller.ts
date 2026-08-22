import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('audit-export')
  logDataExport(
    @Body() body: { reportType: string; format: string; recordCount?: number; filters?: any },
    @CurrentUser() user: any,
  ) {
    return this.reportsService.logDataExport(user.id, body.reportType, body.format, body.recordCount, body.filters);
  }

  @Get('my-dashboard')
  getPersonalizedDashboard(
    @CurrentUser() user: any,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('clientId') clientId?: string,
    @Query('brandId') brandId?: string,
    @Query('productId') productId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string
  ) {
    return this.reportsService.getPersonalizedDashboard(user.id, period, startDate, endDate, clientId, brandId, productId, departmentId, employeeId, projectId, status, search);
  }

  @Get('technical-dashboard')
  getTechnicalDashboard(@CurrentUser() user: any) {
    return this.reportsService.getTechnicalManagerDashboard(user.id);
  }

  @Get('dashboard')
  getDashboardSummary(
    @CurrentUser() user: any,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('clientId') clientId?: string,
    @Query('brandId') brandId?: string,
    @Query('productId') productId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string
  ) {
    if (user?.role === 'STAFF') {
      return this.reportsService.getPersonalizedDashboard(user.id, period, startDate, endDate, clientId, brandId, productId, departmentId, employeeId, projectId, status, search);
    }
    if (user?.role === 'TECHNICAL_MANAGER') {
      return this.reportsService.getTechnicalManagerDashboard(user.id);
    }
    return this.reportsService.getDashboardSummary(period, startDate, endDate, clientId, brandId, productId, departmentId, employeeId, projectId, status, search);
  }

  @Get('search')
  getGlobalSearch(@Query('q') q: string) {
    return this.reportsService.getGlobalSearch(q);
  }

  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER)
  @Get('production')
  getProductionReports(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('clientId') clientId?: string,
    @Query('brandId') brandId?: string,
    @Query('productId') productId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string
  ) {
    return this.reportsService.getProductionReports(period, startDate, endDate, clientId, brandId, productId, departmentId, employeeId, projectId, status, search);
  }

  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER)
  @Get('script-analytics')
  getScriptAnalytics(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('clientId') clientId?: string,
    @Query('brandId') brandId?: string,
    @Query('productId') productId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string
  ) {
    return this.reportsService.getScriptAnalytics(period, startDate, endDate, clientId, brandId, productId, departmentId, employeeId, projectId, status, search);
  }

  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER)
  @Get('graphic-analytics')
  getGraphicAnalytics(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('clientId') clientId?: string,
    @Query('brandId') brandId?: string,
    @Query('productId') productId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string
  ) {
    return this.reportsService.getGraphicAnalytics(period, startDate, endDate, clientId, brandId, productId, departmentId, employeeId, projectId, status, search);
  }

  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER)
  @Get('productivity')
  getEmployeeProductivityReport(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('clientId') clientId?: string,
    @Query('brandId') brandId?: string,
    @Query('productId') productId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string
  ) {
    return this.reportsService.getEmployeeProductivityReport(period, startDate, endDate, clientId, brandId, productId, departmentId, employeeId, projectId, status, search);
  }

  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER)
  @Get('employee-analytics')
  getEmployeeAnalyticsReport(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('clientId') clientId?: string,
    @Query('brandId') brandId?: string,
    @Query('productId') productId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string
  ) {
    return this.reportsService.getEmployeeAnalyticsReport(period, startDate, endDate, clientId, brandId, productId, departmentId, employeeId, projectId, status, search);
  }

  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER)
  @Get('brands')
  getBrandPerformanceReports(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('clientId') clientId?: string,
    @Query('brandId') brandId?: string,
    @Query('productId') productId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string
  ) {
    return this.reportsService.getBrandPerformanceReports(period, startDate, endDate, clientId, brandId, productId, departmentId, employeeId, projectId, status, search);
  }

  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER)
  @Get('clients')
  getClientPerformanceReports(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('clientId') clientId?: string,
    @Query('brandId') brandId?: string,
    @Query('productId') productId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string
  ) {
    return this.reportsService.getClientPerformanceReports(period, startDate, endDate, clientId, brandId, productId, departmentId, employeeId, projectId, status, search);
  }

  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER)
  @Get('products')
  getProductPerformanceReports(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('clientId') clientId?: string,
    @Query('brandId') brandId?: string,
    @Query('productId') productId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string
  ) {
    return this.reportsService.getProductPerformanceReports(period, startDate, endDate, clientId, brandId, productId, departmentId, employeeId, projectId, status, search);
  }

  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER)
  @Get('departments')
  getDepartmentPerformanceReports(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('clientId') clientId?: string,
    @Query('brandId') brandId?: string,
    @Query('productId') productId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string
  ) {
    return this.reportsService.getDepartmentPerformanceReports(period, startDate, endDate, clientId, brandId, productId, departmentId, employeeId, projectId, status, search);
  }

  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER)
  @Get('projects')
  getProjectPerformanceReports(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('clientId') clientId?: string,
    @Query('brandId') brandId?: string,
    @Query('productId') productId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string
  ) {
    return this.reportsService.getProjectPerformanceReports(period, startDate, endDate, clientId, brandId, productId, departmentId, employeeId, projectId, status, search);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Get('attendance-analytics')
  getAttendanceAnalyticsReport(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getAttendanceAnalyticsReport(period, startDate, endDate);
  }

  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER)
  @Get('equipment')
  getEquipmentPerformanceReports(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('clientId') clientId?: string,
    @Query('brandId') brandId?: string,
    @Query('productId') productId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string
  ) {
    return this.reportsService.getEquipmentPerformanceReports(period, startDate, endDate, clientId, brandId, productId, departmentId, employeeId, projectId, status, search);
  }

  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER)
  @Get('approvals')
  getApprovalPerformanceReports(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('clientId') clientId?: string,
    @Query('brandId') brandId?: string,
    @Query('productId') productId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string
  ) {
    return this.reportsService.getApprovalPerformanceReports(period, startDate, endDate, clientId, brandId, productId, departmentId, employeeId, projectId, status, search);
  }

  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER)
  @Get('capacity')
  getCapacityPerformanceReports(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('clientId') clientId?: string,
    @Query('brandId') brandId?: string,
    @Query('productId') productId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string
  ) {
    return this.reportsService.getCapacityPerformanceReports(period, startDate, endDate, clientId, brandId, productId, departmentId, employeeId, projectId, status, search);
  }

  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER)
  @Get('revisions')
  getRevisionPerformanceReports(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('clientId') clientId?: string,
    @Query('brandId') brandId?: string,
    @Query('productId') productId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string
  ) {
    return this.reportsService.getRevisionPerformanceReports(period, startDate, endDate, clientId, brandId, productId, departmentId, employeeId, projectId, status, search);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Get('timelines')
  getTimelinePerformanceReports(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('clientId') clientId?: string,
    @Query('brandId') brandId?: string,
    @Query('productId') productId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string
  ) {
    return this.reportsService.getTimelinePerformanceReports(period, startDate, endDate, clientId, brandId, productId, departmentId, employeeId, projectId, status, search);
  }
}
