import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { AssessmentsService } from './assessments.service';

@Controller('fitness/assessments')
@UseGuards(JwtAuthGuard)
export class AssessmentsController {
  constructor(private service: AssessmentsService) {}

  @Get()
  findAll(@Req() req: any, @Query() query: any) {
    return this.service.findAll(req.user.tenantId, query);
  }

  @Get('progress/:memberId')
  progress(@Req() req: any, @Param('memberId') memberId: string) {
    return this.service.getProgress(req.user.tenantId, memberId);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user.tenantId, id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.service.create(req.user.tenantId, dto);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.service.delete(req.user.tenantId, id);
  }
}
