import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { ClassBookingsService } from './class-bookings.service';

@Controller('fitness/bookings')
@UseGuards(JwtAuthGuard)
export class ClassBookingsController {
  constructor(private service: ClassBookingsService) {}

  @Get()
  findAll(@Req() req: any, @Query() query: any) {
    return this.service.findAll(req.user.tenantId, query);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user.tenantId, id);
  }

  @Post()
  book(@Req() req: any, @Body() dto: any) {
    return this.service.book(req.user.tenantId, dto);
  }

  @Post(':id/cancel')
  cancel(@Req() req: any, @Param('id') id: string) {
    return this.service.cancel(req.user.tenantId, id);
  }

  @Post(':id/attend')
  attend(@Req() req: any, @Param('id') id: string) {
    return this.service.markAttended(req.user.tenantId, id);
  }
}
