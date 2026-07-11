import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService as PrismaTenantService } from '@dexo/tenant';
import { CreateRoleDto, UpdateRoleDto, AssignRoleDto, RemoveRoleDto } from './dto';

@Injectable()
export class RoleService {
  constructor(private prisma: PrismaTenantService) {}

  async create(createRoleDto: CreateRoleDto, tenantId?: string) {
    const { name, permissions, ...rest } = createRoleDto;

    // Check if role with same name exists in tenant
    const existing = await this.prisma.role.findFirst({
      where: {
        name,
        tenantId: tenantId || null,
      },
    });

    if (existing) {
      throw new ConflictException('Role with this name already exists');
    }

    // Store permission strings ('resource:action' / 'resource:*' / '*') as-is,
    // normalized and de-duplicated. Wildcard globs are resolved at check time.
    const validatedPermissions = this.normalizePermissions(permissions || []);

    const role = await this.prisma.role.create({
      data: {
        ...rest,
        name,
        tenantId,
        permissions: validatedPermissions,
      },
    });

    return role;
  }

  async findAll(tenantId?: string, page?: number, limit?: number) {
    const where: any = {};
    if (tenantId) {
      where.OR = [
        { tenantId },
        { tenantId: null, isSystem: true },
      ];
    } else {
      where.tenantId = null;
    }

    const query: any = {
      where,
      include: {
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
      orderBy: {
        isSystem: 'desc' as const,
      },
    };

    // Backward compat: without a page param, return a plain array as before.
    if (!page) {
      return this.prisma.role.findMany(query);
    }

    const take = Math.min(Math.max(limit || 20, 1), 100);
    const skip = (Math.max(page, 1) - 1) * take;
    const [items, total] = await Promise.all([
      this.prisma.role.findMany({ ...query, skip, take }),
      this.prisma.role.count({ where }),
    ]);

    return { items, total, page: Math.max(page, 1), limit: take };
  }

  private normalizePermissions(permissions: string[]): string[] {
    return Array.from(
      new Set(
        permissions
          .map(p => String(p).trim())
          .filter(p => p === '*' || /^[\w*-]+:[\w*-]+$/.test(p)),
      ),
    );
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Fetch permission details
    const permissions: any[] = [];
    if (role.permissions && Array.isArray(role.permissions)) {
      permissions.push(...await this.prisma.permission.findMany({
        where: {
          id: { in: role.permissions as string[] },
        },
      }));
    }

    return {
      ...role,
      permissionDetails: permissions,
    };
  }

  async findByName(name: string, tenantId?: string) {
    const where: any = { name };
    if (tenantId) {
      where.OR = [
        { tenantId },
        { tenantId: null, isSystem: true },
      ];
      delete where.tenantId;
    } else {
      where.tenantId = null;
    }

    const role = await this.prisma.role.findFirst({ where });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto) {
    // Check if role exists
    const existing = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Role not found');
    }

    const { name, description, permissions, ...rest } = updateRoleDto;

    // For system roles: only allow renaming name + description, NOT permissions or isSystem flag
    if (existing.isSystem) {
      const data: any = {};
      if (name !== undefined) data.name = name;
      if (description !== undefined) data.description = description;
      // Explicitly reject permission changes on system roles
      if (permissions !== undefined) {
        throw new BadRequestException(
          'Cannot modify permissions of system roles. Create a custom role instead.',
        );
      }

      // Check name uniqueness if changing
      if (name && name !== existing.name) {
        const duplicate = await this.prisma.role.findFirst({
          where: {
            name,
            tenantId: existing.tenantId,
            NOT: { id },
          },
        });
        if (duplicate) {
          throw new ConflictException('Role with this name already exists');
        }
      }

      const role = await this.prisma.role.update({
        where: { id },
        data,
      });
      return role;
    }

    // Non-system roles: full update
    // Check name uniqueness if changing
    if (name && name !== existing.name) {
      const duplicate = await this.prisma.role.findFirst({
        where: {
          name,
          tenantId: existing.tenantId,
          NOT: { id },
        },
      });
      if (duplicate) {
        throw new ConflictException('Role with this name already exists');
      }
    }

    // Store permission strings as-is (normalized/deduped); wildcards allowed.
    let validatedPermissions = existing.permissions;
    if (permissions !== undefined) {
      validatedPermissions = this.normalizePermissions(permissions);
    }

    const role = await this.prisma.role.update({
      where: { id },
      data: {
        ...rest,
        name,
        description,
        permissions: validatedPermissions as any,
      },
    });

    return role;
  }

  async remove(id: string) {
    // Check if role exists
    const existing = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Role not found');
    }

