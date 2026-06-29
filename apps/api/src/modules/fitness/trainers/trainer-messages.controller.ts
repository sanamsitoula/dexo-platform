import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { TrainerMessagesService } from './trainer-messages.service';

@Controller('fitness/trainer-messages')
@UseGuards(JwtAuthGuard)
export class TrainerMessagesController {
  constructor(private service: TrainerMessagesService) {}

  @Get('thread')
  thread(@Req() req: any, @Query('memberId') memberId: string, @Query('trainerId') trainerId: string) {
    return this.service.getThread(req.user.tenantId, memberId, trainerId);
  }

  @Get('member/:memberId')
  memberMessages(@Req() req: any, @Param('memberId') memberId: string) {
    return this.service.getMemberMessages(req.user.tenantId, memberId);
  }

  @Get('trainer/:trainerId/inbox')
  trainerInbox(@Req() req: any, @Param('trainerId') trainerId: string) {
    return this.service.getTrainerInbox(req.user.tenantId, trainerId);
  }

  @Post()
  send(@Req() req: any, @Body() dto: any) {
    return this.service.send(req.user.tenantId, dto);
  }

  @Post(':id/read')
  markRead(@Req() req: any, @Param('id') id: string) {
    return this.service.markRead(req.user.tenantId, id);
  }

  @Post('thread/read')
  markThreadRead(@Req() req: any, @Body() body: { memberId: string; trainerId: string }) {
    return this.service.markThreadRead(req.user.tenantId, body.memberId, body.trainerId);
  }
}
