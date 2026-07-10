import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, PlatformAdminGuard } from '@dexo/auth';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set setting value (tenant scoped from JWT)' })
  async set(@Req() req: any, @Body() data: { key: string; value: any; tenantId?: string; isPublic?: boolean }) {
    // Tenant users always write their own settings; only platform admins may
    // target another tenant (or platform-level with tenantId null).
    const tenantId = req.user.isPlatformAdmin ? (data.tenantId ?? undefined) : req.user.tenantId;
    return this.settingsService.set({ ...data, tenantId });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all settings' })
  async getAll(@Req() req: any, @Query('tenantId') tenantId?: string) {
    const scoped = req.user.isPlatformAdmin ? tenantId : req.user.tenantId;
    return this.settingsService.getAll(scoped);
  }

  @Get('branding')
  @ApiOperation({ summary: 'Get platform branding (public)' })
  async getBranding() {
    return this.settingsService.getBranding();
  }

  @Put('branding')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update platform branding' })
  async updateBranding(@Body() data: any) {
    return this.settingsService.updateBranding(data);
  }

  @Get(':key')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get setting by key' })
  async get(@Req() req: any, @Param('key') key: string, @Query('tenantId') tenantId?: string) {
    const scoped = req.user.isPlatformAdmin ? tenantId : req.user.tenantId;
    return this.settingsService.get(key, scoped);
  }

  @Delete(':key')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete setting' })
  async remove(@Req() req: any, @Param('key') key: string, @Query('tenantId') tenantId?: string) {
    const scoped = req.user.isPlatformAdmin ? tenantId : req.user.tenantId;
    return this.settingsService.remove(key, scoped);
  }
}
