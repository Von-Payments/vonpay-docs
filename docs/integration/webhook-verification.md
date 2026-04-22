---
sidebar_position: 6
---

# Webhook Signature Verification

Every webhook Von Payments delivers is signed with HMAC-SHA256. **Never process a webhook without verifying the signature first** — the verification guard is what stops an attacker from posting fake events to your endpoint.

:::note Two signing models
- **Session-level webhooks (current)** — signed with your merchant API key (`vp_sk_*`) as the HMAC secret. Used for `session.succeeded`, `session.failed`, `session.expired`, `refund.created`.
- **Merchant-subscribed webhooks (Webhooks v2, launching)** — signed with a per-subscription secret you view once at creation time. Used for the v1 event catalog ([15 keys](webhook-events.md)) you register via `/dashboard/developers/webhooks`.

Both models use the same HMAC-SHA256 algorithm and the same `X-VonPay-Signature` + `X-VonPay-Timestamp` headers. The **only** difference is which secret you HMAC with.
:::

## Headers

Every webhook request includes:

| Header | Description |
|---|---|
| `X-VonPay-Signature` | Hex-encoded HMAC-SHA256 of the raw request body |
| `X-VonPay-Timestamp` | ISO 8601 timestamp of when the event was signed |
| `Content-Type` | `application/json` |

## The algorithm

```
signature = HMAC-SHA256(key=signing_secret, data=raw_request_body).hex()
```

Where `signing_secret` is:
- **Session webhooks:** your merchant API key (`vp_sk_test_*` or `vp_sk_live_*`)
- **Subscribed webhooks (v2):** the per-subscription secret you copied when creating the subscription

Compare `signature` against the `X-VonPay-Signature` header **using a constant-time comparison** — a non-constant comparison leaks the secret through timing.

## Replay protection

Reject requests where `X-VonPay-Timestamp` is more than **5 minutes** from your current time. The SDKs apply this automatically via `constructEvent` / `construct_event`.

## Code examples

### Node.js

```typescript
import { VonPayCheckout } from "@vonpay/checkout-node";

const vonpay = new VonPayCheckout(process.env.VON_PAY_SECRET_KEY);

app.post("/webhooks/vonpay", express.raw({ type: "application/json" }), (req, res) => {
  try {
    const event = vonpay.webhooks.constructEvent(
      req.body,
      req.headers["x-vonpay-signature"],
      process.env.VON_PAY_SECRET_KEY,   // or subscription signing secret for v2
      req.headers["x-vonpay-timestamp"],
    );
    // ...handle event
    res.status(200).json({ received: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
```

### Python

```python
from vonpay.checkout import VonPayCheckout

vonpay = VonPayCheckout(os.environ["VON_PAY_SECRET_KEY"])

@app.route("/webhooks/vonpay", methods=["POST"])
def webhook():
    try:
        event = vonpay.webhooks.construct_event(
            request.data,
            request.headers["X-VonPay-Signature"],
            os.environ["VON_PAY_SECRET_KEY"],   # or subscription signing secret for v2
            request.headers["X-VonPay-Timestamp"],
        )
        # ...handle event
        return {"received": True}, 200
    except Exception as e:
        return {"error": str(e)}, 400
```

### Ruby

```ruby
require "openssl"
require "time"

def verify_webhook(raw_body, signature, timestamp, secret)
  # 1. Reject stale deliveries
  age = Time.now.utc - Time.parse(timestamp)
  return false if age.abs > 300   # 5 minutes

  # 2. Compute expected signature
  expected = OpenSSL::HMAC.hexdigest("SHA256", secret, raw_body)

  # 3. Constant-time compare
  Rack::Utils.secure_compare(expected, signature)
end
```

### PHP

```php
function verify_webhook(string $raw_body, string $signature, string $timestamp, string $secret): bool {
    // 1. Reject stale deliveries
    $age = abs(time() - strtotime($timestamp));
    if ($age > 300) return false;

    // 2. Compute expected signature
    $expected = hash_hmac('sha256', $raw_body, $secret);

    // 3. Constant-time compare
    return hash_equals($expected, $signature);
}
```

### Go

```go
import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "time"
)

func verifyWebhook(rawBody, signature, timestamp, secret string) bool {
    // 1. Reject stale deliveries
    ts, err := time.Parse(time.RFC3339, timestamp)
    if err != nil || time.Since(ts).Abs() > 5*time.Minute {
        return false
    }

    // 2. Compute expected signature
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write([]byte(rawBody))
    expected := hex.EncodeToString(mac.Sum(nil))

    // 3. Constant-time compare
    return hmac.Equal([]byte(expected), []byte(signature))
}
```

## Common mistakes

| Mistake | Fix |
|---|---|
| Using `==` to compare signatures | Use a constant-time compare (`crypto.timingSafeEqual` / `hmac.compare_digest` / `hash_equals` / `hmac.Equal`) |
| HMAC'ing the **parsed** JSON object | HMAC the **raw** request body bytes. Re-serializing JSON is not byte-identical |
| Ignoring the timestamp | Without the 5-minute window, any captured signature is valid forever |
| Comparing lowercased / case-mismatched hex | All signatures are lowercase hex. Compare after normalizing |
| Verifying inside a middleware that strips the raw body | Mount the verification handler on a route that preserves `req.body` as `Buffer`/`bytes` |

## Related

- [Webhook Event Reference](webhook-events.md) — event catalog and payload schemas
- [Webhook Signing Secrets](webhook-secrets.md) — creating and rotating subscription secrets
- [Webhooks (session-level, v1)](webhooks.md) — existing session webhooks with full SDK examples
