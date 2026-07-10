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
  StreamableFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '@dexo/auth';
import { Public } from '@dexo/auth';

@ApiTags('files')
@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload file' })
  async uploadFile(
    @UploadedFile() file: any,
    @Body() body: { isPublic?: string },
    @Request() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const isPublic = body.isPublic === 'true';

    return this.filesService.uploadFile(
      {
        tenantId: req.user.tenantId,
        userId: req.user.id,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        isPublic,
      },
      file.buffer,
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
