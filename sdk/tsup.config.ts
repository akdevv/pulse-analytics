import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs", "iife"],
    globalName: "Pulse",
    minify: true,
    dts: true,
    sourcemap: true,
    clean: true,
    outDir: "dist",
  },
  {
    entry: ["src/react.ts"],
    format: ["esm", "cjs"],
    external: ["react"],
    minify: true,
    dts: true,
    sourcemap: true,
    outDir: "dist",
  },
]);
