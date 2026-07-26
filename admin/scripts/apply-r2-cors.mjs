/**
 * One-shot: set R2 bucket CORS for web + admin browser PUTs.
 * Usage: node scripts/apply-r2-cors.mjs
 * Reads credentials from admin/.env.local (not committed).
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  GetBucketCorsCommand,
  PutBucketCorsCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(join(root, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const accountId = env.R2_ACCOUNT_ID;
const Bucket = env.R2_BUCKET;
if (!accountId || !Bucket || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
  console.error("Missing R2_* in .env.local");
  process.exit(1);
}

const client = new S3Client({
  region: env.R2_REGION || "auto",
  endpoint:
    env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

const CORSConfiguration = {
  CORSRules: [
    {
      AllowedOrigins: [
        "https://www.orzuai.com",
        "https://orzuai.com",
        "https://orzuvideo-admin.vercel.app",
        "http://localhost:3000",
        "http://localhost:3001",
      ],
      AllowedMethods: ["GET", "PUT", "HEAD"],
      AllowedHeaders: ["*"],
      ExposeHeaders: ["ETag", "Content-Type", "Content-Length"],
      MaxAgeSeconds: 3600,
    },
  ],
};

await client.send(new PutBucketCorsCommand({ Bucket, CORSConfiguration }));
const out = await client.send(new GetBucketCorsCommand({ Bucket }));
console.log("R2 CORS updated for bucket:", Bucket);
console.log(JSON.stringify(out.CORSRules, null, 2));
