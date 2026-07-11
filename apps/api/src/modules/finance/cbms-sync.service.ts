import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@dexo/shared';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * CBMS (Central Billing Monitoring System) real-time sync for Nepal IRD
 * electronic billing compliance (per FINANCE_MODULE.md §11).
 *
 * Flow: when a MasterBill is issued we POST it to the IRD CBMS API. On success
 * the bill is flagged `syncWithIrd = true`; on failure it is queued in
 * `CbmsSyncQueue` for background retry with exponential-ish backoff. Every
 * attempt writes a `FinanceAuditLog` row (IRD §17.2 audit trail).
 *
 * MVP scope:
 *   - Stub mode: when no CBMS credentials are configured (env), the sync is
 *     simulated as successful and logged, so devs can exercise the full flow
 *     without an IRD sandbox. Mirrors the WhatsApp service's stub approach.
 *
 * TODO (post-MVP):
 *   - Per-tenant CBMS credentials (currently platform-level via env)
 *   - Schedule 8 (10% VAT refund on electronic payment) transmission
 *   - Signed request payloads / cert-based auth for production CBMS
 */
@Injectable()
export class CbmsSyncService {
  private readonly logger = new Logger(CbmsSyncService.name);
  private readonly MAX_RETRIES = 5;

  constructor(private prisma: PrismaService, private http: HttpService) {}

  /** True when platform CBMS credentials are configured; otherwise stub mode. */
  private isConfigured(): boolean {
    return Boolean(process.env.CBMS_API_URL && process.env.CBMS_USERNAME && process.env.CBMS_PASSWORD);
  }

  private buildPayload(bill: {
    billNo: string;
    customerName?: string | null;
    customerPan?: string | null;
    billDate: Date;
    totalAmount: any;
    taxableAmount: any;
    taxAmount: any;
    fiscalYear: string;
  }) {
    return {
      username: process.env.CBMS_USERNAME,
      password: process.env.CBMS_PASSWORD,
      seller_pan: process.env.IRD_SELLER_PAN || '',
      buyer_pan: bill.customerPan || '',
      buyer_name: bill.customerName || 'N/A',
      fiscal_year: bill.fiscalYear,
      invoice_number: bill.billNo,
      invoice_date: bill.billDate.toISOString().slice(0, 10),
      total_sales: Number(bill.totalAmount),
      taxable_sales_vat: Number(bill.taxableAmount),
      vat: Number(bill.taxAmount),
      excise: 0,
      datetimeClient: new Date().toISOString(),
    };
  }

  private async logAudit(
    tenantId: string,
    recordId: string,
    action: string,
    data: Record<string, unknown>,
    actionBy: string,
  ) {
    await this.prisma.financeAuditLog
      .create({
        data: {
          tenantId,
          tableName: 'MasterBill',
          recordId,
          action,
          newData: data as any,
          actionBy,
        },
      })
      .catch((err) => this.logger.warn(`Audit log failed: ${err?.message}`));
  }

