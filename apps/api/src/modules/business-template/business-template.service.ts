import { Injectable } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import { DomainType } from '@prisma/client';

@Injectable()
export class BusinessTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async listAll() {
    return this.prisma.businessTypeTemplate.findMany({
      orderBy: { name: 'asc' },
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
}
