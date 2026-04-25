// Browser-side Sentry init for docs.vonpay.com.
//
// Runs as a Docusaurus client module — registered in docusaurus.config.ts via
// `clientModules`. Captures unhandled exceptions + promise rejections during
// docs browsing so we can see when a regression breaks the site for readers.
//
// Phase 1 of the end-user visibility plan filed at bridge 2026-04-25 17:32Z.
//
// Init is gated:
//   - The DSN must be present (build-time env var SENTRY_DSN, exposed via
//     siteConfig.customFields.sentryDsn). When unset, this module no-ops —
//     safe to ship before the Sentry project is provisioned.
//   - Production builds only. Skips on local `docusaurus start` so dev work
//     doesn't generate noise in the Sentry project.
//
// PII scrub via beforeSend: redact secret-shaped strings (vp_sk_*, vp_pk_*,
// ss_*, whsec_*) anywhere they appear in the event payload. A developer
// debugging by pasting a key prefix into the browser console is the most
// likely accidental-PII surface; we redact at the boundary so even if a
// breadcrumb captures it, the upload is sanitized.

import * as Sentry from '@sentry/react';
import siteConfig from '@generated/docusaurus.config';

const SECRET_PATTERNS: Array<[RegExp, string]> = [
  [/vp_sk_(test|live)_[A-Za-z0-9_-]+/g, 'vp_sk_$1_***'],
  [/vp_pk_(test|live)_[A-Za-z0-9_-]+/g, 'vp_pk_$1_***'],
  [/ss_(test|live)_[A-Za-z0-9_-]+/g, 'ss_$1_***'],
  [/whsec_[A-Za-z0-9_-]+/g, 'whsec_***'],
];

function scrubString(input: string): string {
  let out = input;
  for (const [pattern, replacement] of SECRET_PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

function scrubDeep(value: unknown): unknown {
  if (typeof value === 'string') return scrubString(value);
  if (Array.isArray(value)) return value.map(scrubDeep);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = scrubDeep(v);
    }
    return out;
  }
  return value;
}

const customFields = siteConfig?.customFields as
  | { sentryDsn?: string; siteVersion?: string }
  | undefined;
const dsn = customFields?.sentryDsn;
const siteVersion = customFields?.siteVersion;

if (
  typeof window !== 'undefined' &&
  dsn &&
  process.env.NODE_ENV === 'production'
) {
  Sentry.init({
    dsn,
    release: siteVersion,
    environment: 'production',
    tracesSampleRate: 0,
    integrations: [],
    beforeSend(event) {
      return scrubDeep(event) as Sentry.ErrorEvent;
    },
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.message) breadcrumb.message = scrubString(breadcrumb.message);
      if (breadcrumb.data) breadcrumb.data = scrubDeep(breadcrumb.data) as typeof breadcrumb.data;
      return breadcrumb;
    },
    initialScope: {
      tags: { app: 'vonpay-docs' },
    },
  });
}
