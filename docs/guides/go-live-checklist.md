---
sidebar_position: 3
---

# Go-Live Checklist

Work through this list before flipping from test to live keys. Skip no row. If an item doesn't apply, document *why* — auditors (yours and ours) will ask.

## Before you flip to live

### Keys + secrets
- [ ] Swapped `vp_sk_test_*` → `vp_sk_live_*` in every environment you're deploying
- [ ] Swapped `ss_test_*` → `ss_live_*` for return-signature verification
- [ ] Keys stored in a **secret manager** (AWS Secrets Manager, Doppler, 1Password, etc.), not `.env` files in git
- [ ] Key rotation runbook documented on your side — you know which service needs the new key on a 24-hour grace window

### Integration correctness
- [ ] `successUrl` is HTTPS (localhost is test-mode only)
- [ ] Return-signature verification passes `expectedSuccessUrl` and `expectedKeyMode: "live"` for v2 signatures
- [ ] `Idempotency-Key` set on every `POST /v1/sessions` so retries don't create duplicate sessions
- [ ] Error handling covers `auth_*`, `validation_*`, `rate_limit_exceeded`, `session_expired`, `provider_unavailable`

### Webhooks
- [ ] Webhook endpoint is HTTPS
- [ ] Signature verification uses a **constant-time compare**
- [ ] 5-minute timestamp replay window is enforced
- [ ] Handler is **idempotent** — you can receive the same event twice and nothing breaks
- [ ] Handler returns `200` within 30 seconds; heavy work happens asynchronously
- [ ] Failed-delivery monitoring is wired up (pager, dashboard, or both)

### Observability
- [ ] You log `X-Request-Id` from every error response so support tickets can be triaged fast
- [ ] Rate-limit headers (`X-RateLimit-Remaining`, `X-RateLimit-Reset`) surfaced in your metrics

### Merchant account
- [ ] KYC complete, merchant account status is `approved`
- [ ] Bank account verified
- [ ] At least one ops contact in your team has dashboard access

---

## Day-of-launch plan

1. **Cut a release** with only the key swap and any last-minute env-var changes — no unrelated code in the same deploy.
2. **Deploy to a canary** (1 region / 1 instance / 10% traffic) and watch for 30 minutes before full rollout.
3. **Run a smoke test** with a real card: create a session, complete checkout, verify the return redirect, confirm the webhook fires and your handler runs through end-to-end.
4. **Watch Sentry / APM dashboards** for the first hour. Key metrics: `POST /v1/sessions` 2xx rate, webhook handler p95 latency, `auth_*` / `validation_*` / `provider_*` error counts.
5. **Keep the old key active** for the full 24-hour rotation grace. If a forgotten instance still holds it, the deploy continues to work; the rotation UI tells you when it goes cold.

## After launch

- Flip `NODE_ENV=production` on any service still showing `development` — dev middleware loosens error serialization and can leak context.
- Revoke test keys from production secret managers after 48 hours of clean live traffic.
- Subscribe at least two engineers to the Von Payments status page and the webhook-failure notification email.

## If things go sideways

- **High `auth_invalid_key` rate post-flip:** a service is still holding a test key. Check every running pod / function / worker for the stale env var. The 24-hour grace period gives you time — use it.
- **High `provider_unavailable`:** retries with backoff usually clear it. Check [status.vonpay.com](https://status.vonpay.com); page on-call if sustained &gt;5 min.
- **Webhook deliveries stalling:** verify your endpoint is reachable from the public internet (no staging-only VPN); check signature-verification logic against [Webhook Verification](../integration/webhook-verification.md).
- **Unknown error code:** capture the `X-Request-Id` from the response and open a support ticket. Do not retry blindly.

See [Error Codes](../reference/error-codes.md) for every code's HTTP status, cause, and fix.
