import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService as PrismaTenantService } from '@dexo/tenant';
import { TenantMailService } from '@dexo/shared';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private prisma: PrismaTenantService, private tenantMail: TenantMailService) {}

  async createTemplate(data: {
    name: string;
    type: 'email' | 'sms' | 'push' | 'inApp';
    subject?: string;
    body: string;
    variables?: string[];
    tenantId?: string;
  }) {
    return this.prisma.notificationTemplate.create({
      data: {
        name: data.name,
        type: data.type,
        subject: data.subject,
        body: data.body,
        variables: data.variables || [],
        tenantId: data.tenantId,
      },
    });
  }

  async findAllTemplates(tenantId?: string) {
    const where: any = {};
    if (tenantId) {
      where.OR = [{ tenantId }, { tenantId: null }];
    } else {
      where.tenantId = null;
    }
    return this.prisma.notificationTemplate.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findTemplate(id: string) {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id },
    });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async updateTemplate(id: string, data: any) {
    const template = await this.prisma.notificationTemplate.update({
      where: { id },
      data,
    });
    return template;
  }

  async deleteTemplate(id: string) {
    await this.prisma.notificationTemplate.delete({
      where: { id },
    });
    return { message: 'Template deleted' };
  }

  async sendNotification(data: {
    templateId?: string;
    to?: string | string[];
    variables?: Record<string, any>;
    // Announcement broadcast (tenant-admin → members)
    type?: string;
    title?: string;
    message?: string;
    audience?: string;
    tenantId?: string;
  }) {
    // Announcement broadcast path (no template needed).
    if (data.type === 'ANNOUNCEMENT' || (!data.templateId && data.title && data.message)) {
      if (!data.tenantId) throw new BadRequestException('tenantId required for announcements');
      return this.sendAnnouncement(data.tenantId, {
        title: data.title!,
        message: data.message!,
        audience: data.audience || 'all',
      });
    }

    if (!data.templateId) throw new BadRequestException('templateId is required');
    const template = await this.findTemplate(data.templateId);
    // Integration with SendGrid/Twilio would go here
    return {
      message: 'Notification queued',
      template: template.name,
      to: data.to,
    };
  }

  /**
   * Broadcast an announcement to a tenant's members: emails the selected
   * audience through the tenant's SMTP (best-effort) and stores the last 20
   * announcements in Setting key "announcements" for in-app display.
   */
  async sendAnnouncement(tenantId: string, dto: { title: string; message: string; audience: string }) {
    if (!dto.title || !dto.message) throw new BadRequestException('title and message are required');
    const audience = (dto.audience || 'all').toLowerCase();

    const where: any = { tenantId };
    if (audience.includes('active')) where.status = 'ACTIVE';
    if (audience.includes('expir')) {
      where.status = 'ACTIVE';
      where.memberships = {
        some: { status: 'ACTIVE', endDate: { lte: new Date(Date.now() + 14 * 86400000), gte: new Date() } },
      };
    }
    const members = await this.prisma.member.findMany({
      where,
      include: { user: { select: { email: true, firstName: true } } },
    });
    const recipients = members.map((m: any) => m.user?.email).filter(Boolean) as string[];

    // Persist for in-app announcement feeds (last 20).
    const existing = await this.prisma.setting.findFirst({ where: { tenantId, key: 'announcements' } });
    const list = Array.isArray(existing?.value) ? (existing!.value as any[]) : [];
    const entry = { title: dto.title, message: dto.message, audience, sentAt: new Date().toISOString(), recipients: recipients.length };
    const updated = [entry, ...list].slice(0, 20);
    if (existing) {
      await this.prisma.setting.update({ where: { id: existing.id }, data: { value: updated as any } });
    } else {
      await this.prisma.setting.create({ data: { tenantId, key: 'announcements', value: updated as any } });
    }

    // Email the audience — best-effort, never fail the request on SMTP problems.
    let sent = 0;
    for (const to of recipients) {
      const r = await this.tenantMail
        .send(tenantId, { to, subject: `📣 ${dto.title}`, text: dto.message, html: `<p>${dto.message}</p>` })
        .catch((err) => ({ success: false, error: err?.message } as any));
      if (r?.success) sent++;
    }
    if (sent < recipients.length) {
      this.logger.warn(`Announcement "${dto.title}": ${sent}/${recipients.length} emails delivered`);
    }

    return { message: 'Announcement sent', audience, audienceCount: recipients.length, emailsSent: sent };
  }
}
