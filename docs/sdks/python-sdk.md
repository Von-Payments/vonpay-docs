---
sidebar_position: 3
---

# Python SDK

Typed Python client for the Von Payments Checkout API, published as `vonpay-checkout` on PyPI.

**Requirements:** Python 3.9+, httpx

## Install

```bash
pip install vonpay-checkout==0.1.1
```

Pinning to an exact version is recommended during the pre-1.0 window — minor bumps may add options or change defaults.

## Initialize

```python
from vonpay.checkout import VonPayCheckout, VonPayError

client = VonPayCheckout("vp_sk_test_...", api_version="2026-04-14")
```

The `api_version` parameter pins the API version for all requests made by this client instance. See [API Versioning](../reference/versioning.md) for details.

## Sessions

### Create a session

```python
session = client.sessions.create(
    amount=1499,
    currency="USD",
    country="US",
)

print(session.id)            # "vp_cs_test_abc123"
print(session.checkout_url)  # "https://checkout.vonpay.com/checkout?session=..."
```

Returns a `CheckoutSession` object.

### Get a session

```python
status = client.sessions.get("vp_cs_test_abc123")

print(status.status)   # "succeeded"
print(status.amount)   # 1499
```

Returns a `SessionStatus` object. Requires a secret key.

### Validate (dry run)

```python
result = client.sessions.validate(
    amount=1499,
    currency="USD",
)
# Validates parameters without creating a session
```

## Webhooks

### Verify signature

Verify the HMAC-SHA256 signature on an incoming webhook request. The webhook secret **is your API key** (`vp_sk_*`) — there is no separate webhook secret.

```python
is_valid = client.webhooks.verify_signature(
    payload=request_body,
    signature=request.headers["X-VonPay-Signature"],
    secret=os.environ["VON_PAY_SECRET_KEY"],  # your API key IS the webhook secret
)
```

### Construct event

Parse and verify a webhook payload into a typed event object. Checks the timestamp for replay protection with a ±5 minute tolerance.

```python
event = client.webhooks.construct_event(
    payload=request_body,
    signature=request.headers["X-VonPay-Signature"],
    secret=os.environ["VON_PAY_SECRET_KEY"],
    timestamp=request.headers["X-VonPay-Timestamp"],
)

print(event.event)        # "session.succeeded"
print(event.session_id)   # "vp_cs_test_abc123"
```

## Return URL Verification

Verify the HMAC signature on the redirect back from checkout. This is a static method — no client instance needed. Auto-detects v1 (legacy) and v2 (current) signature formats.

```python
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
    secret=os.environ["VON_PAY_SESSION_SECRET"],  # ss_test_* or ss_live_*
    expected_success_url="https://mystore.com/order/123/confirm",
    expected_key_mode="live",          # "live" or "test"
    max_age_seconds=600,               # optional, default 600
)
```

The `secret` is the session secret (`ss_*` prefix), **not** the API key.

### Options (v2 signatures)

`expected_success_url` and `expected_key_mode` are **required** when the `sig` starts with `v2.`. For v1 signatures they are ignored.

| Option | Required for v2? | Default | Purpose |
|---|---|---|---|
| `expected_success_url` | Yes | — | The `success_url` you passed to `sessions.create`. Normalised (trailing slash stripped, query sorted, fragment dropped). |
| `expected_key_mode` | Yes | — | `"test"` or `"live"`. Prevents test-mode sigs from being accepted as live. |
| `max_age_seconds` | No | `600` | Maximum age of the signature in seconds. |

See [Handle the Return](../integration/handle-return.md) for a full walkthrough of the v2 format.

## Health Check

```python
health = client.health()

print(health.status)   # "ok"  # "ok" | "degraded" | "down"
print(health.version)  # "2026-04-14"
```

Returns a `HealthStatus` object.

## Error Handling

All API errors raise `VonPayError` with structured fields for programmatic handling.

```python
from vonpay.checkout import VonPayCheckout, VonPayError

try:
    session = client.sessions.create(amount=-1, currency="USD")
except VonPayError as e:
    print(e.status)  # 400
    print(e.code)    # "validation_invalid_amount"
    print(e.fix)     # "Amount must be a positive integer in minor units (cents). 1499 = $14.99"
    print(e.docs)    # "https://docs.vonpay.com/integration/create-session#required-fields"
```

## Auto-Retry

The SDK automatically retries on `429` (rate limited) and `5xx` (server error) responses using exponential backoff. Default is 2 retries; configure with the `max_retries` constructor argument.
