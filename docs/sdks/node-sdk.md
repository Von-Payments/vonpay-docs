---
sidebar_position: 2
---

# @vonpay/checkout-node — Node.js SDK

Typed TypeScript/JavaScript client for the Von Payments Checkout API. Zero runtime dependencies, ESM-only, Node 20+.

## Install

```bash
npm install @vonpay/checkout-node@0.2.0
```

Pinning to an exact version is recommended during the pre-1.0 window — minor bumps may add options or change defaults.

## Initialize

```typescript
import { VonPayCheckout, VonPayError } from "@vonpay/checkout-node";

// Simple — pass API key as a string
const vonpay = new VonPayCheckout("vp_sk_live_xxx");

// With options — pass a config object
const vonpay = new VonPayCheckout({
  apiKey: "vp_sk_live_xxx",
  apiVersion: "2026-04-14",
  baseUrl: "https://checkout.vonpay.com", // default
  maxRetries: 2,                          // default
  timeout: 30_000,                        // ms, default
  errorReporter: (err, ctx) => {          // optional — see Error reporting below
    Sentry.captureException(err, { extra: ctx });
  },
});
```

The constructor validates the key prefix. Passing a key that does not start with `vp_sk_test_` or `vp_sk_live_` throws immediately.

---

## vonpay.sessions.create(params, options?)

Create a checkout session and get a checkout URL.

```typescript
const session = await vonpay.sessions.create({
  amount: 1499,                                        // required, in cents
  currency: "USD",                                     // required, ISO 4217
  successUrl: "https://mystore.com/order/123/confirm",  // required
  cancelUrl: "https://mystore.com/cart",                // optional
  country: "US",                                        // optional, ISO 3166-1 alpha-2
  mode: "payment",                                      // optional, default "payment"
  description: "Order #123",                            // optional
  locale: "en",                                         // optional
  expiresIn: 1800,                                      // optional, seconds (300–3600)
  buyerId: "cust_abc",                                  // optional
  buyerName: "Jane Doe",                                // optional
  buyerEmail: "jane@example.com",                       // optional
  lineItems: [                                          // optional
    { name: "Widget", quantity: 1, unitAmount: 1499 },
  ],
  metadata: { orderId: "order_123" },                   // optional
}, {
  idempotencyKey: "order_123_attempt_1",                // optional request option
});

// session.id          => "vp_cs_live_k7x9m2n4p3"
// session.checkoutUrl => "https://checkout.vonpay.com/checkout?session=..."
// session.expiresAt   => "2026-03-31T15:30:00.000Z"
```

See [Create a Session](../integration/create-session.md) for the full parameter reference.

---

## vonpay.sessions.get(sessionId)

Retrieve the full status of a session. Requires a secret key (`vp_sk_*`).

```typescript
const status = await vonpay.sessions.get("vp_cs_live_k7x9m2n4p3");

// status.id             => "vp_cs_live_k7x9m2n4p3"
// status.status         => "succeeded"
// status.transactionId  => "txn_abc123"
// status.amount         => 1499
// status.currency       => "USD"
```

Returns a full `SessionStatus` object including payment details and metadata.

---

## vonpay.sessions.validate(params)

Dry-run validation of session parameters without creating a session. Returns validation results.

```typescript
const result = await vonpay.sessions.validate({
  amount: 1499,
  currency: "USD",
  successUrl: "https://mystore.com/confirm",
});

// result.valid     => true
// result.warnings  => ["cancelUrl is recommended for production"]
```

---

## vonpay.webhooks.verifySignature(payload, signature, secret)

Verify an incoming webhook's HMAC-SHA256 signature. Uses `crypto.timingSafeEqual` to prevent timing attacks.

```typescript
const isValid = vonpay.webhooks.verifySignature(
  req.body,                        // raw request body (Buffer or string)
  req.headers["x-vonpay-signature"],
  process.env.VON_PAY_SECRET_KEY   // your API key IS the webhook secret
);
```

---

## vonpay.webhooks.constructEvent(payload, signature, secret, timestamp)

Verify the signature, check the timestamp for replay protection (+/-5 minute tolerance), and parse the webhook payload into a typed event. Takes 4 arguments.

