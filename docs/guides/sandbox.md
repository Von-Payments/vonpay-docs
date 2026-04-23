---
sidebar_position: 2
---

# Sandbox & Test Mode

Every Von Payments account has a sandbox environment with its own API keys, merchant data, and payment routing. Test-mode keys (`vp_sk_test_*`, `vp_pk_test_*`) only hit the sandbox; live-mode keys (`vp_sk_live_*`) only hit production. They are hard-segregated — a test key cannot accidentally charge a real card.

## Start a sandbox integration in 3 steps

1. **Sign up at `app.vonpay.com`** with your email (OTP login — no ops-side approval queue for account creation).
2. **Provision a sandbox** from `/dashboard/developers` → click **Create sandbox**. This atomically creates a sandbox merchant record, attaches a `mock` gateway config (so sessions route immediately without boarding a real processor), and issues your test keys (`vp_sk_test_*`, `vp_pk_test_*`, `ss_test_*`). Grab them at `/dashboard/developers/api-keys`.
3. **Use a test card** from [Test Cards](../reference/test-cards.md) — `4242 4242 4242 4242` for the happy path, any future expiry, any CVC. Or trigger mock-gateway outcomes by amount: `200¢` for decline, `300¢` for 3DS, `500¢` for timeout, any other amount for approve (see below).

No approval queue for sandbox — you can be creating test sessions within a minute of sign-up. Live keys are separate and require merchant application approval; see [API Keys → Self-service vs. gated issuance](../reference/api-keys.md#self-service-vs-gated-issuance).

## Test-mode behavior

- **Test transactions never touch a real processor.** The `mock` gateway produces synthetic, Stripe-shaped session payloads with deterministic outcomes (see table below).
- **Webhooks still fire.** Point them at [webhook.site](https://webhook.site) (easiest — no local setup) or [ngrok](https://ngrok.com) for a tunnel into your dev machine.
- **Rate limits apply** but are more generous than in production.
- **Data is ephemeral.** Test sessions are purged nightly around 03:00 UTC. Don't rely on a test session ID surviving past the next day.

## Mock gateway — deterministic outcomes

When a sandbox merchant routes through the `mock` gateway, the test outcome is chosen by the session `amount` (in minor units — cents, pence, etc.). This lets you exercise every branch of your integration without juggling test cards.

| Amount | Outcome | Use for |
|---|---|---|
| `200` | **Declined** — `session.failed` with `failure_code: card_declined` | Rendering the decline path in your UI |
| `300` | **3DS challenge required** — session enters `pending_3ds` before resolving | Testing the redirect-through-3DS flow |
| `500` | **Timeout** — no webhook fires; session expires via `session.expired` | Testing timeout handling + webhook-replay idempotency |
| **Any other amount** | **Approved** — `session.succeeded` with a synthetic `transactionId` | The happy path |

These outcomes apply to the `mock` gateway only. Sandbox merchants boarded with a real provider (Gr4vy sandbox, Stripe test mode, Aspire sandbox) respect that provider's own test cards / sandbox rules — see [Test Cards](../reference/test-cards.md).

## Common developer setups

- **Local dev, no public URL:** use [ngrok](https://ngrok.com) → `ngrok http 3000` → paste the forwarding URL as `successUrl` and as your webhook endpoint in the dashboard.
- **Staging environment:** boarding a separate sandbox merchant record (one per environment) keeps webhook noise cleanly segregated. Dashboard → "Create sandbox" per environment.
- **CI integration tests:** call the API with a test-mode key, assert on the deterministic mock outcomes, purge session IDs after the run (or rely on the nightly cleanup).
- **Want real cards on a real processor?** Any sandbox merchant can be re-boarded onto the real processor's sandbox (Stripe test mode, Gr4vy sandbox). You'll get real tokenization without real funds movement.

## Related

- [Test Cards](../reference/test-cards.md) — happy path, declines, 3DS, insufficient funds
- [Quickstart](../quickstart.md) — 5-minute integration walkthrough
- [Go-Live Checklist](go-live-checklist.md) — before flipping to live keys
