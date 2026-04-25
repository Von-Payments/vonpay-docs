---
sidebar_position: 8
---

# Troubleshooting

When the SDK throws or an API call returns a non-2xx, the response carries a structured `code` you can branch on. This page is the **self-diagnose recipe** for the codes you'll hit most often. Each entry is structured so an LLM agent can also parse it directly: cause, ranked likely sources, exact command to run, when to escalate.

> **Tip:** Most issues self-diagnose by running `vonpay checkout doctor` (CLI) or by reading `error.llmHint` on the SDK exception. If you're an AI agent, see [For AI agents](#for-ai-agents) below.

## How to read this page

Every entry lists:
- **What it means** — the contract this code expresses
- **Likely causes** — ranked by frequency in real integrations
- **Diagnose with** — the exact command or check that resolves the cause
- **Next action** — `fix_input` / `rotate_key` / `wait_and_retry` / `contact_support` / `ignore`
- **Retryable** — whether retrying the same call may succeed
- **Escalate when** — the signal that says "this isn't a code-fix; ask support"

---

## `auth_invalid_key` — HTTP 401

**What it means:** The API key is malformed or does not exist in our auth registry.

**Next action:** `rotate_key` &nbsp;·&nbsp; **Retryable:** no

**Likely causes (ranked):**

1. **Env var unset or misnamed.** Check `VON_PAY_SECRET_KEY` in your environment. The SDK looks here by default.
2. **Key has rotated past its 24h grace.** A previously-valid key was rotated and the grace window expired. The old key is permanently dead.
3. **Test/live mismatch.** A `vp_sk_test_*` key is hitting `checkout.vonpay.com` (live) or vice versa. Test keys only work in sandbox.

**Diagnose with:**

```bash
# Confirm the env var is set and readable
vonpay checkout doctor

# Check the key's age + grace state in the dashboard
open https://app.vonpay.com/dashboard/developers/api-keys
```

**Escalate when:** `vonpay doctor` shows the key prefix correctly + matches the mode of the URL you're hitting + the dashboard shows the key as **Active**, AND you still get `auth_invalid_key`. That's an auth-service issue.

---

## `auth_key_expired` — HTTP 401

**What it means:** A key was rotated and the previous key has passed its 24-hour grace window.

**Next action:** `rotate_key` &nbsp;·&nbsp; **Retryable:** no

**Likely causes:**

1. **A deploy missed the rotation.** A service is still configured with the old key. Find the deploy and update it.
2. **Multiple rotations within 24h** — when you rotate while a previous grace is still active, the oldest key deactivates immediately. If you rotated twice within 24h, the very first key is already dead.

**Diagnose with:**

```bash
# Check rotation badges in the dashboard
open https://app.vonpay.com/dashboard/developers/api-keys

# Find services still using the old key
grep -rn "vp_sk_" --include="*.env*" .
```

**Escalate when:** All of your services are on the active key but you're still getting `auth_key_expired`. That implies a propagation issue with the auth-cache service.

---

## `auth_merchant_inactive` — HTTP 401

**What it means:** The merchant account is disabled or suspended.

**Next action:** `contact_support` &nbsp;·&nbsp; **Retryable:** no

**Likely causes:**

1. **Account suspension.** Either by ops (compliance / chargeback issues) or by the merchant themselves.
2. **Sandbox merchant in `pending_approval` state hitting live.** Test keys are scoped to sandbox merchants regardless of mode.
3. **`merchants.status` is `denied` or `deleted`.**

**Diagnose with:**

```bash
# Confirm via doctor whether the merchant id resolves
vonpay checkout doctor

# Check current merchant status (if you have dashboard access)
open https://app.vonpay.com/dashboard
```

**Escalate when:** Always escalate on this code unless it's a brand-new sandbox account waiting for the auto-activation grace. Merchant status changes are an ops surface, not a code surface.

---

## `merchant_not_onboarded` — HTTP 403

**What it means:** Live keys are gated behind merchant application approval. The merchant hasn't completed KYC + contract review.

**Next action:** `contact_support` &nbsp;·&nbsp; **Retryable:** no

**Likely causes:**

1. **Trying to create live keys before onboarding completes.**
2. **Live API call with a merchant in `pending_approval`.**

**Diagnose with:** Look at `app.vonpay.com/dashboard` — the dashboard banner will tell you exactly which onboarding step is missing.

**Escalate when:** Onboarding is documented complete but live keys are still gated. That's an operational glitch.

