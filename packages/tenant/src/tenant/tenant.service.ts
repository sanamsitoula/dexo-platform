import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService, AuditService } from '@dexo/shared';
import { CreateTenantDto, UpdateTenantDto, QueryTenantDto, TenantStatus } from './dto';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async create(createTenantDto: CreateTenantDto) {
    const { subdomain, domain, planId, ...rest } = createTenantDto;

    // Check if subdomain already exists
    if (subdomain) {
      const existing = await this.prisma.tenant.findUnique({
        where: { subdomain },
      });
      if (existing) {
        throw new ConflictException('Subdomain already exists');
      }
    }

    // Check if custom domain already exists
    if (domain) {
      const existing = await this.prisma.tenant.findFirst({
        where: { domain },
      });
      if (existing) {
        throw new ConflictException('Domain already exists');
      }
    }

    // Validate plan exists
    if (planId) {
      const plan = await this.prisma.plan.findUnique({
        where: { id: planId },
      });
      if (!plan) {
        throw new NotFoundException('Plan not found');
      }
    }

    // Generate subdomain from name if not provided
    let finalSubdomain = subdomain;
    if (!finalSubdomain) {
      finalSubdomain = this.generateSubdomain(rest.name);
      // Ensure uniqueness
      let counter = 1;
      while (await this.prisma.tenant.findUnique({ where: { subdomain: finalSubdomain } })) {
        finalSubdomain = `${this.generateSubdomain(rest.name)}${counter}`;
        counter++;
      }
    }

    // Set trial end date for trial tenants
    const trialEndsAt = rest.status === TenantStatus.TRIAL
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      : null;

    const tenant = await this.prisma.tenant.create({
      data: {
        ...rest,
        subdomain: finalSubdomain,
        domain,
        planId,
        trialEndsAt,
      },
      include: {
        plan: true,
      },
    });

    await this.audit.logTenantAction('tenant.created', rest.createdBy || 'system', tenant.id, {
      name: tenant.name,
      subdomain: tenant.subdomain,
      planId: tenant.planId,
    });

    return tenant;
  }

  async findAll(query: QueryTenantDto) {
    const { status, subdomain, limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    const where: any = {};
    if (status) where.status = status;
    if (subdomain) where.subdomain = { contains: subdomain, mode: 'insensitive' };

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          plan: true,
          _count: {
            select: {
              users: true,
              subscriptions: true,
            },
          },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return {
      data: tenants,
      meta: {
        limit,
        offset,
        total,
        count: tenants.length,
        hasMore: offset + tenants.length < total,
      },
    };
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        plan: true,
        _count: {
          select: {
            users: true,
            roles: true,
            subscriptions: true,
            files: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async findBySubdomain(subdomain: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { subdomain },
      include: {
        plan: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  /**
   * Return the tenant(s) the given user belongs to.
   * A user is "in" a tenant via User.tenantId. The mobile tenant-select calls this.
   */
  async findByUserId(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        tenantId: true,
        tenant: {
          include: {
            plan: true,
            _count: { select: { users: true, subscriptions: true } },
          },
        },
      },
    });
    if (!user || !user.tenant) {
      return { data: [], meta: { total: 0 } };
    }
    return { data: [user.tenant], meta: { total: 1 } };
  }

  async findByDomain(domain: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { domain },
      include: {
        plan: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async update(id: string, updateTenantDto: UpdateTenantDto) {
    // Check if tenant exists
    const existing = await this.prisma.tenant.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Tenant not found');
    }

    const { subdomain, domain, planId, status, ...rest } = updateTenantDto;

    // Check subdomain uniqueness if changing
    if (subdomain && subdomain !== existing.subdomain) {
      const duplicate = await this.prisma.tenant.findUnique({
        where: { subdomain },
      });
      if (duplicate) {
        throw new ConflictException('Subdomain already exists');
      }
    }

    // Check domain uniqueness if changing
    if (domain && domain !== existing.domain) {
      const duplicate = await this.prisma.tenant.findFirst({
        where: { domain },
      });
      if (duplicate) {
        throw new ConflictException('Domain already exists');
      }
    }

    // Validate plan exists
    if (planId && planId !== existing.planId) {
      const plan = await this.prisma.plan.findUnique({
        where: { id: planId },
      });
      if (!plan) {
        throw new NotFoundException('Plan not found');
      }
    }

    // Handle trial end date when status changes to trial
    let trialEndsAt = existing.trialEndsAt;
    if (status === TenantStatus.TRIAL && !trialEndsAt) {
      trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: {
        ...rest,
        subdomain,
        domain,
        planId,
        status,
        trialEndsAt,
      },
      include: {
        plan: true,
      },
    });

    await this.audit.logTenantAction('tenant.updated', rest.updatedBy || 'system', tenant.id, {
      changes: updateTenantDto,
      previousStatus: existing.status,
      newStatus: tenant.status,
    });

    return tenant;
  }

  /**
   * List of all Prisma models that have a tenantId FK to the Tenant table.
   * Keep this in sync with prisma/schema.prisma. Models are deleted in this order
   * (children first) so FK constraints don't block. Detach-mode entries (detaches: true)
   * only clear the tenantId on the row rather than removing it.
   *
   * `viaRelation` is used for join tables that don't have a direct tenantId column —
   * we delete them by joining through the relation (e.g. userRoles → user).
   */
  private static readonly TENANT_CLEANUP: Array<{
    model: string
    detaches: boolean
    /** If true, this table doesn't have tenantId; the cleanup uses a relation filter. */
    viaRelation?: 'user' | 'branch'
  }> = [
    // ─── Domain / RBAC ────────────────────────────────────────────────────
    { model: 'tenantDomain',         detaches: false },
    { model: 'tenantEnabledModule',  detaches: false },
    { model: 'role',                 detaches: false },
    { model: 'permission',           detaches: false },
    { model: 'userRoles',            detaches: false, viaRelation: 'user' },
    // ─── Finance (delete leaves first, then transactions) ─────────────────
    { model: 'chartOfAccount',       detaches: false },
    { model: 'fiscalYear',           detaches: false },
    { model: 'accountingPeriod',     detaches: false },
    { model: 'journalEntry',         detaches: false },
    { model: 'journalEntryLine',     detaches: false },
    { model: 'masterBill',           detaches: false },
    { model: 'invoice',              detaches: false },
    { model: 'invoiceItem',          detaches: false },
    { model: 'bill',                 detaches: false },
    { model: 'billSequence',         detaches: false },
    { model: 'paymentReceived',      detaches: false },
    { model: 'paymentMade',          detaches: false },
    { model: 'paymentAllocation',    detaches: false },
    { model: 'bankAccount',          detaches: false },
    { model: 'reprintLog',           detaches: false },
    { model: 'financeAuditLog',      detaches: false },
    { model: 'voucher',              detaches: false },
    { model: 'voucherRedemption',    detaches: false },
    // ─── Sales / CRM ──────────────────────────────────────────────────────
    { model: 'customer',             detaches: false },
    { model: 'supplier',             detaches: false },
    { model: 'lead',                 detaches: false },
    { model: 'marketingCampaign',    detaches: false },
    { model: 'coupon',               detaches: false },
    { model: 'taxRate',              detaches: false },
    { model: 'taxGroup',             detaches: false },
    { model: 'tenantCurrency',       detaches: false },
    { model: 'tenantLanguage',       detaches: false },
    // ─── Branch / Operations ──────────────────────────────────────────────
    { model: 'branch',               detaches: false },
    { model: 'branchUser',           detaches: false, viaRelation: 'branch' },
    // ─── Subscriptions / Billing ──────────────────────────────────────────
    { model: 'subscription',         detaches: false },
    { model: 'paymentProvider',      detaches: false },
    { model: 'paymentTransaction',   detaches: false },
    // ─── Files / Notifications / Settings ─────────────────────────────────
    { model: 'file',                 detaches: false },
    { model: 'notificationTemplate', detaches: false },
    { model: 'setting',              detaches: false },
    { model: 'cbmsSyncQueue',        detaches: false },
    // ─── Audit (delete the audit trail for this tenant) ───────────────────
    { model: 'auditLog',             detaches: false },
    // ─── OAuth (each tenant can have its own OAuth configs + accounts) ───
    { model: 'tenantOAuthConfig',    detaches: false },
    { model: 'oAuthAccount',         detaches: false },
    // ─── Branding (assets, guidelines, voice) ────────────────────────────
    { model: 'brandAsset',           detaches: false },
    { model: 'brandGuideline',       detaches: false },
    { model: 'brandVoice',           detaches: false },
    // ─── Users (detached, not deleted) ────────────────────────────────────
    { model: 'user',                 detaches: true  },
  ];

  /**
   * Returns the row counts per table for a given tenant. The admin UI uses this
   * to show a "you are about to delete" preview before confirming.
   */
  async getDeletionImpact(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      select: { id: true, name: true, subdomain: true },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const counts: Array<{ model: string; count: number; detaches: boolean; label: string }> = [];
    const labelMap: Record<string, string> = {
      tenantDomain: 'Domain templates',
      tenantEnabledModule: 'Enabled modules',
      role: 'Roles',
      permission: 'Permissions',
      userRoles: 'Role assignments',
      chartOfAccount: 'Chart of accounts',
      fiscalYear: 'Fiscal years',
      accountingPeriod: 'Accounting periods',
      journalEntry: 'Journal entries',
      journalEntryLine: 'Journal entry lines',
      masterBill: 'Master bills',
      invoice: 'Invoices',
      invoiceItem: 'Invoice items',
      bill: 'Bills',
      billSequence: 'Bill sequences',
      paymentReceived: 'Payments received',
      paymentMade: 'Payments made',
      paymentAllocation: 'Payment allocations',
      bankAccount: 'Bank accounts',
      reprintLog: 'Reprint logs',
      financeAuditLog: 'Finance audit logs',
      voucher: 'Vouchers',
      voucherRedemption: 'Voucher redemptions',
      customer: 'Customers',
      supplier: 'Suppliers',
      lead: 'Leads',
      marketingCampaign: 'Marketing campaigns',
      coupon: 'Coupons',
      taxRate: 'Tax rates',
      taxGroup: 'Tax groups',
      tenantCurrency: 'Currencies',
      tenantLanguage: 'Languages',
      branch: 'Branches',
      branchUser: 'Branch users',
      subscription: 'Subscriptions',
      paymentProvider: 'Payment providers',
      paymentTransaction: 'Payment transactions',
      file: 'Files',
      notificationTemplate: 'Notification templates',
      setting: 'Settings',
      cbmsSyncQueue: 'CBMS sync queue',
      auditLog: 'Audit logs',
      tenantOAuthConfig: 'OAuth configs',
      oAuthAccount: 'OAuth accounts',
      brandAsset: 'Brand assets',
      brandGuideline: 'Brand guidelines',
      brandVoice: 'Brand voice',
      user: 'Users (will be detached, not deleted)',
    };

    for (const entry of TenantService.TENANT_CLEANUP) {
      const delegate = (this.prisma as any)[entry.model];
      if (!delegate || typeof delegate.count !== 'function') continue;
      try {
        let count: number
        if (entry.viaRelation === 'user') {
          count = await delegate.count({ where: { user: { tenantId: id } } })
        } else if (entry.viaRelation === 'branch') {
          count = await delegate.count({ where: { branch: { tenantId: id } } })
        } else {
          count = await delegate.count({ where: { tenantId: id } })
        }
        counts.push({
          model: entry.model,
          count,
          detaches: entry.detaches,
          label: labelMap[entry.model] || entry.model,
        })
      } catch {
        // Model may not exist on this Prisma version; skip silently
      }
    }

    const totalRows = counts.reduce((s, c) => s + c.count, 0);
    const activeSubscription = await this.prisma.subscription.findFirst({
      where: { tenantId: id, status: { in: ['active', 'trial'] } },
    });

    return {
      tenant,
      totalRows,
      activeSubscription,
      blocked: !!activeSubscription,
      items: counts,
    };
  }

  async remove(id: string) {
    // Check if tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Block if there's an active/trial subscription
    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId: id,
        status: { in: ['active', 'trial'] },
      },
    });

    if (activeSubscription) {
      throw new BadRequestException('Cannot delete tenant with active subscriptions. Cancel them first.');
    }

    await this.audit.logTenantAction('tenant.deleted', 'system', tenant.id, {
      name: tenant.name,
      subdomain: tenant.subdomain,
    });

    // Run cleanup in a single transaction so a failure mid-way doesn't leave the
    // tenant half-deleted. Each row delete is wrapped in try/catch so a missing
    // model or unknown column doesn't break the whole transaction.
    const safeDelete = async (tx: any, entry: typeof TenantService.TENANT_CLEANUP[number]) => {
      try {
        const delegate = tx[entry.model]
        if (!delegate) return 0
        if (entry.detaches) {
          // Detach: clear tenantId instead of removing
          if (typeof delegate.updateMany === 'function') {
            const r = await delegate.updateMany({ where: { tenantId: id }, data: { tenantId: null } })
            return r?.count ?? 0
          }
          return 0
        }
        if (typeof delegate.deleteMany !== 'function') return 0
        let r
        if (entry.viaRelation === 'user') {
          r = await delegate.deleteMany({ where: { user: { tenantId: id } } })
        } else if (entry.viaRelation === 'branch') {
          r = await delegate.deleteMany({ where: { branch: { tenantId: id } } })
        } else {
          r = await delegate.deleteMany({ where: { tenantId: id } })
        }
        return r?.count ?? 0
      } catch (err) {
        this.logger.warn(`Cleanup skipped for ${entry.model}: ${(err as Error).message}`)
        return 0
      }
    }

    const deletedCounts: Record<string, number> = {}
    await this.prisma.$transaction(async (tx) => {
      for (const entry of TenantService.TENANT_CLEANUP) {
        deletedCounts[entry.model] = await safeDelete(tx, entry)
      }
      // Finally, delete the tenant itself
      await tx.tenant.delete({ where: { id } })
    })

    return {
      message: `Tenant "${tenant.name}" and all associated data deleted successfully.`,
      deletedCounts,
      totalRows: Object.values(deletedCounts).reduce((s, n) => s + n, 0),
    }
  }

  async suspend(id: string) {
    return this.update(id, { status: TenantStatus.SUSPENDED });
  }

  async activate(id: string) {
    return this.update(id, { status: TenantStatus.ACTIVE });
  }

  async cancelSubscription(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        subscriptions: {
          where: { status: { in: ['active', 'trial'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const activeSubscription = tenant.subscriptions[0];
    if (activeSubscription) {
      await this.prisma.subscription.update({
        where: { id: activeSubscription.id },
        data: {
          status: 'canceled',
          canceledAt: new Date(),
          endedAt: activeSubscription.currentPeriodEnd,
        },
      });
    }

    await this.prisma.tenant.update({
      where: { id },
      data: { status: TenantStatus.CANCELLED },
    });

    return { message: 'Subscription cancelled successfully' };
  }

  async updateSettings(id: string, settings: Record<string, any>) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      select: { settings: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const mergedSettings = {
      ...(tenant.settings as Record<string, any> || {}),
      ...settings,
    };

    await this.prisma.tenant.update({
      where: { id },
      data: { settings: mergedSettings },
    });

    return { message: 'Settings updated successfully', settings: mergedSettings };
  }

  async getUsageStats(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            roles: true,
            files: true,
            auditLogs: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Get file storage total
    const files = await this.prisma.file.findMany({
      where: { tenantId: id },
      select: { sizeBytes: true },
    });

    const totalStorageBytes = files.reduce((sum, file) => sum + Number(file.sizeBytes || 0), 0);

    return {
      users: tenant._count.users,
      roles: tenant._count.roles,
      files: tenant._count.files,
      auditLogs: tenant._count.auditLogs,
      storageUsed: totalStorageBytes,
      storageUsedMB: Math.round(totalStorageBytes / (1024 * 1024) * 100) / 100,
    };
  }

  private generateSubdomain(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
  }
}
