import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService as PrismaTenantService } from '@dexo/tenant';
import { S3Service } from '../storage/s3.service';

@Injectable()
export class FilesService {
  constructor(
    private prisma: PrismaTenantService,
    private s3Service: S3Service,
  ) {}

  async uploadFile(
    data: {
      tenantId: string;
      userId?: string;
      originalName: string;
      mimeType?: string;
      sizeBytes?: number;
      isPublic?: boolean;
    },
    fileBuffer: Buffer,
  ) {
    const s3Key = this.s3Service.generateKey(
      data.tenantId,
      data.userId || null,
      data.originalName,
    );

    // Upload to S3
    await this.s3Service.uploadFile(
      s3Key,
      fileBuffer,
      data.mimeType || 'application/octet-stream',
      {
        tenantId: data.tenantId,
        userId: data.userId || 'system',
        originalName: data.originalName,
      },
    );

    // Save metadata to database
    const file = await this.prisma.file.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        s3Key,
        originalName: data.originalName,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes || fileBuffer.length,
        isPublic: data.isPublic || false,
      },
    });

    return {
      id: file.id,
      originalName: file.originalName,
      sizeBytes: file.sizeBytes,
      mimeType: file.mimeType,
      downloadUrl: await this.s3Service.getSignedUrl(s3Key, 3600),
    };
  }

  async getDownloadUrl(fileId: string, userId?: string) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Check if user has access (same tenant or file is public)
    if (!file.isPublic && userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { tenantId: true },
      });

      if (!user || user.tenantId !== file.tenantId) {
        throw new BadRequestException('You do not have access to this file');
      }
    }

    const url = await this.s3Service.getSignedUrl(file.s3Key, 3600);

    return {
      id: file.id,
      originalName: file.originalName,
      sizeBytes: file.sizeBytes,
      mimeType: file.mimeType,
      downloadUrl: url,
    };
  }

  async streamFile(fileId: string, userId?: string) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Check access
    if (!file.isPublic && userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { tenantId: true },
      });

      if (!user || user.tenantId !== file.tenantId) {
        throw new BadRequestException('You do not have access to this file');
      }
    }

    const { stream, contentType, contentLength } = await this.s3Service.downloadFile(file.s3Key);

    return {
      stream,
      contentType,
      contentLength,
      filename: file.originalName,
    };
  }

  async findAll(tenantId?: string, userId?: string) {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (userId) where.userId = userId;
    return this.prisma.file.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const file = await this.prisma.file.findUnique({
      where: { id },
    });
    if (!file) throw new NotFoundException('File not found');
    return file;
  }

  async delete(id: string, userId?: string) {
    const file = await this.prisma.file.findUnique({
      where: { id },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Check access
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { tenantId: true },
      });

      if (!user || user.tenantId !== file.tenantId) {
        throw new BadRequestException('You do not have access to this file');
      }
    }

    // Delete from S3
    await this.s3Service.deleteFile(file.s3Key);

    // Delete from database
    await this.prisma.file.delete({
      where: { id },
    });

    return { message: 'File deleted successfully' };
  }

  async getTenantStorage(tenantId: string) {
    const files = await this.prisma.file.findMany({
      where: { tenantId },
      select: { sizeBytes: true },
    });
    const totalBytes = files.reduce((sum, f) => sum + Number(f.sizeBytes || 0), 0);
    return {
      totalBytes,
      totalMB: Math.round(totalBytes / (1024 * 1024) * 100) / 100,
      totalGB: Math.round(totalBytes / (1024 * 1024 * 1024) * 100) / 100,
      fileCount: files.length,
    };
  }
}
