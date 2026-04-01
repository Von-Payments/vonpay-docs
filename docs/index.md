---
slug: /
sidebar_position: 1
title: Overview
---

# Von Payments Developer Docs

Von Payments is a hosted checkout page. Create a session, redirect the buyer, get paid.

## How It Works

1. **Create a session** — Your server calls our API with the amount, currency, and line items
2. **Redirect the buyer** — Send them to the checkout URL we return
3. **Buyer pays** — Cards, Apple Pay, Google Pay, Klarna, Amazon Pay, and 130+ methods — all handled automatically
4. **Get confirmation** — Buyer returns to your site with a signed status. Verify and show confirmation.

Card data never touches your servers or ours. We're PCI SAQ-A compliant.

## Quick Links

- [Quickstart](quickstart.md) — Full integration in 5 minutes
- [How It Works](how-it-works.md) — Architecture and session lifecycle
- [API Reference](reference/api.md) — OpenAPI spec
- [Node SDK](sdks/node-sdk.md) — `@vonpay/node`
- [Drop-in Snippet](sdks/vonpay-js.md) — `vonpay.js`
- [REST API](sdks/rest-api.md) — cURL examples
- [Test in Sandbox](guides/test-in-sandbox.md) — Try it before going live
- [Go Live](guides/going-live.md) — Production checklist

## Integration Tools

| Tool | Best for | Complexity |
|------|----------|------------|
| [vonpay.js](sdks/vonpay-js.md) | No-backend merchants, quick prototypes | Lowest |
| [@vonpay/node](sdks/node-sdk.md) | Node.js / TypeScript backends | Low |
| [REST API](sdks/rest-api.md) | Any language, full control | Low |
