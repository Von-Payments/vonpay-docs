---
sidebar_position: 1
---

# Integrate Vora as a Payment Gateway

A one-page reference for platform engineering teams building a Von Payments connector inside their product. Audience: you've already had the partnership conversation (or you're scoping work before one) and you want the API surface mapped against the gateway-adapter shape your platform already uses for Stripe / NMI / Authorize.Net.

Everything on this page is what's live today. Sections that depend on near-term checkout work are flagged explicitly — don't build against them yet.

## What Vora is, in one paragraph

Vora is a **hosted-checkout** payment product. Your merchant calls `POST /v1/sessions` server-side with an amount and a `successUrl`. We return a `checkoutUrl`. The buyer is redirected there, completes payment on a Von-hosted page (cards, Apple Pay, Google Pay, Klarna, etc.), and is redirected back to the merchant's `successUrl` with a signed query string. A signed webhook (`session.succeeded`, `session.failed`, `session.expired`, `refund.created`) confirms the outcome server-to-server.

There is no separate `auth → capture → void → refund` lifecycle on the API surface. The hosted-checkout session encapsulates auth-and-capture in a single state machine: `pending → succeeded | failed | expired`. If your platform's adapter interface expects discrete auth/capture/void operations, your connector maps:

- **Auth + Capture** → one `POST /v1/sessions` call. Outcome is reported via webhook + signed redirect.
- **Void** → not applicable. Sessions that don't complete simply transition to `expired` or `failed`.
- **Refund** → today, refunds are initiated upstream (via your merchant's Von Payments dashboard or via an upstream-processor refund) and delivered to your platform's webhook endpoint as a `refund.created` event. A merchant-initiated refund API is on the roadmap; see [What's not in this spec yet](#whats-not-in-this-spec-yet) below.

If your platform's adapter contract requires you to *return a void/refund result synchronously*, this is the fundamental shape mismatch you'll need to handle in your adapter layer (typically: store an idempotency-key for refund intents, surface `pending` until the webhook lands).

## API surface — what your connector calls

### Base URL

- **Production:** `https://checkout.vonpay.com`
- **Sandbox:** same base URL; key prefix (`vp_sk_test_*` vs `vp_sk_live_*`) selects the environment. Test keys cannot accidentally hit live data and vice versa.

### Required headers

- `Authorization: Bearer <vp_sk_*>` — the merchant's secret API key
- `Content-Type: application/json`
- `Von-Pay-Version: 2026-04-14` — pin the API version. Omitting this header tracks the latest stable, which can change behind you.
- `Idempotency-Key: <unique-string>` — see [Idempotency](#idempotency) below

### Endpoints today

| Verb | Path | Purpose |
|---|---|---|
| `POST` | `/v1/sessions` | Create a checkout session. Returns `id`, `checkoutUrl`, `expiresAt` (30-min TTL) |
| `GET` | `/v1/sessions/{sessionId}` | Retrieve session status — pending / succeeded / failed / expired / refunded |
| `GET` | `/v1/health` | Liveness probe. No auth required. |
| `GET` | `/v1/discovery` | Discovery metadata (capabilities, supported currencies). No auth required. |

The full request/response shapes are in the [REST API reference](../sdks/rest-api.md) and the [OpenAPI spec](../sdks/rest-api.md) (downloadable). For a typed SDK surface, see the [Node](../sdks/node-sdk.md) and [Python](../sdks/python-sdk.md) SDKs — your adapter doesn't need to use them, but they're a working reference for request shapes.

### Webhook events your endpoint receives

Configured by the merchant in their dashboard. Your platform's webhook URL receives:

| Event | When fired | Payload includes |
|---|---|---|
| `session.succeeded` | Buyer completed payment, funds captured | `sessionId`, `transactionId`, `amount`, `currency`, `merchantId`, `timestamp` |
| `session.failed` | Buyer attempted payment and failed | `sessionId`, `failureCode`, `error`, `amount`, `currency`, `merchantId`, `timestamp` |
| `session.expired` | Session passed its 30-min TTL with no completion | `sessionId`, `amount`, `currency`, `merchantId`, `timestamp` |
| `refund.created` | A refund was issued against a previously-succeeded session | `sessionId`, `refundId`, `transactionId`, `amount`, `currency`, `merchantId`, `timestamp` |

Full event shapes: [Webhook Events](../integration/webhook-events.md). Verification scheme: [Webhooks](../integration/webhooks.md#signature-verification).

## Webhook signature format

Today: HMAC-SHA256 over the raw request body, with the merchant's API key as the secret. Header is a single hex string.

```
X-VonPay-Signature: <lowercase-hex-hmac-sha256>
X-VonPay-Timestamp: <ISO-8601-UTC>
```

- **Algorithm:** HMAC-SHA256
- **Key:** the merchant's `vp_sk_*` API key, raw UTF-8 bytes (do not base64-decode, do not strip the prefix)
- **Message:** the raw HTTP request body, byte-for-byte before any parsing
- **Replay window:** ±5 minutes against `X-VonPay-Timestamp`

A Webhooks v2 format (`x-vonpay-signature: t=<unix-ts>,v1=<hex>` over `t.body` with per-subscription `whsec_*` secrets) is queued for an upcoming Sortie. **It is not active today.** When v2 ships, your connector will be able to opt into per-subscription secrets — useful for rotating without touching the merchant's API key. See [Webhook Verification](../integration/webhook-verification.md) for the full v1 + v2 walkthrough; today, implement v1 and ignore Section 2 of that page.

Reference verifier code in five languages (Node, Python, Go, Ruby, PHP) is on the [Webhook Verification](../integration/webhook-verification.md#code-examples) page. **Always use a constant-time comparison helper** (`hmac.compare_digest`, `crypto.timingSafeEqual`, `subtle.ConstantTimeCompare`, etc.) — variable-time `==` leaks the secret a byte at a time under repeated-request timing attacks.

## 3DS handoff

3DS is handled inside the hosted-checkout page; your connector does not need to deal with it directly. When the buyer's card requires 3DS:

- The hosted page renders the issuer's challenge inline.
- On success, the session continues to `succeeded` and your webhook fires normally.
- On failure, the session moves to `failed` with `failureCode` indicating 3DS rejection.

Your adapter's "3DS challenge" and "soft-decline retry" code paths typically don't have anything to do — the encapsulated flow swallows them. The exception: if your adapter contract requires you to *report a 3DS-required state separately*, you can detect it by polling `GET /v1/sessions/{id}` while the session is still `pending` and surfacing a "3DS in progress" state to your platform's UI. Most adapters will simply wait for the terminal webhook.

## Idempotency

Every `POST /v1/sessions` request **must** carry an `Idempotency-Key` header with a unique-per-session value (typically your platform's internal order ID + a stable per-attempt suffix).

- Replays of the same `Idempotency-Key` within 24 hours return the original response — including the original `checkoutUrl`. No duplicate session is created.
- After 24 hours, the key may be reused; a new session is created.
- Different request bodies with the same `Idempotency-Key` within 24 hours return `409 Conflict` with `code=idempotency_key_collision`.

Recommended pattern for adapters:

```
Idempotency-Key: {platform_short_name}_{merchant_internal_order_id}_{attempt_count}
```

Example: `sticky_order-789012_attempt-1`. On retry after a transient failure, increment the suffix to get a fresh session; on retry of the same logical operation, keep the suffix to dedupe.

## Error code catalog

All errors return JSON with `error`, `code`, `fix`, and `docs` fields, plus an `X-Request-Id` header for correlation:

```json
{
  "error": "API key is malformed or does not exist",
  "code": "auth_invalid_key",
  "fix": "Check that your API key is correctly formatted and active",
  "docs": "https://docs.vonpay.com/reference/error-codes#auth_invalid_key"
}
```

The full 27-code catalog is at [Error Codes](../reference/error-codes.md). The codes most relevant to a connector:

| HTTP | Code | Common adapter handling |
|---|---|---|
| 401 | `auth_invalid_key` | Surface to the merchant — their pasted key is wrong or rotated past grace |
| 401 | `auth_key_expired` | Surface to the merchant — they need to update the configured key |
| 401 | `auth_merchant_inactive` | Surface to the merchant — Von Payments has disabled the account |
| 403 | `merchant_not_onboarded` | The merchant hasn't completed KYC — surface a "complete onboarding" link |
| 422 | `merchant_not_configured` | Surface to the merchant — payment routing isn't fully set up on their side |
| 400 | `validation_invalid_amount` | Adapter bug — fix the amount mapping (must be positive integer minor units) |
| 400 | `validation_missing_field` | Adapter bug — required field missing in the request body |
| 409 | `session_wrong_state` | Idempotency — the session is in a state that disallows this operation |
| 410 | `session_expired` | Session's 30-min TTL elapsed; create a new one |
| 429 | `rate_limit_exceeded` / `rate_limit_exceeded_per_key` | Back off per the `Retry-After` header. Per-IP bucket is 10 req / 60 s; per-API-key is 30 req / 60 s on session-creates. |
| 502 | `provider_unavailable` | Upstream payment provider is unreachable. Retry with exponential backoff. |
| 402 | `provider_charge_failed` | Card declined — surface the decline to the merchant's UI |

A connector that handles `auth_*`, `merchant_*`, `validation_*`, and `provider_*` error families idiomatically is structurally complete. The remaining codes are operational (rate limits, idempotency conflicts, internal errors) and should be retried per standard exponential-backoff practice.

## Sandbox outcome matrix

For dev-loop testing your connector, every Von Payments merchant has a sandbox environment with deterministic mock outcomes. The session `amount` field selects the outcome:

| Amount (minor units) | Outcome | Webhook fired |
|---|---|---|
| `200` | Card declined (`card_declined`) | `session.failed` with `failureCode: card_declined` |
| Any other | Payment succeeds | `session.succeeded` with `transactionId` |

The mock gateway is intentionally narrow — one decline trigger, otherwise approve. For richer card-acceptance testing (3DS challenges, issuer-specific declines, timeouts), board a real Stripe Connect test-mode account or Gr4vy sandbox onto your sandbox merchant. Both provide their full test-card catalogs without real funds movement.

For getting set up with a sandbox in the first place — sign up at `app.vonpay.com`, click *Activate Vora Sandbox* — see the [Platform Integrator Sandbox guide](../guides/platform-sandbox.md).

## Reference adapter implementations

Reference implementations of the connector pattern in PHP and Node.js are in flight. They will live at `github.com/vonpay/integration-adapters` (MIT-licensed) and demonstrate the full session lifecycle, webhook verification with constant-time HMAC, and `Idempotency-Key` handling against the sandbox. The PHP adapter targets the gateway-interface shape that Sticky.io / Konnektive / Limelight use; the Node adapter is the more general reference.

:::info Coming soon
The reference adapters are queued for a near-term Sortie. Until they ship, the [`samples/` directory in the SDK monorepo](https://github.com/vonpay/vonpay/tree/master/samples) shows the SDK-level surface (cart-redirect, pay-by-link, server-side webhook verification) — adapter-pattern repositories will reuse the same SDK calls.
:::

## What's not in this spec yet

These are real, but the public surface for them is in flight. Don't build against them today — your connector will need to revise once the surface lands.

- **Merchant-initiated refund API.** Today refunds flow `webhook → your platform`. A `POST /v1/sessions/{id}/refund` (or equivalent) for merchant-initiated partial/full refunds is on the roadmap. When it ships, the `refund.created` webhook shape will not change — your connector continues to consume that — but you'll have an outbound API surface for refund initiation as well.
- **Webhooks v2** (`whsec_*` per-subscription signing secrets, `t=<ts>,v1=<hmac>` header). Walkthrough is documented at [Webhook Verification → Section 2](../integration/webhook-verification.md#section-2--upcoming-format-webhooks-v2); the delivery engine is queued.
- **Per-platform parent account** with rolled-up reporting across the platform's customer merchants. Not on the immediate roadmap; today each merchant of yours is a top-level Von Payments merchant with its own keys, dashboard, and webhook routing.
- **Connector marketplace / app store / developer portal review.** Not happening near-term. Your platform's connector lives in your codebase; we list partnerships once they sign.

## Partnership process

The work above is what your platform's eng team builds. The work that gets your connector listed in your platform's gateway dropdown is a separate biz-dev partnership conversation:

- We list Von Payments in your platform's gateway-config UI alongside Stripe / NMI / Authorize.Net.
- Our sales team routes deal flow to merchants who use your platform.
- Rev-share terms and a support channel are agreed in writing.

Reach out via your existing Von Payments contact, or through the [Quickstart](../quickstart.md) → "I'm a developer evaluating Vora" path. The technical spec on this page is what your eng team needs; the partnership conversation is what gets the connector live.

## Related

- [Platform Integrator Sandbox](../guides/platform-sandbox.md) — get keys, no KYC, in under a minute
- [Quickstart](../quickstart.md) — the 5-minute walkthrough; the `vp_sk_test_*` you create there is the same one your connector will exercise
- [Webhook Verification](../integration/webhook-verification.md) — full HMAC verification scheme + reference code in 5 languages
- [Error Codes](../reference/error-codes.md) — full 27-code catalog
- [API Keys](../reference/api-keys.md) — key types, rotation, revocation
- [Sandbox & Test Mode](../guides/sandbox.md) — sandbox behavior contract + outcome matrix
- [REST API](../sdks/rest-api.md) — full request/response shapes + OpenAPI spec
