---
sidebar_position: 1
---

# vonpay.js — Browser Checkout SDK

A lightweight drop-in script for creating checkout sessions and redirecting buyers directly from the browser. No backend required.

This is **not an npm package**. It is a script served from the Von Payments checkout page that you include via a `<script>` tag.

## Installation

Add the script tag to your HTML:

```html
<script src="https://checkout.vonpay.com/vonpay.js"></script>
```

This makes the `VonPay` object available globally.

## Key requirements

`vonpay.js` **requires a publishable key** (`vp_pk_test_*` or `vp_pk_live_*`). It rejects secret keys (`vp_sk_*`) and legacy keys (`vp_key_*`) with a thrown error, because either would expose full API credentials in the browser.

Create a publishable key at `/dashboard/developers/api-keys`.

## VonPay.configure(options)

Call once before any other method:

```javascript
VonPay.configure({
  apiKey: "vp_pk_live_xxx",                    // publishable key only
  baseUrl: "https://checkout.vonpay.com",      // optional, this is the default
});
```

## VonPay.checkout(options)

Creates a session and immediately redirects the buyer to the checkout page.

```javascript
VonPay.checkout({
  amount: 1499,
  currency: "USD",
  successUrl: "https://mystore.com/confirm",
  cancelUrl: "https://mystore.com/cart",
  buyerName: "Jane Doe",
  buyerEmail: "jane@example.com",
  lineItems: [
    { name: "Premium Widget", quantity: 1, unitAmount: 1499 },
  ],
  metadata: { orderId: "order_123" },
});
```

### Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `amount` | number | Yes | Amount in minor units (cents) |
| `currency` | string | Yes | ISO 4217 (`USD`, `EUR`) |
| `country` | string | No | ISO 3166-1 alpha-2 (e.g. `"US"`) |
| `successUrl` | string | No | Redirect after success |
| `cancelUrl` | string | No | Redirect on cancel |
| `mode` | string | No | Payment mode (default `"payment"`) |
| `description` | string | No | Payment description for bank statements |
| `locale` | string | No | Checkout page language (e.g. `"en"`, `"fr"`) |
| `expiresIn` | number | No | Session TTL in seconds (300-3600, default 1800) |
| `buyerId` | string | No | Your customer ID |
| `buyerName` | string | No | Pre-fills billing form |
| `buyerEmail` | string | No | Buyer's email |
| `lineItems` | array | No | Order items |
| `metadata` | object | No | Key-value pairs |

## VonPay.button(selector, options)

Attach checkout to a button click:

```html
<button id="pay-btn">Buy Now — $14.99</button>

<script>
  VonPay.configure({ apiKey: "vp_pk_live_xxx" });

  VonPay.button("#pay-btn", {
    amount: 1499,
    currency: "USD",
    successUrl: "https://mystore.com/confirm",
    onError: function(err) {
      alert("Checkout failed: " + err.message);
    },
  });
</script>
```

The button is automatically disabled and dimmed while the session is being created. On error, it's re-enabled and the `onError` callback fires.

## Full Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Store</title>
</head>
<body>
  <h1>Premium Widget — $14.99</h1>
  <button id="pay-btn">Pay Now</button>

  <script src="https://checkout.vonpay.com/vonpay.js"></script>
  <script>
    VonPay.configure({ apiKey: "vp_pk_test_xxx" });

    VonPay.button("#pay-btn", {
      amount: 1499,
      currency: "USD",
      successUrl: "https://mystore.com/order/123/confirm",
      cancelUrl: "https://mystore.com/cart",
      lineItems: [
        { name: "Premium Widget", quantity: 1, unitAmount: 1499 }
      ],
    });
  </script>
</body>
</html>
```

## Security Note

`vonpay.js` requires a publishable key (`vp_pk_*`). Publishable keys can only create checkout sessions — they cannot read session data, issue refunds, or perform any destructive operation. This is what makes it safe to ship in browser code.

Secret keys (`vp_sk_*`) must never appear in frontend code; `vonpay.js` will refuse to run with one.

## Browser Support

Works in all modern browsers (Chrome, Firefox, Safari, Edge). No dependencies, ~2KB.
