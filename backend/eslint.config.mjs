import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "src/generated/**"],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      // Nest handlers and Prisma results commonly carry `any` at the edges
      // (decorators, generated client types) — the strict variant would
      // flag a large share of otherwise-correct existing code for no
      // real safety gain here.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
);
