---
sidebar_position: 2
---

# Quickstart

Get a working checkout integration in 5 minutes.

## Prerequisites

- A Von Payments API key (`vp_key_live_xxx` or `vp_key_test_xxx`)
- Your `merchantId` (provided during onboarding, defaults to `"default"`)

---

## Step 1: Install (pick one)

### Node SDK

```bash
npm install @vonpay/node
```

### Browser snippet

```html
<script src="https://checkout.vonpayments.com/vonpay.js"></script>
```

### REST API

No installation — use `curl`, `fetch`, or any HTTP client.

---

## Step 2: Create a checkout session

### Node SDK

```typescript
import { VonPay } from "@vonpay/node";

const vonpay = new VonPay("vp_key_test_xxx");

const session = await vonpay.sessions.create({
  merchantId: "default",
  amount: 1499,           // $14.99 in cents
  currency: "USD",
  country: "US",
  successUrl: "https://mystore.com/order/123/confirm",
  cancelUrl: "https://mystore.com/cart",
  lineItems: [
    { name: "Premium Widget", quantity: 1, unitAmount: 1499 },
  ],
  buyerName: "Jane Doe",
  buyerEmail: "jane@example.com",
});

// Redirect the buyer
res.redirect(session.checkoutUrl);
```

### vonpay.js (browser)

```html
<script src="https://checkout.vonpayments.com/vonpay.js"></script>
<button id="pay-btn">Pay $14.99</button>

<script>
  VonPay.configure({ apiKey: "vp_key_test_xxx" });

  VonPay.button("#pay-btn", {
    merchantId: "default",
    amount: 1499,
    currency: "USD",
    country: "US",
    successUrl: "https://mystore.com/order/123/confirm",
    lineItems: [
      { name: "Premium Widget", quantity: 1, unitAmount: 1499 }
    ],
  });
</script>
```

### cURL

```bash
curl -X POST https://checkout.vonpayments.com/v1/sessions \
  -H "Authorization: Bearer vp_key_test_xxx" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: order_123_attempt_1" \
  -d '{
    "merchantId": "default",
    "amount": 1499,
    "currency": "USD",
    "country": "US",
    "successUrl": "https://mystore.com/order/123/confirm",
    "lineItems": [{"name": "Premium Widget", "quantity": 1, "unitAmount": 1499}]
  }'
```

**Response:**

```json
{
  "id": "vp_cs_test_k7x9m2n4p3",
  "checkoutUrl": "https://checkout.vonpayments.com/checkout?session=vp_cs_test_k7x9m2n4p3",
  "expiresAt": "2026-03-31T15:30:00.000Z"
}
```

---

## Step 3: Buyer pays

Redirect the buyer to `checkoutUrl`. They'll see the Von Payments hosted checkout page with:

- Billing address form
- Payment methods (cards, Apple Pay, Google Pay, Klarna, etc. — auto-detected)
- Order summary with your line items

You don't need to do anything here. The page handles everything.

---

## Step 4: Handle the return

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

**Always verify the signature server-side:**

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

if (!isValid) {
  throw new Error("Invalid signature");
}

// Safe to show order confirmation
```

---

## Step 5: Test it

1. Create a session using your test key (`vp_key_test_xxx`)
2. Open the `checkoutUrl` in your browser
3. Fill in the payment form with a test card
4. Verify you're redirected back with `status=succeeded`
5. Verify the HMAC signature matches

See [Test in Sandbox](guides/test-in-sandbox.md) for test card numbers and troubleshooting.

---

## Step 6: Go live

1. Swap `vp_key_test_xxx` for `vp_key_live_xxx`
2. Ensure `successUrl` uses HTTPS
3. Verify signature checking is implemented
4. Test with a small real payment

See [Going Live](guides/going-live.md) for the full checklist.
