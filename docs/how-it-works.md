---
sidebar_position: 3
---

# How It Works

Von Payments is a hosted checkout page. Your server creates a session, the buyer pays on our page, and we redirect them back with a signed confirmation.

## Flow

```
Your Server                      Von Payments                    Payment Processor
     |                                |                                |
     |-- POST /v1/sessions ---------->|                                |
     |   (amount, items, successUrl)  |-- creates session in DB        |
     |<-- { id, checkoutUrl } --------|                                |
     |                                |                                |
     |-- redirect buyer to ---------->|                                |
     |   checkoutUrl                  |-- renders checkout page        |
     |                                |-- buyer fills billing info     |
     |                                |-- buyer selects payment method |
     |                                |-- processes payment ---------->|
     |                                |<-- payment result -------------|
     |                                |                                |
     |<-- redirect buyer back --------|                                |
     |   ?status=succeeded&sig=xxx    |                                |
     |                                |                                |
     |-- verify signature             |                                |
     |-- show confirmation            |                                |
```

## Session Lifecycle

Every payment goes through a checkout session with these statuses:

```
pending ──> processing ──> succeeded
                      └──> failed
pending ──> expired (after 30 minutes)
```

| Status | Meaning |
|--------|---------|
| `pending` | Session created, buyer hasn't started paying yet |
| `processing` | Buyer is on the checkout page, payment form loaded |
| `succeeded` | Payment completed successfully |
| `failed` | Payment was declined or failed |
| `expired` | 30-minute TTL elapsed before buyer completed payment |

Transitions are one-way. A succeeded session cannot become failed, and vice versa.

## What the Buyer Sees

When the buyer arrives at the checkout URL, they see:

1. **Merchant header** — your company name
2. **Order summary** — line items, quantities, prices, total (from your session data)
3. **Billing address form** — country, name, address, city, state, ZIP, phone
4. **Payment methods** — automatically detected based on buyer's device and location:
   - Credit/debit cards (Visa, Mastercard, Amex, etc.)
   - Apple Pay (on Safari/iOS)
   - Google Pay (on Chrome/Android)
   - Klarna, Amazon Pay, and 130+ methods (based on merchant configuration)
5. **Pay button** — submits the payment

## Security Model

- **PCI SAQ-A** — Card data is entered in a secure iframe. It never touches Von Payments' servers or yours.
- **Encrypted PII** — Buyer name and email are AES-256-GCM encrypted at rest.
- **Signed return URLs** — The redirect back to your site includes an HMAC-SHA256 signature. Always verify it server-side.
- **Session tokens** — The session ID in the URL is a 10-character random token. It cannot be guessed or reused.
- **HTTPS required** — All API calls and return URLs must use HTTPS (localhost exempt in sandbox).

## Payment Routing

Von Payments runs a gateway-orchestration layer called **Vora**. When you call `POST /v1/sessions`, Vora selects the underlying payment processor (Stripe, Adyen, NMI, etc.) based on the merchant's configuration, processor health, and routing rules. From your code, this is invisible — the API surface is unchanged.

Session responses include a handful of `provider*` fields (and a `type` field) that expose which processor handled the session. Most integrations ignore them; they're useful for reporting, reconciliation, and support escalation.

See [Vora — Payment Routing](concepts/vora.md) for the full concept.

## What You Don't Need to Do

- Build a payment form — we handle it
- Handle PCI compliance — card data never touches your servers
- Integrate individual payment methods — they're auto-detected and rendered
- Manage 3D Secure — handled automatically when required
- Build mobile-specific flows — the checkout page is responsive
- Pick a payment processor — Vora routes for you
