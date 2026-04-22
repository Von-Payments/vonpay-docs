---
sidebar_position: 3
---

# Python SDK

Typed Python client for the Von Payments Checkout API, published as `vonpay-checkout` on PyPI.

**Requirements:** Python 3.9+, httpx

## Install

```bash
pip install vonpay-checkout
```

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

Verify the HMAC-SHA256 signature on an incoming webhook request.

```python
is_valid = client.webhooks.verify_signature(
    payload=request_body,
    signature=request.headers["X-VonPay-Signature"],
    secret="whsec_...",
)
```

### Construct event

Parse and verify a webhook payload into a typed event object.

```python
event = client.webhooks.construct_event(
    payload=request_body,
    signature=request.headers["X-VonPay-Signature"],
    secret="whsec_...",
    timestamp=request.headers["X-VonPay-Timestamp"],
)

print(event.type)        # "session.succeeded"
print(event.session_id)  # "vp_cs_test_abc123"
```

## Return URL Verification

Verify the HMAC signature on the redirect back from checkout. This is a static method — no client instance needed.

```python
params = {
    "session": "vp_cs_test_abc123",
    "status": "succeeded",
    "amount": "1499",
    "currency": "USD",
    "sig": "a1b2c3d4...",
}

is_valid = VonPayCheckout.verify_return_signature(
    params=params,
    secret="ss_test_...",  # session secret (ss_* prefix)
)
```

The `params` dict must include: `session`, `status`, `amount`, `currency`, and `sig`. The `secret` is the session secret with the `ss_*` prefix.

## Health Check

```python
health = client.health()

print(health.status)   # "healthy"
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
    print(e.code)    # "validation_error"
    print(e.fix)     # "Amount must be a positive integer in smallest currency unit."
    print(e.docs)    # "https://docs.vonpay.com/reference/error-codes"
```

## Auto-Retry

The SDK automatically retries on `429` (rate limited) and `5xx` (server error) responses using exponential backoff. No configuration needed.
