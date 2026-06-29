export const QUEUE_NAMES = {
  EMAIL: 'email',
  NOTIFICATIONS: 'notifications',
  BACKGROUND: 'background',
} as const;

export const JOB_TYPES = {
  // Email jobs
  SEND_EMAIL: 'send-email',
  SEND_TEMPLATE_EMAIL: 'send-template-email',
  SEND_BULK_EMAIL: 'send-bulk-email',

  // Notification jobs
  SEND_NOTIFICATION: 'send-notification',
  SEND_BULK_NOTIFICATION: 'send-bulk-notification',

  // Background jobs
  PROCESS_SUBSCRIPTION_RENEWAL: 'process-subscription-renewal',
  PROCESS_PAYMENT_RETRY: 'process-payment-retry',
  GENERATE_INVOICE: 'generate-invoice',
  CLEANUP_EXPIRED_TOKENS: 'cleanup-expired-tokens',
  SYNC_EXTERNAL_DATA: 'sync-external-data',
  GENERATE_REPORT: 'generate-report',
  PROCESS_EXPORT: 'process-export',
  BACKUP_DATABASE: 'backup-database',
} as const;

export const JOB_PRIORITIES = {
  HIGH: 1,
  MEDIUM: 5,
  LOW: 10,
} as const;
