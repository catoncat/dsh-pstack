import { defineConfig } from "vite-plus";

/** DSH provides its own runtime packages; never bundle them. */
const dshProvided = /^@deepseek-ai\//;

export default defineConfig({
  pack: [
    {
      entry: "./src/*.ts",
      dts: {
        generator: "tsgo",
      },
      deps: {
        neverBundle: [dshProvided],
        dts: {
          neverBundle: [dshProvided],
        },
      },
      exports: {
        customExports: {
          "./locale/*.json": "./locale/*.json",
          "./client": "./dist/client.mjs",
        },
      },
      copy: [
        "pstack",
        { from: "skills/.agents/skills", to: "dist/skills", rename: "vendored" },
        { from: "skills/authored", to: "dist/skills", rename: "authored" },
      ],
    },
    {
      name: "dsh-pstack/client",
      cwd: ".",
      entry: ["./src/client/index.ts"],
      outDir: "dist",
      format: "cjs",
      platform: "browser",
      dts: false,
      clean: false,
      sourcemap: true,
      exports: false,
      deps: {
        neverBundle: ["react", "react/jsx-runtime", "react-dom", "react-dom/client", dshProvided],
      },
      outputOptions: {
        entryFileNames: "client.mjs",
        banner: 'window.__ModuleLoader__.load({ id: "dsh-pstack", factory: (require) => {',
        footer: "return module.exports; } });",
        intro: "var module = { exports: {} }; var exports = module.exports;",
      },
    },
  ],
  test: {
    include: ["tests/**/*.test.{ts,tsx,mjs}"],
  },
  run: {
    tasks: {
      build: {
        command: "vp pack",
        dependsOn: ["generate"],
      },
      typecheck: {
        command: "tsc --noEmit -p tsconfig.json",
      },
      generate: {
        command: "node port/generate.mjs",
        cache: false,
      },
      "generate:check": {
        command: "node port/generate.mjs --check",
        cache: false,
      },
      "compatibility:check": {
        command: "vpx port/release-compatibility.ts --check",
        cache: false,
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
