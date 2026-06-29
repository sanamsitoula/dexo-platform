import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, PlatformAdminGuard } from '@dexo/auth';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Post()
  @ApiOperation({ summary: 'Set setting value' })
  async set(@Body() data: { key: string; value: any; tenantId?: string; isPublic?: boolean }) {
    return this.settingsService.set(data);
  }

  @Get()
  @ApiOperation({ summary: 'Get all settings' })
  async getAll(@Query('tenantId') tenantId?: string) {
    return this.settingsService.getAll(tenantId);
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
  @ApiOperation({ summary: 'Get setting by key' })
  async get(@Param('key') key: string, @Query('tenantId') tenantId?: string) {
    return this.settingsService.get(key, tenantId);
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete setting' })
  async remove(@Param('key') key: string, @Query('tenantId') tenantId?: string) {
    return this.settingsService.remove(key, tenantId);
  }
}
