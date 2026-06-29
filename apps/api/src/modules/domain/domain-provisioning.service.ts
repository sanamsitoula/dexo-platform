import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

@Injectable()
export class DomainProvisioningService {
  constructor(private prisma: PrismaService) {}

  async assignDomainToTenant(tenantId: string, domainCode: string, userId?: string) {
    const domain = await this.prisma.domain.findUnique({
      where: { code: domainCode },
    });

    if (!domain) throw new NotFoundException(`Domain '${domainCode}' not found`);

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

    const enrichedModules = await this.getEnrichedDomainModules(domain.id);
    const enrichedRoles = await this.getEnrichedDomainRoles(domain.id);

    return this.prisma.$transaction(async (tx) => {
      const assignment = await tx.tenantDomain.create({
        data: {
          tenant: { connect: { id: tenantId } },
          domain: { connect: { id: domain.id } },
          createdBy: userId || 'system',
        },
      });

      await tx.tenantEnabledModule.createMany({
        data: enrichedModules.map((module) => ({
          tenantId,
          moduleId: module.id,
          isEnabled: true,
          settings: {}, // Empty settings by default
        })),
      });

      await tx.role.createMany({
        data: enrichedRoles.map((role) => ({
          tenantId,
          name: role.name,
          description: `Auto-created from domain ${domain.name} role: ${role.description || ''}`,
          isSystem: false,
        })),
      });

      const createdRoles = await tx.role.findMany({
        where: { tenantId, name: { in: enrichedRoles.map(r => r.name) } },
      });

      await tx.userRoles.createMany({
        data: createdRoles.map((role) => ({
          userId: userId || 'system',
          roleId: role.id,
          assignedBy: userId || 'system',
        })),
      });

      return assignment;
    });
  }

  async quickSetup(tenantId: string, userId: string, domainCode: string) {
    const domain = await this.prisma.domain.findUnique({
      where: { code: domainCode },
      include: { modules: true, roles: true },
    });

    if (!domain) throw new NotFoundException('Domain not found');

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) throw new NotFoundException('Tenant not found');

    // Use new transaction with safety
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Skip if already assigned
        const existing = await tx.tenantDomain.findFirst({
          where: { tenantId, domainId: domain.id },
        });
        if (existing) {
          return {
            assignment: existing,
            domainConfig: {
              domainId: domain.id,
              domainName: domain.name,
              domainCode: domain.code,
            },
            modulesEnabled: 0,
            rolesCreated: 0,
            alreadyProvisioned: true,
          };
        }

        const assignment = await tx.tenantDomain.create({
          data: {
            tenantId,
            domainId: domain.id,
          },
        });

        const allDomainModules = await tx.domainModule.findMany({
          where: { domainId: domain.id },
        });

        if (allDomainModules.length > 0) {
          await tx.tenantEnabledModule.createMany({
            data: allDomainModules.map((module) => ({
              tenantId,
              moduleId: module.id,
              isEnabled: true,
              settings: this.getDefaultModuleSettings(module.code),
            })),
          });
        }

        const allDomainRoles = await tx.domainRole.findMany({
          where: { domainId: domain.id },
        });

        // Use createMany (no return), then findMany to get IDs
        if (allDomainRoles.length > 0) {
          await tx.role.createMany({
            data: allDomainRoles.map((role) => ({
              tenantId,
              name: role.name,
              description: `Auto-created from ${domain.name}`,
              isSystem: false,
            })),
          });
        }

        const createdRoles = await tx.role.findMany({
          where: { tenantId, name: { in: allDomainRoles.map(r => r.name) } },
        });

        // Only assign roles if user exists
        if (createdRoles.length > 0 && userId && userId !== 'system') {
          const userExists = await tx.user.findUnique({ where: { id: userId } });
          if (userExists) {
            await tx.userRoles.createMany({
              data: createdRoles.map((role) => ({
                userId,
                roleId: role.id,
                assignedById: userId,
              })),
              skipDuplicates: true,
            });
          }
        }

        return {
          assignment,
          domainConfig: {
            domainId: domain.id,
            domainName: domain.name,
            domainCode: domain.code,
          },
          modulesEnabled: allDomainModules.length,
          rolesCreated: allDomainRoles.length,
        };
      });
    } catch (err: any) {
      throw new BadRequestException(`Quick setup failed: ${err.message}`);
    }
  }

  private async getEnrichedDomainModules(domainId: string) {
    return this.prisma.domainModule.findMany({
      where: { domainId },
    });
  }

  private async getEnrichedDomainRoles(domainId: string) {
    return this.prisma.domainRole.findMany({
      where: { domainId },
    });
  }

  private getDefaultModuleSettings(moduleCode: string) {
    const defaultSettings = {
      'fitness_members': { enableProfileEditing: true, requireMembership: true },
      'workout_programs': { allowCustomPrograms: true, maxPrograms: 10 },
      'nutrition_plans': { allowCustomMeals: true, requireNutritionist: false },
      'appointments': { allowOnlineBooking: true, advanceBookingDays: 30 },
      'students': { enableParentPortal: true, maxSubjects: 10 },
      'payments': { autoReminders: true, paymentMethods: ['credit_card', 'bank_transfer', 'cash'] },
    };

    return JSON.parse(JSON.stringify(defaultSettings[moduleCode] || {}));
  }
}
