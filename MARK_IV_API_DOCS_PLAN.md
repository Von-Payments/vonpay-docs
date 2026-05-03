# Mark IV — API documentation plan

> **Status:** DRAFT — for Wilson review.
> **Filed:** 2026-05-03 (planning artifact, not published).
> **Owning repo:** `vonpay-docs` (this repo).
> **Source plan:** `vonpay-checkout/docs/discrete-lifecycle-plan.md` (re-scoped 2026-05-02).
> **Companion artifact:** `vonpay/MARK_IV_SDK_DESIGN.md` (SDK client signatures).

This document is the docs outline that will land alongside the new `payment_intents` API surface. It is filed *before* the runtime ships so we can land docs the day the API goes live, not 2 weeks later.

---

## 1. Scope reminder (the PCI-out version)

Mark IV is **server-side orchestration, not card custody.** Every payment intent is bound to one payment provider (Stripe, Gr4vy, Spreedly, Aspire) at create time and never moves. We forward calls, normalize responses, own the lifecycle state machine. Providers hold the vault — we never see card data.

This shapes the docs in two important ways:
- **No vault docs.** `POST /v1/tokens` is a thin reference creator that takes a session-tokenized card from the provider; there is no Vault concept page, no token-storage guarantees page, no encryption-envelope explainer.
- **PCI guidance is for our merchants, not us.** Phase 2 compliance pack (separate PR) explains SAQ A vs SAQ A-EP for *integrators*, not Vonpay's compliance posture.

---

## 2. Today's docs surface (what exists)

```
docs/
├── concepts/                concepts pages (vora, etc.)
├── guides/                  integration walkthroughs
├── integration/             integration patterns (express, flask, nextjs samples)
├── platforms/               platform-integrator surface (Mark IV-B Phase 4)
├── reference/               api-keys, error-codes, rate-limits, security, session-object, test-cards, versioning
├── sdks/                    node-sdk, python-sdk
├── how-it-works.md
├── quickstart.md
└── troubleshooting.md
```

Notable: there is **no `docs/api/` directory today.** The current API ref is split across `reference/api.md` (one page) and `reference/session-object.md` (legacy session resource). Mark IV's API surface is bigger than that pattern can hold.

---

## 3. Proposed new structure

```
docs/
└── api/                                  ← NEW directory
    ├── overview.md                       Resource model · ID prefixes · auth · state machine
    ├── payment-intents/
    │   ├── overview.md                   "What is a payment intent" · session vs intent
    │   ├── create.md                     POST /v1/payment_intents
    │   ├── retrieve.md                   GET /v1/payment_intents/:id
    │   ├── list.md                       GET /v1/payment_intents
    │   ├── capture.md                    POST /v1/payment_intents/:id/capture
    │   ├── refund.md                     POST /v1/payment_intents/:id/refunds
    │   └── void.md                       POST /v1/payment_intents/:id/void
    ├── tokens.md                         POST /v1/tokens (reference creator only)
    ├── refunds.md                        Top-level refund resource (read-only mirror)
    ├── capabilities.md                   GET /v1/capabilities — per-merchant matrix
    └── mit/
        ├── overview.md                   Merchant-initiated transactions concept
        └── examples.md                   Recurring · unscheduled · installment patterns
```

Existing `reference/session-object.md` stays — sessions remain supported. Add a top-of-page note: "For new integrations supporting capture / refund / void / MIT, see [Payment intents](../api/payment-intents/overview.md)."

---

## 4. Page-by-page contents

Each page includes: TL;DR · prerequisites · request shape · response shape · errors specific to this op · code examples (Node + Python + curl) · "see also" links.

### `api/overview.md`
- The 6 resources and their Vora ID prefixes (`vpi_*`, `vtk_*`, `vbr_*`, `vrf_*`, `vdp_*`, `vpo_*`)
- Auth: secret keys vs publishable keys (publishable can create intents; only secret can read/capture/refund)
- The `payment_intent` state machine diagram (`requires_action → authorized → captured → succeeded | voided | refunded | failed`)
- API versioning header
- Idempotency key pattern

### `api/payment-intents/overview.md`
- One-paragraph plain-language explanation: "A payment intent represents a single attempt to move money from one buyer to one merchant via one provider."
- **Sessions vs intents** comparison table — when to use which.
- Per-binder dispatch concept: "Vora picks which provider handles the intent at create time. The choice is locked for the life of the intent."
- The state diagram (image + table)
- Glossary anchor: "what does 'capture' mean?" "what does 'void' mean?" — payments-jargon decoder for non-payments engineers.

### `api/payment-intents/create.md`
- Full POST /v1/payment_intents request body (all fields documented)
- The 4 capture_method behaviors: `automatic` (auth+capture in one call) and `manual` (auth only, capture later)
- The 2 payment_method shapes: `{ token: "vtk_..." }` (saved) and `{ session: "sess_..." }` (one-time)
- The MIT object (initiator, reason, original_transaction_id) with a 1-paragraph explainer
- 3DS modes: auto, force, skip
- Response: full intent shape including `provider_resource_id` (for ops escalation)
- Errors specific to create: `validation_error`, `binder_capability_not_supported`, `mit_chain_invalid`, `token_not_found`, `token_revoked`
- Code examples for: charge a saved token, charge a session, auth-then-capture, MIT recurring

