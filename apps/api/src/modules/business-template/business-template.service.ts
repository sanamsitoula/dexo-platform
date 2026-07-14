import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import { DomainType } from '@prisma/client';

export interface CreateBusinessTemplateInput {
  domainType: string;
  name: string;
  description: string;
  tagline: string;
  heroImage?: string | null;
  icon?: string | null;
  colorPrimary: string;
  colorAccent: string;
  colorBg: string;
  fontHeading?: string;
  fontBody?: string;
  websiteSections?: unknown;
  onboardingSteps?: unknown;
  dashboardLayout?: unknown;
  features?: unknown;
  isActive?: boolean;
  sortOrder?: number;
}

export type UpdateBusinessTemplateInput = Partial<Omit<CreateBusinessTemplateInput, 'domainType'>> & {
  domainType?: string;
};

@Injectable()
export class BusinessTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public: only templates the platform admin has left active, in display order. */
  async listAll() {
    return this.prisma.businessTypeTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  /** Platform-admin: every row regardless of isActive, so it can be managed. */
  async listAllForAdmin() {
    return this.prisma.businessTypeTemplate.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  /** A domainType that isn't a real DomainType enum value (e.g. a client
   * sending a shorthand like "SME" instead of "SME_CORPORATE") is a normal
   * "not found" case, not a server bug — validate before querying instead of
   * letting Prisma throw a validation error that looks like a crash. */
  async getByDomainType(domainType: string) {
    if (!Object.values(DomainType).includes(domainType as DomainType)) return null;
    return this.prisma.businessTypeTemplate.findUnique({
      where: { domainType: domainType as DomainType },
    });
  }

  /** Every DomainType enum value not yet represented by a row — the only
   * valid choices for a new template, since domainType is unique and tied
   * to the fixed Prisma enum (adding a wholly new vertical requires a schema
   * migration to extend the enum first, which is out of scope here). */
  async listAvailableDomainTypes() {
    const used = await this.prisma.businessTypeTemplate.findMany({ select: { domainType: true } });
    const usedSet = new Set(used.map((u) => u.domainType));
    return Object.values(DomainType).filter((d) => !usedSet.has(d));
  }

  async create(input: CreateBusinessTemplateInput) {
    if (!Object.values(DomainType).includes(input.domainType as DomainType)) {
      throw new ConflictException(
        `"${input.domainType}" is not a valid DomainType. Valid unused values: ${(await this.listAvailableDomainTypes()).join(', ') || '(none — all 12 domain types already have a template)'}`,
      );
    }
    const existing = await this.prisma.businessTypeTemplate.findUnique({
      where: { domainType: input.domainType as DomainType },
    });
    if (existing) {
      throw new ConflictException(`A template for domainType "${input.domainType}" already exists (id ${existing.id}). Edit it instead of creating a duplicate.`);
    }
    return this.prisma.businessTypeTemplate.create({
      data: {
        domainType: input.domainType as DomainType,
        name: input.name,
        description: input.description,
        tagline: input.tagline,
        heroImage: input.heroImage ?? null,
        icon: input.icon ?? null,
        colorPrimary: input.colorPrimary,
        colorAccent: input.colorAccent,
        colorBg: input.colorBg,
        fontHeading: input.fontHeading ?? 'Inter',
        fontBody: input.fontBody ?? 'Inter',
        websiteSections: (input.websiteSections ?? []) as any,
        onboardingSteps: (input.onboardingSteps ?? []) as any,
        dashboardLayout: (input.dashboardLayout ?? {}) as any,
        features: (input.features ?? []) as any,
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 0,
      },
    });
  }

  async update(id: string, input: UpdateBusinessTemplateInput) {
    const existing = await this.prisma.businessTypeTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Business template ${id} not found`);

    if (input.domainType && input.domainType !== existing.domainType) {
      if (!Object.values(DomainType).includes(input.domainType as DomainType)) {
        throw new ConflictException(`"${input.domainType}" is not a valid DomainType`);
      }
      const clash = await this.prisma.businessTypeTemplate.findUnique({
        where: { domainType: input.domainType as DomainType },
      });
      if (clash) throw new ConflictException(`A template for domainType "${input.domainType}" already exists (id ${clash.id})`);
    }

    return this.prisma.businessTypeTemplate.update({
      where: { id },
      data: {
        ...(input.domainType !== undefined ? { domainType: input.domainType as DomainType } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.tagline !== undefined ? { tagline: input.tagline } : {}),
        ...(input.heroImage !== undefined ? { heroImage: input.heroImage } : {}),
        ...(input.icon !== undefined ? { icon: input.icon } : {}),
        ...(input.colorPrimary !== undefined ? { colorPrimary: input.colorPrimary } : {}),
        ...(input.colorAccent !== undefined ? { colorAccent: input.colorAccent } : {}),
        ...(input.colorBg !== undefined ? { colorBg: input.colorBg } : {}),
        ...(input.fontHeading !== undefined ? { fontHeading: input.fontHeading } : {}),
        ...(input.fontBody !== undefined ? { fontBody: input.fontBody } : {}),
        ...(input.websiteSections !== undefined ? { websiteSections: input.websiteSections as any } : {}),
        ...(input.onboardingSteps !== undefined ? { onboardingSteps: input.onboardingSteps as any } : {}),
        ...(input.dashboardLayout !== undefined ? { dashboardLayout: input.dashboardLayout as any } : {}),
        ...(input.features !== undefined ? { features: input.features as any } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      },
    });
  }

  /** "Delete" is really deactivate — domainType is unique and tied to the
   * fixed DomainType enum, so a hard delete would just leave that vertical
   * with no template row at all until someone manually recreates it (there's
   * no other row that could ever take its place, since the enum value is
   * exclusive to it). Hiding it from the public signup list while keeping
   * the row (and its content) around to reactivate is the safer, reversible
   * operation and is what "remove an industry from signup" actually means
   * in this schema. */
  async deactivate(id: string) {
    const existing = await this.prisma.businessTypeTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Business template ${id} not found`);
    return this.prisma.businessTypeTemplate.update({ where: { id }, data: { isActive: false } });
  }

  async reactivate(id: string) {
    const existing = await this.prisma.businessTypeTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Business template ${id} not found`);
    return this.prisma.businessTypeTemplate.update({ where: { id }, data: { isActive: true } });
  }

  /** Bulk reorder: body is an ordered array of ids, front-to-back. */
  async reorder(orderedIds: string[]) {
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.businessTypeTemplate.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );
    return this.listAllForAdmin();
  }
}
