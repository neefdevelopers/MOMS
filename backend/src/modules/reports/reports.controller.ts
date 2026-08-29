import { Controller, Get, Post, Body, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums';
import { isReportAllowedForRole } from '../../common/permissions/report-permissions';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('audit-export')
  logDataExport(
    @Body() body: { reportType: string; format: string; recordCount?: number; filters?: any },
    @CurrentUser() user: any,
  ) {
    if (body.reportType && !isReportAllowedForRole(body.reportType.toUpperCase(), user.role)) {
      throw new ForbiddenException('You do not have permission to export this report.');
    }
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
    // Staff users can ONLY access their own employee metrics; override employeeId parameter
    const effectiveEmpId = user.role === Role.STAFF ? user.id : (employeeId || user.id);
    return this.reportsService.getPersonalizedDashboard(effectiveEmpId, period, startDate, endDate, clientId, brandId, productId, departmentId, effectiveEmpId, projectId, status, search);
  }

  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER, Role.ADMINISTRATOR)
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
    if (user?.role === Role.STAFF) {
      return this.reportsService.getPersonalizedDashboard(user.id, period, startDate, endDate, clientId, brandId, productId, departmentId, user.id, projectId, status, search);
    }
    if (user?.role === Role.TECHNICAL_MANAGER) {
      return this.reportsService.getTechnicalManagerDashboard(user.id);
    }
    return this.reportsService.getDashboardSummary(period, startDate, endDate, clientId, brandId, productId, departmentId, employeeId, projectId, status, search);
  }

  @Get('search')
  getGlobalSearch(@Query('q') q: string, @CurrentUser() user: any) {
    return this.reportsService.getGlobalSearch(q, user);
  }

  @Roles(Role.MEDIA_MANAGER, Role.ADMINISTRATOR)
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

  @Roles(Role.MEDIA_MANAGER, Role.ADMINISTRATOR)
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

  @Roles(Role.MEDIA_MANAGER, Role.ADMINISTRATOR)
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

  @Roles(Role.MEDIA_MANAGER, Role.ADMINISTRATOR)
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

  @Roles(Role.MEDIA_MANAGER, Role.ADMINISTRATOR)
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

  @Roles(Role.MEDIA_MANAGER, Role.ADMINISTRATOR)
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

  @Roles(Role.MEDIA_MANAGER, Role.ADMINISTRATOR)
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

  @Roles(Role.MEDIA_MANAGER, Role.ADMINISTRATOR)
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

  @Roles(Role.MEDIA_MANAGER, Role.ADMINISTRATOR)
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

  @Roles(Role.MEDIA_MANAGER, Role.ADMINISTRATOR)
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

  @Roles(Role.MEDIA_MANAGER, Role.ADMINISTRATOR)
  @Get('attendance-analytics')
  getAttendanceAnalyticsReport(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getAttendanceAnalyticsReport(period, startDate, endDate);
  }

  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER, Role.ADMINISTRATOR)
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

  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER, Role.ADMINISTRATOR)
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

  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER, Role.ADMINISTRATOR)
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

  @Roles(Role.MEDIA_MANAGER, Role.TECHNICAL_MANAGER, Role.ADMINISTRATOR)
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

  @Roles(Role.MEDIA_MANAGER, Role.ADMINISTRATOR)
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
