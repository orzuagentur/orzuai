import { existsSync } from "node:fs";

import { config as loadEnv } from "dotenv";

// Load local test env when present (see .env.test). In CI these come from the
// job environment (GitHub Actions secrets), so a missing file is fine.
if (existsSync(".env.test")) {
  loadEnv({ path: ".env.test" });
}
