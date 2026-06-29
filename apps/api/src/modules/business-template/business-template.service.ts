import { Injectable } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

@Injectable()
export class BusinessTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async listAll() {
    return this.prisma.businessTypeTemplate.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getByDomainType(domainType: string) {
    return this.prisma.businessTypeTemplate.findUnique({
      where: { domainType: domainType as any },
    });
  }
}
