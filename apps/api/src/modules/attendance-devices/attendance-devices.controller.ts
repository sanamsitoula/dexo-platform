import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, PlatformAdminGuard } from '@dexo/auth';
import { AttendanceDevicesService } from './attendance-devices.service';
import { AttendanceReportsService } from './attendance-reports.service';

@Controller('attendance-devices')
@UseGuards(JwtAuthGuard)
export class AttendanceDevicesController {
  constructor(private devices: AttendanceDevicesService) {}

  // Platform admin (cross-tenant) — must precede :id routes.
  @Get('admin/all')
  @UseGuards(PlatformAdminGuard)
  adminOverview() {
    return this.devices.adminOverview();
  }

  @Get('admin/sessions')
  @UseGuards(PlatformAdminGuard)
  adminSessions() {
    return this.devices.adminSessions();
  }

  @Get('sessions')
  sessions(@Req() req: any, @Query('deviceId') deviceId?: string) {
    return this.devices.sessions(req.user.tenantId, deviceId);
  }

  @Post('pull-all')
  pullAll(@Req() req: any) {
    return this.devices.pullAll(req.user.tenantId);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.devices.findAll(req.user.tenantId);
  }

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.devices.create(req.user.tenantId, dto);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.devices.findOne(req.user.tenantId, id);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.devices.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.devices.remove(req.user.tenantId, id);
  }

  @Post(':id/pull')
  pull(@Req() req: any, @Param('id') id: string) {
    return this.devices.pull(req.user.tenantId, id);
  }

  @Post(':id/test')
  test(@Req() req: any, @Param('id') id: string) {
    return this.devices.testConnection(req.user.tenantId, id);
  }
}

@Controller('attendance-logs')
@UseGuards(JwtAuthGuard)
export class AttendanceLogsController {
  constructor(private devices: AttendanceDevicesService) {}

  @Get('me')
  myLogs(@Req() req: any, @Query('days') days?: string) {
    return this.devices.myLogs(req.user.tenantId, req.user.id, days ? Number(days) : 60);
  }

  @Get()
  logs(@Req() req: any, @Query() q: any) {
    return this.devices.logs(req.user.tenantId, q);
  }
}

@Controller('attendance-reports')
@UseGuards(JwtAuthGuard)
export class AttendanceReportsController {
  constructor(private reports: AttendanceReportsService) {}

  @Get('daily')
  daily(@Req() req: any, @Query('date') date?: string) {
    return this.reports.daily(req.user.tenantId, date);
  }

  @Get('monthly')
  monthly(@Req() req: any, @Query('month') month?: string) {
    return this.reports.monthly(req.user.tenantId, month);
  }

  @Get('summary')
  summary(@Req() req: any, @Query('days') days?: string) {
    return this.reports.summary(req.user.tenantId, days ? Number(days) : 14);
  }
}
