---
sidebar_position: 7
---

# Webhook Signing Secrets

Von Payments uses **two separate categories** of webhook-signing secret — one that's active today, and one that arrives with Webhooks v2. This page covers both so you can plan your handler logic for either.

## Two secrets — not the same thing

Von Payments uses two categories of secret. Don't confuse them.

| Secret | Prefix | What it's for | Rotation |
|---|---|---|---|
| **Merchant API key** | `vp_sk_test_*`, `vp_sk_live_*` | Authorize API calls. Also the HMAC secret for **session-level** webhooks (current). | 24-hour grace period on rotation |
| **Webhook signing secret** | `whsec_*` (Webhooks v2) | HMAC secret for a single merchant-registered webhook **subscription**. | No grace — rotate = new secret immediately, compromise = revoke + create-new + delete-old |

## Session-level webhook secret (current — use this today)

For session-level events (`session.succeeded`, `session.failed`, `session.expired`, `refund.created`) delivered to the webhook URL on your merchant record, the signing secret **is your merchant API key** (`vp_sk_test_*` in test mode, `vp_sk_live_*` in live mode). There is no separate webhook secret to provision or rotate.

### Key rotation behavior

When you rotate the merchant API key, the webhook secret rotates with it **automatically** — there's only one secret, so there's only one rotation:

| t = | State |
|---|---|
| t0 | Click *Rotate* on the merchant API key. New key is created; old key enters 24-hour grace. |
| t0 → t0+24h | **Both keys accepted** as webhook signing secrets. Webhooks signed during this window may use either — your handler must tolerate both. During the window, Von Payments may sign outbound webhooks with either key (reflecting the merchant's current active key at event emission time). |
| t0+24h | Old key no longer accepts. All new webhooks signed with the new key. |

**Handler implication during rotation:** keep both the old and new API keys loaded in your verifier for 24 hours after rotation. After 24h, remove the old key from your handler env to tighten the verification surface.

See [Webhooks](webhooks.md), [Webhook Verification](webhook-verification.md#section-2--upcoming-format-webhooks-v2), and [API Keys → Rotation grace](../reference/api-keys.md#rotation-grace) for the full picture.

### Compromise path

If a merchant API key is exposed, do **not** rely on the normal rotation grace — that keeps the compromised key working for another 24 hours. Use *Revoke* from `/dashboard/developers/api-keys` instead: it sets the grace end to NOW, so the next webhook signed with the compromised key will reject. Create a fresh key, update your handler env, and redeploy. See [API Keys → Compromise](../reference/api-keys.md#compromise--skip-the-grace) for the full runbook.

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
