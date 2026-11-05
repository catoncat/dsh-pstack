/**
 * Package-internal resource locations.
 *
 * The bundler writes public entries to `dist/`. The generated pstack tree is
 * copied to `dist/pstack/`, and vendored skills to `dist/skills/vendored/`.
 */

import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/** The package root, from either `dist/*.mjs` or `dist/internal/*.mjs`. */
export const PACKAGE_ROOT =
  basename(here) === "internal" ? resolve(here, "..", "..") : resolve(here, "..");

/** The shipped output tree. */
export const DIST_ROOT = join(PACKAGE_ROOT, "dist");

/** The generated pstack tree. */
export const PORT_ROOT = join(DIST_ROOT, "pstack");

/** The generated pstack skills. */
export const SKILLS_ROOT = join(PORT_ROOT, "skills");

/** The vendored skills. */
export const VENDORED_SKILLS_ROOT = join(DIST_ROOT, "skills", "vendored");

/** The `poteto-mode` instruction path injected into a poteto-agent brief. */
export const POTETO_MODE_SKILL_PATH = join(SKILLS_ROOT, "poteto-mode", "SKILL.md");

/** The shipped DSH adapter document. */
export const HARNESS_DOC_PATH = join(PORT_ROOT, "docs", "harness", "dsh.md");
