import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import { DomainType } from '@prisma/client';

@Injectable()
export class DomainService {
  constructor(private prisma: PrismaService) {}

  async getAllDomains() {
    return this.prisma.domain.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        theme: true,
        _count: {
          select: {
            modules: true,
            roles: true,
            menus: true,
            widgets: true,
            themes: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getDomainByCode(code: string) {
    const domain = await this.prisma.domain.findUnique({
      where: { code, isActive: true },
      include: {
        modules: {
          include: {
            _count: { select: { permissions: true, menus: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
        roles: {
          include: {
            _count: { select: { permissions: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
        themes: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!domain) throw new NotFoundException('Domain not found');
    return domain;
  }

  async assignDomainToTenant(tenantId: string, domainCode: string, userId?: string) {
    const domain = await this.getDomainByCode(domainCode);
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) throw new NotFoundException('Tenant not found');

    const existingAssignment = await this.prisma.tenantDomain.findUnique({
      where: {
        tenantId_domainId: {
          tenantId,
          domainId: domain.id,
        },
      },
    });

    if (existingAssignment) {
      return existingAssignment;
    }

    const enrichedModules = await this.getEnrichedDomainModules(domain.id, tenantId);
    const enrichedRoles = await this.getEnrichedDomainRoles(domain.id, tenantId);

    const assignment = await this.prisma.tenantDomain.create({
      data: {
        tenant: { connect: { id: tenantId } },
        domain: { connect: { id: domain.id } },
        createdBy: userId || 'system',
      },
    });

    await this.prisma.tenantEnabledModule.createMany({
      data: enrichedModules.map((module) => ({
        tenantId,
        moduleId: module.id,
      })),
    });

    await this.prisma.role.createMany({
      data: enrichedRoles.map((role) => ({
        tenantId,
        name: role.name,
        description: `Auto-created from domain ${domain.name} role: ${role.description || ''}`,
        isSystem: false,
        userRoles: [],
      })),
    });

    return assignment;
  }

  private async getEnrichedDomainModules(domainId: string, tenantId: string) {
    const modules = await this.prisma.domainModule.findMany({
      where: { domainId },
      include: {
        _count: { select: { permissions: true, menus: true } },
      },
    });

    return modules;
  }

  async getDomainMenus(domainCode: string, roleCode?: string) {
    const domain = await this.getDomainByCode(domainCode);
    const menuItems = await this.prisma.domainMenu.findMany({
      where: {
        domainId: domain.id,
        ...(roleCode && { roleId: roleCode ? undefined : undefined }),
        isVisible: true,
      },
      include: {
        module: true,
        parent: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    return this.buildMenuTree(menuItems);
  }

  async getDomainWidgets(domainCode: string, roleCode?: string) {
    return this.prisma.domainWidget.findMany({
      where: {
        domain: { code: domainCode },
        ...(roleCode ? { role: { code: roleCode } } : {}),
        isVisible: true,
      },
      include: {
        module: true,
        role: true,
      },
      orderBy: [ { category: 'asc' }, { name: 'asc' } ],
    });
  }

  async getDomainTheme(domainCode: string) {
    const code = this.toDomainTypeEnum(domainCode);
    if (!code) {
      return null;
    }
    const theme = await this.prisma.domainTheme.findFirst({
      where: {
        domain: { code },
        isActive: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    return theme;
  }

  async getTenantDomainInfo(tenantId: string) {
    const tenantWithDomains = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        domains: {
          include: {
            domain: true,
          },
        },
        enabledModules: {
          include: { module: true },
        },
        users: {
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    });

    if (!tenantWithDomains) throw new NotFoundException('Tenant not found');

    return {
      tenantId: tenantWithDomains.id,
      tenantName: tenantWithDomains.name,
      domains: tenantWithDomains.domains.map((td) => ({
        domainId: td.domain.id,
        domainName: td.domain.name,
        domainCode: td.domain.code,
        assignedAt: td.assignedAt,
        isActive: td.isActive,
      })),
      modules: tenantWithDomains.enabledModules.map((em) => ({
        moduleId: em.module.id,
        moduleCode: em.module.code,
        moduleName: em.module.name,
        moduleCategory: em.module.category,
        isEnabled: em.isEnabled,
        moduleSettings: em.settings,
      })),
      userRoles: tenantWithDomains.users.map((user) => ({
        userId: user.id,
        email: user.email,
        isPlatformAdmin: user.isPlatformAdmin,
        roles: user.userRoles.map((ur) => ({
          roleId: ur.role.id,
          roleName: ur.role.name,
          roleCode: ur.role.code,
          isSystem: ur.role.isSystem,
        })),
      })),
    };
  }

  async checkUserDomainAccess(tenantId: string, userId: string, requiredModule?: string, requiredAction?: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    module: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) return false;

    const tenantWithDomains = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        domains: {
          include: { domain: true },
        },
      },
    });

    if (!tenantWithDomains) return false;

    const userRoles = user.userRoles.map((ur) => ur.role);

    for (const domain of tenantWithDomains.domains) {
      const modules = await this.prisma.domainModule.findMany({
        where: { domainId: domain.domain.id },
      });

      const domainPermissions = await this.prisma.domainPermission.findMany({
        where: {
          domainId: domain.domain.id,
          roleId: { in: userRoles.map((r) => r.id) },
        },
        include: {
          module: true,
          role: true,
        },
      });

      if (requiredModule) {
        const hasModulePermission = domainPermissions.some(
          (perm) => perm.module.code === requiredModule && (requiredAction ? perm.action === requiredAction : true)
        );
        if (hasModulePermission) return true;
      }
    }

    return false;
  }

  async getDomainProvisioningStatus(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        domains: {
          include: {
            domain: {
              include: {
                modules: true,
                roles: true,
                themes: true,
              },
            },
          },
        },
        roles: true,
        chartOfAccounts: true,
        invoices: true,
        paymentsReceived: true,
        paymentsMade: true,
      },
    });

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      provisioningStatus: {
        domainsAssigned: tenant.domains.length,
        coreModulesEnabled: tenant.domains.reduce((count, td) => count + td.domain.modules.length, 0),
        rolesCreated: tenant.roles.length,
        financeModules: {
          chartOfAccounts: tenant.chartOfAccounts.length > 0,
          invoices: tenant.invoices.length > 0,
          paymentsReceived: tenant.paymentsReceived.length > 0,
          paymentsMade: tenant.paymentsMade.length > 0,
        },
        globalModulesEnabled: ['globalization', 'payment-gateway', 'auth', 'tenant', 'user', 'subscription', 'billing', 'notification', 'files', 'settings', 'dashboard', 'audit']
          .filter(module => true)
          .length,
      },
    };
  }

  private buildMenuTree(menuItems) {
    const menuMap = new Map();
    const roots = [];

    for (const item of menuItems) {
      menuMap.set(item.id, {
        ...item,
        children: [],
      });
    }

    for (const item of menuItems) {
      if (item.parentId) {
        const parent = menuMap.get(item.parentId);
        if (parent) {
          parent.children.push(menuMap.get(item.id));
        }
      } else {
        roots.push(menuMap.get(item.id));
      }
    }

    return roots;
  }

  private async getEnrichedDomainRoles(domainId: string, tenantId: string) {
    const roles = await this.prisma.domainRole.findMany({
      where: { domainId },
    });

    return roles;
  }

  /**
   * Map a string slug to the DomainType enum.
   * Accepts: "fitness-center", "fitness_center", "FITNESS_CENTER", "default", etc.
   */
  private toDomainTypeEnum(slug: string | null | undefined): DomainType | null {
    if (!slug) return null;
    const normalized = String(slug).trim().toUpperCase().replace(/[- ]/g, '_');
    const valid = Object.values(DomainType) as string[];
    if (valid.includes(normalized)) return normalized as DomainType;
    return null;
  }
}
