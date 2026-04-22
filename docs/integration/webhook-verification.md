---
sidebar_position: 6
---

# Webhook Signature Verification

Every webhook Von Payments delivers is signed with HMAC-SHA256. **Never process a webhook without verifying the signature first** — the verification guard is what stops an attacker from posting fake events to your endpoint.

The canonical spec is [`webhook-signature-v1`](https://github.com/Von-Payments/vonpay-checkout/blob/main/docs/webhook-signature-v1.md) in the checkout repo. This page is the developer-facing walkthrough; if the two ever disagree, the spec wins.

:::note Two signing models
- **Session-level webhooks (current)** — simple `X-VonPay-Signature: <hex-hmac>` header, signed with your merchant API key (`vp_sk_*`). Used for `session.succeeded`, `session.failed`, `session.expired`, `refund.created`. See [Webhooks](webhooks.md).
- **Merchant-subscribed webhooks (Webhooks v2)** — Stripe-style `x-vonpay-signature: t=<ts>,v1=<hmac>` header, signed with a per-subscription secret (`whsec_…`). Covered on this page.

Both use HMAC-SHA256. They differ in the header format, the signed-payload construction, and the secret.
:::

## Header format (v1)

```
x-vonpay-signature: t=1714406400,v1=abc123def456...
```

- `t` — unix timestamp (seconds, integer) of when the signature was generated
- `v1` — lowercase hex-encoded HMAC-SHA256 over the signed payload

During a secret rotation window, multiple `v1=` entries appear, comma-separated:

```
x-vonpay-signature: t=1714406400,v1=<new-hmac>,v1=<old-hmac>
```

**Accept the request if ANY `v1` matches.** This is what enables zero-downtime rotation — during the 24-hour grace window after you rotate your signing secret, Von Payments signs with both the old and new secret simultaneously.

## Signed payload

The HMAC input is the concatenation of the timestamp, a literal period, and the **raw** request body:

```
signed_payload = t + "." + raw_body
```

- `t` — the exact same value from the header
- `raw_body` — the HTTP request body as received, byte-for-byte, before any parsing or whitespace normalization

**HMAC the raw bytes, not the parsed JSON.** If you re-serialize the JSON object before HMAC'ing, the signature will not match — JSON serializers normalize whitespace and key order differently across languages.

## The algorithm

```
v1 = lowercase_hex(HMAC_SHA256(key=signing_secret, message=signed_payload))
```

- **Algorithm:** HMAC-SHA256
- **Key:** the raw signing secret (`whsec_…`) — not a hash, not prefix-stripped
- **Encoding:** lowercase hex

## Verification steps

A conforming verifier must:

1. **Parse the header.** Extract `t`. Extract all `v1=…` values into a list.
2. **Reject stale timestamps.** If `|now - t| > 600s` (10 minutes, both directions), reject with 400.
3. **Recompute the HMAC.** Form `signed_payload = t + "." + raw_body`. Compute `expected = lowercase_hex(HMAC_SHA256(signing_secret, signed_payload))`.
4. **Constant-time compare.** For each `v1` from the header, constant-time compare against `expected`. If any match, accept. Otherwise reject with 401.

**Never use `==` or `===`.** Variable-time comparison leaks the secret a byte at a time under repeated-request timing attacks. Use a constant-time helper:

- Node: `crypto.timingSafeEqual`
- Python: `hmac.compare_digest`
- Go: `subtle.ConstantTimeCompare` (or `hmac.Equal`)
- Ruby: `Rack::Utils.secure_compare`
- PHP: `hash_equals`

## Replay window

- **10 minutes, both directions.** Reject if the request is more than 10 minutes old OR more than 10 minutes in the future.
- The future-tolerance protects against clock skew on your side — slow receiver clocks shouldn't false-reject legitimate deliveries.
- 10 minutes is long enough to survive retry backoff, short enough that a stolen-at-rest request is useless.

## Idempotency

Events carry an `event_id` field in the body (e.g. `evt_…`). If the same `event_id` is redelivered (our retry after your 5xx, for example), your handler should idempotency-guard on `event_id` and return 200. **Do not rely on the signature alone** — during secret rotation, a request can be re-signed with a new secret but carry the same `event_id`.

## Code examples

### Node

```javascript
const crypto = require('crypto');

function verifyVonPaySignature(rawBody, headerValue, secret, maxAgeSeconds = 600) {
  if (!headerValue) return false;
  const parts = headerValue.split(',').map((p) => p.trim());
  const tPart = parts.find((p) => p.startsWith('t='));
  if (!tPart) return false;
  const t = parseInt(tPart.slice(2), 10);
  if (!Number.isFinite(t)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - t) > maxAgeSeconds) return false;

  const signed = `${t}.${rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(signed).digest('hex');

  for (const part of parts) {
    if (!part.startsWith('v1=')) continue;
    const candidate = part.slice(3);
    if (candidate.length !== expected.length) continue;
    if (crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(expected))) {
      return true;
    }
  }
  return false;
}
```

### Python

```python
import hashlib
import hmac
import time

