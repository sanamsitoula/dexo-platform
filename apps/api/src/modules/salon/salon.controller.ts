import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { RequireModule } from '@dexo/shared';
import { SalonService } from './salon.service';

@Controller('salon')
@UseGuards(JwtAuthGuard)
@RequireModule('salon')
export class SalonController {
  constructor(private salon: SalonService) {}

  // Services
  @Get('services')
  listServices(@Req() req: any) {
    return this.salon.listServices(req.user.tenantId);
  }

  @Post('services')
  createService(@Req() req: any, @Body() dto: any) {
    return this.salon.createService(req.user.tenantId, dto);
  }

  @Put('services/:id')
  updateService(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.salon.updateService(req.user.tenantId, id, dto);
  }

  @Delete('services/:id')
  deleteService(@Req() req: any, @Param('id') id: string) {
    return this.salon.deleteService(req.user.tenantId, id);
  }

  // Stylists
  @Get('stylists')
  listStylists(@Req() req: any) {
    return this.salon.listStylists(req.user.tenantId);
  }

  @Post('stylists')
  createStylist(@Req() req: any, @Body() dto: any) {
    return this.salon.createStylist(req.user.tenantId, dto);
  }

  @Put('stylists/:id')
  updateStylist(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.salon.updateStylist(req.user.tenantId, id, dto);
  }

  @Delete('stylists/:id')
  deleteStylist(@Req() req: any, @Param('id') id: string) {
    return this.salon.deleteStylist(req.user.tenantId, id);
  }

  // Appointments
  @Get('appointments')
  listAppointments(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('stylistId') stylistId?: string,
    @Query('date') date?: string,
  ) {
    return this.salon.listAppointments(req.user.tenantId, { status, stylistId, date });
  }

  @Post('appointments')
  createAppointment(@Req() req: any, @Body() dto: any) {
    return this.salon.createAppointment(req.user.tenantId, dto);
  }

  @Put('appointments/:id/status')
  updateAppointmentStatus(@Req() req: any, @Param('id') id: string, @Body('status') status: string) {
    return this.salon.updateAppointmentStatus(req.user.tenantId, id, status);
  }
}
