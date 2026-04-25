---
sidebar_position: 5
---

# Platform Integrator Sandbox

You're integrating Von Payments into a platform — a CRM, a cart, an ISV product, an order-management system — and you need a sandbox to develop against. You're **not** a Von Payments merchant. You don't have a business to onboard. You just need test keys and a working API to build a connector.

This page is for you. It explains how to provision a Von Payments sandbox without going through merchant KYC, what you'll get, and how the sandbox lines up with the gateway-adapter pattern most platforms already use for Stripe, NMI, and Authorize.Net.

## Why there's no separate developer signup

Von Payments models three kinds of accounts: **Merchant** (a business accepting payments), **Partner** (a sales referrer earning commission), and **Platform** (a technical integrator earning rev-share). The three are distinct and won't be collapsed.

Today, only the Merchant role has a signup surface. Platform accounts as a top-level concept, OAuth scoping, a connector marketplace, and a rev-share engine are deferred to a future phase — they're not load-bearing until 20+ platforms are live.

Until then, the **merchant-scoped sandbox** is the integrator-onboarding path. You sign up at `app.vonpay.com` like a merchant would, but the dashboard's *Activate Vora Sandbox* CTA short-circuits the business-details collection and provisions you a fully-working sandbox in a single transaction — no KYC, no contract, nothing to wait for. The merchant record you create is a real merchant row in the database, but the UX never asks you to be one.

## What you'll have in under a minute

1. **Sign up at [app.vonpay.com](https://app.vonpay.com)** with your work email. OTP login, no approval queue.
2. From the dashboard, click **Activate Vora Sandbox** (or visit `/dashboard/developers` and click *Create sandbox*).

A single API call on the merchant-app side then atomically:

- Creates a sandbox merchant record (`is_sandbox=true`)
- Attaches a `mock` gateway config so sessions route immediately without boarding a real processor
- Issues your test keys: `vp_sk_test_*`, `vp_pk_test_*`, `ss_test_*`
- Installs the `vora_gateway` trial product

You'll see the keys at `/dashboard/developers/api-keys`. Copy them once — the dashboard shows the raw values immediately after creation.

## What you can do with this sandbox

Everything the public API surface exposes:

- Create sessions (`POST /v1/sessions`)
- Retrieve sessions (`GET /v1/sessions/:id`)
- Receive signed webhooks (`session.succeeded`, `session.failed`, `session.expired`, `refund.created`)
- Verify the signed return redirect on `successUrl`
- Exercise the deterministic sandbox outcome matrix (`amount=200` → `card_declined`; any other amount → approved)

Test transactions never touch a real processor. The mock gateway produces synthetic, Stripe-shaped payloads so your adapter code paths run end-to-end without funds movement.

For the full sandbox-behavior contract, see [Sandbox & Test Mode](sandbox.md). For the deterministic outcome table, scroll to [Sandbox outcomes — deterministic by amount](sandbox.md#sandbox-outcomes--deterministic-by-amount).

## What this sandbox does not do today

- **No 3DS simulation, no issuer-specific declines, no timeouts.** The mock gateway intentionally exposes one decline trigger (`amount=200`). For richer card-acceptance edge cases, board a real Stripe Connect test-mode account or Gr4vy sandbox onto your sandbox merchant. You'll get the full test-card catalog without real funds movement.
- **No multi-tenancy.** Every sandbox merchant is its own row. If you want to simulate ten of your platform's customers integrating with Von Payments, create ten sandboxes (ten free OTP signups). There is no per-platform parent account today.
- **No live keys until merchant approval.** Live-mode keys (`vp_sk_live_*`) are gated behind merchant onboarding (KYC + contract). Your sandbox is fully self-service; live access for *your platform's customers* is each merchant's own onboarding path.

## How this fits the gateway-adapter pattern

Every platform we've talked to (Sticky.io, Konnektive, Limelight, NextCRM, ISV carts) uses the same shape for Stripe / NMI / Authorize.Net integrations: each merchant pastes their per-merchant API keys into a per-merchant gateway-config form on the platform's side. Your platform's connector then calls Stripe (or whichever) using that merchant's key.

Vora fits the same shape. When a merchant of yours wants to use Von Payments:

1. The merchant goes through `app.vonpay.com` → KYC → ops approves → live keys are issued.
2. In your platform's gateway-configuration UI, the merchant selects *Von Payments* from the gateway dropdown.
3. Your form asks for: `vp_sk_live_*` (server-side API key), `vp_pk_live_*` (publishable key), `ss_live_*` (session signing secret), and a webhook endpoint URL on your side.
4. The merchant pastes the values from their Von Payments dashboard.
5. Your adapter calls Vora's API server-to-server with that merchant's key, receives webhooks at the URL the merchant configured, and verifies signatures with the merchant's session signing secret.

**Your sandbox lets you build and test this entire flow without touching a real merchant.** Treat your sandbox keys as a stand-in for a "merchant of yours that happens to be your dev account."

## Going from sandbox to a partnership

Build the connector against the sandbox first. When you're ready to ship it to your platform's gateway dropdown, the next step is a partnership conversation — Von Payments needs to be aware of your platform's connector going live so we can list you, route deal flow from our sales team to merchants who use your platform, and agree on rev-share terms. Reach out through your existing Von Payments contact, or see the partnership-process section on the [Platforms integration spec](../platforms/index.md).

There is no developer-portal review or app-store approval gate. The [Platforms integration spec](../platforms/index.md) is your one-page reference for the API surface, webhook format, idempotency, error catalog, and sandbox matrix; reference adapter implementations in PHP and Node.js will follow.

## Common questions

**Q: I want each of my platform's customers to have their own sandbox to test with. Do I need a "platform account"?**
**A:** No. Today each merchant of yours signs up at `app.vonpay.com` independently — same OTP signup, same Activate Vora Sandbox CTA. Each gets isolated test keys, sandbox merchant data, and webhook routing. Your platform's role is to wire each merchant's keys into your gateway-config form, not to provision the keys yourself.

**Q: My platform's eng team needs production-shape test data, including 3DS challenge flows and edge-case declines.**
**A:** Board a real Stripe Connect test account or Gr4vy sandbox onto your sandbox merchant. The mock gateway is a happy-path demonstrator with one decline trigger (`amount=200`); the real-processor sandboxes are where you exercise the full test-card matrix without moving real funds.

**Q: Can I get long-lived sandbox keys for CI?**
**A:** Yes — sandbox keys do not have a baked-in TTL. They stay active until you rotate or revoke them via `/dashboard/developers/api-keys`. The 24-hour rotation grace described on the [API Keys](../reference/api-keys.md#rotation-grace) page applies to sandbox keys the same way it applies to live ones.

**Q: I built a connector and want to be listed in your docs.**
**A:** That's the partnership conversation above. We'll add `docs.vonpay.com/platforms/{your-platform}` once the partnership is signed.

## Related

- [Sandbox & Test Mode](sandbox.md) — sandbox behavior contract + deterministic outcomes
- [API Keys](../reference/api-keys.md) — key types, rotation, revocation
- [Quickstart](../quickstart.md) — the 5-minute API walkthrough
- [Webhook Verification](../integration/webhook-verification.md) — signature scheme + reference implementations
- [Error Codes](../reference/error-codes.md) — full 27-code catalog, structure of error responses
- [Platforms integration spec](../platforms/index.md) — API surface, webhook format, idempotency, error catalog, sandbox matrix, partnership process
