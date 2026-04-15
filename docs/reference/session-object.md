---
sidebar_position: 2
---

# Session Object

A checkout session represents a single payment attempt from creation to completion.

## Session ID

Format: `vp_cs_{env}_{nanoid}`

- `vp_cs_test_k7x9m2n4p3` — sandbox session
- `vp_cs_live_k7x9m2n4p3` — production session

The ID is a 10-character random string. It cannot be guessed.

## Fields

| Field | Type | Always Present | Description |
|-------|------|----------------|-------------|
| `id` | string | Yes | Session ID |
| `status` | string | Yes | Current status: `pending`, `succeeded`, `failed`, `expired` |
| `mode` | string | Yes | Payment mode (default `"payment"`) |
| `merchantId` | string | Yes | Merchant account that owns this session |
| `amount` | integer | Yes | Payment amount in minor units |
| `currency` | string | Yes | ISO 4217 currency code |
| `country` | string | No | ISO 3166-1 alpha-2 country code (optional) |
| `description` | string | No | Payment description for bank statements |
| `collectShipping` | boolean | No | Whether to collect shipping address on checkout page |
| `shippingAddress` | object | No | Buyer's shipping address (only present when status is `succeeded`) |
| `transactionId` | string | No | Payment provider's transaction ID (set on completion) |
| `metadata` | object | No | Merchant-provided key-value pairs (passed through to webhooks) |
| `createdAt` | string | Yes | ISO 8601 creation timestamp |
| `updatedAt` | string | Yes | ISO 8601 last update timestamp |
| `expiresAt` | string | Yes | ISO 8601 expiry timestamp |

## Status Lifecycle

```
pending ────> succeeded
         └──> failed

pending ────> expired
```

| Status | Description | Trigger |
|--------|-------------|---------|
| `pending` | Session created, waiting for buyer | `POST /v1/sessions` |
| `succeeded` | Payment completed | Payment processor confirms |
| `failed` | Payment declined or errored | Payment processor rejects |
| `expired` | 30-minute TTL elapsed | Automatic |

### Rules

- Transitions are **one-way** — a succeeded session cannot become failed
- A session can only be used **once** — no replays
- Expired sessions cannot be re-activated — create a new session
