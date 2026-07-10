import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Req,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '@dexo/shared';
import { JwtAuthGuard } from '@dexo/auth';
import { WhatsAppService } from './whatsapp.service';

@ApiTags('whatsapp')
@Controller('whatsapp')
export class WhatsAppController {
  constructor(private prisma: PrismaService, private whatsapp: WhatsAppService) {}

  /**
   * PUBLIC endpoint (no auth) — returns only the public-facing fields for the
   * tenant-website floating WhatsApp button. Identifies the tenant via the
   * `subdomain` query string.
   */
  @Get('public/:subdomain')
  @ApiOperation({ summary: 'Get public WhatsApp info for a tenant (no auth — for public website button)' })
  async getPublic(@Param('subdomain') subdomain: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { subdomain },
      select: { id: true },
    });
    if (!tenant) return { isEnabled: false, phoneNumber: '', displayName: null };
    const config = await this.prisma.tenantWhatsAppConfig.findUnique({
      where: { tenantId: tenant.id },
    });
    if (!config || !config.isEnabled) return { isEnabled: false, phoneNumber: '', displayName: null };
    return {
      isEnabled: true,
      phoneNumber: config.phoneNumber,
      displayName: config.displayName ?? null,
    };
  }

  @Get('config')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get WhatsApp config for the active tenant' })
  async getConfig(@Req() req: any) {
    const config = await this.prisma.tenantWhatsAppConfig.findUnique({
      where: { tenantId: req.user.tenantId },
    });
    if (!config) return { isEnabled: false, phoneNumber: '', templates: {} };
    // Strip secrets for the API response
    return {
      isEnabled: config.isEnabled,
      phoneNumber: config.phoneNumber,
      displayName: config.displayName,
      phoneNumberId: config.phoneNumberId ? '***configured***' : null,
      wabaId: config.wabaId,
      templates: config.templates ?? {},
      autoReplyEnabled: config.autoReplyEnabled,
    };
  }

  @Put('config')
  @ApiOperation({ summary: 'Create or update WhatsApp config for the active tenant' })
  async upsertConfig(@Req() req: any, @Body() body: any) {
    const tenantId = req.user.tenantId;
    if (!body.phoneNumber) throw new BadRequestException('phoneNumber is required (E.164 format, no +)');

    const data = {
      tenantId,
      phoneNumber: body.phoneNumber.replace(/^\+/, ''),
      displayName: body.displayName ?? null,
      accessToken: body.accessToken ?? null,
      phoneNumberId: body.phoneNumberId ?? null,
      wabaId: body.wabaId ?? null,
      webhookVerifyToken: body.webhookVerifyToken ?? null,
      isEnabled: body.isEnabled ?? false,
      autoReplyEnabled: body.autoReplyEnabled ?? false,
      templates: body.templates ?? null,
    };

    return this.prisma.tenantWhatsAppConfig.upsert({
      where: { tenantId },
      create: data,
      update: data,
    });
  }

  @Post('test')
  @ApiOperation({ summary: 'Send a test WhatsApp message to a number' })
  async sendTest(@Req() req: any, @Body() body: { to: string; text?: string }) {
    if (!body.to) throw new BadRequestException('`to` phone number is required');
    const result = await this.whatsapp.sendText(req.user.tenantId, body.to, body.text ?? 'Test message from Dexo');
    return { success: true, ...result };
  }

  @Post('notify')
  @ApiOperation({ summary: 'Send a templated notification (membership expiry, payment received, etc.)' })
  async notify(
    @Req() req: any,
    @Body() body: { templateKey: string; to: string; params?: Record<string, string> },
  ) {
    if (!body.templateKey || !body.to) throw new BadRequestException('templateKey and to are required');
    const result = await this.whatsapp.sendTemplate(req.user.tenantId, body.templateKey, body.to, body.params ?? {});
    return { success: true, ...result };
  }

  @Post('opt-out')
  @ApiOperation({ summary: 'Add a phone number to the opt-out list (Meta policy compliance)' })
  async optOut(@Req() req: any, @Body() body: { phone: string }) {
    return this.whatsapp.optOut(req.user.tenantId, body.phone);
  }

  @Post('opt-in')
  @ApiOperation({ summary: 'Remove a phone number from the opt-out list' })
  async optIn(@Req() req: any, @Body() body: { phone: string }) {
    return this.whatsapp.optIn(req.user.tenantId, body.phone);
  }
}