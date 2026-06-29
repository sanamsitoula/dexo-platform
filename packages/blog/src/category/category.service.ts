import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto, tenantId?: string) {
    const slug = await this.generateSlug(createCategoryDto.name);
    const finalTenantId = tenantId || createCategoryDto.tenantId || null;

    return this.prisma.blogCategory.create({
      data: {
        name: createCategoryDto.name,
        slug,
        description: createCategoryDto.description,
        color: createCategoryDto.color,
        icon: createCategoryDto.icon,
        parentId: createCategoryDto.parentId,
        tenantId: finalTenantId,
      },
    });
  }

  async findAll(tenantId?: string) {
    const where: any = {};
    
    if (tenantId) {
      where.OR = [
        { tenantId },
        { tenantId: null },
      ];
    } else {
      where.tenantId = null;
    }

    return this.prisma.blogCategory.findMany({
      where,
      include: {
        children: true,
        _count: {
          select: { blogs: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.blogCategory.findUnique({
      where: { id },
      include: {
        children: true,
        parent: true,
        blogs: {
          where: { status: 'published' },
          take: 10,
          orderBy: { publishedAt: 'desc' },
        },
        _count: {
          select: { blogs: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.blogCategory.findUnique({
      where: { slug },
      include: {
        children: true,
        parent: true,
        blogs: {
          where: { status: 'published' },
          orderBy: { publishedAt: 'desc' },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto, tenantId?: string, isPlatformAdmin?: boolean) {
    const category = await this.prisma.blogCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (!isPlatformAdmin && category.tenantId !== tenantId) {
      throw new ForbiddenException('You cannot edit categories from other tenants');
    }

    const data: any = {};
    if (updateCategoryDto.name) {
      data.name = updateCategoryDto.name;
      data.slug = await this.generateSlug(updateCategoryDto.name);
    }
    if (updateCategoryDto.description !== undefined) data.description = updateCategoryDto.description;
    if (updateCategoryDto.color !== undefined) data.color = updateCategoryDto.color;
    if (updateCategoryDto.icon !== undefined) data.icon = updateCategoryDto.icon;
    if (updateCategoryDto.parentId !== undefined) data.parentId = updateCategoryDto.parentId;

    return this.prisma.blogCategory.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, tenantId?: string, isPlatformAdmin?: boolean) {
    const category = await this.prisma.blogCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { blogs: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (!isPlatformAdmin && category.tenantId !== tenantId) {
      throw new ForbiddenException('You cannot delete categories from other tenants');
    }

    if (category._count.blogs > 0) {
      throw new ForbiddenException('Cannot delete category with blogs');
    }

    await this.prisma.blogCategory.delete({
      where: { id },
    });

    return { message: 'Category deleted successfully' };
  }

  private async generateSlug(name: string): Promise<string> {
    let slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    let counter = 1;
    let uniqueSlug = slug;

    while (await this.prisma.blogCategory.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    return uniqueSlug;
  }
}
