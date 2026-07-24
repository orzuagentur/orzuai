#!/usr/bin/env node
/**
 * Review Iconify collections and print ONLY license-safe, curated sets.
 *
 * Safe for OrzuAi Creators library when:
 * 1) SPDX is in SAFE list (MIT / ISC / Apache-2.0 / CC0-1.0)
 * 2) Not in UNSAFE/copyleft list
 * 3) Prefix is on the product allowlist (Lucide, Heroicons, Tabler, Phosphor, MDI)
 * 4) Iconify does not mark the set as hidden
 *
 * Usage:
 *   node scripts/list-safe-iconify-sets.js
 *   node scripts/list-safe-iconify-sets.js --json
 *   node scripts/list-safe-iconify-sets.js --all-permissive   # every MIT/ISC/Apache/CC0 on Iconify (audit)
 */
const https = require("https");
const path = require("path");
const fs = require("fs");

const API = "https://api.iconify.design/collections?pretty=true";

const SAFE_SPDX = new Set(["MIT", "ISC", "Apache-2.0", "CC0-1.0"]);
const UNSAFE_SPDX = new Set([
  "GPL-2.0",
  "GPL-2.0-only",
  "GPL-2.0-or-later",
  "GPL-3.0",
  "GPL-3.0-only",
  "GPL-3.0-or-later",
  "AGPL-3.0",
  "AGPL-3.0-only",
  "AGPL-3.0-or-later",
  "LGPL-2.1",
  "LGPL-3.0",
  "SSPL-1.0",
  "BUSL-1.1",
  "UNLICENSED",
  "LicenseRef-Proprietary",
]);

/** Product allowlist — must match web/src/lib/iconify-safe.ts */
const PRODUCT_ALLOWLIST = new Set([
  "lucide",
  "lucide-lab",
  "heroicons",
  "heroicons-outline",
  "heroicons-solid",
  "tabler",
  "ph",
  "mdi",
]);

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { Accept: "application/json" } }, (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          fetchJson(res.headers.location).then(resolve, reject);
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

function licenseOf(meta) {
  const spdx = meta?.license?.spdx || "";
  const title = meta?.license?.title || "";
  return { spdx, title, url: meta?.license?.url || "" };
}

function reviewRow(prefix, meta) {
  const lic = licenseOf(meta);
  const reasons = [];
  let status = "safe";

  if (meta?.hidden) {
    status = "blocked";
    reasons.push("Iconify marks collection as hidden");
  }
  if (!lic.spdx) {
    status = "blocked";
    reasons.push("missing SPDX license id");
  } else if (UNSAFE_SPDX.has(lic.spdx)) {
    status = "blocked";
    reasons.push(`copyleft/proprietary SPDX: ${lic.spdx}`);
  } else if (!SAFE_SPDX.has(lic.spdx)) {
    status = "blocked";
    reasons.push(`SPDX not in permissive allowlist: ${lic.spdx}`);
  }
  if (!PRODUCT_ALLOWLIST.has(prefix)) {
    if (status === "safe") status = "permissive_but_not_curated";
    reasons.push("not on product allowlist (Lucide/Heroicons/Tabler/Phosphor/MDI)");
  }

  return {
    prefix,
    name: meta?.name || prefix,
    total: meta?.total || 0,
    category: meta?.category || null,
    license: lic.spdx || null,
    licenseTitle: lic.title || null,
    licenseUrl: lic.url || null,
    homepage: meta?.author?.url || meta?.url || null,
    samples: meta?.samples || [],
    status,
    reasons,
    svgExample: meta?.samples?.[0]
      ? `https://api.iconify.design/${prefix}/${meta.samples[0]}.svg`
      : null,
  };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const asJson = args.has("--json");
  const allPermissive = args.has("--all-permissive");

  console.error("Fetching Iconify /collections …");
  const collections = await fetchJson(API);
  const rows = Object.entries(collections).map(([prefix, meta]) =>
    reviewRow(prefix, meta),
  );

  const productSafe = rows.filter((r) => r.status === "safe");
  const permissiveExtra = rows.filter(
    (r) => r.status === "permissive_but_not_curated",
  );
  const blocked = rows.filter((r) => r.status === "blocked");

  // Sanity: every allowlist prefix must resolve as safe
  const missing = [...PRODUCT_ALLOWLIST].filter(
    (p) => !productSafe.some((r) => r.prefix === p),
  );

  const report = {
    fetchedAt: new Date().toISOString(),
    source: API,
    policy: {
      safeSpdx: [...SAFE_SPDX],
      unsafeSpdx: [...UNSAFE_SPDX],
      productAllowlist: [...PRODUCT_ALLOWLIST],
      notes: [
        "Only product allowlist sets are exposed in Creators → Icons.",
        "Apache-2.0 (MDI) requires keeping license notice when redistributing icon packs.",
        "Do not bulk-mirror icon SVGs into our Storage unless license notice is retained.",
        "Icons are loaded on demand from Iconify API (SVG URL) — attribution via UI/footer is recommended.",
        "OFL / CC-BY / GPL icon sets are excluded from the product filter.",
      ],
    },
    counts: {
      totalOnIconify: rows.length,
      productSafe: productSafe.length,
      permissiveButNotCurated: permissiveExtra.length,
      blocked: blocked.length,
      allowlistMissingOrUnsafe: missing.length,
    },
    productSafe,
    allowlistMissingOrUnsafe: missing,
    permissiveButNotCurated: allPermissive
      ? permissiveExtra
      : permissiveExtra.slice(0, 0),
  };

  if (asJson) {
    if (allPermissive) report.permissiveButNotCurated = permissiveExtra;
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log("\n=== SAFE for Creators → Icons (reviewed) ===\n");
    for (const r of productSafe.sort((a, b) => a.label?.localeCompare?.(b.name) || a.prefix.localeCompare(b.prefix))) {
      console.log(
        `✓ ${r.prefix.padEnd(22)} ${String(r.total).padStart(5)}  ${r.license?.padEnd(12)}  ${r.name}`,
      );
    }
    if (missing.length) {
      console.log("\n!!! Allowlist prefixes missing or unsafe:");
      for (const p of missing) console.log(`  - ${p}`);
    }
    console.log("\nPolicy notes:");
    for (const n of report.policy.notes) console.log(`  • ${n}`);
    console.log(
      `\nTotals: safe=${productSafe.length}  blocked=${blocked.length}  other-permissive=${permissiveExtra.length}  iconify=${rows.length}`,
    );
    console.log(
      "Tip: node scripts/list-safe-iconify-sets.js --json --all-permissive\n",
    );
  }

  // Write machine-readable snapshot for CI / humans
  const outDir = path.join(__dirname, "..", "scripts", "output");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "safe-iconify-sets.json");
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      {
        ...report,
        permissiveButNotCurated: allPermissive
          ? permissiveExtra
          : undefined,
      },
      null,
      2,
    ),
  );
  console.error(`Wrote ${outFile}`);

  if (missing.length) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
