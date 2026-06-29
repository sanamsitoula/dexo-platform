import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import { QueueService } from '@dexo/shared';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class IrdService {
  private readonly logger = new Logger(IrdService.name);

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
  ) {}

  /**
   * Sync invoice to IRD CBMS (real-time or async)
   * According to IRD procedure, real-time sync is mandatory for designated taxpayers
   */
  async syncInvoiceToCbms(invoiceId: string, operation: 'CREATE' | 'CANCEL' = 'CREATE') {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true, fiscalYear: true },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Get master bill
    const masterBill = await this.prisma.masterBill.findFirst({
      where: { invoiceId },
    });

    if (!masterBill) {
      throw new Error('Master bill not found');
    }

    // Build CBMS payload
    const payload = {
      fiscal_year: invoice.fiscalYear?.name || '',
      bill_no: masterBill.billNo,
      customer_name: masterBill.customerName,
      customer_pan: masterBill.customerPan || '',
      bill_date: masterBill.billDate,
      amount: Number(masterBill.amount),
      discount: Number(masterBill.discount),
      taxable_amount: Number(masterBill.taxableAmount),
      tax_amount: Number(masterBill.taxAmount),
      total_amount: Number(masterBill.totalAmount),
      is_bill_active: operation === 'CREATE',
      payment_method: masterBill.paymentMethod,
      vat_refund_amount: Number(masterBill.vatRefundAmount || 0),
      transaction_id: masterBill.transactionId,
      seller_pan: invoice.tenantId, // Would need actual PAN from tenant settings
    };

    try {
      // Attempt sync to IRD API (mock for now)
      const response = await this.sendToIrdApi(payload);

      // Update master bill sync status
      await this.prisma.masterBill.update({
        where: { id: masterBill.id },
        data: {
          syncWithIrd: true,
          isRealtime: true,
        },
      });

      this.logger.log(`Successfully synced invoice ${invoice.invoiceNumber} to CBMS`);

      return { success: true, syncId: response.syncId };
    } catch (error) {
      // Queue for retry
      await this.queueForRetry(invoiceId, operation, payload, error.message);

      this.logger.error(`Failed to sync invoice ${invoice.invoiceNumber} to CBMS: ${error.message}`);

      return { success: false, queued: true };
    }
  }

  /**
   * Retry failed CBMS syncs
   * Runs every 60 seconds
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async retryFailedSyncs() {
    const pendingSyncs = await this.prisma.cbmsSyncQueue.findMany({
      where: {
        status: 'PENDING',
        nextRetryAt: { lte: new Date() },
      },
      take: 10,
    });

    this.logger.log(`Found ${pendingSyncs.length} pending CBMS syncs to retry`);

    for (const sync of pendingSyncs) {
      try {
        const response = await this.sendToIrdApi(sync.requestPayload as any);

        // Update master bill
        if (sync.operation === 'CREATE') {
          await this.prisma.masterBill.updateMany({
            where: { invoiceId: sync.invoiceId },
            data: { syncWithIrd: true },
          });
        }

        // Update sync queue
        await this.prisma.cbmsSyncQueue.update({
          where: { id: sync.id },
          data: {
            status: 'SUCCESS',
            responsePayload: response,
          },
        });

        this.logger.log(`Successfully retried sync for invoice ${sync.invoiceId}`);
      } catch (error) {
        const newAttemptCount = (sync.attemptCount || 0) + 1;
        const delayMs = Math.min(5 * 60 * 1000 * Math.pow(2, newAttemptCount), 24 * 60 * 60 * 1000); // Exponential backoff, max 24 hours

        await this.prisma.cbmsSyncQueue.update({
          where: { id: sync.id },
          data: {
            attemptCount: newAttemptCount,
            lastAttemptedAt: new Date(),
            nextRetryAt: new Date(Date.now() + delayMs),
            error_message: error.message,
            status: newAttemptCount >= 10 ? 'MAX_RETRY' : 'PENDING',
          },
        });

        if (newAttemptCount >= 10) {
          this.logger.error(`Max retries reached for invoice ${sync.invoiceId}`);
        }
      }
    }
  }

  /**
   * Get CBMS sync status
   */
  async getSyncStatus(tenantId?: string) {
    const where: any = {};

    if (tenantId) {
      where.tenantId = tenantId;
    }

    const pendingCount = await this.prisma.cbmsSyncQueue.count({
      where: { ...where, status: 'PENDING' },
    });

    const failedCount = await this.prisma.cbmsSyncQueue.count({
      where: { ...where, status: 'MAX_RETRY' },
    });

    const unsyncedBills = await this.prisma.masterBill.count({
      where: { syncWithIrd: false, isBillActive: true },
    });

    return {
      pendingSyncs: pendingCount,
      failedSyncs: failedCount,
      unsyncedBills,
      overallHealth: pendingCount === 0 && unsyncedBills === 0 ? 'HEALTHY' : 'ISSUES_DETECTED',
    };
  }

  /**
   * Record invoice print (IRD mandatory)
   */
  async recordInvoicePrint(
    tenantId: string,
    invoiceId: string,
    printedBy: string,
    ipAddress: string,
    isReprint = false,
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { masterBill: true },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    let copyNumber = 0;
    let printType = 'ORIGINAL';

    if (invoice.masterBill?.isBillPrinted || isReprint) {
      // Reprint
      const lastReprint = await this.prisma.reprintLog.findFirst({
        where: { invoiceId },
        orderBy: { copyNumber: 'desc' },
      });

      copyNumber = (lastReprint?.copyNumber || 0) + 1;
      printType = 'COPY';
    } else {
      // First print - update master bill
      await this.prisma.masterBill.updateMany({
        where: { invoiceId },
        data: {
          isBillPrinted: true,
          printedTime: new Date(),
          printedBy,
        },
      });
    }

    // Create reprint log
    await this.prisma.reprintLog.create({
      data: {
        tenantId,
        invoiceId,
        billNo: invoice.invoiceNumber,
        printType,
        copyNumber,
        printedBy,
        printedAt: new Date(),
        ipAddress,
      },
    });

    return {
      watermark: printType === 'COPY' ? 'COPY OF ORIGINAL / प्रतिलिपि' : null,
      copyNumber,
    };
  }

  /**
   * Get reprint log (IRD mandatory report)
   */
  async getReprintLog(tenantId: string, startDate?: Date, endDate?: Date) {
    const where: any = { tenantId };

    if (startDate || endDate) {
      where.printedAt = {};
      if (startDate) where.printedAt.gte = startDate;
      if (endDate) where.printedAt.lte = endDate;
    }

    return this.prisma.reprintLog.findMany({
      where,
      include: { invoice: true },
      orderBy: { printedAt: 'desc' },
    });
  }

  /**
   * Reset bill sequences on fiscal year start (Shrawan 1)
   */
  @Cron('0 0 16 7 *') // Approx Shrawan 1 (mid-July)
  async resetBillSequencesForNewFiscalYear() {
    this.logger.log('Checking for fiscal year reset...');

    const today = new Date();
    // In production, this would use Nepali calendar to determine Shrawan 1

    const activeFiscalYears = await this.prisma.fiscalYear.findMany({
      where: { isActive: true },
    });

    for (const fy of activeFiscalYears) {
      // Check if new fiscal year should start
      if (today >= new Date(fy.startDate) && today <= new Date(fy.endDate)) {
        // Reset sequences for this tenant
        await this.prisma.$executeRaw`
          UPDATE bill_sequences
          SET last_number = 0
          WHERE fiscal_year = ${fy.name}
        `;

        this.logger.log(`Reset bill sequences for fiscal year ${fy.name}`);
      }
    }
  }

  // ========== Helper Methods ==========

  private async sendToIrdApi(payload: any): Promise<any> {
    // Mock IRD API call
    // In production, this would make an actual HTTP request to IRD CBMS endpoint

    const irdEndpoint = process.env.IRD_CBMS_ENDPOINT || 'https://mock-ird-api.gov.np/api';

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simulate random failure (10% chance)
    if (Math.random() < 0.1) {
      throw new Error('IRD API temporarily unavailable');
    }

    return {
      syncId: `IRD-${Date.now()}`,
      syncedAt: new Date(),
      billAcknowledged: true,
    };
  }

  private async queueForRetry(
    invoiceId: string,
    operation: string,
    payload: any,
    errorMessage: string,
  ) {
    await this.prisma.cbmsSyncQueue.create({
      data: {
        invoiceId,
        operation,
        requestPayload: payload,
        error_message: errorMessage,
        status: 'PENDING',
        attemptCount: 0,
        nextRetryAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      },
    });
  }

  /**
   * Process electronic payment VAT refund (Schedule 8)
   */
  async processVatRefund(paymentId: string) {
    const payment = await this.prisma.paymentReceived.findUnique({
      where: { id: paymentId },
      include: { allocations: { include: { invoice: true } } },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    // Check if electronic payment
    const electronicMethods = ['ESEWA', 'KHALTI', 'CONNECTIPS', 'CARD'];
    if (!electronicMethods.includes(payment.paymentMethod)) {
      return; // No VAT refund for cash/cheque
    }

    // Calculate total VAT from allocated invoices
    let totalVat = 0;
    for (const allocation of payment.allocations) {
      totalVat += Number(allocation.invoice.vatAmount);
    }

    // VAT refund is 10% of VAT amount
    const vatRefund = totalVat * 0.1;

    // Update payment
    await this.prisma.paymentReceived.update({
      where: { id: paymentId },
      data: { vatRefundAmount: vatRefund },
    });

    // Prepare Schedule 8 data for payment operator
    const schedule8Data = {
      sellerPan: payment.tenantId, // Would need actual PAN
      invoiceNumber: payment.transactionId,
      paymentDate: payment.paymentDate,
      totalAmount: Number(payment.amount),
      vat: totalVat,
      vatRefundAmount: vatRefund,
      customerId: payment.customerId,
      transactionIdentificationNo: payment.transactionId,
    };

    // Send to payment operator (mock)
    await this.sendToPaymentOperator(schedule8Data);

    this.logger.log(`Processed VAT refund of ${vatRefund} for payment ${payment.paymentNo}`);

    return {
      vatRefundAmount: vatRefund,
      schedule8Data,
    };
  }

  private async sendToPaymentOperator(data: any): Promise<void> {
    // Mock sending Schedule 8 data to payment operator
    // In production, this would integrate with eSewa/Khalti/ConnectIPS APIs
    this.logger.log(`Sending Schedule 8 data to payment operator: ${JSON.stringify(data)}`);
  }
}