### `api/payment-intents/capture.md`
- Partial capture mechanics — example: auth $100, capture $60, intent shows captured=$60 amount_capturable=$40
- Multiple captures NOT supported (confirm with checkout team)
- Errors: `intent_invalid_state_transition`, `intent_already_captured`, `binder_capability_not_supported`

### `api/payment-intents/refund.md`
- Partial refund mechanics — multiple partials supported
- Refund vs void: refund happens after capture, void happens before
- The "transparent reroute" rule (also documented on void.md)
- Errors: `payment_intent_not_found`, `refund_amount_exceeds_captured`

### `api/payment-intents/void.md`
- Auto-routes to refund if intent is already captured (lead with this — it's surprising)
- Otherwise voids the auth at the provider
- Errors: `intent_invalid_state_transition`

### `api/payment-intents/retrieve.md` and `list.md`
- Standard retrieve / list patterns
- List filters: status, created date range, customer, binder
- Pagination: cursor-based (`starting_after`)

### `api/tokens.md`
- "What this is NOT": this is not a vault. We never see the PAN.
- "What this is": you tokenize a card via the provider's iframe (Stripe.js, Gr4vy iframe, etc.), then post the resulting one-time token to `/v1/tokens` to register it as a reusable Vora reference.
- Lifecycle: `active → revoked | expired`
- Errors specific: `token_session_consumed`, `token_invalid_provider`

### `api/refunds.md`
- Top-level read-only mirror — useful for refund webhooks, reconciliation
- Field shape, lifecycle, list filters

### `api/capabilities.md`
- One-paragraph explainer: capabilities differ by binder; this endpoint tells the integrator what to render
- Example response with `supported_operations` matrix
- Capability-driven UI examples (hide "void" button if `void: false`)

### `api/mit/overview.md`
- The plain-English version of MIT — when does a transaction count as MIT
- The 3 reasons explained: `recurring` (subscription), `unscheduled` (account-on-file ad-hoc charge), `installment` (split BNPL-style)
- Why `original_transaction_id` matters (chain validity, dispute defense)

### `api/mit/examples.md`
- Subscription billing — initial charge then monthly recurring
- Account-on-file — buyer saved card during checkout, merchant charges later
- Installment plans — 4 charges at fixed intervals
- Each with code examples in Node + Python

---

## 5. Content I need from checkout to write this

Hard blockers (fully spec-driven, no creative writing fixes them):
1. **Final OpenAPI spec for the new endpoints.** Today's spec covers sessions only. The `vonpay-checkout` Step 10 PR will ship the OpenAPI delta — that's the source of truth for field names, types, examples.
2. **Final error code list** with the new codes. Likely additions listed above; checkout's Step 5 (trust-boundary scrubber) is what decides what gets exposed.
3. **Sample real responses** for every endpoint (sanitized) — for the "Response shape" sections.
4. **The state diagram source** — I'll redraw, but I want the canonical version from the lifecycle-state-machine module to copy from.

Soft asks (helpful, not blocking):
5. Two open questions answered (state-machine partial-refund-zeroes-out + error-mapping fallback) — see `vonpay-checkout/docs/discrete-lifecycle-plan.md` §10.
6. Link to a working sample app exercising the new API surface (probably lives in `vonpay-samples` once shipped).

---

## 6. Sequencing

| When | What I ship |
|---|---|
| **Now (this PR)** | This planning doc. Wilson reviews + approves the structure. |
| **After approval** | Stub all 13 markdown files with TODOs and skeleton headings. Sidebar wiring. Empty pages get a "Documentation coming with the API release" banner. |
| **After checkout Step 3 lands** | First content pass on `overview.md` and `payment-intents/overview.md` — the conceptual pages can land before the routes ship. |
| **After checkout Step 10 lands** | Full content on the 11 endpoint pages. Wire OpenAPI examples. Cross-link from sdks/* pages. |
| **Same day as `@vonpay/checkout-node@0.5.0`** | Publish. Coordinate the announcement. |

---

## 7. Things deliberately NOT in this plan

- Phase 2 compliance pack (PCI SAQ guidance for merchants, BAA, DPA) — separate effort
- Phase 3 PHP/Ruby SDK docs — Mark IV / Track B Phase 3
- Sample app docs in `vonpay-samples` — separate repo
- Migration guide for "moving from sessions to payment intents" — needs runtime data on adoption before we know if this is needed

---

## 8. Sign-off

- [ ] Wilson approves the directory structure (§3)
- [ ] Wilson approves the page-by-page outline (§4)
- [ ] Sequencing approved (§6)

Once signed off, this doc becomes the contract for landing the docs alongside the API. If checkout team's Step 10 lands and any of the field names / endpoints diverge from §3-§4, this doc gets updated first.