def verify_vonpay_signature(raw_body: bytes, header_value: str, secret: str, max_age: int = 600) -> bool:
    if not header_value:
        return False
    parts = [p.strip() for p in header_value.split(",")]
    t_part = next((p for p in parts if p.startswith("t=")), None)
    if not t_part:
        return False
    try:
        t = int(t_part[2:])
    except ValueError:
        return False
    now = int(time.time())
    if abs(now - t) > max_age:
        return False

    signed = f"{t}.".encode() + raw_body
    expected = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()

    for part in parts:
        if not part.startswith("v1="):
            continue
        if hmac.compare_digest(part[3:], expected):
            return True
    return False
```

### Ruby

```ruby
require "openssl"
require "rack/utils"

def verify_vonpay_signature(raw_body, header_value, secret, max_age = 600)
  return false if header_value.nil? || header_value.empty?
  parts = header_value.split(",").map(&:strip)

  t_part = parts.find { |p| p.start_with?("t=") }
  return false unless t_part
  t = Integer(t_part[2..]) rescue (return false)

  return false if (Time.now.to_i - t).abs > max_age

  signed = "#{t}.#{raw_body}"
  expected = OpenSSL::HMAC.hexdigest("SHA256", secret, signed)

  parts.each do |part|
    next unless part.start_with?("v1=")
    return true if Rack::Utils.secure_compare(expected, part[3..])
  end
  false
end
```

### PHP

```php
function verify_vonpay_signature(string $raw_body, string $header_value, string $secret, int $max_age = 600): bool {
    if ($header_value === "") return false;
    $parts = array_map("trim", explode(",", $header_value));

    $t_part = null;
    foreach ($parts as $p) {
        if (str_starts_with($p, "t=")) { $t_part = $p; break; }
    }
    if ($t_part === null) return false;
    $t = (int)substr($t_part, 2);
    if (!ctype_digit(substr($t_part, 2))) return false;

    if (abs(time() - $t) > $max_age) return false;

    $signed = $t . "." . $raw_body;
    $expected = hash_hmac("sha256", $signed, $secret);

    foreach ($parts as $p) {
        if (!str_starts_with($p, "v1=")) continue;
        if (hash_equals($expected, substr($p, 3))) return true;
    }
    return false;
}
```

### Go

```go
import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "strconv"
    "strings"
    "time"
)

func VerifyVonPaySignature(rawBody []byte, headerValue, secret string, maxAge time.Duration) bool {
    if headerValue == "" {
        return false
    }
    parts := strings.Split(headerValue, ",")
    for i, p := range parts {
        parts[i] = strings.TrimSpace(p)
    }

    var t int64
    var tFound bool
    for _, p := range parts {
        if strings.HasPrefix(p, "t=") {
            v, err := strconv.ParseInt(p[2:], 10, 64)
            if err != nil {
                return false
            }
            t = v
            tFound = true
            break
        }
    }
    if !tFound {
        return false
    }

    now := time.Now().Unix()
    diff := now - t
    if diff < 0 {
        diff = -diff
    }
    if time.Duration(diff)*time.Second > maxAge {
        return false
    }

    signed := strconv.FormatInt(t, 10) + "." + string(rawBody)
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write([]byte(signed))
    expected := hex.EncodeToString(mac.Sum(nil))

    for _, p := range parts {
        if !strings.HasPrefix(p, "v1=") {
            continue
        }
        if hmac.Equal([]byte(expected), []byte(p[3:])) {
            return true
        }
    }
    return false
}
```

## Rejection response codes

| Condition | Response |
|---|---|
| Header missing | 401 |
| Header malformed (no `t=`, no `v1=`, non-integer `t`) | 401 |
| `\|now - t\| > 600` | 400 (timestamp tolerance) |
| No `v1` HMAC matches | 401 |
| Duplicate `event_id` already processed | 200 (idempotent no-op) |

## Common mistakes

| Mistake | Fix |
|---|---|
| Using `==` to compare signatures | Use a constant-time compare |
| HMAC'ing the **parsed** JSON object | HMAC the **raw** request body bytes |
| Accepting a request with stale `t` | Enforce the 10-minute window |
| Only accepting one `v1` entry | Iterate all `v1=` entries and accept on any match (required for rotation) |
| Comparing lowercased / case-mismatched hex | All signatures are lowercase hex |
| Verifying inside a middleware that strips the raw body | Mount the handler on a route that preserves `req.body` as `Buffer`/`bytes` |

## Stripe-compatibility note

The shape (`t=…,v1=…`, HMAC-SHA256 over `t.payload`, 10-minute tolerance) is deliberately close to Stripe's webhook signing scheme. If you've already integrated Stripe, your existing verifier likely works with a one-line change: swap `Stripe-Signature` for `x-vonpay-signature`.

## Related

- [Webhook Event Reference](webhook-events.md) — event catalog and payload schemas
- [Webhook Signing Secrets](webhook-secrets.md) — creating and rotating subscription secrets
- [Webhooks (session-level, v1)](webhooks.md) — existing session webhooks with the simpler API-key-signed format
- [Canonical spec](https://github.com/Von-Payments/vonpay-checkout/blob/main/docs/webhook-signature-v1.md) (`docs/webhook-signature-v1.md` in vonpay-checkout)
