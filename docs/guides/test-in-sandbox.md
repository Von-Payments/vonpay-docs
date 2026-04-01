---
sidebar_position: 1
---

# Test in Sandbox

Test the full checkout flow end-to-end before processing real payments.

## Setup

1. Use your test API key: `vp_key_test_xxx`
2. The sandbox uses test payment processors — no real charges

## Create a Test Session

```bash
curl -X POST http://localhost:3001/v1/sessions \
  -H "Authorization: Bearer vp_key_test_xxx" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test_session_001" \
  -d '{
    "merchantId": "default",
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

| Card | Number | Expiry | CVC |
|------|--------|--------|-----|
| Visa (success) | `4111 1111 1111 1111` | Any future date | Any 3 digits |
| Visa (decline) | `4000 0000 0000 0002` | Any future date | Any 3 digits |
| Mastercard | `5555 5555 5555 4444` | Any future date | Any 3 digits |
| 3D Secure | `4000 0000 0000 3220` | Any future date | Any 3 digits |

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
| "Checkout is not configured" | Missing Gr4vy credentials | Set `GR4VY_ID` and `GR4VY_PRIVATE_KEY` |
| Payment form doesn't load | Gr4vy sandbox not configured | Check Gr4vy dashboard settings |
| Redirect doesn't include `sig` | `VON_PAY_SESSION_SECRET` not set | Add it to `.env.local` |

## Check Session Status

After payment, verify the session status was updated:

```bash
curl http://localhost:3001/v1/sessions/vp_cs_test_xxx \
  -H "Authorization: Bearer vp_key_test_xxx"
```

The `status` should be `"succeeded"` or `"failed"`.
