import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

const RESERVED = new Set([
  'www', 'api', 'admin', 'app', 'portal', 'cdn', 'docs', 'status',
  'dexo', 'support', 'mail', 'smtp', 'ftp', 'test', 'staging',
  'dev', 'demo', 'root', 'system', 'internal',
]);

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;

export interface SlugValidationResult {
  available: boolean;
  reason?: 'invalid_format' | 'reserved' | 'taken';
}

@Injectable()
export class SlugService {
  constructor(private readonly prisma: PrismaService) {}

  async validateSlug(slug: string): Promise<SlugValidationResult> {
    if (!slug || !SLUG_RE.test(slug)) {
      return { available: false, reason: 'invalid_format' };
    }
    if (RESERVED.has(slug)) {
      return { available: false, reason: 'reserved' };
    }
    const existing = await this.prisma.tenantLifecycle.findUnique({
      where: { subdomainSlug: slug },
    });
    if (existing) return { available: false, reason: 'taken' };
    return { available: true };
  }

  async reserveSlug(tenantId: string, slug: string): Promise<void> {
    await this.prisma.tenantLifecycle.upsert({
      where: { tenantId },
      create: {
        tenantId,
        subdomainSlug: slug,
        status: 'PROVISIONING',
        sslStatus: 'PENDING',
      },
      update: { subdomainSlug: slug },
    });
  }
}
