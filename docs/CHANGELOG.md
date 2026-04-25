---
sidebar_position: 999
title: Changelog
---

# Changelog

What's shipped, in developer-facing terms. For the full monorepo commit log see [github.com/Von-Payments/vonpay](https://github.com/Von-Payments/vonpay).

## 2026-04-25 — SDK 0.2.0 (Phase 2 visibility — `errorReporter` callback)

Adds an optional `errorReporter` (Node) / `error_reporter` (Python) callback to the SDK constructor so integrators can pipe SDK failures into their own observability stack (Sentry, Datadog, custom logger). **The SDK never phones home** — the callback is invoked synchronously, fire-and-forget. Closes Phase 2 of the visibility plan from bridge `2026-04-25 17:32Z`.

**Backward compatibility:** opt-in. Passing nothing preserves pre-0.2.0 behavior exactly. Errors still propagate via `throw`/`raise` regardless of whether the reporter is configured.

**`@vonpay/checkout-node@0.2.0`** ([npm](https://www.npmjs.com/package/@vonpay/checkout-node))
- **New:** `errorReporter?: (err, ctx) => void` config option. Fires on non-retryable 4xx, retry-exhaustion 5xx, network errors after retry exhaustion, and `webhooks.constructEvent` / `constructEventV2` failures. Does NOT fire on `verifySignature` / `verifyReturnSignature` (those return boolean) or constructor key-prefix errors (dev-time).
- **New types:** `ErrorReporter`, `ErrorReporterContext` (re-exported from package root). Context includes: `method`, `sdkVersion`, `url` (query-string stripped — no PII via params), `status`, `requestId`, `code`, `attempt`.
- **Reporter throws are swallowed** with a `console.warn` — an observability bug must not break the SDK call. The original `VonPayError` still propagates.
- 10 new unit tests covering: fires on 4xx with full context, fires once after retry-exhaust on 5xx, fires exactly once at exhaustion (not on each intermediate retry), fires on network error, fires on constructEvent failure, fires on constructEventV2 stale-timestamp, no-op on success path, no-op when undefined (back-compat), swallows reporter throws, strips query string from URL. Test count 45 → **55**.

**`vonpay-checkout==0.2.0`** ([PyPI](https://pypi.org/project/vonpay-checkout/))
- Matching `error_reporter` keyword arg on `VonPayCheckout(...)`. Snake-case naming (`sdk_version`, `request_id`, etc.) on `ErrorReporterContext` dataclass.
- Reporter exceptions are caught and logged via `logging.warning` on the `vonpay.checkout` logger — same swallow-on-throw posture as Node.
- `_Webhooks` now holds a client reference so `construct_event` / `construct_event_v2` can route to the reporter. Static `verify_signature` is unchanged.
- 8 new pytest cases mirroring the Node coverage (5 webhook-path + 3 HTTP-layer via `httpx.MockTransport` for non-retryable 4xx, retry-exhaust 5xx, query-string stripping). Test count 28 → **36**.
- `User-Agent` header now reflects the SDK version (`vonpay-python/0.2.0`); version is read dynamically from `importlib.metadata` to prevent drift with `pyproject.toml`. New review rule `sdk/python-version-not-hardcoded` codifies this.

**Sample apps** — `samples/checkout-nextjs/` and `samples/checkout-paybylink-nextjs/` ship a commented-out `errorReporter` block in their server-side route handlers showing the Sentry wiring pattern. SDK pin bumped `^0.1.3` → `^0.2.0`. `samples/checkout-express/` had a `"latest"` pin (anti-pattern); now pinned to `^0.2.0`. `samples/checkout-flask/` requirements pinned to `>=0.2.0`.

See [Node SDK → Error reporting](sdks/node-sdk.md#error-reporting) and [Python SDK → Error reporting](sdks/python-sdk.md#error-reporting) for full callback contract + Sentry/Datadog wiring examples.

---

## 2026-04-23 — SDK 0.1.3 (security + quality patch)

All 4 monorepo packages bumped to `0.1.3` in one coordinated cycle. Driven by a post-launch Automata review that surfaced 7 HIGH + 8 MEDIUM findings. Post-fix re-review (code-reviewer + devsec + qa) was green. No runtime crash or data loss in 0.1.2; 0.1.3 tightens the hardening envelope around it.

**`@vonpay/checkout-node@0.1.3`** ([npm](https://www.npmjs.com/package/@vonpay/checkout-node))
- **New:** `webhooks.constructEventV2(payload, signatureHeader, secret)` — opt-in Stripe-strict variant that binds the timestamp into the HMAC payload. Expects header format `t=<unix-seconds>,v2=<hex-sha256>` where `v2 = HMAC(secret, "${t}.${body}")`. Prevents replay of a body with a new timestamp. Backward-compatible: existing `constructEvent` unchanged, and the server only emits v2 when opted in per-merchant.
- `verifySignature` hex regex no longer accepts mixed-case (lowercase-only, matching the wire format). Applies to webhook + v1/v2 return-signature paths.
- `ErrorCode` union: `merchant_not_onboarded` reordered to sit with `merchant_not_configured`, restoring the semantic grouping of the `auth_*` block.
- 45 unit tests (up from 34): Buffer-payload round-trips, the v2 suite, mixed-case reject, ErrorCode catalog coverage.

**`vonpay-checkout==0.1.3`** ([PyPI](https://pypi.org/project/vonpay-checkout/))
- Matching `webhooks.construct_event_v2(payload, signature_header, secret)` with the same Stripe-strict semantics. Parity with Node side, bytes-or-str payload accepted.
- HMAC verification now compares raw bytes (`bytes.fromhex()` against `.digest()`) instead of `.lower()`-folded hex strings — matches Node's `timingSafeEqual` posture.
- `ErrorCode` Literal reordered for `auth_*` grouping symmetry.
- pytest src-layout fixed — tests now actually run (was 0 → **28 pass**). New review rule `sdk/python-pytest-src-layout` codified in the monorepo so it stays fixed.

**`@vonpay/checkout-cli@0.1.3`** ([npm](https://www.npmjs.com/package/@vonpay/checkout-cli))
- `vonpay checkout login <key>` — the warning about shell history exposure now fires BEFORE writing to disk, and passing a **live key** as a CLI argument unconditionally requires `--confirm-cli-exposure`. TTY-detection exemptions removed (pseudo-TTYs in CI are not a reliable signal). Interactive mode (`vonpay checkout login`) is unchanged.
- `vonpay checkout trigger refund.created` — `status` is now `"created"` and `refundId` is populated (previously dropped from JSON serialization due to `undefined`).
- `vonpay checkout init` — `.gitignore` coverage detection now implements full git ordering semantics: `!.env` negations correctly un-ignore, so the safety net fires instead of being silently skipped. New patterns matched: `**/.env`, `*.env`, `**/.env*`, `.env*`. 15 new unit tests.

**`@vonpay/checkout-mcp@0.1.3`** ([npm](https://www.npmjs.com/package/@vonpay/checkout-mcp))
- `create_session` / `get_session` tools reject `javascript:`, `data:`, and `file:` schemes on `successUrl` / `cancelUrl` via an explicit `.refine()`. Zod's `.url()` alone does NOT block dangerous schemes — inline comment in source warns future maintainers.
- `create_session` response projected to `{id, checkoutUrl, expiresAt}` — same safety posture as `get_session` (no metadata leaks into the LLM context).
- Runtime `readFileSync(package.json)` replaced with a `version.ts` constant so the bundled CLI does not depend on package layout at runtime.
- First test file: 6 tests covering tool registration, URL scheme restriction, session-ID regex, simulate_payment marker, and response projection.

### Samples (in the monorepo, not a published package)

- **Flask sample** — XSS fix: `markupsafe.escape()` wraps reflected query params (`status`, `session`) in the `/success` handler. Generic `{"error": "invalid_signature"}` on 401 instead of echoing the internal code. `request.host_url` replaced with `BASE_URL` env var so v2 signed-URL binding works behind proxies.
- **Next.js sample** — `next.config.ts` now ships with CSP, HSTS, X-Frame-Options (`DENY`), X-Content-Type-Options, Referrer-Policy, and Permissions-Policy headers. Merchants copying the scaffold get secure defaults.

### Docs

- Install pins bumped `0.1.2` → `0.1.3` across `quickstart.md`, `sdks/node-sdk.md`, `sdks/python-sdk.md`, `sdks/cli.md`, `sdks/mcp.md`, `sdks/index.md`. CLI + MCP also bumped (were `0.1.0`).

## 2026-04-23 — SDK 0.1.2

**`@vonpay/checkout-node@0.1.2`** ([npm](https://www.npmjs.com/package/@vonpay/checkout-node))
- `ErrorCode` typed union widened from 24 to **27 codes**. Adds `provider_attestation_failed` (403, Vora/Aspire attestation rejection), `provider_charge_failed` (402, terminal charge failure), and `merchant_not_onboarded` (403, live-key creation gate on pre-approval or denied accounts). Strict-mode consumers can now exhaustively `switch` on all three. Backward-compatible.

**`vonpay-checkout==0.1.2`** ([PyPI](https://pypi.org/project/vonpay-checkout/))
- Same `ErrorCode` Literal widening as Node SDK. `mypy` consumers get matching exhaustive-check support for the new codes. Backward-compatible.

E2E smoke test (`/tmp/vonpay-e2e` quickstart typecheck) caught the drift before prod merchants hit it.

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
