import { Controller, Post, Body, Get, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { EmailService } from './email.service';
import { JwtAuthGuard } from '@dexo/auth';

interface SendEmailDto {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

interface SendTemplateDto {
  templateName: string;
  to: string | string[];
  variables: Record<string, any>;
}

@Controller('email')
export class EmailController {
  constructor(private emailService: EmailService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async sendEmail(@Body() dto: SendEmailDto) {
    return this.emailService.sendEmail(dto);
  }

  @Post('send-template')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async sendTemplate(@Body() dto: SendTemplateDto) {
    return this.emailService.sendTemplateEmail(dto.templateName, dto.to, dto.variables);
  }

  @Get('health')
  @HttpCode(HttpStatus.OK)
  async health() {
    return { status: 'ok', service: 'email' };
  }
}
