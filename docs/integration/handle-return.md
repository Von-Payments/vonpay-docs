---
sidebar_position: 3
---

# Handle the Return

After payment, the buyer is redirected to your `successUrl` with signed query parameters. Your server verifies the signature and shows a confirmation page.

## Signature versions

Von Payments ships **two** signature formats. The SDK auto-detects which is in use and routes to the right verifier.

| Version | Format | Binds |
|---|---|---|
| **v2** (current) | `sig=v2.<base64url-payload>.<hex-hmac>` | session, status, amount, currency, transactionId, `successUrl`, `keyMode`, `iat` |
| **v1** (legacy) | `sig=<64-char-hex>` | session, status, amount, currency, transactionId |

**v2** is the default going forward. It prevents redirect lifting (signature replay against a different merchant) and caps signature lifetime with an `iat` freshness check. **v1** remains supported for existing integrations but will be deprecated — migrate when you can.

## v2 — Return URL format

```
https://mystore.com/order/123/confirm
  ?session=vp_cs_live_k7x9m2n4p3
  &status=succeeded
  &amount=1499
  &currency=USD
  &transaction_id=vp_tx_live_abc123
  &sig=v2.eyJzaWQiOiJ2cF9jc19saXZlX2s3eDltMm40cDMiLCJzdGF0dXMiOiJzdWNjZWVkZWQiLCJhbW91bnQiOjE0OTksImN1cnJlbmN5IjoiVVNEIiwidHJhbnNhY3Rpb25JZCI6InZwX3R4X2xpdmVfYWJjMTIzIiwic3VjY2Vzc1VybCI6Imh0dHBzOi8vbXlzdG9yZS5jb20vb3JkZXIvMTIzL2NvbmZpcm0iLCJrZXlNb2RlIjoibGl2ZSIsImlhdCI6MTcxMzcxNTIwMH0.4e1f...b2c3d4
```

The `sig` is three dot-separated parts: literal `v2`, a base64url-encoded JSON payload, and the hex HMAC over `v2.<payload>`.

Signed payload:

```json
{
  "sid": "vp_cs_live_k7x9m2n4p3",
  "status": "succeeded",
  "amount": 1499,
  "currency": "USD",
  "transactionId": "vp_tx_live_abc123",
  "successUrl": "https://mystore.com/order/123/confirm",
  "keyMode": "live",
  "iat": 1713715200
}
```

## Verify with the Node SDK

`VonPayCheckout.verifyReturnSignature` auto-detects v1 vs v2. For v2, you **must** pass `expectedSuccessUrl` and `expectedKeyMode` — without them, v2 signatures are rejected.

```typescript
import { VonPayCheckout } from "@vonpay/checkout-node";

const url = new URL(req.url, `https://${req.headers.host}`);
const params = {
  session: url.searchParams.get("session"),
  status: url.searchParams.get("status"),
  amount: url.searchParams.get("amount"),
  currency: url.searchParams.get("currency"),
  transaction_id: url.searchParams.get("transaction_id"),
  sig: url.searchParams.get("sig"),
};

const isValid = VonPayCheckout.verifyReturnSignature(
  params,
  process.env.VON_PAY_SESSION_SECRET,  // ss_test_* or ss_live_*
  {
    expectedSuccessUrl: "https://mystore.com/order/123/confirm",
    expectedKeyMode: "live",        // "live" or "test"
    maxAgeSeconds: 600,             // optional, default 600 (10 minutes)
  },
);

if (!isValid) {
  return res.status(400).send("Invalid signature");
}

// Safe to show order confirmation
```

### Options bag

| Option | Required for v2? | Default | Purpose |
|---|---|---|---|
| `expectedSuccessUrl` | Yes | — | The `successUrl` you passed to `sessions.create`. Compared after normalisation (trailing slash stripped, query params sorted, fragment dropped). |
| `expectedKeyMode` | Yes | — | `"test"` or `"live"`. Prevents a test-mode signature from being accepted as live. |
| `maxAgeSeconds` | No | `600` | Maximum age of the signature in seconds. A captured redirect older than this is rejected. |

For **v1** signatures, the options bag is ignored — pass it or don't.

## Verify with the Python SDK

```python
from vonpay.checkout import VonPayCheckout

