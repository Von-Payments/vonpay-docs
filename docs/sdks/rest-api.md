---
sidebar_position: 3
---

# REST API

For developers not using Node.js. Call the API directly with any HTTP client.

## Base URL

```
https://checkout.vonpay.com
```

## Authentication

All merchant-facing endpoints require a Bearer token:

```
Authorization: Bearer vp_sk_live_xxx
```

## Endpoints

### Create Session

```bash
curl -X POST https://checkout.vonpay.com/v1/sessions \
  -H "Authorization: Bearer vp_sk_live_xxx" \
  -H "Content-Type: application/json" \
  -H "Von-Pay-Version: 2026-04-14" \
  -H "Idempotency-Key: unique_key_123" \
  -d '{
    "amount": 1499,
    "currency": "USD",
    "country": "US",
    "successUrl": "https://mystore.com/confirm",
    "lineItems": [{"name": "Widget", "quantity": 1, "unitAmount": 1499}]
  }'
```

**Response (201):**

```json
{
  "id": "vp_cs_live_k7x9m2n4p3",
  "checkoutUrl": "https://checkout.vonpay.com/checkout?session=vp_cs_live_k7x9m2n4p3",
  "expiresAt": "2026-03-31T15:30:00.000Z"
}
```

### Get Session Status

```bash
curl https://checkout.vonpay.com/v1/sessions/vp_cs_live_k7x9m2n4p3 \
  -H "Authorization: Bearer vp_sk_live_xxx" \
  -H "Von-Pay-Version: 2026-04-14"
```

### Health Check

```bash
curl https://checkout.vonpay.com/api/health
```

No authentication required.

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `POST /v1/sessions` | 10 requests/minute per IP |
| `POST /api/checkout/init` | 20 requests/minute per IP |
| `POST /api/webhooks/provider` | 100 requests/minute |

Rate-limited responses return `429` with a `Retry-After` header.

## Error Format

All errors return JSON:

```json
{
  "error": "Human-readable error message"
}
```

Every response includes an `X-Request-Id` header for debugging.

## OpenAPI Spec

The full API specification is available at [`docs/openapi.yaml`](/openapi.yaml). Import it into Postman, Insomnia, or any OpenAPI-compatible tool.
