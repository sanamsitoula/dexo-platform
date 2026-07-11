import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@dexo/auth';
import { ChannelConfigService } from './channel-config.service';
import type { UpsertChannelConfigDto } from './channel-config.service';

/**
 * Channel setup for the omni-channel CRM inbox.
 * Platform admins manage platform-level configs (tenantId = null) or any
 * tenant's via ?tenantId=; tenant users manage their own tenant's configs.
 */
@ApiTags('contact')
@Controller('contact/channels')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChannelConfigController {
  constructor(private channelConfig: ChannelConfigService) {}

  private scopeTenantId(user: any, tenantIdQuery?: string): string | null {
    if (user?.isPlatformAdmin) return tenantIdQuery || null;
    return user?.tenantId ?? null;
  }

  @Get()
  @ApiOperation({ summary: 'List channel configs (all 8 channels, merged with defaults)' })
  @ApiQuery({ name: 'tenantId', required: false })
  async list(@Req() req: any, @Query('tenantId') tenantId?: string) {
    const scoped = this.scopeTenantId(req.user, tenantId);
    return this.channelConfig.listChannels(scoped);
  }

  @Put(':channel')
  @ApiOperation({ summary: 'Upsert a channel config (enabled/credentials/displayName)' })
  @ApiQuery({ name: 'tenantId', required: false })
  async upsert(
    @Req() req: any,
    @Param('channel') channel: string,
    @Body() dto: UpsertChannelConfigDto,
    @Query('tenantId') tenantId?: string,
  ) {
    const scoped = this.scopeTenantId(req.user, tenantId);
    return this.channelConfig.upsert(scoped, channel, dto);
  }

  @Post(':channel/rotate-secret')
  @ApiOperation({ summary: 'Generate a new webhook secret for a channel' })
  @ApiQuery({ name: 'tenantId', required: false })
  async rotateSecret(
    @Req() req: any,
    @Param('channel') channel: string,
    @Query('tenantId') tenantId?: string,
  ) {
    const scoped = this.scopeTenantId(req.user, tenantId);
    return this.channelConfig.rotateSecret(scoped, channel);
  }
}
