---
sidebar_position: 1
---

# API Reference

The complete Von Payments Checkout API is documented in OpenAPI 3.1 format.

## OpenAPI Spec

[`openapi.yaml`](/openapi.yaml) — import into Postman, Insomnia, Redocly, or any OpenAPI tool.

## Endpoints Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/v1/sessions` | Bearer | Create a checkout session |
| `GET` | `/v1/sessions/{id}` | Bearer | Get session status |
| `POST` | `/api/checkout/init` | None (internal) | Initialize payment embed |
| `POST` | `/api/checkout/complete` | None (internal) | Finalize payment |
| `POST` | `/api/webhooks/provider` | Signature | Receive payment webhooks |
| `GET` | `/api/health` | None | Health check |

Endpoints marked "internal" are called by the hosted checkout page, not by merchants.

## Authentication

Merchant-facing endpoints use Bearer token auth:

```
Authorization: Bearer vp_key_live_xxx
```

Test keys use the `vp_key_test_` prefix. Live keys use `vp_key_live_`.

## Response Headers

Every response includes:

| Header | Description |
|--------|-------------|
| `X-Request-Id` | Unique request ID for debugging |
| `X-RateLimit-Remaining` | Remaining requests in the current window |
