import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ["dist/**"],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["tests/load/**/*.mjs", "tests/load/**/*.js"],
    languageOptions: { globals: globals.node },
  },
  {
    // public/ is served to browsers, not run by node. Without this every
    // window/document/history reference in pulse.js reads as no-undef.
    files: ["public/**/*.js"],
    languageOptions: { globals: globals.browser },
  },
  tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);
