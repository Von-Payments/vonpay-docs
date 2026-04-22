---
sidebar_position: 1
---

# Vora — Payment Routing

**Vora** is Von Payments' gateway-orchestration layer. It picks the underlying payment processor (Stripe, Adyen, NMI, etc.) at payment time so you don't have to.

**From your perspective as a developer, Vora is transparent.** You always call the same endpoint — `POST /v1/sessions` — and we handle processor selection, failover, and reconciliation. You do not need to know which processor fires a given charge.

## Why it exists

Every merchant on Von Payments is attached to exactly one "entry point" for their payments. That entry point is one of three things:

| Entry point | What happens at payment time |
|---|---|
| **Direct gateway** | We call a single processor directly (e.g. Stripe Connect). No router in between. |
| **Vora router** | We hand the payment to Vora, which internally picks a processor based on cost, geography, and failover rules. |
| **Third-party router** (legacy) | We hand the payment to an external orchestrator (e.g. Gr4vy). |

From your code, all three look identical. `POST /v1/sessions` returns a `checkoutUrl` and the buyer pays on our hosted page.

## What changes in your integration

**Nothing in request shape.** Session creation is unchanged.

**One thing in the response shape.** Session responses now include provider metadata so you can diagnose issues, report on processor activity, and surface useful context in dashboards:

| Field | Type | Description |
|---|---|---|
| `providerId` | string | The Von Payments internal ID of the processor row that handled (or will handle) this payment. |
| `providerMerchantId` | string | The processor-side merchant ID (e.g. Stripe `acct_...`, Adyen merchant account). |
| `providerPublishableKey` | string | Publishable key for the processor if the checkout page needs to load the processor's client-side SDK (typically set on init response only). |
| `providerAccountId` | string | Processor-specific account ID for reporting / reconciliation. |
| `type` | string | Processor family: `stripe_connect_direct`, `gr4vy`, `vonpay_router`, etc. |
| `circuits` | object | Health snapshot of the processor circuit at the moment the session was served (present on `GET /v1/health`). |

These fields are read-only. Ignore them if you don't need them — they do not affect the buyer flow.

## What you don't need to do

- Choose a processor. Vora does that.
- Handle processor-specific failure codes. The SDK normalises errors into a single `VonPayError.code` union.
- Build any failover logic. Vora routes around processor outages for you.
- Change your signed-redirect verification. The return signature is the same regardless of which processor was used.

## When you might care which processor fired

You usually don't. The only time it matters:

- **Reporting / reconciliation** — you want to match Von Payments transactions against your processor-side statements. Use `providerAccountId` + `transactionId`.
- **Support escalation** — a buyer disputes a charge and their bank statement shows a specific processor name. `providerId` tells you which processor row was used.
- **Webhooks** — session-level webhooks from Von Payments are normalised. If you also receive processor-native webhooks, use `providerId` to correlate.

## Related

- [Session object](../reference/session-object.md) — field reference
- [How it works](../how-it-works.md) — end-to-end session flow
- [Handle the return](../integration/handle-return.md) — return-URL signature verification
