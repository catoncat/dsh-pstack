/**
 * Package-internal resource locations.
 *
 * The bundler writes public entries to `dist/`. The generated pstack tree is
 * copied to `dist/pstack/`, and vendored skills to `dist/skills/vendored/`.
 */

import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/** The package root, from a bundled entry in `dist/`. */
export const PACKAGE_ROOT = resolve(here, "..");

/** The shipped output tree. */
export const DIST_ROOT = join(PACKAGE_ROOT, "dist");

/** The generated pstack tree. */
export const PORT_ROOT = join(DIST_ROOT, "pstack");

/** The generated pstack skills. */
export const SKILLS_ROOT = join(PORT_ROOT, "skills");

/** The vendored skills. */
export const VENDORED_SKILLS_ROOT = join(DIST_ROOT, "skills", "vendored");

/**
 * The `poteto-mode` instruction path used by the root `poteto-mode` preset and
 * the `poteto-agent` delegate brief.
 */
export const POTETO_MODE_SKILL_PATH = join(SKILLS_ROOT, "poteto-mode", "SKILL.md");

/** The shipped DSH adapter document. */
export const HARNESS_DOC_PATH = join(PORT_ROOT, "docs", "harness", "dsh.md");
