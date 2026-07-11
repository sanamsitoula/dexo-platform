import { z } from 'zod';

/**
 * Shared argument schemas for fitness AI tools — one place so
 * tools/index.ts stays focused on wiring, and shapes are reused across
 * tools (e.g. `memberIdArgs` is used by six member-scoped tools).
 */
export const memberIdArgs = z.object({ memberId: z.string().describe('Member record id') });
export const trainerIdArgs = z.object({ trainerId: z.string().describe('Trainer record id') });

export const searchMembersArgs = z.object({
  search: z.string().optional().describe('Name/email/phone search term'),
  status: z.string().optional().describe('Member status filter, e.g. ACTIVE, PENDING_VERIFICATION'),
  branchId: z.string().optional(),
});

export const memberHistoryArgs = z.object({
  memberId: z.string(),
  days: z.number().optional().describe('How many days of history to return (default 30)'),
});

export const expiringMembershipsArgs = z.object({
  days: z.number().optional().describe('Look-ahead window in days (default 7)'),
});

export const branchStatsArgs = z.object({
  branchId: z.string(),
  days: z.number().optional().describe('Lookback window in days (default 30)'),
});

export const classesArgs = z.object({
  branchId: z.string().optional(),
  classType: z.string().optional(),
  dayOfWeek: z.number().optional().describe('0=Sunday .. 6=Saturday'),
});

export const searchTrainersArgs = z.object({
  search: z.string().optional(),
  branchId: z.string().optional(),
});

export const sendReminderArgs = z.object({
  memberId: z.string(),
  title: z.string().describe('Notification title, e.g. "Membership expiring soon"'),
  message: z.string().describe('Notification body'),
});
