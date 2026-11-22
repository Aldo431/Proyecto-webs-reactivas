// Configuración de ESLint del monorepo (spec 017). Complementa a `tsc`:
// TypeScript verifica tipos y variables sin uso; ESLint prohíbe `any`
// explícito y revisa las reglas de los hooks de React.
import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    "**/node_modules/",
    "**/dist/",
    "**/out/",
    "**/coverage/",
    "e2etests/playwright-report/",
    "e2etests/test-results/",
  ]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      // Mismo criterio que noUnusedParameters: `_nombre` marca un parámetro
      // que se recibe a propósito sin usarlo (p. ej. el `next` de Express).
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
    },
  },
  {
    files: ["apps/frontend/client/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
  {
    files: [
      "apps/backend/**/*.ts",
      "utils/**/*.ts",
      "e2etests/**/*.ts",
      "**/vite.config.ts",
    ],
    languageOptions: { globals: globals.node },
  },
]);
