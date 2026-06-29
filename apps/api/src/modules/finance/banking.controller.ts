import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { BankingService } from './banking.service';

@Controller('finance/banks')
@UseGuards(JwtAuthGuard)
export class BankingController {
  constructor(private bankingService: BankingService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.bankingService.findAll(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.bankingService.findOne(req.user.tenantId, id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.bankingService.create(req.user.tenantId, dto);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.bankingService.update(req.user.tenantId, id, dto);
  }

  @Get(':id/statement')
  getStatement(
    @Req() req: any,
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.bankingService.getStatement(req.user.tenantId, id, startDate, endDate);
  }
}
