---
sidebar_position: 5
---

# MCP Server

The `@vonpay/checkout-mcp` package lets AI assistants interact with the Von Payments API using the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/).

MCP is an open standard that gives AI assistants the ability to call external tools. Instead of writing API calls by hand, an AI agent can create checkout sessions, check payment status, and simulate test payments through natural language.

## Setup

### Claude Desktop

Add the following to your Claude Desktop MCP config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "vonpay-checkout": {
      "command": "npx",
      "args": ["-y", "@vonpay/checkout-mcp@0.1.0"],
      "env": {
        "VON_PAY_SECRET_KEY": "vp_sk_test_..."
      }
    }
  }
}
```

### Cursor

Add the same configuration to your Cursor MCP settings (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "vonpay-checkout": {
      "command": "npx",
      "args": ["-y", "@vonpay/checkout-mcp@0.1.0"],
      "env": {
        "VON_PAY_SECRET_KEY": "vp_sk_test_..."
      }
    }
  }
}
```

## Available Tools

### `vonpay_checkout_create_session`

Create a checkout session.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `amount` | integer | Yes | Amount in smallest currency unit |
| `currency` | string | Yes | Three-letter currency code |
| `country` | string | No | Two-letter country code |
| `description` | string | No | Order description |
| `successUrl` | string | No | Redirect URL on success |
| `cancelUrl` | string | No | Redirect URL on cancel |
| `metadata` | object | No | Arbitrary key-value pairs |

### `vonpay_checkout_get_session`

Retrieve a session by ID.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionId` | string | Yes | The session ID to look up |

### `vonpay_checkout_simulate_payment`

Simulate a payment outcome in test mode. Only works with test keys.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionId` | string | Yes | The session ID to simulate |
| `outcome` | string | Yes | One of: `succeeded`, `failed`, `expired` |

### `vonpay_checkout_health`

Check the API health status. No parameters.

### `vonpay_checkout_list_test_cards`

List all available test card numbers. No parameters. See [Test Cards](../reference/test-cards.md) for the full table.

## Example Agent Workflows

### Create and verify a test payment

> "Create a $14.99 checkout session in USD, then simulate a successful payment and confirm the status."

The agent will:

1. Call `vonpay_checkout_create_session` with amount 1499, currency USD
2. Call `vonpay_checkout_simulate_payment` with outcome `succeeded`
3. Call `vonpay_checkout_get_session` to confirm the final status

### Test error handling

> "Create a session and simulate a failed payment. Show me the error details."

The agent will:

1. Create a session
2. Simulate a `failed` outcome
3. Retrieve the session to show the failure reason

### Check system health

> "Is the Von Payments API up?"

The agent calls `vonpay_checkout_health` and reports the status.
