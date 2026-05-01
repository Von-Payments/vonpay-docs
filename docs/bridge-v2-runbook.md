# Bridge Mesh v2 — Activation Runbook

Cutover happened 2026-05-01 ~05:36Z. This runbook lists what's done, what Wilson still needs to do for full activation, and how agents start using v2.

---

## ✅ Done (no action needed)

- **Schema** applied to vonpay-merchant Supabase prod (`fufjpnxwpqawgtgmabhr`) — see `vonpay-merchant/db/migrations/069_bridge_events.sql`. 1 table + 1 health table + 6 enums + 4 triggers + 4 RLS policies + Realtime publication.
- **`@vonpay/bridge-client@0.1.0`** package built + tested + landed on master in vonpay monorepo (PR #4 merged).
- **Cron workflows** committed in vonpay-docs (PR #28 merged): `bridge-regenerate.yml` (daily 00:00 UTC) + `bridge-health-check.yml` (hourly dead-man's switch).
- **First v2 entry** ("Bridge Mesh v2 LIVE") posted directly on prod merchant. Heartbeat fired. Read works.

---

## ⏳ Wilson actions to fully activate (estimated ~10 min)

### 1. Provision 3 GitHub secrets in vonpay-docs repo

Go to: https://github.com/Von-Payments/vonpay-docs/settings/secrets/actions

Add (or update if existing):

| Name | Value | Notes |
|---|---|---|
| `BRIDGE_REGEN_TOKEN` | A new fine-grained PAT | Scope: vonpay-docs only. Permissions: `contents: write` + `pull_requests: write` + `metadata: read`. **Do not reuse `BRIDGE_PARITY_TOKEN`** — that one has read-only sibling-repo access; this one needs write to vonpay-docs only. |
| `SUPABASE_URL` | `https://fufjpnxwpqawgtgmabhr.supabase.co` | Merchant prod project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role secret from Supabase dashboard | Project Settings → API → service_role secret (the one starting with `sb_secret_`). |

After these land, the `bridge-regenerate` workflow can be triggered manually via Actions UI to validate (then it will run nightly automatically).

### 2. Mint per-repo `BRIDGE_WRITER_JWT` secrets (6 repos)

Per-repo JWTs carry the `app_metadata.from_repo` claim that the schema's INSERT trigger enforces.

#### Step 2.1 — Get the JWT secret

Supabase dashboard → vonpay-merchant prod project → Project Settings → API → JWT Settings → **JWT Secret** (the long alphanumeric string, NOT the anon or service_role key).

#### Step 2.2 — Mint 6 JWTs

```bash
cd X:\GitHub\vonpay-merchant
export SUPABASE_JWT_SECRET="<paste from step 2.1>"

for repo in vonpay-checkout vonpay-merchant vonpay-docs vonpay-www vonpay vonpay-samples; do
  echo "=== $repo ==="
  node scripts/mint-bridge-writer-jwt.mjs $repo
  echo ""
done
```

Each output is a long JWT string. Save the 6 outputs separately.

#### Step 2.3 — Distribute as GH secrets

For each repo, go to `https://github.com/Von-Payments/<repo>/settings/secrets/actions` and add:

| Secret | Value |
|---|---|
| `BRIDGE_WRITER_JWT` | The repo-specific JWT from step 2.2 |
| `SUPABASE_URL` | `https://fufjpnxwpqawgtgmabhr.supabase.co` |

The `BRIDGE_WRITER_JWT` is unique per repo (each carries that repo's `from_repo` claim); the URL is the same.

### 3. (Optional) Verify activation

Run the regen workflow manually in vonpay-docs Actions UI. It should:
- Pull the v2 entry from `bridge_events`
- Generate a new `docs/bridge.md`
- Open a PR with the regenerated file

After successful run, the daily cron will keep it fresh.

---

## How agents start using v2

### Reading (any agent, any time, no auth needed beyond Supabase MCP / service-role)

```ts
import { Bridge } from '@vonpay/bridge-client';

const bridge = new Bridge({
  supabaseUrl: process.env.SUPABASE_URL,
  jwt: process.env.BRIDGE_WRITER_JWT,
});

// At /drift §3.5
const pending = await bridge.list({
  status: 'PENDING',
  toRepo: 'vonpay-docs', // or whichever repo this agent owns
});

// Real-time subscription (long-running agents)
const unsubscribe = bridge.subscribe({
  forRepo: 'vonpay-docs',
  onEvent: (entry, kind) => { /* INSERT or UPDATE */ },
});
```

### Writing (requires JWT)

```ts
// File new entry
const entry = await bridge.post({
  clientRequestId: crypto.randomUUID(),
  toRepos: ['vonpay-checkout', 'vonpay-merchant'], // or 'all'
  type: 'HEADS-UP', // INCIDENT | HEADS-UP | QUESTION | REQUEST | DONE | RESPONSE
  sensitivity: 'INTERNAL', // default — most entries; PUBLIC for cross-tier-readable
  title: '...',
  body: '...markdown...',
  related: { plan: 'discrete-lifecycle-plan.md', prs: [97] },
});

// Status flips
await bridge.ack({ entryId: entry.id, by: 'vonpay-docs', note: 'will action at /drift' });
await bridge.resolve({ entryId: entry.id, by: 'vonpay-docs' });

// Mid-conversation amendment (Case C)
await bridge.amend({ entryId: entry.id, by: 'vonpay-docs', note: '...' });

// Lookup by historical timestamp (memory file references)
const e = await bridge.get({ occurredAt: '2026-04-26T03:57:00Z' });
```

### What does NOT change

- `vonpay-docs/docs/bridge.md` continues to exist as a daily-regenerated, human-readable audit trail. Useful for grep, `gh blame`, and reading historical entries.
- Legacy bridge.md files in vonpay-checkout and vonpay-merchant remain in git history. **Do not append to them.** They're frozen as of the v2 cutover entry.
- `/drift` and `/close` skill instructions point at v2 going forward (see updates queued in next Sortie).

---

## Rollback (only if something breaks badly)

1. Pause `bridge-regenerate` workflow (vonpay-docs Actions UI → Disable workflow).
2. Agents resume editing legacy bridge.md files directly.
3. v2 entries already in `bridge_events` are preserved (append-only — cannot be deleted by anyone except via `DROP TABLE`).
4. To re-cutover later, re-enable the workflow and resume `bridge.post(...)` from agents.

---

## Where to look

- **Plan:** `C:\Users\Wilson\.claude\plans\toasty-hatching-porcupine.md`
- **Schema:** `vonpay-merchant/db/migrations/069_bridge_events.sql` + `069a_bridge_events_security_fix.sql`
- **Lib:** `vonpay/packages/bridge-client/`
- **Cron:** `vonpay-docs/.github/workflows/bridge-{regenerate,health-check}.yml`
- **Protocol (legacy + v2 supplement):** `vonpay-docs/docs/bridge-protocol.md`
- **JWT minting script:** `vonpay-merchant/scripts/mint-bridge-writer-jwt.mjs`
- **Memory:** `project_bridge_ownership_scope.md`, `session_2026_05_01.md`
