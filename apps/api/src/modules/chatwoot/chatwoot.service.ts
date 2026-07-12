import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService, ChatwootClientService, ChatwootConnection } from '@dexo/shared';

export interface GlobalChatwootConfig {
  baseUrl: string;
  apiAccessToken?: string | null;
  platformAccountId?: number | null;
  platformInboxId?: number | null;
  platformWebsiteToken?: string | null;
  isEnabled: boolean;
}

/**
 * Chatwoot integration — provisions and manages the two-tier inbox
 * structure described in docs/CHATWOOT_INTEGRATION.md:
 *
 *   Tier 1 (Customer <-> Tenant): one Website inbox PER TENANT, created on
 *   tenant provisioning, embedded via TenantChatwootConfig.websiteToken.
 *   Tier 2 (Tenant <-> Platform): a SINGLE platform-wide Website inbox
 *   (PlatformChatwootConfig.platformInboxId), every tenant owner registered
 *   as a Chatwoot contact against it.
 */
@Injectable()
export class ChatwootService {
  private readonly logger = new Logger(ChatwootService.name);

  constructor(private prisma: PrismaService, private client: ChatwootClientService) {}

  // ------------------------------ global config (super admin) ------------------------------

  async getGlobalConfig(maskSecret = true): Promise<GlobalChatwootConfig | null> {
    const row = await this.prisma.platformChatwootConfig.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!row) return null;
    return maskSecret && row.apiAccessToken ? { ...row, apiAccessToken: '********' } : row;
  }

  async saveGlobalConfig(dto: Partial<GlobalChatwootConfig>, updatedBy?: string): Promise<GlobalChatwootConfig> {
    const existing = await this.prisma.platformChatwootConfig.findFirst({ orderBy: { createdAt: 'asc' } });
    let apiAccessToken = dto.apiAccessToken;
    if (apiAccessToken === '********') apiAccessToken = existing?.apiAccessToken ?? undefined;

    const data = {
      baseUrl: dto.baseUrl || existing?.baseUrl || '',
      apiAccessToken: apiAccessToken ?? existing?.apiAccessToken ?? null,
      platformAccountId: dto.platformAccountId ?? existing?.platformAccountId ?? null,
      platformInboxId: dto.platformInboxId ?? existing?.platformInboxId ?? null,
      platformWebsiteToken: dto.platformWebsiteToken ?? existing?.platformWebsiteToken ?? null,
      isEnabled: dto.isEnabled ?? existing?.isEnabled ?? false,
      updatedBy: updatedBy || null,
    };
    const saved = existing
      ? await this.prisma.platformChatwootConfig.update({ where: { id: existing.id }, data })
      : await this.prisma.platformChatwootConfig.create({ data });
    return { ...saved, apiAccessToken: saved.apiAccessToken ? '********' : null };
  }

  private async connection(): Promise<ChatwootConnection> {
    const cfg = await this.prisma.platformChatwootConfig.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!cfg?.isEnabled || !cfg.baseUrl || !cfg.apiAccessToken || !cfg.platformAccountId) {
      throw new BadRequestException('Chatwoot is not configured — set it up in platform-admin Settings → Chat first.');
    }
    return { baseUrl: cfg.baseUrl, apiAccessToken: cfg.apiAccessToken, accountId: cfg.platformAccountId };
  }

  async testGlobalConfig(): Promise<{ success: boolean; error?: string }> {
    let conn: ChatwootConnection;
    try {
      conn = await this.connection();
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
    const result = await this.client.testConnection(conn);
    await this.prisma.platformChatwootConfig.updateMany({
      data: { lastTestedAt: new Date(), lastTestStatus: result.success ? 'SUCCESS' : 'FAILED', lastTestError: result.error || null },
    });
    return result;
  }

  /** Creates the single Tier-2 (tenant owner <-> platform) inbox — run once from platform-admin. */
  async provisionPlatformInbox(): Promise<GlobalChatwootConfig> {
    const conn = await this.connection();
    const inbox = await this.client.createWebsiteInbox(conn, 'OneDexo Platform Support', 'https://onedexo.com');
    return this.saveGlobalConfig({ platformInboxId: inbox.id, platformWebsiteToken: inbox.website_token });
  }

  // ------------------------------ per-tenant provisioning (Tier 1) ------------------------------

  /**
   * Creates this tenant's own Website inbox (customer <-> tenant) and
   * registers the tenant owner as a contact on the platform's Tier-2 inbox
   * (tenant <-> platform). Best-effort — Chatwoot being unconfigured or
   * unreachable must never fail tenant provisioning; callers catch and log.
   */
  async provisionTenantInbox(tenantId: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const conn = await this.connection();
    const websiteUrl = `https://${tenant.subdomain}.onedexo.com`;
    const inbox = await this.client.createWebsiteInbox(conn, `${tenant.name} — Customer Support`, websiteUrl);

    await this.prisma.tenantChatwootConfig.upsert({
      where: { tenantId },
      create: { tenantId, inboxId: inbox.id, websiteToken: inbox.website_token, provisionedAt: new Date() },
      update: { inboxId: inbox.id, websiteToken: inbox.website_token, provisionedAt: new Date(), lastError: null },
    });
  }

  async getTenantConfig(tenantId: string) {
    return this.prisma.tenantChatwootConfig.findUnique({ where: { tenantId } });
  }

  /** Registers/refreshes the tenant owner as a Tier-2 contact, so they can message platform support. */
  async registerTenantOwnerAsContact(tenantId: string, ownerName: string, ownerEmail: string): Promise<void> {
    const conn = await this.connection();
    await this.client.upsertContact(conn, { name: ownerName, email: ownerEmail, identifier: `tenant-owner-${tenantId}` });
    // upsert, not update: this can run concurrently with provisionTenantInbox
    // (both fired best-effort from ProvisioningService without sequencing),
    // so the TenantChatwootConfig row may not exist yet.
    await this.prisma.tenantChatwootConfig.upsert({
      where: { tenantId },
      create: { tenantId, contactEmail: ownerEmail },
      update: { contactEmail: ownerEmail },
    });
  }
}
