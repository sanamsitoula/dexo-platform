import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '@dexo/shared';

/**
 * Dexo is the Stripe "platform" account; each tenant is a Stripe Express
 * "connected" account. Customers pay through Dexo's platform Stripe account
 * (see StripeProvider.initPayment), and funds are routed to the tenant's
 * connected account via `transfer_data.destination` — the connected account
 * never touches Dexo's own Stripe keys, and Dexo can add a platform fee
 * later via `application_fee_amount` without changing this onboarding flow.
 *
 * The connected account id + cached status live in this tenant's own
 * PaymentProvider row (type STRIPE), under `config.connect`, so no schema
 * migration is needed and the existing per-tenant provider lookup keeps working.
 */
@Injectable()
export class StripeConnectService {
  private readonly logger = new Logger(StripeConnectService.name);
  private readonly stripe: Stripe | null;

  constructor(private prisma: PrismaService) {
    const key = process.env.STRIPE_SECRET_KEY;
    this.stripe = key ? new Stripe(key, { apiVersion: '2023-10-16' }) : null;
  }

  private requireStripe(): Stripe {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured on the platform (missing STRIPE_SECRET_KEY)');
    }
    return this.stripe;
  }

  private async getOrCreateProviderRow(tenantId: string, tenantEmail?: string, tenantName?: string) {
    let row = await this.prisma.paymentProvider.findFirst({ where: { tenantId, type: 'STRIPE' as any } });
    if (!row) {
      row = await this.prisma.paymentProvider.create({
        data: {
          tenantId,
          type: 'STRIPE' as any,
          name: 'Stripe',
          status: 'INACTIVE',
          // Tenant doesn't need its own Stripe keys — payments run through
          // the platform account and route to their connected account.
          credentials: {},
          config: {},
        },
      });
    }
    return row;
  }

  /** Creates (if needed) a Stripe Express connected account for this tenant and returns an onboarding link. */
  async startOnboarding(tenantId: string, opts: { email: string; name?: string; refreshUrl: string; returnUrl: string }) {
    const stripe = this.requireStripe();
    const providerRow = await this.getOrCreateProviderRow(tenantId, opts.email, opts.name);
    const existingConfig = (providerRow.config as any) || {};
    let accountId: string | undefined = existingConfig.connect?.accountId;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: opts.email,
        business_type: 'company',
        business_profile: opts.name ? { name: opts.name } : undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      accountId = account.id;
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: opts.refreshUrl,
      return_url: opts.returnUrl,
      type: 'account_onboarding',
    });

    await this.prisma.paymentProvider.update({
      where: { id: providerRow.id },
      data: {
        config: {
          ...existingConfig,
          connect: { ...(existingConfig.connect || {}), accountId },
        },
      },
    });

    return { accountId, url: accountLink.url };
  }

  /** Live status pulled directly from Stripe (not the cache) — used right after onboarding and on-demand refresh. */
  async getStatus(tenantId: string) {
    const providerRow = await this.prisma.paymentProvider.findFirst({ where: { tenantId, type: 'STRIPE' as any } });
    const accountId = (providerRow?.config as any)?.connect?.accountId;
    if (!accountId) {
      return { connected: false, chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false };
    }

    const stripe = this.requireStripe();
    const account = await stripe.accounts.retrieve(accountId);
    const status = {
      connected: true,
      accountId,
      chargesEnabled: !!account.charges_enabled,
      payoutsEnabled: !!account.payouts_enabled,
      detailsSubmitted: !!account.details_submitted,
      requirementsDue: account.requirements?.currently_due || [],
    };

    await this.cacheStatus(providerRow!.id, providerRow!.config as any, status);
    return status;
  }

  private async cacheStatus(providerId: string, existingConfig: any, status: Record<string, any>) {
    await this.prisma.paymentProvider.update({
      where: { id: providerId },
      data: {
        config: { ...(existingConfig || {}), connect: { ...(existingConfig?.connect || {}), ...status } },
        // A tenant can actually receive money once Stripe reports charges_enabled.
        status: status.chargesEnabled ? 'ACTIVE' : 'INACTIVE',
      },
    });
  }

  /** Handles the `account.updated` webhook so the cached status stays fresh without polling. */
  async handleAccountUpdated(account: Stripe.Account) {
    const providerRow = await this.prisma.paymentProvider.findFirst({
      where: { type: 'STRIPE' as any, config: { path: ['connect', 'accountId'], equals: account.id } },
    });
    if (!providerRow) {
      this.logger.warn(`account.updated for unknown connected account ${account.id}`);
      return;
    }
    await this.cacheStatus(providerRow.id, providerRow.config as any, {
      accountId: account.id,
      connected: true,
      chargesEnabled: !!account.charges_enabled,
      payoutsEnabled: !!account.payouts_enabled,
      detailsSubmitted: !!account.details_submitted,
      requirementsDue: account.requirements?.currently_due || [],
    });
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string): Stripe.Event {
    const stripe = this.requireStripe();
    const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      throw new BadRequestException('STRIPE_CONNECT_WEBHOOK_SECRET is not configured');
    }
    return stripe.webhooks.constructEvent(rawBody, signature, secret);
  }
}
