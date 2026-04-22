---
sidebar_position: 1
---

# API Reference

The complete Von Payments Checkout API is documented in OpenAPI 3.1 format.

## OpenAPI Spec

[`openapi.yaml`](/openapi.yaml) — import into Postman, Insomnia, Redocly, or any OpenAPI tool.

## Endpoints Summary

### Get session status {#get-session-status}

`GET /v1/sessions/{id}` returns the full status of a previously-created session. Requires a secret key (`vp_sk_*`); publishable keys are rejected with `auth_key_type_forbidden`. See [Session Object](session-object.md) for the response shape.

### Session statuses {#session-statuses}

Sessions progress through `pending → succeeded` or `pending → failed` or `pending → expired`. Transitions are one-way and terminal. See [Session Object — Status Lifecycle](session-object.md#status-lifecycle).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/v1/sessions` | Bearer | Create a checkout session |
| `POST` | `/v1/sessions?dry_run=true` | Bearer | Validate params without creating a session |
| `GET` | `/v1/sessions/{id}` | Bearer | Get session status |
| `POST` | `/api/checkout/init` | None (internal) | Initialize payment embed |
| `POST` | `/api/checkout/complete` | None (internal) | Finalize payment |
| `POST` | `/api/webhooks/vp_gw_m4x7` | Signature (provider) | Inbound provider webhook (Gr4vy) |
| `POST` | `/api/webhooks/vp_gw_r8k2` | Signature (provider) | Inbound provider webhook (Stripe) |
| `GET` | `/api/health` | None | Health check (add `?deep=true` for deep variant) |

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

Rate-limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`) are emitted only on `429` responses. See [Rate Limits](rate-limits.md).

## Rate Limits {#rate-limits}

Full bucket list and handling rules: [Rate Limits](rate-limits.md).
