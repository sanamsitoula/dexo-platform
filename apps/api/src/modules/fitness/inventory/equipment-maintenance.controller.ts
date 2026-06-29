import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { EquipmentMaintenanceService } from './equipment-maintenance.service';

@Controller('fitness/equipment-maintenance')
@UseGuards(JwtAuthGuard)
export class EquipmentMaintenanceController {
  constructor(private service: EquipmentMaintenanceService) {}

  @Get()
  findAll(@Req() req: any, @Query() query: any) {
    return this.service.findAll(req.user.tenantId, query);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user.tenantId, id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.service.create(req.user.tenantId, dto);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.service.delete(req.user.tenantId, id);
  }
}
