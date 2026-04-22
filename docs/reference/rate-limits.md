---
sidebar_position: 7
---

# Rate Limits

Von Payments enforces rate limits per API key to ensure fair usage and platform stability.

## Buckets

Each endpoint has its own rate-limit bucket:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /v1/sessions` | 10 requests | 60 seconds |
| `GET /v1/sessions/:id` | 30 requests | 60 seconds |

## Response Headers

Every API response includes rate-limit headers:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests allowed in the current window |
| `X-RateLimit-Remaining` | Requests remaining in the current window |
| `X-RateLimit-Reset` | Unix timestamp when the window resets |
| `Retry-After` | Seconds to wait before retrying (only on `429` responses) |

## Handling 429 Responses

When you exceed the rate limit, the API returns a `429 Too Many Requests` response with the error code `rate_limit_exceeded`.

```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded for POST /v1/sessions.",
    "fix": "Wait 12 seconds before retrying. Consider batching requests or adding a delay between calls.",
    "docs": "https://docs.vonpay.com/reference/rate-limits"
  }
}
```

The `fix` field provides a self-healing message that tells you (or your AI agent) exactly how to recover.

## SDK Auto-Retry

All Von Payments SDKs automatically retry on `429` responses:

- The SDK reads the `Retry-After` header to determine wait time
- Retry delay is capped at 60 seconds
- No configuration required — auto-retry is enabled by default
