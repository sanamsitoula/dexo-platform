import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

@Injectable()
export class DomainPermissionService {
  constructor(private prisma: PrismaService) {}

  async checkModuleAccess(domainCode: string, roleCode: string, moduleCode: string, action: string): Promise<boolean> {
    const domain = await this.prisma.domain.findUnique({
      where: { code: domainCode as any },
    });

    if (!domain) return false;

    const role = await this.prisma.domainRole.findFirst({
      where: {
        domainId: domain.id,
        code: roleCode,
      },
    });

    if (!role) return false;

    const module = await this.prisma.domainModule.findFirst({
      where: { code: moduleCode },
    });

    if (!module) return false;

    const permission = await this.prisma.domainPermission.findFirst({
      where: {
        domainId: domain.id,
        roleId: role.id,
        moduleId: module.id,
        action: action,
      },
    });

    return !!permission;
  }

  async checkAllModuleAccess(domainCode: string, roleCode: string): Promise<any> {
    const domain = await this.prisma.domain.findUnique({
      where: { code: domainCode as any },
    });

    if (!domain) return { hasAccess: false, permissions: [] };

    const role = await this.prisma.domainRole.findFirst({
      where: {
        domainId: domain.id,
        code: roleCode,
      },
    });

    if (!role) return { hasAccess: false, permissions: [] };

    const permissions = await this.prisma.domainPermission.findMany({
      where: {
        domainId: domain.id,
        roleId: role.id,
      },
      include: {
        module: true,
      },
    });
    return {
      hasAccess: permissions.length > 0,
      permissions: permissions.map(p => ({
        moduleCode: p.module.code,
        moduleName: p.module.name,
        action: p.action,
        category: p.module.category,
        icon: p.module.icon,
        route: p.module.route,
      })),
    };
  }

  async getUserPermissions(domainCode: string, roleCode: string): Promise<any> {
    const hasAccess = await this.checkAllModuleAccess(domainCode, roleCode);

    if (!hasAccess.hasAccess) return { accessible: [], restricted: [] };

    const allModules = await this.prisma.domainModule.findMany({
      where: {
        domain: { code: domainCode as any },
      },
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
        icon: true,
        route: true,
      },
    });

    const accessibleModules = allModules.filter(module =>
      hasAccess.permissions.some((perm: any) => perm.moduleCode === module.code)
    );

    const restrictedModules = allModules.filter(module =>
      !hasAccess.permissions.some((perm: any) => perm.moduleCode === module.code)
    );

    return {
      accessible: accessibleModules.map(m => ({
        code: m.code,
        name: m.name,
        category: m.category,
        icon: m.icon,
        route: m.route,
      })),
      restricted: restrictedModules.map(m => ({
        code: m.code,
        name: m.name,
        category: m.category,
        icon: m.icon,
        route: m.route,
      })),
    };
  }

  async hasPermission(domainCode: string, roleCode: string, moduleCode: string, action?: string): Promise<boolean> {
    const actions = await this.prisma.domainPermission.findMany({
      where: {
        domain: { code: domainCode as any },
        role: { code: roleCode },
        module: { code: moduleCode },
        ...(action ? { action } : {}),
      },
      select: {
        action: true,
      },
    });

    return actions.length > 0;
  }

  async hasModuleAccess(domainCode: string, roleCode: string, moduleCode: string): Promise<boolean> {
    return this.hasPermission(domainCode, roleCode, moduleCode);
  }

  async canView(domainCode: string, roleCode: string, moduleCode: string): Promise<boolean> {
    return this.hasPermission(domainCode, roleCode, moduleCode, 'view');
  }

  async canCreate(domainCode: string, roleCode: string, moduleCode: string): Promise<boolean> {
    return this.hasPermission(domainCode, roleCode, moduleCode, 'create');
  }

  async canEdit(domainCode: string, roleCode: string, moduleCode: string): Promise<boolean> {
    return this.hasPermission(domainCode, roleCode, moduleCode, 'edit');
  }

  async canDelete(domainCode: string, roleCode: string, moduleCode: string): Promise<boolean> {
    return this.hasPermission(domainCode, roleCode, moduleCode, 'delete');
  }

  async canManage(domainCode: string, roleCode: string, moduleCode: string): Promise<boolean> {
    return this.hasPermission(domainCode, roleCode, moduleCode, 'manage');
  }

  async createDomainPermission(dto: any) {
    const domain = await this.prisma.domain.findUnique({
      where: { id: dto.domainId },
    });

    if (!domain) throw new Error('Domain not found');

    const module = await this.prisma.domainModule.findUnique({
      where: { id: dto.moduleId },
    });

    if (!module) throw new Error('Module not found');

    const role = await this.prisma.domainRole.findUnique({
      where: { id: dto.roleId },
    });

    if (!role) throw new Error('Role not found');

    const existing = await this.prisma.domainPermission.findUnique({
      where: {
        domainId_moduleId_roleId_action: {
          domainId: dto.domainId,
          moduleId: dto.moduleId,
          roleId: dto.roleId,
          action: dto.action,
        },
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.domainPermission.create({
      data: {
        domain: { connect: { id: dto.domainId } },
        module: { connect: { id: dto.moduleId } },
        role: { connect: { id: dto.roleId } },
        action: dto.action,
      },
    });
  }
}
