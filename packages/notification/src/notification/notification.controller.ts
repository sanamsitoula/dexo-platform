import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Send notification' })
  async sendNotification(@Body() data: any) {
    return this.notificationService.sendNotification(data);
  }
}
