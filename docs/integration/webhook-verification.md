---
sidebar_position: 6
---

# Webhook Signature Verification

Every webhook Von Payments delivers is signed with HMAC-SHA256. **Never process a webhook without verifying the signature first** — the verification guard is what stops an attacker from posting fake events to your endpoint.

Von Payments is in the middle of a webhook-product migration. Two signature formats exist; **only one is active today**.

## Which format should I implement today?

| If you're integrating... | Use this format | Doc |
|---|---|---|
| **Session-level webhooks** (`session.succeeded`, `session.failed`, `session.expired`, `refund.created`) — the current and only active path | **Current format (v1)** — `X-VonPay-Signature: <hex-hmac>` header, secret is your merchant API key | [Webhooks → Signature Verification](./webhooks#signature-verification) |
| **Merchant-subscribed webhooks** (the 15-event Webhooks v2 catalog — `charge.*`, `payment_intent.*`, `dispute.*`, `payout.*`, `application.*`) — **not yet emitted by any endpoint** | **Upcoming format (v2)** — `x-vonpay-signature: t=<ts>,v1=<hmac>` header, per-subscription `whsec_*` secret | This page, Section 2 below |

If you follow the [Quickstart](../quickstart.md) or consume Von Payments today, you want the **current format**. Click through to [Webhooks → Signature Verification](./webhooks#signature-verification) and ignore the rest of this page until Webhooks v2 ships.

If you're preparing ahead of Webhooks v2 launch, continue reading below.

---

## Section 2 — Upcoming format (Webhooks v2)

:::warning Not yet active
The `x-vonpay-signature: t=<ts>,v1=<hmac>` format documented below is the **upcoming Webhooks v2** spec for merchant-subscribed webhook endpoints (15-event v1 catalog). The delivery engine that emits these signatures is scheduled in an upcoming checkout Sortie — **no endpoint emits this format today**. Do not implement this verifier for session-level webhooks; it will not match the signatures you receive.
:::

The canonical spec is [`webhook-signature-v1`](https://github.com/Von-Payments/vonpay-checkout/blob/main/docs/webhook-signature-v1.md) in the checkout repo. This page is the developer-facing walkthrough; if the two ever disagree, the spec wins.

Both models use HMAC-SHA256. They differ in the header format, the signed-payload construction, and the secret.

## Header format (v1)

```
x-vonpay-signature: t=1714406400,v1=abc123def456...
```

- `t` — unix timestamp (seconds, integer) of when the signature was generated
- `v1` — lowercase hex-encoded HMAC-SHA256 over the signed payload

During a secret rotation window, a second `v1=` entry appears (signed with the previous secret, still in its grace window):

```
x-vonpay-signature: t=1714406400,v1=<new-hmac>,v1=<old-hmac>
```

**Accept the request if ANY `v1` matches.** The header carries at most two `v1=` entries — if you see three or more, reject as malformed.

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
- **Key:** the raw signing secret string as **UTF-8 bytes**, including the `whsec_` prefix. Do not base64-decode and do not strip the prefix — pass the secret verbatim to your HMAC library's key parameter.
- **Encoding:** lowercase hex

## Verification steps

A conforming verifier must:

1. **Parse the header.** Extract `t`. Extract all `v1=…` values into a list. If the list has **more than two** entries, reject with 401 — operational invariant is at most two active secrets (current + grace).
2. **Reject stale timestamps.** The replay window is **asymmetric** — reject if `now - t > 300` (more than 5 minutes old) OR `t - now > 30` (more than 30 seconds in the future). A future timestamp should never happen under normal flow; 30 seconds only covers minor receiver-clock skew.
3. **Recompute the HMAC.** Form `signed_payload = t + "." + raw_body`. Compute `expected = lowercase_hex(HMAC_SHA256(signing_secret, signed_payload))`.
4. **Constant-time compare** — **without any length-based early exit.** For each `v1` from the header, constant-time compare against `expected`. Length mismatches must still go through the same constant-time path (wrap your timing-safe compare in try/catch; a short candidate throws and is treated as no-match). Early-returning on length leaks a 1-bit timing signal. If any constant-time compare returns true, accept. Otherwise reject with 401.

**Never use `==` or `===`.** Variable-time comparison leaks the secret a byte at a time under repeated-request timing attacks. Use a constant-time helper:

- Node: `crypto.timingSafeEqual` (requires equal-length buffers — wrap in try/catch)
- Python: `hmac.compare_digest` (constant-time regardless of length)
- Go: `subtle.ConstantTimeCompare` (or `hmac.Equal`)
- Ruby: `Rack::Utils.secure_compare`
- PHP: `hash_equals`

## Replay window (asymmetric)

- **Past: 5 minutes.** A stolen-at-rest request older than 5 minutes is useless. 5 minutes is generous enough for one in-flight retry + modest network latency; the Von Payments delivery engine re-signs on each retry attempt, so fresh-at-send is the norm even under retry pressure.
- **Future: 30 seconds.** A future timestamp should never happen under normal flow (we're the signer). 30 seconds only covers minor receiver-clock skew — anything further indicates a clock problem worth diagnosing.

## Idempotency

Events carry an `event_id` field in the body (e.g. `evt_…`). If the same `event_id` is redelivered (our retry after your 5xx, for example), your handler should idempotency-guard on `event_id` and return 200. **Do not rely on the signature alone** — during secret rotation, a request can be re-signed with a new secret but carry the same `event_id`.

## Code examples

### Node

```javascript
const crypto = require('crypto');

function verifyVonPaySignature(rawBody, headerValue, secret) {
  if (!headerValue) return false;
  const parts = headerValue.split(',').map((p) => p.trim());

  const tPart = parts.find((p) => p.startsWith('t='));
  if (!tPart) return false;
  const t = parseInt(tPart.slice(2), 10);
  if (!Number.isFinite(t)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (now - t > 300) return false;   // > 5 min old
  if (t - now > 30) return false;    // > 30 sec in future

  const v1Parts = parts.filter((p) => p.startsWith('v1='));
  if (v1Parts.length === 0 || v1Parts.length > 2) return false;

  const signed = `${t}.${rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(signed).digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');

  for (const part of v1Parts) {
    const candidateBuf = Buffer.from(part.slice(3), 'utf8');
    try {
      // timingSafeEqual requires equal lengths. A length mismatch throws and is
      // treated as no-match. No length short-circuit — all comparisons go
      // through a constant-time path.
      if (crypto.timingSafeEqual(candidateBuf, expectedBuf)) return true;
    } catch {
      // length mismatch — continue to next v1
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

def verify_vonpay_signature(raw_body: bytes, header_value: str, secret: str) -> bool:
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
    if now - t > 300:   # > 5 min old
        return False
    if t - now > 30:    # > 30 sec in future
        return False

    v1_parts = [p for p in parts if p.startswith("v1=")]
    if not v1_parts or len(v1_parts) > 2:
        return False

    signed = f"{t}.".encode() + raw_body
    expected = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()

    for part in v1_parts:
        # hmac.compare_digest is constant-time regardless of length
        if hmac.compare_digest(part[3:], expected):
            return True
    return False
```

### Ruby

```ruby
require "openssl"
require "rack/utils"

def verify_vonpay_signature(raw_body, header_value, secret)
  return false if header_value.nil? || header_value.empty?
  parts = header_value.split(",").map(&:strip)

  t_part = parts.find { |p| p.start_with?("t=") }
  return false unless t_part
  t = Integer(t_part[2..]) rescue (return false)

  now = Time.now.to_i
  return false if now - t > 300         # > 5 min old
  return false if t - now > 30          # > 30 sec in future

  v1_parts = parts.select { |p| p.start_with?("v1=") }
  return false if v1_parts.empty? || v1_parts.size > 2

  signed = "#{t}.#{raw_body}"
  expected = OpenSSL::HMAC.hexdigest("SHA256", secret, signed)

  v1_parts.each do |part|
    return true if Rack::Utils.secure_compare(expected, part[3..])
  end
  false
end
```

### PHP

```php
function verify_vonpay_signature(string $raw_body, string $header_value, string $secret): bool {
    if ($header_value === "") return false;
    $parts = array_map("trim", explode(",", $header_value));

    $t_part = null;
    foreach ($parts as $p) {
        if (str_starts_with($p, "t=")) { $t_part = $p; break; }
    }
    if ($t_part === null) return false;
    if (!ctype_digit(substr($t_part, 2))) return false;
    $t = (int)substr($t_part, 2);

    $now = time();
    if ($now - $t > 300) return false;   // > 5 min old
    if ($t - $now > 30) return false;    // > 30 sec in future

    $v1_parts = array_values(array_filter($parts, fn($p) => str_starts_with($p, "v1=")));
    if (count($v1_parts) === 0 || count($v1_parts) > 2) return false;

    $signed = $t . "." . $raw_body;
    $expected = hash_hmac("sha256", $signed, $secret);

    foreach ($v1_parts as $p) {
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

func VerifyVonPaySignature(rawBody []byte, headerValue, secret string) bool {
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
    if now-t > 300 {
        return false
    }
    if t-now > 30 {
        return false
    }

    var v1Parts []string
    for _, p := range parts {
        if strings.HasPrefix(p, "v1=") {
            v1Parts = append(v1Parts, p[3:])
        }
    }
    if len(v1Parts) == 0 || len(v1Parts) > 2 {
        return false
    }

    signed := strconv.FormatInt(t, 10) + "." + string(rawBody)
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write([]byte(signed))
    expected := hex.EncodeToString(mac.Sum(nil))

    for _, v := range v1Parts {
        if hmac.Equal([]byte(expected), []byte(v)) {
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
| More than 2 `v1=` entries | 401 (malformed) |
| `now - t > 300` (stale) OR `t - now > 30` (future-skew) | 400 |
| No `v1` HMAC matches | 401 |
| Duplicate `event_id` already processed | 200 (idempotent no-op) |

## Common mistakes

| Mistake | Fix |
|---|---|
| Using `==` to compare signatures | Use a constant-time compare |
| Length-based early return before the compare | Always go through the constant-time path (wrap in try/catch) |
| HMAC'ing the **parsed** JSON object | HMAC the **raw** request body bytes |
| Accepting stale `t` | Enforce asymmetric window (past 5 min, future 30 sec) |
| Only accepting one `v1` entry | Iterate all `v1=` entries (up to 2) and accept on any match |
| Accepting >2 `v1=` entries | Reject as malformed |
| Base64-decoding the `whsec_` secret | Use the raw string as UTF-8 bytes |

## Stripe-compatibility note

The header shape (`t=…,v1=…`, HMAC-SHA256 over `t.payload`) is deliberately similar to Stripe's webhook signing scheme, so developers familiar with Stripe can read the format at a glance. But there are **intentional differences** that will bite anyone who copies a Stripe verifier verbatim:

- **Replay window:** we reject past > 5 min **and** future > 30 sec. Stripe rejects past only, with no future tolerance.
- **Multi-`v1=` cap:** we reject headers with more than 2 `v1=` entries. Stripe does not cap.
- **Header name:** `x-vonpay-signature` (lowercase, hyphenated), not `Stripe-Signature`.
- **Key encoding:** use the raw `whsec_…` string as UTF-8 bytes.

Treat the shape as a starting point, not a drop-in. The reference verifiers above already reflect our specific choices.

## Related

- [Webhook Event Reference](webhook-events.md) — event catalog and payload schemas
- [Webhook Signing Secrets](webhook-secrets.md) — creating and rotating subscription secrets
- [Webhooks (session-level, v1)](webhooks.md) — existing session webhooks with the simpler API-key-signed format
- [Canonical spec](https://github.com/Von-Payments/vonpay-checkout/blob/main/docs/webhook-signature-v1.md) (`docs/webhook-signature-v1.md` in vonpay-checkout)
