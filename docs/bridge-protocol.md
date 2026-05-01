# Bridge Protocol — operational guide for cross-jaeger comms

Last updated: 2026-05-01 (after Wilson caught a canonical-author mirror gap mid-Sortie).

This document is the operational complement to `docs/bridge.md`. Where `bridge.md` is the shared log itself, this is the playbook for writing to it correctly. Read both before authoring an entry.

---

## 1. What the bridge is

A 3-way byte-mirrored append-only message log between sibling repos:

- `vonpay-checkout/docs/bridge.md`
- `vonpay-merchant/docs/bridge.md`
- `vonpay-docs/docs/bridge.md`

All three files MUST be byte-identical at all times. Parity is enforced by `vonpay-checkout/scripts/check-bridge-parity.mjs` (also runs in CI as the `Bridge parity` workflow on each repo).

Repos NOT in the mesh:
- `vonpay` (SDK monorepo) — observer-tier, no `bridge.md`
- `vonpay-www` — observer-tier, no `bridge.md`
- `vonpay-samples` — observer-tier, no `bridge.md`

Observer-tier repos read the bridge by reading any of the 3 mesh repos' `bridge.md`. They do not author entries directly; instead they ask one of the 3 mesh-repo agents to author on their behalf, OR (the canonical-author pattern below) they file canonical in `vonpay-docs` if the entry is cross-track coordination.

---

## 2. The 4 invariants

| # | Invariant | Failure mode if violated |
|---|---|---|
| 1 | **Byte parity across all 3 repos at all times** | Sibling agents see different bridge state than the originator. Decisions made on stale state. |
| 2 | **All 3 repos updated in the same Sortie** | An entry exists on `main` of one repo but not the others. Sibling /drift greps return zero hits. (This is the bug Wilson caught 2026-05-01 00:50Z.) |
| 3 | **Append-only — no deletions** | Audit trail breaks. Use `STATUS:` field flips instead. |
| 4 | **Newest-first ordering — top of file = latest** | /drift skims top of file for new work; out-of-order entries get missed. |

---

## 3. Entry shape

```
## {ISO timestamp UTC} — {from-repo} → {to-repo|all} — {TYPE} — STATUS: {STATUS} — {short title}

**Title:** noun phrase, single sentence
**Body:** what happened / what you need / what to do

(... structured content: tables, lists, code blocks ...)

**Acked-by:** {repo} ({timestamp}) — short note. Only present if STATUS ≥ ACKED.

**Related:** VON-NN, file paths, commit hashes, prior bridge entries by timestamp

---
```

**TYPE values:**

| TYPE | Use when | Example |
|---|---|---|
| `INCIDENT` | Something broke; coordination needed | "staging publisher migration apply errored" |
| `HEADS-UP` | FYI, action may be needed | "rk_ Stripe blocklist parity gap noted" |
| `QUESTION` | I need information from you | "should `token_fingerprint` use email_lookup_hash key?" |
| `REQUEST` | Please do X | "apply migration 043 to prod subscriber" |
| `DONE` | Announcing completion of cross-repo work | "@vonpay/checkout-node@0.4.1 shipped, closes 03:57Z HEADS-UP" |

**STATUS values (state machine):**

```
PENDING ──ack──▶ ACKED ──complete──▶ RESOLVED
   │                                    ▲
   └──── direct close ──────────────────┘
```

- `PENDING` — initial state, awaiting other side
- `ACKED` — other side has read and is handling
- `RESOLVED` — closed out, no further action

Status flips happen INLINE via Edit on the entry — no new entry needed for a status change. Add `**Acked-by:**` line when flipping to ACKED or RESOLVED.

---

## 4. Authoring workflow

Three cases, distinguished by who is authoring.

### Case A — You originate the entry

You're filing something new. Two sub-cases by canonical home:

#### A1. Source-repo canonical (entry references files in one specific mesh repo)

Example: a HEADS-UP about a regex change in `vonpay-checkout/src/lib/validation.ts` → canonical home = `vonpay-checkout`.

1. **Branch** `docs/bridge-{slug}` off canonical repo's `main`.
2. **Insert** the entry above the most recent existing entry (line ~37, right after the `---` separator that follows the header section). Blank line above and below the entry block.
3. **Commit + push** the canonical PR.
4. **Mirror** to the other 2 mesh repos in the same Sortie:
   - For each mirror repo: branch `docs/bridge-mirror-{slug}` off main, insert byte-identical content, commit, push, open PR.
5. **Merge order**: canonical first, then mirrors in fast succession (< 10 minutes apart) to minimize parity-CI failures on the in-flight PRs.
6. **DO NOT leave mirror PRs unmerged across Sorties.** That breaks invariant #2.

#### A2. Cross-track coordination canonical (entry doesn't fit any single source repo)

Example: project codename, ownership map, plan announcement → canonical home = `vonpay-docs` (the cross-cutting jaeger).

Same workflow as A1, but canonical repo = `vonpay-docs`. Mirror PRs go to `vonpay-checkout` and `vonpay-merchant`.

#### Tip — batch when shipping multiple entries in one Sortie

If you author 2+ entries in the same Sortie, file ONE batch PR per repo containing all the entries in chronological order (newest at top of insertion block). 9 single-entry PRs that all conflict on the same insertion line cost more than 3 batch PRs that don't conflict at all. See 2026-05-01 retrospective in commits `b8d4af9` / `36ab973` / `03620f7`.

### Case B — Sibling agent originates, you mirror

