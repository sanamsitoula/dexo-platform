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
   * Omni-channel inbound webhook. Point each platform's webhook here:
   *   POST /api/contact/inbound/whatsapp?tenant=<subdomain>
   *   POST /api/contact/inbound/{tiktok|instagram|facebook|email|viber|sms|website}
   * Body is normalized loosely: { name?, email?, phone?, message, externalId?, subject? }.
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
    const text = dto?.message || dto?.text || dto?.body;
    if (!text) throw new BadRequestException('message is required');

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
    const externalId = dto?.externalId || dto?.from || dto?.sender_id || null;
    const email = dto?.email || (externalId ? `${externalId}@${channel.toLowerCase()}.channel` : `unknown@${channel.toLowerCase()}.channel`);

    const message = await this.prisma.contactMessage.create({
      data: {
        name: dto?.name || dto?.sender_name || externalId || `${channel} user`,
        email: String(email).toLowerCase(),
        phone: dto?.phone || (channel === 'WHATSAPP' || channel === 'VIBER' || channel === 'SMS' ? externalId : null),
        subject: dto?.subject || `${channel} message`,
        message: text,
        source: `${channel.toLowerCase()}_webhook`,
        channel,
        externalId,
        status: ContactMessageStatus.NEW,
        priority: ContactMessagePriority.NORMAL,
        ipAddress: req.ip,
        userAgent: req.headers?.['user-agent']?.substring(0, 500),
        tenantId,
      },
    });
    return { success: true, id: message.id, channel };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List contact messages (tenant-scoped or platform-wide)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('channel') channel?: string,
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
