import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import { CreateCommentDto, UpdateCommentStatusDto, CommentStatusDto } from './dto';

@Injectable()
export class CommentService {
  constructor(private prisma: PrismaService) {}

  async create(blogId: string, createCommentDto: CreateCommentDto, userId?: string) {
    const blog = await this.prisma.blog.findUnique({
      where: { id: blogId },
    });

    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    if (!userId && (!createCommentDto.guestName || !createCommentDto.guestEmail)) {
      throw new ForbiddenException('Guest comments require name and email');
    }

    return this.prisma.blogComment.create({
      data: {
        content: createCommentDto.content,
        blogId,
        authorId: userId,
        guestName: createCommentDto.guestName,
        guestEmail: createCommentDto.guestEmail,
        status: userId ? CommentStatusDto.PENDING : CommentStatusDto.PENDING,
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
      },
    });
  }

  async findByBlog(blogId: string, status?: CommentStatusDto) {
    const where: any = { blogId };
    
    if (status) {
      where.status = status;
    } else {
      where.status = CommentStatusDto.APPROVED;
    }

    return this.prisma.blogComment.findMany({
      where,
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
    });
  }

  async updateStatus(commentId: string, updateDto: UpdateCommentStatusDto, userId: string, userTenantId?: string, isPlatformAdmin?: boolean) {
    const comment = await this.prisma.blogComment.findUnique({
      where: { id: commentId },
      include: {
        blog: true,
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (!isPlatformAdmin && comment.blog.tenantId !== userTenantId) {
      throw new ForbiddenException('You cannot moderate comments from other tenants');
    }

    if (!isPlatformAdmin && comment.blog.authorId !== userId) {
      throw new ForbiddenException('Only the blog author can moderate comments');
    }

    return this.prisma.blogComment.update({
      where: { id: commentId },
      data: { status: updateDto.status },
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
    });
  }

  async remove(commentId: string, userId: string, userTenantId?: string, isPlatformAdmin?: boolean) {
    const comment = await this.prisma.blogComment.findUnique({
      where: { id: commentId },
      include: {
        blog: true,
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (!isPlatformAdmin && comment.authorId !== userId && comment.blog.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own comments or comments on your blogs');
    }

    if (!isPlatformAdmin && comment.blog.tenantId !== userTenantId) {
      throw new ForbiddenException('You cannot delete comments from other tenants');
    }

    await this.prisma.blogComment.delete({
      where: { id: commentId },
    });

    return { message: 'Comment deleted successfully' };
  }
}
