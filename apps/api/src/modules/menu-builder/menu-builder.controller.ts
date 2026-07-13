import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, Public } from '@dexo/auth';
import { MenuBuilderService } from './menu-builder.service';

function ctxFrom(req: any) {
  return {
    tenantId: req.user.tenantId,
    userId: req.user.id || req.user.sub,
    ipAddress: req.ip,
    userAgent: req.headers?.['user-agent']?.substring(0, 500),
  };
}

/**
 * Tenant-scoped Menu Builder API. Every endpoint derives tenantId from the
 * caller's JWT (req.user.tenantId) — never from a client-supplied path/body
 * param — matching this codebase's convention on every other tenant-owned
 * module (fitness, ecommerce, contact, etc.), which avoids IDOR by
 * construction rather than requiring a "validate path tenantId against
 * session" check on every handler.
 */
@ApiTags('menu-builder')
@Controller('menus')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MenuBuilderController {
  constructor(private service: MenuBuilderService) {}

  @Get()
  @ApiOperation({ summary: 'List this tenant\'s menus' })
  listMenus(@Req() req: any) {
    return this.service.listMenus(req.user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a menu' })
  createMenu(@Req() req: any, @Body() dto: any) {
    return this.service.createMenu(ctxFrom(req), dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a menu (with its items)' })
  getMenu(@Req() req: any, @Param('id') id: string) {
    return this.service.getMenu(req.user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a menu' })
  updateMenu(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.updateMenu(ctxFrom(req), id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a menu' })
  deleteMenu(@Req() req: any, @Param('id') id: string) {
    return this.service.deleteMenu(ctxFrom(req), id);
  }

  @Get(':id/items')
  @ApiOperation({ summary: 'List a menu\'s items' })
  listItems(@Req() req: any, @Param('id') id: string) {
    return this.service.listItems(req.user.tenantId, id);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Create a menu item' })
  createItem(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.createItem(ctxFrom(req), id, dto);
  }

  @Put('items/:itemId')
  @ApiOperation({ summary: 'Update a menu item' })
  updateItem(@Req() req: any, @Param('itemId') itemId: string, @Body() dto: any) {
    return this.service.updateItem(ctxFrom(req), itemId, dto);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Delete a menu item' })
  deleteItem(@Req() req: any, @Param('itemId') itemId: string) {
    return this.service.deleteItem(ctxFrom(req), itemId);
  }

  @Post('items/:itemId/reorder')
  @ApiOperation({ summary: 'Move a menu item up/down among its siblings' })
  reorderItem(@Req() req: any, @Param('itemId') itemId: string, @Body() dto: { direction: 'up' | 'down' }) {
    return this.service.reorderItem(ctxFrom(req), itemId, dto.direction);
  }

  // ---- Public: unauthenticated, published-only, for the tenant-website ----
  @Public()
  @Get('public/:subdomain')
  @ApiOperation({ summary: 'Published menus for a tenant\'s public site (optionally filtered by menu slug)' })
  getPublicMenus(@Param('subdomain') subdomain: string, @Query('slug') slug?: string) {
    return this.service.getPublicMenus(subdomain, slug);
  }
}
