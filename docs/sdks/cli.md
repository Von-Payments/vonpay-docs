---
sidebar_position: 4
---

# CLI

Command-line interface for Von Payments, powered by the `@vonpay/checkout-cli` package.

The `vonpay` command is the umbrella CLI. `checkout` is a product subcommand — all checkout-related commands live under `vonpay checkout`.

## Install

```bash
npm install -g @vonpay/checkout-cli@0.1.3
```

## Authentication

The CLI resolves your API key in this order:

1. **Environment variable** `VON_PAY_SECRET_KEY` (takes precedence)
2. **Stored key** saved by `vonpay checkout login` (persisted to `~/.vonpay/config.json`)

## Commands

### `vonpay checkout login`

Interactively store your API key. The CLI prompts for your secret key and saves it to `~/.vonpay/config.json`.

```bash
vonpay checkout login
# ? Enter your Von Payments secret key: vp_sk_test_...
# Key saved to ~/.vonpay/config.json
```

### `vonpay checkout init`

Write a `.env` file in the current directory using the stored API key.

```bash
vonpay checkout init
# Created .env with VON_PAY_SECRET_KEY
```

### `vonpay checkout sessions create`

Create a checkout session from the command line.

```bash
vonpay checkout sessions create --amount 1499 --currency USD
```

| Flag | Required | Description |
|------|----------|-------------|
| `--amount` | Yes | Amount in smallest currency unit (e.g. 1499 = $14.99) |
| `--currency` | Yes | Three-letter currency code |
| `--country` | No | Two-letter country code (e.g. `US`) |
| `--dry-run` | No | Validate without creating a session |
| `--json` | No | Output raw JSON response |

```bash
# Dry-run validation
vonpay checkout sessions create --amount 1499 --currency USD --dry-run

# JSON output for scripting
vonpay checkout sessions create --amount 1499 --currency USD --country US --json
```

### `vonpay checkout sessions get`

Retrieve a session by ID.

```bash
vonpay checkout sessions get vp_cs_test_abc123
```

| Flag | Description |
|------|-------------|
| `--json` | Output raw JSON response |

### `vonpay checkout trigger`

Send a test webhook event to a URL. Useful for verifying your webhook handler during development.

```bash
vonpay checkout trigger session.succeeded --url https://localhost:3000/webhooks
```

Supported events:

- `session.succeeded`
- `session.failed`
- `session.expired`
- `refund.created`

### `vonpay checkout health`

Check the API health status.

```bash
vonpay checkout health

# JSON output
vonpay checkout health --json
```
