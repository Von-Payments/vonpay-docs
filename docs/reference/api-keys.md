---
sidebar_position: 8
---

# API Key Types

## Self-service vs. gated issuance

<a id="live-key-gate"></a>

Key issuance depends on mode:

- **Test keys (`vp_sk_test_*`, `vp_pk_test_*`, `ss_test_*`) — fully self-service.** Sign up at `app.vonpay.com` with your email, click **Create sandbox** at `/dashboard/developers`, and your test keys are issued in seconds — no ops-side approval queue. A sandbox merchant record is seeded automatically with a `mock` gateway so you can create and route test sessions immediately.
- **Live keys (`vp_sk_live_*`, `vp_pk_live_*`, `ss_live_*`) — gated behind merchant application approval.** You must complete onboarding and have your merchant application approved (KYC + contract) before live-mode keys can be generated. Contact Von Payments to start the merchant onboarding process. Requesting live keys on an un-approved account (`merchants.status ∈ { pending_approval, denied }`) returns **`403 merchant_not_onboarded`** with a `fix` string pointing back to the onboarding flow. See [Error Codes → `merchant_not_onboarded`](error-codes.md#merchant_not_onboarded).

## Key types at a glance

| Key | Prefix | Where to use it | Rotation |
|---|---|---|---|
| **Test secret key** | `vp_sk_test_` | Server-side code, test mode only | 24h grace |
| **Live secret key** | `vp_sk_live_` | Server-side code, production only | 24h grace |
| **Test publishable key** | `vp_pk_test_` | Browser-exposed client code, test mode only | 24h grace |
| **Live publishable key** | `vp_pk_live_` | Browser-exposed client code, production only | 24h grace |
| **Session secret** | `ss_test_`, `ss_live_` | Server-side verification of return redirects | Rotated with the merchant signing key |

The `ss_*` prefix is the format Von Payments uses when provisioning the secret. **Always use the session secret provided by Von Payments in the dashboard verbatim** — do not generate your own. The checkout runtime does not enforce a minimum key length, so a short or predictable secret enables signature forgery. Copy-paste from `/dashboard/developers/api-keys` and store in a secret manager.

Webhook signing secrets (`whsec_*`, launching with Webhooks v2) are **separate** — see [Webhook Signing Secrets](../integration/webhook-secrets.md).

## Secret vs publishable — when to use which

- **Secret keys (`vp_sk_*`)** can create sessions, retrieve session status, and do everything through the API. Never expose them to a browser or mobile app.
- **Publishable keys (`vp_pk_*`)** are safe to embed in client code. They can initialize the drop-in `vonpay.js` widget but cannot retrieve session details or perform server-authorized actions.

The SDK validates the key prefix at construction time and rejects wrong-type usage (e.g. `sessions.get()` with a publishable key returns `auth_key_type_forbidden`).

## Rotation grace

When you rotate a secret or publishable key, the old key stays valid for **24 hours** (`grace_ends_at = NOW() + 24h`). This window lets you deploy the new key without downtime. After the grace window, the old key rejects with `auth_invalid_key`.

### Rotation timeline

| t = | State |
|---|---|
| t0 | Click *Rotate* in `/dashboard/developers/api-keys`. New key is created; old key enters grace. |
| t0 | UI shows the raw value of the new key **once**. Copy it to your secret manager immediately. |
| t0 → t0+24h | Both keys accepted. Deploy the new key across all your services during this window. |
| t0+24h | Old key rejects with `auth_key_expired` (HTTP 401). Grace ends. |

Rotating while the previous grace is still active is allowed — the oldest key deactivates immediately, not at the next 24-hour mark. Plan for one rotation per 24 hours.

### Compromise — skip the grace

If a key is exposed (leaked to a public repo, screenshot, shoulder-surf, etc.), **do not** initiate a normal rotation. Grace would keep the compromised key working for another 24 hours.

Instead, from `/dashboard/developers/api-keys`:

1. Click *Revoke* on the compromised key (not *Rotate*). This sets `grace_ends_at = NOW()` — old key rejects on the next request.
2. Create a fresh key.
3. Rotate deployed services to the fresh key.
4. Ops (us) will also flag the key in the classifier so downstream audit logs show the revocation.

### Rotation-badge states (dashboard)

The `/dashboard/developers/api-keys` UI shows a badge on each key reflecting its rotation state. Useful when you're debugging why a deploy is still getting `auth_invalid_key` somewhere:

- **Active** — the primary key, created or rotated-into most recently.
- **Grace: ends in &lt;N&gt;h** — previous primary, still accepted until `grace_ends_at`.
- **Revoked** — manually revoked via *Revoke*. Will never accept again.
- **Expired** — grace window passed naturally.

If a live-mode service suddenly starts emitting `auth_invalid_key` after a rotation, check the badge on the key that service is configured with. "Expired" means you missed the 24-hour window for at least one deploy.

## Expiry behavior

API keys do not have a baked-in TTL — they stay **Active** until rotated or revoked. The only paths to expiry are:

- **Normal rotation** → previous key enters 24-hour grace → expires at `grace_ends_at`.
- **Revoke** → immediate expiry.
- **Merchant deactivation** → all keys immediately reject with `auth_merchant_inactive` (401). This is separate from per-key expiry.
- **Manual rotation forced by ops** — e.g. response to a breach report. Shows the same *Revoked* badge.

The classifier that validates inbound keys reads from a Postgres-backed cache with a ~15-second worst-case refresh interval after a dashboard rotation. A freshly-rotated key is almost always live instantly; if you see a brief window of rejection right after clicking *Rotate*, wait 15 seconds and retry before escalating.

## Related

- [Webhook Signing Secrets](../integration/webhook-secrets.md) — per-subscription secrets, different lifecycle
- [Security](./security.md)
- [Error Codes — `auth_*`](./error-codes.md)
