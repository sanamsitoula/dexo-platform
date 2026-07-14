import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { MembershipPlansService } from './membership-plans.service';

@Controller('fitness/membership-plans')
@UseGuards(JwtAuthGuard)
export class MembershipPlansController {
  constructor(private service: MembershipPlansService) {}

  @Get()
  findAll(@Req() req: any, @Query() query: any) {
    // Express/Nest query params always arrive as strings (`?active=true` ->
    // the string "true", not the boolean `true`) — passing that straight to
    // Prisma's `isActive: Boolean` filter throws a validation error, which is
    // exactly what silently broke the member-app's `?active=true` plan fetch
    // (portal called this with the filter, admin's own list call never did,
    // making it look like the two were reading different data entirely).
    const active = query?.active === undefined ? undefined : query.active === 'true' || query.active === true;
    return this.service.findAll(req.user.tenantId, { ...query, active });
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

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.service.delete(req.user.tenantId, id);
  }
}
