import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, Public } from '@dexo/auth';
import { PageBuilderService } from './page-builder.service';

function ctxFrom(req: any) {
  return {
    tenantId: req.user.tenantId,
    userId: req.user.id || req.user.sub,
    ipAddress: req.ip,
    userAgent: req.headers?.['user-agent']?.substring(0, 500),
  };
}

/**
 * Tenant-scoped Page Builder API — mirrors MenuBuilderController's
 * conventions exactly (tenantId always from the JWT, never client input).
 */
@ApiTags('page-builder')
@Controller('pages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PageBuilderController {
  constructor(private service: PageBuilderService) {}

  @Get()
  @ApiOperation({ summary: "List this tenant's pages" })
  listPages(@Req() req: any) {
    return this.service.listPages(req.user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a page' })
  createPage(@Req() req: any, @Body() dto: any) {
    return this.service.createPage(ctxFrom(req), dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a page (with its sections)' })
  getPage(@Req() req: any, @Param('id') id: string) {
    return this.service.getPage(req.user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a page' })
  updatePage(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.updatePage(ctxFrom(req), id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a page' })
  deletePage(@Req() req: any, @Param('id') id: string) {
    return this.service.deletePage(ctxFrom(req), id);
  }

  // ---- Publishing Workflow: draft -> in_review -> approved -> published|scheduled -> archived ----

  @Post(':id/submit-review')
  @ApiOperation({ summary: 'Submit a draft page for review' })
  submitForReview(@Req() req: any, @Param('id') id: string) {
    return this.service.submitForReview(ctxFrom(req), id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a page that is in review' })
  approvePage(@Req() req: any, @Param('id') id: string) {
    return this.service.approvePage(ctxFrom(req), id);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish an approved (or scheduled) page immediately' })
  publishNow(@Req() req: any, @Param('id') id: string) {
    return this.service.publishNow(ctxFrom(req), id);
  }

  @Post(':id/schedule')
  @ApiOperation({ summary: 'Schedule an approved page to auto-publish at a future date/time' })
  schedulePage(@Req() req: any, @Param('id') id: string, @Body() dto: { publishAt: string }) {
    return this.service.schedulePage(ctxFrom(req), id, dto.publishAt);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive a page (removes it from the public site)' })
  archivePage(@Req() req: any, @Param('id') id: string) {
    return this.service.archivePage(ctxFrom(req), id);
  }

  @Post(':id/revert-to-draft')
  @ApiOperation({ summary: 'Send a page back to draft from any stage' })
  revertToDraft(@Req() req: any, @Param('id') id: string) {
    return this.service.revertToDraft(ctxFrom(req), id);
  }

  @Post(':id/sections')
  @ApiOperation({ summary: 'Add a section to a page (componentType must be a valid Component Library key)' })
  createSection(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.createSection(ctxFrom(req), id, dto);
  }

  @Put(':id/sections/reorder-all')
  @ApiOperation({ summary: 'Bulk-reorder a page\'s sections (drag-and-drop canvas) — orderedIds must be exactly the page\'s current section IDs' })
  reorderSections(@Req() req: any, @Param('id') id: string, @Body() dto: { orderedIds: string[] }) {
    return this.service.reorderSections(ctxFrom(req), id, dto.orderedIds);
  }

  @Put('sections/:sectionId')
  @ApiOperation({ summary: "Update a section's content/status" })
  updateSection(@Req() req: any, @Param('sectionId') sectionId: string, @Body() dto: any) {
    return this.service.updateSection(ctxFrom(req), sectionId, dto);
  }

  @Delete('sections/:sectionId')
  @ApiOperation({ summary: 'Delete a section' })
  deleteSection(@Req() req: any, @Param('sectionId') sectionId: string) {
    return this.service.deleteSection(ctxFrom(req), sectionId);
  }

  @Post('sections/:sectionId/reorder')
  @ApiOperation({ summary: 'Move a section up/down on its page' })
  reorderSection(@Req() req: any, @Param('sectionId') sectionId: string, @Body() dto: { direction: 'up' | 'down' }) {
    return this.service.reorderSection(ctxFrom(req), sectionId, dto.direction);
  }

  // ---- Public: unauthenticated, published-only, for the tenant-website ----
  @Public()
  @Get('public/:subdomain/:slug')
  @ApiOperation({ summary: "A tenant's published page by slug, for the public site" })
  getPublicPage(@Param('subdomain') subdomain: string, @Param('slug') slug: string) {
    return this.service.getPublicPage(subdomain, slug);
  }
}
