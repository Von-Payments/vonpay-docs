---
sidebar_position: 2
---

# Redirect to Checkout

After creating a session, send the buyer to the checkout URL.

## Option A: vonpay.js (automatic)

The browser snippet creates the session and redirects in one step:

```html
<script src="https://checkout.vonpay.com/vonpay.js"></script>
<script>
  VonPay.configure({ apiKey: "vp_key_live_xxx" });
  VonPay.checkout({
    merchantId: "default",
    amount: 1499,
    currency: "USD",
    country: "US",
    successUrl: "https://mystore.com/confirm",
  });
</script>
```

## Option B: Server-side redirect

Your server creates the session, then redirects the buyer:

```typescript
// Express.js example
app.post("/checkout", async (req, res) => {
  const session = await vonpay.sessions.create({
    merchantId: "default",
    amount: req.body.amount,
    currency: "USD",
    country: "US",
    successUrl: `https://mystore.com/order/${req.body.orderId}/confirm`,
  });

  res.redirect(303, session.checkoutUrl);
});
```

## What the Buyer Sees

The hosted checkout page displays:

- **Header** — your merchant name
- **Order summary** — line items with quantities and prices (if provided)
- **Billing address form** — pre-filled with `buyerName` if you provided it
- **Payment methods** — auto-detected based on device, browser, and location
- **Pay button**

On mobile, a sticky bottom bar shows the total and pay button for easy access.

## Session Expiry

If the buyer arrives at the checkout URL after the 30-minute session TTL, they see an error page with an option to return to your store (via `cancelUrl`).

## Cancel

If the buyer clicks "back" or closes the page without paying, no redirect happens. If you provided a `cancelUrl`, a "Return to store" link is available on error/expiry screens.