---

## `webhook_invalid_signature` — HTTP 401

**What it means:** The HMAC signature on a webhook does not match what we computed.

**Next action:** `fix_input` &nbsp;·&nbsp; **Retryable:** no (don't retry; fix the verifier)

**Likely causes (ranked):**

1. **Wrong secret.** The SDK expects your **API key** (`vp_sk_*`) as the HMAC secret — there is no separate webhook secret. (Webhooks v2 changes this; until then, API key.)
2. **Body was JSON-parsed before HMAC.** You must hash the **raw bytes** of the request body, not the re-stringified JSON. Different JSON serializers normalize whitespace differently and produce different signatures.
3. **Timestamp outside the ±5-minute replay window.** Check your server clock against NTP.

**Diagnose with:**

```typescript
// Node — log what's reaching your verifier
const rawBody = await req.text(); // NOT req.json()
console.log("body length:", rawBody.length);
console.log("signature header:", req.headers.get("x-vonpay-signature"));
console.log("timestamp header:", req.headers.get("x-vonpay-timestamp"));
console.log("body first 80 chars:", rawBody.slice(0, 80));
```

```python
# Python (Flask/FastAPI) — same shape
raw_body = request.get_data()  # NOT request.get_json()
print(f"body length: {len(raw_body)}, sig: {request.headers.get('X-VonPay-Signature')}")
```

**Escalate when:** You're computing the HMAC correctly (verified against our [reference implementations](integration/webhook-verification.md#code-examples) byte-for-byte), the secret is the right key, the timestamp is fresh, and verification still fails. That's a delivery-engine bug.

---

## `validation_invalid_amount` — HTTP 400

**What it means:** The amount field is not a positive integer or exceeds maximum.

**Next action:** `fix_input` &nbsp;·&nbsp; **Retryable:** no (fix the input)

**Likely causes (ranked):**

1. **Sending major units instead of minor units.** `14.99` for $14.99 is wrong; it must be `1499`. Float-rounding errors compound.
2. **Negative or zero.** Even `0` is invalid — Von Payments requires a positive integer.
3. **Locale/currency mismatch.** JPY has no minor units (just `1499` for ¥1499). KWD has 3 (`1499000` for KWD 1,499.00).

**Diagnose with:**

```javascript
// Confirm you're sending minor units
console.log("amount type:", typeof params.amount, "value:", params.amount);
// MUST be a positive integer; for $14.99 → 1499; for ¥1499 → 1499; for KWD 1.499 → 1499
```

**Escalate when:** Never. This is always a code fix on the integrator side.

---

## `validation_error` / `validation_missing_field` — HTTP 400

**What it means:** Request body failed schema validation.

**Next action:** `fix_input` &nbsp;·&nbsp; **Retryable:** no

**Likely causes:** Missing required fields, wrong types, malformed strings (non-ISO-4217 currency, non-ISO-3166 country, etc.).

**Diagnose with:** The error message names the failing field. For example: `"Expected number, received string at \"amount\""` — the fix is to coerce that field to a number.

**Escalate when:** Never. Always a code fix.

---

## `merchant_not_configured` — HTTP 422

**What it means:** The merchant is missing required configuration — payment provider credentials are not bound, the gateway routing is incomplete.

**Next action:** `contact_support` &nbsp;·&nbsp; **Retryable:** no

**Likely causes:**

1. **Sandbox merchant with no mock gateway.** Either Activate Vora Sandbox didn't run cleanly, or the merchant is a non-sandbox primary that was issued test keys without atomic provisioning.
2. **Live merchant whose payment provider configuration was removed by ops.**

**Diagnose with:** This isn't an integrator-side code issue. Capture the `requestId` from the error and surface a "contact your account manager" message.

**Escalate when:** Always. The fix is on the merchant-app or ops side.

---

## `rate_limit_exceeded` / `rate_limit_exceeded_per_key` — HTTP 429

**What it means:** You've exceeded the per-IP (10 req/60s on POST /v1/sessions) or per-API-key (30 session-creates/min) limit.

**Next action:** `wait_and_retry` &nbsp;·&nbsp; **Retryable:** yes

**Likely causes:**

1. **Burst from a single deployment** — usually a retry loop without backoff.
2. **Missing or wrong `Idempotency-Key` causing duplicate creates** that each count against the limit.

**Diagnose with:** Read the `Retry-After` header. Wait that long. Don't retry sooner. The SDK auto-retries with backoff; if you're seeing this surfaced, retries are exhausted.

**Escalate when:** Your legitimate volume needs a higher per-key ceiling. Don't try to work around by rotating keys (creates more problems). Contact support with your projected volume.

---

## `provider_unavailable` — HTTP 502

**What it means:** The upstream payment provider (Stripe Connect, Gr4vy, Aspire) is not responding.

**Next action:** `wait_and_retry` &nbsp;·&nbsp; **Retryable:** yes

**Likely causes:** Upstream provider incident or transient connectivity issue.

**Diagnose with:** [Von Payments status page](https://status.vonpay.com) (when published). Cross-reference with the upstream provider's status page (Stripe / Gr4vy / etc.).

**Escalate when:** Persistent for >10 minutes across multiple sessions and the upstream provider's status is green.

---

## `provider_charge_failed` — HTTP 402

**What it means:** The card was declined or the charge was rejected by the upstream provider.

**Next action:** `ignore` (terminal but expected) &nbsp;·&nbsp; **Retryable:** no

**Likely causes:** Insufficient funds, card blocked, fraud-prevention rejection by the issuer. Buyer-side outcomes — not integration bugs.

**Diagnose with:** Surface the decline UI to the buyer. Do not retry the same payment with the same card.

**Escalate when:** Never on this code — it's the issuer's call. If you're seeing every transaction fail, that's a merchant-config issue (`merchant_not_configured`), not a per-charge decline.

---

## `session_expired` — HTTP 410

**What it means:** The session passed its 30-minute TTL.

**Next action:** `fix_input` (create a new session) &nbsp;·&nbsp; **Retryable:** no

**Likely causes:** Session was created >30 minutes before the buyer attempted to pay.

**Diagnose with:** Create a new session via `sessions.create()` with the original parameters. Sessions cannot be extended.

**Escalate when:** Never.

---

## For AI agents

If you're an AI agent (Claude Code, Cursor, GitHub Copilot, ChatGPT, etc.) reading an SDK error and trying to fix it autonomously, you have two structured surfaces:

### Option 1 — read the error directly

Every `VonPayError` thrown by `@vonpay/checkout-node@>=0.3.0` and `vonpay-checkout>=0.3.0` carries:

```typescript
err.code         // canonical error code, e.g. "auth_invalid_key"
err.retryable    // boolean — whether retrying may succeed
err.nextAction   // "fix_input" | "rotate_key" | "wait_and_retry" | "contact_support" | "ignore"
err.llmHint      // 1-3 sentence diagnostic specific to your code, written for an LLM
err.fix          // human-imperative remediation (less specific than llmHint)
err.docs         // canonical reference URL — this page or sibling
err.requestId    // X-Request-Id for support correlation
```

Branch on `err.nextAction`. The `llmHint` tells you the most-likely root cause and what to actually do.

### Option 2 — invoke the MCP tool

If you're running with `@vonpay/checkout-mcp` loaded, call:

```
vonpay_checkout_diagnose_error({ code: "<error_code>", status?: <int>, requestId?: <string> })
```

Returns the same structured help plus an `agentInstructions` array with branch-table guidance. Pure-data; no API call, no state mutation.

### Option 3 — capture the integrator's environment

Tell the human to run:

```bash
vonpay checkout doctor --for-llm
```

This emits an LLM-readable markdown bundle covering: runtime, env vars present (names only — values never printed), live API health probe, live `sessions.validate` round-trip, hints in priority order. The bundle is **PII-safe** to paste into your context window. Use it to determine which of the three categories applies — missing config / unreachable API / failing validation — and propose specific next steps.

### What you should NOT do

- **Do not retry the same call** when `retryable: false`. The error is deterministic; the next call will fail identically.
- **Do not surface raw API key values** to the human or in your context. The SDK + CLI both redact prefixes; preserve that.
- **Do not invent error codes that aren't in the [error-codes catalog](reference/error-codes.md).** If you see a code you don't recognize, treat it as `contact_support` with a `requestId`.

## Related

- [Error Codes catalog](reference/error-codes.md) — full 27-code reference
- [Webhook Verification](integration/webhook-verification.md) — for `webhook_invalid_signature`
- [API Keys](reference/api-keys.md) — for `auth_invalid_key` / `auth_key_expired`
- [`vonpay checkout doctor`](sdks/cli.md) — the diagnostic CLI command
- [`@vonpay/checkout-mcp` `diagnose_error` tool](sdks/mcp.md) — the MCP tool LLM agents call
