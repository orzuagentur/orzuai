/**
 * Upload OpenMoji SVGs → Supabase Storage bucket "openmoji"
 * and upsert rows into public.openmoji.
 *
 * Usage: node scripts/upload-openmoji.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC = "C:\\Users\\Asus\\Downloads\\OpenMoji";
const CONCURRENCY = 16;
const BATCH_UPSERT = 200;

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function mapPool(items, limit, fn) {
  let i = 0;
  let active = 0;
  const results = new Array(items.length);
  return new Promise((resolve, reject) => {
    const next = () => {
      if (i >= items.length && active === 0) return resolve(results);
      while (active < limit && i < items.length) {
        const idx = i++;
        active++;
        Promise.resolve(fn(items[idx], idx))
          .then((r) => {
            results[idx] = r;
            active--;
            next();
          })
          .catch(reject);
      }
    };
    next();
  });
}

async function main() {
  const env = loadEnv(path.join(ROOT, "web", ".env.local"));
  const base = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new Error("Missing Supabase env");

  const headersAuth = {
    apikey: key,
    Authorization: `Bearer ${key}`,
  };

  const files = fs
    .readdirSync(SRC)
    .filter((n) => n.toLowerCase().endsWith(".svg"))
    .sort();
  console.log(`Found ${files.length} SVGs in ${SRC}`);

  let uploaded = 0;
  let failed = 0;
  const rows = [];

  await mapPool(files, CONCURRENCY, async (filename) => {
    const hex = filename.replace(/\.svg$/i, "");
    const storagePath = `${hex}.svg`;
    const full = path.join(SRC, filename);
    const body = fs.readFileSync(full);
    const publicUrl = `${base}/storage/v1/object/public/openmoji/${storagePath}`;

    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        const res = await fetch(
          `${base}/storage/v1/object/openmoji/${storagePath}`,
          {
            method: "POST",
            headers: {
              ...headersAuth,
              "Content-Type": "image/svg+xml",
              "x-upsert": "true",
            },
            body,
          },
        );
        if (!res.ok) {
          const t = await res.text();
          throw new Error(`${res.status} ${t.slice(0, 160)}`);
        }
        uploaded++;
        rows.push({
          hex,
          filename,
          storage_path: storagePath,
          public_url: publicUrl,
          byte_size: body.length,
        });
        if (uploaded % 250 === 0) {
          console.log(`uploaded ${uploaded}/${files.length} (failed=${failed})`);
        }
        return;
      } catch (e) {
        if (attempt === 4) {
          failed++;
          console.error(`FAIL ${filename}: ${e.message}`);
          return;
        }
        await sleep(250 * attempt);
      }
    }
  });

  console.log(`Storage done. uploaded=${uploaded} failed=${failed}`);
  console.log(`Upserting ${rows.length} DB rows…`);

  let upserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_UPSERT) {
    const chunk = rows.slice(i, i + BATCH_UPSERT);
    const res = await fetch(`${base}/rest/v1/openmoji?on_conflict=hex`, {
      method: "POST",
      headers: {
        ...headersAuth,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`DB upsert failed: ${res.status} ${t}`);
    }
    upserted += chunk.length;
    if (upserted % 1000 === 0 || upserted === rows.length) {
      console.log(`db ${upserted}/${rows.length}`);
    }
  }

  const countRes = await fetch(
    `${base}/rest/v1/openmoji?select=hex`,
    {
      headers: {
        ...headersAuth,
        Prefer: "count=exact",
        Range: "0-0",
      },
    },
  );
  const contentRange = countRes.headers.get("content-range");
  console.log(
    JSON.stringify(
      {
        ok: true,
        project: new URL(base).host,
        table: "public.openmoji",
        storage_bucket: "openmoji",
        uploaded,
        failed,
        db_rows_upserted: upserted,
        content_range: contentRange,
        sample_url: rows[0]?.public_url || null,
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
