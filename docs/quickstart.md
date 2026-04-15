---
sidebar_position: 2
---

# Quickstart

Get a working checkout integration in 5 minutes.

## Prerequisites

- A Von Payments account with API keys from the [developer dashboard](https://vonpay.com/developers)
- Node.js 20+ (or Python 3.9+ for the Python SDK)

---

## Step 1: Install the SDK

### Node.js

```bash
npm install @vonpay/checkout-node
```

### Python

```bash
pip install vonpay-checkout
```

### CLI

```bash
npm install -g @vonpay/checkout-cli
vonpay checkout login
```

---

## Step 2: Create a checkout session

### Node.js

```typescript
import { VonPayCheckout } from "@vonpay/checkout-node";

const vonpay = new VonPayCheckout(process.env.VON_PAY_SECRET_KEY);

const session = await vonpay.sessions.create({
  amount: 1499,           // $14.99 in cents
  currency: "USD",
  successUrl: "https://mystore.com/order/123/confirm",
  cancelUrl: "https://mystore.com/cart",
  lineItems: [
    { name: "Premium Widget", quantity: 1, unitAmount: 1499 },
  ],
  buyerName: "Jane Doe",
  buyerEmail: "jane@example.com",
});
```

### Python

```python
from vonpay.checkout import VonPayCheckout

vonpay = VonPayCheckout(os.environ["VON_PAY_SECRET_KEY"])

session = vonpay.sessions.create(
    amount=1499,
    currency="USD",
    success_url="https://mystore.com/order/123/confirm",
    cancel_url="https://mystore.com/cart",
    line_items=[
        {"name": "Premium Widget", "quantity": 1, "unit_amount": 1499},
    ],
    buyer_name="Jane Doe",
    buyer_email="jane@example.com",
)
```

### CLI

```bash
vonpay checkout sessions create --amount 1499 --currency USD
```

### cURL

```bash
curl -X POST https://checkout.vonpay.com/v1/sessions \
  -H "Authorization: Bearer vp_sk_test_xxx" \
  -H "Content-Type: application/json" \
  -H "Von-Pay-Version: 2026-01-01" \
  -H "Idempotency-Key: order_123_attempt_1" \
  -d '{
    "amount": 1499,
    "currency": "USD",
    "successUrl": "https://mystore.com/order/123/confirm",
    "lineItems": [{"name": "Premium Widget", "quantity": 1, "unitAmount": 1499}]
  }'
```

**Response:**

```json
{
  "id": "vp_cs_test_k7x9m2n4p3",
  "checkoutUrl": "https://checkout.vonpay.com/checkout?session=vp_cs_test_k7x9m2n4p3",
  "expiresAt": "2026-03-31T15:30:00.000Z"
}
```

---

## Step 3: Redirect the buyer

Send the buyer to the checkout URL returned in the session response.

### Node.js (Express)

```typescript
res.redirect(session.checkoutUrl);
```

### Python (Flask)

```python
return redirect(session.checkout_url)
```

The buyer sees the Von Payments hosted checkout page with billing address, payment methods (cards, Apple Pay, Google Pay, Klarna, etc.), and your order summary. You don't need to handle anything on this page.

---

## Step 4: Handle the webhook

When a payment completes, Von Payments sends a `POST` to your configured webhook URL. The webhook secret is your merchant API key (`vp_sk_*`), not a separate secret.

### Node.js (Express)

```typescript
import { VonPayCheckout } from "@vonpay/checkout-node";

const vonpay = new VonPayCheckout(process.env.VON_PAY_SECRET_KEY);

app.post("/webhooks/vonpay", express.raw({ type: "application/json" }), (req, res) => {
  const signature = req.headers["x-vonpay-signature"];
  const timestamp = req.headers["x-vonpay-timestamp"];

  try {
    const event = vonpay.webhooks.constructEvent(
      req.body,                        // raw body
      signature,                       // X-VonPay-Signature header
      process.env.VON_PAY_SECRET_KEY,  // your API key IS the webhook secret
      timestamp                        // X-VonPay-Timestamp header
    );

    switch (event.type) {
      case "session.succeeded":
        console.log(`Payment succeeded: ${event.transactionId}`);
        // fulfill the order
        break;
      case "session.failed":
        console.log(`Payment failed: ${event.error}`);
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
from vonpay.checkout import VonPayCheckout

vonpay = VonPayCheckout(os.environ["VON_PAY_SECRET_KEY"])

@app.route("/webhooks/vonpay", methods=["POST"])
def webhook():
    signature = request.headers.get("X-VonPay-Signature")
    timestamp = request.headers.get("X-VonPay-Timestamp")

    try:
        event = vonpay.webhooks.construct_event(
            request.data,
            signature,
            os.environ["VON_PAY_SECRET_KEY"],
            timestamp,
        )

        if event["type"] == "session.succeeded":
            print(f"Payment succeeded: {event['transactionId']}")

        return {"received": True}, 200
    except Exception as e:
        return {"error": str(e)}, 400
```

**Key details:**

- The webhook secret **is your API key** (`vp_sk_*`). There is no separate webhook secret.
- The `X-VonPay-Signature` header contains the HMAC-SHA256 signature.
- The `X-VonPay-Timestamp` header (ISO 8601) is used for replay protection with a +/-5 minute tolerance.

---

## Step 5: Verify the return redirect

After payment, the buyer is redirected to your `successUrl` with signed query parameters:

```
https://mystore.com/order/123/confirm
  ?session=vp_cs_test_k7x9m2n4p3
  &status=succeeded
  &amount=1499
  &currency=USD
  &transaction_id=abc123
  &sig=e4f7a2b1c3d5...
```

**Always verify the signature server-side.** The secret for return signatures is your session secret (`VON_PAY_SESSION_SECRET`, prefixed `ss_test_*` or `ss_live_*`), **not** your API key.

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
  process.env.VON_PAY_SESSION_SECRET  // ss_test_* or ss_live_*
);

if (!isValid) {
  throw new Error("Invalid return signature");
}

// Safe to show order confirmation
```

---

## Step 6: Go live

Replace your test keys with live keys. That's it.

1. Swap `vp_sk_test_xxx` for `vp_sk_live_xxx`
2. Update your session secret from `ss_test_*` to `ss_live_*`
3. Ensure `successUrl` uses HTTPS
4. Test with a small real payment

---

## Next steps

- [Webhooks Guide](integration/webhooks.md) — Event types, payloads, and retry behavior
- [Error Handling](sdks/node-sdk.md#error-handling) — Structured errors and retry logic
- [Node SDK Reference](sdks/node-sdk.md) — Full API surface
- [CLI Reference](sdks/cli.md) — Command-line tools
- [Python SDK](sdks/python-sdk.md) — Python integration
- [Sample Apps](https://github.com/vonpay/examples) — Working example integrations
