---
sidebar_position: 4
---

# Webhooks

Receive real-time notifications when payment events occur. The Von Payments checkout app sends `POST` requests to your configured webhook URL whenever a session status changes.

## How Webhooks Work

1. A buyer completes (or abandons) a checkout session
2. Von Payments sends a signed `POST` request to your webhook URL
3. Your server verifies the signature, processes the event, and responds with `200`
4. If delivery fails, Von Payments retries up to 3 times with exponential backoff

Configure your webhook URL in the [developer dashboard](https://vonpay.com/developers).

---

## Events

| Event | Description |
|-------|-------------|
| `session.succeeded` | Payment completed successfully |
| `session.failed` | Payment was declined or errored |
| `session.expired` | Session expired before the buyer completed payment |
| `refund.created` | A refund was issued for a completed payment |

---

## Payload Format

All webhook payloads are JSON. Here's an example for `session.succeeded`:

```json
{
  "event": "session.succeeded",
  "sessionId": "vp_cs_live_k7x9m2n4p3",
  "merchantId": "merch_abc123",
  "amount": 1499,
  "currency": "USD",
  "status": "succeeded",
  "transactionId": "txn_abc123",
  "metadata": { "orderId": "order_123" },
  "timestamp": "2026-03-31T15:30:00.000Z"
}
```

For `session.failed`:

```json
{
  "event": "session.failed",
  "sessionId": "vp_cs_live_k7x9m2n4p3",
  "merchantId": "merch_abc123",
  "amount": 1499,
  "currency": "USD",
  "status": "failed",
  "error": "card_declined",
  "failureCode": "insufficient_funds",
  "timestamp": "2026-03-31T15:30:00.000Z"
}
```

For `refund.created`:

```json
{
  "event": "refund.created",
  "sessionId": "vp_cs_live_k7x9m2n4p3",
  "merchantId": "merch_abc123",
  "refundId": "rfnd_xyz789",
  "amount": 1499,
  "currency": "USD",
  "timestamp": "2026-03-31T15:35:00.000Z"
}
```

---

## Headers

Every webhook request includes these headers:

| Header | Description |
|--------|-------------|
| `X-VonPay-Signature` | HMAC-SHA256 signature of the request body |
| `X-VonPay-Timestamp` | ISO 8601 timestamp of when the event was sent |
| `Content-Type` | `application/json` |
| `User-Agent` | `VonPay-Webhook/1.0` |

---

## Signature Verification

Webhook signatures use HMAC-SHA256. **The secret is your merchant API key** (`vp_sk_test_*` or `vp_sk_live_*`). There is no separate webhook secret.

The signature is computed over the raw request body:

```
HMAC-SHA256(raw_body, api_key) → hex digest
```

### Timestamp Verification

Always verify the `X-VonPay-Timestamp` header to prevent replay attacks. Reject requests where the timestamp is more than 5 minutes from the current time.

---

## Code Examples

### Node.js (Express)

Use `constructEvent` which verifies the signature, checks the timestamp, and parses the payload in one call. It takes 4 arguments.

```typescript
import express from "express";
import { VonPayCheckout } from "@vonpay/checkout-node";

const vonpay = new VonPayCheckout(process.env.VON_PAY_SECRET_KEY);

app.post("/webhooks/vonpay", express.raw({ type: "application/json" }), (req, res) => {
  const signature = req.headers["x-vonpay-signature"];
  const timestamp = req.headers["x-vonpay-timestamp"];

  try {
    const event = vonpay.webhooks.constructEvent(
      req.body,                        // raw body (Buffer)
      signature,                       // X-VonPay-Signature header
      process.env.VON_PAY_SECRET_KEY,  // your API key IS the webhook secret
      timestamp                        // X-VonPay-Timestamp header
    );

    switch (event.event) {
      case "session.succeeded":
        // Fulfill the order
        await fulfillOrder(event.sessionId, event.transactionId);
        break;
      case "session.failed":
        // Handle failure
        await handleFailure(event.sessionId, event.error, event.failureCode);
        break;
      case "session.expired":
        // Clean up pending order
        await expireOrder(event.sessionId);
        break;
      case "refund.created":
        // Process refund
        await processRefund(event.sessionId, event.refundId, event.amount);
        break;
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook verification failed:", err.message);
    res.status(400).json({ error: "Invalid signature" });
  }
});
```

### Python (Flask)

```python
import os
from flask import Flask, request, jsonify
from vonpay.checkout import VonPayCheckout

app = Flask(__name__)
vonpay = VonPayCheckout(os.environ["VON_PAY_SECRET_KEY"])

@app.route("/webhooks/vonpay", methods=["POST"])
def webhook():
    signature = request.headers.get("X-VonPay-Signature")
    timestamp = request.headers.get("X-VonPay-Timestamp")

    try:
        event = vonpay.webhooks.construct_event(
            request.data,                       # raw body
            signature,                          # X-VonPay-Signature header
            os.environ["VON_PAY_SECRET_KEY"],   # your API key IS the webhook secret
            timestamp,                          # X-VonPay-Timestamp header
        )

        if event.event == "session.succeeded":
            fulfill_order(event.session_id, event.transaction_id)
        elif event.event == "session.failed":
            handle_failure(event.session_id, event.error)
        elif event.event == "refund.created":
            process_refund(event.session_id, event.refund_id)

        return jsonify(received=True), 200

    except Exception as e:
        return jsonify(error=str(e)), 400
```

### Manual Verification (any language)

If you're not using an SDK, verify the signature manually:

1. Read the raw request body as a byte string
2. Compute `HMAC-SHA256(raw_body, your_api_key)` and hex-encode the result
3. Compare the result to the `X-VonPay-Signature` header using a constant-time comparison
4. Parse the `X-VonPay-Timestamp` header and reject if it's more than 5 minutes from now

---

## Retry Behavior

If your endpoint returns a non-2xx status code or times out, Von Payments retries delivery:

| Attempt | Delay |
|---------|-------|
| 1st retry | 1 second |
| 2nd retry | 5 seconds |
| 3rd retry | 25 seconds |

After 3 failed retries, the event is marked as undelivered. You can view failed deliveries and manually retry them in the [developer dashboard](https://vonpay.com/developers).

---

## Best Practices

- **Respond 200 quickly.** Return a `200` response immediately, then process the event asynchronously. If your handler takes too long, the request may time out and trigger a retry.
- **Process events asynchronously.** Queue the event for background processing rather than doing heavy work in the webhook handler.
- **Make your handler idempotent.** You may receive the same event more than once (due to retries). Use `sessionId` or `transactionId` to deduplicate.
- **Verify the signature before trusting the payload.** Never process webhook data without verifying the HMAC signature first.
- **Use the SDK.** The `constructEvent` method handles signature verification, timestamp checking, and payload parsing in one step.
