import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  StreamableFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '@dexo/auth';
import { Public } from '@dexo/auth';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // hard multer ceiling; per-documentType limits are enforced in FilesService

@ApiTags('files')
@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  @ApiOperation({ summary: 'Upload a single file. Body: documentType (LOGO/PROFILE_PIC/DOCUMENT/INVOICE/CONTRACT/ID_PROOF/OTHER), scope (TENANT/PLATFORM), isPublic.' })
  async uploadFile(
    @UploadedFile() file: any,
    @Body() body: { isPublic?: string; documentType?: string; scope?: string },
    @Request() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // PLATFORM scope (e.g. the platform's own logo) has no tenant and is
    // gated to platform admins — everyone else is forced to TENANT scope
    // under their own tenant, regardless of what the client sends.
    const wantsPlatformScope = body.scope === 'PLATFORM';
    if (wantsPlatformScope && !req.user.isPlatformAdmin) {
      throw new BadRequestException('Only platform admins may upload platform-scoped files');
    }
    const scope = wantsPlatformScope ? 'PLATFORM' : 'TENANT';
    const isPublic = body.isPublic === 'true';

    return this.filesService.uploadFile(
      {
        tenantId: scope === 'PLATFORM' ? null : req.user.tenantId,
        userId: req.user.id,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        isPublic,
        documentType: body.documentType || 'OTHER',
        scope,
      },
      file.buffer,
    );
  }

  @Post('upload-multiple')
  @UseInterceptors(FilesInterceptor('files', 10, { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  @ApiOperation({ summary: 'Upload up to 10 files in one request (all-or-nothing validation). Body: documentType, isPublic.' })
  async uploadMultipleFiles(
    @UploadedFiles() files: any[],
    @Body() body: { isPublic?: string; documentType?: string },
    @Request() req: any,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }
    const isPublic = body.isPublic === 'true';

    return this.filesService.uploadMultipleFiles(
      files.map((f) => ({ originalName: f.originalname, mimeType: f.mimetype, sizeBytes: f.size, buffer: f.buffer })),
      {
        tenantId: req.user.tenantId,
        userId: req.user.id,
        isPublic,
        documentType: body.documentType || 'DOCUMENT',
        scope: 'TENANT',
      },
    );
  }

  @Get('download/:id')
  @ApiOperation({ summary: 'Get file download URL' })
  async getDownloadUrl(@Param('id') id: string, @Request() req: any) {
    return this.filesService.getDownloadUrl(id, req.user.id);
  }

  @Get('stream/:id')
  @ApiOperation({ summary: 'Stream file' })
  async streamFile(@Param('id') id: string, @Request() req: any, @Res() res: Response) {
    const { stream, contentType, contentLength, filename } = await this.filesService.streamFile(
      id,
      req.user.id,
    );

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', contentLength);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    stream.pipe(res);
  }

  @Get()
  @ApiOperation({ summary: 'Get all files' })
  async findAll(@Request() req: any) {
    return this.filesService.findAll(req.user.tenantId, req.user.id);
  }

  @Get('storage')
  @ApiOperation({ summary: 'Get tenant storage stats' })
  async getStorage(@Request() req: any) {
    return this.filesService.getTenantStorage(req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file by ID' })
  async findOne(@Param('id') id: string) {
    return this.filesService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update file metadata' })
  async update(@Param('id') id: string, @Body() data: any) {
    return (this.filesService as any).update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete file' })
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.filesService.delete(id, req.user.id);
  }

  @Public()
  @Get('public/:id')
  @ApiOperation({ summary: 'Get public file' })
  async getPublicFile(@Param('id') id: string, @Res() res: Response) {
    const { stream, contentType, contentLength, filename } = await this.filesService.streamFile(id);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', contentLength);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    stream.pipe(res);
  }
}
