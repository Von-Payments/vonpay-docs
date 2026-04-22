---
sidebar_position: 5
---

# API Versioning

Von Payments uses date-based API versioning to ensure backward compatibility while allowing the API to evolve.

## Version Header

Set the `Von-Pay-Version` request header to pin your integration to a specific API version:

```
Von-Pay-Version: 2026-04-14
```

## Default Behavior

If the `Von-Pay-Version` header is omitted, the API uses your account's default version. This is the version that was current when your account was created.

## SDK Pinning

All SDKs accept an `apiVersion` configuration option that sets the version header automatically on every request.

**Node.js:**

```typescript
const vonpay = new VonPayCheckout({
  apiKey: "vp_sk_live_xxx",
  apiVersion: "2026-04-14",
});
```

**Python:**

```python
client = VonPayCheckout("vp_sk_test_...", api_version="2026-04-14")
```

Pin your SDK to a specific version to avoid unexpected behavior when new versions are released.

## Compatibility Policy

**Non-breaking changes** do not require a version bump. These include:

- Adding new optional request parameters
- Adding new fields to response objects
- Adding new event types
- Adding new error codes

**Breaking changes** always result in a new dated version. These include:

- Removing or renaming fields
- Changing field types
- Changing default behavior
- Removing endpoints

## Deprecation Policy

Von Payments commits to a predictable deprecation window so integrations have time to migrate before anything breaks.

### Lifecycle stages

| Stage | What it means for your integration |
|---|---|
| **GA** (general availability) | Fully supported. No action required. |
| **Deprecated** | Still works, but scheduled for removal. A new version number exists; plan to migrate. We emit a `Deprecation:` response header on every affected endpoint. |
| **Sunset** | Endpoint or field responds with `410 Gone` (or returns the replacement value). Deprecated code paths are removed. |

### Timeline guarantees

- **Minimum 6 months** between deprecation and sunset for any endpoint or required request field.
- **Minimum 3 months** between deprecation and sunset for optional fields and response-only fields.
- **Minimum 12 months** before any authentication change (key prefix, signing algorithm, header format).
- **No silent removals.** Every breaking change ships in a dated version and is announced via:
  - The `Deprecation:` and `Sunset:` response headers on affected endpoints
  - Release notes in the changelog
  - Email to the primary contact on every account using the deprecated surface

### Response headers during deprecation

When you call a deprecated endpoint, the response includes:

```
Deprecation: Sun, 15 Nov 2026 00:00:00 GMT
Sunset: Wed, 15 May 2027 00:00:00 GMT
Link: <https://docs.vonpay.com/reference/versioning>; rel="deprecation"
```

- `Deprecation` — when we announced the deprecation (a past date once it's live)
- `Sunset` — when the endpoint stops working (future date; ≥6 months out for required endpoints)
- `Link` — documentation URL describing the replacement

Set `Deprecation: true` monitoring on your HTTP client in production so you find out about deprecations before sunset hits.

### Dated version support

- **Current version** — GA, fully supported
- **Previous version** — GA, fully supported (we keep the last GA version live indefinitely)
- **N-2 and older** — deprecated; minimum 12 months between a version being superseded and being sunset

Pin your SDK to a specific `apiVersion` (see [SDK Pinning](#sdk-pinning)) so a new default version doesn't change behavior for your integration until you explicitly bump.

## Changelog

The full version changelog is maintained at [`openapi/CHANGELOG.md`](https://github.com/nguylabs/vonpay/blob/main/openapi/CHANGELOG.md) in the repository.
