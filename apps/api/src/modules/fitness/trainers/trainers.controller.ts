import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { TrainersService } from './trainers.service';

@Controller('fitness/trainers')
@UseGuards(JwtAuthGuard)
export class TrainersController {
  constructor(private service: TrainersService) {}

  @Get()
  findAll(@Req() req: any, @Query() query: any) {
    return this.service.findAll(req.user.tenantId, query);
  }

  @Get('me')
  getMine(@Req() req: any) {
    return this.service.findByUserId(req.user.tenantId, req.user.id);
  }

  @Get('me/trainees')
  getMyTrainees(@Req() req: any) {
    return this.service.findMyTrainees(req.user.tenantId, req.user.id);
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
