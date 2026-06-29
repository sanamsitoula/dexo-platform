import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

@Injectable()
export class NepaliFoodService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: { search?: string; category?: string; isVegetarian?: boolean; isVegan?: boolean; isTraditional?: boolean }) {
    const where: any = { isActive: true };
    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { nameNepali: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params?.category) where.category = params.category;
    if (params?.isVegetarian !== undefined) where.isVegetarian = params.isVegetarian;
    if (params?.isVegan !== undefined) where.isVegan = params.isVegan;
    if (params?.isTraditional !== undefined) where.isTraditional = params.isTraditional;
    return this.prisma.nepaliFoodItem.findMany({
      where,
      orderBy: [{ isTraditional: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const f = await this.prisma.nepaliFoodItem.findUnique({ where: { id } });
    if (!f) throw new NotFoundException('Food item not found');
    return f;
  }

  async create(dto: any) {
    return this.prisma.nepaliFoodItem.create({ data: dto });
  }

  async update(id: string, dto: any) {
    await this.findOne(id);
    return this.prisma.nepaliFoodItem.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.nepaliFoodItem.update({ where: { id }, data: { isActive: false } });
  }

  async getCategories() {
    const items = await this.prisma.nepaliFoodItem.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ['category'],
    });
    return items.map((i) => i.category);
  }
}