  /** Attempts the actual CBMS POST (or simulates it in stub mode). */
  private async attemptSync(payload: Record<string, unknown>): Promise<{ ok: boolean; response: any }> {
    if (!this.isConfigured()) {
      this.logger.log(`[CBMS STUB] simulated sync for bill=${payload.invoice_number}`);
      return { ok: true, response: { stub: true, responseMessage: 'Simulated (stub mode)' } };
    }
    try {
      const res = await firstValueFrom(
        this.http.post(`${process.env.CBMS_API_URL}/api/bill`, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000,
        }),
      );
      return { ok: true, response: res.data };
    } catch (err: any) {
      return { ok: false, response: { error: err?.response?.data || err?.message } };
    }
  }

  /**
   * Sync a single MasterBill to CBMS. On success marks `syncWithIrd = true`;
   * on failure enqueues a retry row. Returns the resulting status.
   */
  async syncBill(
    tenantId: string,
    masterBillId: string,
    operation: 'CREATE' | 'CANCEL' | 'UPDATE',
    actionBy: string,
  ): Promise<{ status: 'SUCCESS' | 'QUEUED'; message: string }> {
    const bill = await this.prisma.masterBill.findFirst({ where: { id: masterBillId, tenantId } });
    if (!bill) throw new NotFoundException('MasterBill not found');

    const payload = { ...this.buildPayload(bill), operation };
    const { ok, response } = await this.attemptSync(payload);

    if (ok) {
      await this.prisma.masterBill.update({
        where: { id: bill.id },
        data: {
          syncWithIrd: operation !== 'CANCEL',
          isBillActive: operation === 'CANCEL' ? false : bill.isBillActive,
          transactionId: (response?.billNumber || response?.transactionId || bill.transactionId) ?? null,
        },
      });
      await this.logAudit(tenantId, bill.id, 'SYNC', { operation, response }, actionBy);
      return { status: 'SUCCESS', message: `Bill ${bill.billNo} synced to CBMS (${operation})` };
    }

    // Failure → enqueue for retry
    await this.prisma.cbmsSyncQueue.create({
      data: {
        tenantId,
        invoiceId: bill.invoiceId || bill.id,
        operation,
        status: 'PENDING',
        requestPayload: payload as any,
        responsePayload: response as any,
        attemptCount: 1,
        lastAttemptedAt: new Date(),
        nextRetryAt: this.backoff(1),
        errorMessage: typeof response?.error === 'string' ? response.error : JSON.stringify(response?.error ?? {}),
      },
    });
    await this.logAudit(tenantId, bill.id, 'SYNC_FAILED', { operation, response }, actionBy);
    this.logger.warn(`CBMS sync failed for bill ${bill.billNo}; queued for retry.`);
    return { status: 'QUEUED', message: `Bill ${bill.billNo} sync failed — queued for retry` };
  }

  private backoff(attempt: number): Date {
    // 15min, 30min, 45min ... capped conceptually by MAX_RETRIES
    return new Date(Date.now() + attempt * 15 * 60 * 1000);
  }

  /**
   * Process due retry-queue rows (PENDING/FAILED, attempts < MAX, nextRetryAt in
   * the past). Intended to be called from the retry button and a future cron.
   */
  async retryQueue(tenantId?: string): Promise<{ processed: number; succeeded: number; failed: number }> {
    const now = new Date();
    const rows = await this.prisma.cbmsSyncQueue.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        status: { in: ['PENDING', 'FAILED'] },
        attemptCount: { lt: this.MAX_RETRIES },
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    let succeeded = 0;
    let failed = 0;
    for (const row of rows) {
      const payload = row.requestPayload as any;
      const { ok, response } = await this.attemptSync(payload);
      const attempt = row.attemptCount + 1;

      if (ok) {
        succeeded++;
        // Reflect success back onto the MasterBill (match by billNo within tenant).
        await this.prisma.masterBill
          .updateMany({
            where: { tenantId: row.tenantId, billNo: payload.invoice_number },
            data: { syncWithIrd: payload.operation !== 'CANCEL' },
          })
          .catch(() => undefined);
        await this.prisma.cbmsSyncQueue.update({
          where: { id: row.id },
          data: { status: 'SUCCESS', attemptCount: attempt, lastAttemptedAt: now, responsePayload: response as any },
        });
        await this.logAudit(row.tenantId, row.invoiceId, 'SYNC', { retry: true, response }, 'system');
      } else {
        failed++;
        const maxed = attempt >= this.MAX_RETRIES;
        await this.prisma.cbmsSyncQueue.update({
          where: { id: row.id },
          data: {
            status: maxed ? 'MAX_RETRY' : 'FAILED',
            attemptCount: attempt,
            lastAttemptedAt: now,
            nextRetryAt: maxed ? null : this.backoff(attempt),
            responsePayload: response as any,
            errorMessage: typeof response?.error === 'string' ? response.error : JSON.stringify(response?.error ?? {}),
          },
        });
      }
    }

    return { processed: rows.length, succeeded, failed };
  }

  /** Background retry sweep across all tenants. */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async retryQueueCron() {
    const result = await this.retryQueue();
    if (result.processed > 0) {
      this.logger.log(
        `CBMS retry cron: processed=${result.processed} succeeded=${result.succeeded} failed=${result.failed}`,
      );
    }
  }

  /**
   * Retry a single queue row immediately (manual retry button), regardless of
   * its nextRetryAt schedule. Rows already SUCCESS or at MAX_RETRY are rejected.
   */
  async retryOne(tenantId: string, queueId: string) {
    const row = await this.prisma.cbmsSyncQueue.findFirst({ where: { id: queueId, tenantId } });
    if (!row) throw new NotFoundException('CBMS sync queue row not found');
    if (row.status === 'SUCCESS') return { status: 'SUCCESS', message: 'Row already synced' };
    if (row.attemptCount >= this.MAX_RETRIES && row.status === 'MAX_RETRY') {
      // Manual retry resets the row for one more attempt below.
      await this.prisma.cbmsSyncQueue.update({ where: { id: row.id }, data: { status: 'FAILED' } });
    }

    const payload = row.requestPayload as any;
    const { ok, response } = await this.attemptSync(payload);
    const now = new Date();
    const attempt = row.attemptCount + 1;

    if (ok) {
      await this.prisma.masterBill
        .updateMany({
          where: { tenantId: row.tenantId, billNo: payload.invoice_number },
          data: { syncWithIrd: payload.operation !== 'CANCEL' },
        })
        .catch(() => undefined);
      await this.prisma.cbmsSyncQueue.update({
        where: { id: row.id },
        data: { status: 'SUCCESS', attemptCount: attempt, lastAttemptedAt: now, responsePayload: response as any },
      });
      await this.logAudit(row.tenantId, row.invoiceId, 'SYNC', { manualRetry: true, response }, 'manual');
      return { status: 'SUCCESS', message: 'Row synced to CBMS' };
    }

    const maxed = attempt >= this.MAX_RETRIES;
    await this.prisma.cbmsSyncQueue.update({
      where: { id: row.id },
      data: {
        status: maxed ? 'MAX_RETRY' : 'FAILED',
        attemptCount: attempt,
        lastAttemptedAt: now,
        nextRetryAt: maxed ? null : this.backoff(attempt),
        responsePayload: response as any,
        errorMessage: typeof response?.error === 'string' ? response.error : JSON.stringify(response?.error ?? {}),
      },
    });
    return { status: maxed ? 'MAX_RETRY' : 'FAILED', message: 'Retry attempt failed' };
  }
}
