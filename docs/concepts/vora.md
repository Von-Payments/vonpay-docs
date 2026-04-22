---
sidebar_position: 1
---

# Vora — Payment Routing

**Vora** is Von Payments' gateway-orchestration layer. It picks the underlying payment processor (Stripe, Adyen, NMI, etc.) at payment time so you don't have to.

**From your perspective as a developer, Vora is transparent.** You always call the same endpoint — `POST /v1/sessions` — and we handle processor selection, failover, and reconciliation. You do not need to know which processor fires a given charge.

## Why it exists

Every merchant on Von Payments is attached to exactly one "entry point" for their payments. That entry point is one of three things:

| Entry point | What happens at payment time |
|---|---|
| **Direct gateway** | We call a single processor directly (e.g. Stripe Connect). No router in between. |
| **Vora router** | We hand the payment to Vora, which internally picks a processor based on cost, geography, and failover rules. |
| **Third-party router** (legacy) | We hand the payment to an external orchestrator (e.g. Gr4vy). |

From your code, all three look identical. `POST /v1/sessions` returns a `checkoutUrl` and the buyer pays on our hosted page.

## What changes in your integration

**Nothing.** Session creation is unchanged, session retrieval is unchanged, return-signature verification is unchanged. Vora is entirely server-side inside Von Payments — none of its state is exposed on the merchant API.

Processor selection state (which processor handled a charge, the processor-side merchant ID, etc.) lives in internal Von Payments systems and surfaces only to merchants through the Dashboard and Ops tooling — not through the public API.

## What you don't need to do

- Choose a processor. Vora does that.
- Handle processor-specific failure codes. The SDK normalises errors into a single `VonPayError.code` union.
- Build any failover logic. Vora routes around processor outages for you.
- Change your signed-redirect verification. The return signature is the same regardless of which processor was used.

## When you might care which processor fired

You usually don't. If you need processor-side reconciliation (matching Von Payments transactions against a processor statement) or support escalation context, contact support with your session ID — we can surface the processor-side transaction ID for that specific session. There is no API surface for bulk processor-level reporting on the merchant side today.

## Related

- [Session object](../reference/session-object.md) — field reference
- [How it works](../how-it-works.md) — end-to-end session flow
- [Handle the return](../integration/handle-return.md) — return-URL signature verification