```typescript
import express from "express";

app.post("/webhooks/vonpay", express.raw({ type: "application/json" }), (req, res) => {
  try {
    const event = vonpay.webhooks.constructEvent(
      req.body,
      req.headers["x-vonpay-signature"],
      process.env.VON_PAY_SECRET_KEY,
      req.headers["x-vonpay-timestamp"]
    );

    switch (event.event) {
      case "session.succeeded":
        console.log(`Paid: ${event.transactionId}`);
        break;
      case "session.failed":
        console.log(`Failed: ${event.error} (${event.failureCode})`);
        break;
      case "session.expired":
        console.log(`Session expired: ${event.sessionId}`);
        break;
      case "refund.created":
        console.log(`Refund: ${event.refundId}`);
        break;
    }

    res.status(200).json({ received: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
```

The webhook secret is your merchant API key (`vp_sk_*`). There is no separate webhook secret.

---

## VonPayCheckout.verifyReturnSignature(params, secret, options?)

Static method. Verify the HMAC signature on a return URL redirect after the buyer completes checkout. Auto-detects v1 (legacy) and v2 (current) signature formats.

```typescript
import { VonPayCheckout } from "@vonpay/checkout-node";

const url = new URL(req.url, `https://${req.headers.host}`);
const isValid = VonPayCheckout.verifyReturnSignature(
  {
    session: url.searchParams.get("session"),
    status: url.searchParams.get("status"),
    amount: url.searchParams.get("amount"),
    currency: url.searchParams.get("currency"),
    transaction_id: url.searchParams.get("transaction_id"),
    sig: url.searchParams.get("sig"),
  },
  process.env.VON_PAY_SESSION_SECRET,  // ss_test_* or ss_live_*, NOT the API key
  {
    expectedSuccessUrl: "https://mystore.com/order/123/confirm",
    expectedKeyMode: "live",             // "live" or "test"
    maxAgeSeconds: 600,                  // optional, default 600
  },
);
```

The secret is the session secret (`ss_*`), **not** the API key. Uses `crypto.timingSafeEqual` to prevent timing attacks.

### Options bag (v2 signatures)

`expectedSuccessUrl` and `expectedKeyMode` are **required** when the incoming `sig` starts with `v2.`. Passing them for v1 signatures is harmless — they're ignored.

| Option | Required for v2? | Default | Purpose |
|---|---|---|---|
| `expectedSuccessUrl` | Yes | — | The `successUrl` you passed to `sessions.create`. Normalised (trailing slash stripped, query sorted, fragment dropped). |
| `expectedKeyMode` | Yes | — | `"test"` or `"live"`. Prevents test-mode sigs from being accepted as live. |
| `maxAgeSeconds` | No | `600` | Maximum age of the signature in seconds. |

See [Handle the Return](../integration/handle-return.md) for a full walkthrough of the v2 format and the rationale.

---

## vonpay.health()

Check API health and latency.

```typescript
const health = await vonpay.health();
// health.status    => "ok"        // "ok" | "degraded" | "down"
// health.latencyMs => 42
// health.version   => "2026-04-14"
```

---

## Error reporting

The SDK accepts an optional `errorReporter` callback in the constructor so integrators can pipe SDK failures into their own observability stack (Sentry, Datadog, custom logger). **The SDK never phones home** — your reporter is invoked synchronously, fire-and-forget; if it throws, the SDK swallows the throw with a `console.warn` and continues.

### When it fires

- API request failures: non-retryable 4xx, retry-exhaustion on 5xx, network/timeout errors after retry exhaustion
- `webhooks.constructEvent` / `constructEventV2` verification failures (signature mismatch, stale timestamp, malformed v2 header)

It does **not** fire on:
- `verifySignature` / `verifyReturnSignature` — these return boolean, never throw
- The constructor's invalid-key-prefix throw — that's a dev-time error before the reporter is wired

### Callback shape

```typescript
import type { ErrorReporter, ErrorReporterContext } from "@vonpay/checkout-node";

const reporter: ErrorReporter = (err, ctx) => {
  // err is VonPayError | Error
  // ctx is ErrorReporterContext:
  //   method: "sessions.create" | "sessions.get" | "sessions.validate" |
  //           "webhooks.constructEvent" | "webhooks.constructEventV2" | "health" | ...
  //   sdkVersion: string
  //   url?: string         // origin + path, no query string (no PII via params)
  //   status?: number      // HTTP status if from API response
  //   requestId?: string   // X-Request-Id for correlation
  //   code?: string        // server error code (auth_invalid_key, etc.)
  //   attempt?: number     // 0-indexed retry attempt
};
```

### Sentry example

```typescript
import * as Sentry from "@sentry/node";
import { VonPayCheckout } from "@vonpay/checkout-node";

