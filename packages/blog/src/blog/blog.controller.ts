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
import { JwtAuthGuard, PlatformAdminGuard } from '@dexo/auth';
import { RequireModule } from '@dexo/shared';
import { BlogService } from './blog.service';
import { CreateBlogDto, UpdateBlogDto, QueryBlogDto } from './dto';

@ApiTags('blogs')
@Controller('blogs')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get()
  @ApiOperation({ summary: 'Get published blogs (public)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'authorId', required: false })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({ name: 'subdomain', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(@Query() query: QueryBlogDto) {
    return this.blogService.findAll(query);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all blogs for admin (platform or tenant)' })
  async findAllForAdmin(@Query() query: QueryBlogDto, @Req() req: any) {
    return this.blogService.findAllForAdmin(
      query,
      req.user.id,
      req.user.tenantId,
      req.user.isPlatformAdmin,
    );
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user blogs' })
  async findMyBlogs(@Query() query: QueryBlogDto, @Req() req: any) {
    return this.blogService.findMyBlogs(req.user.id, query);
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get blog by ID (admin)' })
  async findOne(@Param('id') id: string) {
    return this.blogService.findOne(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get blog stats (views, likes, comments)' })
  async getStats(@Param('id') id: string) {
    return this.blogService.getStats(id);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get blog by slug (public)' })
  async findBySlug(@Param('slug') slug: string) {
    return this.blogService.findBySlug(slug);
  }

  @Post('slug-suggest')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suggest an SEO-friendly slug from a title' })
  async suggestSlug(@Body('title') title: string) {
    return this.blogService.suggestSlug(title || '');
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @RequireModule('blog')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create blog' })
  async create(@Body() createBlogDto: CreateBlogDto, @Req() req: any) {
    return this.blogService.create(
      createBlogDto,
      req.user.id,
      req.user.tenantId,
    );
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @RequireModule('blog')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update blog' })
  async update(
    @Param('id') id: string,
    @Body() updateBlogDto: UpdateBlogDto,
    @Req() req: any,
  ) {
    return this.blogService.update(
      id,
      updateBlogDto,
      req.user.id,
      req.user.tenantId,
      req.user.isPlatformAdmin,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @RequireModule('blog')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete blog' })
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.blogService.remove(
      id,
      req.user.id,
      req.user.tenantId,
      req.user.isPlatformAdmin,
    );
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  @RequireModule('blog')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish blog' })
  async publish(@Param('id') id: string, @Req() req: any) {
    return this.blogService.publish(
      id,
      req.user.id,
      req.user.tenantId,
      req.user.isPlatformAdmin,
    );
  }
}
