import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { MembersService } from './members.service';

@Controller('fitness/members')
@UseGuards(JwtAuthGuard)
export class MembersController {
  constructor(private service: MembersService) {}

  @Get()
  findAll(@Req() req: any, @Query() query: any) {
    return this.service.findAll(req.user.tenantId, query);
  }

  @Get('stats')
  stats(@Req() req: any, @Query('branchId') branchId?: string) {
    return this.service.getStats(req.user.tenantId, branchId);
  }

  @Get('me')
  getMine(@Req() req: any) {
    return this.service.findByUserId(req.user.tenantId, req.user.id);
  }

  /** A member updating their OWN profile (mobile onboarding). */
  @Put('me')
  updateMine(@Req() req: any, @Body() dto: any) {
    return this.service.updateByUserId(req.user.tenantId, req.user.id, dto);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user.tenantId, id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.service.create(req.user.tenantId, dto);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.update(req.user.tenantId, id, dto);
  }

  @Post(':id/verify')
  verify(@Req() req: any, @Param('id') id: string) {
    return this.service.verify(req.user.tenantId, id, req.user.id);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.service.delete(req.user.tenantId, id);
  }
}
