import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { BranchService } from './branch.service';

@Controller('branches')
@UseGuards(JwtAuthGuard)
export class BranchController {
  constructor(private branchService: BranchService) {}

  // ===================== BRANCH CRUD =====================

  @Get()
  findAll(@Req() req: any, @Query('status') status?: string, @Query('type') type?: string) {
    return this.branchService.findAll(req.user.tenantId, { status, type });
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.branchService.findOne(req.user.tenantId, id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.branchService.create(req.user.tenantId, dto);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.branchService.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.branchService.delete(req.user.tenantId, id);
  }

  // ===================== BRANCH USERS =====================

  @Get(':id/users')
  getBranchUsers(@Req() req: any, @Param('id') id: string) {
    return this.branchService.getBranchUsers(req.user.tenantId, id);
  }

  @Post(':id/users')
  assignUser(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.branchService.assignUserToBranch(req.user.tenantId, id, dto);
  }

  @Delete(':id/users/:userId')
  removeUser(@Req() req: any, @Param('id') id: string, @Param('userId') userId: string) {
    return this.branchService.removeUserFromBranch(req.user.tenantId, id, userId);
  }

  // ===================== BRANCH SCHEDULES =====================

  @Post(':id/schedules')
  createSchedule(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.branchService.createSchedule(req.user.tenantId, id, dto);
  }

  @Get(':id/schedules')
  getSchedules(
    @Req() req: any,
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.branchService.getBranchSchedules(req.user.tenantId, id, { startDate, endDate });
  }

  // ===================== BRANCH EXPENSES =====================

  @Post(':id/expenses')
  createExpense(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.branchService.createExpense(req.user.tenantId, id, dto);
  }

  @Get(':id/expenses')
  getExpenses(
    @Req() req: any,
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.branchService.getBranchExpenses(req.user.tenantId, id, { startDate, endDate });
  }
}
