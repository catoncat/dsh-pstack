import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["./src/*.ts", "./src/client/*.ts"],
    dts: {
      generator: "tsgo",
    },
    deps: {
      neverBundle: [/^@deepseek-ai\//],
    },
    copy: [
      "pstack",
      { from: "skills/authored", to: "dist/skills" },
      { from: "skills/.agents/skills", to: "dist/skills", rename: "vendored" },
    ],
  },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    passWithNoTests: true,
  },
  run: {
    tasks: {
      build: {
        command: "vp pack",
      },
      typecheck: {
        command: "tsc --noEmit -p tsconfig.json",
      },
      playground: {
        command: "node playground/start.mjs",
        cache: false,
      },
      "playground:reset": {
        command: "node playground/start.mjs --reset",
        cache: false,
      },
      "playground:reinstall": {
        command: "node playground/start.mjs --reinstall",
        cache: false,
      },
      "playground:browser": {
        command: "node playground/browser.mjs",
        cache: false,
      },
      cases: {
        command: "node playground/cases-run.mjs",
        cache: false,
      },
      "cases:list": {
        command: "node playground/cases-run.mjs --list",
        cache: false,
      },
      "cases:check": {
        command: "node playground/cases-run.mjs --check",
        cache: false,
      },
    },
  },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: {
      typeAware: true,
      typeCheck: true,
    },
    ignorePatterns: ["upstream", "**/*.md", "pstack"],
  },
  fmt: {
    ignorePatterns: ["upstream", "**/*.md", "pstack"],
  },
  staged: {
    "*": "vp check --fix",
  },
});
