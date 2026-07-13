import { Injectable, Logger, NotFoundException, BadRequestException, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;
  private readonly endpoint?: string;

  constructor(private configService: ConfigService) {
    const useMinIO = this.configService.get('USE_MINIO') === 'true';

    this.bucketName = this.configService.get('S3_BUCKET') || 'dexo-files';
    this.region = this.configService.get('S3_REGION') || 'us-east-1';

    if (useMinIO) {
      this.endpoint = this.configService.get('MINIO_ENDPOINT') || 'http://localhost:9000';
      this.s3Client = new S3Client({
        region: this.region,
        endpoint: this.endpoint,
        forcePathStyle: true,
        credentials: {
          accessKeyId: this.configService.get('MINIO_ACCESS_KEY') || 'minioadmin',
          secretAccessKey: this.configService.get('MINIO_SECRET_KEY') || 'minioadmin',
        },
      });
      this.logger.log(`S3Service initialized with MinIO at ${this.endpoint}`);
    } else {
      this.s3Client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID') || '',
          secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY') || '',
        },
      });
      this.logger.log('S3Service initialized with AWS S3');
    }
  }

  async uploadFile(
    key: string,
    body: Buffer | Uint8Array | string,
    contentType: string,
    metadata?: Record<string, string>,
  ): Promise<{ key: string; url: string }> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
        Metadata: metadata,
      });

      await this.s3Client.send(command);
      this.logger.log(`File uploaded successfully: ${key}`);

      return {
        key,
        url: await this.getSignedUrl(key, 3600),
      };
    } catch (error: any) {
      // A failed PUT here means S3/MinIO itself is unreachable/misconfigured
      // (e.g. a missing bucket) — a server-side infrastructure problem, not
      // something the uploader did wrong. 500 (not 400) so it's picked up
      // by CentralErrorFilter's ErrorLog persistence instead of silently
      // looking like a client mistake.
      this.logger.error(`Failed to upload file "${key}": ${error?.message || error}`);
      throw new InternalServerErrorException('Failed to upload file — storage is temporarily unavailable');
    }
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;
    } catch (error: any) {
      this.logger.error('Failed to generate signed URL:', error);
      throw new BadRequestException('Failed to generate download URL');
    }
  }

  async downloadFile(key: string): Promise<{
    stream: any;
    contentType: string;
    contentLength: number;
  }> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      return {
        stream: response.Body,
        contentType: response.ContentType || 'application/octet-stream',
        contentLength: response.ContentLength || 0,
      };
    } catch (error: any) {
      this.logger.error('Failed to download file:', error);
      throw new NotFoundException('File not found');
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error: any) {
      this.logger.error('Failed to delete file:', error);
      throw new BadRequestException('Failed to delete file');
    }
  }

  async listFiles(prefix?: string): Promise<string[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
      });

      const response = await this.s3Client.send(command);

      return (response.Contents?.map(obj => obj.Key).filter((k): k is string => !!k)) || [];
    } catch (error: any) {
      this.logger.error('Failed to list files:', error);
      throw new BadRequestException('Failed to list files');
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  async onModuleInit(): Promise<void> {
    await this.ensureBucketExists();
  }

  /** Neither MinIO nor AWS S3 auto-creates a bucket just because you PUT to
   * it — every upload was silently failing with a generic "Failed to upload
   * file" until this actually ran. Runs on every API boot; a no-op once the
   * bucket exists (HeadBucket succeeds), so it's always safe to call. */
  async ensureBucketExists(): Promise<void> {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      this.logger.log(`Using existing bucket: ${this.bucketName}`);
    } catch (error: any) {
      const notFound = error?.$metadata?.httpStatusCode === 404 || error?.name === 'NotFound';
      if (!notFound) {
        this.logger.error(`Failed to check bucket "${this.bucketName}":`, error?.message || error);
        return;
      }
      try {
        await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
        this.logger.log(`Created missing bucket: ${this.bucketName}`);
      } catch (createError: any) {
        this.logger.error(`Failed to create bucket "${this.bucketName}":`, createError?.message || createError);
      }
    }
  }

  /**
   * Per-tenant folder structure, grouped by document type, e.g.:
   *   platform/logo/public/<ts>-logo.png                    (scope=PLATFORM)
   *   <tenantId>/logo/public/<ts>-logo.png                  (scope=TENANT, LOGO)
   *   <tenantId>/profile_pic/<userId>/<ts>-avatar.jpg
   *   <tenantId>/document/<userId>/<ts>-invoice.pdf
   * This full key is what's persisted in File.s3Key — the database is
   * always the source of truth for where a given file actually lives.
   */
  generateKey(tenantId: string, userId: string | null, fileName: string, documentType = 'other'): string {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const typeSegment = documentType.toLowerCase();
    const ownerSegment = userId || 'public';
    return `${tenantId}/${typeSegment}/${ownerSegment}/${timestamp}-${sanitizedFileName}`;
  }
}
