// Bridge Mesh v2 — daily regen of docs/bridge.md from Postgres source-of-truth.
// Run by .github/workflows/bridge-regenerate.yml on a daily cron.
//
// Reads all rows from bridge_events on the vonpay-merchant Supabase project,
// renders to canonical markdown, and writes to docs/bridge.md. The wrapping
// workflow opens a PR if the file changed.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BRIDGE_MD_PATH = join(process.cwd(), "docs", "bridge.md");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const HEADER = `# Bridge — cross-repo Jaeger comms

This file is **auto-generated** from \`bridge_events\` on the vonpay-merchant Supabase project. Do not edit directly — manual edits will be overwritten on the next regeneration. To file an entry, use \`@vonpay/bridge-client\`.

## Rules (legacy reference)

- **Append-only.** Status flips happen via \`bridge.ack()\` / \`bridge.resolve()\` / \`bridge.amend()\`.
- **UTC timestamps.** Newest-first.
- **Source-of-truth:** Postgres \`bridge_events\` table. This file is a daily snapshot.

## How to read this file

Each entry below is rendered from a single row. The header line carries the metadata; the body follows. \`Acked-by\` and \`Notes\` lines are appended below the body when present.

For real-time access during a Sortie, use \`bridge.list({status: 'PENDING', toRepo: $self})\` from your agent — this file is up to 24 hours stale.

---
`;

function renderEntry(row) {
  const toRepos = (row.to_repos ?? []).join(", ");
  const lines = [];
  lines.push(
    `## ${row.occurred_at.replace("T", " ").replace(/:\d{2}\.\d+Z$/, "Z").replace(/Z$/, "Z")} — ${row.from_repo} → ${toRepos} — ${row.type} — STATUS: ${row.status} — ${row.title}`,
  );
  lines.push("");
  lines.push(row.body.trim());
  if (Array.isArray(row.acked_by) && row.acked_by.length > 0) {
    lines.push("");
    for (const ack of row.acked_by) {
      const note = ack.note ? ` — ${ack.note}` : "";
      lines.push(`**Acked-by:** ${ack.repo} (${ack.ts})${note}`);
    }
  }
  if (Array.isArray(row.notes) && row.notes.length > 0) {
    lines.push("");
    for (const note of row.notes) {
      lines.push(`**Note (${note.repo} ${note.ts}):** ${note.note}`);
    }
  }
  if (row.related && Object.keys(row.related).length > 0) {
    lines.push("");
    lines.push(`**Related:** \`${JSON.stringify(row.related)}\``);
  }
  if (row.legacy_md_anchor) {
    lines.push("");
    lines.push(`<!-- legacy_md_anchor: ${row.legacy_md_anchor} -->`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  return lines.join("\n");
}

async function main() {
  const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client
    .from("bridge_events")
    .select()
    .order("occurred_at", { ascending: false });
  if (error) {
    console.error("Query failed:", error);
    process.exit(2);
  }

  const rendered = HEADER + (data ?? []).map(renderEntry).join("");

  // Compare with current file
  const current = existsSync(BRIDGE_MD_PATH)
    ? readFileSync(BRIDGE_MD_PATH, "utf8")
    : "";
  if (current === rendered) {
    console.log("No diff. bridge.md is up to date.");
    return;
  }

  writeFileSync(BRIDGE_MD_PATH, rendered, "utf8");
  console.log(
    `bridge.md regenerated: ${(data ?? []).length} entries, ${rendered.length} bytes.`,
  );

  // Update bridge_health.last_regen_at
  const { error: healthErr } = await client
    .from("bridge_health")
    .update({
      last_regen_at: new Date().toISOString(),
      last_regen_pr_url: process.env.REGEN_PR_URL ?? null,
    })
    .eq("id", 1);
  if (healthErr) console.warn("bridge_health update failed:", healthErr.message);
}

main().catch((err) => {
  console.error(err);
  process.exit(3);
});
