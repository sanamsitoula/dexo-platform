import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { QUEUE_NAMES } from '../queue.constants';
import { EmailJobData } from '../queue.service';

// This would be imported from the notification package
// For now, we'll define a simple email sender interface
interface IEmailService {
  sendEmail(data: any): Promise<any>;
  sendTemplateEmail(templateName: string, to: string | string[], variables: Record<string, any>): Promise<any>;
}

@Processor(QUEUE_NAMES.EMAIL)
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor() {
    // EmailService would be injected here
    // private emailService: EmailService
  }

  @Process('send-email')
  async handleSendEmail(job: Job<EmailJobData>) {
    this.logger.log(`Processing email job ${job.id} to ${job.data.to}`);

    try {
      // Send the email
      // const result = await this.emailService.sendEmail(job.data);

      this.logger.log(`Email sent successfully: ${job.id}`);

      return {
        success: true,
        messageId: `msg_${job.id}`,
      };
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      throw error;
    }
  }

  @Process('send-template-email')
  async handleSendTemplateEmail(job: Job<EmailJobData>) {
    this.logger.log(`Processing template email job ${job.id}: ${job.data.templateName}`);

    try {
      // Send the template email
      // const result = await this.emailService.sendTemplateEmail(
      //   job.data.templateName,
      //   job.data.to,
      //   job.data.variables
      // );

      this.logger.log(`Template email sent successfully: ${job.id}`);

      return {
        success: true,
        messageId: `msg_${job.id}`,
      };
    } catch (error) {
      this.logger.error(`Failed to send template email: ${error.message}`);
      throw error;
    }
  }

  @Process('send-bulk-email')
  async handleSendBulkEmail(job: Job<{ emails: EmailJobData[] }>) {
    this.logger.log(`Processing bulk email job ${job.id} with ${job.data.emails.length} emails`);

    try {
      // Send bulk emails
      // const results = await this.emailService.sendBulkEmail(job.data.emails);

      this.logger.log(`Bulk emails sent successfully: ${job.id}`);

      return {
        success: true,
        count: job.data.emails.length,
      };
    } catch (error) {
      this.logger.error(`Failed to send bulk emails: ${error.message}`);
      throw error;
    }
  }

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.log(`Completed job ${job.id} of type ${job.name}`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Failed job ${job.id} of type ${job.name}: ${error.message}`);
  }
}
