---
sidebar_position: 8
---

# API Key Types

:::info Full content landing next Sortie
This page is a stub so links from merchant-app UI and error responses resolve. Full content — rotation grace semantics, expiry behavior, key-type matrix, and the distinction from webhook signing secrets — ships next Sortie.
:::

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

Full rotation UX — badges, compromise runbook, classifier contract — lands with the next Sortie.

## Related

- [Webhook Signing Secrets](../integration/webhook-secrets.md) — per-subscription secrets, different lifecycle
- [Security](./security.md)
- [Error Codes — `auth_*`](./error-codes.md)
