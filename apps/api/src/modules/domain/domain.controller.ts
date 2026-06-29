import { Controller, Get, Post, Body, Param, UseGuards, Req, Query, HttpCode, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { DomainService } from './domain.service';
import { DomainProvisioningService } from './domain-provisioning.service';

@Controller('domains')
@UseGuards(JwtAuthGuard)
export class DomainController {
  constructor(
    private domainService: DomainService,
    private domainProvisioningService: DomainProvisioningService,
  ) {}

  @Get()
  getAllDomains() {
    return this.domainService.getAllDomains();
  }

  @Get(':code')
  getDomainByCode(@Param('code') code: string) {
    return this.domainService.getDomainByCode(code);
  }

  @Get(':code/menus')
  getDomainMenus(
    @Param('code') code: string,
    @Query('roleCode') roleCode?: string,
  ) {
    return this.domainService.getDomainMenus(code, roleCode);
  }

  @Get(':code/widgets')
  getDomainWidgets(
    @Param('code') code: string,
    @Query('roleCode') roleCode?: string,
  ) {
    return this.domainService.getDomainWidgets(code, roleCode);
  }

  @Get(':code/theme')
  getDomainTheme(@Param('code') code: string) {
    return this.domainService.getDomainTheme(code);
  }

  @Get('tenant/:tenantId/provisioning')
  getDomainProvisioningStatus(@Param('tenantId') tenantId: string) {
    return this.domainService.getDomainProvisioningStatus(tenantId);
  }

  @Get('tenant/:tenantId')
  getTenantDomainInfo(@Param('tenantId') tenantId: string) {
    return this.domainService.getTenantDomainInfo(tenantId);
  }

  @Post('assign')
  assignDomainToTenant(@Body() dto: any, @Req() req: any) {
    return this.domainProvisioningService.assignDomainToTenant(
      req.user.tenantId,
      dto.domainCode,
      req.user.id,
    );
  }

  @Post('tenant/:tenantId/assign/:domainCode')
  assignExistingTenant(
    @Param('tenantId') tenantId: string,
    @Param('domainCode') domainCode: string,
    @Req() req: any,
  ) {
    return this.domainProvisioningService.assignDomainToTenant(
      tenantId,
      domainCode,
      req.user?.id,
    );
  }

  @Post('quick-setup')
  quickSetupDomain(
    @Body() dto: any,
    @Req() req: any,
  ) {
    // Allow platform admins to specify tenantId in the body
    const tenantId = dto.tenantId || req.user.tenantId;
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }
    return this.domainProvisioningService.quickSetup(
      tenantId,
      req.user.id,
      dto.domainCode,
    );
  }

  @Post('check-access')
  checkUserAccess(
    @Body() dto: any,
    @Req() req: any,
  ) {
    return this.domainService.checkUserDomainAccess(
      req.user.tenantId,
      req.user.id,
      dto.moduleCode,
      dto.action,
    );
  }
}
