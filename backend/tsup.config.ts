import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    // worker: "src/worker.ts",
  },
  outDir: "dist",
  format: ["esm"],
  target: "node20",
  clean: true,
  sourcemap: true,
});