A sibling-mesh agent (e.g., vonpay-checkout's agent) filed a canonical entry. You see it at /drift in their bridge.md. Your job:

1. Branch `docs/bridge-mirror-{slug}` off your repo's `main`.
2. Copy the entry byte-identical from the canonical bridge.md.
3. Commit, push, open PR.
4. Merge.

**Acceptable scope**: mirror to repos you own. The originating sibling agent will mirror to its own observer/peer repos.

Per `project_bridge_ownership_scope.md` (this agent's scope as of 2026-04-30 23:42Z): this agent owns vonpay-docs. Sibling-originated entries from vonpay-checkout or vonpay-merchant get mirrored INTO vonpay-docs by this agent. The reciprocal mirroring (e.g., a vonpay-docs-originated entry mirrored into vonpay-checkout + vonpay-merchant) is THIS AGENT's job under Case A2 — NOT the sibling agent's job.

### Case C — You're amending an existing entry

The entry has new information (status flip, ack, more detail). Don't create a new entry — flip the original.

1. Branch `docs/bridge-amend-{slug}-{what}` off main.
2. Edit the existing entry inline:
   - Flip `STATUS: PENDING` → `STATUS: ACKED` or `STATUS: RESOLVED`
   - Append `**Acked-by:** {repo} ({timestamp}) — {note}` line
   - Optionally append clarification under `**Body:**`
3. Mirror to the other 2 repos same as Case A.

---

## 5. /drift integration

At Sortie start (`/drift §3.5`):

1. Read your repo's `docs/bridge.md` top 100 lines (covers ~3 most recent entries).
2. Filter for entries:
   - `STATUS: PENDING`
   - `→ {your-repo}` or `→ all`
   - timestamp > previous Sortie's debrief time
3. For each match:
   - If TYPE = REQUEST or QUESTION → add to Sortie plan as Cat 3
   - If TYPE = HEADS-UP → confirm no action needed, then ack inline (Case C)
   - If TYPE = INCIDENT → Cat 4 blocker until resolved
4. Run `node scripts/check-bridge-parity.mjs` to verify byte parity. If mismatch → HARD BLOCK; resolve before any other work.

---

## 6. /close integration

At Sortie end (`/close §2d`):

1. For any incident / rotation / migration / API change / SDK release affecting the other repos: file a bridge entry per Case A or B.
2. Run `node scripts/check-bridge-parity.mjs` final check. Must match.
3. If you ack'd a sibling-originated entry mid-Sortie (Case C), mirror the amended entry to the other 2 repos.

---

## 7. Common failure modes (with examples from this Sortie)

### 7a. The canonical-author mirror gap (caught 2026-05-01 00:50Z)

**Symptom:** Wilson runs `grep "Mark IV"` against vonpay-checkout/main + vonpay-merchant/main → zero hits. Bridge entry exists only in vonpay-docs PR diff.

**Cause:** Author opened canonical PR (vonpay-docs #24), did NOT open mirror PRs in vonpay-checkout + vonpay-merchant, assumed sibling agents would mirror at their /drift.

**Why wrong:** Sibling /drift only mirrors when they SEE the entry on a peer's main. Until canonical merges AND mirrors land, no one sees it.

**Fix:** When you originate (Case A), open all 3 PRs in the same Sortie. Per invariant #2.

### 7b. Single-entry PR pileup conflicts

**Symptom:** Multiple in-flight PRs each insert at the same line; only the first to merge wins; others go `mergeable_state: dirty`.

**Cause:** Authoring 3 entries as 3 separate PRs per repo (= 9 PRs total) when they could have been 3 batch PRs (1 per repo).

**Fix:** When shipping multiple entries in one Sortie, batch into one PR per repo. See 2026-05-01 batch commits `b8d4af9` / `36ab973` / `03620f7`.

### 7c. Stale parity drift (caught 2026-04-30 22:30Z)

**Symptom:** parity check shows 3 mains diverged by ~8.7KB.

**Cause:** Sibling agent merged a bridge entry to their main without mirroring to peers (likely interrupted Sortie, or didn't follow Case A).

**Fix:** This is repaired by the next agent who notices — they author a mirror PR (Case B) for the orphaned entry. Don't try to fix mid-Sortie unless you're already touching the file.

### 7d. The "force-push lost the conflict resolution" trap

**Symptom:** Rebase fails; you abort; force-push the original branch; conflict reappears.

**Cause:** Working tree had the right resolution, but the COMMIT didn't.

**Fix:** Always `git diff main -- docs/bridge.md` BEFORE pushing. If diff shows multiple entries (existing + yours) instead of just yours, the rebase didn't work. Reset and redo.

---

## 8. Tooling

- **Parity check:** `node scripts/check-bridge-parity.mjs` (run from any of the 3 mesh repos)
- **Latest entry timestamp:** `head -42 docs/bridge.md | tail -2` (assumes header is 37 lines + `---` + first entry)
- **Status grep:** `grep -B1 "STATUS: PENDING" docs/bridge.md | head -20`
- **Mention grep:** `grep -B1 "→ vonpay-docs\|→ all" docs/bridge.md | head -20`

---

## 9. Quick reference card

When in doubt:

```
Originating?       → Case A (3 PRs, all 3 repos, same Sortie)
Mirroring sibling? → Case B (1 PR, your repo only)
Amending?          → Case C (flip STATUS inline, mirror the amend)
Multiple entries?  → Batch into 1 PR per repo
After merging?     → run parity check, must match
```

---

**See also:**
- `docs/bridge.md` — the shared log itself
- `docs/discrete-lifecycle-plan.md` — the canonical Mark IV plan source
- Memory: `project_bridge_ownership_scope.md` — this agent's specific scope
- Memory: `feedback_bridge_parity_drift.md` — historical parity-drift incidents
- Memory: `feedback_bridge_branch_vs_env_phrasing.md` — common phrasing pitfall
