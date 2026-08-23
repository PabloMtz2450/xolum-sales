import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "server-only": fileURLToPath(new URL("./src/test/server-only.ts", import.meta.url)) } },
  test: { coverage: { provider: "v8", reporter: ["text", "json-summary"], thresholds: { lines: 70, functions: 70, statements: 65, branches: 60 } } },
});
