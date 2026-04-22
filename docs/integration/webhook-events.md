---
sidebar_position: 5
---

# Webhook Event Reference

:::info Coming with the Webhooks v2 launch
This page is a stub for the merchant-configurable webhook subscriptions launching alongside the Webhooks product (Phase 2b of the Von Payments product framework). Full per-event payload schemas, example JSON, and source references arrive next Sortie once the checkout delivery engine ships.

**Today:** session-level webhooks (`session.succeeded`, `session.failed`, `session.expired`, `refund.created`) are documented at [Webhooks](webhooks.md). Those will continue to work — Webhooks v2 adds a richer event catalog on top, not a replacement.
:::

## Event keys (v1 catalog — shape pending checkout delivery engine)

The v1 event catalog shipping with Webhooks v2 exposes 15 keys across three resource families. The canonical list is `lib/webhook-events.ts` in the merchant-app repo; this page will gain one anchor per key with payload schema + example JSON next Sortie.

### Charge events

| Event | Description |
|---|---|
| `charge.succeeded` | A charge completed successfully. Fires after the buyer finishes checkout and the processor settles the charge. |
| `charge.failed` | A charge attempt failed. Includes `failure_code` and `failure_message`. |
| `charge.refunded` | A charge was refunded (full or partial). |

### Payment intent events

| Event | Description |
|---|---|
| `payment_intent.succeeded` | A payment intent reached terminal success. |
| `payment_intent.failed` | A payment intent reached terminal failure. |
| `payment_intent.cancelled` | A payment intent was cancelled before completion. |

### Dispute events

| Event | Description |
|---|---|
| `dispute.created` | A new dispute was opened by the card network. |
| `dispute.won` | A dispute resolved in the merchant's favor. |
| `dispute.lost` | A dispute resolved against the merchant. |

### Application / merchant lifecycle events

| Event | Description |
|---|---|
| `application.approved` | A merchant application was approved. |
| `application.denied` | A merchant application was denied. |
| `merchant.ready_for_payments` | A merchant has completed boarding and is cleared to accept live payments. |

### Payout events

| Event | Description |
|---|---|
| `payout.paid` | A payout was sent to the merchant's bank account. |
| `payout.failed` | A payout attempt failed. |

## Related

- [Webhook Verification](webhook-verification.md) — HMAC-SHA256 verification across languages
- [Webhook Signing Secrets](webhook-secrets.md) — create, view-once, rotate
- [Webhooks (session-level, v1)](webhooks.md) — existing session webhooks that continue to work
