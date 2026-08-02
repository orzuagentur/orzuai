import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const srcDir = fileURLToPath(new URL("./src", import.meta.url));
const serverOnlyStub = fileURLToPath(
  new URL("./tests/stubs/empty.ts", import.meta.url),
);

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    // Integration tests hit a remote test Supabase; give them room.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: [
      // `server-only` guards runtime modules; neutralize it under Vitest (node).
      { find: /^server-only$/, replacement: serverOnlyStub },
      // Mirror tsconfig path aliases.
      { find: /^@\/(.*)$/, replacement: `${srcDir}/$1` },
      { find: /^@orzuai\/(.*)$/, replacement: `${srcDir}/$1` },
    ],
  },
});
