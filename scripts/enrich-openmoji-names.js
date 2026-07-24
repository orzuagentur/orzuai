/**
 * Enrich public.openmoji with official names/tags from OpenMoji CSV.
 * Usage: node scripts/enrich-openmoji-names.js
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.join(__dirname, "..");
const CSV_URL =
  "https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/data/openmoji.csv";
const BATCH = 150;

function loadEnv(file) {
  const raw = fs.readFileSync(file, "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    let v = line.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[line.slice(0, i).trim()] = v;
  }
  return env;
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          fetchText(res.headers.location).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve(Buffer.concat(chunks).toString("utf8")),
        );
      })
      .on("error", reject);
  });
}

/** Minimal CSV parser that handles quoted fields with commas */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && next === "\n") i++;
      row.push(field);
      if (row.some((c) => c.length)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

async function main() {
  const env = loadEnv(path.join(ROOT, "web", ".env.local"));
  const base = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new Error("Missing Supabase env");

  console.log("Downloading OpenMoji CSV…");
  const csv = await fetchText(CSV_URL);
  const table = parseCsv(csv);
  const header = table[0].map((h) => h.trim());
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const need = ["hexcode", "annotation", "tags", "group", "subgroups"];
  for (const col of need) {
    if (idx[col] == null) throw new Error(`CSV missing column: ${col}`);
  }

  const updates = [];
  for (let r = 1; r < table.length; r++) {
    const cells = table[r];
    const hex = String(cells[idx.hexcode] || "").trim().toUpperCase();
    const name = String(cells[idx.annotation] || "").trim();
    if (!hex || !name) continue;
    updates.push({
      hex,
      name,
      tags: String(cells[idx.tags] || "").trim() || null,
      group_name: String(cells[idx.group] || "").trim() || null,
      subgroup: String(cells[idx.subgroups] || "").trim() || null,
    });
  }
  console.log(`Parsed ${updates.length} named rows from CSV`);

  // Only update existing keys — fetch all hex first
  const existing = new Set();
  let page = 0;
  const pageSize = 1000;
  for (;;) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const res = await fetch(
      `${base}/rest/v1/openmoji?select=hex&order=hex&offset=${from}&limit=${pageSize}`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Range: `${from}-${to}`,
        },
      },
    );
    if (!res.ok) throw new Error(`list hex: ${res.status} ${await res.text()}`);
    const rows = await res.json();
    for (const row of rows) existing.add(String(row.hex).toUpperCase());
    if (rows.length < pageSize) break;
    page++;
  }
  console.log(`DB has ${existing.size} openmoji rows`);

  const matched = updates.filter((u) => existing.has(u.hex));
  console.log(`Updating names for ${matched.length} matching hex codes…`);

  let done = 0;
  for (let i = 0; i < matched.length; i += BATCH) {
    const chunk = matched.slice(i, i + BATCH);
    // Patch each row (PostgREST can't bulk-update different values easily)
    await Promise.all(
      chunk.map(async (row) => {
        const res = await fetch(
          `${base}/rest/v1/openmoji?hex=eq.${encodeURIComponent(row.hex)}`,
          {
            method: "PATCH",
            headers: {
              apikey: key,
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify({
              name: row.name,
              tags: row.tags,
              group_name: row.group_name,
              subgroup: row.subgroup,
            }),
          },
        );
        if (!res.ok) {
          const t = await res.text();
          throw new Error(`PATCH ${row.hex}: ${res.status} ${t}`);
        }
      }),
    );
    done += chunk.length;
    if (done % 600 === 0 || done === matched.length) {
      console.log(`named ${done}/${matched.length}`);
    }
  }

  const check = await fetch(
    `${base}/rest/v1/openmoji?select=hex&name=is.null`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: "count=exact",
        Range: "0-0",
      },
    },
  );
  console.log(
    JSON.stringify(
      {
        ok: true,
        named: matched.length,
        still_null_name: check.headers.get("content-range"),
        sample: matched.slice(0, 3),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
