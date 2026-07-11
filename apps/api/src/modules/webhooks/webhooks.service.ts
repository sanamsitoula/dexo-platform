import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import * as crypto from 'crypto';
import axios from 'axios';

/**
 * Generic outbound webhook bus — the "plug and play" integration point for
 * ANY module (ecommerce, fitness, salon, school, ...). A module fires an
 * event with `emit(tenantId, eventType, payload)`; this service fans it out
 * to every active WebhookEndpoint the tenant has subscribed for that event
 * type, signing the body with HMAC-SHA256 so the receiver can verify it came
 * from OneDexo, and logs every attempt to WebhookDelivery for observability.
 *
 * v1 scope: synchronous best-effort delivery (5s timeout), one attempt, no
 * retry queue — see docs/ECOMMERCE_MODULE.md "Roadmap" for the planned
 * retry-with-backoff worker.
 */
@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private prisma: PrismaService) {}

  private sign(secret: string, body: string): string {
    return crypto.createHmac('sha256', secret).update(body).digest('hex');
  }

  /** Fire-and-forget: never throws, never blocks the caller's transaction. */
  async emit(tenantId: string, eventType: string, payload: Record<string, any>): Promise<void> {
    let endpoints: any[];
    try {
      endpoints = await this.prisma.webhookEndpoint.findMany({
        where: { tenantId, isActive: true, eventTypes: { has: eventType } },
      });
    } catch (e) {
      this.logger.warn(`Failed to look up webhook endpoints for ${eventType}: ${(e as Error).message}`);
      return;
    }
    if (!endpoints.length) return;

    await Promise.all(endpoints.map((ep) => this.deliver(ep, eventType, payload)));
  }

  private async deliver(endpoint: any, eventType: string, payload: Record<string, any>) {
    const body = JSON.stringify({ event: eventType, data: payload, sentAt: new Date().toISOString() });
    const signature = this.sign(endpoint.secret, body);

    const delivery = await this.prisma.webhookDelivery.create({
      data: { endpointId: endpoint.id, eventType, payload, status: 'PENDING', attempts: 1 },
    });

    try {
      const res = await axios.post(endpoint.url, body, {
        headers: { 'Content-Type': 'application/json', 'X-Dexo-Signature': signature, 'X-Dexo-Event': eventType },
        timeout: 5000,
        validateStatus: () => true,
      });
      const success = res.status >= 200 && res.status < 300;
      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: success ? 'SUCCESS' : 'FAILED',
          responseStatus: res.status,
          deliveredAt: success ? new Date() : null,
          lastError: success ? null : `HTTP ${res.status}`,
        },
      });
    } catch (e) {
      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: { status: 'FAILED', lastError: (e as Error).message },
      });
      this.logger.warn(`Webhook delivery failed for ${endpoint.url} (${eventType}): ${(e as Error).message}`);
    }
  }

  // ---------------------------------------------------------------------
  // Tenant-facing management (tenant-admin "Integrations" settings)
  // ---------------------------------------------------------------------
  listEndpoints(tenantId: string) {
    return this.prisma.webhookEndpoint.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  createEndpoint(tenantId: string, dto: { url: string; eventTypes: string[]; label?: string }) {
    if (!dto?.url || !dto.eventTypes?.length) {
      throw new BadRequestException('url and at least one eventType are required');
    }
    return this.prisma.webhookEndpoint.create({
      data: {
        tenantId,
        url: dto.url,
        eventTypes: dto.eventTypes,
        label: dto.label || null,
        secret: crypto.randomBytes(24).toString('hex'),
      },
    });
  }

  async updateEndpoint(tenantId: string, id: string, dto: { url?: string; eventTypes?: string[]; isActive?: boolean; label?: string }) {
    const existing = await this.prisma.webhookEndpoint.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Webhook endpoint not found');
    return this.prisma.webhookEndpoint.update({
      where: { id },
      data: { url: dto.url, eventTypes: dto.eventTypes, isActive: dto.isActive, label: dto.label },
    });
  }

  async deleteEndpoint(tenantId: string, id: string) {
    const existing = await this.prisma.webhookEndpoint.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Webhook endpoint not found');
    return this.prisma.webhookEndpoint.delete({ where: { id } });
  }

  async getDeliveries(tenantId: string, endpointId: string) {
    const endpoint = await this.prisma.webhookEndpoint.findFirst({ where: { id: endpointId, tenantId } });
    if (!endpoint) throw new NotFoundException('Webhook endpoint not found');
    return this.prisma.webhookDelivery.findMany({
      where: { endpointId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /** Sends a synthetic ping event so the tenant can verify their receiver works. */
  async testEndpoint(tenantId: string, id: string) {
    const endpoint = await this.prisma.webhookEndpoint.findFirst({ where: { id, tenantId } });
    if (!endpoint) throw new NotFoundException('Webhook endpoint not found');
    await this.deliver(endpoint, 'webhook.test', { message: 'This is a test event from OneDexo.' });
    return { sent: true };
  }
}
