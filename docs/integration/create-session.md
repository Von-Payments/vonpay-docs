---
sidebar_position: 1
---

# Create a Checkout Session

Create a session on your server, then redirect the buyer to the checkout URL.

## Endpoint

```
POST /v1/sessions
Authorization: Bearer vp_key_live_xxx
Content-Type: application/json
Idempotency-Key: <unique-key>   (optional, recommended)
```

## Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | Bearer token (`vp_key_live_xxx` or `vp_key_test_xxx`) |
| `Content-Type` | Yes | `application/json` |
| `Idempotency-Key` | No | Unique key to prevent duplicate session creation. If you retry a request with the same key, the original session is returned instead of creating a new one. Recommended for all production integrations. |

## Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `merchantId` | string | Yes | Your merchant ID |
| `amount` | integer | Yes | Amount in minor units (cents). `1499` = $14.99 |
| `currency` | string | Yes | ISO 4217 currency code (`USD`, `EUR`, `GBP`) |
| `country` | string | Yes | ISO 3166-1 alpha-2 country code (`US`, `CA`, `GB`) |
| `successUrl` | string | No | HTTPS URL to redirect buyer after payment |
| `cancelUrl` | string | No | HTTPS URL to redirect buyer on cancel |
| `mode` | string | No | Payment mode (default `"payment"`) |
| `description` | string | No | Payment description for bank statements |
| `locale` | string | No | Checkout page language (e.g. `"en"`, `"fr"`) |
| `expiresIn` | integer | No | Session TTL in seconds (300–3600, default 1800) |
| `buyerId` | string | No | Your external customer ID (enables saved payment methods) |
| `buyerName` | string | No | Buyer's name (pre-fills billing form, encrypted at rest) |
| `buyerEmail` | string | No | Buyer's email (encrypted at rest) |
| `lineItems` | array | No | Order items to display on checkout page |
| `metadata` | object | No | Key-value pairs passed through to webhooks |

### Line Item Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Item name |
| `quantity` | integer | Yes | Quantity (1-9999) |
| `unitAmount` | integer | Yes | Unit price in minor units |
| `imageUrl` | string | No | Product image URL |

## Response

```json
{
  "id": "vp_cs_live_k7x9m2n4p3",
  "checkoutUrl": "https://checkout.vonpay.com/checkout?session=vp_cs_live_k7x9m2n4p3",
  "expiresAt": "2026-03-31T15:30:00.000Z"
}
```

## Session Expiry

Sessions expire **30 minutes** after creation. If the buyer hasn't completed payment by then, the session status becomes `expired` and the checkout page shows an error.

## Amount Format

Amounts are always in **minor units** (the smallest currency unit):

| Amount | Currency | Value |
|--------|----------|-------|
| `1499` | USD | $14.99 |
| `1000` | EUR | 10.00 EUR |
| `999` | GBP | 9.99 GBP |
| `100000` | JPY | 100,000 JPY (JPY has no minor unit) |

## Example: With Line Items

```bash
curl -X POST https://checkout.vonpay.com/v1/sessions \
  -H "Authorization: Bearer vp_key_live_xxx" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: order_456_attempt_1" \
  -d '{
    "merchantId": "default",
    "amount": 3298,
    "currency": "USD",
    "country": "US",
    "successUrl": "https://mystore.com/order/456/confirm",
    "cancelUrl": "https://mystore.com/cart",
    "description": "Order #456",
    "locale": "en",
    "buyerId": "cust_789",
    "buyerName": "Jane Doe",
    "buyerEmail": "jane@example.com",
    "lineItems": [
      { "name": "Wireless Headphones", "quantity": 1, "unitAmount": 2499 },
      { "name": "USB-C Cable", "quantity": 1, "unitAmount": 799 }
    ],
    "metadata": { "orderId": "order_456" }
  }'
```

## Example: Simple Payment (No Items)

```bash
curl -X POST https://checkout.vonpay.com/v1/sessions \
  -H "Authorization: Bearer vp_key_live_xxx" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: simple_pay_001" \
  -d '{
    "merchantId": "default",
    "amount": 5000,
    "currency": "USD",
    "country": "US",
    "successUrl": "https://mystore.com/thank-you"
  }'
```

If no `lineItems` are provided, the checkout page shows the total amount without an itemized breakdown.

## Validation Rules

- `amount` must be a positive integer (1 to 99,999,999)
- `currency` must be exactly 3 characters
- `country` must be exactly 2 characters
- `successUrl` and `cancelUrl` must be HTTPS (localhost exempt in sandbox)
- `expiresIn` must be between 300 and 3600 (seconds)
- `lineItems` max 100 items
- `metadata` values must be strings, max 500 characters each

## Errors

| Status | Error | Cause |
|--------|-------|-------|
| 400 | Validation error message | Invalid request body |
| 401 | `Invalid API key` | Wrong or missing Bearer token |
| 429 | `Too many requests` | Rate limited (10/min) |
| 500 | Error message | Server error |
