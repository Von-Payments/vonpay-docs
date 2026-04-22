#!/usr/bin/env node
// check-bridge-parity.mjs
//
// Verifies that docs/bridge.md in this repo matches docs/bridge.md in every
// sibling vonpay-* repo. All three sides (vonpay-checkout, vonpay-merchant,
// vonpay-docs) must carry byte-identical copies — divergence means one repo's
// agent landed an entry without mirroring.
//
// Usage:
//   node scripts/check-bridge-parity.mjs
//
// Exits 0 if files match (or all siblings absent, e.g. in CI without co-checkout).
// Exits 1 with a diff hint if any differ. Siblings not present on disk are
// reported but do not fail the check.

import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const here = resolve(__dirname, "..");
const hereName = here.split(/[\\/]/).pop();

const ALL_REPOS = ["vonpay-checkout", "vonpay-merchant", "vonpay-docs"];

if (!ALL_REPOS.includes(hereName)) {
  console.error(
    `[bridge-parity] Unknown repo name: ${hereName}. Expected one of: ${ALL_REPOS.join(", ")}.`,
  );
  process.exit(1);
}

const siblings = ALL_REPOS.filter((r) => r !== hereName);

const bridgePath = (repoName) =>
  repoName === hereName
    ? join(here, "docs", "bridge.md")
    : join(here, "..", repoName, "docs", "bridge.md");

const herePath = bridgePath(hereName);

if (!existsSync(herePath)) {
  console.error(`[bridge-parity] ${herePath} missing — nothing to compare.`);
  process.exit(1);
}

const hash = (b) => createHash("sha256").update(b).digest("hex");
const hereBuf = readFileSync(herePath);
const hereHash = hash(hereBuf);

const results = [
  { name: hereName, path: herePath, hash: hereHash, size: hereBuf.length, present: true },
];

for (const sib of siblings) {
  const p = bridgePath(sib);
  if (!existsSync(p)) {
    results.push({ name: sib, path: p, hash: null, size: 0, present: false });
    continue;
  }
  const buf = readFileSync(p);
  results.push({ name: sib, path: p, hash: hash(buf), size: buf.length, present: true });
}

const present = results.filter((r) => r.present);
const mismatches = present.filter((r) => r.hash !== hereHash);

if (mismatches.length === 0) {
  const absent = results.filter((r) => !r.present);
  console.log(
    `[bridge-parity] ✓ matches across ${present.length} repo(s) (sha256: ${hereHash.slice(0, 12)})` +
      (absent.length
        ? ` — ${absent.length} sibling(s) not on disk: ${absent.map((r) => r.name).join(", ")}`
        : ""),
  );
  process.exit(0);
}

console.error(`[bridge-parity] ✗ MISMATCH across ${results.length} repo(s)`);
for (const r of results) {
  if (!r.present) {
    console.error(`  ${r.name.padEnd(16)}  (absent on disk: ${r.path})`);
    continue;
  }
  const marker = r.hash === hereHash ? " " : "!";
  console.error(
    `  ${marker} ${r.name.padEnd(16)}  sha256=${r.hash.slice(0, 12)}  size=${r.size}  ${r.path}`,
  );
}
console.error(``);
console.error(`Bridge files diverged. One repo landed an entry without mirroring.`);
console.error(`Fix: pick the canonical version, copy it to every mismatched sibling, commit in all of them.`);
console.error(``);
console.error(`Quick diff:`);
for (const r of mismatches) {
  console.error(`  diff ${herePath} ${r.path}`);
}
process.exit(1);
