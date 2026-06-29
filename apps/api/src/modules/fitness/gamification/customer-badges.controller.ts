import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { CustomerBadgesService } from './customer-badges.service';

@Controller('fitness/customer-badges')
@UseGuards(JwtAuthGuard)
export class CustomerBadgesController {
  constructor(private service: CustomerBadgesService) {}

  @Get('member/:memberId')
  findMemberBadges(@Req() req: any, @Param('memberId') memberId: string) {
    return this.service.findMemberBadges(req.user.tenantId, memberId);
  }

  @Post('award')
  award(@Req() req: any, @Body() dto: any) {
    return this.service.award(req.user.tenantId, dto);
  }

  @Post('check/streak/:memberId')
  checkStreak(@Req() req: any, @Param('memberId') memberId: string) {
    return this.service.checkAndAwardStreak(req.user.tenantId, memberId);
  }

  @Post('check/milestones/:memberId')
  checkMilestones(@Req() req: any, @Param('memberId') memberId: string) {
    return this.service.checkAndAwardMilestones(req.user.tenantId, memberId);
  }

  @Delete(':id')
  revoke(@Req() req: any, @Param('id') id: string) {
    return this.service.revoke(req.user.tenantId, id);
  }
}
