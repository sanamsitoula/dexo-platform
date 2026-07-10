import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
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
      this.logger.error('Failed to upload file:', error);
      throw new BadRequestException('Failed to upload file');
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

  async ensureBucketExists(): Promise<void> {
    try {
      // In production with AWS S3, ensure bucket exists via AWS SDK
      // For MinIO, buckets are auto-created
      this.logger.log(`Using bucket: ${this.bucketName}`);
    } catch (error: any) {
      this.logger.error('Failed to ensure bucket exists:', error);
    }
  }

  generateKey(tenantId: string, userId: string | null, fileName: string): string {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return userId
      ? `${tenantId}/${userId}/${timestamp}-${sanitizedFileName}`
      : `${tenantId}/public/${timestamp}-${sanitizedFileName}`;
  }
}
