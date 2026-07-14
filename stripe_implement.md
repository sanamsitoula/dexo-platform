# Stripe Connect Implementation

Dexo already had a basic Stripe gateway (tenant enters their own `secretKey`/`publishableKey`,
Checkout Session created, redirect to pay). This adds **Stripe Connect**: Dexo becomes the
Stripe *platform* account, and each tenant onboards their own Stripe **Express connected
account**. Customer payments still flow through Dexo's platform Stripe account, but the funds
are routed straight to the tenant via `transfer_data.destination` — the tenant never has to
create or paste in their own API keys.

Reference sample the implementation was built from: `docs/stripe-sample-code/` (a small
Express app demonstrating `stripe.v2.core.accounts`, account links, and thin webhooks). The
production implementation below uses the classic v1 Connect API instead (`stripe.accounts`,
`stripe.accountLinks`) because the installed `stripe` npm package is v14.25.0, which does not
expose the newer v2 Core Accounts API (that needs stripe-node v17+). The behavior is
equivalent: Express account creation → hosted onboarding link → status polling/webhook →
checkout routed via `transfer_data`.

## What was implemented

**Backend (`apps/api/src/modules/payment-gateway/`)**

- `stripe-connect.service.ts` (new)
  - `startOnboarding(tenantId, { email, name, refreshUrl, returnUrl })` — creates a Stripe
    Express connected account (or reuses an existing one) and returns a hosted onboarding
    link (`stripe.accountLinks.create`).
  - `getStatus(tenantId)` — live-fetches the connected account from Stripe and returns
    `chargesEnabled` / `payoutsEnabled` / `detailsSubmitted` / `requirementsDue`.
  - `handleAccountUpdated(account)` — applied from the `account.updated` webhook so cached
    status stays fresh without polling.
  - `verifyWebhookSignature(rawBody, signature)` — validates the Stripe signature header
    against `STRIPE_CONNECT_WEBHOOK_SECRET`.
  - The connected account id and cached status are stored inside the tenant's existing
    `PaymentProvider` row (`type: STRIPE`), under `config.connect` — **no Prisma schema
    migration required**, it reuses the existing `config Json?` column.

- `providers/stripe.provider.ts` (updated)
  - `initPayment` now appends `payment_intent_data[transfer_data][destination]` when the
    tenant's `PaymentProvider.config.connect.accountId` is set, so the created Checkout
    Session routes funds to the tenant's connected account.
  - `getAuth()` falls back to the platform `STRIPE_SECRET_KEY` env var when the tenant has no
    `credentials.secretKey` of their own (the Connect path doesn't need one).
  - `isConfigured()` now also accepts "connected account with charges enabled" as a valid
    configuration, not just "has its own secret/publishable key".

- `payment-gateway.controller.ts` (updated) — three new endpoints:
  - `POST /payment-gateway/stripe-connect/onboard` (auth) — starts/resumes onboarding, returns
    `{ accountId, url }`.
  - `GET /payment-gateway/stripe-connect/status` (auth) — returns live Connect status for the
    logged-in tenant.
  - `POST /payment-gateway/webhook/stripe` (no auth, signature-verified) — handles
    `account.updated`.

- `payment-gateway.module.ts` — registers `StripeConnectService`.

- `main.ts` — `NestFactory.create(AppModule, { rawBody: true })` added so the webhook handler
  can access `req.rawBody` (the exact bytes Stripe signed) while every other route still gets
  the normal parsed JSON body.

**Frontend (`apps/tenant-admin/`)**

- `lib/api.ts` — `paymentGatewayApi.startStripeConnectOnboarding()` and
  `.getStripeConnectStatus()`.
- `app/(admin)/settings/payments/page.tsx` — new "Stripe Connect" card above the existing
  manual-provider list: shows connection status (Not connected / Onboarding incomplete /
  Active) and a "Connect with Stripe" button that redirects to Stripe's hosted onboarding.

**Env vars added** (`.env`, `.env.local`, `.env.example`):

```
STRIPE_CONNECT_WEBHOOK_SECRET="whsec_your_connect_webhook_secret"
```

(`STRIPE_SECRET_KEY` already existed as a placeholder — it is now dual-purpose: platform key
for Connect, and fallback key for any tenant still using the old direct-credentials flow.)

## What you need to provide

1. **`STRIPE_SECRET_KEY`** — Dexo's own *platform* Stripe secret key (`sk_test_...` while
   testing, `sk_live_...` in production). This is the Stripe account tenants connect *to* —
   from your Stripe Dashboard → Developers → API keys.
2. **Stripe Connect enabled on that platform account** — Dashboard → Settings → Connect →
   enable it, choose "Platform or marketplace". Without this, `stripe.accounts.create` fails
   with a permissions error.
3. **`STRIPE_CONNECT_WEBHOOK_SECRET`** — create a webhook endpoint in Dashboard → Developers →
   Webhooks pointing at:
   ```
   https://<your-api-domain>/api/payment-gateway/webhook/stripe
   ```
   subscribed to the `account.updated` event, then copy its signing secret (`whsec_...`).
   For local dev, use the Stripe CLI instead of a real dashboard webhook:
   ```
   stripe listen --forward-to localhost:4000/api/payment-gateway/webhook/stripe
   ```
   it prints a `whsec_...` you can paste into `.env.local` for local testing.

Nothing else is required from you — individual tenants don't need API keys; they authenticate
with Stripe directly through the hosted onboarding link when they click "Connect with Stripe".

## Not yet done / follow-ups

- No `application_fee_amount` — Dexo currently takes no platform cut on Connect payments.
  Add it in `stripe.provider.ts`'s `initPayment` when a fee model is decided.
- No UI surfacing of `requirementsDue` (Stripe's list of missing onboarding fields) beyond the
  raw status badge — could be shown to the tenant to explain why they're stuck at "Onboarding
  incomplete".
- No refund-path awareness of Connect — `refundPayment` in `stripe.provider.ts` still refunds
  against the platform account's `payment_intent`; this works because Stripe refunds
  automatically reverse the associated transfer, but hasn't been tested end-to-end with a real
  connected account.
- Not tested end-to-end against a live/test Stripe account yet (needs the real secret key —
  see above).
