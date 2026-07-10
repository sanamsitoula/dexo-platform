import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@dexo/auth';
import { NotificationService } from './notification.service';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('templates')
  @ApiOperation({ summary: 'Create notification template' })
  async createTemplate(@Body() data: any) {
    return this.notificationService.createTemplate(data);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get all notification templates' })
  async findAllTemplates() {
    return this.notificationService.findAllTemplates();
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get template by ID' })
  async findTemplate(@Param('id') id: string) {
    return this.notificationService.findTemplate(id);
  }

  @Put('templates/:id')
  @ApiOperation({ summary: 'Update template' })
  async updateTemplate(@Param('id') id: string, @Body() data: any) {
    return this.notificationService.updateTemplate(id, data);
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: 'Delete template' })
  async deleteTemplate(@Param('id') id: string) {
    return this.notificationService.deleteTemplate(id);
  }

  @Post('send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send notification / announcement broadcast' })
  async sendNotification(@Req() req: any, @Body() data: any) {
    // Tenant scope always comes from the JWT — never from the request body.
    return this.notificationService.sendNotification({ ...data, tenantId: req.user.tenantId });
  }
}
