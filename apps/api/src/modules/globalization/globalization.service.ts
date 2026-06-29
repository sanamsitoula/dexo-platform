import { Injectable } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

@Injectable()
export class GlobalizationService {
  constructor(private prisma: PrismaService) {}

  // Language operations
  async getAllLanguages() {
    return this.prisma.language.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getTenantLanguages(tenantId: string) {
    return this.prisma.tenantLanguage.findMany({
      where: { tenantId },
      include: { language: true },
      orderBy: { isDefault: 'desc' },
    });
  }

  async setTenantLanguage(tenantId: string, languageId: string, isDefault: boolean = false) {
    if (isDefault) {
      await this.prisma.tenantLanguage.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.tenantLanguage.upsert({
      where: { tenantId_languageId: { tenantId, languageId } },
      update: { isDefault, isActive: true },
      create: { tenantId, languageId, isDefault },
    });
  }

  async removeTenantLanguage(tenantId: string, languageId: string) {
    return this.prisma.tenantLanguage.delete({
      where: { tenantId_languageId: { tenantId, languageId } },
    });
  }

  // Currency operations
  async getAllCurrencies() {
    return this.prisma.currency.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });
  }

  async getTenantCurrencies(tenantId: string) {
    return this.prisma.tenantCurrency.findMany({
      where: { tenantId },
      include: { currency: true },
      orderBy: { isDefault: 'desc' },
    });
  }

  async setTenantCurrency(tenantId: string, currencyId: string, isDefault: boolean = false) {
    if (isDefault) {
      await this.prisma.tenantCurrency.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.tenantCurrency.upsert({
      where: { tenantId_currencyId: { tenantId, currencyId } },
      update: { isDefault, isActive: true },
      create: { tenantId, currencyId, isDefault },
    });
  }

  async removeTenantCurrency(tenantId: string, currencyId: string) {
    return this.prisma.tenantCurrency.delete({
      where: { tenantId_currencyId: { tenantId, currencyId } },
    });
  }

  // Exchange rate operations
  async getExchangeRates(fromCurrencyId?: string, toCurrencyId?: string) {
    const where: any = { isActive: true };
    if (fromCurrencyId) where.fromCurrencyId = fromCurrencyId;
    if (toCurrencyId) where.toCurrencyId = toCurrencyId;

    return this.prisma.exchangeRate.findMany({
      where,
      include: { fromCurrency: true, toCurrency: true },
      orderBy: { validFrom: 'desc' },
    });
  }

  async createExchangeRate(data: {
    fromCurrencyId: string;
    toCurrencyId: string;
    rate: number;
    source?: string;
    validFrom?: Date;
    validTo?: Date;
  }) {
    return this.prisma.exchangeRate.create({
      data: {
        ...data,
        rate: data.rate,
        source: data.source || 'manual',
      },
      include: { fromCurrency: true, toCurrency: true },
    });
  }

  // Tax rate operations
  async getTenantTaxRates(tenantId: string) {
    return this.prisma.taxRate.findMany({
      where: { tenantId },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  async createTaxRate(tenantId: string, data: {
    name: string;
    code: string;
    rate: number;
    type: string;
    isCompound?: boolean;
    parentTaxRateId?: string;
    governmentCode?: string;
  }) {
    return this.prisma.taxRate.create({
      data: {
        tenantId,
        ...data,
        rate: data.rate,
      },
    });
  }

  async updateTaxRate(id: string, data: Partial<{
    name: string;
    code: string;
    rate: number;
    type: string;
    isActive: boolean;
    governmentCode: string;
  }>) {
    return this.prisma.taxRate.update({
      where: { id },
      data: data.rate !== undefined ? { ...data, rate: data.rate } : data,
    });
  }

  // Tax group operations
  async getTenantTaxGroups(tenantId: string) {
    return this.prisma.taxGroup.findMany({
      where: { tenantId },
      include: {
        taxRates: {
          include: { taxRate: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createTaxGroup(tenantId: string, data: {
    name: string;
    description?: string;
    taxRateIds?: string[];
  }) {
    return this.prisma.taxGroup.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        taxRates: data.taxRateIds
          ? {
              create: data.taxRateIds.map((taxRateId, index) => ({
                taxRateId,
                priority: index,
              })),
            }
          : undefined,
      },
      include: {
        taxRates: {
          include: { taxRate: true },
        },
      },
    });
  }

  // Voucher operations
  async getVouchers(filters?: { status?: string; tenantId?: string }) {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.tenantId) where.tenantId = filters.tenantId;

    return this.prisma.voucher.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createVoucher(data: {
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
  }) {
    return this.prisma.voucher.create({
      data: {
        ...data,
        value: data.value,
        maxDiscount: data.maxDiscount,
        minPurchase: data.minPurchase,
      },
    });
  }

  async redeemVoucher(voucherId: string, email: string, userId?: string, orderId?: string) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id: voucherId },
    });

    if (!voucher) {
      throw new Error('Voucher not found');
    }

    if (voucher.status !== 'ACTIVE') {
      throw new Error('Voucher is not active');
    }

    if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
      throw new Error('Voucher has expired');
    }

    if (voucher.usageLimit && voucher.usageCount >= voucher.usageLimit) {
      throw new Error('Voucher usage limit reached');
    }

    // Check per-user limit
    if (userId && voucher.perUserLimit) {
      const userRedemptions = await this.prisma.voucherRedemption.count({
        where: { voucherId, userId },
      });
      if (userRedemptions >= voucher.perUserLimit) {
        throw new Error('Per-user usage limit reached');
      }
    }

    // Calculate discount
    let discountAmount = 0;
    if (voucher.type === 'PERCENTAGE') {
      discountAmount = voucher.value;
      if (voucher.maxDiscount) {
        discountAmount = Math.min(discountAmount, voucher.maxDiscount);
      }
    } else if (voucher.type === 'FIXED_AMOUNT') {
      discountAmount = Number(voucher.value);
    }

    // Create redemption and increment usage count
    const [redemption] = await this.prisma.$transaction([
      this.prisma.voucherRedemption.create({
        data: {
          voucherId,
          userId,
          email,
          orderId,
          discountAmount,
        },
      }),
      this.prisma.voucher.update({
        where: { id: voucherId },
        data: { usageCount: { increment: 1 } },
      }),
    ]);

    return redemption;
  }

  // Coupon operations
  async getTenantCoupons(tenantId: string) {
    return this.prisma.coupon.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCoupon(tenantId: string, data: {
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
  }) {
    return this.prisma.coupon.create({
      data: {
        tenantId,
        ...data,
        value: data.value,
        maxDiscount: data.maxDiscount,
        minPurchase: data.minPurchase,
      },
    });
  }

  async redeemCoupon(couponId: string, email: string, userId?: string, orderId?: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon) {
      throw new Error('Coupon not found');
    }

    if (coupon.status !== 'ACTIVE') {
      throw new Error('Coupon is not active');
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      throw new Error('Coupon has expired');
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new Error('Coupon usage limit reached');
    }

    // Check per-user limit
    if (userId && coupon.perUserLimit) {
      const userRedemptions = await this.prisma.couponRedemption.count({
        where: { couponId, userId },
      });
      if (userRedemptions >= coupon.perUserLimit) {
        throw new Error('Per-user usage limit reached');
      }
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.type === 'PERCENTAGE') {
      discountAmount = Number(coupon.value);
      if (coupon.maxDiscount) {
        discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount));
      }
    } else if (coupon.type === 'FIXED_AMOUNT') {
      discountAmount = Number(coupon.value);
    }

    // Create redemption and increment usage count
    const [redemption] = await this.prisma.$transaction([
      this.prisma.couponRedemption.create({
        data: {
          couponId,
          userId,
          email,
          orderId,
          discountAmount,
        },
      }),
      this.prisma.coupon.update({
        where: { id: couponId },
        data: { usageCount: { increment: 1 } },
      }),
    ]);

    return redemption;
  }

