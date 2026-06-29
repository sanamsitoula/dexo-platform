import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@dexo/auth';
import { GlobalizationService } from './globalization.service';

@ApiTags('Globalization')
@Controller('globalization')
export class GlobalizationController {
  constructor(private globalizationService: GlobalizationService) {}

  // Language endpoints
  @Get('languages')
  @ApiOperation({ summary: 'Get all available languages' })
  async getAllLanguages() {
    return this.globalizationService.getAllLanguages();
  }

  @Get('tenant/languages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tenant languages' })
  async getTenantLanguages(@Req() req: any) {
    return this.globalizationService.getTenantLanguages(req.user.tenantId);
  }

  @Post('tenant/languages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set tenant language' })
  async setTenantLanguage(
    @Req() req: any,
    @Body() body: { languageId: string; isDefault?: boolean },
  ) {
    return this.globalizationService.setTenantLanguage(
      req.user.tenantId,
      body.languageId,
      body.isDefault,
    );
  }

  @Delete('tenant/languages/:languageId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove tenant language' })
  async removeTenantLanguage(
    @Req() req: any,
    @Param('languageId') languageId: string,
  ) {
    return this.globalizationService.removeTenantLanguage(req.user.tenantId, languageId);
  }

  // Currency endpoints
  @Get('currencies')
  @ApiOperation({ summary: 'Get all available currencies' })
  async getAllCurrencies() {
    return this.globalizationService.getAllCurrencies();
  }

  @Get('tenant/currencies')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tenant currencies' })
  async getTenantCurrencies(@Req() req: any) {
    return this.globalizationService.getTenantCurrencies(req.user.tenantId);
  }

  @Post('tenant/currencies')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set tenant currency' })
  async setTenantCurrency(
    @Req() req: any,
    @Body() body: { currencyId: string; isDefault?: boolean },
  ) {
    return this.globalizationService.setTenantCurrency(
      req.user.tenantId,
      body.currencyId,
      body.isDefault,
    );
  }

  @Delete('tenant/currencies/:currencyId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove tenant currency' })
  async removeTenantCurrency(
    @Req() req: any,
    @Param('currencyId') currencyId: string,
  ) {
    return this.globalizationService.removeTenantCurrency(req.user.tenantId, currencyId);
  }

  // Exchange rate endpoints
  @Get('exchange-rates')
  @ApiOperation({ summary: 'Get exchange rates' })
  async getExchangeRates(
    @Query('fromCurrencyId') fromCurrencyId?: string,
    @Query('toCurrencyId') toCurrencyId?: string,
  ) {
    return this.globalizationService.getExchangeRates(fromCurrencyId, toCurrencyId);
  }

  @Post('exchange-rates')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create exchange rate' })
  async createExchangeRate(@Body() body: {
    fromCurrencyId: string;
    toCurrencyId: string;
    rate: number;
    source?: string;
    validFrom?: Date;
    validTo?: Date;
  }) {
    return this.globalizationService.createExchangeRate(body);
  }

  // Tax rate endpoints
  @Get('tenant/tax-rates')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tenant tax rates' })
  async getTenantTaxRates(@Req() req: any) {
    return this.globalizationService.getTenantTaxRates(req.user.tenantId);
  }

  @Post('tenant/tax-rates')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create tax rate' })
  async createTaxRate(
    @Req() req: any,
    @Body() body: {
      name: string;
      code: string;
      rate: number;
      type: string;
      isCompound?: boolean;
      parentTaxRateId?: string;
      governmentCode?: string;
    },
  ) {
    return this.globalizationService.createTaxRate(req.user.tenantId, body);
  }

  @Put('tenant/tax-rates/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update tax rate' })
  async updateTaxRate(
    @Param('id') id: string,
    @Body() body: Partial<{
      name: string;
      code: string;
      rate: number;
      type: string;
      isActive: boolean;
      governmentCode: string;
    }>,
  ) {
    return this.globalizationService.updateTaxRate(id, body);
  }

  // Tax group endpoints
  @Get('tenant/tax-groups')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tenant tax groups' })
  async getTenantTaxGroups(@Req() req: any) {
    return this.globalizationService.getTenantTaxGroups(req.user.tenantId);
  }

  @Post('tenant/tax-groups')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create tax group' })
  async createTaxGroup(
    @Req() req: any,
    @Body() body: {
      name: string;
      description?: string;
      taxRateIds?: string[];
    },
  ) {
    return this.globalizationService.createTaxGroup(req.user.tenantId, body);
  }

  // Voucher endpoints
  @Get('vouchers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get vouchers' })
  async getVouchers(
    @Req() req: any,
    @Query('status') status?: string,
  ) {
    const filters: any = {};
    if (status) filters.status = status;
    if (!req.user.isPlatformAdmin) {
      filters.tenantId = req.user.tenantId;
    }
    return this.globalizationService.getVouchers(filters);
  }

  @Post('vouchers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create voucher' })
  async createVoucher(
    @Req() req: any,
    @Body() body: {
      code: string;
      description?: string;
      type: string;
      value: number;
      maxDiscount?: number;
      minPurchase?: number;
      currency?: string;
      usageLimit?: number;
      perUserLimit?: number;
      planId?: string;
      tenantId?: string;
      startsAt?: Date;
      expiresAt?: Date;
    },
  ) {
    // Platform admins can create vouchers for any tenant
    if (!req.user.isPlatformAdmin && !body.tenantId) {
      body.tenantId = req.user.tenantId;
    }
    return this.globalizationService.createVoucher(body);
  }

  @Post('vouchers/:id/redeem')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Redeem voucher' })
  async redeemVoucher(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { orderId?: string },
  ) {
    return this.globalizationService.redeemVoucher(
      id,
      req.user.email,
      req.user.id,
      body.orderId,
    );
  }

  // Coupon endpoints
  @Get('tenant/coupons')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tenant coupons' })
  async getTenantCoupons(@Req() req: any) {
    return this.globalizationService.getTenantCoupons(req.user.tenantId);
  }

  @Post('tenant/coupons')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create coupon' })
  async createCoupon(
    @Req() req: any,
    @Body() body: {
      code: string;
      name: string;
      description?: string;
      type: string;
      value: number;
      maxDiscount?: number;
      minPurchase?: number;
      currency?: string;
      usageLimit?: number;
      perUserLimit?: number;
      appliesTo?: any;
      customerSegment?: any;
      startsAt?: Date;
      expiresAt?: Date;
    },
  ) {
    return this.globalizationService.createCoupon(req.user.tenantId, body);
  }

  @Post('tenant/coupons/:id/redeem')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Redeem coupon' })
  async redeemCoupon(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { orderId?: string },
  ) {
    return this.globalizationService.redeemCoupon(
      id,
      req.user.email,
      req.user.id,
      body.orderId,
    );
  }

  // Marketing campaign endpoints
  @Get('tenant/campaigns')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tenant campaigns' })
  async getTenantCampaigns(@Req() req: any) {
    return this.globalizationService.getTenantCampaigns(req.user.tenantId);
  }

  @Post('tenant/campaigns')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create campaign' })
  async createCampaign(
    @Req() req: any,
    @Body() body: {
      name: string;
      type: string;
      subject?: string;
      content?: any;
      templateId?: string;
      targetSegment?: any;
      scheduledAt?: Date;
      budget?: number;
    },
  ) {
    return this.globalizationService.createCampaign(req.user.tenantId, body);
  }

  @Put('tenant/campaigns/:id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update campaign status' })
  async updateCampaignStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.globalizationService.updateCampaignStatus(id, body.status);
  }

  // Lead endpoints
  @Get('tenant/leads')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tenant leads' })
  async getTenantLeads(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('assignedToId') assignedToId?: string,
  ) {
    const filters: any = {};
    if (status) filters.status = status;
    if (assignedToId) filters.assignedToId = assignedToId;
    return this.globalizationService.getTenantLeads(req.user.tenantId, filters);
  }

  @Post('tenant/leads')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create lead' })
  async createLead(
    @Req() req: any,
    @Body() body: {
      name: string;
      email?: string;
      phone?: string;
      company?: string;
      source?: string;
      assignedToId?: string;
      contactPerson?: string;
      notes?: string;
      tags?: string[];
      value?: number;
    },
  ) {
    return this.globalizationService.createLead(req.user.tenantId, body);
  }

  @Put('tenant/leads/:id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update lead status' })
  async updateLeadStatus(
    @Param('id') id: string,
    @Body() body: { status: string; notes?: string },
  ) {
    return this.globalizationService.updateLeadStatus(id, body.status, body.notes);
  }

  @Post('tenant/leads/:id/activities')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add lead activity' })
  async addLeadActivity(
    @Param('id') id: string,
    @Body() body: {
      type: string;
      description: string;
      performedBy?: string;
    },
  ) {
    return this.globalizationService.addLeadActivity(id, body);
  }

  // Brand endpoints
  @Get('tenant/brand/assets')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tenant brand assets' })
  async getTenantBrandAssets(
    @Req() req: any,
    @Query('type') type?: string,
  ) {
    return this.globalizationService.getTenantBrandAssets(req.user.tenantId, type);
  }

  @Post('tenant/brand/assets')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create brand asset' })
  async createBrandAsset(
    @Req() req: any,
    @Body() body: {
      name: string;
      type: string;
      description?: string;
      fileUrl: string;
      fileSize?: number;
      mimeType?: string;
      width?: number;
      height?: number;
      tags?: string[];
      isPrimary?: boolean;
      metadata?: any;
    },
  ) {
    return this.globalizationService.createBrandAsset(req.user.tenantId, {
      ...body,
      uploadedBy: req.user.id,
    });
  }

  @Get('tenant/brand/guidelines')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tenant brand guidelines' })
  async getTenantBrandGuidelines(@Req() req: any) {
    return this.globalizationService.getTenantBrandGuidelines(req.user.tenantId);
  }

  @Post('tenant/brand/guidelines')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create brand guideline' })
  async createBrandGuideline(
    @Req() req: any,
    @Body() body: {
      name: string;
      category: string;
      description: string;
      rules: any;
      examples?: any;
      doExamples?: string[];
      dontExamples?: string[];
    },
  ) {
    return this.globalizationService.createBrandGuideline(req.user.tenantId, body);
  }

  @Get('tenant/brand/voice')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tenant brand voice' })
  async getTenantBrandVoice(@Req() req: any) {
    return this.globalizationService.getTenantBrandVoice(req.user.tenantId);
  }

  @Put('tenant/brand/voice')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update brand voice' })
  async upsertBrandVoice(
    @Req() req: any,
    @Body() body: {
      purpose?: string;
      mission?: string;
      vision?: string;
      values?: string[];
      personality?: any;
      toneGuide?: any;
      writingStyle?: any;
      terminology?: any;
      targetAudience?: any;
      positioning?: string;
      tagline?: string;
    },
  ) {
    return this.globalizationService.upsertBrandVoice(req.user.tenantId, body);
  }
}
