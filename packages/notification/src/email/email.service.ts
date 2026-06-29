import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface EmailTemplate {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
    contentType?: string;
  }>;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromAddress: string;
  private readonly replyToAddress: string;
  private readonly provider: 'sendgrid' | 'smtp' | 'mock';
  private sendgridClient: any;
  private nodemailerTransport: any;

  constructor(private configService: ConfigService) {
    this.provider = (this.configService.get('EMAIL_PROVIDER') || 'mock') as any;
    this.fromAddress = this.configService.get('EMAIL_FROM') || 'noreply@dexo.example.com';
    this.replyToAddress = this.configService.get('EMAIL_REPLY_TO') || 'support@dexo.example.com';

    if (this.provider === 'sendgrid') {
      this.initializeSendGrid();
    } else if (this.provider === 'smtp') {
      this.initializeSMTP();
    }
  }

  private initializeSendGrid() {
    try {
      // @ts-ignore - Dynamic import for SendGrid
      const sgMail = require('@sendgrid/mail');
      const apiKey = this.configService.get('SENDGRID_API_KEY');
      if (apiKey) {
        sgMail.setApiKey(apiKey);
        this.sendgridClient = sgMail;
        this.logger.log('SendGrid initialized');
      }
    } catch (error) {
      this.logger.error('Failed to initialize SendGrid:', error);
    }
  }

  private initializeSMTP() {
    try {
      // @ts-ignore - Dynamic import for Nodemailer
      const nodemailer = require('nodemailer');
      const smtpConfig = {
        host: this.configService.get('SMTP_HOST') || 'localhost',
        port: parseInt(this.configService.get('SMTP_PORT') || '1025'),
        secure: this.configService.get('SMTP_SECURE') === 'true',
        auth: this.configService.get('SMTP_USER')
          ? {
              user: this.configService.get('SMTP_USER'),
              pass: this.configService.get('SMTP_PASS'),
            }
          : undefined,
      };
      this.nodemailerTransport = nodemailer.createTransport(smtpConfig);
      this.logger.log('SMTP initialized');
    } catch (error) {
      this.logger.error('Failed to initialize SMTP:', error);
    }
  }

  async sendEmail(email: EmailTemplate): Promise<EmailResult> {
    try {
      if (this.provider === 'sendgrid' && this.sendgridClient) {
        return await this.sendViaSendGrid(email);
      } else if (this.provider === 'smtp' && this.nodemailerTransport) {
        return await this.sendViaSMTP(email);
      } else {
        return await this.sendMock(email);
      }
    } catch (error) {
      this.logger.error('Failed to send email:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async sendViaSendGrid(email: EmailTemplate): Promise<EmailResult> {
    const msg = {
      to: Array.isArray(email.to) ? email.to : [email.to],
      from: email.from || this.fromAddress,
      replyTo: email.replyTo || this.replyToAddress,
      subject: email.subject,
      text: email.text,
      html: email.html,
      attachments: email.attachments?.map(a => ({
        filename: a.filename,
        path: a.path,
        content: a.content?.toString('base64'),
        type: a.contentType,
      })),
    };

    const response = await this.sendgridClient.send(msg);
    this.logger.log(`Email sent via SendGrid: ${response[0].headers['x-message-id']}`);
    return {
      success: true,
      messageId: response[0].headers['x-message-id'],
    };
  }

  private async sendViaSMTP(email: EmailTemplate): Promise<EmailResult> {
    const msg = {
      to: Array.isArray(email.to) ? email.to.join(', ') : email.to,
      from: email.from || this.fromAddress,
      replyTo: email.replyTo || this.replyToAddress,
      subject: email.subject,
      text: email.text,
      html: email.html,
      attachments: email.attachments,
    };

    const info = await this.nodemailerTransport.sendMail(msg);
    this.logger.log(`Email sent via SMTP: ${info.messageId}`);
    return {
      success: true,
      messageId: info.messageId,
    };
  }

  private async sendMock(email: EmailTemplate): Promise<EmailResult> {
    // Mock implementation for development/testing
    this.logger.log(`[MOCK EMAIL] To: ${Array.isArray(email.to) ? email.to.join(', ') : email.to}`);
    this.logger.log(`[MOCK EMAIL] Subject: ${email.subject}`);
    this.logger.log(`[MOCK EMAIL] Body: ${email.text || email.html?.substring(0, 100)}...`);

    // In development with MailHog, you can actually send via SMTP
    if (process.env.NODE_ENV === 'development' && this.nodemailerTransport) {
      return await this.sendViaSMTP(email);
    }

    return {
      success: true,
      messageId: `mock_${Date.now()}`,
    };
  }

  async sendTemplateEmail(
    templateName: string,
    to: string | string[],
    variables: Record<string, any>,
  ): Promise<EmailResult> {
    // This would integrate with the NotificationTemplate from Prisma
    // For now, return a basic implementation
    const templates: Record<string, { subject: string; text: string; html?: string }> = {
      'welcome-email': {
        subject: 'Welcome to {{platformName}}!',
        text: 'Hi {{firstName}},\n\nWelcome to {{platformName}}! We\'re excited to have you on board.\n\nGet started by completing your profile.',
      },
      'password-reset': {
        subject: 'Reset your password',
        text: 'Hi {{firstName}},\n\nClick the link below to reset your password:\n{{resetLink}}\n\nThis link expires in 1 hour.',
      },
      'email-verification': {
        subject: 'Verify your email address',
        text: 'Hi {{firstName}},\n\nPlease verify your email address by clicking the link below:\n{{verificationLink}}\n\nThis link expires in 24 hours.',
      },
      'invitation-email': {
        subject: '{{inviterName}} invited you to {{tenantName}}',
        text: 'Hi {{firstName}},\n\n{{inviterName}} has invited you to join {{tenantName}}.\n\nClick here to accept: {{invitationLink}}',
      },
    };

    const template = templates[templateName];
    if (!template) {
      return {
        success: false,
        error: `Template ${templateName} not found`,
      };
    }

    let subject = template.subject;
    let text = template.text;

    // Replace variables
    Object.keys(variables).forEach(key => {
      const placeholder = `{{${key}}}`;
      const value = variables[key];
      subject = subject.replace(new RegExp(placeholder, 'g'), value);
      text = text.replace(new RegExp(placeholder, 'g'), value);
    });

    return this.sendEmail({
      to,
      subject,
      text,
      html: template.html || text.replace(/\n/g, '<br>\n'),
    });
  }

  async sendBulkEmail(emails: EmailTemplate[]): Promise<EmailResult[]> {
    const results: EmailResult[] = [];
    for (const email of emails) {
      const result = await this.sendEmail(email);
      results.push(result);
    }
    return results;
  }
}