const vonpay = new VonPayCheckout({
  apiKey: process.env.VON_PAY_SECRET_KEY!,
  errorReporter: (err, ctx) => {
    Sentry.captureException(err, {
      tags: { sdk: "vonpay-node", method: ctx.method, code: ctx.code },
      contexts: { vonpay: ctx },
    });
  },
});
```

### Datadog example

```typescript
import { VonPayCheckout } from "@vonpay/checkout-node";

const vonpay = new VonPayCheckout({
  apiKey: process.env.VON_PAY_SECRET_KEY!,
  errorReporter: (err, ctx) => {
    logger.error("vonpay sdk error", { err, ...ctx });
  },
});
```

`errorReporter` is opt-in and additive — passing nothing preserves pre-0.2.0 behavior exactly. Errors still propagate via `throw` regardless of whether the reporter is configured.

---

## Auto-Retry

The SDK automatically retries on `429` (rate-limited) and `5xx` (server error) responses with exponential backoff. It reads the `Retry-After` header when present, capped at 60 seconds. Configure with `maxRetries` in the constructor (default: 2).

---

## Error Handling

All methods throw `VonPayError` on non-2xx responses. Errors include structured fields for programmatic handling.

```typescript
import { VonPayCheckout, VonPayError } from "@vonpay/checkout-node";

try {
  await vonpay.sessions.create({ ... });
} catch (err) {
  if (err instanceof VonPayError) {
    console.error(err.message);    // "Invalid API key"
    console.error(err.status);     // 401
    console.error(err.code);       // "auth_invalid_key"
    console.error(err.fix);        // "Check that your API key is correctly formatted and active"
    console.error(err.docs);       // "https://docs.vonpay.com/reference/security#key-types"
    console.error(err.requestId);  // "req_abc123"
    console.error(err.rateLimit);  // { limit: 100, remaining: 0, reset: 1710000000 }
  }
}
```

### ErrorCode union type

The `code` field is a discriminated union, enabling exhaustive `switch` statements:

```typescript
import type { ErrorCode } from "@vonpay/checkout-node";

function handleError(code: ErrorCode) {
  switch (code) {
    case "auth_missing_bearer":
    case "auth_invalid_key":
    case "auth_key_expired":
    case "auth_key_type_forbidden":
    case "auth_merchant_inactive":
    case "auth_service_unavailable":
      // authentication errors
      break;
    case "validation_error":
    case "validation_missing_field":
    case "validation_invalid_amount":
      // validation errors
      break;
    case "rate_limit_exceeded":
    case "rate_limit_exceeded_per_key":
      // back off
      break;
    case "session_not_found":
    case "session_expired":
    case "session_wrong_state":
    case "session_integrity_error":
      // session errors
      break;
    // ... exhaustive handling
  }
}
```

---

## Webhook Event Types

`WebhookEvent` is a discriminated union on the `type` field. Each event type carries different properties:

| Event | Key Properties |
|-------|---------------|
| `session.succeeded` | `transactionId`, `amount`, `currency` |
| `session.failed` | `error`, `failureCode` |
| `session.expired` | _no unique fields beyond the base_ — `sessionId`, `merchantId`, `amount`, `currency`, `status`, `timestamp`, `metadata` all present |
| `refund.created` | `refundId`, `amount`, `currency` |

```typescript
import type { WebhookEvent } from "@vonpay/checkout-node";

function handle(event: WebhookEvent) {
  switch (event.event) {
    case "session.succeeded":
      // event.transactionId is typed here
      break;
    case "session.failed":
      // event.error and event.failureCode are typed here
      break;
    case "session.expired":
      break;
    case "refund.created":
      // event.refundId is typed here
      break;
  }
}
```

---

## TypeScript

All types are exported:

```typescript
import type {
  VonPayCheckoutConfig,
  CreateSessionParams,
  CheckoutSession,
  SessionStatus,
  LineItem,
  HealthStatus,
  VonPayError,
  ErrorCode,
  WebhookEvent,
} from "@vonpay/checkout-node";
```
