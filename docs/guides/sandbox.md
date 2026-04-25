---
sidebar_position: 2
---

# Sandbox & Test Mode

Every Von Payments account has a sandbox environment with its own API keys, merchant data, and payment routing. Test-mode keys (`vp_sk_test_*`, `vp_pk_test_*`) only hit the sandbox; live-mode keys (`vp_sk_live_*`) only hit production. They are hard-segregated — a test key cannot accidentally charge a real card.

## Start a sandbox integration in 3 steps

1. **Sign up at `app.vonpay.com`** with your email (OTP login — no ops-side approval queue for account creation).
2. **Provision a sandbox** from `/dashboard/developers` → click **Create sandbox**. This atomically creates a sandbox merchant record, attaches a `mock` gateway config (so sessions route immediately without boarding a real processor), and issues your test keys (`vp_sk_test_*`, `vp_pk_test_*`, `ss_test_*`). Grab them at `/dashboard/developers/api-keys`.
3. **Trigger the outcome you need** by setting the session `amount`: `200` in minor units for a declined charge, any other amount for approved. See the table below.

No approval queue for sandbox — you can be creating test sessions within a minute of sign-up. Live keys are separate and require merchant application approval; see [API Keys → Self-service vs. gated issuance](../reference/api-keys.md#self-service-vs-gated-issuance).

## Test-mode behavior

- **Test transactions never touch a real processor.** The `mock` gateway produces synthetic, Stripe-shaped session payloads with deterministic outcomes (see table below).
- **Webhooks still fire.** Point them at [webhook.site](https://webhook.site) (easiest — no local setup) or [ngrok](https://ngrok.com) for a tunnel into your dev machine. On production, webhook delivery for sandbox sessions requires the Vora delivery flag — currently enabled on `checkout-staging.vonpay.com`.
- **Rate limits apply** but are more generous than in production.
- **Data is ephemeral.** Test sessions are purged nightly around 03:00 UTC. Don't rely on a test session ID surviving past the next day.

## Sandbox outcomes — deterministic by amount

Session `amount` (in minor units — cents, pence, etc.) picks the outcome.

| Amount | Outcome | What your integration should handle |
|---|---|---|
| `200` | **Declined** — `session.failed` webhook with `failureCode: card_declined`; session status → `failed`; signed redirect URL carries `status=failed` | Rendering the decline path in your UI; reading `failureCode` from the webhook payload |
| Any other | **Approved** — `session.succeeded` webhook; session status → `succeeded`; signed redirect URL carries `status=succeeded` | The happy path |

Need to exercise 3DS, issuer-specific declines, timeouts, or other edge cases? Board a real Stripe Connect test-mode account or Gr4vy sandbox onto your merchant — both provide their full test-card catalogs without touching real funds. The checkout-local sandbox deliberately keeps one decline trigger; richer decline simulation belongs with the real processor's sandbox.

## Common developer setups

- **Local dev, no public URL:** use [ngrok](https://ngrok.com) → `ngrok http 3000` → paste the forwarding URL as `successUrl` and as your webhook endpoint in the dashboard.
- **Staging environment:** boarding a separate sandbox merchant record (one per environment) keeps webhook noise cleanly segregated. Dashboard → "Create sandbox" per environment.
- **CI integration tests:** call the API with a test-mode key, assert on the deterministic mock outcomes, purge session IDs after the run (or rely on the nightly cleanup).
- **Want real cards on a real processor?** Any sandbox merchant can be re-boarded onto the real processor's sandbox (Stripe test mode, Gr4vy sandbox). You'll get real tokenization without real funds movement.

## Related

- [Test Cards](../reference/test-cards.md) — happy path, declines, 3DS, insufficient funds
- [Quickstart](../quickstart.md) — 5-minute integration walkthrough
- [Go-Live Checklist](go-live-checklist.md) — before flipping to live keys
