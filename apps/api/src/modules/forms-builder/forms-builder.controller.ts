import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, Public } from '@dexo/auth';
import { FormsBuilderService } from './forms-builder.service';

function ctxFrom(req: any) {
  return {
    tenantId: req.user.tenantId,
    userId: req.user.id || req.user.sub,
    ipAddress: req.ip,
    userAgent: req.headers?.['user-agent']?.substring(0, 500),
  };
}

/** Tenant-scoped Forms Builder API — mirrors PageBuilderController's
 * conventions exactly (tenantId always from the JWT, never client input). */
@ApiTags('forms-builder')
@Controller('forms')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FormsBuilderController {
  constructor(private service: FormsBuilderService) {}

  @Get()
  @ApiOperation({ summary: "List this tenant's forms" })
  listForms(@Req() req: any) {
    return this.service.listForms(req.user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a form' })
  createForm(@Req() req: any, @Body() dto: any) {
    return this.service.createForm(ctxFrom(req), dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a form (with its fields)' })
  getForm(@Req() req: any, @Param('id') id: string) {
    return this.service.getForm(req.user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a form' })
  updateForm(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.updateForm(ctxFrom(req), id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a form' })
  deleteForm(@Req() req: any, @Param('id') id: string) {
    return this.service.deleteForm(ctxFrom(req), id);
  }

  @Get(':id/submissions')
  @ApiOperation({ summary: "A form's submissions (most recent 200)" })
  listSubmissions(@Req() req: any, @Param('id') id: string) {
    return this.service.listSubmissions(req.user.tenantId, id);
  }

  @Post(':id/fields')
  @ApiOperation({ summary: 'Add a field to a form' })
  createField(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.createField(ctxFrom(req), id, dto);
  }

  @Put('fields/:fieldId')
  @ApiOperation({ summary: 'Update a field' })
  updateField(@Req() req: any, @Param('fieldId') fieldId: string, @Body() dto: any) {
    return this.service.updateField(ctxFrom(req), fieldId, dto);
  }

  @Delete('fields/:fieldId')
  @ApiOperation({ summary: 'Delete a field' })
  deleteField(@Req() req: any, @Param('fieldId') fieldId: string) {
    return this.service.deleteField(ctxFrom(req), fieldId);
  }

  @Post('fields/:fieldId/reorder')
  @ApiOperation({ summary: 'Move a field up/down' })
  reorderField(@Req() req: any, @Param('fieldId') fieldId: string, @Body() dto: { direction: 'up' | 'down' }) {
    return this.service.reorderField(ctxFrom(req), fieldId, dto.direction);
  }

  // ---- Public: unauthenticated, for the tenant-website's "form" section ----
  @Public()
  @Get('public/:subdomain/:formId')
  @ApiOperation({ summary: 'Published form definition, for public rendering' })
  getPublicForm(@Param('subdomain') subdomain: string, @Param('formId') formId: string) {
    return this.service.getPublicForm(subdomain, formId);
  }

  @Public()
  @Post('public/:subdomain/:formId/submit')
  @ApiOperation({ summary: 'Submit a public form' })
  submitForm(@Param('subdomain') subdomain: string, @Param('formId') formId: string, @Body() data: Record<string, any>, @Req() req: any) {
    return this.service.submitForm(subdomain, formId, data, req.ip);
  }
}
