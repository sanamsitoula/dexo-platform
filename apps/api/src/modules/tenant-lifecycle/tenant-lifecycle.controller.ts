import {
  Controller, Get, Post, Body, Param, Query, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '@dexo/auth';
import { PrismaService } from '@dexo/shared';
import { TenantLifecycleService } from './tenant-lifecycle.service';
import { SlugService } from './slug.service';
import { ProvisioningService, CreateTenantInput } from './provisioning.service';
import { CustomDomainService } from './custom-domain.service';

@ApiTags('tenants')
@Controller('tenants')
export class TenantLifecycleController {
  constructor(
    private readonly lifecycle: TenantLifecycleService,
    private readonly slug: SlugService,
    private readonly provisioning: ProvisioningService,
    private readonly customDomain: CustomDomainService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get('check-slug')
  @ApiOperation({ summary: 'Public: check if a subdomain slug is available' })
  async checkSlug(@Query('slug') slug: string) {
    if (!slug) throw new BadRequestException('slug query param required');
    return this.slug.validateSlug(slug);
  }

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Public: list ACTIVE tenants (for mobile tenant selector)' })
  async listPublic() {
    const tenants = await this.prisma.tenant.findMany({
      where: {
        status: 'active',
        tenantLifecycle: { status: 'ACTIVE' },
      },
      select: { id: true, name: true, subdomain: true },
      orderBy: { name: 'asc' },
      take: 100,
    });
    return tenants;
  }

  @Public()
  @Post()
  @ApiOperation({ summary: 'Create a new tenant (validates + reserves slug + provisions)' })
  async create(@Body() body: CreateTenantInput) {
    return this.provisioning.provisionTenant(body);
  }

  @Get(':id/lifecycle')
  @ApiOperation({ summary: 'Get full tenant lifecycle state' })
  async getLifecycle(@Param('id') id: string) {
    return this.lifecycle.getLifecycle(id);
  }

  @Post(':id/lifecycle/suspend')
  @ApiOperation({ summary: 'Suspend a tenant (platform admin only)' })
  async suspend(
    @Param('id') id: string,
    @Body() body: { reason: string; suspendedBy: string },
  ) {
    return this.lifecycle.suspendTenant(id, body.reason, body.suspendedBy);
  }

  @Post(':id/lifecycle/reactivate')
  @ApiOperation({ summary: 'Reactivate a suspended tenant' })
  async reactivate(
    @Param('id') id: string,
    @Body() body: { reactivatedBy: string },
  ) {
    return this.lifecycle.reactivateTenant(id, body.reactivatedBy);
  }

  @Post(':id/lifecycle/archive')
  @ApiOperation({ summary: 'Archive a SUSPENDED tenant' })
  async archive(
    @Param('id') id: string,
    @Body() body: { archivedBy: string },
  ) {
    return this.lifecycle.archiveTenant(id, body.archivedBy);
  }

  @Post(':id/lifecycle/delete')
  @ApiOperation({ summary: 'Schedule deletion (30-day grace period)' })
  async scheduleDelete(
    @Param('id') id: string,
    @Body() body: { requestedBy: string },
  ) {
    return this.lifecycle.scheduleDeletion(id, body.requestedBy);
  }

  @Post(':id/lifecycle/cancel-delete')
  @ApiOperation({ summary: 'Cancel a scheduled deletion' })
  async cancelDelete(@Param('id') id: string) {
    return this.lifecycle.cancelDeletion(id);
  }

  @Post(':id/domain/request')
  @ApiOperation({ summary: 'Request a custom domain (returns DNS instructions)' })
  async requestDomain(
    @Param('id') id: string,
    @Body() body: { domain: string },
  ) {
    return this.customDomain.requestCustomDomain(id, body.domain);
  }

  @Post(':id/domain/verify')
  @ApiOperation({ summary: 'Verify TXT record and unlock SSL provisioning' })
  async verifyDomain(@Param('id') id: string) {
    return this.customDomain.verifyCustomDomain(id);
  }

  @Get(':id/domain/status')
  @ApiOperation({ summary: 'Get domain + SSL status' })
  async domainStatus(@Param('id') id: string) {
    return this.customDomain.getDomainStatus(id);
  }
}
