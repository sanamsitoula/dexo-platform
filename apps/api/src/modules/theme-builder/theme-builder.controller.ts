import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, Public } from '@dexo/auth';
import { ThemeBuilderService } from './theme-builder.service';

function ctxFrom(req: any) {
  return {
    tenantId: req.user.tenantId,
    userId: req.user.id || req.user.sub,
    ipAddress: req.ip,
    userAgent: req.headers?.['user-agent']?.substring(0, 500),
  };
}

@ApiTags('theme-builder')
@Controller('themes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ThemeBuilderController {
  constructor(private service: ThemeBuilderService) {}

  @Get()
  @ApiOperation({ summary: "List this tenant's saved themes" })
  listThemes(@Req() req: any) {
    return this.service.listThemes(req.user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a theme' })
  createTheme(@Req() req: any, @Body() dto: any) {
    return this.service.createTheme(ctxFrom(req), dto);
  }

  @Post('duplicate')
  @ApiOperation({ summary: 'Duplicate an existing theme (or start blank if fromThemeId omitted)' })
  duplicateTheme(@Req() req: any, @Body() dto: { fromThemeId?: string; name: string }) {
    return this.service.duplicateTheme(ctxFrom(req), dto.fromThemeId, dto.name);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a theme' })
  getTheme(@Req() req: any, @Param('id') id: string) {
    return this.service.getTheme(req.user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a theme' })
  updateTheme(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.updateTheme(ctxFrom(req), id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a theme' })
  deleteTheme(@Req() req: any, @Param('id') id: string) {
    return this.service.deleteTheme(ctxFrom(req), id);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Make this the tenant\'s live theme' })
  activate(@Req() req: any, @Param('id') id: string) {
    return this.service.setActive(ctxFrom(req), id, true);
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Turn off this theme (falls back to legacy branding/template)' })
  deactivate(@Req() req: any, @Param('id') id: string) {
    return this.service.setActive(ctxFrom(req), id, false);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish this theme\'s current (draft) tokens live for every visitor' })
  publish(@Req() req: any, @Param('id') id: string) {
    return this.service.publish(ctxFrom(req), id);
  }

  @Post(':id/revert')
  @ApiOperation({ summary: 'Revert to the last-published token snapshot (one-click, no version history)' })
  revert(@Req() req: any, @Param('id') id: string) {
    return this.service.revertToLastPublished(ctxFrom(req), id);
  }

  @Post(':id/preview-token')
  @ApiOperation({ summary: 'Generate a signed, time-limited admin preview link for this theme\'s current (possibly draft) tokens' })
  createPreviewToken(@Req() req: any, @Param('id') id: string) {
    return this.service.createPreviewToken(ctxFrom(req), id);
  }

  // ---- Public: unauthenticated, for the tenant-website rendering pipeline ----
  @Public()
  @Get('public/:subdomain/active')
  @ApiOperation({ summary: "A tenant's active custom theme, if any (published tokens unless a valid preview token is supplied)" })
  getActiveTheme(@Param('subdomain') subdomain: string, @Query('preview') preview?: string) {
    return this.service.getActiveTheme(subdomain, preview);
  }
}
