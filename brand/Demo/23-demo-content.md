# DEXO — Demo Content (seed data)

Used for the live demo instance, screenshots, and videos. Realistic, internally consistent, no real companies or people.

## Organizations (tenants)
| Org | Slug / domain | Plan | Seats | Industry |
|---|---|---|---|---|
| Northwind Labs | northwind · app.northwindlabs.io | Pro | 14 | Dev tools |
| Kolibri Health | kolibri · portal.kolibrihealth.com | Enterprise | 62 | Healthtech |
| Ferrostack | ferrostack | Starter | 4 | IoT |
| Bluefin Analytics | bluefin · insights.bluefin.co | Pro | 21 | Data |
| Papermoon Studio | papermoon | Free trial (day 9/14) | 3 | Agency |

## Users (sample)
Amara Okafor (Owner, Northwind) · Jonas Lindqvist (Admin, Northwind) · Priya Raghavan (Billing manager, Kolibri) · Mateo Álvarez (Developer, Ferrostack) · Yuki Tanaka (Viewer, Bluefin) · Lena Novak (Owner, Papermoon). Emails `first@company-domain`, avatars = initial chips in brand neutrals.

## Subscriptions & invoices
- Kolibri: Enterprise annual, $14,880/yr, renews 2027-03-01, PO-based.
- Northwind: Pro monthly $99 + $8/extra seat × 4 → invoice **INV-2026-0142**, $131.00, paid (Visa •4242), 2026-07-01.
- Ferrostack: Starter $29/mo, **past due** (INV-2026-0139, retry 2/4) — demonstrates dunning UI.
- Papermoon: trialing, card on file, converts 2026-07-14.

## Analytics (dashboard numbers)
MRR $4,289 (+6.2% MoM) · Active tenants 5 · Total users 104 · API requests 30d: 1.24M (sparkline: gentle rise, spike on 2026-06-24 "v1.3 release") · Churn 1.8% · Webhook success 99.7%.

## Activity log (recent)
```
2026-07-09 09:14  amara@northwindlabs.io   invited jonas@… as Admin
2026-07-09 08:52  system                   certificate issued for insights.bluefin.co
2026-07-08 17:30  priya@kolibrihealth.com  updated plan Enterprise seats 58 → 62
2026-07-08 11:03  webhook                  invoice.paid delivered to hooks.northwindlabs.io (200, 142ms)
2026-07-07 22:41  mateo@ferrostack.dev     created API key ferro_live_…8k2p (scope: read:devices)
2026-07-07 09:15  system                   payment retry failed for Ferrostack (card_declined)
```

## Notifications feed
"Your invoice INV-2026-0142 was paid" · "New member Jonas accepted invitation" · "Domain insights.bluefin.co verified" · "Payment failed for Ferrostack — retry scheduled" · "v1.3.0 available: see changelog".

## Products / plans (as configured in demo)
Free (1 org, 3 seats) · Starter $29 (1 org, 10 seats, custom domain) · Pro $99 (5 orgs, 25 seats, white-label, webhooks) · Enterprise (custom: SSO, audit log, SLA).

## Rules
Reset demo hourly from this seed. Screenshots always use Northwind (light) and Bluefin (dark, rebranded blue-teal theme to prove white-labeling). Never show real card numbers beyond `•••• 4242`.
