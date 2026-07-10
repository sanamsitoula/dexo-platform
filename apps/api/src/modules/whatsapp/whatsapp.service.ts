import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * WhatsApp Business Cloud API integration (Meta Graph API v18+).
 *
 * MVP scope:
 *   - Sends template messages and free-form text via Meta Cloud API
 *   - Opt-out list enforced (Meta policy compliance)
 *   - Stubs logging when no credentials configured (so devs can test UI without Meta setup)
 *
 * TODO (post-MVP):
 *   - Webhook inbound handler (`/webhook/:tenantId` GET verify + POST receive)
 *   - Auto-reply rule engine
 *   - Schedule 8 / IRD-electronic-payment notification bridge
 *   - Secret encryption at rest
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly META_API_BASE = 'https://graph.facebook.com/v18.0';

  constructor(private prisma: PrismaService, private http: HttpService) {}

  /** Get config — throws NotFound if tenant has no WhatsApp config. */
  private async requireConfig(tenantId: string) {
    const config = await this.prisma.tenantWhatsAppConfig.findUnique({ where: { tenantId } });
    if (!config || !config.isEnabled) {
      throw new NotFoundException('WhatsApp is not configured for this tenant. Set up WhatsApp in tenant-admin settings.');
    }
    return config;
  }

  /** Check opt-out list — Meta policy: never message users who opted out. */
  private async isOptedOut(tenantId: string, phone: string): Promise<boolean> {
    const config = await this.prisma.tenantWhatsAppConfig.findUnique({ where: { tenantId } });
    if (!config?.optOutList) return false;
    return config.optOutList.split(',').map((p) => p.trim()).includes(phone);
  }

  /** Send a free-form text message (only valid within 24h customer-service window per Meta policy). */
  async sendText(
    tenantId: string,
    to: string,
    text: string,
  ): Promise<{ messageId: string; simulated: boolean; to: string }> {
    const phone = to.replace(/^\+/, '');
    if (await this.isOptedOut(tenantId, phone)) {
      throw new BadRequestException(`Recipient ${phone} has opted out of WhatsApp messages.`);
    }
    const config = await this.requireConfig(tenantId);

    // MVP stub: if no Meta credentials configured, log instead of calling the API
    if (!config.accessToken || !config.phoneNumberId) {
      this.logger.log(`[WhatsApp STUB] tenant=${tenantId} to=${phone} text="${text.slice(0, 80)}${text.length > 80 ? '...' : ''}"`);
      return { messageId: `stub_${Date.now()}`, simulated: true, to: phone };
    }

    return this.callMetaApi(config.accessToken, config.phoneNumberId, phone, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      type: 'text',
      text: { body: text, preview_url: false },
    });
  }

  /** Send a template notification (e.g. membership_expiry, payment_received). */
  async sendTemplate(
    tenantId: string,
    templateKey: string,
    to: string,
    params: Record<string, string>,
  ): Promise<{ messageId: string; simulated: boolean; to: string; templateKey: string }> {
    const phone = to.replace(/^\+/, '');
    if (await this.isOptedOut(tenantId, phone)) {
      throw new BadRequestException(`Recipient ${phone} has opted out of WhatsApp messages.`);
    }
    const config = await this.requireConfig(tenantId);

    // Resolve template name from tenant's templates map
    const templates = (config.templates as Record<string, string> | null) ?? {};
    const templateName = templates[templateKey];
    if (!templateName) {
      throw new BadRequestException(`Template key "${templateKey}" not found in tenant WhatsApp templates.`);
    }

    // Build language + components — MVP uses en_US and text parameters only.
    const components = Object.keys(params).length
      ? [{
          type: 'body',
          parameters: Object.values(params).map((v) => ({ type: 'text', text: v })),
        }]
      : [];

    if (!config.accessToken || !config.phoneNumberId) {
      this.logger.log(`[WhatsApp STUB] tenant=${tenantId} to=${phone} template=${templateName} params=${JSON.stringify(params)}`);
      return { messageId: `stub_${Date.now()}`, simulated: true, to: phone, templateKey };
    }

    const result = await this.callMetaApi(config.accessToken, config.phoneNumberId, phone, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en_US' },
        components,
      },
    });
    return { ...result, templateKey };
  }

  /** Add a phone number to the opt-out list. */
  async optOut(tenantId: string, phone: string): Promise<{ phone: string; optedOut: boolean }> {
    const clean = phone.replace(/^\+/, '');
    const config = await this.prisma.tenantWhatsAppConfig.findUnique({ where: { tenantId } });
    if (!config) throw new NotFoundException('WhatsApp not configured for this tenant.');
    const list = (config.optOutList ?? '').split(',').map((p) => p.trim()).filter(Boolean);
    if (!list.includes(clean)) list.push(clean);
    await this.prisma.tenantWhatsAppConfig.update({
      where: { tenantId },
      data: { optOutList: list.join(',') },
    });
    return { phone: clean, optedOut: true };
  }

  /** Remove a phone number from the opt-out list. */
  async optIn(tenantId: string, phone: string): Promise<{ phone: string; optedOut: boolean }> {
    const clean = phone.replace(/^\+/, '');
    const config = await this.prisma.tenantWhatsAppConfig.findUnique({ where: { tenantId } });
    if (!config) throw new NotFoundException('WhatsApp not configured for this tenant.');
    const list = (config.optOutList ?? '').split(',').map((p) => p.trim()).filter((p) => p !== clean);
    await this.prisma.tenantWhatsAppConfig.update({
      where: { tenantId },
      data: { optOutList: list.join(',') },
    });
    return { phone: clean, optedOut: false };
  }

  /** Internal: call Meta Cloud API. Throws on non-2xx. */
  private async callMetaApi(
    accessToken: string,
    phoneNumberId: string,
    to: string,
    payload: any,
  ): Promise<{ messageId: string; simulated: boolean; to: string }> {
    try {
      const res = await firstValueFrom(
        this.http.post(`${this.META_API_BASE}/${phoneNumberId}/messages`, payload, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }),
      );
      return { messageId: res.data?.messages?.[0]?.id ?? 'unknown', simulated: false, to };
    } catch (err: any) {
      this.logger.error(`Meta WhatsApp API call failed: ${err?.response?.data?.error?.message ?? err.message}`);
      throw new BadRequestException(`WhatsApp API error: ${err?.response?.data?.error?.message ?? err.message}`);
    }
  }
}