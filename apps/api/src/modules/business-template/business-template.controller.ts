import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, PlatformAdminGuard, Public } from '@dexo/auth';
import { BusinessTemplateService, CreateBusinessTemplateInput, UpdateBusinessTemplateInput } from './business-template.service';

@ApiTags('business-templates')
@Controller('business-templates')
export class BusinessTemplateController {
  constructor(private readonly service: BusinessTemplateService) {}

  // --- Platform-admin management routes (static prefixes must come before
  // the public GET(':domainType') below so they aren't swallowed by it) ---

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Get('admin/all')
  @ApiOperation({ summary: 'List every business type template, active or not (platform-admin)' })
  async listForAdmin() {
    return this.service.listAllForAdmin();
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Get('admin/available-domain-types')
  @ApiOperation({ summary: 'DomainType enum values not yet used by a template (platform-admin)' })
  async availableDomainTypes() {
    return this.service.listAvailableDomainTypes();
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Post()
  @ApiOperation({ summary: 'Create a business type template (platform-admin)' })
  async create(@Body() body: CreateBusinessTemplateInput) {
    return this.service.create(body);
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Put('reorder')
  @ApiOperation({ summary: 'Reorder templates for the signup wizard (platform-admin)' })
  async reorder(@Body() body: { orderedIds: string[] }) {
    return this.service.reorder(body?.orderedIds || []);
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Put(':id')
  @ApiOperation({ summary: 'Update a business type template (platform-admin)' })
  async update(@Param('id') id: string, @Body() body: UpdateBusinessTemplateInput) {
    return this.service.update(id, body);
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Put(':id/reactivate')
  @ApiOperation({ summary: 'Re-show a deactivated template in the signup wizard (platform-admin)' })
  async reactivate(@Param('id') id: string) {
    return this.service.reactivate(id);
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Delete(':id')
  @ApiOperation({
    summary:
      'Deactivate a business type template (platform-admin). This hides it from the public signup wizard rather ' +
      'than hard-deleting the row: domainType is unique and tied to the fixed DomainType enum, so the row is the ' +
      'only place that vertical\'s marketing content lives — deactivating keeps it recoverable.',
  })
  async remove(@Param('id') id: string) {
    return this.service.deactivate(id);
  }

  // --- Public, read-only routes used by the tenant signup wizard ---

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all active business type templates (public)' })
  async list() {
    return this.service.listAll();
  }

  @Public()
  @Get(':domainType')
  @ApiOperation({ summary: 'Get one template by domain type' })
  async getOne(@Param('domainType') domainType: string) {
    const t = await this.service.getByDomainType(domainType);
    if (!t) throw new NotFoundException(`Template ${domainType} not found`);
    return t;
  }
}
