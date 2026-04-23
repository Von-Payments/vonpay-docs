---
sidebar_position: 6
---

# Test Cards

Use these card numbers in test mode to simulate different payment outcomes. Any future expiry date and any 3-digit CVC will work.

These cards work with sandbox merchants boarded on the standard processor sandboxes (Stripe test mode, Gr4vy sandbox, Aspire sandbox — whichever your sandbox merchant routes through).

If your sandbox merchant is on the `mock` gateway instead, outcomes are chosen by session **amount**, not card number — see [Sandbox & Test Mode → Mock gateway](../guides/sandbox.md#mock-gateway--deterministic-outcomes).

## Card Numbers

| Card | Brand | Outcome | Use for |
|------|-------|---------|---------|
| `4242 4242 4242 4242` | Visa | Success | Happy path |
| `4000 0000 0000 0002` | Visa | Decline | Error handling |
| `4000 0027 6000 3184` | Visa | 3DS required | 3D Secure flow |
| `4000 0000 0000 9995` | Visa | Insufficient funds | Specific decline |
| `5555 5555 5555 4444` | Mastercard | Success | Mastercard testing |
| `3782 822463 10005` | Amex | Success | Amex testing |

## Access via MCP

AI agents can retrieve test cards using the `vonpay_checkout_list_test_cards` tool. See [MCP Server](../sdks/mcp.md) for setup.
