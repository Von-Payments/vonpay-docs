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

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Session ID |
| `merchantId` | string | Merchant account that owns this session |
| `amount` | integer | Payment amount in minor units |
| `currency` | string | ISO 4217 currency code |
| `country` | string | ISO 3166-1 alpha-2 country code |
| `status` | string | Current status (see below) |
| `buyerName` | string\|null | Buyer's name (encrypted at rest) |
| `buyerEmail` | string\|null | Buyer's email (encrypted at rest) |
| `buyerId` | string\|null | Merchant's external customer ID |
| `lineItems` | array\|null | Order line items |
| `metadata` | object\|null | Merchant-provided metadata |
| `successUrl` | string\|null | Redirect URL after payment |
| `cancelUrl` | string\|null | Redirect URL on cancel |
| `mode` | string | Payment mode (default `"payment"`) |
| `description` | string\|null | Payment description for bank statements |
| `locale` | string\|null | Checkout page language (e.g. `"en"`, `"fr"`) |
| `expiresIn` | integer\|null | Session TTL in seconds (300–3600, default 1800) |
| `expiresAt` | string | ISO 8601 expiry timestamp |
| `createdAt` | string | ISO 8601 creation timestamp |

## Status Lifecycle

```
pending ────> processing ────> succeeded
                          └──> failed

pending ────> expired
```

| Status | Description | Trigger |
|--------|-------------|---------|
| `pending` | Session created, waiting for buyer | `POST /v1/sessions` |
| `processing` | Buyer is on the checkout page, payment form loaded | Buyer clicks "Proceed to Payment" |
| `succeeded` | Payment completed | Payment processor confirms |
| `failed` | Payment declined or errored | Payment processor rejects |
| `expired` | 30-minute TTL elapsed | Automatic |

### Rules

- Transitions are **one-way** — a succeeded session cannot become failed
- `pending → processing` is **atomic** — prevents double-initialization
- A session can only be used **once** — no replays
- Expired sessions cannot be re-activated — create a new session
