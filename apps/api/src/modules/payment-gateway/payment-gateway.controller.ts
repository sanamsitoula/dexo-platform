import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@dexo/auth';
import { PaymentGatewayService } from './payment-gateway.service';

@ApiTags('Payment Gateway')
@Controller('payment-gateway')
export class PaymentGatewayController {
  constructor(private paymentGatewayService: PaymentGatewayService) {}

  @Get('providers')
  @ApiOperation({ summary: 'Get available provider types' })
  getAvailableProviders() {
    return {
      providers: this.paymentGatewayService.getAvailableProviders(),
    };
  }

  @Get('tenant/providers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tenant configured providers' })
  async getTenantProviders(@Req() req: any) {
    return this.paymentGatewayService.getTenantProviders(req.user.tenantId);
  }

  @Post('tenant/providers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Configure a payment provider for tenant' })
  async configureProvider(
    @Req() req: any,
    @Body() body: {
      type: string;
      name: string;
      credentials: Record<string, any>;
      config?: Record<string, any>;
      isDefault?: boolean;
      transactionFeePercent?: number;
      fixedFee?: number;
      supportedCurrencies?: string[];
    },
  ) {
    return this.paymentGatewayService.configureProvider(req.user.tenantId, body);
  }

  @Post('init')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initialize a payment' })
  async initPayment(
    @Req() req: any,
    @Body() body: {
      providerType: string;
      orderId: string;
      amount: number;
      currency?: string;
      description?: string;
      customerEmail?: string;
      customerPhone?: string;
      customerName?: string;
      successUrl: string;
      failureUrl: string;
      cancelUrl?: string;
      callbackUrl?: string;
      metadata?: Record<string, any>;
    },
  ) {
    const { providerType, ...request } = body;
    return this.paymentGatewayService.initPayment(
      req.user.tenantId,
      providerType,
      {
        ...request,
        metadata: {
          ...request.metadata,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      },
    );
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify a payment' })
  async verifyPayment(
    @Req() req: any,
    @Body() body: {
      providerType: string;
      providerTxnId: string;
      orderId: string;
      amount?: number;
      rawParams?: Record<string, any>;
    },
  ) {
    const { providerType, ...request } = body;
    return this.paymentGatewayService.verifyPayment(
      req.user.tenantId,
      providerType,
      request,
    );
  }

  @Post('refund')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refund a payment' })
  async refundPayment(
    @Req() req: any,
    @Body() body: {
      providerType: string;
      providerTxnId: string;
      amount: number;
      reason?: string;
    },
  ) {
    const { providerType, ...request } = body;
    return this.paymentGatewayService.refundPayment(
      req.user.tenantId,
      providerType,
      request,
    );
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment transactions' })
  async getTransactions(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('providerType') providerType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const filters: any = {};
    if (status) filters.status = status;
    if (providerType) filters.providerType = providerType;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    return this.paymentGatewayService.getTransactions(req.user.tenantId, filters);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment statistics' })
  async getStats(@Req() req: any) {
    return this.paymentGatewayService.getStats(req.user.tenantId);
  }

  // Callback endpoints for Nepal gateways (no auth required)

  @Post('callback/esewa/:tenantId')
  @ApiOperation({ summary: 'eSewa payment callback' })
  async esewaCallback(
    @Param('tenantId') tenantId: string,
    @Body() body: any,
    @Query() query: any,
  ) {
    const params = { ...body, ...query };
    return this.paymentGatewayService.verifyPayment(tenantId, 'ESEWA', {
      providerTxnId: params.ref_id || params.transaction_code,
      orderId: params.transaction_uuid,
      amount: parseFloat(params.total_amount),
      rawParams: params,
    });
  }

  @Post('callback/fonepay/:tenantId')
  @ApiOperation({ summary: 'Fonepay payment callback' })
  async fonepayCallback(
    @Param('tenantId') tenantId: string,
    @Body() body: any,
    @Query() query: any,
  ) {
    const params = { ...body, ...query };
    return this.paymentGatewayService.verifyPayment(tenantId, 'FONEPAY', {
      providerTxnId: params.UID,
      orderId: params.PRN,
      amount: parseFloat(params.P_AMT || params.AMT),
      rawParams: params,
    });
  }

  @Post('callback/connectips/:tenantId')
  @ApiOperation({ summary: 'ConnectIPS payment callback' })
  async connectIpsCallback(
    @Param('tenantId') tenantId: string,
    @Body() body: any,
    @Query() query: any,
  ) {
    const params = { ...body, ...query };
    return this.paymentGatewayService.verifyPayment(tenantId, 'CONNECTIPS', {
      providerTxnId: params.REFERRALCODE,
      orderId: params.TXNID,
      amount: params.TXNAMT ? parseFloat(params.TXNAMT) / 100 : undefined,
      rawParams: params,
    });
  }
}
