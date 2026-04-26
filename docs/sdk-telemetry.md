---
sidebar_position: 9
title: SDK Telemetry
description: What the Von Payments SDKs send when telemetry is enabled, and what they will never send.
---

# SDK Telemetry

> **Last contract update:** 2026-04-25 — `phase-3-sdk-telemetry.md` v2 + `PHASE_3_SDK_DESIGN.md` v2.

Von Payments SDKs (`@vonpay/checkout-node`, `vonpay-checkout` for Python) ship with an **opt-in, off-by-default** telemetry path. When you turn it on, the SDK sends anonymized error metadata to `POST https://checkout.vonpay.com/v1/sdk-telemetry` so we can see SDK-side failures the same way we already see server-side ones.

This page is the **complete, signed contract** of what telemetry transmits. If the SDK ever sends a field that isn't enumerated below, that's a bug — please [open an issue](https://github.com/Von-Payments/vonpay-checkout/issues) and we'll patch it.

---

## TL;DR

- **Default:** off. We never receive telemetry from your SDK unless you opt in explicitly with the literal boolean `true`.
- **What flows:** `error_code`, `operation`, SDK + runtime version, occurrence timestamp, optional retry/HTTP-status counters, and an irreversible SHA-256 hash of our own `X-Request-Id`.
- **What never flows:** payloads, request bodies, response bodies, PII, secrets, stack traces, free-form error messages, hostnames, user agents.
- **Where it lives:** Supabase US (events table), 30-day hard retention, daily rollup retained indefinitely. No third party receives this data.

---

## How to opt in

### Node SDK (≥ 0.4.0)

```ts
import { VonPayCheckout } from "@vonpay/checkout-node";

const vonpay = new VonPayCheckout({
  apiKey: process.env.VONPAY_SECRET_KEY!,
  telemetry: { enabled: true },  // strict: must be the boolean `true`
});
```

### Python SDK (≥ 0.4.0)

```python
from vonpay.checkout import VonPayCheckout

vonpay = VonPayCheckout(
    api_key=os.environ["VONPAY_SECRET_KEY"],
    telemetry={"enabled": True},
)
```

`enabled` is **strict-equality**: `1`, `"true"`, `{}`, or any other truthy value raises `TypeError` at construction. There is no environment-variable override and no implicit activation. The opt-in must appear in your code on a PR a reviewer can see.

### How to opt out

Omit the `telemetry` option entirely, or pass `{ enabled: false }`. The default is off — the only way telemetry runs is if you wrote `enabled: true` yourself.

To stop telemetry on a running instance, you must **reconstruct** `VonPayCheckout`. There is no mid-process toggle.

---

## What we send (every field)

The SDK builds this body for **every error** thrown from a Von Payments API call (`sessions.create`, `sessions.retrieve`) or a webhook helper failure (`constructEvent`, `constructEventV2`):

```json
{
  "sdk_name":     "checkout-node",
  "sdk_version":  "0.4.0",
  "runtime":      "node-20.10.0",
  "error_code":   "validation_invalid_amount",
  "operation":    "sessions.create",
  "request_id_hash": "f3a7b2c9...e84d (64-char hex)",
  "occurred_at":  "2026-04-25T22:37:49.123Z",
  "context": {
    "retry_count": 2,
    "http_status": 400
  }
}
```

Field-by-field guarantees:

| Field | Contents | Constraint |
|---|---|---|
| `sdk_name` | `"checkout-node"` or `"checkout-python"` for shipped SDKs | Hard-coded in the SDK; no user input touches it. The server's closed enum also reserves `"checkout-php"` and `"checkout-ruby"` for future SDKs that have not yet shipped — no integrator should ever see those values in their telemetry until those packages are published. |
| `sdk_version` | The published SDK semver (`0.4.0`, `1.2.0-rc.1`) | Pre-validated against `^[0-9]+\.[0-9]+\.[0-9]+(-[a-z0-9.]+)?$`; if your installed version doesn't match, telemetry self-disables on that instance |
| `runtime` | `node-{process.versions.node}` or `python-{platform.python_version()}` | Pre-validated against `^[a-z][a-z0-9._+-]{0,62}$`; if it doesn't match, telemetry self-disables |
| `error_code` | A member of our [error-code catalog](reference/error-codes) | Closed enum; non-`VonPayError` throws are skipped (no catalog code → no telemetry) |
| `operation` | One of `"sessions.create"`, `"sessions.retrieve"`, `"webhooks.constructEvent"` | Closed enum; operations outside this list are silently skipped. The server reserves `"webhooks.verifySignature"` in its enum for future use, but the SDK never sends it — `verifySignature` returns a boolean and does not throw, so there is no error path to telemetrize. |
| `request_id_hash` | SHA-256 hex of the `X-Request-Id` header from our own response | One-way hash; **omitted entirely** for local-only failures (e.g. webhook HMAC mismatch) where no request ever reached our server |
| `occurred_at` | ISO 8601 UTC, millisecond precision | Server rejects anything outside ±5 minutes of its own clock |
| `context.retry_count` | Attempt number for the failed call (0-indexed) | Optional; integer 0..10 |
| `context.http_status` | HTTP status code if the failure came from our server | Optional; integer 0..599 |

If `context.*` is fully empty, the field is omitted. Total body size is capped at **2048 bytes** before send; events that exceed it are dropped client-side.

### About `request_id_hash`

The hash is one-way. We can't reverse it back to a request id. We hash to give engineering a correlation key for triage: if you open a support ticket and share an `X-Request-Id`, we hash the value you sent and look it up in telemetry. Without that lookup path we'd have nothing to join on; with the raw `request_id` we'd have a JOIN-key directly into encrypted buyer PII rows. The hash is the privacy-preserving middle ground.

For SDK helpers that fail locally (`constructEvent` / `constructEventV2` HMAC mismatch — the request never reached our server), there is no `X-Request-Id` to hash, so the field is omitted. Server schema marks it optional.

---

## What we never send

This contract describes **the telemetry POST body** sent to `https://checkout.vonpay.com/v1/sdk-telemetry`. The SDK is structurally incapable of sending the following — there is no code path that constructs them, and the server's `.strict()` schema would reject them anyway:

- ❌ Request bodies, response bodies, headers
- ❌ PII (buyer email, name, IP, billing address, phone)
- ❌ Secret prefixes (`vp_sk_*`, `vp_pk_*`, `ss_*`, `whsec_*`, `sk_*`, `pk_*`) — see "Local scrub" below
- ❌ Stack traces
- ❌ Raw error messages or `err.message` text — only the catalog `error_code`
- ❌ Hostnames, IP addresses, URLs from your infrastructure
- ❌ Free-form context fields beyond the enumerated `context.*` numerics
- ❌ User-Agent strings beyond the standardized `runtime` field
- ❌ Telemetry on success paths — only thrown errors trigger a send

> **Scope note.** This contract covers what the telemetry POST sends to Vonpay. The SDK's *own* default-reporter log line (a `console.warn` / `logging.warning` written into your local logs when no `errorReporter` is configured) is a separate surface — it includes `err.message`, the raw `X-Request-Id`, and the structured context summary so you can debug locally. That log line stays in your infrastructure and never crosses the wire to Vonpay. If you want fully structured local logging without `err.message`, configure the [`errorReporter` callback](sdks/node-sdk#error-reporting) and emit only the fields you choose.

### Local scrub (defense-in-depth)

Before send, the SDK walks every string field of the body against this regex blocklist:

```
vp_(sk|pk)_(live|test)_[a-z0-9]+        Vonpay API keys
ss_(live|test)_[a-z0-9]+                 Vonpay session signing secrets
whsec_[a-z0-9]+                          Stripe webhook secrets
sk_(live|test)_[a-z0-9]+                 Stripe API keys
pk_(live|test)_[a-z0-9]+                 Stripe publishable keys
[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}    Email addresses
```

If **any** field matches **any** pattern, the entire event is **dropped** — not redacted. Drop-not-redact is intentional: a hit on this blocklist means the SDK has a bug, and silently masking the leak would hide it. The SDK logs a one-time warning on the first drop and asks you to report the bug to support@vonpay.com.

The same regex set runs server-side as a `beforeSave` belt-and-suspenders. If a sensitive value somehow reaches the server, the row is dropped and Sentry alerts engineering.

---

## How telemetry behaves on the wire

- **Endpoint:** `POST https://checkout.vonpay.com/v1/sdk-telemetry`
- **Auth:** `Authorization: Bearer {your secret key}` — same key you already use for `/v1/sessions`. Publishable keys are rejected.
- **API version pin:** `Von-Pay-Version: 2026-04-14`
- **Timeout:** 5 seconds
- **Retries:** none — single attempt, fire-and-forget
- **Fire-and-forget:** the SDK does not `await` the POST; your API call's latency is not affected
- **Rate limit (server):** 30 events per minute per API key. On `429`, the SDK pauses for 60 seconds and drops the next 30 events.
- **On `5xx` or network error:** silent drop. No retry pressure on our origin. A one-time console warn fires per SDK instance the first time it happens.

### What you'll see in your logs

When you opt in, the SDK prints **once per `VonPayCheckout` instance**:

```
[vonpay] Telemetry enabled. Anonymized error metadata sent to vonpay.
         Disable: telemetry: { enabled: false }
         What we send: https://docs.vonpay.com/sdk-telemetry
```

Subsequent telemetry-related warnings are also one-time per instance:

| First time | Message |
|---|---|
| Server returns `400` | `[vonpay] telemetry: 400 from server. Likely SDK schema drift OR clock skew (server requires occurred_at ±5min of UTC; check NTP).` |
| Server returns `401` | `[vonpay] telemetry: 401 unauthorized. Check API key matches the merchant's account.` |
| Server returns `5xx` | `[vonpay] telemetry: server unavailable; events dropping silently.` |
| Network error / timeout | `[vonpay] telemetry: network/timeout. If you're behind a corporate firewall, allowlist checkout.vonpay.com:443.` (See [Firewall](#firewall) below.) |

These logs cannot be suppressed — opting in implies seeing what you opted into.

### Authorization disclosure

The telemetry POST uses your secret key in `Authorization: Bearer`. The key value:

- Never appears in the request body
- Never appears in any console.warn line
- Is hashed (SHA-256) by our auth layer before any audit row is written; the raw bearer token is not retained

This is the same posture as every other Von Payments API call. We're calling it out explicitly here because telemetry is opt-in, and opt-in implies full transparency about every byte that crosses the wire.

---

## Serverless caveat {#serverless}

If you opt in from a Vercel function, AWS Lambda, or similar freeze-on-exit runtime, the SDK detects this (via `process.env.VERCEL` / `process.env.AWS_LAMBDA_FUNCTION_NAME`) and prints a second one-time warning:

```
[vonpay] Telemetry detected serverless runtime (VERCEL / AWS_LAMBDA).
         Fire-and-forget POSTs may drop on function freeze.
```

Telemetry is best-effort by design — we intentionally don't `await` the POST so your function's response isn't delayed. On freeze-on-exit runtimes, that means some events won't be delivered. We accept this trade-off rather than block your code on a network call to us. If you want guaranteed delivery, wire your own observability via [Phase 2's `errorReporter` callback](sdks/node-sdk#error-reporting) — that one runs synchronously in your function's lifecycle.

---

## Firewall {#firewall}

Telemetry sends to `checkout.vonpay.com:443` (the same host as every other Von Payments API call). If your egress firewall already permits `/v1/sessions`, telemetry works. If it doesn't, you'll see the network-error warning above; allowlist `checkout.vonpay.com:443` to fix.

---

## Storage and retention

Telemetry events live in two tables in our Supabase US database:

| Table | Contents | Retention |
|---|---|---|
| `sdk_telemetry_events` | One row per error event (the schema above) | **30 days hard cap** — daily cron deletes rows older than 30d |
| `sdk_telemetry_daily` | Aggregated daily counts per (day, sdk, version, error_code) | **Indefinite** — no PII or merchant attribution surfaces externally |

Both tables have row-level security enabled and are not exposed to `anon` or `authenticated` Supabase roles. Only Von Payments engineering reads from them.

### Public surface (`/sdk-status`)

We plan to publish a public health surface at `docs.vonpay.com/sdk-status` showing aggregate trends — most-common error codes per SDK version, regression detection across releases. **The public surface is merchant-attribution-free.** The `merchant_id` column exists in our internal triage view but is never SELECTED into any query that backs an externally exposed aggregate. Aggregate queries `SUM` over (day, sdk, version, error_code) and drop the merchant dimension at the query layer.

---

## Subprocessors

Telemetry data is processed by:

| Subprocessor | Purpose | Region |
|---|---|---|
| **Supabase** | Database (events + rollup tables) | US |
| **Railway** | API server hosting (`/v1/sdk-telemetry` endpoint) | US |
| **Sentry** | Server-side scrub-violation alerting (zero PII; only fires on SDK bugs) | US |

This is the same subprocessor list as the rest of the Von Payments platform — no third party receives telemetry that doesn't already process the rest of your data.

---

## Legal basis

We process SDK telemetry under **GDPR Article 6(1)(f)** — legitimate interest, specifically SDK quality engineering. The fields enumerated above are the minimum data needed to triage SDK-side failures (data minimization per **Article 5(1)(c)**).

We don't sell, share, or use this data for purposes other than SDK quality engineering. Specifically, we will not:

- Use it for marketing, sales, or product targeting
- Share it with any party outside the subprocessor list above
- Train machine-learning models on it
- Aggregate it across merchants in any externally-visible way

If you're an EEA / UK data controller and want a Data Processing Addendum that names this telemetry surface, contact support@vonpay.com.

---

## Contract drift prevention

Adding any new field to the telemetry schema requires:

1. Updating this page (you'd see the change in your `docs.vonpay.com` git history)
2. A **minor-version bump** of the SDK (e.g. `0.4.x` → `0.5.0`) — never a patch
3. Updating the canonical contract at `vonpay-checkout/docs/_design/phase-3-sdk-telemetry.md`
4. Updating the OpenAPI spec at `checkout.vonpay.com/openapi.yaml`

If we ever ship a patch release that adds a field — and a public-doc page hasn't moved — that's a contract violation we want to know about. Please report it.

### Signed contract version

```
Document:        docs.vonpay.com/sdk-telemetry
Contract source: vonpay-checkout/docs/_design/phase-3-sdk-telemetry.md v2
SDK source:      vonpay/packages/checkout-node/PHASE_3_SDK_DESIGN.md v2
Schema fields:   sdk_name, sdk_version, runtime, error_code, operation,
                 request_id_hash (optional), occurred_at, context.retry_count,
                 context.http_status
Last reviewed:   2026-04-25
SDKs at this contract: @vonpay/checkout-node ≥ 0.4.0, vonpay-checkout ≥ 0.4.0
```

The git history of this page (`vonpay-docs/docs/sdk-telemetry.md`) is the audit trail. Every change to what telemetry transmits is a commit you can read.

---

## Frequently asked

**Why opt-in instead of opt-out?**
Privacy posture. The default-off, strict-`=== true` activation gate means we never receive telemetry from an integrator who hasn't read this page. Opt-out designs leak data from people who didn't realize they were running it.

**Will you ever change the default to opt-in?**
No. The hard-coded gate is `=== true`. Changing it would require an SDK major-version bump and would be called out in the changelog and on this page.

**What about the `errorReporter` callback (Phase 2)?**
That's a separate feature, also opt-in. It runs your code with a structured error event so you can wire your own observability (Sentry, Datadog, etc.). **Nothing flows to Von Payments via `errorReporter`.** It and `telemetry` are two sides of the same problem: you can choose neither, either, or both. See the [Node SDK reference](sdks/node-sdk#error-reporting).

**Can a transitive dependency turn on telemetry without me knowing?**
Yes — if a library you depend on constructs `VonPayCheckout({ telemetry: { enabled: true } })` inside its own code, your top-level code never mentions `enabled`. The constructor-time warn (`[vonpay] Telemetry enabled.`) is your only runtime signal. We accept this risk — it's intrinsic to any opt-in telemetry design — but flag it here so you know to grep your `node_modules` if a dep ever surprises you.

**Does enabling telemetry slow down my API calls?**
No. The POST is fire-and-forget — your call returns the moment the SDK has the response from our `/v1/sessions` endpoint. The telemetry POST happens on a background microtask (Node) or thread (Python).

**Does telemetry recurse — does failed telemetry generate more telemetry?**
No. The Telemetry module's own response handling (`400`, `401`, `5xx`, network errors) uses bare `console.warn`. It never invokes the integrator's `errorReporter` callback or its own `record()` method. Telemetry-on-telemetry-on-telemetry is structurally impossible.

**What if my system clock is off?**
The server requires `occurred_at` to be within ±5 minutes of its own UTC clock. If your clock has drifted further, you'll see the `400` warn above. Run NTP. (Cloud VMs almost always sync NTP automatically; the `400` typically means a containerized clock has frozen.)

---

## Changelog

| Date | Change |
|---|---|
| 2026-04-25 | Initial publication. SDK contract v2 (Node + Python @ 0.4.0). |
