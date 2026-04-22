---
sidebar_position: 7
---

# Webhook Signing Secrets

:::info Coming with the Webhooks v2 launch
Full content for subscription-level signing-secret lifecycle (create, view-once, rotate, compromise runbook) lands next Sortie alongside the merchant-app Webhooks UI that creates and rotates subscriptions. This page is a stub so error-code `docs:` URLs resolve.
:::

## Two secrets — not the same thing

Von Payments uses two categories of secret. Don't confuse them.

| Secret | Prefix | What it's for | Rotation |
|---|---|---|---|
| **Merchant API key** | `vp_sk_test_*`, `vp_sk_live_*` | Authorize API calls. Also the HMAC secret for **session-level** webhooks (current). | 24-hour grace period on rotation |
| **Webhook signing secret** | `whsec_*` (Webhooks v2) | HMAC secret for a single merchant-registered webhook **subscription**. | No grace — rotate = new secret immediately, compromise = revoke + create-new + delete-old |

## Session-level webhook secret (current)

For `session.succeeded`, `session.failed`, `session.expired`, and `refund.created` events delivered to the webhook URL on your merchant record, the signing secret **is your merchant API key**. If you rotate the API key, the webhook secret rotates with it.

See [Webhooks](webhooks.md) and [API Keys](../reference/api-keys.md) for details.

## Subscription-level webhook secret (Webhooks v2)

**Coming with Webhooks v2.** When you register a webhook subscription at `/dashboard/developers/webhooks`, Von Payments generates a per-subscription signing secret. You see it **once** at creation time — store it immediately; you cannot retrieve it again.

### Lifecycle (stub — full content next Sortie)

1. **Create** — POST to webhooks endpoint, receive `signing_secret` once in the response.
2. **View-once** — UI shows the raw secret only on the create page; subsequent views show `signing_secret_prefix` only.
3. **Rotate** — issue a new secret, old secret deactivates immediately (no grace — different from API keys).
4. **Compromise** — revoke the subscription entirely, create a new one, delete the old. Do **not** attempt to rotate a compromised secret in place.

## Related

- [Webhook Event Reference](webhook-events.md)
- [Webhook Signature Verification](webhook-verification.md)
- [API Key Types](../reference/api-keys.md)
