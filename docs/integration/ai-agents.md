---
sidebar_position: 5
---

# AI Agent Integration

Von Payments is designed to work with AI agents out of the box. Self-healing errors, machine-readable discovery, and the MCP server let agents integrate without human hand-holding.

## MCP Server

The fastest way to give an AI agent access to Von Payments is the MCP server. See [MCP Server](../sdks/mcp.md) for full setup instructions.

Once configured, the agent can create sessions, check payment status, simulate test payments, and list test cards through natural language.

## Self-Healing Errors

Every Von Payments error response includes `code` and `fix` fields:

```json
{
  "error": {
    "code": "invalid_currency",
    "message": "Currency 'USDD' is not supported.",
    "fix": "Use a valid ISO 4217 currency code. Supported: USD, EUR, GBP, CAD, AUD.",
    "docs": "https://docs.vonpay.com/reference/error-codes"
  }
}
```

AI agents can read the `code` field to identify the error programmatically and the `fix` field to self-correct without developer intervention. This turns API errors into actionable instructions rather than dead ends.

## Discovery

Agents can discover the Von Payments API automatically using these unauthenticated endpoints:

- **`GET /.well-known/vonpay.json`** — API metadata, endpoints, SDK packages, and docs links
- **`GET /llms.txt`** — LLM-readable API reference in plain text

See [API Discovery](../reference/discovery.md) for full details.

An agent's first step should be fetching `/.well-known/vonpay.json` to discover the API version and available endpoints, then `/llms.txt` for a concise reference.

## CLAUDE.md Snippet

If your project uses the Von Payments API, add this to your `CLAUDE.md` so Claude Code understands the integration:

```markdown
## Von Payments

- API base: https://checkout.vonpay.com
- Auth: Bearer token with `vp_key_test_*` (test) or `vp_key_live_*` (live)
- Create sessions: POST /v1/sessions { amount, currency, country }
- Get session: GET /v1/sessions/{id}
- Docs: https://docs.vonpay.com
- Discovery: GET /.well-known/vonpay.json
- Errors include `code` and `fix` fields — read `fix` to self-correct
```

## System Prompt Templates

### E-commerce Agent

```
You are a checkout assistant for an online store powered by Von Payments.

When a customer is ready to pay:
1. Create a checkout session via POST /v1/sessions with the cart total, currency, and country
2. Return the checkout URL for the customer to complete payment
3. If an error occurs, read the `fix` field and retry

Auth: Use the VON_PAY_SECRET_KEY environment variable as a Bearer token.
API reference: https://checkout.vonpay.com/llms.txt
```

### Platform Agent

```
You are a payments operations agent for a platform using Von Payments.

Capabilities:
- Create checkout sessions for merchants
- Check session status and payment outcomes
- Monitor API health

Before making API calls, fetch https://checkout.vonpay.com/.well-known/vonpay.json
to discover the current API version and endpoints.

When an API call fails, read the error `code` and `fix` fields to diagnose and
retry automatically. Do not ask the user for help unless the fix field says to.
```
