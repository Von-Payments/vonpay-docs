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
