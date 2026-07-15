import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PrismaService, AuditService } from '@dexo/shared';
import { JwtAuthGuard } from '@dexo/auth';
import { ContactMessageStatus, ContactMessagePriority } from '@prisma/client';
import { ChannelConfigService } from './channel-config.service';
import { RequireModule } from '../../common/guards/module-access.guard';

interface CreateContactDto {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject?: string;
  message: string;
  screenshot?: string;
  source?: string;
  subdomain?: string;
  tenantId?: string;
}

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private channelConfig: ChannelConfigService,
  ) {}

  private async resolveTenantId(subdomain?: string, tenantId?: string): Promise<string | null> {
    if (tenantId) return tenantId;
    if (subdomain) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { subdomain },
        select: { id: true },
      });
      return tenant?.id || null;
    }
    return null;
  }

  @Post()
  @ApiOperation({ summary: 'Submit contact message (public or tenant-scoped)' })
  async create(@Body() dto: CreateContactDto, @Req() req: any) {
    if (!dto.name || !dto.email || !dto.message) {
      throw new BadRequestException('Name, email, and message are required');
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(dto.email)) {
      throw new BadRequestException('Invalid email address');
    }

    const resolvedTenantId = await this.resolveTenantId(dto.subdomain, dto.tenantId);

    const message = await this.prisma.contactMessage.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        company: dto.company,
        subject: dto.subject,
        message: dto.message,
        screenshot: dto.screenshot,
        source: dto.source || 'web_contact_form',
        channel: (dto as any).channel ? String((dto as any).channel).toUpperCase() : 'WEBSITE',
        status: ContactMessageStatus.NEW,
        priority: ContactMessagePriority.NORMAL,
        ipAddress: req.ip,
        userAgent: req.headers?.['user-agent']?.substring(0, 500),
        tenantId: resolvedTenantId,
      },
    });

    return {
      success: true,
      message: 'Message sent successfully. We will get back to you within 24 hours.',
      id: message.id,
    };
  }

  /**
   * Meta (WhatsApp Cloud API / Messenger / Instagram) webhook verification
   * handshake. When you paste the callback URL into the Meta app dashboard,
   * Meta sends GET ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
   * and expects the raw challenge echoed back. The verify token must be the
   * channel's webhook secret (the one "Generate secret" produced).
   */
  @Get('inbound/:channel')
  @ApiOperation({ summary: 'Webhook verification handshake (Meta hub.challenge echo)' })
  async inboundVerify(
    @Param('channel') channelParam: string,
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') verifyToken?: string,
    @Query('hub.challenge') challenge?: string,
    @Query('tenant') subdomain?: string,
    @Query('secret') secret?: string,
  ) {
    const channel = this.channelConfig.normalizeChannel(channelParam);
    const tenantId = await this.resolveTenantId(subdomain);
    const config = await this.channelConfig.findConfig(tenantId, channel);
    const expected = config?.webhookSecret || secret;
    if (mode === 'subscribe' && challenge) {
      if (expected && verifyToken !== expected) {
        throw new UnauthorizedException('verify token mismatch');
      }
      // Meta expects the bare challenge string back.
      return challenge;
    }
    return { ok: true, channel };
  }

  /**
   * Omni-channel inbound webhook. Point each platform's webhook here:
   *   POST /api/contact/inbound/whatsapp?tenant=<subdomain>&secret=<secret>
   *   POST /api/contact/inbound/{tiktok|instagram|facebook|email|viber|sms|website}
   *
   * Accepted payloads, normalized into ContactMessage rows:
   *  - Simple/custom:      { name?, email?, phone?, message|text|body, externalId?, subject? }
   *  - Meta WhatsApp:      { object: 'whatsapp_business_account', entry: [...] }
   *  - Meta Messenger/IG:  { object: 'page' | 'instagram', entry: [{ messaging: [...] }] }
   *  - Email inbound parse (SendGrid/Mailgun/Brevo field names) for the email channel.
   *
   * Platforms that don't provide an email get a synthesized channel address so
   * the CRM inbox still threads by sender.
   */
  @Post('inbound/:channel')
  @ApiOperation({ summary: 'Inbound message webhook (whatsapp/tiktok/instagram/facebook/email/website/viber/sms)' })
  async inbound(
    @Param('channel') channelParam: string,
    @Body() dto: any,
    @Req() req: any,
    @Query('tenant') subdomain?: string,
    @Query('secret') secret?: string,
  ) {
    const channel = this.channelConfig.normalizeChannel(channelParam);
    const tenantId = await this.resolveTenantId(subdomain || dto?.subdomain, dto?.tenantId);

    // If this channel has a persisted config, enforce it. No config = open (backward compatible).
    const config = await this.channelConfig.findConfig(tenantId, channel);
    if (config) {
      if (!config.enabled) {
        throw new ForbiddenException(`Channel ${channel} is disabled`);
      }
      if (config.webhookSecret) {
        const provided = secret || req.headers?.['x-webhook-secret'];
        if (!provided || provided !== config.webhookSecret) {
          throw new UnauthorizedException('Invalid or missing webhook secret');
        }
      }
    }

    const normalized = this.normalizeInbound(channel, dto);
    if (normalized.length === 0) {
      // Meta also delivers non-message events (statuses, read receipts). Ack
      // them with 200 so it doesn't retry/disable the webhook.
      return { success: true, received: 0, channel };
    }

    const ids: string[] = [];
    for (const m of normalized) {
      const email = m.email || (m.externalId ? `${m.externalId}@${channel.toLowerCase()}.channel` : `unknown@${channel.toLowerCase()}.channel`);
      const message = await this.prisma.contactMessage.create({
        data: {
          name: m.name || m.externalId || `${channel} user`,
          email: String(email).toLowerCase(),
          phone: m.phone || (channel === 'WHATSAPP' || channel === 'VIBER' || channel === 'SMS' ? m.externalId : null),
          subject: m.subject || `${channel} message`,
          message: m.text,
          source: `${channel.toLowerCase()}_webhook`,
          channel,
          externalId: m.externalId || null,
          status: ContactMessageStatus.NEW,
          priority: ContactMessagePriority.NORMAL,
          ipAddress: req.ip,
          userAgent: req.headers?.['user-agent']?.substring(0, 500),
          tenantId,
        },
      });
      ids.push(message.id);
    }
    return { success: true, received: ids.length, id: ids[0], ids, channel };
  }

  /** Normalize the many inbound payload shapes into flat messages. */
  private normalizeInbound(
    channel: string,
    dto: any,
  ): Array<{ name?: string; email?: string; phone?: string; subject?: string; text: string; externalId?: string }> {
    if (!dto || typeof dto !== 'object') return [];

    // --- Meta WhatsApp Cloud API ---
    if (dto.object === 'whatsapp_business_account' && Array.isArray(dto.entry)) {
      const out: any[] = [];
      for (const entry of dto.entry) {
        for (const change of entry?.changes || []) {
          const value = change?.value;
          const names = new Map<string, string>(
            (value?.contacts || []).map((c: any) => [c?.wa_id, c?.profile?.name]).filter(([k]: any[]) => k),
          );
          for (const msg of value?.messages || []) {
            const text =
              msg?.text?.body ||
              msg?.button?.text ||
              msg?.interactive?.button_reply?.title ||
              msg?.interactive?.list_reply?.title ||
              (msg?.type ? `[${msg.type} message]` : null);
            if (!text) continue;
            out.push({ name: names.get(msg?.from), phone: msg?.from, externalId: msg?.from, text });
          }
        }
      }
      return out;
    }

    // --- Meta Messenger / Instagram DMs ---
    if ((dto.object === 'page' || dto.object === 'instagram') && Array.isArray(dto.entry)) {
      const out: any[] = [];
      for (const entry of dto.entry) {
        for (const event of entry?.messaging || []) {
          const text = event?.message?.text;
          if (!text || event?.message?.is_echo) continue; // skip echoes/read receipts/deliveries
          out.push({ externalId: event?.sender?.id, text });
        }
      }
      return out;
    }

    // --- Email inbound-parse providers (SendGrid/Mailgun/Brevo) ---
    if (channel === 'EMAIL') {
      // Brevo posts { items: [{ From: { Address, Name }, Subject, RawTextBody, ... }] }
      if (Array.isArray(dto.items)) {
        return dto.items
          .map((i: any) => ({
            name: i?.From?.Name,
            email: i?.From?.Address,
            subject: i?.Subject,
            text: i?.ExtractedMarkdownMessage || i?.RawTextBody || i?.RawHtmlBody,
          }))
          .filter((m: any) => m.text);
      }
      const text = dto.message || dto.text || dto['stripped-text'] || dto['body-plain'] || dto.html;
      if (text) {
        const rawFrom = dto.email || dto.sender || dto.from || '';
        // "Jane Doe <jane@x.com>" → name + address
        const match = /^(.*?)\s*<([^>]+)>\s*$/.exec(String(rawFrom));
        return [{
          name: dto.name || (match ? match[1].replace(/^"|"$/g, '') : undefined),
          email: match ? match[2] : (String(rawFrom).includes('@') ? String(rawFrom) : undefined),
          subject: dto.subject,
          text,
        }];
      }
      return [];
    }

    // --- Simple/custom shape (n8n, Zapier, manual integrations) ---
    const text = dto.message || dto.text || dto.body;
    if (!text) throw new BadRequestException('message is required');
    const externalId = dto.externalId || dto.from || dto.sender_id || undefined;
    return [{
      name: dto.name || dto.sender_name,
      email: dto.email,
      phone: dto.phone,
      subject: dto.subject,
      text,
      externalId,
    }];
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @RequireModule('crm')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List contact messages (tenant-scoped or platform-wide)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'source', required: false, description: 'Which page/form the message came from, e.g. tenant_website_contact_form, tenant_website_booking_form' })
  async findAll(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('channel') channel?: string,
    @Query('source') source?: string,
  ) {
    const user = req.user;
    const isPlatformAdmin = user.isPlatformAdmin;
    const userTenantId = user.tenantId;

    if (!isPlatformAdmin && !userTenantId) {
      throw new ForbiddenException('Access denied');
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (!isPlatformAdmin) {
      where.tenantId = userTenantId;
    }

    if (status && status !== 'all') where.status = status;
    if (channel && channel !== 'all') where.channel = channel.toUpperCase();
    if (source && source !== 'all') where.source = source;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [messages, total] = await Promise.all([
      this.prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          assignedTo: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.prisma.contactMessage.count({ where }),
    ]);

    return {
      data: messages,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore: skip + messages.length < total,
      },
    };
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @RequireModule('crm')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get contact message statistics' })
  async getStats(@Req() req: any) {
    const user = req.user;
    const isPlatformAdmin = user.isPlatformAdmin;
    const userTenantId = user.tenantId;

    if (!isPlatformAdmin && !userTenantId) {
      throw new ForbiddenException('Access denied');
    }

    const tenantFilter: any = {};
    if (!isPlatformAdmin) {
      tenantFilter.tenantId = userTenantId;
    }

    const [newCount, readCount, repliedCount, archivedCount, spamCount, total] = await Promise.all([
      this.prisma.contactMessage.count({ where: { status: 'NEW', ...tenantFilter } }),
      this.prisma.contactMessage.count({ where: { status: 'READ', ...tenantFilter } }),
      this.prisma.contactMessage.count({ where: { status: 'REPLIED', ...tenantFilter } }),
      this.prisma.contactMessage.count({ where: { status: 'ARCHIVED', ...tenantFilter } }),
      this.prisma.contactMessage.count({ where: { status: 'SPAM', ...tenantFilter } }),
      this.prisma.contactMessage.count({ where: tenantFilter }),
    ]);

    return {
      total,
      new: newCount,
      read: readCount,
      replied: repliedCount,
      archived: archivedCount,
      spam: spamCount,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get contact message by ID' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    const user = req.user;
    const message = await this.prisma.contactMessage.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!message) throw new NotFoundException('Message not found');

    if (!user.isPlatformAdmin && message.tenantId !== user.tenantId) {
      throw new ForbiddenException('Access denied');
    }

    if (message.status === 'NEW') {
      await this.prisma.contactMessage.update({
        where: { id },
        data: { status: 'READ' },
      });
      message.status = 'READ';
    }

    return message;
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update contact message' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { status?: string; priority?: string; notes?: string; assignedToId?: string },
  ) {
    const user = req.user;

    const existing = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Message not found');

    if (!user.isPlatformAdmin && existing.tenantId !== user.tenantId) {
      throw new ForbiddenException('Access denied');
    }

    const data: any = {};
    if (body.status) data.status = body.status;
    if (body.priority) data.priority = body.priority;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.assignedToId !== undefined) data.assignedToId = body.assignedToId;
    if (body.status === 'REPLIED') data.repliedAt = new Date();

    const message = await this.prisma.contactMessage.update({
      where: { id },
      data,
    });

    await this.audit.log({
      userId: user.id,
      action: body.status === 'REPLIED' ? 'contact_message.replied' : 'contact_message.updated',
      resourceType: 'contact_message',
      resourceId: id,
      tenantId: existing.tenantId || undefined,
      changes: { status: body.status, priority: body.priority },
    });

    return message;
  }

  @Post(':id/reply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reply to contact message' })
  async reply(@Req() req: any, @Param('id') id: string, @Body() body: { replyMessage: string }) {
    const user = req.user;

    const message = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!message) throw new NotFoundException('Message not found');

    if (!user.isPlatformAdmin && message.tenantId !== user.tenantId) {
      throw new ForbiddenException('Access denied');
    }

    const updated = await this.prisma.contactMessage.update({
      where: { id },
      data: {
        status: 'REPLIED',
        repliedAt: new Date(),
        notes: message.notes
          ? `${message.notes}\n\n[Reply]: ${body.replyMessage}`
          : `[Reply]: ${body.replyMessage}`,
      },
    });

    await this.audit.log({
      userId: user.id,
      action: 'contact_message.replied',
      resourceType: 'contact_message',
      resourceId: id,
      tenantId: message.tenantId || undefined,
      changes: { replyLength: body.replyMessage?.length || 0 },
    });

    return {
      success: true,
      message: 'Reply recorded',
      data: updated,
    };
  }
}
