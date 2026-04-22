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
- [Vora — Payment Routing](concepts/vora.md) — How processor selection works
- [API Reference](reference/api.md) — OpenAPI spec
- [Node SDK](sdks/node-sdk.md) — `@vonpay/checkout-node`
- [Python SDK](sdks/python-sdk.md) — `vonpay-checkout`
- [CLI](sdks/cli.md) — `@vonpay/checkout-cli`
- [Drop-in Snippet](sdks/vonpay-js.md) — `vonpay.js`
- [MCP Server](sdks/mcp.md) — AI agent integration
- [REST API](sdks/rest-api.md) — cURL examples
- [Handle the Return](integration/handle-return.md) — v2 signed-redirect verification
- [Webhooks](integration/webhooks.md) — Real-time payment events
- [Test in Sandbox](guides/test-in-sandbox.md) — Try it before going live
- [Go Live](guides/going-live.md) — Production checklist

## Integration Tools

| Tool | Best for | Complexity |
|------|----------|------------|
| [vonpay.js](sdks/vonpay-js.md) | No-backend merchants, quick prototypes | Lowest |
| [@vonpay/checkout-node](sdks/node-sdk.md) | Node.js / TypeScript backends | Low |
| [vonpay-checkout (Python)](sdks/python-sdk.md) | Python backends | Low |
| [@vonpay/checkout-cli](sdks/cli.md) | Terminal workflows, scripting, CI/CD | Low |
| [REST API](sdks/rest-api.md) | Any language, full control | Low |

## API Keys

Your API keys are available in the [developer dashboard](https://vonpay.com/developers).

| Key | Prefix | Use |
|-----|--------|-----|
| Test secret key | `vp_sk_test_` | Development and sandbox testing |
| Live secret key | `vp_sk_live_` | Production payments |
| Session secret | `ss_test_` / `ss_live_` | Verifying return URL signatures |

## AI / Agent Integration

Building with AI tools like Claude, ChatGPT, Cursor, or Copilot? Point your agent to our machine-readable API summary:

```
https://checkout.vonpay.com/llms.txt
```

This single file contains everything an AI agent needs to integrate Von Payments — endpoints, schemas, code examples, and verification logic. Works with Claude Code, Cursor, GitHub Copilot, and any LLM-powered dev tool.

- [llms.txt](/llms.txt) — Full API reference for AI agents
- [OpenAPI spec](/openapi.yaml) — Machine-readable API specification
