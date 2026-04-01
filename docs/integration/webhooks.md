---
sidebar_position: 4
---

# Webhooks

> **Coming soon.** Webhook forwarding to merchants is on the roadmap. This page will be updated when it's available.

## Current Behavior

Von Payments receives payment status webhooks from the payment processor internally. Session statuses are updated in real-time.

For now, use the [signed return URL](handle-return.md) as your primary confirmation method. The HMAC signature ensures the redirect is authentic and hasn't been tampered with.

## Planned

When available, webhooks will:

- POST to your configured webhook URL on session status changes
- Include an `X-VonPay-Signature` HMAC header for verification
- Retry up to 3 times with exponential backoff (1s, 5s, 25s)
- Send events: `session.succeeded`, `session.failed`

## Payload Format (planned)

```json
{
  "event": "session.succeeded",
  "sessionId": "vp_cs_live_k7x9m2n4p3",
  "merchantId": "default",
  "amount": 1499,
  "currency": "USD",
  "transactionId": "txn_abc123",
  "metadata": { "orderId": "order_123" },
  "timestamp": "2026-03-31T15:30:00.000Z"
}
```
