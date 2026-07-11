import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { BillsService } from './bills.service';
import { RequireModule } from '../../common/guards/module-access.guard';

@Controller('finance/bills')
@UseGuards(JwtAuthGuard)
@RequireModule('billing_invoice')
export class BillsController {
  constructor(private billsService: BillsService) {}

  @Get()
  findAll(
    @Req() req: any,
    @Query('billType') billType?: string,
    @Query('supplierId') supplierId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.billsService.findAll(req.user.tenantId, { billType, supplierId, startDate, endDate });
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.billsService.findOne(req.user.tenantId, id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.billsService.createPurchaseBill(req.user.tenantId, dto, req.user.id);
  }

  /** Purchase return: raises a DEBIT_NOTE bill against a PURCHASE bill. */
  @Post(':id/debit-note')
  createDebitNote(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.billsService.createDebitNote(req.user.tenantId, id, dto, req.user.id);
  }
}
