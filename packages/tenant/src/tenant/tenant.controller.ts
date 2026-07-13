import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, PlatformAdminGuard } from '@dexo/auth';
import { TenantService } from './tenant.service';
import { CreateTenantDto, UpdateTenantDto, QueryTenantDto } from './dto';

@ApiTags('tenants')
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new tenant' })
  @ApiResponse({ status: 201, description: 'Tenant created successfully' })
  @ApiResponse({ status: 409, description: 'Subdomain or domain already exists' })
  async create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantService.create(createTenantDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all tenants with pagination' })
  @ApiResponse({ status: 200, description: 'Tenants retrieved successfully' })
  async findAll(@Query() query: QueryTenantDto) {
    return this.tenantService.findAll(query);
  }

  /**
   * GET /tenants/me — returns the tenant(s) the current authenticated user belongs to.
   * Used by the mobile app's tenant picker.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current user\'s tenant(s)' })
  async myTenants(@Req() req: any) {
    if (!req.user) return { data: [] };
    const userId = req.user.id || req.user.sub;
    return this.tenantService.findByUserId(userId);
  }

  /**
   * PUT /tenants/me/branding — self-service website branding (template,
   * tagline, description, colors) for the caller's OWN tenant. Every other
   * settings-write path on this controller is PlatformAdminGuard-only, which
   * meant a tenant owner had no way to change their own site's template
   * after signup — tenant-admin's Website Builder page looked like it saved
   * successfully but wrote to a key nothing ever read. Merges into
   * settings.branding only; every other settings key is left untouched.
   */
  @Put('me/branding')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update the caller's own tenant website branding" })
  async updateOwnBranding(@Req() req: any, @Body() branding: Record<string, any>) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new ForbiddenException('No tenant associated with this account');
    return this.tenantService.updateOwnBranding(tenantId, branding);
  }

  /**
   * GET /tenants/:id/deletion-impact — counts the rows in every related table.
   * Used by the admin UI to show a "what will be deleted" preview before the
   * actual delete call.
   */
  /**
   * GET /tenants/public — unauthenticated search of active tenants for the
   * mobile login tenant picker. MUST be declared before `:id` so "public"
   * isn't captured as an id param.
   */
  @Get('public')
  @ApiOperation({ summary: 'Public search of active tenants (login picker)' })
  async publicSearch(@Query('q') q?: string, @Query('limit') limit?: string) {
    return this.tenantService.publicSearch(q, limit ? parseInt(limit, 10) : 10);
  }

  /**
   * GET /tenants/resolve?host=<hostname> — resolve a tenant from any host:
   * vrfitness.onedexo.com, ramgym.localhost:4005, or a verified custom domain
   * like fitness.com. Used by web middleware and the mobile "connect by
   * domain" flow. MUST be declared before `:id`.
   */
  @Get('resolve')
  @ApiOperation({ summary: 'Public: resolve tenant by host (subdomain or custom domain)' })
  async resolveHost(@Query('host') host: string) {
    return this.tenantService.resolveByHost(host);
  }

  @Get(':id/deletion-impact')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Preview what data will be deleted for a tenant' })
  async getDeletionImpact(@Param('id') id: string) {
    return this.tenantService.getDeletionImpact(id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tenant by ID' })
  @ApiResponse({ status: 200, description: 'Tenant retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async findOne(@Param('id') id: string) {
    return this.tenantService.findOne(id);
  }

  @Get('subdomain/:subdomain')
  @ApiOperation({ summary: 'Get tenant by subdomain' })
  @ApiResponse({ status: 200, description: 'Tenant retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async findBySubdomain(@Param('subdomain') subdomain: string) {
    return this.tenantService.findBySubdomain(subdomain);
  }

  @Get('domain/:domain')
  @ApiOperation({ summary: 'Get tenant by custom domain' })
  @ApiResponse({ status: 200, description: 'Tenant retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async findByDomain(@Param('domain') domain: string) {
    return this.tenantService.findByDomain(domain);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update tenant' })
  @ApiResponse({ status: 200, description: 'Tenant updated successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async update(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto) {
    return this.tenantService.update(id, updateTenantDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete tenant and all related data' })
  @ApiResponse({ status: 200, description: 'Tenant and all related data deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete tenant with active subscriptions' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async remove(@Param('id') id: string) {
    return this.tenantService.remove(id);
  }

  @Post(':id/suspend')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Suspend tenant' })
  @ApiResponse({ status: 200, description: 'Tenant suspended successfully' })
  async suspend(@Param('id') id: string) {
    return this.tenantService.suspend(id);
  }

  @Post(':id/activate')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate tenant' })
  @ApiResponse({ status: 200, description: 'Tenant activated successfully' })
  async activate(@Param('id') id: string) {
    return this.tenantService.activate(id);
  }

  @Post(':id/cancel-subscription')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel tenant subscription' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled successfully' })
  async cancelSubscription(@Param('id') id: string) {
    return this.tenantService.cancelSubscription(id);
  }

  @Put(':id/settings')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update tenant settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  async updateSettings(@Param('id') id: string, @Body() settings: Record<string, any>) {
    return this.tenantService.updateSettings(id, settings);
  }

  @Get(':id/usage')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tenant usage statistics' })
  @ApiResponse({ status: 200, description: 'Usage statistics retrieved successfully' })
  async getUsageStats(@Param('id') id: string) {
    return this.tenantService.getUsageStats(id);
  }
}
