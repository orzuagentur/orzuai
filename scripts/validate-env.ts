import { validateEnv } from "../src/lib/env.schema";

const result = validateEnv();

if (result.success) {
  console.log("Environment variables are valid.");
  process.exit(0);
}

console.error("Environment validation failed:\n");

for (const issue of result.issues) {
  console.error(`- ${issue.key}: ${issue.message}`);
}

console.error(
  "\nCopy .env.example to .env.local and provide all required values.",
);

process.exit(1);
