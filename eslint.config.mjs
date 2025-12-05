import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Also ignore build artifacts
    "**/dist/**",
    "**/*.js", // Ignore compiled JS files
  ]),
  {
    rules: {
      // Allow unused vars if they start with underscore
      "@typescript-eslint/no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }],
      // Make no-explicit-any a warning instead of error
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow @ts-ignore and @ts-expect-error comments
      "@typescript-eslint/ban-ts-comment": "warn",
      // Allow unescaped entities in JSX
      "react/no-unescaped-entities": "warn"
    }
  }
]);

export default eslintConfig;
