---
sidebar_position: 8
---

# API Discovery

Von Payments exposes machine-readable discovery endpoints. No authentication is required for any of these.

## `GET /.well-known/vonpay.json`

Returns discovery metadata about the API — version, available endpoints, documentation links, and SDK packages.

```bash
curl https://checkout.vonpay.com/.well-known/vonpay.json
```

```json
{
  "api_version": "2026-04-14",
  "endpoints": {
    "sessions": "/v1/sessions",
    "health": "/api/health"
  },
  "docs": "https://docs.vonpay.com",
  "sdks": {
    "node": "@vonpay/node",
    "python": "vonpay-checkout",
    "cli": "@vonpay/checkout-cli",
    "mcp": "@vonpay/checkout-mcp"
  }
}
```

AI agents and developer tools can use this endpoint to auto-discover the API without hardcoded URLs.

## `GET /llms.txt`

Returns an LLM-readable reference of the API — a plain-text summary designed for AI assistants to quickly understand the API surface, authentication, and key concepts.

```bash
curl https://checkout.vonpay.com/llms.txt
```

## `GET /openapi.yaml`

Returns the full OpenAPI 3.1.0 specification for the API. Import into Postman, Insomnia, Redocly, or any OpenAPI-compatible tool.

```bash
curl https://checkout.vonpay.com/openapi.yaml
```