params = {
    "session": request.args["session"],
    "status": request.args["status"],
    "amount": request.args["amount"],
    "currency": request.args["currency"],
    "transaction_id": request.args["transaction_id"],
    "sig": request.args["sig"],
}

is_valid = VonPayCheckout.verify_return_signature(
    params=params,
    secret=os.environ["VON_PAY_SESSION_SECRET"],
    expected_success_url="https://mystore.com/order/123/confirm",
    expected_key_mode="live",
    max_age_seconds=600,
)

if not is_valid:
    abort(400, "Invalid signature")
```

## Manual verification (any language)

If you're not using an SDK, here's the algorithm for both versions.

### v2

```
parts = sig.split(".")
# parts = ["v2", <base64url-payload>, <hex-hmac>]

signed_input = "v2." + parts[1]
expected_hmac = HMAC-SHA256(key=VON_PAY_SESSION_SECRET, data=signed_input).hex()
constant_time_compare(parts[2], expected_hmac)  # reject on mismatch

payload = JSON.parse(base64url_decode(parts[1]))

# Cross-check every bound field:
assert payload.sid           == session
assert payload.status        == status
assert str(payload.amount)   == amount
assert payload.currency      == currency
assert str(payload.transactionId) == (transaction_id or "")
assert payload.successUrl    == normalise(expected_success_url)
assert payload.keyMode       == expected_key_mode
assert now_sec - payload.iat <= 600
```

`normalise(url)` = origin + path (trailing slash stripped unless root) + query params sorted alphabetically, fragment dropped.

**Python example:**

```python
import base64, hmac, hashlib, json, time
from urllib.parse import urlparse, urlencode, parse_qsl

def normalise_success_url(raw):
    u = urlparse(raw)
    qs = urlencode(sorted(parse_qsl(u.query)))
    path = u.path.rstrip("/") if u.path != "/" else u.path
    return f"{u.scheme}://{u.netloc}{path}" + (f"?{qs}" if qs else "")

def verify_v2(sig, session, status, amount, currency, transaction_id,
              secret, expected_success_url, expected_key_mode, max_age=600):
    parts = sig.split(".")
    if len(parts) != 3 or parts[0] != "v2":
        return False
    signed = f"v2.{parts[1]}"
    expected = hmac.new(secret.encode(), signed.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(parts[2], expected):
        return False
    pad = parts[1] + "=" * ((4 - len(parts[1]) % 4) % 4)
    payload = json.loads(base64.urlsafe_b64decode(pad))
    if payload["sid"] != session: return False
    if payload["status"] != status: return False
    if str(payload["amount"]) != amount: return False
    if payload["currency"] != currency: return False
    if str(payload.get("transactionId", "")) != (transaction_id or ""): return False
    if payload["successUrl"] != normalise_success_url(expected_success_url): return False
    if payload["keyMode"] != expected_key_mode: return False
    now = int(time.time())
    if now - payload["iat"] > max_age: return False
    if payload["iat"] > now + 60: return False   # future-skew tolerance (matches SDK)
    return True
```

### v1 (legacy)

```
data = session + "." + status + "." + amount + "." + currency + "." + (transaction_id or "")
expected = HMAC-SHA256(key=VON_PAY_SESSION_SECRET, data=data).hex()
constant_time_compare(sig, expected)
```

The SDK routes to v1 automatically when the `sig` query param is 64 hex characters (no `v2.` prefix).

## Why v2

v1 signatures do not bind the `successUrl`, the key mode, or a timestamp. A signed redirect for merchant A's success page could in principle be lifted (from browser history, referrer logs, or a compromised redirect proxy) and replayed against merchant B's success endpoint. v2 closes those gaps:

- **`successUrl` binding** stops cross-merchant replay
- **`keyMode` binding** stops test-mode sigs from being accepted as live
- **`iat` freshness** caps the useful life of a captured redirect to 10 minutes

## After verification

1. Mark the order as paid in your system
2. Show a confirmation page to the buyer
3. Send an order confirmation email

For high-value flows, do not rely solely on the return URL — also confirm payment via [webhooks](webhooks.md).
