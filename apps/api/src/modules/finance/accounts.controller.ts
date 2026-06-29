import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { AccountsService } from './accounts.service';

@Controller('finance/accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private accountsService: AccountsService) {}

  @Get()
  findAll(@Req() req: any, @Query('type') type?: string) {
    return this.accountsService.findAll(req.user.tenantId, type);
  }

  @Get('trial-balance')
  getTrialBalance(@Req() req: any, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.accountsService.getTrialBalance(req.user.tenantId, startDate, endDate);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.accountsService.findOne(req.user.tenantId, id);
  }

  @Get(':id/balance')
  getBalance(@Req() req: any, @Param('id') id: string, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.accountsService.getBalance(req.user.tenantId, id, startDate, endDate);
  }

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.accountsService.create(req.user.tenantId, dto, req.user.id);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.accountsService.update(req.user.tenantId, id, dto);
  }
}
