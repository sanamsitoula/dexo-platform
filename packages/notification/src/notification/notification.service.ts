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

  async findAllTemplates(tenantId?: string, pagination?: { page?: number; limit?: number }) {
    const where: any = {};
    if (tenantId) {
      where.OR = [{ tenantId }, { tenantId: null }];
    } else {
      where.tenantId = null;
    }

    const paginated = !!(pagination?.page || pagination?.limit);
    if (!paginated) {
      // Backward-compatible: no pagination params → plain array
      return this.prisma.notificationTemplate.findMany({
        where,
        orderBy: { name: 'asc' },
      });
    }

    const page = pagination?.page && pagination.page > 0 ? pagination.page : 1;
    const limit = pagination?.limit && pagination.limit > 0 ? pagination.limit : 25;
    const [items, total] = await Promise.all([
      this.prisma.notificationTemplate.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notificationTemplate.count({ where }),
    ]);
    return { items, total };
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
    memberIds?: string[];
    tenantId?: string;
  }) {
    // Announcement broadcast path (no template needed).
    if (data.type === 'ANNOUNCEMENT' || (!data.templateId && data.title && data.message)) {
      if (!data.tenantId) throw new BadRequestException('tenantId required for announcements');
      return this.sendAnnouncement(data.tenantId, {
        title: data.title!,
        message: data.message!,
        audience: data.audience || 'all',
        memberIds: data.memberIds,
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
   * Send a single email to ONE recipient via the tenant's SMTP — unlike
   * `sendAnnouncement` (which always broadcasts to an audience segment),
   * this targets exactly the address given. Used by individual-record
   * notifications (e.g. a specific member's renewal reminder) where
   * broadcasting to the whole tenant would be wrong.
   */
  async sendDirect(tenantId: string, dto: { to: string; title: string; message: string }) {
    if (!dto.to || !dto.title || !dto.message) throw new BadRequestException('to, title and message are required');
    const result = await this.tenantMail
      .send(tenantId, { to: dto.to, subject: dto.title, text: dto.message, html: `<p>${dto.message}</p>` })
      .catch((err) => ({ success: false, error: err?.message } as any));
    return { message: result?.success ? 'Email sent' : 'Email failed', to: dto.to, ...result };
  }

  /**
   * Broadcast an announcement to a tenant's members: emails the selected
   * audience through the tenant's SMTP (best-effort) and stores the last 20
   * announcements in Setting key "announcements" for in-app display.
   *
   * `memberIds`, when given, targets exactly those members (e.g. a trainer's
   * hand-picked or "select all" client list) instead of an audience segment —
   * the two are mutually exclusive, `memberIds` wins if both are present.
   */
  async sendAnnouncement(tenantId: string, dto: { title: string; message: string; audience: string; memberIds?: string[] }) {
    if (!dto.title || !dto.message) throw new BadRequestException('title and message are required');
    const audience = (dto.audience || 'all').toLowerCase();

    const where: any = { tenantId };
    if (dto.memberIds?.length) {
      where.id = { in: dto.memberIds };
    } else {
      if (audience.includes('active')) where.status = 'ACTIVE';
      if (audience.includes('expir')) {
        where.status = 'ACTIVE';
        where.memberships = {
          some: { status: 'ACTIVE', endDate: { lte: new Date(Date.now() + 14 * 86400000), gte: new Date() } },
        };
      }
    }
    const members = await this.prisma.member.findMany({
      where,
      include: { user: { select: { email: true, firstName: true } } },
    });
    const recipients = members.map((m: any) => m.user?.email).filter(Boolean) as string[];

    // Persist for in-app announcement feeds (last 20).
    const existing = await this.prisma.setting.findFirst({ where: { tenantId, key: 'announcements' } });
    const list = Array.isArray(existing?.value) ? (existing!.value as any[]) : [];
    const entry = {
      title: dto.title,
      message: dto.message,
      audience: dto.memberIds?.length ? `${dto.memberIds.length} selected client${dto.memberIds.length === 1 ? '' : 's'}` : audience,
      sentAt: new Date().toISOString(),
      recipients: recipients.length,
    };
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

  /** The last 20 announcements broadcast for this tenant (see `sendAnnouncement`,
   * which persists them to Setting key "announcements") — read by both
   * tenant-admin and the member-facing tenant-app so members can see what
   * staff have announced without needing email. */
  async getAnnouncements(tenantId: string) {
    const setting = await this.prisma.setting.findFirst({ where: { tenantId, key: 'announcements' } });
    return Array.isArray(setting?.value) ? (setting!.value as any[]) : [];
  }
}
