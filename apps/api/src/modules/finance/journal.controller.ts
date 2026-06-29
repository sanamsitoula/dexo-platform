import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { JournalService } from './journal.service';

@Controller('finance/journal')
@UseGuards(JwtAuthGuard)
export class JournalController {
  constructor(private journalService: JournalService) {}

  @Get()
  findAll(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('posted') posted?: string,
  ) {
    return this.journalService.findAll(req.user.tenantId, {
      startDate,
      endDate,
      posted: posted !== undefined ? posted === 'true' : undefined,
    });
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.journalService.findOne(req.user.tenantId, id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.journalService.create(req.user.tenantId, dto, req.user.id);
  }

  @Post(':id/post')
  post(@Req() req: any, @Param('id') id: string) {
    return this.journalService.post(req.user.tenantId, id, req.user.id);
  }

  @Post(':id/reverse')
  reverse(@Req() req: any, @Param('id') id: string, @Body('reason') reason: string) {
    return this.journalService.reverse(req.user.tenantId, id, req.user.id, reason);
  }
}