    // Cannot delete system roles
    if (existing.isSystem) {
      throw new BadRequestException('Cannot delete system roles');
    }

    // Check if role is assigned to users
    const assignedUsers = await this.prisma.userRoles.count({
      where: { roleId: id },
    });

    if (assignedUsers > 0) {
      throw new BadRequestException(
        `Cannot delete role assigned to ${assignedUsers} user(s)`,
      );
    }

    await this.prisma.role.delete({
      where: { id },
    });

    return { message: 'Role deleted successfully' };
  }

  async assignRoles(assignRoleDto: AssignRoleDto) {
    const { userId, roleIds } = assignRoleDto;

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if roles exist
    const roles = await this.prisma.role.findMany({
      where: { id: { in: roleIds } },
    });

    if (roles.length !== roleIds.length) {
      throw new BadRequestException('One or more roles not found');
    }

    // Create role assignments
    const assignments = await Promise.all(
      roleIds.map(roleId =>
        this.prisma.userRoles.upsert({
          where: {
            userId_roleId: {
              userId,
              roleId,
            },
          },
          create: {
            userId,
            roleId,
          },
          update: {},
        }),
      ),
    );

    return {
      message: 'Roles assigned successfully',
      assignments,
    };
  }

  async removeRole(removeRoleDto: RemoveRoleDto) {
    const { userId, roleId } = removeRoleDto;

    // Check if assignment exists
    const existing = await this.prisma.userRoles.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Role assignment not found');
    }

    await this.prisma.userRoles.delete({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });

    return { message: 'Role removed successfully' };
  }

  async getUserRoles(userId: string) {
    const userRoles = await this.prisma.userRoles.findMany({
      where: { userId },
      include: {
        role: true,
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });

    return userRoles.map(ur => ur.role);
  }

  async seedSystemRoles() {
    const systemRoles = [
      {
        name: 'SuperAdmin',
        description: 'Full system access across all tenants',
        isSystem: true,
        permissions: [], // Will have all permissions
      },
      {
        name: 'Admin',
        description: 'Full tenant administration access',
        isSystem: true,
        permissions: ['users:*', 'roles:*', 'tenant:*', 'settings:*'],
      },
      {
        name: 'Manager',
        description: 'Limited administrative access',
        isSystem: true,
        permissions: ['users:read', 'users:update', 'tenant:read'],
      },
      {
        name: 'User',
        description: 'Standard user access',
        isSystem: true,
        permissions: ['profile:*', 'notifications:read'],
      },
      {
        name: 'Viewer',
        description: 'Read-only access',
        isSystem: true,
        permissions: ['*:read'],
      },
    ];

    const created = [];
    for (const roleData of systemRoles) {
      const existing = await this.prisma.role.findFirst({
        where: {
          name: roleData.name,
          isSystem: true,
        },
      });

      if (!existing) {
        const role = await this.prisma.role.create({
          data: roleData,
        });
        created.push(role);
      }
    }

    return {
      message: 'System roles seeded successfully',
      created,
    };
  }

  /**
   * Seed the default tenant-scoped system roles (admin / staff / customer).
   * Idempotent: existing roles (by name + tenantId) are left untouched.
   */
  async seedTenantDefaultRoles(tenantId: string) {
    const allModules = [
      'crm',
      'blog',
      'billing',
      'attendance',
      'subscriptions',
      'website_builder',
      'roles',
      'users',
      'settings',
      'reports',
    ];
    const staffModules = ['crm', 'blog', 'billing', 'attendance', 'website_builder', 'reports'];

    const tenantRoles = [
      {
        name: 'admin',
        description: 'Full access to all modules for this tenant',
        isSystem: true,
        permissions: allModules.map(m => `${m}:*`),
      },
      {
        name: 'staff',
        description: 'View/create/edit on operational modules (no roles, settings or subscriptions)',
        isSystem: true,
        permissions: [
          ...staffModules.flatMap(m => [`${m}:view`, `${m}:create`, `${m}:edit`]),
          'users:view',
        ],
      },
      {
        name: 'customer',
        description: 'Minimal member access',
        isSystem: true,
        permissions: ['blog:view', 'attendance:view'],
      },
    ];

    const created = [];
    for (const roleData of tenantRoles) {
      const existing = await this.prisma.role.findFirst({
        where: {
          name: roleData.name,
          tenantId,
        },
      });

      if (!existing) {
        const role = await this.prisma.role.create({
          data: { ...roleData, tenantId },
        });
        created.push(role);
      }
    }

    return {
      message: 'Tenant default roles seeded successfully',
      tenantId,
      created,
    };
  }
}
