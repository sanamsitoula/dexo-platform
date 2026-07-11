import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import { randomBytes } from 'crypto';

export const CHANNELS = ['WHATSAPP', 'TIKTOK', 'INSTAGRAM', 'FACEBOOK', 'EMAIL', 'WEBSITE', 'VIBER', 'SMS'] as const;
export type Channel = (typeof CHANNELS)[number];

export interface UpsertChannelConfigDto {
  enabled?: boolean;
  displayName?: string | null;
  credentials?: Record<string, any> | null;
}

@Injectable()
export class ChannelConfigService {
  constructor(private prisma: PrismaService) {}

  normalizeChannel(raw: string): Channel {
    const channel = String(raw || '').toUpperCase();
    if (!CHANNELS.includes(channel as Channel)) {
      throw new BadRequestException(`Unknown channel: ${raw}`);
    }
    return channel as Channel;
  }

  /** Raw config lookup for a (tenantId, channel) pair — used by the inbound webhook. */
  async findConfig(tenantId: string | null, channel: string) {
    return this.prisma.channelConfig.findFirst({
      where: { tenantId, channel: String(channel).toUpperCase() },
    });
  }

  /** All 8 channels, merged with defaults for the unconfigured ones. */
  async listChannels(tenantId: string | null) {
    const configs = await this.prisma.channelConfig.findMany({
      where: { tenantId },
    });
    const byChannel = new Map(configs.map((c) => [c.channel, c]));
    return CHANNELS.map((channel) => {
      const cfg = byChannel.get(channel);
      return {
        channel,
        configured: !!cfg,
        enabled: cfg ? cfg.enabled : true,
        displayName: cfg?.displayName ?? null,
        credentials: (cfg?.credentials as Record<string, any> | null) ?? null,
        webhookSecret: cfg?.webhookSecret ?? null,
        updatedAt: cfg?.updatedAt ?? null,
      };
    });
  }

  async upsert(tenantId: string | null, channelRaw: string, dto: UpsertChannelConfigDto) {
    const channel = this.normalizeChannel(channelRaw);
    const existing = await this.findConfig(tenantId, channel);

    const data: any = {};
    if (dto.enabled !== undefined) data.enabled = !!dto.enabled;
    if (dto.displayName !== undefined) data.displayName = dto.displayName || null;
    if (dto.credentials !== undefined) data.credentials = dto.credentials ?? undefined;

    if (existing) {
      return this.prisma.channelConfig.update({ where: { id: existing.id }, data });
    }
    return this.prisma.channelConfig.create({
      data: {
        tenantId,
        channel,
        enabled: dto.enabled !== undefined ? !!dto.enabled : true,
        displayName: dto.displayName || null,
        credentials: dto.credentials ?? undefined,
      },
    });
  }

  async rotateSecret(tenantId: string | null, channelRaw: string) {
    const channel = this.normalizeChannel(channelRaw);
    const webhookSecret = randomBytes(16).toString('hex');
    const existing = await this.findConfig(tenantId, channel);
    if (existing) {
      return this.prisma.channelConfig.update({
        where: { id: existing.id },
        data: { webhookSecret },
      });
    }
    return this.prisma.channelConfig.create({
      data: { tenantId, channel, webhookSecret },
    });
  }
}
