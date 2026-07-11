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
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@dexo/auth';
import { MarketplaceService } from './marketplace.service';
import {
  CreateMarketplaceItemDto,
  UpdateMarketplaceItemDto,
  CreateReviewDto,
} from './marketplace.dto';

@ApiTags('marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  private assertPlatformAdmin(req: any) {
    if (!req.user?.isPlatformAdmin) {
      throw new ForbiddenException('Platform admin access required');
    }
  }

  private assertTenant(req: any): string {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context required');
    return tenantId;
  }

  // ---------- Public ----------

  @Get()
  @ApiOperation({ summary: 'Browse published marketplace items' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'domainType', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'sort', required: false, description: 'popular | newest | rating' })
  async list(
    @Query('type') type?: string,
    @Query('category') category?: string,
    @Query('domainType') domainType?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '12',
  ) {
    return this.marketplace.list({
      type,
      category,
      domainType,
      search,
      sort,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 12,
    });
  }

  // ---------- Tenant (declared before :slug so they aren't swallowed) ----------

  @Get('installed')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List tenant's installed marketplace items" })
  async installed(@Req() req: any) {
    return this.marketplace.listInstalled(this.assertTenant(req));
  }

  // ---------- Platform admin ----------

  @Get('admin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all marketplace items incl. drafts (platform admin)' })
  async adminList(
    @Req() req: any,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    this.assertPlatformAdmin(req);
    return this.marketplace.list({
      type,
      status,
      search,
      sort: 'newest',
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      includeUnpublished: true,
    });
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create marketplace item (platform admin)' })
  async create(@Req() req: any, @Body() dto: CreateMarketplaceItemDto) {
    this.assertPlatformAdmin(req);
    return this.marketplace.create(dto);
  }

  @Put('admin/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update marketplace item (platform admin)' })
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateMarketplaceItemDto) {
    this.assertPlatformAdmin(req);
    return this.marketplace.update(id, dto);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete marketplace item (platform admin)' })
  async remove(@Req() req: any, @Param('id') id: string) {
    this.assertPlatformAdmin(req);
    return this.marketplace.remove(id);
  }

  @Post('admin/:id/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish marketplace item (platform admin)' })
  async publish(@Req() req: any, @Param('id') id: string) {
    this.assertPlatformAdmin(req);
    return this.marketplace.setStatus(id, 'published');
  }

  @Post('admin/:id/archive')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive marketplace item (platform admin)' })
  async archive(@Req() req: any, @Param('id') id: string) {
    this.assertPlatformAdmin(req);
    return this.marketplace.setStatus(id, 'archived');
  }

  // ---------- Tenant install / review ----------

  @Post(':id/install')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Install a marketplace item for the tenant (free items only)' })
  async install(@Req() req: any, @Param('id') id: string) {
    return this.marketplace.install(id, this.assertTenant(req));
  }

  @Delete(':id/install')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Uninstall a marketplace item for the tenant' })
  async uninstall(@Req() req: any, @Param('id') id: string) {
    return this.marketplace.uninstall(id, this.assertTenant(req));
  }

  @Post(':id/review')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Leave a review (1-5 rating + comment)' })
  async review(@Req() req: any, @Param('id') id: string, @Body() dto: CreateReviewDto) {
    const user = req.user;
    if (!user?.id) throw new ForbiddenException('Access denied');
    return this.marketplace.review(id, user.tenantId || null, user.id, dto.rating, dto.comment);
  }

  // ---------- Public detail (last: catch-all slug) ----------

  @Get(':slug')
  @ApiOperation({ summary: 'Get published marketplace item by slug (with reviews)' })
  async getBySlug(@Param('slug') slug: string) {
    return this.marketplace.getBySlug(slug);
  }
}
