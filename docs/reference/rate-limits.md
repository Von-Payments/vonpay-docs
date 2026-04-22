---
sidebar_position: 7
---

# Rate Limits

Von Payments enforces rate limits via sliding-window counters backed by Upstash Redis. Most limits are per-IP; the session-create limit additionally has a per-API-key axis.

## Buckets

| Bucket | Endpoint(s) | Limit |
|---|---|---|
| `sessions` | `POST /v1/sessions`, `POST /api/sessions` | 10 / 60s per IP |
| `sessionsPerKey` | `POST /v1/sessions` (per-API-key axis) | 30 / 60s per key |
| `sessionRead` | `GET /v1/sessions/:id`, `GET /api/checkout/session` | 30 / 60s per IP |
| `checkoutInit` | `POST /api/checkout/init`, `POST /api/checkout/complete` | 20 / 60s per IP |
| `webhooks` | `POST /api/webhooks/*` (provider inbound) | 100 / 60s per IP |
| `clientError` | `POST /api/checkout/client-error`, `POST /api/csp-report` | 10 / 60s per IP |
| `admin` | `POST /api/admin/*`, `POST /api/merchant-accounts`, `/api/cron/*` | 5 / 60s per IP |
| `healthDeep` | `GET /api/health?deep=true` | 5 / 60s per IP |

Shallow `GET /api/health` (no `deep` param) is intentionally unmetered — it's what uptime monitors hit.

A session-create request can be rate-limited on either the per-IP `sessions` bucket or the per-key `sessionsPerKey` bucket. The per-IP rejection emits `rate_limit_exceeded`; the per-key rejection emits `rate_limit_exceeded_per_key` so SDKs can tell them apart and react differently.

## Response headers

`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `Retry-After` are emitted on **`429` responses only** — not on successful responses. This matches Upstash's ratelimit middleware behavior.

| Header | When | Description |
|---|---|---|
| `X-RateLimit-Limit` | 429 | Maximum requests allowed in the current window |
| `X-RateLimit-Remaining` | 429 | Requests remaining in the current window (will be `0`) |
| `X-RateLimit-Reset` | 429 | Unix epoch seconds when the window resets |
| `Retry-After` | 429 | Seconds to wait before retrying |

## Handling 429

```json
{
  "error": "Too many session creation requests",
  "code": "rate_limit_exceeded",
  "fix": "Too many requests — wait and retry (see Retry-After header)",
  "docs": "https://docs.vonpay.com/reference/api#rate-limits"
}
```

The error envelope is flat (`{error, code, fix, docs}`), not nested.

## SDK auto-retry

The Node and Python SDKs automatically retry on `429` and `5xx` responses with exponential backoff:

- The SDK reads `Retry-After` when present
- Retry delay capped at 60 seconds
- Default `maxRetries` is 2 — configurable via the constructor

## Hitting the per-key ceiling

If you legitimately need to exceed 30 session creates/minute per API key (e.g. high-volume batch fulfillment), contact support. The per-key limit is platform-protective, not commercial — we can raise it for real integrations.
