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

Every response includes a `Von-Pay-Latest-Version` header indicating the most recent version available:

```
Von-Pay-Latest-Version: 2026-04-14
```

## Default Behavior

If the `Von-Pay-Version` header is omitted, the API uses your account's default version. This is the version that was current when your account was created.

## SDK Pinning

All SDKs accept an `apiVersion` configuration option that sets the version header automatically on every request.

**Node.js:**

```typescript
const vonpay = new VonPay({
  apiKey: "vp_key_live_xxx",
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

## Changelog

The full version changelog is maintained at [`openapi/CHANGELOG.md`](https://github.com/nguylabs/vonpay/blob/main/openapi/CHANGELOG.md) in the repository.
