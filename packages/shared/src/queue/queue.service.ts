import { Injectable, Logger } from '@nestjs/common';

export interface EmailJobData {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  templateName?: string;
  variables?: Record<string, any>;
  from?: string;
  replyTo?: string;
}

export interface NotificationJobData {
  tenantId: string;
  userId: string;
  type: 'email' | 'sms' | 'push' | 'inApp';
  templateId?: string;
  templateName?: string;
  data: Record<string, any>;
}

export interface BackgroundJobData {
  type: string;
  tenantId?: string;
  userId?: string;
  data: Record<string, any>;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  async addEmailJob(data: EmailJobData, options?: { delay?: number; attempts?: number }) {
    this.logger.warn('QueueService: Redis not configured, job skipped');
    return { id: `mock_${Date.now()}`, data } as any;
  }

  async addTemplateEmailJob(templateName: string, to: string | string[], variables: Record<string, any>, options?: { delay?: number; attempts?: number }) {
    this.logger.warn('QueueService: Redis not configured, job skipped');
    return { id: `mock_${Date.now()}`, data: { templateName, to, variables } } as any;
  }

  async addNotificationJob(data: NotificationJobData, options?: { delay?: number; attempts?: number }) {
    this.logger.warn('QueueService: Redis not configured, job skipped');
    return { id: `mock_${Date.now()}`, data } as any;
  }

  async addBackgroundJob(data: BackgroundJobData, options?: { delay?: number; attempts?: number; priority?: number }) {
    this.logger.warn('QueueService: Redis not configured, job skipped');
    return { id: `mock_${Date.now()}`, data } as any;
  }

  async scheduleEmailJob(data: EmailJobData, date: Date) {
    return this.addEmailJob(data);
  }

  async scheduleBackgroundJob(data: BackgroundJobData, date: Date) {
    return this.addBackgroundJob(data);
  }

  async getQueueStats() {
    return { email: {}, notifications: {}, background: {} };
  }
}
