---
sidebar_position: 3
---

# Error Codes

All errors return JSON with `error`, `code`, `fix`, and `docs` fields, plus an `X-Request-Id` header.

```json
{
  "error": "Human-readable error message",
  "code": "error_code",
  "fix": "Suggested action to resolve the error",
  "docs": "https://docs.vonpay.com/reference/error-codes#error_code"
}
```

## HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 400 | Bad Request | Invalid request body, missing required fields, validation failure |
| 401 | Unauthorized | Missing or invalid `Authorization: Bearer` token |
| 404 | Not Found | Session ID doesn't exist |
| 409 | Conflict | Session is in the wrong state (e.g., already completed) |
| 410 | Gone | Session has expired (30-minute TTL) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |

## Error Codes Reference

| Code | HTTP | Description |
|------|------|-------------|
| `auth_missing_bearer` | 401 | No `Authorization: Bearer` header provided |
| `auth_invalid_key` | 401 | API key is malformed or does not exist |
| `auth_key_type_forbidden` | 403 | Using a test key in production or a live key in sandbox |
| `auth_merchant_inactive` | 403 | Merchant account is disabled or suspended |
| `auth_service_unavailable` | 503 | Authentication service is temporarily unavailable |
| `session_not_found` | 404 | Session ID does not exist |
| `session_expired` | 410 | Session has expired (30-minute TTL) |
| `session_wrong_state` | 409 | Session is in the wrong state for this operation (e.g., already completed) |
| `session_integrity_error` | 409 | Session data integrity check failed |
| `validation_error` | 400 | Request body failed schema validation |
| `validation_missing_field` | 400 | A required field is missing from the request body |
| `validation_invalid_amount` | 400 | Amount is not a positive integer or exceeds maximum |
| `merchant_not_configured` | 400 | Merchant is missing required configuration (e.g., payment provider credentials) |
| `rate_limit_exceeded` | 429 | Too many requests — retry after the `Retry-After` interval |
| `provider_unavailable` | 502 | Upstream payment provider is not responding |
| `internal_error` | 500 | Unexpected server error |
| `webhook_missing_signature` | 401 | Webhook request is missing the signature header |
| `webhook_invalid_signature` | 401 | Webhook signature does not match the expected value |
| `webhook_not_configured` | 400 | Webhook endpoint is not configured for this merchant |
| `origin_forbidden` | 403 | Request origin is not in the merchant's allowed origins list |
| `transaction_verification_failed` | 400 | Transaction could not be verified with the payment provider |
| `unsupported_media_type` | 415 | Content-Type header is missing or not `application/json` |

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /v1/sessions` | 10 requests | 1 minute |
| `POST /api/checkout/init` | 20 requests | 1 minute |
| `POST /api/checkout/complete` | 20 requests | 1 minute |
| `POST /api/webhooks/provider` | 100 requests | 1 minute |

Rate limits are per IP address. When exceeded, the response includes:

```
HTTP/1.1 429 Too Many Requests
Retry-After: 60
X-RateLimit-Remaining: 0
```

## Validation Errors (400)

Validation errors include a descriptive message from the schema validator:

```json
{
  "error": "Expected number, received string at \"amount\"",
  "code": "validation_error",
  "fix": "Ensure 'amount' is a positive integer in minor units (e.g., 1499 for $14.99)",
  "docs": "https://docs.vonpay.com/reference/error-codes#validation_error"
}
```

Common validation issues:

| Field | Rule |
|-------|------|
| `amount` | Must be a positive integer (1–99,999,999) |
| `currency` | Must be exactly 3 characters |
| `country` | Must be exactly 2 characters |
| `successUrl` | Must be HTTPS (localhost exempt in sandbox) |
| `lineItems` | Max 100 items |
| `metadata` values | Max 500 characters each |

## Debugging

Every response includes `X-Request-Id`. When contacting support, include this ID for fast issue resolution.

```
X-Request-Id: a1b2c3d4e5f6
```

---

## Per-code reference

Each error code emitted in a response body (`docs` field) links to its section below. The stub anchors exist today so `docs:` URLs always resolve to a real page; full content (fix recipes, common causes, SDK behavior) lands next Sortie as part of the webhook launch documentation sweep.

### auth_missing_bearer

**HTTP:** 401. The request did not include an `Authorization: Bearer <key>` header. Add the header with your `vp_sk_*` or `vp_pk_*` key.

### auth_invalid_key

**HTTP:** 401. The API key is malformed, unknown, or has been revoked. Check the prefix (`vp_sk_test_`, `vp_sk_live_`, `vp_pk_test_`, `vp_pk_live_`) and confirm the key exists in `/dashboard/developers/api-keys`. If you just rotated, double-check the grace window hasn't expired.

### auth_key_type_forbidden

**HTTP:** 403. You used a test-mode key against a live endpoint, a live key against a sandbox endpoint, or a publishable key against a secret-only endpoint (e.g. `GET /v1/sessions/:id`). Match the key type to the operation.

### auth_merchant_inactive

**HTTP:** 403. The merchant account has been disabled or suspended. Check `/dashboard` for status banners; contact support if unexpected.

### auth_service_unavailable

**HTTP:** 503. The authentication service is temporarily unavailable. This is retriable — the SDK auto-retries with backoff.

### session_not_found

**HTTP:** 404. The session ID does not exist. Sessions are scoped to the merchant; you cannot look up another merchant's session with your key. Confirm the ID was created with the same key mode you're now querying with.

### session_expired

**HTTP:** 410. The session has expired (default 30-minute TTL). Create a new session.

### session_wrong_state

**HTTP:** 409. The session is in a state that forbids this operation (e.g. the session already `succeeded` and cannot be cancelled). Read the response body — the `fix` field describes the allowed state transitions.

### session_integrity_error

**HTTP:** 409. Session data integrity check failed. This is rare and usually indicates a race condition between webhook delivery and a follow-up API call. Retry after the webhook delivery settles.

### validation_error

**HTTP:** 400. The request body failed schema validation. The response `error` field contains a human-readable message from the validator, including the path to the bad field.

### validation_missing_field

**HTTP:** 400. A required field is missing. See [Create a Session](../integration/create-session.md) for the required fields.

### validation_invalid_amount

**HTTP:** 400. Amount is not a positive integer, is zero, or exceeds the 99,999,999 maximum. Remember: amounts are in **minor units** — `1499` = $14.99, not $1,499.

### merchant_not_configured

**HTTP:** 400. The merchant is missing required configuration for this operation — usually payment-provider credentials (Stripe account not boarded, Gr4vy binding not provisioned, etc.). Check `/ops/applications/[id]` or contact support.

### rate_limit_exceeded

**HTTP:** 429. Too many requests. Retry after the `Retry-After` interval. SDK auto-retries up to `maxRetries` times.

### provider_unavailable

**HTTP:** 502. Upstream payment provider (Stripe, Gr4vy, etc.) is not responding. Retriable — the SDK auto-retries with backoff.

### internal_error

**HTTP:** 500. Unexpected server error. Capture the `X-Request-Id` and contact support.

### webhook_missing_signature

**HTTP:** 401. Webhook request did not include the `X-VonPay-Signature` header. Only relevant if your endpoint rejects the delivery — the error is emitted by your code, not by Von Payments.

### webhook_invalid_signature

**HTTP:** 401. Webhook signature does not match the expected HMAC. Check you're HMAC'ing the **raw** request body (not the parsed JSON), using the right secret (merchant API key for session webhooks; subscription secret for v2). See [Webhook Signature Verification](../integration/webhook-verification.md).

### webhook_not_configured

**HTTP:** 400. No webhook endpoint is configured for this merchant. Register one at `/dashboard/developers/webhooks`.

### origin_forbidden

**HTTP:** 403. The request origin is not in the merchant's allowed-origins list. Add the origin at `/dashboard/branding` (checkout origin allowlist).

### transaction_verification_failed

**HTTP:** 400. Transaction could not be verified with the payment processor. Usually a processor-side reconciliation failure; retriable once the processor clears.

### unsupported_media_type

**HTTP:** 415. The `Content-Type` header is missing or not `application/json`. Set `Content-Type: application/json` on all POST/PUT requests.
