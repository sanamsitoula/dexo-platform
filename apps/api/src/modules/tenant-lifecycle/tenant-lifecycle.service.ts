import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService, AuditService } from '@dexo/shared';

@Injectable()
export class TenantLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getLifecycle(tenantId: string) {
    const lc = await this.prisma.tenantLifecycle.findUnique({ where: { tenantId } });
    if (!lc) throw new NotFoundException('Lifecycle not found');
    return lc;
  }

  async suspendTenant(tenantId: string, reason: string, suspendedBy: string) {
    const lc = await this.prisma.tenantLifecycle.findUnique({ where: { tenantId } });
    if (!lc) throw new NotFoundException('Lifecycle not found');
    if (lc.status !== 'ACTIVE') {
      throw new BadRequestException(`Cannot suspend tenant in status ${lc.status}`);
    }
    const updated = await this.prisma.tenantLifecycle.update({
      where: { tenantId },
      data: {
        status: 'SUSPENDED',
        suspendedAt: new Date(),
        suspendedBy,
        suspendReason: reason,
      },
    });
    await this.audit.log({
      tenantId,
      userId: suspendedBy,
      action: 'tenant.suspended',
      resource: 'tenant_lifecycle',
      resourceId: tenantId,
      metadata: { reason },
    });
    return updated;
  }

  async reactivateTenant(tenantId: string, reactivatedBy: string) {
    const lc = await this.prisma.tenantLifecycle.findUnique({ where: { tenantId } });
    if (!lc) throw new NotFoundException('Lifecycle not found');
    const updated = await this.prisma.tenantLifecycle.update({
      where: { tenantId },
      data: {
        status: 'ACTIVE',
        suspendedAt: null,
        suspendedBy: null,
        suspendReason: null,
      },
    });
    await this.audit.log({
      tenantId,
      userId: reactivatedBy,
      action: 'tenant.reactivated',
      resource: 'tenant_lifecycle',
      resourceId: tenantId,
    });
    return updated;
  }

  async archiveTenant(tenantId: string, archivedBy: string) {
    const lc = await this.prisma.tenantLifecycle.findUnique({ where: { tenantId } });
    if (!lc) throw new NotFoundException('Lifecycle not found');
    if (lc.status !== 'SUSPENDED') {
      throw new BadRequestException('Only SUSPENDED tenants can be archived');
    }
    const updated = await this.prisma.tenantLifecycle.update({
      where: { tenantId },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
        archivedBy,
      },
    });
    await this.audit.log({
      tenantId,
      userId: archivedBy,
      action: 'tenant.archived',
      resource: 'tenant_lifecycle',
      resourceId: tenantId,
    });
    return updated;
  }

  async scheduleDeletion(tenantId: string, requestedBy: string) {
    const deletionAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    const updated = await this.prisma.tenantLifecycle.update({
      where: { tenantId },
      data: {
        status: 'DELETION_SCHEDULED',
        deletionScheduledAt: deletionAt,
        deletedBy: requestedBy,
      },
    });
    await this.audit.log({
      tenantId,
      userId: requestedBy,
      action: 'tenant.deletion_scheduled',
      resource: 'tenant_lifecycle',
      resourceId: tenantId,
      metadata: { deletionAt: deletionAt.toISOString() },
    });
    return { ...updated, deletionAt };
  }

  async cancelDeletion(tenantId: string) {
    return this.prisma.tenantLifecycle.update({
      where: { tenantId },
      data: {
        status: 'SUSPENDED',
        deletionScheduledAt: null,
        deletedBy: null,
      },
    });
  }

  async hardDelete(tenantId: string) {
    const lc = await this.prisma.tenantLifecycle.findUnique({ where: { tenantId } });
    if (!lc) return;
    await this.prisma.tenant.delete({ where: { id: tenantId } });
    await this.audit.log({
      tenantId: null,
      userId: lc.deletedBy,
      action: 'tenant.hard_deleted',
      resource: 'tenant',
      resourceId: tenantId,
    });
  }
}
