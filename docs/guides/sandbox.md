---
sidebar_position: 2
---

# Sandbox & Test Mode

Every Von Payments account has a sandbox environment with its own API keys, merchant data, and payment routing. Test-mode keys (`vp_sk_test_*`, `vp_pk_test_*`) only hit the sandbox; live-mode keys (`vp_sk_live_*`) only hit production. They are hard-segregated — a test key cannot accidentally charge a real card.

:::info Full content landing next Sortie
Deep-dive walkthrough of the one-click sandbox provisioning flow, `mock` gateway type behavior (deterministic outcomes by amount — 200¢ decline, 300¢ 3DS, 500¢ timeout, else approved), and webhook.site recipes for receiving test events. For now, the minimum you need to start is below.
:::

## Start a sandbox integration in 3 steps

1. **Provision a sandbox** from `/dashboard/developers` → "Create sandbox." The merchant record is seeded with a mock gateway so you can create routable sessions immediately, without boarding a real processor.
2. **Grab your test keys** at `/dashboard/developers/api-keys` (`vp_sk_test_*` and `ss_test_*`).
3. **Use a test card** from [Test Cards](../reference/test-cards.md) — `4242 4242 4242 4242` for the happy path, any future expiry, any CVC.

## Test-mode behavior

- **Test transactions never touch a real processor.** The `mock` gateway produces synthetic Stripe-shaped sessions with deterministic outcomes.
- **Webhooks still fire** — point them at [webhook.site](https://webhook.site) or [ngrok](https://ngrok.com) for a local tunnel while developing.
- **Rate limits apply** but are more generous in test mode.
- **Data is ephemeral.** Test sessions are purged nightly.

## Related

- [Test Cards](../reference/test-cards.md) — happy path, declines, 3DS, insufficient funds
- [Quickstart](../quickstart.md) — 5-minute integration walkthrough
- [Go-Live Checklist](go-live-checklist.md) — before flipping to live keys
