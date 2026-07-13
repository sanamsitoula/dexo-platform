import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService as PrismaTenantService } from '@dexo/tenant';
import { S3Service } from '../storage/s3.service';
import { validateFile } from './file-validation';

export interface UploadFileInput {
  /** null tenantId + scope 'PLATFORM' = a platform-owned file (e.g. platform logo). */
  tenantId: string | null;
  userId?: string;
  originalName: string;
  mimeType?: string;
  sizeBytes?: number;
  isPublic?: boolean;
  documentType?: string;
  scope?: 'TENANT' | 'PLATFORM';
}

@Injectable()
export class FilesService {
  constructor(
    private prisma: PrismaTenantService,
    private s3Service: S3Service,
  ) {}

  async uploadFile(data: UploadFileInput, fileBuffer: Buffer) {
    const documentType = data.documentType || 'OTHER';
    const scope = data.scope || (data.tenantId ? 'TENANT' : 'PLATFORM');
    const sizeBytes = data.sizeBytes ?? fileBuffer.length;

    validateFile(documentType, data.mimeType, sizeBytes);

    if (scope === 'TENANT' && !data.tenantId) {
      throw new BadRequestException('tenantId is required for TENANT-scoped files');
    }

    const s3Key = this.s3Service.generateKey(
      data.tenantId || 'platform',
      data.userId || null,
      data.originalName,
      documentType,
    );

    // Upload to S3
    await this.s3Service.uploadFile(
      s3Key,
      fileBuffer,
      data.mimeType || 'application/octet-stream',
      {
        tenantId: data.tenantId || 'platform',
        userId: data.userId || 'system',
        originalName: data.originalName,
        documentType,
      },
    );

    // Save metadata to database
    const file = await this.prisma.file.create({
      data: {
        tenantId: data.tenantId || undefined,
        userId: data.userId,
        scope: scope as any,
        documentType: documentType as any,
        s3Key,
        originalName: data.originalName,
        mimeType: data.mimeType,
        sizeBytes,
        isPublic: data.isPublic || false,
      },
    });

    await this.logFileAction('file.upload', file.id, data.tenantId, data.userId, {
      documentType,
      scope,
      originalName: data.originalName,
      mimeType: data.mimeType,
      sizeBytes,
    });

    return {
      id: file.id,
      originalName: file.originalName,
      sizeBytes: file.sizeBytes,
      mimeType: file.mimeType,
      documentType: file.documentType,
      scope: file.scope,
      downloadUrl: await this.s3Service.getSignedUrl(s3Key, 3600),
    };
  }

  /** Multiple files in one request — each validated independently against
   * the same documentType's rules, so a single oversized/wrong-type file
   * fails without silently dropping the others (all-or-nothing). */
  async uploadMultipleFiles(
    files: Array<{ originalName: string; mimeType?: string; sizeBytes?: number; buffer: Buffer }>,
    common: Omit<UploadFileInput, 'originalName' | 'mimeType' | 'sizeBytes'>,
  ) {
    const results = [];
    for (const f of files) {
      results.push(
        await this.uploadFile(
          { ...common, originalName: f.originalName, mimeType: f.mimeType, sizeBytes: f.sizeBytes },
          f.buffer,
        ),
      );
    }
    return results;
  }

  private async logFileAction(
    action: string,
    fileId: string,
    tenantId: string | null | undefined,
    userId: string | null | undefined,
    changes: Record<string, any>,
  ): Promise<void> {
    await this.prisma.auditLog
      .create({
        data: {
          tenantId: tenantId || undefined,
          userId: userId || undefined,
          action,
          resourceType: 'File',
          resourceId: fileId,
          changes,
        },
      })
      .catch(() => { /* audit logging must never break the upload/delete path */ });
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

    await this.logFileAction('file.delete', file.id, file.tenantId, userId, {
      documentType: file.documentType,
      originalName: file.originalName,
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
