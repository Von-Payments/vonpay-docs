---
sidebar_position: 2
---

# @vonpay/node — Node.js SDK

Typed TypeScript/JavaScript client for the Von Payments API.

## Install

```bash
npm install @vonpay/node
```

## Initialize

```typescript
import { VonPay } from "@vonpay/node";

// Simple
const vonpay = new VonPay("vp_key_live_xxx");

// With options
const vonpay = new VonPay({
  apiKey: "vp_key_live_xxx",
  baseUrl: "https://checkout.vonpay.com", // default
});
```

## vonpay.sessions.create(params)

Create a checkout session and get a checkout URL.

```typescript
const session = await vonpay.sessions.create({
  merchantId: "default",
  amount: 1499,
  currency: "USD",
  country: "US",
  successUrl: "https://mystore.com/order/123/confirm",
  lineItems: [
    { name: "Widget", quantity: 1, unitAmount: 1499 },
  ],
});

// session.id          => "vp_cs_live_k7x9m2n4p3"
// session.checkoutUrl => "https://checkout.vonpay.com/checkout?session=..."
// session.expiresAt   => "2026-03-31T15:30:00.000Z"
```

See [Create a Session](../integration/create-session.md) for all parameters.

## vonpay.sessions.get(sessionId)

Check the status of a session.

```typescript
const status = await vonpay.sessions.get("vp_cs_live_k7x9m2n4p3");

// status.status              => "succeeded"
// status.transactionId  => "txn_abc123"
// status.amount              => 1499
// status.currency            => "USD"
```

## VonPay.verifyReturnSignature(params, secret)

Static method. Verify the HMAC signature on a return URL redirect.

```typescript
import { VonPay } from "@vonpay/node";

const url = new URL(req.url);
const isValid = VonPay.verifyReturnSignature(
  {
    session: url.searchParams.get("session"),
    status: url.searchParams.get("status"),
    amount: url.searchParams.get("amount"),
    currency: url.searchParams.get("currency"),
    transaction_id: url.searchParams.get("transaction_id"),
    sig: url.searchParams.get("sig"),
  },
  process.env.VON_PAY_SESSION_SECRET
);
```

Uses `crypto.timingSafeEqual` to prevent timing attacks.

## vonpay.health()

Check API health.

```typescript
const health = await vonpay.health();
// health.status    => "healthy"
// health.latencyMs => 42
```

## Error Handling

All methods throw on non-2xx responses. Errors have `status` and `response` properties:

```typescript
try {
  await vonpay.sessions.create({ ... });
} catch (err) {
  console.error(err.message);   // "Invalid API key"
  console.error(err.status);    // 401
  console.error(err.response);  // { error: "Invalid API key" }
}
```

## TypeScript

All types are exported:

```typescript
import type {
  VonPayConfig,
  CreateSessionParams,
  CheckoutSession,
  SessionStatus,
  LineItem,
  HealthStatus,
} from "@vonpay/node";
```
