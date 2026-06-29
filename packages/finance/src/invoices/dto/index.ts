import { InvoiceType, InvoiceStatus, PaymentMethod } from '../../finance/dto';

// Invoice DTOs
export class CreateInvoiceDto {
  customerId: string;
  fiscalYearId: string;
  invoiceType: InvoiceType;
  invoiceDate: Date;
  dueDate?: Date;
  customerPan?: string;
  billingAddress?: string;
  items: InvoiceItemDto[];
  discountAmount?: number;
  currency?: string;
  notes?: string;
}

export class InvoiceItemDto {
  description: string;
  quantity: number;
  unitOfMeasure?: string;
  unitPrice: number;
  discountPct?: number;
  vatRate?: number;
  accountId?: string;
  productId?: string;
}

export class UpdateInvoiceDto {
  dueDate?: Date;
  notes?: string;
}

export class ApproveInvoiceDto {
  approvedBy: string;
}

export class IssueInvoiceDto {
  issuedBy: string;
}

export class CancelInvoiceDto {
  reason: string;
  cancelledBy: string;
}

export class SendInvoiceDto {
  sendMethod: 'EMAIL' | 'SMS' | 'PRINT';
}

// Credit Note DTOs
export class CreateCreditNoteDto {
  originalInvoiceId: string;
  reason: string;
  items: CreditNoteItemDto[];
}

export class CreditNoteItemDto {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate?: number;
}

// Payment DTOs
export class ReceivePaymentDto {
  customerId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNo?: string;
  transactionId?: string;
  bankAccountId?: string;
  vatRefundAmount?: number;
  notes?: string;
}

export class AllocatePaymentDto {
  invoiceIds: string[];
  amounts: number[];
}

export class MakePaymentDto {
  supplierId: string;
  amount: number;
  paymentType: string;
  payeeType: string;
  payeeId: string;
  tdsAmount?: number;
  paymentMethod: PaymentMethod;
  referenceNo?: string;
  bankAccountId?: string;
  notes?: string;
}

// Bill (Purchase Invoice) DTOs
export class CreateBillDto {
  supplierId: string;
  fiscalYearId: string;
  billDate: Date;
  dueDate?: Date;
  supplierPan?: string;
  items: BillItemDto[];
  discountAmount?: number;
  currency?: string;
  notes?: string;
}

export class BillItemDto {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate?: number;
}
