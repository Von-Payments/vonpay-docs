---
sidebar_position: 4
---

# Security

## Authentication

API requests use Bearer token authentication:

```
Authorization: Bearer vp_sk_live_xxx
```

- **Test keys** (`vp_sk_test_xxx`) — sandbox only, no real charges
- **Live keys** (`vp_sk_live_xxx`) — production, real payments

Keep your API key secret. If compromised, contact Von Payments to rotate it.

## HMAC Return URL Signatures

When a buyer completes payment and is redirected to your `successUrl`, the URL includes a signature:

```
?session=vp_cs_live_xxx&status=succeeded&amount=1499&currency=USD&transaction_id=txn_abc&sig=a1b2c3...
```

### Algorithm

```
sig = HMAC-SHA256(
  key:  VON_PAY_SESSION_SECRET,
  data: "{session}.{status}.{amount}.{currency}.{transaction_id}"
)
```

### Verification

**Always verify server-side.** The return URL is visible to the buyer and can be modified.

Use `crypto.timingSafeEqual` (or equivalent) to prevent timing attacks:

```typescript
import crypto from "crypto";

function verify(session, status, amount, currency, transactionId, sig, secret) {
  const data = `${session}.${status}.${amount}.${currency}.${transactionId || ""}`;
  const expected = crypto.createHmac("sha256", secret).update(data).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
}
```

## PCI Compliance

Von Payments is **PCI SAQ-A** compliant:

- Card data is entered in a secure iframe hosted by the payment processor
- Card numbers, CVVs, and expiry dates **never touch** Von Payments servers or your servers
- The checkout page's Content Security Policy prevents any script from reading the payment iframe

**You do not need PCI certification** to use Von Payments. By using our hosted checkout, your PCI scope is limited to SAQ-A (the simplest level).

## Data Encryption

| Data | Protection |
|------|-----------|
| Card data | Never stored — entered in processor's iframe |
| Buyer name | AES-256-GCM encrypted at rest |
| Buyer email | AES-256-GCM encrypted at rest |
| API keys | SHA-256 hashed in database |
| Session tokens | Cryptographically random (nanoid) |

## Transport Security

- All API calls require **HTTPS** (localhost exempt in sandbox)
- HSTS header with 2-year max-age
- TLS 1.2+ only

## Security Headers

The checkout page serves these headers:

| Header | Value |
|--------|-------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Content-Security-Policy` | Restrictive policy allowing only required domains |

## Rate Limiting

All API endpoints are rate-limited per IP address. See [Error Codes](error-codes.md) for limits.

## API Versioning

The API uses date-based versioning via the `Von-Pay-Version` header:

```
Von-Pay-Version: 2026-04-14
```

- If omitted, your account's default API version is used
- Pin this header to a specific date to prevent breaking changes when the API evolves
- New versions are announced in the changelog before becoming the default

## Webhook Signature Verification

Session-level webhooks are signed with HMAC-SHA256 using your **merchant API key** as the secret. The signature arrives in the `X-VonPay-Signature` request header (lowercase hex, no prefix):

```
X-VonPay-Signature: a1b2c3d4...
X-VonPay-Timestamp: 2026-04-22T09:30:00.000Z
```

To verify:

1. Read the raw request body (before JSON parsing)
2. Compute `HMAC-SHA256(key: your_api_key, data: raw_body)` and hex-encode
3. Timing-safe compare with the `X-VonPay-Signature` value
4. Reject if `X-VonPay-Timestamp` is more than 5 minutes from now (replay protection)

```typescript
import crypto from "crypto";

function verifyWebhookSignature(rawBody: string, signature: string, apiKey: string): boolean {
  const expected = crypto.createHmac("sha256", apiKey).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
}
```

> **Important:** The webhook signing secret for session-level webhooks is your API key (`vp_sk_live_xxx` or `vp_sk_test_xxx`), not the session signing secret (`ss_live_*` / `ss_test_*`). The session signing secret is only used for return URL signatures.
>
> **Webhooks v2 (merchant-subscribed webhooks, launching)** use a different header format (`x-vonpay-signature: t=<ts>,v1=<hmac>`) and a per-subscription signing secret. See [Webhook Signature Verification](../integration/webhook-verification.md).

## Reporting Vulnerabilities

If you discover a security vulnerability, contact security@vonpay.com.
