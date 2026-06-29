Context

Dexo is an existing Domain-Driven Multi-Tenant SaaS Platform.

Current capabilities include:

Multi-Tenant Architecture
Domain Driven Provisioning
Multi-Branch Financial Isolation
NFRS-Compliant Double Entry Accounting
Multi-Currency
Multi-Language
Tax Management
Payment Gateway Abstraction
Dynamic RBAC
Plugin Marketplace Architecture
Globalization Layer

The platform currently supports multiple domains and already contains finance, billing, invoicing, subscription, audit, reporting, and payment capabilities.

Do NOT redesign existing modules.

Extend the architecture toward a Global ERP and Compliance Platform.

Goal

Transform Dexo into a metadata-driven financial operating system capable of supporting:

Nepal
Pakistan
Bhutan
Sri Lanka
Maldives
Afghanistan
Bangladesh
UAE
Saudi Arabia
Qatar
Kenya
Uganda
Tanzania
Nigeria
South Africa
European Union countries

without requiring source-code changes.

Architectural Rule

Every regulatory, accounting, taxation, localization, banking, compliance, and reporting rule must be represented as metadata.

Never implement country-specific logic directly in application code.

All localization behavior must be driven by:

Tenant
Legal Entity
Country Profile
Fiscal Profile
Compliance Profile
Accounting Profile
Industry Domain
Branch
New Domain: Global Localization Engine

Create a new platform domain:

GLOBAL_LOCALIZATION

Responsible for:

Country Configuration
Tax Configuration
Fiscal Calendars
Accounting Standards
Government Charges
Regulatory Reporting
Currency Rules
Invoice Rules
Banking Rules
Payroll Rules
Localization Policies
Country Profile Engine

Introduce:

CountryProfile

Example:

{
  "country": "Nepal",
  "currency": "NPR",
  "calendar": "BS",
  "vat": true,
  "withholdingTax": true,
  "eInvoice": true,
  "accountingStandard": "NFRS",
  "centralBank": "NRB"
}

All country behavior derives from this profile.

Legal Entity Engine

Current tenant model should evolve into:

Tenant
 └── Legal Entity
      └── Branch

Example:

ABC Group
 ├── Nepal Entity
 ├── Pakistan Entity
 ├── UAE Entity
 └── Sri Lanka Entity

Each legal entity maintains:

Country
Currency
Accounting Standard
Tax Regime
Fiscal Calendar
Reporting Rules
Developing Country Requirements

These countries change regulations frequently.

Design for:

Nepal

Support:

NFRS
IRD
CBMS
eBilling
VAT
TDS
Excise
Municipality Taxes

Your platform already includes NFRS, IRD Electronic Billing and CBMS integrations.

Pakistan

Support:

FBR Integration
Sales Tax
Withholding Tax
Federal Excise Duty
SECP Reporting
Sri Lanka

Support:

VAT
Corporate Income Tax
Tourism Levies
Industry Specific Taxes
Maldives

Support:

GST
Tourism GST
Green Tax
Resort Fees
Bhutan

Support:

GST
Custom Duties
Environmental Levies
Afghanistan

Support:

Business Receipt Tax
Import Duties
NGO Reporting
Aid Reporting
Dynamic Tax Engine V2

Current tax system should evolve into:

Tax Rule Engine

Rules:

Country
Region
Municipality
Industry
Product Type
Customer Type
Date Range

Formula Based:

IF Country = Nepal
AND ProductType = Service
THEN VAT = 13%

Stored as metadata.

Not code.

Government Charge Engine

Many developing countries have fees that are not taxes.

Examples:

Tourism Levy
Municipality Fee
Green Tax
Road Tax
Telecom Levy
Airport Fee
Fuel Adjustment
Infrastructure Charge

Create:

GovernmentChargeRule
Accounting Policy Engine

Current NFRS finance engine should become:

AccountingPolicyEngine

Supports:

NFRS
IFRS
GAAP
SME Standards
Government Accounting
NGO Accounting

Per legal entity.

Dynamic Chart Of Accounts

Current finance module should support inheritance:

Global COA
  ↓
Country COA
  ↓
Industry COA
  ↓
Tenant COA

No fixed chart structure.

Multi Calendar Support

Support:

Gregorian
Bikram Sambat
Hijri
Fiscal Calendar

Store internally:

UTC
Gregorian

Render per localization profile.

Regulatory Reporting Engine

Create metadata-driven reporting:

VAT Returns
GST Returns
Tax Returns
Payroll Returns
Central Bank Reports
Audit Reports
NGO Reports
Statutory Reports

Generated dynamically.

Banking Abstraction Layer

Current payment abstraction should evolve into:

BankingConnector

Support future integrations:

ConnectIPS
eSewa
Fonepay
Raast
1LINK
LankaPay
M-Pesa
SEPA
SWIFT
Open Banking APIs

The system already supports multiple payment providers and a pluggable architecture.

Compliance Versioning

Every localization artifact must support:

Effective Date
Expiry Date
Version
Country
Source
Approval Status

Because regulations change frequently.

AI/Workflow Goal

Future AI agents inside Dexo should be able to answer:

What changed in Nepal VAT rules?

Generate Pakistan withholding report.

Create Sri Lanka GST filing.

Validate Maldives tourism tax.

Generate UAE VAT invoice.

without requiring engineering changes.

Success Criteria

A new country should be onboarded by:

Creating Country Profile
Loading Tax Rules
Loading Accounting Policies
Loading Government Charges
Loading Reporting Templates
Loading Banking Connectors
Publishing Localization Package

without redeploying the application.