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
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@dexo/auth';
import { CommentService } from './comment.service';
import { CreateCommentDto, UpdateCommentStatusDto, CommentStatusDto } from './dto';

@ApiTags('blog-comments')
@Controller('blogs/:blogId/comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get()
  @ApiOperation({ summary: 'Get comments for a blog' })
  @ApiQuery({ name: 'status', required: false, enum: CommentStatusDto })
  async findByBlog(
    @Param('blogId') blogId: string,
    @Query('status') status?: CommentStatusDto,
  ) {
    return this.commentService.findByBlog(blogId, status);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add comment to blog' })
  async create(
    @Param('blogId') blogId: string,
    @Body() createCommentDto: CreateCommentDto,
    @Req() req: any,
  ) {
    return this.commentService.create(blogId, createCommentDto, req.user?.id);
  }
}

@ApiTags('blog-comments')
@Controller('comments')
export class CommentModerationController {
  constructor(private readonly commentService: CommentService) {}

  @Put(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update comment status (moderate)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateCommentStatusDto,
    @Req() req: any,
  ) {
    return this.commentService.updateStatus(
      id,
      updateDto,
      req.user.id,
      req.user.tenantId,
      req.user.isPlatformAdmin,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete comment' })
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.commentService.remove(
      id,
      req.user.id,
      req.user.tenantId,
      req.user.isPlatformAdmin,
    );
  }
}
