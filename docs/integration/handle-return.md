---
sidebar_position: 3
---

# Handle the Return

After payment, the buyer is redirected to your `successUrl` with signed query parameters.

## Return URL Format

```
https://mystore.com/order/123/confirm
  ?session=vp_cs_live_k7x9m2n4p3
  &status=succeeded
  &amount=1499
  &currency=USD
  &transaction_id=txn_abc123
  &sig=e4f7a2b1c3d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1
```

| Parameter | Description |
|-----------|-------------|
| `session` | Your checkout session ID |
| `status` | Payment result: `succeeded` or `failed` |
| `amount` | Payment amount in minor units |
| `currency` | ISO 4217 currency code |
| `transaction_id` | The payment processor's transaction ID |
| `sig` | HMAC-SHA256 signature for verification |

## Verify the Signature

**Always verify the signature server-side.** The return URL is visible to the buyer and could be tampered with.

### Node SDK

```typescript
import { VonPayCheckout } from "@vonpay/checkout-node";

const url = new URL(req.url);
const isValid = VonPayCheckout.verifyReturnSignature(
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
  // Do NOT trust the payment status
  return res.status(400).send("Invalid signature");
}

// Safe to show order confirmation
const status = url.searchParams.get("status"); // "succeeded"
```

### Manual (any language)

The signature is computed as:

```
HMAC-SHA256(
  key:  VON_PAY_SESSION_SECRET,
  data: "{session}.{status}.{amount}.{currency}.{transaction_id}"
)
```

Example data string:

```
data = "vp_cs_live_k7x9m2n4p3.succeeded.1499.USD.txn_abc123"
```

**Python example:**

```python
import hmac, hashlib

def verify_return(session, status, amount, currency, transaction_id, sig, secret):
    data = f"{session}.{status}.{amount}.{currency}.{transaction_id or ''}"
    expected = hmac.new(secret.encode(), data.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(sig, expected)
```

**PHP example:**

```php
function verifyReturn($session, $status, $amount, $currency, $transactionId, $sig, $secret) {
    $data = "$session.$status.$amount.$currency.$transactionId";
    $expected = hash_hmac('sha256', $data, $secret);
    return hash_equals($expected, $sig);
}
```

## After Verification

Once the signature is verified:

1. Mark the order as paid in your system
2. Show a confirmation page to the buyer
3. Send an order confirmation email

Do not rely solely on the return URL for payment confirmation in high-value scenarios. Use [webhooks](webhooks.md) (coming soon) for server-to-server confirmation.
