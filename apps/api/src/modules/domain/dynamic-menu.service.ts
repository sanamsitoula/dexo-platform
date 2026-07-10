import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

@Injectable()
export class DynamicMenuService {
  constructor(private prisma: PrismaService) {}

  async generateMenusForDomain(domainCode: string, tenantId: string) {
    const domain = await this.prisma.domain.findUnique({
      where: { code: domainCode as any },
      include: {
        domainModules: {
          where: { isCore: true },
        },
        domainRoles: true,
        domainMenus: {
          include: {
            module: true,
          },
        },
      },
    } as any) as any;

    if (!domain) throw new NotFoundException('Domain not found');

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        domains: true,
        userRoles: {
          include: { role: true, user: true },
        },
      },
    } as any) as any;

    if (!tenant) throw new NotFoundException('Tenant not found');

    const menuStructure = this.buildMenuTree(domain);

    return {
      domain: {
        id: domain.id,
        name: domain.name,
        code: domain.code,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        domainsAssigned: tenant.domains.length,
      },
      menuStructure: {
        ...menuStructure,
        generatedAt: new Date(),
      },
    };
  }

  async generateUserMenus(domainCode: string, tenantId: string, roleCode: string) {
    const domain = await this.prisma.domain.findUnique({
      where: { code: domainCode as any },
      include: {
        domainModules: {
          where: { isCore: true },
        },
        domainRoles: true,
        domainMenus: {
          include: {
            module: true,
          },
        },
      },
    } as any) as any;

    if (!domain) throw new NotFoundException('Domain not found');

    const role = await this.prisma.domainRole.findFirst({
      where: {
        domainId: domain.id,
        code: roleCode,
      },
    });

    if (!role) throw new NotFoundException('Role not found');

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        userRoles: {
          include: {
            role: true,
            user: true,
          },
        },
      },
    } as any) as any;

    if (!tenant) throw new NotFoundException('Tenant not found');

    const userMenus = [];
    for (const domainMenu of domain.domainMenus) {
      const canAccess = await this.checkRoleAccess(domain.id, role.id, domainMenu.module.code);
      if (canAccess) {
        userMenus.push(this.transformMenuItem(domainMenu, roleCode));
      }
    }

    const menuStructure = this.buildMenuTree(userMenus);

    return {
      domain: {
        id: domain.id,
        name: domain.name,
        code: domain.code,
      },
      userRole: {
        roleId: role.id,
        roleName: role.name,
        roleCode: role.code,
        description: role.description,
      },
      menuStructure: {
        ...menuStructure,
        generatedAt: new Date(),
      },
      modulesAccessible: this.getAccessibleModules(domain.domainModules, userMenus),
    };
  }

  private async checkRoleAccess(domainId: string, roleId: string, moduleCode: string): Promise<boolean> {
    const permission = await this.prisma.domainPermission.findFirst({
      where: {
        domainId,
        roleId,
        module: { code: moduleCode },
        action: { in: ['view', 'create', 'edit', 'delete', 'manage'] },
      },
    });

    return !!permission;
  }

  private transformMenuItem(menuItem: any, roleCode: string) {
    return {
      id: menuItem.id,
      code: menuItem.code,
      label: menuItem.label,
      icon: menuItem.icon,
      route: menuItem.route,
      moduleCode: menuItem.module.code,
      sortOrder: menuItem.sortOrder,
      isPublic: menuItem.isPublic,
      isVisible: menuItem.isVisible,
      requiredPlan: menuItem.requiredPlan,
      parentId: menuItem.parentId,
      children: [],
    };
  }

  private buildMenuTree(menuItems: any): any[] {
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

  private getAccessibleModules(allModules: any, userMenus: any): any {
    const accessibleModuleCodes = new Set();
    for (const menuItem of userMenus.flatMap((m: any) => this.getAllChildren(m))) {
      accessibleModuleCodes.add(menuItem.moduleCode);
    }

    return allModules
      .filter((module: any) => accessibleModuleCodes.has(module.code))
      .map((module: any) => ({
        code: module.code,
        name: module.name,
        description: module.description,
        category: module.category,
        icon: module.icon,
        route: module.route,
        isCore: module.isCore,
        sortOrder: module.sortOrder,
      }));
  }

  private getAllChildren(menuItem: any): any[] {
    const result = [];

    if (menuItem.children && menuItem.children.length > 0) {
      for (const child of menuItem.children) {
        result.push(child);
        result.push(...this.getAllChildren(child));
      }
    }

    return result;
  }

  async getDashboardMenu(domainCode: string, roleCode: string) {
    const domain = await this.prisma.domain.findUnique({
      where: { code: domainCode },
      include: { domainMenus: true },
    } as any) as any;

    if (!domain) throw new NotFoundException('Domain not found');

    const dashboardItems = domain.domainMenus.filter(
      (menu: any) => menu.code === 'dashboard' || menu.route?.includes('/dashboard')
    );

    return dashboardItems.map((item: any) => this.transformMenuItem(item, roleCode));
  }

  async getUserMenuPaths(domainCode: string, roleCode: string) {
    const menuStructure = await this.generateUserMenus(domainCode, 'temp-tenant', roleCode);
    const paths = this.extractRoutesFromMenu(menuStructure.menuStructure);
    return paths;
  }

  private extractRoutesFromMenu(menuStructure: any): any[] {
    const routes = [];

    for (const item of menuStructure) {
      if (item.route) {
        routes.push(item.route);
      }
      if (item.children && item.children.length > 0) {
        routes.push(...this.extractRoutesFromMenu(item.children));
      }
    }

    return routes;
  }
}
