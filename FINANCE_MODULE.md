# Finance Module — Multi-Tenant SaaS Platform
## Enterprise Financial Engine with NFRS Compliance & Nepal IRD Electronic Billing Integration

**Document Version**: 1.0.0  
**Standard**: Nepal Financial Reporting Standards (NFRS), IRD Electronic Billing Procedure 2074 (4th Amendment)  
**Scope**: Platform-wide Finance Module — applicable across all tenant verticals  
**Module Owner**: Finance Core  
**Dependencies**: Tenant Module, Auth Module, Subscription Module, Notification Module, Billing Engine

---

## Table of Contents

1. [Overview & Philosophy](#1-overview--philosophy)
2. [Architecture Position](#2-architecture-position)
3. [Tenant Financial Personas & Use Cases](#3-tenant-financial-personas--use-cases)
4. [Core Financial Principles (NFRS/GAAP)](#4-core-financial-principles-nfrsgaap)
5. [Chart of Accounts Design](#5-chart-of-accounts-design)
6. [Database Schema](#6-database-schema)
7. [Platform Billing — Dexo Subscription Engine](#7-platform-billing--dexo-subscription-engine)
8. [Tenant Billing Flows](#8-tenant-billing-flows)
9. [Sales & Purchase Cycle](#9-sales--purchase-cycle)
10. [Payment Architecture](#10-payment-architecture)
11. [Nepal IRD Electronic Billing Compliance](#11-nepal-ird-electronic-billing-compliance)
12. [CBMS Integration Layer](#12-cbms-integration-layer)
13. [Financial Statements Engine](#13-financial-statements-engine)
14. [Module-Specific Finance Flows](#14-module-specific-finance-flows)
15. [Multi-Tenant Isolation Strategy](#15-multi-tenant-isolation-strategy)
16. [API Specification](#16-api-specification)
17. [Reporting & Audit Engine](#17-reporting--audit-engine)
18. [Background Jobs & Automation](#18-background-jobs--automation)
19. [Implementation Checklist](#19-implementation-checklist)
20. [Pre-Mortem: Finance Module Failure Analysis](#20-pre-mortem-finance-module-failure-analysis)

---

## 1. Overview & Philosophy

The Finance Module is the **single source of truth** for all monetary activity across the platform. Every transaction — whether a subscription charge, a gym membership invoice, a tailor's payment received, or a trainer's salary — flows through this module and lands in a proper double-entry journal.

### 1.1 Two Financial Layers

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: DEXO PLATFORM FINANCE                                 │
│  Dexo bills tenants. Subscription revenue. Platform P&L.        │
│  IRD-compliant electronic invoices issued by Dexo to tenants.   │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2: TENANT FINANCE (per tenant, fully isolated)           │
│  Each tenant maintains their own books.                         │
│  Fitness Center bills members. Tailors bill customers.          │
│  Tenants issue their own IRD-compliant electronic invoices.     │
└─────────────────────────────────────────────────────────────────┘
```

These layers **never mix**. Tenant A's balance sheet cannot see Tenant B's data. Dexo's own books are a separate accounting entity.

### 1.2 Accounting Engine Principles

- **Double-Entry Mandatory**: Every financial event creates at least one debit and one credit. No single-sided entries.
- **Immutable Ledger**: Posted journal entries are never deleted or modified. Corrections use reversal entries.
- **NFRS Compliance**: Nepal Financial Reporting Standards govern recognition, measurement, and disclosure.
- **IRD Compliance**: All electronic invoices comply with Bidyutiya Bijak Sambandhi Karyawidhi, 2074 (4th Amendment).
- **Audit Trail Always On**: Every write to the financial database is logged with user, timestamp, and IP.
- **Accrual Basis**: Revenue and expense recognized when earned/incurred, not when cash moves.

---

## 2. Architecture Position

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SaaS Platform                               │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │   Auth   │  │  Tenant  │  │  Users   │  │   Subscription    │  │
│  │  Module  │  │  Module  │  │  Module  │  │      Module       │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬──────────┘  │
│       │             │             │                  │             │
│       └─────────────┴─────────────┴──────────────────┘             │
│                                   │                                 │
│                    ┌──────────────▼──────────────┐                 │
│                    │       FINANCE MODULE         │                 │
│                    │                             │                 │
│                    │  ┌─────────────────────┐   │                 │
│                    │  │  Accounting Engine   │   │                 │
│                    │  │  (Double-Entry GL)   │   │                 │
│                    │  └─────────────────────┘   │                 │
│                    │  ┌──────────┐ ┌─────────┐  │                 │
│                    │  │ Billing  │ │Payments │  │                 │
│                    │  │ Engine   │ │ Engine  │  │                 │
│                    │  └──────────┘ └─────────┘  │                 │
│                    │  ┌──────────┐ ┌─────────┐  │                 │
│                    │  │IRD/CBMS  │ │Reports  │  │                 │
│                    │  │Compliance│ │ Engine  │  │                 │
│                    │  └──────────┘ └─────────┘  │                 │
│                    └─────────────────────────────┘                 │
│                                   │                                 │
│       ┌───────────────────────────┼────────────────────┐           │
│       │                           │                    │           │
│  ┌────▼────────┐  ┌───────────────▼────┐  ┌───────────▼────────┐  │
│  │  Fitness    │  │  Mr. Gentleman     │  │  Future Tenants    │  │
│  │  Center     │  │  (Tailoring)       │  │  (Hotels, Schools) │  │
│  │  Module     │  │  Module            │  │                    │  │
│  └─────────────┘  └────────────────────┘  └────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.1 Module Dependencies

| Module | Finance Dependency | Direction |
|--------|-------------------|-----------|
| Subscription Module | Creates AR invoices to tenants | → Finance |
| Fitness Center Module | Creates member invoices, trainer payroll | → Finance |
| Mr. Gentleman Module | Creates customer invoices, supplier bills | → Finance |
| Payment Gateway | Settles payment, triggers receipt entry | → Finance |
| IRD CBMS | Receives real-time sync of all invoices | Finance → |
| Notification Module | Sends payment confirmations, due reminders | Finance → |
| Analytics Module | Reads financial summaries | Finance → |

---

## 3. Tenant Financial Personas & Use Cases

### 3.1 Persona: Dexo (The Platform)

**What Dexo does financially:**
- Maintains its own books as a separate legal entity
- Bills tenants (fitness centers, tailors, other SMEs) on a subscription basis
- Issues IRD-compliant electronic invoices to each paying tenant
- Recognizes subscription revenue on accrual basis (monthly/annual)
- Tracks platform costs, server costs, and operational expenses
- Produces financial statements for Dexo itself

**Billing model:**
```
Free Tier:   0–5 customers (tenants)   → NPR 0/month
Starter:     6–50 customers            → NPR [X]/month per tenant
Growth:      51–500 customers          → NPR [Y]/month per tenant
Enterprise:  500+ customers            → Custom pricing
```

**Key financial transactions for Dexo:**
```
DR  Accounts Receivable — [Tenant Name]     [Subscription Amount]
    CR  Subscription Revenue                            [Amount]
    CR  VAT Payable (13%)                              [VAT Amount]

When payment received:
DR  Bank Account / eSewa / ConnectIPS      [Amount]
    CR  Accounts Receivable — [Tenant Name]            [Amount]
```

---

### 3.2 Persona: Fitness Center Tenant

**What a Fitness Center does financially:**
- Registers as a tenant on Dexo (pays subscription to Dexo)
- Maintains its **own independent books** within the platform
- Bills members (customers) for memberships, personal training, classes
- Pays trainers (employees or contractors) wages/commissions
- Makes purchases (equipment, supplements for resale, utilities)
- Processes sales returns (member refund requests)
- Processes purchase returns (returns to suppliers)

**Key transaction flows:**

```
1. Member pays for membership:
   DR  Cash / Bank / eSewa                [Membership Fee]
       CR  Membership Revenue                          [Base Amount]
       CR  VAT Payable 13%                             [VAT Amount]

2. Fitness center pays trainer salary:
   DR  Trainer Salary Expense             [Gross Salary]
       CR  TDS Payable (15% if contractor)            [TDS Amount]
       CR  Bank Account                               [Net Payment]

3. Purchase of equipment:
   DR  Fixed Assets / Equipment           [Cost]
       CR  Accounts Payable — Supplier               [Amount]

4. Sales return (member refund):
   DR  Sales Returns & Allowances         [Amount]
   DR  VAT Payable (reverse)              [VAT Portion]
       CR  Cash / Bank                               [Refunded Amount]

5. Purchase return to supplier:
   DR  Accounts Payable — Supplier        [Amount]
       CR  Purchase Returns               [Base Amount]
       CR  VAT Receivable (reverse)       [VAT Portion]
```

---

### 3.3 Persona: Mr. Gentleman — Tailoring Business Tenant

**What a tailoring shop does financially:**
- Registers as a tenant on Dexo (pays subscription to Dexo)
- Maintains its **own independent books**
- Takes advance/deposit from customers for orders
- Issues invoice on delivery of completed garment
- Purchases raw materials (fabric, thread, buttons, accessories)
- Pays tailors/stitchers (employees or piece-rate workers)
- May issue credit notes if garment is defective or remade
- Tracks WIP (work-in-progress) inventory of orders in production

**Key transaction flows:**

```
1. Customer pays advance/deposit for tailoring order:
   DR  Cash / Bank                        [Advance Amount]
       CR  Advance from Customers (Liability)         [Amount]

2. Order complete — issue invoice:
   DR  Advance from Customers             [Advance Previously Received]
   DR  Accounts Receivable / Cash         [Balance Due]
       CR  Tailoring Revenue                          [Base Amount]
       CR  VAT Payable 13%                            [VAT Amount]

3. Purchase fabric from supplier:
   DR  Raw Material Inventory             [Cost]
   DR  VAT Receivable 13%                 [Input VAT]
       CR  Accounts Payable — Supplier               [Total Amount]

4. Pay stitchers (piece-rate):
   DR  Labour Cost — Stitching            [Amount]
       CR  Cash / Bank                               [Net Amount]
       CR  TDS Payable (if applicable)               [TDS Amount]

5. Customer return / defective work:
   DR  Sales Returns & Allowances         [Amount]
   DR  VAT Payable (reverse)              [VAT Portion]
       CR  Cash / Bank / Advance Liability            [Amount]

6. Transfer materials to WIP:
   DR  WIP Inventory                      [Material + Labour]
       CR  Raw Material Inventory                    [Materials]
       CR  Labour Payable                            [Labour]

7. Transfer WIP to Cost of Goods Sold on delivery:
   DR  Cost of Goods Sold                 [Total Cost]
       CR  WIP Inventory                             [Amount]
```

---

## 4. Core Financial Principles (NFRS/GAAP)

### 4.1 NFRS Standards Applicable

| NFRS Standard | Application |
|---------------|-------------|
| **NFRS 15** (Revenue from Contracts) | Subscription revenue, membership revenue, tailoring order revenue |
| **NFRS 9** (Financial Instruments) | Receivables, payables, loans |
| **NFRS 16** (Leases) | Office/gym space leases |
| **NAS 2** (Inventories) | Raw materials, supplements, finished garments |
| **NAS 16** (Property, Plant & Equipment) | Gym equipment, sewing machines |
| **NAS 37** (Provisions & Contingencies) | Warranty provisions, refund provisions |
| **NAS 18** (Revenue) | (superseded by NFRS 15 for new contracts) |

### 4.2 Revenue Recognition Rules

**Subscription Revenue (Dexo):**
- Recognize ratably over the subscription period
- Annual subscriptions → deferred revenue at billing; recognize 1/12 per month
- No revenue recognized for free tier (0 NPR)

**Membership Revenue (Fitness Center):**
- Monthly membership → recognize in month of service
- Annual membership → deferred at billing; recognize 1/12 per month
- Personal training sessions → recognize per session delivered (milestone)
- Package deals with multiple services → allocate based on standalone selling price

**Tailoring Revenue (Mr. Gentleman):**
- Recognize on delivery of completed garment (point-in-time)
- Advance/deposit not revenue until delivery
- Partial delivery → recognize portion delivered

### 4.3 VAT Treatment

All VAT-registered tenants operate under Nepal VAT Act 2052:

| Transaction | VAT Treatment |
|-------------|---------------|
| Sales to customer | Output VAT 13% collected |
| Purchase from registered supplier | Input VAT 13% claimable |
| Sales return | Reverse output VAT |
| Purchase return | Reverse input VAT |
| Exempt sales | No VAT |
| Electronic payment | 10% of VAT refunded to customer (CBMS requirement) |

### 4.4 TDS (Tax Deducted at Source)

| Payment Type | TDS Rate |
|--------------|----------|
| Contractor/freelancer payment | 15% |
| Employee salary (above threshold) | Slab rates per Income Tax Act 2058 |
| Rent payment | 10% |
| Commission | 15% |
| Interest | 15% |

---

## 5. Chart of Accounts Design

Each tenant gets a **standardized Chart of Accounts** that can be extended. The platform provides a default CoA template per industry vertical.

### 5.1 Universal Account Structure

```
1000–1999  ASSETS
  1100     Current Assets
    1110   Cash & Cash Equivalents
      1111   Petty Cash
      1112   Bank Account — Primary
      1113   Bank Account — Secondary
      1114   eSewa / Khalti Settlement Account
      1115   ConnectIPS Settlement Account
    1120   Accounts Receivable
      1121   Trade Receivables — Members/Customers
      1122   Advance to Suppliers
      1123   VAT Receivable (Input Tax Credit)
      1124   TDS Receivable
    1130   Inventory
      1131   Raw Materials
      1132   Work-In-Progress
      1133   Finished Goods
      1134   Trading Inventory (Supplements, etc.)
    1140   Prepaid Expenses
      1141   Prepaid Rent
      1142   Prepaid Insurance
      1143   Prepaid Software Subscription (Dexo)
  1200     Non-Current Assets
    1210   Property, Plant & Equipment
      1211   Equipment (Gym / Sewing Machines)
      1212   Furniture & Fixtures
      1213   Computer & IT Equipment
      1214   Leasehold Improvements
    1220   Accumulated Depreciation (contra)
    1230   Right-of-Use Assets (NFRS 16)
    1240   Intangible Assets
    1250   Security Deposits

2000–2999  LIABILITIES
  2100     Current Liabilities
    2110   Accounts Payable — Trade
    2120   Advance from Customers (Deposit Liability)
    2130   Deferred Revenue (Unearned)
      2131   Deferred Subscription Revenue
      2132   Deferred Membership Revenue
    2140   Tax Payables
      2141   VAT Payable (Output Tax)
      2142   TDS Payable
      2143   Income Tax Payable
    2150   Salary & Wages Payable
    2160   Lease Liability — Current (NFRS 16)
  2200     Non-Current Liabilities
    2210   Loan — Long Term
    2220   Lease Liability — Non-Current (NFRS 16)

3000–3999  EQUITY
  3100     Owner's Capital / Share Capital
  3200     Retained Earnings
  3300     Current Year Profit/Loss

4000–4999  REVENUE
  4100     Operating Revenue
    4110   Membership Revenue (Monthly)
    4111   Membership Revenue (Annual — Recognized)
    4120   Personal Training Revenue
    4130   Class Revenue
    4140   Tailoring Revenue
    4150   Product Sales Revenue
    4160   Subscription Revenue (Dexo platform)
  4200     Other Income
    4210   Interest Income
    4220   Discount Received

5000–5999  COST OF GOODS SOLD / DIRECT COSTS
  5100     Direct Labour
    5110   Trainer Wages / Commission
    5120   Stitcher / Tailor Labour Cost
  5200     Direct Materials / Inventory Cost
    5210   Cost of Goods Sold — Products
    5220   Raw Material Consumed
  5300     Returns & Allowances
    5310   Sales Returns & Allowances

6000–6999  OPERATING EXPENSES
  6100     Personnel Costs
    6110   Salaries & Wages
    6120   Staff Benefits
    6130   Staff Training
  6200     Occupancy Costs
    6210   Rent Expense
    6220   Utilities
    6230   Maintenance & Repairs
  6300     Administrative Expenses
    6310   Software Subscription — Dexo (Expense)
    6320   Internet & Communications
    6330   Stationery & Office Supplies
    6340   Professional Fees (Accounting, Legal)
  6400     Marketing & Sales
    6410   Advertising
    6420   Promotions & Discounts Expense
  6500     Depreciation & Amortization
    6510   Depreciation — Equipment
    6520   Amortization — Intangibles
  6600     Finance Costs
    6610   Bank Charges
    6620   Interest Expense
    6630   Payment Gateway Fees
```

### 5.2 Industry-Specific Extensions

**Fitness Center Additional Accounts:**
```
4121   Group Class Pass Revenue
4122   Day Pass Revenue
5111   Trainer Commission — Percentage
6231   Equipment Maintenance
```

**Mr. Gentleman (Tailoring) Additional Accounts:**
```
4141   Express Tailoring Premium Revenue
4142   Alteration Revenue
1133   Finished Garments Inventory
5221   Fabric Consumed
5222   Accessories Consumed (Buttons, Thread, etc.)
6241   Laundry / Cleaning Expense
```

---

## 6. Database Schema

### 6.1 Core Accounting Tables

```sql
-- =============================================
-- CHART OF ACCOUNTS
-- =============================================
CREATE TABLE chart_of_accounts (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL REFERENCES tenants(id),
    account_code    VARCHAR(20) NOT NULL,
    account_name    VARCHAR(200) NOT NULL,
    account_type    VARCHAR(30) NOT NULL,  -- ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE, COGS
    parent_id       BIGINT REFERENCES chart_of_accounts(id),
    is_control      BOOLEAN DEFAULT FALSE,  -- control accounts (AR, AP) cannot be posted to directly
    currency        VARCHAR(3) DEFAULT 'NPR',
    normal_balance  VARCHAR(6) NOT NULL,    -- DEBIT or CREDIT
    is_active       BOOLEAN DEFAULT TRUE,
    created_by      BIGINT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, account_code)
);

-- =============================================
-- FISCAL YEAR
-- =============================================
CREATE TABLE fiscal_years (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL REFERENCES tenants(id),
    name            VARCHAR(30) NOT NULL,   -- e.g., "2081/82"
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    is_active       BOOLEAN DEFAULT FALSE,
    is_closed       BOOLEAN DEFAULT FALSE,
    closed_by       BIGINT,
    closed_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, name)
);

-- =============================================
-- ACCOUNTING PERIODS
-- =============================================
CREATE TABLE accounting_periods (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL REFERENCES tenants(id),
    fiscal_year_id  BIGINT NOT NULL REFERENCES fiscal_years(id),
    period_name     VARCHAR(30) NOT NULL,   -- e.g., "Shrawan 2081"
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    is_closed       BOOLEAN DEFAULT FALSE,
    closed_by       BIGINT,
    closed_at       TIMESTAMPTZ,
    UNIQUE (tenant_id, fiscal_year_id, start_date)
);

-- =============================================
-- JOURNAL ENTRIES (HEADER)
-- =============================================
CREATE TABLE journal_entries (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL REFERENCES tenants(id),
    fiscal_year_id  BIGINT NOT NULL REFERENCES fiscal_years(id),
    period_id       BIGINT NOT NULL REFERENCES accounting_periods(id),
    entry_no        VARCHAR(50) NOT NULL,   -- auto-generated: JE-2081/82-000001
    entry_date      DATE NOT NULL,
    reference_type  VARCHAR(50),   -- INVOICE, PAYMENT, PAYROLL, MANUAL, REVERSAL, etc.
    reference_id    BIGINT,        -- FK to source document
    description     TEXT NOT NULL,
    narration       TEXT,
    is_posted       BOOLEAN DEFAULT FALSE,
    is_reversed     BOOLEAN DEFAULT FALSE,
    reversal_of_id  BIGINT REFERENCES journal_entries(id),
    created_by      BIGINT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    posted_by       BIGINT,
    posted_at       TIMESTAMPTZ,
    UNIQUE (tenant_id, entry_no)
);

-- =============================================
-- JOURNAL ENTRY LINES (IMMUTABLE AFTER POST)
-- =============================================
CREATE TABLE journal_entry_lines (
    id              BIGSERIAL PRIMARY KEY,
    journal_entry_id BIGINT NOT NULL REFERENCES journal_entries(id),
    tenant_id       BIGINT NOT NULL REFERENCES tenants(id),
    account_id      BIGINT NOT NULL REFERENCES chart_of_accounts(id),
    line_no         INTEGER NOT NULL,
    description     TEXT,
    debit_amount    DECIMAL(18,2) DEFAULT 0 CHECK (debit_amount >= 0),
    credit_amount   DECIMAL(18,2) DEFAULT 0 CHECK (credit_amount >= 0),
    currency        VARCHAR(3) DEFAULT 'NPR',
    -- Prevent both debit and credit on same line
    CHECK (NOT (debit_amount > 0 AND credit_amount > 0))
);

-- Enforce balanced entries via trigger (debit sum = credit sum)

-- =============================================
-- MASTER BILL TABLE (IRD SCHEDULE 5 — MANDATORY)
-- =============================================
CREATE TABLE master_bills (
    id                  BIGSERIAL PRIMARY KEY,
    tenant_id           BIGINT NOT NULL REFERENCES tenants(id),
    fiscal_year         VARCHAR(20) NOT NULL,
    bill_no             VARCHAR(50) NOT NULL,
    customer_name       VARCHAR(200),
    customer_pan        VARCHAR(20),
    bill_date           TIMESTAMPTZ NOT NULL,
    amount              DECIMAL(15,2) NOT NULL,     -- gross before discount/tax
    discount            DECIMAL(15,2) DEFAULT 0,
    taxable_amount      DECIMAL(15,2),
    tax_amount          DECIMAL(15,2),
    total_amount        DECIMAL(15,2) NOT NULL,
    sync_with_ird       BOOLEAN DEFAULT FALSE,
    is_bill_printed     BOOLEAN DEFAULT FALSE,
    is_bill_active      BOOLEAN DEFAULT TRUE,
    printed_time        TIMESTAMPTZ,
    entered_by          BIGINT NOT NULL,
    printed_by          BIGINT,
    is_realtime         BOOLEAN DEFAULT TRUE,
    payment_method      VARCHAR(30),  -- CASH, CHEQUE, CREDITOR, ELECTRONIC, OTHER
    vat_refund_amount   DECIMAL(15,2),
    transaction_id      VARCHAR(100),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, fiscal_year, bill_no)
    -- No DELETE ever permitted on this table
);

-- =============================================
-- INVOICES (AR — Sales Invoices)
-- =============================================
CREATE TABLE invoices (
    id                  BIGSERIAL PRIMARY KEY,
    tenant_id           BIGINT NOT NULL REFERENCES tenants(id),
    master_bill_id      BIGINT REFERENCES master_bills(id),
    fiscal_year_id      BIGINT NOT NULL REFERENCES fiscal_years(id),
    invoice_number      VARCHAR(50) NOT NULL,
    invoice_type        VARCHAR(30) NOT NULL,  -- TAX_INVOICE, ABBREVIATED, INVOICE, CREDIT_NOTE, DEBIT_NOTE
    invoice_date        DATE NOT NULL,
    due_date            DATE,
    customer_id         BIGINT NOT NULL REFERENCES customers(id),
    customer_pan        VARCHAR(20),
    billing_address     TEXT,
    subtotal            DECIMAL(15,2) NOT NULL,
    discount_amount     DECIMAL(15,2) DEFAULT 0,
    taxable_amount      DECIMAL(15,2) NOT NULL,
    vat_amount          DECIMAL(15,2) DEFAULT 0,
    total_amount        DECIMAL(15,2) NOT NULL,
    paid_amount         DECIMAL(15,2) DEFAULT 0,
    balance_due         DECIMAL(15,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    payment_status      VARCHAR(20) DEFAULT 'UNPAID',  -- UNPAID, PARTIAL, PAID, CANCELLED
    currency            VARCHAR(3) DEFAULT 'NPR',
    notes               TEXT,
    is_active           BOOLEAN DEFAULT TRUE,
    cancelled_at        TIMESTAMPTZ,
    cancelled_by        BIGINT,
    cancel_reason       TEXT,
    journal_entry_id    BIGINT REFERENCES journal_entries(id),
    created_by          BIGINT NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, invoice_number)
);

-- =============================================
-- INVOICE LINE ITEMS
-- =============================================
CREATE TABLE invoice_items (
    id              BIGSERIAL PRIMARY KEY,
    invoice_id      BIGINT NOT NULL REFERENCES invoices(id),
    tenant_id       BIGINT NOT NULL REFERENCES tenants(id),
    item_no         INTEGER NOT NULL,
    description     TEXT NOT NULL,
    quantity        DECIMAL(10,3) NOT NULL,
    unit_of_measure VARCHAR(20),
    unit_price      DECIMAL(15,2) NOT NULL,
    discount_pct    DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    taxable_amount  DECIMAL(15,2) NOT NULL,
    vat_rate        DECIMAL(5,2) DEFAULT 13.00,
    vat_amount      DECIMAL(15,2) DEFAULT 0,
    total_amount    DECIMAL(15,2) NOT NULL,
    account_id      BIGINT REFERENCES chart_of_accounts(id),  -- revenue account
    product_id      BIGINT REFERENCES products(id)
);

-- =============================================
-- BILLS (AP — Purchase Invoices from Suppliers)
-- =============================================
CREATE TABLE bills (
    id                  BIGSERIAL PRIMARY KEY,
    tenant_id           BIGINT NOT NULL REFERENCES tenants(id),
    fiscal_year_id      BIGINT NOT NULL REFERENCES fiscal_years(id),
    bill_number         VARCHAR(50) NOT NULL,
    bill_type           VARCHAR(20) DEFAULT 'PURCHASE',  -- PURCHASE, DEBIT_NOTE
    bill_date           DATE NOT NULL,
    due_date            DATE,
    supplier_id         BIGINT NOT NULL REFERENCES suppliers(id),
    supplier_pan        VARCHAR(20),
    subtotal            DECIMAL(15,2) NOT NULL,
    discount_amount     DECIMAL(15,2) DEFAULT 0,
    taxable_amount      DECIMAL(15,2) NOT NULL,
    vat_amount          DECIMAL(15,2) DEFAULT 0,
    total_amount        DECIMAL(15,2) NOT NULL,
    paid_amount         DECIMAL(15,2) DEFAULT 0,
    payment_status      VARCHAR(20) DEFAULT 'UNPAID',
    currency            VARCHAR(3) DEFAULT 'NPR',
    notes               TEXT,
    is_active           BOOLEAN DEFAULT TRUE,
    journal_entry_id    BIGINT REFERENCES journal_entries(id),
    created_by          BIGINT NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, bill_number)
);

-- =============================================
-- PAYMENTS RECEIVED (AR Settlements)
-- =============================================
CREATE TABLE payments_received (
    id                  BIGSERIAL PRIMARY KEY,
    tenant_id           BIGINT NOT NULL REFERENCES tenants(id),
    payment_no          VARCHAR(50) NOT NULL,
    payment_date        DATE NOT NULL,
    customer_id         BIGINT NOT NULL REFERENCES customers(id),
    amount              DECIMAL(15,2) NOT NULL,
    payment_method      VARCHAR(30) NOT NULL,  -- CASH, CHEQUE, ESEWA, KHALTI, CONNECTIPS, CARD, BANK_TRANSFER
    reference_no        VARCHAR(100),   -- cheque no, transaction ID from gateway
    transaction_id      VARCHAR(100),   -- gateway transaction ID
    bank_account_id     BIGINT REFERENCES bank_accounts(id),
    notes               TEXT,
    vat_refund_amount   DECIMAL(15,2),  -- 10% of VAT if electronic payment
    is_refunded         BOOLEAN DEFAULT FALSE,
    journal_entry_id    BIGINT REFERENCES journal_entries(id),
    created_by          BIGINT NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, payment_no)
);

-- =============================================
-- PAYMENT-INVOICE ALLOCATIONS
-- =============================================
CREATE TABLE payment_allocations (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL REFERENCES tenants(id),
    payment_id      BIGINT NOT NULL REFERENCES payments_received(id),
    invoice_id      BIGINT NOT NULL REFERENCES invoices(id),
    allocated_amount DECIMAL(15,2) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (payment_id, invoice_id)
);

-- =============================================
-- PAYMENTS MADE (AP Settlements)
-- =============================================
CREATE TABLE payments_made (
    id                  BIGSERIAL PRIMARY KEY,
    tenant_id           BIGINT NOT NULL REFERENCES tenants(id),
    payment_no          VARCHAR(50) NOT NULL,
    payment_date        DATE NOT NULL,
    payment_type        VARCHAR(30) NOT NULL,  -- SUPPLIER, SALARY, TRAINER_WAGE, TAX, UTILITY
    payee_type          VARCHAR(20) NOT NULL,  -- SUPPLIER, EMPLOYEE, CONTRACTOR, TAX_AUTHORITY
    payee_id            BIGINT NOT NULL,       -- FK to suppliers/employees/etc
    amount              DECIMAL(15,2) NOT NULL,
    tds_amount          DECIMAL(15,2) DEFAULT 0,
    net_amount          DECIMAL(15,2) NOT NULL,
    payment_method      VARCHAR(30) NOT NULL,
    reference_no        VARCHAR(100),
    bank_account_id     BIGINT REFERENCES bank_accounts(id),
    notes               TEXT,
    journal_entry_id    BIGINT REFERENCES journal_entries(id),
    created_by          BIGINT NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, payment_no)
);

-- =============================================
-- CUSTOMERS (per tenant)
-- =============================================
CREATE TABLE customers (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL REFERENCES tenants(id),
    customer_code   VARCHAR(30),
    name            VARCHAR(200) NOT NULL,
    pan             VARCHAR(20),
    mobile          VARCHAR(20),
    email           VARCHAR(200),
    address         TEXT,
    credit_limit    DECIMAL(15,2) DEFAULT 0,
    is_vat_registered BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SUPPLIERS (per tenant)
-- =============================================
CREATE TABLE suppliers (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL REFERENCES tenants(id),
    supplier_code   VARCHAR(30),
    name            VARCHAR(200) NOT NULL,
    pan             VARCHAR(20),
    mobile          VARCHAR(20),
    email           VARCHAR(200),
    address         TEXT,
    is_vat_registered BOOLEAN DEFAULT FALSE,
    payment_terms_days INTEGER DEFAULT 30,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- REPRINT LOGS (IRD MANDATORY)
-- =============================================
CREATE TABLE reprint_logs (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL REFERENCES tenants(id),
    invoice_id      BIGINT NOT NULL REFERENCES invoices(id),
    bill_no         VARCHAR(50) NOT NULL,
    print_type      VARCHAR(20) NOT NULL,  -- ORIGINAL, COPY
    copy_number     INTEGER NOT NULL DEFAULT 1,
    printed_by      BIGINT NOT NULL,
    printed_at      TIMESTAMPTZ DEFAULT NOW(),
    reason          TEXT,
    ip_address      VARCHAR(45)
);

-- =============================================
-- AUDIT LOG (IMMUTABLE — NO UPDATE/DELETE)
-- =============================================
CREATE TABLE finance_audit_log (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL,
    table_name      VARCHAR(100) NOT NULL,
    record_id       BIGINT NOT NULL,
    action          VARCHAR(20) NOT NULL,  -- INSERT, UPDATE, CANCEL, PRINT, REPRINT, SYNC
    old_data        JSONB,
    new_data        JSONB,
    action_by       BIGINT NOT NULL,
    action_at       TIMESTAMPTZ DEFAULT NOW(),
    ip_address      VARCHAR(45),
    user_agent      VARCHAR(500)
);
```

### 6.2 Critical Database Constraints

```sql
-- Prevent physical deletion from financial tables
-- Implement via Row-Level Security + trigger

CREATE OR REPLACE FUNCTION prevent_financial_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Physical deletion of financial records is prohibited. Use is_active = false or cancellation.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER no_delete_master_bills
    BEFORE DELETE ON master_bills FOR EACH ROW EXECUTE FUNCTION prevent_financial_delete();

CREATE TRIGGER no_delete_invoices
    BEFORE DELETE ON invoices FOR EACH ROW EXECUTE FUNCTION prevent_financial_delete();

CREATE TRIGGER no_delete_journal_entries
    BEFORE DELETE ON journal_entries FOR EACH ROW EXECUTE FUNCTION prevent_financial_delete();

CREATE TRIGGER no_delete_journal_entry_lines
    BEFORE DELETE ON journal_entry_lines FOR EACH ROW EXECUTE FUNCTION prevent_financial_delete();

-- Enforce balanced journal entries
CREATE OR REPLACE FUNCTION check_journal_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_debit  DECIMAL(18,2);
    v_credit DECIMAL(18,2);
BEGIN
    SELECT COALESCE(SUM(debit_amount), 0), COALESCE(SUM(credit_amount), 0)
    INTO v_debit, v_credit
    FROM journal_entry_lines
    WHERE journal_entry_id = NEW.id;

    IF v_debit <> v_credit THEN
        RAISE EXCEPTION 'Journal entry is not balanced. Debits: %, Credits: %', v_debit, v_credit;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance
CREATE INDEX idx_master_bills_tenant_fiscal ON master_bills(tenant_id, fiscal_year);
CREATE INDEX idx_master_bills_sync ON master_bills(tenant_id, sync_with_ird) WHERE sync_with_ird = FALSE;
CREATE INDEX idx_invoices_tenant_customer ON invoices(tenant_id, customer_id);
CREATE INDEX idx_invoices_payment_status ON invoices(tenant_id, payment_status);
CREATE INDEX idx_je_lines_account ON journal_entry_lines(account_id, tenant_id);
CREATE INDEX idx_audit_log_tenant_table ON finance_audit_log(tenant_id, table_name, record_id);
```

---

## 7. Platform Billing — Dexo Subscription Engine

### 7.1 Subscription Plans & Billing

```
Dexo Subscription Tiers:

┌──────────────┬───────────────────────────┬───────────────────┐
│  Plan        │  Customers (Tenants)      │  Billing          │
├──────────────┼───────────────────────────┼───────────────────┤
│  Free        │  0 – 5                    │  NPR 0/month      │
│  Starter     │  6 – 50                   │  NPR X/month      │
│  Growth      │  51 – 500                 │  NPR Y/month      │
│  Enterprise  │  500+                     │  Custom           │
└──────────────┴───────────────────────────┴───────────────────┘
```

### 7.2 Dexo Billing Flow (Subscription Invoice)

```
Monthly Auto-Billing Job (1st of each month, 2 AM NST):
│
├── 1. Determine active tenants above free tier
│
├── 2. For each billable tenant:
│       a. Calculate plan charges for the month
│       b. Generate invoice in Dexo's books
│       c. Issue IRD-compliant electronic tax invoice to tenant
│       d. Sync to Dexo's CBMS in real time
│       e. Queue payment collection (auto-debit or manual)
│       f. Send invoice notification to tenant admin email/SMS
│
├── 3. Deferred Revenue Release Job:
│       a. Recognize 1/12 of any annual subscriptions for the month
│       b. Post journal:
│          DR Deferred Subscription Revenue
│              CR Subscription Revenue
│
└── 4. Failed Payment Handling:
        a. D+3: Send first reminder
        b. D+7: Send second reminder, flag account
        c. D+15: Downgrade to free tier (read-only mode)
        d. D+30: Suspend account
```

### 7.3 Dexo Revenue Journal Entry

```
On invoice generation (subscription billing):
DR  Accounts Receivable — [Tenant Name]    NPR X + VAT
    CR  Deferred Subscription Revenue          NPR X
    CR  VAT Payable                            NPR X × 13%

On recognition (monthly, for annual plans):
DR  Deferred Subscription Revenue          NPR X/12
    CR  Subscription Revenue                   NPR X/12

On payment received:
DR  Bank / eSewa / ConnectIPS             NPR X + VAT
    CR  Accounts Receivable — [Tenant]         NPR X + VAT
```

### 7.4 Subscription Module Finance Integration

```typescript
// Subscription event → Finance event mapping
interface SubscriptionFinanceEvent {
  event: 'SUBSCRIPTION_CREATED' | 'SUBSCRIPTION_RENEWED' | 
         'SUBSCRIPTION_UPGRADED' | 'SUBSCRIPTION_CANCELLED' |
         'SUBSCRIPTION_PAYMENT_RECEIVED' | 'SUBSCRIPTION_REFUNDED';
  tenantId: bigint;
  subscriptionId: bigint;
  amount: number;
  vatAmount: number;
  totalAmount: number;
  paymentMethod?: string;
  transactionId?: string;
}

// Finance module listens to subscription events
// and auto-generates journal entries + master bill entries
```

---

## 8. Tenant Billing Flows

### 8.1 Invoice Lifecycle (Standard AR Flow)

```
DRAFT → APPROVED → ISSUED → SENT → PARTIAL | PAID → [CANCELLED]
                                          ↓
                                    CREDIT NOTE (if return)
```

**State transitions:**
```
DRAFT      → Saved, not yet valid. Can be edited freely.
APPROVED   → Controller/manager approved. No more line edits.
ISSUED     → Bill number assigned. IRD master_bill record created. Immutable.
SENT       → Delivered to customer (email/print).
PARTIAL    → Partial payment received.
PAID       → Fully settled.
CANCELLED  → Voided with reason. master_bill updated. Not deleted.
```

### 8.2 Sales Return (Credit Note) Flow

```
1. Customer raises return request
2. Manager/supervisor approves return
3. System generates Credit Note linked to original Invoice
4. Journal Entry:
   DR  Sales Returns & Allowances    [Base Amount]
   DR  VAT Payable (reverse)         [VAT Amount]
       CR  Accounts Receivable            [Total]
   (or if cash refund:)
       CR  Cash / Bank                    [Total]
5. Master Bill updated: original bill remains active; credit note creates new bill_no
6. IRD CBMS sync for credit note
```

### 8.3 Purchase Return (Debit Note) Flow

```
1. Tenant raises return to supplier
2. Debit Note generated against original Purchase Bill
3. Journal Entry:
   DR  Accounts Payable — Supplier   [Total]
       CR  Purchase Returns               [Base Amount]
       CR  VAT Receivable (reverse)       [VAT Amount]
4. Supplier balance updated
```

---

## 9. Sales & Purchase Cycle

### 9.1 Sales Cycle (AR)

```
Customer Order
    │
    ▼
Sales Order (optional)
    │
    ▼
Delivery / Service Delivery
    │
    ▼
Invoice Generation
    ├── Assign sequential Bill No. (fiscal year reset)
    ├── Create master_bill record
    ├── Post Journal Entry (DR AR / CR Revenue / CR VAT)
    └── Sync to CBMS (real-time if designated taxpayer)
    │
    ▼
Payment Collection
    ├── Cash Payment → immediate receipt entry
    ├── Electronic Payment → gateway callback → receipt + VAT refund calc
    └── Credit → aged AR tracking
    │
    ▼
Bank Reconciliation
    │
    ▼
Period Close
```

### 9.2 Purchase Cycle (AP)

```
Purchase Order
    │
    ▼
Goods / Services Received (GRN)
    │
    ▼
Supplier Invoice Received
    ├── 3-way match: PO × GRN × Invoice
    ├── Post Journal Entry (DR Inventory/Expense + DR VAT Recv / CR AP)
    └── Schedule for payment
    │
    ▼
Payment Processing
    ├── Approve payment
    ├── Calculate TDS if applicable
    ├── Post payment entry (DR AP / CR Bank, DR AP / CR TDS Payable for net)
    └── Issue TDS certificate to supplier
    │
    ▼
Bank Reconciliation
```

### 9.3 Payroll Cycle (for trainers, stitchers, staff)

```
Attendance / Timesheet Capture (from HR/Ops module)
    │
    ▼
Payroll Calculation
    ├── Gross salary / piece-rate / commission
    ├── Deductions: TDS, PF, CIT (if applicable)
    └── Net payable
    │
    ▼
Payroll Approval (supervisor / owner)
    │
    ▼
Journal Entry:
    DR  Salary/Wage Expense              [Gross]
        CR  TDS Payable                      [TDS]
        CR  PF/CIT Payable                   [PF/CIT]
        CR  Bank Account / Cash              [Net]
    │
    ▼
Bank Transfer / Cash Payment
    │
    ▼
TDS deposit to IRD by 25th of next month
```

---

## 10. Payment Architecture

### 10.1 Supported Payment Methods

| Method | Type | VAT Refund Applicable | Gateway |
|--------|------|----------------------|---------|
| Cash | Physical | No | — |
| Cheque | Bank | No | — |
| eSewa | Digital Wallet | Yes (10% of VAT) | eSewa API |
| Khalti | Digital Wallet | Yes (10% of VAT) | Khalti API |
| ConnectIPS | Bank Transfer | Yes (10% of VAT) | ConnectIPS API |
| Debit/Credit Card | Electronic | Yes (10% of VAT) | Payment gateway |
| Bank Transfer (NEFT) | Bank | No | — |
| Creditor (Trade Credit) | Credit | No | — |

### 10.2 Electronic Payment VAT Refund Flow (IRD Requirement)

```
Customer pays NPR 11,300 via eSewa
    ├── Invoice: Base NPR 10,000 + VAT NPR 1,300 = Total NPR 11,300
    ├── Payment received: NPR 11,300 via eSewa
    ├── VAT Refund = 10% × NPR 1,300 = NPR 130
    │
    ▼
Software automatically sends Schedule 8 data to eSewa/Payment Operator:
{
  "Seller_PAN": "XXXXXXXXX",
  "Invoice_Number": "INV-2081/82-000042",
  "Payment_Date": "2081-09-15",
  "Total_Amount": 11300.00,
  "VAT": 1300.00,
  "10_Percent_of_VAT_Amount": 130.00,
  "Customer_Id": "CUST_007",
  "Transaction_Identification_No": "ESEWA_TXN_ABC123"
}
    │
    ▼
eSewa/Khalti credits NPR 130 refund to customer's wallet
    │
    ▼
Database stores:
    - transaction_id: "ESEWA_TXN_ABC123"
    - vat_refund_amount: 130.00
    - All stored immutably in master_bills + payments_received
```

### 10.3 Payment Journal Entries by Method

```sql
-- Cash Payment
DR  1112 Cash/Bank Account             [Amount]
    CR  1121 Accounts Receivable           [Amount]

-- Electronic Payment (eSewa/Khalti)
DR  1114 eSewa Settlement Account      [Amount]
    CR  1121 Accounts Receivable           [Amount]
-- Note: Settlement account cleared when eSewa transfers to bank (T+1 or T+2)

DR  1114 eSewa Settlement Account      [0]  -- VAT refund flows through payment operator
-- VAT refund does not hit tenant books — it's a direct refund from payment operator to consumer

-- Cheque Payment
DR  1112 Bank Account (Cheque Clearing) [Amount]
    CR  1121 Accounts Receivable            [Amount]
-- Cheque may be on hold until cleared
```

---

## 11. Nepal IRD Electronic Billing Compliance

### 11.1 Bill Number Sequencing

```typescript
// Bill number format: [PREFIX]-[FISCAL_YEAR]-[SEQUENTIAL_NO]
// Example: INV-2081/82-000001

async function generateBillNumber(
  tenantId: bigint,
  fiscalYear: string,
  type: 'INV' | 'CN' | 'DN'
): Promise<string> {
  // Atomic sequence increment — race-condition safe
  const seq = await db.transaction(async (trx) => {
    const result = await trx.raw(`
      UPDATE bill_sequences 
      SET last_number = last_number + 1
      WHERE tenant_id = ? AND fiscal_year = ? AND bill_type = ?
      RETURNING last_number
    `, [tenantId, fiscalYear, type]);
    return result.rows[0].last_number;
  });
  
  return `${type}-${fiscalYear}-${String(seq).padStart(6, '0')}`;
}
// Numbers are NEVER reused. Gaps are allowed (cancelled bills keep their number).
// Fiscal year resets: Shrawan 1 of each new year → sequence resets to 1.
```

### 11.2 Invoice Print Control

```typescript
// First print: mark as printed
async function printInvoice(invoiceId: bigint, userId: bigint, ip: string) {
  const invoice = await Invoice.findByPk(invoiceId);
  
  if (!invoice.is_bill_printed) {
    // First print — original
    await invoice.update({ 
      is_bill_printed: true, 
      printed_time: new Date(),
      printed_by: userId 
    });
    await ReprintLog.create({
      invoice_id: invoiceId,
      print_type: 'ORIGINAL',
      copy_number: 0,
      printed_by: userId,
      ip_address: ip
    });
    return { watermark: null, copyNumber: null };
  } else {
    // Reprint — must show "Copy of Original" / "प्रतिलिपि"
    const lastReprint = await ReprintLog.max('copy_number', { 
      where: { invoice_id: invoiceId } 
    });
    const copyNumber = (lastReprint || 0) + 1;
    
    await ReprintLog.create({
      invoice_id: invoiceId,
      print_type: 'COPY',
      copy_number: copyNumber,
      printed_by: userId,
      ip_address: ip
    });
    return { 
      watermark: 'COPY OF ORIGINAL / प्रतिलिपि', 
      copyNumber: copyNumber 
    };
  }
}
```

### 11.3 Invoice Cancellation (IRD Compliant)

```typescript
async function cancelInvoice(
  invoiceId: bigint, 
  reason: string, 
  userId: bigint
): Promise<void> {
  await db.transaction(async (trx) => {
    // 1. Update invoice status — never delete
    await trx('invoices')
      .where({ id: invoiceId })
      .update({ 
        is_active: false,  -- soft cancel, not deletion
        payment_status: 'CANCELLED',
        cancelled_at: new Date(),
        cancelled_by: userId,
        cancel_reason: reason
      });
    
    // 2. Update master_bill — is_bill_active = false
    await trx('master_bills')
      .where({ invoice_id: invoiceId })
      .update({ is_bill_active: false });
    
    // 3. Post reversal journal entry
    await createReversalJournalEntry(invoiceId, userId, reason, trx);
    
    // 4. Audit log
    await trx('finance_audit_log').insert({
      action: 'CANCEL',
      table_name: 'invoices',
      record_id: invoiceId,
      action_by: userId,
      new_data: { reason }
    });
    
    // 5. Sync cancellation to CBMS
    await queueCbmsSync(invoiceId, 'CANCEL');
  });
}
```

### 11.4 CBMS Sync Status Tracking

```sql
-- Materialized view per IRD Schedule 5 requirement
CREATE MATERIALIZED VIEW mv_ird_sync_pending AS
SELECT 
    mb.*,
    t.name AS tenant_name,
    t.pan AS tenant_pan
FROM master_bills mb
JOIN tenants t ON t.id = mb.tenant_id
WHERE mb.sync_with_ird = FALSE
  AND mb.is_bill_active = TRUE;

-- Refresh on each new bill creation
CREATE UNIQUE INDEX ON mv_ird_sync_pending(id);
```

---

## 12. CBMS Integration Layer

### 12.1 Sync Architecture

```
Invoice Created
    │
    ▼ (synchronous — at time of issuance)
CBMS Sync Attempt
    ├── Success → mark sync_with_ird = TRUE, is_realtime = TRUE
    └── Failure → add to sync_queue (retry)
            │
            ▼
Sync Queue Worker (BullMQ — runs every 60 seconds)
    ├── Pick up failed syncs
    ├── Retry with exponential backoff
    ├── Max 10 retries
    └── Alert admin if still failing after 10 retries
```

### 12.2 Sync Queue Table

```sql
CREATE TABLE cbms_sync_queue (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL,
    invoice_id      BIGINT NOT NULL,
    operation       VARCHAR(20) NOT NULL,  -- CREATE, CANCEL, UPDATE
    status          VARCHAR(20) DEFAULT 'PENDING',  -- PENDING, SUCCESS, FAILED, MAX_RETRY
    request_payload JSONB,
    response_payload JSONB,
    attempt_count   INTEGER DEFAULT 0,
    last_attempted_at TIMESTAMPTZ,
    next_retry_at   TIMESTAMPTZ,
    error_message   TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 12.3 CBMS API Service

```typescript
class CbmsSyncService {
  async syncInvoice(invoice: Invoice, operation: 'CREATE' | 'CANCEL'): Promise<void> {
    const payload = this.buildCbmsPayload(invoice, operation);
    
    try {
      const response = await axios.post(
        process.env.IRD_CBMS_ENDPOINT,
        payload,
        { 
          timeout: 5000,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      await MasterBill.update(
        { sync_with_ird: true, is_realtime: true },
        { where: { invoice_id: invoice.id } }
      );
    } catch (error) {
      // Queue for retry — do not block invoice creation
      await CbmsSyncQueue.create({
        tenant_id: invoice.tenant_id,
        invoice_id: invoice.id,
        operation,
        request_payload: payload,
        error_message: error.message,
        next_retry_at: addMinutes(new Date(), 5)
      });
    }
  }
  
  private buildCbmsPayload(invoice: Invoice, operation: string) {
    return {
      fiscal_year: invoice.fiscal_year,
      bill_no: invoice.invoice_number,
      customer_name: invoice.customer_name,
      customer_pan: invoice.customer_pan,
      bill_date: invoice.invoice_date,
      amount: invoice.subtotal,
      discount: invoice.discount_amount,
      taxable_amount: invoice.taxable_amount,
      tax_amount: invoice.vat_amount,
      total_amount: invoice.total_amount,
      is_bill_active: operation === 'CREATE',
      payment_method: invoice.payment_method,
      vat_refund_amount: invoice.vat_refund_amount,
      transaction_id: invoice.transaction_id
    };
  }
}
```

---

## 13. Financial Statements Engine

### 13.1 Statement of Profit or Loss (NFRS)

```
STATEMENT OF PROFIT OR LOSS
For the period ending [DATE]
Tenant: [Name] | PAN: [PAN]

Revenue
  Membership Revenue                        XXX
  Service Revenue                           XXX
  Product Sales Revenue                     XXX
  Less: Sales Returns & Allowances         (XXX)
  ─────────────────────────────────────────────
  Net Revenue                               XXX

Cost of Revenue
  Direct Labour                            (XXX)
  Cost of Goods Sold                       (XXX)
  ─────────────────────────────────────────────
  Gross Profit                              XXX

Operating Expenses
  Personnel Costs                          (XXX)
  Occupancy Costs                          (XXX)
  Administrative Expenses                  (XXX)
  Marketing & Sales                        (XXX)
  Depreciation & Amortization             (XXX)
  ─────────────────────────────────────────────
  Operating Profit (EBIT)                   XXX

Finance Costs
  Interest Expense                         (XXX)
  Bank Charges                             (XXX)
  ─────────────────────────────────────────────
  Profit Before Tax                         XXX

Income Tax Expense                         (XXX)
  ─────────────────────────────────────────────
  NET PROFIT / (LOSS)                       XXX
```

### 13.2 Statement of Financial Position (NFRS Balance Sheet)

```
STATEMENT OF FINANCIAL POSITION
As at [DATE]
Tenant: [Name] | PAN: [PAN]

ASSETS
Current Assets
  Cash & Cash Equivalents                   XXX
  Accounts Receivable                       XXX
  Less: Allowance for Bad Debts            (XXX)
  Inventory                                 XXX
  VAT Receivable                            XXX
  Prepaid Expenses                          XXX
  ─────────────────────────────────
  Total Current Assets                      XXX

Non-Current Assets
  Property, Plant & Equipment               XXX
  Less: Accumulated Depreciation           (XXX)
  Right-of-Use Assets                       XXX
  Security Deposits                         XXX
  ─────────────────────────────────
  Total Non-Current Assets                  XXX

TOTAL ASSETS                                XXX

LIABILITIES & EQUITY
Current Liabilities
  Accounts Payable                          XXX
  Advance from Customers                    XXX
  Deferred Revenue                          XXX
  VAT Payable                               XXX
  TDS Payable                               XXX
  Salaries Payable                          XXX
  ─────────────────────────────────
  Total Current Liabilities                 XXX

Non-Current Liabilities
  Lease Liability                           XXX
  ─────────────────────────────────
  Total Non-Current Liabilities             XXX

EQUITY
  Owner's Capital                           XXX
  Retained Earnings                         XXX
  Current Year Profit                       XXX
  ─────────────────────────────────
  Total Equity                              XXX

TOTAL LIABILITIES & EQUITY                 XXX
```

### 13.3 VAT Return (Annex)

```sql
-- Monthly VAT Computation Query
SELECT
    SUM(vat_amount)         AS output_vat_collected,
    SUM(purchase_vat)       AS input_vat_claimable,
    SUM(vat_amount) - SUM(purchase_vat) AS net_vat_payable
FROM (
    SELECT vat_amount, 0 AS purchase_vat FROM invoices
    WHERE tenant_id = ? AND is_active = TRUE
      AND invoice_date BETWEEN ? AND ?
      AND invoice_type IN ('TAX_INVOICE', 'ABBREVIATED')
    
    UNION ALL
    
    SELECT 0 AS vat_amount, vat_amount AS purchase_vat FROM bills
    WHERE tenant_id = ? AND is_active = TRUE
      AND bill_date BETWEEN ? AND ?
) vat_data
```

---

## 14. Module-Specific Finance Flows

### 14.1 Fitness Center — Complete Financial Flows

```
A. MEMBERSHIP BILLING FLOW
   ┌────────────────────────────────────────────────────────────┐
   │ Member registers / renews membership                       │
   │                                                            │
   │ 1. Select plan: Monthly (NPR 2,000) or Annual (NPR 20,000) │
   │                                                            │
   │ Monthly membership:                                        │
   │   DR  Cash/eSewa           2,260                          │
   │       CR  Membership Revenue   2,000                       │
   │       CR  VAT Payable            260                       │
   │                                                            │
   │ Annual membership (at billing):                            │
   │   DR  Cash/eSewa          22,600                          │
   │       CR  Deferred Revenue     20,000                      │
   │       CR  VAT Payable           2,600                      │
   │                                                            │
   │ Annual membership (each month, recognize 1/12):            │
   │   DR  Deferred Revenue         1,667                       │
   │       CR  Membership Revenue    1,667                       │
   └────────────────────────────────────────────────────────────┘

B. TRAINER PAYMENT FLOW
   ┌────────────────────────────────────────────────────────────┐
   │ Trainer: Employee (salary) or Contractor (commission-based)│
   │                                                            │
   │ Employee Trainer (monthly salary NPR 30,000):              │
   │   DR  Trainer Salary Expense  30,000                       │
   │       CR  TDS Payable (1%)         300  (if applicable)    │
   │       CR  Bank Account          29,700                     │
   │                                                            │
   │ Contractor Trainer (commission 30% of PT revenue):         │
   │   DR  Trainer Commission       9,000                       │
   │       CR  TDS Payable (15%)        1,350                   │
   │       CR  Bank Account             7,650                   │
   │                                                            │
   │ → Issue TDS certificate (Form 29) to contractor            │
   └────────────────────────────────────────────────────────────┘

C. SUPPLEMENT PRODUCT SALE
   ┌────────────────────────────────────────────────────────────┐
   │   DR  Cash/Bank             3,390                          │
   │       CR  Product Sales Rev     3,000                      │
   │       CR  VAT Payable             390                      │
   │                                                            │
   │   DR  Cost of Goods Sold    2,000                          │
   │       CR  Inventory             2,000                      │
   └────────────────────────────────────────────────────────────┘

D. EQUIPMENT PURCHASE
   ┌────────────────────────────────────────────────────────────┐
   │ Treadmill NPR 150,000 from supplier (VAT registered)       │
   │                                                            │
   │   DR  Equipment (Fixed Asset)   150,000                    │
   │   DR  VAT Receivable              19,500                   │
   │       CR  Accounts Payable — Supplier    169,500           │
   │                                                            │
   │ Monthly Depreciation (5-year life, straight-line):         │
   │   DR  Depreciation Expense         2,500                   │
   │       CR  Accumulated Depreciation     2,500               │
   └────────────────────────────────────────────────────────────┘
```

### 14.2 Mr. Gentleman (Tailoring) — Complete Financial Flows

```
A. CUSTOMER ORDER & ADVANCE FLOW
   ┌────────────────────────────────────────────────────────────┐
   │ Customer places suit order: Total NPR 15,000               │
   │ Advance paid: NPR 7,000                                    │
   │                                                            │
   │ Advance received:                                          │
   │   DR  Cash/eSewa             7,000                         │
   │       CR  Advance from Customers   7,000                   │
   │           (Liability — unearned until delivery)            │
   └────────────────────────────────────────────────────────────┘

B. ORDER IN PRODUCTION (WIP TRACKING)
   ┌────────────────────────────────────────────────────────────┐
   │ Fabric purchased: NPR 6,000 + VAT                          │
   │   DR  Raw Material Inventory   6,000                       │
   │   DR  VAT Receivable             780                        │
   │       CR  Accounts Payable/Cash    6,780                   │
   │                                                            │
   │ Transfer to WIP when stitching starts:                     │
   │   DR  WIP Inventory           8,500 (Fabric + Labour est.) │
   │       CR  Raw Material Inventory   6,000                   │
   │       CR  Labour Payable           2,500                   │
   └────────────────────────────────────────────────────────────┘

C. DELIVERY & FINAL INVOICE
   ┌────────────────────────────────────────────────────────────┐
   │ Suit delivered. Invoice: NPR 15,000 + VAT 1,950 = 16,950   │
   │                                                            │
   │ Revenue recognition:                                       │
   │   DR  Advance from Customers    7,000                      │
   │   DR  Cash/eSewa (balance)      9,950                      │
   │       CR  Tailoring Revenue        15,000                  │
   │       CR  VAT Payable               1,950                  │
   │                                                            │
   │ COGS recognition:                                          │
   │   DR  Cost of Goods Sold        8,500                      │
   │       CR  WIP Inventory             8,500                  │
   └────────────────────────────────────────────────────────────┘

D. DEFECTIVE WORK / PARTIAL RETURN
   ┌────────────────────────────────────────────────────────────┐
   │ Customer returns collar (partial defect), credit NPR 2,000  │
   │                                                            │
   │   DR  Sales Returns            2,000                       │
   │   DR  VAT Payable (reverse)      260                       │
   │       CR  Cash/Bank               2,260                    │
   │                                                            │
   │ Credit Note issued (linked to original invoice)            │
   │ IRD CBMS sync for credit note                              │
   └────────────────────────────────────────────────────────────┘

E. STITCHER / PIECE-RATE PAYMENT
   ┌────────────────────────────────────────────────────────────┐
   │ Stitcher paid NPR 800 per piece, 15 pieces completed       │
   │ Total: NPR 12,000                                          │
   │                                                            │
   │   DR  Labour Cost — Stitching  12,000                      │
   │       CR  TDS Payable (15%)         1,800  (contractor)    │
   │       CR  Cash                     10,200                  │
   └────────────────────────────────────────────────────────────┘
```

---

## 15. Multi-Tenant Isolation Strategy

### 15.1 Tenant Isolation at Every Layer

```
DATABASE LAYER:
  - Every financial table has tenant_id column (NOT NULL)
  - Row-Level Security (RLS) policies enforce tenant isolation
  - No cross-tenant JOINs possible via application layer
  - Separate database per enterprise tenant (optional for large clients)

APPLICATION LAYER:
  - TenantContext injected in every request via JWT middleware
  - All FinanceService methods accept tenantId as first parameter
  - No global queries — every query includes WHERE tenant_id = ?
  - Finance module never exposes Dexo's own books to tenants

API LAYER:
  - /api/v1/finance/* routes require authenticated tenant context
  - Dexo admin routes: /api/v1/platform/finance/* — separate auth
  - CORS and API keys scoped to tenant

REPORTING:
  - Financial reports generate only for authenticated tenant
  - No aggregate cross-tenant reports accessible to tenants
```

### 15.2 Row-Level Security

```sql
-- Enable RLS on all financial tables
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments_received ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their tenant's data
CREATE POLICY tenant_isolation_policy ON invoices
    USING (tenant_id = current_setting('app.current_tenant_id')::BIGINT);

-- Applied to all financial tables
```

---

## 16. API Specification

### 16.1 Invoice API

```
POST   /api/v1/finance/invoices              Create invoice (draft)
GET    /api/v1/finance/invoices              List invoices (paginated, filterable)
GET    /api/v1/finance/invoices/:id          Get invoice detail
PUT    /api/v1/finance/invoices/:id          Update draft invoice
POST   /api/v1/finance/invoices/:id/approve  Approve invoice
POST   /api/v1/finance/invoices/:id/issue    Issue (assign bill number + post JE)
POST   /api/v1/finance/invoices/:id/cancel   Cancel with reason
POST   /api/v1/finance/invoices/:id/print    Print (returns PDF + controls watermark)
POST   /api/v1/finance/invoices/:id/send     Send to customer via email/SMS

POST   /api/v1/finance/credit-notes          Create credit note (sales return)
POST   /api/v1/finance/debit-notes           Create debit note (purchase return)
```

### 16.2 Payment API

```
POST   /api/v1/finance/payments/receive      Record payment received
POST   /api/v1/finance/payments/make         Record payment made
GET    /api/v1/finance/payments/received     List payments received
GET    /api/v1/finance/payments/made         List payments made
POST   /api/v1/finance/payments/allocate     Allocate payment to invoice(s)
```

### 16.3 Journal Entry API

```
POST   /api/v1/finance/journal-entries       Create manual JE
GET    /api/v1/finance/journal-entries       List JEs
GET    /api/v1/finance/journal-entries/:id   Get JE detail
POST   /api/v1/finance/journal-entries/:id/post    Post JE
POST   /api/v1/finance/journal-entries/:id/reverse Reverse posted JE
```

### 16.4 Reports API

```
GET    /api/v1/finance/reports/trial-balance         Trial balance
GET    /api/v1/finance/reports/profit-loss           P&L statement
GET    /api/v1/finance/reports/balance-sheet         Balance sheet
GET    /api/v1/finance/reports/cash-flow             Cash flow statement
GET    /api/v1/finance/reports/ar-aging              AR aging report
GET    /api/v1/finance/reports/ap-aging              AP aging report
GET    /api/v1/finance/reports/sales-book            Sales book (IRD format)
GET    /api/v1/finance/reports/purchase-book         Purchase book
GET    /api/v1/finance/reports/vat-return            VAT computation
GET    /api/v1/finance/reports/audit-trail           Audit trail report
GET    /api/v1/finance/reports/cbms-sync-status      CBMS sync status
GET    /api/v1/finance/reports/cancelled-bills       Cancelled bills report
GET    /api/v1/finance/reports/reprint-log           Reprint log report
```

### 16.5 CBMS Sync API (Internal)

```
POST   /internal/cbms/sync/:invoiceId        Manual sync trigger
GET    /internal/cbms/sync/queue             View sync queue
POST   /internal/cbms/sync/retry-failed      Retry all failed syncs
GET    /internal/cbms/sync/status            Overall sync health
```

---

## 17. Reporting & Audit Engine

### 17.1 Sales Book (IRD Schedule 6D — Mandatory)

```
SALES BOOK — बिक्री खाता
Tenant: [Firm Name]   PAN: [PAN]   Period: [Month/Year]

Date | Bill No | Buyer Name | Buyer PAN | Invoice Total | Non-Taxable | Export | Discount | Taxable Amount | VAT (Rs) | Total
```

This report is:
- Generated on-demand for any date range
- Exportable in Excel, XML, PDF (all three mandatory per IRD)
- Must tie exactly to master_bills table total

### 17.2 Audit Trail Report (IRD Mandatory)

Every user action on billing/financial records is reportable:
- Who created/edited/cancelled/printed/reprinted a bill
- Timestamp and IP address of each action
- Old value and new value for any change
- Exportable to Excel, XML, PDF

### 17.3 Management Reports

| Report | Frequency | Audience |
|--------|-----------|----------|
| Daily Cash Position | Daily | Owner/Manager |
| AR Aging Summary | Weekly | Owner/Manager |
| Revenue vs. Budget | Monthly | Owner/Manager |
| Trainer/Stitcher Cost Report | Monthly | Manager |
| VAT Summary (Output vs. Input) | Monthly | Accountant |
| TDS Deducted Report | Monthly | Accountant |
| Inventory Valuation | Monthly | Manager |
| Profit & Loss | Monthly | Owner |
| Balance Sheet | Quarterly | Owner/Accountant |
| Deferred Revenue Schedule | Monthly | Accountant |

---

## 18. Background Jobs & Automation

```typescript
// BullMQ Job Definitions

const financeJobs = {
  // 1. Monthly subscription billing (1st of month, 2 AM NST)
  SUBSCRIPTION_BILLING: {
    cron: '0 2 1 * *',
    handler: 'SubscriptionBillingJob',
    description: 'Generate invoices for all billable tenants'
  },

  // 2. Deferred revenue recognition (1st of month, 3 AM NST)
  DEFERRED_REVENUE_RELEASE: {
    cron: '0 3 1 * *',
    handler: 'DeferredRevenueReleaseJob',
    description: 'Recognize 1/12 of annual subscriptions/memberships'
  },

  // 3. CBMS sync retry (every 60 seconds)
  CBMS_SYNC_RETRY: {
    cron: '* * * * *',
    handler: 'CbmsSyncRetryJob',
    description: 'Retry failed CBMS syncs'
  },

  // 4. AR payment reminder (daily 9 AM)
  AR_PAYMENT_REMINDER: {
    cron: '0 9 * * *',
    handler: 'ArPaymentReminderJob',
    description: 'Send reminders for overdue invoices'
  },

  // 5. Daily cash position report (daily 8 PM)
  DAILY_CASH_REPORT: {
    cron: '0 20 * * *',
    handler: 'DailyCashReportJob',
    description: 'Email daily cash position to tenant owner'
  },

  // 6. Database backup (daily 1 AM)
  DATABASE_BACKUP: {
    cron: '0 1 * * *',
    handler: 'FinanceDatabaseBackupJob',
    description: 'Backup all financial tables (IRD legal requirement)'
  },

  // 7. Fiscal year sequence reset (Shrawan 1, 12:01 AM)
  FISCAL_YEAR_RESET: {
    cron: '1 0 16 7 *',  // Nepali Shrawan 1 ≈ mid-July
    handler: 'FiscalYearResetJob',
    description: 'Reset bill number sequences for new fiscal year'
  },

  // 8. TDS payment reminder (24th of each month)
  TDS_PAYMENT_REMINDER: {
    cron: '0 9 24 * *',
    handler: 'TdsPaymentReminderJob',
    description: 'Remind tenant to deposit TDS by 25th'
  }
};
```

---

## 19. Implementation Checklist

### 19.1 Core Accounting Engine
- [ ] Chart of Accounts with industry templates (Fitness, Tailoring, Generic)
- [ ] Fiscal year and period management with open/close controls
- [ ] Double-entry journal entry engine with balance validation
- [ ] Immutability enforcement (no DELETE triggers on all financial tables)
- [ ] Reversal journal entry functionality
- [ ] Account reconciliation framework

### 19.2 AR / Sales Cycle
- [ ] Invoice CRUD with draft → issue lifecycle
- [ ] Bill number sequential generation (atomic, fiscal-year-aware)
- [ ] Credit note (sales return) generation and linking
- [ ] Payment received recording with invoice allocation
- [ ] Electronic payment VAT refund (10%) calculation and storage
- [ ] AR aging report

### 19.3 AP / Purchase Cycle
- [ ] Purchase bill entry
- [ ] Debit note (purchase return) generation
- [ ] Payment made recording with TDS calculation
- [ ] AP aging report

### 19.4 IRD Compliance
- [ ] Master bills table (Schedule 5) — all mandatory fields
- [ ] Print-once control with reprint watermark ("Copy of Original / प्रतिलिपि")
- [ ] Reprint log table with copy number tracking
- [ ] Invoice cancellation with reason (no physical delete)
- [ ] CBMS Web API integration (real-time sync)
- [ ] CBMS sync queue with retry mechanism
- [ ] Schedule 8 electronic payment data transmission
- [ ] Sales Book report in IRD format (Schedule 6D)
- [ ] Audit Trail Report (user action log, viewable and printable)
- [ ] Export all reports in Excel, XML, PDF
- [ ] Data correction via record deactivation + new record (no update of posted data)
- [ ] Sequential bill number reset on Shrawan 1 (fiscal year start)
- [ ] Backup of database and log archive (annual, retained per law)
- [ ] Server within Nepal (if cloud-based) + IRD access

### 19.5 Financial Reporting
- [ ] Trial balance
- [ ] Profit & Loss Statement (NFRS format)
- [ ] Balance Sheet (NFRS format)
- [ ] Cash Flow Statement
- [ ] VAT computation (output vs. input VAT)
- [ ] TDS deducted summary
- [ ] Deferred revenue schedule
- [ ] Sales book (IRD Schedule 6D)

### 19.6 Platform Subscription Billing
- [ ] Subscription plan configuration (free tier: 0–5 tenants)
- [ ] Monthly auto-billing job
- [ ] Annual subscription deferred revenue recognition
- [ ] Subscription invoice generation with IRD compliance
- [ ] Failed payment handling and dunning workflow

### 19.7 Fitness Center Module Integration
- [ ] Membership billing (monthly and annual with deferred revenue)
- [ ] Personal training session revenue recognition (per session)
- [ ] Trainer salary and commission payment with TDS
- [ ] Equipment capitalization and depreciation
- [ ] Product inventory and COGS tracking
- [ ] Member advance payment handling

### 19.8 Mr. Gentleman Module Integration
- [ ] Customer advance/deposit tracking (liability)
- [ ] Order-to-invoice workflow with WIP tracking
- [ ] Revenue recognition on delivery
- [ ] Raw material and WIP inventory management
- [ ] Piece-rate stitcher payment with TDS
- [ ] Fabric/accessory purchase and input VAT tracking
- [ ] Defective work credit note workflow

---

## 20. Pre-Mortem: Finance Module Failure Analysis

### 20.1 Failure: Broken CBMS Sync (IRD Penalty Risk)

**Why it happens**: Network failure or IRD API downtime during invoice issuance.  
**Early warning sign**: sync_queue grows; cbms_sync_pending materialized view shows > 0 records.  
**Consequence**: IRD notice, fines, possible suspension of billing permission (Anumati Patra).  
**Prevention**: Always issue invoice to database first (in a transaction), then attempt sync async. Never block invoice issuance waiting for CBMS.  
**Mitigation**: Sync retry queue with exponential backoff. Admin alert if unsynced bills > 24 hours old.  
**Recovery**: Bulk re-sync from cbms_sync_queue after connectivity restored. Maintain proof of retry attempts.

### 20.2 Failure: Bill Number Gaps or Duplicates

**Why it happens**: Race condition during concurrent invoice creation.  
**Consequence**: IRD audit finding — sequential numbering is legally mandated.  
**Prevention**: Use database-level sequence with advisory lock or `SELECT FOR UPDATE` on bill_sequences table. Never generate numbers in application memory.  
**Recovery**: Gap analysis report. Document gaps with cancelled/void reason.

### 20.3 Failure: Tenant Data Cross-Contamination

**Why it happens**: Missing tenant_id filter in a query.  
**Consequence**: Tenant A sees Tenant B's financial data. GDPR/privacy violation. Loss of trust. Legal liability.  
**Prevention**: Row-Level Security (RLS) as database-enforced last line of defense. Every query in application code includes tenant_id. Automated test: log in as Tenant A, attempt to access Tenant B's invoice by ID → must return 404.  
**Recovery**: Audit logs to determine extent. Notify affected tenants per data breach obligations.

### 20.4 Failure: Deferred Revenue Not Released

**Why it happens**: Monthly revenue recognition job fails silently.  
**Consequence**: Revenue understated. Financial statements misleading. NFRS 15 violation.  
**Prevention**: Job failure alerting. Daily reconciliation: sum of deferred_revenue_recognized per month must equal expected 1/12 per active annual plan. Auto-alert if out of balance.

### 20.5 Failure: Physical Deletion of Financial Record

**Why it happens**: Developer runs DELETE query in production for "cleanup."  
**Consequence**: IRD audit failure (data immutability is legally required). Books don't reconcile.  
**Prevention**: Database triggers that raise exceptions on DELETE. No application user has DELETE privilege on financial tables. Production DB access requires 2-person authorization.

### 20.6 Failure: Double-Entry Not Balanced

**Why it happens**: Bug in journal entry creation code.  
**Consequence**: Trial balance doesn't balance. Financial statements wrong. Audit qualification.  
**Prevention**: Database-level check trigger on journal entry posting. Automated daily trial balance run — alert if debits ≠ credits.

### 20.7 Failure: VAT Refund Not Transmitted

**Why it happens**: Schedule 8 transmission to payment operator fails.  
**Consequence**: Consumer doesn't get their 10% VAT refund. IRD compliance failure. Consumer complaints.  
**Prevention**: Dedicated queue for Schedule 8 transmissions. Retry on failure. Log every transmission with full request/response.

### 20.8 Failure: Fiscal Year Invoice Numbers Not Reset

**Why it happens**: Fiscal year reset job doesn't run on Shrawan 1.  
**Consequence**: Bills continue sequential numbering into new fiscal year. IRD non-compliance.  
**Prevention**: Scheduler monitoring. Alert if fiscal_year_reset job hasn't run by Shrawan 2. Test in staging each year before the date.

---

## Appendix A — Nepal Fiscal Year Reference

| Nepal Fiscal Year | Gregorian Approximate |
|-------------------|-----------------------|
| 2080/81 | Mid-July 2023 – Mid-July 2024 |
| 2081/82 | Mid-July 2024 – Mid-July 2025 |
| 2082/83 | Mid-July 2025 – Mid-July 2026 |

**Fiscal year start**: Shrawan 1 (approx. July 16–17)  
**Bill sequence reset**: Automatically at 00:01 AM NST on Shrawan 1

## Appendix B — VAT Rate Reference

| Category | Rate |
|----------|------|
| Standard goods and services | 13% |
| Exempt (basic foods, education, health) | 0% (exempt, no input credit) |
| Zero-rated (exports) | 0% (zero-rated, input credit claimable) |
| Electronic payment VAT refund to consumer | 10% of VAT charged |

## Appendix C — TDS Rate Reference (Income Tax Act 2058)

| Nature of Payment | TDS Rate |
|-------------------|----------|
| Salary (above threshold) | Slab rates |
| Contractor / professional fee | 15% |
| Rent | 10% |
| Commission | 15% |
| Interest on deposit | 5% (bank) / 15% (others) |
| Royalty | 15% |

**TDS deposit deadline**: 25th of the following month  
**TDS return (Form 29)**: Annual, with certificate issued to deductees

---

*Document Owner: Dana (Controller Agent) | Finance Module v1.0.0 | NFRS + IRD Compliant*  
*Effective for Nepal Fiscal Year 2081/82 onward*
