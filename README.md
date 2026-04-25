# Website

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

## Installation

```bash
yarn
```

## Local Development

```bash
yarn start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## Build

```bash
yarn build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

## Deployment

Using SSH:

```bash
USE_SSH=true yarn deploy
```

Not using SSH:

```bash
GIT_USER=<Your GitHub username> yarn deploy
```

If you are using GitHub pages for hosting, this command is a convenient way to build the website and push to the `gh-pages` branch.

## Sentry browser SDK (Phase 1 visibility)

Client-side error capture for `docs.vonpay.com` is wired via `@sentry/react` in `src/sentry-init.ts` — registered as a Docusaurus client module in `docusaurus.config.ts`.

**The init is gated:** when the `SENTRY_DSN` env var is unset at build time, the module no-ops (the SDK stays inert in the bundle, no events captured, no network calls). Safe to ship.

To activate:

1. Provision a Sentry project for `vonpay-docs`. Restrict allowed origins to `https://docs.vonpay.com` to prevent rogue ingestion.
2. Set `SENTRY_DSN` in the Vercel project's environment variables (Production scope).
3. Optionally set `SITE_VERSION` to override the release tag (defaults to `VERCEL_GIT_COMMIT_SHA`).
4. Redeploy. The next production build inlines the DSN; init runs on page load.

**PII scrub:** `beforeSend` and `beforeBreadcrumb` hooks redact `vp_sk_*`, `vp_pk_*`, `ss_*`, and `whsec_*` patterns from event payloads + breadcrumb messages/data before upload. A developer accidentally pasting a key prefix into the browser console gets sanitized before the upload reaches Sentry.

**What's captured:** unhandled exceptions and unhandled promise rejections during docs browsing. `tracesSampleRate: 0` — no performance/transaction monitoring (out of scope for Phase 1).

See `bridge.md` 2026-04-25 17:32Z RESPONSE for the broader visibility plan.