  // Marketing campaign operations
  async getTenantCampaigns(tenantId: string) {
    return this.prisma.marketingCampaign.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCampaign(tenantId: string, data: {
    name: string;
    type: string;
    subject?: string;
    content?: any;
    templateId?: string;
    targetSegment?: any;
    scheduledAt?: Date;
    budget?: number;
  }) {
    return this.prisma.marketingCampaign.create({
      data: {
        tenantId,
        ...data,
        budget: data.budget,
      },
    });
  }

  async updateCampaignStatus(id: string, status: string) {
    const updateData: any = { status };
    if (status === 'RUNNING') updateData.startedAt = new Date();
    if (status === 'COMPLETED') updateData.completedAt = new Date();

    return this.prisma.marketingCampaign.update({
      where: { id },
      data: updateData,
    });
  }

  // Lead operations
  async getTenantLeads(tenantId: string, filters?: { status?: string; assignedToId?: string }) {
    const where: any = { tenantId };
    if (filters?.status) where.status = filters.status;
    if (filters?.assignedToId) where.assignedToId = filters.assignedToId;

    return this.prisma.lead.findMany({
      where,
      include: {
        activities: {
          orderBy: { performedAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createLead(tenantId: string, data: {
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
  }) {
    return this.prisma.lead.create({
      data: {
        tenantId,
        ...data,
        value: data.value,
      },
    });
  }

  async updateLeadStatus(id: string, status: string, notes?: string) {
    const updateData: any = { status };
    if (status === 'WON') updateData.convertedAt = new Date();

    const lead = await this.prisma.lead.update({
      where: { id },
      data: updateData,
    });

    if (notes) {
      await this.prisma.leadActivity.create({
        data: {
          leadId: id,
          type: 'STATUS_CHANGE',
          description: `Status changed to ${status}: ${notes}`,
        },
      });
    }

    return lead;
  }

  async addLeadActivity(leadId: string, data: {
    type: string;
    description: string;
    performedBy?: string;
  }) {
    return this.prisma.leadActivity.create({
      data: {
        leadId,
        ...data,
      },
    });
  }

  // Brand operations
  async getTenantBrandAssets(tenantId: string, type?: string) {
    const where: any = { tenantId };
    if (type) where.type = type;

    return this.prisma.brandAsset.findMany({
      where,
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createBrandAsset(tenantId: string, data: {
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
    uploadedBy?: string;
  }) {
    return this.prisma.brandAsset.create({
      data: {
        tenantId,
        ...data,
      },
    });
  }

  async getTenantBrandGuidelines(tenantId: string) {
    return this.prisma.brandGuideline.findMany({
      where: { tenantId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async createBrandGuideline(tenantId: string, data: {
    name: string;
    category: string;
    description: string;
    rules: any;
    examples?: any;
    doExamples?: string[];
    dontExamples?: string[];
  }) {
    return this.prisma.brandGuideline.create({
      data: {
        tenantId,
        ...data,
      },
    });
  }

  async getTenantBrandVoice(tenantId: string) {
    return this.prisma.brandVoice.findUnique({
      where: { tenantId },
    });
  }

  async upsertBrandVoice(tenantId: string, data: {
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
  }) {
    return this.prisma.brandVoice.upsert({
      where: { tenantId },
      update: data,
      create: {
        tenantId,
        ...data,
      },
    });
  }
}
