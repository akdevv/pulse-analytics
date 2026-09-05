import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    // Integration files skip themselves when no Postgres answers, so CI with
    // no database still passes on the unit suite alone.
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    // The integration suite shares one database.
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
