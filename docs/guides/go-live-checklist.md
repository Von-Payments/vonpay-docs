---
sidebar_position: 3
---

# Go-Live Checklist

:::info Full content landing next Sortie
A printable one-pager merchants review before flipping from test to live keys. This stub holds the page URL so the merchant-app `/dashboard/developers` UI can link to it today.
:::

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

Full content — with screenshots, specific decline-rate benchmarks, and support escalation runbook — lands next Sortie.
