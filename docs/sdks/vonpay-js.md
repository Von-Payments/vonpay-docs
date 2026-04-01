---
sidebar_position: 1
---

# vonpay.js — Browser Snippet

A lightweight drop-in script for creating checkout sessions and redirecting buyers. No backend required.

## Installation

```html
<script src="https://checkout.vonpayments.com/vonpay.js"></script>
```

## Configure

Call once before any other method:

```javascript
VonPay.configure({
  apiKey: "vp_key_live_xxx",
  baseUrl: "https://checkout.vonpayments.com", // optional, this is the default
});
```

## VonPay.checkout(options)

Creates a session and immediately redirects the buyer to the checkout page.

```javascript
VonPay.checkout({
  merchantId: "default",
  amount: 1499,
  currency: "USD",
  country: "US",
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
| `merchantId` | string | No | Defaults to `"default"` |
| `amount` | number | Yes | Amount in minor units (cents) |
| `currency` | string | Yes | ISO 4217 (`USD`, `EUR`) |
| `country` | string | No | ISO 3166-1 alpha-2, defaults to `"US"` |
| `successUrl` | string | No | Redirect after success |
| `cancelUrl` | string | No | Redirect on cancel |
| `mode` | string | No | Payment mode (default `"payment"`) |
| `description` | string | No | Payment description for bank statements |
| `locale` | string | No | Checkout page language (e.g. `"en"`, `"fr"`) |
| `expiresIn` | number | No | Session TTL in seconds (300–3600, default 1800) |
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
  VonPay.configure({ apiKey: "vp_key_live_xxx" });

  VonPay.button("#pay-btn", {
    amount: 1499,
    currency: "USD",
    country: "US",
    successUrl: "https://mystore.com/confirm",
    onError: function(err) {
      alert("Checkout failed: " + err.message);
    },
  });
</script>
```

The button is automatically disabled and dimmed while the session is being created. On error, it's re-enabled and the `onError` callback fires.

## Security Note

vonpay.js exposes your API key in the browser. This is safe because the API key can only create checkout sessions — it cannot read data, issue refunds, or perform any destructive operation.

## Browser Support

Works in all modern browsers (Chrome, Firefox, Safari, Edge). No dependencies, ~2KB.
