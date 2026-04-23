---
sidebar_position: 999
title: Changelog
---

# Changelog

What's shipped, in developer-facing terms. For the full monorepo commit log see [github.com/Von-Payments/vonpay](https://github.com/Von-Payments/vonpay).

## 2026-04-23 — SDK 0.1.1

**`@vonpay/checkout-node@0.1.1`** ([npm](https://www.npmjs.com/package/@vonpay/checkout-node))
- `webhooks.verifySignature(payload: string | Buffer, ...)` and `webhooks.constructEvent(payload: string | Buffer, ...)` now accept both strings and Buffers. Previously required `string`; `express.raw()` yielded `Buffer` → typecheck failure. Internal coercion via `payload.toString("utf8")` before `JSON.parse`. Backward-compatible — existing string callers unchanged.

**`vonpay-checkout==0.1.1`** ([PyPI](https://pypi.org/project/vonpay-checkout/))
- `webhooks.verify_signature(payload: Union[str, bytes], ...)` and `webhooks.construct_event(payload: Union[str, bytes], ...)` now accept both `str` and `bytes`. FastAPI / httpx / Flask `request.get_data()` all yield `bytes`. Backward-compatible.

**`@vonpay/checkout-cli@0.1.0` + `@vonpay/checkout-mcp@0.1.0`** — unchanged; consume the Node SDK via `workspace:*` which pnpm pins at publish time.

### Docs

- `integration/webhook-verification.md` — leads with a "Which format should I implement today?" decision table; current `X-VonPay-Signature: <hex>` format routed to `webhooks.md`; upcoming v2 `x-vonpay-signature: t=…,v1=<hmac>` format clearly marked "not yet active."
- `integration/webhook-secrets.md` — de-stubbed. Full rotation timeline table: during 24h API-key grace, handlers must tolerate BOTH the old and new keys as signing secrets. Compromise path uses *Revoke* (not *Rotate*) to skip the grace window.
- `reference/api-keys.md` — new "Self-service vs. gated issuance" section. Test keys: self-serve in seconds via `app.vonpay.com` OTP + Create sandbox. Live keys: gated behind merchant application approval; `403 merchant_not_onboarded` for un-approved accounts.
- `guides/sandbox.md` — rewrote provisioning flow against the real atomic `POST /api/account/capabilities/sandbox` path; documented mock-gateway amount-based outcome routing (pending checkout-side confirmation).
- `guides/go-live-checklist.md` — promoted from stub to full content (day-of-launch plan, post-launch hygiene, troubleshooting tied to error codes).
- `reference/error-codes.md` — added `provider_attestation_failed` (403) + `provider_charge_failed` (402) anchors for Aspire errors. 26 codes total.
- `sdks/index.md` — new landing page. `/sdks` was 404ing because Docusaurus needs an index.md for directory landings.
- `reference/test-cards.md` — removed the `vonpay checkout list-test-cards` CLI reference (command never shipped; test-cards live in the MCP tool and real-processor sandboxes only).
- Install pins bumped: `@vonpay/checkout-node@0.1.1`, `vonpay-checkout==0.1.1` across `quickstart.md`, `sdks/node-sdk.md`, `sdks/python-sdk.md`, `sdks/index.md`. CLI + MCP stay at `@0.1.0`.

### Infrastructure

- `vonpay.com/developers` → `docs.vonpay.com` redirect added in `vonpay-www/next.config.ts` (was returning 404 on prod marketing site).
- `FEATURE_V2_SIGNED_REDIRECT=true` set on the Railway **staging** environment for `vonpay-checkout`. Production flip pending per Wilson's "v2 only, no v1 consumers" plan.

## 2026-04-22 — 0.1.0 Launch

First public release of the Von Payments developer SDKs.

**`@vonpay/checkout-node@0.1.0`** ([npm](https://www.npmjs.com/package/@vonpay/checkout-node))
- Sessions: `create`, `get`, `validate` (dry-run)
- Webhooks: `verifySignature` + `constructEvent` (HMAC-SHA256, ±5min replay window)
- Return signatures: `VonPayCheckout.verifyReturnSignature` — v1 + v2 (options bag: `expectedSuccessUrl`, `expectedKeyMode`, `maxAgeSeconds`)
- `VonPayError` typed with 24-code `ErrorCode` discriminated union + rate-limit info + request ID
- Auto-retry with exponential backoff (429 / 5xx + `Retry-After`)
- Zero runtime dependencies. ESM-only. Node 20+.

**`vonpay-checkout==0.1.0`** ([PyPI](https://pypi.org/project/vonpay-checkout/))
- Feature-parity with Node SDK (sessions, webhooks, return verification, typed `VonPayError`, retries)
- `httpx` 0.27+, Python 3.9+

**`@vonpay/checkout-cli@0.1.0`** ([npm](https://www.npmjs.com/package/@vonpay/checkout-cli))
- `vonpay checkout login|init|sessions|trigger|health`
- API key stored at `~/.vonpay/config.json` (mode 0600)
- Trigger command: local webhook-receiver testing with HMAC-signed payloads

**`@vonpay/checkout-mcp@0.1.0`** ([npm](https://www.npmjs.com/package/@vonpay/checkout-mcp))
- Model Context Protocol server exposing Von Payments tools to AI agents (Claude Desktop, Cursor, Claude Code)
- 5 tools: `create_session`, `get_session`, `simulate_payment`, `health`, `list_test_cards`
- `simulate_payment` clearly labeled `[SIMULATED — no real API call made]` in tool description + response body
- `get_session` intentionally omits merchant-supplied `metadata` from responses (prevents PII from flowing into agent context windows)
- Zod-validated tool inputs including `sessionId` regex guard

### Vora launch

- `/concepts/vora` introduces the orchestration layer concept
- Checkout responses deliberately omit processor identity (`providerId`, `providerMerchantId`, etc.) — see [`FEATURE_CATALOG.md` §Vora transparency](https://github.com/Von-Payments/vonpay/blob/master/FEATURE_CATALOG.md) in the monorepo for what's intentionally NOT exposed

## Earlier

Pre-1.0 development; no public SDK releases. Internal checkout + merchant Sorties tracked in the monorepo commit log.
