---
sidebar_position: 3
---

# Error Codes

All errors return JSON with an `error` field and an `X-Request-Id` header.

```json
{
  "error": "Human-readable error message"
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
  "error": "Expected number, received string at \"amount\""
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
