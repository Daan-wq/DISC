import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "apps/**/node_modules/**",
      "apps/**/.next/**",
      "**/*.d.ts",
      "supabase/**",
      "scripts/**/*.js",
      "Profile rapport templates/**",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }],
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "no-empty": "warn",
      "no-useless-escape": "warn",
      "no-control-regex": "off",
      "no-case-declarations": "off",
    }
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      globals: {
        module: "readonly",
        require: "readonly",
        process: "readonly",
        console: "readonly",
        __dirname: "readonly",
        setTimeout: "readonly",
        fetch: "readonly",
      }
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "no-undef": "off",
    }
  },
  {
    files: ["tailwind.config.js"],
    languageOptions: {
      globals: {
        module: "readonly",
      }
    }
  }
];
