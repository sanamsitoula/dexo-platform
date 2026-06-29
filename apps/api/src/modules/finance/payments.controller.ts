import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { PaymentsService } from './payments.service';

@Controller('finance/payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get('received')
  findAllReceived(
    @Req() req: any,
    @Query('customerId') customerId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.paymentsService.findAllReceived(req.user.tenantId, { customerId, startDate, endDate });
  }

  @Get('received/:id')
  findOneReceived(@Req() req: any, @Param('id') id: string) {
    return this.paymentsService.findOneReceived(req.user.tenantId, id);
  }

  @Post('received')
  createReceived(@Req() req: any, @Body() dto: any) {
    return this.paymentsService.createReceived(req.user.tenantId, dto, req.user.id);
  }

  @Post('received/:id/allocate')
  allocatePayment(@Req() req: any, @Param('id') id: string, @Body('allocations') allocations: any) {
    return this.paymentsService.allocatePayment(req.user.tenantId, id, allocations, req.user.id);
  }

  @Get('made')
  findAllMade(
    @Req() req: any,
    @Query('payeeType') payeeType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.paymentsService.findAllMade(req.user.tenantId, { payeeType, startDate, endDate });
  }

  @Get('made/:id')
  findOneMade(@Req() req: any, @Param('id') id: string) {
    return this.paymentsService.findOneMade(req.user.tenantId, id);
  }

  @Post('made')
  createMade(@Req() req: any, @Body() dto: any) {
    return this.paymentsService.createMade(req.user.tenantId, dto, req.user.id);
  }
}
