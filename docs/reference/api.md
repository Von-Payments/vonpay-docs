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
Authorization: Bearer vp_sk_live_xxx
```

Test keys use the `vp_sk_test_` prefix. Live keys use `vp_sk_live_`.

## Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | Bearer token (`vp_sk_live_xxx` or `vp_sk_test_xxx`) |
| `Content-Type` | Yes | `application/json` for POST requests |
| `Von-Pay-Version` | No | API version date string (e.g. `2026-04-14`). If omitted, your account's default API version is used. Pin this header to avoid breaking changes when the API evolves. |
| `Idempotency-Key` | No | Unique key to prevent duplicate operations. If you retry a request with the same key, the original response is returned instead of creating a duplicate. Recommended for all `POST` requests in production. |

## Response Headers

Every response includes:

| Header | Description |
|--------|-------------|
| `X-Request-Id` | Unique request ID for debugging |
| `X-RateLimit-Remaining` | Remaining requests in the current window |
| `Von-Pay-Version` | The API version used for this request |
