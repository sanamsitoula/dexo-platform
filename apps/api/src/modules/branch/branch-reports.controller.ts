import { Controller, Get, Post, Param, Query, UseGuards, Req, Body } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { BranchReportsService } from './branch-reports.service';

@Controller('branches/reports')
@UseGuards(JwtAuthGuard)
export class BranchReportsController {
  constructor(private branchReportsService: BranchReportsService) {}

  @Get('all')
  getAllBranchesReport(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.branchReportsService.getAllBranchesReport(req.user.tenantId, { startDate, endDate });
  }

  @Get(':branchId/overview')
  getBranchOverview(
    @Req() req: any,
    @Param('branchId') branchId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.branchReportsService.getBranchOverview(req.user.tenantId, branchId, { startDate, endDate });
  }

  @Get(':branchId/staff')
  getStaffPerformance(
    @Req() req: any,
    @Param('branchId') branchId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.branchReportsService.getStaffPerformanceReport(req.user.tenantId, branchId, { startDate, endDate });
  }

  @Get(':branchId/revenue')
  getBranchRevenue(
    @Req() req: any,
    @Param('branchId') branchId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.branchReportsService.getBranchRevenue(
      req.user.tenantId,
      branchId,
      startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30)),
      endDate ? new Date(endDate) : new Date(),
    );
  }

  @Get(':branchId/expenses')
  getBranchExpenses(
    @Req() req: any,
    @Param('branchId') branchId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.branchReportsService.getBranchExpenses(
      req.user.tenantId,
      branchId,
      startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30)),
      endDate ? new Date(endDate) : new Date(),
    );
  }

  @Post(':branchId/save')
  saveReport(
    @Req() req: any,
    @Param('branchId') branchId: string,
    @Body() body: { reportType: string; period: string; data: any },
  ) {
    return this.branchReportsService.saveReport(
      req.user.tenantId,
      branchId,
      body.reportType,
      body.period,
      body.data,
      req.user.id,
    );
  }

  @Get(':branchId/saved')
  getSavedReports(
    @Req() req: any,
    @Param('branchId') branchId: string,
    @Query('reportType') reportType?: string,
    @Query('period') period?: string,
  ) {
    return this.branchReportsService.getSavedReports(req.user.tenantId, branchId, { reportType, period });
  }
}
