import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, Public } from '@dexo/auth';
import { SiteNavigationService } from './site-navigation.service';

function ctxFrom(req: any) {
  return {
    tenantId: req.user.tenantId,
    userId: req.user.id || req.user.sub,
    ipAddress: req.ip,
    userAgent: req.headers?.['user-agent']?.substring(0, 500),
  };
}

/**
 * Tenant-scoped Site Navigation API — Workstream A. Same tenantId-from-JWT
 * convention as every other builder module (menu-builder, page-builder,
 * theme-builder).
 */
@ApiTags('site-navigation')
@Controller('site-navigation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SiteNavigationController {
  constructor(private service: SiteNavigationService) {}

  @Get()
  @ApiOperation({ summary: "List this tenant's nav items (auto-populated from real pages/blog/shop on first load)" })
  listItems(@Req() req: any) {
    return this.service.listItems(req.user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a nav item' })
  createItem(@Req() req: any, @Body() dto: any) {
    return this.service.createItem(ctxFrom(req), dto);
  }

  @Put('reorder-all')
  @ApiOperation({ summary: "Bulk-reorder nav items (drag-and-drop) — orderedIds must be exactly the tenant's current item IDs" })
  reorderAll(@Req() req: any, @Body() dto: { orderedIds: string[] }) {
    return this.service.reorderAll(ctxFrom(req), dto.orderedIds);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a nav item (label/order/target/enabled)' })
  updateItem(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.updateItem(ctxFrom(req), id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a nav item' })
  deleteItem(@Req() req: any, @Param('id') id: string) {
    return this.service.deleteItem(ctxFrom(req), id);
  }

  // ---- Public: unauthenticated, for the tenant-website rendering pipeline ----
  @Public()
  @Get('public/:subdomain')
  @ApiOperation({ summary: "A tenant's enabled nav items, resolved to hrefs, for the public site" })
  getPublicNav(@Param('subdomain') subdomain: string) {
    return this.service.getPublicNav(subdomain);
  }
}
