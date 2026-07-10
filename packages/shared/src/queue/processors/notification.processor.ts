import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { QUEUE_NAMES } from '../queue.constants';
import type { NotificationJobData } from '../queue.service';

@Processor(QUEUE_NAMES.NOTIFICATIONS)
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  @Process('send-notification')
  async handleSendNotification(job: Job<NotificationJobData>) {
    this.logger.log(
      `Processing notification job ${job.id} for user ${job.data.userId} (${job.data.type})`,
    );

    try {
      switch (job.data.type) {
        case 'email':
          // Send email notification
          await this.sendEmailNotification(job.data);
          break;

        case 'sms':
          // Send SMS notification
          await this.sendSMSNotification(job.data);
          break;

        case 'push':
          // Send push notification
          await this.sendPushNotification(job.data);
          break;

        case 'inApp':
          // Save in-app notification
          await this.saveInAppNotification(job.data);
          break;

        default:
          throw new Error(`Unknown notification type: ${job.data.type}`);
      }

      this.logger.log(`Notification sent successfully: ${job.id}`);

      return {
        success: true,
        notificationId: `notif_${job.id}`,
      };
    } catch (error: any) {
      this.logger.error(`Failed to send notification: ${error.message}`);
      throw error;
    }
  }

  @Process('send-bulk-notification')
  async handleSendBulkNotification(job: Job<{ notifications: NotificationJobData[] }>) {
    this.logger.log(
      `Processing bulk notification job ${job.id} with ${job.data.notifications.length} notifications`,
    );

    try {
      const results = [];

      for (const notification of job.data.notifications) {
        try {
          // Process each notification
          results.push({ userId: notification.userId, success: true });
        } catch (error: any) {
          results.push({ userId: notification.userId, success: false, error: error.message });
        }
      }

      this.logger.log(`Bulk notifications processed: ${job.id}`);

      return {
        success: true,
        results,
      };
    } catch (error: any) {
      this.logger.error(`Failed to send bulk notifications: ${error.message}`);
      throw error;
    }
  }

  private async sendEmailNotification(data: NotificationJobData): Promise<void> {
    // Would use email service to send email
    this.logger.log(`Sending email notification to user ${data.userId}`);
  }

  private async sendSMSNotification(data: NotificationJobData): Promise<void> {
    // Would use SMS service (e.g., Twilio)
    this.logger.log(`Sending SMS notification to user ${data.userId}`);
  }

  private async sendPushNotification(data: NotificationJobData): Promise<void> {
    // Would use push notification service (e.g., Firebase Cloud Messaging)
    this.logger.log(`Sending push notification to user ${data.userId}`);
  }

  private async saveInAppNotification(data: NotificationJobData): Promise<void> {
    // Would save to database for in-app display
    this.logger.log(`Saving in-app notification for user ${data.userId}`);
  }

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`Processing notification job ${job.id} of type ${job.name}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.log(`Completed notification job ${job.id} of type ${job.name}`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Failed notification job ${job.id} of type ${job.name}: ${error.message}`);
  }
}
