---
sidebar_position: 4
---

# Security

## Authentication

API requests use Bearer token authentication:

```
Authorization: Bearer vp_key_live_xxx
```

- **Test keys** (`vp_key_test_xxx`) — sandbox only, no real charges
- **Live keys** (`vp_key_live_xxx`) — production, real payments

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

## Reporting Vulnerabilities

If you discover a security vulnerability, contact security@vonpayments.com.
