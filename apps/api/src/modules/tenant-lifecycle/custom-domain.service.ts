import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import * as crypto from 'crypto';
import { promises as dns } from 'dns';

export interface DnsInstructions {
  type: string;
  host: string;
  value: string;
  instructions: string;
}

export interface VerifyResult {
  verified: boolean;
  reason?: string;
}

@Injectable()
export class CustomDomainService {
  private readonly logger = new Logger(CustomDomainService.name);

  constructor(private readonly prisma: PrismaService) {}

  async requestCustomDomain(tenantId: string, domain: string): Promise<DnsInstructions> {
    const token = crypto.randomUUID();
    await this.prisma.tenantLifecycle.update({
      where: { tenantId },
      data: { customDomain: domain, dnsToken: token, customDomainVerified: false },
    });
    return {
      type: 'TXT',
      host: `_dexo-verify.${domain}`,
      value: `dexo-verification=${token}`,
      instructions:
        'Add this TXT record to your DNS provider, then click Verify.',
    };
  }

  async verifyCustomDomain(tenantId: string): Promise<VerifyResult> {
    const lifecycle = await this.prisma.tenantLifecycle.findUnique({
      where: { tenantId },
    });
    if (!lifecycle?.customDomain || !lifecycle.dnsToken) {
      return { verified: false, reason: 'no_domain_or_token' };
    }
    try {
      const records = await dns.resolveTxt(`_dexo-verify.${lifecycle.customDomain}`);
      const flat = records.flat();
      const match = flat.includes(`dexo-verification=${lifecycle.dnsToken}`);
      if (match) {
        await this.prisma.tenantLifecycle.update({
          where: { tenantId },
          data: { customDomainVerified: true, sslStatus: 'PENDING' },
        });
        return { verified: true };
      }
      return { verified: false, reason: 'token_mismatch' };
    } catch (e) {
      this.logger.warn(`DNS lookup failed: ${(e as Error).message}`);
      return { verified: false, reason: 'dns_lookup_failed' };
    }
  }

  async getDomainStatus(tenantId: string) {
    return this.prisma.tenantLifecycle.findUnique({
      where: { tenantId },
      select: {
        customDomain: true,
        customDomainVerified: true,
        sslStatus: true,
        dnsToken: true,
      },
    });
  }
}
