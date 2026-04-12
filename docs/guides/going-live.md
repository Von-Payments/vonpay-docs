---
sidebar_position: 2
---

# Going Live

Checklist for moving from sandbox to production.

## Before You Switch

- [ ] **Test the full flow** in sandbox ([Test in Sandbox](test-in-sandbox.md))
- [ ] **Verify signature checking** is implemented in your return URL handler
- [ ] **HMAC verification** uses timing-safe comparison (prevents timing attacks)

## Switch to Production

### 1. API Keys

Replace your test key with your live key:

```diff
- Authorization: Bearer vp_key_test_xxx
+ Authorization: Bearer vp_key_live_xxx
```

### 2. HTTPS Required

Production requires HTTPS for all URLs:

- `successUrl` must be `https://...`
- `cancelUrl` must be `https://...`
- API calls must go to `https://checkout.vonpay.com`

### 3. Environment Variables

Ensure these are set in your production environment:

```
VON_PAY_API_KEY=vp_key_live_xxx          # Your live API key
VON_PAY_SESSION_SECRET=<random-string>    # Shared HMAC secret (same on both sides)
```

### 4. Return URL Handler

Your return URL handler must:

1. Verify the HMAC signature before trusting `status`
2. Handle both `succeeded` and `failed` statuses
3. Show appropriate confirmation/error to the buyer
4. Update your order in your database

### 5. Test with a Real Payment

Make a small real payment ($1.00) to verify:

- Session creation works with live keys
- Payment form renders correctly
- Payment processes successfully
- Redirect includes valid signature
- Your order system is updated

## Production Checklist

- [ ] Live API key configured
- [ ] Success URL uses HTTPS
- [ ] HMAC signature verification implemented
- [ ] Error handling for failed payments
- [ ] Order confirmation page works
- [ ] Small test payment succeeded
- [ ] Webhook endpoint configured (when available)

## Monitoring

Set up uptime monitoring on:

```
GET https://checkout.vonpay.com/api/health
```

Returns `200` when healthy, `503` when degraded.

## Support

If you encounter issues in production, include the `X-Request-Id` header value from the API response when contacting support. This allows us to trace your exact request in our logs.
