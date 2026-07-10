import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService as PrismaTenantService } from '@dexo/tenant';
import { CreatePermissionDto, CheckPermissionDto } from './dto';

@Injectable()
export class PermissionService {
  constructor(private prisma: PrismaTenantService) {}

  async create(createPermissionDto: CreatePermissionDto, tenantId?: string) {
    const { resource, action } = createPermissionDto;

    // Check if permission already exists
    const existing = await this.prisma.permission.findUnique({
      where: {
        resource_action_tenantId: {
          resource,
          action,
          tenantId: (tenantId || null) as any,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Permission already exists');
    }

    const permission = await this.prisma.permission.create({
      data: {
        ...createPermissionDto,
        tenantId,
      },
    });

    return permission;
  }

  async findAll(tenantId?: string) {
    const where: any = {};
    if (tenantId) {
      where.OR = [
        { tenantId },
        { tenantId: null }, // System permissions
      ];
    } else {
      where.tenantId = null; // Only system permissions
    }

    const permissions = await this.prisma.permission.findMany({
      where,
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });

    return permissions;
  }

  async findOne(id: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    return permission;
  }

  async findByResourceAndAction(resource: string, action: string, tenantId?: string) {
    const permission = await this.prisma.permission.findUnique({
      where: {
        resource_action_tenantId: {
          resource,
          action,
          tenantId: (tenantId || null) as any,
        },
      },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    return permission;
  }

  async remove(id: string) {
    // Check if permission exists
    const existing = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Permission not found');
    }

    await this.prisma.permission.delete({
      where: { id },
    });

    return { message: 'Permission deleted successfully' };
  }

  async checkPermission(checkPermissionDto: CheckPermissionDto): Promise<boolean> {
    const { userId, resource, action, resourceId } = checkPermissionDto;

    // Get user with roles and permissions
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      return false;
    }

    // Collect all permissions from user's roles
    const userPermissions: string[] = [];
    const wildcardPermissions: string[] = [];

    for (const userRole of user.userRoles) {
      const rolePermissions = userRole.role.permissions as string[] || [];
      for (const perm of rolePermissions) {
        if (perm.includes('*')) {
          wildcardPermissions.push(perm);
        } else {
          userPermissions.push(perm);
        }
      }
    }

    // Check for wildcard permission (e.g., 'users:*' or '*:*')
    const hasWildcard = wildcardPermissions.some(perm => {
      const [permResource, permAction] = perm.split(':');
      return (permResource === '*' || permResource === resource) &&
             (permAction === '*' || permAction === action);
    });

    if (hasWildcard) {
      return true;
    }

    // Check for exact permission
    const permissionString = `${resource}:${action}`;
    const hasExactPermission = userPermissions.includes(permissionString);

    return hasExactPermission;
  }

  async getUserPermissions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const permissionIds = new Set<string>();
    const permissions: string[] = [];

    for (const userRole of user.userRoles) {
      const rolePermissions = userRole.role.permissions as string[] || [];
      rolePermissions.forEach(perm => permissionIds.add(perm));
    }

    // Get permission details
    if (permissionIds.size > 0) {
      const permissionRecords = await this.prisma.permission.findMany({
        where: {
          id: { in: Array.from(permissionIds) },
        },
      });

      permissions.push(...permissionRecords.map(p => `${p.resource}:${p.action}`));
    }

    return {
      userId,
      permissions,
      count: permissions.length,
    };
  }

  async seedSystemPermissions() {
    const systemPermissions = [
      // User permissions
      { resource: 'users', action: 'create', description: 'Create new users' },
      { resource: 'users', action: 'read', description: 'View users' },
      { resource: 'users', action: 'update', description: 'Update users' },
      { resource: 'users', action: 'delete', description: 'Delete users' },
      { resource: 'users', action: 'impersonate', description: 'Impersonate users' },

      // Role permissions
      { resource: 'roles', action: 'create', description: 'Create roles' },
      { resource: 'roles', action: 'read', description: 'View roles' },
      { resource: 'roles', action: 'update', description: 'Update roles' },
      { resource: 'roles', action: 'delete', description: 'Delete roles' },
      { resource: 'roles', action: 'assign', description: 'Assign roles to users' },

      // Permission permissions
      { resource: 'permissions', action: 'create', description: 'Create permissions' },
      { resource: 'permissions', action: 'read', description: 'View permissions' },
      { resource: 'permissions', action: 'update', description: 'Update permissions' },
      { resource: 'permissions', action: 'delete', description: 'Delete permissions' },

      // Tenant permissions
      { resource: 'tenant', action: 'read', description: 'View tenant info' },
      { resource: 'tenant', action: 'update', description: 'Update tenant settings' },
      { resource: 'tenant', action: 'manage', description: 'Full tenant management' },

      // Settings permissions
      { resource: 'settings', action: 'read', description: 'View settings' },
      { resource: 'settings', action: 'update', description: 'Update settings' },

      // Subscription permissions
      { resource: 'subscriptions', action: 'read', description: 'View subscriptions' },
      { resource: 'subscriptions', action: 'update', description: 'Update subscriptions' },
      { resource: 'subscriptions', action: 'cancel', description: 'Cancel subscriptions' },

      // Billing permissions
      { resource: 'billing', action: 'read', description: 'View billing info' },
      { resource: 'billing', action: 'update', description: 'Update billing' },
      { resource: 'billing', action: 'refund', description: 'Process refunds' },

      // Notification permissions
      { resource: 'notifications', action: 'read', description: 'View notifications' },
      { resource: 'notifications', action: 'send', description: 'Send notifications' },
      { resource: 'notifications', action: 'manage', description: 'Manage notification templates' },

      // Files permissions
      { resource: 'files', action: 'upload', description: 'Upload files' },
      { resource: 'files', action: 'download', description: 'Download files' },
      { resource: 'files', action: 'delete', description: 'Delete files' },

      // Dashboard permissions
      { resource: 'dashboard', action: 'read', description: 'View dashboard' },
      { resource: 'dashboard', action: 'customize', description: 'Customize dashboard' },

      // Reports permissions
      { resource: 'reports', action: 'read', description: 'View reports' },
      { resource: 'reports', action: 'generate', description: 'Generate reports' },
      { resource: 'reports', action: 'export', description: 'Export reports' },

      // Audit log permissions
      { resource: 'auditlogs', action: 'read', description: 'View audit logs' },

      // Profile permissions (for regular users)
      { resource: 'profile', action: 'read', description: 'View own profile' },
      { resource: 'profile', action: 'update', description: 'Update own profile' },
    ];

    const created = [];
    for (const permData of systemPermissions) {
      const existing = await this.prisma.permission.findUnique({
        where: {
          resource_action_tenantId: {
            resource: permData.resource,
            action: permData.action,
            tenantId: null as any,
          },
        },
      });

      if (!existing) {
        const permission = await this.prisma.permission.create({
          data: permData,
        });
        created.push(permission);
      }
    }

    return {
      message: 'System permissions seeded successfully',
      created,
      total: created.length,
    };
  }
}
