import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import { CreateBlogDto, UpdateBlogDto, QueryBlogDto, BlogStatusDto } from './dto';

@Injectable()
export class BlogService {
  constructor(private prisma: PrismaService) {}

  async create(createBlogDto: CreateBlogDto, userId: string, tenantId?: string) {
    const slug = await this.generateSlug(createBlogDto.title);

    const blog = await this.prisma.blog.create({
      data: {
        title: createBlogDto.title,
        slug,
        content: createBlogDto.content,
        excerpt: createBlogDto.excerpt,
        featuredImage: createBlogDto.featuredImage,
        status: createBlogDto.status || BlogStatusDto.DRAFT,
        metaTitle: createBlogDto.metaTitle,
        metaDescription: createBlogDto.metaDescription,
        scheduledAt: createBlogDto.scheduledAt,
        authorId: userId,
        categoryId: createBlogDto.categoryId,
        tenantId: tenantId || createBlogDto.tenantId || null,
        publishedAt: createBlogDto.status === BlogStatusDto.PUBLISHED ? new Date() : null,
        tags: createBlogDto.tagIds
          ? {
              connect: createBlogDto.tagIds.map((id) => ({ id })),
            }
          : undefined,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        category: true,
        tags: true,
        tenant: {
          select: {
            id: true,
            name: true,
            subdomain: true,
          },
        },
      },
    });

    return blog;
  }

  async findAll(query: QueryBlogDto) {
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '10');
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    } else {
      where.status = BlogStatusDto.PUBLISHED;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.authorId) {
      where.authorId = query.authorId;
    }

    if (query.tenantId) {
      where.tenantId = query.tenantId;
    } else if (query.subdomain) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { subdomain: query.subdomain },
      });
      if (tenant) {
        where.tenantId = tenant.id;
      }
    } else {
      where.tenantId = null;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
        { excerpt: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [blogs, total] = await Promise.all([
      this.prisma.blog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
            },
          },
          category: true,
          tags: true,
          _count: {
            select: {
              comments: true,
            },
          },
        },
      }),
      this.prisma.blog.count({ where }),
    ]);

    return {
      data: blogs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAllForAdmin(query: QueryBlogDto, userId: string, userTenantId?: string, isPlatformAdmin?: boolean) {
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '10');
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.authorId) {
      where.authorId = query.authorId;
    }

    if (isPlatformAdmin) {
      if (query.tenantId) {
        where.tenantId = query.tenantId;
      }
    } else {
      where.tenantId = userTenantId || null;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [blogs, total] = await Promise.all([
      this.prisma.blog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
            },
          },
          category: true,
          tags: true,
          tenant: {
            select: {
              id: true,
              name: true,
              subdomain: true,
            },
          },
          _count: {
            select: {
              comments: true,
            },
          },
        },
      }),
      this.prisma.blog.count({ where }),
    ]);

    return {
      data: blogs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findBySlug(slug: string) {
    const blog = await this.prisma.blog.findUnique({
      where: { slug },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        category: true,
        tags: true,
        tenant: {
          select: {
            id: true,
            name: true,
            subdomain: true,
          },
        },
        comments: {
          where: { status: 'approved' },
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    await this.prisma.blog.update({
      where: { id: blog.id },
      data: { viewCount: { increment: 1 } },
    });

    return blog;
  }

  async findOne(id: string) {
    const blog = await this.prisma.blog.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        category: true,
        tags: true,
        tenant: {
          select: {
            id: true,
            name: true,
            subdomain: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    return blog;
  }

  async findMyBlogs(userId: string, query: QueryBlogDto) {
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '10');
    const skip = (page - 1) * limit;

    const where: any = { authorId: userId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [blogs, total] = await Promise.all([
      this.prisma.blog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          tags: true,
          _count: {
            select: { comments: true },
          },
        },
      }),
      this.prisma.blog.count({ where }),
    ]);

    return {
      data: blogs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(id: string, updateBlogDto: UpdateBlogDto, userId: string, userTenantId?: string, isPlatformAdmin?: boolean) {
    const blog = await this.prisma.blog.findUnique({
      where: { id },
    });

    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    if (!isPlatformAdmin && blog.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own blogs');
    }

    if (!isPlatformAdmin && blog.tenantId !== userTenantId) {
      throw new ForbiddenException('You cannot edit blogs from other tenants');
    }

    const data: any = {};

    if (updateBlogDto.title) {
      data.title = updateBlogDto.title;
      data.slug = await this.generateSlug(updateBlogDto.title);
    }
    if (updateBlogDto.content) data.content = updateBlogDto.content;
    if (updateBlogDto.excerpt !== undefined) data.excerpt = updateBlogDto.excerpt;
    if (updateBlogDto.featuredImage !== undefined) data.featuredImage = updateBlogDto.featuredImage;
    if (updateBlogDto.metaTitle !== undefined) data.metaTitle = updateBlogDto.metaTitle;
    if (updateBlogDto.metaDescription !== undefined) data.metaDescription = updateBlogDto.metaDescription;
    if (updateBlogDto.scheduledAt !== undefined) data.scheduledAt = updateBlogDto.scheduledAt;
    if (updateBlogDto.categoryId !== undefined) data.categoryId = updateBlogDto.categoryId;

    if (updateBlogDto.status) {
      data.status = updateBlogDto.status;
      if (updateBlogDto.status === BlogStatusDto.PUBLISHED && !blog.publishedAt) {
        data.publishedAt = new Date();
      }
    }

    if (updateBlogDto.tagIds) {
      data.tags = {
        set: updateBlogDto.tagIds.map((id) => ({ id })),
      };
    }

    return this.prisma.blog.update({
      where: { id },
      data,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        category: true,
        tags: true,
      },
    });
  }

  async remove(id: string, userId: string, userTenantId?: string, isPlatformAdmin?: boolean) {
    const blog = await this.prisma.blog.findUnique({
      where: { id },
    });

    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    if (!isPlatformAdmin && blog.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own blogs');
    }

    if (!isPlatformAdmin && blog.tenantId !== userTenantId) {
      throw new ForbiddenException('You cannot delete blogs from other tenants');
    }

    await this.prisma.blog.delete({
      where: { id },
    });

    return { message: 'Blog deleted successfully' };
  }

  async publish(id: string, userId: string, userTenantId?: string, isPlatformAdmin?: boolean) {
    const blog = await this.prisma.blog.findUnique({
      where: { id },
    });

    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    if (!isPlatformAdmin && blog.authorId !== userId) {
      throw new ForbiddenException('You can only publish your own blogs');
    }

    if (!isPlatformAdmin && blog.tenantId !== userTenantId) {
      throw new ForbiddenException('You cannot publish blogs from other tenants');
    }

    return this.prisma.blog.update({
      where: { id },
      data: {
        status: BlogStatusDto.PUBLISHED,
        publishedAt: blog.publishedAt || new Date(),
      },
    });
  }

  private async generateSlug(title: string): Promise<string> {
    let slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    let counter = 1;
    let uniqueSlug = slug;

    while (await this.prisma.blog.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    return uniqueSlug;
  }
}
