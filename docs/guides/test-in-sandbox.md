---
sidebar_position: 1
---

# Test Locally & in Sandbox

Test the full checkout flow end-to-end before processing real payments. The examples below use `http://localhost:3001` for running the checkout service locally; replace with `https://checkout.vonpay.com` to hit the hosted sandbox without running anything locally.

## Setup

1. Use your test API key: `vp_sk_test_xxx`
2. The sandbox uses test payment processors — no real charges

## Create a Test Session

```bash
curl -X POST http://localhost:3001/v1/sessions \
  -H "Authorization: Bearer vp_sk_test_xxx" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test_session_001" \
  -d '{
    "amount": 1499,
    "currency": "USD",
    "country": "US",
    "successUrl": "http://localhost:3000/confirm",
    "lineItems": [{"name": "Test Widget", "quantity": 1, "unitAmount": 1499}]
  }'
```

## Open the Checkout Page

Copy the `checkoutUrl` from the response and open it in your browser. You should see:

- Billing address form
- Payment method selector
- Order summary with "Test Widget" — $14.99

## Test Card Numbers

Use these test card numbers in sandbox mode:

See [Test Cards](../reference/test-cards.md) for the canonical list. Common ones:

| Card | Number | Outcome |
|------|--------|---------|
| Visa (success) | `4242 4242 4242 4242` | Happy path |
| Visa (decline) | `4000 0000 0000 0002` | Generic decline |
| Visa (3D Secure) | `4000 0027 6000 3184` | 3DS challenge flow |
| Visa (insufficient funds) | `4000 0000 0000 9995` | Specific decline code |
| Mastercard | `5555 5555 5555 4444` | Happy path |

Any future expiry date and any 3-digit CVC work. For Amex, CVC is 4 digits.

> Note: Exact test card numbers may vary depending on the payment processor configuration. Check your processor's sandbox documentation for the full list.

## Verify the Return

After completing a test payment:

1. Check that you're redirected to your `successUrl`
2. Verify the query parameters: `session`, `status`, `transaction_id`, `sig`
3. Verify the HMAC signature matches

## Common Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| "Session not found" | Session expired (30 min TTL) | Create a new session |
| "Checkout is not configured" | Missing payment provider credentials | Set required provider env vars |
| Payment form doesn't load | Payment provider sandbox not configured | Check provider dashboard settings |
| Redirect doesn't include `sig` | `VON_PAY_SESSION_SECRET` not set | Add it to `.env.local` |

## Check Session Status

After payment, verify the session status was updated:

```bash
curl http://localhost:3001/v1/sessions/vp_cs_test_xxx \
  -H "Authorization: Bearer vp_sk_test_xxx"
```

The `status` should be `"succeeded"` or `"failed"`.
